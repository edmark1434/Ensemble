import type { ComponentType, ReactNode } from 'react';

export type ModeratorAccent = 'sky' | 'violet' | 'amber' | 'emerald';

export type ModeratorNavItem = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  to: string;
};

/** Visual tokens mirroring Admin Console, with a per-role accent. */
export const MODERATOR_THEME: Record<
  ModeratorAccent,
  {
    label: string;
    brandGradient: string;
    brandShadow: string;
    activeNav: string;
    activeIconWrap: string;
    activeIcon: string;
    blobA: string;
    blobB: string;
    blobC: string;
  }
> = {
  sky: {
    label: 'text-sky-300/80',
    brandGradient: 'bg-gradient-to-br from-sky-500 to-cyan-500',
    brandShadow: 'shadow-lg shadow-sky-500/25',
    activeNav: 'bg-gradient-to-r from-sky-500/20 to-cyan-500/10 text-white shadow-inner shadow-sky-500/5',
    activeIconWrap: 'bg-sky-500/20 text-sky-300',
    activeIcon: 'text-sky-300',
    blobA: 'bg-sky-600/10',
    blobB: 'bg-cyan-600/8',
    blobC: 'bg-blue-600/6',
  },
  violet: {
    label: 'text-violet-300/80',
    brandGradient: 'bg-gradient-to-br from-violet-500 to-fuchsia-500',
    brandShadow: 'shadow-lg shadow-violet-500/25',
    activeNav: 'bg-gradient-to-r from-violet-500/20 to-fuchsia-500/10 text-white shadow-inner shadow-violet-500/5',
    activeIconWrap: 'bg-violet-500/20 text-violet-300',
    activeIcon: 'text-violet-300',
    blobA: 'bg-violet-600/10',
    blobB: 'bg-fuchsia-600/8',
    blobC: 'bg-indigo-600/6',
  },
  amber: {
    label: 'text-amber-300/80',
    brandGradient: 'bg-gradient-to-br from-amber-500 to-orange-500',
    brandShadow: 'shadow-lg shadow-amber-500/25',
    activeNav: 'bg-gradient-to-r from-amber-500/20 to-orange-500/10 text-white shadow-inner shadow-amber-500/5',
    activeIconWrap: 'bg-amber-500/20 text-amber-300',
    activeIcon: 'text-amber-300',
    blobA: 'bg-amber-600/10',
    blobB: 'bg-orange-600/8',
    blobC: 'bg-yellow-600/6',
  },
  emerald: {
    label: 'text-emerald-300/80',
    brandGradient: 'bg-gradient-to-br from-emerald-500 to-teal-500',
    brandShadow: 'shadow-lg shadow-emerald-500/25',
    activeNav: 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 text-white shadow-inner shadow-emerald-500/5',
    activeIconWrap: 'bg-emerald-500/20 text-emerald-300',
    activeIcon: 'text-emerald-300',
    blobA: 'bg-emerald-600/10',
    blobB: 'bg-teal-600/8',
    blobC: 'bg-cyan-600/6',
  },
};

/** Shared ambient shell — same structure as AdminLayout, accent-tinted blobs. */
export function ModeratorShell({
  accent,
  children,
}: {
  accent: ModeratorAccent;
  children: ReactNode;
}) {
  const theme = MODERATOR_THEME[accent];

  return (
    <div className="min-h-screen bg-[#06070c] text-zinc-100 antialiased">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className={`absolute -left-32 top-0 h-[480px] w-[480px] rounded-full ${theme.blobA} blur-[120px]`} />
        <div className={`absolute right-0 top-1/4 h-[400px] w-[400px] rounded-full ${theme.blobB} blur-[100px]`} />
        <div className={`absolute bottom-0 left-1/3 h-[300px] w-[500px] rounded-full ${theme.blobC} blur-[100px]`} />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>
      {children}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
