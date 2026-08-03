import ModeratorDisputesPage from '../shared/ModeratorDisputesPage';

export default function ForumDisputes() {
  return (
    <ModeratorDisputesPage
      accent="violet"
      roleLabel="Forum Moderator"
      deskLabel="Forum"
      endpointBase="/api/moderator/forum/disputes"
      overviewEndpoint="/api/moderator/forum/overview"
    />
  );
}
