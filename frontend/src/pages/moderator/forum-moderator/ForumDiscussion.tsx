import { useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ForumModerationDesk from '@/pages/admin/moderation/ForumModerationDesk';

const BASE = '/moderator/forum/forum-control';

/**
 * Forum Moderator → Forum Control.
 *
 * Single desk for live discussions and groups (Mongo). Lock, pin, remove,
 * restore, comment removal, member bans, and group archiving. Same shared
 * component as admin Moderation → Management → Forum, pointed at the
 * moderator API so both consoles stay in sync.
 *
 * `?view=groups` opens the group roster; default is discussions.
 * `?group=<id>` / `?discussion=<id>` open that item's review (dashboard links).
 */
export default function ForumDiscussion() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialView = searchParams.get('view') === 'groups' ? 'groups' : 'discussions';
  const groupId = searchParams.get('group');
  const discussionId = searchParams.get('discussion');

  const openTarget = useMemo(() => {
    if (discussionId) return { kind: 'discussion' as const, id: discussionId };
    if (groupId) return { kind: 'group' as const, id: groupId };
    return null;
  }, [discussionId, groupId]);

  const go = useCallback(
    (next: URLSearchParams) => {
      const qs = next.toString();
      navigate(qs ? `${BASE}?${qs}` : BASE, { replace: true });
    },
    [navigate]
  );

  const onViewChange = useCallback(
    (view: 'groups' | 'discussions') => {
      const next = new URLSearchParams(searchParams);
      if (view === 'groups') next.set('view', 'groups');
      else next.delete('view');
      go(next);
    },
    [go, searchParams]
  );

  const onDetailClose = useCallback(() => {
    if (!searchParams.has('group') && !searchParams.has('discussion')) return;
    const next = new URLSearchParams(searchParams);
    next.delete('group');
    next.delete('discussion');
    go(next);
  }, [go, searchParams]);

  return (
    <main className="min-h-screen md:pl-[260px]">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#06070c]/90 backdrop-blur-xl">
        <div className="px-6 py-4 md:px-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-400/80">
            Forum Moderator
          </p>
          <h1 className="text-xl font-bold text-white">Forum Control</h1>
          <p className="mt-1 max-w-3xl text-xs text-zinc-500">
            See the forum the way members do: posts with their authors, groups with their pictures and
            members. Lock or pin threads, hide posts and comments, ban members from a group, and archive
            groups that break the rules. Switch to Table for every count at a glance, or open any item
            as a member in platform view. Nothing is permanently deleted: every removal can be restored
            here, and every action is written to the moderation activity log.
          </p>
        </div>
      </header>

      <div className="space-y-6 px-6 py-6 md:px-8 md:py-8">
        <ForumModerationDesk
          apiBase="/api/moderator/forum"
          initialView={initialView}
          accent="violet"
          onViewChange={onViewChange}
          openTarget={openTarget}
          onDetailClose={onDetailClose}
        />
      </div>
    </main>
  );
}
