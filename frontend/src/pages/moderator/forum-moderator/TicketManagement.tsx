import ModeratorTicketDesk from "../shared/ModeratorTicketDesk";

export default function ForumTicketManagement() {
  return (
    <ModeratorTicketDesk
      roleLabel="Forum Moderator"
      title="Ticket Management"
      subtitle="Forum posts, groups, comments, and forum reports."
      endpointBase="/api/moderator/forum/tickets"
      accent="violet"
      queueKey="forum"
    />
  );
}
