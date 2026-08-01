import ModeratorReportsPage from '../shared/ModeratorReportsPage';

export default function MarketplaceReports() {
  return (
    <ModeratorReportsPage
      roleLabel="Marketplace Moderator"
      subtitle="Marketplace-only queue — listings, sellers, purchases, and related marketplace reports (all cases in this queue, assigned or not)."
      endpointBase="/api/moderator/marketplace/reports"
      accent="amber"
    />
  );
}
