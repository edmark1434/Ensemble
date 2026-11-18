import type { Bucket, Kpi, SeriesPoint } from './analyticsTypes';

const INT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const COMPACT = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const PHP = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function fmtInt(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—';
  return INT.format(value);
}

export function fmtCompact(value: number) {
  return Math.abs(value) < 10_000 ? INT.format(value) : COMPACT.format(value);
}

export function fmtPhp(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value < 0 ? '−' : ''}₱${PHP.format(Math.abs(value))}`;
}

/** Pesos without centavos past ₱10,000 and compact past ₱1M, for tiles and axes. */
export function fmtPhpShort(value: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? '−' : '';
  if (abs >= 1_000_000) return `${sign}₱${COMPACT.format(abs)}`;
  if (abs >= 10_000) return `${sign}₱${INT.format(abs)}`;
  return `${sign}₱${PHP.format(abs)}`;
}

export function fmtCredits(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${INT.format(value)} cr`;
}

export function fmtPct(ratio: number | null | undefined, digits = 0) {
  if (ratio == null || !Number.isFinite(ratio)) return '—';
  return `${(ratio * 100).toFixed(digits)}%`;
}

export function share(part: number, total: number) {
  return total > 0 ? part / total : 0;
}

export function fmtHours(hours: number | null | undefined) {
  if (hours == null || !Number.isFinite(hours)) return '—';
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} days`;
}

/** `YYYY-MM-DD` as a local calendar date (never shifted by the time zone). */
export function parseDay(day: string) {
  const [y, m, d] = day.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function fmtDay(day: string | null | undefined, withYear = true) {
  if (!day) return '—';
  return parseDay(day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' } : {}),
  });
}

export function fmtDateTime(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function fmtAge(value: string | null | undefined) {
  if (!value) return '—';
  const hours = (Date.now() - new Date(value).getTime()) / 3_600_000;
  if (!Number.isFinite(hours) || hours < 0) return '—';
  return fmtHours(hours);
}

/** Short x-axis label for a series bucket. */
export function bucketLabel(start: string, bucket: Bucket, spansYears = false) {
  const date = parseDay(start);
  if (bucket === 'month') {
    return date.toLocaleDateString('en-US', { month: 'short', ...(spansYears ? { year: '2-digit' } : {}) });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Full tooltip label: "Week of Nov 10 – Nov 16 (partial)". */
export function bucketTitle(point: Pick<SeriesPoint, 'start' | 'end' | 'partial'>, bucket: Bucket) {
  const partial = point.partial ? ' (partial)' : '';
  if (bucket === 'day') return `${fmtDay(point.start)}${partial}`;
  if (bucket === 'month') {
    return `${parseDay(point.start).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}${partial}`;
  }
  return `Week of ${fmtDay(point.start, false)} – ${fmtDay(point.end, false)}${partial}`;
}

export function seriesLabels(series: SeriesPoint[], bucket: Bucket) {
  const years = new Set(series.map((p) => p.start.slice(0, 4)));
  return series.map((p) => bucketLabel(p.start, bucket, years.size > 1));
}

export type Trend = 'up-good' | 'up-bad' | 'neutral';

/** Change vs the previous period, or null when there is nothing to compare. */
export function deltaOf(kpi: Kpi | null | undefined) {
  if (!kpi || kpi.previous == null) return null;
  if (kpi.changePct == null) {
    if (kpi.value === kpi.previous) return { text: 'No change', direction: 0 as const };
    return { text: kpi.previous === 0 ? 'Up from 0' : '—', direction: (kpi.value > kpi.previous ? 1 : -1) as 1 | -1 };
  }
  const direction = kpi.changePct > 0 ? 1 : kpi.changePct < 0 ? -1 : 0;
  const abs = Math.abs(kpi.changePct);
  const text = direction === 0 ? 'No change' : `${direction > 0 ? '+' : '−'}${abs >= 100 ? Math.round(abs) : abs}%`;
  return { text, direction: direction as -1 | 0 | 1 };
}

export function sumKpis(...kpis: (Kpi | null | undefined)[]): Kpi {
  const value = kpis.reduce((s, k) => s + (k?.value ?? 0), 0);
  const hasPrev = kpis.every((k) => k && k.previous != null);
  const previous = hasPrev ? kpis.reduce((s, k) => s + (k?.previous ?? 0), 0) : null;
  const changePct = previous ? Math.round(((value - previous) / Math.abs(previous)) * 1000) / 10 : null;
  return { value, previous, changePct };
}

/** One color per metric everywhere on the page, so a series reads the same in every chart. */
export const SERIES_COLORS = {
  signups: '#fb7185',
  active: '#60a5fa',
  topups: '#34d399',
  subscriptions: '#a78bfa',
  cashouts: '#fbbf24',
  fees: '#2dd4bf',
  tickets: '#60a5fa',
  reports: '#fbbf24',
  listings: '#a78bfa',
  muted: '#52525b',
} as const;

export function titleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
