import ModeratorRestrictionsDesk from '@/pages/moderator/shared/ModeratorRestrictionsDesk';

/**
 * User & Team → Restrictions.
 *
 * Same desk as every moderator Restrictions page; admin uses the full-capability
 * variant and the admin restrictions API.
 */
export default function RestrictionsTab() {
  return (
    <ModeratorRestrictionsDesk
      roleLabel="Admin"
      subtitle="Issue warnings, apply standing actions, and review held accounts across the platform."
      endpointBase="/api/admin/restrictions"
      variant="admin"
      accent="rose"
      embedded
    />
  );
}
