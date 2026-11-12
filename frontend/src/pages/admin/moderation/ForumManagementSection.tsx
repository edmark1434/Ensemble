import ForumModerationDesk from './ForumModerationDesk';

/**
 * Moderation → Management → Forum.
 *
 * The desk itself is shared with the Forum Moderator console; only the API root
 * differs, so the two desks cannot drift apart.
 */
export default function ForumManagementSection() {
  return <ForumModerationDesk apiBase="/api/admin/moderation/forum" />;
}
