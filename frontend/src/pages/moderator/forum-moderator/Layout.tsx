import { Outlet } from 'react-router-dom';
import ForumModeratorNavbar from './Navbar';
import { ModeratorShell } from '../shared/ModeratorShell';

const ForumModeratorLayout = () => {
  return (
    <ModeratorShell accent="violet">
      <ForumModeratorNavbar />
      <Outlet />
    </ModeratorShell>
  );
};

export default ForumModeratorLayout;
