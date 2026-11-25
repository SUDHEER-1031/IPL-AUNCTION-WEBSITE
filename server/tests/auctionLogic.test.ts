import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildShuffledSets,
  computeTeamEvaluations,
  getIncrementForBid,
  getNextBidAmount,
  INITIAL_PURSE_LAKHS,
  MAX_OVERSEAS,
  MAX_SQUAD_SIZE,
  validateBid,
  type Player,
  type TeamStateSnapshot,
} from '../src/auctionLogic.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const playersPath = path.resolve(__dirname, '../data/players.json');

function makeTeam(overrides: Partial<TeamStateSnapshot> = {}): TeamStateSnapshot {
  return {
    teamId: 'MI',
    purseLakhs: INITIAL_PURSE_LAKHS,
    squadCount: 0,
    overseasCount: 0,
    powerCardUsed: false,
    ...overrides,
  };
}

describe('Tiered bid increments', () => {
  it('uses base price when there is no current bid', () => {
    assert.equal(getNextBidAmount(50, null), 50);
    assert.equal(getNextBidAmount(200, null), 200);
  });

  it('adds +5L below 1 Cr (100L), +10L from 1 Cr up to 5 Cr, and +25L at 5 Cr+', () => {
    assert.equal(getIncrementForBid(20), 5);
    assert.equal(getIncrementForBid(95), 5);
    assert.equal(getNextBidAmount(20, 95), 100);

    assert.equal(getIncrementForBid(100), 10);
    assert.equal(getIncrementForBid(490), 10);
    assert.equal(getNextBidAmount(100, 490), 500);

    assert.equal(getIncrementForBid(500), 25);
    assert.equal(getIncrementForBid(1200), 25);
    assert.equal(getNextBidAmount(200, 500), 525);
  });

  it('locks increment to +5L when vetoJumpActive is true', () => {
    assert.equal(getIncrementForBid(500, true), 5);
    assert.equal(getNextBidAmount(200, 500, true), 505);
  });
});

describe('validateBid rules', () => {
  it('allows a valid opening bid', () => {
    const res = validateBid({
      roomStatus: 'LIVE',
      hasActivePlayer: true,
      activePlayerIsOverseas: false,
      activePlayerBasePriceLakhs: 200,
      currentBidLakhs: null,
      highestBidderTeamId: null,
      memberRole: 'PLAYER',
      isKicked: false,
      team: makeTeam(),
    });
    assert.equal(res.allowed, true);
    assert.equal(res.nextBidLakhs, 200);
  });

  it('blocks a team from bidding against itself', () => {
    const res = validateBid({
      roomStatus: 'LIVE',
      hasActivePlayer: true,
      activePlayerIsOverseas: false,
      activePlayerBasePriceLakhs: 100,
      currentBidLakhs: 250,
      highestBidderTeamId: 'MI',
      memberRole: 'PLAYER',
      isKicked: false,
      team: makeTeam({ teamId: 'MI' }),
    });
    assert.equal(res.allowed, false);
    assert.match(res.reason ?? '', /highest bid/i);
  });

  it('blocks bid when squad reaches 11 players', () => {
    const res = validateBid({
      roomStatus: 'LIVE',
      hasActivePlayer: true,
      activePlayerIsOverseas: false,
      activePlayerBasePriceLakhs: 50,
      currentBidLakhs: null,
      highestBidderTeamId: null,
      memberRole: 'PLAYER',
      isKicked: false,
      team: makeTeam({ squadCount: MAX_SQUAD_SIZE }),
    });
    assert.equal(res.allowed, false);
    assert.match(res.reason ?? '', /squad full/i);
  });

  it('blocks overseas player when team already has 4 foreign players, but allows Indian player', () => {
    const blocked = validateBid({
      roomStatus: 'LIVE',
      hasActivePlayer: true,
      activePlayerIsOverseas: true,
      activePlayerBasePriceLakhs: 100,
      currentBidLakhs: null,
      highestBidderTeamId: null,
      memberRole: 'PLAYER',
      isKicked: false,
      team: makeTeam({ overseasCount: MAX_OVERSEAS, squadCount: 6 }),
    });
    assert.equal(blocked.allowed, false);
    assert.match(blocked.reason ?? '', /foreign limit/i);

    const allowedIndian = validateBid({
      roomStatus: 'LIVE',
      hasActivePlayer: true,
      activePlayerIsOverseas: false,
      activePlayerBasePriceLakhs: 100,
      currentBidLakhs: null,
      highestBidderTeamId: null,
      memberRole: 'PLAYER',
      isKicked: false,
      team: makeTeam({ overseasCount: MAX_OVERSEAS, squadCount: 6 }),
    });
    assert.equal(allowedIndian.allowed, true);
  });

  it('blocks bid when purse is insufficient', () => {
    const res = validateBid({
      roomStatus: 'LIVE',
      hasActivePlayer: true,
      activePlayerIsOverseas: false,
      activePlayerBasePriceLakhs: 200,
      currentBidLakhs: 500,
      highestBidderTeamId: 'CSK',
      memberRole: 'PLAYER',
      isKicked: false,
      team: makeTeam({ purseLakhs: 510 }), // needs 525
    });
    assert.equal(res.allowed, false);
    assert.match(res.reason ?? '', /insufficient purse/i);
  });

  it('rejects stale simultaneous/double-click bid with mismatched expectedAmountLakhs', () => {
    const res = validateBid({
      roomStatus: 'LIVE',
      hasActivePlayer: true,
      activePlayerIsOverseas: false,
      activePlayerBasePriceLakhs: 100,
      currentBidLakhs: 110,
      highestBidderTeamId: 'RCB',
      memberRole: 'HOST',
      isKicked: false,
      team: makeTeam({ teamId: 'CSK' }),
      expectedAmountLakhs: 110, // actual next is 120
    });
    assert.equal(res.allowed, false);
    assert.match(res.reason ?? '', /updated/i);
  });

  it('blocks spectators and paused auctions', () => {
    const spectatorRes = validateBid({
      roomStatus: 'LIVE',
      hasActivePlayer: true,
      activePlayerIsOverseas: false,
      activePlayerBasePriceLakhs: 100,
      currentBidLakhs: null,
      highestBidderTeamId: null,
      memberRole: 'SPECTATOR',
      isKicked: false,
      team: null,
    });
    assert.equal(spectatorRes.allowed, false);

    const pausedRes = validateBid({
      roomStatus: 'PAUSED',
      hasActivePlayer: true,
      activePlayerIsOverseas: false,
      activePlayerBasePriceLakhs: 100,
      currentBidLakhs: null,
      highestBidderTeamId: null,
      memberRole: 'PLAYER',
      isKicked: false,
      team: makeTeam(),
    });
    assert.equal(pausedRes.allowed, false);
  });
});

describe('120-player seed pool, sets & team evaluation', () => {
  it('loads exactly 120 unique players and distributes them into 20 sets of 6', () => {
    const players = JSON.parse(fs.readFileSync(playersPath, 'utf-8')) as Player[];
    assert.equal(players.length, 120);
    const ids = new Set(players.map((p) => p.id));
    assert.equal(ids.size, 120);

    const sets = buildShuffledSets(players);
    assert.equal(sets.length, 120);
    for (let s = 1; s <= 20; s++) {
      const inSet = sets.filter((x) => x.setNumber === s);
      assert.equal(inSet.length, 6);
    }
  });

  it('computes team ratings and ranks better-balanced squads higher', () => {
    const players = JSON.parse(fs.readFileSync(playersPath, 'utf-8')) as Player[];
    const pick = (role: Player['role'], count: number) =>
      players
        .filter((p) => p.role === role)
        .slice(0, count)
        .map((p) => ({ ...p, soldPriceLakhs: p.basePriceLakhs }));

    const balancedSquad = [
      ...pick('Batter', 4),
      ...pick('Wicketkeeper', 1),
      ...pick('All-rounder', 2),
      ...pick('Spinner', 2),
      ...pick('Bowler', 2),
    ];

    const evals = computeTeamEvaluations([
      { teamId: 'CSK', ownerName: 'Host', purseLakhs: 4000, squad: balancedSquad },
      { teamId: 'MI', ownerName: 'Friend', purseLakhs: 12000, squad: pick('Batter', 2) },
    ]);

    assert.equal(evals[0].teamId, 'CSK');
    assert.ok(evals[0].rating > evals[1].rating);
    assert.equal(evals[0].bestXI.length, 11);
  });
});
