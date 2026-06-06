import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Coins,
  LayoutGrid,
  Lightbulb,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Shield,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import api from '@/lib/axios';
import useGlobalState from '@/lib/global_state';
import type { PlatformAnalytics } from './analyticsTypes';
import {
  AreaChart,
  ChartCard,
  DonutChart,
  HorizontalBarChart,
  LineChart,
  VerticalBarChart,
} from './components/AnalyticsCharts';
import AnalyticsFilters, {
  filterMembersByState,
  filterSignupWeeks,
  type AnalyticsFilterState,
} from './components/AnalyticsFilters';

type TabId = 'overview' | 'growth' | 'community' | 'economy' | 'health';

const TABS: { id: TabId; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'growth', label: 'Growth & members', icon: TrendingUp },
  { id: 'community', label: 'Community', icon: MessageSquare },
  { id: 'economy', label: 'Credits & merit', icon: Coins },
  { id: 'health', label: 'Platform health', icon: Shield },
];

const DEFAULT_FILTERS: AnalyticsFilterState = {
  timeRange: 'all',
  status: 'all',
  verification: 'all',
  meritTier: 'all',
};

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-white">{value}</p>
          {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
        </div>
        <Icon className="h-5 w-5 shrink-0 text-rose-400" />
      </div>
    </div>
  );
}

function DataTable({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: string[][];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14151c]">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] bg-[#0f1016] text-[10px] uppercase text-zinc-600">
              {columns.map((c) => (
                <th key={c} className="px-4 py-3">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-white/[0.04] text-zinc-300">
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-2.5">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-zinc-500">
                  No results for current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function AnalyticsPage() {
  const { user } = useGlobalState();
  const [searchParams, setSearchParams] = useSearchParams();
  const paramTab = searchParams.get('tab') as TabId | null;
  const valid: TabId[] = ['overview', 'growth', 'community', 'economy', 'health'];
  const initialTab = paramTab && valid.includes(paramTab) ? paramTab : 'overview';

  const [data, setData] = useState<PlatformAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<TabId>(initialTab);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<AnalyticsFilterState>(DEFAULT_FILTERS);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const res = await api.get('/api/admin/analytics-overview');
      if (res.data?.success) setData(res.data.data);
      else setError('Failed to load platform analytics');
    } catch {
      setError('Failed to load platform analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (paramTab && valid.includes(paramTab)) setTab(paramTab);
  }, [paramTab]);

  const switchTab = (id: TabId) => {
    setTab(id);
    setSearchParams(id === 'overview' ? {} : { tab: id }, { replace: true });
  };

  const q = search.trim().toLowerCase();

  const filteredMembers = useMemo(() => {
    if (!data) return [];
    let list = filterMembersByState(data.memberDirectory, filters);
    if (q) {
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.username.toLowerCase().includes(q) ||
          m.status.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, filters, q]);

  const filteredWeeks = useMemo(() => {
    if (!data) return [];
    return filterSignupWeeks(data.growth.signupsByWeek, filters.timeRange);
  }, [data, filters.timeRange]);

  const filteredEngagement = useMemo(() => {
    if (!data) return [];
    return filterSignupWeeks(data.growth.engagementTrend, filters.timeRange);
  }, [data, filters.timeRange]);

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

  const { kpis, alerts } = data;
  const filterActive =
    filters.timeRange !== 'all' ||
    filters.status !== 'all' ||
    filters.verification !== 'all' ||
    filters.meritTier !== 'all';

  return (
    <main className="min-h-screen md:pl-[260px]">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#06070c]/90 backdrop-blur-xl">
        <div className="flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between md:px-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-400/80">Analytics</p>
            <h1 className="text-xl font-bold text-white">Platform analytics</h1>
            <p className="mt-1 text-xs text-zinc-500">
              {filterActive ? `${filteredMembers.length} filtered` : kpis.totalMembers} members · engagement{' '}
              {kpis.engagementScore}/100 · @{user?.username || 'admin'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1 lg:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search members, metrics…"
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
                tab === id ? 'border-rose-400 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="space-y-6 px-6 py-6 md:px-8 md:py-8">
        <AnalyticsFilters
          filters={filters}
          onChange={setFilters}
          resultCount={filteredMembers.length}
          totalCount={data.memberDirectory.length}
        />

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
              {a.severity === 'success' ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
              {a.message}
            </span>
          ))}
        </div>

        {tab === 'overview' && (
          <OverviewTab
            data={data}
            filteredMembers={filteredMembers}
            filteredWeeks={filteredWeeks}
            filteredEngagement={filteredEngagement}
            filterActive={filterActive}
          />
        )}
        {tab === 'growth' && (
          <GrowthTab data={data} filteredMembers={filteredMembers} filteredWeeks={filteredWeeks} />
        )}
        {tab === 'community' && <CommunityTab data={data} />}
        {tab === 'economy' && <EconomyTab data={data} filteredMembers={filteredMembers} />}
        {tab === 'health' && <HealthTab data={data} filteredMembers={filteredMembers} />}
      </div>
    </main>
  );
}

function OverviewTab({
  data,
  filteredMembers,
  filteredWeeks,
  filteredEngagement,
  filterActive,
}: {
  data: PlatformAnalytics;
  filteredMembers: PlatformAnalytics['memberDirectory'];
  filteredWeeks: PlatformAnalytics['growth']['signupsByWeek'];
  filteredEngagement: PlatformAnalytics['growth']['engagementTrend'];
  filterActive: boolean;
}) {
  const { kpis, growth, charts, insights, community } = data;

  const cumulativeArea = filteredWeeks.map((w) => ({
    label: w.week,
    value: w.cumulativeMembers,
  }));

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <KpiCard
          label="Total members"
          value={filterActive ? filteredMembers.length : kpis.totalMembers}
          sub={`${kpis.activeMembers} active platform-wide`}
          icon={Users}
        />
        <KpiCard
          label="New this week"
          value={kpis.newMembersThisWeek}
          sub={`${kpis.memberGrowthPercent >= 0 ? '+' : ''}${kpis.memberGrowthPercent}% WoW`}
          icon={UserPlus}
        />
        <KpiCard label="Engagement score" value={`${kpis.engagementScore}/100`} icon={Activity} />
        <KpiCard
          label="Verified members"
          value={`${kpis.verifiedMembersPercent}%`}
          sub={`${data.audience.byVerification.fullyVerified} fully verified`}
          icon={CheckCircle2}
        />
        <KpiCard
          label="Profile completion"
          value={`${kpis.profileCompletePercent}%`}
          sub={`${data.audience.profileHealth.completeProfiles} complete profiles`}
          icon={Shield}
        />
        <KpiCard
          label="Credits in circulation"
          value={kpis.totalCreditsInCirculation.toLocaleString()}
          sub={`Avg merit ${kpis.avgMemberMerit}`}
          icon={Coins}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Est. monthly active"
          value={kpis.estimatedMau.toLocaleString()}
          sub={`DAU ~${kpis.estimatedDau} · WAU ~${kpis.estimatedWau}`}
          icon={BarChart3}
        />
        <KpiCard
          label="Forum groups"
          value={kpis.forumGroups ?? '—'}
          sub={kpis.forumDiscussions != null ? `${kpis.forumDiscussions} discussions` : 'Community unavailable'}
          icon={MessageSquare}
        />
        <KpiCard
          label="Moderation team"
          value={kpis.moderationTeamSize}
          sub={`${kpis.pendingVerifications} pending verifications`}
          icon={Shield}
        />
        <KpiCard
          label="Growth trend"
          value={growth.trendLabel}
          sub={`${growth.weekOverWeekChange}% week over week`}
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard>
          <LineChart
            title="Estimated active users over time"
            labels={filteredEngagement.map((e) => e.label)}
            series={[
              { label: 'Est. DAU', color: '#fb7185', values: filteredEngagement.map((e) => e.estimatedDau) },
              { label: 'Est. WAU', color: '#a78bfa', values: filteredEngagement.map((e) => e.estimatedWau) },
              { label: 'Est. MAU', color: '#34d399', values: filteredEngagement.map((e) => e.estimatedMau) },
            ]}
          />
        </ChartCard>
        <ChartCard>
          <VerticalBarChart
            title="Weekly new member signups"
            data={filteredWeeks.map((w) => ({ label: w.week, value: w.newMembers }))}
          />
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard>
          <DonutChart title="Verification mix" segments={charts.verificationMix} />
        </ChartCard>
        <ChartCard>
          <DonutChart title="Member status mix" segments={charts.statusMix} />
        </ChartCard>
        <ChartCard>
          <AreaChart
            title="Cumulative member growth"
            data={cumulativeArea.length ? cumulativeArea : [{ label: '—', value: 0 }]}
          />
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard>
          <VerticalBarChart
            title="Monthly signups"
            data={data.growth.signupsByMonth.map((m) => ({ label: m.label.split(' ')[0], value: m.value }))}
            color="#a78bfa"
          />
        </ChartCard>
        <ChartCard>
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-400" />
            <p className="text-sm font-semibold text-white">Admin insights</p>
          </div>
          <ul className="mt-4 space-y-3">
            {insights.map((i) => (
              <li key={i.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm">
                <p className="font-medium text-white">{i.title}</p>
                <p className="mt-1 text-xs text-zinc-500">{i.detail}</p>
              </li>
            ))}
          </ul>
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard>
          <VerticalBarChart
            title="Members by status"
            data={data.audience.byStatus.map((s) => ({ label: s.label, value: s.count }))}
            color="#60a5fa"
          />
        </ChartCard>
        <ChartCard>
          <HorizontalBarChart
            title="Merit tier breakdown"
            data={data.audience.meritTiers.map((t) => ({ label: t.tier, value: t.count }))}
          />
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DataTable
          title="Top members by merit"
          columns={['Rank', 'Member', 'Merit', 'Credits', 'Status']}
          rows={data.audience.topMembers.slice(0, 8).map((m) => [
            String(m.rank),
            m.name,
            String(m.merit),
            m.credits.toLocaleString(),
            m.status,
          ])}
        />
        <DataTable
          title="Newest members"
          columns={['Member', 'Username', 'Status', 'Verification', 'Joined']}
          rows={growth.newestMembers.map((m) => [
            m.name,
            `@${m.username}`,
            m.status,
            m.verification,
            formatDate(m.joinedAt),
          ])}
        />
      </div>

      {community.available && community.topGroups && (
        <DataTable
          title="Largest community groups"
          columns={['Group', 'Members', 'Status']}
          rows={community.topGroups.map((g) => [g.name, String(g.members), g.status])}
        />
      )}
    </>
  );
}

function GrowthTab({
  data,
  filteredMembers,
  filteredWeeks,
}: {
  data: PlatformAnalytics;
  filteredMembers: PlatformAnalytics['memberDirectory'];
  filteredWeeks: PlatformAnalytics['growth']['signupsByWeek'];
}) {
  const { growth, charts, audience } = data;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ['Trend', growth.trendLabel],
          ['WoW change', `${growth.weekOverWeekChange}%`],
          ['Avg signups/week', growth.avgSignupsPerWeek],
          ['Retention est.', `${growth.retentionEstimate}%`],
        ].map(([l, v]) => (
          <div key={String(l)} className="rounded-xl border border-white/[0.06] bg-[#14151c] px-4 py-3">
            <p className="text-[10px] uppercase text-zinc-600">{l}</p>
            <p className="text-xl font-bold text-white">{v}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard>
          <AreaChart
            title="Signup momentum (weekly)"
            data={filteredWeeks.map((w) => ({ label: w.week, value: w.newMembers }))}
          />
        </ChartCard>
        <ChartCard>
          <HorizontalBarChart
            title="Merit tier distribution"
            data={charts.meritTierBars.map((t) => ({ label: t.label, value: t.value }))}
          />
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard>
          <DonutChart title="Verification breakdown" segments={data.charts.verificationMix} />
        </ChartCard>
        <ChartCard>
          <VerticalBarChart
            title="Signup email domains"
            data={audience.emailDomains.map((d) => ({ label: d.domain, value: d.count }))}
            color="#34d399"
          />
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard>
          <VerticalBarChart
            title="Members by status"
            data={data.audience.byStatus.map((s) => ({ label: s.label, value: s.count }))}
            color="#818cf8"
          />
        </ChartCard>
        <ChartCard>
          <VerticalBarChart
            title="Monthly signups"
            data={data.growth.signupsByMonth.map((m) => ({ label: m.label.split(' ')[0], value: m.value }))}
            color="#34d399"
          />
        </ChartCard>
      </div>

      <DataTable
        title="Filtered member directory"
        columns={['Member', 'Username', 'Status', 'Verification', 'Merit', 'Joined']}
        rows={filteredMembers.slice(0, 25).map((m) => [
          m.name,
          `@${m.username}`,
          m.status,
          m.verification,
          String(m.merit),
          formatDate(m.joinedAt),
        ])}
      />

      <DataTable
        title="Newest signups (platform-wide)"
        columns={['Member', 'Username', 'Merit', 'Status', 'Joined']}
        rows={growth.newestMembers.map((m) => [
          m.name,
          `@${m.username}`,
          String(m.merit),
          m.status,
          formatDate(m.joinedAt),
        ])}
      />
    </div>
  );
}

function CommunityTab({ data }: { data: PlatformAnalytics }) {
  const { community, charts } = data;

  if (!community.available) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-10 text-center">
        <MessageSquare className="mx-auto h-12 w-12 text-amber-400" />
        <p className="mt-4 text-lg font-semibold text-white">Community metrics unavailable</p>
        <p className="mt-2 text-sm text-zinc-500">{community.message}</p>
      </div>
    );
  }

  const s = community.summary!;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Forum groups', s.total],
          ['Active groups', s.active],
          ['Members in groups', s.totalMembers],
          ['Participation rate', community.participationRate != null ? `${community.participationRate}%` : '—'],
          ['Discussions', community.discussions?.total ?? 0],
          ['Avg comments', community.discussions?.avgComments ?? 0],
          ['Avg group size', s.avgMembersPerGroup],
          ['Inactive groups', s.inactive],
        ].map(([l, v]) => (
          <div key={String(l)} className="rounded-xl border border-white/[0.06] bg-[#14151c] px-4 py-3">
            <p className="text-[10px] uppercase text-zinc-600">{l}</p>
            <p className="text-xl font-bold text-white">{v}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard>
          <HorizontalBarChart
            title="Popular forum tags"
            data={(community.popularTags ?? []).map((t) => ({ label: t.tag, value: t.count }))}
          />
        </ChartCard>
        <ChartCard>
          <VerticalBarChart
            title="Group size distribution"
            data={charts.groupSizeDistribution.map((g) => ({ label: g.label, value: g.count }))}
            color="#818cf8"
          />
        </ChartCard>
      </div>

      <ChartCard>
        <VerticalBarChart
          title="Top groups by membership"
          data={(community.topGroups ?? []).map((g) => ({ label: g.name.slice(0, 12), value: g.members }))}
          color="#f472b6"
        />
      </ChartCard>

      <DataTable
        title="Recent discussions"
        columns={['Title', 'Comments', 'Author ID']}
        rows={(community.recentDiscussions ?? []).map((d) => [d.title, String(d.comments), String(d.authorId ?? '—')])}
      />
    </div>
  );
}

function EconomyTab({
  data,
  filteredMembers,
}: {
  data: PlatformAnalytics;
  filteredMembers: PlatformAnalytics['memberDirectory'];
}) {
  const { economy, charts } = data;

  const filteredCredits = filteredMembers.reduce((s, m) => s + m.credits, 0);
  const filteredMerit = filteredMembers.reduce((s, m) => s + m.merit, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Credits in circulation" value={economy.totalCreditsInCirculation.toLocaleString()} icon={Coins} />
        <KpiCard label="Total merit" value={economy.totalMerit.toLocaleString()} icon={BarChart3} />
        <KpiCard label="Avg credits / member" value={economy.avgCreditsPerMember.toLocaleString()} icon={Users} />
        <KpiCard label="Avg merit / member" value={economy.avgMeritPerMember} icon={TrendingUp} />
      </div>

      {filteredMembers.length !== data.memberDirectory.length && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-100">
          Filtered subset: {filteredCredits.toLocaleString()} credits · {filteredMerit.toLocaleString()} total merit across{' '}
          {filteredMembers.length} members
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard>
          <DonutChart
            title="Credit balance tiers"
            segments={charts.creditBuckets.map((b, i) => ({
              label: b.label,
              value: b.count,
              color: ['#34d399', '#60a5fa', '#a78bfa', '#fb7185'][i] || '#71717a',
            }))}
          />
        </ChartCard>
        <ChartCard>
          <VerticalBarChart
            title="Merit tier distribution"
            data={charts.meritTierBars.map((t) => ({ label: t.label, value: t.value }))}
            color="#fbbf24"
          />
        </ChartCard>
      </div>

      <ChartCard>
        <HorizontalBarChart
          title="Merit leaders"
          data={economy.meritLeaders.map((m) => ({ label: m.name.slice(0, 18), value: m.merit }))}
        />
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <DataTable
          title="Economy leaders detail"
          columns={['Member', 'Username', 'Merit', 'Credits']}
          rows={economy.meritLeaders.map((m) => [m.name, `@${m.username}`, String(m.merit), m.credits.toLocaleString()])}
        />
        <DataTable
          title="Merit distribution by tier"
          columns={['Tier', 'Range', 'Members']}
          rows={economy.distribution.map((d) => [d.tier, d.range, String(d.count)])}
        />
      </div>
    </div>
  );
}

function HealthTab({
  data,
  filteredMembers,
}: {
  data: PlatformAnalytics;
  filteredMembers: PlatformAnalytics['memberDirectory'];
}) {
  const { operations, audience, kpis, comingSoon } = data;
  const ph = audience.profileHealth;
  const score = operations.platformHealthScore;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard className="flex flex-col items-center justify-center text-center">
          <p className="text-sm font-semibold text-white">Platform health score</p>
          <div className="relative mt-4 flex h-36 w-36 items-center justify-center">
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={score >= 70 ? '#34d399' : score >= 40 ? '#fbbf24' : '#f87171'}
                strokeWidth="8"
                strokeDasharray={`${(score / 100) * 264} 264`}
                strokeLinecap="round"
              />
            </svg>
            <span className="text-4xl font-bold text-white">{score}</span>
          </div>
          <p className="mt-2 text-xs text-zinc-500">Composite of members, profiles & community</p>
        </ChartCard>
        <ChartCard className="lg:col-span-2">
          <VerticalBarChart
            title="Moderation team capacity"
            data={operations.moderationTeam.map((r) => ({ label: r.role.split(' ')[0], value: r.count }))}
            color="#34d399"
          />
        </ChartCard>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Active moderators', operations.activeModerators],
          ['Pending verifications', operations.pendingVerifications],
          ['Suspended accounts', operations.suspendedAccounts],
          ['Non-active accounts', operations.nonActiveAccounts],
          ['Complete profiles', ph.completeProfiles],
          ['Avatar rate', `${ph.avatarRate}%`],
          ['Tagline rate', `${ph.taglineRate}%`],
          ['Filtered members', filteredMembers.length],
        ].map(([l, v]) => (
          <div key={String(l)} className="rounded-xl border border-white/[0.06] bg-[#14151c] px-4 py-3">
            <p className="text-[10px] uppercase text-zinc-600">{l}</p>
            <p className="text-xl font-bold text-white">{v}</p>
          </div>
        ))}
      </div>

      <ChartCard>
        <DonutChart
          title="Profile completion"
          segments={[
            { label: 'With avatar', value: ph.withAvatar, color: '#60a5fa' },
            { label: 'With tagline', value: ph.withTagline, color: '#a78bfa' },
            { label: 'Complete both', value: ph.completeProfiles, color: '#34d399' },
            {
              label: 'Incomplete',
              value: Math.max(0, audience.totalMembers - ph.completeProfiles),
              color: '#52525b',
            },
          ].filter((s) => s.value > 0)}
        />
      </ChartCard>

      <section className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
        <h2 className="font-semibold text-white">{comingSoon.title}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {comingSoon.modules.map((m) => (
            <div key={m.name} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <p className="font-medium text-white">{m.name}</p>
              <p className="mt-1 text-xs text-zinc-500">{m.metrics}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-zinc-600">
          {kpis.moderationTeamSize} staff accounts currently support platform operations.
        </p>
      </section>
    </div>
  );
}
