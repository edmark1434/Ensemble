import {
  BadgeDollarSign,
  BarChart3,
  ExternalLink,
  LayoutDashboard,
  Settings2,
  ShieldAlert,
  Sparkles,
  Ticket,
  Users,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { NavLink } from 'react-router-dom';

type NavItem = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  to: string;
};

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/admin/dashboard' },
  { label: 'User & Team', icon: Users, to: '/admin/user-team' },
  { label: 'Credit & Economy', icon: BadgeDollarSign, to: '/admin/credit-economy' },
  { label: 'Moderation', icon: ShieldAlert, to: '/admin/moderation' },
  { label: 'Analytics', icon: BarChart3, to: '/admin/analytics' },
  { label: 'Tickets', icon: Ticket, to: '/admin/ticket-management' },
  { label: 'Settings', icon: Settings2, to: '/admin/system-settings' },
];

const AdminNavbar = () => {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r border-white/[0.06] bg-[#08090f]/95 backdrop-blur-2xl md:flex">
      <div className="border-b border-white/[0.06] px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 shadow-lg shadow-rose-500/25">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-300/80">
              Ensemble
            </p>
            <p className="text-sm font-semibold text-white">Admin Console</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
          Menu
        </p>
        {navItems.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={label}
            to={to}
            end={to === '/admin/dashboard'}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-rose-500/20 to-orange-500/10 text-white shadow-inner shadow-rose-500/5'
                  : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                    isActive
                      ? 'bg-rose-500/20 text-rose-300'
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

      <div className="border-t border-white/[0.06] p-4">
        <NavLink
          to="/home"
          className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-xs font-medium text-zinc-400 transition hover:border-white/15 hover:bg-white/[0.06] hover:text-white"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Back to platform
        </NavLink>
      </div>
    </aside>
  );
};

export default AdminNavbar;
