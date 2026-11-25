import { Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CommentaryTickerProps {
  lines: string[];
}

export function CommentaryTicker({ lines }: CommentaryTickerProps) {
  const latest = lines[0] ?? 'Auction Arena live feed ready.';

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-900/90 dark:bg-slate-900/95 border border-amber-500/30 text-white shadow-md overflow-hidden">
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 text-[11px] font-bold uppercase tracking-wider shrink-0">
        <Radio className="w-3.5 h-3.5 animate-pulse" />
        <span>Live</span>
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={latest}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="text-sm font-medium text-slate-100 truncate"
          >
            {latest}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
