import ModeratorReportsPage, { type ReportScopeOption } from '../shared/ModeratorReportsPage';

const SUPPORT_REPORT_SCOPES: ReportScopeOption[] = [
  {
    id: 'support',
    label: 'Support scope',
    hint: 'Accounts, direct messages, teams and technical problems — reports no specialist desk owns.',
  },
  {
    id: 'all',
    label: 'All platform',
    hint: 'Every report on the platform. Forum, marketplace and jobs reports are claimed by their own desks — review them here for context.',
  },
];

export default function SupportReports() {
  return (
    <ModeratorReportsPage
      roleLabel="Support Moderator"
      subtitle="Triage member reports: claim a case, review the reported item and its links, then sanction (warning, suspension or ban) or deny. Sanctions notify the reporter."
      endpointBase="/api/moderator/support/reports"
      accent="sky"
      deskLabel="Support"
      scopeOptions={SUPPORT_REPORT_SCOPES}
    />
  );
}
