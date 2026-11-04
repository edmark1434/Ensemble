import StaffOutlet from '@/pages/staff/StaffOutlet';
import SupportModeratorNavbar from './Navbar';
import { ModeratorShell } from '../shared/ModeratorShell';

const SupportModeratorLayout = () => {
  return (
    <ModeratorShell accent="sky">
      <SupportModeratorNavbar />
      <StaffOutlet consoleId="support" />
    </ModeratorShell>
  );
};

export default SupportModeratorLayout;
