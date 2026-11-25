import { Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CommentaryTickerProps {
  lines: string[];
}

export function CommentaryTicker({ lines }: CommentaryTickerProps) {
  const latest = lines[0] ?? 'Auction Arena live feed ready.';

  return (
    <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/95 border border-amber-500/30 text-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider shrink-0">
        <Radio className="w-3 h-3 animate-pulse" />
        <span>Live</span>
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={latest}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="text-xs font-medium text-slate-100 truncate"
          >
            {latest}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
