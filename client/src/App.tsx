import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Star, X } from 'lucide-react';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import { Navbar, type AppView } from './components/Navbar';
import { SoldOverlay } from './components/SoldOverlay';
import { WatchlistModal } from './components/WatchlistModal';
import { LandingPage } from './pages/LandingPage';
import { LobbyPage } from './pages/LobbyPage';
import { AuctionPage } from './pages/AuctionPage';
import { SquadsPage } from './pages/SquadsPage';
import { SummaryPage } from './pages/SummaryPage';
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
    emitAction,
  } = useSocket();

  const [activeView, setActiveView] = useState<AppView>('AUCTION');
  const [watchlistOpen, setWatchlistOpen] = useState(false);

  useEffect(() => {
    if (roomState?.status === 'ENDED') {
      setActiveView('SUMMARY');
    } else if (roomState?.status === 'LIVE') {
      setActiveView('AUCTION');
    }
  }, [roomState?.status]);

  useEffect(() => {
    if (!watchlistAlert) return;
    const t = setTimeout(clearWatchlistAlert, 5500);
    return () => clearTimeout(t);
  }, [watchlistAlert, clearWatchlistAlert]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar
        roomState={roomState}
        role={identity?.role ?? null}
        connected={connected}
        activeView={activeView}
        setActiveView={setActiveView}
        watchlistCount={watchlist.length}
        onOpenWatchlist={() => setWatchlistOpen(true)}
        onLeave={leaveRoom}
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
      ) : roomState.status === 'LOBBY' ? (
        <LobbyPage />
      ) : activeView === 'SQUADS' ? (
        <SquadsPage />
      ) : activeView === 'SUMMARY' ? (
        <SummaryPage />
      ) : (
        <AuctionPage />
      )}

      <SoldOverlay resolution={lastResolution} onDismiss={clearResolution} />

      {roomState && (
        <WatchlistModal
          open={watchlistOpen}
          onClose={() => setWatchlistOpen(false)}
          players={roomState.allRoomPlayers}
          watchlist={watchlist}
          onToggleWatchlist={(playerId) => void emitAction('watchlist:toggle', { playerId })}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <SocketProvider>
        <ArenaShell />
      </SocketProvider>
    </ThemeProvider>
  );
}
