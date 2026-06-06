import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Eye,
  FileWarning,
  Gavel,
  LayoutGrid,
  Loader2,
  MessageSquare,
  RefreshCw,
  Scale,
  ScrollText,
  Search,
  Settings2,
  Shield,
  ShieldAlert,
  UserCog,
  Users,
  Video,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import api from '@/lib/axios';
import useGlobalState from '@/lib/global_state';
import type { ModerationActivity, ModerationCase, ModerationOverview } from './moderationTypes';

type TabId = 'overview' | 'activity' | 'cases' | 'moderators' | 'forum' | 'settings';

const TABS: { id: TabId; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'activity', label: 'Activity log', icon: ScrollText },
  { id: 'cases', label: 'Pending cases', icon: FileWarning },
  { id: 'moderators', label: 'Moderators', icon: UserCog },
  { id: 'forum', label: 'Forum content', icon: MessageSquare },
  { id: 'settings', label: 'Auto-mod settings', icon: Settings2 },
];

function formatDateTime(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function priorityClass(priority: string) {
  if (priority === 'high') return 'bg-red-500/15 text-red-300 border-red-500/25';
  if (priority === 'medium') return 'bg-amber-500/15 text-amber-200 border-amber-500/25';
  return 'bg-zinc-500/15 text-zinc-300 border-white/10';
}

function statusClass(status: string) {
  if (status === 'Completed') return 'bg-emerald-500/15 text-emerald-300';
  if (status === 'Reversed') return 'bg-violet-500/15 text-violet-300';
  if (status === 'Pending') return 'bg-amber-500/15 text-amber-200';
  return 'bg-zinc-500/15 text-zinc-300';
}

export default function ModerationPage() {
  const { user } = useGlobalState();
  const [searchParams, setSearchParams] = useSearchParams();
  const paramTab = searchParams.get('tab') as TabId | null;
  const validTabs: TabId[] = ['overview', 'activity', 'cases', 'moderators', 'forum', 'settings'];
  const initialTab = paramTab && validTabs.includes(paramTab) ? paramTab : 'overview';

  const [data, setData] = useState<ModerationOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<TabId>(initialTab);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ModerationActivity | null>(null);
  const [mgmtPanel, setMgmtPanel] = useState<string | null>(null);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const res = await api.get('/api/admin/moderation-overview');
      if (res.data?.success) setData(res.data.data);
      else setError('Failed to load moderation data');
    } catch {
      setError('Failed to load moderation data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (paramTab && validTabs.includes(paramTab)) setTab(paramTab);
  }, [paramTab]);

  const switchTab = (id: TabId) => {
    setTab(id);
    setSearchParams(id === 'overview' ? {} : { tab: id }, { replace: true });
    setMgmtPanel(null);
  };

  const q = search.trim().toLowerCase();

  const filterActivity = useMemo(() => {
    if (!data) return [];
    if (!q) return data.recentActivity;
    return data.recentActivity.filter(
      (a) =>
        a.target.toLowerCase().includes(q) ||
        a.executedBy.toLowerCase().includes(q) ||
        a.action.toLowerCase().includes(q)
    );
  }, [data, q]);

  const filterCases = useMemo(() => {
    if (!data) return [];
    if (!q) return data.pendingCases;
    return data.pendingCases.filter(
      (c) =>
        c.target.toLowerCase().includes(q) ||
        c.targetHandle.toLowerCase().includes(q) ||
        c.type.toLowerCase().includes(q)
    );
  }, [data, q]);

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
          <button type="button" onClick={() => void load()} className="mt-4 block text-sm underline">
            Retry
          </button>
        </div>
      </main>
    );
  }

  const { summary, alerts, automatedSettings, dataSources } = data;

  return (
    <main className="min-h-screen md:pl-[260px]">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#06070c]/90 backdrop-blur-xl">
        <div className="flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between md:px-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-400/80">
              Moderation
            </p>
            <h1 className="text-xl font-bold text-white">Moderation dashboard</h1>
            <p className="mt-1 text-xs text-zinc-500">
              Scanned {dataSources.postgres.userCount} users · {dataSources.postgres.staffCount} staff
              {dataSources.mongo.connected
                ? ` · ${dataSources.mongo.forumGroups} forum groups`
                : ' · forum offline'}
              {' · '}@{user?.username || 'admin'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1 lg:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search activity, cases, moderators…"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500/15"
              />
            </div>
            <button
              type="button"
              onClick={() => void load(true)}
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
              onClick={() => switchTab(id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                tab === id
                  ? 'border-rose-400 text-white'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {id === 'cases' && summary.yourPendingCases > 0 && (
                <span className="rounded-full bg-amber-500/20 px-1.5 text-[10px] font-bold text-amber-200">
                  {summary.yourPendingCases}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="space-y-6 px-6 py-6 md:px-8 md:py-8">
        <div className="flex flex-wrap gap-2">
          {alerts.map((a) => (
            <span
              key={a.id}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${
                a.severity === 'warning'
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                  : a.severity === 'success'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                    : 'border-white/10 bg-white/[0.03] text-zinc-300'
              }`}
            >
              {a.severity === 'success' ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <AlertTriangle className="h-3 w-3" />
              )}
              {a.message}
            </span>
          ))}
        </div>

        {tab === 'overview' && (
          <OverviewTab
            data={data}
            activity={filterActivity.slice(0, 8)}
            cases={filterCases.slice(0, 5)}
            mgmtPanel={mgmtPanel}
            setMgmtPanel={setMgmtPanel}
            onViewActivity={setSelectedActivity}
            onGoTab={switchTab}
          />
        )}
        {tab === 'activity' && (
          <ActivityTable entries={filterActivity} onView={setSelectedActivity} full />
        )}
        {tab === 'cases' && <CasesTable cases={filterCases} full />}
        {tab === 'moderators' && <ModeratorsTab roster={data.moderatorRoster} breakdown={data.accountStatusBreakdown} />}
        {tab === 'forum' && (
          <ForumTab
            connected={dataSources.mongo.connected}
            groups={data.forumReviewQueue}
            discussions={data.contentSnapshots}
          />
        )}
        {tab === 'settings' && <SettingsTab settings={automatedSettings} notYet={dataSources.notYetInDatabase} />}
      </div>

      {selectedActivity && (
        <ActivityDetailModal activity={selectedActivity} onClose={() => setSelectedActivity(null)} />
      )}
    </main>
  );
}

function OverviewTab({
  data,
  activity,
  cases,
  mgmtPanel,
  setMgmtPanel,
  onViewActivity,
  onGoTab,
}: {
  data: ModerationOverview;
  activity: ModerationActivity[];
  cases: ModerationCase[];
  mgmtPanel: string | null;
  setMgmtPanel: (v: string | null) => void;
  onViewActivity: (a: ModerationActivity) => void;
  onGoTab: (t: TabId) => void;
}) {
  const s = data.summary;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Your pending cases"
            value={s.yourPendingCases}
            sub={`${s.openIdentityReviews} identity reviews`}
            icon={FileWarning}
          />
          <StatCard
            label="Moderator performance"
            value={`${s.moderatorPerformancePercent}%`}
            sub={`${s.activeModerators} active of ${s.totalModerators}`}
            icon={Shield}
          />
          <StatCard
            label="Active moderators"
            value={s.activeModerators}
            sub={`${s.nonActiveAccounts} non-active accounts`}
            icon={Users}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          {[
            ['Forum groups', s.forumGroupsActive],
            ['Discussions', s.forumDiscussions],
            ['Disputes', s.disputeQueueCount],
            ['Soft-deleted', s.softDeletedAccounts],
          ].map(([label, val]) => (
            <div key={String(label)} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <p className="text-[10px] uppercase text-zinc-600">{label}</p>
              <p className="text-xl font-bold text-white">{val}</p>
            </div>
          ))}
        </div>

        <ActivityTable entries={activity} onView={onViewActivity} />
        <CasesTable cases={cases} onViewAll={() => onGoTab('cases')} />
      </div>

      <div className="space-y-4">
        <MgmtBtn
          icon={ShieldAlert}
          label="Verification management"
          active={mgmtPanel === 'verify'}
          onClick={() => {
            setMgmtPanel(mgmtPanel === 'verify' ? null : 'verify');
            onGoTab('cases');
          }}
        />
        <MgmtBtn
          icon={Bot}
          label="Automated moderation settings"
          active={mgmtPanel === 'auto'}
          onClick={() => {
            setMgmtPanel(mgmtPanel === 'auto' ? null : 'auto');
            onGoTab('settings');
          }}
        />
        <MgmtBtn
          icon={Scale}
          label="Dispute resolution queue"
          active={mgmtPanel === 'disputes'}
          onClick={() => setMgmtPanel(mgmtPanel === 'disputes' ? null : 'disputes')}
        />
        <MgmtBtn
          icon={UserCog}
          label="Moderator management"
          active={mgmtPanel === 'mods'}
          onClick={() => {
            setMgmtPanel(mgmtPanel === 'mods' ? null : 'mods');
            onGoTab('moderators');
          }}
        />
        <MgmtBtn
          icon={Video}
          label="Video platform management"
          active={mgmtPanel === 'video'}
          onClick={() => setMgmtPanel(mgmtPanel === 'video' ? null : 'video')}
        />

        {mgmtPanel === 'disputes' && (
          <SidePanel title="Dispute queue">
            <p className="text-sm text-zinc-400">
              No <code className="text-zinc-500">disputes</code> table exists yet. Queue count is{' '}
              <span className="text-white">{s.disputeQueueCount}</span>. Wire this when dispute storage is added.
            </p>
          </SidePanel>
        )}
        {mgmtPanel === 'video' && (
          <SidePanel title="Video platform">
            <p className="text-sm text-zinc-400">
              Video editor runs as a separate app. Content moderation for uploads will connect here when the asset
              pipeline is live.
            </p>
          </SidePanel>
        )}

        <SidePanel title="Top moderators by actions">
          <ul className="space-y-2">
            {data.moderatorRoster
              .sort((a, b) => b.actionsHandled - a.actionsHandled)
              .slice(0, 5)
              .map((m) => (
                <li key={m.id} className="flex justify-between text-sm">
                  <span className="text-zinc-300">{m.name}</span>
                  <span className="tabular-nums text-zinc-500">{m.actionsHandled}</span>
                </li>
              ))}
          </ul>
        </SidePanel>

        <SidePanel title="What we scanned">
          <ul className="space-y-1 text-xs text-zinc-500">
            <li>Postgres: {data.dataSources.postgres.tables.join(', ')}</li>
            <li>
              Mongo: {data.dataSources.mongo.connected ? data.dataSources.mongo.collections.join(', ') : 'not connected'}
            </li>
            <li className="pt-2 text-zinc-600">Not in DB yet: {data.dataSources.notYetInDatabase.join(', ')}</li>
          </ul>
        </SidePanel>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: typeof Shield;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          <p className="mt-1 text-xs text-zinc-500">{sub}</p>
        </div>
        <Icon className="h-5 w-5 text-rose-400" />
      </div>
    </div>
  );
}

function MgmtBtn({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Shield;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm font-medium transition ${
        active
          ? 'border-rose-500/40 bg-rose-500/10 text-white'
          : 'border-white/[0.08] bg-[#14151c] text-zinc-300 hover:text-white'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0 text-rose-400" />
      {label}
    </button>
  );
}

function SidePanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">{title}</h3>
      {children}
    </section>
  );
}

function ActivityTable({
  entries,
  onView,
  full,
}: {
  entries: ModerationActivity[];
  onView: (a: ModerationActivity) => void;
  full?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14151c]">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <h2 className="text-sm font-semibold text-white">System recent activity</h2>
        {!full && <p className="text-xs text-zinc-500">Derived from staff roster + account & forum scan</p>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] bg-[#0f1016] text-[10px] uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Executed by</th>
              <th className="px-4 py-3">Time & date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((a) => (
              <tr key={a.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="px-4 py-3 text-white">{a.action}</td>
                <td className="px-4 py-3">
                  <p className="text-zinc-300">{a.target}</p>
                  <p className="text-[10px] text-zinc-600">{a.targetType}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-zinc-300">{a.executedBy}</p>
                  <p className="text-[10px] text-zinc-600">{a.executedByRole}</p>
                </td>
                <td className="px-4 py-3 text-xs text-zinc-500">{formatDateTime(a.timestamp)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${statusClass(a.status)}`}>{a.status}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => onView(a)}
                    className="rounded-lg p-2 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-zinc-500">
                  No activity matches your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CasesTable({
  cases,
  full,
  onViewAll,
}: {
  cases: ModerationCase[];
  full?: boolean;
  onViewAll?: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14151c]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Pending cases</h2>
          {!full && <p className="text-xs text-zinc-500">From account status, identity gaps & forum scan</p>}
        </div>
        {onViewAll && (
          <button type="button" onClick={onViewAll} className="text-xs text-rose-400 hover:underline">
            View all
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] bg-[#0f1016] text-[10px] uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Assigned role</th>
              <th className="px-4 py-3">Opened</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="px-4 py-3 text-zinc-300">{c.type}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-white">{c.target}</p>
                  <p className="text-[10px] text-zinc-600">{c.targetType}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${priorityClass(c.priority)}`}>
                    {c.priority}
                  </span>
                </td>
                <td className="max-w-[200px] truncate px-4 py-3 text-zinc-400">{c.reason}</td>
                <td className="px-4 py-3 text-zinc-400">{c.assignedRole}</td>
                <td className="px-4 py-3 text-xs text-zinc-500">{formatDateTime(c.openedAt)}</td>
              </tr>
            ))}
            {cases.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-zinc-500">
                  No open cases from current database scan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ModeratorsTab({
  roster,
  breakdown,
}: {
  roster: ModerationOverview['moderatorRoster'];
  breakdown: ModerationOverview['accountStatusBreakdown'];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {roster.map((m) => (
          <article
            key={m.id}
            className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-white">{m.name}</p>
                <p className="text-xs text-zinc-500">@{m.handle} · {m.email}</p>
                <span className="mt-2 inline-block rounded-full border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-[10px] text-rose-200">
                  {m.role}
                </span>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">{m.performanceScore}%</p>
                <p className="text-xs text-zinc-500">performance</p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-white/[0.06] pt-4 text-xs">
              <div>
                <dt className="text-zinc-600">Actions handled</dt>
                <dd className="font-semibold text-white">{m.actionsHandled}</dd>
              </div>
              <div>
                <dt className="text-zinc-600">Status</dt>
                <dd className="text-zinc-300">{m.status}</dd>
              </div>
              <div>
                <dt className="text-zinc-600">On duty</dt>
                <dd className={m.active ? 'text-emerald-400' : 'text-zinc-500'}>{m.active ? 'Yes' : 'No'}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      <section className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
        <h2 className="font-semibold text-white">Account status breakdown</h2>
        <p className="mt-1 text-xs text-zinc-500">From accounts table scan</p>
        <ul className="mt-4 space-y-2">
          {breakdown.map((b) => (
            <li key={b.status} className="flex justify-between text-sm">
              <span className="text-zinc-400">{b.status}</span>
              <span className="font-semibold text-white">{b.count}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ForumTab({
  connected,
  groups,
  discussions,
}: {
  connected: boolean;
  groups: ModerationOverview['forumReviewQueue'];
  discussions: ModerationOverview['contentSnapshots'];
}) {
  if (!connected) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8 text-center">
        <MessageSquare className="mx-auto h-10 w-10 text-amber-400" />
        <p className="mt-4 text-white">Forum content unavailable</p>
        <p className="mt-2 text-sm text-zinc-500">Set MONGODB_URI in backend/.env to scan forum_groups and forum_discussions.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
        <h2 className="font-semibold text-white">Forum groups</h2>
        <ul className="mt-4 space-y-2">
          {groups.map((g) => (
            <li key={g.id} className="rounded-xl border border-white/[0.06] px-4 py-3 text-sm">
              <p className="font-medium text-white">{g.name}</p>
              <p className="text-xs text-zinc-500">
                {g.memberCount} members · {g.status} · {formatDateTime(g.createdAt)}
              </p>
              {g.tags.length > 0 && (
                <p className="mt-1 text-[10px] text-zinc-600">Tags: {g.tags.join(', ')}</p>
              )}
            </li>
          ))}
          {groups.length === 0 && <p className="text-sm text-zinc-500">No forum groups in MongoDB.</p>}
        </ul>
      </section>
      <section className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
        <h2 className="font-semibold text-white">Discussions to review</h2>
        <ul className="mt-4 space-y-2">
          {discussions.map((d) => (
            <li key={d.id} className="rounded-xl border border-white/[0.06] px-4 py-3 text-sm">
              <p className="font-medium text-white">{d.title}</p>
              <p className="text-xs text-zinc-500">
                {d.commentCount} comments · user {d.userId ?? '—'} · {formatDateTime(d.createdAt)}
              </p>
            </li>
          ))}
          {discussions.length === 0 && <p className="text-sm text-zinc-500">No discussions in MongoDB.</p>}
        </ul>
      </section>
    </div>
  );
}

function SettingsTab({
  settings,
  notYet,
}: {
  settings: ModerationOverview['automatedSettings'];
  notYet: string[];
}) {
  const toggles = [
    ['spamFilterEnabled', 'Spam filter', settings.spamFilterEnabled],
    ['autoFlagProfanity', 'Auto-flag profanity', settings.autoFlagProfanity],
    ['autoHoldNewAccounts', 'Hold new accounts for review', settings.autoHoldNewAccounts],
    ['forumLinkScanning', 'Forum link scanning', settings.forumLinkScanning],
    ['marketplaceListingReview', 'Marketplace listing review', settings.marketplaceListingReview],
    ['disputeAutoAssign', 'Auto-assign disputes', settings.disputeAutoAssign],
  ] as const;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
        <div className="mb-4 flex items-center gap-2">
          <Gavel className="h-5 w-5 text-rose-400" />
          <h2 className="font-semibold text-white">Automated moderation</h2>
        </div>
        <p className="mb-4 text-xs text-zinc-500">
          UI controls ready — persistence requires{' '}
          <span className="text-zinc-400">automated_moderation_rules</span> table (not in DB yet).
        </p>
        <ul className="space-y-3">
          {toggles.map(([key, label, on]) => (
            <li
              key={key}
              className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
            >
              <span className="text-sm text-zinc-300">{label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  on ? 'bg-emerald-500/15 text-emerald-300' : 'bg-zinc-500/15 text-zinc-500'
                }`}
              >
                {on ? 'On' : 'Off'}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-zinc-500">
          Max warnings before suspend:{' '}
          <span className="font-semibold text-white">{settings.maxWarningsBeforeSuspend}</span>
        </p>
      </section>
      <section className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
        <h2 className="font-semibold text-white">Modules not in database yet</h2>
        <p className="mt-2 text-sm text-zinc-500">
          These will power live moderation once tables are added:
        </p>
        <ul className="mt-4 space-y-2">
          {notYet.map((item) => (
            <li key={item} className="rounded-lg bg-white/[0.03] px-3 py-2 font-mono text-xs text-zinc-400">
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ActivityDetailModal({
  activity,
  onClose,
}: {
  activity: ModerationActivity;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:pl-[260px]">
      <button type="button" className="absolute inset-0 bg-black/70" onClick={onClose} aria-label="Close" />
      <div className="relative w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#12131a] p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-white">{activity.action}</h2>
        <p className="mt-1 text-xs text-zinc-500">{formatDateTime(activity.timestamp)}</p>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-zinc-600">Target</dt>
            <dd className="text-white">
              {activity.target} ({activity.targetType})
            </dd>
          </div>
          <div>
            <dt className="text-zinc-600">Executed by</dt>
            <dd className="text-white">
              {activity.executedBy} — {activity.executedByRole}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-600">Category</dt>
            <dd className="text-zinc-300">{activity.category}</dd>
          </div>
          <div>
            <dt className="text-zinc-600">Status</dt>
            <dd>
              <span className={`rounded-full px-2 py-0.5 text-xs ${statusClass(activity.status)}`}>
                {activity.status}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-zinc-600">Notes</dt>
            <dd className="text-zinc-400">{activity.notes}</dd>
          </div>
        </dl>
        {activity.status === 'Completed' && (
          <button
            type="button"
            className="mt-6 w-full rounded-xl border border-violet-500/30 bg-violet-500/10 py-2.5 text-sm text-violet-200"
          >
            Reverse this action
          </button>
        )}
      </div>
    </div>
  );
}
