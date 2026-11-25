import { useState } from 'react';
import { Plane, Users } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import type { PlayerRole } from '../types/auction';
import { formatLakhs, getCountryFlag } from '../utils/format';
import { TeamCrest } from '../components/TeamCrest';

const ROLE_ORDER: PlayerRole[] = ['Batter', 'Wicketkeeper', 'All-rounder', 'Spinner', 'Bowler'];

export function SquadsPage() {
  const { roomState } = useSocket();
  const [showAllTeams, setShowAllTeams] = useState(false);

  if (!roomState) return null;

  const teamsToShow = showAllTeams
    ? roomState.teams
    : roomState.teams.filter((t) => t.isActiveInAuction);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-500" />
            Franchise Squads
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Bought players grouped by role across participating IPL franchises
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAllTeams((v) => !v)}
          className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
        >
          {showAllTeams ? 'Show Active Teams Only' : 'Show All 10 Franchises'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {teamsToShow.map((team) => (
          <div
            key={team.teamId}
            className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-lg"
          >
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <TeamCrest teamId={team.teamId} size="md" />
                <div>
                  <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                    {team.name}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {team.ownerName ? `Owner: ${team.ownerName}` : 'Not in auction'}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="font-display font-black text-lg text-amber-500">
                  {formatLakhs(team.purseLakhs)}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-end gap-2">
                  <span>{team.squadCount}/11</span>
                  <span className="inline-flex items-center gap-0.5">
                    <Plane className="w-3 h-3" />
                    {team.overseasCount}/4
                  </span>
                </div>
              </div>
            </div>

            {team.boughtPlayers.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No players signed yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {ROLE_ORDER.map((role) => {
                  const group = team.boughtPlayers.filter((p) => p.role === role);
                  if (group.length === 0) return null;
                  return (
                    <div key={role}>
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                        {role}s ({group.length})
                      </div>
                      <div className="space-y-1.5">
                        {group.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800"
                          >
                            <div className="flex items-center gap-2">
                              <span>{getCountryFlag(p.nationality)}</span>
                              <span className="font-bold text-slate-900 dark:text-white">
                                {p.name}
                              </span>
                              {p.isOverseas && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-500 text-[10px] font-bold">
                                  OS
                                </span>
                              )}
                            </div>
                            <span className="font-display font-extrabold text-emerald-500">
                              {formatLakhs(p.soldPriceLakhs)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
