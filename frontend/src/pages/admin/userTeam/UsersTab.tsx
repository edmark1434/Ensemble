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
  UserOverviewModal,
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
import type { PlatformUserAccount, UserManagementData } from './userTeamTypes';

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

const BULK_META: Record<
  Exclude<BulkActionId, 'clear'>,
  BulkPending
> = {
  ban: {
    kind: 'status',
    action: 'ban',
    label: 'Ban selected accounts',
    result: 'Banned',
    tone: 'bg-rose-500/90 hover:bg-rose-500',
  },
  suspend: {
    kind: 'status',
    action: 'suspend',
    label: 'Suspend selected accounts',
    result: 'Suspended',
    tone: 'bg-amber-500/90 hover:bg-amber-500',
  },
  restore: {
    kind: 'status',
    action: 'restore',
    label: 'Restore selected accounts',
    result: 'Active',
    tone: 'bg-emerald-500/90 hover:bg-emerald-500',
  },
  lock: {
    kind: 'status',
    action: 'lock',
    label: 'Lock selected accounts',
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

type UsersTabProps = {
  onStatsLoaded?: (pendingVerification: number) => void;
  refreshToken?: number;
};

export default function UsersTab({ onStatsLoaded, refreshToken = 0 }: UsersTabProps) {
  const [data, setData] = useState<UserManagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<ModalKind>(null);
  const [selected, setSelected] = useState<PlatformUserAccount | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPending, setBulkPending] = useState<BulkPending | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/admin/users-management');
      if (res.data?.success) {
        setData(res.data.data);
        onStatsLoaded?.(res.data.data.stats.totalPendingVerification);
      } else setError('Failed to load users');
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [refreshToken]);

  const q = search.trim().toLowerCase();
  const users = useMemo(() => {
    if (!data) return [];
    let result = data.users;

    if (q) {
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          u.profileId.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter((u) => u.status.toLowerCase() === statusFilter);
    }
    if (verificationFilter !== 'all') {
      result = result.filter((u) => u.verificationStatus.toLowerCase() === verificationFilter);
    }

    const time = (value: string | null) => (value ? new Date(value).getTime() : 0);
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return time(a.joinedAt) - time(b.joinedAt);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'merit':
          return b.meritCredits - a.meritCredits;
        case 'lastSeen':
          return time(b.lastSeenAt) - time(a.lastSeenAt);
        case 'newest':
        default:
          return time(b.joinedAt) - time(a.joinedAt);
      }
    });
  }, [data, q, statusFilter, verificationFilter, sortBy]);

  const statusOptions = useMemo(
    () => uniqueOptions((data?.users ?? []).map((u) => u.status)),
    [data]
  );
  const verificationOptions = useMemo(
    () => uniqueOptions((data?.users ?? []).map((u) => u.verificationStatus)),
    [data]
  );

  const visibleIds = useMemo(() => users.map((u) => String(u.accountId)), [users]);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id));

  useEffect(() => {
    setSelectedIds((prev) => {
      if (!data) return prev;
      const valid = new Set(data.users.map((u) => String(u.accountId)));
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

  const open = (user: PlatformUserAccount, kind: ModalKind) => {
    setSelected(user);
    setModal(kind);
  };

  const closeModal = () => setModal(null);

  const refreshAfterChange = async () => {
    const res = await api.get('/api/admin/users-management');
    if (res.data?.success) {
      setData(res.data.data);
      onStatsLoaded?.(res.data.data.stats.totalPendingVerification);
      if (selected) {
        const next = res.data.data.users.find(
          (u: PlatformUserAccount) => String(u.accountId) === String(selected.accountId)
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

  const handleAction = (user: PlatformUserAccount, actionId: string) => {
    switch (actionId) {
      case 'view':
        open(user, 'overview');
        break;
      case 'credit':
        open(user, 'credit');
        break;
      case 'verification':
        open(user, 'verification');
        break;
      case 'history':
        open(user, 'history');
        break;
      case 'warn':
        open(user, 'warn');
        break;
      case 'pardon':
        open(user, 'pardon');
        break;
      case 'export':
        exportAccountJson(`user-${user.username || user.accountId}.json`, user);
        break;
      case 'ban':
      case 'suspend':
      case 'restore':
      case 'lock':
      case 'unban':
      case 'unsuspend':
      case 'unlock':
        open(user, actionId);
        break;
      default:
        open(user, 'overview');
    }
  };

  if (loading) {
    return <p className="py-12 text-center text-sm text-zinc-500">Loading platform users…</p>;
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
            { label: 'Total suspended users', value: s.totalSuspended },
            { label: 'Total banned users', value: s.totalBanned },
          ],
          [
            { label: 'Total users', value: s.totalUsers },
            { label: 'Total active users', value: s.totalActive },
          ],
          [
            { label: 'Total verified users', value: s.totalVerified },
            { label: 'Total unverified users', value: s.totalUnverified },
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
              placeholder="Search by name / email / username…"
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500/15"
            />
          </div>
          <p className="text-xs text-zinc-500 sm:order-last sm:w-full lg:order-none lg:w-auto">
            {users.length} user{users.length === 1 ? '' : 's'}
            {q || statusFilter !== 'all' || verificationFilter !== 'all'
              ? ` matching filters (of ${data.users.length})`
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
                { value: 'merit', label: 'Highest merit' },
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
          <table className="w-full min-w-[1140px] text-left text-sm">
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
                    aria-label="Select all visible users"
                    className="h-4 w-4 rounded border-white/20 bg-transparent accent-rose-500"
                  />
                </th>
                <th className="px-4 py-3">Member name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Verification</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Merit</th>
                <th className="px-4 py-3">Last seen</th>
                <th className="px-4 py-3">Date created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const accountId = String(user.accountId);
                const isChecked = selectedIds.has(accountId);
                return (
                  <tr
                    key={String(user.id)}
                    className={`border-b border-white/[0.04] text-zinc-300 hover:bg-white/[0.02] ${
                      isChecked ? 'bg-rose-500/[0.07]' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleOne(accountId)}
                        aria-label={`Select ${user.name}`}
                        className="h-4 w-4 rounded border-white/20 bg-transparent accent-rose-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{user.name}</p>
                      <p className="text-[10px] text-zinc-600">{user.profileId}</p>
                    </td>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">@{user.username}</td>
                    <td className="px-4 py-3">{user.verificationStatus}</td>
                    <td className="px-4 py-3">{user.status}</td>
                    <td className="px-4 py-3 tabular-nums text-emerald-300/90">{user.meritCredits}</td>
                    <td className="px-4 py-3 text-xs">{formatDateTime(user.lastSeenAt)}</td>
                    <td className="px-4 py-3 text-xs">{formatDateTime(user.joinedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <RowActionsMenu
                        status={user.status}
                        items={buildRowActionItems(user.status, {
                          hasViolations: (user.history?.totalViolations ?? 0) > 0,
                        })}
                        onAction={(id) => handleAction(user, id)}
                      />
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-zinc-500">
                    No users match your search or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selected && modal === 'overview' && (
        <UserOverviewModal
          user={selected}
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
          onClose={closeModal}
          onChanged={() => void refreshAfterChange()}
        />
      )}
      {selected && modal === 'verification' && (
        <VerificationModal
          entityName={selected.name}
          accountId={selected.accountId}
          verification={selected.verification}
          onClose={closeModal}
          onChanged={() => void refreshAfterChange()}
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
