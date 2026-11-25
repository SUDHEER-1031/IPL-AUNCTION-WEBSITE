import { Crown, Eye, Mic, MicOff, UserX, Volume2, VolumeX } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useVoice } from '../context/VoiceContext';
import { TeamCrest } from './TeamCrest';

export function VoiceMembersPanel() {
  const { identity, roomState, emitAction } = useSocket();
  const {
    micOn,
    micError,
    muteAllIncoming,
    mutedMemberIds,
    toggleMic,
    toggleMuteAllIncoming,
    toggleMuteMember,
  } = useVoice();

  if (!roomState || !identity) return null;

  const isHost = identity.memberId === roomState.hostMemberId;
  const sortedMembers = [...roomState.members].sort((a, b) => {
    if (a.isConnected !== b.isConnected) return a.isConnected ? -1 : 1;
    return 0;
  });
  const onlineCount = roomState.members.filter((m) => m.isConnected).length;

  const handleKick = async (targetMemberId: string) => {
    await emitAction('room:kick', { targetMemberId });
  };

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-4 shadow-lg space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display font-bold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <Mic className="w-4 h-4 text-emerald-500" />
          Voice & Online ({onlineCount})
        </h3>
        <button
          type="button"
          onClick={toggleMuteAllIncoming}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer border transition-colors ${
            muteAllIncoming
              ? 'bg-rose-500/15 border-rose-500/40 text-rose-500'
              : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
          }`}
          title={muteAllIncoming ? 'Unmute incoming voices' : 'Block all incoming voices'}
        >
          {muteAllIncoming ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          {muteAllIncoming ? 'All Blocked' : 'Block All'}
        </button>
      </div>

      <button
        type="button"
        onClick={() => void toggleMic()}
        className={`w-full py-2.5 px-3 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all border ${
          micOn
            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20'
            : 'bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800'
        }`}
      >
        {micOn ? <Mic className="w-4 h-4 animate-pulse" /> : <MicOff className="w-4 h-4" />}
        {micOn ? 'Mic is ON (Speaking to Online Members)' : 'Turn Mic ON (Voice Chat)'}
      </button>

      {micError && (
        <p className="text-[11px] text-rose-500 font-semibold px-1">{micError}</p>
      )}

      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
        {sortedMembers.map((m) => {
          const isMe = m.id === identity.memberId;
          const isMutedByMe = mutedMemberIds.includes(m.id);

          return (
            <div
              key={m.id}
              className={`flex items-center justify-between gap-2 rounded-2xl p-2 border ${
                m.isConnected
                  ? 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
                  : 'bg-slate-50/40 dark:bg-slate-950/20 border-slate-200/60 dark:border-slate-800/50 opacity-60'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {m.role === 'SPECTATOR' ? (
                  <div className="w-7 h-7 rounded-lg bg-purple-500/15 text-purple-500 flex items-center justify-center shrink-0">
                    <Eye className="w-3.5 h-3.5" />
                  </div>
                ) : (
                  <TeamCrest teamId={m.teamId} size="xs" />
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {m.displayName}
                      {isMe ? ' (You)' : ''}
                    </span>
                    {m.id === roomState.hostMemberId && (
                      <span title="Host" className="shrink-0">
                        <Crown className="w-3 h-3 text-amber-500" />
                      </span>
                    )}
                    {m.isVoiceActive && m.isConnected && (
                      <span
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-500 text-[9px] font-black"
                        title="Microphone active"
                      >
                        <Mic className="w-2.5 h-2.5" />
                        LIVE
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    <span className={m.isConnected ? 'text-emerald-500 font-semibold' : ''}>
                      {m.isConnected ? 'Online' : 'Offline'}
                    </span>
                    {' · '}
                    {m.role === 'SPECTATOR' ? 'Spectator' : m.teamId || 'Picking team'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {!isMe && m.isConnected && (
                  <button
                    type="button"
                    onClick={() => toggleMuteMember(m.id)}
                    className={`p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                      isMutedByMe || muteAllIncoming
                        ? 'bg-rose-500/15 text-rose-500'
                        : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300'
                    }`}
                    title={
                      isMutedByMe
                        ? `Unblock ${m.displayName}'s voice`
                        : `Mute / block ${m.displayName}'s voice`
                    }
                  >
                    {isMutedByMe || muteAllIncoming ? (
                      <VolumeX className="w-3.5 h-3.5" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}

                {isHost && !isMe && (
                  <button
                    type="button"
                    onClick={() => void handleKick(m.id)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/15 cursor-pointer"
                    title={`Kick ${m.displayName}`}
                  >
                    <UserX className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
