import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Hand, Loader2, Lock, MessageSquare, Send, ShieldAlert, UserRound, X } from 'lucide-react';
import api from '@/lib/axios';
import socket from '@/lib/socket';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast.ts';
import type { TicketDetail, TicketMessage } from './ticketTypes';
import {
  ticketTypeOf,
  ESCALATE_ROLE_OPTIONS,
  escalateTypesForRole,
  TICKET_STATUS_OPTIONS,
  TICKET_PRIORITY_OPTIONS,
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

function MessageBubble({
  message,
  accentSoft,
}: {
  message: TicketMessage;
  accentSoft: string;
}) {
  const kind = messageKind(message);
  const isStaffSide = kind === 'staff' || kind === 'internal';
  const displayName = titleCaseLabel(message.authorName);
  const roleLabel =
    kind === 'internal'
      ? 'Internal Note'
      : kind === 'staff'
        ? 'Staff'
        : 'Requester';

  const shell =
    kind === 'internal'
      ? 'border-amber-500/30 bg-gradient-to-br from-amber-500/15 to-amber-500/[0.04]'
      : kind === 'staff'
        ? `border-white/10 ${accentSoft}`
        : 'border-white/10 bg-[#14151c]';

  const avatar =
    kind === 'internal'
      ? 'bg-amber-500/20 text-amber-200 ring-amber-500/30'
      : kind === 'staff'
        ? 'bg-white/10 text-white ring-white/15'
        : 'bg-sky-500/15 text-sky-200 ring-sky-500/25';

  const tag =
    kind === 'internal'
      ? 'border-amber-400/40 bg-amber-500/20 text-amber-100'
      : kind === 'staff'
        ? 'border-white/20 bg-white/10 text-zinc-100'
        : 'border-sky-400/30 bg-sky-500/15 text-sky-100';

  return (
    <div className={`flex gap-2.5 ${isStaffSide ? 'flex-row-reverse' : 'flex-row'}`}>
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
        </div>

        <div className={`w-full rounded-2xl border px-3.5 py-2.5 shadow-sm ${shell} ${isStaffSide ? 'rounded-tr-md' : 'rounded-tl-md'}`}>
          {kind === 'internal' && (
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-amber-200/80">
              Visible to staff only
            </p>
          )}
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-100">{message.body}</p>
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
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reply, setReply] = useState('');
  const [internalNote, setInternalNote] = useState(false);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [currentType, setCurrentType] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [escalateRole, setEscalateRole] = useState<string>('Support Moderator');
  const [escalateType, setEscalateType] = useState<string>('');
  const [confirmEscalate, setConfirmEscalate] = useState(false);
  const [confirmEscalateAdmin, setConfirmEscalateAdmin] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const realtimeRefreshRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`${endpointBase}/${ticketId}`);
      if (res.data?.success) {
        const data = res.data.data as TicketDetail;
        setDetail(data);
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
      }
    } catch {
      showErrorToast('Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId, endpointBase]);

  useEffect(() => {
    const chatId = detail?.chatId;
    if (!chatId) return;

    const scheduleRefresh = () => {
      if (realtimeRefreshRef.current) {
        clearTimeout(realtimeRefreshRef.current);
      }
      realtimeRefreshRef.current = setTimeout(() => {
        realtimeRefreshRef.current = null;
        void load();
      }, 75);
    };
    const refreshTicketThread = (message: { conversation_id?: string }) => {
      if (String(message?.conversation_id) === String(chatId)) {
        scheduleRefresh();
      }
    };
    const refreshFromNotification = (notification: {
      reference_path?: string | null;
      reference_prefix?: string | null;
    }) => {
      const referencePath = String(notification?.reference_path || '');
      const referencePrefix = String(notification?.reference_prefix || '');
      if (
        referencePath.includes(`conversation=${chatId}`) &&
        (referencePrefix.includes('CHAT_') || referencePrefix.includes('TICKET_'))
      ) {
        scheduleRefresh();
      }
    };
    const joinTicketRoom = () => {
      socket.emit('joinRoom', { conversation_id: String(chatId) });
    };

    if (!socket.connected) socket.connect();
    joinTicketRoom();
    socket.on('connect', joinTicketRoom);
    socket.on('newMessage', refreshTicketThread);
    socket.on('messageReplied', refreshTicketThread);
    socket.on('conversationMessageNotification', refreshTicketThread);
    socket.on('ticketInternalMessage', refreshTicketThread);
    socket.on('notification', refreshFromNotification);

    return () => {
      socket.off('connect', joinTicketRoom);
      socket.off('newMessage', refreshTicketThread);
      socket.off('messageReplied', refreshTicketThread);
      socket.off('conversationMessageNotification', refreshTicketThread);
      socket.off('ticketInternalMessage', refreshTicketThread);
      socket.off('notification', refreshFromNotification);
      socket.emit('leaveRoom', { conversation_id: String(chatId) });
      if (realtimeRefreshRef.current) {
        clearTimeout(realtimeRefreshRef.current);
        realtimeRefreshRef.current = null;
      }
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
      showSuccessToast(`Escalated to ${role} as ${type}`);
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

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSaving(true);
    try {
      await api.post(`${endpointBase}/${ticketId}/messages`, {
        body: reply.trim(),
        isInternal: internalNote,
      });
      setReply('');
      showSuccessToast(internalNote ? 'Internal note added' : 'Reply sent');
      await load();
      onUpdated();
    } catch (err: unknown) {
      showErrorToast(apiErrorMessage(err, 'Failed to send message'));
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
                    <div className="flex justify-between gap-3">
                      <dt className="text-zinc-600">Channel</dt>
                      <dd className="capitalize">{t.channel || 'web'}</dd>
                    </div>
                  </dl>
                </section>

                <section className="space-y-3 rounded-xl border border-white/10 bg-[#14151c] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Ticket fields</p>
                  <div className="rounded-lg border border-white/10 bg-[#0f1016] px-3 py-2.5">
                    <p className="text-[11px] text-zinc-500">Current Type</p>
                    <p className="mt-0.5 text-sm font-medium text-white">{currentType || '—'}</p>
                    {typeMeta?.description && (
                      <p className="mt-1 text-[11px] text-zinc-600">{typeMeta.description}</p>
                    )}
                    <p className="mt-1.5 text-[11px] text-zinc-600">Type can only change when escalating.</p>
                  </div>
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
                      <p className="text-[10px] font-semibold tracking-wide text-amber-200/80">Escalate</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                        {allowEscalateToAdmin
                          ? 'Hand off to Admin, or move to the correct moderator queue and type. Escalating unassigns you automatically.'
                          : 'Move this ticket to the correct moderator queue and type when it belongs on another desk. Escalating unassigns you automatically.'}
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
                      <p className="mb-2 text-[11px] font-medium text-zinc-500">Escalate to moderator</p>
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
                            {escalateTypeOptions.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <button
                          type="button"
                          onClick={() => setConfirmEscalate(true)}
                          disabled={saving || !escalateType.trim() || !escalateTypeOptions.includes(escalateType)}
                          className="w-full rounded-xl border border-amber-500/40 px-4 py-2.5 text-sm font-medium text-amber-100 hover:bg-amber-500/10 disabled:opacity-50"
                        >
                          Escalate as {escalateType || '…'}
                        </button>
                      </div>
                    </div>
                  </section>
                )}
                {allowEscalate && !canEscalate && (
                  <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <p className="text-[10px] font-semibold tracking-wide text-zinc-500">Escalate</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                      {ticketAssigneeId
                        ? 'Only the assigned moderator can escalate this ticket.'
                        : 'Assign yourself to this ticket before escalating it.'}
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

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
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
                  <MessageBubble key={m.id} message={m} accentSoft={tone.soft} />
                ))}
                <div ref={threadEndRef} />
              </div>

              <div className="shrink-0 border-t border-white/10 bg-[#0f1016] p-4">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={3}
                  placeholder="Write a reply or internal note…"
                  disabled={detail.chatAvailable === false}
                  className="w-full resize-none rounded-xl border border-white/10 bg-[#14151c] px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/25 disabled:opacity-50"
                />
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
                  <button
                    type="button"
                    onClick={() => void sendReply()}
                    disabled={saving || !reply.trim() || detail.chatAvailable === false}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${tone.btn}`}
                  >
                    <Send className="h-3.5 w-3.5" />
                    {internalNote ? 'Add Note' : 'Send Reply'}
                  </button>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <p className="py-16 text-center text-zinc-500">Ticket not found.</p>
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
