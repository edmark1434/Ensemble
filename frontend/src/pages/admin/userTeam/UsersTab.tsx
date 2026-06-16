import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Filter } from 'lucide-react';
import api from '@/lib/axios';
import StatCards from './components/StatCards';
import RowActionsMenu from './components/RowActionsMenu';
import {
  CreditActivityModal,
  HistoryModal,
  UserOverviewModal,
  VerificationModal,
} from './components/AccountModals';
import { formatDateTime } from './formatDateTime';
import type { PlatformUserAccount, UserManagementData } from './userTeamTypes';

type ModalKind = 'overview' | 'credit' | 'verification' | 'history' | null;

type UsersTabProps = {
  search: string;
  onStatsLoaded?: (pendingVerification: number) => void;
  refreshToken?: number;
};

export default function UsersTab({ search, onStatsLoaded, refreshToken = 0 }: UsersTabProps) {
  const [data, setData] = useState<UserManagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<ModalKind>(null);
  const [selected, setSelected] = useState<PlatformUserAccount | null>(null);

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
    if (!q) return data.users;
    return data.users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.profileId.toLowerCase().includes(q)
    );
  }, [data, q]);

  const open = (user: PlatformUserAccount, kind: ModalKind) => {
    setSelected(user);
    setModal(kind);
  };

  const handleAction = (user: PlatformUserAccount, actionId: string) => {
    if (actionId === 'credit') open(user, 'credit');
    else if (actionId === 'verification') open(user, 'verification');
    else if (actionId === 'history') open(user, 'history');
    else open(user, 'overview');
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
        <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-4 py-3">
          <p className="text-xs text-zinc-500">
            {users.length} user{users.length === 1 ? '' : 's'}
            {q ? ' matching search' : ''}
          </p>
          <div className="flex-1" />
          <button type="button" className="rounded-lg border border-white/[0.08] p-2 text-zinc-400">
            <Filter className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="flex items-center gap-1 rounded-lg border border-white/[0.08] px-3 py-2 text-sm text-zinc-300"
          >
            Bulk actions <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-[#0f1016] text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
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
              {users.map((user) => (
                <tr key={user.id} className="border-b border-white/[0.04] text-zinc-300 hover:bg-white/[0.02]">
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
                    <RowActionsMenu onAction={(id) => handleAction(user, id)} />
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-zinc-500">
                    No users match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selected && modal === 'overview' && (
        <UserOverviewModal user={selected} onClose={() => setModal(null)} />
      )}
      {selected && modal === 'credit' && (
        <CreditActivityModal
          title={selected.name}
          activity={selected.creditActivity}
          totalCredits={selected.stats.totalCredits}
          onClose={() => setModal(null)}
        />
      )}
      {selected && modal === 'verification' && (
        <VerificationModal
          entityName={selected.name}
          verification={selected.verification}
          onClose={() => setModal(null)}
        />
      )}
      {selected && modal === 'history' && (
        <HistoryModal entityName={selected.name} history={selected.history} onClose={() => setModal(null)} />
      )}
    </>
  );
}
