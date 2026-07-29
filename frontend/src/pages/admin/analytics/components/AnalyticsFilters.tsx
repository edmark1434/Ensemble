import { Filter, X } from 'lucide-react';

export type TimeRange = '7d' | '30d' | '90d' | 'all';

export type AnalyticsFilterState = {
  timeRange: TimeRange;
  status: string;
  verification: string;
  meritTier: string;
};

type AnalyticsFiltersProps = {
  filters: AnalyticsFilterState;
  onChange: (next: AnalyticsFilterState) => void;
  resultCount?: number;
  totalCount?: number;
};

const TIME_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

const STATUS_OPTIONS = ['all', 'Active', 'Suspended', 'Banned', 'Pending'];
const VERIFICATION_OPTIONS = ['all', 'Fully verified', 'Partially verified', 'Unverified', 'Pending review'];
const TIER_OPTIONS = ['all', 'Newcomer', 'Contributor', 'Established', 'Veteran', 'Elite'];

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-white/[0.08] bg-[#0f1016] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500/15"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o === 'all' ? 'All' : o}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function AnalyticsFilters({ filters, onChange, resultCount, totalCount }: AnalyticsFiltersProps) {
  const hasActive =
    filters.timeRange !== 'all' ||
    filters.status !== 'all' ||
    filters.verification !== 'all' ||
    filters.meritTier !== 'all';

  const reset = () =>
    onChange({ timeRange: 'all', status: 'all', verification: 'all', meritTier: 'all' });

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <Filter className="h-4 w-4 text-rose-400" />
          Filters
        </div>
        {resultCount != null && totalCount != null && (
          <span className="text-xs text-zinc-500">
            Showing {resultCount} of {totalCount} members
          </span>
        )}
        {hasActive && (
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-1 text-xs text-rose-400 hover:underline"
          >
            <X className="h-3 w-3" />
            Clear filters
          </button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">Time range</span>
          <select
            value={filters.timeRange}
            onChange={(e) => onChange({ ...filters, timeRange: e.target.value as TimeRange })}
            className="rounded-lg border border-white/[0.08] bg-[#0f1016] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500/15"
          >
            {TIME_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <Select label="Member status" value={filters.status} options={STATUS_OPTIONS} onChange={(v) => onChange({ ...filters, status: v })} />
        <Select
          label="Verification"
          value={filters.verification}
          options={VERIFICATION_OPTIONS}
          onChange={(v) => onChange({ ...filters, verification: v })}
        />
        <Select
          label="Merit tier"
          value={filters.meritTier}
          options={TIER_OPTIONS}
          onChange={(v) => onChange({ ...filters, meritTier: v })}
        />
      </div>
    </div>
  );
}

export function meritToTier(merit: number): string {
  if (merit <= 25) return 'Newcomer';
  if (merit <= 50) return 'Contributor';
  if (merit <= 75) return 'Established';
  if (merit <= 100) return 'Veteran';
  return 'Elite';
}

export function filterMembersByState<T extends { joinedAt: string | null; status: string; verification: string; merit: number }>(
  members: T[],
  filters: AnalyticsFilterState
): T[] {
  const now = Date.now();
  const ms: Record<TimeRange, number> = {
    '7d': 7 * 86400000,
    '30d': 30 * 86400000,
    '90d': 90 * 86400000,
    all: Infinity,
  };
  const cutoff = filters.timeRange === 'all' ? 0 : now - ms[filters.timeRange];

  return members.filter((m) => {
    if (filters.timeRange !== 'all' && m.joinedAt) {
      if (new Date(m.joinedAt).getTime() < cutoff) return false;
    }
    if (filters.status !== 'all' && m.status !== filters.status) return false;
    if (filters.verification !== 'all' && m.verification !== filters.verification) return false;
    if (filters.meritTier !== 'all' && meritToTier(m.merit) !== filters.meritTier) return false;
    return true;
  });
}

export function filterSignupWeeks<T extends { weekStart: string }>(weeks: T[], timeRange: TimeRange): T[] {
  if (timeRange === 'all') return weeks;
  if (!weeks.length) return weeks;

  const now = Date.now();
  const ms: Record<Exclude<TimeRange, 'all'>, number> = {
    '7d': 7 * 86400000,
    '30d': 30 * 86400000,
    '90d': 90 * 86400000,
  };
  // Include any week that overlaps the window (week ends up to 7 days after start).
  const cutoff = now - ms[timeRange] - 7 * 86400000;
  const filtered = weeks.filter((w) => new Date(w.weekStart).getTime() >= cutoff);
  return filtered.length ? filtered : weeks.slice(-Math.min(weeks.length, timeRange === '7d' ? 2 : 4));
}
