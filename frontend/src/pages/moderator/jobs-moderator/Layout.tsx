import { Outlet } from 'react-router-dom';
import JobsModeratorNavbar from './Navbar';
import { ModeratorShell } from '../shared/ModeratorShell';

const JobsModeratorLayout = () => {
  return (
    <ModeratorShell accent="emerald">
      <JobsModeratorNavbar />
      <Outlet />
    </ModeratorShell>
  );
};

export default JobsModeratorLayout;
