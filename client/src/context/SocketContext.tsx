import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  ChatMessageView,
  MemberRole,
  ReactionBurst,
  ResolutionEvent,
  RoomStatePayload,
  WatchlistAlert,
} from '../types/auction';
import { soundEngine } from '../utils/sound';

const API_BASE = import.meta.env.VITE_API_URL || '';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined;
const TOKEN_KEY = 'ipl_auction_session_token';

interface SessionIdentity {
  token: string;
  memberId: string;
  role: MemberRole;
  roomCode: string;
}

interface SocketContextValue {
  identity: SessionIdentity | null;
  roomState: RoomStatePayload | null;
  watchlist: string[];
  connected: boolean;
  clockOffsetMs: number;
  lastResolution: ResolutionEvent | null;
  reactions: ReactionBurst[];
  watchlistAlert: WatchlistAlert | null;
  kickedReason: string | null;
  reconnecting: boolean;
  setSession: (id: SessionIdentity, initialState: RoomStatePayload) => void;
  leaveRoom: () => void;
  clearResolution: () => void;
  clearWatchlistAlert: () => void;
  emitAction: <T = { ok: boolean; error?: string }>(event: string, payload?: unknown) => Promise<T>;
  sendReaction: (emoji: string) => void;
  sendVoiceSignal: (targetMemberId: string, signal: unknown) => void;
  subscribeVoiceSignal: (handler: (payload: { fromMemberId: string; signal: unknown }) => void) => () => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [identity, setIdentity] = useState<SessionIdentity | null>(null);
  const [roomState, setRoomState] = useState<RoomStatePayload | null>(null);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const [lastResolution, setLastResolution] = useState<ResolutionEvent | null>(null);
  const [reactions, setReactions] = useState<ReactionBurst[]>([]);
  const [watchlistAlert, setWatchlistAlert] = useState<WatchlistAlert | null>(null);
  const [kickedReason, setKickedReason] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(true);

  const socketRef = useRef<Socket | null>(null);
  const prevBidCountRef = useRef<number>(0);
  const voiceHandlersRef = useRef(
    new Set<(payload: { fromMemberId: string; signal: unknown }) => void>(),
  );

  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setConnected(false);
  }, []);

  const connectSocket = useCallback(
    (token: string) => {
      disconnectSocket();
      const socket = io(SOCKET_URL || window.location.origin, {
        auth: { token },
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => {
        setConnected(true);
      });

      socket.on('disconnect', () => {
        setConnected(false);
      });

      socket.on('room:state', (nextState: RoomStatePayload) => {
        setClockOffsetMs(nextState.serverNow - Date.now());
        if (nextState.recentBids.length > prevBidCountRef.current && prevBidCountRef.current > 0) {
          soundEngine.playBid();
        }
        prevBidCountRef.current = nextState.recentBids.length;
        setRoomState(nextState);
      });

      socket.on('watchlist:updated', (list: string[]) => {
        setWatchlist(list);
      });

      socket.on('watchlist:alert', (alert: WatchlistAlert) => {
        setWatchlistAlert(alert);
        soundEngine.playCountdownBeep();
      });

      socket.on('auction:resolution', (event: ResolutionEvent) => {
        setLastResolution(event);
        if (event.outcome === 'SOLD') {
          soundEngine.playSoldGavel();
        } else {
          soundEngine.playUnsold();
        }
      });

      socket.on('chat:message', (msg: ChatMessageView) => {
        setRoomState((prev) => {
          if (!prev) return prev;
          if (prev.chatMessages.some((m) => m.id === msg.id)) return prev;
          return { ...prev, chatMessages: [...prev.chatMessages, msg].slice(-80) };
        });
      });

      socket.on('auction:reaction', (burst: ReactionBurst) => {
        setReactions((prev) => [...prev.slice(-14), burst]);
        setTimeout(() => {
          setReactions((prev) => prev.filter((r) => r.id !== burst.id));
        }, 2600);
      });

      socket.on('member:kicked', (payload: { reason?: string }) => {
        setKickedReason(payload?.reason || 'You were removed by the host.');
        try {
          sessionStorage.removeItem(TOKEN_KEY);
        } catch {
          // ignore
        }
        setIdentity(null);
        setRoomState(null);
        socket.disconnect();
      });

      socket.on('voice:signal', (payload: { fromMemberId: string; signal: unknown }) => {
        voiceHandlersRef.current.forEach((fn) => fn(payload));
      });

      socketRef.current = socket;
    },
    [disconnectSocket],
  );

  // Auto-reconnect from stored JWT token on mount
  useEffect(() => {
    let active = true;
    const savedToken = (() => {
      try {
        return sessionStorage.getItem(TOKEN_KEY);
      } catch {
        return null;
      }
    })();

    if (!savedToken) {
      setReconnecting(false);
      return;
    }

    fetch(`${API_BASE}/api/rooms/session`, {
      headers: { Authorization: `Bearer ${savedToken}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Session expired');
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        const id: SessionIdentity = {
          token: savedToken,
          memberId: data.memberId,
          role: data.role,
          roomCode: data.roomCode,
        };
        setIdentity(id);
        setRoomState(data.state);
        setWatchlist(data.watchlist || []);
        setClockOffsetMs(data.state.serverNow - Date.now());
        connectSocket(savedToken);
      })
      .catch(() => {
        try {
          sessionStorage.removeItem(TOKEN_KEY);
        } catch {
          // ignore
        }
      })
      .finally(() => {
        if (active) setReconnecting(false);
      });

    return () => {
      active = false;
    };
  }, [connectSocket]);

  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, [disconnectSocket]);

  const setSession = useCallback(
    (id: SessionIdentity, initialState: RoomStatePayload) => {
      try {
        sessionStorage.setItem(TOKEN_KEY, id.token);
      } catch {
        // ignore
      }
      setKickedReason(null);
      setIdentity(id);
      setRoomState(initialState);
      setClockOffsetMs(initialState.serverNow - Date.now());
      prevBidCountRef.current = initialState.recentBids.length;
      connectSocket(id.token);
    },
    [connectSocket],
  );

  const leaveRoom = useCallback(() => {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
    disconnectSocket();
    setIdentity(null);
    setRoomState(null);
    setWatchlist([]);
    setLastResolution(null);
  }, [disconnectSocket]);

  const emitAction = useCallback(
    <T = { ok: boolean; error?: string }>(event: string, payload?: unknown): Promise<T> => {
      return new Promise((resolve) => {
        const sock = socketRef.current;
        if (!sock || !sock.connected) {
          resolve({ ok: false, error: 'Not connected to server' } as T);
          return;
        }
        sock.emit(event, payload, (res: T) => {
          resolve(res);
        });
      });
    },
    [],
  );

  const sendReaction = useCallback((emoji: string) => {
    socketRef.current?.emit('reaction:send', { emoji });
  }, []);

  const sendVoiceSignal = useCallback((targetMemberId: string, signal: unknown) => {
    socketRef.current?.emit('voice:signal', { targetMemberId, signal });
  }, []);

  const subscribeVoiceSignal = useCallback(
    (handler: (payload: { fromMemberId: string; signal: unknown }) => void) => {
      voiceHandlersRef.current.add(handler);
      return () => {
        voiceHandlersRef.current.delete(handler);
      };
    },
    [],
  );

  return (
    <SocketContext.Provider
      value={{
        identity,
        roomState,
        watchlist,
        connected,
        clockOffsetMs,
        lastResolution,
        reactions,
        watchlistAlert,
        kickedReason,
        reconnecting,
        setSession,
        leaveRoom,
        clearResolution: () => setLastResolution(null),
        clearWatchlistAlert: () => setWatchlistAlert(null),
        emitAction,
        sendReaction,
        sendVoiceSignal,
        subscribeVoiceSignal,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
