import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Eye,
  Hand,
  Loader2,
  MessageSquare,
  ShieldAlert,
  X,
} from "lucide-react";
import api from "@/lib/axios";
import socket from "@/lib/socket";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast.ts";
import type { DisputeCaseTransaction, DisputeDetail } from "./moderatorTypes";
import type { TicketMessage } from "@/pages/admin/ticketManagement/ticketTypes";
import type { Accent } from "./ui";
import { accentSpinner } from "./ui";
import DisputeCaseFilePanel from "./DisputeCaseFilePanel";

type DisputeSocketMessage = {
  id?: string;
  _id?: string;
  conversationId?: string;
  conversation_id?: string;
  authorType?: string;
  author_type?: string;
  authorName?: string;
  author_name?: string;
  authorRole?: string | null;
  author_role?: string | null;
  senderAccountId?: string | null;
  sender_id?: string | null;
  body?: string;
  message_content?: string;
  isInternal?: boolean;
  is_internal?: boolean;
  audience?: string;
  publishedAt?: string | null;
  published_at?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
};

function mapDisputeSocketMessage(raw: DisputeSocketMessage | null | undefined): TicketMessage | null {
  if (!raw) return null;
  const id = raw.id || raw._id;
  if (!id) return null;
  const audience =
    raw.audience ||
    (raw.is_internal || raw.isInternal ? "author_and_staff" : "parties");
  return {
    id: String(id),
    senderId: raw.senderAccountId || raw.sender_id ? String(raw.senderAccountId || raw.sender_id) : null,
    authorType: String(raw.authorType || raw.author_type || "staff"),
    authorName: String(raw.authorName || raw.author_name || "Unknown"),
    authorRole: raw.authorRole ?? raw.author_role ?? null,
    body: String(raw.body || raw.message_content || ""),
    isInternal: Boolean(
      raw.isInternal ||
        raw.is_internal ||
        audience === "staff" ||
        audience === "author_and_staff"
    ),
    audience,
    publishedAt: raw.publishedAt || raw.published_at || null,
    createdAt: String(raw.createdAt || raw.created_at || new Date().toISOString()),
  };
}

function mergeDisputeMessage(list: TicketMessage[], next: TicketMessage, replaceId?: string) {
  const withoutPending = replaceId
    ? list.filter((item) => String(item.id) !== String(replaceId))
    : list;
  const idx = withoutPending.findIndex((item) => String(item.id) === String(next.id));
  if (idx === -1) return [...withoutPending, next];
  const copy = [...withoutPending];
  copy[idx] = { ...copy[idx], ...next };
  return copy;
}

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

type DisputeAudience = "staff" | "disputer" | "disputee" | "parties" | "public" | "author_and_staff";

const REPLY_AUDIENCE_OPTIONS: {
  value: DisputeAudience;
  label: string;
  hint: string;
  className: string;
  activeClassName: string;
}[] = [
  {
    value: "staff",
    label: "Staff",
    hint: "Staff only",
    className: "border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200",
    activeClassName: "border-amber-500/40 bg-amber-500/15 text-amber-100",
  },
  {
    value: "disputer",
    label: "Disputer",
    hint: "Staff + disputer",
    className: "border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200",
    activeClassName: "border-sky-500/40 bg-sky-500/15 text-sky-100",
  },
  {
    value: "disputee",
    label: "Disputee",
    hint: "Staff + disputee",
    className: "border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200",
    activeClassName: "border-cyan-500/40 bg-cyan-500/15 text-cyan-100",
  },
  {
    value: "parties",
    label: "Parties",
    hint: "Both parties",
    className: "border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200",
    activeClassName: "border-emerald-500/40 bg-emerald-500/15 text-emerald-100",
  },
  {
    value: "public",
    label: "Public page",
    hint: "Shown on the public dispute page",
    className: "border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200",
    activeClassName: "border-violet-500/40 bg-violet-500/15 text-violet-100",
  },
];

function normalizeAudience(audience?: string, isInternal?: boolean): DisputeAudience {
  const a = String(audience || "").toLowerCase();
  if (a === "staff" || a === "disputer" || a === "disputee" || a === "parties" || a === "public") {
    return a;
  }
  if (a === "author_and_staff") return "author_and_staff";
  return isInternal ? "staff" : "parties";
}

function audienceBadge(audience?: string, isInternal?: boolean) {
  const a = normalizeAudience(audience, isInternal);
  if (a === "staff") {
    return { label: "Staff only", className: "border-amber-500/30 bg-amber-500/10 text-amber-200" };
  }
  if (a === "disputer") {
    return { label: "Visible to disputer", className: "border-sky-500/30 bg-sky-500/10 text-sky-200" };
  }
  if (a === "disputee") {
    return { label: "Visible to disputee", className: "border-cyan-500/30 bg-cyan-500/10 text-cyan-200" };
  }
  if (a === "author_and_staff") {
    return { label: "Private (author + staff)", className: "border-sky-500/30 bg-sky-500/10 text-sky-200" };
  }
  if (a === "public") {
    return { label: "Visible to the public", className: "border-violet-500/30 bg-violet-500/10 text-violet-200" };
  }
  return { label: "Visible to parties", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" };
}

function audienceShellClass(audience?: string) {
  const a = normalizeAudience(audience);
  if (a === "public") return "border-violet-500/20 bg-violet-500/5";
  if (a === "parties") return "border-emerald-500/20 bg-emerald-500/5";
  if (a === "disputer") return "border-sky-500/20 bg-sky-500/5";
  if (a === "disputee") return "border-cyan-500/20 bg-cyan-500/5";
  if (a === "staff") return "border-amber-500/20 bg-amber-500/5";
  return "border-sky-500/20 bg-sky-500/5";
}

function audienceSuccessLabel(audience: string) {
  if (audience === "public") return "Comment is now public";
  if (audience === "parties") return "Comment is visible to both parties";
  if (audience === "disputer") return "Comment is visible to the disputer";
  if (audience === "disputee") return "Comment is visible to the disputee";
  if (audience === "staff") return "Comment is staff only";
  return "Comment visibility updated";
}

function isPrivateAudience(audience?: string) {
  const a = normalizeAudience(audience);
  return a === "staff" || a === "author_and_staff" || a === "disputer" || a === "disputee";
}

const ACCENT_BTN: Record<Accent, string> = {
  sky: "bg-sky-500/90 hover:bg-sky-500",
  violet: "bg-violet-500/90 hover:bg-violet-500",
  emerald: "bg-emerald-500/90 hover:bg-emerald-500",
  rose: "bg-rose-500/90 hover:bg-rose-500",
};

/** Shared chrome for assign actions (same icon + layout everywhere). */
const HANDLER_ACTION_BTN =
  "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm disabled:opacity-50";
const HANDLER_ACTION_ICON = "h-4 w-4 shrink-0";
const HANDLER_TONES = {
  claim: "border-sky-500/30 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20",
  release: "border-amber-500/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20",
  cancel: "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10",
} as const;

const STATUS_OPTIONS = [
  "pending_review",
  "open",
  "awaiting_response",
  "under_review",
  "closed",
];

const CLOSED_STATUS = "closed";

function isDisputeClosed(status: string) {
  return String(status || "").toLowerCase() === CLOSED_STATUS;
}

function statusButtonClass(label: string, active: boolean) {
  const s = String(label || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ");
  if (!active) {
    return "border-white/10 bg-transparent text-zinc-400 hover:border-white/20 hover:bg-white/[0.04] hover:text-zinc-200 disabled:opacity-40";
  }
  if (s === "pending review") return "border-violet-500/40 bg-violet-500/20 text-violet-200";
  if (s === "open") return "border-red-500/40 bg-red-500/20 text-red-200";
  if (s === "awaiting response") return "border-sky-500/40 bg-sky-500/20 text-sky-200";
  if (s === "under review") return "border-amber-500/40 bg-amber-500/20 text-amber-200";
  if (s === "closed") return "border-zinc-500/40 bg-zinc-500/25 text-zinc-200";
  return "border-white/25 bg-white/10 text-white";
}

/**
 * Dispute detail modal with discussion thread.
 * `endpointBase` e.g. "/api/admin/disputes" or "/api/moderator/support/disputes".
 * `adminMode` enables assign / publish / view-only gating.
 */
export default function ModeratorDisputeDetailModal({
  disputeId,
  endpointBase,
  accent = "sky",
  adminMode = false,
  deskLabel,
  onClose,
  onUpdated,
  onOpenDispute,
}: {
  disputeId: number | string;
  endpointBase: string;
  accent?: Accent;
  adminMode?: boolean;
  /** Shown in header when adminMode is on (e.g. Admin / Support). */
  deskLabel?: string;
  onClose: () => void;
  onUpdated: () => void;
  onOpenDispute?: (disputeId: string) => void;
}) {
  const [detail, setDetail] = useState<DisputeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [replyAudience, setReplyAudience] = useState<DisputeAudience>("staff");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [banPromptOpen, setBanPromptOpen] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [reopenPromptOpen, setReopenPromptOpen] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [settleClientCredits, setSettleClientCredits] = useState("0");
  const [settleFreelancerCredits, setSettleFreelancerCredits] = useState("0");
  const [settleNotes, setSettleNotes] = useState("");
  const [reverseOpen, setReverseOpen] = useState(false);
  const [reverseTxn, setReverseTxn] = useState<DisputeCaseTransaction | null>(null);
  const [reverseAmount, setReverseAmount] = useState("");
  const [reverseNotes, setReverseNotes] = useState("");
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  const applyDetail = (d: DisputeDetail, { syncForm = true }: { syncForm?: boolean } = {}) => {
    setDetail(d);
    if (!syncForm) return;
    setStatus(toApiToken(d.dispute.status));
    setPriority(toApiToken(d.dispute.priority));
    setAssigneeId(d.dispute.assignee?.staffId?.toString() || "");
    setResolutionNotes(d.dispute.resolutionNotes || "");
  };

  const load = async ({ soft = false }: { soft?: boolean } = {}) => {
    if (!soft) setLoading(true);
    try {
      const res = await api.get(`${endpointBase}/${disputeId}`);
      if (res.data?.success) {
        applyDetail(res.data.data as DisputeDetail);
      }
    } catch {
      if (!soft) showErrorToast("Failed to load dispute");
    } finally {
      if (!soft) setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disputeId]);

  useEffect(() => {
    const chatId = detail?.chatId;
    if (!chatId) return;

    const matchesRoom = (payload: DisputeSocketMessage) => {
      const room = payload?.conversationId || payload?.conversation_id;
      return !room || String(room) === String(chatId);
    };

    const upsertLiveMessage = (payload: DisputeSocketMessage) => {
      if (!matchesRoom(payload)) return;
      const mapped = mapDisputeSocketMessage(payload);
      if (!mapped) return;
      setDetail((current) => {
        if (!current) return current;
        return { ...current, messages: mergeDisputeMessage(current.messages || [], mapped) };
      });
    };

    const joinDisputeRoom = () => {
      socket.emit("joinRoom", { conversation_id: String(chatId) });
    };

    if (!socket.connected) socket.connect();
    joinDisputeRoom();
    socket.on("connect", joinDisputeRoom);
    socket.on("disputeMessage", upsertLiveMessage);
    socket.on("disputeMessageUpdated", upsertLiveMessage);

    return () => {
      socket.off("connect", joinDisputeRoom);
      socket.off("disputeMessage", upsertLiveMessage);
      socket.off("disputeMessageUpdated", upsertLiveMessage);
      socket.emit("leaveRoom", { conversation_id: String(chatId) });
    };
  }, [detail?.chatId]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [detail?.messages?.length]);

  const perms = detail?.permissions;
  const myStaffId = perms?.staffId != null ? String(perms.staffId) : "";
  const assigneeStaffId =
    detail?.dispute?.assignee?.staffId != null ? String(detail.dispute.assignee.staffId) : "";
  const alreadyAssignedToMe = Boolean(
    perms?.isAssignee ||
      (myStaffId &&
        assigneeStaffId &&
        myStaffId.toLowerCase() === assigneeStaffId.toLowerCase())
  );
  const canAct = adminMode ? Boolean(perms?.canAct || perms?.isAdmin) : true;
  const canReply = adminMode
    ? Boolean(
        perms?.canAct ||
          perms?.canReply ||
          perms?.isAdmin ||
          (perms?.canView !== false && perms?.staffId)
      )
    : true;
  const canAssignOthers = adminMode ? Boolean(perms?.canAssignOthers || perms?.isAdmin) : false;
  const canSelfAssign = adminMode
    ? Boolean(perms?.canSelfAssign && !alreadyAssignedToMe)
    : false;
  const canAssignMyself = adminMode
    ? Boolean(!alreadyAssignedToMe && (perms?.canAssignMyself || perms?.canSelfAssign))
    : false;
  // Only the current handler releases their own claim. Admins reassign via the dropdown.
  const canRelease = adminMode ? Boolean(alreadyAssignedToMe && (perms?.canRelease || perms?.isAssignee)) : false;
  const viewOnly = adminMode && !canAct;
  const canDecide = Boolean(perms?.canAct);
  const assigneeLocked =
    Boolean(assigneeStaffId) && !(canAssignOthers || Boolean(perms?.isAdmin));
  /** Handler dropdown: unlocked while unassigned, or Admin override */
  const canEditHandler =
    !adminMode || canAssignOthers || canSelfAssign || canAssignMyself || !assigneeLocked;
  const replyAudienceOptions = REPLY_AUDIENCE_OPTIONS.filter((option) => {
    if (option.value !== "public") return true;
    // Public-page replies only make sense after the dispute itself is visible.
    return Boolean(detail?.dispute?.visibility);
  });

  const runAction = async (body: Record<string, unknown>, successMsg: string) => {
    setSaving(true);
    try {
      await api.patch(`${endpointBase}/${disputeId}`, body);
      showSuccessToast(successMsg);
      await load();
      onUpdated();
      return true;
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to update dispute";
      showErrorToast(msg);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const openSettle = () => {
    const remaining = Number(detail?.dispute?.creditAmount || 0);
    setSettleClientCredits(String(remaining));
    setSettleFreelancerCredits("0");
    setSettleNotes(resolutionNotes || "");
    setSettleOpen(true);
  };

  const openReverse = (tx: DisputeCaseTransaction) => {
    setReverseTxn(tx);
    setReverseAmount(String(tx.amount || 0));
    setReverseNotes(resolutionNotes || "");
    setReverseOpen(true);
  };

  const confirmSettleEscrow = async () => {
    const clientCredits = Number(settleClientCredits);
    const freelancerCredits = Number(settleFreelancerCredits);
    if (!Number.isInteger(clientCredits) || clientCredits < 0 || !Number.isInteger(freelancerCredits) || freelancerCredits < 0) {
      showErrorToast("Settlement amounts must be non-negative integers.");
      return;
    }
    if (settleNotes.trim().length < 8) {
      showErrorToast("Resolution notes must be at least 8 characters.");
      return;
    }
    setSaving(true);
    try {
      await api.post(`${endpointBase}/${disputeId}/financial-resolution`, {
        action: "settle_escrow",
        clientCredits,
        freelancerCredits,
        resolutionNotes: settleNotes.trim(),
      });
      showSuccessToast("Escrow settled and dispute closed");
      setSettleOpen(false);
      await load();
      onUpdated();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to settle escrow";
      showErrorToast(msg);
    } finally {
      setSaving(false);
    }
  };

  const confirmReverseTransaction = async () => {
    if (!reverseTxn) return;
    const amount = Number(reverseAmount);
    if (!Number.isInteger(amount) || amount < 1) {
      showErrorToast("Reverse amount must be an integer of at least 1.");
      return;
    }
    if (reverseNotes.trim().length < 8) {
      showErrorToast("Resolution notes must be at least 8 characters.");
      return;
    }
    setSaving(true);
    try {
      await api.post(`${endpointBase}/${disputeId}/financial-resolution`, {
        action: "reverse_transaction",
        creditTransactionId: reverseTxn.id,
        amount,
        resolutionNotes: reverseNotes.trim(),
      });
      showSuccessToast("Transaction reversed and dispute closed");
      setReverseOpen(false);
      setReverseTxn(null);
      await load();
      onUpdated();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to reverse transaction";
      showErrorToast(msg);
    } finally {
      setSaving(false);
    }
  };

  const onHandlerChange = async (next: string) => {
    setAssigneeId(next);
    if (!adminMode || assigneeLocked) return;

    // Claim unassigned dispute by picking yourself
    if (
      (canSelfAssign || canAssignMyself) &&
      next &&
      myStaffId &&
      next.toLowerCase() === myStaffId.toLowerCase() &&
      !canAct
    ) {
      await runAction({ action: "self_assign" }, "You are now assigned");
      return;
    }

    // Admin may designate or reassign a handler anytime
    if (canAssignOthers) {
      await runAction(
        { handled_by_staff_id: next ? next : null },
        next ? "Handler assigned" : "Handler cleared"
      );
    }
  };

  const saveChanges = async (overrideStatus?: string) => {
    if (
      adminMode &&
      viewOnly &&
      (canSelfAssign || canAssignMyself) &&
      assigneeId &&
      myStaffId &&
      assigneeId.toLowerCase() === myStaffId.toLowerCase()
    ) {
      await runAction({ action: "self_assign" }, "You are now assigned");
      return;
    }
    if (adminMode && viewOnly && canAssignOthers && !assigneeLocked) {
      await runAction(
        { handled_by_staff_id: assigneeId ? assigneeId : null },
        "Assignment updated"
      );
      return;
    }
    const nextStatus = overrideStatus || status;
    const payload: Record<string, unknown> = {
      status: nextStatus,
      priority,
      resolution_notes: resolutionNotes || null,
    };
    if (adminMode) {
      // Admin may change handler anytime; others use Release / Assign myself while locked.
      if (!assigneeLocked && (canAssignOthers || canAssignMyself)) {
        payload.handled_by_staff_id = assigneeId ? assigneeId : null;
      } else if (canAssignOthers) {
        payload.handled_by_staff_id = assigneeId ? assigneeId : null;
      }
    }
    const closing = isDisputeClosed(nextStatus);
    await runAction(
      payload,
      closing ? "Dispute closed" : "Dispute updated"
    );
  };

  const sendMessage = async () => {
    const text = message.trim();
    if (!text || sending) return;
    const audience = canAct ? replyAudience : "staff";
    const pendingId = `pending-${Date.now()}`;
    const optimistic: TicketMessage = {
      id: pendingId,
      authorType: "staff",
      authorName: "You",
      authorRole: "staff",
      body: text,
      isInternal: isPrivateAudience(audience),
      audience,
      createdAt: new Date().toISOString(),
    };
    setDetail((current) =>
      current ? { ...current, messages: [...(current.messages || []), optimistic] } : current
    );
    setMessage("");
    setSending(true);
    try {
      const res = await api.post(`${endpointBase}/${disputeId}/messages`, {
        body: text,
        isInternal: isPrivateAudience(audience),
        visibleToParties: audience === "parties",
        visibleToPublic: audience === "public",
        audience,
        audiences: [audience],
      });
      if (res.data?.success && res.data.data) {
        applyDetail(res.data.data as DisputeDetail, { syncForm: false });
      } else {
        setDetail((current) =>
          current
            ? {
                ...current,
                messages: (current.messages || []).filter((item) => String(item.id) !== pendingId),
              }
            : current
        );
      }
      showSuccessToast(audienceSuccessLabel(audience));
    } catch (err: unknown) {
      setDetail((current) =>
        current
          ? {
              ...current,
              messages: (current.messages || []).filter((item) => String(item.id) !== pendingId),
            }
          : current
      );
      setMessage(text);
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to send message";
      showErrorToast(msg);
    } finally {
      setSending(false);
    }
  };

  const setMessageAudience = async (messageId: string | number, audience: DisputeAudience) => {
    if (!canAct) {
      showErrorToast("Assign yourself to this dispute before changing message visibility.");
      return;
    }
    setSaving(true);
    const previous = detail?.messages || [];
    setDetail((current) => {
      if (!current) return current;
      return {
        ...current,
        messages: (current.messages || []).map((item) =>
          String(item.id) === String(messageId)
            ? {
                ...item,
                audience,
                isInternal: isPrivateAudience(audience),
              }
            : item
        ),
      };
    });
    try {
      const res = await api.patch(`${endpointBase}/${disputeId}/messages/${messageId}`, { audience });
      if (res.data?.success && res.data.data) {
        applyDetail(res.data.data as DisputeDetail, { syncForm: false });
      }
      showSuccessToast(audienceSuccessLabel(audience));
    } catch (err: unknown) {
      setDetail((current) => (current ? { ...current, messages: previous } : current));
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to update comment";
      showErrorToast(msg);
    } finally {
      setSaving(false);
    }
  };

  const confirmBan = async () => {
    const reason = banReason.trim();
    if (!reason) {
      showErrorToast("A reason is required");
      return;
    }
    const ok = await runAction({ action: "convict", reason }, "Permanent ban applied");
    if (!ok) return;
    setBanPromptOpen(false);
    setBanReason("");
  };

  const confirmReopen = async () => {
    const ok = await runAction({ action: "reopen" }, "Dispute reopened");
    if (!ok) return;
    setReopenPromptOpen(false);
  };

  const dispute = detail?.dispute;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f1016] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className={`text-[10px] font-semibold uppercase tracking-wide ${accentSpinner(accent)}`}>
              Dispute detail{adminMode ? ` · ${deskLabel || "Staff"}` : ""}
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
                @{dispute.initiator.username} vs @{dispute.respondent.username} · {dispute.type || "General"} ·{" "}
                {dispute.creditAmount.toLocaleString()} credits · opened {formatDateTime(dispute.openedAt)}
              </p>
              {dispute.description && (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">{dispute.description}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-zinc-300">
                  Status: {titleCaseLabel(dispute.status)}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-zinc-300">
                  Case: {dispute.visibility ? "Visible to parties" : "Hidden from disputee"}
                </span>
                {dispute.creditHold && (
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-200">
                    Hold: {dispute.creditHold.amount.toLocaleString()} ({dispute.creditHold.status})
                  </span>
                )}
              </div>
            </div>

            <DisputeCaseFilePanel
              dispute={dispute}
              caseFile={detail.caseFile}
              onOpenDispute={onOpenDispute}
              canAct={canDecide}
              saving={saving}
              onSettleEscrow={openSettle}
              onReverseTransaction={openReverse}
            />

            {adminMode && viewOnly && (
              <div className="flex items-start gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-sm text-sky-100">
                <Eye className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">View only</p>
                  <p className="text-xs text-sky-200/80">
                    {!perms?.staffId
                      ? "Your login isn’t linked to a staff profile, so assignment is blocked. Re-login as Admin or Support Moderator."
                      : canAssignMyself || canSelfAssign
                        ? "This dispute needs a Support Moderator (or Admin). Click Assign myself to claim it."
                        : canAssignOthers
                          ? "You’re not the handler yet. Pick a Support Moderator in Designated handler, or Assign myself."
                          : "Only Support Moderators or Admin can claim and handle disputes. You can still post private replies (staff + you)."}
                  </p>
                </div>
              </div>
            )}

            {adminMode && (
              <div className="flex flex-wrap gap-2">
                {canAssignMyself && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void runAction({ action: "self_assign" }, "You are now assigned")}
                    className={`${HANDLER_ACTION_BTN} ${HANDLER_TONES.claim}`}
                  >
                    <Hand className={HANDLER_ACTION_ICON} />
                    Assign myself
                  </button>
                )}
                {canRelease && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      void runAction(
                        { action: "release" },
                        "You released this case — another Support Moderator can claim it"
                      )
                    }
                    className={`${HANDLER_ACTION_BTN} ${HANDLER_TONES.release}`}
                  >
                    Release my claim
                  </button>
                )}
                {canAct && !dispute.visibility && !isDisputeClosed(toApiToken(dispute.status)) && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void runAction({ action: "approve" }, "Dispute is now visible to parties")}
                    className={`rounded-xl px-3 py-2 text-sm font-medium text-white disabled:opacity-50 ${ACCENT_BTN[accent]}`}
                  >
                    Make dispute visible
                  </button>
                )}
                {canAct && toApiToken(dispute.status) === "pending_review" && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void runAction({ action: "dismiss" }, "Dispute dismissed")}
                    className={`${HANDLER_ACTION_BTN} ${HANDLER_TONES.cancel}`}
                  >
                    <ShieldAlert className={HANDLER_ACTION_ICON} />
                    Dismiss
                  </button>
                )}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5 text-xs text-zinc-500 sm:col-span-3">
                Status
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Dispute status">
                  {STATUS_OPTIONS.map((s) => {
                    const active = toApiToken(status) === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        disabled={viewOnly}
                        aria-pressed={active}
                        onClick={() => setStatus(s)}
                        className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed ${statusButtonClass(s, active)}`}
                      >
                        {titleCaseLabel(s)}
                      </button>
                    );
                  })}
                </div>
              </div>
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
              <label className="flex flex-col gap-1 text-xs text-zinc-500 sm:col-span-2">
                Designated handler
                <select
                  value={assigneeId}
                  onChange={(e) => void onHandlerChange(e.target.value)}
                  disabled={!canEditHandler || saving || assigneeLocked}
                  className="rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Unassigned</option>
                  {detail.assignableStaff
                    .filter((s) => {
                      if (!myStaffId) return true;
                      const isMe =
                        String(s.staffId).toLowerCase() === myStaffId.toLowerCase();
                      // Admins / claim-eligible staff must see themselves in this list.
                      if (isMe) {
                        return (
                          canAssignOthers ||
                          canAssignMyself ||
                          canSelfAssign ||
                          alreadyAssignedToMe
                        );
                      }
                      return true;
                    })
                    .map((s) => (
                    <option key={s.staffId} value={String(s.staffId)}>
                      {s.name}
                      {myStaffId && String(s.staffId).toLowerCase() === myStaffId.toLowerCase()
                        ? " (you)"
                        : ""}{" "}
                      ({s.role})
                    </option>
                  ))}
                </select>
                {assigneeLocked && (
                  <span className="text-[11px] text-zinc-500">
                    Handler is locked. The assigned Support Moderator must release their claim before
                    someone else can take it.
                  </span>
                )}
                {!assigneeLocked && assigneeStaffId && canAssignOthers && (
                  <span className="text-[11px] text-violet-300/80">
                    Admin override: pick any Support Moderator or Admin here, including yourself.
                  </span>
                )}
                {!canEditHandler && !assigneeLocked && (
                  <span className="text-[11px] text-amber-200/80">
                    {!perms?.staffId
                      ? "Your session isn’t linked to a staff profile — re-login as Admin or Support Moderator."
                      : "You can’t change the handler on this dispute."}
                  </span>
                )}
                {canAssignMyself && (
                  <span className="text-[11px] text-sky-200/70">
                    Use Assign myself above, or choose yourself ({deskLabel || "Admin"} / Support) in this list.
                  </span>
                )}
              </label>
            </div>

            {canDecide && (
              <div className="space-y-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                <p className="text-xs font-medium text-red-100">Final decision</p>
                {String(dispute.sanctionType || "").toLowerCase() === "ban" &&
                !isDisputeClosed(toApiToken(dispute.status)) ? (
                  <p className="text-xs leading-relaxed text-zinc-400">
                    @{dispute.respondent.username} is permanently banned from this dispute. The ban stays until you lift it on the account.
                  </p>
                ) : isDisputeClosed(toApiToken(dispute.status)) ? (
                  <>
                    <p className="text-xs leading-relaxed text-zinc-400">
                      {String(dispute.sanctionType || "").toLowerCase() === "ban"
                        ? `This case closed with a permanent ban on @${dispute.respondent.username}. Reopen it if they appeal. Reopening does not lift the ban.`
                        : "This case is closed. Reopen it if you need to review an appeal."}
                    </p>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setReopenPromptOpen(true)}
                      className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50"
                    >
                      Reopen case
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-xs leading-relaxed text-zinc-400">
                      If the person who filed this is right, permanently ban @{dispute.respondent.username}. You will be asked for a reason. That reason is posted in the discussion, the case becomes visible, and the account is banned until staff lift it.
                    </p>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setBanPromptOpen(true)}
                      className="rounded-xl border border-red-500/40 bg-red-500/15 px-3 py-2 text-sm font-medium text-red-100 hover:bg-red-500/25 disabled:opacity-50"
                    >
                      Permanent ban
                    </button>
                  </>
                )}
              </div>
            )}

            {adminMode && (
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
            )}

            {!adminMode && (
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
            )}

            <div className="flex flex-wrap gap-2">
              {(canAct ||
                canAssignOthers ||
                (canAssignMyself &&
                  assigneeId &&
                  myStaffId &&
                  assigneeId.toLowerCase() === myStaffId.toLowerCase())) && (
                <button
                  type="button"
                  onClick={() => void saveChanges()}
                  disabled={
                    saving ||
                    (viewOnly &&
                      !canAssignOthers &&
                      !(
                        canAssignMyself &&
                        assigneeId &&
                        myStaffId &&
                        assigneeId.toLowerCase() === myStaffId.toLowerCase()
                      ))
                  }
                  className={`rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${ACCENT_BTN[accent]}`}
                >
                  {viewOnly &&
                  canAssignMyself &&
                  assigneeId &&
                  myStaffId &&
                  assigneeId.toLowerCase() === myStaffId.toLowerCase() &&
                  !canAssignOthers
                    ? "Confirm assign myself"
                    : viewOnly && canAssignOthers
                      ? "Save assignment"
                      : "Save dispute changes"}
                </button>
              )}
              {canAct && !isDisputeClosed(toApiToken(dispute.status)) && (
                <button
                  type="button"
                  onClick={() => void saveChanges(CLOSED_STATUS)}
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
                const currentAudience = normalizeAudience(m.audience, m.isInternal);
                const badge = audienceBadge(currentAudience, m.isInternal);
                const canChangeAudience = adminMode && canAct;
                return (
                  <div
                    key={m.id}
                    className={`rounded-xl border px-4 py-3 ${audienceShellClass(currentAudience)}`}
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
                    </div>
                    {canChangeAudience && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {replyAudienceOptions.map((option) => {
                          const active = currentAudience === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              title={option.hint}
                              disabled={saving || active}
                              onClick={() => void setMessageAudience(m.id, option.value)}
                              className={`rounded-lg border px-2 py-1 text-[10px] font-medium disabled:opacity-60 ${
                                active ? option.activeClassName : option.className
                              }`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <p className="mt-2 text-sm text-zinc-200">{m.body}</p>
                  </div>
                );
              })}
              {detail.messages.length === 0 && detail.chatAvailable !== false && (
                <p className="text-sm text-zinc-500">No discussion yet — start the chat below.</p>
              )}
              <div ref={threadEndRef} />
            </div>

            <div className="rounded-xl border border-white/10 bg-[#14151c] p-4">
              {viewOnly && canReply && (
                <p className="mb-3 rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-xs text-sky-200">
                  View &amp; reply mode — replies stay staff-only until a Support Moderator or Admin claims the dispute
                  and changes visibility.
                </p>
              )}
              {canReply && canAct && (
                <div className="mb-3 space-y-1.5">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                    Reply visibility
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {replyAudienceOptions.map((option) => {
                      const active = replyAudience === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          title={option.hint}
                          disabled={sending}
                          onClick={() => setReplyAudience(option.value)}
                          className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-medium disabled:opacity-50 ${
                            active ? option.activeClassName : option.className
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    {replyAudienceOptions.find((option) => option.value === replyAudience)?.hint
                      || (!detail.dispute.visibility
                        ? "Make the dispute visible first if you need a public-page reply."
                        : null)}
                  </p>
                </div>
              )}
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder={
                  !canReply
                    ? "You cannot reply on this dispute…"
                    : canAct
                      ? "Write a reply…"
                      : "Write a staff-only reply…"
                }
                disabled={detail.chatAvailable === false || !canReply || sending}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
                className="w-full resize-none rounded-lg border border-white/10 bg-[#0f1016] px-3 py-2 text-sm text-white outline-none disabled:opacity-50"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-zinc-500">
                  {canAct
                    ? "Choose who can see this reply, then send. You can change it later on each message."
                    : "Staff-only until a handler publishes the reply."}
                </p>
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={sending || !message.trim() || detail.chatAvailable === false || !canReply}
                  className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15 disabled:opacity-50"
                >
                  {sending ? "Sending…" : "Send"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="py-12 text-center text-zinc-500">Dispute not found.</p>
        )}
      </div>

      {banPromptOpen && dispute && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md space-y-3 rounded-2xl border border-white/10 bg-[#14151c] p-4">
            <h3 className="text-sm font-semibold text-white">Permanent ban</h3>
            <p className="text-xs leading-relaxed text-zinc-400">
              This bans @{dispute.respondent.username} permanently, posts the reason in the discussion, and closes the case.
            </p>
            <label className="block text-xs text-zinc-500">
              Reason
              <textarea
                value={banReason}
                onChange={(event) => setBanReason(event.target.value)}
                rows={4}
                required
                placeholder="Why this ban is being applied"
                className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-[#0f1016] px-3 py-2 text-sm text-white outline-none"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setBanPromptOpen(false)}
                className="rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || !banReason.trim()}
                onClick={() => void confirmBan()}
                className="rounded-lg border border-red-500/40 bg-red-500/20 px-3 py-2 text-sm font-medium text-red-100 disabled:opacity-50"
              >
                {saving ? "Banning…" : "Ban permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {reopenPromptOpen && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md space-y-3 rounded-2xl border border-white/10 bg-[#14151c] p-4">
            <h3 className="text-sm font-semibold text-white">Reopen this case</h3>
            <p className="text-xs leading-relaxed text-zinc-400">
              The dispute goes back to under review so you can hear an appeal. A permanent ban stays until you lift it from the account.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setReopenPromptOpen(false)}
                className="rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void confirmReopen()}
                className="rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? "Reopening…" : "Reopen case"}
              </button>
            </div>
          </div>
        </div>
      )}

      {settleOpen && dispute && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md space-y-3 rounded-2xl border border-white/10 bg-[#14151c] p-4">
            <h3 className="text-sm font-semibold text-white">Settle frozen escrow</h3>
            <p className="text-xs leading-relaxed text-zinc-400">
              Split up to {Number(dispute.creditAmount || 0).toLocaleString()} remaining escrow credits.
              Refund goes to the client, release goes to the freelancer. This closes the dispute.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs text-zinc-500">
                Client refund
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={settleClientCredits}
                  onChange={(event) => setSettleClientCredits(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f1016] px-3 py-2 text-sm text-white outline-none"
                />
              </label>
              <label className="block text-xs text-zinc-500">
                Freelancer release
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={settleFreelancerCredits}
                  onChange={(event) => setSettleFreelancerCredits(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f1016] px-3 py-2 text-sm text-white outline-none"
                />
              </label>
            </div>
            <label className="block text-xs text-zinc-500">
              Resolution notes
              <textarea
                value={settleNotes}
                onChange={(event) => setSettleNotes(event.target.value)}
                rows={3}
                placeholder="Why this split is correct"
                className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-[#0f1016] px-3 py-2 text-sm text-white outline-none"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setSettleOpen(false)}
                className="rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || settleNotes.trim().length < 8}
                onClick={() => void confirmSettleEscrow()}
                className="rounded-lg border border-amber-500/40 bg-amber-500/20 px-3 py-2 text-sm font-medium text-amber-100 disabled:opacity-50"
              >
                {saving ? "Settling…" : "Settle and close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {reverseOpen && reverseTxn && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md space-y-3 rounded-2xl border border-white/10 bg-[#14151c] p-4">
            <h3 className="text-sm font-semibold text-white">Reverse transaction</h3>
            <p className="text-xs leading-relaxed text-zinc-400">
              Reverse {reverseTxn.type} of {reverseTxn.amount.toLocaleString()} credits. If the
              recipient no longer has enough spendable credits, this fails and nothing moves. This
              closes the dispute.
            </p>
            <label className="block text-xs text-zinc-500">
              Amount
              <input
                type="number"
                min={1}
                max={reverseTxn.amount}
                step={1}
                value={reverseAmount}
                onChange={(event) => setReverseAmount(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f1016] px-3 py-2 text-sm text-white outline-none"
              />
            </label>
            <label className="block text-xs text-zinc-500">
              Resolution notes
              <textarea
                value={reverseNotes}
                onChange={(event) => setReverseNotes(event.target.value)}
                rows={3}
                placeholder="Why this reverse is correct"
                className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-[#0f1016] px-3 py-2 text-sm text-white outline-none"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setReverseOpen(false);
                  setReverseTxn(null);
                }}
                className="rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || reverseNotes.trim().length < 8}
                onClick={() => void confirmReverseTransaction()}
                className="rounded-lg border border-rose-500/40 bg-rose-500/20 px-3 py-2 text-sm font-medium text-rose-100 disabled:opacity-50"
              >
                {saving ? "Reversing…" : "Reverse and close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
