import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Info, type LucideIcon } from 'lucide-react';
import { useCountUp } from '@/pages/staff/consoleMotion';
import type { AnalyticsAlert, Kpi } from './analyticsTypes';
import { deltaOf, fmtInt, type Trend } from './analyticsFormat';
import type { GlossaryId } from './analyticsGlossary';
import { InfoButton } from './analyticsInfo';

export function Panel({
  title,
  subtitle,
  action,
  info,
  children,
  className = '',
}: {
  title?: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  /** Definition shown from the ⓘ next to the title. */
  info?: GlossaryId;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-white/[0.07] bg-[#12131a] p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h3 className="flex items-center gap-1.5 text-sm font-semibold tracking-tight text-white">
                {title}
                {info && <InfoButton id={info} />}
              </h3>
            )}
            {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function DeltaBadge({ kpi, trend = 'up-good' }: { kpi: Kpi | null | undefined; trend?: Trend }) {
  const delta = deltaOf(kpi);
  if (!delta) return null;
  const good = trend === 'neutral' || delta.direction === 0 ? null : (delta.direction > 0) === (trend === 'up-good');
  const tone =
    good == null ? 'bg-white/[0.05] text-zinc-400' : good ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300';
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${tone}`}
      title={kpi?.previous != null ? `Previous period: ${fmtInt(kpi.previous)}` : undefined}
    >
      {delta.text}
    </span>
  );
}

export function Sparkline({ values, color = '#fb7185' }: { values: (number | null)[]; color?: string }) {
  const points = values.map((v) => (v == null ? null : v));
  const numeric = points.filter((v): v is number => v != null);
  if (numeric.length < 2) return null;
  const max = Math.max(...numeric, 1);
  const min = Math.min(...numeric, 0);
  const span = max - min || 1;
  const w = 100;
  const h = 28;
  const step = points.length > 1 ? w / (points.length - 1) : w;
  const segments: string[] = [];
  let current: string[] = [];
  points.forEach((v, i) => {
    if (v == null) {
      if (current.length) segments.push(current.join(' '));
      current = [];
      return;
    }
    current.push(`${(i * step).toFixed(2)},${(h - 2 - ((v - min) / span) * (h - 4)).toFixed(2)}`);
  });
  if (current.length) segments.push(current.join(' '));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-7 w-full" aria-hidden="true">
      {segments.map((pts, i) => (
        <polyline key={i} points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const shown = useCountUp(value);
  return <>{format(shown)}</>;
}

export function StatTile({
  label,
  value,
  format = fmtInt,
  kpi,
  trend = 'up-good',
  sub,
  icon: Icon,
  spark,
  sparkColor,
  href,
  animate,
  empty,
  info,
}: {
  label: string;
  value: number | null;
  format?: (n: number) => string;
  kpi?: Kpi | null;
  trend?: Trend;
  sub?: ReactNode;
  icon?: LucideIcon;
  spark?: (number | null)[];
  sparkColor?: string;
  href?: string;
  /** Count-up animation; on by default for whole numbers. */
  animate?: boolean;
  /** Shown instead of the value when it is null. */
  empty?: string;
  /** Definition shown from the ⓘ next to the label. */
  info?: GlossaryId;
}) {
  const whole = value != null && Number.isInteger(value);
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="flex min-w-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          <span className="truncate">{label}</span>
          {info && <InfoButton id={info} />}
        </p>
        {Icon && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-500/10">
            <Icon className="h-3.5 w-3.5 text-rose-400" />
          </span>
        )}
      </div>
      <div className="mt-1 flex flex-wrap items-baseline gap-2">
        <p className="break-words text-2xl font-semibold tabular-nums tracking-tight text-white">
          {value == null ? (
            <span className="text-base font-medium text-zinc-500">{empty || '—'}</span>
          ) : (animate ?? whole) ? (
            <AnimatedNumber value={value} format={format} />
          ) : (
            format(value)
          )}
        </p>
        <DeltaBadge kpi={kpi} trend={trend} />
      </div>
      {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
      {spark && (
        <div className="mt-2">
          <Sparkline values={spark} color={sparkColor} />
        </div>
      )}
    </>
  );
  const cls = 'console-lift block rounded-2xl border border-white/[0.07] bg-[#12131a] p-4';
  if (href) {
    return (
      <Link to={href} className={`${cls} hover:border-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40`}>
        {body}
      </Link>
    );
  }
  return <div className={cls}>{body}</div>;
}

export function MetricRows({
  rows,
}: {
  rows: [label: ReactNode, value: ReactNode, hint?: ReactNode, info?: GlossaryId][];
}) {
  return (
    <dl className="divide-y divide-white/[0.05]">
      {rows.map(([label, value, hint, info], i) => (
        <div key={i} className="flex items-baseline justify-between gap-4 py-2 text-sm">
          <dt className="min-w-0 text-zinc-400">
            {label}
            {info && <InfoButton id={info} className="ml-1.5 -translate-y-px" />}
            {hint && <span className="mt-0.5 block text-[11px] text-zinc-600">{hint}</span>}
          </dt>
          <dd className="shrink-0 text-right font-medium tabular-nums text-white">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warning'; children: ReactNode }) {
  const Icon = tone === 'warning' ? AlertTriangle : Info;
  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${
        tone === 'warning' ? 'border-amber-500/25 bg-amber-500/[0.07] text-amber-100' : 'border-white/[0.08] bg-white/[0.02] text-zinc-300'
      }`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone === 'warning' ? 'text-amber-400' : 'text-zinc-500'}`} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function AlertList({ alerts, limit }: { alerts: AnalyticsAlert[]; limit?: number }) {
  const shown = limit ? alerts.slice(0, limit) : alerts;
  if (!shown.length) {
    return <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-zinc-500">Nothing needs attention right now.</p>;
  }
  return (
    <ul className="space-y-2">
      {shown.map((a) => {
        const inner = (
          <>
            <span
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.severity === 'warning' ? 'bg-amber-400' : 'bg-zinc-500'}`}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-white">{a.title}</span>
              <span className="mt-0.5 block text-xs text-zinc-500">{a.detail}</span>
            </span>
            {a.href && <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-zinc-600 transition group-hover:text-rose-300" />}
          </>
        );
        return (
          <li key={a.id}>
            {a.href ? (
              <Link
                to={a.href}
                className="group flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 hover:border-white/15 hover:bg-white/[0.04]"
              >
                {inner}
              </Link>
            ) : (
              <div className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

const STATUS_TONES: [RegExp, string][] = [
  [/^(paid|succeeded|completed|active|approved)$/i, 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'],
  [/^(pending|processing|scheduled|accepted|requested|in progress|trial)$/i, 'border-amber-500/20 bg-amber-500/10 text-amber-300'],
  [/^(failed|rejected|reversed|expired|cancelled|canceled|voided|banned|suspended)$/i, 'border-rose-500/20 bg-rose-500/10 text-rose-300'],
];

export function StatusPill({ status, label }: { status: string; label?: string }) {
  const tone = STATUS_TONES.find(([re]) => re.test(status))?.[1] || 'border-white/10 bg-white/[0.04] text-zinc-300';
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone}`}>
      {label || status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
    </span>
  );
}

export function SimpleTable({
  columns,
  rows,
  empty = 'Nothing in this period.',
}: {
  columns: { label: string; align?: 'right' }[];
  rows: ReactNode[][];
  empty?: string;
}) {
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full min-w-[420px] text-left text-sm">
        <thead>
          <tr className="border-y border-white/[0.06] bg-[#0c0d12] text-[10px] uppercase tracking-wide text-zinc-500">
            {columns.map((c) => (
              <th key={c.label} className={`px-5 py-2.5 font-medium ${c.align === 'right' ? 'text-right' : ''}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/[0.04] text-zinc-300 last:border-0">
              {row.map((cell, j) => (
                <td key={j} className={`px-5 py-2.5 ${columns[j]?.align === 'right' ? 'text-right tabular-nums' : ''}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-5 py-8 text-center text-sm text-zinc-500">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function ProgressRow({ label, value, total, color = '#fb7185', hint }: { label: string; value: number; total: number; color?: string; hint?: string }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
        <span className="truncate text-zinc-400">{label}</span>
        <span className="shrink-0 tabular-nums text-white">
          {fmtInt(value)}
          <span className="ml-1.5 text-xs text-zinc-500">{total > 0 ? `${Math.round(pct)}%` : '—'}</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]" title={hint}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
