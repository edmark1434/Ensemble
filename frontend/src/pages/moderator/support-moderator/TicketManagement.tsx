import ModeratorTicketDesk from "../shared/ModeratorTicketDesk";

export default function SupportTicketManagement() {
  return (
    <ModeratorTicketDesk
      roleLabel="Support Moderator"
      title="Ticket Management"
      subtitle="Triage, chat, escalate and resolve support-scope tickets (Account Access, Credit Top-ups, Video Editor…)."
      endpointBase="/api/moderator/support/tickets"
      accent="sky"
      queueKey="support"
    />
  );
}
