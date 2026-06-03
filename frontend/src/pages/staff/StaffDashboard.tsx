import PortalEmptyDashboard from '@/components/portal/PortalEmptyDashboard';
import useGlobalState from '@/lib/global_state';

const StaffDashboard = () => {
  const { user } = useGlobalState();
  const roleLabel = user?.role ?? 'Staff';

  return (
    <PortalEmptyDashboard
      title="Staff Dashboard"
      subtitle={`Signed in as ${roleLabel}. More tools will be added here.`}
    />
  );
};

export default StaffDashboard;
