import ModeratorTicketDesk from "../shared/ModeratorTicketDesk";

export default function TicketManagement() {
  return (
    <ModeratorTicketDesk
      roleLabel="Marketplace Moderator"
      title="Ticket Management"
      subtitle="Listings, purchases, seller verification, refunds and asset quality."
      endpointBase="/api/moderator/marketplace/tickets"
      accent="rose"
      queueKey="marketplace"
    />
  );
}
