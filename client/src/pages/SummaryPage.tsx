import { Award, Crown, Download, Flame, Printer, Trophy } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { formatLakhs, getCountryFlag } from '../utils/format';
import { exportAuctionCsv, exportAuctionPdf } from '../utils/export';
import { TeamCrest } from '../components/TeamCrest';

export function SummaryPage() {
  const { roomState } = useSocket();
  if (!roomState) return null;

  const soldPlayers = roomState.allRoomPlayers.filter(
    (rp) => rp.status === 'SOLD' && rp.soldPriceLakhs !== null,
  );
  const unsoldCount = roomState.allRoomPlayers.filter((rp) => rp.status === 'UNSOLD').length;
  const mostExpensive = [...soldPlayers].sort(
    (a, b) => (b.soldPriceLakhs ?? 0) - (a.soldPriceLakhs ?? 0),
  )[0];

  const evaluations = roomState.evaluations ?? [];
  const winner = evaluations[0] ?? null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Trophy className="w-7 h-7 text-amber-500" />
            Auction Summary & Leaderboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {soldPlayers.length} players sold · {unsoldCount} unsold · Auto-generated Squad Ratings
            & Best XI
          </p>
        </div>

        <div className="no-print flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportAuctionCsv(roomState)}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={exportAuctionPdf}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow"
          >
            <Printer className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Highlights Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-3xl bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-slate-900 border border-amber-500/40 p-6 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-widest text-amber-500 flex items-center gap-1.5">
              <Crown className="w-4 h-4" />
              {roomState.status === 'ENDED' ? 'Auction Champion' : 'Championship Preview'}
            </div>
            {winner ? (
              <>
                <h2 className="font-display text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {winner.teamName}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  Owner: <span className="font-bold">{winner.ownerName}</span> · Rating:{' '}
                  <span className="font-black text-amber-500">
                    {winner.rating}/100 ({winner.grade})
                  </span>
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{winner.summary}</p>
              </>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-300 mt-2">
                Final Team Ratings and Winner are crowned when the auction concludes.
              </p>
            )}
          </div>
          {winner && <TeamCrest teamId={winner.teamId} size="lg" />}
        </div>

        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex items-center justify-between gap-4 shadow-lg">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-widest text-rose-500 flex items-center gap-1.5">
              <Flame className="w-4 h-4" />
              Most Expensive Buy
            </div>
            {mostExpensive && mostExpensive.soldPriceLakhs !== null ? (
              <>
                <h2 className="font-display text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {mostExpensive.player.name}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {mostExpensive.player.role} · Signed by{' '}
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {mostExpensive.soldToTeamId}
                  </span>
                </p>
                <div className="font-display text-2xl font-black text-emerald-500 mt-2">
                  {formatLakhs(mostExpensive.soldPriceLakhs)}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400 mt-2">No players sold yet.</p>
            )}
          </div>
          {mostExpensive?.soldToTeamId && <TeamCrest teamId={mostExpensive.soldToTeamId} size="lg" />}
        </div>
      </div>

      {/* Leaderboard & Best XI */}
      {evaluations.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            Franchise Leaderboard & Best XI
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {evaluations.map((ev, index) => (
              <div
                key={ev.teamId}
                className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-lg space-y-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-500 font-display font-black text-sm flex items-center justify-center">
                      #{index + 1}
                    </span>
                    <TeamCrest teamId={ev.teamId} size="md" />
                    <div>
                      <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                        {ev.teamName}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {ev.ownerName} · {ev.squadCount}/11 players · Purse left{' '}
                        {formatLakhs(ev.purseRemainingLakhs)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-display text-2xl font-black text-amber-500">
                      {ev.rating}
                      <span className="text-xs text-slate-400 font-semibold">/100</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 text-xs font-black">
                      Grade {ev.grade}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300">{ev.summary}</p>

                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  {Object.entries(ev.roleBreakdown).map(([role, count]) => (
                    <span
                      key={role}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-semibold text-slate-700 dark:text-slate-300"
                    >
                      {role}: {count}
                    </span>
                  ))}
                </div>

                {ev.bestXI.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Suggested Best XI ({ev.bestXI.length})
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {ev.bestXI.map((p, idx) => (
                        <div
                          key={p.id}
                          className="text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-100 dark:border-slate-800 truncate text-slate-800 dark:text-slate-200"
                        >
                          <span className="text-slate-400 font-bold mr-1">{idx + 1}.</span>
                          {getCountryFlag(p.nationality)} {p.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
