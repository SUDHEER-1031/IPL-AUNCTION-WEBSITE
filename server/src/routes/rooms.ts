import { Router } from 'express';
import {
  checkPasswordRateLimit,
  clearPasswordAttempts,
  recordFailedPasswordAttempt,
  verifyMemberToken,
} from '../auth.js';
import { roomManager } from '../roomManager.js';

export const roomsRouter = Router();

roomsRouter.post('/', async (req, res) => {
  try {
    const { roomName, password, displayName } = req.body ?? {};
    if (typeof roomName !== 'string' || roomName.trim().length < 2) {
      res.status(400).json({ error: 'Room name must be at least 2 characters.' });
      return;
    }
    if (typeof password !== 'string' || password.length < 4) {
      res.status(400).json({ error: 'Room password must be at least 4 characters.' });
      return;
    }
    if (typeof displayName !== 'string' || displayName.trim().length < 2) {
      res.status(400).json({ error: 'Display name must be at least 2 characters.' });
      return;
    }

    const result = await roomManager.createRoom({
      roomName: roomName.trim().slice(0, 48),
      password,
      displayName: displayName.trim().slice(0, 28),
    });

    const state = roomManager.getRoomState(result.roomCode);
    res.status(201).json({
      roomCode: result.roomCode,
      token: result.token,
      memberId: result.memberId,
      role: 'HOST',
      state,
    });
  } catch (err) {
    console.error('[POST /api/rooms]', err);
    res.status(500).json({ error: 'Failed to create room.' });
  }
});

roomsRouter.post('/join', async (req, res) => {
  try {
    const { roomCode, password, displayName, spectator } = req.body ?? {};
    if (typeof roomCode !== 'string' || roomCode.trim().length !== 6) {
      res.status(400).json({ error: 'Enter a valid 6-character room code.' });
      return;
    }
    if (typeof password !== 'string' || password.length === 0) {
      res.status(400).json({ error: 'Room password is required.' });
      return;
    }
    if (typeof displayName !== 'string' || displayName.trim().length < 2) {
      res.status(400).json({ error: 'Display name must be at least 2 characters.' });
      return;
    }

    const code = roomCode.trim().toUpperCase();
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const rateKey = `${ip}:${code}`;
    const limit = checkPasswordRateLimit(rateKey);
    if (!limit.allowed) {
      res.status(429).json({
        error: `Too many wrong password attempts. Try again in ${limit.retryAfterSec}s.`,
      });
      return;
    }

    const result = await roomManager.joinRoom({
      roomCode: code,
      password,
      displayName: displayName.trim().slice(0, 28),
      spectator: Boolean(spectator),
    });

    if (!result.ok) {
      if (result.status === 401) {
        const failInfo = recordFailedPasswordAttempt(rateKey);
        const suffix =
          failInfo.remainingAttempts > 0
            ? ` (${failInfo.remainingAttempts} attempts remaining)`
            : ' (Temporarily locked for 5 minutes due to too many failed attempts)';
        res.status(401).json({ error: `${result.error}${suffix}` });
        return;
      }
      res.status(result.status).json({ error: result.error });
      return;
    }

    clearPasswordAttempts(rateKey);
    const state = roomManager.getRoomState(code);
    res.json({
      roomCode: code,
      token: result.token,
      memberId: result.memberId,
      role: result.role,
      state,
    });
  } catch (err) {
    console.error('[POST /api/rooms/join]', err);
    res.status(500).json({ error: 'Failed to join room.' });
  }
});

roomsRouter.get('/session', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing session token' });
    return;
  }

  try {
    const payload = verifyMemberToken(authHeader.slice(7));
    const member = roomManager.getMember(payload.roomCode, payload.memberId);
    if (!member) {
      res.status(404).json({ error: 'Session no longer exists' });
      return;
    }
    if (member.isKicked) {
      res.status(403).json({ error: 'You were removed from this room by the host.' });
      return;
    }
    const state = roomManager.getRoomState(payload.roomCode);
    if (!state) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    res.json({
      roomCode: payload.roomCode,
      memberId: member.id,
      role: member.role,
      displayName: member.displayName,
      teamId: member.teamId,
      watchlist: roomManager.getWatchlist(payload.roomCode, member.id),
      state,
    });
  } catch {
    res.status(401).json({ error: 'Invalid or expired session token' });
  }
});
