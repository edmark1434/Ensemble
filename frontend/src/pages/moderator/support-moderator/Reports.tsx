import ModeratorReportsPage from '../shared/ModeratorReportsPage';

export default function SupportReports() {
  return (
    <ModeratorReportsPage
      roleLabel="Support Moderator"
      subtitle="Full platform report desk with search, advanced filters, and triage columns."
      endpointBase="/api/moderator/support/reports"
      accent="sky"
      deskLabel="Support"
    />
  );
}
