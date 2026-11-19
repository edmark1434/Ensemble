import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { APPEAL_PATH } from "@/lib/standing";
import { useSuspension } from "@/lib/useSuspension";

/*
 * Small suspension notices. Kept apart from SuspensionGuard (which imports the site header)
 * so chat and inbox components can use them without an import cycle.
 */

/**
 * Stands in for a message composer (floating chat, inbox) while the member is suspended, so
 * they can still read the conversation but are not invited to type a message that cannot send.
 */
export function SuspendedComposerNotice({
  label = "Messaging is paused",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  const { until } = useSuspension();
  return (
    <div
      data-suspension-keep
      className={`flex items-center gap-2.5 border-t border-dashed border-amber-500/40 bg-amber-500/[0.06] px-3 py-2.5 ${className}`}
    >
      <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
      <p className="min-w-0 text-[11px] leading-snug text-zinc-600 dark:text-zinc-300">
        <span className="font-semibold text-amber-700 dark:text-amber-300">{label}</span>
        {" "}while your account is suspended{until ? ` (until ${until})` : ""}. You can still read this conversation.
      </p>
    </div>
  );
}

/** Inline heads-up for a page section that is paused by the suspension. */
export function SuspendedNotice({ className = "" }: { className?: string }) {
  const { suspended, message } = useSuspension();
  const navigate = useNavigate();
  if (!suspended) return null;
  return (
    <div
      data-suspension-keep
      className={`flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3 ${className}`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-300">
        <ShieldAlert className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Paused while your account is suspended</p>
        <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">{message}</p>
      </div>
      <button
        type="button"
        onClick={() => navigate(APPEAL_PATH)}
        className="shrink-0 rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-white/15 dark:text-white dark:hover:bg-white/5"
      >
        Appeal
      </button>
    </div>
  );
}
