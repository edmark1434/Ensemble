import {
  BadgeDollarSign,
  BarChart3,
  Eye,
  LayoutDashboard,
  Settings2,
  ShieldAlert,
  Sparkles,
  Ticket,
  Users,
} from 'lucide-react';
import { ADMIN_LOGIN_PATH } from '@/lib/staffRoutes';
import ConsoleSidebar, { type ConsoleNavItem, type ConsoleSidebarTheme } from '@/pages/staff/ConsoleSidebar';

const navItems: ConsoleNavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/admin/dashboard' },
  { label: 'User & Team', icon: Users, to: '/admin/user-team' },
  { label: 'Credit & Economy', icon: BadgeDollarSign, to: '/admin/credit-economy' },
  { label: 'Moderation', icon: ShieldAlert, to: '/admin/moderation' },
  { label: 'Analytics', icon: BarChart3, to: '/admin/analytics' },
  { label: 'Tickets', icon: Ticket, to: '/admin/ticket-management' },
  { label: 'Settings', icon: Settings2, to: '/admin/system-settings' },
  { label: 'Platform view', icon: Eye, to: '/admin/platform-view' },
];

const ADMIN_THEME: ConsoleSidebarTheme = {
  label: 'text-rose-300/80',
  brand: 'bg-gradient-to-br from-rose-500 to-orange-500 shadow-lg shadow-rose-500/25',
  activeNav: 'bg-rose-500/[0.12] text-white',
  activeIconWrap: 'bg-rose-500/20 text-rose-300',
  indicator: 'bg-rose-400',
};

const AdminNavbar = () => (
  <ConsoleSidebar
    title="Admin Console"
    theme={ADMIN_THEME}
    items={navItems}
    homeTo="/admin/dashboard"
    loginPath={ADMIN_LOGIN_PATH}
    BrandIcon={Sparkles}
  />
);

export default AdminNavbar;
