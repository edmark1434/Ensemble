import ModeratorReportsPage from '../shared/ModeratorReportsPage';

export default function SupportReports() {
  return (
    <ModeratorReportsPage
      roleLabel="Support Moderator"
      subtitle="Full platform report desk — forum, marketplace, jobs & gigs, and other member reports."
      endpointBase="/api/moderator/support/reports"
      accent="sky"
    />
  );
}
