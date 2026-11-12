import ModeratorReportsPage from '../shared/ModeratorReportsPage';

/**
 * Marketplace report queue: asset, listing, seller, purchase and order reports only (the API
 * rejects anything else). Each case shows the reported item with a link to the live asset,
 * and enforcement (warning or suspension) is issued from the case itself.
 */
export default function MarketplaceReports() {
  return (
    <ModeratorReportsPage
      roleLabel="Marketplace Moderator"
      subtitle="Asset, listing, seller and purchase reports. Open a case to review the reported item, claim it, set priority, and resolve it with a warning or suspension — or deny it. For a copyright claim on a live asset, delist or re-review it from Marketplace Control."
      endpointBase="/api/moderator/marketplace/reports"
      accent="amber"
      deskLabel="Marketplace"
    />
  );
}
