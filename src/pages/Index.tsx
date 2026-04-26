/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

const API = "https://functions.poehali.dev/5dc56653-e965-4902-aa14-a82309617f97";
const DEMO_COVERS = [
  "https://cdn.poehali.dev/projects/ad1c764b-0be2-4555-9cc2-17f61a805892/files/49c37eb0-61ef-4cc0-a9a1-f7ed30b639eb.jpg",
  "https://cdn.poehali.dev/projects/ad1c764b-0be2-4555-9cc2-17f61a805892/files/e226d5e6-931d-46bf-a95b-86f5df7b18b5.jpg",
  "https://cdn.poehali.dev/projects/ad1c764b-0be2-4555-9cc2-17f61a805892/files/cee3d85e-99d8-4521-b780-bc2d132a4c1c.jpg",
  "https://cdn.poehali.dev/projects/ad1c764b-0be2-4555-9cc2-17f61a805892/files/a2cea60b-8dea-4b28-960c-6d1a112842c3.jpg",
];
const GENRES = ["Электронная", "Поп", "Рок", "Джаз", "Классика", "Хип-хоп", "R&B", "Инди"];

type Page = "home" | "search" | "library" | "playlists" | "profile" | "auth" | "admin" | "upload";

interface Track { id: number; title: string; artist: string; album?: string; genre?: string; duration: number; cover_url?: string; audio_url?: string; plays: number; liked?: boolean; is_demo?: boolean; }
interface Playlist { id: number; title: string; cover_url?: string; track_count?: number; user_id?: number; owner_name?: string; }
interface User { id: number; name: string; email: string; is_admin: boolean; }

function apiCall(action: string, data: Record<string, unknown> = {}, token?: string | null) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["X-Authorization"] = `Bearer ${token}`;
  return fetch(API, {
    method: "POST",
    headers,
    body: JSON.stringify({ action, ...data }),
  }).then(r => r.json()).catch(() => ({ error: "Нет соединения с сервером" }));
}

function fmtDur(sec: number) {
  if (!sec) return "0:00";
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

function fmtProgress(pct: number, total: number) {
  const s = Math.floor((pct / 100) * total);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function Index() {
  const [page, setPage] = useState<Page>("home");
  const [theme, setTheme] = useState<"dark" | "light">(() => (localStorage.getItem("vafla_theme") as "dark" | "light") || "dark");
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("vafla_token"));
  const [user, setUser] = useState<User | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(75);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [activePlaylistId, setActivePlaylistId] = useState<number | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<Track[]>([]);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (theme === "light") document.documentElement.classList.add("theme-light");
    else document.documentElement.classList.remove("theme-light");
    localStorage.setItem("vafla_theme", theme);
  }, [theme]);

  useEffect(() => {
    if (token) {
      apiCall("me", {}, token).then(d => {
        if (d.user) setUser(d.user);
        else { setToken(null); localStorage.removeItem("vafla_token"); }
      });
    }
  }, [token]);

  const loadTracks = useCallback(() => {
    apiCall("get_tracks", {}, token).then(d => { if (d.tracks) setTracks(d.tracks); });
  }, [token]);

  const loadPlaylists = useCallback(() => {
    apiCall("get_playlists", {}, token).then(d => {
      if (d.playlists) setPlaylists(d.playlists);
    });
  }, [token]);

  const loadLikes = useCallback(() => {
    if (!token) return;
    apiCall("get_likes", {}, token).then(d => { if (d.liked_ids) setLikedIds(new Set(d.liked_ids)); });
  }, [token]);

  useEffect(() => { loadTracks(); loadPlaylists(); }, [loadTracks, loadPlaylists]);
  useEffect(() => { loadLikes(); }, [loadLikes]);

  useEffect(() => {
    if (isPlaying) {
      progressInterval.current = setInterval(() => setProgress(p => p >= 100 ? 0 : p + 0.05), 50);
    } else {
      if (progressInterval.current) clearInterval(progressInterval.current);
    }
    return () => { if (progressInterval.current) clearInterval(progressInterval.current); };
  }, [isPlaying]);

  const playTrack = (track: Track) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    setProgress(0);
    apiCall("play", { track_id: track.id }, token);
  };

  const nextTrack = () => {
    const list = tracks.filter(t => t.title !== "[удалено]");
    if (!currentTrack || !list.length) return;
    const idx = list.findIndex(t => t.id === currentTrack.id);
    playTrack(list[(idx + 1) % list.length]);
  };

  const prevTrack = () => {
    const list = tracks.filter(t => t.title !== "[удалено]");
    if (!currentTrack || !list.length) return;
    const idx = list.findIndex(t => t.id === currentTrack.id);
    playTrack(list[(idx - 1 + list.length) % list.length]);
  };

  const randomTrack = () => {
    const list = tracks.filter(t => t.title !== "[удалено]");
    if (!list.length) return;
    playTrack(list[Math.floor(Math.random() * list.length)]);
  };

  const toggleLike = async (trackId: number) => {
    if (!token) { setPage("auth"); return; }
    const res = await apiCall("toggle_like", { track_id: trackId }, token);
    if (res.liked !== undefined) {
      setLikedIds(prev => {
        const next = new Set(prev);
        if (res.liked) { next.add(trackId); } else { next.delete(trackId); }
        return next;
      });
    }
  };

  const handleLogin = async (email: string, password: string) => {
    setAuthLoading(true);
    const d = await apiCall("login", { email, password });
    setAuthLoading(false);
    if (d.token) {
      setToken(d.token); setUser(d.user);
      localStorage.setItem("vafla_token", d.token);
      setPage("home"); loadLikes();
      return null;
    }
    return d.error || "Ошибка входа";
  };

  const handleRegister = async (name: string, email: string, password: string) => {
    setAuthLoading(true);
    const d = await apiCall("register", { name, email, password });
    setAuthLoading(false);
    if (d.token) {
      setToken(d.token); setUser(d.user);
      localStorage.setItem("vafla_token", d.token);
      setPage("home"); return null;
    }
    return d.error || "Ошибка регистрации";
  };

  const handleLogout = async () => {
    if (token) await apiCall("logout", {}, token);
    setToken(null); setUser(null); setLikedIds(new Set());
    localStorage.removeItem("vafla_token"); setPage("home");
  };

  const openPlaylist = async (id: number) => {
    setActivePlaylistId(id);
    const d = await apiCall("get_playlist_tracks", { playlist_id: id }, token);
    if (d.tracks) setPlaylistTracks(d.tracks);
  };

  const createPlaylist = async (title: string, coverIdx: number) => {
    if (!token) { setPage("auth"); return null; }
    const d = await apiCall("create_playlist", { title, cover_idx: coverIdx }, token);
    if (d.id) { loadPlaylists(); return d.id; }
    return null;
  };

  const deletePlaylist = async (id: number) => {
    if (!token) return;
    await apiCall("delete_playlist", { playlist_id: id }, token);
    loadPlaylists();
    if (activePlaylistId === id) setActivePlaylistId(null);
  };

  const deleteTrack = async (id: number) => {
    if (!token) return;
    await apiCall("delete_track", { track_id: id }, token);
    loadTracks();
  };

  const navGo = (p: Page) => { setPage(p); setSidebarOpen(false); };

  const visibleTracks = tracks.filter(t => t.title !== "[удалено]");
  const likedTracks = visibleTracks.filter(t => likedIds.has(t.id));
  const searchTracks = searchQuery
    ? visibleTracks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.artist.toLowerCase().includes(searchQuery.toLowerCase()))
    : visibleTracks;
  const randPlaylists = playlists.slice(0, 2);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {/* HEADER */}
      <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-border glass z-20 shrink-0">
        <div className="flex items-center gap-3">
          <button className="p-1.5 rounded-lg hover:bg-secondary transition-colors md:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Icon name="Menu" size={20} />
          </button>
          <button onClick={() => navGo("home")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 rounded-lg bg-neon flex items-center justify-center glow-neon">
              <Icon name="Waves" size={14} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">Вафля</span>
          </button>
        </div>

        <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Треки, исполнители..." value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage("search"); }}
              className="w-full bg-secondary border border-border rounded-full pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon/50 focus:ring-1 focus:ring-neon/30 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
            className="p-2 rounded-full bg-secondary hover:bg-secondary/70 transition-colors"
          >
            <Icon name={theme === "dark" ? "Sun" : "Moon"} size={16} className="text-foreground" />
          </button>
          {user ? (
            <button onClick={() => navGo(user.is_admin ? "admin" : "profile")}
              className="flex items-center gap-2 py-1.5 px-3 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-neon flex items-center justify-center text-xs font-bold text-white">
                {user.name[0].toUpperCase()}
              </div>
              <span className="text-sm font-medium hidden sm:block">{user.name}</span>
              {user.is_admin && <span className="text-xs text-neon font-bold hidden sm:block">ADMIN</span>}
            </button>
          ) : (
            <button onClick={() => navGo("auth")} className="py-1.5 px-4 rounded-full bg-neon text-white text-sm font-semibold hover:opacity-90 transition-opacity glow-neon">
              Войти
            </button>
          )}
        </div>
      </header>

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden relative">
        {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-10 md:hidden" onClick={() => setSidebarOpen(false)} />}
        <aside className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 w-56 shrink-0 border-r border-border surface-1 flex flex-col transition-transform duration-300 absolute md:relative z-20 md:z-auto h-full`}>
          <nav className="flex-1 py-4 overflow-y-auto">
            <div className="px-3 mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-3 mb-2">Меню</p>
              {([
                { id: "home", label: "Главная", icon: "Home" },
                { id: "search", label: "Поиск", icon: "Search" },
                { id: "library", label: "Моя музыка", icon: "Music2" },
                { id: "playlists", label: "Плейлисты", icon: "ListMusic" },
                { id: "upload", label: "Загрузить трек", icon: "Upload" },
              ] as {id: Page; label: string; icon: string}[]).map(item => (
                <button key={item.id} onClick={() => navGo(item.id)}
                  className={`sidebar-item flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium mb-0.5 ${page === item.id ? "active" : "text-muted-foreground"}`}
                >
                  <Icon name={item.icon as any} size={18} />
                  {item.label}
                </button>
              ))}
              {user?.is_admin && (
                <button onClick={() => navGo("admin")}
                  className={`sidebar-item flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium mb-0.5 ${page === "admin" ? "active" : "text-muted-foreground"}`}
                >
                  <Icon name="ShieldCheck" size={18} />Админ-панель
                </button>
              )}
            </div>
            <div className="px-3 mt-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-3 mb-2">Плейлисты</p>
              {playlists.slice(0, 6).map(pl => (
                <button key={pl.id} onClick={() => { openPlaylist(pl.id); navGo("playlists"); }}
                  className="sidebar-item flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground mb-0.5"
                >
                  <img src={pl.cover_url || DEMO_COVERS[0]} alt="" className="w-6 h-6 rounded object-cover" />
                  <span className="truncate">{pl.title}</span>
                </button>
              ))}
              <button onClick={() => navGo("playlists")} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors mt-1">
                <div className="w-6 h-6 rounded border border-dashed border-border flex items-center justify-center">
                  <Icon name="Plus" size={12} />
                </div>
                <span>Новый плейлист</span>
              </button>
            </div>
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto">
          {page === "home" && <HomePage tracks={visibleTracks} likedTracks={likedTracks} playlists={randPlaylists} onPlay={playTrack} onRandom={randomTrack} currentTrack={currentTrack} isPlaying={isPlaying} likedIds={likedIds} onLike={toggleLike} onOpenPlaylist={id => { openPlaylist(id); setPage("playlists"); }} setIsPlaying={setIsPlaying} />}
          {page === "search" && <SearchPage tracks={searchTracks} query={searchQuery} setQuery={(q: string) => setSearchQuery(q)} onPlay={playTrack} currentTrack={currentTrack} isPlaying={isPlaying} likedIds={likedIds} onLike={toggleLike} setIsPlaying={setIsPlaying} />}
          {page === "library" && <LibraryPage tracks={likedTracks} onPlay={playTrack} currentTrack={currentTrack} isPlaying={isPlaying} likedIds={likedIds} onLike={toggleLike} setIsPlaying={setIsPlaying} />}
          {page === "playlists" && <PlaylistsPage playlists={playlists} activeId={activePlaylistId} playlistTracks={playlistTracks} onOpen={openPlaylist} onBack={() => setActivePlaylistId(null)} onPlay={playTrack} currentTrack={currentTrack} isPlaying={isPlaying} likedIds={likedIds} onLike={toggleLike} onCreate={createPlaylist} onDelete={deletePlaylist} setIsPlaying={setIsPlaying} user={user} />}
          {page === "upload" && <UploadPage token={token} playlists={playlists} onDone={() => { loadTracks(); setPage("home"); }} onAuth={() => setPage("auth")} />}
          {page === "profile" && <ProfilePage user={user} likedCount={likedIds.size} playlistCount={playlists.filter(p => p.user_id === user?.id).length} onLogout={handleLogout} onNavigate={navGo} />}
          {page === "auth" && <AuthPage onLogin={handleLogin} onRegister={handleRegister} loading={authLoading} />}
          {page === "admin" && <AdminPage token={token} user={user} onDeleteTrack={deleteTrack} onDeletePlaylist={deletePlaylist} onLogout={handleLogout} tracks={visibleTracks} allPlaylists={playlists} />}
        </main>
      </div>

      {currentTrack && (
        <Player track={currentTrack} isPlaying={isPlaying} progress={progress} volume={volume} liked={likedIds.has(currentTrack.id)}
          onTogglePlay={() => setIsPlaying(p => !p)} onNext={nextTrack} onPrev={prevTrack}
          onProgress={setProgress} onVolume={setVolume} onLike={() => toggleLike(currentTrack.id)}
        />
      )}
    </div>
  );
}

/* ─── HOME PAGE ─── */
function HomePage({ tracks, likedTracks, playlists, onPlay, onRandom, currentTrack, isPlaying, likedIds, onLike, onOpenPlaylist, setIsPlaying }: any) {
  const favCover = likedTracks[0]?.cover_url || DEMO_COVERS[0];
  return (
    <div className="p-6 pb-4 animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">Добро пожаловать</h1>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <button className="flex items-center gap-3 bg-secondary rounded-xl p-3 hover:bg-secondary/70 transition-colors text-left">
          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
            <img src={favCover} alt="" className="w-full h-full object-cover" />
          </div>
          <span className="text-sm font-semibold truncate">Любимые</span>
        </button>
        <button onClick={onRandom} className="flex items-center gap-3 bg-neon/10 border border-neon/20 rounded-xl p-3 hover:bg-neon/20 transition-colors text-left">
          <div className="w-10 h-10 rounded-lg bg-neon/20 flex items-center justify-center shrink-0">
            <Icon name="Shuffle" size={18} className="text-neon" />
          </div>
          <span className="text-sm font-semibold truncate text-neon">Рандом</span>
        </button>
        {playlists.map((pl: any) => (
          <button key={pl.id} onClick={() => onOpenPlaylist(pl.id)} className="flex items-center gap-3 bg-secondary rounded-xl p-3 hover:bg-secondary/70 transition-colors text-left">
            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
              <img src={pl.cover_url || DEMO_COVERS[0]} alt="" className="w-full h-full object-cover" />
            </div>
            <span className="text-sm font-semibold truncate">{pl.title}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Популярные треки</h2>
      </div>
      {tracks.length === 0
        ? <EmptyState icon="Music2" text="Треков пока нет. Загрузи свою музыку!" />
        : <TrackList tracks={tracks} onPlay={onPlay} currentTrack={currentTrack} isPlaying={isPlaying} likedIds={likedIds} onLike={onLike} setIsPlaying={setIsPlaying} />
      }
    </div>
  );
}

/* ─── SEARCH PAGE ─── */
function SearchPage({ tracks, query, setQuery, onPlay, currentTrack, isPlaying, likedIds, onLike, setIsPlaying }: any) {
  const COLORS = ["from-purple-900 to-purple-700","from-red-900 to-red-700","from-teal-900 to-teal-700","from-yellow-900 to-yellow-700","from-blue-900 to-blue-700","from-pink-900 to-pink-700","from-green-900 to-green-700","from-orange-900 to-orange-700"];
  return (
    <div className="p-6 pb-4 animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">Поиск</h1>
      <div className="relative mb-8">
        <Icon name="Search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input type="text" placeholder="Что хочешь послушать?" value={query} onChange={e => setQuery(e.target.value)}
          className="w-full bg-secondary border border-border rounded-xl pl-12 pr-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon/50 focus:ring-2 focus:ring-neon/20 text-base"
        />
      </div>
      {query ? (
        tracks.length === 0 ? <EmptyState icon="SearchX" text="Ничего не найдено" /> :
        <TrackList tracks={tracks} onPlay={onPlay} currentTrack={currentTrack} isPlaying={isPlaying} likedIds={likedIds} onLike={onLike} setIsPlaying={setIsPlaying} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {GENRES.map((g, i) => (
            <div key={g} className={`bg-gradient-to-br ${COLORS[i]} rounded-xl p-4 h-20 flex items-end cursor-pointer hover:opacity-90`} onClick={() => setQuery(g)}>
              <span className="font-bold text-white text-sm">{g}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── LIBRARY PAGE ─── */
function LibraryPage({ tracks, onPlay, currentTrack, isPlaying, likedIds, onLike, setIsPlaying }: any) {
  return (
    <div className="p-6 pb-4 animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">Моя музыка</h1>
      {tracks.length === 0
        ? <EmptyState icon="Heart" text="Лайкни треки — они появятся здесь" />
        : <TrackList tracks={tracks} onPlay={onPlay} currentTrack={currentTrack} isPlaying={isPlaying} likedIds={likedIds} onLike={onLike} setIsPlaying={setIsPlaying} />
      }
    </div>
  );
}

/* ─── PLAYLISTS PAGE ─── */
function PlaylistsPage({ playlists, activeId, playlistTracks, onOpen, onBack, onPlay, currentTrack, isPlaying, likedIds, onLike, onCreate, onDelete, setIsPlaying, user }: any) {
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [coverIdx, setCoverIdx] = useState(0);
  const active = playlists.find((p: any) => p.id === activeId);

  if (activeId && active) {
    return (
      <div className="p-6 pb-4 animate-fade-in">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <Icon name="ChevronLeft" size={16} />Назад
        </button>
        <div className="flex items-start gap-6 mb-8">
          <img src={active.cover_url || DEMO_COVERS[0]} className="w-32 h-32 rounded-xl object-cover" alt="" />
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Плейлист</p>
            <h2 className="text-2xl font-bold mb-1">{active.title}</h2>
            <p className="text-muted-foreground text-sm">{active.track_count || playlistTracks.length} треков</p>
            <div className="flex gap-2 mt-3 flex-wrap">
              <button onClick={() => playlistTracks[0] && onPlay(playlistTracks[0])} className="flex items-center gap-2 bg-neon text-white text-sm px-5 py-2 rounded-full font-semibold hover:opacity-90 glow-neon">
                <Icon name="Play" size={14} />Воспроизвести
              </button>
              {(user?.is_admin || user?.id === active.user_id) && (
                <button onClick={() => onDelete(activeId)} className="flex items-center gap-2 bg-secondary text-sm px-4 py-2 rounded-full text-muted-foreground hover:text-destructive transition-colors">
                  <Icon name="Trash2" size={14} />Удалить
                </button>
              )}
            </div>
          </div>
        </div>
        {playlistTracks.length === 0
          ? <EmptyState icon="Music" text="В плейлисте пока нет треков" />
          : <TrackList tracks={playlistTracks} onPlay={onPlay} currentTrack={currentTrack} isPlaying={isPlaying} likedIds={likedIds} onLike={onLike} setIsPlaying={setIsPlaying} />
        }
      </div>
    );
  }

  return (
    <div className="p-6 pb-4 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Плейлисты</h1>
        <button onClick={() => setCreating(true)} className="flex items-center gap-2 text-sm bg-secondary text-foreground px-4 py-2 rounded-full font-medium hover:bg-secondary/70 border border-border">
          <Icon name="Plus" size={14} />Создать
        </button>
      </div>
      {creating && (
        <div className="mb-6 p-4 bg-card border border-border rounded-xl animate-fade-in">
          <p className="text-sm font-semibold mb-3">Новый плейлист</p>
          <input type="text" placeholder="Название" value={newTitle} onChange={e => setNewTitle(e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon/50 mb-3"
          />
          <div className="flex gap-2 mb-3">
            {DEMO_COVERS.map((c, i) => (
              <button key={i} onClick={() => setCoverIdx(i)} className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-colors ${coverIdx === i ? "border-neon" : "border-transparent"}`}>
                <img src={c} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={async () => { if (newTitle.trim()) { await onCreate(newTitle.trim(), coverIdx); setCreating(false); setNewTitle(""); }}}
              className="px-4 py-2 bg-neon text-white text-sm rounded-lg font-semibold hover:opacity-90 glow-neon">Создать</button>
            <button onClick={() => setCreating(false)} className="px-4 py-2 bg-secondary text-sm rounded-lg text-muted-foreground hover:text-foreground">Отмена</button>
          </div>
        </div>
      )}
      {playlists.length === 0 && !creating
        ? <EmptyState icon="ListMusic" text="Плейлистов пока нет. Создай первый!" />
        : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {playlists.map((pl: any) => (
              <div key={pl.id} className="album-card cursor-pointer" onClick={() => onOpen(pl.id)}>
                <div className="relative rounded-xl overflow-hidden aspect-square mb-3">
                  <img src={pl.cover_url || DEMO_COVERS[0]} alt={pl.title} className="w-full h-full object-cover" />
                  <div className="play-overlay absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-neon flex items-center justify-center glow-neon">
                      <Icon name="Play" size={18} className="text-white ml-0.5" />
                    </div>
                  </div>
                </div>
                <p className="font-semibold text-sm truncate">{pl.title}</p>
                <p className="text-muted-foreground text-xs mt-0.5">{pl.track_count || 0} треков</p>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}

/* ─── UPLOAD PAGE ─── */
function UploadPage({ token, playlists, onDone, onAuth }: any) {
  const [form, setForm] = useState({ title: "", artist: "", album: "", genre: "", playlist_id: "" });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="p-6 flex flex-col items-center justify-center py-24">
        <Icon name="Lock" size={40} className="text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-4">Нужно войти в аккаунт</p>
        <button onClick={onAuth} className="px-6 py-2.5 bg-neon text-white rounded-full font-semibold glow-neon">Войти</button>
      </div>
    );
  }

  const toB64 = (file: File): Promise<string> =>
    new Promise(res => { const r = new FileReader(); r.onload = () => res((r.result as string).split(",")[1]); r.readAsDataURL(file); });

  const submit = async () => {
    if (!form.title || !form.artist) { setError("Заполни название и исполнителя"); return; }
    setLoading(true); setError("");
    const body: any = { ...form };
    if (form.playlist_id) body.playlist_id = Number(form.playlist_id);
    if (coverFile) { body.cover_b64 = await toB64(coverFile); body.cover_ext = coverFile.name.split(".").pop(); }
    if (audioFile) { body.audio_b64 = await toB64(audioFile); body.audio_ext = audioFile.name.split(".").pop(); }
    const d = await apiCall("upload_track", body as Record<string, unknown>, token);
    setLoading(false);
    if (d.id) { setSuccess(true); setTimeout(onDone, 1200); }
    else setError(d.error || "Ошибка загрузки");
  };

  return (
    <div className="p-6 pb-4 animate-fade-in max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Загрузить трек</h1>
      {success ? (
        <div className="flex flex-col items-center py-12">
          <Icon name="CheckCircle2" size={48} className="text-neon mb-4 glow-text" />
          <p className="text-lg font-semibold">Трек загружен!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-xl overflow-hidden bg-secondary border border-dashed border-border flex items-center justify-center shrink-0">
              {coverPreview ? <img src={coverPreview} className="w-full h-full object-cover" alt="" /> : <Icon name="Image" size={28} className="text-muted-foreground" />}
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Обложка</p>
              <label className="cursor-pointer px-4 py-2 bg-secondary rounded-lg text-sm text-foreground hover:bg-secondary/70 transition-colors">
                Выбрать изображение
                <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setCoverFile(f); setCoverPreview(URL.createObjectURL(f)); }}} />
              </label>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG до 5 МБ</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-1">Аудиофайл</p>
            <label className={`flex items-center gap-3 cursor-pointer px-4 py-3 rounded-lg border border-dashed ${audioFile ? "border-neon bg-neon/5" : "border-border bg-secondary"} transition-colors`}>
              <Icon name={audioFile ? "Music" : "Upload"} size={18} className={audioFile ? "text-neon" : "text-muted-foreground"} />
              <span className="text-sm">{audioFile ? audioFile.name : "Выбрать MP3, FLAC, WAV"}</span>
              <input type="file" accept="audio/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setAudioFile(f); }} />
            </label>
          </div>
          <input type="text" placeholder="Название трека *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            className="bg-secondary border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon/50"
          />
          <input type="text" placeholder="Исполнитель *" value={form.artist} onChange={e => setForm({ ...form, artist: e.target.value })}
            className="bg-secondary border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon/50"
          />
          <input type="text" placeholder="Альбом (необязательно)" value={form.album} onChange={e => setForm({ ...form, album: e.target.value })}
            className="bg-secondary border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon/50"
          />
          <select value={form.genre} onChange={e => setForm({ ...form, genre: e.target.value })}
            className="bg-secondary border border-border rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:border-neon/50"
          >
            <option value="">Жанр (необязательно)</option>
            {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          {playlists.length > 0 && (
            <select value={form.playlist_id} onChange={e => setForm({ ...form, playlist_id: e.target.value })}
              className="bg-secondary border border-border rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:border-neon/50"
            >
              <option value="">Добавить в плейлист (необязательно)</option>
              {playlists.map((p: any) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          )}
          {error && <p className="text-destructive text-sm">{error}</p>}
          <button onClick={submit} disabled={loading}
            className="w-full py-3 bg-neon text-white font-semibold rounded-lg hover:opacity-90 glow-neon disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <><Icon name="Loader2" size={16} className="animate-spin" />Загружаю...</> : <><Icon name="Upload" size={16} />Загрузить</>}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── PROFILE PAGE ─── */
function ProfilePage({ user, likedCount, playlistCount, onLogout, onNavigate }: any) {
  return (
    <div className="p-6 pb-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8 p-6 rounded-2xl surface-2 border border-border">
        <div className="w-20 h-20 rounded-full bg-neon flex items-center justify-center text-3xl font-bold text-white glow-neon">
          {user?.name[0].toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-1">{user?.name}</h1>
          <p className="text-muted-foreground text-sm mb-3">{user?.email}</p>
          <div className="flex gap-4 text-sm">
            <span><b>{likedCount}</b> <span className="text-muted-foreground">в избранном</span></span>
            <span><b>{playlistCount}</b> <span className="text-muted-foreground">плейлистов</span></span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => onNavigate("upload")} className="flex items-center gap-2 px-4 py-2 rounded-full bg-neon text-white text-sm font-semibold glow-neon hover:opacity-90">
            <Icon name="Upload" size={14} />Загрузить трек
          </button>
          <button onClick={onLogout} className="px-4 py-2 rounded-full bg-secondary text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">Выйти</button>
        </div>
      </div>
    </div>
  );
}

/* ─── AUTH PAGE ─── */
function AuthPage({ onLogin, onRegister, loading }: any) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    const err = mode === "login"
      ? await onLogin(form.email, form.password)
      : await onRegister(form.name, form.email, form.password);
    if (err) setError(err);
  };

  return (
    <div className="flex items-center justify-center min-h-full p-6 animate-fade-in">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-neon flex items-center justify-center mx-auto mb-4 glow-neon">
            <Icon name="Waves" size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold">Вафля</h1>
          <p className="text-muted-foreground text-sm mt-1">{mode === "login" ? "Войди в аккаунт" : "Создай аккаунт"}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex rounded-lg bg-secondary p-1 mb-5">
            {(["login","register"] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
                {m === "login" ? "Войти" : "Регистрация"}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            {mode === "register" && (
              <input type="text" placeholder="Имя" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="bg-secondary border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon/50"
              />
            )}
            <input type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              className="bg-secondary border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon/50"
            />
            <input type="password" placeholder="Пароль" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              onKeyDown={e => e.key === "Enter" && submit()}
              className="bg-secondary border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon/50"
            />
            {error && <p className="text-destructive text-sm">{error}</p>}
            <button onClick={submit} disabled={loading} className="w-full py-3 bg-neon text-white font-semibold text-sm rounded-lg hover:opacity-90 glow-neon mt-1 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><Icon name="Loader2" size={16} className="animate-spin" />Загрузка...</> : (mode === "login" ? "Войти" : "Зарегистрироваться")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── ADMIN PAGE ─── */
function AdminPage({ token, user, onDeleteTrack, onDeletePlaylist, onLogout, tracks: initTracks, allPlaylists: initPlaylists }: any) {
  const [stats, setStats] = useState<any>(null);
  const [tab, setTab] = useState<"playlists" | "tracks" | "users">("playlists");
  const [trackList, setTrackList] = useState<Track[]>(initTracks || []);
  const [playlists, setPlaylists] = useState<any[]>(initPlaylists || []);

  useEffect(() => {
    if (!token) return;
    apiCall("admin_stats", {}, token).then(d => { if (d.users_count !== undefined) setStats(d); });
  }, [token]);

  useEffect(() => { setTrackList(initTracks || []); }, [initTracks]);
  useEffect(() => { setPlaylists(initPlaylists || []); }, [initPlaylists]);

  if (!user?.is_admin) return <div className="p-6"><p className="text-muted-foreground">Нет доступа</p></div>;

  return (
    <div className="p-6 pb-4 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Icon name="ShieldCheck" size={22} className="text-neon" />
          <h1 className="text-2xl font-bold">Админ-панель</h1>
        </div>
        <button onClick={onLogout} className="text-sm text-muted-foreground hover:text-destructive transition-colors">Выйти</button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Пользователей", value: stats.users_count, icon: "Users" },
            { label: "Треков", value: stats.tracks_count, icon: "Music2" },
            { label: "Прослушиваний", value: stats.total_plays, icon: "Headphones" },
            { label: "Плейлистов", value: stats.playlists_count, icon: "ListMusic" },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Icon name={s.icon as any} size={14} />
                <span className="text-xs">{s.label}</span>
              </div>
              <p className="text-2xl font-bold text-neon">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {(["playlists","tracks","users"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${tab === t ? "bg-neon text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            {t === "playlists" ? "Плейлисты" : t === "tracks" ? "Треки" : "Пользователи"}
          </button>
        ))}
      </div>

      {tab === "tracks" && (
        <div className="flex flex-col gap-0.5">
          {trackList.map((t: Track) => (
            <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary group">
              <img src={t.cover_url || DEMO_COVERS[0]} className="w-9 h-9 rounded-lg object-cover shrink-0" alt="" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{t.title}</p>
                <p className="text-xs text-muted-foreground">{t.artist} · {t.plays} прослушиваний</p>
              </div>
              <button onClick={() => { onDeleteTrack(t.id); setTrackList(prev => prev.filter(x => x.id !== t.id)); }}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
              ><Icon name="Trash2" size={14} /></button>
            </div>
          ))}
          {trackList.length === 0 && <EmptyState icon="Music2" text="Треков нет" />}
        </div>
      )}

      {tab === "playlists" && (
        <div className="flex flex-col gap-0.5">
          {playlists.map((pl: any) => (
            <div key={pl.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary group">
              <img src={pl.cover_url || DEMO_COVERS[0]} className="w-9 h-9 rounded-lg object-cover shrink-0" alt="" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{pl.title}</p>
                <p className="text-xs text-muted-foreground">{pl.owner_name} · {pl.track_count || 0} треков</p>
              </div>
              <button onClick={() => { onDeletePlaylist(pl.id); setPlaylists(prev => prev.filter((x: any) => x.id !== pl.id)); }}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
              ><Icon name="Trash2" size={14} /></button>
            </div>
          ))}
          {playlists.length === 0 && <EmptyState icon="ListMusic" text="Плейлистов нет" />}
        </div>
      )}

      {tab === "users" && stats?.users && (
        <div className="flex flex-col gap-1">
          {stats.users.map((u: any) => (
            <div key={u.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary">
              <div className="w-8 h-8 rounded-full bg-neon flex items-center justify-center text-xs font-bold text-white shrink-0">
                {u.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{u.name}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </div>
              {u.is_admin && <span className="text-xs text-neon font-bold">ADMIN</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── TRACK LIST ─── */
function TrackList({ tracks, onPlay, currentTrack, isPlaying, likedIds, onLike, setIsPlaying }: any) {
  return (
    <div className="flex flex-col gap-0.5">
      {(tracks as Track[]).map((track, idx) => {
        const isActive = currentTrack?.id === track.id;
        return (
          <div key={track.id}
            className={`flex items-center gap-4 px-3 py-2.5 rounded-xl group cursor-pointer transition-colors ${isActive ? "bg-neon/10" : "hover:bg-secondary"}`}
            onClick={() => onPlay(track)}
          >
            <div className="w-7 flex items-center justify-center shrink-0">
              {isActive && isPlaying ? (
                <div className="flex gap-0.5 items-end h-4">
                  {[1,2,3,4].map(i => <div key={i} className="eq-bar w-0.5 rounded-full bg-neon" style={{animationDelay:`${i*0.1}s`}} />)}
                </div>
              ) : (
                <>
                  <span className="text-sm font-mono text-muted-foreground group-hover:hidden">{idx + 1}</span>
                  <button
                    className="hidden group-hover:flex items-center justify-center text-foreground hover:text-neon"
                    onClick={e => {
                      e.stopPropagation();
                      if (isActive) { setIsPlaying((p: boolean) => !p); }
                      else { onPlay(track); }
                    }}
                  >
                    <Icon name={isActive && isPlaying ? "Pause" : "Play"} size={15} />
                  </button>
                </>
              )}
            </div>
            <img src={track.cover_url || DEMO_COVERS[idx % 4]} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${isActive ? "text-neon" : ""}`}>{track.title}</p>
              <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
            </div>
            <span className="hidden sm:block text-xs text-muted-foreground truncate max-w-24">{track.album || ""}</span>
            <div className="flex items-center gap-3 shrink-0">
              <button onClick={e => { e.stopPropagation(); onLike(track.id); }}
                className={`transition-all ${likedIds.has(track.id) ? "text-neon opacity-100" : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground"}`}
              ><Icon name="Heart" size={15} /></button>
              <span className="text-xs text-muted-foreground font-mono">{fmtDur(track.duration)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── EMPTY STATE ─── */
function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
        <Icon name={icon as any} size={28} className="text-muted-foreground" />
      </div>
      <p className="text-muted-foreground text-sm max-w-xs">{text}</p>
    </div>
  );
}

/* ─── PLAYER ─── */
function Player({ track, isPlaying, progress, volume, liked, onTogglePlay, onNext, onPrev, onProgress, onVolume, onLike }: any) {
  return (
    <div className="glass border-t border-border shrink-0 px-4 py-3 z-20">
      <div className="flex items-center gap-4 max-w-screen-xl mx-auto">
        <div className="flex items-center gap-3 w-48 md:w-64 shrink-0">
          <img src={track.cover_url || DEMO_COVERS[0]} alt="" className={`w-12 h-12 rounded-lg object-cover ${isPlaying ? "animate-pulse-glow" : ""}`} />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{track.title}</p>
            <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
          </div>
          <button onClick={onLike} className={`shrink-0 transition-colors ${liked ? "text-neon" : "text-muted-foreground hover:text-foreground"}`}>
            <Icon name="Heart" size={16} />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center gap-2">
          <div className="flex items-center gap-4">
            <button onClick={onPrev} className="text-muted-foreground hover:text-foreground transition-colors hidden sm:block"><Icon name="SkipBack" size={18} /></button>
            <button onClick={onTogglePlay} className="w-9 h-9 rounded-full bg-neon flex items-center justify-center text-white hover:opacity-90 glow-neon">
              <Icon name={isPlaying ? "Pause" : "Play"} size={16} className={isPlaying ? "" : "ml-0.5"} />
            </button>
            <button onClick={onNext} className="text-muted-foreground hover:text-foreground transition-colors hidden sm:block"><Icon name="SkipForward" size={18} /></button>
          </div>
          <div className="flex items-center gap-2 w-full max-w-lg">
            <span className="text-xs text-muted-foreground font-mono w-8 text-right">{fmtProgress(progress, track.duration || 220)}</span>
            <input type="range" min="0" max="100" value={progress} onChange={e => onProgress(Number(e.target.value))} className="progress-bar flex-1"
              style={{ background: `linear-gradient(to right, hsl(var(--neon)) ${progress}%, hsl(var(--surface-3)) ${progress}%)` }}
            />
            <span className="text-xs text-muted-foreground font-mono w-8">{fmtDur(track.duration || 220)}</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3 w-48 md:w-64 justify-end shrink-0">
          <button className="text-muted-foreground hover:text-foreground transition-colors"><Icon name="Shuffle" size={16} /></button>
          <button className="text-muted-foreground hover:text-foreground transition-colors"><Icon name="Repeat" size={16} /></button>
          <Icon name="Volume2" size={16} className="text-muted-foreground shrink-0" />
          <input type="range" min="0" max="100" value={volume} onChange={e => onVolume(Number(e.target.value))} className="volume-bar"
            style={{ background: `linear-gradient(to right, hsl(var(--foreground)) ${volume}%, hsl(var(--surface-3)) ${volume}%)` }}
          />
        </div>
      </div>
    </div>
  );
}