import { LayoutDashboard, ShieldAlert, ShoppingBag, Ticket } from 'lucide-react';
import ModeratorNavbar from '../shared/ModeratorNavbar';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/moderator/marketplace' },
  { label: 'Marketplace Control', icon: ShoppingBag, to: '/moderator/marketplace/marketplace-control' },
  { label: 'Ticket Management', icon: Ticket, to: '/moderator/marketplace/ticket-management' },
  { label: 'Restrictions', icon: ShieldAlert, to: '/moderator/marketplace/restrictions' },
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
