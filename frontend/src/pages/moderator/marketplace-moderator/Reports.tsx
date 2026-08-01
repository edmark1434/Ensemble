import ModeratorReportsPage from '../shared/ModeratorReportsPage';

export default function MarketplaceReports() {
  return (
    <ModeratorReportsPage
      roleLabel="Marketplace Moderator"
      subtitle="Marketplace-only queue with search, advanced filters, and triage columns."
      endpointBase="/api/moderator/marketplace/reports"
      accent="amber"
      deskLabel="Marketplace"
    />
  );
}
