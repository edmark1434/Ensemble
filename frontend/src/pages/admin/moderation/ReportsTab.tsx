import ReportDesk from '@/pages/moderator/shared/ReportDesk';
import type { UserReport } from '../ticketManagement/ticketTypes';

export default function ReportsTab({
  reports,
  onUpdated,
  handlers = [],
}: {
  reports: UserReport[];
  onUpdated: () => void;
  handlers?: { id: string | number; name: string; role?: string }[];
}) {
  return (
    <ReportDesk
      reports={reports}
      onUpdated={onUpdated}
      accent="rose"
      endpointBase="/api/admin/reports"
      deskLabel="Admin"
      handlers={handlers}
    />
  );
}
