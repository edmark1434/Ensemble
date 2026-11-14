import UserTeamPage from '@/pages/admin/userTeam/UserTeamPage';

/** Jobs-scoped User & Team: users & teams — warn/suspend/lock only (no bans, credits, or verification). */
export default function JobsUserTeam() {
  return <UserTeamPage variant="jobs" />;
}
