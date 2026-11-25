import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Gavel } from 'lucide-react';
import type { ResolutionEvent } from '../types/auction';
import { formatLakhs } from '../utils/format';
import { getTeamBrand } from '../data/teams';
import { TeamCrest } from './TeamCrest';

interface SoldOverlayProps {
  resolution: ResolutionEvent | null;
  onDismiss: () => void;
}

export function SoldOverlay({ resolution, onDismiss }: SoldOverlayProps) {
  useEffect(() => {
    if (!resolution) return;
    if (resolution.outcome === 'SOLD') {
      const brand = getTeamBrand(resolution.teamId);
      try {
        void confetti({
          particleCount: 85,
          spread: 70,
          origin: { y: 0.55 },
          colors: brand ? [brand.primaryColor, brand.secondaryColor, '#ffffff'] : undefined,
        });
      } catch {
        // ignore if headless/no canvas
      }
    }
    const timer = setTimeout(onDismiss, 2500);
    return () => clearTimeout(timer);
  }, [resolution, onDismiss]);

  return (
    <AnimatePresence>
      {resolution && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 pointer-events-none"
        >
          <motion.div
            initial={{ scale: 0.72, rotate: -6, y: 20 }}
            animate={{ scale: 1, rotate: 0, y: 0 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            className={`relative max-w-md w-full rounded-3xl p-8 text-center shadow-2xl border-2 ${
              resolution.outcome === 'SOLD'
                ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 border-emerald-400/60'
                : 'bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950 border-rose-500/60'
            }`}
          >
            <motion.div
              initial={{ rotate: -45, y: -16 }}
              animate={{ rotate: [ -45, 18, 0 ], y: 0 }}
              transition={{ duration: 0.45 }}
              className={`mx-auto mb-4 w-16 h-16 rounded-2xl flex items-center justify-center ${
                resolution.outcome === 'SOLD'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              <Gavel className="w-8 h-8" />
            </motion.div>

            <div
              className={`inline-block px-5 py-1.5 rounded-full text-sm font-black tracking-widest uppercase mb-3 border ${
                resolution.outcome === 'SOLD'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                  : 'bg-rose-600 text-white border-rose-400'
              }`}
            >
              {resolution.outcome === 'SOLD' ? 'SOLD!' : 'UNSOLD'}
            </div>

            <h3 className="font-display text-2xl font-black text-white mb-2">
              {resolution.player.name}
            </h3>

            {resolution.outcome === 'SOLD' && resolution.priceLakhs !== null ? (
              <div className="mt-3 flex flex-col items-center gap-2">
                <div className="flex items-center gap-2.5 bg-white/10 px-3.5 py-2 rounded-xl border border-white/15">
                  <TeamCrest teamId={resolution.teamId} size="sm" />
                  <span className="font-bold text-white text-sm">{resolution.teamName}</span>
                </div>
                <div className="font-display text-2xl font-black text-amber-400 mt-0.5">
                  {formatLakhs(resolution.priceLakhs)}
                </div>
              </div>
            ) : (
              <p className="text-slate-300 text-sm mt-2">
                Moves to the Accelerated Pool at the end of the sets.
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
