import ModeratorTicketDesk from '../shared/ModeratorTicketDesk';

/**
 * Forum-only ticket queue.
 *
 * Scoped to forum types (posts, groups, report-a-post, forum appeals). Open a
 * ticket to reply, claim, escalate to another moderator queue, or move it to a
 * different category when the member filed it under the wrong type.
 */
export default function ForumTicketManagement() {
  return (
    <ModeratorTicketDesk
      roleLabel="Forum Moderator"
      title="Ticket Management"
      subtitle="Forum-only queue: posts and replies, groups, report a post or member, and forum appeals. Escalate or move a ticket to another category when it was filed in the wrong place."
      endpointBase="/api/moderator/forum/tickets"
      accent="violet"
      queueKey="forum"
    />
  );
}
