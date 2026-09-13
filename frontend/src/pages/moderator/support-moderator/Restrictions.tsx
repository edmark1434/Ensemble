import ModeratorRestrictionsDesk from '../shared/ModeratorRestrictionsDesk';

export default function SupportRestrictions() {
  return (
    <ModeratorRestrictionsDesk
      roleLabel="Support Moderator"
      subtitle="Issue violations, manage account restrictions, and review the shared account activity timeline."
      endpointBase="/api/moderator/support/restrictions"
      accent="sky"
    />
  );
}
