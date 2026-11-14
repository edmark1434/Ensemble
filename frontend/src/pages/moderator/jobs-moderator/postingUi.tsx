import { useEffect, useState } from "react";
import { Archive, Briefcase, Gem, Loader2, Pause, Play, RotateCcw, XCircle } from "lucide-react";

export const DEFAULT_JOBS_API_BASE = "/api/moderator/jobs";

/** Canonical moderator statuses, see `normalizePostingStatus` in the jobs repository. */
export type PostingStatus = "active" | "paused" | "closed" | "archived";

/** Moderation actions a posting can receive, wherever they are triggered from. */
export type PostingAction = "activate" | "restore" | "pause" | "close" | "archive";

export type PostingActionMeta = {
  status: PostingStatus;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Classes for the wide button in the detail modal and the confirm button. */
  wideTone: string;
  danger: boolean;
  requiresReason: boolean;
  dialogTitle: string;
  dialogHint: string;
  placeholder: string;
  confirmLabel: string;
  successMessage: string;
};

export const POSTING_ACTIONS: Record<PostingAction, PostingActionMeta> = {
  activate: {
    status: "active",
    label: "Reopen",
    icon: Play,
    wideTone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20",
    danger: false,
    requiresReason: false,
    dialogTitle: "Reopen posting",
    dialogHint: "The posting goes back on the board and can take new proposals or orders again.",
    placeholder: "Optional note for the activity log…",
    confirmLabel: "Reopen",
    successMessage: "Posting reopened",
  },
  restore: {
    status: "active",
    label: "Restore",
    icon: RotateCcw,
    wideTone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20",
    danger: false,
    requiresReason: false,
    dialogTitle: "Restore archived posting",
    dialogHint: "The posting is un-archived and returns to the board as active.",
    placeholder: "Optional note, e.g. appeal APL-204 accepted…",
    confirmLabel: "Restore",
    successMessage: "Posting restored",
  },
  pause: {
    status: "paused",
    label: "Pause",
    icon: Pause,
    wideTone: "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20",
    danger: false,
    requiresReason: true,
    dialogTitle: "Pause posting",
    dialogHint:
      "Hides the posting from the board while you investigate. Existing proposals, orders and contracts are kept.",
    placeholder: "Why the posting is paused, e.g. checking report RPT-…",
    confirmLabel: "Pause posting",
    successMessage: "Posting paused",
  },
  close: {
    status: "closed",
    label: "Close",
    icon: XCircle,
    wideTone: "border-zinc-500/30 bg-zinc-500/10 text-zinc-200 hover:bg-zinc-500/20",
    danger: true,
    requiresReason: true,
    dialogTitle: "Close posting",
    dialogHint:
      "Stops new proposals or orders. Contracts already running continue and are handled through disputes if needed.",
    placeholder: "Why the posting is closed…",
    confirmLabel: "Close posting",
    successMessage: "Posting closed",
  },
  archive: {
    status: "archived",
    label: "Archive",
    icon: Archive,
    wideTone: "border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20",
    danger: true,
    requiresReason: true,
    dialogTitle: "Archive posting",
    dialogHint:
      "Removes the posting from the board entirely (soft delete). Use this for policy violations such as scams, prohibited work or spam. It can be restored later.",
    placeholder: "Policy reason, e.g. off-platform payment request confirmed in RPT-…",
    confirmLabel: "Archive posting",
    successMessage: "Posting archived",
  },
};

/** Actions offered for a posting in its current state, in display order. */
export function actionsForPostingStatus(status: string): PostingAction[] {
  const s = String(status || "").toLowerCase();
  if (s === "archived") return ["restore"];
  if (s === "paused") return ["activate", "close", "archive"];
  if (s === "closed") return ["activate", "archive"];
  return ["pause", "close", "archive"];
}

export function postingStatusClass(status: string) {
  switch (String(status || "").toLowerCase()) {
    case "active":
    case "open":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
    case "paused":
    case "pending":
    case "submitted":
      return "border-amber-500/25 bg-amber-500/10 text-amber-300";
    case "archived":
    case "rejected":
    case "cancelled":
    case "disputed":
      return "border-red-500/25 bg-red-500/10 text-red-300";
    case "completed":
    case "accepted":
      return "border-sky-500/25 bg-sky-500/10 text-sky-300";
    default:
      return "border-zinc-500/25 bg-zinc-500/10 text-zinc-300";
  }
}

function statusDotClass(status: string) {
  switch (String(status || "").toLowerCase()) {
    case "active":
    case "open":
      return "bg-emerald-400";
    case "paused":
    case "pending":
    case "submitted":
      return "bg-amber-400";
    case "archived":
    case "rejected":
    case "cancelled":
    case "disputed":
      return "bg-red-400";
    case "completed":
    case "accepted":
      return "bg-sky-400";
    default:
      return "bg-zinc-400";
  }
}

export function statusPill(status: string) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${postingStatusClass(status)}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass(status)}`} />
      {String(status || "unknown").replace(/_/g, " ")}
    </span>
  );
}

export function typeBadge(type: "job" | "gig") {
  return type === "job" ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/25 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-300">
      <Briefcase className="h-3 w-3" /> Job
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/25 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-300">
      <Gem className="h-3 w-3" /> Gig
    </span>
  );
}

export function formatCredits(min: number | null | undefined, max: number | null | undefined) {
  const lo = min ?? null;
  const hi = max ?? null;
  if (lo === null && hi === null) return "—";
  if (lo !== null && hi !== null && lo !== hi) return `${lo.toLocaleString()}–${hi.toLocaleString()}`;
  return (lo ?? hi ?? 0).toLocaleString();
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function relativeTime(value: string | null | undefined) {
  if (!value) return "—";
  const mins = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

export function initials(name: string) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function apiErrorMessage(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback
  );
}

/** Reason prompt shared by the control table and the posting detail modal. */
export function PostingReasonDialog({
  action,
  postingTitle,
  saving,
  onCancel,
  onConfirm,
}: {
  action: PostingAction;
  postingTitle: string;
  saving: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const meta = POSTING_ACTIONS[action];
  const [reason, setReason] = useState("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onCancel]);

  const trimmed = reason.trim();
  const blocked = saving || (meta.requiresReason && trimmed.length < 5);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0f1016] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-white/[0.06] px-5 py-4">
          <h2 className="text-sm font-semibold text-white">{meta.dialogTitle}</h2>
          <p className="mt-1 truncate text-xs text-zinc-500">{postingTitle}</p>
        </div>
        <div className="space-y-3 px-5 py-4">
          <p className="text-xs leading-relaxed text-zinc-400">{meta.dialogHint}</p>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Reason {meta.requiresReason ? "(required)" : "(optional)"}
          </label>
          <textarea
            autoFocus
            value={reason}
            maxLength={500}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            placeholder={meta.placeholder}
            className="w-full resize-none rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-500/40"
          />
          <p className="flex justify-between text-[11px] text-zinc-600">
            <span>
              Saved to the owner&apos;s activity log and the posting&apos;s moderation history
              {meta.requiresReason ? " · minimum 5 characters" : ""}.
            </span>
            <span className="tabular-nums">{trimmed.length}/500</span>
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-white/[0.06] px-5 py-3.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={blocked}
            onClick={() => onConfirm(trimmed)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${meta.wideTone}`}
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {meta.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
