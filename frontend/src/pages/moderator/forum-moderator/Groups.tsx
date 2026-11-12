import ForumModerationDesk from '@/pages/admin/moderation/ForumModerationDesk';

/**
 * Forum Moderator → Forum Groups.
 *
 * The same shared content desk as Forum Discussion, opened on the group view:
 * ownership, member roster with bans, per-group moderation counts and
 * archiving. Switching to Discussions inside the desk keeps the same page.
 */
export default function ForumGroups() {
  return (
    <main
      className="relative z-10 min-h-screen px-6 py-8 md:pl-[260px] md:px-10"
      style={{ animation: 'fadeIn 420ms ease' }}
    >
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-400">
          Forum Moderator
        </p>
        <h1 className="text-2xl font-bold text-white">Forum Groups</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-500">
          Inspect a group's roster and moderation history, ban or unban members, and archive groups
          that break platform rules. Archiving hides the group and its discussions without deleting
          anything.
        </p>
      </div>

      <ForumModerationDesk apiBase="/api/moderator/forum" initialView="groups" />
    </main>
  );
}
