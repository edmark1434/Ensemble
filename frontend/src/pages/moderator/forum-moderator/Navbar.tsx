import {
  LayoutDashboard,
  MessageSquare,
  MessagesSquare,
  Ticket,
  Users,
  UsersRound,
} from 'lucide-react';
import ModeratorNavbar from '../shared/ModeratorNavbar';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/moderator/forum' },
  { label: 'Forum Groups', icon: UsersRound, to: '/moderator/forum/groups' },
  { label: 'Discussions', icon: MessagesSquare, to: '/moderator/forum/discussions' },
  { label: 'Forum Management', icon: MessageSquare, to: '/moderator/forum/forum-management' },
  { label: 'Ticket Management', icon: Ticket, to: '/moderator/forum/ticket-management' },
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
