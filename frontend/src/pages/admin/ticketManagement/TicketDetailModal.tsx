import TicketDetailModalShell from './TicketDetailModalShell';

export default function TicketDetailModal({
  ticketId,
  onClose,
  onUpdated,
}: {
  ticketId: number | string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  return (
    <TicketDetailModalShell
      ticketId={ticketId}
      endpointBase="/api/admin/tickets"
      accent="rose"
      onClose={onClose}
      onUpdated={onUpdated}
    />
  );
}
