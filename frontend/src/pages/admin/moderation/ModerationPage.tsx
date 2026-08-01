import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
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
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Scale,
  ScrollText,
  Search,
  Settings2,
  Shield,
  ShieldAlert,
  Trash2,
  UserCog,
  UserPlus,
  Users,
  Video,
  X,
  Hand,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import api from '@/lib/axios';
import useGlobalState from '@/lib/global_state';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast.ts';
import TableFilterBar, { uniqueOptions } from '../userTeam/components/TableFilterBar';
import type {
  ModerationActivity,
  ModerationCase,
  ModeratorProfile,
  ModerationOverview,
} from './moderationTypes';
import type { Dispute, UserReport } from '../ticketManagement/ticketTypes';
import DisputesTab from './DisputesTab';
import ReportsTab from './ReportsTab';
import ListingApprovalsTab from './ListingApprovalsTab';
import IdentityVerificationTab from './IdentityVerificationTab';
import MyCasesTab from './MyCasesTab';

const CLOSED_DISPUTE_STATUSES = new Set(['closed']);

function disputeToModerationCase(d: Dispute): ModerationCase {
  return {
    id: String(d.id),
    source: 'dispute',
    type: 'Dispute',
    priority: d.priority || 'Medium',
    target: d.title || d.number,
    targetHandle: d.number,
    targetType: 'Dispute',
    reason: d.reason || d.title || 'Dispute case',
    description: d.reason,
    referenceNumber: d.number,
    assignedRole: d.assignee?.role || null,
    assignedStaffId: d.assignee?.staffId ?? null,
    assignedStaffName: d.assignee?.name || null,
    openedAt: d.openedAt,
    status: d.status,
    canAssignMyself: false,
    canEdit: true,
    canDelete: true,
  };
}

const STAFF_ROLE_OPTIONS = [
  { value: 'Support Moderator', label: 'Support Moderator' },
  { value: 'Marketplace Moderator', label: 'Marketplace Moderator' },
  { value: 'Forum Moderator', label: 'Forum Moderator' },
  { value: 'Jobs N Gigs Moderator', label: 'Jobs & Gigs Moderator' },
  { value: 'Admin', label: 'Administrator' },
] as const;

const STAFF_STATUS_OPTIONS = ['Active', 'Suspended', 'Locked', 'Banned', 'Inactive'] as const;

type TabId = 'overview' | 'activity' | 'cases' | 'management';
type CaseQueue = 'mine' | 'disputes' | 'reports' | 'listings' | 'identity';

const TABS: { id: TabId; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'activity', label: 'Activity log', icon: ScrollText },
  { id: 'cases', label: 'Pending cases', icon: Gavel },
  { id: 'management', label: 'Management', icon: Settings2 },
];

const CASE_QUEUES: CaseQueue[] = ['mine', 'disputes', 'reports', 'listings', 'identity'];

type ManagementSection = 'automated' | 'moderators' | 'video' | 'forum';

const MANAGEMENT_SECTIONS: {
  id: ManagementSection;
  label: string;
  icon: typeof Shield;
}[] = [
  { id: 'automated', label: 'Auto-mod', icon: Bot },
  { id: 'moderators', label: 'Moderators', icon: UserCog },
  { id: 'video', label: 'Video', icon: Video },
  { id: 'forum', label: 'Forum', icon: MessageSquare },
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
  const p = priority.toLowerCase();
  if (p === 'high') return 'bg-red-500/15 text-red-300 border-red-500/25';
  if (p === 'medium') return 'bg-amber-500/15 text-amber-200 border-amber-500/25';
  if (p === 'low') return 'bg-sky-500/15 text-sky-300 border-sky-500/25';
  return 'bg-zinc-500/15 text-zinc-300 border-white/10';
}

function statusClass(status: string) {
  const s = status.toLowerCase();
  if (s === 'completed' || s === 'resolved' || s === 'approved' || s === 'verified' || s === 'active') {
    return 'bg-emerald-500/15 text-emerald-300';
  }
  if (s === 'reversed' || s === 'dismissed' || s === 'rejected' || s === 'declined') {
    return 'bg-violet-500/15 text-violet-300';
  }
  if (s === 'pending' || s === 'open' || s === 'in progress' || s === 'in_progress') {
    return 'bg-amber-500/15 text-amber-200';
  }
  return 'bg-zinc-500/15 text-zinc-300';
}

export default function ModerationPage() {
  const { user } = useGlobalState();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const paramSection = searchParams.get('section') as ManagementSection | null;
  const paramQueue = searchParams.get('queue') as CaseQueue | null;
  const validTabs: TabId[] = ['overview', 'activity', 'cases', 'management'];
  const validSections = MANAGEMENT_SECTIONS.map((s) => s.id);
  // Legacy ?tab=disputes|reports → Pending cases sub-queues
  const legacyQueue =
    rawTab === 'disputes' || rawTab === 'reports' ? (rawTab as CaseQueue) : null;
  const initialTab: TabId =
    legacyQueue || (rawTab === 'cases' && paramQueue && CASE_QUEUES.includes(paramQueue))
      ? 'cases'
      : rawTab && validTabs.includes(rawTab as TabId)
        ? (rawTab as TabId)
        : 'overview';
  const initialSection =
    paramSection && validSections.includes(paramSection) ? paramSection : 'automated';
  const initialCaseQueue: CaseQueue =
    legacyQueue ||
    (paramQueue && CASE_QUEUES.includes(paramQueue) ? paramQueue : 'mine');

  const [data, setData] = useState<ModerationOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<TabId>(initialTab);
  const [caseQueue, setCaseQueue] = useState<CaseQueue>(initialCaseQueue);
  const [mgmtSection, setMgmtSection] = useState<ManagementSection>(initialSection);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ModerationActivity | null>(null);

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
    if (rawTab === 'disputes' || rawTab === 'reports') {
      setTab('cases');
      setCaseQueue(rawTab);
      setSearchParams({ tab: 'cases', queue: rawTab }, { replace: true });
      return;
    }
    if (rawTab && validTabs.includes(rawTab as TabId)) setTab(rawTab as TabId);
    else if (!rawTab) setTab('overview');
    if (paramQueue && CASE_QUEUES.includes(paramQueue)) setCaseQueue(paramQueue);
    if (paramSection && validSections.includes(paramSection)) setMgmtSection(paramSection);
  }, [rawTab, paramSection, paramQueue]);

  const switchTab = (id: TabId, section?: ManagementSection, queue?: CaseQueue) => {
    setTab(id);
    if (id === 'management') {
      const nextSection = section || mgmtSection;
      setMgmtSection(nextSection);
      setSearchParams({ tab: id, section: nextSection }, { replace: true });
      return;
    }
    if (id === 'cases') {
      const nextQueue = queue || caseQueue || 'mine';
      setCaseQueue(nextQueue);
      setSearchParams(
        nextQueue === 'mine' ? { tab: id } : { tab: id, queue: nextQueue },
        { replace: true }
      );
      return;
    }
    setSearchParams(id === 'overview' ? {} : { tab: id }, { replace: true });
  };

  const switchCaseQueue = (queue: CaseQueue) => {
    setCaseQueue(queue);
    setSearchParams(
      queue === 'mine' ? { tab: 'cases' } : { tab: 'cases', queue },
      { replace: true }
    );
  };

  const switchMgmtSection = (section: ManagementSection) => {
    setMgmtSection(section);
    setSearchParams({ tab: 'management', section }, { replace: true });
  };

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

  const { summary, alerts } = data;

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
              Scanned {data.dataSources.postgres.userCount} users · {data.dataSources.postgres.staffCount}{' '}
              staff
              {data.dataSources.mongo.connected
                ? ` · ${data.dataSources.mongo.forumGroups} forum groups`
                : ' · forum offline'}
              {' · '}@{user?.username || 'admin'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="flex items-center gap-2 self-start rounded-xl border border-white/[0.08] px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
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
              {id === 'cases' &&
                (summary.yourPendingCases > 0 ||
                  summary.disputeQueueCount > 0 ||
                  (summary.openReports ?? 0) > 0) && (
                <span className="rounded-full bg-amber-500/20 px-1.5 text-[10px] font-bold text-amber-200">
                  {summary.yourPendingCases +
                    summary.disputeQueueCount +
                    (summary.openReports ?? 0)}
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
            onViewActivity={setSelectedActivity}
            onGoTab={switchTab}
          />
        )}
        {tab === 'activity' && (
          <ActivityTab entries={data.recentActivity} onView={setSelectedActivity} />
        )}
        {tab === 'cases' && (
          <CasesTab
            cases={data.pendingCases}
            disputes={(data.disputes || []) as Dispute[]}
            reports={(data.reports || []) as UserReport[]}
            handlers={data.moderatorRoster}
            staffId={data.currentStaffId ?? user?.staffId ?? user?.staff_id ?? null}
            queue={caseQueue}
            onQueueChange={switchCaseQueue}
            onRefresh={() => void load(true)}
          />
        )}
        {tab === 'management' && (
          <ManagementTab
            data={data}
            section={mgmtSection}
            onSectionChange={switchMgmtSection}
            onSaved={() => void load(true)}
          />
        )}
      </div>

      {selectedActivity && (
        <ActivityDetailModal activity={selectedActivity} onClose={() => setSelectedActivity(null)} />
      )}
    </main>
  );
}

function OverviewTab({
  data,
  onViewActivity,
  onGoTab,
}: {
  data: ModerationOverview;
  onViewActivity: (a: ModerationActivity) => void;
  onGoTab: (t: TabId, section?: ManagementSection, queue?: CaseQueue) => void;
}) {
  const s = data.summary;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Your pending cases"
            value={s.yourPendingCases}
            sub={`${s.openReports ?? 0} open reports · ${s.disputeQueueCount} disputes`}
            icon={Gavel}
            onClick={() => onGoTab('cases')}
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
            ['Forum groups', s.forumGroupsActive, null as TabId | null, undefined as CaseQueue | undefined],
            ['Discussions', s.forumDiscussions, null, undefined],
            ['Disputes', s.disputeQueueCount, 'cases' as TabId, 'disputes' as CaseQueue],
            ['Reports', s.openReports ?? 0, 'cases' as TabId, 'reports' as CaseQueue],
          ].map(([label, val, go, queue]) => (
            <div
              key={String(label)}
              role={go ? 'button' : undefined}
              tabIndex={go ? 0 : undefined}
              onClick={go ? () => onGoTab(go as TabId, undefined, queue as CaseQueue | undefined) : undefined}
              onKeyDown={
                go
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        onGoTab(go as TabId, undefined, queue as CaseQueue | undefined);
                      }
                    }
                  : undefined
              }
              className={`rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 ${
                go ? 'cursor-pointer transition hover:border-rose-500/30 hover:bg-rose-500/5' : ''
              }`}
            >
              <p className="text-[10px] uppercase text-zinc-600">{label}</p>
              <p className="text-xl font-bold text-white">{val}</p>
            </div>
          ))}
        </div>

        <ActivityPreview
          entries={data.recentActivity.slice(0, 8)}
          onView={onViewActivity}
          onViewAll={() => onGoTab('activity')}
        />
        <CasesPreview
          cases={data.pendingCases}
          onViewAll={() => onGoTab('cases')}
        />
      </div>

      <div className="space-y-4">
        <SidePanel title="Top moderators by actions">
          <ul className="space-y-2">
            {[...data.moderatorRoster]
              .sort((a, b) => b.actionsHandled - a.actionsHandled)
              .slice(0, 5)
              .map((m) => (
                <li key={m.id} className="flex justify-between text-sm">
                  <span className="text-zinc-300">{m.name}</span>
                  <span className="tabular-nums text-zinc-500">{m.actionsHandled}</span>
                </li>
              ))}
            {data.moderatorRoster.length === 0 && (
              <li className="text-xs text-zinc-500">No moderators on roster.</li>
            )}
          </ul>
          <button
            type="button"
            onClick={() => onGoTab('management', 'moderators')}
            className="mt-3 text-xs text-rose-400 hover:underline"
          >
            Open management →
          </button>
        </SidePanel>

        <SidePanel title="Quick links">
          <ul className="space-y-1.5 text-sm">
            {MANAGEMENT_SECTIONS.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onGoTab('management', id)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
                >
                  <Icon className="h-3.5 w-3.5 text-rose-400/80" />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </SidePanel>

        <SidePanel title="Data sources">
          <ul className="space-y-1 text-xs text-zinc-500">
            <li>Postgres: {data.dataSources.postgres.tables.join(', ')}</li>
            <li>
              Mongo:{' '}
              {data.dataSources.mongo.connected
                ? data.dataSources.mongo.collections.join(', ')
                : 'not connected'}
            </li>
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
  onClick,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: typeof Shield;
  onClick?: () => void;
}) {
  const content = (
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
        <p className="mt-2 text-3xl font-bold text-white">{value}</p>
        <p className="mt-1 text-xs text-zinc-500">{sub}</p>
      </div>
      <Icon className="h-5 w-5 text-rose-400" />
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5 text-left transition hover:border-rose-400/30 hover:bg-white/[0.03]"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">{content}</div>
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

function ActivityPreview({
  entries,
  onView,
  onViewAll,
}: {
  entries: ModerationActivity[];
  onView: (a: ModerationActivity) => void;
  onViewAll: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14151c]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Recent activity</h2>
          <p className="text-xs text-zinc-500">Latest moderation actions across the platform</p>
        </div>
        <button type="button" onClick={onViewAll} className="text-xs text-rose-400 hover:underline">
          View all
        </button>
      </div>
      <ActivityTableBody entries={entries} onView={onView} />
    </section>
  );
}

function CasesPreview({
  cases,
  onViewAll,
}: {
  cases: ModerationCase[];
  onViewAll: () => void;
}) {
  const moderation = cases.filter((c) => c.source === 'report');
  const listings = cases.filter((c) => c.source === 'listing');
  const identity = cases.filter((c) => c.source === 'identity');
  const preview = (moderation.length ? moderation : identity.length ? identity : listings).slice(
    0,
    5
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14151c]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Pending cases</h2>
          <p className="text-xs text-zinc-500">
            Reports, disputes, listings, and identity — open from Pending cases
          </p>
        </div>
        <button type="button" onClick={onViewAll} className="text-xs text-rose-400 hover:underline">
          View all
        </button>
      </div>
      <CasesTableBody
        cases={preview}
        emptyLabel="No open reports, listing reviews, or identity checks."
      />
    </section>
  );
}

function ActivityTab({
  entries,
  onView,
}: {
  entries: ModerationActivity[];
  onView: (a: ModerationActivity) => void;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const statusOptions = useMemo(
    () => uniqueOptions(entries.map((e) => e.status)),
    [entries]
  );
  const categoryOptions = useMemo(
    () => uniqueOptions(entries.map((e) => e.category)),
    [entries]
  );
  const roleOptions = useMemo(
    () => uniqueOptions(entries.map((e) => e.executedByRole)),
    [entries]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = entries.filter((a) => {
      if (statusFilter !== 'all' && a.status.toLowerCase() !== statusFilter) return false;
      if (categoryFilter !== 'all' && a.category.toLowerCase() !== categoryFilter) return false;
      if (roleFilter !== 'all' && a.executedByRole.toLowerCase() !== roleFilter) return false;
      if (!q) return true;
      return (
        a.target.toLowerCase().includes(q) ||
        a.targetHandle.toLowerCase().includes(q) ||
        a.executedBy.toLowerCase().includes(q) ||
        a.executedByHandle.toLowerCase().includes(q) ||
        a.action.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.notes.toLowerCase().includes(q)
      );
    });

    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return (
            new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
          );
        case 'action':
          return a.action.localeCompare(b.action);
        case 'target':
          return a.target.localeCompare(b.target);
        case 'newest':
        default:
          return (
            new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
          );
      }
    });

    return list;
  }, [entries, search, statusFilter, categoryFilter, roleFilter, sortBy]);

  const q = search.trim();
  const hasFilters =
    q || statusFilter !== 'all' || categoryFilter !== 'all' || roleFilter !== 'all';

  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14151c]">
      <div className="flex flex-col gap-3 border-b border-white/[0.06] px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-[200px] flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action / target / moderator / notes…"
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500/15"
          />
        </div>
        <p className="text-xs text-zinc-500 sm:order-last sm:w-full lg:order-none lg:w-auto">
          {filtered.length} entr{filtered.length === 1 ? 'y' : 'ies'}
          {hasFilters ? ` matching filters (of ${entries.length})` : ''}
        </p>
        <div className="hidden flex-1 lg:block" />
        <TableFilterBar
          filters={[
            { id: 'status', label: 'Status', value: statusFilter, options: statusOptions },
            {
              id: 'category',
              label: 'Category',
              value: categoryFilter,
              options: categoryOptions,
            },
            { id: 'role', label: 'Executed by role', value: roleFilter, options: roleOptions },
          ]}
          sort={{
            value: sortBy,
            options: [
              { value: 'newest', label: 'Newest first' },
              { value: 'oldest', label: 'Oldest first' },
              { value: 'action', label: 'Action A–Z' },
              { value: 'target', label: 'Target A–Z' },
            ],
          }}
          onFilterChange={(id, value) => {
            if (id === 'status') setStatusFilter(value);
            if (id === 'category') setCategoryFilter(value);
            if (id === 'role') setRoleFilter(value);
          }}
          onSortChange={setSortBy}
          onClear={() => {
            setStatusFilter('all');
            setCategoryFilter('all');
            setRoleFilter('all');
            setSortBy('newest');
          }}
        />
      </div>
      <ActivityTableBody
        entries={filtered}
        onView={onView}
        emptyLabel="No activity matches your search or filters."
      />
    </section>
  );
}

function CasesTab({
  cases,
  disputes,
  reports,
  handlers = [],
  staffId,
  queue,
  onQueueChange,
  onRefresh,
}: {
  cases: ModerationCase[];
  disputes: Dispute[];
  reports: UserReport[];
  handlers?: ModerationOverview['moderatorRoster'];
  staffId?: string | number | null;
  queue: CaseQueue;
  onQueueChange: (q: CaseQueue) => void;
  onRefresh: () => void;
}) {
  const myStaffId = staffId != null && staffId !== '' ? String(staffId) : null;

  const myCases = useMemo(() => {
    if (!myStaffId) return [];
    const fromQueues = cases.filter(
      (c) =>
        c.assignedStaffId != null &&
        String(c.assignedStaffId).toLowerCase() === myStaffId.toLowerCase() &&
        (c.source === 'report' || c.source === 'listing' || c.source === 'identity')
    );
    const fromDisputes = disputes
      .filter(
        (d) =>
          d.assignee != null &&
          String(d.assignee.staffId).toLowerCase() === myStaffId.toLowerCase() &&
          !CLOSED_DISPUTE_STATUSES.has(String(d.status).toLowerCase())
      )
      .map(disputeToModerationCase);
    return [...fromQueues, ...fromDisputes].sort(
      (a, b) => new Date(b.openedAt || 0).getTime() - new Date(a.openedAt || 0).getTime()
    );
  }, [cases, disputes, myStaffId]);
  const listingCases = useMemo(
    () => cases.filter((c) => c.source === 'listing'),
    [cases]
  );
  const identityCases = useMemo(
    () => cases.filter((c) => c.source === 'identity'),
    [cases]
  );
  const openDisputeCount = useMemo(
    () =>
      disputes.filter(
        (d) =>
          !['closed'].includes(
            String(d.status).toLowerCase()
          )
      ).length,
    [disputes]
  );
  const openReportCount = useMemo(
    () =>
      reports.filter(
        (r) => !['resolved', 'closed', 'dismissed'].includes(String(r.status).toLowerCase())
      ).length,
    [reports]
  );

  const switchQueue = (next: CaseQueue) => {
    if (next === queue) return;
    onQueueChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="inline-flex max-w-full flex-wrap gap-1 rounded-2xl border border-white/[0.08] bg-[#14151c] p-1.5">
        {(
          [
            {
              id: 'mine' as const,
              label: 'My cases',
              count: myCases.length,
              icon: UserCog,
            },
            {
              id: 'disputes' as const,
              label: 'Disputes',
              count: openDisputeCount,
              icon: Scale,
            },
            {
              id: 'reports' as const,
              label: 'Reports',
              count: openReportCount,
              icon: FileWarning,
            },
            {
              id: 'listings' as const,
              label: 'Listing approvals',
              count: listingCases.length,
              icon: LayoutGrid,
            },
            {
              id: 'identity' as const,
              label: 'Identity verification',
              count: identityCases.length,
              icon: ShieldAlert,
            },
          ] as const
        ).map(({ id, label, count, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => switchQueue(id)}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
              queue === id
                ? 'bg-rose-500/15 text-white shadow-[inset_0_0_0_1px_rgba(244,63,94,0.35)]'
                : 'text-zinc-500 hover:text-zinc-200'
            }`}
          >
            <Icon className={`h-4 w-4 ${queue === id ? 'text-rose-400' : ''}`} />
            {label}
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] tabular-nums ${
                queue === id ? 'bg-rose-500/20 text-rose-200' : 'bg-white/[0.06] text-zinc-500'
              }`}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      {queue === 'mine' && (
        <MyCasesTab cases={myCases} currentStaffId={myStaffId} onUpdated={onRefresh} />
      )}
      {queue === 'disputes' && (
        <DisputesTab disputes={disputes} handlers={handlers} onUpdated={onRefresh} />
      )}
      {queue === 'reports' && <ReportsTab reports={reports} onUpdated={onRefresh} />}
      {queue === 'listings' && (
        <ListingApprovalsTab
          cases={listingCases}
          currentStaffId={myStaffId}
          onUpdated={onRefresh}
        />
      )}
      {queue === 'identity' && (
        <IdentityVerificationTab
          cases={identityCases}
          currentStaffId={myStaffId}
          onUpdated={onRefresh}
        />
      )}
    </div>
  );
}

function ActivityTableBody({
  entries,
  onView,
  emptyLabel = 'No activity found.',
}: {
  entries: ModerationActivity[];
  onView: (a: ModerationActivity) => void;
  emptyLabel?: string;
}) {
  return (
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
                <span className={`rounded-full px-2 py-0.5 text-xs ${statusClass(a.status)}`}>
                  {a.status}
                </span>
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
                {emptyLabel}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function CasesTableBody({
  cases,
  emptyLabel = 'No open cases from current database scan.',
  busyId,
  currentStaffId,
  onView,
  onDelete,
  onAssignMyself,
}: {
  cases: ModerationCase[];
  emptyLabel?: string;
  busyId?: string | null;
  currentStaffId?: string | null;
  onView?: (c: ModerationCase) => void;
  onDelete?: (c: ModerationCase) => void;
  onAssignMyself?: (c: ModerationCase) => void;
}) {
  const showActions = Boolean(onView || onDelete || onAssignMyself);
  const colSpan = showActions ? 7 : 6;
  const isMine = (c: ModerationCase) =>
    currentStaffId != null &&
    c.assignedStaffId != null &&
    String(c.assignedStaffId).toLowerCase() === String(currentStaffId).toLowerCase();

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/[0.06] bg-[#0f1016] text-[10px] uppercase tracking-wide text-zinc-500">
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Target</th>
            <th className="px-4 py-3">Priority</th>
            <th className="px-4 py-3">Reason</th>
            <th className="px-4 py-3">Assigned to</th>
            <th className="px-4 py-3">Opened</th>
            {showActions && <th className="px-4 py-3 text-center">Actions</th>}
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
              <td className="px-4 py-3 text-zinc-400">
                {c.assignedStaffName || c.assignedStaffId ? (
                  <>
                    <p className="font-medium text-zinc-200">
                      {c.assignedStaffName || `Staff #${c.assignedStaffId}`}
                    </p>
                    <p className="text-[10px] text-zinc-600">
                      {c.assignedRole || 'Staff'}
                    </p>
                  </>
                ) : (
                  <p className="text-zinc-600">Unassigned</p>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-zinc-500">{formatDateTime(c.openedAt)}</td>
              {showActions && (
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    {onView && (
                      <button
                        type="button"
                        title="View details"
                        onClick={() => onView(c)}
                        className="rounded-lg p-2 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    {onAssignMyself && c.canAssignMyself && !isMine(c) && (
                      <button
                        type="button"
                        title="Assign myself"
                        disabled={busyId === c.id}
                        onClick={() => onAssignMyself(c)}
                        className="rounded-lg p-2 text-zinc-400 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-40"
                      >
                        {busyId === c.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Hand className="h-4 w-4" />
                        )}
                      </button>
                    )}
                    {onDelete && c.canDelete && (
                      <button
                        type="button"
                        title="Delete case"
                        onClick={() => onDelete(c)}
                        className="rounded-lg p-2 text-zinc-400 hover:bg-red-500/10 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
          {cases.length === 0 && (
            <tr>
              <td colSpan={colSpan} className="px-4 py-10 text-center text-zinc-500">
                {emptyLabel}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ManagementTab({
  data,
  section,
  onSectionChange,
  onSaved,
}: {
  data: ModerationOverview;
  section: ManagementSection;
  onSectionChange: (section: ManagementSection) => void;
  onSaved?: () => void;
}) {
  const meta: Record<ManagementSection, { title: string; description: string }> = {
    automated: {
      title: 'Automated moderation settings',
      description: 'Rules that run without manual intervention. Saved to platform settings.',
    },
    moderators: {
      title: 'Moderator management',
      description: 'Staff roster, roles, and performance across the moderation team.',
    },
    video: {
      title: 'Video platform management',
      description: 'Content moderation for video uploads and the editor pipeline.',
    },
    forum: {
      title: 'Forum content management',
      description: 'Groups and discussions flagged or pending review from MongoDB.',
    },
  };

  return (
    <div className="space-y-6">
      <div className="inline-flex max-w-full flex-wrap gap-1 rounded-2xl border border-white/[0.08] bg-[#14151c] p-1.5">
        {MANAGEMENT_SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSectionChange(id)}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
              section === id
                ? 'bg-rose-500/15 text-white shadow-[inset_0_0_0_1px_rgba(244,63,94,0.35)]'
                : 'text-zinc-500 hover:text-zinc-200'
            }`}
          >
            <Icon className={`h-4 w-4 ${section === id ? 'text-rose-400' : ''}`} />
            {label}
          </button>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-bold text-white">{meta[section].title}</h2>
        <p className="mt-1 text-sm text-zinc-500">{meta[section].description}</p>
      </div>

      {section === 'automated' && (
        <AutomatedSettingsSection settings={data.automatedSettings} onSaved={onSaved} />
      )}
      {section === 'moderators' && (
        <ModeratorsSection
          roster={data.moderatorRoster}
          breakdown={data.accountStatusBreakdown}
          onChanged={onSaved}
        />
      )}
      {section === 'video' && <VideoSection />}
      {section === 'forum' && (
        <ForumSection
          connected={data.dataSources.mongo.connected}
          groups={data.forumReviewQueue}
          discussions={data.contentSnapshots}
        />
      )}
    </div>
  );
}

function AutomatedSettingsSection({
  settings,
  onSaved,
}: {
  settings: ModerationOverview['automatedSettings'];
  onSaved?: () => void;
}) {
  const [local, setLocal] = useState(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => setLocal(settings), [settings]);

  const toggles: {
    key: keyof Omit<ModerationOverview['automatedSettings'], 'maxWarningsBeforeSuspend'>;
    label: string;
    hint: string;
  }[] = [
    { key: 'spamFilterEnabled', label: 'Spam filter', hint: 'Block repetitive and bulk spam patterns' },
    { key: 'autoFlagProfanity', label: 'Auto-flag profanity', hint: 'Flag posts containing blocked language' },
    {
      key: 'autoHoldNewAccounts',
      label: 'Hold new accounts for review',
      hint: 'Delay full access until a quick check',
    },
    { key: 'forumLinkScanning', label: 'Forum link scanning', hint: 'Scan outbound links in discussions' },
    {
      key: 'marketplaceListingReview',
      label: 'Marketplace listing review',
      hint: 'Queue new listings for staff review',
    },
    { key: 'disputeAutoAssign', label: 'Auto-assign disputes', hint: 'Round-robin assign open disputes' },
  ];

  const dirty =
    JSON.stringify(local) !== JSON.stringify(settings);

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.patch('/api/admin/settings', {
        section: 'moderation',
        values: local,
      });
      if (!res.data?.success) throw new Error(res.data?.message || 'Save failed');
      showSuccessToast('Moderation settings saved');
      onSaved?.();
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <section className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
        <div className="mb-4 flex items-center gap-2">
          <Gavel className="h-5 w-5 text-rose-400" />
          <h3 className="font-semibold text-white">Rule toggles</h3>
        </div>
        <ul className="space-y-2">
          {toggles.map(({ key, label, hint }) => (
            <li
              key={key}
              className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm text-zinc-200">{label}</p>
                <p className="text-xs text-zinc-600">{hint}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={local[key]}
                onClick={() => setLocal((s) => ({ ...s, [key]: !s[key] }))}
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                  local[key] ? 'bg-rose-500' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition ${
                    local[key] ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </li>
          ))}
        </ul>

        <label className="mt-5 block text-xs text-zinc-500">
          Max warnings before suspend
          <input
            type="number"
            min={1}
            max={20}
            value={local.maxWarningsBeforeSuspend}
            onChange={(e) =>
              setLocal((s) => ({
                ...s,
                maxWarningsBeforeSuspend: Math.max(1, Number(e.target.value) || 1),
              }))
            }
            className="mt-1 w-28 rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500/20"
          />
        </label>

        <div className="mt-5 flex justify-end gap-2 border-t border-white/[0.06] pt-4">
          <button
            type="button"
            disabled={!dirty || saving}
            onClick={() => setLocal(settings)}
            className="rounded-xl border border-white/[0.1] px-4 py-2 text-sm text-zinc-300 disabled:opacity-40"
          >
            Reset
          </button>
          <button
            type="button"
            disabled={!dirty || saving}
            onClick={() => void save()}
            className="rounded-xl bg-rose-500/90 px-5 py-2 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </section>

      <SidePanel title="Persistence">
        <p className="text-xs leading-relaxed text-zinc-500">
          These values are stored in the{' '}
          <code className="text-zinc-400">platform_settings</code> row with key{' '}
          <code className="text-zinc-400">moderation</code>. Changes apply to future automated
          actions immediately.
        </p>
      </SidePanel>
    </div>
  );
}

function ModeratorsSection({
  roster,
  breakdown,
  onChanged,
}: {
  roster: ModerationOverview['moderatorRoster'];
  breakdown: ModerationOverview['accountStatusBreakdown'];
  onChanged?: () => void;
}) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dutyFilter, setDutyFilter] = useState('all');
  const [sortBy, setSortBy] = useState('performance');
  const [modal, setModal] = useState<'add' | 'edit' | 'delete' | null>(null);
  const [selected, setSelected] = useState<ModeratorProfile | null>(null);
  const [busyId, setBusyId] = useState<string | number | null>(null);

  const roleOptions = useMemo(() => uniqueOptions(roster.map((m) => m.role)), [roster]);
  const statusOptions = useMemo(
    () => uniqueOptions(roster.map((m) => m.status)),
    [roster]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = roster.filter((m) => {
      if (roleFilter !== 'all' && m.role.toLowerCase() !== roleFilter) return false;
      if (statusFilter !== 'all' && m.status.toLowerCase() !== statusFilter) return false;
      if (dutyFilter === 'on' && !m.active) return false;
      if (dutyFilter === 'off' && m.active) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.handle.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q)
      );
    });

    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'actions':
          return b.actionsHandled - a.actionsHandled;
        case 'performance':
        default:
          return b.performanceScore - a.performanceScore;
      }
    });

    return list;
  }, [roster, search, roleFilter, statusFilter, dutyFilter, sortBy]);

  const q = search.trim();
  const hasFilters =
    q || roleFilter !== 'all' || statusFilter !== 'all' || dutyFilter !== 'all';

  const toggleStatus = async (mod: ModeratorProfile) => {
    setBusyId(mod.id);
    try {
      const nextStatus = mod.active ? 'Suspended' : 'Active';
      const res = await api.patch(`/api/admin/staff/${mod.id}`, { status: nextStatus });
      if (!res.data?.success) throw new Error(res.data?.message || 'Status update failed');
      showSuccessToast(
        nextStatus === 'Active' ? `${mod.name} reactivated` : `${mod.name} suspended`
      );
      onChanged?.();
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!selected) return;
    setBusyId(selected.id);
    try {
      const res = await api.delete(`/api/admin/staff/${selected.id}`);
      if (!res.data?.success) throw new Error(res.data?.message || 'Delete failed');
      showSuccessToast(`${selected.name} deleted`);
      setModal(null);
      setSelected(null);
      onChanged?.();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to delete moderator');
      showErrorToast(message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-500">
          Create, edit, suspend, or remove moderator and admin staff accounts.
        </p>
        <button
          type="button"
          onClick={() => {
            setSelected(null);
            setModal('add');
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500"
        >
          <UserPlus className="h-4 w-4" />
          Add moderator
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14151c] lg:col-span-2">
          <div className="flex flex-col gap-3 border-b border-white/[0.06] px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative min-w-[200px] flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name / handle / email / role…"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500/15"
              />
            </div>
            <p className="text-xs text-zinc-500 sm:order-last sm:w-full lg:order-none lg:w-auto">
              {filtered.length} staff
              {hasFilters ? ` matching filters (of ${roster.length})` : ''}
            </p>
            <div className="hidden flex-1 lg:block" />
            <TableFilterBar
              filters={[
                { id: 'role', label: 'Role', value: roleFilter, options: roleOptions },
                { id: 'status', label: 'Status', value: statusFilter, options: statusOptions },
                {
                  id: 'duty',
                  label: 'On duty',
                  value: dutyFilter,
                  options: [
                    { value: 'on', label: 'On duty' },
                    { value: 'off', label: 'Off duty' },
                  ],
                },
              ]}
              sort={{
                value: sortBy,
                options: [
                  { value: 'performance', label: 'Highest performance' },
                  { value: 'actions', label: 'Most actions' },
                  { value: 'name', label: 'Name A–Z' },
                ],
              }}
              onFilterChange={(id, value) => {
                if (id === 'role') setRoleFilter(value);
                if (id === 'status') setStatusFilter(value);
                if (id === 'duty') setDutyFilter(value);
              }}
              onSortChange={setSortBy}
              onClear={() => {
                setRoleFilter('all');
                setStatusFilter('all');
                setDutyFilter('all');
                setSortBy('performance');
              }}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-[#0f1016] text-[10px] uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3">Moderator</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                  <th className="px-4 py-3 text-right">Performance</th>
                  <th className="px-4 py-3 text-right">Manage</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={String(m.id)} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{m.name}</p>
                      <p className="text-[10px] text-zinc-600">
                        @{m.handle} · {m.email}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-[10px] text-rose-200">
                        {m.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          m.active
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-amber-500/15 text-amber-200'
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-300">
                      {m.actionsHandled}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-white">
                      {m.performanceScore}%
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ModeratorRowMenu
                        busy={busyId === m.id}
                        active={m.active}
                        onEdit={() => {
                          setSelected(m);
                          setModal('edit');
                        }}
                        onToggleStatus={() => void toggleStatus(m)}
                        onDelete={() => {
                          setSelected(m);
                          setModal('delete');
                        }}
                      />
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-zinc-500">
                      No staff match your search or filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

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

      {(modal === 'add' || modal === 'edit') && (
        <StaffFormModal
          mode={modal}
          staff={selected}
          onClose={() => {
            setModal(null);
            setSelected(null);
          }}
          onSaved={() => {
            setModal(null);
            setSelected(null);
            onChanged?.();
          }}
        />
      )}

      {modal === 'delete' && selected && (
        <ConfirmDeleteModal
          name={selected.name}
          busy={busyId === selected.id}
          onClose={() => {
            setModal(null);
            setSelected(null);
          }}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </div>
  );
}

function ModeratorRowMenu({
  busy,
  active,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  busy?: boolean;
  active: boolean;
  onEdit: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setCoords(null);
      return;
    }
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 180;
    let left = rect.right - menuWidth;
    left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));
    setCoords({ top: rect.bottom + 4, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const menu = open
    ? createPortal(
        <div
          ref={menuRef}
          style={coords ? { top: coords.top, left: coords.left } : { top: -9999, left: -9999 }}
          className="fixed z-[200] min-w-[180px] overflow-hidden rounded-xl border border-white/[0.1] bg-[#1a1b24] py-1 shadow-2xl"
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/[0.06]"
          >
            <Pencil className="h-3.5 w-3.5 text-zinc-500" />
            Edit profile
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setOpen(false);
              onToggleStatus();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/[0.06] disabled:opacity-50"
          >
            <Shield className="h-3.5 w-3.5 text-zinc-500" />
            {active ? 'Suspend account' : 'Reactivate account'}
          </button>
          <div className="my-1 border-t border-white/[0.08]" />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-300 hover:bg-white/[0.06]"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>,
        document.body
      )
    : null;

  return (
    <div className="inline-flex justify-end">
      <button
        ref={buttonRef}
        type="button"
        disabled={busy}
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg p-2 text-zinc-400 hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
        title="Manage"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
      </button>
      {menu}
    </div>
  );
}

function StaffFormModal({
  mode,
  staff,
  onClose,
  onSaved,
}: {
  mode: 'add' | 'edit';
  staff: ModeratorProfile | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [firstName, setFirstName] = useState(staff?.firstName || staff?.name?.split(' ')[0] || '');
  const [lastName, setLastName] = useState(
    staff?.lastName || staff?.name?.split(' ').slice(1).join(' ') || ''
  );
  const [username, setUsername] = useState(staff?.handle || '');
  const [email, setEmail] = useState(staff?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState(staff?.role || STAFF_ROLE_OPTIONS[0].value);
  const [status, setStatus] = useState(staff?.status || 'Active');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const inputClass =
    'mt-1.5 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:ring-2 focus:ring-rose-500/20';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!firstName.trim() || !lastName.trim()) {
      setFormError('First and last name are required.');
      return;
    }
    if (mode === 'add') {
      if (!username.trim()) {
        setFormError('Username is required.');
        return;
      }
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username.trim())) {
        setFormError('Username must be 3–20 characters (letters, numbers, underscores).');
        return;
      }
      if (password.length < 8) {
        setFormError('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setFormError('Passwords do not match.');
        return;
      }
    } else if (password) {
      if (password.length < 8) {
        setFormError('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setFormError('Passwords do not match.');
        return;
      }
    }
    if (!email.trim()) {
      setFormError('Email is required.');
      return;
    }

    setSaving(true);
    try {
      if (mode === 'add') {
        const res = await api.post('/api/admin/staff', {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          username: username.trim(),
          email: email.trim(),
          password,
          role,
        });
        if (!res.data?.success) throw new Error(res.data?.message || 'Failed to create moderator');
        showSuccessToast(res.data.message || 'Moderator created');
      } else if (staff) {
        const res = await api.patch(`/api/admin/staff/${staff.id}`, {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          role,
          status,
          ...(password ? { password } : {}),
        });
        if (!res.data?.success) throw new Error(res.data?.message || 'Failed to update moderator');
        showSuccessToast(res.data.message || 'Moderator updated');
      }
      onSaved();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Request failed');
      setFormError(message);
      showErrorToast(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 md:pl-[260px]">
      <button type="button" className="absolute inset-0 bg-black/70" onClick={onClose} aria-label="Close" />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl border border-white/[0.1] bg-[#12131a] shadow-2xl">
        <div className="flex items-start justify-between border-b border-white/[0.08] px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-white">
              {mode === 'add' ? 'Add moderator' : `Edit ${staff?.name}`}
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              {mode === 'add'
                ? 'Create a staff account and assign a moderation role.'
                : 'Update profile, role, status, or reset password.'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-zinc-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="max-h-[calc(90vh-160px)] space-y-4 overflow-y-auto px-6 py-5">
            {formError && (
              <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {formError}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs text-zinc-500">
                First name
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={inputClass}
                  required
                />
              </label>
              <label className="block text-xs text-zinc-500">
                Last name
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={inputClass}
                  required
                />
              </label>
            </div>
            {mode === 'add' && (
              <label className="block text-xs text-zinc-500">
                Username
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={inputClass}
                  required
                />
              </label>
            )}
            {mode === 'edit' && (
              <p className="text-xs text-zinc-500">
                Username: <span className="text-zinc-300">@{staff?.handle}</span> (cannot be changed)
              </p>
            )}
            <label className="block text-xs text-zinc-500">
              Work email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                required
              />
            </label>
            <label className="block text-xs text-zinc-500">
              Role
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className={inputClass}
              >
                {STAFF_ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            {mode === 'edit' && (
              <label className="block text-xs text-zinc-500">
                Account status
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={inputClass}
                >
                  {STAFF_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs text-zinc-500">
                {mode === 'add' ? 'Password' : 'New password (optional)'}
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  autoComplete="new-password"
                  required={mode === 'add'}
                />
              </label>
              <label className="block text-xs text-zinc-500">
                Confirm password
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                  autoComplete="new-password"
                  required={mode === 'add' || Boolean(password)}
                />
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-white/[0.08] px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/[0.1] px-4 py-2 text-sm text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-rose-500/90 px-5 py-2 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-50"
            >
              {saving ? 'Saving…' : mode === 'add' ? 'Create moderator' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({
  name,
  busy,
  onClose,
  onConfirm,
}: {
  name: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 md:pl-[260px]">
      <button type="button" className="absolute inset-0 bg-black/70" onClick={onClose} aria-label="Close" />
      <div className="relative w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#12131a] p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-white">Delete {name}?</h2>
        <p className="mt-2 text-sm text-zinc-400">
          This soft-deletes the staff account and bans access. Historical moderation records are kept.
          You cannot delete your own account.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/[0.1] px-4 py-2 text-sm text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="rounded-xl bg-red-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
          >
            {busy ? 'Deleting…' : 'Delete staff'}
          </button>
        </div>
      </div>
    </div>
  );
}

function VideoSection() {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-8">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10">
          <Video className="h-7 w-7 text-rose-400" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-white">Video pipeline not connected</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          The video editor runs as a separate app. When the asset upload pipeline is wired to this
          admin surface, flagged clips, takedown requests, and age-restricted content will be
          managed from this panel.
        </p>
        <ul className="mt-6 space-y-2 text-left text-sm text-zinc-400">
          {[
            'Review flagged video uploads',
            'Issue takedowns and age restrictions',
            'Audit editor publish events',
          ].map((item) => (
            <li
              key={item}
              className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ForumSection({
  connected,
  groups,
  discussions,
}: {
  connected: boolean;
  groups: ModerationOverview['forumReviewQueue'];
  discussions: ModerationOverview['contentSnapshots'];
}) {
  const [search, setSearch] = useState('');
  const [contentFilter, setContentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const statusOptions = useMemo(
    () => uniqueOptions(groups.map((g) => g.status)),
    [groups]
  );

  const filteredGroups = useMemo(() => {
    if (contentFilter === 'discussions') return [];
    const q = search.trim().toLowerCase();
    let list = groups.filter((g) => {
      if (statusFilter !== 'all' && g.status.toLowerCase() !== statusFilter) return false;
      if (!q) return true;
      return (
        g.name.toLowerCase().includes(q) ||
        (g.description || '').toLowerCase().includes(q) ||
        g.tags.some((t) => t.toLowerCase().includes(q)) ||
        g.status.toLowerCase().includes(q)
      );
    });
    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'members':
          return b.memberCount - a.memberCount;
        case 'oldest':
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        case 'newest':
        default:
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
    });
    return list;
  }, [groups, search, statusFilter, contentFilter, sortBy]);

  const filteredDiscussions = useMemo(() => {
    if (contentFilter === 'groups') return [];
    const q = search.trim().toLowerCase();
    let list = discussions.filter((d) => {
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        String(d.userId ?? '').includes(q) ||
        String(d.groupId ?? '').toLowerCase().includes(q)
      );
    });
    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.title.localeCompare(b.title);
        case 'members':
          return b.commentCount - a.commentCount;
        case 'oldest':
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        case 'newest':
        default:
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
    });
    return list;
  }, [discussions, search, contentFilter, sortBy]);

  if (!connected) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8 text-center">
        <MessageSquare className="mx-auto h-10 w-10 text-amber-400" />
        <p className="mt-4 text-white">Forum content unavailable</p>
        <p className="mt-2 text-sm text-zinc-500">
          Set MONGODB_URI in backend/.env to scan forum_groups and forum_discussions.
        </p>
      </div>
    );
  }

  const q = search.trim();
  const hasFilters = q || contentFilter !== 'all' || statusFilter !== 'all';
  const totalVisible = filteredGroups.length + filteredDiscussions.length;
  const totalAll = groups.length + discussions.length;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14151c]">
        <div className="flex flex-col gap-3 border-b border-white/[0.06] px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative min-w-[200px] flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search groups / discussions / tags…"
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500/15"
            />
          </div>
          <p className="text-xs text-zinc-500 sm:order-last sm:w-full lg:order-none lg:w-auto">
            {totalVisible} item{totalVisible === 1 ? '' : 's'}
            {hasFilters ? ` matching filters (of ${totalAll})` : ''}
          </p>
          <div className="hidden flex-1 lg:block" />
          <TableFilterBar
            filters={[
              {
                id: 'content',
                label: 'Content',
                value: contentFilter,
                options: [
                  { value: 'groups', label: 'Groups only' },
                  { value: 'discussions', label: 'Discussions only' },
                ],
              },
              {
                id: 'status',
                label: 'Group status',
                value: statusFilter,
                options: statusOptions,
              },
            ]}
            sort={{
              value: sortBy,
              options: [
                { value: 'newest', label: 'Newest first' },
                { value: 'oldest', label: 'Oldest first' },
                { value: 'name', label: 'Name A–Z' },
                { value: 'members', label: 'Most members / comments' },
              ],
            }}
            onFilterChange={(id, value) => {
              if (id === 'content') setContentFilter(value);
              if (id === 'status') setStatusFilter(value);
            }}
            onSortChange={setSortBy}
            onClear={() => {
              setContentFilter('all');
              setStatusFilter('all');
              setSortBy('newest');
            }}
          />
        </div>
      </section>

      {(contentFilter === 'all' || contentFilter === 'groups') && (
        <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14151c]">
          <div className="border-b border-white/[0.06] px-4 py-3">
            <h3 className="text-sm font-semibold text-white">Forum groups</h3>
            <p className="text-xs text-zinc-500">
              {filteredGroups.length} of {groups.length} groups
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-[#0f1016] text-[10px] uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Members</th>
                  <th className="px-4 py-3">Tags</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroups.map((g) => (
                  <tr key={g.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{g.name}</p>
                      {g.description && (
                        <p className="max-w-xs truncate text-[10px] text-zinc-600">
                          {g.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{g.status}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-300">
                      {g.memberCount}
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-3 text-xs text-zinc-500">
                      {g.tags.length ? g.tags.join(', ') : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {formatDateTime(g.createdAt)}
                    </td>
                  </tr>
                ))}
                {filteredGroups.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-zinc-500">
                      No groups match your search or filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {(contentFilter === 'all' || contentFilter === 'discussions') && (
        <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14151c]">
          <div className="border-b border-white/[0.06] px-4 py-3">
            <h3 className="text-sm font-semibold text-white">Discussions to review</h3>
            <p className="text-xs text-zinc-500">
              {filteredDiscussions.length} of {discussions.length} discussions
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-[#0f1016] text-[10px] uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3 text-right">Comments</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Group</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredDiscussions.map((d) => (
                  <tr key={d.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-white">{d.title}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-300">
                      {d.commentCount}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{d.userId ?? '—'}</td>
                    <td className="max-w-[140px] truncate px-4 py-3 text-xs text-zinc-500">
                      {d.groupId ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {formatDateTime(d.createdAt)}
                    </td>
                  </tr>
                ))}
                {filteredDiscussions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-zinc-500">
                      No discussions match your search or filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
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
