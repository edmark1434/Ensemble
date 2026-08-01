import { Flag, LayoutDashboard, Scale, Ticket, Users } from 'lucide-react';
import ModeratorNavbar from '../shared/ModeratorNavbar';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/moderator/support' },
  { label: 'Ticket Management', icon: Ticket, to: '/moderator/support/ticket-management' },
  { label: 'Disputes', icon: Scale, to: '/moderator/support/disputes' },
  { label: 'Reports', icon: Flag, to: '/moderator/support/reports' },
  { label: 'User & Team', icon: Users, to: '/moderator/support/user-team' },
];

const SupportModeratorNavbar = () => (
  <ModeratorNavbar
    accent="sky"
    title="Support Console"
    homeTo="/moderator/support"
    items={navItems}
  />
);

export default SupportModeratorNavbar;
