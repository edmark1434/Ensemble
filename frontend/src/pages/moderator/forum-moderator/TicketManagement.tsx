import ModeratorTicketDesk from '../shared/ModeratorTicketDesk';

/** Forum queue only — Forums / Forum Posts / Groups / Comments / Forum Reports types. */
export default function ForumTicketManagement() {
  return (
    <ModeratorTicketDesk
      roleLabel="Forum Moderator"
      title="Ticket Management"
      subtitle="Forum-only queue: posts, groups, comments, and forum-related tickets (same desk layout as Support)."
      endpointBase="/api/moderator/forum/tickets"
      accent="violet"
      queueKey="forum"
    />
  );
}
