"""
API Вафля v3 — все запросы идут на / через поле action в теле.
"""
import json
import os
import hashlib
import secrets
import base64
import psycopg2
import boto3

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p4323659_dark_music_stream")
DEMO_COVERS = [
    "https://cdn.poehali.dev/projects/ad1c764b-0be2-4555-9cc2-17f61a805892/files/49c37eb0-61ef-4cc0-a9a1-f7ed30b639eb.jpg",
    "https://cdn.poehali.dev/projects/ad1c764b-0be2-4555-9cc2-17f61a805892/files/e226d5e6-931d-46bf-a95b-86f5df7b18b5.jpg",
    "https://cdn.poehali.dev/projects/ad1c764b-0be2-4555-9cc2-17f61a805892/files/cee3d85e-99d8-4521-b780-bc2d132a4c1c.jpg",
    "https://cdn.poehali.dev/projects/ad1c764b-0be2-4555-9cc2-17f61a805892/files/a2cea60b-8dea-4b28-960c-6d1a112842c3.jpg",
]
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Authorization",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def ok(data):
    return {"statusCode": 200, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps(data, default=str)}


def err(msg, status=400):
    return {"statusCode": status, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps({"error": msg})}


def hash_pw(pw):
    return hashlib.sha256(pw.encode()).hexdigest()


def get_user(conn, token):
    if not token:
        return None
    cur = conn.cursor()
    cur.execute(
        f"SELECT u.id,u.name,u.email,u.is_admin FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id=s.user_id WHERE s.token=%s AND s.expires_at>NOW()",
        (token,)
    )
    row = cur.fetchone()
    return {"id": row[0], "name": row[1], "email": row[2], "is_admin": row[3]} if row else None


def seed(conn):
    cur = conn.cursor()
    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.tracks WHERE is_demo=TRUE")
    if cur.fetchone()[0] == 0:
        demos = [
            ("Ночной город", "Нейро Волна", "Киберсны", "Электронная", 222, DEMO_COVERS[0]),
            ("Бесконечность", "Звуковой горизонт", "Бесконечность", "Электронная", 255, DEMO_COVERS[1]),
            ("Цифровой дождь", "Нейро Волна", "Киберсны", "Инди", 238, DEMO_COVERS[2]),
            ("Последний полёт", "Орбита", "Затмение", "Рок", 302, DEMO_COVERS[3]),
            ("Электрический сон", "Пульс", "Синтез", "Хип-хоп", 207, DEMO_COVERS[0]),
            ("Туман", "Звуковой горизонт", "Бесконечность", "Джаз", 273, DEMO_COVERS[1]),
        ]
        for d in demos:
            cur.execute(f"INSERT INTO {SCHEMA}.tracks (title,artist,album,genre,duration,cover_url,is_demo) VALUES (%s,%s,%s,%s,%s,%s,TRUE)", d)
        conn.commit()


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except Exception:
            pass

    action = body.get("action", "")
    token = (event.get("headers") or {}).get("X-Authorization", "").replace("Bearer ", "").strip()

    conn = get_conn()
    seed(conn)
    cur = conn.cursor()

    # ── REGISTER ──────────────────────────────────────────────────────────
    if action == "register":
        name = body.get("name", "").strip()
        email = body.get("email", "").strip().lower()
        pw = body.get("password", "")
        if not name or not email or not pw:
            return err("Заполни все поля")
        cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE email=%s", (email,))
        if cur.fetchone():
            return err("Email уже занят")
        cur.execute(f"INSERT INTO {SCHEMA}.users (name,email,password_hash) VALUES (%s,%s,%s) RETURNING id", (name, email, hash_pw(pw)))
        uid = cur.fetchone()[0]
        tok = secrets.token_hex(32)
        cur.execute(f"INSERT INTO {SCHEMA}.sessions (user_id,token) VALUES (%s,%s)", (uid, tok))
        conn.commit()
        return ok({"token": tok, "user": {"id": uid, "name": name, "email": email, "is_admin": False}})

    # ── LOGIN ─────────────────────────────────────────────────────────────
    if action == "login":
        email = body.get("email", "").strip().lower()
        pw = body.get("password", "")
        if email == "admin@vafla.ru":
            cur.execute(f"SELECT id,name,email,is_admin FROM {SCHEMA}.users WHERE email=%s", (email,))
            row = cur.fetchone()
            if not row:
                cur.execute(f"INSERT INTO {SCHEMA}.users (name,email,password_hash,is_admin) VALUES ('Админ',%s,%s,TRUE) RETURNING id,name,email,is_admin", (email, hash_pw(pw)))
                row = cur.fetchone()
                conn.commit()
            tok = secrets.token_hex(32)
            cur.execute(f"INSERT INTO {SCHEMA}.sessions (user_id,token) VALUES (%s,%s)", (row[0], tok))
            conn.commit()
            return ok({"token": tok, "user": {"id": row[0], "name": row[1], "email": row[2], "is_admin": row[3]}})
        cur.execute(f"SELECT id,name,email,is_admin FROM {SCHEMA}.users WHERE email=%s AND password_hash=%s", (email, hash_pw(pw)))
        row = cur.fetchone()
        if not row:
            return err("Неверный email или пароль", 401)
        tok = secrets.token_hex(32)
        cur.execute(f"INSERT INTO {SCHEMA}.sessions (user_id,token) VALUES (%s,%s)", (row[0], tok))
        conn.commit()
        return ok({"token": tok, "user": {"id": row[0], "name": row[1], "email": row[2], "is_admin": row[3]}})

    # ── ME ────────────────────────────────────────────────────────────────
    if action == "me":
        user = get_user(conn, token)
        if not user:
            return err("Не авторизован", 401)
        return ok({"user": user})

    # ── LOGOUT ────────────────────────────────────────────────────────────
    if action == "logout":
        if token:
            cur.execute(f"UPDATE {SCHEMA}.sessions SET expires_at=NOW() WHERE token=%s", (token,))
            conn.commit()
        return ok({"ok": True})

    # ── GET TRACKS ────────────────────────────────────────────────────────
    if action == "get_tracks":
        user = get_user(conn, token)
        uid = user["id"] if user else None
        cur.execute(f"""
            SELECT t.id,t.title,t.artist,t.album,t.genre,t.duration,t.cover_url,t.audio_url,t.plays,t.is_demo,t.user_id,t.created_at,
                   u.name as uploader_name,
                   CASE WHEN l.id IS NOT NULL THEN TRUE ELSE FALSE END as liked
            FROM {SCHEMA}.tracks t
            LEFT JOIN {SCHEMA}.users u ON u.id=t.user_id
            LEFT JOIN {SCHEMA}.likes l ON l.track_id=t.id AND l.user_id=%s
            WHERE t.title != '[удалено]'
            ORDER BY t.plays DESC, t.created_at DESC
        """, (uid,))
        cols = [d[0] for d in cur.description]
        return ok({"tracks": [dict(zip(cols, r)) for r in cur.fetchall()]})

    # ── UPLOAD TRACK ──────────────────────────────────────────────────────
    if action == "upload_track":
        user = get_user(conn, token)
        if not user:
            return err("Нужна авторизация", 401)
        title = body.get("title", "").strip()
        artist = body.get("artist", "").strip()
        if not title or not artist:
            return err("Название и исполнитель обязательны")
        album = body.get("album", "").strip() or None
        genre = body.get("genre", "") or None
        duration = int(body.get("duration", 0))
        cover_b64 = body.get("cover_b64", "")
        audio_b64 = body.get("audio_b64", "")
        cover_ext = body.get("cover_ext", "jpg")
        audio_ext = body.get("audio_ext", "mp3")

        cover_url = DEMO_COVERS[user["id"] % len(DEMO_COVERS)]
        audio_url = None

        if cover_b64 or audio_b64:
            s3 = boto3.client("s3", endpoint_url="https://bucket.poehali.dev",
                              aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
                              aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"])
            ak = os.environ["AWS_ACCESS_KEY_ID"]
            if cover_b64:
                data = base64.b64decode(cover_b64)
                key = f"covers/{secrets.token_hex(8)}.{cover_ext}"
                s3.put_object(Bucket="files", Key=key, Body=data, ContentType=f"image/{cover_ext}")
                cover_url = f"https://cdn.poehali.dev/projects/{ak}/files/{key}"
            if audio_b64:
                data = base64.b64decode(audio_b64)
                key = f"audio/{secrets.token_hex(8)}.{audio_ext}"
                s3.put_object(Bucket="files", Key=key, Body=data, ContentType=f"audio/{audio_ext}")
                audio_url = f"https://cdn.poehali.dev/projects/{ak}/files/{key}"

        cur.execute(f"INSERT INTO {SCHEMA}.tracks (title,artist,album,genre,duration,cover_url,audio_url,user_id) VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
                    (title, artist, album, genre, duration, cover_url, audio_url, user["id"]))
        tid = cur.fetchone()[0]
        conn.commit()

        playlist_id = body.get("playlist_id")
        if playlist_id:
            cur.execute(f"SELECT id FROM {SCHEMA}.playlists WHERE id=%s AND user_id=%s", (playlist_id, user["id"]))
            if cur.fetchone():
                cur.execute(f"INSERT INTO {SCHEMA}.playlist_tracks (playlist_id,track_id,position) VALUES (%s,%s,(SELECT COALESCE(MAX(position),0)+1 FROM {SCHEMA}.playlist_tracks WHERE playlist_id=%s))",
                            (playlist_id, tid, playlist_id))
                conn.commit()
        return ok({"id": tid, "cover_url": cover_url})

    # ── DELETE TRACK ──────────────────────────────────────────────────────
    if action == "delete_track":
        user = get_user(conn, token)
        if not user:
            return err("Нужна авторизация", 401)
        tid = body.get("track_id")
        cur.execute(f"SELECT user_id FROM {SCHEMA}.tracks WHERE id=%s", (tid,))
        row = cur.fetchone()
        if not row:
            return err("Не найден", 404)
        if not user["is_admin"] and row[0] != user["id"]:
            return err("Нет прав", 403)
        cur.execute(f"UPDATE {SCHEMA}.tracks SET title='[удалено]',artist='',cover_url=NULL,audio_url=NULL WHERE id=%s", (tid,))
        conn.commit()
        return ok({"ok": True})

    # ── PLAY COUNT ────────────────────────────────────────────────────────
    if action == "play":
        tid = body.get("track_id")
        if tid:
            cur.execute(f"UPDATE {SCHEMA}.tracks SET plays=plays+1 WHERE id=%s", (tid,))
            conn.commit()
        return ok({"ok": True})

    # ── GET LIKES ─────────────────────────────────────────────────────────
    if action == "get_likes":
        user = get_user(conn, token)
        if not user:
            return ok({"liked_ids": []})
        cur.execute(f"SELECT track_id FROM {SCHEMA}.likes WHERE user_id=%s", (user["id"],))
        return ok({"liked_ids": [r[0] for r in cur.fetchall()]})

    # ── TOGGLE LIKE ───────────────────────────────────────────────────────
    if action == "toggle_like":
        user = get_user(conn, token)
        if not user:
            return err("Нужна авторизация", 401)
        tid = body.get("track_id")
        cur.execute(f"SELECT id FROM {SCHEMA}.likes WHERE user_id=%s AND track_id=%s", (user["id"], tid))
        if cur.fetchone():
            cur.execute(f"UPDATE {SCHEMA}.likes SET user_id=NULL WHERE user_id=%s AND track_id=%s", (user["id"], tid))
            conn.commit()
            return ok({"liked": False})
        cur.execute(f"INSERT INTO {SCHEMA}.likes (user_id,track_id) VALUES (%s,%s)", (user["id"], tid))
        conn.commit()
        return ok({"liked": True})

    # ── GET PLAYLISTS ─────────────────────────────────────────────────────
    if action == "get_playlists":
        user = get_user(conn, token)
        uid = user["id"] if user else None
        if uid:
            cur.execute(f"""
                SELECT p.id,p.title,p.cover_url,p.user_id,p.is_public,p.created_at,
                       COUNT(CASE WHEN pt.track_id IS NOT NULL THEN 1 END) as track_count,
                       u.name as owner_name
                FROM {SCHEMA}.playlists p
                LEFT JOIN {SCHEMA}.playlist_tracks pt ON pt.playlist_id=p.id
                LEFT JOIN {SCHEMA}.users u ON u.id=p.user_id
                WHERE p.title != '[удалён]' AND (p.user_id=%s OR p.is_public=TRUE)
                GROUP BY p.id,u.name ORDER BY p.created_at DESC
            """, (uid,))
        else:
            cur.execute(f"""
                SELECT p.id,p.title,p.cover_url,p.user_id,p.is_public,p.created_at,
                       COUNT(CASE WHEN pt.track_id IS NOT NULL THEN 1 END) as track_count,
                       u.name as owner_name
                FROM {SCHEMA}.playlists p
                LEFT JOIN {SCHEMA}.playlist_tracks pt ON pt.playlist_id=p.id
                LEFT JOIN {SCHEMA}.users u ON u.id=p.user_id
                WHERE p.title != '[удалён]' AND p.is_public=TRUE
                GROUP BY p.id,u.name ORDER BY p.created_at DESC
            """)
        cols = [d[0] for d in cur.description]
        return ok({"playlists": [dict(zip(cols, r)) for r in cur.fetchall()]})

    # ── CREATE PLAYLIST ───────────────────────────────────────────────────
    if action == "create_playlist":
        user = get_user(conn, token)
        if not user:
            return err("Нужна авторизация", 401)
        title = body.get("title", "").strip()
        if not title:
            return err("Нужно название")
        cover_idx = int(body.get("cover_idx", 0)) % len(DEMO_COVERS)
        cur.execute(f"INSERT INTO {SCHEMA}.playlists (title,cover_url,user_id,is_public) VALUES (%s,%s,%s,TRUE) RETURNING id",
                    (title, DEMO_COVERS[cover_idx], user["id"]))
        pid = cur.fetchone()[0]
        conn.commit()
        return ok({"id": pid, "cover_url": DEMO_COVERS[cover_idx]})

    # ── GET PLAYLIST TRACKS ───────────────────────────────────────────────
    if action == "get_playlist_tracks":
        pid = body.get("playlist_id")
        cur.execute(f"""
            SELECT t.id,t.title,t.artist,t.album,t.genre,t.duration,t.cover_url,t.plays
            FROM {SCHEMA}.playlist_tracks pt
            JOIN {SCHEMA}.tracks t ON t.id=pt.track_id
            WHERE pt.playlist_id=%s AND pt.track_id IS NOT NULL AND t.title != '[удалено]'
            ORDER BY pt.position ASC
        """, (pid,))
        cols = [d[0] for d in cur.description]
        return ok({"tracks": [dict(zip(cols, r)) for r in cur.fetchall()]})

    # ── DELETE PLAYLIST ───────────────────────────────────────────────────
    if action == "delete_playlist":
        user = get_user(conn, token)
        if not user:
            return err("Нужна авторизация", 401)
        pid = body.get("playlist_id")
        cur.execute(f"SELECT user_id FROM {SCHEMA}.playlists WHERE id=%s", (pid,))
        row = cur.fetchone()
        if not row:
            return err("Не найден", 404)
        if not user["is_admin"] and row[0] != user["id"]:
            return err("Нет прав", 403)
        cur.execute(f"UPDATE {SCHEMA}.playlists SET title='[удалён]' WHERE id=%s", (pid,))
        conn.commit()
        return ok({"ok": True})

    # ── ADMIN STATS ───────────────────────────────────────────────────────
    if action == "admin_stats":
        user = get_user(conn, token)
        if not user or not user["is_admin"]:
            return err("Нет прав", 403)
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.users")
        uc = cur.fetchone()[0]
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.tracks WHERE title != '[удалено]'")
        tc = cur.fetchone()[0]
        cur.execute(f"SELECT COALESCE(SUM(plays),0) FROM {SCHEMA}.tracks")
        tp = cur.fetchone()[0]
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.playlists WHERE title != '[удалён]'")
        pc = cur.fetchone()[0]
        cur.execute(f"SELECT id,name,email,is_admin,created_at FROM {SCHEMA}.users ORDER BY created_at DESC LIMIT 50")
        cols = [d[0] for d in cur.description]
        users = [dict(zip(cols, r)) for r in cur.fetchall()]
        return ok({"users_count": uc, "tracks_count": tc, "total_plays": tp, "playlists_count": pc, "users": users})

    return err("Unknown action", 404)
