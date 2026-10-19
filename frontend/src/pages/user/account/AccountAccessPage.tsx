import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { LogOut, Send } from 'lucide-react';
import api from '@/lib/axios';
import useGlobalState from '@/lib/global_state';
import { auth } from '@/pages/firebase';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast';
import { AccountRecordSection } from '@/pages/user/7_profile/Displays/AccountStanding';
import UserLogoutModal from '@/components/nav/user_logout_modal';

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
  senderId?: string | null;
  authorType?: string;
  authorName?: string;
  body?: string;
  messageType?: string;
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
  senderId?: string | null;
  authorType?: string;
  authorName?: string;
  body?: string;
  messageType?: string;
  createdAt?: string;
};

type ThreadMessage = TicketMessage;

function formatWhen(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
}

export default function AccountAccessPage() {
  const user = useGlobalState((state) => state.user);
  const clearUser = useGlobalState((state) => state.clearUser);
  const navigate = useNavigate();
  const restriction = user?.restriction;
  const [confirmLogout, setConfirmLogout] = useState(false);
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
  const [showRecord, setShowRecord] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const replyRef = useRef<HTMLTextAreaElement>(null);

  async function loadLists() {
    const [ticketResult, disputeResult] = await Promise.allSettled([
      api.get('/api/users/tickets'),
      api.get('/api/users/disputes'),
    ]);
    if (ticketResult.status === 'fulfilled') {
      setTickets(ticketResult.value.data?.data || []);
    }
    if (disputeResult.status === 'fulfilled') {
      setDisputes(disputeResult.value.data?.data || []);
    }
    if (ticketResult.status === 'rejected' && disputeResult.status === 'rejected') {
      throw ticketResult.reason;
    }
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
      const res = await api.post('/api/users/tickets', {
        subject: subject.trim(),
        description: description.trim(),
        type: 'Appeal an account penalty',
        category: 'Appeal an account penalty',
        fields: {
          case_id: 'Not provided',
          why_reverse: description.trim(),
        },
      });
      setSubject('');
      setDescription('');
      showSuccessToast('Appeal submitted.');
      const createdId = res.data?.data?.ticketId as string | undefined;
      await loadLists();
      if (createdId) await openTicket(createdId);
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showErrorToast(message || 'Could not submit the appeal.');
    } finally {
      setSaving(false);
    }
  }

  const selectedTicket = tickets.find((ticket) => ticket.id === openTicketId) || null;
  const ticketClosed = selectedTicket?.status === 'Closed' || selectedTicket?.status === 'Resolved';

  async function sendReply() {
    if (!openTicketId || !reply.trim() || ticketClosed || saving) return;
    const body = reply.trim();
    setSaving(true);
    setReply('');
    try {
      await api.post(`/api/users/tickets/${openTicketId}/messages`, { body });
      await openTicket(openTicketId);
    } catch (err) {
      setReply(body);
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showErrorToast(message || 'Could not send that reply.');
    } finally {
      setSaving(false);
    }
  }

  async function confirmSignOut() {
    setConfirmLogout(false);
    try {
      await api.post('/api/users/logout');
    } catch {
      // The local session still has to close.
    }
    try {
      await signOut(auth);
    } catch {
      // Firebase may already be signed out.
    }
    clearUser();
    navigate('/login', { replace: true });
  }

  const accountId = String(user?.account_id || '');
  const activeMessages: ThreadMessage[] = openTicketId ? ticketMessages : (disputeDetail?.messages || []);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: 'end' });
  }, [activeMessages.length, openTicketId, openDisputeId]);

  function messageIsOwn(message: ThreadMessage) {
    if (message.senderId && accountId) return message.senderId === accountId;
    return String(message.authorType || '').toLowerCase() === 'user';
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-white">
      <header className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-white/10">
        <p className="text-sm font-semibold tracking-wide">Ensemble</p>
        <button
          type="button"
          onClick={() => setConfirmLogout(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-white/10"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </header>
      <UserLogoutModal
        isOpen={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        onConfirm={() => void confirmSignOut()}
      />
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
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

      <div>
        <button
          type="button"
          onClick={() => setShowRecord((open) => !open)}
          className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
        >
          {showRecord ? 'Hide account record' : 'View account record'}
        </button>
        {showRecord ? (
          <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-zinc-900">
            <AccountRecordSection />
          </div>
        ) : null}
      </div>

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

      <section className="flex h-[36rem] overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-900">
        <aside className="flex w-72 shrink-0 flex-col border-r border-zinc-200 dark:border-white/10">
          <div className="border-b border-zinc-200 px-4 py-3 dark:border-white/10">
            <h2 className="text-sm font-semibold">Tickets</h2>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {tickets.length === 0 ? <p className="px-4 py-3 text-sm text-zinc-500">No tickets yet.</p> : null}
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                type="button"
                onClick={() => void openTicket(ticket.id)}
                className={`w-full border-b border-zinc-100 px-4 py-3 text-left dark:border-white/5 ${
                  openTicketId === ticket.id ? 'bg-blue-500/10' : 'hover:bg-zinc-50 dark:hover:bg-white/5'
                }`}
              >
                <span className="block truncate text-sm font-medium">{ticket.subject || ticket.number || 'Ticket'}</span>
                <span className="mt-1 block truncate text-xs text-zinc-500">
                  {ticket.number || 'Ticket'} · {ticket.status}
                </span>
              </button>
            ))}
            <div className="border-b border-zinc-200 px-4 py-3 dark:border-white/10">
              <h2 className="text-sm font-semibold">Disputes</h2>
            </div>
            {disputes.length === 0 ? <p className="px-4 py-3 text-sm text-zinc-500">No disputes.</p> : null}
            {disputes.map((dispute) => (
              <button
                key={dispute.id}
                type="button"
                onClick={() => void openDispute(dispute.id)}
                className={`w-full border-b border-zinc-100 px-4 py-3 text-left dark:border-white/5 ${
                  openDisputeId === dispute.id ? 'bg-blue-500/10' : 'hover:bg-zinc-50 dark:hover:bg-white/5'
                }`}
              >
                <span className="block truncate text-sm font-medium">{dispute.title || dispute.number || 'Dispute'}</span>
                <span className="mt-1 block truncate text-xs text-zinc-500">
                  {dispute.number || 'Dispute'} · {dispute.status}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
          {!openTicketId && !openDisputeId ? (
            <div className="flex flex-1 items-center justify-center px-6 text-sm text-zinc-500">
              Select a ticket to reply, or a dispute to read.
            </div>
          ) : (
            <>
              <div className="border-b border-zinc-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-900">
                <p className="truncate text-sm font-semibold">
                  {selectedTicket
                    ? (selectedTicket.subject || selectedTicket.number || 'Ticket')
                    : (disputes.find((dispute) => dispute.id === openDisputeId)?.title || 'Dispute')}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {selectedTicket
                    ? `${selectedTicket.number || 'Ticket'} · ${selectedTicket.status || 'Open'}`
                    : `${disputes.find((dispute) => dispute.id === openDisputeId)?.number || 'Dispute'} · ${disputes.find((dispute) => dispute.id === openDisputeId)?.status || ''}`}
                </p>
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
                <div className="mt-auto flex flex-col">
                  {activeMessages.length === 0 ? (
                    <p className="py-8 text-center text-sm text-zinc-500">No messages yet.</p>
                  ) : null}
                  {activeMessages.map((message) => {
                    if (String(message.messageType || message.authorType || '').toLowerCase() === 'system') {
                      return (
                        <div key={message.id} className="my-3 flex justify-center">
                          <span className="rounded-full bg-white px-4 py-1.5 text-xs text-zinc-500 dark:bg-white/5">
                            {message.body}
                          </span>
                        </div>
                      );
                    }
                    const own = messageIsOwn(message);
                    const name = own ? 'You' : (String(message.authorType || '').toLowerCase() === 'staff' ? 'Staff' : (message.authorName || 'Staff'));
                    return (
                      <div key={message.id} className={`my-2 flex ${own ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className="flex max-w-[75%] flex-col">
                          <span className={`mb-1 px-1 text-[11px] font-medium text-zinc-500 ${own ? 'self-end' : 'self-start'}`}>
                            {name} · {formatWhen(message.createdAt)}
                          </span>
                          <div
                            className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                              own
                                ? 'rounded-br-none bg-blue-600 text-white'
                                : 'rounded-bl-none border border-zinc-200 bg-white text-zinc-900 dark:border-zinc-700/50 dark:bg-zinc-800 dark:text-zinc-100'
                            }`}
                          >
                            {message.body}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={threadEndRef} />
                </div>
              </div>
              {openDisputeId ? (
                <div className="border-t border-zinc-200 bg-white p-4 text-center text-sm text-zinc-500 dark:border-white/10 dark:bg-zinc-900">
                  You can read this dispute here. Replies stay on the ticket with support.
                </div>
              ) : ticketClosed ? (
                <div className="border-t border-zinc-200 bg-white p-4 text-center text-sm text-zinc-500 dark:border-white/10 dark:bg-zinc-900">
                  This ticket is closed. You cannot reply.
                </div>
              ) : (
                <div className="flex items-end gap-2 border-t border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
                  <textarea
                    ref={replyRef}
                    value={reply}
                    rows={1}
                    placeholder="Type a message..."
                    onChange={(event) => {
                      setReply(event.target.value);
                      const el = event.target;
                      el.style.height = 'auto';
                      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        void sendReply();
                      }
                    }}
                    className="max-h-40 min-h-10 flex-1 resize-none rounded-2xl border border-zinc-300 bg-zinc-50 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-white/15 dark:bg-white/5"
                  />
                  <button
                    type="button"
                    onClick={() => void sendReply()}
                    disabled={saving || !reply.trim()}
                    className="rounded-xl bg-blue-600 p-2.5 text-white disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Send message"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
    </div>
  );
}
