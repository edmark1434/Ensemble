import { Lock, Pin } from "lucide-react";
import { showCustomToast } from "@/components/utility/toast";

/**
 * Staff thread states on a discussion, set from Forum Control:
 * - `is_locked`: replies are locked. Nobody but forum staff can add comments or replies (the
 *   server answers 423 `DISCUSSION_LOCKED`); reading, likes and saves still work.
 * - `is_sticky`: pinned to the top of its group's feed by moderators.
 */
export type ForumThreadFlags = { is_locked?: boolean | null; is_sticky?: boolean | null };

export const isDiscussionLocked = (discussion?: ForumThreadFlags | null) => Boolean(discussion?.is_locked);
export const isDiscussionPinned = (discussion?: ForumThreadFlags | null) => Boolean(discussion?.is_sticky);

/** Pinned cards get a soft emerald edge so they stand out at the top of the feed. */
export const PINNED_CARD_CLASS = "!border-emerald-500/40 dark:!border-emerald-500/30";

/** True when a comment request was refused because the discussion is locked. */
export function isDiscussionLockedError(error: any) {
  return error?.response?.data?.code === "DISCUSSION_LOCKED" || error?.response?.status === 423;
}

/** Explains a refused comment on a locked discussion (instead of a generic failure). */
export function showDiscussionLockedToast() {
  showCustomToast(
    "Replies are locked",
    "Moderators locked this discussion, so new comments and replies can't be posted."
  );
}

/** "Pinned" and "Locked" chips shown next to a discussion's title. */
export function DiscussionStateBadges({
  discussion,
  className = "",
}: {
  discussion?: ForumThreadFlags | null;
  className?: string;
}) {
  const pinned = isDiscussionPinned(discussion);
  const locked = isDiscussionLocked(discussion);
  if (!pinned && !locked) return null;
  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      {pinned && (
        <span
          title="Pinned by moderators"
          className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300"
        >
          <Pin className="h-3 w-3 fill-current" />
          Pinned
        </span>
      )}
      {locked && (
        <span
          title="Replies are locked by moderators"
          className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300"
        >
          <Lock className="h-3 w-3" />
          Locked
        </span>
      )}
    </span>
  );
}

/** Takes the place of the comment box on a locked discussion. */
export function LockedRepliesNotice({ className = "" }: { className?: string }) {
  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 ${className}`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-300">
        <Lock className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Replies are locked</p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
          Moderators locked this discussion. You can still read it, but new comments and replies can't be posted.
        </p>
      </div>
    </div>
  );
}
