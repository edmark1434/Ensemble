import ModeratorReportsPage from '../shared/ModeratorReportsPage';

export default function JobsReports() {
  return (
    <ModeratorReportsPage
      roleLabel="Jobs & Gigs Moderator"
      subtitle="Jobs & gigs-only queue with search, advanced filters, and triage columns."
      endpointBase="/api/moderator/jobs/reports"
      accent="emerald"
      deskLabel="Jobs"
    />
  );
}
