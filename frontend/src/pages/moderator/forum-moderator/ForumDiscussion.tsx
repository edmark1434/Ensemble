import { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ForumModerationDesk from '@/pages/admin/moderation/ForumModerationDesk';

/**
 * Forum Moderator → Forum Control.
 *
 * Single desk for live discussions and groups (Mongo). Lock, pin, remove,
 * restore, comment removal, member bans, and group archiving. Same shared
 * component as admin Moderation → Management → Forum, pointed at the
 * moderator API so both consoles stay in sync.
 *
 * `?view=groups` opens the group roster; default is discussions.
 */
export default function ForumDiscussion() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialView = searchParams.get('view') === 'groups' ? 'groups' : 'discussions';

  const onViewChange = useCallback(
    (view: 'groups' | 'discussions') => {
      const next = new URLSearchParams(searchParams);
      if (view === 'groups') next.set('view', 'groups');
      else next.delete('view');
      const qs = next.toString();
      navigate(
        qs ? `/moderator/forum/forum-control?${qs}` : '/moderator/forum/forum-control',
        { replace: true }
      );
    },
    [navigate, searchParams]
  );

  return (
    <main className="min-h-screen md:pl-[260px]">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#06070c]/90 backdrop-blur-xl">
        <div className="px-6 py-4 md:px-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-400/80">
            Forum Moderator
          </p>
          <h1 className="text-xl font-bold text-white">Forum Control</h1>
          <p className="mt-1 max-w-3xl text-xs text-zinc-500">
            Moderate discussions and groups in one place. Lock or pin threads, remove comments,
            ban members from a group, and archive groups that break the rules. Every action is
            written to the moderation activity log.
          </p>
        </div>
      </header>

      <div className="space-y-6 px-6 py-6 md:px-8 md:py-8">
        <ForumModerationDesk
          apiBase="/api/moderator/forum"
          initialView={initialView}
          accent="violet"
          onViewChange={onViewChange}
        />
      </div>
    </main>
  );
}
