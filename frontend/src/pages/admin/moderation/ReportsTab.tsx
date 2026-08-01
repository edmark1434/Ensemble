import ReportDesk from '@/pages/moderator/shared/ReportDesk';
import type { UserReport } from '../ticketManagement/ticketTypes';

export default function ReportsTab({
  reports,
  onUpdated,
}: {
  reports: UserReport[];
  onUpdated: () => void;
}) {
  return (
    <ReportDesk
      reports={reports}
      onUpdated={onUpdated}
      accent="rose"
      endpointBase="/api/admin/reports"
    />
  );
}
