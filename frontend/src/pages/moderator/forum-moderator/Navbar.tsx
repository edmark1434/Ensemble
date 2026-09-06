import {
  LayoutDashboard,
  Flag,
  MessagesSquare,
  Scale,
  ShieldBan,
  Ticket,
  Users,
} from 'lucide-react';
import ModeratorNavbar from '../shared/ModeratorNavbar';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/moderator/forum' },
  { label: 'Forum Discussion', icon: MessagesSquare, to: '/moderator/forum/forum-discussion' },
  { label: 'Ticket Management', icon: Ticket, to: '/moderator/forum/ticket-management' },
  { label: 'Disputes', icon: Scale, to: '/moderator/forum/disputes' },
  { label: 'Reports', icon: Flag, to: '/moderator/forum/reports' },
  { label: 'Restrictions', icon: ShieldBan, to: '/moderator/forum/restrictions' },
  { label: 'User & Team', icon: Users, to: '/moderator/forum/user-team' },
];

const ForumModeratorNavbar = () => (
  <ModeratorNavbar
    accent="violet"
    title="Forum Console"
    homeTo="/moderator/forum"
    items={navItems}
  />
);

export default ForumModeratorNavbar;
