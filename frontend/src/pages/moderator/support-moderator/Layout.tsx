import { Outlet } from 'react-router-dom';
import SupportModeratorNavbar from './Navbar';
import { ModeratorShell } from '../shared/ModeratorShell';

const SupportModeratorLayout = () => {
  return (
    <ModeratorShell accent="sky">
      <SupportModeratorNavbar />
      <Outlet />
    </ModeratorShell>
  );
};

export default SupportModeratorLayout;
