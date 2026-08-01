import UserTeamPage from '@/pages/admin/userTeam/UserTeamPage';

/** Forum-scoped User & Team: view, warn, suspend/lock — no bans, credits, teams, or verification. */
export default function ForumUserTeam() {
  return <UserTeamPage variant="forum" />;
}
