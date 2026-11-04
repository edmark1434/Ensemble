import { LayoutDashboard } from 'lucide-react';
import StaffOutlet from './StaffOutlet';
import useGlobalState from '@/lib/global_state';
import ModeratorNavbar from '@/pages/moderator/shared/ModeratorNavbar';
import { ModeratorShell } from '@/pages/moderator/shared/ModeratorShell';

const StaffPortalLayout = () => {
  const { user } = useGlobalState();
  const roleLabel = user?.role ? String(user.role) : 'Staff';

  return (
    <ModeratorShell accent="emerald">
      <ModeratorNavbar
        accent="emerald"
        title={roleLabel}
        homeTo="/staff/dashboard"
        items={[{ label: 'Dashboard', icon: LayoutDashboard, to: '/staff/dashboard' }]}
      />
      <StaffOutlet consoleId="staff" />
    </ModeratorShell>
  );
};

export default StaffPortalLayout;
