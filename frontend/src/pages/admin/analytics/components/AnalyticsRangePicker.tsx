import { useEffect, useRef, useState } from 'react';
import { CalendarRange, Check } from 'lucide-react';
import type { Bucket, RangeKey } from '../analyticsTypes';

export type RangeSelection = { range: RangeKey; from?: string; to?: string; bucket?: Bucket };

const PRESETS: { key: Exclude<RangeKey, 'custom'>; label: string; short: string }[] = [
  { key: '7d', label: 'Last 7 days', short: '7D' },
  { key: '30d', label: 'Last 30 days', short: '30D' },
  { key: '90d', label: 'Last 90 days', short: '90D' },
  { key: '12m', label: 'Last 12 months', short: '12M' },
  { key: 'ytd', label: 'Year to date', short: 'YTD' },
  { key: 'all', label: 'All time', short: 'All' },
];

const BUCKET_OPTIONS: { value: '' | Bucket; label: string }[] = [
  { value: '', label: 'Auto' },
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
];

/** Mirrors `bucketAllowed` in AdminAnalyticsServices.js. */
function bucketAllowed(bucket: Bucket, days: number) {
  if (bucket === 'day') return days <= 92;
  if (bucket === 'week') return days <= 3 * 366;
  return true;
}

function daysInclusive(from: string, to: string) {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000) + 1;
}

const control =
  'rounded-lg border border-white/10 bg-[#0c0d12] px-3 py-2 text-sm text-white outline-none transition focus:border-rose-500/40 focus:ring-2 focus:ring-rose-500/15';

export default function AnalyticsRangePicker({
  value,
  days,
  today,
  onChange,
  disabled,
}: {
  value: RangeSelection;
  /** Days in the range the server resolved (drives which intervals are offered). */
  days: number | null;
  today: string | null;
  onChange: (next: RangeSelection) => void;
  disabled?: boolean;
}) {
  const [customOpen, setCustomOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(value.from || '');
  const [draftTo, setDraftTo] = useState(value.to || '');
  const [error, setError] = useState('');
  const popRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!customOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCustomOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setCustomOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [customOpen]);

  const openCustom = () => {
    setDraftFrom(value.from || '');
    setDraftTo(value.to || today || '');
    setError('');
    setCustomOpen((open) => !open);
  };

  const applyCustom = () => {
    if (!draftFrom || !draftTo) {
      setError('Pick both dates.');
      return;
    }
    if (draftFrom > draftTo) {
      setError('The start date must be on or before the end date.');
      return;
    }
    const span = daysInclusive(draftFrom, draftTo);
    if (span > 3 * 366) {
      setError('Custom ranges can cover at most three years.');
      return;
    }
    const keepBucket = value.bucket && bucketAllowed(value.bucket, span) ? value.bucket : undefined;
    onChange({ range: 'custom', from: draftFrom, to: draftTo, bucket: keepBucket });
    setCustomOpen(false);
  };

  const pickPreset = (key: Exclude<RangeKey, 'custom'>) => {
    // A manual interval that no longer fits (e.g. Daily on 12 months) falls back to Auto.
    onChange({ range: key, bucket: undefined });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label="Date range" className="flex flex-wrap rounded-xl border border-white/10 bg-white/[0.02] p-0.5">
        {PRESETS.map((p) => {
          const active = value.range === p.key;
          return (
            <button
              key={p.key}
              type="button"
              title={p.label}
              aria-pressed={active}
              disabled={disabled}
              onClick={() => pickPreset(p.key)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                active ? 'bg-rose-500/15 text-rose-200' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {p.short}
            </button>
          );
        })}
        <div className="relative" ref={popRef}>
          <button
            type="button"
            aria-pressed={value.range === 'custom'}
            aria-expanded={customOpen}
            disabled={disabled}
            onClick={openCustom}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
              value.range === 'custom' ? 'bg-rose-500/15 text-rose-200' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <CalendarRange className="h-3.5 w-3.5" />
            Custom
          </button>
          {customOpen && (
            <div className="absolute right-0 top-full z-40 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-white/10 bg-[#14151c] p-4 shadow-2xl">
              <p className="text-sm font-semibold text-white">Custom range</p>
              <div className="mt-3 grid gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">From</span>
                  <input type="date" value={draftFrom} max={draftTo || today || undefined} onChange={(e) => setDraftFrom(e.target.value)} className={control} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">To</span>
                  <input type="date" value={draftTo} min={draftFrom || undefined} max={today || undefined} onChange={(e) => setDraftTo(e.target.value)} className={control} />
                </label>
              </div>
              {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setCustomOpen(false)} className="rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:text-white">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyCustom}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-100 hover:bg-rose-500/30"
                >
                  <Check className="h-3.5 w-3.5" />
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <label className="sr-only" htmlFor="analytics-interval">
        Chart interval
      </label>
      <select
        id="analytics-interval"
        value={value.bucket || ''}
        disabled={disabled}
        onChange={(e) => onChange({ ...value, bucket: (e.target.value || undefined) as Bucket | undefined })}
        className={`${control} py-1.5 text-xs`}
        title="Chart interval"
      >
        {BUCKET_OPTIONS.map((o) => (
          <option key={o.value} value={o.value} disabled={o.value !== '' && days != null && !bucketAllowed(o.value, days)}>
            {o.value === '' ? 'Interval: auto' : o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
