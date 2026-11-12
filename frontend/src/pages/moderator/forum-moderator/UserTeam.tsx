import UserTeamPage from '@/pages/admin/userTeam/UserTeamPage';

/** Forum-scoped User & Team: users & teams — warn/suspend/lock only (no bans, credits, or verification). */
export default function ForumUserTeam() {
  return <UserTeamPage variant="forum" />;
}
