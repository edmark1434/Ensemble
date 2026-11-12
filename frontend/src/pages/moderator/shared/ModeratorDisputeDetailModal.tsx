import { useEffect, useRef, useState } from "react";
import {
  ArrowLeftRight,
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
  X,
} from "lucide-react";
import api from "@/lib/axios";
import socket from "@/lib/socket";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast.ts";
import type { DisputeCaseTransaction, DisputeDetail } from "./moderatorTypes";
import type {
  DisputeResolutionOption,
  TicketMessage,
} from "@/pages/admin/ticketManagement/ticketTypes";
import type { Accent } from "./ui";
import { accentSpinner } from "./ui";
import DisputeCaseFilePanel from "./DisputeCaseFilePanel";
import {
  DEFAULT_PAYOUT_POLICY,
  DisputePayoutsList,
  PayoutTimingPicker,
  formatPayoutWhen,
  initialPayoutTiming,
  payoutTimingBody,
  payoutTimingError,
  payoutTimingSummary,
  type PayoutTiming,
} from "./DisputePayoutUi";
import {
  InboxUploadMediaButton,
  InboxUploadMediaPreview,
  uploadChatAttachment,
  useInboxUploadMedia,
} from "@/components/ui/inbox/inbox_functions/inbox_upload_image";
import { ChatImagePreview } from "@/components/ui/inbox/inbox_functions/chat_image_preview";
import {
  DisputeAttachments,
  DisputeDecisionCard,
  isDisputeDecision,
} from "@/pages/user/disputes/disputeUi";
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
  attachments?: TicketMessage["attachments"];
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
    attachments: raw.attachments ?? [],
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
  amber: "bg-amber-500/90 hover:bg-amber-500",
};

/**
 * Mirrors backend/lib/DisputeResolutions.js. Only used if the detail payload
 * omits `resolutionOptions`; the server list always wins.
 */
const FALLBACK_RESOLUTIONS: DisputeResolutionOption[] = [
  { key: "resolved_both_parties", label: "Resolved by both parties", hint: "Both sides agreed on an outcome." },
  { key: "disputee_refused", label: "Disputee refused to cooperate", hint: "The person named in the dispute would not take part.", requiresNote: true },
  { key: "disputer_refused", label: "Disputer refused to cooperate", hint: "The person who filed would not take part.", requiresNote: true },
  { key: "disputer_inactive", label: "Disputer inactive", hint: "The person who filed stopped responding." },
  { key: "disputee_inactive", label: "Disputee inactive", hint: "The person named in the dispute stopped responding." },
  { key: "withdrawn", label: "Withdrawn by the disputer", hint: "The person who filed asked to drop the case." },
  { key: "no_violation", label: "No violation found", hint: "The review found nothing to act on.", requiresNote: true },
];

/**
 * Preview of the message the backend posts on resolve. Mirrors the `body` builders in
 * backend/lib/DisputeResolutions.js — keep the two in step when the catalog changes.
 */
function resolutionPreview(
  key: string,
  dispute: { initiator: { username?: string }; respondent: { username?: string } },
  notes: string
) {
  const disputer = dispute.initiator.username ? `@${dispute.initiator.username}` : "The disputer";
  const disputee = dispute.respondent.username ? `@${dispute.respondent.username}` : "The disputee";
  const bodies: Record<string, string> = {
    resolved_both_parties: `This dispute is resolved. ${disputer} and ${disputee} reached an agreement, and staff have closed the case.`,
    disputee_refused: `Staff have closed this dispute. ${disputee} refused to cooperate with the review.`,
    disputer_refused: `Staff have closed this dispute. ${disputer} refused to cooperate with the review.`,
    disputer_inactive: `Staff have closed this dispute for inactivity. ${disputer} stopped responding to the review.`,
    disputee_inactive: `Staff have closed this dispute for inactivity. ${disputee} stopped responding to the review.`,
    withdrawn: `${disputer} withdrew this dispute, so staff have closed it.`,
    no_violation:
      "Staff have closed this dispute. The review found no violation of the platform rules.",
  };
  const body = bodies[key] || "Staff have closed this dispute.";
  const note = notes.trim();
  return note ? `${body} — Staff notes: ${note}` : body;
}

/**
 * The server's own message for a choice, with the staff note placed where the server puts it
 * (just before the closing paragraph).
 */
function previewWithNotes(preview: string, notes: string) {
  const note = notes.trim();
  if (!note) return preview;
  const parts = preview.split("\n\n");
  const closing = parts.length > 3 ? parts.pop() : null;
  return [...parts, `Reviewing staff noted: ${note}`, ...(closing ? [closing] : [])].join("\n\n");
}

/** Preview of the reopen notice. Mirrors DISPUTE_REOPEN_REASONS `finding` builders. */
function reopenPreview(key: string, notes: string) {
  const bodies: Record<string, string> = {
    new_evidence:
      "New evidence has been submitted on this case. The earlier decision is set aside and the matter is under review again.",
    appeal_granted:
      "An appeal against the decision on this case has been granted. The matter is under review again.",
    party_now_responding:
      "This case was closed because a party had stopped responding. They have since replied, so the review is resuming.",
    staff_error:
      "This case was closed in error. The earlier decision is withdrawn and the matter is being reviewed again.",
  };
  const body = bodies[key] || "This case has been reopened.";
  const note = notes.trim();
  return note ? `${body} — Reviewing staff noted: ${note}` : body;
}

/** Shared radio list for the Resolve and Reopen prompts. */
function OutcomePicker({
  options,
  value,
  onChange,
  disabled,
  label,
  activeClassName,
}: {
  options: DisputeResolutionOption[];
  value: string;
  onChange: (key: string) => void;
  disabled?: boolean;
  label: string;
  activeClassName: string;
}) {
  return (
    <div className="space-y-1.5" role="radiogroup" aria-label={label}>
      {options.map((option) => {
        const active = value === option.key;
        return (
          <button
            key={option.key}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(option.key)}
            className={`w-full rounded-lg border px-3 py-2 text-left transition disabled:opacity-50 ${
              active ? activeClassName : "border-white/10 hover:border-white/25 hover:bg-white/[0.04]"
            }`}
          >
            <span className={`block text-xs font-semibold ${active ? "text-white" : "text-zinc-200"}`}>
              {option.label}
              {option.requiresNote ? (
                <span className="ml-1.5 text-[10px] font-normal text-zinc-500">note required</span>
              ) : null}
            </span>
            <span className="mt-0.5 block text-[11px] text-zinc-400">{option.hint}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Mirrors DISPUTE_REOPEN_REASONS in backend/lib/DisputeResolutions.js. */
const FALLBACK_REOPEN_REASONS: DisputeResolutionOption[] = [
  { key: "new_evidence", label: "New evidence submitted", hint: "A party produced something the original review did not have.", requiresNote: true },
  { key: "appeal_granted", label: "Appeal granted", hint: "A party appealed and the appeal was accepted for review.", requiresNote: true },
  { key: "party_now_responding", label: "Party is now responding", hint: "A case closed for inactivity, and the missing side came back." },
  { key: "staff_error", label: "Closed in error", hint: "The case was resolved by mistake or on the wrong facts.", requiresNote: true },
];

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
  const [banReason, setBanReason] = useState("");
  const [reopenPromptOpen, setReopenPromptOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [reopenNotes, setReopenNotes] = useState("");
  const [resolvePromptOpen, setResolvePromptOpen] = useState(false);
  const [resolveMode, setResolveMode] = useState<"choose" | "outcome" | "settle" | "ban" | "dismiss">(
    "choose"
  );
  const [resolveOutcome, setResolveOutcome] = useState("");
  const [resolveNotes, setResolveNotes] = useState("");
  const [settleClientCredits, setSettleClientCredits] = useState("0");
  const [settleFreelancerCredits, setSettleFreelancerCredits] = useState("0");
  const [settleNotes, setSettleNotes] = useState("");
  const [swapPromptOpen, setSwapPromptOpen] = useState(false);
  const [swapNotes, setSwapNotes] = useState("");
  const [reverseOpen, setReverseOpen] = useState(false);
  const [reverseTxn, setReverseTxn] = useState<DisputeCaseTransaction | null>(null);
  const [reverseAmount, setReverseAmount] = useState("");
  const [reverseNotes, setReverseNotes] = useState("");
  const [settleTiming, setSettleTiming] = useState<PayoutTiming>(() => initialPayoutTiming());
  const [reverseTiming, setReverseTiming] = useState<PayoutTiming>(() => initialPayoutTiming());
  const [payoutDialog, setPayoutDialog] = useState<null | "release" | "reschedule" | "cancel">(null);
  const [rescheduleTiming, setRescheduleTiming] = useState<PayoutTiming>(() => ({
    ...initialPayoutTiming(),
    mode: "date",
  }));
  const [payoutNotes, setPayoutNotes] = useState("");
  const formRef = useRef({ status: "", priority: "", resolutionNotes: "" });
  formRef.current = { status, priority, resolutionNotes };
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const { mediaList, fileInputRef, openFilePicker, handleFileChange, removeMedia, clearMedia } =
    useInboxUploadMedia(4, 100);

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

  // Another staff member (or the payout job) changed this case: read it back so every open
  // console shows the same decision, handler and payouts. Unsaved edits in the Case form stay.
  const detailRef = useRef<DisputeDetail | null>(null);
  detailRef.current = detail;
  const onUpdatedRef = useRef(onUpdated);
  onUpdatedRef.current = onUpdated;
  useEffect(() => {
    let timer: number | undefined;
    const refreshLive = async () => {
      try {
        const res = await api.get(`${endpointBase}/${disputeId}`);
        if (!res.data?.success) return;
        const previous = detailRef.current?.dispute;
        const form = formRef.current;
        const dirty = Boolean(
          previous &&
            (form.status !== toApiToken(previous.status) ||
              form.priority !== toApiToken(previous.priority) ||
              (form.resolutionNotes || "") !== (previous.resolutionNotes || ""))
        );
        applyDetail(res.data.data as DisputeDetail, { syncForm: !dirty });
        onUpdatedRef.current?.();
      } catch {
        // Keep showing what we have; the next event or a manual action reloads it.
      }
    };
    const onState = (payload: { disputeId?: string } | null) => {
      if (!payload || String(payload.disputeId) !== String(disputeId)) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void refreshLive(), 250);
    };
    if (!socket.connected) socket.connect();
    socket.on("disputeUpdated", onState);
    return () => {
      window.clearTimeout(timer);
      socket.off("disputeUpdated", onState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disputeId, endpointBase]);

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

  const payoutPolicy = detail?.payoutPolicy || DEFAULT_PAYOUT_POLICY;

  const openReverse = (tx: DisputeCaseTransaction) => {
    setReverseTxn(tx);
    setReverseAmount(String(tx.amount || 0));
    setReverseNotes(resolutionNotes || "");
    setReverseTiming(initialPayoutTiming(payoutPolicy));
    setReverseOpen(true);
  };

  /** POST a money action; on success the response already carries the refreshed case. */
  const postFinancial = async (body: Record<string, unknown>, successMsg: string, fallback: string) => {
    setSaving(true);
    try {
      const res = await api.post(`${endpointBase}/${disputeId}/financial-resolution`, body);
      if (res.data?.success && res.data.data) applyDetail(res.data.data as DisputeDetail);
      else await load();
      showSuccessToast(successMsg);
      onUpdated();
      return true;
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;
      showErrorToast(msg);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const confirmSettleEscrow = async () => {
    const clientCredits = Number(settleClientCredits);
    const freelancerCredits = Number(settleFreelancerCredits);
    if (!Number.isInteger(clientCredits) || clientCredits < 0 || !Number.isInteger(freelancerCredits) || freelancerCredits < 0) {
      showErrorToast("Settlement amounts must be non-negative integers.");
      return;
    }
    if (clientCredits + freelancerCredits !== Number(detail?.dispute?.creditAmount || 0)) {
      showErrorToast("Split every remaining escrow credit between the client and the freelancer.");
      return;
    }
    if (settleNotes.trim().length < 8) {
      showErrorToast("Resolution notes must be at least 8 characters.");
      return;
    }
    const timingError = payoutTimingError(settleTiming, payoutPolicy);
    if (timingError) {
      showErrorToast(timingError);
      return;
    }
    const ok = await postFinancial(
      {
        action: "settle_escrow",
        clientCredits,
        freelancerCredits,
        resolutionNotes: settleNotes.trim(),
        ...payoutTimingBody(settleTiming, payoutPolicy),
      },
      settleTiming.mode === "now" ? "Escrow settled and paid out" : "Escrow settled — payout scheduled",
      "Failed to settle escrow"
    );
    if (!ok) return;
    setResolvePromptOpen(false);
    setResolveMode("choose");
  };

  const confirmReverseTransaction = async () => {
    if (!reverseTxn) return;
    const amount = Number(reverseAmount);
    if (!Number.isInteger(amount) || amount < 1 || amount > reverseTxn.amount) {
      showErrorToast(`Reverse amount must be a whole number from 1 to ${reverseTxn.amount.toLocaleString()}.`);
      return;
    }
    if (reverseNotes.trim().length < 8) {
      showErrorToast("Resolution notes must be at least 8 characters.");
      return;
    }
    const timingError = payoutTimingError(reverseTiming, payoutPolicy);
    if (timingError) {
      showErrorToast(timingError);
      return;
    }
    const ok = await postFinancial(
      {
        action: "reverse_transaction",
        creditTransactionId: reverseTxn.id,
        amount,
        resolutionNotes: reverseNotes.trim(),
        ...payoutTimingBody(reverseTiming, payoutPolicy),
      },
      reverseTiming.mode === "now" ? "Transaction reversed and paid out" : "Transaction reversed — payout scheduled",
      "Failed to reverse transaction"
    );
    if (!ok) return;
    setReverseOpen(false);
    setReverseTxn(null);
  };

  const openPayoutDialog = (kind: "release" | "reschedule" | "cancel") => {
    setPayoutNotes("");
    if (kind === "reschedule") {
      // Start the picker a full default wait from now; staff move it from there.
      setRescheduleTiming({ ...initialPayoutTiming(payoutPolicy), mode: "date" });
    }
    setPayoutDialog(kind);
  };

  const confirmPayoutDialog = async () => {
    if (payoutDialog === "release") {
      const ok = await postFinancial({ action: "release_payouts" }, "Payout released", "Failed to release payout");
      if (ok) setPayoutDialog(null);
      return;
    }
    if (payoutDialog === "reschedule") {
      const timingError = payoutTimingError(rescheduleTiming, payoutPolicy);
      if (timingError) {
        showErrorToast(timingError);
        return;
      }
      const ok = await postFinancial(
        {
          action: "reschedule_payouts",
          ...payoutTimingBody(rescheduleTiming, payoutPolicy),
          resolutionNotes: payoutNotes.trim() || null,
        },
        "Payout date changed",
        "Failed to change the payout date"
      );
      if (ok) setPayoutDialog(null);
      return;
    }
    if (payoutDialog === "cancel") {
      if (payoutNotes.trim().length < 8) {
        showErrorToast("Write a reason of at least 8 characters.");
        return;
      }
      const ok = await postFinancial(
        { action: "cancel_payouts", resolutionNotes: payoutNotes.trim() },
        "Ruling withdrawn — no credits were paid",
        "Failed to withdraw the ruling"
      );
      if (ok) setPayoutDialog(null);
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
    const pendingFiles = mediaList;
    if (sending || (!text && !pendingFiles.length)) return;
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
      attachments: pendingFiles.map((media) => ({
        attachment_id: media.id,
        attachment_type: media.type,
        attachment_key: media.previewUrl,
        attachment_url: media.previewUrl,
        attachment_name: media.file.name,
      })),
      createdAt: new Date().toISOString(),
    };
    setDetail((current) =>
      current ? { ...current, messages: [...(current.messages || []), optimistic] } : current
    );
    setMessage("");
    setReplyToId(null);
    setSending(true);
    try {
      const uploaded = pendingFiles.length
        ? await Promise.all(pendingFiles.map((media) => uploadChatAttachment(media)))
        : [];
      clearMedia();
      const res = await api.post(`${endpointBase}/${disputeId}/messages`, {
        body: text,
        isInternal: isPrivateAudience(audience),
        visibleToParties: audience === "parties",
        visibleToPublic: audience === "public",
        audience,
        audiences: [audience],
        ...(parentId ? { replyToId: parentId } : {}),
        ...(uploaded.length ? { attachments: uploaded } : {}),
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
    setResolvePromptOpen(false);
    setResolveMode("choose");
    setBanReason("");
  };

  const confirmDismiss = async () => {
    const ok = await runAction({ action: "dismiss" }, "Dispute dismissed");
    if (!ok) return;
    setResolvePromptOpen(false);
    setResolveMode("choose");
  };

  const confirmSwapParties = async () => {
    const ok = await runAction(
      { action: "swap_parties", reason: swapNotes.trim() || null },
      "Disputer and disputee swapped"
    );
    if (!ok) return;
    setSwapPromptOpen(false);
    setSwapNotes("");
  };

  const openReopen = () => {
    setReopenReason("");
    setReopenNotes("");
    setReopenPromptOpen(true);
  };

  const confirmReopen = async () => {
    const choice = reopenOptions.find((option) => option.key === reopenReason);
    if (!choice) {
      showErrorToast("Pick why this case is being reopened");
      return;
    }
    const notes = reopenNotes.trim();
    if (choice.requiresNote && !notes) {
      showErrorToast(`"${choice.label}" needs a short note`);
      return;
    }
    const ok = await runAction(
      { action: "reopen", reopenReason: choice.key, resolution_notes: notes || null },
      `Dispute reopened — ${choice.label.toLowerCase()}`
    );
    if (!ok) return;
    setReopenPromptOpen(false);
    setReopenReason("");
  };

  const openResolve = () => {
    const remaining = Number(detail?.dispute?.creditAmount || 0);
    setResolveMode("choose");
    setResolveOutcome("");
    setResolveNotes(resolutionNotes || "");
    setSettleClientCredits(String(remaining));
    setSettleFreelancerCredits("0");
    setSettleNotes(resolutionNotes || "");
    setSettleTiming(initialPayoutTiming(payoutPolicy));
    setBanReason("");
    setResolvePromptOpen(true);
  };

  const closeResolvePrompt = () => {
    if (saving) return;
    setResolvePromptOpen(false);
    setResolveMode("choose");
    setResolveOutcome("");
    setBanReason("");
  };

  const confirmResolve = async () => {
    const choice = resolutionOptions.find((option) => option.key === resolveOutcome);
    if (!choice) {
      showErrorToast("Pick how this dispute ended");
      return;
    }
    const notes = resolveNotes.trim();
    if (choice.requiresNote && !notes) {
      showErrorToast(`"${choice.label}" needs a short note`);
      return;
    }
    const ok = await runAction(
      { action: "resolve", outcome: choice.key, resolution_notes: notes || null },
      `Dispute closed — ${choice.label.toLowerCase()}`
    );
    if (!ok) return;
    setResolvePromptOpen(false);
    setResolveMode("choose");
    setResolveOutcome("");
  };

  const dispute = detail?.dispute;
  const closed = dispute ? isDisputeClosed(toApiToken(dispute.status)) || Boolean(dispute.isClosed) : false;
  const banned = String(dispute?.sanctionType || "").toLowerCase() === "ban";
  const canSettle = Boolean(
    dispute && canDecide && !closed && !dispute.financialResolution && Number(dispute.creditAmount || 0) > 0
  );
  const canDismiss = Boolean(
    dispute && canDecide && adminMode && !closed && toApiToken(dispute.status) === "pending_review"
  );
  const canBan = Boolean(dispute && canDecide && !closed && !banned);
  const canSwapParties = Boolean(
    dispute &&
      canDecide &&
      !closed &&
      dispute.initiator?.accountId &&
      dispute.respondent?.accountId
  );
  // Label each side as client or freelancer from the contract the dispute is linked to.
  const linkedContract =
    detail?.caseFile?.contracts?.find((item) => item.linked) || detail?.caseFile?.contracts?.[0];
  const contractRoleOf = (handle?: string | null) => {
    if (!linkedContract || !handle) return null;
    const h = handle.toLowerCase();
    if (linkedContract.clientHandle && linkedContract.clientHandle.toLowerCase() === h) return "Client";
    if (linkedContract.freelancerHandle && linkedContract.freelancerHandle.toLowerCase() === h) {
      return "Freelancer";
    }
    return null;
  };
  const clientLabel = linkedContract?.clientHandle && linkedContract.clientHandle !== "—"
    ? `@${linkedContract.clientHandle}`
    : linkedContract?.clientName || "the client";
  const freelancerLabel = linkedContract?.freelancerHandle && linkedContract.freelancerHandle !== "—"
    ? `@${linkedContract.freelancerHandle}`
    : linkedContract?.freelancerName || "the freelancer";

  // Settlement must hand out every remaining escrow credit, so nothing is stranded.
  const escrowRemaining = Number(dispute?.creditAmount || 0);
  const settleClientNum = Number(settleClientCredits);
  const settleFreelancerNum = Number(settleFreelancerCredits);
  const settleNumbersValid =
    Number.isInteger(settleClientNum) &&
    Number.isInteger(settleFreelancerNum) &&
    settleClientNum >= 0 &&
    settleFreelancerNum >= 0;
  const settleAssigned = settleNumbersValid ? settleClientNum + settleFreelancerNum : 0;
  const settleUnassigned = escrowRemaining - settleAssigned;
  const settleReady =
    settleNumbersValid &&
    settleUnassigned === 0 &&
    settleNotes.trim().length >= 8 &&
    !payoutTimingError(settleTiming, payoutPolicy);
  const setSplit = (clientShare: number) => {
    const safe = Math.max(0, Math.min(escrowRemaining, Math.round(clientShare)));
    setSettleClientCredits(String(safe));
    setSettleFreelancerCredits(String(escrowRemaining - safe));
  };

  const payouts = detail?.payouts || [];
  const payoutState = detail?.payoutState;
  const hasPayouts = payouts.length > 0;

  const resolutionOptions =
    detail?.resolutionOptions && detail.resolutionOptions.length
      ? detail.resolutionOptions
      : FALLBACK_RESOLUTIONS;
  const reopenOptions =
    detail?.reopenOptions && detail.reopenOptions.length
      ? detail.reopenOptions
      : FALLBACK_REOPEN_REASONS;
  const selectedResolution = resolutionOptions.find((option) => option.key === resolveOutcome);
  const selectedReopen = reopenOptions.find((option) => option.key === reopenReason);
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
                      const decision = isDisputeDecision(m);

                      if (decision) {
                        return (
                          <div key={m.id} id={`dispute-msg-${m.id}`} className={pending ? "opacity-60" : ""}>
                            <DisputeDecisionCard
                              dark
                              body={m.body}
                              when={pending ? "Sending…" : formatDateTime(m.createdAt)}
                            >
                              <DisputeAttachments
                                attachments={m.attachments}
                                onPreview={(url) => setPreviewUrl(url)}
                              />
                            </DisputeDecisionCard>
                          </div>
                        );
                      }

                      return (
                        <article
                          key={m.id}
                          id={`dispute-msg-${m.id}`}
                          className={`group rounded-xl border border-l-2 border-white/[0.08] px-4 py-3 transition ${audienceAccentClass(currentAudience)} ${pending ? "opacity-60" : ""} ${
                            awaitingReview
                              ? "border-l-amber-400/70 bg-amber-500/[0.06]"
                              : "bg-white/[0.02]"
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
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
                            {m.body}
                          </p>
                          <DisputeAttachments
                            attachments={m.attachments}
                            onPreview={(url) => setPreviewUrl(url)}
                          />
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
                    {mediaList.length ? (
                      <div className="mb-2 overflow-hidden rounded-lg border border-white/10">
                        <InboxUploadMediaPreview mediaList={mediaList} onRemove={removeMedia} />
                      </div>
                    ) : null}
                    <div className="flex items-end gap-2">
                      <InboxUploadMediaButton
                        fileInputRef={fileInputRef}
                        onFileChange={handleFileChange}
                        onClick={openFilePicker}
                        disabled={
                          detail.chatAvailable === false || !canReply || sending || mediaList.length >= 4
                        }
                        title="Attach images or files (max 4)"
                      />
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
                        disabled={
                          sending ||
                          (!message.trim() && !mediaList.length) ||
                          detail.chatAvailable === false ||
                          !canReply
                        }
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
                    payouts={payouts}
                    payoutState={payoutState}
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
                    {/* Closing and reopening are decisions (Resolve / Reopen), not status edits. */}
                    {STATUS_OPTIONS.filter((s) => s !== CLOSED_STATUS || closed).map((s) => {
                      const active = toApiToken(status) === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          disabled={viewOnly || closed}
                          aria-pressed={active}
                          onClick={() => setStatus(s)}
                          className={`rounded-md border px-2 py-1 text-[11px] font-medium transition disabled:cursor-not-allowed ${statusButtonClass(s, active)}`}
                        >
                          {titleCaseLabel(s)}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-zinc-600">
                    {closed ? "Reopen the case to change its status." : "Use Resolve to close the case."}
                  </p>
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
                {closed && (dispute.resolutionOutcomeLabel || dispute.financialResolution || banned) && (
                  <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-100">
                    Closed as{" "}
                    <span className="font-semibold">
                      {dispute.resolutionOutcomeLabel ||
                        (dispute.financialResolution?.kind === "escrow_settle"
                          ? "Escrow settled"
                          : dispute.financialResolution?.kind === "transaction_reverse"
                            ? "Transaction reversed"
                            : "Permanent ban")}
                    </span>
                    {dispute.resolvedAt ? ` on ${formatDateTime(dispute.resolvedAt)}` : ""}.
                  </p>
                )}
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
                    {!closed && canDecide && (
                      <button
                        type="button"
                        onClick={openResolve}
                        disabled={saving}
                        className={BTN.success}
                        title="Settle escrow, ban, dismiss, or record how the case ended"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Resolve
                      </button>
                    )}
                  </div>
                )}
              </SidebarSection>

              {hasPayouts && (
                <SidebarSection
                  title="Payouts"
                  action={
                    payoutState?.waiting ? (
                      <span className="text-[10px] text-zinc-500">
                        {payoutState.paused ? "Paused" : `Next ${formatPayoutWhen(payoutState.nextReleaseAt)}`}
                      </span>
                    ) : null
                  }
                >
                  <DisputePayoutsList
                    payouts={payouts}
                    state={payoutState}
                    canAct={canDecide}
                    saving={saving}
                    onReleaseNow={() => openPayoutDialog("release")}
                    onReschedule={() => openPayoutDialog("reschedule")}
                    onCancel={() => openPayoutDialog("cancel")}
                  />
                </SidebarSection>
              )}

              <SidebarSection title="Parties">
                {(
                  [
                    { label: "Disputer", person: dispute.initiator },
                    { label: "Disputee", person: dispute.respondent },
                  ] as const
                ).map(({ label, person }) => {
                  const contractRole = contractRoleOf(person.username);
                  return (
                    <div key={label} className="flex items-center justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <p className="text-[11px] text-zinc-500">{label}</p>
                        <p className="truncate text-white">
                          {person.name}
                          {person.username && person.username !== "—" ? (
                            <span className="text-zinc-500"> @{person.username}</span>
                          ) : null}
                        </p>
                      </div>
                      {contractRole ? (
                        <span
                          className={`shrink-0 rounded border px-1.5 py-px text-[10px] ${
                            contractRole === "Client"
                              ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                              : "border-sky-500/30 bg-sky-500/10 text-sky-200"
                          }`}
                        >
                          {contractRole}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
                {canSwapParties ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setSwapNotes("");
                      setSwapPromptOpen(true);
                    }}
                    className={BTN.neutral}
                    title="Use this when the case was filed by the wrong side"
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                    Swap disputer and disputee
                  </button>
                ) : canDecide && closed ? (
                  <p className="text-[11px] text-zinc-500">Reopen the case to swap the parties.</p>
                ) : null}
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

              {canDecide && closed && (
                <SidebarSection title="Case closed">
                  <p className="text-xs leading-relaxed text-zinc-400">
                    {banned
                      ? `Closed with a permanent ban on @${dispute.respondent.username}. Reopening does not lift the ban.`
                      : "This case is closed. Reopen it to review an appeal."}
                  </p>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={openReopen}
                    className={BTN.neutral}
                  >
                    Reopen case
                  </button>
                </SidebarSection>
              )}
            </aside>
          </div>
        ) : (
          <p className="flex flex-1 items-center justify-center text-zinc-500">Dispute not found.</p>
        )}

        {resolvePromptOpen && dispute && (
          <ConfirmDialog
            title={
              resolveMode === "settle"
                ? "Settle frozen escrow"
                : resolveMode === "ban"
                  ? "Permanent ban"
                  : resolveMode === "dismiss"
                    ? "Dismiss this dispute"
                    : resolveMode === "outcome"
                      ? "Record how this dispute ended"
                      : "Resolve this dispute"
            }
            description={
              resolveMode === "settle" ? (
                <>
                  Split all {escrowRemaining.toLocaleString()} frozen escrow credits between{" "}
                  {clientLabel} (client refund) and {freelancerLabel} (freelancer release). This closes
                  the dispute and posts the ruling in the discussion.
                </>
              ) : resolveMode === "ban" ? (
                <>
                  This bans @{dispute.respondent.username} permanently, posts the reason in the
                  discussion, and closes the case.
                </>
              ) : resolveMode === "dismiss" ? (
                <>
                  Dismiss means the dispute is closed without a money move or a ban. Use this when the
                  claim should not proceed.
                </>
              ) : resolveMode === "outcome" ? (
                <>
                  Pick how the case ended. The outcome is recorded on the dispute and posted in the
                  discussion so both sides see why it closed.
                </>
              ) : (
                <>
                  Choose how to close this case. Escrow settlement and permanent ban live here — they
                  are not separate sidebar actions anymore.
                </>
              )
            }
            confirmLabel={
              resolveMode === "settle"
                ? settleTiming.mode === "now"
                  ? "Settle and pay now"
                  : "Settle and schedule payout"
                : resolveMode === "ban"
                  ? "Ban permanently"
                  : resolveMode === "dismiss"
                    ? "Dismiss dispute"
                    : resolveMode === "outcome"
                      ? "Close dispute"
                      : "Continue"
            }
            busyLabel={
              resolveMode === "settle"
                ? "Settling…"
                : resolveMode === "ban"
                  ? "Banning…"
                  : resolveMode === "dismiss"
                    ? "Dismissing…"
                    : resolveMode === "outcome"
                      ? "Closing…"
                      : "Working…"
            }
            busy={saving}
            hideConfirm={resolveMode === "choose"}
            cancelLabel={resolveMode === "choose" ? "Cancel" : "Back"}
            confirmDisabled={
              resolveMode === "settle"
                ? !settleReady
                : resolveMode === "ban"
                  ? !banReason.trim()
                  : resolveMode === "outcome"
                    ? !selectedResolution ||
                      (Boolean(selectedResolution?.requiresNote) && !resolveNotes.trim())
                    : false
            }
            confirmClassName={
              resolveMode === "settle"
                ? BTN.warn
                : resolveMode === "ban"
                  ? BTN.danger
                  : resolveMode === "dismiss"
                    ? BTN.neutral
                    : BTN.success
            }
            onCancel={
              resolveMode === "choose"
                ? closeResolvePrompt
                : () => setResolveMode("choose")
            }
            onConfirm={() => {
              if (resolveMode === "settle") void confirmSettleEscrow();
              else if (resolveMode === "ban") void confirmBan();
              else if (resolveMode === "dismiss") void confirmDismiss();
              else if (resolveMode === "outcome") void confirmResolve();
            }}
          >
            {resolveMode === "choose" ? (
              <div className="space-y-2">
                {canSettle ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setResolveMode("settle")}
                    className="w-full rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-3 text-left transition hover:bg-amber-500/15"
                  >
                    <p className="text-sm font-medium text-amber-100">Settle escrow</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-amber-100/70">
                      {dispute.creditAmount.toLocaleString()} credits are still frozen. Split them
                      between client refund and freelancer release. Paid out in{" "}
                      {payoutPolicy.defaultDays} days by default, or now, or on a date you pick.
                    </p>
                  </button>
                ) : null}

                {canBan ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setResolveMode("ban")}
                    className="w-full rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-3 text-left transition hover:bg-red-500/15"
                  >
                    <p className="text-sm font-medium text-red-100">Permanent ban</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-red-100/70">
                      If the disputer is right, permanently ban @{dispute.respondent.username}. The
                      reason is posted in the discussion and the case becomes public.
                    </p>
                  </button>
                ) : null}

                {canDismiss ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setResolveMode("dismiss")}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-left transition hover:bg-white/[0.06]"
                  >
                    <p className="text-sm font-medium text-zinc-100">Dismiss dispute</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                      Close without settling money or banning anyone.
                    </p>
                  </button>
                ) : null}

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setResolveMode("outcome")}
                  className="w-full rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-3 text-left transition hover:bg-emerald-500/15"
                >
                  <p className="text-sm font-medium text-emerald-100">Record an outcome</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-emerald-100/70">
                    Close the case with a written outcome for both parties. Use this when money was
                    already handled or no escrow split is needed.
                  </p>
                </button>
              </div>
            ) : null}

            {resolveMode === "outcome" ? (
              <>
                <OutcomePicker
                  options={resolutionOptions}
                  value={resolveOutcome}
                  onChange={setResolveOutcome}
                  disabled={saving}
                  label="How this dispute ended"
                  activeClassName="border-emerald-500/40 bg-emerald-500/15"
                />

                <label className="block space-y-1 text-[11px] text-zinc-500">
                  <span>
                    Resolution notes
                    {selectedResolution?.requiresNote ? " (required)" : " (optional)"}
                  </span>
                  <textarea
                    value={resolveNotes}
                    onChange={(event) => setResolveNotes(event.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder="What happened, in a sentence or two. Both parties can read this."
                    className={`${FIELD} resize-none`}
                  />
                </label>

                {selectedResolution ? (
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] leading-relaxed text-zinc-400">
                    <p className="font-semibold text-zinc-300">Posted in the discussion</p>
                    <p className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap">
                      {selectedResolution.preview
                        ? previewWithNotes(selectedResolution.preview, resolveNotes)
                        : resolutionPreview(selectedResolution.key, dispute, resolveNotes)}
                    </p>
                    {!dispute.visibility ? (
                      <span className="mt-1 block text-amber-200/80">
                        This case is private, so the message goes to the disputer and staff only.
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {escrowRemaining > 0 ? (
                  <p className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed text-amber-100">
                    {escrowRemaining.toLocaleString()} credits are still frozen. Closing without settling
                    unfreezes them and the contract carries on as before. Use Settle escrow if the money
                    should be split.
                  </p>
                ) : null}
              </>
            ) : null}

            {resolveMode === "settle" ? (
              <>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick split">
                  {[
                    { label: "All to client", share: escrowRemaining },
                    { label: "50 / 50", share: Math.floor(escrowRemaining / 2) },
                    { label: "All to freelancer", share: 0 },
                  ].map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      disabled={saving}
                      onClick={() => setSplit(option.share)}
                      className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-zinc-300 transition hover:border-white/25 hover:bg-white/[0.04] disabled:opacity-50"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block space-y-1 text-[11px] text-zinc-500">
                    <span>Client refund · {clientLabel}</span>
                    <input
                      type="number"
                      min={0}
                      max={escrowRemaining}
                      step={1}
                      value={settleClientCredits}
                      onChange={(event) => {
                        setSettleClientCredits(event.target.value);
                        const next = Number(event.target.value);
                        if (Number.isInteger(next) && next >= 0 && next <= escrowRemaining) {
                          setSettleFreelancerCredits(String(escrowRemaining - next));
                        }
                      }}
                      className={FIELD}
                    />
                  </label>
                  <label className="block space-y-1 text-[11px] text-zinc-500">
                    <span>Freelancer release · {freelancerLabel}</span>
                    <input
                      type="number"
                      min={0}
                      max={escrowRemaining}
                      step={1}
                      value={settleFreelancerCredits}
                      onChange={(event) => {
                        setSettleFreelancerCredits(event.target.value);
                        const next = Number(event.target.value);
                        if (Number.isInteger(next) && next >= 0 && next <= escrowRemaining) {
                          setSettleClientCredits(String(escrowRemaining - next));
                        }
                      }}
                      className={FIELD}
                    />
                  </label>
                </div>
                <p
                  className={`text-[11px] ${
                    !settleNumbersValid || settleUnassigned !== 0 ? "text-red-300" : "text-zinc-500"
                  }`}
                  role="status"
                >
                  {!settleNumbersValid
                    ? "Use whole, non-negative numbers."
                    : settleUnassigned > 0
                      ? `${settleUnassigned.toLocaleString()} credits still unassigned. Every frozen credit has to go to one side.`
                      : settleUnassigned < 0
                        ? `${Math.abs(settleUnassigned).toLocaleString()} credits over the ${escrowRemaining.toLocaleString()} in escrow.`
                        : `All ${escrowRemaining.toLocaleString()} escrow credits assigned.`}
                </p>

                <PayoutTimingPicker
                  value={settleTiming}
                  onChange={setSettleTiming}
                  policy={payoutPolicy}
                  disabled={saving}
                />

                <label className="block space-y-1 text-[11px] text-zinc-500">
                  <span>Resolution notes (at least 8 characters, both parties read this)</span>
                  <textarea
                    value={settleNotes}
                    onChange={(event) => setSettleNotes(event.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder="Why this split is correct"
                    className={`${FIELD} resize-none`}
                  />
                </label>

                <ul className="space-y-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] leading-relaxed text-zinc-400">
                  {settleNumbersValid && settleClientNum > 0 ? (
                    <li>
                      {clientLabel} gets {settleClientNum.toLocaleString()} credits back.
                    </li>
                  ) : null}
                  {settleNumbersValid && settleFreelancerNum > 0 ? (
                    <li>
                      {freelancerLabel} receives {settleFreelancerNum.toLocaleString()} credits.
                    </li>
                  ) : null}
                  <li>{payoutTimingSummary(settleTiming, payoutPolicy)}</li>
                  <li>
                    {settleTiming.mode === "now"
                      ? "The contract ends now and its unfinished milestones are cancelled."
                      : "The contract stays frozen until then, and ends when the payout goes through."}
                  </li>
                  <li>
                    The ruling is posted in the discussion
                    {dispute.visibility ? " for both parties" : " for the disputer (the case is private)"}, and
                    both sides are notified.
                  </li>
                  {!dispute.visibility ? (
                    <li>
                      @{dispute.respondent.username} gets a limited view in their disputes list: the case
                      number, contract, outcome and payouts. Not the complaint, your notes, or the discussion.
                    </li>
                  ) : null}
                </ul>
              </>
            ) : null}

            {resolveMode === "ban" ? (
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
            ) : null}

            {resolveMode === "dismiss" ? (
              <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] leading-relaxed text-zinc-400">
                Confirm dismiss only if the claim should end with no escrow move and no sanction.
              </p>
            ) : null}
          </ConfirmDialog>
        )}

        {reopenPromptOpen && dispute && (
          <ConfirmDialog
            title="Reopen this case"
            description="Pick why the case is coming back. The reason is recorded and posted in the discussion, and the dispute returns to under review."
            confirmLabel="Reopen case"
            busyLabel="Reopening…"
            busy={saving}
            confirmDisabled={!selectedReopen || (selectedReopen.requiresNote && !reopenNotes.trim())}
            confirmClassName={BTN.neutral}
            onCancel={() => setReopenPromptOpen(false)}
            onConfirm={() => void confirmReopen()}
          >
            <OutcomePicker
              options={reopenOptions}
              value={reopenReason}
              onChange={setReopenReason}
              disabled={saving}
              label="Why this case is being reopened"
              activeClassName="border-sky-500/40 bg-sky-500/15"
            />

            <label className="block space-y-1 text-[11px] text-zinc-500">
              <span>
                Note for both parties
                {selectedReopen?.requiresNote ? " (required)" : " (optional)"}
              </span>
              <textarea
                value={reopenNotes}
                onChange={(event) => setReopenNotes(event.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="What changed since the case was closed. Both parties can read this."
                className={`${FIELD} resize-none`}
              />
            </label>

            {selectedReopen && (
              <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] leading-relaxed text-zinc-400">
                <p className="font-semibold text-zinc-300">Posted in the discussion</p>
                <p className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap">
                  {selectedReopen.preview
                    ? previewWithNotes(selectedReopen.preview, reopenNotes)
                    : reopenPreview(selectedReopen.key, reopenNotes)}
                </p>
                {banned ? (
                  <span className="mt-1 block text-amber-200/80">
                    The permanent ban stays in place until you lift it from the account.
                  </span>
                ) : null}
                {payoutState?.waiting ? (
                  <span className="mt-1 block text-amber-200/80">
                    The scheduled payout pauses while the case is open again. You can pay it, move its
                    date, or withdraw the ruling from the Payouts panel.
                  </span>
                ) : null}
              </div>
            )}
          </ConfirmDialog>
        )}

        {swapPromptOpen && dispute && (
          <ConfirmDialog
            title="Swap disputer and disputee"
            description={
              <>
                @{dispute.respondent.username} becomes the disputer and @{dispute.initiator.username}{" "}
                becomes the disputee. Escrow is untouched — it follows the contract, not the parties.
              </>
            }
            confirmLabel="Swap parties"
            busyLabel="Swapping…"
            busy={saving}
            confirmClassName={BTN.warn}
            onCancel={() => {
              if (saving) return;
              setSwapPromptOpen(false);
            }}
            onConfirm={() => void confirmSwapParties()}
          >
            <ul className="space-y-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] leading-relaxed text-zinc-400">
              <li>
                Replies shared with only one side stay with that same person; their labels flip to
                match the new roles.
              </li>
              <li>
                {dispute.visibility
                  ? "A “Parties swapped” notice is posted in the public discussion and both parties are notified."
                  : `This case is private, so only the new disputer (@${dispute.respondent.username}) can see it, including the original complaint. The “Parties swapped” notice is posted for them, and @${dispute.initiator.username} is notified but loses access until you make it public.`}
              </li>
              <li>Both parties&apos; open pages update to the new roles straight away.</li>
              <li>A permanent ban, if you use one later, targets the new disputee.</li>
            </ul>
            <label className="block space-y-1 text-[11px] text-zinc-500">
              <span>Note for the discussion (optional)</span>
              <textarea
                value={swapNotes}
                onChange={(event) => setSwapNotes(event.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Why the roles were the wrong way round."
                className={`${FIELD} resize-none`}
              />
            </label>
          </ConfirmDialog>
        )}

        {reverseOpen && reverseTxn && (() => {
          const route = reverseTxn.reversal;
          const fromLabel = route?.fromHandle ? `@${route.fromHandle}` : route?.fromName || reverseTxn.destinationName;
          const toLabel = route?.toHandle ? `@${route.toHandle}` : route?.toName || "the original sender";
          const amountNum = Number(reverseAmount);
          const amountValid = Number.isInteger(amountNum) && amountNum >= 1 && amountNum <= reverseTxn.amount;
          return (
            <ConfirmDialog
              title="Reverse transaction"
              description={
                <>
                  {titleCaseLabel(reverseTxn.type)} of {reverseTxn.amount.toLocaleString()} credits
                  {reverseTxn.referenceLabel ? ` · ${reverseTxn.referenceLabel}` : ""}. The credits are
                  taken from {fromLabel} now and paid to {toLabel}
                  {route?.toRole ? ` (${route.toRole})` : ""}. If {fromLabel} no longer has enough
                  spendable credits, nothing moves. This closes the dispute.
                </>
              }
              confirmLabel={reverseTiming.mode === "now" ? "Reverse and pay now" : "Reverse and schedule"}
              busyLabel="Reversing…"
              busy={saving}
              confirmDisabled={
                reverseNotes.trim().length < 8 ||
                !amountValid ||
                Boolean(payoutTimingError(reverseTiming, payoutPolicy))
              }
              confirmClassName={BTN.danger}
              onCancel={() => {
                setReverseOpen(false);
                setReverseTxn(null);
              }}
              onConfirm={() => void confirmReverseTransaction()}
            >
              <label className="block space-y-1 text-[11px] text-zinc-500">
                <span>Amount (up to {reverseTxn.amount.toLocaleString()})</span>
                <input
                  type="number"
                  min={1}
                  max={reverseTxn.amount}
                  step={1}
                  value={reverseAmount}
                  onChange={(event) => setReverseAmount(event.target.value)}
                  aria-invalid={!amountValid}
                  className={FIELD}
                />
              </label>
              <PayoutTimingPicker
                value={reverseTiming}
                onChange={setReverseTiming}
                policy={payoutPolicy}
                disabled={saving}
                label={`When ${toLabel} receives the credits`}
              />
              <label className="block space-y-1 text-[11px] text-zinc-500">
                <span>Resolution notes (at least 8 characters, both parties read this)</span>
                <textarea
                  value={reverseNotes}
                  onChange={(event) => setReverseNotes(event.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Why this reverse is correct"
                  className={`${FIELD} resize-none`}
                />
              </label>
              <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] leading-relaxed text-zinc-400">
                {reverseTiming.mode === "now"
                  ? `${toLabel} receives the credits as soon as you confirm.`
                  : `${fromLabel}'s credits are locked in their escrow wallet right away. ${payoutTimingSummary(
                      reverseTiming,
                      payoutPolicy
                    )}`}
              </p>
            </ConfirmDialog>
          );
        })()}

        {payoutDialog && (
          <ConfirmDialog
            title={
              payoutDialog === "release"
                ? "Pay out now"
                : payoutDialog === "reschedule"
                  ? "Change the payout date"
                  : "Withdraw this ruling"
            }
            description={
              payoutDialog === "release" ? (
                <>
                  Every waiting payout on this dispute goes to its recipient&apos;s Account Wallet now.
                  This can&apos;t be undone.
                </>
              ) : payoutDialog === "reschedule" ? (
                <>
                  Move every waiting payout to a new date. The credits stay locked in escrow until then,
                  and both sides are told the new date.
                </>
              ) : (
                <>
                  Nothing has been paid yet, so the ruling can be withdrawn. Credits a reversal took back
                  are returned to whoever they were taken from, and you can decide the case again.
                </>
              )
            }
            confirmLabel={
              payoutDialog === "release"
                ? "Pay now"
                : payoutDialog === "reschedule"
                  ? "Save new date"
                  : "Withdraw ruling"
            }
            busyLabel="Working…"
            busy={saving}
            confirmDisabled={
              payoutDialog === "reschedule"
                ? Boolean(payoutTimingError(rescheduleTiming, payoutPolicy))
                : payoutDialog === "cancel"
                  ? payoutNotes.trim().length < 8
                  : false
            }
            confirmClassName={
              payoutDialog === "release" ? BTN.warn : payoutDialog === "cancel" ? BTN.danger : BTN.neutral
            }
            onCancel={() => {
              if (saving) return;
              setPayoutDialog(null);
            }}
            onConfirm={() => void confirmPayoutDialog()}
          >
            <ul className="space-y-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-zinc-400">
              {payouts
                .filter((payout) => payout.status === "scheduled" || payout.status === "failed")
                .map((payout) => (
                  <li key={payout.id} className="flex justify-between gap-2">
                    <span className="truncate">
                      {payout.recipientHandle ? `@${payout.recipientHandle}` : payout.recipientName}
                      {payout.recipientRole ? ` · ${payout.recipientRole}` : ""}
                    </span>
                    <span className="shrink-0 tabular-nums text-zinc-200">
                      {payout.amount.toLocaleString()} · {formatPayoutWhen(payout.releaseAt)}
                    </span>
                  </li>
                ))}
            </ul>
            {payoutDialog === "reschedule" ? (
              <>
                <PayoutTimingPicker
                  value={rescheduleTiming}
                  onChange={setRescheduleTiming}
                  policy={payoutPolicy}
                  disabled={saving}
                  allowNow={false}
                  allowDefault={false}
                  label="New payout date"
                />
                <label className="block space-y-1 text-[11px] text-zinc-500">
                  <span>Note for both parties (optional)</span>
                  <textarea
                    value={payoutNotes}
                    onChange={(event) => setPayoutNotes(event.target.value)}
                    rows={2}
                    maxLength={2000}
                    placeholder="Why the date moved"
                    className={`${FIELD} resize-none`}
                  />
                </label>
              </>
            ) : null}
            {payoutDialog === "cancel" ? (
              <label className="block space-y-1 text-[11px] text-zinc-500">
                <span>Reason (at least 8 characters, both parties read this)</span>
                <textarea
                  value={payoutNotes}
                  onChange={(event) => setPayoutNotes(event.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Why the ruling is being withdrawn"
                  className={`${FIELD} resize-none`}
                />
              </label>
            ) : null}
          </ConfirmDialog>
        )}
        <ChatImagePreview url={previewUrl} onClose={() => setPreviewUrl(null)} />
      </div>
    </div>
  );
}
