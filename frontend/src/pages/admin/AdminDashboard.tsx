import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Clock,
  Coins,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Shield,
  Ticket,
  TrendingUp,
  UserCog,
  Users,
  UserPlus,
} from 'lucide-react';
import api from '@/lib/axios';
import useGlobalState from '@/lib/global_state';
import type {
  AdminDashboardData,
  PlatformUser,
  StaffMember,
  VerificationItem,
} from './adminDashboardTypes';

type TabId = 'overview' | 'users' | 'staff' | 'verifications';

const TABS: { id: TabId; label: string; icon: typeof Activity }[] = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'users', label: 'Platform users', icon: Users },
  { id: 'staff', label: 'Team & moderators', icon: UserCog },
  { id: 'verifications', label: 'Verifications', icon: BadgeCheck },
];

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

function statusPill(status: string) {
  const s = status.toLowerCase();
  if (s === 'active') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25';
  if (s === 'pending' || s === 'inactive') return 'bg-amber-500/15 text-amber-200 border-amber-500/25';
  return 'bg-zinc-500/15 text-zinc-300 border-white/10';
}

function rolePill(role: string) {
  if (role === 'Admin') return 'bg-rose-500/20 text-rose-200 border-rose-500/30';
  if (role.includes('Forum')) return 'bg-violet-500/15 text-violet-200 border-violet-500/25';
  if (role.includes('Dispute')) return 'bg-orange-500/15 text-orange-200 border-orange-500/25';
  return 'bg-sky-500/15 text-sky-200 border-sky-500/25';
}

export default function AdminDashboard() {
  const { user } = useGlobalState();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const res = await api.get('/api/admin/dashboard-overview');
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
  };

  useEffect(() => {
    void loadData();
  }, []);

  const searchLower = search.trim().toLowerCase();

  const matchesSearch = (text: string) =>
    !searchLower || text.toLowerCase().includes(searchLower);

  const filteredUsers = useMemo(() => {
    if (!data) return [];
    return data.platformUsers.filter(
      (u) =>
        matchesSearch(u.name) ||
        matchesSearch(u.email) ||
        matchesSearch(u.username) ||
        matchesSearch(u.status)
    );
  }, [data, searchLower]);

  const filteredStaff = useMemo(() => {
    if (!data) return [];
    return data.staffRoster.filter(
      (s) =>
        matchesSearch(s.name) ||
        matchesSearch(s.email) ||
        matchesSearch(s.username) ||
        matchesSearch(s.role)
    );
  }, [data, searchLower]);

  const filteredQueue = useMemo(() => {
    if (!data) return [];
    return data.verificationQueue.filter(
      (v) =>
        matchesSearch(v.name) ||
        matchesSearch(v.email) ||
        matchesSearch(v.username) ||
        matchesSearch(v.status)
    );
  }, [data, searchLower]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center md:pl-[260px]">
        <Loader2 className="h-10 w-10 animate-spin text-rose-400" />
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="p-8 md:pl-[284px]">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
          {error}
          <button type="button" onClick={() => void loadData()} className="mt-4 block text-sm underline">
            Retry
          </button>
        </div>
      </main>
    );
  }

  const { kpis, alerts, breakdowns } = data;

  return (
    <main className="min-h-screen md:pl-[260px]">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#06070c]/90 backdrop-blur-xl">
        <div className="flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between md:px-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-400/80">
              Platform control center
            </p>
            <h1 className="text-xl font-bold text-white">Admin dashboard</h1>
            <p className="mt-1 text-xs text-zinc-500">
              Updated {formatDateTime(data.lastUpdated)} · Signed in as @{user?.username || 'admin'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1 lg:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users, staff, emails…"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500/15"
              />
            </div>
            <button
              type="button"
              onClick={() => void loadData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl border border-white/[0.08] px-4 py-2 text-sm text-zinc-300 hover:text-white"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto px-4 pb-0 md:px-6">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                tab === id
                  ? 'border-rose-400 text-white'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {id === 'verifications' && kpis.pendingVerifications > 0 && (
                <span className="rounded-full bg-amber-500/20 px-1.5 text-[10px] font-bold text-amber-200">
                  {kpis.pendingVerifications}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="space-y-6 px-6 py-6 md:px-8 md:py-8">
        {tab === 'overview' && (
          <OverviewTab data={data} kpis={kpis} alerts={alerts} breakdowns={breakdowns} />
        )}
        {tab === 'users' && <UsersTab users={filteredUsers} total={data.platformUsers.length} />}
        {tab === 'staff' && <StaffTab staff={filteredStaff} />}
        {tab === 'verifications' && (
          <VerificationsTab queue={filteredQueue} pending={kpis.pendingVerifications} />
        )}
      </div>
    </main>
  );
}

function OverviewTab({
  data,
  kpis,
  alerts,
  breakdowns,
}: {
  data: AdminDashboardData;
  kpis: AdminDashboardData['kpis'];
  alerts: AdminDashboardData['alerts'];
  breakdowns: AdminDashboardData['breakdowns'];
}) {
  const kpiCards = [
    {
      label: 'Pending verifications',
      value: kpis.pendingVerifications,
      sub: 'Accounts awaiting approval',
      icon: BadgeCheck,
      accent: 'text-amber-400',
    },
    {
      label: 'Open disputes',
      value: kpis.openDisputes,
      sub: 'Dispute module coming soon',
      icon: Shield,
      accent: 'text-orange-400',
    },
    {
      label: 'Merit in circulation',
      value: kpis.platformRevenueCredits.toLocaleString(),
      sub: `Avg ${kpis.avgUserMerit} per member`,
      icon: Coins,
      accent: 'text-emerald-400',
    },
    {
      label: 'Active members',
      value: kpis.activeUsers,
      sub: `${kpis.totalUsers} total platform users`,
      icon: Users,
      accent: 'text-sky-400',
    },
    {
      label: 'Support tickets',
      value: kpis.openTickets,
      sub: 'Ticket desk not connected yet',
      icon: Ticket,
      accent: 'text-violet-400',
    },
    {
      label: 'Moderation team',
      value: kpis.totalStaff,
      sub: `${breakdowns.staffByRole.length} role types assigned`,
      icon: UserCog,
      accent: 'text-rose-400',
    },
  ];

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {alerts.map((a) => (
          <span
            key={a.id}
            className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${
              a.severity === 'error'
                ? 'border-red-500/30 bg-red-500/10 text-red-200'
                : a.severity === 'warning'
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                  : a.severity === 'success'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                    : 'border-white/10 bg-white/[0.03] text-zinc-300'
            }`}
          >
            {a.severity === 'success' ? (
              <CheckCircle2 className="h-3 w-3 shrink-0" />
            ) : (
              <AlertTriangle className="h-3 w-3 shrink-0" />
            )}
            {a.message}
          </span>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {kpiCards.map(({ label, value, sub, icon: Icon, accent }) => (
          <div
            key={label}
            className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-transparent p-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-white">{value}</p>
                <p className="mt-1 text-xs text-zinc-500">{sub}</p>
              </div>
              <div className={`rounded-xl bg-white/[0.04] p-2.5 ${accent}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {(kpis.forumGroups != null || kpis.forumDiscussions != null) && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <MessageSquare className="h-8 w-8 text-violet-400" />
            <div>
              <p className="text-sm text-zinc-500">Forum groups</p>
              <p className="text-2xl font-bold text-white">{kpis.forumGroups ?? 0}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <MessageSquare className="h-8 w-8 text-indigo-400" />
            <div>
              <p className="text-sm text-zinc-500">Forum discussions</p>
              <p className="text-2xl font-bold text-white">{kpis.forumDiscussions ?? 0}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="xl:col-span-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Verification queue</h2>
            <span className="text-xs text-zinc-500">{data.verificationQueue.length} in queue</span>
          </div>
          <p className="mt-1 text-xs text-zinc-600">
            Members who are not fully active yet — review identity and account status before granting access.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wide text-zinc-600">
                  <th className="pb-2 pr-4 font-medium">Member</th>
                  <th className="pb-2 pr-4 font-medium">Email</th>
                  <th className="pb-2 pr-4 font-medium">Username</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 pr-4 font-medium text-right">Merit</th>
                  <th className="pb-2 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {data.verificationQueue.slice(0, 8).map((v) => (
                  <tr key={v.id} className="border-b border-white/[0.04] text-zinc-300">
                    <td className="py-3 pr-4 font-medium text-white">{v.name}</td>
                    <td className="py-3 pr-4 text-zinc-400">{v.email}</td>
                    <td className="py-3 pr-4">@{v.username}</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${statusPill(v.status)}`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">{v.meritCredits}</td>
                    <td className="py-3 text-xs text-zinc-500">{formatDateTime(v.submittedAt)}</td>
                  </tr>
                ))}
                {data.verificationQueue.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500">
                      No pending verifications — all members are active.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <h2 className="font-semibold text-white">Team on duty</h2>
          <p className="mt-1 text-xs text-zinc-600">Staff and moderators with platform access.</p>
          <ul className="mt-4 max-h-[340px] space-y-3 overflow-y-auto">
            {data.staffRoster.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] p-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-500/30 to-orange-500/20 text-sm font-bold text-white">
                  {s.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">{s.name}</p>
                  <p className="truncate text-xs text-zinc-500">@{s.username}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${rolePill(s.role)}`}>
                  {s.roleLabel}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-rose-400" />
            <h2 className="font-semibold text-white">Recent platform activity</h2>
          </div>
          <ul className="mt-4 max-h-96 space-y-2 overflow-y-auto">
            {data.recentActivity.map((e) => (
              <li key={e.id} className="rounded-xl border border-white/[0.04] px-4 py-3">
                <p className="text-sm text-zinc-200">{e.title}</p>
                <p className="mt-0.5 text-xs text-zinc-600">
                  {e.detail} · {formatDateTime(e.timestamp)}
                </p>
              </li>
            ))}
            {data.recentActivity.length === 0 && (
              <p className="py-6 text-center text-sm text-zinc-500">No recent events.</p>
            )}
          </ul>
        </section>

        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <h2 className="font-semibold text-white">Merit & credits leaderboard</h2>
          </div>
          <p className="mt-1 text-xs text-zinc-600">Top members by merit balance — use for economy oversight.</p>
          <ul className="mt-4 space-y-2">
            {data.economyFeed.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between rounded-xl bg-white/[0.02] px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06] text-xs font-bold text-zinc-400">
                    #{e.rank}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">{e.name}</p>
                    <p className="text-xs text-zinc-500">
                      @{e.username} · {e.label}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums text-emerald-300">+{e.meritChange}</p>
                  <p className="text-[10px] text-zinc-600">{e.timeAgo}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <BreakdownCard title="Members by status" rows={breakdowns.usersByStatus.map((r) => ({ label: r.status, count: r.count }))} />
        <BreakdownCard title="Staff by role" rows={breakdowns.staffByRole.map((r) => ({ label: r.label, count: r.count }))} />
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-sky-400" />
            <h2 className="font-semibold text-white">Latest signups</h2>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {data.recentSignups.map((s) => (
              <li key={s.id} className="flex justify-between gap-2 rounded-lg bg-white/[0.02] px-3 py-2">
                <span className="truncate text-zinc-300">{s.name}</span>
                <span className={`shrink-0 rounded-full border px-2 text-[10px] ${statusPill(s.status)}`}>
                  {s.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

function BreakdownCard({ title, rows }: { title: string; rows: { label: string; count: number }[] }) {
  return (
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
      <h2 className="font-semibold text-white">{title}</h2>
      <ul className="mt-4 space-y-2">
        {rows.map((r) => (
          <li key={r.label} className="flex justify-between text-sm">
            <span className="text-zinc-400">{r.label}</span>
            <span className="font-semibold tabular-nums text-white">{r.count}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function UsersTab({ users, total }: { users: PlatformUser[]; total: number }) {
  return (
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-white">All platform members</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Showing {users.length} of {total} users — name, contact, username, account status, and merit credits.
          </p>
        </div>
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wide text-zinc-600">
              <th className="pb-3 pr-4 font-medium">Member</th>
              <th className="pb-3 pr-4 font-medium">Email</th>
              <th className="pb-3 pr-4 font-medium">Username</th>
              <th className="pb-3 pr-4 font-medium">Display name</th>
              <th className="pb-3 pr-4 font-medium">Status</th>
              <th className="pb-3 pr-4 font-medium text-right">Merit</th>
              <th className="pb-3 pr-4 font-medium">Avatar</th>
              <th className="pb-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="py-3 pr-4">
                  <p className="font-medium text-white">{u.name}</p>
                  {u.tagline && <p className="text-xs text-zinc-600 truncate max-w-[180px]">{u.tagline}</p>}
                </td>
                <td className="py-3 pr-4 text-zinc-400">{u.email}</td>
                <td className="py-3 pr-4">@{u.username}</td>
                <td className="py-3 pr-4 text-zinc-400">{u.displayName || '—'}</td>
                <td className="py-3 pr-4">
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${statusPill(u.status)}`}>
                    {u.status}
                  </span>
                </td>
                <td className="py-3 pr-4 text-right tabular-nums font-medium text-emerald-300/90">
                  {u.meritCredits}
                </td>
                <td className="py-3 pr-4 text-zinc-500">{u.hasAvatar ? 'Yes' : 'No'}</td>
                <td className="py-3 text-xs text-zinc-500">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDateTime(u.joinedAt)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StaffTab({ staff }: { staff: StaffMember[] }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">
        {staff.length} staff accounts — administrators and specialized moderators. Merit shown for internal tracking.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {staff.map((s) => (
          <article
            key={s.id}
            className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent p-5"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/20 text-lg font-bold text-rose-100">
                {s.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white">{s.name}</p>
                <p className="text-xs text-zinc-500">@{s.username}</p>
                <span className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-[10px] ${rolePill(s.role)}`}>
                  {s.roleLabel}
                </span>
              </div>
            </div>
            <dl className="mt-4 space-y-2 border-t border-white/[0.06] pt-4 text-xs">
              <div className="flex justify-between">
                <dt className="text-zinc-600">Work email</dt>
                <dd className="truncate text-zinc-300 max-w-[55%] text-right">{s.email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-600">Account status</dt>
                <dd>
                  <span className={`rounded-full border px-2 py-0.5 ${statusPill(s.status)}`}>{s.status}</span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-600">Merit credits</dt>
                <dd className="tabular-nums text-emerald-300">{s.meritCredits}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-600">On platform since</dt>
                <dd className="text-zinc-400">{formatDateTime(s.joinedAt)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}

function VerificationsTab({ queue, pending }: { queue: VerificationItem[]; pending: number }) {
  return (
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
      <h2 className="text-lg font-semibold text-white">Account verification & approval</h2>
      <p className="mt-2 text-sm text-zinc-500">
        {pending} account(s) need your attention. Review each member&apos;s profile status before they get full platform
        access. Approve or reject from your moderation tools when those actions are wired up.
      </p>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wide text-zinc-600">
              <th className="pb-3 pr-4 font-medium">Member</th>
              <th className="pb-3 pr-4 font-medium">Email</th>
              <th className="pb-3 pr-4 font-medium">Username</th>
              <th className="pb-3 pr-4 font-medium">Account type</th>
              <th className="pb-3 pr-4 font-medium">Status</th>
              <th className="pb-3 pr-4 font-medium text-right">Merit</th>
              <th className="pb-3 font-medium">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {queue.map((v) => (
              <tr key={v.id} className="border-b border-white/[0.04]">
                <td className="py-3 pr-4 font-medium text-white">{v.name}</td>
                <td className="py-3 pr-4 text-zinc-400">{v.email}</td>
                <td className="py-3 pr-4">@{v.username}</td>
                <td className="py-3 pr-4 text-zinc-400">{v.accountType}</td>
                <td className="py-3 pr-4">
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${statusPill(v.status)}`}>
                    {v.status}
                  </span>
                </td>
                <td className="py-3 pr-4 text-right tabular-nums">{v.meritCredits}</td>
                <td className="py-3 text-xs text-zinc-500">{formatDateTime(v.submittedAt)}</td>
              </tr>
            ))}
            {queue.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-zinc-500">
                  Queue is empty — every account is in good standing.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
