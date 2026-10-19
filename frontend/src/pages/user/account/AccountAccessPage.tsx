import { FormEvent, useEffect, useState } from 'react';
import api from '@/lib/axios';
import useGlobalState from '@/lib/global_state';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast';

type TicketRow = {
  id: string;
  number?: string;
  subject?: string;
  type?: string;
  status?: string;
  updatedAt?: string;
};

type TicketMessage = {
  id: string;
  authorName?: string;
  body?: string;
  createdAt?: string;
};

type DisputeRow = {
  id: string;
  number?: string;
  title?: string;
  status?: string;
  reason?: string;
  updatedAt?: string;
};

type DisputeMessage = {
  id: string;
  authorName?: string;
  body?: string;
  createdAt?: string;
};

function formatWhen(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
}

export default function AccountAccessPage() {
  const user = useGlobalState((state) => state.user);
  const restriction = user?.restriction;
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [openDisputeId, setOpenDisputeId] = useState<string | null>(null);
  const [disputeDetail, setDisputeDetail] = useState<{ reason?: string; messages: DisputeMessage[] } | null>(null);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [reply, setReply] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadLists() {
    const [ticketRes, disputeRes] = await Promise.all([
      api.get('/api/users/tickets'),
      api.get('/api/users/disputes'),
    ]);
    setTickets(ticketRes.data?.data || []);
    setDisputes(disputeRes.data?.data || []);
  }

  useEffect(() => {
    void loadLists().catch(() => {
      showErrorToast('Could not load your tickets and disputes.');
    });
  }, []);

  async function openTicket(id: string) {
    setOpenTicketId(id);
    setOpenDisputeId(null);
    const res = await api.get(`/api/users/tickets/${id}`);
    setTicketMessages(res.data?.data?.messages || []);
  }

  async function openDispute(id: string) {
    setOpenDisputeId(id);
    setOpenTicketId(null);
    const res = await api.get(`/api/users/disputes/${id}`);
    setDisputeDetail({
      reason: res.data?.data?.reason,
      messages: res.data?.data?.messages || [],
    });
  }

  async function submitAppeal(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post('/api/users/tickets', {
        subject: subject.trim(),
        description: description.trim(),
        type: 'Appeal an account penalty',
        category: 'Appeal an account penalty',
      });
      setSubject('');
      setDescription('');
      showSuccessToast('Appeal submitted.');
      await loadLists();
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showErrorToast(message || 'Could not submit the appeal.');
    } finally {
      setSaving(false);
    }
  }

  const selectedTicket = tickets.find((ticket) => ticket.id === openTicketId) || null;
  const ticketClosed = selectedTicket?.status === 'Closed' || selectedTicket?.status === 'Resolved';

  async function sendReply(event: FormEvent) {
    event.preventDefault();
    if (!openTicketId || !reply.trim() || ticketClosed) return;
    setSaving(true);
    try {
      await api.post(`/api/users/tickets/${openTicketId}/messages`, { body: reply.trim() });
      setReply('');
      await openTicket(openTicketId);
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showErrorToast(message || 'Could not send that reply.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <section className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">
          {String(restriction?.status || user?.status || '').toLowerCase() === 'locked' || restriction?.locked ? 'Locked' : 'Banned'}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
          {String(restriction?.status || user?.status || '').toLowerCase() === 'locked' || restriction?.locked
            ? 'Your account is locked'
            : 'Your account is banned'}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          {restriction?.message ||
            'You can sign in only to file an appeal and view your tickets and disputes.'}
        </p>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          {String(restriction?.status || user?.status || '').toLowerCase() === 'locked' || restriction?.locked
            ? 'Ask to unlock this account'
            : 'Appeal this ban'}
        </h2>
        <form className="mt-4 flex flex-col gap-3" onSubmit={submitAppeal}>
          <label className="text-sm text-zinc-600 dark:text-zinc-300">
            Subject
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-transparent px-3 py-2 text-sm dark:border-white/10"
            />
          </label>
          <label className="text-sm text-zinc-600 dark:text-zinc-300">
            What happened
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
              rows={5}
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-transparent px-3 py-2 text-sm dark:border-white/10"
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="self-start rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? 'Sending…' : 'Submit appeal'}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Your tickets</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {tickets.length === 0 ? <li className="text-sm text-zinc-500">No tickets yet.</li> : null}
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <button
                type="button"
                onClick={() => void openTicket(ticket.id)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-left text-sm dark:border-white/10"
              >
                <span className="font-medium text-zinc-900 dark:text-white">
                  {ticket.number || 'Ticket'} · {ticket.subject}
                </span>
                <span className="mt-1 block text-xs text-zinc-500">
                  {ticket.type} · {ticket.status} · {formatWhen(ticket.updatedAt)}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {openTicketId ? (
          <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-white/10">
            <ul className="flex flex-col gap-3">
              {ticketMessages.map((message) => (
                <li key={message.id} className="text-sm">
                  <p className="text-xs text-zinc-500">{message.authorName} · {formatWhen(message.createdAt)}</p>
                  <p className="mt-1 whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">{message.body}</p>
                </li>
              ))}
            </ul>
            {ticketClosed ? (
              <p className="mt-4 text-sm text-zinc-500">This ticket is closed. You cannot reply.</p>
            ) : (
            <form className="mt-4 flex flex-col gap-2" onSubmit={sendReply}>
              <textarea
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                rows={3}
                placeholder="Reply on this ticket"
                className="w-full rounded-xl border border-zinc-200 bg-transparent px-3 py-2 text-sm dark:border-white/10"
              />
              <button
                type="submit"
                disabled={saving || !reply.trim()}
                className="self-start rounded-xl border border-zinc-300 px-4 py-2 text-sm dark:border-white/15"
              >
                Send reply
              </button>
            </form>
            )}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Your disputes</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {disputes.length === 0 ? <li className="text-sm text-zinc-500">No disputes.</li> : null}
          {disputes.map((dispute) => (
            <li key={dispute.id}>
              <button
                type="button"
                onClick={() => void openDispute(dispute.id)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-left text-sm dark:border-white/10"
              >
                <span className="font-medium text-zinc-900 dark:text-white">
                  {dispute.number || 'Dispute'} · {dispute.title}
                </span>
                <span className="mt-1 block text-xs text-zinc-500">
                  {dispute.status} · {formatWhen(dispute.updatedAt)}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {openDisputeId && disputeDetail ? (
          <div className="mt-4 border-t border-zinc-200 pt-4 text-sm dark:border-white/10">
            {disputeDetail.reason ? (
              <p className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{disputeDetail.reason}</p>
            ) : null}
            <ul className="mt-3 flex flex-col gap-3">
              {disputeDetail.messages.map((message) => (
                <li key={message.id}>
                  <p className="text-xs text-zinc-500">{message.authorName} · {formatWhen(message.createdAt)}</p>
                  <p className="mt-1 whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">{message.body}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}
