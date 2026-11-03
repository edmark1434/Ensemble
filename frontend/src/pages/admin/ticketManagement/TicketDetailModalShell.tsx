import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ClipboardList, Copy, CornerDownRight, FileText, Hand, Loader2, Lock, MessageSquare, Paperclip, Send, ShieldAlert, Trash2, UserMinus, UserPlus, UserRound, X } from 'lucide-react';
import api from '@/lib/axios';
import useGlobalState from '@/lib/global_state';
import { uploadFileWithIntent } from '@/lib/uploadFile';
import { chatAttachmentUrl } from '@/components/ui/inbox/inbox_functions/inbox_upload_image';
import socket from '@/lib/socket';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast.ts';
import type { TicketDetail, TicketMessage } from './ticketTypes';
import {
  ticketTypeOf,
  ESCALATE_ROLE_OPTIONS,
  escalateTypesForRole,
  TICKET_STATUS_OPTIONS,
  TICKET_PRIORITY_OPTIONS,
  TICKET_TYPE_GROUPS,
} from './ticketTypes';
import { formatEscalatedLabel } from './ticketFilterUtils';
import {
  BTN,
  BTN_BASE,
  ConfirmDialog,
  EmptyNote,
  FIELD,
  Fact,
  FieldLabel,
  PanelSection,
  Pill,
  SidebarSection,
  TabBar,
} from '@/pages/moderator/shared/staffCaseUi';

function apiErrorMessage(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback
  );
}

const MESSAGE_ACTION =
  'inline-flex items-center gap-1 text-[11px] text-zinc-500 transition hover:text-zinc-200 disabled:opacity-50';

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function submissionContextEntries(context?: TicketDetail['submissionContext']) {
  if (!context) return [];
  const submittedAt = context.submittedAt ? formatDateTime(context.submittedAt) : '';
  return [
    ['Member ID', context.accountId],
    ['Username', context.username],
    ['Email', context.email],
    ['Plan', context.plan],
    ['Submitted at', submittedAt === '—' ? '' : submittedAt],
    ['Browser', context.browser],
    ['Device', context.device],
    ['Page they came from', context.page],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
}

function CopyableId({ value }: { value: string | number | null | undefined }) {
  if (value == null || value === '') return <>—</>;
  const text = String(value);
  return (
    <span className="flex items-start gap-2">
      <span className="min-w-0 flex-1 select-all break-all">{text}</span>
      <button
        type="button"
        onClick={() =>
          void navigator.clipboard.writeText(text).then(
            () => showSuccessToast('Copied to clipboard'),
            () => showErrorToast('Could not copy')
          )
        }
        className="shrink-0 rounded p-0.5 text-zinc-500 transition hover:bg-white/5 hover:text-white"
        aria-label="Copy"
        title="Copy"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

function titleCaseLabel(value: string | null | undefined) {
  const raw = String(value || '')
    .replace(/[_-]+/g, ' ')
    .trim();
  if (!raw) return 'Unknown';
  return raw
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function initials(name: string) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function messageKind(m: TicketMessage): 'internal' | 'staff' | 'user' {
  if (m.isInternal) return 'internal';
  const t = String(m.authorType || '').toLowerCase();
  if (t === 'staff' || t === 'admin' || t === 'moderator') return 'staff';
  return 'user';
}

function fromSocketMessage(raw: {
  _id?: string;
  id?: string;
  sender_id?: string;
  senderId?: string;
  message_type?: string;
  messageType?: string;
  is_deleted?: boolean;
  deleted_at?: string | null;
  is_unsent?: boolean;
  isUnsent?: boolean;
  author_type?: string;
  authorType?: string;
  is_internal?: boolean;
  isInternal?: boolean;
  author_name?: string;
  authorName?: string;
  message_content?: string;
  body?: string;
  attachments?: TicketMessage['attachments'];
  message_id_reply?: string | null;
  replyToId?: string | null;
  created_at?: string;
  createdAt?: string;
} | null): TicketMessage | null {
  if (!raw) return null;
  const id = raw._id || raw.id;
  if (!id) return null;
  const messageType = String(raw.message_type || raw.messageType || 'text').toLowerCase();
  return {
    id: String(id),
    senderId: raw.sender_id || raw.senderId ? String(raw.sender_id || raw.senderId) : null,
    authorType: messageType === 'system'
      ? 'system'
      : String(raw.author_type || raw.authorType || (raw.is_internal ? 'staff' : 'user')),
    authorName: String(raw.author_name || raw.authorName || 'Unknown'),
    body: String(raw.message_content || raw.body || ''),
    attachments: Array.isArray(raw.attachments) ? raw.attachments : [],
    isInternal: Boolean(raw.is_internal || raw.isInternal),
    isUnsent: Boolean(raw.is_deleted || raw.deleted_at || raw.is_unsent || raw.isUnsent),
    messageType,
    replyToId: raw.message_id_reply || raw.replyToId ? String(raw.message_id_reply || raw.replyToId) : null,
    createdAt: String(raw.created_at || raw.createdAt || new Date().toISOString()),
  };
}

function attachmentKind(file: { attachment_type?: string; attachment_name?: string }) {
  const hint = `${file.attachment_type || ''} ${file.attachment_name || ''}`.toLowerCase();
  if (hint.includes('video') || /\.(mp4|webm|mov|m4v)\b/.test(hint)) return 'video';
  if (hint.includes('image') || /\.(png|jpe?g|gif|webp|bmp|svg)\b/.test(hint)) return 'image';
  return 'file';
}

function MessageBubble({
  message,
  accentSoft,
  own,
  busy,
  replyQuote,
  onReply,
  onJumpToReply,
  onDelete,
  onToggleInternal,
}: {
  message: TicketMessage;
  accentSoft: string;
  own: boolean;
  busy: boolean;
  replyQuote: { id: string; author: string; body: string } | null;
  onReply?: () => void;
  onJumpToReply: (messageId: string) => void;
  onDelete: () => Promise<void>;
  onToggleInternal: (isInternal: boolean) => Promise<unknown>;
}) {
  const kind = messageKind(message);
  const isStaffSide = kind === 'staff' || kind === 'internal';
  const displayName = titleCaseLabel(message.authorName);
  const roleLabel = message.isUnsent
    ? 'Deleted'
    : kind === 'internal'
      ? 'Internal Note'
      : kind === 'staff'
        ? 'Staff'
        : 'Requester';

  const shell = message.isUnsent
    ? 'border-red-500/60 bg-red-500/15'
    : kind === 'internal'
      ? 'border-amber-500/30 bg-amber-500/[0.08]'
      : kind === 'staff'
        ? `border-white/10 ${accentSoft}`
        : 'border-white/10 bg-[#14151c]';

  const avatar = message.isUnsent
    ? 'bg-red-500/25 text-red-100 ring-red-500/40'
    : kind === 'internal'
      ? 'bg-amber-500/20 text-amber-200 ring-amber-500/30'
      : kind === 'staff'
        ? 'bg-white/10 text-white ring-white/15'
        : 'bg-sky-500/15 text-sky-200 ring-sky-500/25';

  const tag = message.isUnsent
    ? 'border-red-400/50 bg-red-500/25 text-red-50'
    : kind === 'internal'
      ? 'border-amber-400/40 bg-amber-500/20 text-amber-100'
      : kind === 'staff'
        ? 'border-white/20 bg-white/10 text-zinc-100'
        : 'border-sky-400/30 bg-sky-500/15 text-sky-100';
  const [confirmDelete, setConfirmDelete] = useState(false);
  const staffReply = kind === 'staff' || kind === 'internal';

  return (
    <div data-message-id={String(message.id)} className={`flex gap-2.5 ${isStaffSide ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ring-1 ${avatar}`}
        title={displayName}
      >
        {kind === 'internal' ? <Lock className="h-3.5 w-3.5" /> : initials(displayName)}
      </div>

      <div className={`min-w-0 max-w-[min(85%,420px)] flex-1 ${isStaffSide ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={`mb-1.5 flex flex-wrap items-center gap-1.5 ${isStaffSide ? 'justify-end' : 'justify-start'}`}>
          <span className="text-xs font-semibold text-zinc-200">{displayName}</span>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${tag}`}>
            {kind === 'user' ? <UserRound className="h-2.5 w-2.5" /> : null}
            {kind === 'internal' ? <Lock className="h-2.5 w-2.5" /> : null}
            {roleLabel}
          </span>
          <span className="text-[10px] text-zinc-600">{formatDateTime(message.createdAt)}</span>
          {message.isEdited ? <span className="text-[10px] text-zinc-500">edited</span> : null}
        </div>

        <div className={`w-full rounded-2xl border px-3.5 py-2.5 shadow-sm ${shell} ${isStaffSide ? 'rounded-tr-md' : 'rounded-tl-md'}`}>
          {replyQuote && (
            <button
              type="button"
              onClick={() => onJumpToReply(replyQuote.id)}
              className="mb-2 flex w-full items-start gap-1.5 rounded-lg border-l-2 border-sky-400 bg-black/25 px-2.5 py-1.5 text-left"
            >
              <CornerDownRight className="mt-0.5 h-3 w-3 shrink-0 text-sky-300" />
              <span className="min-w-0">
                <span className="block text-[10px] font-semibold text-sky-200">{replyQuote.author}</span>
                <span className="block truncate text-[11px] text-zinc-300">{replyQuote.body}</span>
              </span>
            </button>
          )}
          {kind === 'internal' && (
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-amber-200/80">
              Visible to staff only
            </p>
          )}
          {message.isUnsent && (
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-red-200">
              Deleted message
            </p>
          )}
          {message.body ? (
            <p className={`whitespace-pre-wrap text-sm leading-relaxed ${message.isUnsent ? 'text-red-50' : 'text-zinc-100'}`}>{message.body}</p>
          ) : null}
          {(message.attachments || []).length > 0 && (
            <div className={`flex flex-col gap-1.5 ${message.body ? 'mt-2' : ''}`}>
              {message.attachments!.map((file) => {
                const src = chatAttachmentUrl(file.attachment_key || file.attachment_url || '');
                const kindOfFile = attachmentKind(file);
                const name = file.attachment_name || 'Attachment';
                if (kindOfFile === 'image') {
                  return (
                    <a key={file.attachment_id || src} href={src} target="_blank" rel="noreferrer" className="block w-fit">
                      <img src={src} alt="" className="max-h-40 rounded-lg object-cover" />
                    </a>
                  );
                }
                if (kindOfFile === 'video') {
                  return <video key={file.attachment_id || src} src={src} controls className="max-h-40 rounded-lg" />;
                }
                return (
                  <a
                    key={file.attachment_id || src}
                    href={src}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-xs text-zinc-100"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-sky-300" />
                    <span className="truncate">{name}</span>
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {!message.isUnsent && onReply && (
          <div className={`mt-1 flex flex-wrap items-center gap-3 px-1 ${isStaffSide ? 'justify-end' : 'justify-start'}`}>
            <button
              type="button"
              disabled={busy}
              onClick={onReply}
              className={MESSAGE_ACTION}
            >
              <CornerDownRight className="h-3 w-3" />
              Reply
            </button>
            {staffReply && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void onToggleInternal(!message.isInternal)}
                className={MESSAGE_ACTION}
              >
                <Lock className="h-3 w-3" />
                {message.isInternal ? 'Show to member' : 'Make internal'}
              </button>
            )}
            {own && !confirmDelete && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmDelete(true)}
                className={MESSAGE_ACTION}
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            )}
            {own && confirmDelete && (
              <span className="inline-flex items-center gap-2 text-[11px]">
                <span className="text-zinc-400">Delete this reply?</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onDelete()}
                  className="font-medium text-red-300 hover:text-red-200 disabled:opacity-50"
                >
                  Delete
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmDelete(false)}
                  className="text-zinc-500 hover:text-zinc-300"
                >
                  Cancel
                </button>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const ACCENT: Record<string, { text: string; spin: string; btn: string; soft: string }> = {
  rose: {
    text: 'text-rose-400',
    spin: 'text-rose-400',
    btn: 'bg-rose-500/90 hover:bg-rose-500',
    soft: 'bg-rose-500/10 text-rose-50 border-rose-500/25',
  },
  sky: {
    text: 'text-sky-400',
    spin: 'text-sky-400',
    btn: 'bg-sky-500/90 hover:bg-sky-500',
    soft: 'bg-sky-500/10 text-sky-50 border-sky-500/25',
  },
  violet: {
    text: 'text-violet-400',
    spin: 'text-violet-400',
    btn: 'bg-violet-500/90 hover:bg-violet-500',
    soft: 'bg-violet-500/10 text-violet-50 border-violet-500/25',
  },
  emerald: {
    text: 'text-emerald-400',
    spin: 'text-emerald-400',
    btn: 'bg-emerald-500/90 hover:bg-emerald-500',
    soft: 'bg-emerald-500/10 text-emerald-50 border-emerald-500/25',
  },
};

function priorityPillClass(priority: string | null | undefined) {
  const p = String(priority || '').toLowerCase();
  if (p === 'urgent' || p === 'high') return 'border-red-500/30 bg-red-500/10 text-red-200';
  if (p === 'medium') return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  return 'border-white/10 bg-white/5 text-zinc-300';
}

function PersonRow({
  name,
  detail,
  tag,
  tagClass,
  action,
}: {
  name: string;
  detail?: string;
  tag?: string;
  tagClass?: string;
  action?: ReactNode;
}) {
  return (
    <li className="flex items-center gap-2.5 py-1.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[10px] font-semibold text-zinc-300">
        {initials(name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-xs font-medium text-white">{name}</span>
          {tag ? (
            <span className={`shrink-0 rounded-full border px-1.5 py-px text-[9px] font-medium uppercase tracking-wide ${tagClass || 'border-white/10 text-zinc-400'}`}>
              {tag}
            </span>
          ) : null}
        </span>
        {detail ? <span className="block truncate text-[11px] text-zinc-500">{detail}</span> : null}
      </span>
      {action}
    </li>
  );
}

function CloseTimer({ closesAt, scheduled = false }: { closesAt?: string | null; scheduled?: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!closesAt) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, [closesAt]);
  if (!closesAt) return null;
  const remaining = new Date(closesAt).getTime() - now;
  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const label = remaining <= 0
    ? scheduled ? 'Scheduled close is due now' : 'Due to close automatically now'
    : scheduled
      ? `Closes in ${hours}h ${minutes}m`
      : `Closes automatically in ${Math.floor(remaining / 86400000)}d ${hours % 24}h if nobody replies`;
  return <p className="text-[11px] text-amber-200/80">{label}</p>;
}

function statusButtonClass(label: string, active: boolean) {
  const s = label.toLowerCase().replace(/_/g, ' ');
  if (!active) {
    return 'border-white/10 bg-transparent text-zinc-400 hover:border-white/20 hover:bg-white/[0.04] hover:text-zinc-200';
  }
  if (s === 'open') return 'border-rose-500/40 bg-rose-500/20 text-rose-200';
  if (s === 'in progress') return 'border-amber-500/40 bg-amber-500/20 text-amber-200';
  if (s === 'closed') return 'border-zinc-500/40 bg-zinc-500/25 text-zinc-200';
  return 'border-white/25 bg-white/10 text-white';
}

/**
 * Shared ticket detail shell — left meta / right conversation.
 * Used by admin and all moderator desks.
 */
export default function TicketDetailModalShell({
  ticketId,
  endpointBase,
  accent = 'rose',
  allowEscalate = true,
  allowEscalateToAdmin = true,
  statusControl = 'buttons',
  onClose,
  onUpdated,
}: {
  ticketId: number | string;
  endpointBase: string;
  accent?: keyof typeof ACCENT;
  allowEscalate?: boolean;
  /** Moderators can hand off to Admin; Admin desk hides this (already Admin). */
  allowEscalateToAdmin?: boolean;
  /** `buttons` = segmented status pills (default); `select` = dropdown. */
  statusControl?: 'select' | 'buttons';
  onClose: () => void;
  onUpdated: () => void;
}) {
  const tone = ACCENT[accent] || ACCENT.rose;
  const viewerAccountId = useGlobalState((state) => state.user?.account_id ?? state.user?.accountId ?? null);
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reply, setReply] = useState('');
  const [screenshots, setScreenshots] = useState<{ key: string; name: string; type: 'image' | 'video' }[]>([]);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditNote, setCreditNote] = useState('');
  const [internalNote, setInternalNote] = useState(false);
  const [replyTarget, setReplyTarget] = useState<TicketMessage | null>(null);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [currentType, setCurrentType] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [escalateRole, setEscalateRole] = useState<string>('Support Moderator');
  const [escalateType, setEscalateType] = useState<string>('');
  const [confirmEscalate, setConfirmEscalate] = useState(false);
  const [confirmEscalateAdmin, setConfirmEscalateAdmin] = useState(false);
  const [personQuery, setPersonQuery] = useState('');
  const [personResults, setPersonResults] = useState<{
    accountId: string;
    name: string;
    handle: string;
    email: string;
    kind: 'user' | 'staff';
    role: string;
  }[]>([]);
  const [searchingPeople, setSearchingPeople] = useState(false);
  const [personBusy, setPersonBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<{ accountId: string; name: string } | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [savingTranscript, setSavingTranscript] = useState(false);
  const [confirmSchedule, setConfirmSchedule] = useState(false);
  const [scheduleChoice, setScheduleChoice] = useState('24');
  const [customCloseAt, setCustomCloseAt] = useState('');
  const [schedulingClose, setSchedulingClose] = useState(false);
  const [appealChoice, setAppealChoice] = useState<'accept' | 'deny' | 'deny_permanent' | null>(null);
  const [decidingAppeal, setDecidingAppeal] = useState(false);
  const [confirmPerson, setConfirmPerson] = useState<{
    accountId: string;
    name: string;
    handle: string;
    email: string;
    kind: 'user' | 'staff';
    role: string;
  } | null>(null);
  const [tab, setTab] = useState<'conversation' | 'details'>('conversation');
  const threadEndRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  const isAdminQueue = (role: string) => {
    const r = String(role || '').toLowerCase();
    return r === 'admin' || r === 'administrator';
  };

  const escalateRoles = (detail?.escalateRoles?.length
    ? detail.escalateRoles
    : [...ESCALATE_ROLE_OPTIONS]
  ).filter((r) => !isAdminQueue(r));

  const escalateTypeOptions = useMemo(() => {
    const fromApi = detail?.escalateByRole?.[escalateRole];
    if (fromApi?.length) return fromApi;
    return escalateTypesForRole(escalateRole);
  }, [detail, escalateRole]);

  const statusOptions = (detail?.statuses?.length ? detail.statuses : [...TICKET_STATUS_OPTIONS])
    .filter((label) => label === 'Open' || label === 'In Progress' || label === 'Closed');
  const priorityOptions = detail?.priorities?.length ? detail.priorities : [...TICKET_PRIORITY_OPTIONS];
  const perms = detail?.permissions;
  const myStaffId = perms?.staffId != null ? String(perms.staffId) : '';
  const ticketAssigneeId =
    detail?.ticket?.assignee?.staffId != null ? String(detail.ticket.assignee.staffId) : '';
  const alreadyAssignedToMe = Boolean(
    perms?.isAssignee ||
      (myStaffId && ticketAssigneeId && myStaffId.toLowerCase() === ticketAssigneeId.toLowerCase())
  );
  const ticketClosed = ['Closed', 'Resolved'].includes(String(detail?.ticket?.status || ''));
  const canReply = !ticketClosed && Boolean(perms?.canReply ?? alreadyAssignedToMe);
  const canAssignMyself = !ticketClosed && Boolean(
    !alreadyAssignedToMe &&
      (perms?.canAssignMyself || perms?.canSelfAssign)
  );
  const canRelease = Boolean(alreadyAssignedToMe || perms?.canRelease || perms?.isAssignee);
  const canEscalate = Boolean(perms?.canEscalate || alreadyAssignedToMe || perms?.isAdmin);
  const isAdmin = Boolean(perms?.isAdmin);
  /** Locked for non-admins once someone is assigned; Admin may reassign anytime */
  const assigneeLocked = ticketClosed || (Boolean(ticketAssigneeId) && !Boolean(perms?.canAssignOthers || isAdmin));

  const syncEscalateType = (role: string, preferred?: string) => {
    const opts =
      detail?.escalateByRole?.[role]?.length
        ? detail.escalateByRole[role]
        : escalateTypesForRole(role);
    if (!opts.length) {
      setEscalateType('');
      return;
    }
    if (preferred && opts.includes(preferred)) {
      setEscalateType(preferred);
      return;
    }
    setEscalateType(opts[0]);
  };

  const applyLoadedTicket = (data: TicketDetail, resetFields: boolean) => {
    setDetail(data);
    if (!resetFields) return;
    setStatus(data.ticket.status);
    setPriority(data.ticket.priority);
    const t = ticketTypeOf(data.ticket);
    setCurrentType(t);
    setAssigneeId(data.ticket.assignee?.staffId?.toString() || '');
    const ownerRole =
      data.typeDetails?.find((d) => d.label === t)?.queueRole ||
      Object.entries(data.escalateByRole || {}).find(([, types]) => types.includes(t))?.[0] ||
      'Support Moderator';
    const modRole = isAdminQueue(ownerRole) ? 'Support Moderator' : ownerRole;
    setEscalateRole(modRole);
    const opts = data.escalateByRole?.[modRole] || escalateTypesForRole(modRole);
    setEscalateType(opts.includes(t) ? t : opts[0] || '');
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`${endpointBase}/${ticketId}`);
      if (res.data?.success) applyLoadedTicket(res.data.data as TicketDetail, true);
    } catch {
      showErrorToast('Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  const refreshThread = async () => {
    try {
      const res = await api.get(`${endpointBase}/${ticketId}`);
      if (res.data?.success) applyLoadedTicket(res.data.data as TicketDetail, false);
    } catch {
      // Keep the open ticket in place if a background refresh fails.
    }
  };

  const placeMessage = (message: TicketMessage, pendingId?: string) => {
    setDetail((current) => {
      if (!current) return current;
      const withoutPending = current.messages.filter(
        (item) => String(item.id) !== String(pendingId || '') && String(item.id) !== String(message.id)
      );
      return { ...current, messages: [...withoutPending, message] };
    });
  };

  const dropMessage = (messageId: string) => {
    setDetail((current) => {
      if (!current) return current;
      return { ...current, messages: current.messages.filter((item) => String(item.id) !== String(messageId)) };
    });
  };

  useEffect(() => {
    setTab('conversation');
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId, endpointBase]);

  useEffect(() => {
    const query = personQuery.replace(/^@/, '').trim();
    if (!detail?.canManageParticipants || query.length < 2) {
      setPersonResults([]);
      setSearchingPeople(false);
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearchingPeople(true);
      try {
        const response = await api.get('/api/staff/tickets/people', {
          params: { q: query },
          signal: controller.signal,
        });
        const results = (response.data?.data || []).map((account: {
          accountId: string;
          name?: string;
          handle?: string | null;
          email?: string | null;
          kind?: 'user' | 'staff';
          role?: string;
        }) => ({
          accountId: String(account.accountId),
          name: account.name || account.handle || 'Unknown',
          handle: account.handle ? `@${account.handle}` : '',
          email: account.email || '',
          kind: account.kind === 'staff' ? 'staff' as const : 'user' as const,
          role: account.role || (account.kind === 'staff' ? 'Staff' : 'User'),
        }));
        setPersonResults(results);
      } catch (err: unknown) {
        if ((err as { code?: string; name?: string })?.code === 'ERR_CANCELED' || (err as { name?: string })?.name === 'CanceledError') return;
        setPersonResults([]);
      } finally {
        if (!controller.signal.aborted) setSearchingPeople(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [personQuery, detail?.canManageParticipants]);

  const changeParticipant = async (accountId: string, action: 'add' | 'remove') => {
    setPersonBusy(true);
    try {
      const response = action === 'add'
        ? await api.post(`/api/staff/tickets/${ticketId}/participants`, { accountId })
        : await api.delete(`/api/staff/tickets/${ticketId}/participants/${accountId}`);
      if (response.data?.data) setDetail(response.data.data as TicketDetail);
      setPersonQuery('');
      setPersonResults([]);
      setConfirmPerson(null);
      setConfirmRemove(null);
      showSuccessToast(response.data?.message || (action === 'add' ? 'User added to the ticket' : 'User removed from the ticket'));
      onUpdated();
    } catch (err: unknown) {
      showErrorToast(apiErrorMessage(err, action === 'add' ? 'Failed to add user' : 'Failed to remove user'));
    } finally {
      setPersonBusy(false);
    }
  };

  useEffect(() => {
    const chatId = detail?.chatId;
    if (!chatId) return;

    const appendLiveMessage = (
      message: NonNullable<Parameters<typeof fromSocketMessage>[0]> & { conversation_id?: string }
    ) => {
      if (String(message?.conversation_id || '') !== String(chatId)) return;
      const mapped = fromSocketMessage(message);
      if (mapped) placeMessage(mapped);
    };
    const refreshPeople = (payload: { conversation_id?: string; account_id?: string; status?: string }) => {
      if (payload?.conversation_id && String(payload.conversation_id) !== String(chatId)) return;
      const accountId = String(payload?.account_id || '');
      if (accountId) {
        setDetail((current) => {
          if (!current) return current;
          const invited = (current.pendingInvites || []).find((person) => person.accountId === accountId);
          const pendingInvites = (current.pendingInvites || []).filter((person) => person.accountId !== accountId);
          const alreadyThere = (current.participants || []).some((person) => person.accountId === accountId);
          const participants = payload.status === 'active' && invited && !alreadyThere
            ? [...(current.participants || []), {
                accountId,
                name: invited.name,
                handle: invited.handle,
                role: 'User',
                status: 'active',
                isRequester: false,
                isStaff: false,
                replyCount: 0,
              }]
            : current.participants;
          return { ...current, pendingInvites, participants };
        });
      }
      void refreshThread();
    };
    const markDeleted = (payload: { message_id?: string; messageId?: string; conversation_id?: string }) => {
      if (payload?.conversation_id && String(payload.conversation_id) !== String(chatId)) return;
      const messageId = payload?.message_id || payload?.messageId;
      if (!messageId) return;
      setDetail((current) => {
        if (!current) return current;
        return {
          ...current,
          messages: current.messages.map((item) =>
            String(item.id) === String(messageId) ? { ...item, isUnsent: true } : item
          ),
        };
      });
    };
    const joinTicketRoom = () => {
      socket.emit('joinRoom', { conversation_id: String(chatId) });
    };

    if (!socket.connected) socket.connect();
    joinTicketRoom();
    socket.on('connect', joinTicketRoom);
    socket.on('newMessage', appendLiveMessage);
    socket.on('messageReplied', appendLiveMessage);
    socket.on('ticketInternalMessage', appendLiveMessage);
    socket.on('messageDeleted', markDeleted);
    socket.on('ticketMembershipUpdated', refreshPeople);

    return () => {
      socket.off('connect', joinTicketRoom);
      socket.off('newMessage', appendLiveMessage);
      socket.off('messageReplied', appendLiveMessage);
      socket.off('ticketInternalMessage', appendLiveMessage);
      socket.off('messageDeleted', markDeleted);
      socket.off('ticketMembershipUpdated', refreshPeople);
      socket.emit('leaveRoom', { conversation_id: String(chatId) });
    };
    // The room changes only when another ticket is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.chatId, ticketId, endpointBase]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [detail?.messages?.length, tab]);

  const onEscalateRoleChange = (role: string) => {
    setEscalateRole(role);
    syncEscalateType(role, currentType);
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        status,
        priority,
      };
      // Only set handler while unlocked (or Admin override via canAssignOthers).
      if (!assigneeLocked || perms?.canAssignOthers || perms?.isAdmin) {
        payload.handled_by_staff_id = assigneeId ? assigneeId : null;
      }
      await api.patch(`${endpointBase}/${ticketId}`, payload);
      showSuccessToast('Ticket updated');
      await load();
      onUpdated();
    } catch (err: unknown) {
      showErrorToast(apiErrorMessage(err, 'Failed to update ticket'));
    } finally {
      setSaving(false);
    }
  };

  const assignMyself = async () => {
    setSaving(true);
    try {
      await api.patch(`${endpointBase}/${ticketId}`, { action: 'self_assign' });
      showSuccessToast('You are now assigned');
      await load();
      onUpdated();
    } catch (err: unknown) {
      showErrorToast(apiErrorMessage(err, 'Failed to assign yourself'));
    } finally {
      setSaving(false);
    }
  };

  const releaseCase = async () => {
    setSaving(true);
    try {
      await api.patch(`${endpointBase}/${ticketId}`, { action: 'release' });
      showSuccessToast('Case released — another moderator can claim it');
      await load();
      onUpdated();
    } catch (err: unknown) {
      showErrorToast(apiErrorMessage(err, 'Failed to release case'));
    } finally {
      setSaving(false);
    }
  };

  const escalateTo = async (role: string, type: string, closeAfter = false) => {
    if (!type.trim()) {
      showErrorToast('Pick a ticket type allowed for this queue');
      return;
    }
    const allowed =
      detail?.escalateByRole?.[role]?.length
        ? detail.escalateByRole[role]
        : escalateTypesForRole(role);
    if (!allowed.includes(type)) {
      showErrorToast('Pick a ticket type allowed for this queue');
      return;
    }
    setConfirmEscalate(false);
    setConfirmEscalateAdmin(false);
    setSaving(true);
    try {
      await api.patch(`${endpointBase}/${ticketId}`, {
        status: 'Open',
        assigned_role: role,
        type,
        handled_by_staff_id: null,
      });
      showSuccessToast(`Moved to ${role} as ${type}`);
      onUpdated();
      if (closeAfter) {
        onClose();
        return;
      }
      await load();
    } catch (err: unknown) {
      showErrorToast(apiErrorMessage(err, 'Failed to escalate ticket'));
    } finally {
      setSaving(false);
    }
  };

  const escalateToAdmin = async () => {
    const adminTypes =
      detail?.escalateByRole?.Admin ||
      detail?.escalateByRole?.Administrator ||
      escalateTypesForRole('Admin');
    const type = adminTypes.includes(currentType) ? currentType : adminTypes[0] || currentType;
    await escalateTo('Admin', type, true);
  };

  const uploadScreenshots = async (list: FileList | null) => {
    if (!list?.length) return;
    setSaving(true);
    try {
      const next = [...screenshots];
      for (const file of Array.from(list).slice(0, 4 - next.length)) {
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        if (!isImage && !isVideo) continue;
        const uploaded = await uploadFileWithIntent(file, 'ticket-attachments');
        next.push({
          key: uploaded.key,
          name: file.name,
          type: isVideo ? 'video' : 'image',
        });
      }
      setScreenshots(next.slice(0, 4));
    } catch (err: unknown) {
      showErrorToast(apiErrorMessage(err, 'Failed to upload screenshot'));
    } finally {
      setSaving(false);
    }
  };

  const applyCreditChange = async () => {
    const amount = Number(creditAmount);
    if (!Number.isFinite(amount) || amount === 0) {
      showErrorToast('Enter a non-zero credit amount');
      return;
    }
    setSaving(true);
    try {
      await api.post(`${endpointBase}/${ticketId}/credit-adjustment`, {
        amount,
        note: creditNote.trim(),
      });
      setCreditAmount('');
      setCreditNote('');
      showSuccessToast('Credit change recorded on the ticket');
      await refreshThread();
      onUpdated();
    } catch (err: unknown) {
      showErrorToast(apiErrorMessage(err, 'Failed to record credit change'));
    } finally {
      setSaving(false);
    }
  };

  const quoteFor = (replyToId?: string | null) => {
    if (!replyToId) return null;
    const parent = detail?.messages.find((item) => String(item.id) === String(replyToId));
    if (!parent) return { id: String(replyToId), author: 'Message', body: 'Original message unavailable' };
    return {
      id: String(parent.id),
      author: parent.authorName || 'Message',
      body: parent.body || (parent.attachments?.length ? 'Attachment' : 'Message'),
    };
  };

  const jumpToMessage = (messageId: string) => {
    const target = threadRef.current?.querySelector<HTMLElement>(`[data-message-id="${messageId}"]`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const toDatetimeLocal = (date: Date) => {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const chosenCloseIso = () => {
    if (scheduleChoice === 'custom') {
      const parsed = new Date(customCloseAt);
      return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
    }
    const hours = Number(scheduleChoice);
    if (!Number.isFinite(hours) || hours <= 0) return null;
    return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  };

  const openSchedule = () => {
    const existing = detail?.scheduledCloseAt ? new Date(detail.scheduledCloseAt) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    setCustomCloseAt(toDatetimeLocal(existing));
    setScheduleChoice(detail?.scheduledCloseAt ? 'custom' : '24');
    setConfirmSchedule(true);
  };

  const scheduleClose = async (cancel = false) => {
    const closesAt = cancel ? null : chosenCloseIso();
    if (!cancel && !closesAt) {
      showErrorToast('Choose when this ticket should close');
      return;
    }
    setSchedulingClose(true);
    try {
      const response = cancel
        ? await api.delete(`/api/staff/tickets/${ticketId}/schedule-close`)
        : await api.post(`/api/staff/tickets/${ticketId}/schedule-close`, { closesAt });
      setDetail(response.data?.data || null);
      setConfirmSchedule(false);
      const savedAt = response.data?.data?.scheduledCloseAt;
      showSuccessToast(cancel ? 'Scheduled close cancelled' : `Closes ${formatDateTime(savedAt)}`);
      onUpdated();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showErrorToast(message || 'Could not update the scheduled close');
    } finally {
      setSchedulingClose(false);
    }
  };

  const decideAppeal = async () => {
    if (!appealChoice) return;
    setDecidingAppeal(true);
    try {
      const response = await api.post(`/api/staff/tickets/${ticketId}/appeal-decision`, { decision: appealChoice });
      if (response.data?.data) setDetail(response.data.data as TicketDetail);
      setAppealChoice(null);
      showSuccessToast(response.data?.message || 'Appeal decision saved');
      onUpdated();
    } catch (err: unknown) {
      showErrorToast(apiErrorMessage(err, 'Failed to decide this appeal'));
    } finally {
      setDecidingAppeal(false);
    }
  };

  const saveTranscript = async () => {
    setSavingTranscript(true);
    try {
      const response = await api.post(`/api/staff/tickets/${ticketId}/transcript`);
      if (response.data?.data) setDetail(response.data.data as TicketDetail);
      showSuccessToast('Transcript is ready in this window');
    } catch (err: unknown) {
      showErrorToast(apiErrorMessage(err, 'Failed to generate transcript'));
    } finally {
      setSavingTranscript(false);
    }
  };

  const sendReply = async () => {
    if (!canReply) return;
    const text = reply.trim();
    const files = screenshots;
    const target = replyTarget;
    if (!text && files.length === 0) return;
    const pendingId = `pending-${Date.now()}`;
    placeMessage({
      id: pendingId,
      senderId: viewerAccountId ? String(viewerAccountId) : null,
      authorType: internalNote ? 'staff' : 'staff',
      authorName: 'You',
      body: text,
      attachments: files.map((file) => ({
        attachment_key: file.key,
        attachment_name: file.name,
        attachment_type: file.type,
      })),
      isInternal: internalNote,
      replyToId: target ? String(target.id) : null,
      createdAt: new Date().toISOString(),
    });
    setReply('');
    setScreenshots([]);
    setReplyTarget(null);
    try {
      const res = await api.post(`${endpointBase}/${ticketId}/messages`, {
        body: text,
        isInternal: internalNote,
        replyToMessageId: target ? String(target.id) : null,
        attachments: files.map((file) => ({ key: file.key, name: file.name, type: file.type })),
      });
      const saved = fromSocketMessage(res.data?.data) || (res.data?.data as TicketMessage | undefined);
      if (saved?.id) placeMessage(saved, pendingId);
      else dropMessage(pendingId);
    } catch (err: unknown) {
      dropMessage(pendingId);
      setReply(text);
      setScreenshots(files);
      setReplyTarget(target);
      showErrorToast(apiErrorMessage(err, 'Failed to send message'));
    }
  };

  const changeMessage = async (messageId: string | number, patch: { body?: string; isInternal?: boolean }) => {
    setSaving(true);
    try {
      const res = await api.patch(`${endpointBase}/${ticketId}/messages/${messageId}`, patch);
      if (res.data?.data) applyLoadedTicket(res.data.data as TicketDetail, false);
      showSuccessToast(patch.isInternal === true ? 'Marked as an internal note' : patch.isInternal === false ? 'Reply is visible to the member' : 'Reply updated');
      onUpdated();
      return true;
    } catch (err: unknown) {
      showErrorToast(apiErrorMessage(err, 'Failed to update reply'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const removeMessage = async (messageId: string | number) => {
    setSaving(true);
    try {
      const res = await api.delete(`${endpointBase}/${ticketId}/messages/${messageId}`);
      if (res.data?.data) applyLoadedTicket(res.data.data as TicketDetail, false);
      showSuccessToast('Reply deleted');
      onUpdated();
    } catch (err: unknown) {
      showErrorToast(apiErrorMessage(err, 'Failed to delete reply'));
    } finally {
      setSaving(false);
    }
  };

  const t = detail?.ticket;
  const involvedGroups = useMemo(() => {
    const people = [...(detail?.participants || [])].filter((person) => person.status === 'active' || person.isRequester);
    const assigneeId = t?.assignee?.accountId ? String(t.assignee.accountId) : '';
    if (assigneeId && t?.assignee && !people.some((person) => String(person.accountId) === assigneeId)) {
      people.push({
        accountId: assigneeId,
        name: t.assignee.name,
        role: t.assignee.role,
        status: 'active',
        isRequester: false,
        isStaff: true,
        replyCount: 0,
      });
    }
    const staff = people.filter((person) => person.isStaff || (assigneeId && String(person.accountId) === assigneeId));
    const staffIds = new Set(staff.map((person) => String(person.accountId)));
    const users = people.filter((person) => !staffIds.has(String(person.accountId)));
    return { staff, users };
  }, [detail?.participants, t?.assignee]);
  const typeMeta = detail?.typeDetails?.find((d) => d.label === currentType);
  const contextEntries = submissionContextEntries(detail?.submissionContext);
  const escalateTypeMeta = detail?.typeDetails?.find((d) => d.label === escalateType);
  const canChangeAssignee = !assigneeLocked || Boolean(perms?.canAssignOthers || isAdmin);
  const ticketDirty = Boolean(
    t &&
      (status !== t.status ||
        priority !== t.priority ||
        (canChangeAssignee && assigneeId !== (t.assignee?.staffId?.toString() || '')))
  );
  const isAppeal = Boolean(t && ticketTypeOf(t) === 'Appeal an account penalty');
  const peopleCount = involvedGroups.staff.length + involvedGroups.users.length;
  const assignableOptions = (() => {
    const options = (detail?.assignableStaff || []).filter((s) => {
      if (!myStaffId) return true;
      const isMe = String(s.staffId).toLowerCase() === myStaffId.toLowerCase();
      // Hide yourself unless you already handle it; claiming goes through Assign myself.
      return !isMe || alreadyAssignedToMe;
    });
    const current = t?.assignee;
    const listed = current && options.some((s) => String(s.staffId).toLowerCase() === String(current.staffId).toLowerCase());
    return current && !listed
      ? [{ staffId: current.staffId, name: current.name, role: current.role }, ...options]
      : options;
  })();
  const replyGuides = (() => {
    const thread = (detail?.messages || []).filter(
      (message) =>
        !message.isInternal &&
        !message.isUnsent &&
        String(message.authorType).toLowerCase() !== 'system'
    );
    return thread.length <= 1 ? (detail?.articles || []).slice(0, 3) : [];
  })();

  const personAction = (accountId: string, name: string, locked: boolean, active: boolean) =>
    detail?.canManageParticipants && !locked && active ? (
      <button
        type="button"
        disabled={personBusy}
        onClick={() => setConfirmRemove({ accountId, name })}
        className="shrink-0 rounded-md p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-red-200 disabled:opacity-50"
        aria-label={`Remove ${name}`}
        title="Remove from ticket"
      >
        <UserMinus className="h-3.5 w-3.5" />
      </button>
    ) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4">
      <div className="relative flex h-[min(92vh,920px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f1016] shadow-2xl">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-6 py-4">
          <div className="min-w-0">
            <p className={`text-[10px] font-semibold uppercase tracking-wide ${tone.text}`}>
              Ticket · {t?.number || `TKT-${ticketId}`}
            </p>
            <h2 className="mt-1 truncate text-lg font-semibold text-white">{t?.subject || 'Ticket'}</h2>
            {t && (
              <>
                <p className="mt-1 truncate text-xs text-zinc-500">
                  {t.requester.name}
                  {t.requester.username ? ` (@${t.requester.username})` : ''} · Opened {formatDateTime(t.createdAt)} · Updated{' '}
                  {formatDateTime(t.updatedAt)}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <Pill className={statusButtonClass(t.status, true)}>{t.status}</Pill>
                  <Pill className={priorityPillClass(t.priority)}>{t.priority} priority</Pill>
                  <Pill className="border-white/10 bg-white/5 text-zinc-300">{ticketTypeOf(t)}</Pill>
                  <Pill
                    className={
                      t.assignee
                        ? 'border-white/10 bg-white/5 text-zinc-300'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                    }
                  >
                    {t.assignee ? `Handler: ${t.assignee.name}` : 'Unassigned'}
                  </Pill>
                  {t.isEscalated && (
                    <Pill className="border-violet-500/30 bg-violet-500/10 text-violet-200">{formatEscalatedLabel(t)}</Pill>
                  )}
                  {t.waitingForResponse && (
                    <Pill className="border-amber-500/30 bg-amber-500/10 text-amber-200">Awaiting reply</Pill>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {t && (
              <button type="button" onClick={() => setShowTranscript(true)} className={BTN.neutral}>
                <FileText className="h-3.5 w-3.5" />
                Transcript
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className={`h-8 w-8 animate-spin ${tone.spin}`} />
          </div>
        ) : detail && t ? (
          <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_340px] lg:overflow-hidden">
            {/* Main column: conversation or details */}
            <div className="flex min-h-[60vh] flex-col border-white/10 lg:min-h-0 lg:border-r">
              <TabBar
                label="Ticket sections"
                active={tab}
                onChange={setTab}
                tabs={[
                  { id: 'conversation', label: `Conversation (${detail.messages.length})`, icon: MessageSquare },
                  { id: 'details', label: 'Details', icon: ClipboardList },
                ] as const}
              />

              {tab === 'conversation' ? (
                <>
                  <div ref={threadRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                    {detail.chatAvailable === false && (
                      <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
                        Chat storage is offline, so messages can’t load right now. Status changes still work.
                      </p>
                    )}
                    {detail.messages.length === 0 && detail.chatAvailable !== false && (
                      <div className="flex h-full min-h-40 flex-col items-center justify-center text-center">
                        <MessageSquare className="mb-2 h-8 w-8 text-zinc-700" />
                        <p className="text-sm text-zinc-500">No messages yet</p>
                        <p className="mt-1 text-xs text-zinc-600">Start the thread with a reply below.</p>
                      </div>
                    )}
                    {detail.messages.map((m) =>
                      String(m.authorType).toLowerCase() === 'system' ? (
                        <div key={m.id} className="flex items-center gap-3 py-1">
                          <span className="h-px flex-1 bg-white/[0.06]" />
                          <span className="max-w-[80%] text-center text-[11px] text-zinc-500">
                            {m.body}
                            <span className="ml-2 text-zinc-600">{formatDateTime(m.createdAt)}</span>
                          </span>
                          <span className="h-px flex-1 bg-white/[0.06]" />
                        </div>
                      ) : (
                        <MessageBubble
                          key={m.id}
                          message={m}
                          accentSoft={tone.soft}
                          own={Boolean(viewerAccountId) && String(m.senderId || '') === String(viewerAccountId)}
                          busy={saving}
                          replyQuote={quoteFor(m.replyToId)}
                          onReply={canReply ? () => setReplyTarget(m) : undefined}
                          onJumpToReply={jumpToMessage}
                          onDelete={() => removeMessage(m.id)}
                          onToggleInternal={(isInternal) => changeMessage(m.id, { isInternal })}
                        />
                      )
                    )}
                    <div ref={threadEndRef} />
                  </div>

                  <div className="shrink-0 border-t border-white/10 bg-[#0c0d12] p-4">
                    {!canReply ? (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <p className="flex items-center gap-2 text-sm text-zinc-300">
                          <Lock className="h-4 w-4 shrink-0 text-zinc-500" />
                          {ticketClosed
                            ? 'This ticket is closed. Reopen it before replying.'
                            : ticketAssigneeId
                              ? 'Only the assigned staff member can reply on this ticket.'
                              : 'Claim this ticket before replying. No one is assigned yet.'}
                        </p>
                        {canAssignMyself && (
                          <button type="button" onClick={() => void assignMyself()} disabled={saving} className={BTN.claim}>
                            <Hand className="h-3.5 w-3.5" />
                            Assign myself
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {replyGuides.length > 0 && (
                          <div>
                            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                              Suggested replies
                            </p>
                            <div className="flex gap-2 overflow-x-auto pb-1">
                              {replyGuides.map((article) => (
                                <button
                                  key={article.id}
                                  type="button"
                                  onClick={() => setReply(article.body)}
                                  title={article.body}
                                  className="w-56 shrink-0 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left transition hover:border-white/20 hover:bg-white/[0.06]"
                                >
                                  <span className="block truncate text-xs font-medium text-white">{article.title}</span>
                                  <span className="mt-0.5 line-clamp-2 block text-[11px] text-zinc-500">{article.body}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {replyTarget && (
                          <div className="flex items-start gap-2 rounded-lg border-l-2 border-sky-400 bg-sky-500/[0.06] px-3 py-2">
                            <CornerDownRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-300" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-200">
                                Replying to {replyTarget.authorName}
                              </p>
                              <p className="truncate text-xs text-zinc-300">{replyTarget.body || 'Attachment'}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setReplyTarget(null)}
                              aria-label="Cancel reply"
                              className="text-zinc-400 hover:text-white"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                        <div
                          className={`rounded-xl border transition ${
                            internalNote ? 'border-amber-500/30 bg-amber-500/[0.04]' : 'border-white/10 bg-[#14151c]'
                          }`}
                        >
                          <div className="flex items-center gap-1 border-b border-white/[0.06] px-2 py-1.5" role="group" aria-label="Message type">
                            {[
                              { internal: false, label: 'Reply to member', Icon: MessageSquare },
                              { internal: true, label: 'Internal note', Icon: Lock },
                            ].map(({ internal, label, Icon }) => {
                              const active = internalNote === internal;
                              return (
                                <button
                                  key={label}
                                  type="button"
                                  aria-pressed={active}
                                  disabled={detail.chatAvailable === false}
                                  onClick={() => setInternalNote(internal)}
                                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition disabled:opacity-50 ${
                                    active
                                      ? internal
                                        ? 'bg-amber-500/15 text-amber-100'
                                        : 'bg-white/10 text-white'
                                      : 'text-zinc-500 hover:text-zinc-200'
                                  }`}
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                          <textarea
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                                event.preventDefault();
                                void sendReply();
                              }
                            }}
                            rows={3}
                            placeholder={internalNote ? 'Write a note only staff can see…' : 'Write a reply to the member…'}
                            disabled={detail.chatAvailable === false}
                            className="block w-full resize-none bg-transparent px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 disabled:opacity-50"
                          />
                          {screenshots.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 px-3 pb-2">
                              {screenshots.map((file) => (
                                <span
                                  key={file.key}
                                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-zinc-300"
                                >
                                  <Paperclip className="h-3 w-3" />
                                  <span className="max-w-[10rem] truncate">{file.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => setScreenshots((current) => current.filter((item) => item.key !== file.key))}
                                    aria-label="Remove attachment"
                                    className="text-zinc-500 hover:text-white"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] px-2 py-1.5">
                            <div className="flex min-w-0 items-center gap-2">
                              <label
                                title="Attach an image or video"
                                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-white/5 hover:text-white ${
                                  detail.chatAvailable === false || screenshots.length >= 4 ? 'pointer-events-none opacity-40' : 'cursor-pointer'
                                }`}
                              >
                                <Paperclip className="h-4 w-4" />
                                <span className="sr-only">Attach a file</span>
                                <input
                                  type="file"
                                  accept="image/*,video/*"
                                  multiple
                                  className="hidden"
                                  disabled={detail.chatAvailable === false || screenshots.length >= 4}
                                  onChange={(event) => {
                                    void uploadScreenshots(event.target.files);
                                    event.target.value = '';
                                  }}
                                />
                              </label>
                              <span className="truncate text-[11px] text-zinc-500">
                                {internalNote ? 'Only staff will see this note.' : 'Everyone on the ticket will see this reply.'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => void sendReply()}
                              disabled={saving || (!reply.trim() && screenshots.length === 0) || detail.chatAvailable === false}
                              className={`${BTN_BASE} shrink-0 border-transparent text-white ${internalNote ? 'bg-amber-500/80 hover:bg-amber-500' : tone.btn}`}
                            >
                              <Send className="h-3.5 w-3.5" />
                              {internalNote ? 'Add note' : 'Send reply'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
                  <PanelSection title="Requester">
                    <dl className="grid gap-2 sm:grid-cols-2">
                      <Fact label="Name" value={t.requester.name || '—'} />
                      <Fact label="Handle" value={t.requester.username ? `@${t.requester.username}` : '—'} />
                      <Fact label="Email" value={t.requester.email || '—'} />
                      <Fact label="Last message" value={formatDateTime(t.lastMessageAt)} />
                      <Fact label="Account ID" value={<CopyableId value={t.requester.accountId} />} mono />
                      <Fact label="User ID" value={<CopyableId value={t.requester.userId} />} mono />
                    </dl>
                  </PanelSection>

                  <PanelSection title="Form answers" count={(detail.formValues || []).length}>
                    {(detail.formValues || []).length === 0 ? (
                      <EmptyNote>No extra form answers were submitted.</EmptyNote>
                    ) : (
                      <dl className="grid gap-2 sm:grid-cols-2">
                        {(detail.formValues || []).map((answer) => (
                          <Fact
                            key={answer.key}
                            label={answer.label}
                            value={
                              <>
                                {answer.value}
                                {answer.id ? <span className="mt-0.5 block break-all text-[11px] text-zinc-600">{answer.id}</span> : null}
                              </>
                            }
                          />
                        ))}
                      </dl>
                    )}
                  </PanelSection>

                  {contextEntries.length > 0 && (
                    <PanelSection title="Submitted with">
                      <dl className="grid gap-2 sm:grid-cols-2">
                        {contextEntries.map(([label, value]) => (
                          <Fact key={label} label={label} value={value} />
                        ))}
                      </dl>
                    </PanelSection>
                  )}

                  {detail.payments && (
                    <PanelSection
                      title="Payments"
                      count={
                        detail.payments.payments.length +
                        detail.payments.credits.length +
                        (detail.payments.cashouts || []).length
                      }
                    >
                      {detail.payments.payments.length === 0 &&
                      detail.payments.credits.length === 0 &&
                      (detail.payments.cashouts || []).length === 0 ? (
                        <EmptyNote>No payment records for this account yet.</EmptyNote>
                      ) : (
                        <ul className="space-y-2">
                          {(detail.payments.cashouts || []).map((cashout) => (
                            <li key={cashout.id} className="rounded-lg border border-white/10 px-3 py-2.5">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-sm text-zinc-200">
                                  Withdrawal · <span className="tabular-nums">{cashout.credits}</span> credits
                                </span>
                                <span className="text-[11px] text-zinc-500">{formatDateTime(cashout.createdAt)}</span>
                              </div>
                              <p className="mt-1 text-xs text-zinc-500">
                                {titleCaseLabel(cashout.status)} · {cashout.channel || 'Payout'}
                                {cashout.accountLast4 ? ` · ••••${cashout.accountLast4}` : ''}
                                {cashout.failureCode ? ` · ${cashout.failureCode}` : ''}
                              </p>
                            </li>
                          ))}
                          {detail.payments.payments.map((payment) => (
                            <li key={payment.id} className="rounded-lg border border-white/10 px-3 py-2.5">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-sm text-zinc-200">
                                  {payment.type || 'Payment'} · {payment.currency} <span className="tabular-nums">{payment.amount}</span>
                                </span>
                                <span className="text-[11px] text-zinc-500">{formatDateTime(payment.createdAt)}</span>
                              </div>
                              <p className="mt-1 text-xs text-zinc-500">
                                {titleCaseLabel(payment.status)} · {payment.credits} credits
                              </p>
                            </li>
                          ))}
                          {detail.payments.credits.map((credit) => (
                            <li key={credit.id} className="rounded-lg border border-white/10 px-3 py-2.5">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-sm text-zinc-200">
                                  {credit.type} · <span className="tabular-nums">{credit.amount}</span> credits
                                </span>
                                <span className="text-[11px] text-zinc-500">{formatDateTime(credit.createdAt)}</span>
                              </div>
                              <p className="mt-1 text-xs text-zinc-500">{titleCaseLabel(credit.status)}</p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </PanelSection>
                  )}

                  <PanelSection title="Activity" count={(detail.timeline || []).length}>
                    {(detail.timeline || []).length === 0 ? (
                      <EmptyNote>No recorded activity yet.</EmptyNote>
                    ) : (
                      <ol className="space-y-0">
                        {detail.timeline!.slice(0, 20).map((entry) => (
                          <li key={entry.id} className="relative border-l border-white/10 pb-3 pl-4 last:pb-0">
                            <span className="absolute -left-[3.5px] top-1.5 h-1.5 w-1.5 rounded-full bg-zinc-500" />
                            <p className="text-sm text-zinc-200">{entry.summary}</p>
                            <p className="text-[11px] text-zinc-500">
                              {entry.kind === 'account' ? 'Account' : 'Ticket'} · {entry.actorName || 'Staff'}
                              {entry.actorRole ? ` · ${entry.actorRole}` : ''} · {formatDateTime(entry.createdAt)}
                            </p>
                          </li>
                        ))}
                      </ol>
                    )}
                  </PanelSection>
                </div>
              )}
            </div>

            {/* Sidebar: actions */}
            <aside className="flex min-h-0 flex-col bg-[#0c0d12]">
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                <SidebarSection title="Handler">
                  <div className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[11px] font-semibold text-zinc-200">
                      {t.assignee ? initials(t.assignee.name) : <UserRound className="h-4 w-4 text-zinc-500" />}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm text-white">
                        {t.assignee?.name || 'No one assigned'}
                        {alreadyAssignedToMe ? <span className="text-zinc-500"> (you)</span> : null}
                      </p>
                      <p className="truncate text-[11px] text-zinc-500">
                        {t.assignee ? t.assignee.role : 'Claim it to reply to the member'}
                      </p>
                    </div>
                  </div>

                  {canChangeAssignee && !ticketClosed && (
                    <div>
                      <FieldLabel>Assign to</FieldLabel>
                      <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className={FIELD}>
                        <option value="">Unassigned</option>
                        {assignableOptions.map((s) => (
                          <option key={s.staffId} value={s.staffId}>
                            {s.name} ({s.role})
                            {myStaffId && String(s.staffId).toLowerCase() === myStaffId.toLowerCase() ? ' (you)' : ''}
                          </option>
                        ))}
                      </select>
                      {ticketAssigneeId && (perms?.canAssignOthers || isAdmin) ? (
                        <p className="mt-1.5 text-[11px] text-violet-300/80">Admin override: you can reassign without a release.</p>
                      ) : null}
                    </div>
                  )}
                  {ticketClosed ? (
                    <p className="text-[11px] text-zinc-500">This ticket is closed. Reopen it before anyone can claim it.</p>
                  ) : assigneeLocked && !canChangeAssignee ? (
                    <p className="text-[11px] text-zinc-500">
                      The assigned staff member must release the ticket before someone else can claim it.
                    </p>
                  ) : null}

                  {(canAssignMyself || canRelease) && (
                    <div className="grid grid-cols-2 gap-2">
                      {canAssignMyself && (
                        <button
                          type="button"
                          onClick={() => void assignMyself()}
                          disabled={saving}
                          className={`${BTN.claim} ${canRelease ? '' : 'col-span-2'}`}
                        >
                          <Hand className="h-3.5 w-3.5" />
                          Assign myself
                        </button>
                      )}
                      {canRelease && (
                        <button
                          type="button"
                          onClick={() => void releaseCase()}
                          disabled={saving}
                          className={`${BTN.warn} ${canAssignMyself ? '' : 'col-span-2'}`}
                        >
                          Release
                        </button>
                      )}
                    </div>
                  )}
                </SidebarSection>

                <SidebarSection title="Ticket">
                  <div>
                    <FieldLabel>Status</FieldLabel>
                    {statusControl === 'buttons' ? (
                      <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Ticket status">
                        {statusOptions.map((s) => {
                          const active = status.toLowerCase().replace(/_/g, ' ') === s.toLowerCase().replace(/_/g, ' ');
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setStatus(s)}
                              aria-pressed={active}
                              className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition ${statusButtonClass(s, active)}`}
                            >
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <select value={status} onChange={(e) => setStatus(e.target.value)} className={FIELD}>
                        {statusOptions.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <FieldLabel>Priority</FieldLabel>
                    <select value={priority} onChange={(e) => setPriority(e.target.value)} className={FIELD}>
                      {priorityOptions.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  {t.status !== 'Closed' ? (
                    <div className="space-y-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                      <p className="text-[11px] font-medium text-zinc-400">Closing</p>
                      {detail.scheduledCloseAt || detail.autoClosesAt ? (
                        <CloseTimer
                          closesAt={detail.scheduledCloseAt || detail.autoClosesAt}
                          scheduled={Boolean(detail.scheduledCloseAt)}
                        />
                      ) : (
                        <p className="text-[11px] text-zinc-500">No close is scheduled.</p>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        <button type="button" disabled={schedulingClose} onClick={openSchedule} className={BTN.warn}>
                          {detail.scheduledCloseAt ? 'Change time' : 'Schedule close'}
                        </button>
                        {detail.scheduledCloseAt ? (
                          <button
                            type="button"
                            disabled={schedulingClose}
                            onClick={() => void scheduleClose(true)}
                            className={BTN.neutral}
                          >
                            {schedulingClose ? 'Cancelling…' : 'Cancel'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-zinc-500">Closed. A transcript was saved when it closed.</p>
                  )}
                </SidebarSection>

                {isAppeal && (
                  <SidebarSection title="Appeal decision">
                    <p className="text-[11px] leading-relaxed text-zinc-500">
                      Accepting ends the penalty in 24 hours. Denying lets them appeal again in 12 months. Deny permanently blocks every future appeal. Each choice closes the ticket.
                    </p>
                    {detail.appealDecision ? (
                      <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-zinc-200">
                        {detail.appealDecision === 'accepted'
                          ? 'Accepted. The penalty ends 24 hours after this decision.'
                          : detail.appealDecision === 'denied_permanent'
                            ? 'Denied permanently. This account cannot appeal again.'
                            : 'Denied. They can submit another appeal in 12 months.'}
                      </p>
                    ) : (
                      <div className="grid gap-1.5">
                        <button type="button" onClick={() => setAppealChoice('accept')} className={BTN.success}>
                          Accept appeal
                        </button>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button type="button" onClick={() => setAppealChoice('deny')} className={BTN.warn}>
                            Deny
                          </button>
                          <button type="button" onClick={() => setAppealChoice('deny_permanent')} className={BTN.danger}>
                            Deny permanently
                          </button>
                        </div>
                      </div>
                    )}
                  </SidebarSection>
                )}

                <SidebarSection title={`People (${peopleCount})`}>
                  {involvedGroups.staff.length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">Staff</p>
                      <ul className="divide-y divide-white/[0.04]">
                        {involvedGroups.staff.map((person) => {
                          const isAssignee =
                            Boolean(t.assignee?.accountId) && String(person.accountId) === String(t.assignee?.accountId);
                          return (
                            <PersonRow
                              key={`staff-${person.accountId}`}
                              name={person.name}
                              detail={[
                                person.handle ? `@${person.handle}` : '',
                                person.replyCount > 0 ? `${person.replyCount} ${person.replyCount === 1 ? 'reply' : 'replies'}` : '',
                              ].filter(Boolean).join(' · ')}
                              tag={isAssignee ? 'Handler' : 'Staff'}
                              tagClass={isAssignee ? 'border-sky-500/30 text-sky-200' : 'border-violet-500/30 text-violet-200'}
                              action={personAction(String(person.accountId), person.name, isAssignee, person.status === 'active')}
                            />
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">Members</p>
                    {involvedGroups.users.length === 0 ? (
                      <p className="py-1.5 text-xs text-zinc-500">No members on this ticket.</p>
                    ) : (
                      <ul className="divide-y divide-white/[0.04]">
                        {involvedGroups.users.map((person) => (
                          <PersonRow
                            key={`user-${person.accountId}`}
                            name={person.name}
                            detail={[
                              person.handle ? `@${person.handle}` : '',
                              person.replyCount > 0 ? `${person.replyCount} ${person.replyCount === 1 ? 'reply' : 'replies'}` : '',
                            ].filter(Boolean).join(' · ')}
                            tag={person.isRequester ? 'Requester' : 'Added'}
                            tagClass={person.isRequester ? 'border-white/15 text-zinc-300' : undefined}
                            action={personAction(String(person.accountId), person.name, person.isRequester, person.status === 'active')}
                          />
                        ))}
                      </ul>
                    )}
                  </div>

                  {(detail.pendingInvites || []).length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-amber-200/70">Waiting to accept</p>
                      <ul className="divide-y divide-white/[0.04]">
                        {detail.pendingInvites!.map((person) => (
                          <PersonRow
                            key={`invite-${person.accountId}`}
                            name={person.name}
                            detail={person.handle ? `@${person.handle}` : undefined}
                            tag="Invited"
                            tagClass="border-amber-500/30 text-amber-200"
                            action={
                              detail.canManageParticipants ? (
                                <button
                                  type="button"
                                  disabled={personBusy}
                                  onClick={() => void changeParticipant(person.accountId, 'remove')}
                                  className="shrink-0 text-[11px] text-zinc-500 hover:text-zinc-200 disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              ) : null
                            }
                          />
                        ))}
                      </ul>
                    </div>
                  )}

                  {detail.canManageParticipants && (
                    <div className="space-y-2 border-t border-white/[0.06] pt-3">
                      <label className="block text-[11px] font-medium text-zinc-500" htmlFor="ticket-add-user">
                        Add a moderator or member
                      </label>
                      <input
                        id="ticket-add-user"
                        value={personQuery}
                        onChange={(event) => setPersonQuery(event.target.value)}
                        placeholder="Name, @handle, or email"
                        autoComplete="off"
                        className={FIELD}
                      />
                      {personQuery.replace(/^@/, '').trim().length === 1 && (
                        <p className="text-[11px] text-zinc-500">Type at least 2 characters.</p>
                      )}
                      {searchingPeople && <p className="text-[11px] text-zinc-500">Searching…</p>}
                      {personResults.length > 0 && (
                        <ul className="max-h-48 space-y-1 overflow-y-auto">
                          {personResults.map((person) => {
                            const alreadyOnTicket = (detail.participants || []).some(
                              (member) => member.accountId === person.accountId && member.status === 'active'
                            );
                            const alreadyInvited = (detail.pendingInvites || []).some(
                              (invite) => invite.accountId === person.accountId
                            );
                            return (
                              <li key={person.accountId}>
                                <button
                                  type="button"
                                  disabled={personBusy || alreadyOnTicket || alreadyInvited}
                                  onClick={() => setConfirmPerson(person)}
                                  className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2 text-left text-xs transition hover:bg-white/5 disabled:opacity-50"
                                >
                                  <span className="min-w-0">
                                    <span className="flex items-center gap-1.5">
                                      <span className="truncate text-white">{person.name}</span>
                                      <span
                                        className={`shrink-0 rounded-full border px-1.5 py-px text-[9px] uppercase tracking-wide ${
                                          person.kind === 'staff' ? 'border-violet-500/30 text-violet-200' : 'border-white/15 text-zinc-400'
                                        }`}
                                      >
                                        {person.role}
                                      </span>
                                    </span>
                                    <span className="block truncate text-zinc-500">
                                      {person.handle || 'No handle'}
                                      {person.email ? ` · ${person.email}` : ''}
                                    </span>
                                  </span>
                                  <span className="inline-flex shrink-0 items-center gap-1 text-zinc-300">
                                    <UserPlus className="h-3.5 w-3.5" />
                                    {alreadyOnTicket ? 'On ticket' : alreadyInvited ? 'Invited' : 'Add'}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      {!searchingPeople && personQuery.replace(/^@/, '').trim().length >= 2 && personResults.length === 0 && (
                        <p className="text-[11px] text-zinc-500">No matching moderators or members.</p>
                      )}
                      <p className="text-[11px] text-zinc-600">The requester and the handler always stay on the ticket.</p>
                    </div>
                  )}
                </SidebarSection>

                {detail.canAdjustCredits && (
                  <SidebarSection title="Credit change">
                    <p className="text-[11px] text-zinc-500">Admin and Support only. The note is stored on this ticket.</p>
                    <input
                      value={creditAmount}
                      onChange={(event) => setCreditAmount(event.target.value)}
                      inputMode="numeric"
                      placeholder="Amount (use minus to deduct)"
                      className={FIELD}
                    />
                    <textarea
                      value={creditNote}
                      onChange={(event) => setCreditNote(event.target.value)}
                      rows={2}
                      placeholder="Why this change is being made"
                      className={`${FIELD} resize-none`}
                    />
                    <button
                      type="button"
                      disabled={saving || !creditAmount.trim()}
                      onClick={() => void applyCreditChange()}
                      className={`${BTN.neutral} w-full`}
                    >
                      Record on ticket
                    </button>
                  </SidebarSection>
                )}

                {allowEscalate && (
                  <SidebarSection title="Move ticket">
                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-wide text-zinc-500">Current type</p>
                      <p className="mt-0.5 text-sm text-white">{currentType || '—'}</p>
                      {typeMeta?.description ? (
                        <p className="mt-0.5 text-[11px] text-zinc-500">{typeMeta.description}</p>
                      ) : null}
                      {typeMeta?.subgroup || typeMeta?.group ? (
                        <p className="mt-0.5 text-[11px] text-zinc-500">
                          {[typeMeta?.group, typeMeta?.subgroup].filter(Boolean).join(' · ')}
                        </p>
                      ) : null}
                    </div>
                    {canEscalate ? (
                      <>
                        <p className="text-[11px] text-zinc-500">Moving a ticket unassigns the current handler.</p>
                        {allowEscalateToAdmin && (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => setConfirmEscalateAdmin(true)}
                            className={`${BTN.admin} w-full`}
                          >
                            <ShieldAlert className="h-3.5 w-3.5" />
                            Escalate to Admin
                          </button>
                        )}
                        <div>
                          <FieldLabel>Moderator queue</FieldLabel>
                          <select value={escalateRole} onChange={(e) => onEscalateRoleChange(e.target.value)} className={FIELD}>
                            {escalateRoles.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <FieldLabel>Type</FieldLabel>
                          <select value={escalateType} onChange={(e) => setEscalateType(e.target.value)} className={FIELD}>
                            {TICKET_TYPE_GROUPS.flatMap((group) => {
                              const buckets = group.subgroups?.length
                                ? group.subgroups.map((sub) => ({
                                    label: `${group.label} · ${sub.label}`,
                                    types: sub.types,
                                  }))
                                : [{ label: group.label, types: group.types }];
                              return buckets
                                .map((bucket) => {
                                  const items = bucket.types.filter((type) => escalateTypeOptions.includes(type));
                                  if (!items.length) return null;
                                  return (
                                    <optgroup key={bucket.label} label={bucket.label}>
                                      {items.map((opt) => (
                                        <option key={opt} value={opt}>
                                          {opt}
                                        </option>
                                      ))}
                                    </optgroup>
                                  );
                                })
                                .filter(Boolean);
                            })}
                          </select>
                          <p className="mt-1.5 text-[11px] text-zinc-600">
                            {escalateTypeMeta?.description ||
                              `${escalateTypeOptions.length} type${escalateTypeOptions.length === 1 ? '' : 's'} for ${escalateRole}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setConfirmEscalate(true)}
                          disabled={saving || !escalateType.trim() || !escalateTypeOptions.includes(escalateType)}
                          className={`${BTN.warn} w-full`}
                        >
                          Move to this queue
                        </button>
                      </>
                    ) : (
                      <p className="text-[11px] text-zinc-500">Only the handler, a moderator, or an admin can move this ticket.</p>
                    )}
                  </SidebarSection>
                )}
              </div>

              <div className="shrink-0 border-t border-white/10 bg-[#0f1016] p-3">
                <button
                  type="button"
                  onClick={() => void saveChanges()}
                  disabled={saving || !ticketDirty}
                  className={`${BTN_BASE} w-full border-transparent py-2.5 text-sm text-white ${tone.btn}`}
                >
                  {saving ? 'Saving…' : ticketDirty ? 'Save changes' : 'No unsaved changes'}
                </button>
              </div>
            </aside>
          </div>
        ) : (
          <p className="py-16 text-center text-zinc-500">Ticket not found.</p>
        )}

        {showTranscript && t && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 p-4">
            <div className="flex max-h-[85%] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#14151c] shadow-2xl">
              <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Transcript · {t.number}</p>
                  <h3 className="mt-1 truncate text-base font-semibold text-white">{t.subject}</h3>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    {detail?.savedTranscript?.createdAt
                      ? `Saved ${formatDateTime(detail.savedTranscript.createdAt)}`
                      : 'Not saved yet. Generate one to keep a copy you can download.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTranscript(false)}
                  aria-label="Close transcript"
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                <dl className="grid gap-2 sm:grid-cols-2">
                  <Fact
                    label="Staff"
                    value={involvedGroups.staff.length ? involvedGroups.staff.map((person) => person.name).join(', ') : 'None'}
                  />
                  <Fact
                    label="Members"
                    value={involvedGroups.users.length ? involvedGroups.users.map((person) => person.name).join(', ') : 'None'}
                  />
                </dl>
                {detail?.savedTranscript?.text ? (
                  /^\s*<!doctype html/i.test(detail.savedTranscript.text) || /^\s*<html/i.test(detail.savedTranscript.text) ? (
                    <iframe
                      title="Saved ticket transcript"
                      sandbox=""
                      srcDoc={detail.savedTranscript.text}
                      className="h-[28rem] w-full rounded-xl border border-white/10 bg-white"
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap rounded-xl border border-white/10 bg-[#0f1016] p-4 text-sm leading-relaxed text-zinc-100">
                      {detail.savedTranscript.text}
                    </pre>
                  )
                ) : (
                  <ol className="divide-y divide-white/[0.06]">
                    {(detail?.messages || []).filter((message) => !message.isUnsent).map((message) => (
                      <li key={`transcript-${message.id}`} className="py-2.5">
                        <p className="text-[11px] text-zinc-500">
                          {formatDateTime(message.createdAt)} · <span className="text-zinc-300">{message.authorName}</span>
                          {message.isInternal ? ' · internal note' : ''}
                          {String(message.authorType).toLowerCase() === 'system' ? ' · system' : ''}
                        </p>
                        <p className="mt-0.5 whitespace-pre-wrap text-sm text-zinc-100">
                          {message.body || (message.attachments?.length ? 'Attachment' : '')}
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
              <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 px-5 py-3">
                <button type="button" disabled={savingTranscript} onClick={() => void saveTranscript()} className={BTN.claim}>
                  {savingTranscript ? 'Saving…' : detail?.savedTranscript?.text ? 'Regenerate' : 'Generate transcript'}
                </button>
                {detail?.savedTranscript?.text ? (
                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob([detail.savedTranscript?.text || ''], { type: 'text/html' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `${t.number || 'ticket'}-transcript.html`;
                      link.click();
                      URL.revokeObjectURL(url);
                    }}
                    className={BTN.neutral}
                  >
                    Download
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    if (detail?.savedTranscript?.text) {
                      void navigator.clipboard.writeText(detail.savedTranscript.text).then(
                        () => showSuccessToast('Transcript copied'),
                        () => showErrorToast('Could not copy the transcript')
                      );
                      return;
                    }
                    const lines = [
                      `Ticket ${t.number}`,
                      t.subject,
                      '',
                      'Staff',
                      ...(involvedGroups.staff.length ? involvedGroups.staff.map((person) => `- ${person.name}${person.handle ? ` (@${person.handle})` : ''}`) : ['- None']),
                      '',
                      'Users',
                      ...(involvedGroups.users.length ? involvedGroups.users.map((person) => `- ${person.name}${person.handle ? ` (@${person.handle})` : ''}${person.isRequester ? ' (opened ticket)' : ''}`) : ['- None']),
                      '',
                      'Transcript',
                      ...(detail?.messages || []).filter((message) => !message.isUnsent).map((message) => {
                        const label = message.isInternal ? 'internal note' : String(message.authorType).toLowerCase() === 'system' ? 'system' : 'message';
                        return `[${formatDateTime(message.createdAt)}] ${message.authorName} (${label}): ${message.body || (message.attachments?.length ? 'Attachment' : '')}`;
                      }),
                    ];
                    void navigator.clipboard.writeText(lines.join('\n')).then(
                      () => showSuccessToast('Transcript copied'),
                      () => showErrorToast('Could not copy the transcript')
                    );
                  }}
                  className={BTN.neutral}
                >
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() => setShowTranscript(false)}
                  className={`${BTN_BASE} border-transparent bg-white text-black hover:bg-zinc-200`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmRemove && (
          <ConfirmDialog
            title={`Remove ${confirmRemove.name}?`}
            description="They will leave this ticket and won’t be able to open it again."
            confirmLabel="Remove"
            busyLabel="Removing…"
            busy={personBusy}
            confirmClassName={BTN.danger}
            onCancel={() => setConfirmRemove(null)}
            onConfirm={() => void changeParticipant(confirmRemove.accountId, 'remove')}
          />
        )}

        {confirmPerson && (
          <ConfirmDialog
            title={`Add ${confirmPerson.name}?`}
            description={
              <>
                {confirmPerson.kind === 'staff'
                  ? 'Staff are added right away and can open this ticket.'
                  : 'They get a notification and must accept before they can open this ticket.'}
                <span className="mt-1.5 block text-zinc-500">
                  {confirmPerson.handle || 'No handle'}
                  {confirmPerson.email ? ` · ${confirmPerson.email}` : ''} · {confirmPerson.role}
                </span>
              </>
            }
            confirmLabel={confirmPerson.kind === 'staff' ? 'Add staff' : 'Send invite'}
            busyLabel="Adding…"
            busy={personBusy}
            confirmClassName={BTN.claim}
            onCancel={() => setConfirmPerson(null)}
            onConfirm={() => void changeParticipant(confirmPerson.accountId, 'add')}
          />
        )}

        {confirmSchedule && (
          <ConfirmDialog
            title="When should this ticket close?"
            description="Everyone on the ticket is notified now and again when it closes. A transcript is saved on close."
            confirmLabel="Set close time"
            busyLabel="Scheduling…"
            busy={schedulingClose}
            confirmClassName={BTN.warn}
            onCancel={() => setConfirmSchedule(false)}
            onConfirm={() => void scheduleClose(false)}
          >
            <div className="grid grid-cols-3 gap-1.5">
              {[
                ['1', '1 hour'],
                ['6', '6 hours'],
                ['24', '1 day'],
                ['72', '3 days'],
                ['168', '7 days'],
                ['custom', 'Custom'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setScheduleChoice(value)}
                  aria-pressed={scheduleChoice === value}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs transition ${
                    scheduleChoice === value
                      ? 'border-amber-500/40 bg-amber-500/15 text-amber-100'
                      : 'border-white/10 text-zinc-300 hover:bg-white/5'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {scheduleChoice === 'custom' ? (
              <input
                type="datetime-local"
                value={customCloseAt}
                onChange={(event) => setCustomCloseAt(event.target.value)}
                className={FIELD}
              />
            ) : null}
            <p className="text-xs text-zinc-400">Closes {formatDateTime(chosenCloseIso())}</p>
          </ConfirmDialog>
        )}

        {confirmEscalate && (
          <ConfirmDialog
            title="Move this ticket?"
            description={
              <>
                Queue: <span className="text-zinc-200">{escalateRole}</span> · Type:{' '}
                <span className="text-zinc-200">{escalateType}</span>
                <span className="mt-1.5 block text-zinc-500">
                  You will be unassigned.
                  {isAdminQueue(escalateRole) ? ' Support Moderators will no longer see this ticket.' : ''}
                </span>
              </>
            }
            confirmLabel="Move ticket"
            busyLabel="Moving…"
            busy={saving}
            confirmClassName={BTN.warn}
            onCancel={() => setConfirmEscalate(false)}
            onConfirm={() => void escalateTo(escalateRole, escalateType, isAdminQueue(escalateRole))}
          />
        )}

        {confirmEscalateAdmin && allowEscalateToAdmin && (
          <ConfirmDialog
            title="Hand this ticket to Admin?"
            description="It becomes an Admin ticket and you are unassigned. Support Moderators will no longer see it."
            confirmLabel="Escalate to Admin"
            busyLabel="Escalating…"
            busy={saving}
            confirmClassName={BTN.admin}
            onCancel={() => setConfirmEscalateAdmin(false)}
            onConfirm={() => void escalateToAdmin()}
          />
        )}

        {appealChoice && (
          <ConfirmDialog
            title={
              appealChoice === 'accept'
                ? 'Accept this appeal?'
                : appealChoice === 'deny_permanent'
                  ? 'Deny this appeal permanently?'
                  : 'Deny this appeal?'
            }
            description={
              appealChoice === 'accept'
                ? 'The penalty ends in 24 hours and the ticket closes.'
                : appealChoice === 'deny_permanent'
                  ? 'The ticket closes and this account can never appeal again.'
                  : 'The ticket closes. They can appeal again in 12 months.'
            }
            confirmLabel="Confirm"
            busyLabel="Saving…"
            busy={decidingAppeal}
            confirmClassName={appealChoice === 'accept' ? BTN.success : appealChoice === 'deny' ? BTN.warn : BTN.danger}
            onCancel={() => setAppealChoice(null)}
            onConfirm={() => void decideAppeal()}
          />
        )}
      </div>
    </div>
  );
}
