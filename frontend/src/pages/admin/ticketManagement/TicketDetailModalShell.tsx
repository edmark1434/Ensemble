import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CornerDownRight, FileText, Hand, Loader2, Lock, MessageSquare, Paperclip, Send, ShieldAlert, Trash2, UserMinus, UserPlus, UserRound, X } from 'lucide-react';
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

function apiErrorMessage(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback
  );
}

const HANDLER_ACTION_BTN =
  'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm disabled:opacity-50';
const HANDLER_ACTION_ICON = 'h-4 w-4 shrink-0';
const ADMIN_ESCALATE_BTN =
  'border-violet-500/30 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20';

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function shortId(value: string | number | null | undefined) {
  if (value == null || value === '') return '—';
  const s = String(value);
  return s.length > 12 ? `${s.slice(0, 10)}…` : s;
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
  onReply: () => void;
  onJumpToReply: (messageId: string) => void;
  onDelete: () => Promise<void>;
  onToggleInternal: (isInternal: boolean) => Promise<void>;
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
      ? 'border-amber-500/30 bg-gradient-to-br from-amber-500/15 to-amber-500/[0.04]'
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
          {!message.isUnsent && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                disabled={busy}
                onClick={onReply}
                className="inline-flex items-center gap-1 rounded-lg border border-sky-400/30 px-2 py-1 text-[11px] text-sky-100 hover:bg-sky-500/10 disabled:opacity-50"
              >
                <CornerDownRight className="h-3 w-3" />
                Reply
              </button>
              {(own || staffReply) && own && !confirmDelete && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[11px] text-zinc-300 hover:bg-white/5 disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              )}
              {own && confirmDelete && (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onDelete()}
                    className="rounded-lg border border-red-500/40 bg-red-500/15 px-2 py-1 text-[11px] text-red-100 disabled:opacity-50"
                  >
                    Delete reply
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-zinc-400"
                  >
                    Cancel
                  </button>
                </>
              )}
              {staffReply && !message.isUnsent && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onToggleInternal(!message.isInternal)}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 px-2 py-1 text-[11px] text-amber-100 hover:bg-amber-500/10 disabled:opacity-50"
                >
                  <Lock className="h-3 w-3" />
                  {message.isInternal ? 'Show to member' : 'Internal note'}
                </button>
              )}
            </div>
          )}
        </div>
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

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-zinc-500">{label}</span>
      {children}
      {hint ? <span className="text-[11px] text-zinc-600">{hint}</span> : null}
    </div>
  );
}

const selectCls =
  'rounded-lg border border-white/10 bg-[#0f1016] px-3 py-2 text-sm text-white outline-none focus:border-white/25';

function statusButtonClass(label: string, active: boolean) {
  const s = label.toLowerCase().replace(/_/g, ' ');
  if (!active) {
    return 'border-white/10 bg-transparent text-zinc-400 hover:border-white/20 hover:bg-white/[0.04] hover:text-zinc-200';
  }
  if (s === 'open') return 'border-red-500/40 bg-red-500/20 text-red-200';
  if (s === 'in progress') return 'border-amber-500/40 bg-amber-500/20 text-amber-200';
  if (s === 'escalated to dev') return 'border-sky-500/40 bg-sky-500/20 text-sky-200';
  if (s === 'resolved') return 'border-emerald-500/40 bg-emerald-500/20 text-emerald-200';
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
  const [confirmPerson, setConfirmPerson] = useState<{
    accountId: string;
    name: string;
    handle: string;
    email: string;
    kind: 'user' | 'staff';
    role: string;
  } | null>(null);
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

  const statusOptions = detail?.statuses?.length ? detail.statuses : [...TICKET_STATUS_OPTIONS];
  const priorityOptions = detail?.priorities?.length ? detail.priorities : [...TICKET_PRIORITY_OPTIONS];
  const perms = detail?.permissions;
  const myStaffId = perms?.staffId != null ? String(perms.staffId) : '';
  const ticketAssigneeId =
    detail?.ticket?.assignee?.staffId != null ? String(detail.ticket.assignee.staffId) : '';
  const alreadyAssignedToMe = Boolean(
    perms?.isAssignee ||
      (myStaffId && ticketAssigneeId && myStaffId.toLowerCase() === ticketAssigneeId.toLowerCase())
  );
  const canAssignMyself = Boolean(
    !alreadyAssignedToMe &&
      (perms?.canAssignMyself || perms?.canSelfAssign)
  );
  const canRelease = Boolean(alreadyAssignedToMe || perms?.canRelease || perms?.isAssignee);
  const canEscalate = Boolean(perms?.canEscalate || alreadyAssignedToMe || perms?.isAdmin);
  const isAdmin = Boolean(perms?.isAdmin);
  /** Locked for non-admins once someone is assigned; Admin may reassign anytime */
  const assigneeLocked = Boolean(ticketAssigneeId) && !Boolean(perms?.canAssignOthers || isAdmin);

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

    const appendLiveMessage = (message: { conversation_id?: string }) => {
      if (String(message?.conversation_id || '') !== String(chatId)) return;
      const mapped = fromSocketMessage(message);
      if (mapped) placeMessage(mapped);
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

    return () => {
      socket.off('connect', joinTicketRoom);
      socket.off('newMessage', appendLiveMessage);
      socket.off('messageReplied', appendLiveMessage);
      socket.off('ticketInternalMessage', appendLiveMessage);
      socket.off('messageDeleted', markDeleted);
      socket.emit('leaveRoom', { conversation_id: String(chatId) });
    };
    // The room changes only when another ticket is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.chatId, ticketId, endpointBase]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [detail?.messages?.length]);

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
        status: 'In Progress',
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

  const sendReply = async () => {
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
  const typeMeta = detail?.typeDetails?.find((d) => d.label === currentType);
  const escalateTypeMeta = detail?.typeDetails?.find((d) => d.label === escalateType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-5">
      <div className="relative flex h-[min(92vh,920px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c0d12] shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${tone.text}`}>Ticket detail</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-bold text-white">{t?.number || `TKT-${ticketId}`}</h2>
              {t?.type && (
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-medium text-zinc-300">
                  {ticketTypeOf(t)}
                </span>
              )}
              {t?.isEscalated && (
                <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-[10px] font-medium text-violet-200">
                  {formatEscalatedLabel(t)}
                </span>
              )}
              {t?.waitingForResponse && (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-medium text-amber-200">
                  Awaiting Reply
                </span>
              )}
            </div>
            <p className="mt-1 truncate text-sm text-zinc-400">{t?.subject}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className={`h-8 w-8 animate-spin ${tone.spin}`} />
          </div>
        ) : detail && t ? (
          <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
            {/* LEFT — meta */}
            <aside className="flex min-h-0 flex-col border-b border-white/10 lg:border-b-0 lg:border-r">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
                <section className="rounded-xl border border-white/10 bg-[#14151c] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Requester</p>
                  <p className="mt-1.5 text-base font-semibold text-white">{t.requester.name}</p>
                  <dl className="mt-3 space-y-2 text-xs text-zinc-400">
                    <div className="flex justify-between gap-3">
                      <dt className="text-zinc-600">Handle</dt>
                      <dd>@{t.requester.username || '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-zinc-600">Email</dt>
                      <dd className="truncate text-right">{t.requester.email || '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-zinc-600">Account</dt>
                      <dd className="font-mono text-[11px]">{shortId(t.requester.accountId)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-zinc-600">User</dt>
                      <dd className="font-mono text-[11px]">{shortId(t.requester.userId)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-zinc-600">Opened</dt>
                      <dd>{formatDateTime(t.createdAt)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-zinc-600">Updated</dt>
                      <dd>{formatDateTime(t.updatedAt)}</dd>
                    </div>
                  </dl>
                </section>

                <section className="space-y-3 rounded-xl border border-white/10 bg-[#14151c] p-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Involved</p>
                    <p className="mt-1 text-[11px] text-zinc-500">People who joined this ticket and sent a reply.</p>
                  </div>
                  {(detail.involved || []).length === 0 ? (
                    <p className="text-xs text-zinc-500">No one has replied yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {(detail.involved || []).map((person) => (
                        <li key={`involved-${person.accountId}`} className="rounded-lg border border-white/10 px-3 py-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-white">{person.name}</p>
                              <p className="truncate text-[11px] text-zinc-500">
                                {person.handle ? `@${person.handle}` : 'No handle'}
                                {person.isRequester ? ' · Opened ticket' : ''}
                                {person.isStaff ? ' · Staff' : ''}
                                {person.status !== 'active' ? ' · Removed' : ''}
                              </p>
                            </div>
                            <p className="shrink-0 text-[11px] text-zinc-400">
                              {person.replyCount} {person.replyCount === 1 ? 'reply' : 'replies'}
                            </p>
                          </div>
                          <p className="mt-1 text-[11px] text-zinc-600">Last reply {formatDateTime(person.lastReplyAt)}</p>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="border-t border-white/10 pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">On this ticket</p>
                    <ul className="mt-2 space-y-1.5">
                      {(detail.participants || []).map((person) => (
                        <li key={`member-${person.accountId}`} className="flex items-center justify-between gap-2 text-xs">
                          <span className="min-w-0 truncate text-zinc-300">
                            {person.name}
                            <span className="text-zinc-600">
                              {person.isRequester ? ' · requester' : person.isStaff ? ' · staff' : ''}
                            </span>
                          </span>
                          {detail.canManageParticipants && !person.isRequester && person.status === 'active' ? (
                            <button
                              type="button"
                              disabled={personBusy}
                              onClick={() => void changeParticipant(person.accountId, 'remove')}
                              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[11px] text-zinc-300 hover:bg-white/5 disabled:opacity-50"
                            >
                              <UserMinus className="h-3 w-3" />
                              Remove
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                    {detail.canManageParticipants ? (
                      <p className="mt-2 text-[11px] text-zinc-600">The person who opened the ticket stays on it.</p>
                    ) : null}
                  </div>

                  {(detail.pendingInvites || []).length > 0 && (
                    <div className="border-t border-white/10 pt-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-200/80">Waiting to accept</p>
                      <ul className="mt-2 space-y-1.5">
                        {detail.pendingInvites!.map((person) => (
                          <li key={`invite-${person.accountId}`} className="flex items-center justify-between gap-2 text-xs">
                            <span className="min-w-0 truncate text-zinc-300">
                              {person.name}
                              <span className="text-zinc-600">{person.handle ? ` · @${person.handle}` : ''}</span>
                            </span>
                            {detail.canManageParticipants ? (
                              <button
                                type="button"
                                disabled={personBusy}
                                onClick={() => void changeParticipant(person.accountId, 'remove')}
                                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[11px] text-zinc-300 hover:bg-white/5 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {detail.canManageParticipants && (
                    <div className="space-y-2">
                      <label className="block text-[11px] text-zinc-500" htmlFor="ticket-add-user">
                        Add a moderator or member
                      </label>
                      <input
                        id="ticket-add-user"
                        value={personQuery}
                        onChange={(event) => setPersonQuery(event.target.value)}
                        placeholder="Name, @handle, or email"
                        autoComplete="off"
                        className="w-full rounded-lg border border-white/10 bg-[#0f1016] px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/25"
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
                                  className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2 text-left text-xs hover:bg-white/5 disabled:opacity-50"
                                >
                                  <span className="min-w-0">
                                    <span className="block truncate text-white">{person.name}</span>
                                    <span className="block truncate text-zinc-500">
                                      {person.handle || 'No handle'}
                                      {person.email ? ` · ${person.email}` : ''}
                                    </span>
                                  </span>
                                  <span className="inline-flex shrink-0 flex-col items-end gap-1 text-zinc-300">
                                    <span className={`rounded-full border px-2 py-0.5 text-[10px] ${person.kind === 'staff' ? 'border-violet-400/40 text-violet-200' : 'border-white/15 text-zinc-400'}`}>
                                      {person.role}
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                      <UserPlus className="h-3.5 w-3.5" />
                                      {alreadyOnTicket ? 'On ticket' : alreadyInvited ? 'Invited' : 'Add'}
                                    </span>
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
                    </div>
                  )}
                </section>

                {detail.payments && (
                  <section className="space-y-2 rounded-xl border border-white/10 bg-[#14151c] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Payments</p>
                    <p className="text-[11px] text-zinc-500">Provider payments and credit movements for this account.</p>
                    {detail.payments.payments.length === 0 && detail.payments.credits.length === 0 && (detail.payments.cashouts || []).length === 0 && (
                      <p className="text-xs text-zinc-500">No payment records yet.</p>
                    )}
                    {(detail.payments.cashouts || []).map((cashout) => (
                      <div key={cashout.id} className="rounded-lg border border-white/10 px-3 py-2 text-xs">
                        <p className="text-white">Withdrawal {cashout.status} · {cashout.credits} credits</p>
                        <p className="text-zinc-500">
                          {cashout.channel || 'Payout'}
                          {cashout.accountLast4 ? ` · ••••${cashout.accountLast4}` : ''}
                          {cashout.failureCode ? ` · ${cashout.failureCode}` : ''}
                          {' · '}{formatDateTime(cashout.createdAt)}
                        </p>
                      </div>
                    ))}
                    {detail.payments.payments.map((payment) => (
                      <div key={payment.id} className="rounded-lg border border-white/10 px-3 py-2 text-xs">
                        <p className="text-white">{payment.status} · {payment.currency} {payment.amount}</p>
                        <p className="text-zinc-500">{payment.type || 'Payment'} · {payment.credits} credits · {formatDateTime(payment.createdAt)}</p>
                      </div>
                    ))}
                    {detail.payments.credits.map((credit) => (
                      <div key={credit.id} className="rounded-lg border border-white/10 px-3 py-2 text-xs">
                        <p className="text-white">{credit.type} · {credit.amount} credits</p>
                        <p className="text-zinc-500">{credit.status} · {formatDateTime(credit.createdAt)}</p>
                      </div>
                    ))}
                  </section>
                )}

                {detail.canAdjustCredits && (
                  <section className="space-y-2 rounded-xl border border-white/10 bg-[#14151c] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Credit change</p>
                    <p className="text-[11px] text-zinc-500">Admin and Support only. The note is stored on this ticket.</p>
                    <input
                      value={creditAmount}
                      onChange={(event) => setCreditAmount(event.target.value)}
                      placeholder="Amount, use minus to deduct"
                      className="w-full rounded-lg border border-white/10 bg-[#0f1016] px-3 py-2 text-sm text-white"
                    />
                    <textarea
                      value={creditNote}
                      onChange={(event) => setCreditNote(event.target.value)}
                      rows={2}
                      placeholder="Why this payment change is being made"
                      className="w-full resize-none rounded-lg border border-white/10 bg-[#0f1016] px-3 py-2 text-sm text-white"
                    />
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void applyCreditChange()}
                      className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white"
                    >
                      Record on ticket
                    </button>
                  </section>
                )}

                {(detail.timeline || []).length > 0 && (
                  <section className="space-y-2 rounded-xl border border-white/10 bg-[#14151c] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Audit</p>
                    {detail.timeline!.slice(0, 12).map((entry) => (
                      <div key={entry.id} className="text-xs">
                        <p className="text-zinc-200">{entry.summary}</p>
                        <p className="text-zinc-600">
                          {entry.kind === 'account' ? 'Account' : 'Ticket'} · {entry.actorName || 'Staff'}
                          {entry.actorRole ? ` · ${entry.actorRole}` : ''} · {formatDateTime(entry.createdAt)}
                        </p>
                      </div>
                    ))}
                  </section>
                )}

                <section className="space-y-3 rounded-xl border border-white/10 bg-[#14151c] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Ticket fields</p>
                  <div className="rounded-lg border border-white/10 bg-[#0f1016] px-3 py-2.5">
                    <p className="text-[11px] text-zinc-500">Current Type</p>
                    <p className="mt-0.5 text-sm font-medium text-white">{currentType || '—'}</p>
                    {typeMeta?.description && (
                      <p className="mt-1 text-[11px] text-zinc-600">{typeMeta.description}</p>
                    )}
                    <p className="mt-1.5 text-[11px] text-zinc-600">
                      {typeMeta?.subgroup ? `${typeMeta.group} · ${typeMeta.subgroup}. ` : ''}
                      Any moderator can move this ticket to another group below.
                    </p>
                  </div>
                  {(detail.formValues || []).length > 0 && (
                    <div className="space-y-2">
                      {(detail.formValues || []).map((answer) => (
                        <div key={answer.key} className="rounded-lg border border-white/10 bg-[#0f1016] px-3 py-2.5">
                          <p className="text-[11px] text-zinc-500">{answer.label}</p>
                          <p className="mt-0.5 text-sm text-white">{answer.value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <Field label="Status">
                    {statusControl === 'buttons' ? (
                      <div
                        className="flex flex-wrap gap-1.5"
                        role="group"
                        aria-label="Ticket status"
                      >
                        {statusOptions.map((s) => {
                          const active =
                            status.toLowerCase().replace(/_/g, ' ') ===
                            s.toLowerCase().replace(/_/g, ' ');
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setStatus(s)}
                              aria-pressed={active}
                              className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${statusButtonClass(s, active)}`}
                            >
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className={selectCls}
                      >
                        {statusOptions.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                  <Field label="Priority">
                    <select value={priority} onChange={(e) => setPriority(e.target.value)} className={selectCls}>
                      {priorityOptions.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Assignee">
                    <select
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                      disabled={assigneeLocked}
                      className={`${selectCls} disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      <option value="">Unassigned</option>
                      {detail.assignableStaff
                        .filter((s) => {
                          if (!myStaffId) return true;
                          const isMe =
                            String(s.staffId).toLowerCase() === myStaffId.toLowerCase();
                          // Keep current handler visible while locked; otherwise use Assign myself.
                          return !isMe || (assigneeLocked && alreadyAssignedToMe);
                        })
                        .map((s) => (
                          <option key={s.staffId} value={s.staffId}>
                            {s.name} ({s.role})
                            {myStaffId &&
                            String(s.staffId).toLowerCase() === myStaffId.toLowerCase()
                              ? ' (you)'
                              : ''}
                          </option>
                        ))}
                    </select>
                    {assigneeLocked && (
                      <p className="mt-1 text-[11px] text-zinc-500">
                        Handler is locked. The assigned moderator must release the case before it can
                        be claimed by someone else.
                      </p>
                    )}
                    {!assigneeLocked && ticketAssigneeId && (perms?.canAssignOthers || isAdmin) && (
                      <p className="mt-1 text-[11px] text-violet-300/80">
                        Admin override: you can reassign this ticket without a release.
                      </p>
                    )}
                  </Field>
                  {canAssignMyself && (
                    <button
                      type="button"
                      onClick={() => void assignMyself()}
                      disabled={saving}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/15 px-4 py-2.5 text-sm font-medium text-sky-100 hover:bg-sky-500/25 disabled:opacity-50"
                    >
                      <Hand className="h-4 w-4" />
                      Assign myself
                    </button>
                  )}
                  {canRelease && (
                    <button
                      type="button"
                      onClick={() => void releaseCase()}
                      disabled={saving}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-100 hover:bg-amber-500/20 disabled:opacity-50"
                    >
                      Release case
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void saveChanges()}
                    disabled={saving}
                    className={`mt-1 w-full rounded-xl px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 ${tone.btn}`}
                  >
                    Save changes
                  </button>
                </section>

                {allowEscalate && canEscalate && (
                  <section className="space-y-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
                    <div>
                      <p className="text-[10px] font-semibold tracking-wide text-amber-200/80">Move to another group</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                        {allowEscalateToAdmin
                          ? 'Any moderator can move this ticket to the right group and type. Moving it unassigns the current handler. Use Escalated to Dev when engineering needs to fix it without closing the ticket.'
                          : 'Any moderator can move this ticket to the right group and type. Moving it unassigns the current handler.'}
                      </p>
                    </div>
                    {allowEscalateToAdmin && (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => setConfirmEscalateAdmin(true)}
                        className={`${HANDLER_ACTION_BTN} ${ADMIN_ESCALATE_BTN} w-full justify-center`}
                      >
                        <ShieldAlert className={HANDLER_ACTION_ICON} />
                        Escalate to Admin
                      </button>
                    )}
                    <div className={allowEscalateToAdmin ? 'border-t border-white/5 pt-3' : undefined}>
                      <p className="mb-2 text-[11px] font-medium text-zinc-500">Moderator group</p>
                      <div className="space-y-3">
                        <Field label="Moderator Queue">
                          <select
                            value={escalateRole}
                            onChange={(e) => onEscalateRoleChange(e.target.value)}
                            className={`${selectCls} border-amber-500/25 text-amber-100`}
                          >
                            {escalateRoles.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field
                          label="Type"
                          hint={
                            escalateTypeMeta?.description ||
                            `${escalateTypeOptions.length} type${escalateTypeOptions.length === 1 ? '' : 's'} for ${escalateRole}`
                          }
                        >
                          <select
                            value={escalateType}
                            onChange={(e) => setEscalateType(e.target.value)}
                            className={`${selectCls} border-amber-500/25 text-amber-100`}
                          >
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
                        </Field>
                        <button
                          type="button"
                          onClick={() => setConfirmEscalate(true)}
                          disabled={saving || !escalateType.trim() || !escalateTypeOptions.includes(escalateType)}
                          className="w-full rounded-xl border border-amber-500/40 px-4 py-2.5 text-sm font-medium text-amber-100 hover:bg-amber-500/10 disabled:opacity-50"
                        >
                          Move to this group
                        </button>
                      </div>
                    </div>
                  </section>
                )}
                {allowEscalate && !canEscalate && (
                  <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <p className="text-[10px] font-semibold tracking-wide text-zinc-500">Escalate</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                      Sign in as a moderator or admin to move this ticket.
                    </p>
                  </section>
                )}
              </div>
            </aside>

            {/* RIGHT — conversation */}
            <section className="flex min-h-0 flex-col bg-[#0a0b0f]">
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="flex items-center gap-2 text-sm font-semibold text-white">
                    <MessageSquare className={`h-4 w-4 ${tone.text}`} />
                    Conversation
                  </p>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
                    {detail.messages.length} message{detail.messages.length === 1 ? '' : 's'}
                  </span>
                  {t.waitingForResponse && (
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-200">
                      Awaiting Reply
                    </span>
                  )}
                </div>
                {t.lastMessageAt && (
                  <p className="text-[11px] text-zinc-600">Last {formatDateTime(t.lastMessageAt)}</p>
                )}
              </div>

              <div ref={threadRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
                {detail.chatAvailable === false && (
                  <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
                    MongoDB is not connected — chats unavailable until MONGODB_URI is set. Status updates still work.
                  </p>
                )}
                {detail.messages.length === 0 && detail.chatAvailable !== false && (
                  <div className="flex h-full min-h-40 flex-col items-center justify-center text-center">
                    <MessageSquare className="mb-2 h-8 w-8 text-zinc-700" />
                    <p className="text-sm text-zinc-500">No messages yet</p>
                    <p className="mt-1 text-xs text-zinc-600">Start the thread with a reply below.</p>
                  </div>
                )}
                {detail.messages.map((m) => (
                  String(m.authorType).toLowerCase() === 'system' ? (
                    <p key={m.id} className="py-1 text-center text-[11px] text-zinc-500">
                      {m.body}
                      <span className="ml-2 text-zinc-600">{formatDateTime(m.createdAt)}</span>
                    </p>
                  ) : (
                    <MessageBubble
                      key={m.id}
                      message={m}
                      accentSoft={tone.soft}
                      own={Boolean(viewerAccountId) && String(m.senderId || '') === String(viewerAccountId)}
                      busy={saving}
                      replyQuote={quoteFor(m.replyToId)}
                      onReply={() => setReplyTarget(m)}
                      onJumpToReply={jumpToMessage}
                      onDelete={() => removeMessage(m.id)}
                      onToggleInternal={(isInternal) => changeMessage(m.id, { isInternal })}
                    />
                  )
                ))}
                <div ref={threadEndRef} />
              </div>

              <div className="shrink-0 border-t border-white/10 bg-[#0f1016] p-4">
                {(() => {
                  const thread = (detail.messages || []).filter(
                    (message) =>
                      !message.isInternal &&
                      !message.isUnsent &&
                      String(message.authorType).toLowerCase() !== 'system'
                  );
                  const showGuides = thread.length <= 1 && (detail.articles || []).length > 0;
                  if (!showGuides) return null;
                  return (
                    <div className="mb-3 rounded-xl border border-sky-400/40 bg-sky-500/10 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-200">Reply guides</p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-3">
                        {detail.articles!.slice(0, 3).map((article) => (
                          <button
                            key={article.id}
                            type="button"
                            onClick={() => setReply(article.body)}
                            className="rounded-lg border border-sky-300/30 bg-sky-400/10 px-3 py-2 text-left text-xs text-sky-50 hover:bg-sky-400/20"
                          >
                            <span className="font-semibold text-white">{article.title}</span>
                            <span className="mt-1 line-clamp-3 block text-sky-100/80">{article.body}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                {replyTarget && (
                  <div className="mb-2 flex items-start gap-2 rounded-lg border border-sky-400/40 bg-sky-500/10 px-3 py-2">
                    <CornerDownRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-300" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-200">
                        Replying to {replyTarget.authorName}
                      </p>
                      <p className="truncate text-xs text-sky-50">{replyTarget.body || 'Attachment'}</p>
                    </div>
                    <button type="button" onClick={() => setReplyTarget(null)} aria-label="Cancel reply" className="text-sky-100">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={3}
                  placeholder="Write a reply or internal note…"
                  disabled={detail.chatAvailable === false}
                  className="w-full resize-none rounded-xl border border-white/10 bg-[#14151c] px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/25 disabled:opacity-50"
                />
                {screenshots.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {screenshots.map((file) => (
                      <span key={file.key} className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-[11px] text-zinc-300">
                        {file.name}
                        <button type="button" onClick={() => setScreenshots((current) => current.filter((item) => item.key !== file.key))} aria-label="Remove screenshot">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-xs text-zinc-400">
                    <input
                      type="checkbox"
                      checked={internalNote}
                      onChange={(e) => setInternalNote(e.target.checked)}
                      disabled={detail.chatAvailable === false}
                    />
                    Internal Note (hidden from requester)
                  </label>
                  <div className="flex items-center gap-2">
                    <label
                      title="Attach a file"
                      className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-white/10 text-zinc-300 hover:bg-white/5"
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
                  <button
                    type="button"
                    onClick={() => void sendReply()}
                    disabled={saving || (!reply.trim() && screenshots.length === 0) || detail.chatAvailable === false}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${tone.btn}`}
                  >
                    <Send className="h-3.5 w-3.5" />
                    {internalNote ? 'Add Note' : 'Send Reply'}
                  </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <p className="py-16 text-center text-zinc-500">Ticket not found.</p>
        )}

        {confirmPerson && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-2xl border border-sky-500/30 bg-[#14151c] p-5 shadow-2xl">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-200/80">Confirm add</p>
              <h3 className="mt-2 text-lg font-semibold text-white">Add {confirmPerson.name}?</h3>
              <p className="mt-2 text-sm text-zinc-400">
                {confirmPerson.kind === 'staff'
                  ? 'Staff are added immediately and can open this ticket.'
                  : 'They get a notification and have to accept before they can open this ticket.'}
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                {confirmPerson.handle || 'No handle'}
                {confirmPerson.email ? ` · ${confirmPerson.email}` : ''}
                {` · ${confirmPerson.role}`}
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={personBusy}
                  onClick={() => setConfirmPerson(null)}
                  className="rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={personBusy}
                  onClick={() => void changeParticipant(confirmPerson.accountId, 'add')}
                  className="rounded-xl bg-sky-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {personBusy ? 'Adding…' : confirmPerson.kind === 'staff' ? 'Add staff' : 'Send invite'}
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmEscalate && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-[#14151c] p-5 shadow-2xl">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-200/80">Confirm Escalate</p>
              <h3 className="mt-2 text-lg font-semibold text-white">Escalate this ticket?</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Queue: <span className="text-amber-100">{escalateRole}</span>
                <br />
                Type: <span className="text-amber-100">{escalateType}</span>
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                You will be unassigned. Type changes only through escalate.
                {isAdminQueue(escalateRole) ? ' Support Moderators will no longer see this ticket.' : ''}
              </p>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmEscalate(false)}
                  disabled={saving}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void escalateTo(escalateRole, escalateType, isAdminQueue(escalateRole))}
                  disabled={saving}
                  className="rounded-xl border border-amber-500/40 bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-100 hover:bg-amber-500/25 disabled:opacity-50"
                >
                  {saving ? 'Escalating…' : 'Confirm Escalate'}
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmEscalateAdmin && allowEscalateToAdmin && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-2xl border border-violet-500/30 bg-[#14151c] p-5 shadow-2xl">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-200/80">Escalate to Admin</p>
              <h3 className="mt-2 text-lg font-semibold text-white">Hand this ticket to Admin?</h3>
              <p className="mt-2 text-sm text-zinc-400">
                The ticket becomes an Admin ticket and you are unassigned. Support Moderators will no longer see it.
              </p>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmEscalateAdmin(false)}
                  disabled={saving}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void escalateToAdmin()}
                  disabled={saving}
                  className="rounded-xl border border-violet-500/40 bg-violet-500/15 px-4 py-2 text-sm font-medium text-violet-100 hover:bg-violet-500/25 disabled:opacity-50"
                >
                  {saving ? 'Escalating…' : 'Confirm escalate to Admin'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
