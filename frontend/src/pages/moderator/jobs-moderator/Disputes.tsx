import ModeratorDisputesPage from '../shared/ModeratorDisputesPage';

export default function JobsDisputes() {
  return (
    <ModeratorDisputesPage
      accent="emerald"
      roleLabel="Jobs & Gigs Moderator"
      deskLabel="Jobs"
      endpointBase="/api/moderator/jobs/disputes"
      overviewEndpoint="/api/moderator/jobs/overview"
      subtitle="View and leave staff replies. Only Support Moderators or Admin can claim, update status, or publish."
    />
  );
}
