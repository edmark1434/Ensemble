import type { ReactNode } from 'react';

type ChartPoint = { label: string; value: number };

type LineSeries = { label: string; color: string; values: number[] };

export function LineChart({
  labels,
  series,
  height = 200,
  title,
}: {
  labels: string[];
  series: LineSeries[];
  height?: number;
  title?: string;
}) {
  const width = 100;
  const pad = 8;
  const allValues = series.flatMap((s) => s.values);
  const max = Math.max(...allValues, 1);
  const min = 0;
  const range = max - min || 1;

  const toX = (i: number) => pad + (i / Math.max(labels.length - 1, 1)) * (width - pad * 2);
  const toY = (v: number) => height - pad - ((v - min) / range) * (height - pad * 2);

  return (
    <div>
      {title && <p className="mb-3 text-sm font-semibold text-white">{title}</p>}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={pad}
            x2={width - pad}
            y1={pad + t * (height - pad * 2)}
            y2={pad + t * (height - pad * 2)}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="0.3"
          />
        ))}
        {series.map((s) => {
          const points = s.values.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
          return (
            <g key={s.label}>
              <polyline
                fill="none"
                stroke={s.color}
                strokeWidth="1.2"
                strokeLinejoin="round"
                points={points}
              />
              {s.values.map((v, i) => (
                <circle key={i} cx={toX(i)} cy={toY(v)} r="1.2" fill={s.color} />
              ))}
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3">
        {series.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-[10px] text-zinc-500">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[9px] text-zinc-600">
        {labels.filter((_, i) => i === 0 || i === labels.length - 1 || i % Math.ceil(labels.length / 4) === 0).map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </div>
  );
}

export function VerticalBarChart({
  data,
  title,
  color = '#f43f5e',
}: {
  data: ChartPoint[];
  title?: string;
  color?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      {title && <p className="mb-3 text-sm font-semibold text-white">{title}</p>}
      <div className="flex h-48 items-end justify-between gap-2">
        {data.map((d) => (
          <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span className="text-[10px] tabular-nums text-zinc-400">{d.value}</span>
            <div
              className="w-full max-w-[40px] rounded-t-md transition-all"
              style={{
                height: `${Math.max(4, (d.value / max) * 100)}%`,
                background: `linear-gradient(to top, ${color}, ${color}88)`,
              }}
            />
            <span className="max-w-full truncate text-center text-[9px] text-zinc-600">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DonutChart({
  segments,
  title,
  size = 140,
}: {
  segments: { label: string; value: number; color: string }[];
  title?: string;
  size?: number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let offset = 0;
  const r = 40;
  const c = 2 * Math.PI * r;

  return (
    <div>
      {title && <p className="mb-3 text-sm font-semibold text-white">{title}</p>}
      <div className="flex flex-wrap items-center gap-6">
        <svg width={size} height={size} viewBox="0 0 100 100" className="shrink-0">
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
          {segments.map((seg) => {
            const pct = seg.value / total;
            const dash = pct * c;
            const circle = (
              <circle
                key={seg.label}
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth="12"
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 50 50)"
                strokeLinecap="butt"
              />
            );
            offset += dash;
            return circle;
          })}
          <text x="50" y="48" textAnchor="middle" className="fill-white text-[14px] font-bold">
            {total}
          </text>
          <text x="50" y="58" textAnchor="middle" className="fill-zinc-500 text-[6px]">
            total
          </text>
        </svg>
        <ul className="min-w-0 flex-1 space-y-2">
          {segments.map((seg) => (
            <li key={seg.label} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-2 text-zinc-400">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: seg.color }} />
                {seg.label}
              </span>
              <span className="tabular-nums text-white">
                {seg.value} ({Math.round((seg.value / total) * 100)}%)
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
  color = '#fb7185',
}: {
  data: ChartPoint[];
  title?: string;
  color?: string;
}) {
  const height = 120;
  const width = 100;
  const pad = 4;
  const max = Math.max(...data.map((d) => d.value), 1);
  const toX = (i: number) => pad + (i / Math.max(data.length - 1, 1)) * (width - pad * 2);
  const toY = (v: number) => height - pad - (v / max) * (height - pad * 2);

  const line = data.map((d, i) => `${toX(i)},${toY(d.value)}`).join(' ');
  const area = `${toX(0)},${height - pad} ${line} ${toX(data.length - 1)},${height - pad}`;

  return (
    <div>
      {title && <p className="mb-3 text-sm font-semibold text-white">{title}</p>}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
        <polygon points={area} fill={`${color}33`} />
        <polyline fill="none" stroke={color} strokeWidth="1" points={line} />
      </svg>
      <div className="mt-1 flex justify-between text-[9px] text-zinc-600">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

export function HorizontalBarChart({
  data,
  title,
}: {
  data: ChartPoint[];
  title?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      {title && <p className="mb-3 text-sm font-semibold text-white">{title}</p>}
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.label}>
            <div className="mb-0.5 flex justify-between text-xs">
              <span className="text-zinc-400">{d.label}</span>
              <span className="text-white">{d.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-rose-500"
                style={{ width: `${(d.value / max) * 100}%` }}
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
    <section className={`rounded-2xl border border-white/[0.08] bg-[#14151c] p-5 ${className}`}>
      {children}
    </section>
  );
}
