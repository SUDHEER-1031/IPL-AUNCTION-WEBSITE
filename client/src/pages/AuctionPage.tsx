import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  FastForward,
  FlagOff,
  Gavel,
  History,
  Pause,
  Play,
  RotateCcw,
  ShieldBan,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { getTeamBrand } from '../data/teams';
import {
  formatLakhs,
  getCountryFlag,
  getNextBidClient,
  getRoleBadgeClasses,
} from '../utils/format';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { TeamCrest } from '../components/TeamCrest';
import { CircularTimer } from '../components/CircularTimer';
import { CommentaryTicker } from '../components/CommentaryTicker';
import { TeamSidebar } from '../components/TeamSidebar';
import { ChatReactions } from '../components/ChatReactions';

export function AuctionPage() {
  const {
    identity,
    roomState,
    watchlist,
    clockOffsetMs,
    reactions,
    emitAction,
    sendReaction,
  } = useSocket();

  const [bidBusy, setBidBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!roomState || !identity) return null;

  const isHost = identity.memberId === roomState.hostMemberId;
  const isSpectator = identity.role === 'SPECTATOR';
  const myMember = roomState.members.find((m) => m.id === identity.memberId);
  const myTeam = roomState.teams.find((t) => t.teamId === myMember?.teamId) ?? null;
  const activeRp = roomState.currentPlayer;
  const player = activeRp?.player ?? null;

  const nextBidLakhs = player
    ? getNextBidClient(player.basePriceLakhs, roomState.currentBidLakhs, roomState.vetoJumpActive)
    : 0;

  // Client-side mirror of server validation for instant UX feedback + disabled reason
  let bidDisabledReason: string | null = null;
  if (isSpectator) {
    bidDisabledReason = 'Spectator Mode (view-only)';
  } else if (!myTeam) {
    bidDisabledReason = 'No franchise assigned';
  } else if (roomState.status === 'PAUSED') {
    bidDisabledReason = 'Auction is paused by host';
  } else if (!player) {
    bidDisabledReason = 'Waiting for next player...';
  } else if (roomState.highestBidderTeamId === myTeam.teamId) {
    bidDisabledReason = 'You already hold the highest bid';
  } else if (myTeam.squadCount >= 11) {
    bidDisabledReason = 'Squad full (11/11 players)';
  } else if (player.isOverseas && myTeam.overseasCount >= 4) {
    bidDisabledReason = 'Foreign limit reached (4/4 overseas players)';
  } else if (myTeam.purseLakhs < nextBidLakhs) {
    bidDisabledReason = `Insufficient purse (${formatLakhs(myTeam.purseLakhs)} left)`;
  }

  const leadingBrand = getTeamBrand(roomState.highestBidderTeamId);
  const isStarred = player ? watchlist.includes(player.id) : false;

  const handlePlaceBid = async () => {
    if (bidDisabledReason || bidBusy || !player) return;
    setActionError(null);
    setBidBusy(true);
    try {
      const res = await emitAction('auction:bid', { expectedAmountLakhs: nextBidLakhs });
      if (!res.ok) setActionError(res.error || 'Bid rejected');
    } finally {
      setBidBusy(false);
    }
  };

  const handlePowerCard = async (cardType: 'RESET_TIMER' | 'VETO_JUMP') => {
    setActionError(null);
    const res = await emitAction('auction:powerCard', { cardType });
    if (!res.ok) setActionError(res.error || 'Power Card failed');
  };

  const handleHostControl = async (event: string) => {
    setActionError(null);
    const res = await emitAction(event);
    if (!res.ok) setActionError(res.error || 'Action failed');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-5 space-y-4">
      <CommentaryTicker lines={roomState.commentary} />

      {/* Progress & Host Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
              roomState.status === 'PAUSED'
                ? 'bg-amber-500/20 text-amber-500'
                : roomState.status === 'ACCELERATED'
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'bg-emerald-500/20 text-emerald-500'
            }`}
          >
            {roomState.status === 'ACCELERATED' ? 'Accelerated Round' : roomState.status}
          </span>
          <span className="text-sm font-bold text-slate-900 dark:text-white">
            {activeRp?.isAccelerated
              ? `Unsold Recall · ${roomState.progress.completedCount}/${roomState.progress.totalPlayers} processed`
              : `Set ${roomState.progress.setNumber} of ${roomState.progress.totalSets} (${roomState.progress.setName}) · Player ${roomState.progress.orderInSet}/${roomState.progress.playersInSet}`}
          </span>
        </div>

        {isHost && (
          <div className="flex flex-wrap items-center gap-2">
            {roomState.status === 'PAUSED' ? (
              <button
                type="button"
                onClick={() => handleHostControl('auction:resume')}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Resume
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleHostControl('auction:pause')}
                className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-500 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5" />
                Pause
              </button>
            )}
            <button
              type="button"
              onClick={() => handleHostControl('auction:skip')}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <FastForward className="w-3.5 h-3.5" />
              Skip Player
            </button>
            <button
              type="button"
              onClick={() => handleHostControl('auction:end')}
              className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-500 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <FlagOff className="w-3.5 h-3.5" />
              End Auction
            </button>
          </div>
        )}
      </div>

      {actionError && (
        <div className="rounded-2xl bg-rose-500/15 border border-rose-500/40 px-4 py-2.5 text-xs font-semibold text-rose-500 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Sidebar: 10 Franchises */}
        <div className="lg:col-span-3 order-2 lg:order-1">
          <TeamSidebar
            teams={roomState.teams}
            highestBidderTeamId={roomState.highestBidderTeamId}
            myTeamId={myTeam?.teamId ?? null}
          />
        </div>

        {/* Center Main Auction Stage */}
        <div className="lg:col-span-6 order-1 lg:order-2 space-y-4">
          {player ? (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xl relative overflow-hidden"
            >
              {leadingBrand && (
                <div
                  className="absolute inset-x-0 top-0 h-1.5"
                  style={{
                    background: `linear-gradient(90deg, ${leadingBrand.primaryColor}, ${leadingBrand.secondaryColor})`,
                  }}
                />
              )}

              {/* Player Top Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <PlayerAvatar
                    name={player.name}
                    photo={player.photo}
                    role={player.role}
                    teamColor={leadingBrand?.primaryColor}
                    size="xl"
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getRoleBadgeClasses(
                          player.role,
                        )}`}
                      >
                        {player.role}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                          player.isOverseas
                            ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                            : 'bg-sky-500/15 text-sky-500 border-sky-500/30'
                        }`}
                      >
                        {getCountryFlag(player.nationality)} {player.nationality}{' '}
                        {player.isOverseas ? '· Foreign' : '· Indian'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                        {player.name}
                      </h2>
                      <button
                        type="button"
                        onClick={() => emitAction('watchlist:toggle', { playerId: player.id })}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        title={isStarred ? 'Remove from watchlist' : 'Star player'}
                      >
                        <Star
                          className={`w-5 h-5 ${
                            isStarred ? 'text-amber-500 fill-amber-500' : 'text-slate-400'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                      Base Price:{' '}
                      <span className="text-slate-900 dark:text-white font-bold">
                        {formatLakhs(player.basePriceLakhs)}
                      </span>
                      {player.stats.iplTitles > 0 && (
                        <span className="ml-3 inline-flex items-center gap-1 text-amber-500">
                          <Trophy className="w-3.5 h-3.5" />
                          {player.stats.iplTitles}x IPL Champion
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Server Synced Circular Countdown */}
                <div className="self-center sm:self-auto shrink-0">
                  <CircularTimer
                    timerEndsAt={roomState.timerEndsAt}
                    pausedRemainingMs={roomState.pausedRemainingMs}
                    totalSeconds={roomState.timerSeconds}
                    clockOffsetMs={clockOffsetMs}
                    isPaused={roomState.status === 'PAUSED'}
                  />
                </div>
              </div>

              {/* Player Stats Grid */}
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mt-5">
                {[
                  { label: 'MAT', value: player.stats.matches },
                  { label: 'RUNS', value: player.stats.runs },
                  { label: 'SR', value: player.stats.strikeRate },
                  { label: 'AVG', value: player.stats.battingAverage },
                  { label: 'WKTS', value: player.stats.wickets },
                  { label: 'ECON', value: player.stats.economy },
                  { label: 'BEST', value: player.stats.bestFigures },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 px-2 py-2 text-center"
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {stat.label}
                    </div>
                    <div className="font-display font-extrabold text-sm text-slate-900 dark:text-white mt-0.5">
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Current Bid & Leading Franchise Banner */}
              <div className="mt-5 rounded-2xl bg-slate-950 text-white p-4 flex flex-wrap items-center justify-between gap-4 border border-slate-800">
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">
                    {roomState.currentBidLakhs === null ? 'Opening Bid At' : 'Current Highest Bid'}
                  </div>
                  <div className="font-display text-3xl sm:text-4xl font-black text-amber-400 mt-0.5">
                    {roomState.currentBidLakhs === null
                      ? formatLakhs(player.basePriceLakhs)
                      : formatLakhs(roomState.currentBidLakhs)}
                  </div>
                  {roomState.vetoJumpActive && (
                    <span className="inline-block mt-1 px-2 py-0.5 rounded bg-purple-500/25 text-purple-300 text-[11px] font-bold">
                      Veto Card Active: Next increment capped at +₹5 L
                    </span>
                  )}
                </div>

                {roomState.highestBidderTeamId ? (
                  <div className="flex items-center gap-3 bg-white/10 px-4 py-2.5 rounded-2xl border border-white/15">
                    <TeamCrest teamId={roomState.highestBidderTeamId} size="md" />
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">
                        Leading Team
                      </div>
                      <div className="font-bold text-sm">{leadingBrand?.name}</div>
                      <div className="text-[11px] text-slate-300">
                        {roomState.highestBidderName}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-400">
                    No bids placed yet
                  </div>
                )}
              </div>

              {/* Main BID Button + Power Card */}
              <div className="mt-5 space-y-3">
                <button
                  type="button"
                  disabled={Boolean(bidDisabledReason) || bidBusy}
                  onClick={handlePlaceBid}
                  className={`w-full py-4 rounded-2xl font-display font-black text-xl flex items-center justify-center gap-3 shadow-xl transition-all ${
                    bidDisabledReason
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 cursor-pointer active:scale-[0.98] shadow-emerald-500/25'
                  }`}
                >
                  <Gavel className="w-6 h-6" />
                  {bidDisabledReason
                    ? bidDisabledReason
                    : `BID ${formatLakhs(nextBidLakhs)}`}
                </button>

                {myTeam && !isSpectator && (
                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 p-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>
                        Power Card:{' '}
                        {myTeam.powerCardUsed ? (
                          <span className="text-slate-400">Used</span>
                        ) : (
                          <span className="text-emerald-500">1 Available</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={myTeam.powerCardUsed || roomState.status === 'PAUSED'}
                        onClick={() => handlePowerCard('RESET_TIMER')}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Reset countdown clock to full duration once"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset Timer
                      </button>
                      <button
                        type="button"
                        disabled={
                          myTeam.powerCardUsed ||
                          roomState.status === 'PAUSED' ||
                          roomState.currentBidLakhs === null
                        }
                        onClick={() => handlePowerCard('VETO_JUMP')}
                        className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-600 dark:text-purple-400 text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Cap the next bid increment jump to +₹5L"
                      >
                        <ShieldBan className="w-3.5 h-3.5" />
                        Veto Jump (+5L)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center">
              <p className="font-display text-xl font-bold text-slate-900 dark:text-white">
                Preparing Next Player...
              </p>
            </div>
          )}

          {/* Live Bid History Feed */}
          <div className="rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-4 shadow-lg">
            <h3 className="font-display font-bold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-emerald-500" />
              Live Bid Feed
            </h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {roomState.recentBids.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">
                  Bids will appear here in real time.
                </p>
              ) : (
                roomState.recentBids.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <TeamCrest teamId={b.teamId} size="xs" />
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {b.teamId}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 truncate">
                        bid on {b.playerName}
                      </span>
                    </div>
                    <span className="font-display font-extrabold text-amber-500 shrink-0 ml-2">
                      {formatLakhs(b.amountLakhs)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Live Chat & Emoji Reactions */}
        <div className="lg:col-span-3 order-3">
          <ChatReactions
            messages={roomState.chatMessages}
            reactions={reactions}
            onSendMessage={(msg) => emitAction('chat:send', { message: msg })}
            onSendReaction={sendReaction}
          />
        </div>
      </div>
    </div>
  );
}
