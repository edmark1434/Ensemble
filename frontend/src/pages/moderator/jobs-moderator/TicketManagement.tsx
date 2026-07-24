import ModeratorTicketDesk from "../shared/ModeratorTicketDesk";

export default function JobsTicketManagement() {
  return (
    <ModeratorTicketDesk
      roleLabel="Jobs & Gigs Moderator"
      title="Ticket Management"
      subtitle="Job posts, gigs, applications, contracts and milestones."
      endpointBase="/api/moderator/jobs/tickets"
      accent="emerald"
      queueKey="jobs"
    />
  );
}
