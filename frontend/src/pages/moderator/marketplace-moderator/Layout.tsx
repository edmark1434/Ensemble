import StaffOutlet from '@/pages/staff/StaffOutlet';
import MarketplaceModeratorNavbar from './Navbar';
import { ModeratorShell } from '../shared/ModeratorShell';

const MarketplaceModeratorLayout = () => {
  return (
    <ModeratorShell accent="amber">
      <MarketplaceModeratorNavbar />
      <StaffOutlet consoleId="marketplace" />
    </ModeratorShell>
  );
};

export default MarketplaceModeratorLayout;
