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
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-2xl mx-auto mb-10"
      >
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider mb-4">
          <Gavel className="w-3.5 h-3.5" />
          Real-Time Multiplayer Cricket Auction
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
          Build Your Dream{' '}
          <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 bg-clip-text text-transparent">
            IPL Franchise
          </span>
        </h1>
        <p className="mt-3 text-slate-600 dark:text-slate-400 text-sm sm:text-base">
          ₹150 Cr purse, 120 real IPL stars & legends across 20 shuffled sets, tactical Power
          Cards, live commentary, and synchronized bidding with friends.
        </p>
      </motion.div>

      {kickedReason && (
        <div className="max-w-3xl mx-auto mb-6 rounded-2xl bg-rose-500/15 border border-rose-500/40 p-4 flex items-center gap-3 text-rose-500 text-sm font-semibold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{kickedReason}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {/* Create Room Card */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 blur-3xl pointer-events-none" />
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                Create Auction Room
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Host a private room and get a 6-character invite code
              </p>
            </div>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
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
                className="w-full rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
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
                className="w-full rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Room Password
              </label>
              <input
                type="password"
                required
                minLength={4}
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                placeholder="Min 4 characters (bcrypt hashed)"
                className="w-full rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {createError && (
              <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 px-3.5 py-2.5 text-xs font-semibold text-rose-500">
                {createError}
              </div>
            )}

            <button
              type="submit"
              disabled={creating}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-display font-extrabold text-base shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-60"
            >
              {creating ? 'Creating Room...' : 'Create Room & Enter Lobby'}
            </button>
          </form>
        </motion.div>

        {/* Join Room Card */}
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-sky-500/10 blur-3xl pointer-events-none" />
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-sky-500/15 text-sky-500 flex items-center justify-center">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                Join Existing Room
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Requires both the 6-character code and room password
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 mb-4">
            <button
              type="button"
              onClick={() => setSpectatorMode(false)}
              className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
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
              className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                spectatorMode
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Spectator Mode
            </button>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Room Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  className="w-full rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm font-mono uppercase tracking-widest text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Your Display Name
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={28}
                  value={joinDisplayName}
                  onChange={(e) => setJoinDisplayName(e.target.value)}
                  placeholder="e.g., Priya"
                  className="w-full rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Room Password
              </label>
              <input
                type="password"
                required
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                placeholder="Enter room password"
                className="w-full rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {joinError && (
              <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 px-3.5 py-2.5 text-xs font-semibold text-rose-500">
                {joinError}
              </div>
            )}

            <button
              type="submit"
              disabled={joining}
              className={`w-full py-3.5 rounded-2xl text-white font-display font-extrabold text-base shadow-lg transition-all cursor-pointer disabled:opacity-60 ${
                spectatorMode
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-500/20'
                  : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 shadow-sky-500/20'
              }`}
            >
              {joining
                ? 'Joining...'
                : spectatorMode
                  ? 'Watch as Spectator (View-Only)'
                  : 'Join Auction Lobby'}
            </button>
          </form>
        </motion.div>
      </div>

      <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto text-center">
        {[
          { label: 'Starting Purse', value: '₹150 Cr' },
          { label: 'Auction Pool', value: '120 Players' },
          { label: 'Max Squad / OS', value: '11 / 4 Foreign' },
          { label: 'Server Synced', value: 'Real-Time Socket' },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3"
          >
            <div className="font-display font-black text-lg text-slate-900 dark:text-white">
              {item.value}
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
