import type { Server, Socket } from 'socket.io';
import { verifyMemberToken, type MemberTokenPayload } from './auth.js';
import { roomManager } from './roomManager.js';

interface AuthedSocket extends Socket {
  data: {
    auth?: MemberTokenPayload;
  };
}

export function registerSocketHandlers(io: Server): void {
  io.use((socket: AuthedSocket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== 'string' || !token) {
      next(new Error('Authentication token required'));
      return;
    }
    try {
      const payload = verifyMemberToken(token);
      const member = roomManager.getMember(payload.roomCode, payload.memberId);
      if (!member) {
        next(new Error('Member record not found'));
        return;
      }
      if (member.isKicked) {
        next(new Error('You were removed from this room by the host'));
        return;
      }
      socket.data.auth = payload;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket: AuthedSocket) => {
    const auth = socket.data.auth;
    if (!auth) {
      socket.disconnect();
      return;
    }

    const { roomCode, memberId } = auth;
    socket.join(`room:${roomCode}`);
    socket.join(`member:${memberId}`);

    roomManager.setMemberConnected(roomCode, memberId, true);
    const initialState = roomManager.getRoomState(roomCode);
    if (initialState) {
      socket.emit('room:state', initialState);
      socket.emit('watchlist:updated', roomManager.getWatchlist(roomCode, memberId));
    }

    socket.on('team:select', (payload: { teamId: string }, cb?: (res: unknown) => void) => {
      const res = roomManager.selectTeam(roomCode, memberId, payload?.teamId);
      cb?.(res);
    });

    socket.on('room:setTimer', (payload: { seconds: number }, cb?: (res: unknown) => void) => {
      const res = roomManager.setTimerSeconds(roomCode, memberId, Number(payload?.seconds));
      cb?.(res);
    });

    socket.on('room:kick', (payload: { targetMemberId: string }, cb?: (res: unknown) => void) => {
      const res = roomManager.kickMember(roomCode, memberId, payload?.targetMemberId);
      if (res.ok) {
        io.in(`member:${payload?.targetMemberId}`).disconnectSockets(true);
      }
      cb?.(res);
    });

    socket.on('auction:start', (_payload: unknown, cb?: (res: unknown) => void) => {
      const res = roomManager.startAuction(roomCode, memberId);
      cb?.(res);
    });

    socket.on('auction:bid', (payload: { expectedAmountLakhs?: number }, cb?: (res: unknown) => void) => {
      const res = roomManager.placeBid(roomCode, memberId, payload?.expectedAmountLakhs);
      cb?.(res);
    });

    socket.on(
      'auction:powerCard',
      (payload: { cardType: 'RESET_TIMER' | 'VETO_JUMP' }, cb?: (res: unknown) => void) => {
        const cardType = payload?.cardType === 'VETO_JUMP' ? 'VETO_JUMP' : 'RESET_TIMER';
        const res = roomManager.usePowerCard(roomCode, memberId, cardType);
        cb?.(res);
      },
    );

    socket.on('auction:pause', (_payload: unknown, cb?: (res: unknown) => void) => {
      const res = roomManager.pauseAuction(roomCode, memberId);
      cb?.(res);
    });

    socket.on('auction:resume', (_payload: unknown, cb?: (res: unknown) => void) => {
      const res = roomManager.resumeAuction(roomCode, memberId);
      cb?.(res);
    });

    socket.on('auction:skip', (_payload: unknown, cb?: (res: unknown) => void) => {
      const res = roomManager.skipCurrentPlayer(roomCode, memberId);
      cb?.(res);
    });

    socket.on('auction:end', (_payload: unknown, cb?: (res: unknown) => void) => {
      const res = roomManager.endAuction(roomCode, memberId);
      cb?.(res);
    });

    socket.on('watchlist:toggle', (payload: { playerId: string }, cb?: (res: unknown) => void) => {
      if (typeof payload?.playerId === 'string') {
        const list = roomManager.toggleWatchlist(roomCode, memberId, payload.playerId);
        socket.emit('watchlist:updated', list);
        cb?.({ ok: true, watchlist: list });
      }
    });

    socket.on('chat:send', (payload: { message: string }, cb?: (res: unknown) => void) => {
      const res = roomManager.addChatMessage(roomCode, memberId, String(payload?.message ?? ''));
      cb?.(res);
    });

    socket.on('reaction:send', (payload: { emoji: string }) => {
      roomManager.sendReaction(roomCode, memberId, String(payload?.emoji ?? ''));
    });

    socket.on('voice:toggle', (payload: { active: boolean }, cb?: (res: unknown) => void) => {
      const res = roomManager.setVoiceActive(roomCode, memberId, Boolean(payload?.active));
      cb?.(res);
    });

    socket.on(
      'voice:signal',
      (payload: { targetMemberId: string; signal: unknown }) => {
        if (!payload?.targetMemberId || !payload?.signal) return;
        if (!roomManager.isMemberOnline(roomCode, payload.targetMemberId)) return;
        io.to(`member:${payload.targetMemberId}`).emit('voice:signal', {
          fromMemberId: memberId,
          signal: payload.signal,
        });
      },
    );

    socket.on('disconnect', () => {
      const stillActiveSockets = io.sockets.adapter.rooms.get(`member:${memberId}`);
      if (!stillActiveSockets || stillActiveSockets.size === 0) {
        roomManager.setMemberConnected(roomCode, memberId, false);
      }
    });
  });
}
