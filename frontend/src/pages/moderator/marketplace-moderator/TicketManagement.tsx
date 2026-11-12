import ModeratorTicketDesk from "../shared/ModeratorTicketDesk";

/**
 * Marketplace-only ticket desk. The API and the desk both scope to marketplace ticket
 * types; a ticket filed under the wrong type is moved from its detail view (Move ticket),
 * which hands it to the right queue and drops it from this one.
 */
export default function TicketManagement() {
  return (
    <ModeratorTicketDesk
      roleLabel="Marketplace Moderator"
      title="Ticket Management"
      subtitle="Seller verification, listing review, purchases and downloads, refunds, asset reviews and marketplace appeals. Filed under the wrong type? Open the ticket and use Move ticket to send it to the right queue, or escalate it to an admin."
      endpointBase="/api/moderator/marketplace/tickets"
      accent="amber"
      queueKey="marketplace"
    />
  );
}
