import { Briefcase, Flag, LayoutDashboard, Scale, Ticket, Users } from 'lucide-react';
import ModeratorNavbar from '../shared/ModeratorNavbar';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/moderator/jobs' },
  { label: 'Jobs & Gigs Control', icon: Briefcase, to: '/moderator/jobs/control' },
  { label: 'Ticket Management', icon: Ticket, to: '/moderator/jobs/ticket-management' },
  { label: 'Disputes', icon: Scale, to: '/moderator/jobs/disputes' },
  { label: 'Reports', icon: Flag, to: '/moderator/jobs/reports' },
  { label: 'User & Team', icon: Users, to: '/moderator/jobs/user-team' },
];

const JobsModeratorNavbar = () => (
  <ModeratorNavbar
    accent="emerald"
    title="Jobs & Gigs Console"
    homeTo="/moderator/jobs"
    items={navItems}
    BrandIcon={Briefcase}
  />
);

export default JobsModeratorNavbar;
