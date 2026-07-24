import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Loader2, MessageSquare, Send, X } from 'lucide-react';
import api from '@/lib/axios';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast.ts';
import type { TicketDetail } from './ticketTypes';
import {
  ticketTypeOf,
  ESCALATE_ROLE_OPTIONS,
  escalateTypesForRole,
  TICKET_TYPE_OPTIONS,
  TICKET_STATUS_OPTIONS,
  TICKET_PRIORITY_OPTIONS,
} from './ticketTypes';

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

const ACCENT: Record<string, { text: string; spin: string; btn: string; soft: string }> = {
  rose: {
    text: 'text-rose-400',
    spin: 'text-rose-400',
    btn: 'bg-rose-500/90 hover:bg-rose-500',
    soft: 'bg-rose-500/10 text-rose-200 border-rose-500/25',
  },
  sky: {
    text: 'text-sky-400',
    spin: 'text-sky-400',
    btn: 'bg-sky-500/90 hover:bg-sky-500',
    soft: 'bg-sky-500/10 text-sky-200 border-sky-500/25',
  },
  violet: {
    text: 'text-violet-400',
    spin: 'text-violet-400',
    btn: 'bg-violet-500/90 hover:bg-violet-500',
    soft: 'bg-violet-500/10 text-violet-200 border-violet-500/25',
  },
  emerald: {
    text: 'text-emerald-400',
    spin: 'text-emerald-400',
    btn: 'bg-emerald-500/90 hover:bg-emerald-500',
    soft: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/25',
  },
};

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
      {label}
      {children}
    </label>
  );
}

const selectCls =
  'rounded-lg border border-white/10 bg-[#0f1016] px-3 py-2 text-sm font-normal normal-case tracking-normal text-white outline-none focus:border-white/25';

/**
 * Shared ticket detail shell — left meta / right conversation.
 * Used by admin and all moderator desks.
 */
export default function TicketDetailModalShell({
  ticketId,
  endpointBase,
  accent = 'rose',
  allowEscalate = true,
  onClose,
  onUpdated,
}: {
  ticketId: number | string;
  endpointBase: string;
  accent?: keyof typeof ACCENT;
  allowEscalate?: boolean;
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
  const [ticketType, setTicketType] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [escalateRole, setEscalateRole] = useState<string>('Support Moderator');
  const [escalateType, setEscalateType] = useState<string>('');
  const threadEndRef = useRef<HTMLDivElement>(null);

  const escalateRoles = detail?.escalateRoles?.length
    ? detail.escalateRoles
    : [...ESCALATE_ROLE_OPTIONS];

  const escalateTypeOptions = useMemo(() => {
    const fromApi = detail?.escalateByRole?.[escalateRole];
    if (fromApi?.length) return fromApi;
    return escalateTypesForRole(escalateRole);
  }, [detail, escalateRole]);

  const allTypeOptions = useMemo(() => {
    const fromApi = detail?.types?.length ? detail.types : [...TICKET_TYPE_OPTIONS];
    return [...new Set([...fromApi, ticketType].filter(Boolean))];
  }, [detail, ticketType]);

  const statusOptions = detail?.statuses?.length ? detail.statuses : [...TICKET_STATUS_OPTIONS];
  const priorityOptions = detail?.priorities?.length ? detail.priorities : [...TICKET_PRIORITY_OPTIONS];

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
        setTicketType(t);
        setAssigneeId(data.ticket.assignee?.staffId?.toString() || '');
        const roles = data.escalateRoles?.length ? data.escalateRoles : [...ESCALATE_ROLE_OPTIONS];
        const role = roles[0];
        setEscalateRole(role);
        const opts = data.escalateByRole?.[role] || escalateTypesForRole(role);
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
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [detail?.messages?.length]);

  const onEscalateRoleChange = (role: string) => {
    setEscalateRole(role);
    syncEscalateType(role, ticketType);
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      await api.patch(`${endpointBase}/${ticketId}`, {
        status,
        priority,
        type: ticketType,
        handled_by_staff_id: assigneeId ? assigneeId : null,
      });
      showSuccessToast('Ticket updated');
      await load();
      onUpdated();
    } catch {
      showErrorToast('Failed to update ticket');
    } finally {
      setSaving(false);
    }
  };

  const escalateTo = async () => {
    const typeToUse = escalateTypeOptions.length === 1 ? escalateTypeOptions[0] : escalateType;
    if (!typeToUse?.trim()) {
      showErrorToast('Pick a type allowed for this queue');
      return;
    }
    if (!escalateTypeOptions.includes(typeToUse)) {
      showErrorToast(`${typeToUse} is not allowed for ${escalateRole}`);
      return;
    }
    setSaving(true);
    try {
      await api.patch(`${endpointBase}/${ticketId}`, {
        status: 'In Progress',
        assigned_role: escalateRole,
        type: typeToUse,
        handled_by_staff_id: null,
      });
      showSuccessToast(`Escalated to ${escalateRole}`);
      await load();
      onUpdated();
    } catch {
      showErrorToast('Failed to escalate ticket');
    } finally {
      setSaving(false);
    }
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
    } catch {
      showErrorToast('Failed to send message');
    } finally {
      setSaving(false);
    }
  };

  const t = detail?.ticket;
  const typeMeta = detail?.typeDetails?.find((d) => d.label === ticketType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-5">
      <div className="flex h-[min(92vh,920px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c0d12] shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${tone.text}`}>Ticket detail</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-bold text-white">{t?.number || `TKT-${ticketId}`}</h2>
              {t?.isEscalated && (
                <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-[10px] font-medium text-violet-200">
                  Escalated{t.escalatedBy?.name ? ` · ${t.escalatedBy.name}` : ''}
                </span>
              )}
              {t?.waitingForResponse && (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-medium text-amber-200">
                  Awaiting reply
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
                  <Field label="Status">
                    <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
                      {statusOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
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
                  <Field label="Type">
                    <select value={ticketType} onChange={(e) => setTicketType(e.target.value)} className={selectCls}>
                      {allTypeOptions.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    {typeMeta?.description && (
                      <span className="mt-1 text-[11px] font-normal normal-case tracking-normal text-zinc-500">
                        {typeMeta.description}
                      </span>
                    )}
                  </Field>
                  <Field label="Assignee">
                    <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className={selectCls}>
                      <option value="">Unassigned</option>
                      {detail.assignableStaff.map((s) => (
                        <option key={s.staffId} value={s.staffId}>
                          {s.name} ({s.role})
                        </option>
                      ))}
                    </select>
                  </Field>
                  <button
                    type="button"
                    onClick={() => void saveChanges()}
                    disabled={saving}
                    className={`mt-1 w-full rounded-xl px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 ${tone.btn}`}
                  >
                    Save changes
                  </button>
                </section>

                {allowEscalate && (
                  <section className="space-y-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-200/80">Escalate</p>
                      <p className="mt-1 text-[11px] text-zinc-500">
                        Queue role decides which types appear below — Marketplace only shows Asset Marketplace.
                      </p>
                    </div>
                    <Field label="Queue">
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
                    <Field label="Type for this queue">
                      {escalateTypeOptions.length <= 1 ? (
                        <div className="rounded-lg border border-amber-500/25 bg-[#0f1016] px-3 py-2 text-sm text-amber-100">
                          {escalateTypeOptions[0] || '—'}
                        </div>
                      ) : (
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
                      )}
                    </Field>
                    <button
                      type="button"
                      onClick={() => void escalateTo()}
                      disabled={saving || !escalateTypeOptions.length}
                      className="w-full rounded-xl border border-amber-500/40 px-4 py-2.5 text-sm font-medium text-amber-100 hover:bg-amber-500/10 disabled:opacity-50"
                    >
                      Escalate to {escalateRole}
                    </button>
                  </section>
                )}
              </div>
            </aside>

            {/* RIGHT — conversation */}
            <section className="flex min-h-0 flex-col bg-[#0a0b0f]">
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-white">
                  <MessageSquare className={`h-4 w-4 ${tone.text}`} />
                  Conversation
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
                    {detail.messages.length}
                  </span>
                </p>
                {t.lastMessageAt && (
                  <p className="text-[11px] text-zinc-600">Last {formatDateTime(t.lastMessageAt)}</p>
                )}
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {detail.chatAvailable === false && (
                  <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
                    MongoDB is not connected — chats unavailable until MONGODB_URI is set. Status updates still work.
                  </p>
                )}
                {detail.messages.length === 0 && detail.chatAvailable !== false && (
                  <div className="flex h-full min-h-[160px] flex-col items-center justify-center text-center">
                    <MessageSquare className="mb-2 h-8 w-8 text-zinc-700" />
                    <p className="text-sm text-zinc-500">No messages yet</p>
                    <p className="mt-1 text-xs text-zinc-600">Start the thread with a reply below.</p>
                  </div>
                )}
                {detail.messages.map((m) => {
                  const isStaff = m.authorType === 'staff';
                  return (
                    <div
                      key={m.id}
                      className={`flex ${isStaff ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl border px-3.5 py-2.5 ${
                          m.isInternal
                            ? 'border-amber-500/25 bg-amber-500/10'
                            : isStaff
                              ? `border-white/10 ${tone.soft}`
                              : 'border-white/10 bg-[#14151c]'
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-zinc-500">
                          <span className="font-medium text-zinc-300">{m.authorName}</span>
                          <span>·</span>
                          <span>{m.authorType}</span>
                          {m.isInternal && <span className="text-amber-300">· internal</span>}
                          <span className="ml-auto text-zinc-600">{formatDateTime(m.createdAt)}</span>
                        </div>
                        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-zinc-100">{m.body}</p>
                      </div>
                    </div>
                  );
                })}
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
                    Internal note (hidden from requester)
                  </label>
                  <button
                    type="button"
                    onClick={() => void sendReply()}
                    disabled={saving || !reply.trim() || detail.chatAvailable === false}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${tone.btn}`}
                  >
                    <Send className="h-3.5 w-3.5" />
                    Send
                  </button>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <p className="py-16 text-center text-zinc-500">Ticket not found.</p>
        )}
      </div>
    </div>
  );
}
