import UserTeamPage from '@/pages/admin/userTeam/UserTeamPage';

/** Marketplace-scoped User & Team: view, warn, suspend/lock — no bans, credits, teams, or verification. */
export default function MarketplaceUserTeam() {
  return <UserTeamPage variant="marketplace" />;
}
