import ModeratorReportsPage from '../shared/ModeratorReportsPage';

export default function JobsReports() {
  return (
    <ModeratorReportsPage
      roleLabel="Jobs & Gigs Moderator"
      subtitle="Jobs & gigs-only queue — jobs, gigs, contracts, and related posting reports (all cases in this queue, assigned or not)."
      endpointBase="/api/moderator/jobs/reports"
      accent="emerald"
    />
  );
}
