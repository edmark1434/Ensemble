import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Archive,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock,
  Loader2,
  MessageSquare,
  Pencil,
  RotateCcw,
  Send,
} from "lucide-react";
import api from "@/lib/axios";
import socket from "@/lib/socket";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast";
import type { AssetReviewStatus, AssetSubmission, SubmissionMessage } from "./assetTypes";

const MAX_LENGTH = 2000;
const RESUBMIT_MIN_LENGTH = 5;

function requestError(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { error?: string; message?: string } } })?.response?.data;
  return data?.error || data?.message || fallback;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

type StatusCopy = {
  title: string;
  detail: string;
  icon: typeof Clock;
  tone: string;
};

function statusCopy(status: AssetReviewStatus, publishAt: string | null): StatusCopy {
  switch (status) {
    case "pending":
      return {
        title: "Under review",
        detail: "The review team is checking your submission. You can add a note for them below.",
        icon: Clock,
        tone: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
      };
    case "scheduled":
      return {
        title: `Approved — goes live ${publishAt ? formatDateTime(publishAt) : "soon"}`,
        detail: "It is published automatically at that time. Saving edits before then sends it back to review.",
        icon: CalendarClock,
        tone: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      };
    case "rejected":
      return {
        title: "Changes requested",
        detail: "Read the feedback, fix the asset if needed, then resubmit it with a message to the review team.",
        icon: AlertTriangle,
        tone: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
      };
    case "delisted":
      return {
        title: "Removed from the catalog",
        detail: "Read why below. You can resubmit it with a message for a fresh review.",
        icon: Archive,
        tone: "border-zinc-500/25 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
      };
    case "approved":
      return {
        title: "Live on the Marketplace",
        detail: publishAt ? `Live since ${formatDateTime(publishAt)}.` : "Approved and published.",
        icon: CheckCircle2,
        tone: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      };
    default:
      return {
        title: "Not submitted",
        detail: "Save the asset to submit it for review.",
        icon: Clock,
        tone: "border-gray-300 bg-gray-50 text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300",
      };
  }
}

/** Heading for a thread entry; plain replies have none. */
function entryLabel(message: SubmissionMessage) {
  switch (message.kind) {
    case "submitted":
      return "Submitted for review";
    case "resubmitted":
      return "Resubmitted for review";
    case "approved":
      return "Approved — live now";
    case "scheduled":
      return `Approved — goes live ${formatDateTime(message.publishAt)}`;
    case "published":
      return "Went live on the Marketplace";
    case "rejected":
      return "Changes requested";
    case "delisted":
      return "Removed from the catalog";
    case "rereview":
      return "Sent back for another review";
    default:
      return null;
  }
}

function entryTone(message: SubmissionMessage) {
  if (message.kind === "rejected") return "text-rose-600 dark:text-rose-300";
  if (message.kind === "delisted" || message.kind === "rereview") return "text-amber-600 dark:text-amber-300";
  if (message.kind === "approved" || message.kind === "scheduled" || message.kind === "published") {
    return "text-emerald-600 dark:text-emerald-300";
  }
  return "text-gray-500 dark:text-zinc-400";
}

function ThreadEntry({ message }: { message: SubmissionMessage }) {
  const label = entryLabel(message);
  if (message.authorType === "system") {
    return (
      <li className="flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-3 w-3" /> {label} · {formatDateTime(message.createdAt)}
        </span>
      </li>
    );
  }
  const mine = message.authorType === "seller";
  return (
    <li className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl border px-4 py-3 ${
          mine
            ? "border-blue-500/20 bg-blue-500/10"
            : "border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/[0.04]"
        }`}
      >
        <p className="text-[11px] text-gray-500 dark:text-zinc-400">
          <span className="font-semibold text-gray-800 dark:text-zinc-200">{mine ? "You" : message.authorName}</span>
          {" · "}
          {formatDateTime(message.createdAt)}
        </p>
        {label && <p className={`mt-1 text-xs font-bold ${entryTone(message)}`}>{label}</p>}
        {message.body ? (
          <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-gray-800 dark:text-zinc-200">
            {message.body}
          </p>
        ) : (
          message.kind === "resubmitted" && (
            <p className="mt-1.5 text-xs italic text-gray-500 dark:text-zinc-400">Updated the asset without a message.</p>
          )
        )}
      </div>
    </li>
  );
}

/**
 * The owner's conversation with the marketplace review team about this asset: every decision,
 * resubmission and reply. A rejected or delisted asset is resubmitted from here with a message;
 * a pending or scheduled one takes plain notes.
 */
export default function AssetSubmissionThread({
  assetId,
  refreshKey,
  onEdit,
  onChanged,
}: {
  assetId: string;
  /** Changes when the asset was saved or its review state moved, so the thread re-reads. */
  refreshKey?: string;
  /** Opens the asset editor; saving edits also resubmits. */
  onEdit?: () => void;
  /** Called after a resubmission so the page reloads the asset's review state. */
  onChanged?: () => void;
}) {
  const [submission, setSubmission] = useState<AssetSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [expanded, setExpanded] = useState<boolean | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const res = await api.get<{ submission: AssetSubmission }>(`/api/assets/${assetId}/submission`, { signal });
        setSubmission(res.data.submission);
        setMissing(false);
      } catch (error) {
        if (signal?.aborted) return;
        // No listing (or not the owner's): nothing to show.
        if ((error as { response?: { status?: number } })?.response?.status === 404) setMissing(true);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [assetId]
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void load(controller.signal);
    return () => controller.abort();
  }, [load, refreshKey]);

  // Decisions and staff replies arrive over the socket for this asset.
  useEffect(() => {
    const onUpdate = (payload?: { marketAssetId?: string }) => {
      if (!payload?.marketAssetId || payload.marketAssetId === assetId) void load();
    };
    socket.on("assetStatusUpdated", onUpdate);
    return () => {
      socket.off("assetStatusUpdated", onUpdate);
    };
  }, [assetId, load]);

  // Open by default unless the asset is live; the history of a live asset is one click away.
  useEffect(() => {
    if (submission && expanded === null) setExpanded(submission.status !== "approved");
  }, [submission, expanded]);

  const messageCount = submission?.messages.length || 0;
  useEffect(() => {
    if (!expanded || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [expanded, messageCount]);

  if (loading && !submission) {
    return (
      <section className="mb-7 flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-500 shadow-sm dark:border-white/10 dark:bg-dark-surface dark:text-zinc-400 dark:shadow-none">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading review status…
      </section>
    );
  }
  if (missing || !submission) return null;

  const copy = statusCopy(submission.status, submission.publishAt);
  const StatusIcon = copy.icon;
  const text = draft.trim();
  const resubmitMode = submission.canResubmit;
  const canSend = !sending && text.length >= (resubmitMode ? RESUBMIT_MIN_LENGTH : 1) && text.length <= MAX_LENGTH;

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const res = await api.post<{ submission: AssetSubmission }>(`/api/assets/${assetId}/submission/messages`, {
        body: text,
        resubmit: resubmitMode,
      });
      setSubmission(res.data.submission);
      setDraft("");
      if (resubmitMode) {
        showSuccessToast("Resubmitted. The review team will take another look.");
        onChanged?.();
      } else {
        showSuccessToast("Message sent to the review team.");
      }
    } catch (error) {
      showErrorToast(requestError(error, resubmitMode ? "Unable to resubmit this asset." : "Unable to send the message."));
      void load();
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="mb-7 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-dark-surface dark:shadow-none">
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={Boolean(expanded)}
        className="flex w-full items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 text-left dark:border-white/5"
      >
        <span className="flex min-w-0 items-center gap-2">
          <MessageSquare className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-bold">Marketplace review</span>
          <span className="truncate font-mono text-[11px] text-gray-400 dark:text-zinc-500">{submission.number}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
          {messageCount} {messageCount === 1 ? "entry" : "entries"}
          <ChevronDown className={`h-4 w-4 transition ${expanded ? "rotate-180" : ""}`} />
        </span>
      </button>

      <div className={`mx-5 mt-4 flex items-start gap-2.5 rounded-xl border px-4 py-3 ${copy.tone}`}>
        <StatusIcon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-bold">{copy.title}</p>
          <p className="mt-0.5 text-xs leading-5 opacity-90">{copy.detail}</p>
        </div>
      </div>

      {expanded && (
        <>
          {messageCount === 0 ? (
            <p className="px-5 py-6 text-center text-xs text-gray-500 dark:text-zinc-400">No messages yet.</p>
          ) : (
            <ol ref={listRef} className="max-h-[28rem] space-y-3 overflow-y-auto px-5 py-4">
              {submission.messages.map((message) => (
                <ThreadEntry key={message.id} message={message} />
              ))}
            </ol>
          )}

          {submission.trashed ? (
            <p className="border-t border-gray-100 px-5 py-4 text-xs text-gray-500 dark:border-white/5 dark:text-zinc-400">
              Restore this asset from Trash to resubmit it or message the review team.
            </p>
          ) : (submission.canResubmit || submission.canReply) && (
            <div className="border-t border-gray-100 px-5 py-4 dark:border-white/5">
              <label htmlFor="submission-message" className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                {resubmitMode ? "Message to the review team (required to resubmit)" : "Note for the review team"}
              </label>
              <textarea
                id="submission-message"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={MAX_LENGTH}
                rows={3}
                placeholder={
                  resubmitMode
                    ? "Say what you changed, or why it should be published as it is…"
                    : "Add context the reviewer should know…"
                }
                className="mt-1.5 w-full resize-y rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-dark-base dark:text-zinc-100 dark:placeholder:text-zinc-600"
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                  {resubmitMode
                    ? `At least ${RESUBMIT_MIN_LENGTH} characters. Need to change files or details? Edit the asset — saving also resubmits it.`
                    : `${draft.length}/${MAX_LENGTH}`}
                </p>
                <div className="flex items-center gap-2">
                  {resubmitMode && onEdit && (
                    <button
                      type="button"
                      onClick={onEdit}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3.5 py-2 text-xs font-semibold transition hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit asset
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void send()}
                    disabled={!canSend}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-blue-500 disabled:opacity-50"
                  >
                    {sending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : resubmitMode ? (
                      <RotateCcw className="h-3.5 w-3.5" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    {resubmitMode ? "Resubmit for review" : "Send"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
