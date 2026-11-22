import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Gauge, Loader2, Network, RefreshCw, RotateCcw, ShieldAlert, Users } from 'lucide-react';
import api from '@/lib/axios';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast';
import { ChartCard, LineChart } from './AnalyticsCharts';
import type { GlossaryId } from '../analyticsGlossary';
import { InfoButton } from '../analyticsInfo';

// account: signed in · device: one signed-out browser · ip: ceiling for all signed-out traffic from one network
type Scope = 'account' | 'device' | 'ip';

type RateLimitMonitor = {
  startedAt: string;
  generatedAt: string;
  totals: { allowed: number; blocked: number };
  lastHour: { allowed: number; blocked: number };
  currentMinute: { minute: string; allowed: number; blocked: number };
  history: { minute: string; allowed: number; blocked: number }[];
  policyTotals: Record<string, { allowed: number; blocked: number }>;
  liveBuckets: { total: number; accounts: number; devices: number; ips: number; nearLimit: number; blocked: number };
  active: {
    key: string;
    policy: string;
    scope: Scope;
    subject: string;
    label: string | null;
    ip: string;
    count: number;
    limit: number;
    usagePct: number;
    blocked: number;
    resetsAt: string;
    lastSeen: string;
    lastRequest: string;
  }[];
  sharedIps: { ip: string; accounts: number; devices: number; signedOutRequests: number; highestCeilingPct: number }[];
  events: {
    key: string;
    at: string;
    lastAt: string;
    repeats: number;
    policy: string;
    scope: Scope;
    subject: string;
    label: string | null;
    ip: string;
    request: string;
    count: number;
    limit: number;
  }[];
  storeErrors: { count: number; lastAt: string | null; lastMessage: string | null };
  policies: {
    name: string;
    kind: 'api' | 'route';
    windowSeconds: number;
    accountLimit: number | null;
    anonymousLimit: number;
    networkLimit: number;
  }[];
  store: 'redis' | 'memory';
  clientIp: {
    status: 'ok' | 'problem' | 'unverified' | 'direct';
    message: string;
    resolvedIp: string | null;
    socketIp: string | null;
    cloudflareIp: string | null;
    forwardedFor: string[];
    forwardedHops: number;
    trustProxy: string;
    localBypass: boolean;
  };
};

const MONITOR_URL = '/api/admin/rate-limits';
const REFRESH_MS = 10_000;

const POLICY_LABELS: Record<string, string> = {
  authentication: 'Login & signup',
  tokenRefresh: 'Session refresh',
  verification: 'Verification codes',
  transaction: 'Payments & cashouts',
  upload: 'Uploads',
  search: 'Search',
  messaging: 'Messaging',
  mutation: 'Writes',
  general: 'Page data (reads)',
  chat: 'AI assistant',
  ticketCreate: 'Ticket creation',
};

const policyLabel = (name: string) => POLICY_LABELS[name] || name;

function formatWindow(seconds: number) {
  if (seconds % 60 !== 0) return `${seconds}s`;
  const minutes = seconds / 60;
  return minutes === 1 ? 'per minute' : `per ${minutes} min`;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatSince(value: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return hours < 48 ? `${hours} h` : `${Math.floor(hours / 24)} d`;
}

function secondsUntil(value: string) {
  return Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 1000));
}

function subjectName(row: { scope: Scope; label: string | null; subject: string }) {
  if (row.scope === 'account') return row.label || `Account ${row.subject}`;
  if (row.scope === 'device') return `Browser ${row.subject.slice(0, 6)}`;
  return row.subject;
}

const SCOPE_BADGES: Record<Scope, { label: string; className: string }> = {
  account: { label: 'Account', className: 'border-sky-500/30 bg-sky-500/10 text-sky-200' },
  device: { label: 'Signed-out browser', className: 'border-violet-500/30 bg-violet-500/10 text-violet-200' },
  ip: { label: 'Network ceiling', className: 'border-amber-500/30 bg-amber-500/10 text-amber-100' },
};

function Stat({
  label,
  value,
  sub,
  tone = 'default',
  info,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: 'default' | 'warn' | 'bad';
  info?: GlossaryId;
}) {
  const color = tone === 'bad' ? 'text-red-300' : tone === 'warn' ? 'text-amber-200' : 'text-white';
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#12131a] p-4">
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        {label}
        {info && <InfoButton id={info} />}
      </p>
      <p className={`mt-1.5 text-2xl font-semibold tabular-nums tracking-tight ${color}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

function ScopeBadge({ scope }: { scope: Scope }) {
  const badge = SCOPE_BADGES[scope];
  return (
    <span className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${badge.className}`}>
      {badge.label}
    </span>
  );
}

function UsageBar({ count, limit }: { count: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, (count / limit) * 100) : 0;
  const color = count > limit ? 'bg-red-400' : pct >= 80 ? 'bg-amber-400' : 'bg-emerald-400';
  return (
    <div className="min-w-[120px]">
      <div className="mb-1 flex justify-between text-xs tabular-nums">
        <span className={count > limit ? 'text-red-300' : 'text-zinc-300'}>{count}</span>
        <span className="text-zinc-600">/ {limit}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Section({ title, subtitle, info, children }: { title: string; subtitle?: string; info?: GlossaryId; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#12131a]">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-white">
          {title}
          {info && <InfoButton id={info} />}
        </h3>
        {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

const TH = 'px-4 py-3 font-medium';
const TD = 'px-4 py-2.5 align-middle';

function ClientIpCard({ info }: { info: RateLimitMonitor['clientIp'] }) {
  const tone =
    info.status === 'ok'
      ? 'border-emerald-500/25 bg-emerald-500/[0.06]'
      : info.status === 'problem'
        ? 'border-red-500/30 bg-red-500/[0.08]'
        : 'border-white/[0.08] bg-[#12131a]';
  const Icon = info.status === 'ok' ? CheckCircle2 : info.status === 'problem' ? ShieldAlert : Network;
  const iconColor = info.status === 'ok' ? 'text-emerald-300' : info.status === 'problem' ? 'text-red-300' : 'text-zinc-400';
  const rows: [string, string][] = [
    ['Resolved IP (used for limits)', info.resolvedIp || '—'],
    ['Cloudflare visitor IP', info.cloudflareIp || 'Not present'],
    ['Connecting proxy', info.socketIp || '—'],
    ['X-Forwarded-For hops', String(info.forwardedHops)],
    ['TRUST_PROXY', info.trustProxy],
  ];
  return (
    <section className={`rounded-2xl border p-5 ${tone}`}>
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconColor}`} />
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-white">
            IP pass-through check (your request)
            <InfoButton id="ipCheck" />
          </h3>
          <p className="mt-1 text-sm text-zinc-300">{info.message}</p>
          {info.localBypass && (
            <p className="mt-1 text-xs text-amber-200">
              This address is loopback, so its requests skip rate limiting. If every visitor resolves to it, nothing is limited.
            </p>
          )}
        </div>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2">
            <dt className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</dt>
            <dd className="mt-0.5 break-all font-mono text-xs text-zinc-200">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function RateLimitMonitorPanel() {
  const [data, setData] = useState<RateLimitMonitor | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [resetting, setResetting] = useState<string | null>(null);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    try {
      const res = await api.get(MONITOR_URL);
      if (res.data?.success) {
        setData(res.data.data);
        setError('');
      } else setError('Failed to load the rate-limit monitor');
    } catch {
      setError('Failed to load the rate-limit monitor');
    } finally {
      inFlight.current = false;
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [autoRefresh, load]);

  const reset = async (key: string, name: string) => {
    setResetting(key);
    try {
      await api.post(`${MONITOR_URL}/reset`, { key });
      showSuccessToast(`Rate limit cleared for ${name}`);
      await load();
    } catch {
      showErrorToast('Could not clear that rate limit');
    } finally {
      setResetting(null);
    }
  };

  if (!data) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        {error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
            {error}
            <button type="button" onClick={() => void load()} className="mt-4 block text-sm underline">
              Retry
            </button>
          </div>
        ) : (
          <Loader2 className="h-8 w-8 animate-spin text-rose-400" />
        )}
      </div>
    );
  }

  const lastHourTotal = data.lastHour.allowed + data.lastHour.blocked;
  const blockRate = lastHourTotal > 0 ? (data.lastHour.blocked / lastHourTotal) * 100 : 0;
  const labels = data.history.map((h) =>
    new Date(h.minute).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-zinc-300">
            <Gauge className="h-3 w-3" />
            Counters: {data.store === 'redis' ? 'Redis' : 'in-memory (single process)'}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-zinc-400">
            Monitoring this API process for {formatSince(data.startedAt)} · updated {formatTime(data.generatedAt)}
            <InfoButton id="trafficScope" />
          </span>
          {data.storeErrors.count > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-amber-100">
              <AlertTriangle className="h-3 w-3" />
              {data.storeErrors.count} limiter store errors (requests allowed through)
              {data.storeErrors.lastAt ? ` · last ${formatTime(data.storeErrors.lastAt)}` : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-400">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="accent-rose-400" />
            Auto-refresh (10s)
          </label>
          <button
            type="button"
            onClick={() => void load()}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-1.5 text-sm text-zinc-300 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <ClientIpCard info={data.clientIp} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Requests · last hour" info="requests" value={lastHourTotal.toLocaleString()} sub={`${data.currentMinute.allowed + data.currentMinute.blocked} this minute`} />
        <Stat
          label="Blocked (429) · last hour"
          info="blocked"
          value={data.lastHour.blocked.toLocaleString()}
          sub={`${blockRate.toFixed(blockRate > 0 && blockRate < 1 ? 2 : 1)}% of requests`}
          tone={data.lastHour.blocked > 0 ? 'bad' : 'default'}
        />
        <Stat label="Active accounts" info="liveAccounts" value={data.liveBuckets.accounts} sub="Each has its own budget" />
        <Stat
          label="Signed-out browsers"
          info="liveBrowsers"
          value={data.liveBuckets.devices}
          sub={`From ${data.liveBuckets.ips} network${data.liveBuckets.ips === 1 ? '' : 's'}`}
        />
        <Stat
          label="Near or over limit"
          info="nearLimit"
          value={data.liveBuckets.nearLimit}
          sub={`${data.liveBuckets.blocked} currently blocked`}
          tone={data.liveBuckets.blocked > 0 ? 'bad' : data.liveBuckets.nearLimit > 0 ? 'warn' : 'default'}
        />
      </div>

      <ChartCard>
        <LineChart
          title="Requests per minute"
          subtitle="Last 60 minutes, this API process"
          labels={labels}
          series={[
            { label: 'Allowed', color: '#60a5fa', values: data.history.map((h) => h.allowed) },
            { label: 'Blocked (429)', color: '#fb7185', values: data.history.map((h) => h.blocked) },
          ]}
        />
      </ChartCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section
          title="Limits"
          info="policies"
          subtitle="Signed-in people count per account and are never limited by IP. Signed-out people count per browser; the network ceiling caps all signed-out traffic from one IP."
        >
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-[#0c0d12] text-[10px] uppercase tracking-wide text-zinc-600">
                <th className={TH}>Policy</th>
                <th className={TH}>Window</th>
                <th className={TH}>Per account</th>
                <th className={TH}>Per browser</th>
                <th className={TH}>Network ceiling</th>
                <th className={TH}>Last hour</th>
              </tr>
            </thead>
            <tbody>
              {data.policies.map((p) => {
                const usage = data.policyTotals[p.name];
                return (
                  <tr key={p.name} className="border-b border-white/[0.04] text-zinc-300 last:border-0">
                    <td className={TD}>
                      {policyLabel(p.name)}
                      <span className="ml-1.5 font-mono text-[10px] text-zinc-600">{p.name}</span>
                    </td>
                    <td className={`${TD} text-zinc-400`}>{formatWindow(p.windowSeconds)}</td>
                    <td className={`${TD} tabular-nums`}>{p.accountLimit ?? <span className="text-zinc-600">Per browser</span>}</td>
                    <td className={`${TD} tabular-nums`}>{p.anonymousLimit}</td>
                    <td className={`${TD} tabular-nums`}>{p.networkLimit.toLocaleString()}</td>
                    <td className={`${TD} tabular-nums`}>
                      {(usage?.allowed || 0) + (usage?.blocked || 0)}
                      {usage?.blocked ? <span className="ml-1.5 text-red-300">({usage.blocked} blocked)</span> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>

        <Section
          title="Shared networks"
          info="sharedIps"
          subtitle="IPs used by several people at once (campus or office Wi-Fi). Each person still has their own budget."
        >
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-[#0c0d12] text-[10px] uppercase tracking-wide text-zinc-600">
                <th className={TH}>IP</th>
                <th className={TH}>Accounts</th>
                <th className={TH}>Signed-out browsers</th>
                <th className={TH}>Signed-out requests</th>
                <th className={TH}>Ceiling used</th>
              </tr>
            </thead>
            <tbody>
              {data.sharedIps.map((row) => (
                <tr key={row.ip} className="border-b border-white/[0.04] text-zinc-300 last:border-0">
                  <td className={`${TD} font-mono text-xs`}>{row.ip}</td>
                  <td className={TD}>
                    <span className="inline-flex items-center gap-1.5 tabular-nums">
                      <Users className="h-3.5 w-3.5 text-zinc-500" />
                      {row.accounts}
                    </span>
                  </td>
                  <td className={`${TD} tabular-nums`}>{row.devices}</td>
                  <td className={`${TD} tabular-nums`}>{row.signedOutRequests}</td>
                  <td
                    className={`${TD} tabular-nums ${
                      row.highestCeilingPct >= 100 ? 'text-red-300' : row.highestCeilingPct >= 80 ? 'text-amber-200' : 'text-zinc-400'
                    }`}
                  >
                    {row.highestCeilingPct}%
                  </td>
                </tr>
              ))}
              {data.sharedIps.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                    No shared addresses right now.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Section>
      </div>

      <Section title="Busiest rate-limit windows" info="busiestWindows" subtitle="Live windows sorted by how close they are to their limit. Reset clears one window immediately.">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] bg-[#0c0d12] text-[10px] uppercase tracking-wide text-zinc-600">
              <th className={TH}>Who</th>
              <th className={TH}>Policy</th>
              <th className={TH}>Usage</th>
              <th className={TH}>Blocked</th>
              <th className={TH}>Resets in</th>
              <th className={TH}>Last request</th>
              <th className={TH} />
            </tr>
          </thead>
          <tbody>
            {data.active.map((row) => (
              <tr key={row.key} className="border-b border-white/[0.04] text-zinc-300 last:border-0">
                <td className={TD}>
                  <div className="flex items-center gap-2">
                    <ScopeBadge scope={row.scope} />
                    <span className={row.scope === 'ip' ? 'font-mono text-xs' : ''}>{subjectName(row)}</span>
                  </div>
                  {row.scope !== 'ip' && <p className="mt-0.5 font-mono text-[10px] text-zinc-600">{row.ip}</p>}
                </td>
                <td className={TD}>{policyLabel(row.policy)}</td>
                <td className={TD}>
                  <UsageBar count={row.count} limit={row.limit} />
                </td>
                <td className={`${TD} tabular-nums ${row.blocked ? 'text-red-300' : 'text-zinc-500'}`}>{row.blocked}</td>
                <td className={`${TD} tabular-nums text-zinc-400`}>{secondsUntil(row.resetsAt)}s</td>
                <td className={`${TD} max-w-[260px] truncate font-mono text-xs text-zinc-500`} title={row.lastRequest}>
                  {row.lastRequest}
                </td>
                <td className={`${TD} text-right`}>
                  <button
                    type="button"
                    onClick={() => void reset(row.key, subjectName(row))}
                    disabled={resetting === row.key}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-zinc-300 hover:text-white disabled:opacity-50"
                  >
                    {resetting === row.key ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                    Reset
                  </button>
                </td>
              </tr>
            ))}
            {data.active.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  No live rate-limit windows.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Section>

      <Section title="Recent 429 responses" info="recent429" subtitle="Newest first. Retries of the same request within a minute are grouped.">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] bg-[#0c0d12] text-[10px] uppercase tracking-wide text-zinc-600">
              <th className={TH}>Time</th>
              <th className={TH}>Who</th>
              <th className={TH}>Policy</th>
              <th className={TH}>Request</th>
              <th className={TH}>Count / limit</th>
              <th className={TH}>Hits</th>
            </tr>
          </thead>
          <tbody>
            {data.events.map((event) => (
              <tr key={`${event.key}-${event.at}`} className="border-b border-white/[0.04] text-zinc-300 last:border-0">
                <td className={`${TD} whitespace-nowrap tabular-nums text-zinc-400`}>
                  {formatTime(event.at)}
                  {event.repeats > 1 && <span className="text-zinc-600"> – {formatTime(event.lastAt)}</span>}
                </td>
                <td className={TD}>
                  <div className="flex items-center gap-2">
                    <ScopeBadge scope={event.scope} />
                    <span className={event.scope === 'ip' ? 'font-mono text-xs' : ''}>{subjectName(event)}</span>
                  </div>
                </td>
                <td className={TD}>{policyLabel(event.policy)}</td>
                <td className={`${TD} max-w-[280px] truncate font-mono text-xs text-zinc-500`} title={event.request}>
                  {event.request}
                </td>
                <td className={`${TD} tabular-nums`}>
                  {event.count} / {event.limit}
                </td>
                <td className={`${TD} tabular-nums`}>{event.repeats}</td>
              </tr>
            ))}
            {data.events.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  No requests have been rate limited since this process started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Section>
    </div>
  );
}
