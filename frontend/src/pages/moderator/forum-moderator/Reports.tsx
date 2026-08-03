import ModeratorReportsPage from '../shared/ModeratorReportsPage';

export default function ForumReports() {
  return (
    <ModeratorReportsPage
      roleLabel="Forum Moderator"
      subtitle="Forum-only queue with search, advanced filters, and full triage columns."
      endpointBase="/api/moderator/forum/reports"
      accent="violet"
      deskLabel="Forum"
    />
  );
}
