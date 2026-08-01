import ModeratorDisputesPage from '../shared/ModeratorDisputesPage';

export default function JobsDisputes() {
  return (
    <ModeratorDisputesPage
      accent="emerald"
      roleLabel="Jobs & Gigs Moderator"
      deskLabel="Jobs"
      endpointBase="/api/moderator/jobs/disputes"
      overviewEndpoint="/api/moderator/jobs/overview"
      subtitle="Full dispute queue — view and leave staff replies. Designated handlers manage status and publish to parties."
    />
  );
}
