import { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ChatMessageView, ReactionBurst } from '../types/auction';
import { getTeamBrand } from '../data/teams';

const EMOJIS = ['🔥', '💰', '😱', '🏏', '👏', '🔨'];

interface ChatReactionsProps {
  messages: ChatMessageView[];
  reactions: ReactionBurst[];
  onSendMessage: (msg: string) => Promise<{ ok: boolean; error?: string }>;
  onSendReaction: (emoji: string) => void;
}

export function ChatReactions({
  messages,
  reactions,
  onSendMessage,
  onSendReaction,
}: ChatReactionsProps) {
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    await onSendMessage(trimmed);
  };

  return (
    <div className="relative rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-3 flex flex-col h-[270px]">
      {/* Floating Emoji Reactions */}
      <div className="pointer-events-none absolute -top-10 right-3 left-3 h-16 overflow-visible z-20 flex justify-end gap-1.5">
        <AnimatePresence>
          {reactions.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 16, scale: 0.6 }}
              animate={{ opacity: 1, y: -22, scale: 1.1 }}
              exit={{ opacity: 0, y: -48, scale: 0.9 }}
              transition={{ duration: 1.3 }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900/90 text-white text-[11px] shadow-lg border border-white/15 h-fit"
            >
              <span className="text-sm">{r.emoji}</span>
              <span className="font-semibold text-[10px]">{r.teamId || r.senderName}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between mb-1.5">
        <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-sky-500" />
          Live Chat
        </h3>
        <div className="flex items-center gap-0.5">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onSendReaction(emoji)}
              className="w-6 h-6 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center text-xs transition-transform active:scale-125 cursor-pointer"
              title={`Send ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto space-y-1.5 pr-1 my-1">
        {messages.length === 0 ? (
          <p className="text-[11px] text-slate-400 text-center mt-8">
            No messages yet. Say hi or drop a reaction!
          </p>
        ) : (
          messages.map((m) => {
            const brand = getTeamBrand(m.teamId);
            return (
              <div
                key={m.id}
                className="rounded-xl bg-white dark:bg-slate-900 px-2.5 py-1.5 border border-slate-100 dark:border-slate-800"
              >
                <div className="flex items-center gap-1.5 text-[10px] font-bold">
                  {brand && (
                    <span
                      className="px-1 py-0.2 rounded text-[9px]"
                      style={{ backgroundColor: brand.primaryColor, color: brand.textOnPrimary }}
                    >
                      {brand.shortName}
                    </span>
                  )}
                  <span className="text-slate-700 dark:text-slate-300">{m.displayName}</span>
                </div>
                <p className="text-slate-800 dark:text-slate-200 text-[11px] mt-0.5 break-words">
                  {m.message}
                </p>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-1.5 flex items-center gap-1.5">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          maxLength={240}
          className="flex-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <button
          type="submit"
          className="p-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-colors cursor-pointer"
          aria-label="Send message"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
