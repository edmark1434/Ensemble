import ModeratorReportsPage from '../shared/ModeratorReportsPage';

/**
 * Marketplace report queue: asset, listing, seller, purchase and order reports only (the API
 * rejects anything else). Each case shows the reported item, its catalog listing and how often
 * the item and seller were reported before; the listing can be delisted or sent back for
 * re-approval from the case, and enforcement (warning or suspension) is issued there too.
 */
export default function MarketplaceReports() {
  return (
    <ModeratorReportsPage
      roleLabel="Marketplace Moderator"
      subtitle="Asset, listing, seller and purchase reports. Open a case to review the reported item and its listing, claim it, then sanction the seller or deny it. Copyright claims can be delisted or sent back for re-approval right from the case."
      endpointBase="/api/moderator/marketplace/reports"
      accent="amber"
      deskLabel="Marketplace"
      listingApiBase="/api/moderator/marketplace"
    />
  );
}
