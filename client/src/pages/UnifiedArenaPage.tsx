import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Award,
  Check,
  Clock,
  Copy,
  Crown,
  Download,
  FastForward,
  FlagOff,
  Flame,
  Gavel,
  History,
  Pause,
  Plane,
  Play,
  Printer,
  RotateCcw,
  Search,
  Share2,
  ShieldBan,
  Sparkles,
  Star,
  Trophy,
  Users,
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { TEAM_BRANDS, getTeamBrand } from '../data/teams';
import type { PlayerRole } from '../types/auction';
import {
  formatLakhs,
  getCountryFlag,
  getNextBidClient,
  getRoleBadgeClasses,
} from '../utils/format';
import { exportAuctionCsv, exportAuctionPdf } from '../utils/export';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { TeamCrest } from '../components/TeamCrest';
import { CircularTimer } from '../components/CircularTimer';
import { CommentaryTicker } from '../components/CommentaryTicker';
import { TeamSidebar } from '../components/TeamSidebar';
import { ChatReactions } from '../components/ChatReactions';
import { VoiceMembersPanel } from '../components/VoiceMembersPanel';

const ROLES: Array<'ALL' | PlayerRole> = [
  'ALL',
  'Batter',
  'Bowler',
  'All-rounder',
  'Wicketkeeper',
  'Spinner',
];
const ROLE_ORDER: PlayerRole[] = ['Batter', 'Wicketkeeper', 'All-rounder', 'Spinner', 'Bowler'];

export function UnifiedArenaPage() {
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
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Squads & Pool filters (all inline on 1 page)
  const [showAllSquadTeams, setShowAllSquadTeams] = useState(false);
  const [poolQuery, setPoolQuery] = useState('');
  const [poolRoleFilter, setPoolRoleFilter] = useState<'ALL' | PlayerRole>('ALL');
  const [poolStarredOnly, setPoolStarredOnly] = useState(false);

  const filteredPool = useMemo(() => {
    if (!roomState) return [];
    return roomState.allRoomPlayers.filter((rp) => {
      if (poolRoleFilter !== 'ALL' && rp.player.role !== poolRoleFilter) return false;
      if (poolStarredOnly && !watchlist.includes(rp.player.id)) return false;
      if (poolQuery.trim()) {
        const q = poolQuery.trim().toLowerCase();
        return (
          rp.player.name.toLowerCase().includes(q) ||
          rp.player.nationality.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [roomState, poolRoleFilter, poolStarredOnly, watchlist, poolQuery]);

  if (!roomState || !identity) return null;

  const isHost = identity.memberId === roomState.hostMemberId;
  const isSpectator = identity.role === 'SPECTATOR';
  const myMember = roomState.members.find((m) => m.id === identity.memberId);
  const myTeam = roomState.teams.find((t) => t.teamId === myMember?.teamId) ?? null;
  const claimedCount = roomState.members.filter(
    (m) => m.role !== 'SPECTATOR' && m.teamId !== null,
  ).length;

  const activeRp = roomState.currentPlayer;
  const player = activeRp?.player ?? null;
  const nextBidLakhs = player
    ? getNextBidClient(player.basePriceLakhs, roomState.currentBidLakhs, roomState.vetoJumpActive)
    : 0;

  let bidDisabledReason: string | null = null;
  if (isSpectator) {
    bidDisabledReason = 'Spectator Mode (view-only)';
  } else if (!myTeam) {
    bidDisabledReason = 'Pick an unclaimed IPL team below to bid';
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

  const showTeamPicker =
    !isSpectator &&
    roomState.status !== 'ENDED' &&
    (roomState.status === 'LOBBY' || !myMember?.teamId);

  const copyRoomCode = () => {
    void navigator.clipboard.writeText(roomState.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  };

  const copyInviteLink = () => {
    const url = `${window.location.origin}/?code=${roomState.code}`;
    void navigator.clipboard.writeText(url);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 1800);
  };

  const handleSelectTeam = async (teamId: string) => {
    setActionError(null);
    const res = await emitAction('team:select', { teamId });
    if (!res.ok) setActionError(res.error || 'Could not select team');
  };

  const handleSetTimer = async (seconds: number) => {
    setActionError(null);
    const res = await emitAction('room:setTimer', { seconds });
    if (!res.ok) setActionError(res.error || 'Failed to update timer');
  };

  const handleStartAuction = async () => {
    setActionError(null);
    const res = await emitAction('auction:start');
    if (!res.ok) setActionError(res.error || 'Could not start auction');
  };

  const handleHostControl = async (event: string) => {
    setActionError(null);
    const res = await emitAction(event);
    if (!res.ok) setActionError(res.error || 'Action failed');
  };

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

  const soldPlayers = roomState.allRoomPlayers.filter(
    (rp) => rp.status === 'SOLD' && rp.soldPriceLakhs !== null,
  );
  const unsoldCount = roomState.allRoomPlayers.filter((rp) => rp.status === 'UNSOLD').length;
  const mostExpensive = [...soldPlayers].sort(
    (a, b) => (b.soldPriceLakhs ?? 0) - (a.soldPriceLakhs ?? 0),
  )[0];
  const evaluations = roomState.evaluations ?? [];
  const winner = evaluations[0] ?? null;

  const squadsToShow = showAllSquadTeams
    ? roomState.teams
    : roomState.teams.filter((t) => t.isActiveInAuction);

  return (
    <div className="max-w-[1440px] mx-auto px-4 py-4 space-y-5">
      {/* Live Commentary Ticker */}
      <CommentaryTicker lines={roomState.commentary} />

      {/* Room Info & Live Host Settings Bar */}
      <div className="rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-4 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={copyRoomCode}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 cursor-pointer"
            title="Copy room code"
          >
            <span className="text-[11px] font-bold uppercase text-amber-600 dark:text-amber-400">
              Code
            </span>
            <span className="font-mono font-black text-sm tracking-widest text-slate-900 dark:text-white">
              {roomState.code}
            </span>
            {copiedCode ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-amber-500" />
            )}
          </button>

          <button
            type="button"
            onClick={copyInviteLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-xs font-bold text-sky-600 dark:text-sky-400 cursor-pointer"
          >
            {copiedInvite ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
            {copiedInvite ? 'Link Copied!' : 'Invite Link'}
          </button>

          <span
            className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
              roomState.status === 'LOBBY'
                ? 'bg-sky-500/15 text-sky-500'
                : roomState.status === 'PAUSED'
                  ? 'bg-amber-500/20 text-amber-500'
                  : roomState.status === 'ACCELERATED'
                    ? 'bg-purple-500/20 text-purple-400'
                    : roomState.status === 'ENDED'
                      ? 'bg-rose-500/20 text-rose-500'
                      : 'bg-emerald-500/20 text-emerald-500'
            }`}
          >
            {roomState.status === 'ACCELERATED' ? 'Accelerated Round' : roomState.status}
          </span>

          {roomState.status !== 'LOBBY' && roomState.status !== 'ENDED' && (
            <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">
              {activeRp?.isAccelerated
                ? `Unsold Recall · ${roomState.progress.completedCount}/${roomState.progress.totalPlayers} processed`
                : `Set ${roomState.progress.setNumber}/${roomState.progress.totalSets} (${roomState.progress.setName}) · Player ${roomState.progress.orderInSet}/${roomState.progress.playersInSet}`}
            </span>
          )}
        </div>

        {/* Host Live Settings (works in BOTH Lobby AND Live/Paused!) */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <Clock className="w-3.5 h-3.5 text-sky-500" />
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              Timer:
            </span>
            {[5, 10, 15].map((sec) => (
              <button
                key={sec}
                type="button"
                disabled={!isHost || roomState.status === 'ENDED'}
                onClick={() => void handleSetTimer(sec)}
                className={`px-2 py-0.5 rounded-lg text-xs font-extrabold transition-colors ${
                  roomState.timerSeconds === sec
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                } ${isHost && roomState.status !== 'ENDED' ? 'cursor-pointer' : 'opacity-70 cursor-default'}`}
              >
                {sec}s
              </button>
            ))}
          </div>

          {isHost && roomState.status === 'LOBBY' && (
            <button
              type="button"
              disabled={claimedCount < 2}
              onClick={() => void handleStartAuction()}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {claimedCount < 2
                ? `Need ${2 - claimedCount} More Team(s)`
                : `Start Auction (${claimedCount} Teams)`}
            </button>
          )}

          {isHost &&
            (roomState.status === 'LIVE' ||
              roomState.status === 'ACCELERATED' ||
              roomState.status === 'PAUSED') && (
              <>
                {roomState.status === 'PAUSED' ? (
                  <button
                    type="button"
                    onClick={() => void handleHostControl('auction:resume')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Resume
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleHostControl('auction:pause')}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-500 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    Pause
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleHostControl('auction:skip')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <FastForward className="w-3.5 h-3.5" />
                  Skip
                </button>
                <button
                  type="button"
                  onClick={() => void handleHostControl('auction:end')}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-500 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <FlagOff className="w-3.5 h-3.5" />
                  End
                </button>
              </>
            )}
        </div>
      </div>

      {actionError && (
        <div className="rounded-2xl bg-rose-500/15 border border-rose-500/40 px-4 py-2.5 text-xs font-semibold text-rose-500 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Franchise Picker (shown in Lobby OR to mid-auction joiners without a team yet) */}
      {showTeamPicker && (
        <div className="rounded-3xl bg-white dark:bg-slate-900/90 border border-amber-500/30 p-5 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                {roomState.status === 'LOBBY'
                  ? `Pick Your IPL Franchise (${claimedCount}/10 Claimed)`
                  : 'Welcome! Claim an Unclaimed IPL Franchise to Start Bidding'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Anyone with the room code and password can join anytime. Pick any available team below.
              </p>
            </div>
            {myMember?.teamId && (
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-500 text-xs font-bold">
                Your Franchise: {myMember.teamId}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            {TEAM_BRANDS.map((brand) => {
              const owner = roomState.members.find(
                (m) => m.teamId === brand.id && m.role !== 'SPECTATOR',
              );
              const isMine = owner?.id === identity.memberId;
              const takenByOther = Boolean(owner && !isMine);

              return (
                <button
                  key={brand.id}
                  type="button"
                  disabled={takenByOther}
                  onClick={() => void handleSelectTeam(brand.id)}
                  className={`rounded-2xl p-2.5 border text-left transition-all flex items-center gap-2.5 ${
                    isMine
                      ? 'border-amber-400 ring-2 ring-amber-400/40 bg-amber-500/10 cursor-pointer'
                      : takenByOther
                        ? 'border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/60 opacity-50 cursor-not-allowed'
                        : 'border-slate-200 dark:border-slate-800 hover:border-amber-400/70 bg-slate-50/70 dark:bg-slate-950/40 cursor-pointer'
                  }`}
                >
                  <TeamCrest teamId={brand.id} size="sm" />
                  <div className="min-w-0">
                    <div className="font-display font-bold text-xs text-slate-900 dark:text-white truncate">
                      {brand.shortName}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {isMine ? 'YOURS' : owner ? owner.displayName : 'Available'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* MAIN 1-PAGE WORKSPACE: Franchises + Voice (Left) | Stage + Bid Feed (Center) | Chat + Reactions (Right) */}
      <section id="stage-section" className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column */}
        <div className="lg:col-span-3 space-y-5 order-2 lg:order-1">
          <TeamSidebar
            teams={roomState.teams}
            highestBidderTeamId={roomState.highestBidderTeamId}
            myTeamId={myTeam?.teamId ?? null}
          />
          <VoiceMembersPanel />
        </div>

        {/* Center Column */}
        <div className="lg:col-span-6 space-y-4 order-1 lg:order-2">
          {roomState.status === 'LOBBY' ? (
            <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-8 text-center text-white shadow-xl space-y-3">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Gavel className="w-7 h-7" />
              </div>
              <h2 className="font-display text-2xl font-black">
                Auction Lobby Open — {claimedCount} Franchise{claimedCount === 1 ? '' : 's'} Ready
              </h2>
              <p className="text-sm text-slate-300 max-w-md mx-auto">
                Chat, test your voice mic, or star players in the 120-player pool below while
                waiting for the host to start the auction.
              </p>
              {isHost && (
                <button
                  type="button"
                  disabled={claimedCount < 2}
                  onClick={() => void handleStartAuction()}
                  className="mt-2 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-display font-black text-base cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-5 h-5 fill-current" />
                  {claimedCount < 2
                    ? `Need ${2 - claimedCount} More Team(s) to Start`
                    : `Start Live Auction (${claimedCount} Teams)`}
                </button>
              )}
            </div>
          ) : roomState.status === 'ENDED' ? (
            <div className="rounded-3xl bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-950 border border-amber-500/40 p-6 text-white shadow-xl flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-extrabold uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                  <Crown className="w-4 h-4" />
                  Auction Concluded — Champion Crowned
                </div>
                {winner ? (
                  <>
                    <h2 className="font-display text-3xl font-black mt-1">{winner.teamName}</h2>
                    <p className="text-xs text-slate-300 mt-1">
                      Owner: <span className="font-bold">{winner.ownerName}</span> · Score{' '}
                      <span className="font-black text-amber-400">
                        {winner.rating}/100 ({winner.grade})
                      </span>
                    </p>
                  </>
                ) : (
                  <h2 className="font-display text-2xl font-black mt-1">Auction Ended</h2>
                )}
              </div>
              {winner && <TeamCrest teamId={winner.teamId} size="lg" />}
            </div>
          ) : player ? (
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
                        onClick={() => void emitAction('watchlist:toggle', { playerId: player.id })}
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

              <div className="mt-5 space-y-3">
                <button
                  type="button"
                  disabled={Boolean(bidDisabledReason) || bidBusy}
                  onClick={() => void handlePlaceBid()}
                  className={`w-full py-4 rounded-2xl font-display font-black text-xl flex items-center justify-center gap-3 shadow-xl transition-all ${
                    bidDisabledReason
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 cursor-pointer active:scale-[0.98] shadow-emerald-500/25'
                  }`}
                >
                  <Gavel className="w-6 h-6" />
                  {bidDisabledReason ? bidDisabledReason : `BID ${formatLakhs(nextBidLakhs)}`}
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
                        onClick={() => void handlePowerCard('RESET_TIMER')}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
                        onClick={() => void handlePowerCard('VETO_JUMP')}
                        className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-600 dark:text-purple-400 text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ShieldBan className="w-3.5 h-3.5" />
                        Veto Jump (+5L)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ) : null}

          {/* Live Bid Feed */}
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

        {/* Right Column: Live Chat + Emoji Reactions */}
        <div className="lg:col-span-3 order-3">
          <ChatReactions
            messages={roomState.chatMessages}
            reactions={reactions}
            onSendMessage={(msg) => emitAction('chat:send', { message: msg })}
            onSendReaction={sendReaction}
          />
        </div>
      </section>

      {/* SECTION 2 (Same 1 Page): Franchise Squads */}
      <section
        id="squads-section"
        className="rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-lg space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              Franchise Squads
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Bought players grouped by role across participating franchises
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAllSquadTeams((v) => !v)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            {showAllSquadTeams ? 'Active Teams Only' : 'Show All 10 Franchises'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {squadsToShow.map((team) => (
            <div
              key={team.teamId}
              className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-4"
            >
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5 min-w-0">
                  <TeamCrest teamId={team.teamId} size="sm" />
                  <div className="min-w-0">
                    <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white truncate">
                      {team.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {team.ownerName ? `Owner: ${team.ownerName}` : 'Unclaimed'}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display font-black text-sm text-amber-500">
                    {formatLakhs(team.purseLakhs)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-end gap-1.5">
                    <span>{team.squadCount}/11</span>
                    <span className="inline-flex items-center gap-0.5">
                      <Plane className="w-3 h-3" />
                      {team.overseasCount}/4
                    </span>
                  </div>
                </div>
              </div>

              {team.boughtPlayers.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No players signed yet.</p>
              ) : (
                <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
                  {ROLE_ORDER.map((role) => {
                    const group = team.boughtPlayers.filter((p) => p.role === role);
                    if (group.length === 0) return null;
                    return (
                      <div key={role}>
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                          {role}s ({group.length})
                        </div>
                        <div className="space-y-1">
                          {group.map((p) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
                            >
                              <span className="truncate font-semibold text-slate-800 dark:text-slate-200">
                                {getCountryFlag(p.nationality)} {p.name}
                              </span>
                              <span className="font-display font-bold text-emerald-500 shrink-0 ml-2">
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
      </section>

      {/* SECTION 3 (Same 1 Page): 120-Player Pool & Watchlist */}
      <section
        id="pool-section"
        className="rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-lg space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              120-Player Pool & Watchlist ({watchlist.length} starred)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Star any player to receive an alert when they enter the auction block.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={poolQuery}
              onChange={(e) => setPoolQuery(e.target.value)}
              placeholder="Search player or country..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setPoolRoleFilter(r)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                  poolRoleFilter === r
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-300'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setPoolStarredOnly((v) => !v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer border ${
              poolStarredOnly
                ? 'bg-amber-500/20 border-amber-500 text-amber-500'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${poolStarredOnly ? 'fill-amber-500' : ''}`} />
            Starred
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
          {filteredPool.map((rp) => {
            const starred = watchlist.includes(rp.player.id);
            return (
              <div
                key={rp.player.id}
                className="rounded-2xl p-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">{getCountryFlag(rp.player.nationality)}</span>
                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {rp.player.name}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getRoleBadgeClasses(
                        rp.player.role,
                      )}`}
                    >
                      {rp.player.role}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Set {rp.setNumber} · {formatLakhs(rp.player.basePriceLakhs)}
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
                  onClick={() => void emitAction('watchlist:toggle', { playerId: rp.player.id })}
                  className={`p-1.5 rounded-xl border cursor-pointer shrink-0 ${
                    starred
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-500'
                      : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-amber-500'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${starred ? 'fill-amber-500' : ''}`} />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 4 (Same 1 Page): Standings, Leaderboard, Best XI & Exports */}
      <section
        id="summary-section"
        className="rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-lg space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              Auction Standings, Summary & Exports
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {soldPlayers.length} players sold · {unsoldCount} unsold
            </p>
          </div>

          <div className="no-print flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportAuctionCsv(roomState)}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={exportAuctionPdf}
              className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow"
            >
              <Printer className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-widest text-rose-500 flex items-center gap-1.5">
                <Flame className="w-4 h-4" />
                Most Expensive Buy
              </div>
              {mostExpensive && mostExpensive.soldPriceLakhs !== null ? (
                <>
                  <div className="font-display text-xl font-black text-slate-900 dark:text-white mt-1">
                    {mostExpensive.player.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {mostExpensive.soldToTeamId} ·{' '}
                    <span className="font-bold text-emerald-500">
                      {formatLakhs(mostExpensive.soldPriceLakhs)}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-400 mt-1">No players sold yet.</p>
              )}
            </div>
            {mostExpensive?.soldToTeamId && (
              <TeamCrest teamId={mostExpensive.soldToTeamId} size="md" />
            )}
          </div>

          <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-widest text-amber-500 flex items-center gap-1.5">
                <Trophy className="w-4 h-4" />
                Final Team Ratings & Best XI
              </div>
              {winner ? (
                <>
                  <div className="font-display text-xl font-black text-slate-900 dark:text-white mt-1">
                    Winner: {winner.teamName}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {winner.rating}/100 (Grade {winner.grade}) · {winner.summary}
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Auto-generated ratings and Best XI appear here once the auction concludes.
                </p>
              )}
            </div>
            {winner && <TeamCrest teamId={winner.teamId} size="md" />}
          </div>
        </div>

        {evaluations.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {evaluations.map((ev, index) => (
              <div
                key={ev.teamId}
                className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 font-display font-black text-xs flex items-center justify-center">
                      #{index + 1}
                    </span>
                    <TeamCrest teamId={ev.teamId} size="sm" />
                    <div>
                      <div className="font-display font-bold text-sm text-slate-900 dark:text-white">
                        {ev.teamName}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {ev.ownerName} · {ev.squadCount}/11 · {formatLakhs(ev.purseRemainingLakhs)}{' '}
                        left
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-xl font-black text-amber-500">
                      {ev.rating}/100
                    </div>
                    <span className="text-[11px] font-black text-emerald-500">
                      Grade {ev.grade}
                    </span>
                  </div>
                </div>

                {ev.bestXI.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {ev.bestXI.map((p, idx) => (
                      <div
                        key={p.id}
                        className="text-[11px] px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 truncate text-slate-800 dark:text-slate-200"
                      >
                        <span className="text-slate-400 font-bold mr-1">{idx + 1}.</span>
                        {getCountryFlag(p.nationality)} {p.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
