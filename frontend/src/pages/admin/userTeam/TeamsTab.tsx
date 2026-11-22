import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { peekStaffGet, staffGet } from '@/lib/staffCache';
import { useStaffLive } from '@/lib/staffLive';
import StatCards from './components/StatCards';
import RowActionsMenu from './components/RowActionsMenu';
import TableFilterBar, { uniqueOptions } from './components/TableFilterBar';
import BulkActionsMenu, {
  type BulkActionId,
  type BulkActionItem,
} from './components/BulkActionsMenu';
import {
  BulkConfirmModal,
  ConfirmStatusModal,
  CreditActivityModal,
  TeamOverviewModal,
  TeamRecordModal,
  teamMeritPercent,
  TransferTeamOwnershipModal,
  VerificationModal,
  WarnAccountModal,
} from './components/AccountModals';
import {
  handleAccountActionError,
  runBulkAccountAction,
  setAccountStatus,
} from './accountActions';
import { buildTeamRowActionItems, exportAccountJson } from './statusActions';
import { formatDateTime } from './formatDateTime';
import type { PlatformTeam, TeamManagementData } from './userTeamTypes';
import {
  getUserTeamCapabilities,
  type UserTeamCapabilities,
} from './userTeamCapabilities';

const TEAMS_URL = '/api/admin/teams-management';

const ALL_BULK_ITEMS: BulkActionItem[] = [
  { id: 'restore', label: 'Restore to Active', section: 'Status' },
  { id: 'suspend', label: 'Suspend teams', danger: true, section: 'Status' },
  { id: 'lock', label: 'Lock teams', section: 'Status' },
  { id: 'ban', label: 'Ban teams', danger: true, section: 'Status' },
  { id: 'approve', label: 'Approve verification', section: 'Verification' },
  { id: 'reject', label: 'Reject verification', danger: true, section: 'Verification' },
  { id: 'clear', label: 'Clear selection', section: 'Other' },
];

type StatusAction =
  | 'ban'
  | 'suspend'
  | 'restore'
  | 'lock'
  | 'unban'
  | 'unsuspend'
  | 'unlock'
  | 'timeout'
  | 'clear_timeout';

const STATUS_ACTIONS: StatusAction[] = [
  'ban',
  'suspend',
  'restore',
  'lock',
  'unban',
  'unsuspend',
  'unlock',
  'timeout',
  'clear_timeout',
];

type ModalKind = 'overview' | 'credit' | 'verification' | 'history' | 'warn' | 'transfer' | StatusAction | null;

type BulkPending = {
  kind: 'status' | 'verification';
  action: string;
  label: string;
  result: string;
  tone: string;
};

const BULK_META: Record<Exclude<BulkActionId, 'clear'>, BulkPending> = {
  ban: {
    kind: 'status',
    action: 'ban',
    label: 'Ban selected teams',
    result: 'Banned',
    tone: 'bg-rose-500/90 hover:bg-rose-500',
  },
  suspend: {
    kind: 'status',
    action: 'suspend',
    label: 'Suspend selected teams',
    result: 'Suspended',
    tone: 'bg-amber-500/90 hover:bg-amber-500',
  },
  restore: {
    kind: 'status',
    action: 'restore',
    label: 'Restore selected teams',
    result: 'Active',
    tone: 'bg-emerald-500/90 hover:bg-emerald-500',
  },
  lock: {
    kind: 'status',
    action: 'lock',
    label: 'Lock selected teams',
    result: 'Locked',
    tone: 'bg-zinc-200 text-zinc-900 hover:bg-white',
  },
  approve: {
    kind: 'verification',
    action: 'approve',
    label: 'Approve verification',
    result: 'Verified',
    tone: 'bg-emerald-500/90 hover:bg-emerald-500',
  },
  reject: {
    kind: 'verification',
    action: 'reject',
    label: 'Reject verification',
    result: 'Unverified',
    tone: 'bg-rose-500/90 hover:bg-rose-500',
  },
};

const ATTENTION_FILTERS = [
  { value: 'needs', label: 'Needs attention' },
  { value: 'leader', label: 'Leader restricted' },
  { value: 'no_leader', label: 'No active leader' },
  { value: 'held', label: 'Credits held' },
  { value: 'disputes', label: 'Members with open disputes' },
  { value: 'low_merit', label: 'Members at low merit' },
];

function statusChipTone(status: string | null | undefined) {
  const s = String(status || '').toLowerCase();
  if (s === 'banned' || s === 'locked') return 'border-rose-500/30 bg-rose-500/10 text-rose-200';
  if (s === 'suspended') return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  if (s === 'active') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  return 'border-white/10 text-zinc-300';
}

function attentionChipTone(tone: string) {
  if (tone === 'danger') return 'border-rose-500/30 bg-rose-500/10 text-rose-200';
  if (tone === 'warning') return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  return 'border-sky-500/30 bg-sky-500/10 text-sky-200';
}

function teamPenaltyEnd(team: PlatformTeam) {
  const s = team.status.toLowerCase();
  const end =
    s === 'suspended'
      ? team.standing?.suspensionEndsAt
      : s === 'banned'
        ? team.standing?.banEndsAt
        : s === 'locked'
          ? team.standing?.lockEndsAt
          : null;
  if (s === 'active') return null;
  return end ? `until ${formatDateTime(end)}` : s === 'banned' ? 'permanent' : 'until lifted';
}

function matchesAttention(team: PlatformTeam, filter: string) {
  const flags = team.attention || [];
  switch (filter) {
    case 'needs':
      return flags.some((flag) => flag.tone === 'danger' || flag.tone === 'warning');
    case 'leader':
      return flags.some((flag) => flag.id === 'leader_restricted' || flag.id === 'leader_suspended');
    case 'no_leader':
      return flags.some((flag) => flag.id === 'no_leader');
    case 'held':
      return (team.wallet?.held || 0) > 0;
    case 'disputes':
      return (team.history?.openDisputes || 0) > 0;
    case 'low_merit':
      return (team.memberMerit?.below60 || 0) > 0;
    default:
      return true;
  }
}

type TeamsTabProps = {
  onStatsLoaded?: (pendingVerification: number) => void;
  refreshToken?: number;
  /** Pre-select verification filter (value is lowercased option key, e.g. "pending review"). */
  defaultVerificationFilter?: string;
  capabilities?: UserTeamCapabilities;
};

export default function TeamsTab({
  onStatsLoaded,
  refreshToken = 0,
  defaultVerificationFilter = 'all',
  capabilities: capabilitiesProp,
}: TeamsTabProps) {
  const capabilities = capabilitiesProp ?? getUserTeamCapabilities('admin');
  const bulkItems = useMemo(
    () => ALL_BULK_ITEMS.filter((item) => capabilities.bulkActions.has(item.id)),
    [capabilities]
  );
  const [data, setData] = useState<TeamManagementData | null>(() => {
    const cached = peekStaffGet(TEAMS_URL);
    return cached?.data?.success ? cached.data.data : null;
  });
  const [loading, setLoading] = useState(() => !data);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<ModalKind>(null);
  const [selected, setSelected] = useState<PlatformTeam | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState(defaultVerificationFilter);
  const [attentionFilter, setAttentionFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPending, setBulkPending] = useState<BulkPending | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = async () => {
    if (!data) setLoading(true);
    setError('');
    try {
      const res = await staffGet(TEAMS_URL);
      if (res.data?.success) {
        setData(res.data.data);
        onStatsLoaded?.(res.data.data.stats.totalPendingVerification);
      } else setError('Failed to load teams');
    } catch {
      setError('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [refreshToken]);

  const q = search.trim().toLowerCase();
  const filtersActive =
    Boolean(q) || statusFilter !== 'all' || verificationFilter !== 'all' || attentionFilter !== 'all';
  const teams = useMemo(() => {
    if (!data) return [];
    let result = data.teams;

    if (q) {
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          String(t.handle || '').toLowerCase().includes(q) ||
          t.leaderName.toLowerCase().includes(q) ||
          String(t.leader?.username || '').toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          String(t.accountId).toLowerCase().includes(q) ||
          t.email.toLowerCase().includes(q) ||
          (t.members || []).some(
            (m) => m.name.toLowerCase().includes(q) || String(m.username || '').toLowerCase().includes(q)
          )
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter((t) => t.status.toLowerCase() === statusFilter);
    }
    if (verificationFilter !== 'all') {
      result = result.filter((t) => t.verificationStatus.toLowerCase() === verificationFilter);
    }
    if (attentionFilter !== 'all') {
      result = result.filter((t) => matchesAttention(t, attentionFilter));
    }

    const time = (value: string | null) => (value ? new Date(value).getTime() : 0);
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return time(a.createdAt) - time(b.createdAt);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'members':
          return b.memberCount - a.memberCount;
        case 'merit':
          return (teamMeritPercent(a.memberMerit) ?? 101) - (teamMeritPercent(b.memberMerit) ?? 101);
        case 'wallet':
          return (b.wallet?.available ?? b.walletBalance) - (a.wallet?.available ?? a.walletBalance);
        case 'attention':
          return (b.attention?.length || 0) - (a.attention?.length || 0);
        case 'lastSeen':
          return time(b.lastSeenAt) - time(a.lastSeenAt);
        case 'newest':
        default:
          return time(b.createdAt) - time(a.createdAt);
      }
    });
  }, [data, q, statusFilter, verificationFilter, attentionFilter, sortBy]);

  const statusOptions = useMemo(
    () => uniqueOptions((data?.teams ?? []).map((t) => t.status)),
    [data]
  );
  const verificationOptions = useMemo(
    () => uniqueOptions((data?.teams ?? []).map((t) => t.verificationStatus)),
    [data]
  );

  const visibleIds = useMemo(() => teams.map((t) => String(t.accountId)), [teams]);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id));

  useEffect(() => {
    setSelectedIds((prev) => {
      if (!data) return prev;
      const valid = new Set(data.teams.map((t) => String(t.accountId)));
      const next = new Set([...prev].filter((id) => valid.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [data]);

  const toggleOne = (accountId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) next.delete(accountId);
      else next.add(accountId);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const id of visibleIds) next.add(id);
      }
      return next;
    });
  };

  const open = (team: PlatformTeam, kind: ModalKind) => {
    setSelected(team);
    setModal(kind);
  };

  const closeModal = () => setModal(null);

  const refreshAfterChange = async () => {
    const res = await staffGet(TEAMS_URL);
    if (res.data?.success) {
      setData(res.data.data);
      onStatsLoaded?.(res.data.data.stats.totalPendingVerification);
      // Functional update: a live refresh must not reopen a modal that closed meanwhile.
      setSelected((current) => {
        if (!current) return current;
        const next = res.data.data.teams.find(
          (t: PlatformTeam) => String(t.accountId) === String(current.accountId)
        );
        return next || current;
      });
    }
  };

  // Live: the list and the open team modal follow membership, verification, standing and
  // wallet changes made anywhere.
  useStaffLive(
    ['teams', 'accounts', 'economy', 'moderation', 'marketplace', 'jobs'],
    () => refreshAfterChange().catch(() => {}),
    { delayMs: 1500 },
  );

  const handleBulkAction = (actionId: BulkActionId) => {
    if (actionId === 'clear') {
      setSelectedIds(new Set());
      return;
    }
    if (selectedIds.size === 0) return;
    setBulkPending(BULK_META[actionId]);
  };

  const handleAction = (team: PlatformTeam, actionId: string) => {
    const isPrimary = capabilities.primaryActions.has(actionId);
    const isStatus =
      capabilities.statusActions.has(actionId) ||
      (actionId === 'warn' && capabilities.canWarn) ||
      (actionId === 'transfer' && capabilities.canTransferTeams);
    if (!isPrimary && !isStatus) return;

    switch (actionId) {
      case 'view':
        open(team, 'overview');
        break;
      case 'credit':
        if (capabilities.canCredits) open(team, 'credit');
        break;
      case 'verification':
        if (capabilities.canVerification) open(team, 'verification');
        break;
      case 'history':
        open(team, 'history');
        break;
      case 'warn':
        if (capabilities.canWarn) open(team, 'warn');
        break;
      case 'transfer':
        if (capabilities.canTransferTeams) open(team, 'transfer');
        break;
      case 'export':
        exportAccountJson(`team-${team.handle || team.accountId}.json`, team);
        break;
      default:
        if ((STATUS_ACTIONS as string[]).includes(actionId)) open(team, actionId as StatusAction);
        else open(team, 'overview');
    }
  };

  if (loading) {
    return <p className="py-12 text-center text-sm text-zinc-500">Loading team accounts…</p>;
  }

  if (!data) {
    return (
      <p className="py-12 text-center text-sm text-red-300">
        {error}{' '}
        <button type="button" onClick={() => void load()} className="underline">
          Retry
        </button>
      </p>
    );
  }

  const s = data.stats;
  const statusModal = modal && (STATUS_ACTIONS as string[]).includes(modal) ? (modal as StatusAction) : null;

  return (
    <>
      <StatCards
        cards={[
          [
            { label: 'Total suspended team', value: s.totalSuspended },
            { label: 'Total banned / locked team', value: s.totalBanned + (s.totalLocked ?? 0) },
          ],
          [
            { label: 'Total team', value: s.totalTeams },
            { label: 'Total active team', value: s.totalActive },
          ],
          [
            { label: 'Total verified businesses', value: s.totalVerifiedBusinesses },
            { label: 'Total pending verification', value: s.totalPendingVerification },
          ],
          [
            { label: 'Teams needing attention', value: s.totalNeedsAttention ?? 0 },
            { label: 'Credits held across teams', value: s.totalCreditsHeld ?? 0 },
          ],
        ]}
      />

      {((s.totalWithoutLeader ?? 0) > 0 || (s.totalLeaderRestricted ?? 0) > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-100">
          <span>
            {(s.totalLeaderRestricted ?? 0) > 0 && `${s.totalLeaderRestricted} team(s) have a suspended, locked or banned leader. `}
            {(s.totalWithoutLeader ?? 0) > 0 && `${s.totalWithoutLeader} team(s) have no active leader. `}
            Banned, locked or missing leaders pause new work and payouts for their team.
          </span>
          <button
            type="button"
            onClick={() => setAttentionFilter('leader')}
            className="rounded-lg border border-amber-400/30 px-3 py-1 text-xs text-amber-100 hover:bg-amber-400/10"
          >
            Show them
          </button>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14151c]">
        <div className="flex flex-col gap-3 border-b border-white/[0.06] px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative min-w-[200px] flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team, leader, member, email…"
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500/15"
            />
          </div>
          <p className="text-xs text-zinc-500 sm:order-last sm:w-full lg:order-none lg:w-auto">
            {teams.length} team{teams.length === 1 ? '' : 's'}
            {filtersActive ? ` matching filters (of ${data.teams.length})` : ''}
            {selectedIds.size > 0 ? ` · ${selectedIds.size} selected` : ''}
          </p>
          <div className="hidden flex-1 lg:block" />
          <TableFilterBar
            filters={[
              { id: 'status', label: 'Status', value: statusFilter, options: statusOptions },
              {
                id: 'verification',
                label: 'Verification',
                value: verificationFilter,
                options: verificationOptions,
              },
              { id: 'attention', label: 'Attention', value: attentionFilter, options: ATTENTION_FILTERS },
            ]}
            sort={{
              value: sortBy,
              options: [
                { value: 'newest', label: 'Newest first' },
                { value: 'oldest', label: 'Oldest first' },
                { value: 'name', label: 'Name A–Z' },
                { value: 'members', label: 'Most members' },
                { value: 'merit', label: 'Lowest team merit' },
                { value: 'wallet', label: 'Largest wallet' },
                { value: 'attention', label: 'Most flags' },
                { value: 'lastSeen', label: 'Recently seen' },
              ],
            }}
            onFilterChange={(id, value) => {
              if (id === 'status') setStatusFilter(value);
              if (id === 'verification') setVerificationFilter(value);
              if (id === 'attention') setAttentionFilter(value);
            }}
            onSortChange={setSortBy}
            onClear={() => {
              setStatusFilter('all');
              setVerificationFilter('all');
              setAttentionFilter('all');
              setSortBy('newest');
            }}
          />
          <BulkActionsMenu
            selectedCount={selectedIds.size}
            busy={bulkBusy}
            items={bulkItems}
            onAction={(id) => handleBulkAction(id as BulkActionId)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1240px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-[#0f1016] text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected;
                    }}
                    onChange={toggleAllVisible}
                    aria-label="Select all visible teams"
                    className="h-4 w-4 rounded border-white/20 bg-transparent accent-rose-500"
                  />
                </th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3">Team leader</th>
                <th className="px-4 py-3">Members · merit</th>
                <th className="px-4 py-3">Team wallet</th>
                <th className="px-4 py-3">Verification</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last seen</th>
                <th className="px-4 py-3">Date created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => {
                const accountId = String(team.accountId);
                const isChecked = selectedIds.has(accountId);
                const leader = team.leader ?? null;
                const available = team.wallet?.available ?? team.walletBalance;
                const held = team.wallet?.held ?? team.frozenBalance ?? 0;
                const end = teamPenaltyEnd(team);
                return (
                  <tr
                    key={team.id}
                    onClick={() => open(team, 'overview')}
                    className={`cursor-pointer border-b border-white/[0.04] align-top text-zinc-300 hover:bg-white/[0.02] ${
                      isChecked ? 'bg-rose-500/[0.07]' : ''
                    }`}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleOne(accountId)}
                        aria-label={`Select ${team.name}`}
                        className="h-4 w-4 rounded border-white/20 bg-transparent accent-rose-500"
                      />
                    </td>
                    <td className="max-w-[260px] px-4 py-3">
                      <p className="font-medium text-white">{team.name}</p>
                      {team.handle && <p className="text-[10px] text-zinc-600">@{team.handle}</p>}
                      {team.attention?.length ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {team.attention.map((flag) => (
                            <span
                              key={flag.id}
                              className={`rounded-full border px-1.5 py-0.5 text-[10px] ${attentionChipTone(flag.tone)}`}
                            >
                              {flag.label}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {leader ? (
                        <>
                          <p className="text-white">{leader.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px]">
                            <span className={`rounded-full border px-1.5 py-0.5 ${statusChipTone(leader.status)}`}>
                              {leader.status}
                            </span>
                            {leader.merit != null && (
                              <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-zinc-400">
                                Merit {leader.merit}
                              </span>
                            )}
                            {leader.forumTimeout && (
                              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-amber-200">
                                Timeout
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <span className="text-xs text-rose-300">No active leader</span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      <p className="text-white">{team.memberCount}</p>
                      {(() => {
                        const percent = teamMeritPercent(team.memberMerit ?? team.history?.memberMerit);
                        if (percent == null) return null;
                        return (
                          <p
                            className={`text-[10px] ${percent >= 80 ? 'text-emerald-300' : percent > 60 ? 'text-amber-200' : 'text-rose-300'}`}
                            title="Team merit: the members' merit added up, out of 100 each"
                          >
                            Merit {percent}%
                          </p>
                        );
                      })()}
                      {(team.history?.activeWarnings || 0) > 0 && (
                        <p className="text-[10px] text-amber-300">
                          {team.history.activeWarnings} active warning{team.history.activeWarnings === 1 ? '' : 's'}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      <p className="text-white">{Number(available || 0).toLocaleString()}</p>
                      {held > 0 && <p className="text-[10px] text-amber-300">{held.toLocaleString()} held</p>}
                      {(team.wallet?.contractReserved || 0) > 0 && (
                        <p className="text-[10px] text-sky-300">{team.wallet?.contractReserved.toLocaleString()} owed to members</p>
                      )}
                    </td>
                    <td className="px-4 py-3">{team.verificationStatus}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${statusChipTone(team.status)}`}>{team.status}</span>
                      {end && <p className="mt-1 text-[10px] text-zinc-500">{end}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs">{formatDateTime(team.lastSeenAt)}</td>
                    <td className="px-4 py-3 text-xs">{formatDateTime(team.createdAt)}</td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <RowActionsMenu
                        status={team.status}
                        statusLabel="Team status"
                        sectionLabels={{ primary: 'Team', manage: 'Enforcement' }}
                        items={buildTeamRowActionItems(team, capabilities)}
                        onAction={(id) => handleAction(team, id)}
                      />
                    </td>
                  </tr>
                );
              })}
              {teams.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-zinc-500">
                    No teams match your search or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selected && modal === 'overview' && (
        <TeamOverviewModal
          team={selected}
          onClose={closeModal}
          onOpenCredit={
            capabilities.canCredits ? () => open(selected, 'credit') : undefined
          }
          onOpenVerification={
            capabilities.canVerification ? () => open(selected, 'verification') : undefined
          }
          onOpenHistory={() => open(selected, 'history')}
          onOpenTransfer={
            capabilities.canTransferTeams ? () => open(selected, 'transfer') : undefined
          }
        />
      )}
      {selected && modal === 'credit' && capabilities.canCredits && (
        <CreditActivityModal
          title={selected.name}
          accountId={selected.accountId}
          activity={selected.creditActivity}
          totalCredits={selected.wallet?.available ?? selected.stats.totalCredits}
          frozenBalance={selected.wallet?.held ?? selected.frozenBalance ?? 0}
          totalRevenue={selected.stats.totalRevenue}
          teamWallet={selected.wallet}
          onClose={closeModal}
          onChanged={() => void refreshAfterChange()}
        />
      )}
      {selected && modal === 'verification' && capabilities.canVerification && (
        <VerificationModal
          entityName={selected.name}
          accountId={selected.accountId}
          verification={selected.verification}
          loadDiditDetails
          onClose={closeModal}
          onChanged={refreshAfterChange}
        />
      )}
      {selected && modal === 'history' && (
        <TeamRecordModal
          team={selected}
          canRescind={capabilities.canWarn}
          onClose={closeModal}
          onChanged={() => void refreshAfterChange()}
        />
      )}
      {selected && modal === 'warn' && capabilities.canWarn && (
        <WarnAccountModal
          entityName={selected.name}
          accountId={selected.accountId}
          desk={capabilities.variant}
          team={{ leader: selected.leader ?? null, members: selected.members }}
          onClose={closeModal}
          onChanged={() => void refreshAfterChange()}
        />
      )}
      {selected && modal === 'transfer' && capabilities.canTransferTeams && (
        <TransferTeamOwnershipModal
          team={selected}
          onClose={closeModal}
          onChanged={refreshAfterChange}
        />
      )}
      {selected && statusModal && (
        <ConfirmStatusModal
          entityName={selected.name}
          action={statusModal}
          desk={capabilities.variant}
          openEndedAllowed={capabilities.canBan}
          team={{ leader: selected.leader ?? null, members: selected.members }}
          onClose={closeModal}
          onConfirm={async (options) => {
            try {
              await setAccountStatus(selected.accountId, statusModal, options);
              await refreshAfterChange();
            } catch (err) {
              handleAccountActionError(err);
              throw err;
            }
          }}
        />
      )}
      {bulkPending && (
        <BulkConfirmModal
          count={selectedIds.size}
          actionLabel={bulkPending.label}
          resultLabel={bulkPending.result}
          tone={bulkPending.tone}
          onClose={() => setBulkPending(null)}
          requireReason={bulkPending.kind === 'status'}
          memberScopeOption={
            bulkPending.kind === 'status' && ['ban', 'suspend', 'lock'].includes(bulkPending.action)
              ? { mode: 'apply', verb: bulkPending.action }
              : bulkPending.kind === 'status' && ['restore', 'unban', 'unsuspend', 'unlock'].includes(bulkPending.action)
                ? { mode: 'lift', verb: 'restore' }
                : undefined
          }
          onConfirm={async (reason, options) => {
            setBulkBusy(true);
            try {
              await runBulkAccountAction(
                [...selectedIds],
                bulkPending.kind,
                bulkPending.action,
                reason,
                { memberScope: options?.memberScope }
              );
              setSelectedIds(new Set());
              await refreshAfterChange();
            } finally {
              setBulkBusy(false);
            }
          }}
        />
      )}
    </>
  );
}
