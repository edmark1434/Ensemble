import { useEffect, useState } from 'react';
import api from '@/lib/axios';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast.ts';
import { TICKET_TYPE_GROUPS } from './ticketTypes';
import type { TicketArticle } from './ticketTypes';

export default function TicketArticlesPanel() {
  const [articles, setArticles] = useState<TicketArticle[]>([]);
  const [ticketType, setTicketType] = useState<string>(TICKET_TYPE_GROUPS[0].types[0]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const load = async () => {
    const res = await api.get('/api/admin/ticket-articles');
    if (res.data?.success) setArticles(res.data.data || []);
  };

  useEffect(() => {
    void load().catch(() => undefined);
  }, []);

  const save = async () => {
    try {
      await api.post('/api/admin/ticket-articles', { ticketType, title, body });
      setTitle('');
      setBody('');
      showSuccessToast('Reply guide saved');
      await load();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to save reply guide';
      showErrorToast(message);
    }
  };

  const remove = async (id: string) => {
    await api.delete(`/api/admin/ticket-articles/${id}`);
    await load();
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f1016]">
      <div className="border-b border-white/[0.06] px-5 py-4">
        <h3 className="text-sm font-semibold text-white">Reply guides</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Tied to a ticket type. Staff can insert one into a reply from the ticket.
        </p>
      </div>
      <div className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-2">
          <select
            value={ticketType}
            onChange={(event) => setTicketType(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white"
          >
            {TICKET_TYPE_GROUPS.flatMap((group) => {
              const buckets = group.subgroups?.length
                ? group.subgroups.map((sub) => ({ label: `${group.label} · ${sub.label}`, types: sub.types }))
                : [{ label: group.label, types: group.types }];
              return buckets.map((bucket) => (
                <optgroup key={bucket.label} label={bucket.label}>
                  {bucket.types.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </optgroup>
              ));
            })}
          </select>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Title"
            className="w-full rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white"
          />
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={4}
            placeholder="Reply text"
            className="w-full resize-none rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white"
          />
          <button type="button" onClick={() => void save()} className="rounded-lg bg-rose-500 px-3 py-2 text-xs font-medium text-white">
            Save guide
          </button>
        </div>
        <ul className="max-h-64 space-y-2 overflow-y-auto">
          {articles.map((article) => (
            <li key={article.id} className="rounded-lg border border-white/10 px-3 py-2 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-white">{article.title}</p>
                  <p className="text-zinc-500">{article.ticketType}</p>
                </div>
                <button type="button" onClick={() => void remove(article.id)} className="text-zinc-500 hover:text-red-300">
                  Remove
                </button>
              </div>
            </li>
          ))}
          {articles.length === 0 && <li className="text-xs text-zinc-500">No guides yet.</li>}
        </ul>
      </div>
    </section>
  );
}
