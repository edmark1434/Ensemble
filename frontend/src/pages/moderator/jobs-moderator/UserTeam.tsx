import UserTeamPage from '@/pages/admin/userTeam/UserTeamPage';

/** Jobs-scoped User & Team: view, warn, suspend/lock — no bans, credits, teams, or verification. */
export default function JobsUserTeam() {
  return <UserTeamPage variant="jobs" />;
}
