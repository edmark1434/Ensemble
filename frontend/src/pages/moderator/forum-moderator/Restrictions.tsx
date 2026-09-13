import ModeratorRestrictionsDesk from '../shared/ModeratorRestrictionsDesk';

export default function ForumRestrictions() {
  return (
    <ModeratorRestrictionsDesk
      roleLabel="Forum Moderator"
      subtitle="Enforce forum policy with violations, account holds, and the live account activity feed."
      endpointBase="/api/moderator/forum/restrictions"
      accent="violet"
    />
  );
}
