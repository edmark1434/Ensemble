import TicketDetailModalShell from "@/pages/admin/ticketManagement/TicketDetailModalShell";
import type { Accent } from "./ui";

/**
 * Generic moderator ticket detail modal.
 * `endpointBase` is the tickets base path, e.g. "/api/moderator/support/tickets".
 */
export default function ModeratorTicketDetailModal({
  ticketId,
  endpointBase,
  accent = "sky",
  allowEscalate = true,
  statusControl = "buttons",
  onClose,
  onUpdated,
}: {
  ticketId: number | string;
  endpointBase: string;
  accent?: Accent;
  allowEscalate?: boolean;
  statusControl?: "select" | "buttons";
  onClose: () => void;
  onUpdated: () => void;
}) {
  return (
    <TicketDetailModalShell
      ticketId={ticketId}
      endpointBase={endpointBase}
      accent={accent}
      allowEscalate={allowEscalate}
      statusControl={statusControl}
      onClose={onClose}
      onUpdated={onUpdated}
    />
  );
}
