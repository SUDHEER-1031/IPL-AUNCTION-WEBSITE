import { useState } from 'react';
import {
  Award,
  Gavel,
  LogOut,
  Mic,
  MicOff,
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
import { useVoice } from '../context/VoiceContext';
import { soundEngine } from '../utils/sound';
import type { MemberRole, RoomStatePayload } from '../types/auction';

interface NavbarProps {
  roomState: RoomStatePayload | null;
  role: MemberRole | null;
  connected: boolean;
  watchlistCount: number;
  onRequestExit: () => void;
}

export function Navbar({
  roomState,
  role,
  connected,
  watchlistCount,
  onRequestExit,
}: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { micOn, toggleMic, muteAllIncoming, toggleMuteAllIncoming } = useVoice();
  const [muted, setMuted] = useState(() => soundEngine.isMuted());

  const handleToggleMute = () => {
    const next = !muted;
    soundEngine.setMuted(next);
    setMuted(next);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <header className="no-print sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-[1440px] mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950">
            <Gavel className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-black text-base sm:text-lg tracking-tight text-slate-900 dark:text-white">
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
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[220px]">
                {roomState.name}
              </p>
            )}
          </div>
        </div>

        {/* Single-page section quick-jump pills */}
        {roomState && (
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => scrollToSection('stage-section')}
              className="px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200 hover:bg-amber-500 hover:text-slate-950 cursor-pointer transition-colors"
            >
              <Gavel className="w-3.5 h-3.5" />
              Stage & Chat
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('squads-section')}
              className="px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200 hover:bg-amber-500 hover:text-slate-950 cursor-pointer transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              Squads
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('pool-section')}
              className="px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200 hover:bg-amber-500 hover:text-slate-950 cursor-pointer transition-colors"
            >
              <Star className="w-3.5 h-3.5 text-amber-500" />
              120 Pool ({watchlistCount})
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('summary-section')}
              className="px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200 hover:bg-amber-500 hover:text-slate-950 cursor-pointer transition-colors"
            >
              <Award className="w-3.5 h-3.5" />
              Standings
            </button>
          </nav>
        )}

        <div className="flex items-center gap-1.5 sm:gap-2">
          {roomState && (
            <>
              <div
                className={`hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold ${
                  connected
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 text-rose-500'
                }`}
              >
                {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                <span>{connected ? 'Live' : 'Syncing'}</span>
              </div>

              <button
                type="button"
                onClick={() => void toggleMic()}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border transition-colors ${
                  micOn
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
                title={micOn ? 'Turn microphone off' : 'Turn microphone on'}
              >
                {micOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{micOn ? 'Mic On' : 'Mic Off'}</span>
              </button>

              <button
                type="button"
                onClick={toggleMuteAllIncoming}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer border transition-colors ${
                  muteAllIncoming
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-500'
                    : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
                title={muteAllIncoming ? 'Unmute voices' : 'Mute all voices'}
              >
                {muteAllIncoming ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span className="hidden lg:inline">
                  {muteAllIncoming ? 'Voices Muted' : 'Voice Audio'}
                </span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleToggleMute}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
            title={muted ? 'Unmute gavel SFX' : 'Mute gavel SFX'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-amber-500" />}
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
              onClick={onRequestExit}
              className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-500 text-xs font-bold flex items-center gap-1 cursor-pointer"
              title="Exit auction room"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Exit</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
