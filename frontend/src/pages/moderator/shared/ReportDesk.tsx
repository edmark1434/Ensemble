import { useMemo, useState, type ReactNode } from 'react';
import {
  ChevronDown,
  FileWarning,
  Hand,
  Loader2,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { ReportCaseDetailModal } from '@/pages/admin/moderation/CaseDetailModals';
import type { UserReport } from '@/pages/admin/ticketManagement/ticketTypes';

type Accent = 'rose' | 'sky' | 'violet' | 'emerald' | 'amber';

const ACCENT = {
  rose: {
    icon: 'text-rose-300',
    spin: 'text-rose-400',
    focus: 'focus:border-rose-500/40',
    chip: 'bg-rose-500/15 text-rose-100',
    btn: 'border-rose-500/40 bg-rose-500/15 text-rose-200',
    badge: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
  },
  sky: {
    icon: 'text-sky-300',
    spin: 'text-sky-400',
    focus: 'focus:border-sky-500/40',
    chip: 'bg-sky-500/15 text-sky-100',
    btn: 'border-sky-500/40 bg-sky-500/15 text-sky-200',
    badge: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
  },
  violet: {
    icon: 'text-violet-300',
    spin: 'text-violet-400',
    focus: 'focus:border-violet-500/40',
    chip: 'bg-violet-500/15 text-violet-100',
    btn: 'border-violet-500/40 bg-violet-500/15 text-violet-200',
    badge: 'border-violet-500/40 bg-violet-500/10 text-violet-300',
  },
  emerald: {
    icon: 'text-emerald-300',
    spin: 'text-emerald-400',
    focus: 'focus:border-emerald-500/40',
    chip: 'bg-emerald-500/15 text-emerald-100',
    btn: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
    badge: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  },
  amber: {
    icon: 'text-amber-300',
    spin: 'text-amber-400',
    focus: 'focus:border-amber-500/40',
    chip: 'bg-amber-500/15 text-amber-100',
    btn: 'border-amber-500/40 bg-amber-500/15 text-amber-200',
    badge: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
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
type PriorityFilter = 'all' | 'high' | 'medium' | 'low';
type AssigneeFilter = 'all' | 'unassigned' | 'assigned' | string;
type SortKey = 'filed_desc' | 'filed_asc' | 'updated_desc' | 'priority_desc';

type AdvancedFilters = {
  priority: PriorityFilter;
  assignee: AssigneeFilter;
  targetType: string;
  reason: string;
  sort: SortKey;
};

const DEFAULT_ADVANCED: AdvancedFilters = {
  priority: 'all',
  assignee: 'all',
  targetType: 'all',
  reason: 'all',
  sort: 'filed_desc',
};

const CLOSED = new Set(['resolved', 'closed', 'dismissed']);
const IN_REVIEW = new Set(['in_review', 'in review', 'in_progress', 'in progress']);
const PRIORITY_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };

function normalizeToken(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .trim();
}

export default function ReportDesk({
  reports,
  onUpdated,
  accent = 'rose',
  endpointBase = '/api/admin/reports',
  loading = false,
  handlers = [],
  deskLabel,
}: {
  reports: UserReport[];
  onUpdated: () => void;
  accent?: Accent;
  endpointBase?: string;
  loading?: boolean;
  handlers?: { id: string | number; name: string; role?: string }[];
  deskLabel?: string;
}) {
  const theme = ACCENT[accent];
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open_queue');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advanced, setAdvanced] = useState<AdvancedFilters>(DEFAULT_ADVANCED);
  const [handlerSearch, setHandlerSearch] = useState('');
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

  const targetTypes = useMemo(() => {
    const set = new Map<string, string>();
    for (const r of reports) {
      const raw = String(r.targetType || '').trim();
      if (!raw) continue;
      const key = normalizeToken(raw);
      if (!set.has(key)) set.set(key, titleCase(raw));
    }
    return [...set.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [reports]);

  const reasons = useMemo(() => {
    const set = new Map<string, string>();
    for (const r of reports) {
      const raw = String(r.reason || '').trim();
      if (!raw) continue;
      const key = normalizeToken(raw);
      if (!set.has(key)) set.set(key, raw);
    }
    return [...set.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [reports]);

  const assigneeOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; role?: string }>();
    for (const h of handlers) {
      map.set(String(h.id), { id: String(h.id), name: h.name, role: h.role });
    }
    for (const r of reports) {
      if (r.assignee?.staffId) {
        map.set(String(r.assignee.staffId), {
          id: String(r.assignee.staffId),
          name: r.assignee.name,
        });
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [handlers, reports]);

  const filteredHandlers = useMemo(() => {
    const q = handlerSearch.trim().toLowerCase();
    if (!q) return assigneeOptions;
    return assigneeOptions.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        String(h.role || '')
          .toLowerCase()
          .includes(q)
    );
  }, [assigneeOptions, handlerSearch]);

  const activeAdvancedCount = useMemo(() => {
    let n = 0;
    if (advanced.priority !== 'all') n += 1;
    if (advanced.assignee !== 'all') n += 1;
    if (advanced.targetType !== 'all') n += 1;
    if (advanced.reason !== 'all') n += 1;
    if (advanced.sort !== 'filed_desc') n += 1;
    return n;
  }, [advanced]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = reports.filter((r) => {
      const status = String(r.status).toLowerCase();
      if (statusFilter === 'open_queue' && CLOSED.has(status)) return false;
      if (statusFilter === 'open' && status !== 'open' && status !== 'pending') return false;
      if (statusFilter === 'in_review' && !IN_REVIEW.has(status)) return false;
      if (statusFilter === 'resolved' && !['resolved', 'closed'].includes(status)) return false;
      if (statusFilter === 'dismissed' && status !== 'dismissed') return false;

      if (
        advanced.priority !== 'all' &&
        String(r.priority).toLowerCase() !== advanced.priority
      ) {
        return false;
      }
      if (advanced.assignee === 'unassigned' && r.assignee) return false;
      if (advanced.assignee === 'assigned' && !r.assignee) return false;
      if (
        advanced.assignee !== 'all' &&
        advanced.assignee !== 'unassigned' &&
        advanced.assignee !== 'assigned'
      ) {
        if (
          !r.assignee ||
          String(r.assignee.staffId).toLowerCase() !== String(advanced.assignee).toLowerCase()
        ) {
          return false;
        }
      }
      if (
        advanced.targetType !== 'all' &&
        normalizeToken(r.targetType) !== advanced.targetType
      ) {
        return false;
      }
      if (advanced.reason !== 'all' && normalizeToken(r.reason) !== advanced.reason) {
        return false;
      }

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

    const sorted = [...list];
    sorted.sort((a, b) => {
      if (advanced.sort === 'filed_asc') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (advanced.sort === 'updated_desc') {
        return (
          new Date(b.updatedAt || b.createdAt).getTime() -
          new Date(a.updatedAt || a.createdAt).getTime()
        );
      }
      if (advanced.sort === 'priority_desc') {
        const diff =
          (PRIORITY_RANK[String(b.priority).toLowerCase()] || 0) -
          (PRIORITY_RANK[String(a.priority).toLowerCase()] || 0);
        if (diff !== 0) return diff;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return sorted;
  }, [reports, search, statusFilter, advanced]);

  const statusChips: { id: StatusFilter; label: string; count?: number }[] = [
    { id: 'open_queue', label: 'Open queue', count: counts.openQueue },
    { id: 'open', label: 'Open', count: counts.open },
    { id: 'in_review', label: 'In review', count: counts.inReview },
    { id: 'resolved', label: 'Resolved', count: counts.resolved },
    { id: 'dismissed', label: 'Dismissed', count: counts.dismissed },
    { id: 'all', label: 'All', count: counts.total },
  ];

  const clearAdvanced = () => {
    setAdvanced(DEFAULT_ADVANCED);
    setHandlerSearch('');
  };

  const clearAll = () => {
    setSearch('');
    setStatusFilter('open_queue');
    clearAdvanced();
  };

  const selectClass =
    'mt-1 w-full rounded-lg border border-white/[0.08] bg-[#0f1016] px-2.5 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-white/10';

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
              <h2 className="text-sm font-semibold text-white">
                Report desk{deskLabel ? ` · ${deskLabel}` : ''}
              </h2>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Search and filter reports, then open a row to assign, update priority, resolve, or
              dismiss.
            </p>
          </div>
          <div className="flex w-full max-w-xl flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search number, reporter, target, reason…"
                className={`w-full rounded-xl border border-white/[0.08] bg-[#14151c] py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 ${theme.focus}`}
              />
            </div>
            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium transition ${
                advancedOpen || activeAdvancedCount > 0
                  ? theme.btn
                  : 'border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Advanced
              {activeAdvancedCount > 0 && (
                <span className={`rounded-full border px-1.5 py-0.5 text-[10px] ${theme.badge}`}>
                  {activeAdvancedCount}
                </span>
              )}
              <ChevronDown className={`h-3.5 w-3.5 transition ${advancedOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-white/[0.06] px-3 py-2">
          {statusChips.map((f) => (
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

        {advancedOpen && (
          <div className="border-b border-white/[0.06] bg-[#0c0d12] px-5 py-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <FilterField label="Priority">
                <select
                  value={advanced.priority}
                  onChange={(e) =>
                    setAdvanced((p) => ({ ...p, priority: e.target.value as PriorityFilter }))
                  }
                  className={selectClass}
                >
                  <option value="all">All priorities</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </FilterField>

              <FilterField label="Target type">
                <select
                  value={advanced.targetType}
                  onChange={(e) => setAdvanced((p) => ({ ...p, targetType: e.target.value }))}
                  className={selectClass}
                >
                  <option value="all">All target types</option>
                  {targetTypes.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </FilterField>

              <FilterField label="Reason">
                <select
                  value={advanced.reason}
                  onChange={(e) => setAdvanced((p) => ({ ...p, reason: e.target.value }))}
                  className={selectClass}
                >
                  <option value="all">All reasons</option>
                  {reasons.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </FilterField>

              <FilterField label="Handler">
                <select
                  value={advanced.assignee}
                  onChange={(e) =>
                    setAdvanced((p) => ({ ...p, assignee: e.target.value as AssigneeFilter }))
                  }
                  className={selectClass}
                >
                  <option value="all">All handlers</option>
                  <option value="unassigned">Unassigned</option>
                  <option value="assigned">Assigned (any)</option>
                  {filteredHandlers.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                      {h.role ? ` · ${h.role}` : ''}
                    </option>
                  ))}
                </select>
                {assigneeOptions.length > 6 && (
                  <input
                    value={handlerSearch}
                    onChange={(e) => setHandlerSearch(e.target.value)}
                    placeholder="Filter handler list…"
                    className="mt-1.5 w-full rounded-lg border border-white/[0.08] bg-[#0f1016] px-2.5 py-1.5 text-xs text-white outline-none placeholder:text-zinc-600"
                  />
                )}
              </FilterField>

              <FilterField label="Sort">
                <select
                  value={advanced.sort}
                  onChange={(e) =>
                    setAdvanced((p) => ({ ...p, sort: e.target.value as SortKey }))
                  }
                  className={selectClass}
                >
                  <option value="filed_desc">Newest filed</option>
                  <option value="filed_asc">Oldest filed</option>
                  <option value="updated_desc">Recently updated</option>
                  <option value="priority_desc">Priority (high → low)</option>
                </select>
              </FilterField>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {(search || statusFilter !== 'open_queue' || activeAdvancedCount > 0) && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-400 hover:text-white"
                >
                  <X className="h-3 w-3" />
                  Clear all filters
                </button>
              )}
              {activeAdvancedCount > 0 && (
                <button
                  type="button"
                  onClick={clearAdvanced}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-400 hover:text-white"
                >
                  Reset advanced only
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-2.5 text-xs text-zinc-500">
          <p>
            Showing <span className="tabular-nums text-zinc-300">{filtered.length}</span> of{' '}
            <span className="tabular-nums text-zinc-300">{reports.length}</span> reports
          </p>
          {(search || activeAdvancedCount > 0) && (
            <p className="text-zinc-600">Filters active</p>
          )}
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className={`h-6 w-6 animate-spin ${theme.spin}`} />
            </div>
          ) : (
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wide text-zinc-500">
                  <th className="px-5 py-3 font-medium">Report</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3 font-medium">Target</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Reporter</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Assignee</th>
                  <th className="px-4 py-3 font-medium">Filed</th>
                  <th className="px-5 py-3 font-medium">Updated</th>
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
                      {r.description && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-zinc-600">{r.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="line-clamp-2 max-w-[180px] text-zinc-200">{r.reason || '—'}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="max-w-[160px] truncate text-zinc-200">
                        {r.targetLabel || r.targetId || '—'}
                      </p>
                      {r.targetId && r.targetLabel && (
                        <p className="truncate text-[11px] text-zinc-600">{r.targetId}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-zinc-300">
                        {titleCase(r.targetType) || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-zinc-200">{r.reporter?.name || '—'}</p>
                      <p className="text-xs text-zinc-500">@{r.reporter?.username || '—'}</p>
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
                    <td className="px-4 py-3.5 text-xs text-zinc-500">
                      {formatDateTime(r.createdAt)}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-zinc-500">
                      {formatDateTime(r.updatedAt || r.resolvedAt || r.createdAt)}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-5 py-16 text-center text-sm text-zinc-500">
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

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-[11px] font-medium uppercase tracking-wide text-zinc-500">
      {label}
      {children}
    </label>
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
