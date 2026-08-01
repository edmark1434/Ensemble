import DisputeDesk, { DisputeDeskLoading } from '@/pages/moderator/shared/DisputeDesk';
import type { Dispute } from '../ticketManagement/ticketTypes';

export default function DisputesTab({
  disputes,
  handlers = [],
  onUpdated,
}: {
  disputes: Dispute[];
  handlers?: { id: string | number; name: string; role: string }[];
  onUpdated: () => void;
}) {
  return (
    <DisputeDesk
      disputes={disputes}
      handlers={handlers}
      onUpdated={onUpdated}
      accent="rose"
      endpointBase="/api/admin/disputes"
      deskMode
      deskLabel="Admin"
    />
  );
}

export function DisputesTabLoading() {
  return <DisputeDeskLoading accent="rose" />;
}
