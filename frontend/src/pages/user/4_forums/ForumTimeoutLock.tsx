import { MessageSquareOff } from "lucide-react";
import { useForumTimeout } from "@/pages/user/4_forums/useForumTimeout";

/**
 * Shared look for forum controls that are switched off by a forum timeout. It uses the same
 * amber tone and icon as the site-wide "Forum timeout" banner so members connect the two.
 */

/** Add to a disabled forum action button. The cursor and fade show it can't be clicked. */
export const FORUM_LOCKED_CLASS = "!cursor-not-allowed opacity-40";

/** Small amber pill placed next to a row of locked actions. */
export function ForumTimeoutPill({ className = "" }: { className?: string }) {
  const { timedOut, message } = useForumTimeout();
  if (!timedOut) return null;
  return (
    <span
      title={message}
      className={`inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300 ${className}`}
    >
      <MessageSquareOff className="h-3 w-3" />
      Timed out
    </span>
  );
}

/** Takes the place of a reply or comment box while the member is timed out. */
export function ForumTimeoutComposerLock({ label = "Replies are paused" }: { label?: string }) {
  const { message } = useForumTimeout();
  return (
    <div className="flex items-start gap-3 rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 px-4 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-300">
        <MessageSquareOff className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-amber-700 dark:text-amber-300">{label}</p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">{message}</p>
      </div>
    </div>
  );
}
