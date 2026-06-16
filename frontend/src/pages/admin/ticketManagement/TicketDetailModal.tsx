import { useEffect, useState } from 'react';
import { Loader2, MessageSquare, X } from 'lucide-react';
import api from '@/lib/axios';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast.ts';
import type { TicketDetail } from './ticketTypes';

function formatDateTime(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export default function TicketDetailModal({
  ticketId,
  onClose,
  onUpdated,
}: {
  ticketId: number;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reply, setReply] = useState('');
  const [internalNote, setInternalNote] = useState(false);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [assigneeId, setAssigneeId] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/admin/tickets/${ticketId}`);
      if (res.data?.success) {
        setDetail(res.data.data);
        setStatus(res.data.data.ticket.status);
        setPriority(res.data.data.ticket.priority);
        setAssigneeId(res.data.data.ticket.assignee?.staffId?.toString() || '');
      }
    } catch {
      showErrorToast('Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [ticketId]);

  const saveChanges = async () => {
    setSaving(true);
    try {
      await api.patch(`/api/admin/tickets/${ticketId}`, {
        status,
        priority,
        assigned_staff_id: assigneeId ? Number(assigneeId) : null,
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

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSaving(true);
    try {
      await api.post(`/api/admin/tickets/${ticketId}/messages`, {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f1016] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-400">Ticket detail</p>
            <h2 className="text-lg font-bold text-white">{detail?.ticket.number || `TKT-${ticketId}`}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-rose-400" />
          </div>
        ) : detail ? (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div>
                <h3 className="text-xl font-semibold text-white">{detail.ticket.subject}</h3>
                <p className="mt-1 text-sm text-zinc-500">
                  {detail.ticket.requester.name} · @{detail.ticket.requester.username} · {detail.ticket.category} ·{' '}
                  {formatDateTime(detail.ticket.createdAt)}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="flex flex-col gap-1 text-xs text-zinc-500">
                  Status
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white"
                  >
                    {['open', 'in_progress', 'resolved', 'closed'].map((s) => (
                      <option key={s} value={s}>
                        {s.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-zinc-500">
                  Priority
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white"
                  >
                    {['low', 'medium', 'high'].map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-zinc-500">
                  Assignee
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white"
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

              <button
                type="button"
                onClick={() => void saveChanges()}
                disabled={saving}
                className="rounded-xl bg-rose-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-50"
              >
                Save ticket changes
              </button>

              <div className="space-y-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-white">
                  <MessageSquare className="h-4 w-4 text-rose-400" />
                  Conversation ({detail.messages.length})
                </p>
                {detail.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-xl border px-4 py-3 ${
                      m.isInternal ? 'border-amber-500/20 bg-amber-500/5' : 'border-white/10 bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span>
                        {m.authorName} · {m.authorType}
                        {m.isInternal && ' · internal'}
                      </span>
                      <span>{formatDateTime(m.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-200">{m.body}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-white/10 bg-[#14151c] p-4">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={3}
                  placeholder="Write a reply or internal note…"
                  className="w-full resize-none rounded-lg border border-white/10 bg-[#0f1016] px-3 py-2 text-sm text-white outline-none"
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-xs text-zinc-400">
                    <input type="checkbox" checked={internalNote} onChange={(e) => setInternalNote(e.target.checked)} />
                    Internal note (hidden from requester)
                  </label>
                  <button
                    type="button"
                    onClick={() => void sendReply()}
                    disabled={saving || !reply.trim()}
                    className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15 disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <p className="py-12 text-center text-zinc-500">Ticket not found.</p>
        )}
      </div>
    </div>
  );
}
