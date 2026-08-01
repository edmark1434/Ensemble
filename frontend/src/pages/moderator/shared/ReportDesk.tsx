import { useMemo, useState } from 'react';
import { FileWarning, Hand, Loader2, Search } from 'lucide-react';
import { ReportCaseDetailModal } from '@/pages/admin/moderation/CaseDetailModals';
import type { UserReport } from '@/pages/admin/ticketManagement/ticketTypes';

type Accent = 'rose' | 'sky';

const ACCENT = {
  rose: {
    icon: 'text-rose-300',
    spin: 'text-rose-400',
    focus: 'focus:border-rose-500/40',
    chip: 'bg-rose-500/15 text-rose-100',
  },
  sky: {
    icon: 'text-sky-300',
    spin: 'text-sky-400',
    focus: 'focus:border-sky-500/40',
    chip: 'bg-sky-500/15 text-sky-100',
  },
} as const;

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
  if (s === 'open' || s === 'pending') return 'bg-rose-500/15 text-rose-200 border-rose-500/25';
  if (s === 'in review' || s === 'in_progress' || s === 'in progress') {
    return 'bg-amber-500/15 text-amber-200 border-amber-500/25';
  }
  if (s === 'resolved' || s === 'closed') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25';
  if (s === 'dismissed') return 'bg-zinc-500/15 text-zinc-300 border-white/10';
  return 'bg-zinc-500/15 text-zinc-300 border-white/10';
}

function priorityClass(priority: string) {
  const p = priority.toLowerCase();
  if (p === 'high') return 'bg-red-500/15 text-red-300 border-red-500/25';
  if (p === 'medium') return 'bg-amber-500/15 text-amber-200 border-amber-500/25';
  return 'bg-sky-500/15 text-sky-300 border-sky-500/25';
}

type StatusFilter = 'all' | 'open_queue' | 'open' | 'in_review' | 'resolved' | 'dismissed';

const CLOSED = new Set(['resolved', 'closed', 'dismissed']);
const IN_REVIEW = new Set(['in_review', 'in review', 'in_progress', 'in progress']);

export default function ReportDesk({
  reports,
  onUpdated,
  accent = 'rose',
  endpointBase = '/api/admin/reports',
  loading = false,
}: {
  reports: UserReport[];
  onUpdated: () => void;
  accent?: Accent;
  endpointBase?: string;
  loading?: boolean;
}) {
  const theme = ACCENT[accent];
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open_queue');
  const [selectedId, setSelectedId] = useState<string | number | null>(null);

  const counts = useMemo(() => {
    const openQueue = reports.filter((r) => !CLOSED.has(String(r.status).toLowerCase())).length;
    const open = reports.filter((r) => {
      const s = String(r.status).toLowerCase();
      return s === 'open' || s === 'pending';
    }).length;
    const inReview = reports.filter((r) => IN_REVIEW.has(String(r.status).toLowerCase())).length;
    const unassigned = reports.filter(
      (r) => !r.assignee && !CLOSED.has(String(r.status).toLowerCase())
    ).length;
    const high = reports.filter(
      (r) =>
        String(r.priority).toLowerCase() === 'high' && !CLOSED.has(String(r.status).toLowerCase())
    ).length;
    const resolved = reports.filter((r) =>
      ['resolved', 'closed'].includes(String(r.status).toLowerCase())
    ).length;
    const dismissed = reports.filter((r) => String(r.status).toLowerCase() === 'dismissed').length;
    return { openQueue, open, inReview, unassigned, high, resolved, dismissed, total: reports.length };
  }, [reports]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports.filter((r) => {
      const status = String(r.status).toLowerCase();
      if (statusFilter === 'open_queue' && CLOSED.has(status)) return false;
      if (statusFilter === 'open' && status !== 'open' && status !== 'pending') return false;
      if (statusFilter === 'in_review' && !IN_REVIEW.has(status)) return false;
      if (statusFilter === 'resolved' && !['resolved', 'closed'].includes(status)) return false;
      if (statusFilter === 'dismissed' && status !== 'dismissed') return false;
      if (!q) return true;
      const hay = [
        r.number,
        r.reason,
        r.description,
        r.reporter?.name,
        r.reporter?.username,
        r.targetLabel,
        r.targetType,
        r.targetId,
        r.assignee?.name,
        r.status,
        r.priority,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [reports, search, statusFilter]);

  const filters: { id: StatusFilter; label: string; count?: number }[] = [
    { id: 'open_queue', label: 'Open queue', count: counts.openQueue },
    { id: 'open', label: 'Open', count: counts.open },
    { id: 'in_review', label: 'In review', count: counts.inReview },
    { id: 'resolved', label: 'Resolved', count: counts.resolved },
    { id: 'dismissed', label: 'Dismissed', count: counts.dismissed },
    { id: 'all', label: 'All', count: counts.total },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Open reports" value={counts.openQueue} sub="Awaiting triage or review" />
        <SummaryCard label="High priority" value={counts.high} sub="Open and urgent" />
        <SummaryCard label="Unassigned" value={counts.unassigned} sub="Need a handler" />
        <SummaryCard label="Total filed" value={counts.total} sub="Including closed cases" />
      </div>

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f1016]">
        <div className="flex flex-col gap-4 border-b border-white/[0.06] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FileWarning className={`h-4 w-4 ${theme.icon}`} />
              <h2 className="text-sm font-semibold text-white">Report desk</h2>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Triage harassment, spam, scam, and other member reports. Assign staff, update priority, and
              resolve or dismiss.
            </p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search number, reporter, target, reason…"
              className={`w-full rounded-xl border border-white/[0.08] bg-[#14151c] py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 ${theme.focus}`}
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
                  ? theme.chip
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
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className={`h-6 w-6 animate-spin ${theme.spin}`} />
            </div>
          ) : (
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wide text-zinc-500">
                  <th className="px-5 py-3 font-medium">Report</th>
                  <th className="px-4 py-3 font-medium">Target</th>
                  <th className="px-4 py-3 font-medium">Reporter</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Assignee</th>
                  <th className="px-5 py-3 font-medium">Filed</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={String(r.id)}
                    onClick={() => setSelectedId(r.id)}
                    className="cursor-pointer border-b border-white/[0.04] transition hover:bg-white/[0.03]"
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-white">{r.number}</p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">{r.reason}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-zinc-200">{r.targetLabel || r.targetId || '—'}</p>
                      <p className="text-xs text-zinc-500">{titleCase(r.targetType)}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-zinc-200">{r.reporter.name}</p>
                      <p className="text-xs text-zinc-500">@{r.reporter.username || '—'}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${priorityClass(r.priority)}`}
                      >
                        {titleCase(r.priority)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${statusClass(r.status)}`}
                      >
                        {titleCase(r.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-zinc-300">
                      {r.assignee ? (
                        r.assignee.name
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-200/90">
                          <Hand className="h-3.5 w-3.5" />
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-zinc-500">{formatDateTime(r.createdAt)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center text-sm text-zinc-500">
                      No reports match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {selectedId != null && (
        <ReportCaseDetailModal
          reportId={selectedId}
          endpointBase={endpointBase}
          accent={accent}
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

export function ReportDeskLoading({ accent = 'rose' }: { accent?: Accent }) {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className={`h-8 w-8 animate-spin ${ACCENT[accent].spin}`} />
    </div>
  );
}
