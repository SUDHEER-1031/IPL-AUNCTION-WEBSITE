import type { PlayerRole } from '../types/auction';

export function formatLakhs(lakhs: number): string {
  if (lakhs >= 100) {
    const cr = lakhs / 100;
    const formatted = Number.isInteger(cr) ? cr.toFixed(0) : cr.toFixed(2).replace(/0$/, '');
    return `₹${formatted} Cr`;
  }
  return `₹${lakhs} L`;
}

export function getNextBidClient(
  basePriceLakhs: number,
  currentBidLakhs: number | null,
  vetoJumpActive: boolean,
): number {
  if (currentBidLakhs === null) return basePriceLakhs;
  if (vetoJumpActive) return currentBidLakhs + 5;
  if (currentBidLakhs < 100) return currentBidLakhs + 5;
  if (currentBidLakhs < 500) return currentBidLakhs + 10;
  return currentBidLakhs + 25;
}

export function getCountryFlag(nationality: string): string {
  const map: Record<string, string> = {
    India: '🇮🇳',
    Australia: '🇦🇺',
    England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    'South Africa': '🇿🇦',
    'New Zealand': '🇳🇿',
    'West Indies': '🏝️',
    'Sri Lanka': '🇱🇰',
    Afghanistan: '🇦🇫',
    Bangladesh: '🇧🇩',
  };
  return map[nationality] ?? '🌍';
}

export function getRoleBadgeClasses(role: PlayerRole): string {
  switch (role) {
    case 'Batter':
      return 'bg-sky-500/15 text-sky-400 border-sky-400/30';
    case 'Bowler':
      return 'bg-rose-500/15 text-rose-400 border-rose-400/30';
    case 'All-rounder':
      return 'bg-amber-500/15 text-amber-400 border-amber-400/30';
    case 'Wicketkeeper':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-400/30';
    case 'Spinner':
      return 'bg-purple-500/15 text-purple-400 border-purple-400/30';
  }
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
