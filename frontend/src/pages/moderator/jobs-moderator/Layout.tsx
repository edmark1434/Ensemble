import StaffOutlet from '@/pages/staff/StaffOutlet';
import JobsModeratorNavbar from './Navbar';
import { ModeratorShell } from '../shared/ModeratorShell';

const JobsModeratorLayout = () => {
  return (
    <ModeratorShell accent="emerald">
      <JobsModeratorNavbar />
      <StaffOutlet consoleId="jobs" />
    </ModeratorShell>
  );
};

export default JobsModeratorLayout;
