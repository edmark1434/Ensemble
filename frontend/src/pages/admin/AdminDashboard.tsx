import { useCallback, useEffect, useState, type ComponentType, type ReactNode } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Coins,
  Info,
  MessageSquare,
  RefreshCw,
  Shield,
  Ticket,
  TrendingUp,
  UserCog,
  UserPlus,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import useGlobalState from '@/lib/global_state';
import { peekStaffGet, staffGet } from '@/lib/staffCache';
import ConsolePageSkeleton from '@/pages/staff/ConsolePageSkeleton';
import { useCountUp } from '@/pages/staff/consoleMotion';
import type { AdminDashboardData, PlatformAlert } from './adminDashboardTypes';

const DASHBOARD_URL = '/api/admin/dashboard-overview';
/** Background refresh while the tab is visible. */
const AUTO_REFRESH_MS = 60_000;

function formatDateTime(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatRelative(value: string | null) {
  if (!value) return '—';
  const sec = (Date.now() - new Date(value).getTime()) / 1000;
  if (Number.isNaN(sec)) return '—';
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hr ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)} d ago`;
  return formatDateTime(value);
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function statusPill(status: string) {
  const s = status.toLowerCase();
  if (s === 'active') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25';
  if (s === 'pending' || s === 'inactive') return 'bg-amber-500/15 text-amber-200 border-amber-500/25';
  if (s.includes('ban') || s.includes('suspend')) return 'bg-red-500/15 text-red-300 border-red-500/25';
  return 'bg-zinc-500/15 text-zinc-300 border-white/10';
}

function rolePill(role: string) {
  if (role === 'Admin') return 'bg-rose-500/20 text-rose-200 border-rose-500/30';
  if (role.includes('Forum')) return 'bg-violet-500/15 text-violet-200 border-violet-500/25';
  if (role.includes('Marketplace')) return 'bg-amber-500/15 text-amber-200 border-amber-500/25';
  if (role.includes('Jobs')) return 'bg-emerald-500/15 text-emerald-200 border-emerald-500/25';
  return 'bg-sky-500/15 text-sky-200 border-sky-500/25';
}

const ACTIVITY_DOT: Record<string, string> = {
  signup: 'bg-sky-400',
  verification: 'bg-amber-400',
  staff: 'bg-rose-400',
};

const ALERT_TONE: Record<PlatformAlert['severity'], { box: string; icon: ComponentType<{ className?: string }> }> = {
  error: { box: 'border-red-500/30 bg-red-500/10 text-red-100', icon: AlertOctagon },
  warning: { box: 'border-amber-500/30 bg-amber-500/10 text-amber-100', icon: AlertTriangle },
  info: { box: 'border-white/10 bg-white/[0.03] text-zinc-200', icon: Info },
  success: { box: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100', icon: CheckCircle2 },
};

export default function AdminDashboard() {
  const { user } = useGlobalState();
  const [data, setData] = useState<AdminDashboardData | null>(() => {
    const cached = peekStaffGet(DASHBOARD_URL);
    return cached?.data?.success ? cached.data.data : null;
  });
  const [loading, setLoading] = useState(() => !data);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      const res = await staffGet(DASHBOARD_URL);
      if (res.data?.success) setData(res.data.data);
      else setError(res.data?.message || 'Failed to load dashboard');
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
    const timer = window.setInterval(() => {
      if (!document.hidden) void loadData();
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [loadData]);

  if (loading && !data) return <ConsolePageSkeleton tiles={6} tabs={false} />;

  if (!data) {
    return (
      <main className="p-8 md:pl-[284px]">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
          {error || 'Failed to load dashboard'}
          <button type="button" onClick={() => void loadData()} className="mt-4 block text-sm underline">
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen md:pl-[260px]">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#06070c]/90 backdrop-blur-xl">
        <div className="flex flex-col gap-4 px-6 py-4 md:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-400/80">Platform control center</p>
            <h1 className="text-xl font-bold text-white">
              {greeting()}, {user?.first_name || user?.firstName || `@${user?.username || 'admin'}`}
            </h1>
            <p className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
              <span className="relative flex h-2 w-2">
                <span className={`absolute inline-flex h-full w-full rounded-full bg-emerald-400 ${refreshing ? 'animate-ping opacity-60' : 'opacity-0'}`} />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Live · updated {formatRelative(data.lastUpdated)} · refreshes every minute
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={refreshing}
            className="flex items-center gap-2 self-start rounded-xl border border-white/[0.08] px-4 py-2 text-sm text-zinc-300 hover:border-white/20 hover:text-white disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </header>

      <div className="space-y-6 px-6 py-6 md:px-8 md:py-8">
        {error && (
          <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-100">
            Showing the last loaded data: {error}
          </p>
        )}
        <Alerts alerts={data.alerts} />
        <KpiGrid data={data} />
        <MainGrid data={data} />
        <InsightGrid data={data} />
        <BreakdownGrid data={data} />
      </div>
    </main>
  );
}

function Alerts({ alerts }: { alerts: PlatformAlert[] }) {
  if (!alerts.length) return null;
  return (
    <div className="console-stagger grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {alerts.map((a) => {
        const tone = ALERT_TONE[a.severity] || ALERT_TONE.info;
        const Icon = tone.icon;
        return (
          <div key={a.id} className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${tone.box}`}>
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0">{a.message}</span>
          </div>
        );
      })}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  to,
}: {
  label: string;
  value: number;
  sub: ReactNode;
  icon: ComponentType<{ className?: string }>;
  accent: string;
  to: string;
}) {
  const shown = useCountUp(value);
  return (
    <Link
      to={to}
      className="console-lift group block rounded-2xl border border-white/[0.06] bg-[#12131a] p-5 outline-none hover:border-white/[0.14] focus-visible:ring-2 focus-visible:ring-white/20"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-white">{shown.toLocaleString()}</p>
          <p className="mt-1 text-xs text-zinc-500">{sub}</p>
        </div>
        <div className={`rounded-xl bg-white/[0.04] p-2.5 transition-colors group-hover:bg-white/[0.08] ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 flex items-center gap-1 text-[11px] text-zinc-600 transition-colors group-hover:text-zinc-300">
        Open
        <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
      </p>
    </Link>
  );
}

function KpiGrid({ data }: { data: AdminDashboardData }) {
  const { kpis, breakdowns } = data;
  return (
    <div className="console-stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <KpiCard
        label="Pending verifications"
        value={kpis.pendingVerifications}
        sub="Accounts awaiting identity review"
        icon={BadgeCheck}
        accent="text-amber-400"
        to="/admin/moderation?tab=cases&queue=identity"
      />
      <KpiCard
        label="Open disputes"
        value={kpis.openDisputes}
        sub="Cases not closed yet"
        icon={Shield}
        accent="text-orange-400"
        to="/admin/moderation?tab=cases&queue=disputes"
      />
      <KpiCard
        label="Credits held by members"
        value={kpis.platformRevenueCredits}
        sub="Spendable plus on-hold, all account wallets"
        icon={Coins}
        accent="text-emerald-400"
        to="/admin/credit-economy"
      />
      <KpiCard
        label="Active members"
        value={kpis.activeUsers}
        sub={
          <>
            {kpis.totalUsers.toLocaleString()} total users
            {kpis.totalUsers > 0 ? ` · ${Math.round((kpis.activeUsers / kpis.totalUsers) * 100)}% active` : ''}
            {kpis.totalTeams ? ` · ${kpis.totalTeams.toLocaleString()} teams` : ''}
          </>
        }
        icon={Users}
        accent="text-sky-400"
        to="/admin/user-team?tab=users"
      />
      <KpiCard
        label="Support tickets"
        value={kpis.openTickets}
        sub="Open and in progress"
        icon={Ticket}
        accent="text-violet-400"
        to="/admin/ticket-management?tab=tickets"
      />
      <KpiCard
        label="Moderation team"
        value={kpis.totalStaff}
        sub={`${breakdowns.staffByRole.length} role type${breakdowns.staffByRole.length === 1 ? '' : 's'} assigned`}
        icon={UserCog}
        accent="text-rose-400"
        to="/admin/moderation?tab=management&section=moderators"
      />
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  iconTone,
  subtitle,
  action,
  children,
  className = '',
}: {
  title: string;
  icon?: ComponentType<{ className?: string }>;
  iconTone?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-white/[0.06] bg-[#12131a] p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {Icon && <Icon className={`h-4 w-4 ${iconTone || 'text-zinc-400'}`} />}
            <h2 className="font-semibold text-white">{title}</h2>
          </div>
          {subtitle && <p className="mt-1 text-xs text-zinc-600">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function PanelLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="group flex shrink-0 items-center gap-1 text-xs text-zinc-500 hover:text-white">
      {children}
      <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
    </Link>
  );
}

function Initial({ name }: { name: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-sm font-bold uppercase text-zinc-200">
      {(name || '?').charAt(0)}
    </span>
  );
}

function MainGrid({ data }: { data: AdminDashboardData }) {
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Panel
        className="xl:col-span-2"
        title="Verification queue"
        icon={BadgeCheck}
        iconTone="text-amber-400"
        subtitle="Members who are not fully active yet — review identity and status before granting access."
        action={<PanelLink to="/admin/moderation?tab=cases&queue=identity">Review all ({data.verificationQueue.length})</PanelLink>}
      >
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wide text-zinc-600">
                <th className="pb-2 pr-4 font-medium">Member</th>
                <th className="pb-2 pr-4 font-medium">Email</th>
                <th className="pb-2 pr-4 font-medium">Type</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {data.verificationQueue.slice(0, 8).map((v) => (
                <tr key={v.id} className="border-b border-white/[0.04] text-zinc-300 hover:bg-white/[0.02]">
                  <td className="py-3 pr-4">
                    <p className="font-medium text-white">{v.name}</p>
                    <p className="text-[11px] text-zinc-600">@{v.username}</p>
                  </td>
                  <td className="max-w-[220px] truncate py-3 pr-4 text-zinc-400">{v.email}</td>
                  <td className="py-3 pr-4 text-zinc-400">{v.accountType || 'User'}</td>
                  <td className="py-3 pr-4">
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${statusPill(v.status)}`}>{v.status}</span>
                  </td>
                  <td className="py-3 text-xs text-zinc-500" title={formatDateTime(v.submittedAt)}>
                    {formatRelative(v.submittedAt)}
                  </td>
                </tr>
              ))}
              {data.verificationQueue.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-zinc-500">
                    <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-emerald-400/70" />
                    No pending verifications — everyone is active.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Team on duty"
        icon={UserCog}
        iconTone="text-rose-400"
        subtitle="Staff and moderators with console access."
        action={<PanelLink to="/admin/moderation?tab=management&section=moderators">Manage</PanelLink>}
      >
        <ul className="scroll-thin mt-4 max-h-[360px] space-y-2 overflow-y-auto pr-1">
          {data.staffRoster.map((s) => (
            <li key={s.id} className="flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.04]">
              <Initial name={s.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{s.name}</p>
                <p className="truncate text-xs text-zinc-500">@{s.username}</p>
              </div>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${rolePill(s.role)}`}>{s.roleLabel}</span>
            </li>
          ))}
          {data.staffRoster.length === 0 && <p className="py-6 text-center text-sm text-zinc-500">No staff accounts.</p>}
        </ul>
      </Panel>
    </div>
  );
}

function InsightGrid({ data }: { data: AdminDashboardData }) {
  const topCredits = Math.max(1, ...data.economyFeed.map((e) => e.credits || 0));
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Recent platform activity" icon={Activity} iconTone="text-rose-400" subtitle="Signups, verifications and staff changes.">
        <ol className="scroll-thin mt-4 max-h-96 space-y-1 overflow-y-auto pr-1">
          {data.recentActivity.map((e) => (
            <li key={e.id} className="flex gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-white/[0.03]">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${ACTIVITY_DOT[e.category] || 'bg-zinc-500'}`} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-zinc-200">{e.title}</span>
                <span className="block truncate text-xs text-zinc-600">{e.detail}</span>
              </span>
              <span className="shrink-0 text-[11px] text-zinc-600" title={formatDateTime(e.timestamp)}>
                {formatRelative(e.timestamp)}
              </span>
            </li>
          ))}
          {data.recentActivity.length === 0 && <p className="py-6 text-center text-sm text-zinc-500">No recent events.</p>}
        </ol>
      </Panel>

      <Panel
        title="Credits leaderboard"
        icon={TrendingUp}
        iconTone="text-emerald-400"
        subtitle="Members holding the most credits (spendable plus on hold)."
        action={<PanelLink to="/admin/credit-economy?tab=wallets">All wallets</PanelLink>}
      >
        <ol className="mt-4 space-y-1">
          {data.economyFeed.map((e) => {
            const row = (
              <>
                <div className="flex items-center gap-3">
                  <span className="w-5 text-right text-xs font-semibold tabular-nums text-zinc-600">{e.rank}</span>
                  <Initial name={e.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{e.name}</p>
                    <p className="truncate text-xs text-zinc-500">
                      @{e.username}
                      {e.heldCredits > 0 && <span className="text-amber-300"> · {e.heldCredits.toLocaleString()} on hold</span>}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold tabular-nums text-emerald-300">{(e.credits || 0).toLocaleString()}</p>
                </div>
                <div className="ml-8 mt-2 h-1 overflow-hidden rounded-full bg-white/[0.04]">
                  <div
                    className="console-bar h-full rounded-full bg-emerald-400/60"
                    style={{ width: `${Math.max(2, ((e.credits || 0) / topCredits) * 100)}%` }}
                  />
                </div>
              </>
            );
            return (
              <li key={e.id}>
                {e.walletId ? (
                  <Link
                    to={`/admin/credit-economy?tab=wallets&wallet=${e.walletId}`}
                    className="block rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.03]"
                  >
                    {row}
                  </Link>
                ) : (
                  <div className="rounded-xl px-3 py-2.5">{row}</div>
                )}
              </li>
            );
          })}
          {data.economyFeed.length === 0 && <p className="py-6 text-center text-sm text-zinc-500">No wallets yet.</p>}
        </ol>
      </Panel>
    </div>
  );
}

function BreakdownCard({ title, rows, barTone }: { title: string; rows: { label: string; count: number }[]; barTone: string }) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  return (
    <Panel title={title} subtitle={`${total.toLocaleString()} total`}>
      <ul className="mt-4 space-y-3">
        {rows.map((r) => {
          const pct = total ? (r.count / total) * 100 : 0;
          return (
            <li key={r.label}>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">{r.label}</span>
                <span className="font-semibold tabular-nums text-white">
                  {r.count.toLocaleString()}
                  <span className="ml-1.5 text-[11px] font-normal text-zinc-600">{Math.round(pct)}%</span>
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
                <div className={`console-bar h-full rounded-full ${barTone}`} style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
        {rows.length === 0 && <li className="py-4 text-center text-sm text-zinc-500">No data.</li>}
      </ul>
    </Panel>
  );
}

function BreakdownGrid({ data }: { data: AdminDashboardData }) {
  const { kpis, breakdowns } = data;
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <BreakdownCard
        title="Members by status"
        barTone="bg-sky-400/60"
        rows={breakdowns.usersByStatus.map((r) => ({ label: r.status, count: r.count }))}
      />
      <BreakdownCard
        title="Staff by role"
        barTone="bg-rose-400/60"
        rows={breakdowns.staffByRole.map((r) => ({ label: r.label, count: r.count }))}
      />
      <Panel title="Latest signups" icon={UserPlus} iconTone="text-sky-400" action={<PanelLink to="/admin/user-team?tab=users">Users</PanelLink>}>
        <ul className="mt-4 space-y-1.5 text-sm">
          {data.recentSignups.slice(0, 8).map((s) => (
            <li key={s.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.03]">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-zinc-200">{s.name}</span>
                <span className="block truncate text-[11px] text-zinc-600">
                  @{s.username} · {formatRelative(s.joinedAt)}
                </span>
              </span>
              <span className={`shrink-0 rounded-full border px-2 text-[10px] ${statusPill(s.status)}`}>{s.status}</span>
            </li>
          ))}
          {data.recentSignups.length === 0 && <li className="py-4 text-center text-zinc-500">No signups yet.</li>}
        </ul>
        {(kpis.forumGroups != null || kpis.forumDiscussions != null) && (
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/[0.06] pt-4">
            <div className="flex items-center gap-2 rounded-lg bg-white/[0.02] px-3 py-2">
              <MessageSquare className="h-4 w-4 text-violet-400" />
              <span className="text-xs text-zinc-500">Groups</span>
              <span className="ml-auto font-semibold tabular-nums text-white">{(kpis.forumGroups ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-white/[0.02] px-3 py-2">
              <MessageSquare className="h-4 w-4 text-indigo-400" />
              <span className="text-xs text-zinc-500">Discussions</span>
              <span className="ml-auto font-semibold tabular-nums text-white">{(kpis.forumDiscussions ?? 0).toLocaleString()}</span>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
