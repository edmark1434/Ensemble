import ModeratorDisputesPage from "../shared/ModeratorDisputesPage";

export default function SupportDisputes() {
  return (
    <ModeratorDisputesPage
      accent="sky"
      roleLabel="Support Moderator"
      deskLabel="Support"
      endpointBase="/api/moderator/support/disputes"
      overviewEndpoint="/api/moderator/support/overview"
      subtitle="Full dispute queue — claim and handle cases, or leave staff replies when another handler is assigned."
    />
  );
}
