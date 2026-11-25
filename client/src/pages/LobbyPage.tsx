import { useState } from 'react';
import { Check, Clock, Copy, Crown, Eye, Play, Share2, UserX, Users } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { TEAM_BRANDS } from '../data/teams';
import { TeamCrest } from '../components/TeamCrest';

export function LobbyPage() {
  const { identity, roomState, emitAction } = useSocket();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedSpectate, setCopiedSpectate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!roomState || !identity) return null;

  const isHost = identity.memberId === roomState.hostMemberId;
  const isSpectator = identity.role === 'SPECTATOR';
  const myMember = roomState.members.find((m) => m.id === identity.memberId);
  const claimedCount = roomState.members.filter(
    (m) => m.role !== 'SPECTATOR' && m.teamId !== null,
  ).length;

  const copyRoomCode = () => {
    void navigator.clipboard.writeText(roomState.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  };

  const copySpectatorLink = () => {
    const url = `${window.location.origin}/?code=${roomState.code}&spectate=1`;
    void navigator.clipboard.writeText(url);
    setCopiedSpectate(true);
    setTimeout(() => setCopiedSpectate(false), 1800);
  };

  const handleSelectTeam = async (teamId: string) => {
    setError(null);
    const res = await emitAction('team:select', { teamId });
    if (!res.ok) setError(res.error || 'Could not select team');
  };

  const handleSetTimer = async (seconds: number) => {
    setError(null);
    const res = await emitAction('room:setTimer', { seconds });
    if (!res.ok) setError(res.error || 'Failed to update timer');
  };

  const handleKick = async (targetMemberId: string) => {
    setError(null);
    const res = await emitAction('room:kick', { targetMemberId });
    if (!res.ok) setError(res.error || 'Failed to kick member');
  };

  const handleStart = async () => {
    setError(null);
    const res = await emitAction('auction:start');
    if (!res.ok) setError(res.error || 'Could not start auction');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-amber-400 font-bold mb-1">
            Auction Lobby · {roomState.name}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black">
            {isSpectator
              ? 'Spectator Lounge — Waiting for Host to Start'
              : 'Pick Your IPL Franchise'}
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Each member claims one unique team. Minimum 2 teams required; unclaimed teams sit out.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={copyRoomCode}
            className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 cursor-pointer transition-colors"
          >
            <span className="text-xs uppercase tracking-wider text-slate-300">Code</span>
            <span className="font-mono text-xl font-black tracking-widest text-amber-400">
              {roomState.code}
            </span>
            {copiedCode ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4 text-slate-300" />
            )}
          </button>

          <button
            type="button"
            onClick={copySpectatorLink}
            className="flex items-center gap-2 px-3.5 py-3 rounded-2xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 text-xs font-bold text-purple-200 cursor-pointer transition-colors"
            title="Copy view-only spectator invite link"
          >
            {copiedSpectate ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            <span>{copiedSpectate ? 'Copied!' : 'Spectator Link'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-rose-500/15 border border-rose-500/40 px-4 py-3 text-sm font-semibold text-rose-500">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 10 IPL Teams Grid */}
        <div className="lg:col-span-2 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Select Franchise ({claimedCount}/10 Claimed)
            </h2>
            {myMember?.teamId && (
              <span className="text-xs font-bold text-emerald-500">
                Your team: {myMember.teamId}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TEAM_BRANDS.map((brand) => {
              const owner = roomState.members.find(
                (m) => m.teamId === brand.id && m.role !== 'SPECTATOR',
              );
              const isMine = owner?.id === identity.memberId;
              const takenByOther = Boolean(owner && !isMine);
              const disabled = isSpectator || takenByOther;

              return (
                <button
                  key={brand.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleSelectTeam(brand.id)}
                  className={`relative rounded-2xl p-3.5 border text-left transition-all flex items-center justify-between gap-3 ${
                    isMine
                      ? 'border-amber-400 ring-2 ring-amber-400/40 bg-amber-500/10 cursor-pointer'
                      : takenByOther
                        ? 'border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/60 opacity-55 cursor-not-allowed'
                        : isSpectator
                          ? 'border-slate-200 dark:border-slate-800 opacity-70 cursor-default'
                          : 'border-slate-200 dark:border-slate-800 hover:border-amber-400/70 bg-slate-50/70 dark:bg-slate-950/40 cursor-pointer hover:scale-[1.01]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <TeamCrest teamId={brand.id} size="md" />
                    <div className="min-w-0">
                      <div className="font-display font-bold text-sm text-slate-900 dark:text-white truncate">
                        {brand.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {owner ? `Claimed by ${owner.displayName}` : brand.tagline}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isMine ? (
                      <span className="px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
                        YOURS
                      </span>
                    ) : takenByOther ? (
                      <span className="px-2.5 py-1 rounded-full bg-slate-300 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold">
                        TAKEN
                      </span>
                    ) : !isSpectator ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                        PICK
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Members & Host Controls */}
        <div className="space-y-6">
          <div className="rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-5 shadow-lg">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-amber-500" />
              Joined Members ({roomState.members.length})
            </h2>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {roomState.members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-2 rounded-2xl p-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {m.role === 'SPECTATOR' ? (
                      <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-500 flex items-center justify-center shrink-0">
                        <Eye className="w-4 h-4" />
                      </div>
                    ) : (
                      <TeamCrest teamId={m.teamId} size="sm" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {m.displayName}
                        </span>
                        {m.id === roomState.hostMemberId && (
                          <span title="Host" className="text-amber-500">
                            <Crown className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {m.role === 'SPECTATOR'
                          ? 'Spectator'
                          : m.teamId
                            ? `Owner · ${m.teamId}`
                            : 'Picking team...'}
                        {' · '}
                        <span className={m.isConnected ? 'text-emerald-500' : 'text-slate-400'}>
                          {m.isConnected ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isHost && m.id !== identity.memberId && (
                    <button
                      type="button"
                      onClick={() => handleKick(m.id)}
                      className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-500/15 cursor-pointer"
                      title={`Kick ${m.displayName}`}
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Host Settings & Start */}
          <div className="rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-500" />
                Bid Timer
              </h3>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {roomState.timerSeconds}s per bid
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[5, 10, 15].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  disabled={!isHost}
                  onClick={() => handleSetTimer(sec)}
                  className={`py-2.5 rounded-xl text-xs font-extrabold border transition-colors ${
                    roomState.timerSeconds === sec
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                  } ${isHost ? 'cursor-pointer' : 'opacity-70 cursor-default'}`}
                >
                  {sec} sec
                </button>
              ))}
            </div>

            {isHost ? (
              <button
                type="button"
                disabled={claimedCount < 2}
                onClick={handleStart}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-display font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-5 h-5 fill-current" />
                {claimedCount < 2
                  ? `Need ${2 - claimedCount} More Team(s) to Start`
                  : `Start Auction (${claimedCount} Teams)`}
              </button>
            ) : (
              <div className="rounded-2xl bg-slate-100 dark:bg-slate-950 p-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                Waiting for host to start the auction...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
