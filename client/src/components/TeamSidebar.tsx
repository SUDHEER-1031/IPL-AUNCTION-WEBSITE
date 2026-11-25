import { Plane, ShieldAlert, Sparkles, Users } from 'lucide-react';
import type { TeamView } from '../types/auction';
import { formatLakhs } from '../utils/format';
import { TeamCrest } from './TeamCrest';

interface TeamSidebarProps {
  teams: TeamView[];
  highestBidderTeamId: string | null;
  myTeamId: string | null;
  compact?: boolean;
}

export function TeamSidebar({
  teams,
  highestBidderTeamId,
  myTeamId,
  compact = false,
}: TeamSidebarProps) {
  return (
    <div className="space-y-1.5">
      {!compact && (
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-amber-500" />
            All Franchise Purses
          </h3>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            Max 11 · 4 OS
          </span>
        </div>
      )}

      <div className={`space-y-1.5 ${compact ? '' : 'max-h-[420px] overflow-y-auto pr-1'}`}>
        {teams.map((team) => {
          const isLeading = highestBidderTeamId === team.teamId;
          const isMine = myTeamId === team.teamId;
          const isInactive = !team.isActiveInAuction;

          return (
            <div
              key={team.teamId}
              className={`rounded-xl p-2 border transition-all ${
                isLeading
                  ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/40'
                  : isMine
                    ? 'border-amber-500/60 bg-amber-500/5'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40'
              } ${isInactive ? 'opacity-45' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <TeamCrest teamId={team.teamId} size="xs" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {team.shortName}
                      </span>
                      {isMine && (
                        <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400">
                          YOU
                        </span>
                      )}
                      {isLeading && (
                        <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-500 text-slate-950">
                          LEAD
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {team.ownerName ? team.ownerName : 'Unclaimed'}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-display font-extrabold text-xs text-slate-900 dark:text-white">
                    {formatLakhs(team.purseLakhs)}
                  </div>
                  <div className="flex items-center justify-end gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                    <span>{team.squadCount}/11</span>
                    <span
                      className={`inline-flex items-center gap-0.5 ${
                        team.overseasCount >= 4 ? 'text-rose-500 font-semibold' : ''
                      }`}
                    >
                      <Plane className="w-2.5 h-2.5" />
                      {team.overseasCount}/4
                    </span>
                    {!team.powerCardUsed && team.isActiveInAuction && (
                      <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                    )}
                    {team.squadCount >= 11 && (
                      <ShieldAlert className="w-2.5 h-2.5 text-emerald-500" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
