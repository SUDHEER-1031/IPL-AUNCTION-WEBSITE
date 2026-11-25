import { useState } from 'react';
import { getInitials } from '../utils/format';
import type { PlayerRole } from '../types/auction';

interface PlayerAvatarProps {
  name: string;
  photo: string;
  role: PlayerRole;
  teamColor?: string;
  size?: 'sm' | 'md' | 'xl';
}

const ROLE_GRADIENTS: Record<PlayerRole, string> = {
  Batter: 'from-sky-500 to-indigo-700',
  Bowler: 'from-rose-500 to-red-800',
  'All-rounder': 'from-amber-500 to-orange-700',
  Wicketkeeper: 'from-emerald-500 to-teal-800',
  Spinner: 'from-purple-500 to-fuchsia-800',
};

export function PlayerAvatar({ name, photo, role, teamColor, size = 'xl' }: PlayerAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const sizeClass =
    size === 'sm'
      ? 'w-9 h-9 text-xs rounded-xl'
      : size === 'md'
        ? 'w-12 h-12 text-sm rounded-xl'
        : 'w-16 h-16 sm:w-20 sm:h-20 text-xl rounded-2xl';

  if (photo && !imgFailed) {
    return (
      <div
        className={`${sizeClass} relative overflow-hidden shrink-0 border-2 border-white/20 shadow-xl bg-slate-800`}
        style={teamColor ? { borderColor: teamColor } : undefined}
      >
        <img
          src={photo}
          alt={name}
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} relative overflow-hidden shrink-0 flex items-center justify-center font-display font-black text-white shadow-xl border-2 border-white/20 bg-gradient-to-br ${ROLE_GRADIENTS[role]}`}
      style={
        teamColor
          ? { background: `linear-gradient(135deg, ${teamColor}, #0f172a)` }
          : undefined
      }
      aria-label={name}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_60%)]" />
      <span className="relative z-10 tracking-wider drop-shadow">{getInitials(name)}</span>
    </div>
  );
}
