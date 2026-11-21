import ReportDesk from '@/pages/moderator/shared/ReportDesk';
import { useStaffCaseEvents } from '@/lib/staffCaseEvents';
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
  // New reports and other staff's claims or decisions refresh the queue.
  useStaffCaseEvents(['report'], () => onUpdated(), { delayMs: 800 });

  return (
    <ReportDesk
      reports={reports}
      onUpdated={onUpdated}
      accent="rose"
      endpointBase="/api/admin/reports"
      forumContentApiBase="/api/admin/moderation/forum"
      deskLabel="Admin"
      handlers={handlers}
    />
  );
}
