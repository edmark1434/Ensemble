import { useState } from 'react';
import api from '@/lib/axios';

export async function respondToTicketInvite(ticketId: string, action: 'accept' | 'decline') {
  const response = await api.post(`/api/users/tickets/${ticketId}/invite`, { action });
  return (response.data?.data || {}) as { chatId?: string | null; joined?: boolean };
}

export default function TicketInviteActions({
  ticketId,
  compact = false,
  onDone,
}: {
  ticketId: string;
  compact?: boolean;
  onDone: (result: 'accepted' | 'declined', chatId?: string | null) => void;
}) {
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);
  const [done, setDone] = useState('');
  const [error, setError] = useState('');

  const respond = async (action: 'accept' | 'decline') => {
    setBusy(action);
    setError('');
    try {
      const data = await respondToTicketInvite(ticketId, action);
      setDone(action === 'accept' ? 'Joined' : 'Declined');
      onDone(action === 'accept' ? 'accepted' : 'declined', data.chatId);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || 'Could not update the invite');
    } finally {
      setBusy(null);
    }
  };

  if (done) return <p className="text-[11px] font-medium text-gray-600 dark:text-zinc-300">{done}</p>;

  return (
    <div className={compact ? 'mt-2 flex flex-wrap items-center gap-2' : 'flex flex-col items-end gap-1.5'}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={(event) => {
            event.stopPropagation();
            void respond('accept');
          }}
          className="rounded-lg bg-sky-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-sky-400 disabled:opacity-50"
        >
          {busy === 'accept' ? 'Joining…' : 'Accept'}
        </button>
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={(event) => {
            event.stopPropagation();
            void respond('decline');
          }}
          className="rounded-lg border border-gray-300 px-2.5 py-1 text-[11px] text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:border-white/15 dark:text-zinc-200 dark:hover:bg-white/5"
        >
          {busy === 'decline' ? 'Declining…' : 'Decline'}
        </button>
      </div>
      {error ? <p className="text-[11px] text-red-300">{error}</p> : null}
    </div>
  );
}
