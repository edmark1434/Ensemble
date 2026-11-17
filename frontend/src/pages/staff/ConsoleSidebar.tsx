import { useEffect, useState, type ComponentType } from 'react';
import { Menu, X } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import useGlobalState from '@/lib/global_state';
import { prefetchStaffRoute } from '@/lib/staffPrefetch';
import LogoutButton from '@/pages/moderator/shared/LogoutButton';

export type ConsoleNavItem = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  to: string;
};

export type ConsoleSidebarTheme = {
  /** Eyebrow text colour above the console title. */
  label: string;
  /** Brand tile background + shadow. */
  brand: string;
  /** Active link surface and text. */
  activeNav: string;
  /** Active link icon tile. */
  activeIconWrap: string;
  /** Active link indicator bar. */
  indicator: string;
};

type ConsoleSidebarProps = {
  title: string;
  theme: ConsoleSidebarTheme;
  items: ConsoleNavItem[];
  homeTo: string;
  loginPath: string;
  BrandIcon: ComponentType<{ className?: string }>;
};

function NavItems({
  items,
  homeTo,
  theme,
  onNavigate,
}: {
  items: ConsoleNavItem[];
  homeTo: string;
  theme: ConsoleSidebarTheme;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5 scroll-thin" aria-label="Console">
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Menu</p>
      {items.map(({ label, icon: Icon, to }) => (
        <NavLink
          key={label}
          to={to}
          end={to === homeTo}
          onClick={onNavigate}
          onPointerEnter={() => prefetchStaffRoute(to)}
          onFocus={() => prefetchStaffRoute(to)}
          className={({ isActive }) =>
            `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-white/20 ${
              isActive ? theme.activeNav : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span
                  aria-hidden
                  className={`console-nav-indicator absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full ${theme.indicator}`}
                />
              )}
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-150 ${
                  isActive ? theme.activeIconWrap : 'bg-white/[0.03] text-zinc-500 group-hover:text-zinc-300'
                }`}
              >
                <Icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
              </span>
              <span className="truncate">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function Brand({ title, theme, BrandIcon }: Pick<ConsoleSidebarProps, 'title' | 'theme' | 'BrandIcon'>) {
  return (
    <div className="flex items-center gap-3">
      <div className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white ${theme.brand}`}>
        <BrandIcon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${theme.label}`}>Ensemble</p>
        <p className="truncate text-sm font-semibold text-white">{title}</p>
      </div>
    </div>
  );
}

function SignedInFooter({ loginPath }: { loginPath: string }) {
  const { user } = useGlobalState();
  const handle = user?.username || user?.handle || 'staff';
  const role = user?.role || user?.staff_role || user?.staffRole || null;
  return (
    <div className="space-y-3 border-t border-white/[0.06] p-4">
      <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-xs font-bold uppercase text-zinc-200">
          {String(handle).charAt(0)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xs font-medium text-zinc-200">@{handle}</span>
          {role && <span className="block truncate text-[10px] text-zinc-500">{role}</span>}
        </span>
        <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-emerald-400" title="Signed in" />
      </div>
      <LogoutButton loginPath={loginPath} />
    </div>
  );
}

/**
 * Staff console navigation: a fixed sidebar from `md` up, and a top bar with a slide-in
 * drawer on phones (the sidebar used to be hidden there, leaving no navigation at all).
 */
export default function ConsoleSidebar({ title, theme, items, homeTo, loginPath, BrandIcon }: ConsoleSidebarProps) {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = items.find((item) =>
    item.to === homeTo ? location.pathname === homeTo : location.pathname.startsWith(item.to)
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r border-white/[0.06] bg-[#08090f]/95 backdrop-blur-2xl md:flex">
        <div className="border-b border-white/[0.06] px-5 py-6">
          <Brand title={title} theme={theme} BrandIcon={BrandIcon} />
        </div>
        <NavItems items={items} homeTo={homeTo} theme={theme} />
        <SignedInFooter loginPath={loginPath} />
      </aside>

      <div className="console-mobile-bar sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/[0.06] bg-[#08090f]/95 px-4 backdrop-blur-xl md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="rounded-lg border border-white/[0.08] p-2 text-zinc-300 hover:text-white"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <p className={`text-[9px] font-semibold uppercase tracking-[0.2em] ${theme.label}`}>{title}</p>
          <p className="truncate text-sm font-semibold text-white">{current?.label || 'Menu'}</p>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Console menu">
          <button type="button" className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} aria-label="Close menu" />
          <div className="console-drawer-panel absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col border-r border-white/[0.08] bg-[#08090f] shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-5">
              <Brand title={title} theme={theme} BrandIcon={BrandIcon} />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-2 text-zinc-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavItems items={items} homeTo={homeTo} theme={theme} onNavigate={() => setOpen(false)} />
            <SignedInFooter loginPath={loginPath} />
          </div>
        </div>
      )}
    </>
  );
}
