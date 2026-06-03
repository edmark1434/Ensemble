import {
  BadgeDollarSign,
  BarChart3,
  Bell,
  Gem,
  LayoutDashboard,
  Settings2,
  ShieldAlert,
  Ticket,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";
import { NavLink } from "react-router-dom";

type NavItem = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  to: string;
};

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/admin/dashboard" },
  { label: "User & Team", icon: Users, to: "/admin/user-team" },
  { label: "Credit & Economy", icon: BadgeDollarSign, to: "/admin/credit-economy" },
  { label: "Moderation", icon: ShieldAlert, to: "/admin/moderation" },
  { label: "Analytics", icon: BarChart3, to: "/admin/analytics" },
  { label: "Ticket Management", icon: Ticket, to: "/admin/ticket-management" },
  { label: "System Settings", icon: Settings2, to: "/admin/system-settings" },
];

const navClassName = (isActive: boolean) =>
  `flex w-full items-center gap-3 rounded-md border px-3 py-2 text-sm transition ${
    isActive
      ? "border-white/20 bg-white/10 text-white"
      : "border-transparent text-zinc-300 hover:border-white/15 hover:bg-white/5 hover:text-white"
  }`;

const AdminNavbar = () => {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-white/10 bg-black/40 backdrop-blur-xl md:flex md:flex-col">
      <div className="flex items-center gap-4 border-b border-white/10 px-6 py-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black">
          <Gem className="h-7 w-7" />
        </div>
        <div>
          <p className="text-lg font-semibold leading-tight tracking-wide text-white">Platform</p>
          <p className="text-lg font-semibold leading-tight tracking-wide text-white">Administrator</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1.5">
          {navItems.map(({ label, icon: Icon, to }) => (
            <li key={label}>
              <NavLink to={to} end={to === "/admin/dashboard"} className={({ isActive }) => navClassName(isActive)}>
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center justify-between rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-zinc-300">
          <span>Go to platform</span>
          <Bell className="h-4 w-4 text-yellow-300" />
        </div>
      </div>
    </aside>
  );
};

export default AdminNavbar;
