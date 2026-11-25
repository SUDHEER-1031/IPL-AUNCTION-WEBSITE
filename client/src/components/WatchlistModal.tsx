import { useMemo, useState } from 'react';
import { Search, Star, X } from 'lucide-react';
import type { PlayerRole, RoomPlayerView } from '../types/auction';
import { formatLakhs, getCountryFlag, getRoleBadgeClasses } from '../utils/format';

interface WatchlistModalProps {
  open: boolean;
  onClose: () => void;
  players: RoomPlayerView[];
  watchlist: string[];
  onToggleWatchlist: (playerId: string) => void;
}

const ROLES: Array<'ALL' | PlayerRole> = ['ALL', 'Batter', 'Bowler', 'All-rounder', 'Wicketkeeper', 'Spinner'];

export function WatchlistModal({
  open,
  onClose,
  players,
  watchlist,
  onToggleWatchlist,
}: WatchlistModalProps) {
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | PlayerRole>('ALL');
  const [onlyStarred, setOnlyStarred] = useState(false);

  const filtered = useMemo(() => {
    return players.filter((rp) => {
      if (roleFilter !== 'ALL' && rp.player.role !== roleFilter) return false;
      if (onlyStarred && !watchlist.includes(rp.player.id)) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        return (
          rp.player.name.toLowerCase().includes(q) ||
          rp.player.nationality.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [players, roleFilter, onlyStarred, watchlist, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[85vh] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              120-Player Pool & Watchlist ({watchlist.length} starred)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Star players to get an instant alert as soon as they step onto the auction block.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search player or country..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                  roleFilter === r
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setOnlyStarred((v) => !v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer border ${
              onlyStarred
                ? 'bg-amber-500/20 border-amber-500 text-amber-500'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${onlyStarred ? 'fill-amber-500' : ''}`} />
            Starred
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((rp) => {
            const starred = watchlist.includes(rp.player.id);
            return (
              <div
                key={rp.player.id}
                className="rounded-2xl p-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{getCountryFlag(rp.player.nationality)}</span>
                    <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {rp.player.name}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getRoleBadgeClasses(
                        rp.player.role,
                      )}`}
                    >
                      {rp.player.role}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Set {rp.setNumber} · Base {formatLakhs(rp.player.basePriceLakhs)}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        rp.status === 'SOLD'
                          ? 'bg-emerald-500/20 text-emerald-500'
                          : rp.status === 'UNSOLD'
                            ? 'bg-rose-500/20 text-rose-500'
                            : rp.status === 'ACTIVE'
                              ? 'bg-amber-500/20 text-amber-500'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {rp.status === 'SOLD' && rp.soldToTeamId
                        ? `SOLD (${rp.soldToTeamId})`
                        : rp.status}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onToggleWatchlist(rp.player.id)}
                  className={`p-2 rounded-xl border transition-colors cursor-pointer shrink-0 ${
                    starred
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-500'
                      : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-amber-500'
                  }`}
                  title={starred ? 'Remove from watchlist' : 'Add to watchlist'}
                >
                  <Star className={`w-4 h-4 ${starred ? 'fill-amber-500' : ''}`} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
