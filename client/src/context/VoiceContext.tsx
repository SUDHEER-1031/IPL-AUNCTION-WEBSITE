import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useSocket } from './SocketContext';

type SignalPayload =
  | { type: 'offer'; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; sdp: RTCSessionDescriptionInit }
  | { type: 'ice'; candidate: RTCIceCandidateInit };

interface VoiceContextValue {
  micOn: boolean;
  micError: string | null;
  muteAllIncoming: boolean;
  mutedMemberIds: string[];
  toggleMic: () => Promise<void>;
  toggleMuteAllIncoming: () => void;
  toggleMuteMember: (memberId: string) => void;
}

const VoiceContext = createContext<VoiceContextValue | null>(null);

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const { identity, roomState, emitAction, sendVoiceSignal, subscribeVoiceSignal } = useSocket();
  const [micOn, setMicOn] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [muteAllIncoming, setMuteAllIncoming] = useState(false);
  const [mutedMemberIds, setMutedMemberIds] = useState<string[]>([]);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef(new Map<string, RTCPeerConnection>());
  const audioElsRef = useRef(new Map<string, HTMLAudioElement>());
  const mutedSetRef = useRef(new Set<string>());
  const muteAllRef = useRef(false);

  useEffect(() => {
    mutedSetRef.current = new Set(mutedMemberIds);
    audioElsRef.current.forEach((audio, memberId) => {
      audio.muted = muteAllIncoming || mutedSetRef.current.has(memberId);
    });
  }, [mutedMemberIds, muteAllIncoming]);

  useEffect(() => {
    muteAllRef.current = muteAllIncoming;
  }, [muteAllIncoming]);

  const cleanupPeer = useCallback((peerId: string) => {
    const pc = peersRef.current.get(peerId);
    if (pc) {
      pc.close();
      peersRef.current.delete(peerId);
    }
    const audio = audioElsRef.current.get(peerId);
    if (audio) {
      audio.srcObject = null;
      audio.remove();
      audioElsRef.current.delete(peerId);
    }
  }, []);

  const cleanupAllPeers = useCallback(() => {
    Array.from(peersRef.current.keys()).forEach(cleanupPeer);
  }, [cleanupPeer]);

  const stopMic = useCallback(async () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    peersRef.current.forEach((pc) => {
      pc.getSenders().forEach((sender) => {
        if (sender.track) {
          try {
            pc.removeTrack(sender);
          } catch {
            // ignore
          }
        }
      });
    });
    setMicOn(false);
    await emitAction('voice:toggle', { active: false });
  }, [emitAction]);

  const getOrCreatePeer = useCallback(
    (peerId: string): RTCPeerConnection => {
      const existing = peersRef.current.get(peerId);
      if (existing) return existing;

      const pc = new RTCPeerConnection(ICE_SERVERS);

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      pc.onicecandidate = (evt) => {
        if (evt.candidate) {
          sendVoiceSignal(peerId, { type: 'ice', candidate: evt.candidate.toJSON() });
        }
      };

      pc.ontrack = (evt) => {
        const [stream] = evt.streams;
        if (!stream) return;
        let audio = audioElsRef.current.get(peerId);
        if (!audio) {
          audio = document.createElement('audio');
          audio.autoplay = true;
          audio.setAttribute('playsinline', 'true');
          audio.style.display = 'none';
          document.body.appendChild(audio);
          audioElsRef.current.set(peerId, audio);
        }
        audio.srcObject = stream;
        audio.muted = muteAllRef.current || mutedSetRef.current.has(peerId);
        void audio.play().catch(() => {
          // autoplay may await interaction; user interaction already happened
        });
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          cleanupPeer(peerId);
        }
      };

      peersRef.current.set(peerId, pc);
      return pc;
    },
    [cleanupPeer, sendVoiceSignal],
  );

  // Handle incoming WebRTC signals from online peers
  useEffect(() => {
    const unsubscribe = subscribeVoiceSignal(async ({ fromMemberId, signal }) => {
      const sig = signal as SignalPayload;
      if (!sig || !fromMemberId) return;

      try {
        const pc = getOrCreatePeer(fromMemberId);
        if (sig.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(sig.sdp));
          if (localStreamRef.current) {
            const senders = pc.getSenders();
            localStreamRef.current.getTracks().forEach((track) => {
              if (!senders.some((s) => s.track?.id === track.id)) {
                pc.addTrack(track, localStreamRef.current!);
              }
            });
          }
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendVoiceSignal(fromMemberId, { type: 'answer', sdp: pc.localDescription! });
        } else if (sig.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(sig.sdp));
        } else if (sig.type === 'ice' && sig.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(sig.candidate));
        }
      } catch {
        // Ignore transient signaling race
      }
    });

    return unsubscribe;
  }, [getOrCreatePeer, sendVoiceSignal, subscribeVoiceSignal]);

  // Keep peer list strictly synced to currently ONLINE room members
  useEffect(() => {
    if (!roomState || !identity) {
      cleanupAllPeers();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      setMicOn(false);
      return;
    }

    const onlineOthers = roomState.members.filter(
      (m) => m.isConnected && m.id !== identity.memberId,
    );
    const onlineIds = new Set(onlineOthers.map((m) => m.id));

    // Close connections for members who went offline or left
    Array.from(peersRef.current.keys()).forEach((peerId) => {
      if (!onlineIds.has(peerId)) {
        cleanupPeer(peerId);
      }
    });

    // When our mic is ON, proactively connect & send audio offers to all online members
    if (micOn && localStreamRef.current) {
      onlineOthers.forEach(async (peer) => {
        const existingPc = peersRef.current.get(peer.id);
        const alreadySending =
          existingPc && existingPc.getSenders().some((s) => s.track?.readyState === 'live');
        if (alreadySending) return;

        try {
          const pc = getOrCreatePeer(peer.id);
          localStreamRef.current!.getTracks().forEach((track) => {
            if (!pc.getSenders().some((s) => s.track?.id === track.id)) {
              pc.addTrack(track, localStreamRef.current!);
            }
          });
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendVoiceSignal(peer.id, { type: 'offer', sdp: pc.localDescription! });
        } catch {
          // ignore
        }
      });
    }
  }, [roomState, identity, micOn, cleanupAllPeers, cleanupPeer, getOrCreatePeer, sendVoiceSignal]);

  useEffect(() => {
    return () => {
      cleanupAllPeers();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cleanupAllPeers]);

  const toggleMic = useCallback(async () => {
    setMicError(null);
    if (micOn) {
      await stopMic();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicError('Microphone API unavailable in this browser/context (requires HTTPS or localhost).');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setMicOn(true);
      await emitAction('voice:toggle', { active: true });
    } catch {
      setMicError('Microphone permission denied or no mic detected.');
      setMicOn(false);
    }
  }, [micOn, stopMic, emitAction]);

  const toggleMuteMember = useCallback((memberId: string) => {
    setMutedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId],
    );
  }, []);

  const toggleMuteAllIncoming = useCallback(() => {
    setMuteAllIncoming((prev) => !prev);
  }, []);

  return (
    <VoiceContext.Provider
      value={{
        micOn,
        micError,
        muteAllIncoming,
        mutedMemberIds,
        toggleMic,
        toggleMuteAllIncoming,
        toggleMuteMember,
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error('useVoice must be used within VoiceProvider');
  return ctx;
}
