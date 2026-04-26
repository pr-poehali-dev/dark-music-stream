/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";

const COVERS = {
  purple: "https://cdn.poehali.dev/projects/ad1c764b-0be2-4555-9cc2-17f61a805892/files/49c37eb0-61ef-4cc0-a9a1-f7ed30b639eb.jpg",
  red: "https://cdn.poehali.dev/projects/ad1c764b-0be2-4555-9cc2-17f61a805892/files/e226d5e6-931d-46bf-a95b-86f5df7b18b5.jpg",
  teal: "https://cdn.poehali.dev/projects/ad1c764b-0be2-4555-9cc2-17f61a805892/files/cee3d85e-99d8-4521-b780-bc2d132a4c1c.jpg",
  gold: "https://cdn.poehali.dev/projects/ad1c764b-0be2-4555-9cc2-17f61a805892/files/a2cea60b-8dea-4b28-960c-6d1a112842c3.jpg",
};

const TRACKS = [
  { id: 1, title: "Ночной город", artist: "Нейро Волна", album: "Киберсны", duration: "3:42", cover: COVERS.purple, liked: true },
  { id: 2, title: "Бесконечность", artist: "Звуковой горизонт", album: "Бесконечность", duration: "4:15", cover: COVERS.red, liked: false },
  { id: 3, title: "Цифровой дождь", artist: "Нейро Волна", album: "Киберсны", duration: "3:58", cover: COVERS.teal, liked: true },
  { id: 4, title: "Последний полёт", artist: "Орбита", album: "Затмение", duration: "5:02", cover: COVERS.gold, liked: false },
  { id: 5, title: "Электрический сон", artist: "Пульс", album: "Синтез", duration: "3:27", cover: COVERS.purple, liked: true },
  { id: 6, title: "Туман", artist: "Звуковой горизонт", album: "Бесконечность", duration: "4:33", cover: COVERS.red, liked: false },
];

const ALBUMS = [
  { id: 1, title: "Киберсны", artist: "Нейро Волна", cover: COVERS.purple, year: "2024" },
  { id: 2, title: "Бесконечность", artist: "Звуковой горизонт", cover: COVERS.red, year: "2024" },
  { id: 3, title: "Затмение", artist: "Орбита", cover: COVERS.gold, year: "2023" },
  { id: 4, title: "Синтез", artist: "Пульс", cover: COVERS.teal, year: "2024" },
];

const PLAYLISTS = [
  { id: 1, title: "Мои любимые", count: 24, cover: COVERS.purple },
  { id: 2, title: "Для работы", count: 18, cover: COVERS.teal },
  { id: 3, title: "Вечерний", count: 12, cover: COVERS.gold },
];

const NAV_ITEMS = [
  { id: "home", label: "Главная", icon: "Home" },
  { id: "search", label: "Поиск", icon: "Search" },
  { id: "library", label: "Моя музыка", icon: "Music2" },
  { id: "playlists", label: "Плейлисты", icon: "ListMusic" },
];

type Page = "home" | "search" | "library" | "playlists" | "profile" | "auth";

export default function Index() {
  const [page, setPage] = useState<Page>("home");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(TRACKS[0]);
  const [progress, setProgress] = useState(32);
  const [volume, setVolume] = useState(75);
  const [liked, setLiked] = useState<Set<number>>(new Set([1, 3, 5]));
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState({ name: "Слушатель", email: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [regForm, setRegForm] = useState({ name: "", email: "", password: "" });
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPlaying) {
      progressInterval.current = setInterval(() => {
        setProgress((p) => (p >= 100 ? 0 : p + 0.1));
      }, 100);
    } else {
      if (progressInterval.current) clearInterval(progressInterval.current);
    }
    return () => { if (progressInterval.current) clearInterval(progressInterval.current); };
  }, [isPlaying]);

  const toggleLike = (id: number) => {
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const playTrack = (track: typeof TRACKS[0]) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    setProgress(0);
  };

  const nextTrack = () => {
    const idx = TRACKS.findIndex((t) => t.id === currentTrack.id);
    const next = TRACKS[(idx + 1) % TRACKS.length];
    playTrack(next);
  };

  const prevTrack = () => {
    const idx = TRACKS.findIndex((t) => t.id === currentTrack.id);
    const prev = TRACKS[(idx - 1 + TRACKS.length) % TRACKS.length];
    playTrack(prev);
  };

  const handleLogin = () => {
    if (loginForm.email && loginForm.password) {
      setIsLoggedIn(true);
      setUser({ name: loginForm.email.split("@")[0], email: loginForm.email });
      setPage("home");
    }
  };

  const handleRegister = () => {
    if (regForm.name && regForm.email && regForm.password) {
      setIsLoggedIn(true);
      setUser({ name: regForm.name, email: regForm.email });
      setPage("home");
    }
  };

  const filteredTracks = searchQuery
    ? TRACKS.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.artist.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : TRACKS;

  const formatTime = (pct: number) => {
    const totalSec = 220;
    const sec = Math.floor((pct / 100) * totalSec);
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-border glass z-20 shrink-0">
        <div className="flex items-center gap-3">
          <button
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors md:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Icon name="Menu" size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-neon flex items-center justify-center glow-neon">
              <Icon name="Waves" size={14} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-foreground">Волна</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Треки, исполнители, альбомы..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage("search"); }}
              className="w-full bg-secondary border border-border rounded-full pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon/50 focus:ring-1 focus:ring-neon/30 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <button
              onClick={() => setPage("profile")}
              className="flex items-center gap-2 py-1.5 px-3 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-neon flex items-center justify-center text-xs font-bold text-white">
                {user.name[0].toUpperCase()}
              </div>
              <span className="text-sm font-medium hidden sm:block">{user.name}</span>
            </button>
          ) : (
            <button
              onClick={() => setPage("auth")}
              className="py-1.5 px-4 rounded-full bg-neon text-white text-sm font-semibold hover:opacity-90 transition-opacity glow-neon"
            >
              Войти
            </button>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-10 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside
          className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 w-56 shrink-0 border-r border-border surface-1 flex flex-col transition-transform duration-300 absolute md:relative z-20 md:z-auto h-full`}
        >
          <nav className="flex-1 py-4 overflow-y-auto">
            <div className="px-3 mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-3 mb-2">Меню</p>
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setPage(item.id as Page); setSidebarOpen(false); }}
                  className={`sidebar-item flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium mb-0.5 ${
                    page === item.id ? "active" : "text-muted-foreground"
                  }`}
                >
                  <Icon name={item.icon as any} size={18} />
                  {item.label}
                </button>
              ))}
            </div>

            <div className="px-3 mt-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-3 mb-2">Плейлисты</p>
              {PLAYLISTS.map((pl) => (
                <button
                  key={pl.id}
                  onClick={() => { setPage("playlists"); setSidebarOpen(false); }}
                  className="sidebar-item flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground mb-0.5"
                >
                  <img src={pl.cover} alt="" className="w-6 h-6 rounded object-cover" />
                  <span className="truncate">{pl.title}</span>
                </button>
              ))}
              <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors mt-1">
                <div className="w-6 h-6 rounded border border-dashed border-border flex items-center justify-center">
                  <Icon name="Plus" size={12} />
                </div>
                <span>Новый плейлист</span>
              </button>
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {page === "home" && <HomePage tracks={TRACKS} albums={ALBUMS} onPlay={playTrack} currentTrack={currentTrack} isPlaying={isPlaying} liked={liked} onLike={toggleLike} />}
          {page === "search" && <SearchPage tracks={filteredTracks} query={searchQuery} setQuery={(q: string) => { setSearchQuery(q); }} onPlay={playTrack} currentTrack={currentTrack} isPlaying={isPlaying} liked={liked} onLike={toggleLike} />}
          {page === "library" && <LibraryPage tracks={TRACKS.filter((t) => liked.has(t.id))} onPlay={playTrack} currentTrack={currentTrack} isPlaying={isPlaying} liked={liked} onLike={toggleLike} />}
          {page === "playlists" && <PlaylistsPage playlists={PLAYLISTS} tracks={TRACKS} onPlay={playTrack} currentTrack={currentTrack} isPlaying={isPlaying} liked={liked} onLike={toggleLike} />}
          {page === "profile" && <ProfilePage user={user} tracks={TRACKS} liked={liked} onPlay={playTrack} onLogout={() => { setIsLoggedIn(false); setPage("home"); }} />}
          {page === "auth" && <AuthPage authMode={authMode} setAuthMode={setAuthMode} loginForm={loginForm} setLoginForm={setLoginForm} regForm={regForm} setRegForm={setRegForm} onLogin={handleLogin} onRegister={handleRegister} />}
        </main>
      </div>

      {/* Player */}
      <Player
        track={currentTrack}
        isPlaying={isPlaying}
        progress={progress}
        volume={volume}
        liked={liked.has(currentTrack.id)}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        onNext={nextTrack}
        onPrev={prevTrack}
        onProgress={setProgress}
        onVolume={setVolume}
        onLike={() => toggleLike(currentTrack.id)}
        formatTime={formatTime}
      />
    </div>
  );
}

/* ─── HOME PAGE ─── */
function HomePage({ tracks, albums, onPlay, currentTrack, isPlaying, liked, onLike }: any) {
  return (
    <div className="p-6 pb-4 animate-fade-in">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden mb-8 h-48 md:h-64">
        <img src={albums[0].cover} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
        <div className="relative p-6 md:p-8 h-full flex flex-col justify-end">
          <span className="text-xs font-semibold text-neon uppercase tracking-widest mb-2">Новый релиз</span>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">{albums[0].title}</h1>
          <p className="text-muted-foreground text-sm mb-4">{albums[0].artist} · {albums[0].year}</p>
          <button
            onClick={() => onPlay(tracks[0])}
            className="flex items-center gap-2 bg-neon text-white font-semibold text-sm px-5 py-2.5 rounded-full w-fit hover:opacity-90 transition-opacity glow-neon"
          >
            <Icon name="Play" size={14} />
            Слушать
          </button>
        </div>
      </div>

      {/* Albums */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Популярные альбомы</h2>
          <button className="text-sm text-neon hover:opacity-80 transition-opacity">Все</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {albums.map((album: any) => (
            <div key={album.id} className="album-card cursor-pointer" onClick={() => onPlay(tracks.find((t: any) => t.album === album.title) || tracks[0])}>
              <div className="relative rounded-xl overflow-hidden aspect-square mb-3">
                <img src={album.cover} alt={album.title} className="w-full h-full object-cover" />
                <div className="play-overlay absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-neon flex items-center justify-center glow-neon">
                    <Icon name="Play" size={18} className="text-white ml-0.5" />
                  </div>
                </div>
              </div>
              <p className="font-semibold text-sm truncate">{album.title}</p>
              <p className="text-muted-foreground text-xs mt-0.5">{album.artist}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tracks */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Популярные треки</h2>
          <button className="text-sm text-neon hover:opacity-80 transition-opacity">Все</button>
        </div>
        <TrackList tracks={tracks} onPlay={onPlay} currentTrack={currentTrack} isPlaying={isPlaying} liked={liked} onLike={onLike} />
      </section>
    </div>
  );
}

/* ─── SEARCH PAGE ─── */
function SearchPage({ tracks, query, setQuery, onPlay, currentTrack, isPlaying, liked, onLike }: any) {
  const GENRES = ["Электронная", "Поп", "Рок", "Джаз", "Классика", "Хип-хоп", "R&B", "Инди"];
  const COLORS = ["from-purple-900 to-purple-700", "from-red-900 to-red-700", "from-teal-900 to-teal-700", "from-yellow-900 to-yellow-700", "from-blue-900 to-blue-700", "from-pink-900 to-pink-700", "from-green-900 to-green-700", "from-orange-900 to-orange-700"];
  return (
    <div className="p-6 pb-4 animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">Поиск</h1>
      <div className="relative mb-8">
        <Icon name="Search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Что хочешь послушать?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-secondary border border-border rounded-xl pl-12 pr-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon/50 focus:ring-2 focus:ring-neon/20 transition-all text-base"
        />
      </div>
      {query ? (
        <div>
          <h2 className="text-base font-semibold mb-4 text-muted-foreground">Результаты для «{query}»</h2>
          <TrackList tracks={tracks} onPlay={onPlay} currentTrack={currentTrack} isPlaying={isPlaying} liked={liked} onLike={onLike} />
        </div>
      ) : (
        <div>
          <h2 className="text-base font-semibold mb-4">Жанры</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {GENRES.map((genre, i) => (
              <div
                key={genre}
                className={`bg-gradient-to-br ${COLORS[i]} rounded-xl p-4 h-20 flex items-end cursor-pointer hover:opacity-90 transition-opacity`}
              >
                <span className="font-bold text-white text-sm">{genre}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── LIBRARY PAGE ─── */
function LibraryPage({ tracks, onPlay, currentTrack, isPlaying, liked, onLike }: any) {
  return (
    <div className="p-6 pb-4 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Моя музыка</h1>
        <button className="flex items-center gap-2 text-sm bg-neon text-white px-4 py-2 rounded-full font-semibold hover:opacity-90 transition-opacity glow-neon">
          <Icon name="Upload" size={14} />
          Загрузить трек
        </button>
      </div>
      <div className="flex gap-2 mb-6">
        {["Все", "Треки", "Альбомы", "Исполнители"].map((tab, i) => (
          <button key={tab} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${i === 1 ? "bg-neon text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            {tab}
          </button>
        ))}
      </div>
      {tracks.length > 0 ? (
        <TrackList tracks={tracks} onPlay={onPlay} currentTrack={currentTrack} isPlaying={isPlaying} liked={liked} onLike={onLike} />
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
            <Icon name="Heart" size={28} className="text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Лайкни треки, которые нравятся</p>
        </div>
      )}
    </div>
  );
}

/* ─── PLAYLISTS PAGE ─── */
function PlaylistsPage({ playlists, tracks, onPlay, currentTrack, isPlaying, liked, onLike }: any) {
  const [activePlaylist, setActivePlaylist] = useState<number | null>(null);
  return (
    <div className="p-6 pb-4 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Плейлисты</h1>
        <button className="flex items-center gap-2 text-sm bg-secondary text-foreground px-4 py-2 rounded-full font-medium hover:bg-secondary/70 transition-colors border border-border">
          <Icon name="Plus" size={14} />
          Создать
        </button>
      </div>
      {activePlaylist === null ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {playlists.map((pl: any) => (
            <div key={pl.id} className="album-card cursor-pointer" onClick={() => setActivePlaylist(pl.id)}>
              <div className="relative rounded-xl overflow-hidden aspect-square mb-3">
                <img src={pl.cover} alt={pl.title} className="w-full h-full object-cover" />
                <div className="play-overlay absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-neon flex items-center justify-center glow-neon">
                    <Icon name="Play" size={18} className="text-white ml-0.5" />
                  </div>
                </div>
              </div>
              <p className="font-semibold text-sm">{pl.title}</p>
              <p className="text-muted-foreground text-xs mt-0.5">{pl.count} треков</p>
            </div>
          ))}
          <div className="cursor-pointer">
            <div className="rounded-xl aspect-square mb-3 border-2 border-dashed border-border flex items-center justify-center hover:border-neon/50 transition-colors">
              <Icon name="Plus" size={28} className="text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Новый плейлист</p>
          </div>
        </div>
      ) : (
        <div>
          <button onClick={() => setActivePlaylist(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <Icon name="ChevronLeft" size={16} />
            Назад
          </button>
          <div className="flex items-start gap-6 mb-8">
            <img src={playlists.find((p: any) => p.id === activePlaylist)?.cover} className="w-32 h-32 rounded-xl object-cover" alt="" />
            <div className="flex flex-col justify-end">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Плейлист</p>
              <h2 className="text-2xl font-bold mb-1">{playlists.find((p: any) => p.id === activePlaylist)?.title}</h2>
              <p className="text-muted-foreground text-sm">{playlists.find((p: any) => p.id === activePlaylist)?.count} треков</p>
              <button onClick={() => onPlay(tracks[0])} className="flex items-center gap-2 bg-neon text-white font-semibold text-sm px-5 py-2 rounded-full w-fit hover:opacity-90 transition-opacity mt-3 glow-neon">
                <Icon name="Play" size={14} />
                Воспроизвести
              </button>
            </div>
          </div>
          <TrackList tracks={tracks.slice(0, 4)} onPlay={onPlay} currentTrack={currentTrack} isPlaying={isPlaying} liked={liked} onLike={onLike} />
        </div>
      )}
    </div>
  );
}

/* ─── PROFILE PAGE ─── */
function ProfilePage({ user, liked, onPlay, onLogout }: any) {
  return (
    <div className="p-6 pb-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8 p-6 rounded-2xl surface-2 border border-border">
        <div className="w-20 h-20 rounded-full bg-neon flex items-center justify-center text-3xl font-bold text-white glow-neon">
          {user.name[0].toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-1">{user.name}</h1>
          <p className="text-muted-foreground text-sm mb-3">{user.email || "Нет email"}</p>
          <div className="flex gap-4 text-sm">
            <span><b className="text-foreground">{liked.size}</b> <span className="text-muted-foreground">в избранном</span></span>
            <span><b className="text-foreground">3</b> <span className="text-muted-foreground">плейлиста</span></span>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-full bg-secondary text-sm font-medium hover:bg-secondary/70 transition-colors text-foreground">Редактировать</button>
          <button onClick={onLogout} className="px-4 py-2 rounded-full bg-secondary text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">Выйти</button>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Загруженные треки</h2>
          <button className="flex items-center gap-2 text-sm bg-neon text-white px-4 py-2 rounded-full font-semibold hover:opacity-90 transition-opacity glow-neon">
            <Icon name="Upload" size={14} />
            Загрузить
          </button>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed border-border">
          <Icon name="Music" size={32} className="text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Загрузи свои треки</p>
          <p className="text-xs text-muted-foreground/70 mt-1">MP3, FLAC, WAV до 50 МБ</p>
        </div>
      </div>
    </div>
  );
}

/* ─── AUTH PAGE ─── */
function AuthPage({ authMode, setAuthMode, loginForm, setLoginForm, regForm, setRegForm, onLogin, onRegister }: any) {
  return (
    <div className="flex items-center justify-center min-h-full p-6 animate-fade-in">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-neon flex items-center justify-center mx-auto mb-4 glow-neon">
            <Icon name="Waves" size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold">Волна</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {authMode === "login" ? "Войди в свой аккаунт" : "Создай аккаунт"}
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex rounded-lg bg-secondary p-1 mb-6">
            <button
              onClick={() => setAuthMode("login")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${authMode === "login" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              Войти
            </button>
            <button
              onClick={() => setAuthMode("register")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${authMode === "register" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              Регистрация
            </button>
          </div>

          {authMode === "login" ? (
            <div className="flex flex-col gap-3">
              <input
                type="email"
                placeholder="Email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                className="bg-secondary border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon/50 focus:ring-1 focus:ring-neon/30 transition-all"
              />
              <input
                type="password"
                placeholder="Пароль"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="bg-secondary border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon/50 focus:ring-1 focus:ring-neon/30 transition-all"
              />
              <button onClick={onLogin} className="w-full py-3 bg-neon text-white font-semibold text-sm rounded-lg hover:opacity-90 transition-opacity glow-neon mt-1">
                Войти
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Имя"
                value={regForm.name}
                onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                className="bg-secondary border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon/50 focus:ring-1 focus:ring-neon/30 transition-all"
              />
              <input
                type="email"
                placeholder="Email"
                value={regForm.email}
                onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                className="bg-secondary border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon/50 focus:ring-1 focus:ring-neon/30 transition-all"
              />
              <input
                type="password"
                placeholder="Пароль"
                value={regForm.password}
                onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                className="bg-secondary border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon/50 focus:ring-1 focus:ring-neon/30 transition-all"
              />
              <button onClick={onRegister} className="w-full py-3 bg-neon text-white font-semibold text-sm rounded-lg hover:opacity-90 transition-opacity glow-neon mt-1">
                Зарегистрироваться
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── TRACK LIST ─── */
function TrackList({ tracks, onPlay, currentTrack, isPlaying, liked, onLike }: any) {
  return (
    <div className="flex flex-col gap-0.5">
      {tracks.map((track: any, idx: number) => {
        const isActive = currentTrack.id === track.id;
        return (
          <div
            key={track.id}
            className={`track-row flex items-center gap-4 px-3 py-2.5 rounded-xl group cursor-pointer transition-colors ${isActive ? "bg-neon/10" : "hover:bg-secondary"}`}
            onClick={() => onPlay(track)}
          >
            <div className="w-7 flex items-center justify-center shrink-0">
              {isActive && isPlaying ? (
                <div className="flex gap-0.5 items-end h-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="eq-bar w-0.5 rounded-full bg-neon" style={{ animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
              ) : (
                <span className="track-num text-sm font-mono text-muted-foreground group-hover:hidden">
                  {idx + 1}
                </span>
              )}
              <button className="hidden group-hover:flex items-center justify-center text-foreground hover:text-neon transition-colors">
                <Icon name={isActive && isPlaying ? "Pause" : "Play"} size={15} />
              </button>
            </div>

            <img src={track.cover} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />

            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${isActive ? "text-neon" : "text-foreground"}`}>{track.title}</p>
              <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
            </div>

            <span className="hidden sm:block text-xs text-muted-foreground truncate max-w-32">{track.album}</span>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); onLike(track.id); }}
                className={`opacity-0 group-hover:opacity-100 transition-opacity ${liked.has(track.id) ? "!opacity-100 text-neon" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Icon name="Heart" size={15} />
              </button>
              <span className="text-xs text-muted-foreground font-mono">{track.duration}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── PLAYER ─── */
function Player({ track, isPlaying, progress, volume, liked, onTogglePlay, onNext, onPrev, onProgress, onVolume, onLike, formatTime }: any) {
  return (
    <div className="glass border-t border-border shrink-0 px-4 py-3 z-20">
      <div className="flex items-center gap-4 max-w-screen-xl mx-auto">
        {/* Track info */}
        <div className="flex items-center gap-3 w-48 md:w-64 shrink-0">
          <div className="relative">
            <img src={track.cover} alt="" className={`w-12 h-12 rounded-lg object-cover ${isPlaying ? "animate-pulse-glow" : ""}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate text-foreground">{track.title}</p>
            <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
          </div>
          <button onClick={onLike} className={`shrink-0 transition-colors ${liked ? "text-neon" : "text-muted-foreground hover:text-foreground"}`}>
            <Icon name="Heart" size={16} />
          </button>
        </div>

        {/* Controls + Progress */}
        <div className="flex-1 flex flex-col items-center gap-2">
          <div className="flex items-center gap-4">
            <button onClick={onPrev} className="text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
              <Icon name="SkipBack" size={18} />
            </button>
            <button
              onClick={onTogglePlay}
              className="w-9 h-9 rounded-full bg-neon flex items-center justify-center text-white hover:opacity-90 transition-opacity glow-neon"
            >
              <Icon name={isPlaying ? "Pause" : "Play"} size={16} className={isPlaying ? "" : "ml-0.5"} />
            </button>
            <button onClick={onNext} className="text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
              <Icon name="SkipForward" size={18} />
            </button>
          </div>

          <div className="flex items-center gap-2 w-full max-w-lg">
            <span className="text-xs text-muted-foreground font-mono w-8 text-right">{formatTime(progress)}</span>
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => onProgress(Number(e.target.value))}
              className="progress-bar flex-1"
              style={{
                background: `linear-gradient(to right, hsl(258deg 90% 66%) ${progress}%, hsl(0 0% 13%) ${progress}%)`
              }}
            />
            <span className="text-xs text-muted-foreground font-mono w-8">3:40</span>
          </div>
        </div>

        {/* Volume + Extra */}
        <div className="hidden md:flex items-center gap-3 w-48 md:w-64 justify-end shrink-0">
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="Shuffle" size={16} />
          </button>
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="Repeat" size={16} />
          </button>
          <Icon name="Volume2" size={16} className="text-muted-foreground shrink-0" />
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => onVolume(Number(e.target.value))}
            className="volume-bar"
            style={{
              background: `linear-gradient(to right, hsl(0 0% 90%) ${volume}%, hsl(0 0% 13%) ${volume}%)`
            }}
          />
        </div>
      </div>
    </div>
  );
}