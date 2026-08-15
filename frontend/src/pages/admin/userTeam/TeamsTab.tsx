import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import api from '@/lib/axios';
import StatCards from './components/StatCards';
import RowActionsMenu from './components/RowActionsMenu';
import TableFilterBar, { uniqueOptions } from './components/TableFilterBar';
import BulkActionsMenu, { type BulkActionId } from './components/BulkActionsMenu';
import {
  BulkConfirmModal,
  ConfirmStatusModal,
  CreditActivityModal,
  HistoryModal,
  PardonAccountModal,
  TeamOverviewModal,
  VerificationModal,
  WarnAccountModal,
} from './components/AccountModals';
import {
  handleAccountActionError,
  runBulkAccountAction,
  setAccountStatus,
} from './accountActions';
import { buildRowActionItems, exportAccountJson } from './statusActions';
import { formatDateTime } from './formatDateTime';
import type { PlatformTeam, TeamManagementData } from './userTeamTypes';

type ModalKind =
  | 'overview'
  | 'credit'
  | 'verification'
  | 'history'
  | 'warn'
  | 'pardon'
  | 'ban'
  | 'suspend'
  | 'restore'
  | 'lock'
  | 'unban'
  | 'unsuspend'
  | 'unlock'
  | null;

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

type TeamsTabProps = {
  onStatsLoaded?: (pendingVerification: number) => void;
  refreshToken?: number;
  /** Pre-select verification filter (value is lowercased option key, e.g. "pending review"). */
  defaultVerificationFilter?: string;
};

export default function TeamsTab({
  onStatsLoaded,
  refreshToken = 0,
  defaultVerificationFilter = 'all',
}: TeamsTabProps) {
  const [data, setData] = useState<TeamManagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<ModalKind>(null);
  const [selected, setSelected] = useState<PlatformTeam | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState(defaultVerificationFilter);
  const [sortBy, setSortBy] = useState('newest');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPending, setBulkPending] = useState<BulkPending | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/admin/teams-management');
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
  const teams = useMemo(() => {
    if (!data) return [];
    let result = data.teams;

    if (q) {
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.leaderName.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          t.email.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter((t) => t.status.toLowerCase() === statusFilter);
    }
    if (verificationFilter !== 'all') {
      result = result.filter((t) => t.verificationStatus.toLowerCase() === verificationFilter);
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
        case 'lastSeen':
          return time(b.lastSeenAt) - time(a.lastSeenAt);
        case 'newest':
        default:
          return time(b.createdAt) - time(a.createdAt);
      }
    });
  }, [data, q, statusFilter, verificationFilter, sortBy]);

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
    const res = await api.get('/api/admin/teams-management');
    if (res.data?.success) {
      setData(res.data.data);
      onStatsLoaded?.(res.data.data.stats.totalPendingVerification);
      if (selected) {
        const next = res.data.data.teams.find(
          (t: PlatformTeam) => String(t.accountId) === String(selected.accountId)
        );
        if (next) setSelected(next);
      }
    }
  };

  const handleBulkAction = (actionId: BulkActionId) => {
    if (actionId === 'clear') {
      setSelectedIds(new Set());
      return;
    }
    if (selectedIds.size === 0) return;
    setBulkPending(BULK_META[actionId]);
  };

  const handleAction = (team: PlatformTeam, actionId: string) => {
    switch (actionId) {
      case 'view':
        open(team, 'overview');
        break;
      case 'credit':
        open(team, 'credit');
        break;
      case 'verification':
        open(team, 'verification');
        break;
      case 'history':
        open(team, 'history');
        break;
      case 'warn':
        open(team, 'warn');
        break;
      case 'pardon':
        open(team, 'pardon');
        break;
      case 'export':
        exportAccountJson(`team-${team.handle || team.accountId}.json`, team);
        break;
      case 'ban':
      case 'suspend':
      case 'restore':
      case 'lock':
      case 'unban':
      case 'unsuspend':
      case 'unlock':
        open(team, actionId);
        break;
      default:
        open(team, 'overview');
    }
  };

  if (loading) {
    return <p className="py-12 text-center text-sm text-zinc-500">Loading team accounts…</p>;
  }

  if (error || !data) {
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

  return (
    <>
      <StatCards
        cards={[
          [
            { label: 'Total suspended team', value: s.totalSuspended },
            { label: 'Total banned team', value: s.totalBanned },
          ],
          [
            { label: 'Total team', value: s.totalTeams },
            { label: 'Total active team', value: s.totalActive },
          ],
          [
            { label: 'Total verified businesses', value: s.totalVerifiedBusinesses },
            { label: 'Total unverified business', value: s.totalUnverifiedBusiness },
          ],
          [{ label: 'Total pending verification', value: s.totalPendingVerification }],
        ]}
      />

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14151c]">
        <div className="flex flex-col gap-3 border-b border-white/[0.06] px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative min-w-[200px] flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by team / leader / email…"
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500/15"
            />
          </div>
          <p className="text-xs text-zinc-500 sm:order-last sm:w-full lg:order-none lg:w-auto">
            {teams.length} team{teams.length === 1 ? '' : 's'}
            {q || statusFilter !== 'all' || verificationFilter !== 'all'
              ? ` matching filters (of ${data.teams.length})`
              : ''}
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
            ]}
            sort={{
              value: sortBy,
              options: [
                { value: 'newest', label: 'Newest first' },
                { value: 'oldest', label: 'Oldest first' },
                { value: 'name', label: 'Name A–Z' },
                { value: 'members', label: 'Most members' },
                { value: 'lastSeen', label: 'Recently seen' },
              ],
            }}
            onFilterChange={(id, value) => {
              if (id === 'status') setStatusFilter(value);
              if (id === 'verification') setVerificationFilter(value);
            }}
            onSortChange={setSortBy}
            onClear={() => {
              setStatusFilter('all');
              setVerificationFilter('all');
              setSortBy('newest');
            }}
          />
          <BulkActionsMenu
            selectedCount={selectedIds.size}
            busy={bulkBusy}
            onAction={(id) => handleBulkAction(id as BulkActionId)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
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
                <th className="px-4 py-3">Team name</th>
                <th className="px-4 py-3">Team leader</th>
                <th className="px-4 py-3">No. members</th>
                <th className="px-4 py-3">Verification status</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last seen online</th>
                <th className="px-4 py-3">Date created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => {
                const accountId = String(team.accountId);
                const isChecked = selectedIds.has(accountId);
                return (
                  <tr
                    key={team.id}
                    className={`border-b border-white/[0.04] text-zinc-300 hover:bg-white/[0.02] ${
                      isChecked ? 'bg-rose-500/[0.07]' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleOne(accountId)}
                        aria-label={`Select ${team.name}`}
                        className="h-4 w-4 rounded border-white/20 bg-transparent accent-rose-500"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-white">{team.name}</td>
                    <td className="px-4 py-3">{team.leaderName}</td>
                    <td className="px-4 py-3 tabular-nums">{team.memberCount}</td>
                    <td className="px-4 py-3">{team.verificationStatus}</td>
                    <td className="px-4 py-3">{team.status}</td>
                    <td className="px-4 py-3 text-xs">{formatDateTime(team.lastSeenAt)}</td>
                    <td className="px-4 py-3 text-xs">{formatDateTime(team.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <RowActionsMenu
                        status={team.status}
                        items={buildRowActionItems(team.status, {
                          hasViolations: (team.history?.totalViolations ?? 0) > 0,
                        })}
                        onAction={(id) => handleAction(team, id)}
                      />
                    </td>
                  </tr>
                );
              })}
              {teams.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-zinc-500">
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
          onOpenCredit={() => open(selected, 'credit')}
          onOpenVerification={() => open(selected, 'verification')}
          onOpenHistory={() => open(selected, 'history')}
        />
      )}
      {selected && modal === 'credit' && (
        <CreditActivityModal
          title={selected.name}
          accountId={selected.accountId}
          activity={selected.creditActivity}
          totalCredits={selected.stats.totalCredits}
          frozenBalance={selected.frozenBalance ?? 0}
          totalRevenue={selected.stats.totalRevenue}
          onClose={closeModal}
          onChanged={() => void refreshAfterChange()}
        />
      )}
      {selected && modal === 'verification' && (
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
        <HistoryModal entityName={selected.name} history={selected.history} onClose={closeModal} />
      )}
      {selected && modal === 'warn' && (
        <WarnAccountModal
          entityName={selected.name}
          accountId={selected.accountId}
          onClose={closeModal}
          onChanged={() => void refreshAfterChange()}
        />
      )}
      {selected && modal === 'pardon' && (
        <PardonAccountModal
          entityName={selected.name}
          accountId={selected.accountId}
          onClose={closeModal}
          onChanged={() => void refreshAfterChange()}
        />
      )}
      {selected &&
        (modal === 'ban' ||
          modal === 'suspend' ||
          modal === 'restore' ||
          modal === 'lock' ||
          modal === 'unban' ||
          modal === 'unsuspend' ||
          modal === 'unlock') && (
        <ConfirmStatusModal
          entityName={selected.name}
          action={modal}
          onClose={closeModal}
          onConfirm={async () => {
            try {
              await setAccountStatus(selected.accountId, modal);
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
          onConfirm={async () => {
            setBulkBusy(true);
            try {
              await runBulkAccountAction(
                [...selectedIds],
                bulkPending.kind,
                bulkPending.action
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
