import crypto from 'node:crypto';
import type { Server } from 'socket.io';
import { getDb, loadAllPlayers } from './db.js';
import {
  buildShuffledSets,
  computeTeamEvaluations,
  formatLakhs,
  INITIAL_PURSE_LAKHS,
  IPL_TEAMS,
  MAX_SQUAD_SIZE,
  validateBid,
  type BoughtPlayer,
  type MemberRole,
  type Player,
  type RoomStatus,
  type TeamEvaluation,
  type TeamStateSnapshot,
} from './auctionLogic.js';
import { hashPassword, signMemberToken, verifyPassword } from './auth.js';

export interface MemberView {
  id: string;
  displayName: string;
  teamId: string | null;
  role: MemberRole;
  isConnected: boolean;
  isVoiceActive: boolean;
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

export interface TeamView extends TeamStateSnapshot {
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  ownerMemberId: string | null;
  ownerName: string | null;
  isActiveInAuction: boolean;
  boughtPlayers: BoughtPlayer[];
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

interface RoomRuntime {
  code: string;
  currentBidLakhs: number | null;
  highestBidderTeamId: string | null;
  highestBidderName: string | null;
  vetoJumpActive: boolean;
  timerEndsAt: number | null;
  pausedRemainingMs: number | null;
  previousStatusBeforePause: RoomStatus | null;
  timeoutHandle: ReturnType<typeof setTimeout> | null;
  transitioning: boolean;
  commentary: string[];
  voiceActive: Set<string>;
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateRoomCode(): string {
  const db = getDb();
  for (let attempt = 0; attempt < 20; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += CODE_ALPHABET[crypto.randomInt(0, CODE_ALPHABET.length)];
    }
    const existing = db.prepare('SELECT code FROM rooms WHERE code = ?').get(code);
    if (!existing) return code;
  }
  throw new Error('Could not generate unique room code');
}

export class RoomManager {
  private io: Server | null = null;
  private runtimes = new Map<string, RoomRuntime>();
  private playersById = new Map<string, Player>();

  constructor() {
    for (const p of loadAllPlayers()) {
      this.playersById.set(p.id, p);
    }
  }

  attachIo(io: Server): void {
    this.io = io;
  }

  private getRuntime(roomCode: string): RoomRuntime {
    let rt = this.runtimes.get(roomCode);
    if (!rt) {
      rt = {
        code: roomCode,
        currentBidLakhs: null,
        highestBidderTeamId: null,
        highestBidderName: null,
        vetoJumpActive: false,
        timerEndsAt: null,
        pausedRemainingMs: null,
        previousStatusBeforePause: null,
        timeoutHandle: null,
        transitioning: false,
        commentary: ['Welcome to IPL Auction Arena! Waiting for franchises to take their seats.'],
        voiceActive: new Set<string>(),
      };
      this.runtimes.set(roomCode, rt);
    }
    return rt;
  }

  private pushCommentary(roomCode: string, text: string): void {
    const rt = this.getRuntime(roomCode);
    rt.commentary = [text, ...rt.commentary].slice(0, 25);
  }

  private clearTimer(rt: RoomRuntime): void {
    if (rt.timeoutHandle) {
      clearTimeout(rt.timeoutHandle);
      rt.timeoutHandle = null;
    }
  }

  async createRoom(input: {
    roomName: string;
    password: string;
    displayName: string;
  }): Promise<{ roomCode: string; token: string; memberId: string }> {
    const db = getDb();
    const roomCode = generateRoomCode();
    const memberId = crypto.randomUUID();
    const passwordHash = await hashPassword(input.password);
    const now = Date.now();
    const players = loadAllPlayers();
    const sets = buildShuffledSets(players);

    db.exec('BEGIN');
    try {
      db.prepare(
        `INSERT INTO rooms (code, name, password_hash, host_member_id, status, timer_seconds, current_order, created_at)
         VALUES (?, ?, ?, ?, 'LOBBY', 10, 0, ?)`,
      ).run(roomCode, input.roomName.trim(), passwordHash, memberId, now);

      db.prepare(
        `INSERT INTO members (id, room_code, display_name, team_id, role, is_connected, is_kicked, created_at)
         VALUES (?, ?, ?, NULL, 'HOST', 0, 0, ?)`,
      ).run(memberId, roomCode, input.displayName.trim(), now);

      const teamStmt = db.prepare(
        `INSERT INTO teams_state (room_code, team_id, purse_lakhs, squad_count, overseas_count, power_card_used)
         VALUES (?, ?, ?, 0, 0, 0)`,
      );
      for (const team of IPL_TEAMS) {
        teamStmt.run(roomCode, team.id, INITIAL_PURSE_LAKHS);
      }

      const rpStmt = db.prepare(
        `INSERT INTO room_players (room_code, player_id, global_order, set_number, set_name, order_in_set, status, is_accelerated)
         VALUES (?, ?, ?, ?, ?, ?, 'UPCOMING', 0)`,
      );
      sets.forEach((s, idx) => {
        rpStmt.run(roomCode, s.playerId, idx + 1, s.setNumber, s.setName, s.orderInSet);
      });

      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    const token = signMemberToken({
      memberId,
      roomCode,
      role: 'HOST',
      displayName: input.displayName.trim(),
    });

    this.pushCommentary(roomCode, `${input.displayName.trim()} opened auction room ${roomCode}.`);
    return { roomCode, token, memberId };
  }

  async joinRoom(input: {
    roomCode: string;
    password: string;
    displayName: string;
    spectator?: boolean;
  }): Promise<{ ok: true; token: string; memberId: string; role: MemberRole } | { ok: false; error: string; status: number }> {
    const db = getDb();
    const code = input.roomCode.trim().toUpperCase();
    const room = db.prepare('SELECT code, password_hash, status FROM rooms WHERE code = ?').get(code) as
      | { code: string; password_hash: string; status: RoomStatus }
      | undefined;

    if (!room) {
      return { ok: false, error: 'Room not found. Check the 6-character code.', status: 404 };
    }

    const valid = await verifyPassword(input.password, room.password_hash);
    if (!valid) {
      return { ok: false, error: 'Incorrect room password.', status: 401 };
    }

    const isSpectator = Boolean(input.spectator);
    const memberId = crypto.randomUUID();
    const role: MemberRole = isSpectator ? 'SPECTATOR' : 'PLAYER';
    const cleanName = input.displayName.trim();

    db.prepare(
      `INSERT INTO members (id, room_code, display_name, team_id, role, is_connected, is_kicked, created_at)
       VALUES (?, ?, ?, NULL, ?, 0, 0, ?)`,
    ).run(memberId, code, cleanName, role, Date.now());

    const token = signMemberToken({ memberId, roomCode: code, role, displayName: cleanName });
    this.pushCommentary(
      code,
      isSpectator
        ? `${cleanName} joined as a spectator.`
        : room.status === 'LOBBY'
          ? `${cleanName} entered the auction lobby.`
          : `${cleanName} joined the live auction room.`,
    );
    this.broadcastState(code);

    return { ok: true, token, memberId, role };
  }

  getMember(roomCode: string, memberId: string): {
    id: string;
    roomCode: string;
    displayName: string;
    teamId: string | null;
    role: MemberRole;
    isKicked: boolean;
  } | null {
    const db = getDb();
    const row = db
      .prepare('SELECT id, room_code, display_name, team_id, role, is_kicked FROM members WHERE id = ? AND room_code = ?')
      .get(memberId, roomCode) as
      | { id: string; room_code: string; display_name: string; team_id: string | null; role: MemberRole; is_kicked: number }
      | undefined;
    if (!row) return null;
    return {
      id: row.id,
      roomCode: row.room_code,
      displayName: row.display_name,
      teamId: row.team_id,
      role: row.role,
      isKicked: row.is_kicked === 1,
    };
  }

  setMemberConnected(roomCode: string, memberId: string, connected: boolean): void {
    const db = getDb();
    db.prepare('UPDATE members SET is_connected = ? WHERE id = ? AND room_code = ?').run(
      connected ? 1 : 0,
      memberId,
      roomCode,
    );
    if (!connected) {
      this.getRuntime(roomCode).voiceActive.delete(memberId);
    }
    this.broadcastState(roomCode);
  }

  setVoiceActive(roomCode: string, memberId: string, active: boolean): { ok: boolean; error?: string } {
    const member = this.getMember(roomCode, memberId);
    if (!member || member.isKicked) return { ok: false, error: 'Unauthorized' };
    const rt = this.getRuntime(roomCode);
    if (active) {
      rt.voiceActive.add(memberId);
    } else {
      rt.voiceActive.delete(memberId);
    }
    this.broadcastState(roomCode);
    return { ok: true };
  }

  isMemberOnline(roomCode: string, memberId: string): boolean {
    const db = getDb();
    const row = db
      .prepare('SELECT is_connected, is_kicked FROM members WHERE id = ? AND room_code = ?')
      .get(memberId, roomCode) as { is_connected: number; is_kicked: number } | undefined;
    return Boolean(row && row.is_connected === 1 && row.is_kicked === 0);
  }

  selectTeam(roomCode: string, memberId: string, teamId: string): { ok: boolean; error?: string } {
    const db = getDb();
    const room = db.prepare('SELECT status FROM rooms WHERE code = ?').get(roomCode) as { status: RoomStatus } | undefined;
    if (!room || room.status === 'ENDED') {
      return { ok: false, error: 'Auction has already ended' };
    }
    if (!IPL_TEAMS.some((t) => t.id === teamId)) {
      return { ok: false, error: 'Invalid IPL team' };
    }

    const member = this.getMember(roomCode, memberId);
    if (!member || member.isKicked || member.role === 'SPECTATOR') {
      return { ok: false, error: 'Spectators or removed members cannot pick a team' };
    }
    if (room.status !== 'LOBBY' && member.teamId !== null) {
      return { ok: false, error: 'Cannot switch teams after the auction has started' };
    }

    const taken = db
      .prepare('SELECT id, display_name FROM members WHERE room_code = ? AND team_id = ? AND is_kicked = 0 AND id != ?')
      .get(roomCode, teamId, memberId) as { id: string; display_name: string } | undefined;
    if (taken) {
      return { ok: false, error: `${teamId} is already claimed by ${taken.display_name}` };
    }

    db.prepare('UPDATE members SET team_id = ? WHERE id = ? AND room_code = ?').run(teamId, memberId, roomCode);
    this.pushCommentary(roomCode, `${member.displayName} claimed ${teamId}!`);
    this.broadcastState(roomCode);
    return { ok: true };
  }

  setTimerSeconds(roomCode: string, hostMemberId: string, seconds: number): { ok: boolean; error?: string } {
    const db = getDb();
    const room = db.prepare('SELECT host_member_id, status FROM rooms WHERE code = ?').get(roomCode) as
      | { host_member_id: string; status: RoomStatus }
      | undefined;
    if (!room) return { ok: false, error: 'Room not found' };
    if (room.host_member_id !== hostMemberId) return { ok: false, error: 'Only host can change timer settings' };
    if (room.status === 'ENDED') return { ok: false, error: 'Auction has already ended' };
    if (![5, 10, 15].includes(seconds)) return { ok: false, error: 'Timer must be 5, 10, or 15 seconds' };

    db.prepare('UPDATE rooms SET timer_seconds = ? WHERE code = ?').run(seconds, roomCode);

    const rt = this.getRuntime(roomCode);
    const newMaxMs = seconds * 1000;
    if ((room.status === 'LIVE' || room.status === 'ACCELERATED') && rt.timerEndsAt !== null && !rt.transitioning) {
      const remaining = rt.timerEndsAt - Date.now();
      if (remaining > newMaxMs) {
        this.startTimer(roomCode, newMaxMs);
      }
    } else if (room.status === 'PAUSED' && rt.pausedRemainingMs !== null && rt.pausedRemainingMs > newMaxMs) {
      rt.pausedRemainingMs = newMaxMs;
    }

    this.pushCommentary(roomCode, `Host changed the bid timer to ${seconds}s.`);
    this.broadcastState(roomCode);
    return { ok: true };
  }

  kickMember(roomCode: string, hostMemberId: string, targetMemberId: string): { ok: boolean; error?: string } {
    const db = getDb();
    const room = db.prepare('SELECT host_member_id FROM rooms WHERE code = ?').get(roomCode) as
      | { host_member_id: string }
      | undefined;
    if (!room) return { ok: false, error: 'Room not found' };
    if (room.host_member_id !== hostMemberId) return { ok: false, error: 'Only the host can kick members' };
    if (targetMemberId === hostMemberId) return { ok: false, error: 'Host cannot kick themselves' };

    const target = this.getMember(roomCode, targetMemberId);
    if (!target) return { ok: false, error: 'Member not found' };

    db.prepare('UPDATE members SET is_kicked = 1, team_id = NULL, is_connected = 0 WHERE id = ? AND room_code = ?').run(
      targetMemberId,
      roomCode,
    );
    this.getRuntime(roomCode).voiceActive.delete(targetMemberId);

    if (this.io) {
      this.io.to(`member:${targetMemberId}`).emit('member:kicked', {
        reason: 'You were removed from the room by the host.',
      });
    }
    this.pushCommentary(roomCode, `${target.displayName} was removed from the room by the host.`);
    this.broadcastState(roomCode);
    return { ok: true };
  }

  startAuction(roomCode: string, hostMemberId: string): { ok: boolean; error?: string } {
    const db = getDb();
    const room = db.prepare('SELECT host_member_id, status, timer_seconds FROM rooms WHERE code = ?').get(roomCode) as
      | { host_member_id: string; status: RoomStatus; timer_seconds: number }
      | undefined;
    if (!room) return { ok: false, error: 'Room not found' };
    if (room.host_member_id !== hostMemberId) return { ok: false, error: 'Only the host can start the auction' };
    if (room.status !== 'LOBBY') return { ok: false, error: 'Auction already started' };

    const activePlayers = db
      .prepare("SELECT id, team_id FROM members WHERE room_code = ? AND is_kicked = 0 AND role != 'SPECTATOR' AND team_id IS NOT NULL")
      .all(roomCode) as Array<{ id: string; team_id: string }>;

    if (activePlayers.length < 2) {
      return { ok: false, error: 'At least 2 members must pick a team before starting' };
    }

    db.prepare("UPDATE rooms SET status = 'LIVE' WHERE code = ?").run(roomCode);
    this.pushCommentary(roomCode, `Auction is LIVE! ${activePlayers.length} franchises are competing for 120 stars.`);
    this.activateNextPlayer(roomCode);
    return { ok: true };
  }

  private activateNextPlayer(roomCode: string): void {
    const db = getDb();
    const rt = this.getRuntime(roomCode);
    this.clearTimer(rt);
    rt.transitioning = false;
    rt.currentBidLakhs = null;
    rt.highestBidderTeamId = null;
    rt.highestBidderName = null;
    rt.vetoJumpActive = false;

    const room = db.prepare('SELECT status, timer_seconds FROM rooms WHERE code = ?').get(roomCode) as
      | { status: RoomStatus; timer_seconds: number }
      | undefined;
    if (!room) return;

    // Check if any participating team still has room & purse
    const activeTeams = this.getActiveTeamsSnapshot(roomCode);
    const anyTeamCanBuy = activeTeams.some((t) => t.squadCount < MAX_SQUAD_SIZE && t.purseLakhs >= 20);
    if (!anyTeamCanBuy) {
      this.finishAuction(roomCode, 'All participating franchises have completed their squads or exhausted purse.');
      return;
    }

    // Find next UPCOMING player
    let nextRow = db
      .prepare(
        `SELECT player_id, set_number, set_name, order_in_set
         FROM room_players
         WHERE room_code = ? AND status = 'UPCOMING'
         ORDER BY is_accelerated ASC, global_order ASC
         LIMIT 1`,
      )
      .get(roomCode) as
      | { player_id: string; set_number: number; set_name: string; order_in_set: number }
      | undefined;

    if (!nextRow && room.status === 'LIVE') {
      // Check UNSOLD players for Accelerated Round
      const unsoldRows = db
        .prepare(
          `SELECT player_id FROM room_players
           WHERE room_code = ? AND status = 'UNSOLD'
           ORDER BY global_order ASC`,
        )
        .all(roomCode) as Array<{ player_id: string }>;

      if (unsoldRows.length > 0) {
        db.prepare("UPDATE rooms SET status = 'ACCELERATED' WHERE code = ?").run(roomCode);
        db.prepare(
          `UPDATE room_players
           SET status = 'UPCOMING', is_accelerated = 1
           WHERE room_code = ? AND status = 'UNSOLD'`,
        ).run(roomCode);

        this.pushCommentary(
          roomCode,
          `ACCELERATED ROUND BEGINS! ${unsoldRows.length} unsold players return for one final chance.`,
        );

        nextRow = db
          .prepare(
            `SELECT player_id, set_number, set_name, order_in_set
             FROM room_players
             WHERE room_code = ? AND status = 'UPCOMING'
             ORDER BY global_order ASC
             LIMIT 1`,
          )
          .get(roomCode) as
          | { player_id: string; set_number: number; set_name: string; order_in_set: number }
          | undefined;
      }
    }

    if (!nextRow) {
      this.finishAuction(roomCode, 'All auction sets and accelerated rounds are complete!');
      return;
    }

    db.prepare("UPDATE room_players SET status = 'ACTIVE' WHERE room_code = ? AND player_id = ?").run(
      roomCode,
      nextRow.player_id,
    );

    const player = this.playersById.get(nextRow.player_id);
    if (player) {
      this.pushCommentary(
        roomCode,
        `On the block: ${player.name} (${player.role}, ${player.nationality}) — Base ${formatLakhs(player.basePriceLakhs)}.`,
      );
      this.emitWatchlistAlerts(roomCode, player);
    }

    this.startTimer(roomCode, room.timer_seconds * 1000);
    this.broadcastState(roomCode);
  }

  private emitWatchlistAlerts(roomCode: string, activePlayer: Player): void {
    if (!this.io) return;
    const db = getDb();
    const watchers = db
      .prepare('SELECT member_id FROM watchlist WHERE room_code = ? AND player_id = ?')
      .all(roomCode, activePlayer.id) as Array<{ member_id: string }>;
    for (const w of watchers) {
      this.io.to(`member:${w.member_id}`).emit('watchlist:alert', {
        playerId: activePlayer.id,
        playerName: activePlayer.name,
        basePriceLakhs: activePlayer.basePriceLakhs,
        role: activePlayer.role,
      });
    }
  }

  private startTimer(roomCode: string, durationMs: number): void {
    const rt = this.getRuntime(roomCode);
    this.clearTimer(rt);
    rt.pausedRemainingMs = null;
    rt.timerEndsAt = Date.now() + durationMs;
    rt.timeoutHandle = setTimeout(() => {
      this.resolveCurrentPlayer(roomCode, false);
    }, durationMs);
  }

  private resolveCurrentPlayer(roomCode: string, skippedByHost: boolean): void {
    const db = getDb();
    const rt = this.getRuntime(roomCode);
    if (rt.transitioning) return;
    rt.transitioning = true;
    this.clearTimer(rt);
    rt.timerEndsAt = null;
    rt.pausedRemainingMs = null;

    const activeRp = db
      .prepare("SELECT player_id, is_accelerated FROM room_players WHERE room_code = ? AND status = 'ACTIVE' LIMIT 1")
      .get(roomCode) as { player_id: string; is_accelerated: number } | undefined;

    if (!activeRp) {
      rt.transitioning = false;
      return;
    }

    const player = this.playersById.get(activeRp.player_id);
    if (!player) {
      rt.transitioning = false;
      return;
    }

    if (!skippedByHost && rt.highestBidderTeamId && rt.currentBidLakhs !== null) {
      // SOLD!
      const winningTeamId = rt.highestBidderTeamId;
      const finalPrice = rt.currentBidLakhs;

      db.exec('BEGIN');
      try {
        db.prepare(
          `UPDATE room_players SET status = 'SOLD', sold_price_lakhs = ?, sold_to_team_id = ?
           WHERE room_code = ? AND player_id = ?`,
        ).run(finalPrice, winningTeamId, roomCode, player.id);

        db.prepare(
          `UPDATE teams_state
           SET purse_lakhs = purse_lakhs - ?,
               squad_count = squad_count + 1,
               overseas_count = overseas_count + ?
           WHERE room_code = ? AND team_id = ?`,
        ).run(finalPrice, player.isOverseas ? 1 : 0, roomCode, winningTeamId);

        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        rt.transitioning = false;
        throw err;
      }

      const teamMeta = IPL_TEAMS.find((t) => t.id === winningTeamId);
      this.pushCommentary(
        roomCode,
        `SOLD! ${player.name} goes to ${teamMeta?.name ?? winningTeamId} for ${formatLakhs(finalPrice)}!`,
      );

      this.io?.to(`room:${roomCode}`).emit('auction:resolution', {
        outcome: 'SOLD',
        player,
        teamId: winningTeamId,
        teamName: teamMeta?.name ?? winningTeamId,
        priceLakhs: finalPrice,
      });
    } else {
      // UNSOLD! If this was already accelerated round, mark as FINAL_UNSOLD by leaving status UNSOLD & is_accelerated=1
      db.prepare("UPDATE room_players SET status = 'UNSOLD' WHERE room_code = ? AND player_id = ?").run(
        roomCode,
        player.id,
      );
      this.pushCommentary(
        roomCode,
        skippedByHost ? `${player.name} was skipped by the host (UNSOLD).` : `UNSOLD! No takers for ${player.name}.`,
      );
      this.io?.to(`room:${roomCode}`).emit('auction:resolution', {
        outcome: 'UNSOLD',
        player,
        teamId: null,
        teamName: null,
        priceLakhs: null,
      });
    }

    this.broadcastState(roomCode);

    // Wait briefly so users see the gavel / SOLD / UNSOLD celebration before next player
    const delayMs = skippedByHost ? 1200 : 2800;
    rt.timeoutHandle = setTimeout(() => {
      const room = db.prepare('SELECT status FROM rooms WHERE code = ?').get(roomCode) as
        | { status: RoomStatus }
        | undefined;
      if (!room || room.status === 'ENDED') return;
      if (room.status === 'PAUSED') {
        rt.transitioning = false;
        return;
      }
      this.activateNextPlayer(roomCode);
    }, delayMs);
  }

  placeBid(
    roomCode: string,
    memberId: string,
    expectedAmountLakhs?: number,
  ): { ok: boolean; error?: string; amountLakhs?: number } {
    const db = getDb();
    const rt = this.getRuntime(roomCode);
    if (rt.transitioning) {
      return { ok: false, error: 'Hammer has already fallen for this player' };
    }

    const room = db.prepare('SELECT status, timer_seconds FROM rooms WHERE code = ?').get(roomCode) as
      | { status: RoomStatus; timer_seconds: number }
      | undefined;
    if (!room) return { ok: false, error: 'Room not found' };

    const member = this.getMember(roomCode, memberId);
    if (!member) return { ok: false, error: 'Member not found' };

    const activeRp = db
      .prepare("SELECT player_id FROM room_players WHERE room_code = ? AND status = 'ACTIVE' LIMIT 1")
      .get(roomCode) as { player_id: string } | undefined;

    const player = activeRp ? this.playersById.get(activeRp.player_id) : undefined;
    const teamRow = member.teamId
      ? (db
          .prepare(
            'SELECT team_id, purse_lakhs, squad_count, overseas_count, power_card_used FROM teams_state WHERE room_code = ? AND team_id = ?',
          )
          .get(roomCode, member.teamId) as
          | {
              team_id: string;
              purse_lakhs: number;
              squad_count: number;
              overseas_count: number;
              power_card_used: number;
            }
          | undefined)
      : undefined;

    const teamSnapshot: TeamStateSnapshot | null = teamRow
      ? {
          teamId: teamRow.team_id,
          purseLakhs: teamRow.purse_lakhs,
          squadCount: teamRow.squad_count,
          overseasCount: teamRow.overseas_count,
          powerCardUsed: teamRow.power_card_used === 1,
        }
      : null;

    const validation = validateBid({
      roomStatus: room.status,
      hasActivePlayer: Boolean(player),
      activePlayerIsOverseas: Boolean(player?.isOverseas),
      activePlayerBasePriceLakhs: player?.basePriceLakhs ?? 0,
      currentBidLakhs: rt.currentBidLakhs,
      highestBidderTeamId: rt.highestBidderTeamId,
      vetoJumpActive: rt.vetoJumpActive,
      memberRole: member.role,
      isKicked: member.isKicked,
      team: teamSnapshot,
      expectedAmountLakhs,
    });

    if (!validation.allowed || !player || !teamSnapshot) {
      return { ok: false, error: validation.reason ?? 'Bid rejected' };
    }

    const newAmount = validation.nextBidLakhs;
    const now = Date.now();
    const insertInfo = db
      .prepare(
        `INSERT INTO bids (room_code, player_id, team_id, member_id, amount_lakhs, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(roomCode, player.id, teamSnapshot.teamId, member.id, newAmount, now);

    rt.currentBidLakhs = newAmount;
    rt.highestBidderTeamId = teamSnapshot.teamId;
    rt.highestBidderName = member.displayName;
    rt.vetoJumpActive = false; // consume veto jump once the next bid completes

    const teamMeta = IPL_TEAMS.find((t) => t.id === teamSnapshot.teamId);
    this.pushCommentary(
      roomCode,
      `${teamMeta?.name ?? teamSnapshot.teamId} raise the paddle for ${player.name} at ${formatLakhs(newAmount)}!`,
    );

    this.startTimer(roomCode, room.timer_seconds * 1000);
    this.io?.to(`room:${roomCode}`).emit('auction:bidUpdate', {
      currentBidLakhs: rt.currentBidLakhs,
      highestBidderTeamId: rt.highestBidderTeamId,
      highestBidderName: rt.highestBidderName,
      vetoJumpActive: rt.vetoJumpActive,
      timerEndsAt: rt.timerEndsAt,
      latestBid: {
        id: Number(insertInfo.lastInsertRowid),
        playerId: player.id,
        playerName: player.name,
        teamId: teamSnapshot.teamId,
        memberName: member.displayName,
        amountLakhs: newAmount,
        createdAt: now,
      },
      commentary: rt.commentary,
      serverNow: Date.now(),
    });
    return { ok: true, amountLakhs: newAmount };
  }

  usePowerCard(
    roomCode: string,
    memberId: string,
    cardType: 'RESET_TIMER' | 'VETO_JUMP',
  ): { ok: boolean; error?: string } {
    const db = getDb();
    const rt = this.getRuntime(roomCode);
    const room = db.prepare('SELECT status, timer_seconds FROM rooms WHERE code = ?').get(roomCode) as
      | { status: RoomStatus; timer_seconds: number }
      | undefined;
    if (!room || (room.status !== 'LIVE' && room.status !== 'ACCELERATED')) {
      return { ok: false, error: 'Power Card can only be used during live bidding' };
    }
    if (rt.transitioning) return { ok: false, error: 'Round is resolving' };

    const member = this.getMember(roomCode, memberId);
    if (!member || !member.teamId || member.isKicked || member.role === 'SPECTATOR') {
      return { ok: false, error: 'Only active team owners can play a Power Card' };
    }

    const teamRow = db
      .prepare('SELECT power_card_used FROM teams_state WHERE room_code = ? AND team_id = ?')
      .get(roomCode, member.teamId) as { power_card_used: number } | undefined;
    if (!teamRow || teamRow.power_card_used === 1) {
      return { ok: false, error: 'Your team has already used its Power Card' };
    }

    if (cardType === 'VETO_JUMP' && rt.currentBidLakhs === null) {
      return { ok: false, error: 'Wait for an opening bid before vetoing the increment jump' };
    }

    db.prepare('UPDATE teams_state SET power_card_used = 1 WHERE room_code = ? AND team_id = ?').run(
      roomCode,
      member.teamId,
    );

    const teamMeta = IPL_TEAMS.find((t) => t.id === member.teamId);
    if (cardType === 'RESET_TIMER') {
      this.startTimer(roomCode, room.timer_seconds * 1000);
      this.pushCommentary(
        roomCode,
        `POWER CARD! ${teamMeta?.name ?? member.teamId} reset the auction clock to ${room.timer_seconds}s!`,
      );
    } else {
      rt.vetoJumpActive = true;
      this.pushCommentary(
        roomCode,
        `POWER CARD! ${teamMeta?.name ?? member.teamId} played Veto Jump — next bid increment locked to +₹5 L!`,
      );
    }

    this.io?.to(`room:${roomCode}`).emit('auction:powerCard', {
      teamId: member.teamId,
      teamName: teamMeta?.name ?? member.teamId,
      cardType,
    });
    this.broadcastState(roomCode);
    return { ok: true };
  }

  pauseAuction(roomCode: string, hostMemberId: string): { ok: boolean; error?: string } {
    const db = getDb();
    const rt = this.getRuntime(roomCode);
    const room = db.prepare('SELECT host_member_id, status FROM rooms WHERE code = ?').get(roomCode) as
      | { host_member_id: string; status: RoomStatus }
      | undefined;
    if (!room) return { ok: false, error: 'Room not found' };
    if (room.host_member_id !== hostMemberId) return { ok: false, error: 'Only host can pause' };
    if (room.status !== 'LIVE' && room.status !== 'ACCELERATED') {
      return { ok: false, error: 'Auction is not currently running' };
    }

    rt.previousStatusBeforePause = room.status;
    rt.pausedRemainingMs = rt.timerEndsAt ? Math.max(1000, rt.timerEndsAt - Date.now()) : null;
    rt.timerEndsAt = null;
    this.clearTimer(rt);

    db.prepare("UPDATE rooms SET status = 'PAUSED' WHERE code = ?").run(roomCode);
    this.pushCommentary(roomCode, 'Auction PAUSED by the host.');
    this.broadcastState(roomCode);
    return { ok: true };
  }

  resumeAuction(roomCode: string, hostMemberId: string): { ok: boolean; error?: string } {
    const db = getDb();
    const rt = this.getRuntime(roomCode);
    const room = db.prepare('SELECT host_member_id, status, timer_seconds FROM rooms WHERE code = ?').get(roomCode) as
      | { host_member_id: string; status: RoomStatus; timer_seconds: number }
      | undefined;
    if (!room) return { ok: false, error: 'Room not found' };
    if (room.host_member_id !== hostMemberId) return { ok: false, error: 'Only host can resume' };
    if (room.status !== 'PAUSED') return { ok: false, error: 'Auction is not paused' };

    const restoredStatus = rt.previousStatusBeforePause ?? 'LIVE';
    db.prepare('UPDATE rooms SET status = ? WHERE code = ?').run(restoredStatus, roomCode);
    this.pushCommentary(roomCode, 'Auction RESUMED!');

    const activeRp = db
      .prepare("SELECT player_id FROM room_players WHERE room_code = ? AND status = 'ACTIVE' LIMIT 1")
      .get(roomCode);
    if (activeRp) {
      const ms = rt.pausedRemainingMs ?? room.timer_seconds * 1000;
      this.startTimer(roomCode, ms);
      this.broadcastState(roomCode);
    } else {
      this.activateNextPlayer(roomCode);
    }
    return { ok: true };
  }

  skipCurrentPlayer(roomCode: string, hostMemberId: string): { ok: boolean; error?: string } {
    const db = getDb();
    const room = db.prepare('SELECT host_member_id, status FROM rooms WHERE code = ?').get(roomCode) as
      | { host_member_id: string; status: RoomStatus }
      | undefined;
    if (!room) return { ok: false, error: 'Room not found' };
    if (room.host_member_id !== hostMemberId) return { ok: false, error: 'Only host can skip players' };
    if (room.status !== 'LIVE' && room.status !== 'ACCELERATED') {
      return { ok: false, error: 'Resume the auction before skipping' };
    }
    this.resolveCurrentPlayer(roomCode, true);
    return { ok: true };
  }

  endAuction(roomCode: string, hostMemberId: string): { ok: boolean; error?: string } {
    const db = getDb();
    const room = db.prepare('SELECT host_member_id FROM rooms WHERE code = ?').get(roomCode) as
      | { host_member_id: string }
      | undefined;
    if (!room) return { ok: false, error: 'Room not found' };
    if (room.host_member_id !== hostMemberId) return { ok: false, error: 'Only host can end the auction' };

    this.finishAuction(roomCode, 'Host concluded the auction and finalized all squads!');
    return { ok: true };
  }

  private finishAuction(roomCode: string, reason: string): void {
    const db = getDb();
    const rt = this.getRuntime(roomCode);
    this.clearTimer(rt);
    rt.timerEndsAt = null;
    rt.pausedRemainingMs = null;
    rt.transitioning = false;

    db.prepare("UPDATE room_players SET status = 'UNSOLD' WHERE room_code = ? AND status = 'ACTIVE'").run(roomCode);
    db.prepare("UPDATE rooms SET status = 'ENDED' WHERE code = ?").run(roomCode);
    this.pushCommentary(roomCode, reason);
    this.broadcastState(roomCode);
  }

  toggleWatchlist(roomCode: string, memberId: string, playerId: string): string[] {
    const db = getDb();
    const existing = db
      .prepare('SELECT 1 FROM watchlist WHERE room_code = ? AND member_id = ? AND player_id = ?')
      .get(roomCode, memberId, playerId);

    if (existing) {
      db.prepare('DELETE FROM watchlist WHERE room_code = ? AND member_id = ? AND player_id = ?').run(
        roomCode,
        memberId,
        playerId,
      );
    } else {
      db.prepare('INSERT INTO watchlist (room_code, member_id, player_id) VALUES (?, ?, ?)').run(
        roomCode,
        memberId,
        playerId,
      );
    }
    return this.getWatchlist(roomCode, memberId);
  }

  getWatchlist(roomCode: string, memberId: string): string[] {
    const db = getDb();
    const rows = db
      .prepare('SELECT player_id FROM watchlist WHERE room_code = ? AND member_id = ?')
      .all(roomCode, memberId) as Array<{ player_id: string }>;
    return rows.map((r) => r.player_id);
  }

  addChatMessage(roomCode: string, memberId: string, rawMessage: string): { ok: boolean; error?: string } {
    const message = rawMessage.trim().slice(0, 240);
    if (!message) return { ok: false, error: 'Empty message' };

    const member = this.getMember(roomCode, memberId);
    if (!member || member.isKicked) return { ok: false, error: 'Unauthorized' };

    const db = getDb();
    const now = Date.now();
    const info = db
      .prepare(
        `INSERT INTO chat_messages (room_code, member_id, display_name, team_id, message, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(roomCode, member.id, member.displayName, member.teamId, message, now);

    this.io?.to(`room:${roomCode}`).emit('chat:message', {
      id: Number(info.lastInsertRowid),
      memberId: member.id,
      displayName: member.displayName,
      teamId: member.teamId,
      message,
      createdAt: now,
    } satisfies ChatMessageView);
    return { ok: true };
  }

  sendReaction(roomCode: string, memberId: string, emoji: string): void {
    const allowed = ['🔥', '💰', '😱', '🏏', '👏', '🔨'];
    if (!allowed.includes(emoji)) return;
    const member = this.getMember(roomCode, memberId);
    if (!member || member.isKicked) return;

    this.io?.to(`room:${roomCode}`).emit('auction:reaction', {
      id: crypto.randomUUID(),
      emoji,
      senderName: member.displayName,
      teamId: member.teamId,
    });
  }

  private getActiveTeamsSnapshot(roomCode: string): TeamStateSnapshot[] {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT ts.team_id, ts.purse_lakhs, ts.squad_count, ts.overseas_count, ts.power_card_used
         FROM teams_state ts
         INNER JOIN members m ON m.room_code = ts.room_code AND m.team_id = ts.team_id
         WHERE ts.room_code = ? AND m.is_kicked = 0 AND m.role != 'SPECTATOR'`,
      )
      .all(roomCode) as Array<{
      team_id: string;
      purse_lakhs: number;
      squad_count: number;
      overseas_count: number;
      power_card_used: number;
    }>;
    return rows.map((r) => ({
      teamId: r.team_id,
      purseLakhs: r.purse_lakhs,
      squadCount: r.squad_count,
      overseasCount: r.overseas_count,
      powerCardUsed: r.power_card_used === 1,
    }));
  }

  getRoomState(roomCode: string): RoomStatePayload | null {
    const db = getDb();
    const room = db
      .prepare('SELECT code, name, host_member_id, status, timer_seconds FROM rooms WHERE code = ?')
      .get(roomCode) as
      | {
          code: string;
          name: string;
          host_member_id: string;
          status: RoomStatus;
          timer_seconds: number;
        }
      | undefined;
    if (!room) return null;

    const rt = this.getRuntime(roomCode);

    const memberRows = db
      .prepare(
        `SELECT id, display_name, team_id, role, is_connected
         FROM members WHERE room_code = ? AND is_kicked = 0
         ORDER BY created_at ASC`,
      )
      .all(roomCode) as Array<{
      id: string;
      display_name: string;
      team_id: string | null;
      role: MemberRole;
      is_connected: number;
    }>;

    const members: MemberView[] = memberRows.map((m) => ({
      id: m.id,
      displayName: m.display_name,
      teamId: m.team_id,
      role: m.role,
      isConnected: m.is_connected === 1,
      isVoiceActive: m.is_connected === 1 && rt.voiceActive.has(m.id),
    }));

    const rpRows = db
      .prepare(
        `SELECT player_id, global_order, set_number, set_name, order_in_set, status, sold_price_lakhs, sold_to_team_id, is_accelerated
         FROM room_players WHERE room_code = ?
         ORDER BY is_accelerated ASC, global_order ASC`,
      )
      .all(roomCode) as Array<{
      player_id: string;
      global_order: number;
      set_number: number;
      set_name: string;
      order_in_set: number;
      status: RoomPlayerView['status'];
      sold_price_lakhs: number | null;
      sold_to_team_id: string | null;
      is_accelerated: number;
    }>;

    const allRoomPlayers: RoomPlayerView[] = rpRows
      .map((r) => {
        const player = this.playersById.get(r.player_id);
        if (!player) return null;
        return {
          player,
          globalOrder: r.global_order,
          setNumber: r.set_number,
          setName: r.set_name,
          orderInSet: r.order_in_set,
          status: r.status,
          soldPriceLakhs: r.sold_price_lakhs,
          soldToTeamId: r.sold_to_team_id,
          isAccelerated: r.is_accelerated === 1,
        };
      })
      .filter((x): x is RoomPlayerView => x !== null);

    const boughtByTeam = new Map<string, BoughtPlayer[]>();
    for (const rp of allRoomPlayers) {
      if (rp.status === 'SOLD' && rp.soldToTeamId && rp.soldPriceLakhs !== null) {
        const arr = boughtByTeam.get(rp.soldToTeamId) ?? [];
        arr.push({ ...rp.player, soldPriceLakhs: rp.soldPriceLakhs });
        boughtByTeam.set(rp.soldToTeamId, arr);
      }
    }

    const teamRows = db
      .prepare('SELECT team_id, purse_lakhs, squad_count, overseas_count, power_card_used FROM teams_state WHERE room_code = ?')
      .all(roomCode) as Array<{
      team_id: string;
      purse_lakhs: number;
      squad_count: number;
      overseas_count: number;
      power_card_used: number;
    }>;
    const teamMap = new Map(teamRows.map((t) => [t.team_id, t]));

    const teams: TeamView[] = IPL_TEAMS.map((meta) => {
      const ts = teamMap.get(meta.id);
      const owner = members.find((m) => m.teamId === meta.id && m.role !== 'SPECTATOR');
      return {
        teamId: meta.id,
        name: meta.name,
        shortName: meta.shortName,
        primaryColor: meta.primaryColor,
        secondaryColor: meta.secondaryColor,
        purseLakhs: ts?.purse_lakhs ?? INITIAL_PURSE_LAKHS,
        squadCount: ts?.squad_count ?? 0,
        overseasCount: ts?.overseas_count ?? 0,
        powerCardUsed: ts?.power_card_used === 1,
        ownerMemberId: owner?.id ?? null,
        ownerName: owner?.displayName ?? null,
        isActiveInAuction: Boolean(owner),
        boughtPlayers: boughtByTeam.get(meta.id) ?? [],
      };
    });

    const currentPlayer = allRoomPlayers.find((rp) => rp.status === 'ACTIVE') ?? null;
    const totalSets = Math.max(...allRoomPlayers.map((rp) => rp.setNumber), 20);
    const completedCount = allRoomPlayers.filter((rp) => rp.status === 'SOLD' || rp.status === 'UNSOLD').length;
    const activeSetNumber = currentPlayer?.setNumber ?? 1;
    const playersInCurrentSet = allRoomPlayers.filter((rp) => rp.setNumber === activeSetNumber).length || 6;

    const recentBidRows = db
      .prepare(
        `SELECT b.id, b.player_id, b.team_id, b.amount_lakhs, b.created_at, m.display_name
         FROM bids b
         LEFT JOIN members m ON m.id = b.member_id
         WHERE b.room_code = ?
         ORDER BY b.id DESC LIMIT 30`,
      )
      .all(roomCode) as Array<{
      id: number;
      player_id: string;
      team_id: string;
      amount_lakhs: number;
      created_at: number;
      display_name: string | null;
    }>;

    const recentBids: BidRecordView[] = recentBidRows.map((b) => ({
      id: b.id,
      playerId: b.player_id,
      playerName: this.playersById.get(b.player_id)?.name ?? b.player_id,
      teamId: b.team_id,
      memberName: b.display_name ?? 'Owner',
      amountLakhs: b.amount_lakhs,
      createdAt: b.created_at,
    }));

    const chatRows = db
      .prepare(
        `SELECT id, member_id, display_name, team_id, message, created_at
         FROM chat_messages WHERE room_code = ?
         ORDER BY id DESC LIMIT 60`,
      )
      .all(roomCode) as Array<{
      id: number;
      member_id: string;
      display_name: string;
      team_id: string | null;
      message: string;
      created_at: number;
    }>;

    const chatMessages: ChatMessageView[] = chatRows.reverse().map((c) => ({
      id: c.id,
      memberId: c.member_id,
      displayName: c.display_name,
      teamId: c.team_id,
      message: c.message,
      createdAt: c.created_at,
    }));

    const evaluations =
      room.status === 'ENDED'
        ? computeTeamEvaluations(
            teams
              .filter((t) => t.isActiveInAuction)
              .map((t) => ({
                teamId: t.teamId,
                ownerName: t.ownerName ?? 'Owner',
                purseLakhs: t.purseLakhs,
                squad: t.boughtPlayers,
              })),
          )
        : null;

    return {
      code: room.code,
      name: room.name,
      status: room.status,
      timerSeconds: room.timer_seconds,
      hostMemberId: room.host_member_id,
      members,
      teams,
      currentPlayer,
      progress: {
        setNumber: currentPlayer?.setNumber ?? (room.status === 'ENDED' ? totalSets : 1),
        totalSets,
        setName: currentPlayer?.isAccelerated
          ? 'Accelerated Round'
          : currentPlayer?.setName ?? 'Ready to Begin',
        orderInSet: currentPlayer?.orderInSet ?? 0,
        playersInSet: playersInCurrentSet,
        completedCount,
        totalPlayers: allRoomPlayers.length,
      },
      currentBidLakhs: rt.currentBidLakhs,
      highestBidderTeamId: rt.highestBidderTeamId,
      highestBidderName: rt.highestBidderName,
      vetoJumpActive: rt.vetoJumpActive,
      timerEndsAt: rt.timerEndsAt,
      pausedRemainingMs: rt.pausedRemainingMs,
      recentBids,
      commentary: rt.commentary,
      chatMessages,
      allRoomPlayers,
      evaluations,
      serverNow: Date.now(),
    };
  }

  broadcastState(roomCode: string): void {
    if (!this.io) return;
    const state = this.getRoomState(roomCode);
    if (state) {
      this.io.to(`room:${roomCode}`).emit('room:state', state);
    }
  }
}

export const roomManager = new RoomManager();
