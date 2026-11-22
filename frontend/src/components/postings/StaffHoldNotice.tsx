import { Link } from "react-router-dom";
import { LifeBuoy, ShieldAlert } from "lucide-react";

/** Sent only to people who manage the posting (`staff_hold` on a job, `staffHold` on a gig). */
export type PostingStaffHold = {
  status: "paused" | "closed" | string;
  heldAt: string | null;
  reason: string | null;
  reportNumber: string | null;
  actionAt: string | null;
  appealPath: string;
};

function formatWhen(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/**
 * Tells the owner their job or gig was paused or closed by the Ensemble team: what that means,
 * why, and how to ask for a review. Members who do not manage the posting never get this data.
 */
export function StaffHoldNotice({ hold, noun }: { hold: PostingStaffHold | null | undefined; noun: "job" | "gig" }) {
  if (!hold) return null;
  const paused = String(hold.status).toLowerCase() === "paused";
  const when = formatWhen(hold.actionAt || hold.heldAt);
  const work = noun === "job" ? "proposals" : "orders";

  return (
    <div
      role="status"
      className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
    >
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-sm font-bold">
              {paused ? "Paused" : "Closed"} by the Ensemble team
              {hold.reportNumber ? ` after report ${hold.reportNumber} was reviewed` : ""}
            </p>
            {when && <p className="text-[11px] text-amber-700/80 dark:text-amber-200/70">{when}</p>}
          </div>
          <p className="text-xs leading-relaxed">
            {paused
              ? `Your ${noun} is hidden from the board and search while the team reviews it. It takes no new ${work}, and you cannot reopen it yourself.`
              : `Your ${noun} stays visible but takes no new ${work}, and you cannot reopen it yourself.`}{" "}
            Proposals, orders and contracts that are already running carry on as normal.
          </p>
          {hold.reason ? (
            <div className="rounded-lg border border-amber-200 bg-white/70 px-3 py-2 text-xs dark:border-amber-500/20 dark:bg-black/20">
              <span className="font-semibold">Reason: </span>
              <span className="whitespace-pre-wrap">{hold.reason}</span>
            </div>
          ) : (
            <p className="text-xs text-amber-800/80 dark:text-amber-200/70">The reason is in the notification we sent you.</p>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1">
            <Link
              to={hold.appealPath}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-bold text-amber-800 transition hover:bg-amber-100 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-100 dark:hover:bg-amber-500/25"
            >
              <LifeBuoy className="h-3.5 w-3.5" />
              Ask for a review
            </Link>
            <span className="text-[11px] text-amber-800/80 dark:text-amber-200/70">
              If you think this is a mistake, or you have fixed the problem, open a support ticket.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StaffHoldNotice;
