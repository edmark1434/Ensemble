import { CalendarRange, Filter, X } from 'lucide-react';

export type TimeRange =
  | 'today'
  | '7d'
  | '30d'
  | '90d'
  | 'this_month'
  | 'this_year'
  | 'year'
  | 'custom'
  | 'all';

export type Granularity = 'day' | 'week' | 'month' | 'year';

export type ProfileFilter = 'all' | 'complete' | 'has_avatar' | 'incomplete';
export type CreditBand = 'all' | '0-1k' | '1k-10k' | '10k-50k' | '50k+';
export type SortBy = 'newest' | 'oldest' | 'merit_desc' | 'merit_asc' | 'credits_desc' | 'name';

export type AnalyticsFilterState = {
  timeRange: TimeRange;
  granularity: Granularity;
  year: string; // 'all' | '2026' | ...
  month: string; // 'all' | '01'..'12'
  dateFrom: string; // yyyy-mm-dd
  dateTo: string;
  status: string;
  verification: string;
  meritTier: string;
  profile: ProfileFilter;
  creditBand: CreditBand;
  sortBy: SortBy;
};

type AnalyticsFiltersProps = {
  filters: AnalyticsFilterState;
  onChange: (next: AnalyticsFilterState) => void;
  resultCount?: number;
  totalCount?: number;
  availableYears?: number[];
};

export const DEFAULT_ANALYTICS_FILTERS: AnalyticsFilterState = {
  timeRange: 'all',
  granularity: 'week',
  year: 'all',
  month: 'all',
  dateFrom: '',
  dateTo: '',
  status: 'all',
  verification: 'all',
  meritTier: 'all',
  profile: 'all',
  creditBand: 'all',
  sortBy: 'newest',
};

const TIME_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'this_month', label: 'This month' },
  { value: 'this_year', label: 'This year' },
  { value: 'year', label: 'By calendar year' },
  { value: 'custom', label: 'Custom range' },
  { value: 'all', label: 'All time' },
];

const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

const MONTH_OPTIONS = [
  { value: 'all', label: 'All months' },
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const STATUS_OPTIONS = ['all', 'Active', 'Suspended', 'Banned', 'Pending'];
const VERIFICATION_OPTIONS = ['all', 'Fully verified', 'Partially verified', 'Unverified', 'Pending review'];
const TIER_OPTIONS = ['all', 'Newcomer', 'Contributor', 'Established', 'Veteran', 'Elite'];
const PROFILE_OPTIONS: { value: ProfileFilter; label: string }[] = [
  { value: 'all', label: 'All profiles' },
  { value: 'complete', label: 'Complete (avatar + tagline)' },
  { value: 'has_avatar', label: 'Has avatar' },
  { value: 'incomplete', label: 'Incomplete' },
];
const CREDIT_OPTIONS: { value: CreditBand; label: string }[] = [
  { value: 'all', label: 'Any credits' },
  { value: '0-1k', label: '0 – 1,000' },
  { value: '1k-10k', label: '1,000 – 10,000' },
  { value: '10k-50k', label: '10,000 – 50,000' },
  { value: '50k+', label: '50,000+' },
];
const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'merit_desc', label: 'Merit high → low' },
  { value: 'merit_asc', label: 'Merit low → high' },
  { value: 'credits_desc', label: 'Credits high → low' },
  { value: 'name', label: 'Name A → Z' },
];

const fieldClass =
  'rounded-lg border border-white/10 bg-[#0c0d12] px-3 py-2 text-sm text-white outline-none transition focus:border-rose-500/40 focus:ring-2 focus:ring-rose-500/15';

function FieldLabel({ children }: { children: string }) {
  return <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{children}</span>;
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[] | string[];
  onChange: (v: string) => void;
}) {
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o === 'all' ? 'All' : o } : o));
  return (
    <label className="flex flex-col gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass}>
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** Resolve active date window from filters. Null bounds = unbounded. */
export function resolveDateWindow(filters: AnalyticsFilterState): { from: Date | null; to: Date | null } {
  const now = new Date();
  const todayStart = startOfDay(now);

  switch (filters.timeRange) {
    case 'today':
      return { from: todayStart, to: endOfDay(now) };
    case '7d':
      return { from: new Date(todayStart.getTime() - 6 * 86400000), to: endOfDay(now) };
    case '30d':
      return { from: new Date(todayStart.getTime() - 29 * 86400000), to: endOfDay(now) };
    case '90d':
      return { from: new Date(todayStart.getTime() - 89 * 86400000), to: endOfDay(now) };
    case 'this_month':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) };
    case 'this_year':
      return { from: new Date(now.getFullYear(), 0, 1), to: endOfDay(now) };
    case 'year': {
      if (filters.year === 'all') return { from: null, to: null };
      const y = Number(filters.year);
      const month = filters.month === 'all' ? null : Number(filters.month) - 1;
      if (month == null) {
        return { from: new Date(y, 0, 1), to: endOfDay(new Date(y, 11, 31)) };
      }
      return {
        from: new Date(y, month, 1),
        to: endOfDay(new Date(y, month + 1, 0)),
      };
    }
    case 'custom': {
      const from = filters.dateFrom ? startOfDay(new Date(filters.dateFrom)) : null;
      const to = filters.dateTo ? endOfDay(new Date(filters.dateTo)) : null;
      return { from, to };
    }
    case 'all':
    default:
      return { from: null, to: null };
  }
}

export function isFilterActive(filters: AnalyticsFilterState): boolean {
  return (
    filters.timeRange !== 'all' ||
    filters.year !== 'all' ||
    filters.month !== 'all' ||
    Boolean(filters.dateFrom) ||
    Boolean(filters.dateTo) ||
    filters.status !== 'all' ||
    filters.verification !== 'all' ||
    filters.meritTier !== 'all' ||
    filters.profile !== 'all' ||
    filters.creditBand !== 'all' ||
    filters.sortBy !== 'newest' ||
    filters.granularity !== 'week'
  );
}

export default function AnalyticsFilters({
  filters,
  onChange,
  resultCount,
  totalCount,
  availableYears = [new Date().getFullYear()],
}: AnalyticsFiltersProps) {
  const active = isFilterActive(filters);
  const showYearMonth = filters.timeRange === 'year';
  const showCustom = filters.timeRange === 'custom';

  const yearOptions = [
    { value: 'all', label: 'All years' },
    ...availableYears.map((y) => ({ value: String(y), label: String(y) })),
  ];

  const reset = () => onChange({ ...DEFAULT_ANALYTICS_FILTERS });

  const patch = (partial: Partial<AnalyticsFilterState>) => onChange({ ...filters, ...partial });

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#12131a] p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10">
            <Filter className="h-4 w-4 text-rose-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Filters</p>
            <p className="text-[11px] text-zinc-500">Date, period, audience, and sorting</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {resultCount != null && totalCount != null && (
            <span className="text-xs tabular-nums text-zinc-500">
              {resultCount} / {totalCount} members
            </span>
          )}
          {active && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-rose-300 hover:bg-white/[0.03]"
            >
              <X className="h-3 w-3" />
              Clear all
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            <CalendarRange className="h-3.5 w-3.5" />
            Time & period
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SelectField
              label="Date range"
              value={filters.timeRange}
              options={TIME_OPTIONS}
              onChange={(v) =>
                patch({
                  timeRange: v as TimeRange,
                  ...(v !== 'year' ? { year: 'all', month: 'all' } : {}),
                  ...(v !== 'custom' ? { dateFrom: '', dateTo: '' } : {}),
                })
              }
            />
            <SelectField
              label="Chart granularity"
              value={filters.granularity}
              options={GRANULARITY_OPTIONS}
              onChange={(v) => patch({ granularity: v as Granularity })}
            />
            {showYearMonth && (
              <>
                <SelectField
                  label="Year"
                  value={filters.year}
                  options={yearOptions}
                  onChange={(v) => patch({ year: v })}
                />
                <SelectField
                  label="Month"
                  value={filters.month}
                  options={MONTH_OPTIONS}
                  onChange={(v) => patch({ month: v })}
                />
              </>
            )}
            {showCustom && (
              <>
                <label className="flex flex-col gap-1.5">
                  <FieldLabel>From date</FieldLabel>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => patch({ dateFrom: e.target.value })}
                    className={fieldClass}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <FieldLabel>To date</FieldLabel>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => patch({ dateTo: e.target.value })}
                    className={fieldClass}
                  />
                </label>
              </>
            )}
          </div>
        </div>

        <div className="border-t border-white/[0.06] pt-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Audience</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <SelectField
              label="Status"
              value={filters.status}
              options={STATUS_OPTIONS}
              onChange={(v) => patch({ status: v })}
            />
            <SelectField
              label="Verification"
              value={filters.verification}
              options={VERIFICATION_OPTIONS}
              onChange={(v) => patch({ verification: v })}
            />
            <SelectField
              label="Merit tier"
              value={filters.meritTier}
              options={TIER_OPTIONS}
              onChange={(v) => patch({ meritTier: v })}
            />
            <SelectField
              label="Profile"
              value={filters.profile}
              options={PROFILE_OPTIONS}
              onChange={(v) => patch({ profile: v as ProfileFilter })}
            />
            <SelectField
              label="Credits"
              value={filters.creditBand}
              options={CREDIT_OPTIONS}
              onChange={(v) => patch({ creditBand: v as CreditBand })}
            />
            <SelectField
              label="Sort by"
              value={filters.sortBy}
              options={SORT_OPTIONS}
              onChange={(v) => patch({ sortBy: v as SortBy })}
            />
          </div>
        </div>
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

function matchesCreditBand(credits: number, band: CreditBand): boolean {
  if (band === 'all') return true;
  if (band === '0-1k') return credits <= 1000;
  if (band === '1k-10k') return credits > 1000 && credits <= 10000;
  if (band === '10k-50k') return credits > 10000 && credits <= 50000;
  if (band === '50k+') return credits > 50000;
  return true;
}

function matchesProfile(
  m: { hasAvatar: boolean; hasTagline: boolean },
  profile: ProfileFilter
): boolean {
  if (profile === 'all') return true;
  if (profile === 'complete') return m.hasAvatar && m.hasTagline;
  if (profile === 'has_avatar') return m.hasAvatar;
  if (profile === 'incomplete') return !(m.hasAvatar && m.hasTagline);
  return true;
}

export function filterMembersByState<
  T extends {
    joinedAt: string | null;
    status: string;
    verification: string;
    merit: number;
    credits: number;
    hasAvatar: boolean;
    hasTagline: boolean;
    name: string;
  },
>(members: T[], filters: AnalyticsFilterState): T[] {
  const { from, to } = resolveDateWindow(filters);

  let list = members.filter((m) => {
    if (m.joinedAt) {
      const t = new Date(m.joinedAt).getTime();
      if (from && t < from.getTime()) return false;
      if (to && t > to.getTime()) return false;
    } else if (from || to) {
      return false;
    }
    if (filters.status !== 'all' && m.status !== filters.status) return false;
    if (filters.verification !== 'all' && m.verification !== filters.verification) return false;
    if (filters.meritTier !== 'all' && meritToTier(m.merit) !== filters.meritTier) return false;
    if (!matchesProfile(m, filters.profile)) return false;
    if (!matchesCreditBand(m.credits, filters.creditBand)) return false;
    return true;
  });

  list = [...list].sort((a, b) => {
    switch (filters.sortBy) {
      case 'oldest':
        return new Date(a.joinedAt || 0).getTime() - new Date(b.joinedAt || 0).getTime();
      case 'merit_desc':
        return b.merit - a.merit;
      case 'merit_asc':
        return a.merit - b.merit;
      case 'credits_desc':
        return b.credits - a.credits;
      case 'name':
        return a.name.localeCompare(b.name);
      case 'newest':
      default:
        return new Date(b.joinedAt || 0).getTime() - new Date(a.joinedAt || 0).getTime();
    }
  });

  return list;
}

export function filterByDateWindow<T extends { weekStart?: string; monthStart?: string; joinedAt?: string | null }>(
  rows: T[],
  filters: AnalyticsFilterState,
  dateKey: 'weekStart' | 'monthStart' | 'joinedAt' = 'weekStart'
): T[] {
  const { from, to } = resolveDateWindow(filters);
  if (!from && !to) return rows;

  const filtered = rows.filter((row) => {
    const raw = row[dateKey];
    if (!raw) return false;
    const t = new Date(raw).getTime();
    if (from && t < from.getTime() - 7 * 86400000 && dateKey === 'weekStart') {
      // keep week if it overlaps window
      const weekEnd = t + 7 * 86400000;
      if (weekEnd < from.getTime()) return false;
    } else if (from && t < from.getTime() && dateKey !== 'weekStart') {
      return false;
    }
    if (to && t > to.getTime()) return false;
    return true;
  });

  return filtered.length ? filtered : rows.slice(-Math.min(rows.length, 4));
}

/** @deprecated use filterByDateWindow */
export function filterSignupWeeks<T extends { weekStart: string }>(
  weeks: T[],
  timeRangeOrFilters: TimeRange | AnalyticsFilterState
): T[] {
  if (typeof timeRangeOrFilters === 'string') {
    return filterByDateWindow(weeks, { ...DEFAULT_ANALYTICS_FILTERS, timeRange: timeRangeOrFilters }, 'weekStart');
  }
  return filterByDateWindow(weeks, timeRangeOrFilters, 'weekStart');
}
