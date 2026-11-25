import { Plane, ShieldAlert, Sparkles, Users } from 'lucide-react';
import type { TeamView } from '../types/auction';
import { formatLakhs } from '../utils/format';
import { TeamCrest } from './TeamCrest';

interface TeamSidebarProps {
  teams: TeamView[];
  highestBidderTeamId: string | null;
  myTeamId: string | null;
}

export function TeamSidebar({ teams, highestBidderTeamId, myTeamId }: TeamSidebarProps) {
  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <Users className="w-4 h-4 text-amber-500" />
          Franchise Purses
        </h3>
        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          150 Cr · Max 11 · 4 OS
        </span>
      </div>

      <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
        {teams.map((team) => {
          const isLeading = highestBidderTeamId === team.teamId;
          const isMine = myTeamId === team.teamId;
          const isInactive = !team.isActiveInAuction;

          return (
            <div
              key={team.teamId}
              className={`rounded-2xl p-2.5 border transition-all ${
                isLeading
                  ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30'
                  : isMine
                    ? 'border-amber-500/60 bg-amber-500/5'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40'
              } ${isInactive ? 'opacity-45' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <TeamCrest teamId={team.teamId} size="sm" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {team.shortName}
                      </span>
                      {isMine && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400">
                          YOU
                        </span>
                      )}
                      {isLeading && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-slate-950">
                          LEADING
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {team.ownerName ? team.ownerName : 'Unclaimed'}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-display font-extrabold text-sm text-slate-900 dark:text-white">
                    {formatLakhs(team.purseLakhs)}
                  </div>
                  <div className="flex items-center justify-end gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{team.squadCount}/11</span>
                    <span
                      className={`inline-flex items-center gap-0.5 ${
                        team.overseasCount >= 4 ? 'text-rose-500 font-semibold' : ''
                      }`}
                      title="Overseas players"
                    >
                      <Plane className="w-3 h-3" />
                      {team.overseasCount}/4
                    </span>
                    {!team.powerCardUsed && team.isActiveInAuction && (
                      <span title="Power Card available" className="text-amber-500">
                        <Sparkles className="w-3 h-3" />
                      </span>
                    )}
                    {team.squadCount >= 11 && (
                      <span title="Squad full" className="text-emerald-500">
                        <ShieldAlert className="w-3 h-3" />
                      </span>
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
