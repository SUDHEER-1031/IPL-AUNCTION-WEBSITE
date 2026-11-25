export type PlayerRole = 'Batter' | 'Bowler' | 'All-rounder' | 'Wicketkeeper' | 'Spinner';
export type RoomStatus = 'LOBBY' | 'LIVE' | 'PAUSED' | 'ACCELERATED' | 'ENDED';
export type MemberRole = 'HOST' | 'PLAYER' | 'SPECTATOR';

export interface PlayerStats {
  matches: number;
  runs: number;
  strikeRate: number;
  battingAverage: number;
  wickets: number;
  economy: number;
  bestFigures: string;
  iplTitles: number;
}

export interface Player {
  id: string;
  name: string;
  photo: string;
  role: PlayerRole;
  nationality: string;
  isOverseas: boolean;
  basePriceLakhs: number;
  stats: PlayerStats;
}

export interface BoughtPlayer extends Player {
  soldPriceLakhs: number;
}

export interface MemberView {
  id: string;
  displayName: string;
  teamId: string | null;
  role: MemberRole;
  isConnected: boolean;
  isVoiceActive?: boolean;
}

export interface TeamView {
  teamId: string;
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  purseLakhs: number;
  squadCount: number;
  overseasCount: number;
  powerCardUsed: boolean;
  ownerMemberId: string | null;
  ownerName: string | null;
  isActiveInAuction: boolean;
  boughtPlayers: BoughtPlayer[];
}

export interface RoomPlayerView {
  player: Player;
  globalOrder: number;
  setNumber: number;
  setName: string;
  orderInSet: number;
  status: 'UPCOMING' | 'ACTIVE' | 'SOLD' | 'UNSOLD';
  soldPriceLakhs: number | null;
  soldToTeamId: string | null;
  isAccelerated: boolean;
}

export interface BidRecordView {
  id: number;
  playerId: string;
  playerName: string;
  teamId: string;
  memberName: string;
  amountLakhs: number;
  createdAt: number;
}

export interface ChatMessageView {
  id: number;
  memberId: string;
  displayName: string;
  teamId: string | null;
  message: string;
  createdAt: number;
}

export interface TeamEvaluation {
  teamId: string;
  teamName: string;
  ownerName: string;
  purseRemainingLakhs: number;
  totalSpentLakhs: number;
  squadCount: number;
  overseasCount: number;
  roleBreakdown: Record<PlayerRole, number>;
  rating: number;
  grade: string;
  summary: string;
  bestXI: BoughtPlayer[];
}

export interface RoomStatePayload {
  code: string;
  name: string;
  status: RoomStatus;
  timerSeconds: number;
  hostMemberId: string;
  members: MemberView[];
  teams: TeamView[];
  currentPlayer: RoomPlayerView | null;
  progress: {
    setNumber: number;
    totalSets: number;
    setName: string;
    orderInSet: number;
    playersInSet: number;
    completedCount: number;
    totalPlayers: number;
  };
  currentBidLakhs: number | null;
  highestBidderTeamId: string | null;
  highestBidderName: string | null;
  vetoJumpActive: boolean;
  timerEndsAt: number | null;
  pausedRemainingMs: number | null;
  recentBids: BidRecordView[];
  commentary: string[];
  chatMessages: ChatMessageView[];
  allRoomPlayers: RoomPlayerView[];
  evaluations: TeamEvaluation[] | null;
  serverNow: number;
}

export interface ResolutionEvent {
  outcome: 'SOLD' | 'UNSOLD';
  player: Player;
  teamId: string | null;
  teamName: string | null;
  priceLakhs: number | null;
}

export interface ReactionBurst {
  id: string;
  emoji: string;
  senderName: string;
  teamId: string | null;
}

export interface WatchlistAlert {
  playerId: string;
  playerName: string;
  basePriceLakhs: number;
  role: PlayerRole;
}
