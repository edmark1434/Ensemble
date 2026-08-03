import { ExternalLink, Sparkles } from 'lucide-react';
import type { ComponentType } from 'react';
import { NavLink } from 'react-router-dom';
import LogoutButton from './LogoutButton';
import { STAFF_LOGIN_PATH } from '@/lib/staffRoutes';
import { MODERATOR_THEME, type ModeratorAccent, type ModeratorNavItem } from './ModeratorShell';

type Props = {
  accent: ModeratorAccent;
  title: string;
  homeTo: string;
  items: ModeratorNavItem[];
  BrandIcon?: ComponentType<{ className?: string }>;
};

/** Admin-console sidebar pattern with role-specific accent + menu items. */
export default function ModeratorNavbar({
  accent,
  title,
  homeTo,
  items,
  BrandIcon = Sparkles,
}: Props) {
  const theme = MODERATOR_THEME[accent];

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r border-white/[0.06] bg-[#08090f]/95 backdrop-blur-2xl md:flex">
      <div className="border-b border-white/[0.06] px-5 py-6">
        <div className="flex items-center gap-3">
          <div
            className={`relative flex h-11 w-11 items-center justify-center rounded-xl text-white ${theme.brandGradient} ${theme.brandShadow}`}
          >
            <BrandIcon className="h-5 w-5" />
          </div>
          <div>
            <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${theme.label}`}>
              Ensemble
            </p>
            <p className="text-sm font-semibold text-white">{title}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
          Menu
        </p>
        {items.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={label}
            to={to}
            end={to === homeTo}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? theme.activeNav
                  : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                    isActive
                      ? theme.activeIconWrap
                      : 'bg-white/[0.03] text-zinc-500 group-hover:text-zinc-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-2 border-t border-white/[0.06] p-4">
        <NavLink
          to="/home"
          className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-xs font-medium text-zinc-400 transition hover:border-white/15 hover:bg-white/[0.06] hover:text-white"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Back to platform
        </NavLink>
        <LogoutButton loginPath={STAFF_LOGIN_PATH} />
      </div>
    </aside>
  );
}
