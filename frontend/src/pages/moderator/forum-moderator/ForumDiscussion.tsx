import { useSearchParams } from 'react-router-dom';
import ForumModerationDesk from '@/pages/admin/moderation/ForumModerationDesk';

/**
 * Forum Moderator → Forum Discussion.
 *
 * The live content desk: discussions and groups from MongoDB with lock, pin,
 * remove, restore, comment removal, member bans and group archiving. It is the
 * same component the admin console mounts, pointed at the moderator routes, so
 * both desks keep the same actions and the same audit trail.
 *
 * `?view=groups` opens the group roster directly.
 */
export default function ForumDiscussion() {
  const [searchParams] = useSearchParams();
  const initialView = searchParams.get('view') === 'groups' ? 'groups' : 'discussions';

  return (
    <main
      className="relative z-10 min-h-screen px-6 py-8 md:pl-[260px] md:px-10"
      style={{ animation: 'fadeIn 420ms ease' }}
    >
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-400">
          Forum Moderator
        </p>
        <h1 className="text-2xl font-bold text-white">Forum Discussion</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-500">
          Review live discussions and groups. Locking, pinning, removals and member bans take effect
          immediately and are recorded against the author's account.
        </p>
      </div>

      <ForumModerationDesk apiBase="/api/moderator/forum" initialView={initialView} />
    </main>
  );
}
