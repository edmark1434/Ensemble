import ModeratorReportsPage from '../shared/ModeratorReportsPage';

/**
 * Forum-scoped report desk: discussions, comments, groups, and forum members.
 * Opens the shared ReportDesk with assign / priority / resolve / dismiss.
 */
export default function ForumReports() {
  return (
    <ModeratorReportsPage
      roleLabel="Forum Moderator"
      subtitle="Forum-only reports (discussions, comments, groups, and members). Search, filter, assign, and resolve from the same case detail the admin console uses."
      endpointBase="/api/moderator/forum/reports"
      accent="violet"
      deskLabel="Forum"
    />
  );
}
