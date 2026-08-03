import { Outlet } from 'react-router-dom';
import MarketplaceModeratorNavbar from './Navbar';
import { ModeratorShell } from '../shared/ModeratorShell';

const MarketplaceModeratorLayout = () => {
  return (
    <ModeratorShell accent="amber">
      <MarketplaceModeratorNavbar />
      <Outlet />
    </ModeratorShell>
  );
};

export default MarketplaceModeratorLayout;
