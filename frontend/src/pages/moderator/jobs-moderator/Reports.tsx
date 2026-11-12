import ModeratorReportsPage from '../shared/ModeratorReportsPage';

/**
 * Jobs & Gigs-only report queue: job, gig, contract, proposal and review reports.
 * Open a case to see the reported posting or contract, then deny or sanction from it —
 * sanctions are the enforcement path for this console now that it has no Restrictions tab.
 */
export default function JobsReports() {
  return (
    <ModeratorReportsPage
      roleLabel="Jobs & Gigs Moderator"
      subtitle="Reports on jobs, gigs, contracts, proposals and reviews. Open a case to review the reported item, assign it, then deny it or sanction the account."
      endpointBase="/api/moderator/jobs/reports"
      accent="emerald"
      deskLabel="Jobs & Gigs"
    />
  );
}
