import ModeratorTicketDesk from "../shared/ModeratorTicketDesk";

/**
 * Jobs & Gigs-only ticket desk. The API and the desk both scope to Jobs & Gigs ticket
 * types; a ticket filed under the wrong type is moved from its detail view (Move ticket),
 * either to the right Jobs & Gigs type or to another moderator queue, or escalated to Admin.
 */
export default function JobsTicketManagement() {
  return (
    <ModeratorTicketDesk
      roleLabel="Jobs & Gigs Moderator"
      title="Ticket Management"
      subtitle="Job and gig listings, proposals and hiring, contracts and orders, delivery, cancellations, reviews and Jobs & Gigs appeals. Filed under the wrong type? Open the ticket and use Move ticket to send it to the right category or queue, or escalate it to an admin."
      endpointBase="/api/moderator/jobs/tickets"
      accent="emerald"
      queueKey="jobs"
    />
  );
}
