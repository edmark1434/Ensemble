import { Briefcase, LayoutDashboard, Scale, Ticket } from 'lucide-react';
import ModeratorNavbar from '../shared/ModeratorNavbar';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/moderator/jobs' },
  { label: 'Jobs & Gigs Control', icon: Briefcase, to: '/moderator/jobs/control' },
  { label: 'Ticket Management', icon: Ticket, to: '/moderator/jobs/ticket-management' },
  { label: 'Disputes', icon: Scale, to: '/moderator/jobs/disputes' },
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
