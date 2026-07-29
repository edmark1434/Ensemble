import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Eye,
  Hand,
  Loader2,
  MessageSquare,
  ShieldAlert,
  UserPlus,
  X,
} from "lucide-react";
import api from "@/lib/axios";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast.ts";
import type { DisputeDetail } from "./moderatorTypes";
import type { Accent } from "./ui";
import { accentSpinner } from "./ui";

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function titleCaseLabel(value: string) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function toApiToken(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function audienceBadge(audience?: string, isInternal?: boolean) {
  const a = audience || (isInternal ? "staff" : "parties");
  if (a === "staff" || isInternal) {
    return { label: "Staff only", className: "border-amber-500/30 bg-amber-500/10 text-amber-200" };
  }
  if (a === "author_and_staff") {
    return { label: "Private (author + staff)", className: "border-sky-500/30 bg-sky-500/10 text-sky-200" };
  }
  return { label: "Visible to parties", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" };
}

const ACCENT_BTN: Record<Accent, string> = {
  sky: "bg-sky-500/90 hover:bg-sky-500",
  violet: "bg-violet-500/90 hover:bg-violet-500",
  emerald: "bg-emerald-500/90 hover:bg-emerald-500",
  rose: "bg-rose-500/90 hover:bg-rose-500",
};

const STATUS_OPTIONS = [
  "pending_review",
  "open",
  "awaiting_response",
  "under_review",
  "resolved",
  "sanctioned",
  "dismissed",
  "withdrawn",
  "closed",
];

const OUTCOME_OPTIONS = ["resolved", "sanctioned", "dismissed", "withdrawn"];
const SANCTION_OPTIONS = ["warn", "mute", "suspend", "ban", "credit_adjustment", "listing_removal"];

/**
 * Dispute detail modal with discussion thread.
 * `endpointBase` e.g. "/api/admin/disputes" or "/api/moderator/support/disputes".
 * `adminMode` enables assign / takeover / publish / view-only gating.
 */
export default function ModeratorDisputeDetailModal({
  disputeId,
  endpointBase,
  accent = "sky",
  adminMode = false,
  onClose,
  onUpdated,
}: {
  disputeId: number | string;
  endpointBase: string;
  accent?: Accent;
  adminMode?: boolean;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [detail, setDetail] = useState<DisputeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [internalNote, setInternalNote] = useState(false);
  const [visibleToParties, setVisibleToParties] = useState(false);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [outcome, setOutcome] = useState("");
  const [sanctionType, setSanctionType] = useState("");
  const [sanctionNotes, setSanctionNotes] = useState("");
  const [takeoverNote, setTakeoverNote] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`${endpointBase}/${disputeId}`);
      if (res.data?.success) {
        const d = res.data.data as DisputeDetail;
        setDetail(d);
        setStatus(toApiToken(d.dispute.status));
        setPriority(toApiToken(d.dispute.priority));
        setAssigneeId(d.dispute.assignee?.staffId?.toString() || "");
        setResolutionNotes(d.dispute.resolutionNotes || "");
        setOutcome(d.dispute.outcome || "");
        setSanctionType(d.dispute.sanctionType || "");
        setSanctionNotes(d.dispute.sanctionNotes || "");
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

  const perms = detail?.permissions;
  const canAct = adminMode ? Boolean(perms?.canAct) : true;
  const canAssignOthers = adminMode ? Boolean(perms?.canAssignOthers) : true;
  const viewOnly = adminMode && !canAct;

  const runAction = async (body: Record<string, unknown>, successMsg: string) => {
    setSaving(true);
    try {
      await api.patch(`${endpointBase}/${disputeId}`, body);
      showSuccessToast(successMsg);
      await load();
      onUpdated();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to update dispute";
      showErrorToast(msg);
    } finally {
      setSaving(false);
    }
  };

  const saveChanges = async (overrideStatus?: string) => {
    if (adminMode && viewOnly && canAssignOthers) {
      await runAction(
        { assigned_staff_id: assigneeId ? assigneeId : null },
        "Assignment updated"
      );
      return;
    }
    const payload: Record<string, unknown> = {
      status: overrideStatus || status,
      priority,
      resolution_notes: resolutionNotes || null,
    };
    if (adminMode) {
      if (outcome) payload.outcome = outcome;
      if (sanctionType) payload.sanction_type = sanctionType;
      payload.sanction_notes = sanctionNotes || null;
      if (canAssignOthers || canAct) {
        payload.assigned_staff_id = assigneeId ? assigneeId : null;
      }
    } else {
      payload.assigned_staff_id = assigneeId ? assigneeId : null;
    }
    await runAction(payload, overrideStatus === "resolved" ? "Dispute resolved" : "Dispute updated");
  };

  const sendMessage = async () => {
    if (!message.trim()) return;
    setSaving(true);
    try {
      await api.post(`${endpointBase}/${disputeId}/messages`, {
        body: message.trim(),
        isInternal: internalNote,
        visibleToParties: !internalNote && visibleToParties,
        audience: internalNote ? "staff" : visibleToParties ? "parties" : "staff",
      });
      setMessage("");
      showSuccessToast(internalNote ? "Internal note added" : "Message sent");
      await load();
      onUpdated();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to send message";
      showErrorToast(msg);
    } finally {
      setSaving(false);
    }
  };

  const setMessageAudience = async (messageId: string | number, audience: string) => {
    setSaving(true);
    try {
      await api.patch(`${endpointBase}/${disputeId}/messages/${messageId}`, { audience });
      showSuccessToast(audience === "parties" ? "Comment published to parties" : "Comment unpublished");
      await load();
      onUpdated();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to update comment";
      showErrorToast(msg);
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
            <p className={`text-[10px] font-semibold uppercase tracking-wide ${accentSpinner(accent)}`}>
              Dispute detail{adminMode ? " · Admin" : ""}
            </p>
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
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-zinc-300">
                  Status: {titleCaseLabel(dispute.status)}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-zinc-300">
                  Visibility: {titleCaseLabel(dispute.visibility || "pending")}
                </span>
                {dispute.outcome && (
                  <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-violet-200">
                    Outcome: {titleCaseLabel(dispute.outcome)}
                  </span>
                )}
                {dispute.creditHold && (
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-200">
                    Hold: {dispute.creditHold.amount.toLocaleString()} ({dispute.creditHold.status})
                  </span>
                )}
              </div>
            </div>

            {adminMode && viewOnly && (
              <div className="flex items-start gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-sm text-sky-100">
                <Eye className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">View only</p>
                  <p className="text-xs text-sky-200/80">
                    Assign yourself to handle this dispute, or (as Admin) assign a Support Moderator. Handling actions unlock
                    after you are the assignee.
                  </p>
                </div>
              </div>
            )}

            {adminMode && dispute.takeoverRequester && (
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-sm text-amber-100">
                <p className="font-medium">Takeover requested by {dispute.takeoverRequester.name}</p>
                {dispute.takeoverRequestNote && (
                  <p className="mt-1 text-xs text-amber-200/80">{dispute.takeoverRequestNote}</p>
                )}
                <p className="mt-1 text-[11px] text-amber-200/60">
                  {formatDateTime(dispute.takeoverRequestedAt)}
                </p>
              </div>
            )}

            {adminMode && (
              <div className="flex flex-wrap gap-2">
                {perms?.canSelfAssign && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void runAction({ action: "self_assign" }, "You are now assigned")}
                    className="flex items-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-200 hover:bg-sky-500/20 disabled:opacity-50"
                  >
                    <UserPlus className="h-4 w-4" />
                    Assign myself
                  </button>
                )}
                {perms?.canForceTakeover && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void runAction({ action: "takeover" }, "Takeover complete")}
                    className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200 hover:bg-rose-500/20 disabled:opacity-50"
                  >
                    <Hand className="h-4 w-4" />
                    Force takeover
                  </button>
                )}
                {perms?.canRequestTakeover && (
                  <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      value={takeoverNote}
                      onChange={(e) => setTakeoverNote(e.target.value)}
                      placeholder="Optional note for takeover request"
                      className="flex-1 rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white"
                    />
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        void runAction(
                          { action: "request_takeover", note: takeoverNote || null },
                          "Takeover requested"
                        )
                      }
                      className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
                    >
                      Request takeover
                    </button>
                  </div>
                )}
                {perms?.canCancelTakeoverRequest && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      void runAction({ action: "cancel_takeover_request" }, "Takeover request cancelled")
                    }
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-300 hover:bg-white/10 disabled:opacity-50"
                  >
                    Cancel my takeover request
                  </button>
                )}
                {perms?.canAcceptTakeover && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void runAction({ action: "accept_takeover" }, "Takeover accepted")}
                    className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
                  >
                    Accept takeover request
                  </button>
                )}
                {canAct && toApiToken(dispute.status) === "pending_review" && (
                  <>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void runAction({ action: "approve" }, "Dispute approved (now public)")}
                      className={`rounded-xl px-3 py-2 text-sm font-medium text-white disabled:opacity-50 ${ACCENT_BTN[accent]}`}
                    >
                      Approve (make public)
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void runAction({ action: "dismiss" }, "Dispute dismissed")}
                      className="flex items-center gap-1.5 rounded-xl border border-zinc-500/30 bg-zinc-500/10 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-500/20 disabled:opacity-50"
                    >
                      <ShieldAlert className="h-4 w-4" />
                      Dismiss
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-xs text-zinc-500">
                Status
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={viewOnly}
                  className="rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white disabled:opacity-50"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {titleCaseLabel(s)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-zinc-500">
                Priority
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  disabled={viewOnly}
                  className="rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white disabled:opacity-50"
                >
                  {["low", "medium", "high"].map((p) => (
                    <option key={p} value={p}>
                      {titleCaseLabel(p)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-zinc-500">
                Designated handler
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  disabled={adminMode ? !(canAssignOthers || canAct) : false}
                  className="rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white disabled:opacity-50"
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

            {adminMode && (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs text-zinc-500">
                  Outcome
                  <select
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                    disabled={viewOnly}
                    className="rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white disabled:opacity-50"
                  >
                    <option value="">—</option>
                    {OUTCOME_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {titleCaseLabel(o)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-zinc-500">
                  Sanction type
                  <select
                    value={sanctionType}
                    onChange={(e) => setSanctionType(e.target.value)}
                    disabled={viewOnly || outcome !== "sanctioned"}
                    className="rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white disabled:opacity-50"
                  >
                    <option value="">—</option>
                    {SANCTION_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {titleCaseLabel(o)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {adminMode && (
              <label className="flex flex-col gap-1 text-xs text-zinc-500">
                Sanction notes
                <textarea
                  value={sanctionNotes}
                  onChange={(e) => setSanctionNotes(e.target.value)}
                  rows={2}
                  disabled={viewOnly || outcome !== "sanctioned"}
                  placeholder="Details of the sanction…"
                  className="resize-none rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white outline-none disabled:opacity-50"
                />
              </label>
            )}

            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Resolution notes
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={2}
                disabled={viewOnly}
                placeholder="How was (or will) this dispute be settled?"
                className="resize-none rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white outline-none disabled:opacity-50"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {(canAct || canAssignOthers) && (
                <button
                  type="button"
                  onClick={() => void saveChanges()}
                  disabled={saving || (viewOnly && !canAssignOthers)}
                  className={`rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${ACCENT_BTN[accent]}`}
                >
                  {viewOnly && canAssignOthers ? "Save assignment" : "Save dispute changes"}
                </button>
              )}
              {canAct && !["resolved", "closed", "sanctioned", "dismissed", "withdrawn"].includes(toApiToken(dispute.status)) && (
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
              {detail.chatAvailable === false && (
                <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
                  MongoDB is not connected — dispute chats are unavailable until MONGODB_URI is set. Dispute status updates
                  still work.
                </p>
              )}
              {detail.messages.map((m) => {
                const badge = audienceBadge(m.audience, m.isInternal);
                const canPublish = adminMode && canAct && m.authorRole && m.authorRole !== "staff";
                return (
                  <div
                    key={m.id}
                    className={`rounded-xl border px-4 py-3 ${
                      m.isInternal || m.audience === "staff"
                        ? "border-amber-500/20 bg-amber-500/5"
                        : "border-white/10 bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                      <span>
                        {m.authorName} · {m.authorType}
                        {m.authorRole ? ` · ${m.authorRole}` : ""}
                      </span>
                      <span>{formatDateTime(m.createdAt)}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] ${badge.className}`}>
                        {badge.label}
                      </span>
                      {canPublish && m.audience !== "parties" && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void setMessageAudience(m.id, "parties")}
                          className="text-[11px] text-emerald-300 hover:underline disabled:opacity-50"
                        >
                          Publish to parties
                        </button>
                      )}
                      {canPublish && m.audience === "parties" && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void setMessageAudience(m.id, "author_and_staff")}
                          className="text-[11px] text-sky-300 hover:underline disabled:opacity-50"
                        >
                          Unpublish
                        </button>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-zinc-200">{m.body}</p>
                  </div>
                );
              })}
              {detail.messages.length === 0 && detail.chatAvailable !== false && (
                <p className="text-sm text-zinc-500">No discussion yet — start the chat below.</p>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-[#14151c] p-4">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder={
                  viewOnly
                    ? "Assign yourself before posting…"
                    : "Write a message to discuss this dispute…"
                }
                disabled={detail.chatAvailable === false || viewOnly}
                className="w-full resize-none rounded-lg border border-white/10 bg-[#0f1016] px-3 py-2 text-sm text-white outline-none disabled:opacity-50"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={internalNote}
                      onChange={(e) => setInternalNote(e.target.checked)}
                      disabled={detail.chatAvailable === false || viewOnly}
                    />
                    Internal note (staff only)
                  </label>
                  {adminMode && (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={visibleToParties}
                        onChange={(e) => setVisibleToParties(e.target.checked)}
                        disabled={detail.chatAvailable === false || viewOnly || internalNote}
                      />
                      Visible to parties
                    </label>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={saving || !message.trim() || detail.chatAvailable === false || viewOnly}
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
