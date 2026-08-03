import { Flag, LayoutDashboard, Scale, ShoppingBag, Ticket, Users } from 'lucide-react';
import ModeratorNavbar from '../shared/ModeratorNavbar';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/moderator/marketplace' },
  { label: 'Marketplace Control', icon: ShoppingBag, to: '/moderator/marketplace/marketplace-control' },
  { label: 'Ticket Management', icon: Ticket, to: '/moderator/marketplace/ticket-management' },
  { label: 'Disputes', icon: Scale, to: '/moderator/marketplace/disputes' },
  { label: 'Reports', icon: Flag, to: '/moderator/marketplace/reports' },
  { label: 'User & Team', icon: Users, to: '/moderator/marketplace/user-team' },
];

const MarketplaceModeratorNavbar = () => (
  <ModeratorNavbar
    accent="amber"
    title="Marketplace Console"
    homeTo="/moderator/marketplace"
    items={navItems}
  />
);

export default MarketplaceModeratorNavbar;
