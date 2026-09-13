import ModeratorRestrictionsDesk from '../shared/ModeratorRestrictionsDesk';

export default function JobsRestrictions() {
  return (
    <ModeratorRestrictionsDesk
      roleLabel="Jobs & Gigs Moderator"
      subtitle="Apply job-market enforcement actions and review the account activity timeline."
      endpointBase="/api/moderator/jobs/restrictions"
      accent="emerald"
    />
  );
}
