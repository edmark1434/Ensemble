import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { peekStaffGet, staffGet } from '@/lib/staffCache';
import { showErrorToast } from '@/components/utility/toast.ts';
import TableFilterBar from '../userTeam/components/TableFilterBar';
import type {
  ActivityFilterOption,
  ModerationActivity,
  ModerationActivityPage,
} from './moderationTypes';
import {
  apiMessage,
  downloadCsv,
  formatExactDateTime,
  formatNumber,
  formatRelative,
  formatShortDateTime,
  severityClass,
  severityLabel,
  statusClass,
} from './moderationFormat';

export const ACTIVITY_LOG_URL = '/api/admin/moderation/activity';

const PAGE_SIZES = [25, 50, 100, 200];

const PERIODS = [
  { id: 'all', label: 'All time', days: null },
  { id: '24h', label: '24 hours', days: 1 },
  { id: '7d', label: '7 days', days: 7 },
  { id: '30d', label: '30 days', days: 30 },
  { id: '90d', label: '90 days', days: 90 },
  { id: 'custom', label: 'Custom', days: null },
] as const;

type PeriodId = (typeof PERIODS)[number]['id'];

type Query = {
  search: string;
  category: string;
  eventCode: string;
  role: string;
  state: string;
  sort: string;
  from: string;
  to: string;
  limit: number;
  offset: number;
};

const INITIAL_QUERY: Query = {
  search: '',
  category: 'all',
  eventCode: 'all',
  role: 'all',
  state: 'all',
  sort: 'newest',
  from: '',
  to: '',
  limit: 50,
  offset: 0,
};

/** Only the keys the API cares about, so the cache key stays stable. */
function toParams(query: Query) {
  return {
    search: query.search,
    category: query.category,
    eventCode: query.eventCode,
    role: query.role,
    state: query.state,
    sort: query.sort,
    from: query.from,
    to: query.to,
    limit: query.limit,
    offset: query.offset,
  };
}

function isoDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function withCounts(options: ActivityFilterOption[]) {
  return options.map((option) => ({
    value: option.value,
    label: option.count != null ? `${option.label} (${option.count})` : option.label,
  }));
}

function StatTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'warning';
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3.5 ${
        tone === 'warning'
          ? 'border-violet-500/25 bg-violet-500/[0.07]'
          : 'border-white/[0.08] bg-[#14151c]'
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tabular-nums text-white">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-zinc-500">{hint}</p> : null}
    </div>
  );
}

/**
 * Moderation → Activity log.
 *
 * Reads the server-side log so filters, totals and paging cover the whole
 * `account_activity` history rather than the slice carried by the page
 * overview. Each row shows the event, its severity, the target, the actor, the
 * record it points at and its reason; the rest opens in the detail modal.
 */
export default function ActivityLogTab({
  onView,
  fallbackEntries = [],
  refreshToken = 0,
}: {
  onView: (entry: ModerationActivity) => void;
  /** Entries from the page overview, shown until the first page arrives. */
  fallbackEntries?: ModerationActivity[];
  /** Bumping this re-fetches, for example after an action was reversed. */
  refreshToken?: number;
}) {
  const [query, setQuery] = useState<Query>(INITIAL_QUERY);
  const [searchInput, setSearchInput] = useState('');
  const [period, setPeriod] = useState<PeriodId>('all');
  const [page, setPage] = useState<ModerationActivityPage | null>(
    () => peekStaffGet(ACTIVITY_LOG_URL, toParams(INITIAL_QUERY))?.data?.data || null
  );
  const [loading, setLoading] = useState(() => !page);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const firstLoad = useRef(true);

  // Debounce typing so each keystroke does not become a request.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery((prev) => (prev.search === searchInput ? prev : { ...prev, search: searchInput, offset: 0 }));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(
    async (next: Query) => {
      const params = toParams(next);
      const cached = peekStaffGet(ACTIVITY_LOG_URL, params);
      if (cached?.data?.data) setPage(cached.data.data);
      else if (firstLoad.current) setLoading(true);
      else setRefreshing(true);
      setError('');
      try {
        const res = await staffGet<{ success: boolean; data: ModerationActivityPage }>(
          ACTIVITY_LOG_URL,
          params
        );
        if (res.data?.success) setPage(res.data.data);
        else setError('Failed to load the activity log');
      } catch (err) {
        if (!cached) setError(apiMessage(err, 'Failed to load the activity log'));
      } finally {
        firstLoad.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    void load(query);
  }, [load, query, refreshToken]);

  const update = (patch: Partial<Query>) =>
    setQuery((prev) => ({ ...prev, offset: 0, ...patch }));

  const applyPeriod = (id: PeriodId) => {
    setPeriod(id);
    const preset = PERIODS.find((entry) => entry.id === id);
    if (id === 'custom') return;
    update({
      from: preset?.days ? isoDaysAgo(preset.days) : '',
      to: '',
    });
  };

  const entries = page?.entries ?? (loading ? [] : fallbackEntries);
  const stats = page?.stats;
  const total = page?.total ?? entries.length;
  const pageStart = total === 0 ? 0 : query.offset + 1;
  const pageEnd = query.offset + entries.length;

  const filterOptions = page?.filters;
  const hasFilters =
    Boolean(query.search) ||
    query.category !== 'all' ||
    query.eventCode !== 'all' ||
    query.role !== 'all' ||
    query.state !== 'all' ||
    Boolean(query.from) ||
    Boolean(query.to);

  const categoryOptions = useMemo(
    () => filterOptions?.categories ?? [],
    [filterOptions]
  );

  const exportCsv = () => {
    if (!entries.length) {
      showErrorToast('There is nothing to export in this view');
      return;
    }
    downloadCsv(
      `moderation-activity-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        'Occurred at',
        'Event code',
        'Event',
        'Action',
        'Category',
        'Severity',
        'Status',
        'Target',
        'Target handle',
        'Target type',
        'Target account ID',
        'Executed by',
        'Role',
        'Staff ID',
        'Reference',
        'Reference table',
        'Reference ID',
        'Reason',
        'Reversed at',
        'Reversed by',
        'Activity ID',
      ],
      entries.map((entry) => [
        entry.timestamp ? new Date(entry.timestamp).toISOString() : '',
        entry.eventCode || '',
        entry.eventLabel || '',
        entry.action,
        entry.categoryLabel || entry.category,
        entry.severity || '',
        entry.status,
        entry.target,
        entry.targetHandle === '—' ? '' : entry.targetHandle,
        entry.targetType,
        entry.accountId || '',
        entry.executedBy,
        entry.executedByRole,
        entry.executedByStaffId || '',
        entry.reference?.label || '',
        entry.reference?.table || '',
        entry.reference?.id || '',
        entry.reason || '',
        entry.reversal?.at || '',
        entry.reversal?.by || '',
        entry.id,
      ])
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile
          label="Entries in view"
          value={formatNumber(total)}
          hint={hasFilters ? 'Matching the current filters' : 'Whole log'}
        />
        <StatTile label="Last 24 hours" value={formatNumber(stats?.last24h ?? 0)} hint="Actions logged" />
        <StatTile label="Last 7 days" value={formatNumber(stats?.last7d ?? 0)} hint="Actions logged" />
        <StatTile
          label="Reversed"
          value={formatNumber(stats?.reversed ?? 0)}
          hint="Undone by staff"
          tone={(stats?.reversed ?? 0) > 0 ? 'warning' : 'default'}
        />
        <StatTile
          label="Accounts · staff"
          value={`${formatNumber(stats?.accounts ?? 0)} · ${formatNumber(stats?.actors ?? 0)}`}
          hint="Targets and actors involved"
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14151c]">
        <div className="flex flex-col gap-3 border-b border-white/[0.06] px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative min-w-[200px] flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search action, event, target, staff, reason, reference…"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2 pl-9 pr-9 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500/15"
              />
              {searchInput ? (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-500 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>

            <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.02] p-1">
              {PERIODS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => applyPeriod(entry.id)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                    period === entry.id
                      ? 'bg-rose-500/15 text-white shadow-[inset_0_0_0_1px_rgba(244,63,94,0.3)]'
                      : 'text-zinc-500 hover:text-zinc-200'
                  }`}
                >
                  {entry.label}
                </button>
              ))}
            </div>

            <div className="hidden flex-1 lg:block" />

            <button
              type="button"
              onClick={() => void load(query)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] px-3 py-2 text-sm text-zinc-300 hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] px-3 py-2 text-sm text-zinc-300 hover:text-white"
            >
              <Download className="h-4 w-4" />
              Export
            </button>

            <TableFilterBar
              filters={[
                {
                  id: 'category',
                  label: 'Category',
                  value: query.category,
                  options: categoryOptions,
                },
                {
                  id: 'eventCode',
                  label: 'Event',
                  value: query.eventCode,
                  options: withCounts(filterOptions?.eventCodes ?? []),
                },
                {
                  id: 'role',
                  label: 'Executed by role',
                  value: query.role,
                  options: [
                    ...withCounts(filterOptions?.roles ?? []),
                    { value: 'system', label: 'System / automated' },
                  ],
                },
                {
                  id: 'state',
                  label: 'Reversal state',
                  value: query.state,
                  options: [
                    { value: 'active', label: 'Still in effect' },
                    { value: 'reversed', label: 'Reversed' },
                  ],
                },
              ]}
              sort={{
                value: query.sort,
                options: [
                  { value: 'newest', label: 'Newest first' },
                  { value: 'oldest', label: 'Oldest first' },
                  { value: 'action', label: 'Action A–Z' },
                  { value: 'event', label: 'Event code A–Z' },
                  { value: 'target', label: 'Target A–Z' },
                ],
              }}
              onFilterChange={(id, value) => update({ [id]: value } as Partial<Query>)}
              onSortChange={(value) => update({ sort: value })}
              onClear={() => {
                setSearchInput('');
                setPeriod('all');
                setQuery({ ...INITIAL_QUERY, limit: query.limit });
              }}
            />
          </div>

          {period === 'custom' ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              <CalendarRange className="h-4 w-4 text-zinc-500" />
              <label className="flex items-center gap-1.5">
                From
                <input
                  type="date"
                  value={query.from}
                  max={query.to || undefined}
                  onChange={(event) => update({ from: event.target.value })}
                  className="rounded-lg border border-white/[0.08] bg-[#0f1016] px-2 py-1.5 text-xs text-white outline-none"
                />
              </label>
              <label className="flex items-center gap-1.5">
                To
                <input
                  type="date"
                  value={query.to}
                  min={query.from || undefined}
                  onChange={(event) => update({ to: event.target.value })}
                  className="rounded-lg border border-white/[0.08] bg-[#0f1016] px-2 py-1.5 text-xs text-white outline-none"
                />
              </label>
              <span className="text-zinc-600">Both bounds are inclusive.</span>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
            <p>
              {total === 0
                ? 'No entries'
                : `Showing ${formatNumber(pageStart)}–${formatNumber(pageEnd)} of ${formatNumber(total)}`}
              {hasFilters ? ' · filtered' : ''}
              {stats?.newest ? ` · newest ${formatRelative(stats.newest)}` : ''}
            </p>
            <label className="flex items-center gap-1.5">
              Rows
              <select
                value={query.limit}
                onChange={(event) => update({ limit: Number(event.target.value) })}
                className="rounded-lg border border-white/[0.08] bg-[#0f1016] px-2 py-1 text-xs text-white outline-none"
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {error ? (
          <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
            <AlertTriangle className="h-8 w-8 text-rose-400" />
            <p className="text-sm text-rose-200">{error}</p>
            <button
              type="button"
              onClick={() => void load(query)}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5"
            >
              Try again
            </button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading activity
          </div>
        ) : (
          <ActivityTable entries={entries} onView={onView} />
        )}

        {total > query.limit ? (
          <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-4 py-3">
            <button
              type="button"
              disabled={query.offset === 0 || refreshing}
              onClick={() =>
                setQuery((prev) => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] px-3 py-2 text-sm text-zinc-300 hover:text-white disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <p className="text-xs text-zinc-500">
              Page {Math.floor(query.offset / query.limit) + 1} of{' '}
              {Math.max(1, Math.ceil(total / query.limit))}
            </p>
            <button
              type="button"
              disabled={!page?.hasMore || refreshing}
              onClick={() => setQuery((prev) => ({ ...prev, offset: prev.offset + prev.limit }))}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] px-3 py-2 text-sm text-zinc-300 hover:text-white disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

/** The log table. Also used for the compact preview on the Overview tab. */
export function ActivityTable({
  entries,
  onView,
  emptyLabel = 'No activity matches this view.',
  compact = false,
}: {
  entries: ModerationActivity[];
  onView: (entry: ModerationActivity) => void;
  emptyLabel?: string;
  compact?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full text-left text-sm ${compact ? 'min-w-[720px]' : 'min-w-[1100px]'}`}>
        <thead>
          <tr className="border-b border-white/[0.06] bg-[#0f1016] text-[10px] uppercase tracking-wide text-zinc-500">
            <th className="px-4 py-3">When</th>
            <th className="px-4 py-3">Action</th>
            {compact ? null : <th className="px-4 py-3">Category</th>}
            <th className="px-4 py-3">Target</th>
            <th className="px-4 py-3">Executed by</th>
            {compact ? null : <th className="px-4 py-3">Reference</th>}
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.id}
              onClick={() => onView(entry)}
              className="cursor-pointer border-b border-white/[0.04] align-top hover:bg-white/[0.02]"
            >
              <td className="px-4 py-3 whitespace-nowrap">
                <p className="text-xs text-zinc-300" title={formatExactDateTime(entry.timestamp)}>
                  {formatShortDateTime(entry.timestamp)}
                </p>
                <p className="text-[10px] text-zinc-600">{formatRelative(entry.timestamp)}</p>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${severityClass(entry.severity || 'low')}`}
                  >
                    {severityLabel(entry.severity || 'low')}
                  </span>
                  <p className="min-w-0 truncate font-medium text-white">{entry.action}</p>
                </div>
                <p className="mt-0.5 line-clamp-1 text-[11px] text-zinc-500">
                  {entry.eventLabel || entry.eventCode}
                  {entry.reason ? ` · ${entry.reason}` : ''}
                </p>
              </td>
              {compact ? null : (
                <td className="px-4 py-3">
                  <p className="text-xs text-zinc-300">{entry.categoryLabel || entry.category}</p>
                  <p className="font-mono text-[10px] text-zinc-600">{entry.eventCode || '—'}</p>
                </td>
              )}
              <td className="px-4 py-3">
                <p className="text-zinc-200">{entry.target}</p>
                <p className="text-[10px] text-zinc-600">
                  {entry.targetHandle && entry.targetHandle !== '—' ? `@${entry.targetHandle} · ` : ''}
                  {entry.targetType}
                </p>
              </td>
              <td className="px-4 py-3">
                <p className="text-zinc-200">{entry.executedBy}</p>
                <p className="text-[10px] text-zinc-600">{entry.executedByRole}</p>
              </td>
              {compact ? null : (
                <td className="px-4 py-3">
                  <p className="font-mono text-[11px] text-zinc-400">
                    {entry.reference?.label || '—'}
                  </p>
                  <p className="text-[10px] text-zinc-600">{entry.reference?.table || ''}</p>
                </td>
              )}
              <td className="px-4 py-3">
                <span
                  className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-xs ${statusClass(entry.status)}`}
                >
                  {entry.status}
                </span>
                {entry.reversal?.reversed && entry.reversal.by ? (
                  <p className="mt-0.5 text-[10px] text-zinc-600">by {entry.reversal.by}</p>
                ) : null}
              </td>
            </tr>
          ))}
          {entries.length === 0 ? (
            <tr>
              <td colSpan={compact ? 5 : 7} className="px-4 py-12 text-center text-zinc-500">
                {emptyLabel}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
