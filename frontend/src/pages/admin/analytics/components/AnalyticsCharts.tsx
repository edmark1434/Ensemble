import { useMemo, useState, type ReactNode } from 'react';

/**
 * Shared console charts (Analytics, Tickets, moderator dashboards). Plain SVG, no chart
 * library. Every chart takes an optional `formatValue` for tooltips and axes, and solid
 * fills only (the console theme has no gradients).
 */

type ChartPoint = { label: string; value: number };
type LineSeries = { label: string; color: string; values: (number | null)[] };
type Formatter = (n: number) => string;

const GRID = 'rgba(255,255,255,0.05)';
const LABEL = '#71717a';
const NUMBER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const defaultFormat: Formatter = (n) => NUMBER.format(n);

function EmptyChart({ title, subtitle, message = 'No data in the selected range' }: { title?: string; subtitle?: string; message?: string }) {
  return (
    <div>
      {title && <ChartTitle title={title} subtitle={subtitle} />}
      <div className="flex h-52 items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#0c0d12] px-4 text-center text-sm text-zinc-500">
        {message}
      </div>
    </div>
  );
}

function ChartTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <p className="text-sm font-semibold tracking-tight text-white">{title}</p>
      {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
    </div>
  );
}

function formatTick(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1000) return `${(n / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
  if (abs > 0 && abs < 10 && !Number.isInteger(n)) return n.toFixed(1);
  return String(Math.round(n));
}

/** Keeps a floating tooltip inside the chart: anchors it left/right of the point. */
function tooltipStyle(xPct: number) {
  if (xPct > 60) return { right: `${100 - xPct}%`, marginRight: 8 };
  return { left: `${xPct}%`, marginLeft: 8 };
}

export function LineChart({
  labels,
  series,
  height = 240,
  title,
  subtitle,
  formatValue = defaultFormat,
  tooltipLabels,
  emptyMessage,
}: {
  labels: string[];
  series: LineSeries[];
  height?: number;
  title?: string;
  subtitle?: string;
  formatValue?: Formatter;
  /** Longer label per point for the tooltip (defaults to `labels`). */
  tooltipLabels?: string[];
  emptyMessage?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  const visible = series.filter((s) => !hidden[s.label]);
  const hasData = labels.length > 0 && series.some((s) => s.values.some((v) => v != null));
  if (!hasData) return <EmptyChart title={title} subtitle={subtitle} message={emptyMessage} />;

  const width = 640;
  const padL = 44;
  const padR = 16;
  const padT = 16;
  const padB = 36;
  const allValues = visible.flatMap((s) => s.values.filter((v): v is number => v != null));
  const max = Math.max(...allValues, 1);
  const n = Math.max(labels.length, 1);
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const dense = n > 40;

  const toX = (i: number) => (n === 1 ? padL + plotW / 2 : padL + (i / (n - 1)) * plotW);
  const toY = (v: number) => padT + plotH - (v / max) * plotH;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => max * (1 - t));
  const labelStep = Math.max(1, Math.ceil(labels.length / 6));

  const segmentsOf = (values: (number | null)[]) => {
    const out: string[] = [];
    let current: string[] = [];
    values.forEach((v, i) => {
      if (v == null) {
        if (current.length) out.push(current.join(' '));
        current = [];
      } else {
        current.push(`${toX(i)},${toY(v)}`);
      }
    });
    if (current.length) out.push(current.join(' '));
    return out;
  };

  return (
    <div>
      {title && <ChartTitle title={title} subtitle={subtitle} />}
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full"
          preserveAspectRatio="xMidYMid meet"
          onMouseLeave={() => setHover(null)}
          role="img"
          aria-label={title}
        >
          {yTicks.map((v, i) => {
            const y = toY(v);
            return (
              <g key={i}>
                <line x1={padL} x2={width - padR} y1={y} y2={y} stroke={GRID} strokeWidth="1" />
                <text x={padL - 8} y={y + 3} textAnchor="end" fill={LABEL} fontSize="10">
                  {formatTick(v)}
                </text>
              </g>
            );
          })}

          {labels.map((label, i) => {
            if (i % labelStep !== 0 && i !== labels.length - 1) return null;
            if (i === labels.length - 1 && i % labelStep !== 0 && labels.length - 1 - (i - (i % labelStep)) < labelStep / 2) return null;
            return (
              <text key={`${label}-${i}`} x={toX(i)} y={height - 10} textAnchor="middle" fill={LABEL} fontSize="10">
                {label}
              </text>
            );
          })}

          {hover != null && (
            <line
              x1={toX(hover)}
              x2={toX(hover)}
              y1={padT}
              y2={padT + plotH}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          )}

          {visible.map((s) => (
            <g key={s.label}>
              {segmentsOf(s.values).map((pts, i) =>
                pts.includes(' ') ? (
                  <polyline key={i} fill="none" stroke={s.color} strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" points={pts} />
                ) : null
              )}
              {s.values.map((v, i) =>
                v == null || (dense && hover !== i) ? null : (
                  <circle key={i} cx={toX(i)} cy={toY(v)} r={hover === i ? 4 : 2.5} fill={s.color} stroke="#0c0d12" strokeWidth="1.5" />
                )
              )}
            </g>
          ))}

          {labels.map((_, i) => (
            <rect
              key={i}
              x={toX(i) - plotW / n / 2}
              y={padT}
              width={Math.max(plotW / n, 8)}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}
        </svg>

        {hover != null && (
          <div
            className="pointer-events-none absolute top-2 z-10 min-w-[150px] rounded-lg border border-white/10 bg-[#12131a]/95 px-3 py-2 shadow-xl backdrop-blur"
            style={tooltipStyle((toX(hover) / width) * 100)}
          >
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              {tooltipLabels?.[hover] ?? labels[hover]}
            </p>
            {visible.map((s) => (
              <div key={s.label} className="flex items-center justify-between gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </span>
                <span className="font-medium tabular-nums text-white">
                  {s.values[hover] == null ? '—' : formatValue(s.values[hover] as number)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {series.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {series.map((s) => {
            const isHidden = hidden[s.label];
            return (
              <button
                key={s.label}
                type="button"
                aria-pressed={!isHidden}
                onClick={() => setHidden((h) => ({ ...h, [s.label]: !h[s.label] }))}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition ${
                  isHidden ? 'border-white/5 text-zinc-600' : 'border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/20'
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: isHidden ? '#3f3f46' : s.color }} />
                {s.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function VerticalBarChart({
  data,
  title,
  subtitle,
  color = '#f43f5e',
  formatValue = defaultFormat,
  tooltipLabels,
  emptyMessage,
}: {
  data: ChartPoint[];
  title?: string;
  subtitle?: string;
  color?: string;
  formatValue?: Formatter;
  tooltipLabels?: string[];
  emptyMessage?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (!data.length) return <EmptyChart title={title} subtitle={subtitle} message={emptyMessage} />;

  const max = Math.max(...data.map((d) => d.value), 1);
  const width = 640;
  const height = 240;
  const padL = 44;
  const padR = 16;
  const padT = 16;
  const padB = 40;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const gap = data.length > 40 ? 0.15 : 0.28;
  const barW = plotW / data.length;
  const innerW = barW * (1 - gap);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => max * (1 - t));
  const labelStep = Math.max(1, Math.ceil(data.length / 8));

  return (
    <div>
      {title && <ChartTitle title={title} subtitle={subtitle} />}
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label={title}>
          {yTicks.map((v, i) => {
            const y = padT + (i / 4) * plotH;
            return (
              <g key={i}>
                <line x1={padL} x2={width - padR} y1={y} y2={y} stroke={GRID} strokeWidth="1" />
                <text x={padL - 8} y={y + 3} textAnchor="end" fill={LABEL} fontSize="10">
                  {formatTick(v)}
                </text>
              </g>
            );
          })}

          {data.map((d, i) => {
            const h = Math.max((d.value / max) * plotH, d.value > 0 ? 2 : 0);
            const x = padL + i * barW + (barW - innerW) / 2;
            const y = padT + plotH - h;
            const active = hover === i;
            return (
              <g key={`${d.label}-${i}`} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <rect x={padL + i * barW} y={padT} width={barW} height={plotH} fill="transparent" />
                <rect x={x} y={y} width={innerW} height={h} rx={Math.min(4, innerW / 2)} fill={color} opacity={active ? 1 : 0.82} />
                {(i % labelStep === 0 || i === data.length - 1) && (
                  <text x={x + innerW / 2} y={height - 12} textAnchor="middle" fill={LABEL} fontSize="10">
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {hover != null && data[hover] && (
          <div
            className="pointer-events-none absolute top-2 z-10 rounded-lg border border-white/10 bg-[#12131a]/95 px-3 py-2 text-xs shadow-xl"
            style={tooltipStyle(((padL + hover * barW + barW / 2) / width) * 100)}
          >
            <p className="text-zinc-500">{tooltipLabels?.[hover] ?? data[hover].label}</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-white">{formatValue(data[hover].value)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function DonutChart({
  segments,
  title,
  subtitle,
  size = 160,
  formatValue = defaultFormat,
  centerLabel = 'total',
}: {
  segments: { label: string; value: number; color: string }[];
  title?: string;
  subtitle?: string;
  size?: number;
  formatValue?: Formatter;
  centerLabel?: string;
}) {
  const usable = useMemo(() => segments.filter((s) => s.value > 0), [segments]);
  if (!usable.length) return <EmptyChart title={title} subtitle={subtitle} />;

  const total = usable.reduce((s, x) => s + x.value, 0) || 1;
  let offset = 0;
  const r = 42;
  const c = 2 * Math.PI * r;
  const totalText = formatValue(total);

  return (
    <div>
      {title && <ChartTitle title={title} subtitle={subtitle} />}
      <div className="flex flex-wrap items-center gap-6">
        <svg width={size} height={size} viewBox="0 0 100 100" className="shrink-0" role="img" aria-label={title}>
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
          {usable.map((seg) => {
            const pct = seg.value / total;
            const dash = pct * c;
            const el = (
              <circle
                key={seg.label}
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth="10"
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 50 50)"
                strokeLinecap="butt"
              >
                <title>{`${seg.label}: ${formatValue(seg.value)}`}</title>
              </circle>
            );
            offset += dash;
            return el;
          })}
          <text x="50" y="48" textAnchor="middle" fill="#fff" fontSize={totalText.length > 7 ? 10 : 13} fontWeight="700">
            {totalText}
          </text>
          <text x="50" y="58" textAnchor="middle" fill="#71717a" fontSize="6">
            {centerLabel}
          </text>
        </svg>
        <ul className="min-w-0 flex-1 space-y-2.5">
          {usable.map((seg) => (
            <li key={seg.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2 text-zinc-400">
                <span className="h-2.5 w-2.5 shrink-0 rounded" style={{ background: seg.color }} />
                <span className="truncate">{seg.label}</span>
              </span>
              <span className="shrink-0 tabular-nums text-zinc-200">
                {formatValue(seg.value)}
                <span className="ml-1.5 text-zinc-600">{Math.round((seg.value / total) * 100)}%</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function AreaChart({
  data,
  title,
  subtitle,
  color = '#fb7185',
  formatValue = defaultFormat,
}: {
  data: ChartPoint[];
  title?: string;
  subtitle?: string;
  color?: string;
  formatValue?: Formatter;
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (!data.length) return <EmptyChart title={title} subtitle={subtitle} />;

  const width = 640;
  const height = 200;
  const padL = 44;
  const padR = 16;
  const padT = 16;
  const padB = 36;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const max = Math.max(...data.map((d) => d.value), 1);
  const n = Math.max(data.length, 1);
  const toX = (i: number) => (n === 1 ? padL + plotW / 2 : padL + (i / (n - 1)) * plotW);
  const toY = (v: number) => padT + plotH - (v / max) * plotH;
  const line = data.map((d, i) => `${toX(i)},${toY(d.value)}`).join(' ');
  const area =
    n === 1
      ? `${toX(0) - 6},${padT + plotH} ${toX(0) - 6},${toY(data[0].value)} ${toX(0) + 6},${toY(data[0].value)} ${toX(0) + 6},${padT + plotH}`
      : `${toX(0)},${padT + plotH} ${line} ${toX(n - 1)},${padT + plotH}`;
  const yTicks = [0, 0.5, 1].map((t) => max * (1 - t));
  const labelStep = Math.max(1, Math.ceil(data.length / 6));

  return (
    <div>
      {title && <ChartTitle title={title} subtitle={subtitle} />}
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full"
          preserveAspectRatio="xMidYMid meet"
          onMouseLeave={() => setHover(null)}
          role="img"
          aria-label={title}
        >
          {yTicks.map((v, i) => {
            const y = toY(v);
            return (
              <g key={i}>
                <line x1={padL} x2={width - padR} y1={y} y2={y} stroke={GRID} strokeWidth="1" />
                <text x={padL - 8} y={y + 3} textAnchor="end" fill={LABEL} fontSize="10">
                  {formatTick(v)}
                </text>
              </g>
            );
          })}
          <polygon points={area} fill={color} fillOpacity="0.12" />
          {n > 1 ? (
            <polyline fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" points={line} />
          ) : (
            <circle cx={toX(0)} cy={toY(data[0].value)} r="3.5" fill={color} />
          )}
          {hover != null && data[hover] && (
            <circle cx={toX(hover)} cy={toY(data[hover].value)} r="4" fill={color} stroke="#0c0d12" strokeWidth="1.5" />
          )}
          {data.map((d, i) => {
            if (i % labelStep !== 0 && i !== data.length - 1) return null;
            return (
              <text key={`${d.label}-${i}`} x={toX(i)} y={height - 10} textAnchor="middle" fill={LABEL} fontSize="10">
                {d.label}
              </text>
            );
          })}
          {data.map((_, i) => (
            <rect
              key={i}
              x={toX(i) - plotW / n / 2}
              y={padT}
              width={Math.max(plotW / n, 8)}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}
        </svg>
        {hover != null && data[hover] && (
          <div
            className="pointer-events-none absolute top-2 z-10 rounded-lg border border-white/10 bg-[#12131a]/95 px-3 py-2 text-xs shadow-xl"
            style={tooltipStyle((toX(hover) / width) * 100)}
          >
            <p className="text-zinc-500">{data[hover].label}</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-white">{formatValue(data[hover].value)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function HorizontalBarChart({
  data,
  title,
  subtitle,
  colorFrom = '#a78bfa',
  formatValue = defaultFormat,
  emptyMessage,
}: {
  data: ChartPoint[];
  title?: string;
  subtitle?: string;
  /** Bar color. */
  colorFrom?: string;
  /** Kept for existing callers; bars are a single solid color. */
  colorTo?: string;
  formatValue?: Formatter;
  emptyMessage?: string;
}) {
  if (!data.length) return <EmptyChart title={title} subtitle={subtitle} message={emptyMessage} />;
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div>
      {title && <ChartTitle title={title} subtitle={subtitle} />}
      <div className="space-y-3">
        {data.map((d, idx) => (
          <div key={`${d.label}-${idx}`}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-zinc-400">{d.label}</span>
              <span className="tabular-nums font-medium text-white">{formatValue(d.value)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.max(d.value > 0 ? 3 : 0, (d.value / max) * 100)}%`,
                  background: colorFrom,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-white/[0.07] bg-[#12131a] p-5 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset] ${className}`}>
      {children}
    </section>
  );
}
