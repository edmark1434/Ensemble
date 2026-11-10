import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  CornerUpLeft,
  Eye,
  EyeOff,
  FileText,
  Globe,
  Hand,
  Loader2,
  MessageSquare,
  Send,
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
import { BTN, BTN_BASE, ConfirmDialog, FIELD, Pill, SidebarSection } from "./staffCaseUi";

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
  replyToId?: string | null;
  message_id_reply?: string | null;
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
    replyToId: raw.replyToId ?? raw.message_id_reply ?? null,
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
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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
  activeClassName: string;
}[] = [
  {
    value: "staff",
    label: "Staff",
    hint: "Only staff can see this reply.",
    activeClassName: "border-amber-500/40 bg-amber-500/15 text-amber-100",
  },
  {
    value: "disputer",
    label: "Disputer",
    hint: "Staff and the person who filed the dispute.",
    activeClassName: "border-sky-500/40 bg-sky-500/15 text-sky-100",
  },
  {
    value: "disputee",
    label: "Disputee",
    hint: "Staff and the person named in the dispute.",
    activeClassName: "border-cyan-500/40 bg-cyan-500/15 text-cyan-100",
  },
  {
    value: "parties",
    label: "Both parties",
    hint: "Staff, the disputer, and the disputee.",
    activeClassName: "border-emerald-500/40 bg-emerald-500/15 text-emerald-100",
  },
  {
    value: "public",
    label: "Public",
    hint: "Everyone viewing the public dispute page.",
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
  if (a === "staff") return { label: "Staff only", className: "border-amber-500/30 bg-amber-500/10 text-amber-200" };
  if (a === "disputer") return { label: "Disputer + staff", className: "border-sky-500/30 bg-sky-500/10 text-sky-200" };
  if (a === "disputee") return { label: "Disputee + staff", className: "border-cyan-500/30 bg-cyan-500/10 text-cyan-200" };
  if (a === "author_and_staff") return { label: "Author + staff", className: "border-sky-500/30 bg-sky-500/10 text-sky-200" };
  if (a === "public") return { label: "Public", className: "border-violet-500/30 bg-violet-500/10 text-violet-200" };
  return { label: "Both parties", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" };
}

function audienceAccentClass(audience?: string) {
  const a = normalizeAudience(audience);
  if (a === "public") return "border-l-violet-400/60";
  if (a === "parties") return "border-l-emerald-400/60";
  if (a === "disputee") return "border-l-cyan-400/60";
  if (a === "staff") return "border-l-amber-400/60";
  return "border-l-sky-400/60";
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

/**
 * A reply from someone who is not a party on the dispute. These land private to the
 * author and staff and stay hidden from the public page until staff publish them.
 */
function isPendingCommunityComment(message: TicketMessage) {
  const role = String(message.authorRole || "").toLowerCase();
  if (role !== "community" && role !== "public") return false;
  return isPrivateAudience(normalizeAudience(message.audience, message.isInternal));
}

function quoteSnippet(body?: string, limit = 140) {
  const text = String(body || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > limit ? `${text.slice(0, limit).trimEnd()}…` : text;
}

function authorRoleLabel(message: TicketMessage) {
  const role = String(message.authorRole || message.authorType || "").toLowerCase();
  if (role === "staff") return "Staff";
  if (role === "disputer") return "Disputer";
  if (role === "disputee") return "Disputee";
  if (role === "community" || role === "public") return "Community";
  if (role === "user" || role === "member") return "Member";
  return role ? titleCaseLabel(role) : null;
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

function priorityPillClass(priority: string) {
  const p = String(priority || "").toLowerCase();
  if (p === "high") return "border-red-500/30 bg-red-500/10 text-red-200";
  if (p === "medium") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  return "border-white/10 bg-white/5 text-zinc-300";
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
  const [tab, setTab] = useState<"discussion" | "case">("discussion");
  const [message, setMessage] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
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
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

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
    setTab("discussion");
    setReplyToId(null);
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
    if (tab !== "discussion") return;
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [detail?.messages?.length, tab]);

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
  // Only the current handler releases their own claim. Admins reassign via the picker.
  const canRelease = adminMode ? Boolean(alreadyAssignedToMe && (perms?.canRelease || perms?.isAssignee)) : false;
  const viewOnly = adminMode && !canAct;
  const canDecide = Boolean(perms?.canAct);
  const assigneeLocked =
    Boolean(assigneeStaffId) && !(canAssignOthers || Boolean(perms?.isAdmin));
  const canPickHandler =
    adminMode && !assigneeLocked && (canAssignOthers || canAssignMyself || canSelfAssign);
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

  // Handler changes save immediately from the handler picker; this only saves case fields.
  const saveChanges = async (overrideStatus?: string) => {
    const nextStatus = overrideStatus || status;
    await runAction(
      {
        status: nextStatus,
        priority,
        resolution_notes: resolutionNotes || null,
      },
      isDisputeClosed(nextStatus) ? "Dispute closed" : "Dispute updated"
    );
  };

  const sendMessage = async () => {
    const text = message.trim();
    if (!text || sending) return;
    const audience = canAct ? replyAudience : "staff";
    const parentId = replyToId;
    const pendingId = `pending-${Date.now()}`;
    const optimistic: TicketMessage = {
      id: pendingId,
      authorType: "staff",
      authorName: "You",
      authorRole: "staff",
      body: text,
      isInternal: isPrivateAudience(audience),
      audience,
      replyToId: parentId,
      createdAt: new Date().toISOString(),
    };
    setDetail((current) =>
      current ? { ...current, messages: [...(current.messages || []), optimistic] } : current
    );
    setMessage("");
    setReplyToId(null);
    setSending(true);
    try {
      const res = await api.post(`${endpointBase}/${disputeId}/messages`, {
        body: text,
        isInternal: isPrivateAudience(audience),
        visibleToParties: audience === "parties",
        visibleToPublic: audience === "public",
        audience,
        audiences: [audience],
        ...(parentId ? { replyToId: parentId } : {}),
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
      setReplyToId(parentId);
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
  const closed = dispute ? isDisputeClosed(toApiToken(dispute.status)) || Boolean(dispute.isClosed) : false;
  const banned = String(dispute?.sanctionType || "").toLowerCase() === "ban";
  const canSettle = Boolean(
    dispute && canDecide && !closed && !dispute.financialResolution && Number(dispute.creditAmount || 0) > 0
  );
  const selectedAudience = replyAudienceOptions.find((option) => option.value === replyAudience);
  const messageById = new Map((detail?.messages || []).map((item) => [String(item.id), item]));
  const replyingTo = replyToId ? messageById.get(String(replyToId)) : undefined;

  const jumpToMessage = (messageId: string) => {
    const node = document.getElementById(`dispute-msg-${messageId}`);
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
    node.classList.add("ring-1", "ring-white/40");
    window.setTimeout(() => node.classList.remove("ring-1", "ring-white/40"), 1200);
  };

  const startReply = (messageId: string) => {
    setReplyToId(String(messageId));
    composerRef.current?.focus();
  };

  const viewOnlyMessage = !perms?.staffId
    ? "Your login isn’t linked to a staff profile. Sign in again as Admin or Support Moderator."
    : canAssignMyself || canSelfAssign
      ? "View only. Assign yourself to handle this case."
      : canAssignOthers
        ? "View only. Pick a handler or assign yourself."
        : "View only. You can still post staff-only replies.";

  const composerHint = !canReply
    ? "You cannot reply on this dispute."
    : !canAct
      ? "Replies stay staff-only until a handler claims this case."
      : `${selectedAudience?.hint || ""}${
          !dispute?.visibility ? " Make the dispute public to reply on the public page." : ""
        }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="relative flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f1016] shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-4">
          <div className="min-w-0">
            <p className={`text-[10px] font-semibold uppercase tracking-wide ${accentSpinner(accent)}`}>
              Dispute{adminMode ? ` · ${deskLabel || "Staff"}` : ""}
              {dispute?.number ? ` · ${dispute.number}` : ""}
            </p>
            <h2 className="mt-1 truncate text-lg font-semibold text-white">
              {dispute?.title || dispute?.number || "Dispute"}
            </h2>
            {dispute && (
              <>
                <p className="mt-1 text-xs text-zinc-500">
                  @{dispute.initiator.username} vs @{dispute.respondent.username} · {dispute.type || "General"} ·{" "}
                  {dispute.creditAmount.toLocaleString()} credits · Opened {formatDateTime(dispute.openedAt)}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <Pill className={statusButtonClass(dispute.status, true)}>{titleCaseLabel(dispute.status)}</Pill>
                  <Pill className={priorityPillClass(dispute.priority)}>{titleCaseLabel(dispute.priority)} priority</Pill>
                  <Pill
                    className={
                      dispute.visibility
                        ? "border-violet-500/30 bg-violet-500/10 text-violet-200"
                        : "border-white/10 bg-white/5 text-zinc-300"
                    }
                  >
                    {dispute.visibility ? <Globe className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    {dispute.visibility ? "Public" : "Private"}
                  </Pill>
                  <Pill
                    className={
                      dispute.assignee
                        ? "border-white/10 bg-white/5 text-zinc-300"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                    }
                  >
                    {dispute.assignee ? `Handler: ${dispute.assignee.name}` : "Unassigned"}
                  </Pill>
                  {dispute.creditHold && (
                    <Pill className="border-amber-500/30 bg-amber-500/10 text-amber-200">
                      Hold {dispute.creditHold.amount.toLocaleString()} · {titleCaseLabel(dispute.creditHold.status)}
                    </Pill>
                  )}
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className={`h-8 w-8 animate-spin ${accentSpinner(accent)}`} />
          </div>
        ) : detail && dispute ? (
          <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_340px] lg:overflow-hidden">
            {/* Main column: discussion or case file */}
            <div className="flex min-h-[60vh] flex-col border-white/10 lg:min-h-0 lg:border-r">
              <nav className="flex gap-1 border-b border-white/10 px-4" aria-label="Dispute sections">
                {(
                  [
                    { id: "discussion", label: `Discussion (${detail.messages.length})`, icon: MessageSquare },
                    { id: "case", label: "Case file", icon: FileText },
                  ] as const
                ).map((item) => {
                  const active = tab === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTab(item.id)}
                      aria-pressed={active}
                      className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition ${
                        active
                          ? "border-white text-white"
                          : "border-transparent text-zinc-500 hover:text-zinc-200"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              {tab === "discussion" ? (
                <>
                  <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
                    {detail.chatAvailable === false && (
                      <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
                        MongoDB is not connected, so the discussion is unavailable. Case updates still work.
                      </p>
                    )}

                    {dispute.description && (
                      <article className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                          Complaint from @{dispute.initiator.username}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                          {dispute.description}
                        </p>
                      </article>
                    )}

                    {detail.messages.map((m) => {
                      const currentAudience = normalizeAudience(m.audience, m.isInternal);
                      const badge = audienceBadge(currentAudience, m.isInternal);
                      const role = authorRoleLabel(m);
                      const pending = String(m.id).startsWith("pending-");
                      const canChangeAudience = adminMode && canAct && !pending;
                      const listed = replyAudienceOptions.some((option) => option.value === currentAudience);
                      const awaitingReview = !pending && isPendingCommunityComment(m);
                      const parent = m.replyToId ? messageById.get(String(m.replyToId)) : undefined;
                      return (
                        <article
                          key={m.id}
                          id={`dispute-msg-${m.id}`}
                          className={`group rounded-xl border border-l-2 border-white/[0.08] px-4 py-3 transition ${audienceAccentClass(currentAudience)} ${pending ? "opacity-60" : ""} ${
                            awaitingReview ? "border-l-amber-400/70 bg-amber-500/[0.06]" : "bg-white/[0.02]"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
                              <span className="font-medium text-zinc-100">{m.authorName}</span>
                              {role && (
                                <span className="rounded border border-white/10 px-1.5 py-px text-[10px] text-zinc-400">
                                  {role}
                                </span>
                              )}
                              {awaitingReview && (
                                <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-px text-[10px] font-semibold text-amber-200">
                                  Awaiting review
                                </span>
                              )}
                              <span className="text-zinc-500">{pending ? "Sending…" : formatDateTime(m.createdAt)}</span>
                            </div>
                            {canChangeAudience ? (
                              <label className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                                Visible to
                                <select
                                  value={currentAudience}
                                  disabled={saving}
                                  onChange={(e) => void setMessageAudience(m.id, e.target.value as DisputeAudience)}
                                  className={`rounded-md border bg-[#0f1016] px-2 py-1 text-[11px] outline-none disabled:opacity-50 ${badge.className}`}
                                >
                                  {!listed && (
                                    <option value={currentAudience} disabled>
                                      {badge.label}
                                    </option>
                                  )}
                                  {replyAudienceOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {audienceBadge(option.value).label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            ) : (
                              <span className={`rounded-full border px-2 py-0.5 text-[10px] ${badge.className}`}>
                                {badge.label}
                              </span>
                            )}
                          </div>
                          {m.replyToId ? (
                            parent ? (
                              <button
                                type="button"
                                onClick={() => jumpToMessage(String(parent.id))}
                                className="mt-2 block w-full rounded-lg border-l-2 border-white/20 bg-white/[0.04] px-2.5 py-1.5 text-left transition hover:bg-white/[0.08]"
                              >
                                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-300">
                                  <CornerUpLeft className="h-3 w-3 shrink-0" />
                                  {parent.authorName}
                                  <span className={`rounded-full border px-1.5 text-[9px] ${audienceBadge(parent.audience, parent.isInternal).className}`}>
                                    {audienceBadge(parent.audience, parent.isInternal).label}
                                  </span>
                                </span>
                                <span className="mt-0.5 block truncate text-[11px] text-zinc-400">
                                  {quoteSnippet(parent.body)}
                                </span>
                              </button>
                            ) : (
                              <p className="mt-2 flex items-center gap-1.5 rounded-lg border-l-2 border-white/10 bg-white/[0.02] px-2.5 py-1.5 text-[11px] italic text-zinc-500">
                                <CornerUpLeft className="h-3 w-3 shrink-0" />
                                The quoted message is no longer on this case
                              </p>
                            )
                          ) : null}
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">{m.body}</p>
                          {canReply && !pending && (
                            <button
                              type="button"
                              onClick={() => startReply(String(m.id))}
                              className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-500 opacity-0 transition hover:text-zinc-200 focus:opacity-100 group-hover:opacity-100"
                            >
                              <CornerUpLeft className="h-3 w-3" />
                              Reply
                            </button>
                          )}
                          {awaitingReview && (
                            <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-2">
                              <p className="text-[11px] text-amber-200/80">
                                Held because {m.authorName} is not a party on this dispute. Only they and staff can see it.
                              </p>
                              {canChangeAudience && (
                                <button
                                  type="button"
                                  disabled={saving || !dispute.visibility}
                                  title={
                                    dispute.visibility
                                      ? "Publish this comment on the public dispute page"
                                      : "Make the dispute public before publishing community comments"
                                  }
                                  onClick={() => void setMessageAudience(m.id, "public")}
                                  className="ml-auto rounded-md border border-violet-500/40 bg-violet-500/15 px-2 py-1 text-[11px] font-semibold text-violet-100 transition hover:bg-violet-500/25 disabled:opacity-40"
                                >
                                  Make public
                                </button>
                              )}
                            </div>
                          )}
                        </article>
                      );
                    })}

                    {detail.messages.length === 0 && detail.chatAvailable !== false && (
                      <div className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-zinc-500">
                        No replies yet. Start the discussion below.
                      </div>
                    )}
                    <div ref={threadEndRef} />
                  </div>

                  <div className="border-t border-white/10 bg-[#0f1016] px-5 py-3">
                    {replyToId && (
                      <div className="mb-2 flex items-start gap-2 rounded-lg border-l-2 border-white/20 bg-white/[0.04] px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-300">
                            <CornerUpLeft className="h-3 w-3 shrink-0" />
                            Replying to {replyingTo?.authorName || "a message"}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-zinc-400">
                            {replyingTo
                              ? quoteSnippet(replyingTo.body)
                              : "That message is no longer on this case."}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setReplyToId(null)}
                          aria-label="Cancel reply"
                          className="rounded p-1 text-zinc-500 transition hover:bg-white/10 hover:text-white"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    {canReply && canAct && (
                      <div className="mb-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="Reply visibility">
                        <span className="mr-1 text-[11px] text-zinc-500">Visible to</span>
                        {replyAudienceOptions.map((option) => {
                          const active = replyAudience === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              title={option.hint}
                              disabled={sending}
                              aria-pressed={active}
                              onClick={() => setReplyAudience(option.value)}
                              className={`rounded-md border px-2 py-1 text-[11px] font-medium transition disabled:opacity-50 ${
                                active
                                  ? option.activeClassName
                                  : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                              }`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <div className="flex items-end gap-2">
                      <textarea
                        ref={composerRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={2}
                        placeholder={
                          !canReply
                            ? "You cannot reply on this dispute"
                            : replyToId
                              ? `Reply to ${replyingTo?.authorName || "this message"}`
                              : canAct
                                ? "Write a reply"
                                : "Write a staff-only reply"
                        }
                        disabled={detail.chatAvailable === false || !canReply || sending}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void sendMessage();
                          }
                          if (e.key === "Escape" && replyToId) {
                            e.preventDefault();
                            setReplyToId(null);
                          }
                        }}
                        className={`${FIELD} resize-none`}
                      />
                      <button
                        type="button"
                        onClick={() => void sendMessage()}
                        disabled={sending || !message.trim() || detail.chatAvailable === false || !canReply}
                        className={`${BTN_BASE} h-[58px] border-transparent px-4 text-white ${ACCENT_BTN[accent]}`}
                      >
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Send
                      </button>
                    </div>
                    <p className="mt-1.5 text-[11px] text-zinc-500">
                      {composerHint}
                      {canReply ? " Enter to send, Shift+Enter for a new line." : ""}
                    </p>
                  </div>
                </>
              ) : (
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                  <DisputeCaseFilePanel
                    dispute={dispute}
                    caseFile={detail.caseFile}
                    onOpenDispute={onOpenDispute}
                    canAct={canDecide}
                    saving={saving}
                    onReverseTransaction={openReverse}
                  />
                </div>
              )}
            </div>

            {/* Sidebar: handling and decisions */}
            <aside className="min-h-0 space-y-3 border-t border-white/10 bg-black/10 p-4 lg:overflow-y-auto lg:border-t-0">
              {adminMode && (
                <SidebarSection title="Handler">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    {dispute.assignee ? (
                      <div className="min-w-0">
                        <p className="truncate text-white">
                          {dispute.assignee.name}
                          {alreadyAssignedToMe ? <span className="text-zinc-500"> (you)</span> : null}
                        </p>
                        <p className="text-xs text-zinc-500">{dispute.assignee.role}</p>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-amber-200">
                        <Hand className="h-4 w-4" />
                        Unassigned
                      </span>
                    )}
                  </div>

                  {viewOnly && (
                    <p className="flex items-start gap-2 rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-xs text-sky-100">
                      <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {viewOnlyMessage}
                    </p>
                  )}

                  {canPickHandler && (
                    <label className="block space-y-1 text-[11px] text-zinc-500">
                      <span>{canAssignOthers ? "Assign handler" : "Claim this case"}</span>
                      <select
                        value={assigneeId}
                        onChange={(e) => void onHandlerChange(e.target.value)}
                        disabled={saving}
                        className={FIELD}
                      >
                        <option value="">Unassigned</option>
                        {detail.assignableStaff
                          .filter((s) => {
                            if (!myStaffId) return true;
                            const isMe = String(s.staffId).toLowerCase() === myStaffId.toLowerCase();
                            if (isMe) {
                              return canAssignOthers || canAssignMyself || canSelfAssign || alreadyAssignedToMe;
                            }
                            return true;
                          })
                          .map((s) => (
                            <option key={s.staffId} value={String(s.staffId)}>
                              {s.name}
                              {myStaffId && String(s.staffId).toLowerCase() === myStaffId.toLowerCase() ? " (you)" : ""} ·{" "}
                              {s.role}
                            </option>
                          ))}
                      </select>
                    </label>
                  )}

                  {assigneeLocked && (
                    <p className="text-[11px] text-zinc-500">
                      Locked to the current handler until they release it.
                    </p>
                  )}

                  {(canAssignMyself || canRelease) && (
                    <div className="flex flex-wrap gap-2">
                      {canAssignMyself && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void runAction({ action: "self_assign" }, "You are now assigned")}
                          className={BTN.claim}
                        >
                          <Hand className="h-3.5 w-3.5" />
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
                              "You released this case. Another Support Moderator can claim it."
                            )
                          }
                          className={BTN.warn}
                        >
                          Release my claim
                        </button>
                      )}
                    </div>
                  )}
                </SidebarSection>
              )}

              <SidebarSection title="Case">
                <div className="space-y-1.5">
                  <p className="text-[11px] text-zinc-500">Status</p>
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
                          className={`rounded-md border px-2 py-1 text-[11px] font-medium transition disabled:cursor-not-allowed ${statusButtonClass(s, active)}`}
                        >
                          {titleCaseLabel(s)}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <label className="block space-y-1 text-[11px] text-zinc-500">
                  <span>Priority</span>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    disabled={viewOnly}
                    className={FIELD}
                  >
                    {["low", "medium", "high"].map((p) => (
                      <option key={p} value={p}>
                        {titleCaseLabel(p)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1 text-[11px] text-zinc-500">
                  <span>Resolution notes</span>
                  <textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    rows={3}
                    disabled={viewOnly}
                    placeholder="How was (or will) this dispute be settled?"
                    className={`${FIELD} resize-none`}
                  />
                </label>
                {canAct && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void saveChanges()}
                      disabled={saving}
                      className={`${BTN_BASE} border-transparent text-white ${ACCENT_BTN[accent]}`}
                    >
                      Save changes
                    </button>
                    {!closed && (
                      <button
                        type="button"
                        onClick={() => void saveChanges(CLOSED_STATUS)}
                        disabled={saving}
                        className={BTN.success}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Resolve
                      </button>
                    )}
                  </div>
                )}
              </SidebarSection>

              {adminMode && (
                <SidebarSection title="Visibility">
                  <p className="text-xs leading-relaxed text-zinc-400">
                    {dispute.visibility
                      ? "Public. Shown on both profiles and the public dispute page, where anyone signed in can reply."
                      : "Private. Only staff and the disputer can see it. The disputee can't reply yet."}
                  </p>
                  {canAct && !dispute.visibility && !closed && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void runAction({ action: "approve" }, "Dispute is now public")}
                      className={`${BTN_BASE} border-transparent text-white ${ACCENT_BTN[accent]}`}
                    >
                      <Globe className="h-3.5 w-3.5" />
                      Make public
                    </button>
                  )}
                  {canAct && dispute.visibility && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        void runAction(
                          { action: "hide" },
                          "Dispute is private again. It's off profiles and the public page."
                        )
                      }
                      className={BTN.warn}
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                      Make private
                    </button>
                  )}
                </SidebarSection>
              )}

              {canDecide && (
                <SidebarSection title="Decision">
                  {canSettle && (
                    <div className="space-y-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
                      <p className="text-xs text-amber-100">
                        {dispute.creditAmount.toLocaleString()} credits are frozen in escrow.
                      </p>
                      <button type="button" disabled={saving} onClick={openSettle} className={BTN.warn}>
                        Settle escrow
                      </button>
                    </div>
                  )}

                  {adminMode && toApiToken(dispute.status) === "pending_review" && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void runAction({ action: "dismiss" }, "Dispute dismissed")}
                      className={BTN.neutral}
                    >
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Dismiss dispute
                    </button>
                  )}

                  {closed ? (
                    <>
                      <p className="text-xs leading-relaxed text-zinc-400">
                        {banned
                          ? `Closed with a permanent ban on @${dispute.respondent.username}. Reopening does not lift the ban.`
                          : "This case is closed. Reopen it to review an appeal."}
                      </p>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => setReopenPromptOpen(true)}
                        className={BTN.neutral}
                      >
                        Reopen case
                      </button>
                    </>
                  ) : banned ? (
                    <p className="text-xs leading-relaxed text-zinc-400">
                      @{dispute.respondent.username} is permanently banned from this dispute until staff lift it on the account.
                    </p>
                  ) : (
                    <>
                      <p className="text-xs leading-relaxed text-zinc-400">
                        If the disputer is right, permanently ban @{dispute.respondent.username}. The reason is posted in
                        the discussion and the case becomes public.
                      </p>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => setBanPromptOpen(true)}
                        className={BTN.danger}
                      >
                        Permanent ban
                      </button>
                    </>
                  )}
                </SidebarSection>
              )}
            </aside>
          </div>
        ) : (
          <p className="flex flex-1 items-center justify-center text-zinc-500">Dispute not found.</p>
        )}

        {banPromptOpen && dispute && (
          <ConfirmDialog
            title="Permanent ban"
            description={`This bans @${dispute.respondent.username} permanently, posts the reason in the discussion, and closes the case.`}
            confirmLabel="Ban permanently"
            busyLabel="Banning…"
            busy={saving}
            confirmDisabled={!banReason.trim()}
            confirmClassName={BTN.danger}
            onCancel={() => setBanPromptOpen(false)}
            onConfirm={() => void confirmBan()}
          >
            <label className="block space-y-1 text-[11px] text-zinc-500">
              <span>Reason</span>
              <textarea
                value={banReason}
                onChange={(event) => setBanReason(event.target.value)}
                rows={4}
                required
                placeholder="Why this ban is being applied"
                className={`${FIELD} resize-none`}
              />
            </label>
          </ConfirmDialog>
        )}

        {reopenPromptOpen && (
          <ConfirmDialog
            title="Reopen this case"
            description="The dispute goes back to under review so you can hear an appeal. A permanent ban stays until you lift it from the account."
            confirmLabel="Reopen case"
            busyLabel="Reopening…"
            busy={saving}
            confirmClassName={BTN.neutral}
            onCancel={() => setReopenPromptOpen(false)}
            onConfirm={() => void confirmReopen()}
          />
        )}

        {settleOpen && dispute && (
          <ConfirmDialog
            title="Settle frozen escrow"
            description={`Split up to ${Number(dispute.creditAmount || 0).toLocaleString()} remaining escrow credits. The refund goes to the client and the release goes to the freelancer. This closes the dispute.`}
            confirmLabel="Settle and close"
            busyLabel="Settling…"
            busy={saving}
            confirmDisabled={settleNotes.trim().length < 8}
            confirmClassName={BTN.warn}
            onCancel={() => setSettleOpen(false)}
            onConfirm={() => void confirmSettleEscrow()}
          >
            <div className="grid grid-cols-2 gap-2">
              <label className="block space-y-1 text-[11px] text-zinc-500">
                <span>Client refund</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={settleClientCredits}
                  onChange={(event) => setSettleClientCredits(event.target.value)}
                  className={FIELD}
                />
              </label>
              <label className="block space-y-1 text-[11px] text-zinc-500">
                <span>Freelancer release</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={settleFreelancerCredits}
                  onChange={(event) => setSettleFreelancerCredits(event.target.value)}
                  className={FIELD}
                />
              </label>
            </div>
            <label className="block space-y-1 text-[11px] text-zinc-500">
              <span>Resolution notes (at least 8 characters)</span>
              <textarea
                value={settleNotes}
                onChange={(event) => setSettleNotes(event.target.value)}
                rows={3}
                placeholder="Why this split is correct"
                className={`${FIELD} resize-none`}
              />
            </label>
          </ConfirmDialog>
        )}

        {reverseOpen && reverseTxn && (
          <ConfirmDialog
            title="Reverse transaction"
            description={`Reverse ${reverseTxn.type} of ${reverseTxn.amount.toLocaleString()} credits. If the recipient no longer has enough spendable credits, this fails and nothing moves. This closes the dispute.`}
            confirmLabel="Reverse and close"
            busyLabel="Reversing…"
            busy={saving}
            confirmDisabled={reverseNotes.trim().length < 8}
            confirmClassName={BTN.danger}
            onCancel={() => {
              setReverseOpen(false);
              setReverseTxn(null);
            }}
            onConfirm={() => void confirmReverseTransaction()}
          >
            <label className="block space-y-1 text-[11px] text-zinc-500">
              <span>Amount</span>
              <input
                type="number"
                min={1}
                max={reverseTxn.amount}
                step={1}
                value={reverseAmount}
                onChange={(event) => setReverseAmount(event.target.value)}
                className={FIELD}
              />
            </label>
            <label className="block space-y-1 text-[11px] text-zinc-500">
              <span>Resolution notes (at least 8 characters)</span>
              <textarea
                value={reverseNotes}
                onChange={(event) => setReverseNotes(event.target.value)}
                rows={3}
                placeholder="Why this reverse is correct"
                className={`${FIELD} resize-none`}
              />
            </label>
          </ConfirmDialog>
        )}
      </div>
    </div>
  );
}
