import StaffOutlet from '@/pages/staff/StaffOutlet';
import ForumModeratorNavbar from './Navbar';
import { ModeratorShell } from '../shared/ModeratorShell';

const ForumModeratorLayout = () => {
  return (
    <ModeratorShell accent="violet">
      <ForumModeratorNavbar />
      <StaffOutlet consoleId="forum" />
    </ModeratorShell>
  );
};

export default ForumModeratorLayout;
