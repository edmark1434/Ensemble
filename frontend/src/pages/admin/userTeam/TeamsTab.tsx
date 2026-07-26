import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Filter } from 'lucide-react';
import api from '@/lib/axios';
import StatCards from './components/StatCards';
import RowActionsMenu from './components/RowActionsMenu';
import {
  ConfirmStatusModal,
  CreditActivityModal,
  HistoryModal,
  ModerationActionModal,
  TeamOverviewModal,
  VerificationModal,
  WarnAccountModal,
} from './components/AccountModals';
import { handleAccountActionError, setAccountStatus } from './accountActions';
import { formatDateTime } from './formatDateTime';
import type { PlatformTeam, TeamManagementData } from './userTeamTypes';

type ModalKind =
  | 'overview'
  | 'credit'
  | 'verification'
  | 'history'
  | 'moderation'
  | 'warn'
  | 'ban'
  | 'suspend'
  | 'restore'
  | 'lock'
  | null;

type TeamsTabProps = {
  search: string;
  onStatsLoaded?: (pendingVerification: number) => void;
  refreshToken?: number;
};

export default function TeamsTab({ search, onStatsLoaded, refreshToken = 0 }: TeamsTabProps) {
  const [data, setData] = useState<TeamManagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<ModalKind>(null);
  const [selected, setSelected] = useState<PlatformTeam | null>(null);

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
    if (!q) return data.teams;
    return data.teams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.leaderName.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q)
    );
  }, [data, q]);

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
      case 'moderation':
        open(team, 'moderation');
        break;
      case 'warn':
        open(team, 'warn');
        break;
      case 'ban':
      case 'suspend':
      case 'restore':
      case 'lock':
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
        <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-4 py-3">
          <p className="text-xs text-zinc-500">
            {teams.length} team{teams.length === 1 ? '' : 's'}
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
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-[#0f1016] text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
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
              {teams.map((team) => (
                <tr key={team.id} className="border-b border-white/[0.04] text-zinc-300 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium text-white">{team.name}</td>
                  <td className="px-4 py-3">{team.leaderName}</td>
                  <td className="px-4 py-3 tabular-nums">{team.memberCount}</td>
                  <td className="px-4 py-3">{team.verificationStatus}</td>
                  <td className="px-4 py-3">{team.status}</td>
                  <td className="px-4 py-3 text-xs">{formatDateTime(team.lastSeenAt)}</td>
                  <td className="px-4 py-3 text-xs">{formatDateTime(team.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <RowActionsMenu onAction={(id) => handleAction(team, id)} />
                  </td>
                </tr>
              ))}
              {teams.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-zinc-500">
                    No teams match your search.
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
          onOpenModeration={() => open(selected, 'moderation')}
        />
      )}
      {selected && modal === 'credit' && (
        <CreditActivityModal
          title={selected.name}
          accountId={selected.accountId}
          activity={selected.creditActivity}
          totalCredits={selected.stats.totalCredits}
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
          onClose={closeModal}
          onChanged={() => void refreshAfterChange()}
        />
      )}
      {selected && modal === 'history' && (
        <HistoryModal entityName={selected.name} history={selected.history} onClose={closeModal} />
      )}
      {selected && modal === 'moderation' && (
        <ModerationActionModal
          entityName={selected.name}
          accountId={selected.accountId}
          currentStatus={selected.status}
          onClose={closeModal}
          onChanged={() => void refreshAfterChange()}
        />
      )}
      {selected && modal === 'warn' && (
        <WarnAccountModal
          entityName={selected.name}
          accountId={selected.accountId}
          onClose={closeModal}
          onChanged={() => void refreshAfterChange()}
        />
      )}
      {selected && (modal === 'ban' || modal === 'suspend' || modal === 'restore' || modal === 'lock') && (
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
    </>
  );
}
