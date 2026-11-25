import { useState } from 'react';
import {
  Award,
  Gavel,
  LogOut,
  Moon,
  Star,
  Sun,
  Users,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { soundEngine } from '../utils/sound';
import type { MemberRole, RoomStatePayload } from '../types/auction';

export type AppView = 'AUCTION' | 'SQUADS' | 'SUMMARY';

interface NavbarProps {
  roomState: RoomStatePayload | null;
  role: MemberRole | null;
  connected: boolean;
  activeView: AppView;
  setActiveView: (v: AppView) => void;
  watchlistCount: number;
  onOpenWatchlist: () => void;
  onLeave: () => void;
}

export function Navbar({
  roomState,
  role,
  connected,
  activeView,
  setActiveView,
  watchlistCount,
  onOpenWatchlist,
  onLeave,
}: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const [muted, setMuted] = useState(() => soundEngine.isMuted());

  const handleToggleMute = () => {
    const next = !muted;
    soundEngine.setMuted(next);
    setMuted(next);
  };

  return (
    <header className="no-print sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800/80 bg-white/85 dark:bg-slate-950/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950">
            <Gavel className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-black text-lg tracking-tight text-slate-900 dark:text-white">
                IPL Auction Arena
              </span>
              {roomState && (
                <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono text-xs font-bold border border-amber-500/30">
                  {roomState.code}
                </span>
              )}
              {role === 'SPECTATOR' && (
                <span className="px-2 py-0.5 rounded-lg bg-purple-500/15 text-purple-500 text-[11px] font-bold">
                  SPECTATOR
                </span>
              )}
            </div>
            {roomState && (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[240px]">
                {roomState.name}
              </p>
            )}
          </div>
        </div>

        {roomState && roomState.status !== 'LOBBY' && (
          <nav className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveView('AUCTION')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeView === 'AUCTION'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Gavel className="w-3.5 h-3.5" />
              Stage
            </button>
            <button
              type="button"
              onClick={() => setActiveView('SQUADS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeView === 'SQUADS'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Squads
            </button>
            <button
              type="button"
              onClick={() => setActiveView('SUMMARY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeView === 'SUMMARY'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              Summary
            </button>
          </nav>
        )}

        <div className="flex items-center gap-2">
          {roomState && (
            <>
              <div
                className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold ${
                  connected
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 text-rose-500'
                }`}
              >
                {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                <span>{connected ? 'Live' : 'Reconnecting'}</span>
              </div>

              <button
                type="button"
                onClick={onOpenWatchlist}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                title="Player Pool & Watchlist"
              >
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>Pool ({watchlistCount})</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleToggleMute}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
            title={muted ? 'Unmute sound effects' : 'Mute sound effects'}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {roomState && (
            <button
              type="button"
              onClick={onLeave}
              className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-500 cursor-pointer"
              title="Leave room"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
