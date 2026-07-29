import { useMemo, useState, type ReactNode } from 'react';

type ChartPoint = { label: string; value: number };
type LineSeries = { label: string; color: string; values: number[] };

const GRID = 'rgba(255,255,255,0.05)';
const LABEL = '#71717a';

function EmptyChart({ title, message = 'No data in the selected range' }: { title?: string; message?: string }) {
  return (
    <div>
      {title && <ChartTitle title={title} />}
      <div className="flex h-52 items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#0c0d12] text-sm text-zinc-500">
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
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(Math.round(n));
}

export function LineChart({
  labels,
  series,
  height = 240,
  title,
  subtitle,
}: {
  labels: string[];
  series: LineSeries[];
  height?: number;
  title?: string;
  subtitle?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  const visible = series.filter((s) => !hidden[s.label]);
  if (!labels.length || !series.some((s) => s.values.length > 0)) {
    return <EmptyChart title={title} />;
  }

  const width = 640;
  const padL = 44;
  const padR = 16;
  const padT = 16;
  const padB = 36;
  const allValues = visible.flatMap((s) => s.values);
  const max = Math.max(...allValues, 1);
  const n = Math.max(labels.length, 1);
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const toX = (i: number) => (n === 1 ? padL + plotW / 2 : padL + (i / (n - 1)) * plotW);
  const toY = (v: number) => padT + plotH - (v / max) * plotH;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => max * (1 - t));

  const labelStep = Math.max(1, Math.ceil(labels.length / 6));

  return (
    <div>
      {title && <ChartTitle title={title} subtitle={subtitle} />}
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full"
          preserveAspectRatio="xMidYMid meet"
          onMouseLeave={() => setHover(null)}
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
            return (
              <text key={`${label}-${i}`} x={toX(i)} y={height - 10} textAnchor="middle" fill={LABEL} fontSize="10">
                {label}
              </text>
            );
          })}

          {visible.map((s) => {
            const pts = s.values.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
            return (
              <g key={s.label}>
                {s.values.length > 1 && (
                  <polyline
                    fill="none"
                    stroke={s.color}
                    strokeWidth="2.25"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    points={pts}
                  />
                )}
                {s.values.map((v, i) => (
                  <circle
                    key={i}
                    cx={toX(i)}
                    cy={toY(v)}
                    r={hover === i ? 4 : 2.5}
                    fill={s.color}
                    stroke="#0c0d12"
                    strokeWidth="1.5"
                  />
                ))}
              </g>
            );
          })}

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
        </svg>

        {hover != null && (
          <div className="pointer-events-none absolute left-1/2 top-2 z-10 min-w-[140px] -translate-x-1/2 rounded-lg border border-white/10 bg-[#12131a]/95 px-3 py-2 shadow-xl backdrop-blur">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">{labels[hover]}</p>
            {visible.map((s) => (
              <div key={s.label} className="flex items-center justify-between gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </span>
                <span className="tabular-nums font-medium text-white">{s.values[hover] ?? 0}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {series.map((s) => {
          const isHidden = hidden[s.label];
          return (
            <button
              key={s.label}
              type="button"
              onClick={() => setHidden((h) => ({ ...h, [s.label]: !h[s.label] }))}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition ${
                isHidden
                  ? 'border-white/5 text-zinc-600'
                  : 'border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/20'
              }`}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: isHidden ? '#3f3f46' : s.color }} />
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function VerticalBarChart({
  data,
  title,
  subtitle,
  color = '#f43f5e',
}: {
  data: ChartPoint[];
  title?: string;
  subtitle?: string;
  color?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (!data.length) return <EmptyChart title={title} />;

  const max = Math.max(...data.map((d) => d.value), 1);
  const width = 640;
  const height = 240;
  const padL = 44;
  const padR = 16;
  const padT = 16;
  const padB = 40;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const gap = 0.28;
  const barW = plotW / data.length;
  const innerW = barW * (1 - gap);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => max * (1 - t));
  const labelStep = Math.max(1, Math.ceil(data.length / 8));

  return (
    <div>
      {title && <ChartTitle title={title} subtitle={subtitle} />}
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" preserveAspectRatio="xMidYMid meet">
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
                <rect
                  x={x}
                  y={y}
                  width={innerW}
                  height={h}
                  rx={4}
                  fill={color}
                  opacity={active ? 1 : 0.85}
                />
                {(i % labelStep === 0 || i === data.length - 1) && (
                  <text
                    x={x + innerW / 2}
                    y={height - 12}
                    textAnchor="middle"
                    fill={LABEL}
                    fontSize="10"
                  >
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {hover != null && data[hover] && (
          <div className="pointer-events-none absolute right-3 top-2 rounded-lg border border-white/10 bg-[#12131a]/95 px-3 py-2 text-xs shadow-xl">
            <p className="text-zinc-500">{data[hover].label}</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-white">{data[hover].value}</p>
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
}: {
  segments: { label: string; value: number; color: string }[];
  title?: string;
  subtitle?: string;
  size?: number;
}) {
  const usable = useMemo(() => segments.filter((s) => s.value > 0), [segments]);
  if (!usable.length) return <EmptyChart title={title} />;

  const total = usable.reduce((s, x) => s + x.value, 0) || 1;
  let offset = 0;
  const r = 42;
  const c = 2 * Math.PI * r;

  return (
    <div>
      {title && <ChartTitle title={title} subtitle={subtitle} />}
      <div className="flex flex-wrap items-center gap-6">
        <svg width={size} height={size} viewBox="0 0 100 100" className="shrink-0">
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
              />
            );
            offset += dash;
            return el;
          })}
          <text x="50" y="47" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700">
            {total}
          </text>
          <text x="50" y="58" textAnchor="middle" fill="#71717a" fontSize="6">
            total
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
                {seg.value}
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
}: {
  data: ChartPoint[];
  title?: string;
  subtitle?: string;
  color?: string;
}) {
  if (!data.length) return <EmptyChart title={title} />;

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
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" preserveAspectRatio="xMidYMid meet">
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
        <defs>
          <linearGradient id={`area-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={area} fill={`url(#area-${color.replace('#', '')})`} />
        {n > 1 ? (
          <polyline fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" points={line} />
        ) : (
          <circle cx={toX(0)} cy={toY(data[0].value)} r="3.5" fill={color} />
        )}
        {data.map((d, i) => {
          if (i % labelStep !== 0 && i !== data.length - 1) return null;
          return (
            <text key={`${d.label}-${i}`} x={toX(i)} y={height - 10} textAnchor="middle" fill={LABEL} fontSize="10">
              {d.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export function HorizontalBarChart({
  data,
  title,
  subtitle,
  colorFrom = '#a78bfa',
  colorTo = '#fb7185',
}: {
  data: ChartPoint[];
  title?: string;
  subtitle?: string;
  colorFrom?: string;
  colorTo?: string;
}) {
  if (!data.length) return <EmptyChart title={title} />;
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div>
      {title && <ChartTitle title={title} subtitle={subtitle} />}
      <div className="space-y-3">
        {data.map((d, idx) => (
          <div key={`${d.label}-${idx}`}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-zinc-400">{d.label}</span>
              <span className="tabular-nums font-medium text-white">{d.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.max(d.value > 0 ? 3 : 0, (d.value / max) * 100)}%`,
                  background: `linear-gradient(90deg, ${colorFrom}, ${colorTo})`,
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
