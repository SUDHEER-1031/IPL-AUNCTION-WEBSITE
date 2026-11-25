import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Eye, Gavel, KeyRound, PlusCircle, ShieldCheck, Users } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

const API_BASE = import.meta.env.VITE_API_URL || '';

export function LandingPage() {
  const { setSession, kickedReason } = useSocket();

  const [createRoomName, setCreateRoomName] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createDisplayName, setCreateDisplayName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [joinCode, setJoinCode] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [joinDisplayName, setJoinDisplayName] = useState('');
  const [spectatorMode, setSpectatorMode] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const spectate = params.get('spectate');
    if (code) setJoinCode(code.toUpperCase().slice(0, 6));
    if (spectate === '1' || spectate === 'true') setSpectatorMode(true);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: createRoomName,
          password: createPassword,
          displayName: createDisplayName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || 'Could not create room');
        return;
      }
      setSession(
        {
          token: data.token,
          memberId: data.memberId,
          role: data.role,
          roomCode: data.roomCode,
        },
        data.state,
      );
    } catch {
      setCreateError('Unable to reach server. Make sure backend is running.');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    setJoining(true);
    try {
      const res = await fetch(`${API_BASE}/api/rooms/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: joinCode.trim().toUpperCase(),
          password: joinPassword,
          displayName: joinDisplayName,
          spectator: spectatorMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setJoinError(data.error || 'Could not join room');
        return;
      }
      setSession(
        {
          token: data.token,
          memberId: data.memberId,
          role: data.role,
          roomCode: data.roomCode,
        },
        data.state,
      );
    } catch {
      setJoinError('Unable to reach server. Make sure backend is running.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-xl mx-auto mb-6"
      >
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[11px] font-bold uppercase tracking-wider mb-3">
          <Gavel className="w-3 h-3" />
          Real-Time Multiplayer Cricket Auction
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Build Your Dream{' '}
          <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 bg-clip-text text-transparent">
            IPL Franchise
          </span>
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
          ₹150 Cr purse, 120 real IPL stars across 20 sets, live voice comms, tactical Power
          Cards, and real-time bidding with friends.
        </p>
      </motion.div>

      {kickedReason && (
        <div className="max-w-3xl mx-auto mb-4 rounded-xl bg-rose-500/15 border border-rose-500/40 p-3 flex items-center gap-2 text-rose-500 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{kickedReason}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-4xl mx-auto">
        {/* Create Room Card */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-5 shadow-lg relative overflow-hidden"
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Create Auction Room
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Host a private room and get a 6-character invite code
              </p>
            </div>
          </div>

          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Room Name
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={48}
                value={createRoomName}
                onChange={(e) => setCreateRoomName(e.target.value)}
                placeholder="e.g., Sunday Mega Auction"
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Your Display Name
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={28}
                value={createDisplayName}
                onChange={(e) => setCreateDisplayName(e.target.value)}
                placeholder="e.g., Aarav"
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Room Password
              </label>
              <input
                type="password"
                required
                minLength={4}
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                placeholder="Min 4 characters"
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {createError && (
              <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 px-3 py-2 text-[11px] font-semibold text-rose-500">
                {createError}
              </div>
            )}

            <button
              type="submit"
              disabled={creating}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-display font-extrabold text-sm shadow transition-all cursor-pointer disabled:opacity-60"
            >
              {creating ? 'Creating Room...' : 'Create Room & Enter'}
            </button>
          </form>
        </motion.div>

        {/* Join Room Card */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-5 shadow-lg relative overflow-hidden"
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-500 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Join Existing Room
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Join anytime using the 6-character code & password
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 mb-3">
            <button
              type="button"
              onClick={() => setSpectatorMode(false)}
              className={`py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                !spectatorMode
                  ? 'bg-sky-500 text-white shadow'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Play as Owner
            </button>
            <button
              type="button"
              onClick={() => setSpectatorMode(true)}
              className={`py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                spectatorMode
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Spectator Mode
            </button>
          </div>

          <form onSubmit={handleJoin} className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Room Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs font-mono uppercase tracking-widest text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={28}
                  value={joinDisplayName}
                  onChange={(e) => setJoinDisplayName(e.target.value)}
                  placeholder="e.g., Priya"
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Room Password
              </label>
              <input
                type="password"
                required
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                placeholder="Enter room password"
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {joinError && (
              <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 px-3 py-2 text-[11px] font-semibold text-rose-500">
                {joinError}
              </div>
            )}

            <button
              type="submit"
              disabled={joining}
              className={`w-full py-2.5 rounded-xl text-white font-display font-extrabold text-sm shadow transition-all cursor-pointer disabled:opacity-60 ${
                spectatorMode
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500'
                  : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500'
              }`}
            >
              {joining
                ? 'Joining...'
                : spectatorMode
                  ? 'Watch as Spectator'
                  : 'Join Auction Room'}
            </button>
          </form>
        </motion.div>
      </div>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-3xl mx-auto text-center">
        {[
          { label: 'Starting Purse', value: '₹150 Cr' },
          { label: 'Auction Pool', value: '120 Players' },
          { label: 'Max Squad / OS', value: '11 / 4 Foreign' },
          { label: 'Live Voice + Chat', value: 'All in 1 Screen' },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl bg-white/75 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-2.5"
          >
            <div className="font-display font-black text-sm text-slate-900 dark:text-white">
              {item.value}
            </div>
            <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1 mt-0.5">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
