import { Gem, LayoutDashboard, MessageSquare, Scale, ShieldAlert, Ticket, Users } from "lucide-react";
import type { ComponentType } from "react";
import { NavLink } from "react-router-dom";
import LogoutButton from "../shared/LogoutButton";

type NavItem = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  to: string;
};

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/moderator/support" },
  { label: "Chat Support", icon: MessageSquare, to: "/moderator/support/chat-support" },
  { label: "Ticket Management", icon: Ticket, to: "/moderator/support/ticket-management" },
  { label: "Disputes", icon: Scale, to: "/moderator/support/disputes" },
  { label: "User & Team", icon: Users, to: "/moderator/support/user-team" },
  { label: "Restrictions", icon: ShieldAlert, to: "/moderator/support/restrictions" },
];

const navClassName = (isActive: boolean) =>
  `flex w-full items-center gap-3 rounded-md border px-3 py-2 text-sm transition ${
    isActive
      ? "border-white/20 bg-white/10 text-white"
      : "border-transparent text-zinc-300 hover:border-white/15 hover:bg-white/5 hover:text-white"
  }`;

const SupportModeratorNavbar = () => {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-white/10 bg-black/40 backdrop-blur-xl md:flex md:flex-col">
      <div className="flex items-center gap-4 border-b border-white/10 px-6 py-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black">
          <Gem className="h-7 w-7" />
        </div>
        <div>
          <p className="text-[13px] font-semibold leading-tight tracking-wide text-white">Platform</p>
          <p className="text-[13px] font-semibold leading-tight tracking-wide text-white">Support Moderator</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1.5">
          {navItems.map(({ label, icon: Icon, to }) => (
            <li key={label}>
              <NavLink to={to} end={to === "/moderator/support"} className={({ isActive }) => navClassName(isActive)}>
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-2 border-t border-white/10 p-4">
        <div className="flex items-center justify-between rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-zinc-300">
          <span>Go to platform</span>
          <span className="text-yellow-300">*</span>
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
};

export default SupportModeratorNavbar;
