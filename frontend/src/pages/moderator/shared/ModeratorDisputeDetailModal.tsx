import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, MessageSquare, X } from "lucide-react";
import api from "@/lib/axios";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast.ts";
import type { DisputeDetail } from "./moderatorTypes";
import type { Accent } from "./ui";
import { accentSpinner } from "./ui";

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

const ACCENT_BTN: Record<Accent, string> = {
  sky: "bg-sky-500/90 hover:bg-sky-500",
  violet: "bg-violet-500/90 hover:bg-violet-500",
  emerald: "bg-emerald-500/90 hover:bg-emerald-500",
  rose: "bg-rose-500/90 hover:bg-rose-500",
};

/**
 * Dispute detail modal with a discussion thread.
 * `endpointBase` is the disputes base path, e.g. "/api/moderator/support/disputes".
 */
export default function ModeratorDisputeDetailModal({
  disputeId,
  endpointBase,
  accent = "sky",
  onClose,
  onUpdated,
}: {
  disputeId: number | string;
  endpointBase: string;
  accent?: Accent;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [detail, setDetail] = useState<DisputeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [internalNote, setInternalNote] = useState(false);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`${endpointBase}/${disputeId}`);
      if (res.data?.success) {
        const d = res.data.data as DisputeDetail;
        setDetail(d);
        setStatus(d.dispute.status);
        setPriority(d.dispute.priority);
        setAssigneeId(d.dispute.assignee?.staffId?.toString() || "");
        setResolutionNotes(d.dispute.resolutionNotes || "");
      }
    } catch {
      showErrorToast("Failed to load dispute");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disputeId]);

  const saveChanges = async (overrideStatus?: string) => {
    setSaving(true);
    try {
      await api.patch(`${endpointBase}/${disputeId}`, {
        status: overrideStatus || status,
        priority,
        assigned_staff_id: assigneeId ? assigneeId : null,
        resolution_notes: resolutionNotes || null,
      });
      showSuccessToast(overrideStatus === "resolved" ? "Dispute resolved" : "Dispute updated");
      await load();
      onUpdated();
    } catch {
      showErrorToast("Failed to update dispute");
    } finally {
      setSaving(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) return;
    setSaving(true);
    try {
      await api.post(`${endpointBase}/${disputeId}/messages`, {
        body: message.trim(),
        isInternal: internalNote,
      });
      setMessage("");
      showSuccessToast(internalNote ? "Internal note added" : "Message sent");
      await load();
      onUpdated();
    } catch {
      showErrorToast("Failed to send message");
    } finally {
      setSaving(false);
    }
  };

  const dispute = detail?.dispute;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f1016] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className={`text-[10px] font-semibold uppercase tracking-wide ${accentSpinner(accent)}`}>Dispute detail</p>
            <h2 className="text-lg font-bold text-white">{dispute?.number || "Dispute"}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-20">
            <Loader2 className={`h-8 w-8 animate-spin ${accentSpinner(accent)}`} />
          </div>
        ) : detail && dispute ? (
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div>
              <h3 className="text-xl font-semibold text-white">{dispute.title}</h3>
              <p className="mt-1 text-sm text-zinc-500">
                @{dispute.initiator.username} vs @{dispute.respondent.username} · {dispute.relatedEntityType || "general"} ·{" "}
                {dispute.creditAmount.toLocaleString()} credits · opened {formatDateTime(dispute.openedAt)}
              </p>
              {dispute.reason && <p className="mt-2 text-sm text-zinc-400">{dispute.reason}</p>}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-xs text-zinc-500">
                Status
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white"
                >
                  {["open", "under_review", "resolved", "closed"].map((s) => (
                    <option key={s} value={s}>
                      {s.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-zinc-500">
                Priority
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white"
                >
                  {["low", "medium", "high"].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-zinc-500">
                Assignee
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white"
                >
                  <option value="">Unassigned</option>
                  {detail.assignableStaff.map((s) => (
                    <option key={s.staffId} value={s.staffId}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Resolution notes
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={2}
                placeholder="How was (or will) this dispute be settled?"
                className="resize-none rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white outline-none"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void saveChanges()}
                disabled={saving}
                className={`rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${ACCENT_BTN[accent]}`}
              >
                Save dispute changes
              </button>
              {!["resolved", "closed"].includes(dispute.status) && (
                <button
                  type="button"
                  onClick={() => void saveChanges("resolved")}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Resolve dispute
                </button>
              )}
            </div>

            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-white">
                <MessageSquare className={`h-4 w-4 ${accentSpinner(accent)}`} />
                Discussion ({detail.messages.length})
              </p>
              {detail.messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-xl border px-4 py-3 ${
                    m.isInternal ? "border-amber-500/20 bg-amber-500/5" : "border-white/10 bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>
                      {m.authorName} · {m.authorType}
                      {m.isInternal && " · internal"}
                    </span>
                    <span>{formatDateTime(m.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-200">{m.body}</p>
                </div>
              ))}
              {detail.messages.length === 0 && <p className="text-sm text-zinc-500">No discussion yet — start the chat below.</p>}
            </div>

            <div className="rounded-xl border border-white/10 bg-[#14151c] p-4">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Write a message to discuss this dispute…"
                className="w-full resize-none rounded-lg border border-white/10 bg-[#0f1016] px-3 py-2 text-sm text-white outline-none"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs text-zinc-400">
                  <input type="checkbox" checked={internalNote} onChange={(e) => setInternalNote(e.target.checked)} />
                  Internal note (staff only)
                </label>
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={saving || !message.trim()}
                  className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15 disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="py-12 text-center text-zinc-500">Dispute not found.</p>
        )}
      </div>
    </div>
  );
}
