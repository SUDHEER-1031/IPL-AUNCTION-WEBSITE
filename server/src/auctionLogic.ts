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

export interface TeamMeta {
  id: string;
  shortName: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
}

export const IPL_TEAMS: TeamMeta[] = [
  { id: 'CSK', shortName: 'CSK', name: 'Chennai Super Kings', primaryColor: '#FDB913', secondaryColor: '#0081E9' },
  { id: 'MI', shortName: 'MI', name: 'Mumbai Indians', primaryColor: '#004BA0', secondaryColor: '#D1AB3E' },
  { id: 'RCB', shortName: 'RCB', name: 'Royal Challengers Bengaluru', primaryColor: '#EC1C24', secondaryColor: '#1C1C1C' },
  { id: 'KKR', shortName: 'KKR', name: 'Kolkata Knight Riders', primaryColor: '#3A225D', secondaryColor: '#D4AF37' },
  { id: 'SRH', shortName: 'SRH', name: 'Sunrisers Hyderabad', primaryColor: '#FF822A', secondaryColor: '#1A1A1A' },
  { id: 'DC', shortName: 'DC', name: 'Delhi Capitals', primaryColor: '#0078BC', secondaryColor: '#EF1B23' },
  { id: 'RR', shortName: 'RR', name: 'Rajasthan Royals', primaryColor: '#EA1A85', secondaryColor: '#004BA0' },
  { id: 'PBKS', shortName: 'PBKS', name: 'Punjab Kings', primaryColor: '#DD1F2D', secondaryColor: '#D7B56D' },
  { id: 'LSG', shortName: 'LSG', name: 'Lucknow Super Giants', primaryColor: '#00AEEF', secondaryColor: '#F36F21' },
  { id: 'GT', shortName: 'GT', name: 'Gujarat Titans', primaryColor: '#1B2133', secondaryColor: '#B9975B' },
];

export const INITIAL_PURSE_LAKHS = 15000; // 150 Cr
export const MAX_SQUAD_SIZE = 11;
export const MAX_OVERSEAS = 4;

export interface TeamStateSnapshot {
  teamId: string;
  purseLakhs: number;
  squadCount: number;
  overseasCount: number;
  powerCardUsed: boolean;
}

export interface BidValidationInput {
  roomStatus: RoomStatus;
  hasActivePlayer: boolean;
  activePlayerIsOverseas: boolean;
  activePlayerBasePriceLakhs: number;
  currentBidLakhs: number | null;
  highestBidderTeamId: string | null;
  vetoJumpActive?: boolean;
  memberRole: MemberRole;
  isKicked: boolean;
  team: TeamStateSnapshot | null;
  expectedAmountLakhs?: number;
}

export interface BidValidationResult {
  allowed: boolean;
  nextBidLakhs: number;
  reason?: string;
}

export function formatLakhs(lakhs: number): string {
  if (lakhs >= 100) {
    const cr = lakhs / 100;
    const formatted = Number.isInteger(cr) ? cr.toFixed(0) : cr.toFixed(2).replace(/0$/, '');
    return `₹${formatted} Cr`;
  }
  return `₹${lakhs} L`;
}

export function getIncrementForBid(currentBidLakhs: number, vetoJumpActive = false): number {
  if (vetoJumpActive) return 5;
  if (currentBidLakhs < 100) return 5;
  if (currentBidLakhs < 500) return 10;
  return 25;
}

export function getNextBidAmount(
  basePriceLakhs: number,
  currentBidLakhs: number | null,
  vetoJumpActive = false,
): number {
  if (currentBidLakhs === null) {
    return basePriceLakhs;
  }
  return currentBidLakhs + getIncrementForBid(currentBidLakhs, vetoJumpActive);
}

export function validateBid(input: BidValidationInput): BidValidationResult {
  const nextBidLakhs = getNextBidAmount(
    input.activePlayerBasePriceLakhs,
    input.currentBidLakhs,
    Boolean(input.vetoJumpActive),
  );

  if (input.isKicked) {
    return { allowed: false, nextBidLakhs, reason: 'You were removed from this room' };
  }
  if (input.memberRole === 'SPECTATOR') {
    return { allowed: false, nextBidLakhs, reason: 'Spectators cannot place bids' };
  }
  if (!input.team) {
    return { allowed: false, nextBidLakhs, reason: 'No IPL team assigned' };
  }
  if (input.roomStatus === 'PAUSED') {
    return { allowed: false, nextBidLakhs, reason: 'Auction is paused by host' };
  }
  if (input.roomStatus !== 'LIVE' && input.roomStatus !== 'ACCELERATED') {
    return { allowed: false, nextBidLakhs, reason: 'Auction is not live' };
  }
  if (!input.hasActivePlayer) {
    return { allowed: false, nextBidLakhs, reason: 'No player currently on the block' };
  }
  if (input.highestBidderTeamId === input.team.teamId) {
    return { allowed: false, nextBidLakhs, reason: 'You already hold the highest bid' };
  }
  if (input.team.squadCount >= MAX_SQUAD_SIZE) {
    return { allowed: false, nextBidLakhs, reason: `Squad full (${MAX_SQUAD_SIZE}/${MAX_SQUAD_SIZE} players)` };
  }
  if (input.activePlayerIsOverseas && input.team.overseasCount >= MAX_OVERSEAS) {
    return {
      allowed: false,
      nextBidLakhs,
      reason: `Foreign limit reached (${MAX_OVERSEAS}/${MAX_OVERSEAS} overseas players)`,
    };
  }
  if (input.team.purseLakhs < nextBidLakhs) {
    return {
      allowed: false,
      nextBidLakhs,
      reason: `Insufficient purse (${formatLakhs(input.team.purseLakhs)} left, need ${formatLakhs(nextBidLakhs)})`,
    };
  }
  if (
    typeof input.expectedAmountLakhs === 'number' &&
    input.expectedAmountLakhs !== nextBidLakhs
  ) {
    return {
      allowed: false,
      nextBidLakhs,
      reason: `Bid price updated to ${formatLakhs(nextBidLakhs)} — click again to bid`,
    };
  }

  return { allowed: true, nextBidLakhs };
}

export function shuffleArray<T>(items: T[], rng: () => number = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export interface SetAssignment {
  playerId: string;
  setNumber: number;
  setName: string;
  orderInSet: number;
}

const SET_TITLES = [
  'Marquee Strikers',
  'Powerplay Blasters',
  'Death-Over Specialists',
  'All-Round Dynamos',
  'Spin Wizards',
  'Glove & Glory',
  'Pace Battery',
  'Middle-Order Anchors',
  'T20 Finishers',
  'Mystery & Craft',
  'IPL Legends',
  'Emerging Icons',
  'Super Over Stars',
  'Boundary Hunters',
  'Yorker Brigade',
  'Utility All-Stars',
  'Clutch Performers',
  'Championship Core',
  'Impact Substitutes',
  'Final Frontier',
];

/**
 * Splits 120 players into 20 randomized sets of 6 players each,
 * ensuring each set mixes Batters, Bowlers, All-rounders, Spinners, and Wicketkeepers.
 */
export function buildShuffledSets(players: Player[], rng: () => number = Math.random): SetAssignment[] {
  const numSets = 20;
  const setSize = 6;
  if (players.length !== numSets * setSize) {
    // Fallback generic chunking if custom pool size is passed in tests
    const shuffled = shuffleArray(players, rng);
    return shuffled.map((p, idx) => {
      const setIdx = Math.floor(idx / setSize);
      return {
        playerId: p.id,
        setNumber: setIdx + 1,
        setName: SET_TITLES[setIdx % SET_TITLES.length],
        orderInSet: (idx % setSize) + 1,
      };
    });
  }

  const byRole: Record<PlayerRole, Player[]> = {
    Batter: shuffleArray(players.filter((p) => p.role === 'Batter'), rng),
    Bowler: shuffleArray(players.filter((p) => p.role === 'Bowler'), rng),
    'All-rounder': shuffleArray(players.filter((p) => p.role === 'All-rounder'), rng),
    Spinner: shuffleArray(players.filter((p) => p.role === 'Spinner'), rng),
    Wicketkeeper: shuffleArray(players.filter((p) => p.role === 'Wicketkeeper'), rng),
  };

  const buckets: Player[][] = Array.from({ length: numSets }, () => []);

  // Pass 1: Put 1 of each core role (Batter, Bowler, All-rounder, Spinner) into each set where available
  const coreRoles: PlayerRole[] = ['Batter', 'Bowler', 'All-rounder', 'Spinner'];
  for (let s = 0; s < numSets; s++) {
    for (const role of coreRoles) {
      const candidate = byRole[role].pop();
      if (candidate) buckets[s].push(candidate);
    }
  }

  // Pass 2: Distribute Wicketkeepers across sets (1 per set while available)
  for (let s = 0; s < numSets; s++) {
    if (buckets[s].length < setSize) {
      const wk = byRole.Wicketkeeper.pop();
      if (wk) buckets[s].push(wk);
    }
  }

  // Pass 3: Pool remaining players, shuffle, and fill remaining slots up to 6 per set
  const leftovers = shuffleArray(
    [
      ...byRole.Batter,
      ...byRole.Bowler,
      ...byRole['All-rounder'],
      ...byRole.Spinner,
      ...byRole.Wicketkeeper,
    ],
    rng,
  );

  for (let s = 0; s < numSets; s++) {
    while (buckets[s].length < setSize && leftovers.length > 0) {
      const next = leftovers.pop();
      if (next) buckets[s].push(next);
    }
  }

  // Randomize both set order and player order inside each set
  const shuffledSetTitles = shuffleArray(SET_TITLES, rng);
  const shuffledBuckets = shuffleArray(buckets, rng);

  const assignments: SetAssignment[] = [];
  shuffledBuckets.forEach((bucket, setIdx) => {
    const orderedPlayers = shuffleArray(bucket, rng);
    orderedPlayers.forEach((player, playerIdx) => {
      assignments.push({
        playerId: player.id,
        setNumber: setIdx + 1,
        setName: shuffledSetTitles[setIdx],
        orderInSet: playerIdx + 1,
      });
    });
  });

  return assignments;
}

export interface BoughtPlayer extends Player {
  soldPriceLakhs: number;
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

export function computeTeamEvaluations(
  activeTeams: Array<{
    teamId: string;
    ownerName: string;
    purseLakhs: number;
    squad: BoughtPlayer[];
  }>,
): TeamEvaluation[] {
  const evaluations: TeamEvaluation[] = activeTeams.map((entry) => {
    const meta = IPL_TEAMS.find((t) => t.id === entry.teamId);
    const roleBreakdown: Record<PlayerRole, number> = {
      Batter: 0,
      Bowler: 0,
      'All-rounder': 0,
      Wicketkeeper: 0,
      Spinner: 0,
    };

    let overseasCount = 0;
    let totalSpentLakhs = 0;
    let starPower = 0;

    for (const p of entry.squad) {
      roleBreakdown[p.role] += 1;
      if (p.isOverseas) overseasCount += 1;
      totalSpentLakhs += p.soldPriceLakhs;
      const impact =
        Math.min(20, p.stats.matches / 12) +
        Math.min(12, p.stats.runs / 500) +
        Math.min(12, p.stats.wickets / 15) +
        p.stats.iplTitles * 1.5;
      starPower += impact;
    }

    const squadScore = Math.min(28, (entry.squad.length / MAX_SQUAD_SIZE) * 28);
    const batScore = Math.min(18, (roleBreakdown.Batter + roleBreakdown['All-rounder'] * 0.6) * 4.5);
    const bowlScore = Math.min(
      18,
      (roleBreakdown.Bowler + roleBreakdown.Spinner + roleBreakdown['All-rounder'] * 0.5) * 4.5,
    );
    const wkScore = roleBreakdown.Wicketkeeper >= 1 ? 10 : 0;
    const spinScore = roleBreakdown.Spinner >= 1 ? 8 : 0;
    const arScore = Math.min(8, roleBreakdown['All-rounder'] * 4);
    const qualityScore = Math.min(10, starPower / Math.max(1, entry.squad.length * 2.5));

    const rawScore = Math.round(
      Math.min(100, squadScore + batScore + bowlScore + wkScore + spinScore + arScore + qualityScore),
    );
    const rating = entry.squad.length === 0 ? 0 : Math.max(25, rawScore);

    let grade = 'C';
    if (rating >= 90) grade = 'S+';
    else if (rating >= 82) grade = 'A+';
    else if (rating >= 74) grade = 'A';
    else if (rating >= 64) grade = 'B+';
    else if (rating >= 52) grade = 'B';

    const missing: string[] = [];
    if (roleBreakdown.Wicketkeeper === 0) missing.push('specialist keeper');
    if (roleBreakdown.Spinner === 0) missing.push('frontline spinner');
    if (roleBreakdown.Bowler < 2) missing.push('pace depth');
    if (entry.squad.length < 7) missing.push('squad depth');

    const summary =
      entry.squad.length === 0
        ? 'No players signed in this auction.'
        : missing.length === 0
          ? 'Well-balanced championship squad across batting, pace, spin, and keeping.'
          : `Strong core, though light on ${missing.join(' & ')}.`;

    const roleOrder: Record<PlayerRole, number> = {
      Batter: 1,
      Wicketkeeper: 2,
      'All-rounder': 3,
      Spinner: 4,
      Bowler: 5,
    };

    const bestXI = [...entry.squad]
      .sort((a, b) => {
        if (roleOrder[a.role] !== roleOrder[b.role]) return roleOrder[a.role] - roleOrder[b.role];
        return b.soldPriceLakhs - a.soldPriceLakhs;
      })
      .slice(0, 11);

    return {
      teamId: entry.teamId,
      teamName: meta?.name ?? entry.teamId,
      ownerName: entry.ownerName,
      purseRemainingLakhs: entry.purseLakhs,
      totalSpentLakhs,
      squadCount: entry.squad.length,
      overseasCount,
      roleBreakdown,
      rating,
      grade,
      summary,
      bestXI,
    };
  });

  return evaluations.sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    return b.squadCount - a.squadCount || b.purseRemainingLakhs - a.purseRemainingLakhs;
  });
}
