import ModeratorRestrictionsDesk from '../shared/ModeratorRestrictionsDesk';

export default function MarketplaceRestrictions() {
  return (
    <ModeratorRestrictionsDesk
      roleLabel="Marketplace Moderator"
      subtitle="Restrict sellers, issue marketplace violations, and track account activity."
      endpointBase="/api/moderator/restrictions"
      accent="rose"
    />
  );
}
