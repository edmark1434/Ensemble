import { MessageSquareOff, ShieldAlert, TrendingDown } from "lucide-react";
import { useForumTimeout, type ForumLockReason } from "@/pages/user/4_forums/useForumTimeout";

/**
 * Shared look for forum controls that are switched off by a forum timeout, a suspension, or
 * low Platform Merit. It uses the same amber tone as the site-wide standing banner so members
 * connect the two.
 */

/** Add to a disabled forum action button. The cursor and fade show it can't be clicked. */
export const FORUM_LOCKED_CLASS = "!cursor-not-allowed opacity-40";

const LOCK_LOOK: Record<Exclude<ForumLockReason, null>, { Icon: typeof ShieldAlert; pill: string }> = {
  suspended: { Icon: ShieldAlert, pill: "Suspended" },
  timeout: { Icon: MessageSquareOff, pill: "Timed out" },
  merit: { Icon: TrendingDown, pill: "Low merit" },
};

/** Small amber pill placed next to a row of locked actions. */
export function ForumTimeoutPill({ className = "" }: { className?: string }) {
  const { locked, reason, message } = useForumTimeout();
  if (!locked || !reason) return null;
  const { Icon, pill } = LOCK_LOOK[reason];
  return (
    <span
      title={message}
      className={`inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300 ${className}`}
    >
      <Icon className="h-3 w-3" />
      {pill}
    </span>
  );
}

/** Takes the place of a reply or comment box while forum writes are off. */
export function ForumTimeoutComposerLock({ label = "Replies are paused" }: { label?: string }) {
  const { reason, message } = useForumTimeout();
  const Icon = reason ? LOCK_LOOK[reason].Icon : MessageSquareOff;
  return (
    <div className="flex items-start gap-3 rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 px-4 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-300">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-amber-700 dark:text-amber-300">{label}</p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">{message}</p>
      </div>
    </div>
  );
}
