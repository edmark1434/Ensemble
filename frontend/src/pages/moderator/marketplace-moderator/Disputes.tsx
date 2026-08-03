import ModeratorDisputesPage from '../shared/ModeratorDisputesPage';

export default function MarketplaceDisputes() {
  return (
    <ModeratorDisputesPage
      accent="amber"
      roleLabel="Marketplace Moderator"
      deskLabel="Marketplace"
      endpointBase="/api/moderator/marketplace/disputes"
      overviewEndpoint="/api/moderator/marketplace/overview"
    />
  );
}
