import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Star, X } from 'lucide-react';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import { VoiceProvider } from './context/VoiceContext';
import { Navbar } from './components/Navbar';
import { SoldOverlay } from './components/SoldOverlay';
import { ExitConfirmModal } from './components/ExitConfirmModal';
import { LandingPage } from './pages/LandingPage';
import { UnifiedArenaPage } from './pages/UnifiedArenaPage';
import { formatLakhs } from './utils/format';

function ArenaShell() {
  const {
    identity,
    roomState,
    watchlist,
    connected,
    lastResolution,
    watchlistAlert,
    reconnecting,
    leaveRoom,
    clearResolution,
    clearWatchlistAlert,
  } = useSocket();

  const [exitPromptOpen, setExitPromptOpen] = useState(false);
  const historyPushedRef = useRef(false);

  // Guard browser Back button while inside a room ("Are you sure you want to exit this room?")
  useEffect(() => {
    if (!roomState) {
      historyPushedRef.current = false;
      return;
    }

    if (!historyPushedRef.current) {
      window.history.pushState({ inAuctionRoom: true }, '');
      historyPushedRef.current = true;
    }

    const handlePopState = () => {
      if (roomState) {
        window.history.pushState({ inAuctionRoom: true }, '');
        setExitPromptOpen(true);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [roomState]);

  useEffect(() => {
    if (!watchlistAlert) return;
    const t = setTimeout(clearWatchlistAlert, 5500);
    return () => clearTimeout(t);
  }, [watchlistAlert, clearWatchlistAlert]);

  const handleConfirmExit = useCallback(() => {
    setExitPromptOpen(false);
    leaveRoom();
  }, [leaveRoom]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar
        roomState={roomState}
        role={identity?.role ?? null}
        connected={connected}
        watchlistCount={watchlist.length}
        onRequestExit={() => setExitPromptOpen(true)}
      />

      {/* Watchlist Alert Toast */}
      <AnimatePresence>
        {watchlistAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-4 z-50 max-w-sm rounded-2xl bg-amber-500 text-slate-950 px-4 py-3 shadow-2xl border border-amber-300 flex items-center gap-3"
          >
            <Star className="w-5 h-5 fill-slate-950 shrink-0" />
            <div className="text-xs font-bold">
              <div>Watchlist Alert: {watchlistAlert.playerName} is ON THE BLOCK!</div>
              <div className="font-semibold opacity-80">
                {watchlistAlert.role} · Base {formatLakhs(watchlistAlert.basePriceLakhs)}
              </div>
            </div>
            <button type="button" onClick={clearWatchlistAlert} className="p-1 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {reconnecting ? (
        <div className="flex items-center justify-center py-24 text-sm font-semibold text-slate-500">
          Restoring session...
        </div>
      ) : !roomState ? (
        <LandingPage />
      ) : (
        <UnifiedArenaPage />
      )}

      <SoldOverlay resolution={lastResolution} onDismiss={clearResolution} />

      <ExitConfirmModal
        open={exitPromptOpen}
        onCancel={() => setExitPromptOpen(false)}
        onConfirm={handleConfirmExit}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <SocketProvider>
        <VoiceProvider>
          <ArenaShell />
        </VoiceProvider>
      </SocketProvider>
    </ThemeProvider>
  );
}
