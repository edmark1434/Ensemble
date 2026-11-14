import ModeratorTicketDesk from "../shared/ModeratorTicketDesk";

/**
 * Marketplace-only ticket desk. The API and the desk both scope to marketplace ticket types
 * that Admin has not taken over. From a ticket's detail view a moderator can change its
 * category inside the marketplace desk (misfiled type), send it to another desk, or escalate
 * it to Admin — the last two drop it from this queue.
 */
export default function TicketManagement() {
  return (
    <ModeratorTicketDesk
      roleLabel="Marketplace Moderator"
      title="Ticket Management"
      subtitle="Seller verification, listing review, purchases and downloads, broken files, refunds, asset reviews and marketplace appeals. Filed under the wrong category? Open the ticket and use Change category, send it to the right desk, or escalate it to Admin."
      endpointBase="/api/moderator/marketplace/tickets"
      accent="amber"
      queueKey="marketplace"
    />
  );
}
