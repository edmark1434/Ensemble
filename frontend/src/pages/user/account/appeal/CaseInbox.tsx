import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  CornerUpLeft,
  ExternalLink,
  Gavel,
  Inbox,
  LifeBuoy,
  Loader2,
  Lock,
  MessagesSquare,
  PanelRightOpen,
  Scale,
  Send,
  X,
  XCircle,
} from 'lucide-react';
import api from '@/lib/axios';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast';
import { formatStandingWhen } from '@/lib/standing';
import { useCaseEvents, type CaseAccess, type CaseUpdate } from '@/lib/cases';
import { ChatImagePreview } from '@/components/ui/inbox/inbox_functions/chat_image_preview';
import {
  Avatar,
  DisputeDecisionCard,
  RoleChip,
  isDisputeDecision,
  parseDisputeRuling,
  type DisputeAttachment,
  type DisputeSettlement,
  type MentionMap,
} from '@/pages/user/disputes/disputeUi';
import {
  DayDivider,
  QuotedMessage,
  THREAD_FILTERS,
  ThreadMessage as ThreadRow,
  dayKey,
  dayLabel,
  messageCategory,
  relativeTime,
  type DiscussionMessage,
  type ThreadFilter,
} from '@/pages/user/disputes/publicDisputeParts';
import {
  type AppealDecision,
  type AppealTarget,
  type CaseSelection,
  type DisputeRow,
  type ThreadMessage,
  type TicketRow,
  APPEAL_LIMITS,
  appealCopyFor,
  decisionCardOf,
  errorMessage,
  isAppealTicket,
} from './appealShared';
import AppealDecisionCard from './AppealDecisionCard';
import {
  AttachButton,
  PendingFileList,
  SendingAttachments,
  releasePendingFiles,
  uploadPendingFiles,
  usePendingFiles,
  type AttachmentPayload,
  type PendingFile,
} from './appealAttachments';
import {
  DisputeParties,
  DisputeSidePanels,
  HeaderChip,
  StageChip,
  TicketParties,
  TicketSidePanels,
  type CaseStats,
  type DisputeCaseDetails,
  type TicketCaseInfo,
} from './caseView';

/** Live `caseUpdated` events do the work; this only catches a missed event. */
const POLL_MS = 60_000;
/** Replies from the same person within this window fold under one header, as on the public page. */
const CONTINUE_MS = 5 * 60_000;

/** A reply the member sent that the server has not confirmed yet. */
type OutgoingMessage = {
  localId: string;
  target: CaseSelection;
  body: string;
  files: PendingFile[];
  /** Set once the files are uploaded, so a retry only re-sends the message. */
  uploaded: AttachmentPayload[] | null;
  replyToId: string | null;
  createdAt: string;
  status: 'sending' | 'failed';
  error?: string;
};

type DisputeInfo = {
  title?: string | null;
  number?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  settlement?: DisputeSettlement | null;
};

type ThreadState = {
  loading: boolean;
  error: string | null;
  messages: ThreadMessage[];
  /** What the member may do here, from the server. */
  access: CaseAccess | null;
  appealDecision?: AppealDecision;
  /** Appeals: the one penalty this ticket is about (null on older account-wide appeals). */
  appealTarget?: AppealTarget | null;
  mentions?: MentionMap;
  ticket?: TicketCaseInfo;
  dispute?: DisputeInfo;
  details?: DisputeCaseDetails | null;
};

const EMPTY_THREAD: ThreadState = { loading: false, error: null, messages: [], access: null };

function stageTone(access?: CaseAccess | null) {
  if (!access || access.closed) return 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-zinc-400';
  if (access.needsYou) return 'bg-amber-500/15 text-amber-800 dark:text-amber-200';
  return 'bg-blue-500/10 text-blue-700 dark:text-blue-300';
}

function StagePill({ access, fallback }: { access?: CaseAccess | null; fallback?: string }) {
  const label = access?.stageLabel || fallback;
  if (!label) return null;
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${stageTone(access)}`}>
      {label}
    </span>
  );
}

function CaseRow({
  title,
  meta,
  access,
  fallbackStatus,
  active,
  icon,
  onClick,
}: {
  title: string;
  meta: string;
  access?: CaseAccess;
  fallbackStatus?: string;
  active: boolean;
  icon?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
      className={`w-full border-l-2 px-4 py-3 text-left transition-colors ${
        active ? 'border-blue-500 bg-blue-500/10' : 'border-transparent hover:bg-gray-50 dark:hover:bg-white/5'
      } ${access?.closed && !active ? 'opacity-70' : ''}`}
    >
      <span className="flex items-center gap-2">
        {access?.needsYou ? (
          <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-label="Waiting for you" />
        ) : null}
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900 dark:text-white">{title}</span>
        <StagePill access={access} fallback={fallbackStatus} />
      </span>
      <span className="mt-1 flex items-center gap-1.5 truncate text-xs text-gray-500 dark:text-zinc-500">
        {icon}
        <span className="truncate">{access?.attention || meta}</span>
      </span>
    </button>
  );
}

function ListHeading({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center justify-between px-4 pb-1.5 pt-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">{label}</h3>
      <span className="text-[11px] tabular-nums text-gray-400 dark:text-zinc-600">{count}</span>
    </div>
  );
}

/** The short banner above the thread; the full decision is the card in the conversation. */
function DecisionNotice({ decision, target }: { decision: AppealDecision; target?: AppealTarget | null }) {
  if (!decision) return null;
  const noun = target ? appealCopyFor(target.type).noun : 'penalty';
  const named = target?.label ? ` (${target.label})` : '';
  if (decision === 'accepted') {
    return (
      <div className="flex items-start gap-2 border-b border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          {target
            ? `Appeal accepted for this ${noun}${named}. The decision below says how it was lifted.`
            : 'Appeal accepted. The penalty ends within 24 hours, and this page updates when it does.'}
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2 border-b border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-800 dark:text-rose-200">
      <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        {target
          ? decision === 'denied_permanent'
            ? `Appeal denied permanently. This ${noun}${named} cannot be appealed again. Other penalties can still be appealed.`
            : `Appeal denied. You can appeal this ${noun}${named} again in 12 months. Other penalties can still be appealed.`
          : decision === 'denied_permanent'
            ? 'Appeal denied permanently. This account cannot file another appeal.'
            : 'Appeal denied. You can appeal again in 12 months, or sooner if a new penalty is issued.'}
      </span>
    </div>
  );
}

function quoteSnippet(body?: string, limit = 120) {
  const text = String(body || '').replace(/\s+/g, ' ').trim();
  return text.length > limit ? `${text.slice(0, limit).trimEnd()}…` : text;
}

/** Open cases first, then the newest. The server already sorts by activity. */
function openFirst<T extends { access?: CaseAccess }>(rows: T[]) {
  return [...rows].sort((left, right) => Number(Boolean(left.access?.closed)) - Number(Boolean(right.access?.closed)));
}

function isSystemMessage(message: ThreadMessage) {
  return String(message.messageType || message.authorType || '').toLowerCase() === 'system';
}

function RateTicket({ ticketId, onRated }: { ticketId: string; onRated: () => void }) {
  const [sending, setSending] = useState(false);
  async function rate(score: number) {
    if (sending) return;
    setSending(true);
    try {
      await api.post(`/api/users/tickets/${ticketId}/satisfaction`, { score });
      showSuccessToast('Thanks for rating the help you got.');
      onRated();
    } catch (err) {
      showErrorToast(errorMessage(err, 'Could not save your rating.'));
    } finally {
      setSending(false);
    }
  }
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      <span className="text-xs text-gray-500 dark:text-zinc-400">How was the help?</span>
      {[1, 2, 3, 4, 5].map((score) => (
        <button
          key={score}
          type="button"
          disabled={sending}
          onClick={() => void rate(score)}
          aria-label={`Rate ${score} out of 5`}
          className="h-7 w-7 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5"
        >
          {score}
        </button>
      ))}
    </div>
  );
}

/**
 * A member's tickets and disputes: the list, and the selected case laid out like the public
 * dispute page (header with chips and parties, discussion, side column). Used by the Cases page
 * (`/support/cases`) and the appeal page. Everything a member may do comes from the server's
 * `access`, so banned, locked, suspended and active members each see exactly what the write
 * paths will accept.
 */
export default function CaseInbox({
  tickets,
  disputes,
  listsLoading,
  listsError,
  selection,
  onSelect,
  onRefreshLists,
  accountId,
  onAppealDecision,
  heading = 'Tickets and disputes',
  description = 'Reply to staff and attach screenshots or files. Updates as soon as staff answer.',
  tall = false,
}: {
  tickets: TicketRow[];
  disputes: DisputeRow[];
  listsLoading: boolean;
  listsError: boolean;
  selection: CaseSelection | null;
  onSelect: (selection: CaseSelection | null) => void;
  onRefreshLists: () => Promise<void>;
  accountId: string;
  /** Called with the ticket id whenever an opened appeal ticket carries a decision. */
  onAppealDecision?: (ticketId: string) => void;
  heading?: string;
  description?: string;
  /** The Cases page gives the inbox most of the screen. */
  tall?: boolean;
}) {
  const navigate = useNavigate();
  const [thread, setThread] = useState<ThreadState>(EMPTY_THREAD);
  const [reply, setReply] = useState('');
  const [replyTo, setReplyTo] = useState<ThreadMessage | null>(null);
  const [filter, setFilter] = useState<ThreadFilter>('all');
  // Below the widest screens the side column folds into "Case info"; open by default on Cases.
  const [showInfo, setShowInfo] = useState(tall);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [outbox, setOutbox] = useState<OutgoingMessage[]>([]);
  const outboxRef = useRef<OutgoingMessage[]>([]);
  outboxRef.current = outbox;
  const replyFiles = usePendingFiles();
  const clearReplyFiles = replyFiles.clear;
  const requestRef = useRef(0);
  const selectionRef = useRef<CaseSelection | null>(selection);
  const scrollRef = useRef<HTMLDivElement>(null);
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const lastCountRef = useRef(0);

  const onAppealDecisionRef = useRef(onAppealDecision);
  const onSelectRef = useRef(onSelect);
  selectionRef.current = selection;
  onAppealDecisionRef.current = onAppealDecision;
  onSelectRef.current = onSelect;

  const loadThread = useCallback(async (target: CaseSelection, silent = false) => {
    const requestId = ++requestRef.current;
    if (!silent) setThread({ ...EMPTY_THREAD, loading: true });
    try {
      const res = await api.get(
        target.kind === 'ticket' ? `/api/users/tickets/${target.id}` : `/api/users/disputes/${target.id}`
      );
      if (requestId !== requestRef.current) return;
      const data = res.data?.data || {};
      const appealDecision: AppealDecision = data.appealDecision ?? data.ticket?.appealDecision ?? null;
      if (target.kind === 'ticket' && appealDecision) onAppealDecisionRef.current?.(target.id);
      const t = data.ticket || {};
      setThread({
        loading: false,
        error: null,
        messages: data.messages || [],
        access: data.access || null,
        appealDecision,
        appealTarget: target.kind === 'ticket' ? data.ticket?.appealTarget ?? null : null,
        mentions: target.kind === 'dispute' ? data.mentions || {} : undefined,
        details: target.kind === 'dispute' ? data.details || null : undefined,
        dispute:
          target.kind === 'dispute'
            ? {
                title: data.title ?? null,
                number: data.number ?? null,
                createdAt: data.createdAt ?? null,
                updatedAt: data.updatedAt ?? null,
                settlement: data.settlement ?? null,
              }
            : undefined,
        ticket:
          target.kind === 'ticket'
            ? {
                number: t.number ?? null,
                subject: t.subject ?? null,
                type: t.type ?? null,
                priority: t.priority ?? null,
                createdAt: t.createdAt ?? null,
                updatedAt: t.lastMessageAt ?? t.updatedAt ?? null,
                closedAt: t.closedAt ?? null,
                autoClosesAt: data.autoClosesAt ?? null,
                people: Array.isArray(data.participants)
                  ? data.participants.filter((person: { status?: string }) => person.status === 'active').length
                  : undefined,
                assignee: t.assignee ? { name: t.assignee.name || 'Staff member', role: t.assignee.role || null } : null,
                requester: t.requester?.accountId
                  ? {
                      accountId: String(t.requester.accountId),
                      name: t.requester.name || 'Member',
                      username: t.requester.username && t.requester.username !== '—' ? t.requester.username : null,
                    }
                  : null,
                formValues: Array.isArray(data.formValues)
                  ? data.formValues.map((answer: { label?: string; key?: string; value?: unknown }) => ({
                      label: String(answer.label || answer.key || ''),
                      value: String(answer.value ?? ''),
                    }))
                  : [],
                satisfactionScore: t.satisfactionScore ?? null,
              }
            : undefined,
      });
    } catch (err) {
      if (requestId !== requestRef.current || silent) return;
      setThread({ ...EMPTY_THREAD, error: errorMessage(err, 'Could not load this conversation.') });
    }
  }, []);

  useEffect(() => {
    lastCountRef.current = 0;
    setReply('');
    setReplyTo(null);
    setFilter('all');
    clearReplyFiles();
    if (selection) void loadThread(selection);
    else {
      requestRef.current += 1;
      setThread(EMPTY_THREAD);
    }
  }, [selection, loadThread, clearReplyFiles]);

  // Staff answered, closed the case, made it public, or a penalty changed what this member may
  // do: show it straight away. The lists re-read themselves (`useCaseLists`).
  const onCaseEvent = useCallback(
    (update: CaseUpdate | null) => {
      const current = selectionRef.current;
      if (!current) return;
      if (update && (update.kind !== current.kind || String(update.id) !== String(current.id))) return;
      if (update?.removed) {
        onSelectRef.current(null);
        showErrorToast('This case is no longer shared with you.');
        return;
      }
      if (update?.access) setThread((state) => ({ ...state, access: update.access || state.access }));
      void loadThread(current, true);
    },
    [loadThread]
  );
  useCaseEvents(onCaseEvent);

  // Fallback for a missed event, while the tab is visible.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      void onRefreshLists().catch(() => undefined);
      if (selectionRef.current) void loadThread(selectionRef.current, true);
    };
    const timer = window.setInterval(refresh, POLL_MS);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [onRefreshLists, loadThread]);

  // Previews of messages still sending are freed when the inbox goes away.
  useEffect(() => () => outboxRef.current.forEach((item) => releasePendingFiles(item.files)), []);

  const selectedTicket = selection?.kind === 'ticket' ? tickets.find((t) => t.id === selection.id) || null : null;
  const selectedDispute = selection?.kind === 'dispute' ? disputes.find((d) => d.id === selection.id) || null : null;
  const isDispute = selection?.kind === 'dispute';
  // The thread's own read is the freshest; the list row stands in while it loads.
  const access: CaseAccess | null = thread.access || selectedTicket?.access || selectedDispute?.access || null;
  const canCompose = Boolean(selection && access?.canReply && !thread.loading && !thread.error);
  const replyMax = isDispute ? APPEAL_LIMITS.disputeReply : APPEAL_LIMITS.description;
  const viewerRole =
    access?.viewerRole === 'disputer' || access?.viewerRole === 'disputee' ? access.viewerRole : null;

  const messageById = useMemo(
    () => new Map(thread.messages.map((message) => [String(message.id), message])),
    [thread.messages]
  );

  function messageIsOwn(message: ThreadMessage) {
    const sender = message.senderId || message.senderAccountId;
    if (sender && accountId) return String(sender) === accountId;
    return String(message.authorType || '').toLowerCase() === 'user';
  }

  function authorLabel(message: ThreadMessage, own: boolean) {
    if (own) return 'You';
    if (String(message.authorType || '').toLowerCase() === 'staff') return message.authorName || 'Staff';
    return message.authorName || 'Member';
  }

  /** A message in the shape the public page's thread rows take. */
  const toRow = useCallback(
    (message: ThreadMessage): DiscussionMessage => {
      const staff = String(message.authorType || '').toLowerCase() === 'staff';
      return {
        id: String(message.id),
        authorName: message.authorName || (staff ? 'Staff' : 'Member'),
        authorRole: isDispute ? message.authorRole ?? (staff ? 'staff' : null) : staff ? 'staff' : null,
        body: message.isUnsent ? 'This message was removed.' : message.body,
        createdAt: message.createdAt ?? null,
        audience: isDispute ? message.audience ?? undefined : undefined,
        pendingReview: Boolean(message.pendingReview),
        replyToId: message.replyToId ?? null,
        authorType: message.authorType ?? null,
        senderAccountId: message.senderAccountId || message.senderId || null,
        authorAvatar: message.authorAvatar ?? null,
        attachments: message.isUnsent ? [] : ((message.attachments || []) as DisputeAttachment[]),
      };
    },
    [isDispute]
  );

  // Filter counts (disputes), activity numbers and the reopened flag, from what this member sees.
  const derived = useMemo(() => {
    const counts: Record<ThreadFilter, number> = { all: 0, rulings: 0, parties: 0, community: 0 };
    const people = new Set<string>();
    let replies = 0;
    let fromStaff = 0;
    let latestCaseRuling: ThreadMessage | undefined;
    let lastAt: string | null = null;
    for (const message of thread.messages) {
      if (message.createdAt) lastAt = message.createdAt;
      if (isSystemMessage(message) && !(isDispute && isDisputeDecision(message))) continue;
      counts.all += 1;
      if (isDispute) {
        const category = messageCategory(toRow(message));
        counts[category] += 1;
        if (category === 'rulings') {
          const kind = parseDisputeRuling(message.body).kind;
          if (kind === 'decision' || kind === 'reopen') latestCaseRuling = message;
          continue;
        }
      }
      replies += 1;
      if (String(message.authorType || '').toLowerCase() === 'staff') fromStaff += 1;
      people.add(String(message.senderAccountId || message.senderId || message.authorName || ''));
    }
    const stats: CaseStats = {
      replies,
      notices: isDispute ? counts.rulings : fromStaff,
      people: people.size,
    };
    return {
      counts,
      stats,
      lastAt,
      reopened: Boolean(latestCaseRuling && parseDisputeRuling(latestCaseRuling.body).kind === 'reopen'),
    };
  }, [thread.messages, isDispute, toRow]);

  const shownMessages = useMemo(() => {
    if (!isDispute || filter === 'all') return thread.messages;
    return thread.messages.filter((message) => !isSystemMessage(message) || isDisputeDecision(message)).filter(
      (message) => messageCategory(toRow(message)) === filter
    );
  }, [thread.messages, filter, isDispute, toRow]);

  // This case's unconfirmed replies. One the server already returned (a live refresh can land
  // before the send finishes) is not shown twice.
  const visibleOutbox = useMemo(() => {
    if (!selection) return [];
    return outbox.filter((item) => {
      if (item.target.kind !== selection.kind || item.target.id !== selection.id) return false;
      if (item.status !== 'sending' || !item.body) return true;
      const sentAt = new Date(item.createdAt).getTime() - 5000;
      return !thread.messages.some((message) => {
        const sender = message.senderId || message.senderAccountId;
        return (
          sender &&
          String(sender) === accountId &&
          String(message.body || '').trim() === item.body &&
          new Date(message.createdAt || 0).getTime() >= sentAt
        );
      });
    });
  }, [outbox, selection, thread.messages, accountId]);

  // Scroll the thread itself (never the window) when a message arrives or is sent.
  const shownCount = shownMessages.length + visibleOutbox.length;
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || shownCount === lastCountRef.current) return;
    lastCountRef.current = shownCount;
    el.scrollTop = el.scrollHeight;
  }, [shownCount]);

  /**
   * Upload and save one outgoing message in the background. The row is already on screen;
   * on success it is swapped for the saved message, on failure it stays with Retry / Remove.
   */
  const deliver = useCallback(
    async (item: OutgoingMessage) => {
      const { target } = item;
      try {
        const attachments =
          item.uploaded ??
          (await uploadPendingFiles(item.files, target.kind === 'ticket' ? 'ticket-attachments' : 'chat-attachments'));
        // Remember finished uploads so a retry does not upload the files again.
        setOutbox((list) => list.map((entry) => (entry.localId === item.localId ? { ...entry, uploaded: attachments } : entry)));
        const payload = { body: item.body, ...(attachments.length ? { attachments } : {}) };
        const res =
          target.kind === 'ticket'
            ? await api.post(`/api/users/tickets/${target.id}/messages`, {
                ...payload,
                ...(item.replyToId ? { replyToMessageId: item.replyToId } : {}),
              })
            : await api.post(`/api/accounts/disputes/${target.id}/messages`, {
                ...payload,
                ...(item.replyToId ? { replyToId: item.replyToId } : {}),
              });
        const saved: ThreadMessage | undefined = target.kind === 'ticket' ? res.data?.data : res.data?.data?.message;
        const current = selectionRef.current;
        const stillOpen = current?.kind === target.kind && current.id === target.id;
        if (stillOpen && saved?.id) {
          setThread((state) =>
            state.messages.some((message) => String(message.id) === String(saved.id))
              ? state
              : { ...state, messages: [...state.messages, saved] }
          );
        }
        setOutbox((list) => list.filter((entry) => entry.localId !== item.localId));
        releasePendingFiles(item.files);
        // The server's copy (audience, attachments, links) and the case state, quietly.
        if (stillOpen) void loadThread(target, true);
        void onRefreshLists().catch(() => undefined);
      } catch (err) {
        setOutbox((list) =>
          list.map((entry) =>
            entry.localId === item.localId
              ? {
                  ...entry,
                  status: 'failed',
                  error: errorMessage(err, err instanceof Error && err.message ? err.message : 'Not sent.'),
                }
              : entry
          )
        );
      }
    },
    [loadThread, onRefreshLists]
  );

  function sendReply() {
    if (!selection || !canCompose || thread.loading) return;
    const body = reply.trim();
    if (!body && !replyFiles.files.length) return;
    const item: OutgoingMessage = {
      localId: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      target: selection,
      body,
      files: replyFiles.take(),
      uploaded: null,
      replyToId: replyTo ? String(replyTo.id) : null,
      createdAt: new Date().toISOString(),
      status: 'sending',
    };
    // The message is on screen straight away; the composer is free for the next one.
    setOutbox((list) => [...list, item]);
    setFilter('all');
    setReply('');
    setReplyTo(null);
    if (replyRef.current) {
      replyRef.current.style.height = 'auto';
      replyRef.current.focus();
    }
    void deliver(item);
  }

  function retryOutgoing(item: OutgoingMessage) {
    const next: OutgoingMessage = { ...item, status: 'sending', error: undefined };
    setOutbox((list) => list.map((entry) => (entry.localId === item.localId ? next : entry)));
    void deliver(next);
  }

  function removeOutgoing(item: OutgoingMessage) {
    setOutbox((list) => list.filter((entry) => entry.localId !== item.localId));
    releasePendingFiles(item.files);
  }

  function startReply(message: ThreadMessage) {
    setReplyTo(message);
    replyRef.current?.focus();
  }

  function jumpTo(messageId: string) {
    if (filter !== 'all') setFilter('all');
    window.requestAnimationFrame(() =>
      document.getElementById(`dispute-message-${messageId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    );
  }

  const reloadCase = () => {
    void onRefreshLists().catch(() => undefined);
    if (selectionRef.current) void loadThread(selectionRef.current, true);
  };

  // Header facts, from the thread's read with the list row standing in while it loads.
  const caseNumber = isDispute
    ? thread.dispute?.number || selectedDispute?.number || null
    : thread.ticket?.number || selectedTicket?.number || null;
  const caseTitle = isDispute
    ? thread.details?.title || thread.dispute?.title || selectedDispute?.title || 'Dispute'
    : thread.ticket?.subject || selectedTicket?.subject || 'Support ticket';
  const openedAt = isDispute ? thread.details?.filedAt || thread.dispute?.createdAt : thread.ticket?.createdAt;
  const updatedAt = derived.lastAt || (isDispute ? thread.dispute?.updatedAt : thread.ticket?.updatedAt) || null;
  const appeal = Boolean(selectedTicket && isAppealTicket(selectedTicket));
  const typeChip = isDispute
    ? `${(thread.details?.type || 'Contract').toLowerCase() === 'transaction' ? 'Transaction' : 'Contract'} dispute`
    : thread.ticket?.type || selectedTicket?.type || 'Support ticket';
  const reportedText = useMemo(() => {
    if (isDispute) return null;
    const first = thread.messages.find((message) => !isSystemMessage(message) && messageIsOwn(message));
    return first?.body?.trim() || null;
    // messageIsOwn reads only `accountId`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread.messages, isDispute, accountId]);

  const sidePanels = isDispute ? (
    <DisputeSidePanels
      details={thread.details ?? null}
      access={access}
      settlement={thread.dispute?.settlement}
      mentions={thread.mentions}
      stats={derived.stats}
      lastAt={updatedAt}
      reopened={derived.reopened}
      onPreview={setPreviewUrl}
    />
  ) : thread.ticket ? (
    <TicketSidePanels
      ticket={thread.ticket}
      access={access}
      reported={reportedText}
      stats={derived.stats}
      lastAt={updatedAt}
    />
  ) : null;

  const sortedTickets = useMemo(() => openFirst(tickets), [tickets]);
  const sortedDisputes = useMemo(() => openFirst(disputes), [disputes]);
  const heightClass = tall ? 'h-[calc(100vh-11rem)] min-h-[40rem]' : 'h-[42rem] lg:h-[46rem]';
  const filterTabs = THREAD_FILTERS.filter((tab) => tab.key !== 'community' || derived.counts.community > 0);
  const emptyText = isDispute
    ? access?.limited
      ? 'The discussion on this case stays private.'
      : THREAD_FILTERS.find((tab) => tab.key === filter)?.empty || 'No replies yet.'
    : 'No messages yet.';

  // Thread rows with day dividers; replies by the same person close together fold under one header.
  const threadRows: ReactNode[] = [];
  {
    let lastDay = '';
    let previous: DiscussionMessage | null = null;
    for (const message of shownMessages) {
      const day = dayKey(message.createdAt);
      if (day && day !== lastDay) {
        threadRows.push(<DayDivider key={`day-${day}`} label={dayLabel(message.createdAt)} />);
        lastDay = day;
        previous = null;
      }
      if (isDispute && isDisputeDecision(message)) {
        threadRows.push(
          <div key={message.id} id={`dispute-message-${message.id}`} className="my-3 px-3 sm:px-4">
            <DisputeDecisionCard body={message.body} when={formatStandingWhen(message.createdAt)} mentions={thread.mentions} />
          </div>
        );
        previous = null;
        continue;
      }
      const decisionCard = isDispute ? null : decisionCardOf(message);
      if (decisionCard) {
        threadRows.push(
          <div key={message.id} className="my-3 px-3 sm:px-4">
            <AppealDecisionCard card={decisionCard} when={formatStandingWhen(message.createdAt)} />
          </div>
        );
        previous = null;
        continue;
      }
      if (isSystemMessage(message)) {
        threadRows.push(
          <div key={message.id} className="my-3 flex justify-center px-3">
            <span className="max-w-[90%] rounded-full bg-gray-100 px-4 py-1.5 text-center text-xs text-gray-500 dark:bg-white/5 dark:text-zinc-400">
              {message.body}
            </span>
          </div>
        );
        previous = null;
        continue;
      }
      const row = toRow(message);
      const continued = Boolean(
        previous &&
          !row.replyToId &&
          previous.senderAccountId &&
          previous.senderAccountId === row.senderAccountId &&
          new Date(row.createdAt || 0).getTime() - new Date(previous.createdAt || 0).getTime() < CONTINUE_MS
      );
      const parent = message.replyToId ? messageById.get(String(message.replyToId)) : undefined;
      threadRows.push(
        <ThreadRow
          key={message.id}
          message={row}
          parent={parent ? toRow(parent) : undefined}
          continued={continued}
          mine={messageIsOwn(message)}
          pending={false}
          viewerRole={viewerRole}
          mentions={thread.mentions}
          canReply={canCompose && !message.isUnsent}
          animate={false}
          onReply={() => startReply(message)}
          onJumpToParent={parent ? () => jumpTo(String(parent.id)) : undefined}
          onPreview={(url) => setPreviewUrl(url)}
        />
      );
      previous = row;
    }
  }

  return (
    <section
      aria-label={heading}
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-dark-surface"
    >
      <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-4 dark:border-white/10">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-300">
          <Inbox className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{heading}</h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400">{description}</p>
        </div>
      </div>

      <div className={`flex ${heightClass}`}>
        {/* List: full width on phones until a case is opened. */}
        <aside
          className={`${selection ? 'hidden lg:flex' : 'flex'} w-full shrink-0 flex-col border-gray-200 lg:w-72 lg:border-r dark:border-white/10`}
        >
          <div className="min-h-0 flex-1 overflow-y-auto pb-3">
            {listsLoading ? (
              <div className="space-y-3 px-4 py-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3.5 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
                    <div className="h-2.5 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
                  </div>
                ))}
              </div>
            ) : listsError ? (
              <div className="px-4 py-6 text-sm text-gray-500 dark:text-zinc-400">
                Could not load your tickets and disputes.{' '}
                <button type="button" onClick={() => void onRefreshLists().catch(() => undefined)} className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
                  Try again
                </button>
              </div>
            ) : (
              <>
                <ListHeading label="Disputes" count={disputes.length} />
                {sortedDisputes.length === 0 ? (
                  <p className="px-4 py-2 text-sm text-gray-500 dark:text-zinc-500">No disputes.</p>
                ) : (
                  sortedDisputes.map((dispute) => (
                    <CaseRow
                      key={dispute.id}
                      title={dispute.title || dispute.number || 'Dispute'}
                      meta={[dispute.number, formatStandingWhen(dispute.updatedAt)].filter(Boolean).join(' · ')}
                      access={dispute.access}
                      fallbackStatus={dispute.status}
                      icon={<Scale className="h-3 w-3 shrink-0" />}
                      active={selection?.kind === 'dispute' && selection.id === dispute.id}
                      onClick={() => onSelect({ kind: 'dispute', id: dispute.id })}
                    />
                  ))
                )}
                <ListHeading label="Tickets" count={tickets.length} />
                {sortedTickets.length === 0 ? (
                  <p className="px-4 py-2 text-sm text-gray-500 dark:text-zinc-500">No tickets yet.</p>
                ) : (
                  sortedTickets.map((ticket) => (
                    <CaseRow
                      key={ticket.id}
                      title={ticket.subject || ticket.number || 'Ticket'}
                      meta={[
                        // Each appeal is about one penalty; name it so several appeals are told apart.
                        ticket.appealTarget?.label || null,
                        ticket.number ? `#${ticket.number}` : null,
                        formatStandingWhen(ticket.lastMessageAt || ticket.updatedAt),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                      access={ticket.access}
                      fallbackStatus={ticket.status}
                      icon={isAppealTicket(ticket) ? <Gavel className="h-3 w-3 shrink-0" /> : <LifeBuoy className="h-3 w-3 shrink-0" />}
                      active={selection?.kind === 'ticket' && selection.id === ticket.id}
                      onClick={() => onSelect({ kind: 'ticket', id: ticket.id })}
                    />
                  ))
                )}
              </>
            )}
          </div>
        </aside>

        <div className={`${selection ? 'flex' : 'hidden lg:flex'} min-w-0 flex-1 flex-col bg-gray-50 dark:bg-dark-base`}>
          {!selection ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
              <LifeBuoy className="h-8 w-8 text-gray-300 dark:text-zinc-700" />
              <p className="text-sm font-medium text-gray-700 dark:text-zinc-300">Pick a case</p>
              <p className="max-w-xs text-xs text-gray-500 dark:text-zinc-500">Open a ticket or dispute to see its details and reply.</p>
            </div>
          ) : (
            <>
              {/* Case header: chips, title, timing, and who is involved. */}
              <div className="border-b border-gray-200 bg-white px-4 py-3.5 dark:border-white/10 dark:bg-dark-surface">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => onSelect(null)}
                    aria-label="Back to the list"
                    className="mt-0.5 rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 lg:hidden dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {caseNumber ? <HeaderChip>{isDispute ? caseNumber : `#${caseNumber}`}</HeaderChip> : null}
                      <HeaderChip>{typeChip}</HeaderChip>
                      {isDispute ? (
                        <HeaderChip tone={access?.visibility ? 'violet' : 'gray'}>{access?.visibility ? 'Public' : 'Private'}</HeaderChip>
                      ) : null}
                      {appeal ? <HeaderChip tone="amber">Appeal</HeaderChip> : null}
                      <StageChip access={access} />
                    </div>
                    <h3 className="mt-1.5 truncate text-lg font-bold text-gray-900 dark:text-white">{caseTitle}</h3>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
                      {[
                        openedAt ? `${isDispute ? 'Filed' : 'Opened'} ${relativeTime(openedAt)}` : null,
                        updatedAt ? `Updated ${relativeTime(updatedAt)}` : null,
                        `${derived.stats.replies} ${derived.stats.replies === 1 ? 'reply' : 'replies'}`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {access?.publicPath ? (
                      <button
                        type="button"
                        onClick={() => navigate(access.publicPath as string)}
                        className="hidden items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 sm:inline-flex dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5"
                      >
                        Public page <ExternalLink className="h-3 w-3" />
                      </button>
                    ) : null}
                    {sidePanels ? (
                      <button
                        type="button"
                        onClick={() => setShowInfo((open) => !open)}
                        aria-expanded={showInfo}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 2xl:hidden dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5"
                      >
                        <PanelRightOpen className="h-3.5 w-3.5" />
                        Case info
                        <ChevronDown className={`h-3 w-3 transition-transform ${showInfo ? 'rotate-180' : ''}`} />
                      </button>
                    ) : null}
                  </div>
                </div>
                {isDispute && thread.details ? (
                  <div className="mt-3">
                    <DisputeParties
                      details={thread.details}
                      viewerRole={viewerRole}
                      viewerAccountId={accountId}
                      namedMember={Boolean(access?.namedMember)}
                    />
                  </div>
                ) : !isDispute && thread.ticket ? (
                  <div className="mt-3">
                    <TicketParties ticket={thread.ticket} accountId={accountId} />
                  </div>
                ) : null}
              </div>

              {selectedTicket ? (
                <DecisionNotice decision={thread.appealDecision ?? null} target={thread.appealTarget ?? null} />
              ) : null}
              {access?.attention && !access.closed ? (
                <div className="flex items-start gap-2 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-900 dark:text-amber-100">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{access.attention}</span>
                </div>
              ) : null}

              <div className="flex min-h-0 flex-1">
                <div className="flex min-w-0 flex-1 flex-col">
                  {/* Below 2xl the side column folds in here. */}
                  {showInfo && sidePanels ? (
                    <div className="max-h-[45%] shrink-0 overflow-y-auto border-b border-gray-200 bg-gray-50 p-3 2xl:hidden dark:border-white/10 dark:bg-dark-base">
                      <div className="grid gap-3 md:grid-cols-2">{sidePanels}</div>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-gray-200 bg-white px-4 py-2 dark:border-white/10 dark:bg-dark-surface">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white">
                      <MessagesSquare className="h-4 w-4 text-gray-400 dark:text-zinc-500" />
                      {isDispute ? 'Discussion' : 'Conversation'}
                    </span>
                    {!access?.closed ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Live
                      </span>
                    ) : null}
                    {isDispute ? (
                      <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Filter the discussion">
                        {filterTabs.map((tab) => (
                          <button
                            key={tab.key}
                            type="button"
                            role="tab"
                            aria-selected={filter === tab.key}
                            onClick={() => setFilter(tab.key)}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                              filter === tab.key
                                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white'
                            }`}
                          >
                            {tab.label}
                            <span
                              className={`rounded-full px-1.5 text-[10px] tabular-nums ${
                                filter === tab.key ? 'bg-white/20 dark:bg-black/10' : 'bg-gray-100 dark:bg-white/5'
                              }`}
                            >
                              {derived.counts[tab.key]}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white py-2 dark:bg-dark-surface">
                    {thread.loading ? (
                      <div className="flex flex-1 items-center justify-center text-gray-400 dark:text-zinc-500">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    ) : thread.error ? (
                      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-sm text-gray-500 dark:text-zinc-400">
                        <p>{thread.error}</p>
                        <button type="button" onClick={() => void loadThread(selection)} className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
                          Try again
                        </button>
                      </div>
                    ) : (
                      <div className="mt-auto flex flex-col">
                        {shownMessages.length === 0 && visibleOutbox.length === 0 ? (
                          <p className="py-10 text-center text-sm text-gray-500 dark:text-zinc-500">{emptyText}</p>
                        ) : null}
                        {threadRows}
                        {visibleOutbox.map((item) => {
                          const parent = item.replyToId ? messageById.get(item.replyToId) : undefined;
                          const failed = item.status === 'failed';
                          return (
                            <div
                              key={item.localId}
                              className={`mt-1 flex gap-3 rounded-xl px-3 pb-2 pt-3 sm:px-4 ${
                                failed ? 'bg-rose-50 dark:bg-rose-500/[0.06]' : 'opacity-70'
                              }`}
                            >
                              <div className="w-8 shrink-0">
                                <Avatar name="You" role={viewerRole} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <span className="text-sm font-semibold text-gray-900 dark:text-white">You</span>
                                  <RoleChip role={viewerRole} />
                                  {failed ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400">
                                      <AlertCircle className="h-3 w-3" />
                                      {item.error || 'Not sent.'}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 dark:text-zinc-500">
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      {item.files.length && !item.uploaded ? 'Uploading…' : 'Sending…'}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1">
                                  {parent ? <QuotedMessage parent={toRow(parent)} /> : null}
                                  {item.body ? (
                                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700 dark:text-zinc-300">
                                      {item.body}
                                    </p>
                                  ) : null}
                                  <SendingAttachments files={item.files} />
                                </div>
                                {failed ? (
                                  <div className="mt-1.5 flex items-center gap-3 text-[11px]">
                                    <button
                                      type="button"
                                      onClick={() => retryOutgoing(item)}
                                      className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
                                    >
                                      Retry
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeOutgoing(item)}
                                      className="font-semibold text-gray-500 hover:underline dark:text-zinc-400"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {!canCompose ? (
                    <div className="flex flex-col items-center gap-2 border-t border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 dark:border-white/10 dark:bg-dark-surface dark:text-zinc-400">
                      {selectedTicket && access?.canRate ? <RateTicket ticketId={selectedTicket.id} onRated={reloadCase} /> : null}
                      <span className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
                        <span className="inline-flex items-center gap-1.5">
                          <Lock className="h-3.5 w-3.5 shrink-0" />
                          {thread.loading ? 'Loading…' : access?.readOnlyReason || 'This conversation is read-only.'}
                        </span>
                        {access?.publicPath ? (
                          <button
                            type="button"
                            onClick={() => navigate(access.publicPath as string)}
                            className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline dark:text-blue-400"
                          >
                            Open the public page <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </span>
                    </div>
                  ) : (
                    <div
                      className="flex flex-col gap-2 border-t border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-dark-surface"
                      onDragOver={(event) => {
                        if (event.dataTransfer.types.includes('Files')) event.preventDefault();
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        replyFiles.add(event.dataTransfer.files);
                      }}
                    >
                      {access?.replyHint ? (
                        <p className="px-1 text-xs text-gray-500 dark:text-zinc-500">{access.replyHint}</p>
                      ) : null}
                      {replyTo ? (
                        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
                          <CornerUpLeft className="h-3.5 w-3.5 shrink-0" />
                          <span className="min-w-0 flex-1 truncate">
                            Replying to {authorLabel(replyTo, messageIsOwn(replyTo))}: {quoteSnippet(replyTo.body, 80) || 'Attachment'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setReplyTo(null)}
                            aria-label="Cancel reply"
                            className="rounded p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-white"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : null}
                      <PendingFileList files={replyFiles.files} onRemove={replyFiles.remove} />
                      <div className="flex items-end gap-2">
                        <AttachButton onPick={replyFiles.add} disabled={thread.loading} count={replyFiles.files.length} />
                        <textarea
                          ref={replyRef}
                          value={reply}
                          rows={1}
                          maxLength={replyMax}
                          disabled={thread.loading}
                          aria-label={isDispute ? 'Reply on this dispute' : 'Reply to support'}
                          placeholder={isDispute ? 'Add to your case… (Shift + Enter for a new line)' : 'Write a reply… (Shift + Enter for a new line)'}
                          onPaste={(event) => {
                            const pasted = Array.from(event.clipboardData.files || []);
                            if (!pasted.length) return;
                            event.preventDefault();
                            replyFiles.add(pasted);
                          }}
                          onChange={(event) => {
                            setReply(event.target.value);
                            const el = event.target;
                            el.style.height = 'auto';
                            el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Escape' && replyTo) {
                              setReplyTo(null);
                              return;
                            }
                            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                              event.preventDefault();
                              sendReply();
                            }
                          }}
                          className="max-h-40 min-h-10 flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-white/10 dark:bg-dark-base dark:text-white dark:placeholder:text-zinc-600"
                        />
                        <button
                          type="button"
                          onClick={sendReply}
                          disabled={!reply.trim() && !replyFiles.files.length}
                          className="rounded-xl bg-blue-600 p-2.5 text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label="Send reply"
                        >
                          <Send className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* The side column, as on the public dispute page, on the widest screens. */}
                {sidePanels ? (
                  <aside className="hidden w-80 shrink-0 space-y-3 overflow-y-auto border-l border-gray-200 bg-gray-50 p-3 2xl:block dark:border-white/10 dark:bg-dark-base">
                    {sidePanels}
                  </aside>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
      <ChatImagePreview url={previewUrl} onClose={() => setPreviewUrl(null)} />
    </section>
  );
}
