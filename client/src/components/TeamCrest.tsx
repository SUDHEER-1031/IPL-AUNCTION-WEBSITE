import { getTeamBrand } from '../data/teams';

interface TeamCrestProps {
  teamId: string | null | undefined;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export function TeamCrest({ teamId, size = 'md' }: TeamCrestProps) {
  const brand = getTeamBrand(teamId);
  const dims =
    size === 'xs'
      ? 'w-6 h-6 text-[9px]'
      : size === 'sm'
        ? 'w-8 h-8 text-[10px]'
        : size === 'lg'
          ? 'w-14 h-14 text-sm'
          : 'w-10 h-10 text-xs';

  if (!brand) {
    return (
      <div
        className={`${dims} rounded-xl bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center font-bold text-slate-500`}
      >
        ?
      </div>
    );
  }

  return (
    <div
      className={`${dims} relative rounded-xl flex items-center justify-center font-display font-black tracking-tight shadow-md shrink-0 overflow-hidden border border-white/25`}
      style={{
        background: `linear-gradient(135deg, ${brand.primaryColor} 0%, ${brand.secondaryColor} 100%)`,
        color: brand.textOnPrimary,
      }}
      title={brand.name}
    >
      <svg
        viewBox="0 0 40 40"
        className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
        aria-hidden="true"
      >
        <path d="M20 2 L36 10 V22 C36 30 28 36 20 39 C12 36 4 30 4 22 V10 Z" fill="currentColor" />
      </svg>
      <span className="relative z-10 drop-shadow-sm">{brand.shortName}</span>
    </div>
  );
}
