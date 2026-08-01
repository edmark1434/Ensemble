import ModeratorReportsPage from '../shared/ModeratorReportsPage';

export default function ForumReports() {
  return (
    <ModeratorReportsPage
      roleLabel="Forum Moderator"
      subtitle="Forum-only queue — groups, discussions, comments, and forum member reports (all cases in this queue, assigned or not)."
      endpointBase="/api/moderator/forum/reports"
      accent="violet"
    />
  );
}
