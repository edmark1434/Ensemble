import { useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, Hand, Loader2, Scale, Search, SlidersHorizontal, X } from 'lucide-react';
import ModeratorDisputeDetailModal from '@/pages/moderator/shared/ModeratorDisputeDetailModal';
import type { Dispute } from '@/pages/admin/ticketManagement/ticketTypes';

type Accent = 'rose' | 'sky' | 'emerald';

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
  emerald: {
    icon: 'text-emerald-300',
    spin: 'text-emerald-400',
    focus: 'focus:border-emerald-500/40',
    chip: 'bg-emerald-500/15 text-emerald-100',
    btn: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
    badge: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
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
  if (s === 'pending review') return 'bg-rose-500/15 text-rose-200 border-rose-500/25';
  if (s === 'open') return 'bg-red-500/15 text-red-300 border-red-500/25';
  if (s === 'awaiting response' || s === 'under review') {
    return 'bg-amber-500/15 text-amber-200 border-amber-500/25';
  }
  if (s === 'closed') return 'bg-zinc-500/15 text-zinc-200 border-white/15';
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

type WorkflowStatusFilter =
  | 'all'
  | 'pending_review'
  | 'open'
  | 'awaiting_response'
  | 'under_review'
  | 'closed';

type PriorityFilter = 'all' | 'high' | 'medium' | 'low';
type VisibilityFilter = 'all' | 'pending' | 'parties' | 'public';
type AssigneeFilter = 'all' | 'unassigned' | 'assigned' | string; // string = staffId

type FlagFilter = 'all' | 'credit_hold';
type SortKey =
  | 'opened_desc'
  | 'opened_asc'
  | 'updated_desc'
  | 'credits_desc'
  | 'priority_desc';

type AdvancedFilters = {
  status: WorkflowStatusFilter;
  priority: PriorityFilter;
  visibility: VisibilityFilter;
  assignee: AssigneeFilter;
  entityType: string;
  flag: FlagFilter;
  sort: SortKey;
};

const DEFAULT_ADVANCED: AdvancedFilters = {
  status: 'all',
  priority: 'all',
  visibility: 'all',
  assignee: 'all',
  entityType: 'all',
  flag: 'all',
  sort: 'opened_desc',
};

const WORKFLOW_STATUSES = [
  'pending_review',
  'open',
  'awaiting_response',
  'under_review',
  'closed',
] as const;

const KNOWN_ENTITY_TYPES = [
  'Contract',
  'Feedback',
  'Job',
  'Gig',
  'Marketplace',
  'Team',
  'Forum',
  'Transaction',
  'General',
] as const;

const HANDLER_ROLES = new Set([
  'admin',
  'administrator',
  'support moderator',
]);

export type DisputeHandlerOption = {
  staffId: string;
  name: string;
  role: string;
};

const CLOSED = new Set(['closed']);
const PRIORITY_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };

function selectClsFor(accent: Accent) {
  return `w-full rounded-lg border border-white/10 bg-[#0f1016] px-3 py-2 text-sm text-white outline-none ${ACCENT[accent].focus}`;
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] font-medium text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

function isClosedStatus(status: string) {
  return CLOSED.has(String(status || '').toLowerCase());
}

function countActiveAdvanced(filters: AdvancedFilters) {
  let n = 0;
  if (filters.status !== 'all') n += 1;
  if (filters.priority !== 'all') n += 1;
  if (filters.visibility !== 'all') n += 1;
  if (filters.assignee !== 'all') n += 1;
  if (filters.entityType !== 'all') n += 1;
  if (filters.flag !== 'all') n += 1;
  if (filters.sort !== 'opened_desc') n += 1;
  return n;
}

export default function DisputeDesk({
  disputes,
  handlers = [],
  onUpdated,
  accent = 'rose',
  endpointBase = '/api/admin/disputes',
  deskMode = true,
  deskLabel = 'Admin',
  loading = false,
}: {
  disputes: Dispute[];
  handlers?: { id: string | number; name: string; role: string }[];
  onUpdated: () => void;
  accent?: Accent;
  endpointBase?: string;
  /** Enables assign / view-only gating (admin & support desks). */
  deskMode?: boolean;
  deskLabel?: string;
  loading?: boolean;
}) {
  const theme = ACCENT[accent];
  const selectCls = selectClsFor(accent);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open_queue');
  const [advanced, setAdvanced] = useState<AdvancedFilters>(DEFAULT_ADVANCED);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [handlerSearch, setHandlerSearch] = useState('');

  const handlerOptions = useMemo(() => {
    const byId = new Map<string, DisputeHandlerOption>();

    for (const h of handlers) {
      const role = String(h.role || '').toLowerCase();
      if (!HANDLER_ROLES.has(role)) continue;
      const staffId = String(h.id);
      if (!staffId) continue;
      byId.set(staffId.toLowerCase(), {
        staffId,
        name: h.name || 'Staff',
        role: h.role || 'Staff',
      });
    }

    // Include anyone already assigned on disputes (in case roster is incomplete)
    for (const d of disputes) {
      if (!d.assignee?.staffId) continue;
      const staffId = String(d.assignee.staffId);
      const key = staffId.toLowerCase();
      if (byId.has(key)) continue;
      byId.set(key, {
        staffId,
        name: d.assignee.name || 'Staff',
        role: d.assignee.role || 'Staff',
      });
    }

    return [...byId.values()].sort((a, b) => {
      const roleCmp = a.role.localeCompare(b.role);
      if (roleCmp !== 0) return roleCmp;
      return a.name.localeCompare(b.name);
    });
  }, [handlers, disputes]);

  const filteredHandlers = useMemo(() => {
    const q = handlerSearch.trim().toLowerCase();
    const selectedId =
      advanced.assignee !== 'all' &&
      advanced.assignee !== 'unassigned' &&
      advanced.assignee !== 'assigned'
        ? String(advanced.assignee).toLowerCase()
        : null;

    let list = handlerOptions;
    if (q) {
      list = handlerOptions.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.role.toLowerCase().includes(q) ||
          h.staffId.toLowerCase().includes(q) ||
          (selectedId != null && h.staffId.toLowerCase() === selectedId)
      );
    }
    return list;
  }, [handlerOptions, handlerSearch, advanced.assignee]);

  const counts = useMemo(() => {
    const openQueue = disputes.filter((d) => !isClosedStatus(d.status)).length;
    const pending = disputes.filter((d) => String(d.status).toLowerCase() === 'pending_review').length;
    const open = disputes.filter((d) => String(d.status).toLowerCase() === 'open').length;
    const awaiting = disputes.filter(
      (d) => String(d.status).toLowerCase() === 'awaiting_response'
    ).length;
    const underReview = disputes.filter(
      (d) => String(d.status).toLowerCase() === 'under_review'
    ).length;
    const closed = disputes.filter((d) => isClosedStatus(d.status)).length;
    const unassigned = disputes.filter(
      (d) => !d.assignee && !isClosedStatus(d.status)
    ).length;
    const credits = disputes
      .filter((d) => !isClosedStatus(d.status))
      .reduce((sum, d) => sum + Number(d.creditAmount || 0), 0);
    return {
      openQueue,
      pending,
      open,
      awaiting,
      underReview,
      closed,
      unassigned,
      credits,
      total: disputes.length,
    };
  }, [disputes]);

  const entityTypes = useMemo(() => {
    const set = new Set<string>(KNOWN_ENTITY_TYPES);
    for (const d of disputes) {
      const t = String(d.type || '').trim();
      if (t) set.add(t);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [disputes]);

  const activeAdvanced = countActiveAdvanced(advanced);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = disputes.filter((d) => {
      const status = String(d.status).toLowerCase();

      // Quick status chips (workflow)
      if (statusFilter === 'open_queue' && isClosedStatus(status)) return false;
      if (statusFilter === 'closed' && !isClosedStatus(status)) return false;
      if (
        statusFilter !== 'all' &&
        statusFilter !== 'open_queue' &&
        statusFilter !== 'closed' &&
        status !== statusFilter
      ) {
        return false;
      }

      // Advanced: workflow status (refines further when chip is All / Open queue / Closed)
      if (advanced.status !== 'all' && status !== advanced.status) return false;

      if (advanced.priority !== 'all' && String(d.priority).toLowerCase() !== advanced.priority) {
        return false;
      }
      if (
        advanced.visibility !== 'all' &&
        String(d.visibility || 'pending').toLowerCase() !== advanced.visibility
      ) {
        return false;
      }
      if (advanced.assignee === 'unassigned' && d.assignee) return false;
      if (advanced.assignee === 'assigned' && !d.assignee) return false;
      if (
        advanced.assignee !== 'all' &&
        advanced.assignee !== 'unassigned' &&
        advanced.assignee !== 'assigned'
      ) {
        if (
          !d.assignee ||
          String(d.assignee.staffId).toLowerCase() !== String(advanced.assignee).toLowerCase()
        ) {
          return false;
        }
      }
      if (
        advanced.entityType !== 'all' &&
        String(d.type || '').toLowerCase() !== advanced.entityType.toLowerCase()
      ) {
        return false;
      }
      if (advanced.flag === 'credit_hold' && !d.creditHold) return false;

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
        d.type,
        d.visibility,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });

    const sorted = [...list];
    sorted.sort((a, b) => {
      if (advanced.sort === 'opened_asc') {
        return new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime();
      }
      if (advanced.sort === 'updated_desc') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      if (advanced.sort === 'credits_desc') {
        return Number(b.creditAmount || 0) - Number(a.creditAmount || 0);
      }
      if (advanced.sort === 'priority_desc') {
        const diff =
          (PRIORITY_RANK[String(b.priority).toLowerCase()] || 0) -
          (PRIORITY_RANK[String(a.priority).toLowerCase()] || 0);
        if (diff !== 0) return diff;
      }
      return new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime();
    });
    return sorted;
  }, [disputes, search, statusFilter, advanced]);

  const statusChips: { id: StatusFilter; label: string; count?: number }[] = [
    { id: 'open_queue', label: 'Open queue', count: counts.openQueue },
    { id: 'pending_review', label: 'Pending review', count: counts.pending },
    { id: 'open', label: 'Open', count: counts.open },
    { id: 'awaiting_response', label: 'Awaiting reply', count: counts.awaiting },
    { id: 'under_review', label: 'Under review', count: counts.underReview },
    { id: 'closed', label: 'Closed', count: counts.closed },
    { id: 'all', label: 'All', count: counts.total },
  ];

  const patchAdvanced = (partial: Partial<AdvancedFilters>) => {
    setAdvanced((prev) => ({ ...prev, ...partial }));

    if (partial.status === 'closed') {
      setStatusFilter('closed');
    } else if (
      partial.status === 'pending_review' ||
      partial.status === 'open' ||
      partial.status === 'awaiting_response' ||
      partial.status === 'under_review'
    ) {
      setStatusFilter(partial.status);
    }
  };

  const clearAdvanced = () => {
    setAdvanced(DEFAULT_ADVANCED);
    setHandlerSearch('');
  };

  const onChipClick = (id: StatusFilter) => {
    setStatusFilter(id);
    // Keep advanced status in sync when picking a specific workflow chip
    if (id === 'pending_review' || id === 'open' || id === 'awaiting_response' || id === 'under_review') {
      setAdvanced((prev) => ({ ...prev, status: id }));
    } else if (id === 'closed') {
      setAdvanced((prev) => ({ ...prev, status: 'closed' }));
    } else if (id === 'open_queue' || id === 'all') {
      setAdvanced((prev) => ({
        ...prev,
        status: 'all',
      }));
    }
  };

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
        <SummaryCard label="Closed" value={counts.closed} sub="Resolved cases" />
      </div>

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f1016]">
        <div className="flex flex-col gap-4 border-b border-white/[0.06] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Scale className={`h-4 w-4 ${theme.icon}`} />
              <h2 className="text-sm font-semibold text-white">Dispute desk</h2>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Workflow status for the queue. Assign yourself before handling.
            </p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search number, party, title…"
              className={`w-full rounded-xl border border-white/[0.08] bg-[#14151c] py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 ${theme.focus}`}
            />
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-white/[0.06] px-3 py-2">
          {statusChips.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onChipClick(f.id)}
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

        <div className="space-y-3 border-b border-white/[0.06] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAdvancedOpen((o) => !o)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  advancedOpen || activeAdvanced > 0
                    ? theme.btn
                    : 'border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Advanced filters
                <ChevronDown
                  className={`h-3.5 w-3.5 transition ${advancedOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {activeAdvanced > 0 && (
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${theme.badge}`}>
                  {activeAdvanced} active
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <span>
                Showing <span className="text-zinc-300">{filtered.length}</span> of {disputes.length}
              </span>
              {activeAdvanced > 0 && (
                <button
                  type="button"
                  onClick={clearAdvanced}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-zinc-400 hover:bg-white/5 hover:text-white"
                >
                  <X className="h-3 w-3" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {advancedOpen && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <FilterField label="Status">
                  <select
                    value={advanced.status}
                    onChange={(e) =>
                      patchAdvanced({ status: e.target.value as WorkflowStatusFilter })
                    }
                    className={selectCls}
                  >
                    <option value="all">All statuses</option>
                    {WORKFLOW_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {titleCase(s)}
                      </option>
                    ))}
                  </select>
                </FilterField>

                <FilterField label="Priority">
                  <select
                    value={advanced.priority}
                    onChange={(e) => patchAdvanced({ priority: e.target.value as PriorityFilter })}
                    className={selectCls}
                  >
                    <option value="all">All priorities</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </FilterField>

                <FilterField label="Visibility">
                  <select
                    value={advanced.visibility}
                    onChange={(e) =>
                      patchAdvanced({ visibility: e.target.value as VisibilityFilter })
                    }
                    className={selectCls}
                  >
                    <option value="all">All visibility</option>
                    <option value="pending">Pending</option>
                    <option value="parties">Parties</option>
                    <option value="public">Public</option>
                  </select>
                </FilterField>

                <FilterField label="Handler">
                  <div className="space-y-1.5">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
                      <input
                        value={handlerSearch}
                        onChange={(e) => setHandlerSearch(e.target.value)}
                        placeholder="Search admins & support…"
                        className="w-full rounded-lg border border-white/10 bg-[#0f1016] py-2 pl-8 pr-2 text-xs text-white outline-none placeholder:text-zinc-600"
                      />
                    </div>
                    <select
                      value={advanced.assignee}
                      onChange={(e) => patchAdvanced({ assignee: e.target.value as AssigneeFilter })}
                      className={selectCls}
                    >
                      <option value="all">All handlers</option>
                      <option value="unassigned">Unassigned</option>
                      <option value="assigned">Assigned (anyone)</option>
                      {filteredHandlers.map((h) => (
                        <option key={h.staffId} value={h.staffId}>
                          {h.name} ({h.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </FilterField>

                <FilterField label="Entity type">
                  <select
                    value={advanced.entityType}
                    onChange={(e) => patchAdvanced({ entityType: e.target.value })}
                    className={selectCls}
                  >
                    <option value="all">All entities</option>
                    {entityTypes.map((t) => (
                      <option key={t} value={t}>
                        {titleCase(t)}
                      </option>
                    ))}
                  </select>
                </FilterField>

                <FilterField label="Flags">
                  <select
                    value={advanced.flag}
                    onChange={(e) => patchAdvanced({ flag: e.target.value as FlagFilter })}
                    className={selectCls}
                  >
                    <option value="all">All flags</option>
                    <option value="credit_hold">Has credit hold</option>
                  </select>
                </FilterField>

                <FilterField label="Sort">
                  <select
                    value={advanced.sort}
                    onChange={(e) => patchAdvanced({ sort: e.target.value as SortKey })}
                    className={selectCls}
                  >
                    <option value="opened_desc">Opened (newest)</option>
                    <option value="opened_asc">Opened (oldest)</option>
                    <option value="updated_desc">Recently updated</option>
                    <option value="credits_desc">Credits (high → low)</option>
                    <option value="priority_desc">Priority (high → low)</option>
                  </select>
                </FilterField>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className={`h-6 w-6 animate-spin ${theme.spin}`} />
            </div>
          ) : (
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-3 font-medium">Dispute</th>
                <th className="px-4 py-3 font-medium">Parties</th>
                <th className="px-4 py-3 font-medium">Credits</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Visibility</th>
                <th className="px-4 py-3 font-medium">Handler</th>
                <th className="px-5 py-3 font-medium">Opened</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => {
                return (
                  <tr
                    key={String(d.id)}
                    onClick={() => setSelectedId(d.id)}
                    className="cursor-pointer border-b border-white/[0.04] transition hover:bg-white/[0.03]"
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-white">{d.number}</p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">{d.title}</p>
                      <span
                        className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] ${priorityClass(d.priority)}`}
                      >
                        {titleCase(d.priority)}
                      </span>
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
                    <td className="px-5 py-3.5 text-xs text-zinc-500">{formatDateTime(d.openedAt)}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-sm text-zinc-500">
                    No disputes match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          )}
        </div>
      </section>

      {selectedId != null && (
        <ModeratorDisputeDetailModal
          disputeId={selectedId}
          endpointBase={endpointBase}
          accent={accent}
          adminMode={deskMode}
          deskLabel={deskLabel}
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

export function DisputeDeskLoading({ accent = 'rose' }: { accent?: Accent }) {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className={`h-8 w-8 animate-spin ${ACCENT[accent].spin}`} />
    </div>
  );
}
