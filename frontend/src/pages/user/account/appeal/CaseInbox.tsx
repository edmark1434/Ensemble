import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  CornerUpLeft,
  ExternalLink,
  Gavel,
  Inbox,
  LifeBuoy,
  Loader2,
  Lock,
  Scale,
  Send,
  X,
  XCircle,
} from 'lucide-react';
import api from '@/lib/axios';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast';
import { formatStandingWhen } from '@/lib/standing';
import { useCaseEvents, type CaseAccess, type CaseUpdate } from '@/lib/cases';
import {
  AudiencePill,
  DisputeDecisionCard,
  MentionText,
  isDisputeDecision,
  type MentionMap,
} from '@/pages/user/disputes/disputeUi';
import {
  type AppealDecision,
  type CaseSelection,
  type DisputeRow,
  type ThreadMessage,
  type TicketRow,
  APPEAL_LIMITS,
  errorMessage,
  isAppealTicket,
} from './appealShared';
import {
  AttachButton,
  MessageAttachments,
  PendingFileList,
  SendingAttachments,
  releasePendingFiles,
  uploadPendingFiles,
  usePendingFiles,
  type AttachmentPayload,
  type PendingFile,
} from './appealAttachments';

/** Live `caseUpdated` events do the work; this only catches a missed event. */
const POLL_MS = 60_000;

type TicketInfo = {
  number?: string | null;
  type?: string | null;
  priority?: string | null;
  autoClosesAt?: string | null;
  people?: number;
};

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

type CaseParty = { accountId: string; name: string; handle: string | null };

/** `details` on a party's dispute read (`loadDisputeCaseDetails`). */
type DisputeCaseDetails = {
  type?: string;
  title?: string | null;
  complaint?: string | null;
  filedAt?: string | null;
  disputer?: CaseParty | null;
  disputee?: CaseParty | null;
  contract?: { id: string; title: string | null; kind: string; status: string | null; rateCredits: number } | null;
  creditsInvolved?: number;
  conductOnly?: boolean;
  outcome?: { key: string | null; label: string; notes: string | null; decidedAt: string | null } | null;
};

type ThreadState = {
  loading: boolean;
  error: string | null;
  messages: ThreadMessage[];
  /** What the member may do here, from the server. */
  access: CaseAccess | null;
  appealDecision?: AppealDecision;
  mentions?: MentionMap;
  ticket?: TicketInfo;
  details?: DisputeCaseDetails | null;
};

function credits(amount?: number) {
  const value = Number(amount || 0);
  return `${value.toLocaleString()} credit${value === 1 ? '' : 's'}`;
}

function PartyName({ party, accountId }: { party?: CaseParty | null; accountId: string }) {
  if (!party) return <span className="text-gray-500 dark:text-zinc-500">Unknown</span>;
  const isYou = Boolean(accountId) && party.accountId === accountId;
  return (
    <span className="min-w-0">
      <Link
        to={`/profile/${party.accountId}`}
        className="font-semibold text-sky-700 underline-offset-2 hover:underline dark:text-sky-300"
      >
        {party.name}
      </Link>
      {party.handle ? <span className="text-gray-500 dark:text-zinc-500"> @{party.handle}</span> : null}
      {isYou ? (
        <span className="ml-1.5 rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300">
          You
        </span>
      ) : null}
    </span>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-2 py-1.5 text-xs">
      <dt className="text-gray-500 dark:text-zinc-500">{label}</dt>
      <dd className="min-w-0 break-words text-gray-800 dark:text-zinc-200">{children}</dd>
    </div>
  );
}

/**
 * The case file both parties read beside the discussion: who filed against whom, the contract,
 * the credits at stake, the complaint, and the decision once there is one.
 */
function DisputeDetailsPanel({
  details,
  access,
  accountId,
  mentions,
}: {
  details: DisputeCaseDetails;
  access: CaseAccess | null;
  accountId: string;
  mentions?: MentionMap;
}) {
  const [expanded, setExpanded] = useState(false);
  const closed = Boolean(access?.closed);
  const complaint = String(details.complaint || '').trim();
  const long = complaint.length > 280;
  const escrowLine = details.conductOnly
    ? 'The contract had already ended, so its payments are final. Staff decide on conduct only.'
    : closed
      ? 'The case is decided. Any payout is listed with the ruling.'
      : details.creditsInvolved
        ? 'On hold. Neither side can move these credits until staff decide.'
        : null;

  return (
    <dl className="divide-y divide-gray-100 dark:divide-white/5">
      <DetailRow label="Filed by">
        <PartyName party={details.disputer} accountId={accountId} />
      </DetailRow>
      <DetailRow label="Against">
        <PartyName party={details.disputee} accountId={accountId} />
      </DetailRow>
      {details.contract ? (
        <DetailRow label="Order">
          {details.contract.kind}
          {details.contract.title ? <> · “{details.contract.title}”</> : null}
          {details.contract.status ? (
            <span className="text-gray-500 dark:text-zinc-500"> · {details.contract.status}</span>
          ) : null}
        </DetailRow>
      ) : null}
      {details.contract?.rateCredits ? <DetailRow label="Contract value">{credits(details.contract.rateCredits)}</DetailRow> : null}
      {details.creditsInvolved || escrowLine ? (
        <DetailRow label="Credits involved">
          {details.creditsInvolved ? <span className="font-semibold">{credits(details.creditsInvolved)}</span> : null}
          {escrowLine ? (
            <span className="block text-gray-500 dark:text-zinc-500">{escrowLine}</span>
          ) : null}
        </DetailRow>
      ) : null}
      <DetailRow label="Filed">{details.filedAt ? formatStandingWhen(details.filedAt) : '—'}</DetailRow>
      <DetailRow label="Stage">
        {access?.stageLabel || '—'}
        <span className="text-gray-500 dark:text-zinc-500">
          {' '}
          · {access?.visibility ? 'Public: both parties and the community can follow it' : 'Private: only the filer and staff'}
        </span>
      </DetailRow>
      {details.outcome ? (
        <DetailRow label="Decision">
          <span className="font-semibold">{details.outcome.label}</span>
          {details.outcome.decidedAt ? (
            <span className="text-gray-500 dark:text-zinc-500"> · {formatStandingWhen(details.outcome.decidedAt)}</span>
          ) : null}
          {details.outcome.notes ? (
            <span className="mt-0.5 block whitespace-pre-wrap text-gray-600 dark:text-zinc-400">
              <MentionText text={details.outcome.notes} mentions={mentions} />
            </span>
          ) : null}
        </DetailRow>
      ) : null}
      {complaint ? (
        <DetailRow label="Complaint">
          {details.title ? <span className="block font-semibold">{details.title}</span> : null}
          <span className={`mt-0.5 block whitespace-pre-wrap text-gray-700 dark:text-zinc-300 ${long && !expanded ? 'line-clamp-4' : ''}`}>
            <MentionText text={complaint} mentions={mentions} />
          </span>
          {long ? (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="mt-1 text-[11px] font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              {expanded ? 'Show less' : 'Show the full complaint'}
            </button>
          ) : null}
        </DetailRow>
      ) : null}
    </dl>
  );
}

const EMPTY_THREAD: ThreadState = { loading: false, error: null, messages: [], access: null };

function stageTone(access?: CaseAccess | null) {
  if (!access) return 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-zinc-400';
  if (access.closed) return 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-zinc-400';
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

function DecisionNotice({ decision }: { decision: AppealDecision }) {
  if (!decision) return null;
  if (decision === 'accepted') {
    return (
      <div className="flex items-start gap-2 border-b border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Appeal accepted. The penalty ends within 24 hours, and this page updates when it does.</span>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2 border-b border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-800 dark:text-rose-200">
      <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        {decision === 'denied_permanent'
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
 * A member's tickets and disputes: the list, the thread, and the reply box. Used by the Cases
 * page (`/support/cases`) and the appeal page. Everything a member may do comes from the
 * server's `access`, so banned, locked, suspended and active members each see exactly what
 * the write paths will accept.
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
  // The case file starts open on the Cases page (room to spare) and folded on the appeal page.
  const [showDetails, setShowDetails] = useState(tall);
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
      setThread({
        loading: false,
        error: null,
        messages: data.messages || [],
        access: data.access || null,
        appealDecision,
        mentions: target.kind === 'dispute' ? data.mentions || {} : undefined,
        details: target.kind === 'dispute' ? data.details || null : undefined,
        ticket:
          target.kind === 'ticket'
            ? {
                number: data.ticket?.number ?? null,
                type: data.ticket?.type ?? null,
                priority: data.ticket?.priority ?? null,
                autoClosesAt: data.autoClosesAt ?? null,
                people: Array.isArray(data.participants)
                  ? data.participants.filter((person: { status?: string }) => person.status === 'active').length
                  : undefined,
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
  // The thread's own read is the freshest; the list row stands in while it loads.
  const access: CaseAccess | null = thread.access || selectedTicket?.access || selectedDispute?.access || null;
  const canCompose = Boolean(selection && access?.canReply && !thread.loading && !thread.error);
  const replyMax = selection?.kind === 'dispute' ? APPEAL_LIMITS.disputeReply : APPEAL_LIMITS.description;
  const viewerRole =
    access?.viewerRole === 'disputer' || access?.viewerRole === 'disputee' ? access.viewerRole : null;

  const messageById = useMemo(
    () => new Map(thread.messages.map((message) => [String(message.id), message])),
    [thread.messages]
  );

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
  const shownCount = thread.messages.length + visibleOutbox.length;
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || shownCount === lastCountRef.current) return;
    lastCountRef.current = shownCount;
    el.scrollTop = el.scrollHeight;
  }, [shownCount]);

  /**
   * Upload and save one outgoing message in the background. The bubble is already on screen;
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

  function messageIsOwn(message: ThreadMessage) {
    const sender = message.senderId || message.senderAccountId;
    if (sender && accountId) return String(sender) === accountId;
    return String(message.authorType || '').toLowerCase() === 'user';
  }

  function authorLabel(message: ThreadMessage, own: boolean) {
    if (own) return 'You';
    if (String(message.authorType || '').toLowerCase() === 'staff') return 'Staff';
    return message.authorName || 'Member';
  }

  function startReply(message: ThreadMessage) {
    setReplyTo(message);
    replyRef.current?.focus();
  }

  const threadTitle = selectedTicket
    ? selectedTicket.subject || selectedTicket.number || 'Ticket'
    : selectedDispute?.title || selectedDispute?.number || 'Dispute';
  const threadMeta = selectedTicket
    ? [
        thread.ticket?.number || selectedTicket.number ? `#${thread.ticket?.number || selectedTicket.number}` : 'Ticket',
        thread.ticket?.type || selectedTicket.type,
        thread.ticket?.priority || selectedTicket.priority ? `${thread.ticket?.priority || selectedTicket.priority} priority` : null,
        thread.ticket?.people && thread.ticket.people > 1 ? `${thread.ticket.people} people` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : [
        selectedDispute?.number || 'Dispute',
        viewerRole === 'disputer' ? 'You filed this' : viewerRole === 'disputee' ? 'You are named in it' : null,
        access?.visibility ? 'Public' : 'Private',
      ]
        .filter(Boolean)
        .join(' · ');

  const sortedTickets = useMemo(() => openFirst(tickets), [tickets]);
  const sortedDisputes = useMemo(() => openFirst(disputes), [disputes]);
  const heightClass = tall ? 'h-[calc(100vh-13rem)] min-h-[34rem]' : 'h-[34rem] lg:h-[38rem]';

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
          className={`${selection ? 'hidden lg:flex' : 'flex'} w-full shrink-0 flex-col border-gray-200 lg:w-80 lg:border-r dark:border-white/10`}
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
                      meta={[ticket.number ? `#${ticket.number}` : null, formatStandingWhen(ticket.lastMessageAt || ticket.updatedAt)]
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
              <p className="text-sm font-medium text-gray-700 dark:text-zinc-300">Pick a conversation</p>
              <p className="max-w-xs text-xs text-gray-500 dark:text-zinc-500">Open a ticket or dispute to read it and reply.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-dark-surface">
                <button
                  type="button"
                  onClick={() => onSelect(null)}
                  aria-label="Back to the list"
                  className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 lg:hidden dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{threadTitle}</p>
                  <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-zinc-500">{threadMeta}</p>
                </div>
                {access?.publicPath ? (
                  <button
                    type="button"
                    onClick={() => navigate(access.publicPath as string)}
                    className="hidden shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 sm:inline-flex dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5"
                  >
                    Public page <ExternalLink className="h-3 w-3" />
                  </button>
                ) : null}
                <StagePill access={access} fallback={selectedTicket?.status || selectedDispute?.status} />
              </div>

              {selectedTicket ? <DecisionNotice decision={thread.appealDecision ?? null} /> : null}
              {selectedDispute && thread.details ? (
                <div className="border-b border-gray-200 bg-white dark:border-white/10 dark:bg-dark-surface">
                  <button
                    type="button"
                    onClick={() => setShowDetails((open) => !open)}
                    aria-expanded={showDetails}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:text-zinc-200 dark:hover:bg-white/5"
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-zinc-500" />
                    <span className="flex-1">Case details</span>
                    {!showDetails && thread.details.creditsInvolved ? (
                      <span className="font-normal text-gray-500 dark:text-zinc-500">
                        {credits(thread.details.creditsInvolved)} involved
                      </span>
                    ) : null}
                    <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
                  </button>
                  {showDetails ? (
                    <div className="max-h-64 overflow-y-auto px-4 pb-3">
                      <DisputeDetailsPanel
                        details={thread.details}
                        access={access}
                        accountId={accountId}
                        mentions={thread.mentions}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
              {access?.attention && !access.closed ? (
                <div className="flex items-start gap-2 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-900 dark:text-amber-100">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{access.attention}</span>
                </div>
              ) : null}
              {selectedTicket && !access?.closed && thread.ticket?.autoClosesAt ? (
                <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-2 text-xs text-gray-500 dark:border-white/10 dark:bg-dark-surface dark:text-zinc-400">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  If nobody replies, this ticket closes on {formatStandingWhen(thread.ticket.autoClosesAt)}.
                </div>
              ) : null}

              <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
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
                    {thread.messages.length === 0 ? (
                      <p className="py-8 text-center text-sm text-gray-500 dark:text-zinc-500">
                        {access?.limited ? 'The discussion on this case stays private.' : 'No messages yet.'}
                      </p>
                    ) : null}
                    {thread.messages.map((message) => {
                      // Rulings, the filing summary and the "now public" invite: the same card as every other view.
                      if (selection.kind === 'dispute' && isDisputeDecision(message)) {
                        return (
                          <div key={message.id} className="my-3">
                            <DisputeDecisionCard
                              body={message.body}
                              when={formatStandingWhen(message.createdAt)}
                              mentions={thread.mentions}
                            >
                              <MessageAttachments attachments={message.attachments} own={false} />
                            </DisputeDecisionCard>
                          </div>
                        );
                      }
                      if (String(message.messageType || message.authorType || '').toLowerCase() === 'system') {
                        return (
                          <div key={message.id} className="my-3 flex justify-center">
                            <span className="max-w-[90%] rounded-full bg-white px-4 py-1.5 text-center text-xs text-gray-500 dark:bg-white/5 dark:text-zinc-400">
                              {message.body}
                            </span>
                          </div>
                        );
                      }
                      const own = messageIsOwn(message);
                      const parent = message.replyToId ? messageById.get(String(message.replyToId)) : undefined;
                      return (
                        <div key={message.id} className={`group my-2 flex ${own ? 'justify-end' : 'justify-start'}`}>
                          <div className="flex max-w-[85%] flex-col sm:max-w-[75%]">
                            <span className={`mb-1 flex flex-wrap items-center gap-1.5 px-1 text-[11px] font-medium text-gray-500 dark:text-zinc-500 ${own ? 'self-end' : 'self-start'}`}>
                              <span>
                                {authorLabel(message, own)} · {formatStandingWhen(message.createdAt)}
                              </span>
                              {selection.kind === 'dispute' ? (
                                <AudiencePill audience={message.audience} viewerRole={viewerRole} />
                              ) : null}
                              {canCompose && !message.isUnsent ? (
                                <button
                                  type="button"
                                  onClick={() => startReply(message)}
                                  className="inline-flex items-center gap-0.5 rounded px-1 text-gray-400 opacity-0 transition hover:text-gray-700 focus:opacity-100 group-hover:opacity-100 dark:hover:text-zinc-200"
                                >
                                  <CornerUpLeft className="h-3 w-3" /> Reply
                                </button>
                              ) : null}
                            </span>
                            {parent ? (
                              <span
                                className={`mb-1 block max-w-full truncate rounded-lg border-l-2 border-gray-300 bg-white/70 px-2.5 py-1 text-[11px] text-gray-500 dark:border-white/20 dark:bg-white/5 dark:text-zinc-400 ${own ? 'self-end' : 'self-start'}`}
                              >
                                {authorLabel(parent, messageIsOwn(parent))}: {quoteSnippet(parent.body) || 'Attachment'}
                              </span>
                            ) : null}
                            {message.isUnsent ? (
                              <div className={`rounded-2xl border border-dashed border-gray-200 px-4 py-2 text-xs italic text-gray-400 dark:border-white/10 dark:text-zinc-500 ${own ? 'self-end' : 'self-start'}`}>
                                This message was removed.
                              </div>
                            ) : message.body ? (
                              <div
                                className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm ${own ? 'self-end' : 'self-start'} ${
                                  own
                                    ? 'rounded-br-md bg-blue-600 text-white'
                                    : 'rounded-bl-md border border-gray-200 bg-white text-gray-900 dark:border-white/10 dark:bg-dark-elevated dark:text-zinc-100'
                                }`}
                              >
                                {selection.kind === 'dispute' ? (
                                  <MentionText text={message.body} mentions={thread.mentions} />
                                ) : (
                                  message.body
                                )}
                              </div>
                            ) : null}
                            {!message.isUnsent ? <MessageAttachments attachments={message.attachments} own={own} /> : null}
                          </div>
                        </div>
                      );
                    })}
                    {visibleOutbox.map((item) => {
                      const parent = item.replyToId ? messageById.get(item.replyToId) : undefined;
                      const failed = item.status === 'failed';
                      return (
                        <div key={item.localId} className="my-2 flex justify-end">
                          <div className="flex max-w-[85%] flex-col sm:max-w-[75%]">
                            {parent ? (
                              <span className="mb-1 block max-w-full self-end truncate rounded-lg border-l-2 border-gray-300 bg-white/70 px-2.5 py-1 text-[11px] text-gray-500 dark:border-white/20 dark:bg-white/5 dark:text-zinc-400">
                                {authorLabel(parent, messageIsOwn(parent))}: {quoteSnippet(parent.body) || 'Attachment'}
                              </span>
                            ) : null}
                            {item.body ? (
                              <div
                                className={`self-end whitespace-pre-wrap break-words rounded-2xl rounded-br-md px-4 py-2.5 text-sm text-white transition-opacity ${
                                  failed ? 'bg-rose-600/90' : 'bg-blue-600 opacity-75'
                                }`}
                              >
                                {item.body}
                              </div>
                            ) : null}
                            <SendingAttachments files={item.files} />
                            <span className="mt-1 flex items-center justify-end gap-2 px-1 text-[11px] text-gray-500 dark:text-zinc-500">
                              {failed ? (
                                <>
                                  <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
                                    <AlertCircle className="h-3 w-3" />
                                    {item.error || 'Not sent.'}
                                  </span>
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
                                </>
                              ) : (
                                <span className="inline-flex items-center gap-1">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  {item.files.length && !item.uploaded ? 'Uploading…' : 'Sending…'}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {!canCompose ? (
                <div className="flex flex-col items-center gap-2 border-t border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 dark:border-white/10 dark:bg-dark-surface dark:text-zinc-400">
                  {selectedTicket && access?.canRate ? (
                    <RateTicket
                      ticketId={selectedTicket.id}
                      onRated={() => {
                        void onRefreshLists().catch(() => undefined);
                        if (selectionRef.current) void loadThread(selectionRef.current, true);
                      }}
                    />
                  ) : null}
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
                    <p className="flex flex-wrap items-center gap-x-2 px-1 text-xs text-gray-500 dark:text-zinc-500">
                      <span>{access.replyHint}</span>
                      {access.publicPath ? (
                        <button
                          type="button"
                          onClick={() => navigate(access.publicPath as string)}
                          className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline dark:text-blue-400"
                        >
                          Public page <ExternalLink className="h-3 w-3" />
                        </button>
                      ) : null}
                    </p>
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
                    <AttachButton
                      onPick={replyFiles.add}
                      disabled={thread.loading}
                      count={replyFiles.files.length}
                    />
                    <textarea
                      ref={replyRef}
                      value={reply}
                      rows={1}
                      maxLength={replyMax}
                      disabled={thread.loading}
                      aria-label={selection.kind === 'dispute' ? 'Reply on this dispute' : 'Reply to staff'}
                      placeholder="Write a reply… (Shift + Enter for a new line)"
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
                          void sendReply();
                        }
                      }}
                      className="max-h-40 min-h-10 flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-white/10 dark:bg-dark-base dark:text-white dark:placeholder:text-zinc-600"
                    />
                    <button
                      type="button"
                      onClick={() => void sendReply()}
                      disabled={!reply.trim() && !replyFiles.files.length}
                      className="rounded-xl bg-blue-600 p-2.5 text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Send reply"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
