import { useMemo, useState } from 'react';
import { Hand, Loader2, Scale, Search } from 'lucide-react';
import ModeratorDisputeDetailModal from '@/pages/moderator/shared/ModeratorDisputeDetailModal';
import type { Dispute } from '../ticketManagement/ticketTypes';

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function titleCase(value: string) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function statusClass(status: string) {
  const s = status.toLowerCase().replace(/_/g, ' ');
  if (s === 'pending review') return 'bg-rose-500/15 text-rose-200 border-rose-500/25';
  if (s === 'open') return 'bg-red-500/15 text-red-300 border-red-500/25';
  if (s === 'awaiting response' || s === 'under review') {
    return 'bg-amber-500/15 text-amber-200 border-amber-500/25';
  }
  if (s === 'sanctioned') return 'bg-violet-500/15 text-violet-200 border-violet-500/25';
  if (s === 'dismissed' || s === 'withdrawn') return 'bg-zinc-500/15 text-zinc-300 border-white/10';
  if (s === 'resolved' || s === 'closed') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25';
  return 'bg-zinc-500/15 text-zinc-300 border-white/10';
}

function priorityClass(priority: string) {
  const p = priority.toLowerCase();
  if (p === 'high') return 'bg-red-500/15 text-red-300 border-red-500/25';
  if (p === 'medium') return 'bg-amber-500/15 text-amber-200 border-amber-500/25';
  return 'bg-sky-500/15 text-sky-300 border-sky-500/25';
}

function visibilityClass(visibility: string) {
  const v = visibility.toLowerCase();
  if (v === 'public') return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
  return 'bg-zinc-500/10 text-zinc-400 border-white/10';
}

type StatusFilter =
  | 'all'
  | 'open_queue'
  | 'pending_review'
  | 'open'
  | 'awaiting_response'
  | 'under_review'
  | 'closed';

const CLOSED = new Set(['resolved', 'closed', 'sanctioned', 'dismissed', 'withdrawn']);

export default function DisputesTab({
  disputes,
  onUpdated,
}: {
  disputes: Dispute[];
  onUpdated: () => void;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open_queue');
  const [selectedId, setSelectedId] = useState<string | number | null>(null);

  const counts = useMemo(() => {
    const openQueue = disputes.filter((d) => !CLOSED.has(String(d.status).toLowerCase())).length;
    const pending = disputes.filter((d) => String(d.status).toLowerCase() === 'pending_review').length;
    const takeover = disputes.filter((d) => Boolean(d.takeoverRequestedByStaffId)).length;
    const unassigned = disputes.filter(
      (d) => !d.assignee && !CLOSED.has(String(d.status).toLowerCase())
    ).length;
    const credits = disputes
      .filter((d) => !CLOSED.has(String(d.status).toLowerCase()))
      .reduce((sum, d) => sum + Number(d.creditAmount || 0), 0);
    return { openQueue, pending, takeover, unassigned, credits, total: disputes.length };
  }, [disputes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return disputes.filter((d) => {
      const status = String(d.status).toLowerCase();
      if (statusFilter === 'open_queue' && CLOSED.has(status)) return false;
      if (statusFilter === 'closed' && !CLOSED.has(status)) return false;
      if (
        statusFilter !== 'all' &&
        statusFilter !== 'open_queue' &&
        statusFilter !== 'closed' &&
        status !== statusFilter
      ) {
        return false;
      }
      if (!q) return true;
      const hay = [
        d.number,
        d.title,
        d.reason,
        d.initiator?.name,
        d.initiator?.username,
        d.respondent?.name,
        d.respondent?.username,
        d.assignee?.name,
        d.status,
        d.visibility,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [disputes, search, statusFilter]);

  const filters: { id: StatusFilter; label: string; count?: number }[] = [
    { id: 'open_queue', label: 'Open queue', count: counts.openQueue },
    { id: 'pending_review', label: 'Pending review', count: counts.pending },
    { id: 'open', label: 'Open' },
    { id: 'awaiting_response', label: 'Awaiting reply' },
    { id: 'under_review', label: 'Under review' },
    { id: 'closed', label: 'Closed' },
    { id: 'all', label: 'All', count: counts.total },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Open disputes" value={counts.openQueue} sub="Active resolution queue" />
        <SummaryCard
          label="Credits at risk"
          value={counts.credits.toLocaleString()}
          sub="Across open cases"
        />
        <SummaryCard label="Unassigned" value={counts.unassigned} sub="Need a designated handler" />
        <SummaryCard label="Takeover requests" value={counts.takeover} sub="Awaiting accept / force" />
      </div>

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f1016]">
        <div className="flex flex-col gap-4 border-b border-white/[0.06] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-rose-300" />
              <h2 className="text-sm font-semibold text-white">Dispute desk</h2>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Approve filings, assign Support Moderators, publish party replies, and close outcomes.
              Handling is view-only until you assign yourself.
            </p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search number, party, title…"
              className="w-full rounded-xl border border-white/[0.08] bg-[#14151c] py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-rose-500/40"
            />
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-white/[0.06] px-3 py-2">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                statusFilter === f.id
                  ? 'bg-rose-500/15 text-rose-100'
                  : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300'
              }`}
            >
              {f.label}
              {typeof f.count === 'number' && (
                <span className="ml-1.5 text-[10px] opacity-70">{f.count}</span>
              )}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-3 font-medium">Dispute</th>
                <th className="px-4 py-3 font-medium">Parties</th>
                <th className="px-4 py-3 font-medium">Credits</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Visibility</th>
                <th className="px-4 py-3 font-medium">Handler</th>
                <th className="px-4 py-3 font-medium">Opened</th>
                <th className="px-5 py-3 font-medium text-right">Flags</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr
                  key={String(d.id)}
                  onClick={() => setSelectedId(d.id)}
                  className="cursor-pointer border-b border-white/[0.04] transition hover:bg-white/[0.03]"
                >
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-white">{d.number}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">{d.title}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-zinc-200">@{d.initiator.username}</p>
                    <p className="text-xs text-zinc-500">vs @{d.respondent.username}</p>
                  </td>
                  <td className="px-4 py-3.5 tabular-nums text-zinc-300">
                    {Number(d.creditAmount || 0).toLocaleString()}
                    {d.creditHold && (
                      <span className="mt-0.5 block text-[10px] text-amber-300/80">
                        Hold {d.creditHold.status}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${statusClass(d.status)}`}
                    >
                      {titleCase(d.status)}
                    </span>
                    <span
                      className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] ${priorityClass(d.priority)}`}
                    >
                      {titleCase(d.priority)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${visibilityClass(d.visibility || 'pending')}`}
                    >
                      {titleCase(d.visibility || 'pending')}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-zinc-300">
                    {d.assignee ? (
                      <>
                        <p>{d.assignee.name}</p>
                        <p className="text-[11px] text-zinc-500">{d.assignee.role}</p>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-200/90">
                        <Hand className="h-3.5 w-3.5" />
                        Unassigned
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-zinc-500">{formatDateTime(d.openedAt)}</td>
                  <td className="px-5 py-3.5 text-right">
                    {d.takeoverRequestedByStaffId ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-100">
                        <Hand className="h-3.5 w-3.5" />
                        Takeover
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-sm text-zinc-500">
                    No disputes match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedId != null && (
        <ModeratorDisputeDetailModal
          disputeId={selectedId}
          endpointBase="/api/admin/disputes"
          accent="rose"
          adminMode
          onClose={() => setSelectedId(null)}
          onUpdated={onUpdated}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] px-4 py-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-white">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{sub}</p>
    </div>
  );
}

export function DisputesTabLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-rose-400" />
    </div>
  );
}
