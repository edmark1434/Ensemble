import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2, Search, UserRound, X } from 'lucide-react';
import api from '@/lib/axios';
import {
  TeamOverviewModal,
  UserOverviewModal,
} from '../userTeam/components/AccountModals';
import type { PlatformTeam, PlatformUserAccount } from '../userTeam/userTeamTypes';
import type { EconomyWallet, WalletTransaction } from './creditEconomyTypes';

type WalletDetailModalProps = {
  wallet: EconomyWallet;
  onClose: () => void;
};

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatAmount(n: number) {
  const prefix = n > 0 ? '+' : '';
  return `${prefix}${n.toLocaleString()}`;
}

export default function WalletDetailModal({ wallet, onClose }: WalletDetailModalProps) {
  const [detail, setDetail] = useState<EconomyWallet>(wallet);
  const [loadingTx, setLoadingTx] = useState(true);
  const [txError, setTxError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileUser, setProfileUser] = useState<PlatformUserAccount | null>(null);
  const [profileTeam, setProfileTeam] = useState<PlatformTeam | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDetail(wallet);
    setLoadingTx(true);
    setTxError('');
    setSearch('');
    setStatusFilter('all');
    setProfileError('');
    setProfileUser(null);
    setProfileTeam(null);

    void (async () => {
      try {
        const res = await api.get(`/api/admin/economy/wallets/${wallet.walletId}`);
        if (cancelled) return;
        if (res.data?.success && res.data.data) {
          setDetail(res.data.data as EconomyWallet);
        } else {
          setTxError('Could not load full transaction history.');
        }
      } catch {
        if (!cancelled) setTxError('Could not load full transaction history.');
      } finally {
        if (!cancelled) setLoadingTx(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [wallet]);

  const transactions = detail.transactions || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (statusFilter === 'credit' && !tx.positive) return false;
      if (statusFilter === 'debit' && tx.positive) return false;
      if (!q) return true;
      return (
        tx.type.toLowerCase().includes(q) ||
        tx.status.toLowerCase().includes(q) ||
        tx.label.toLowerCase().includes(q) ||
        String(tx.amount).includes(q)
      );
    });
  }, [transactions, search, statusFilter]);

  const canOpenProfile =
    detail.accountType === 'User' || detail.accountType === 'Team' || detail.accountType === 'Staff';

  const openFullProfile = async () => {
    setProfileLoading(true);
    setProfileError('');
    setProfileUser(null);
    setProfileTeam(null);
    try {
      if (detail.accountType === 'Team') {
        const res = await api.get('/api/admin/teams-management');
        const teams: PlatformTeam[] = res.data?.data?.teams || [];
        const team = teams.find((t) => String(t.accountId) === String(detail.accountId));
        if (!team) {
          setProfileError('Team profile not found in account management.');
          return;
        }
        setProfileTeam(team);
        return;
      }

      const res = await api.get('/api/admin/users-management');
      const users: PlatformUserAccount[] = res.data?.data?.users || [];
      const user = users.find((u) => String(u.accountId) === String(detail.accountId));
      if (!user) {
        setProfileError(
          detail.accountType === 'Staff'
            ? 'Staff accounts do not have a platform user profile page.'
            : 'User profile not found in account management.'
        );
        return;
      }
      setProfileUser(user);
    } catch {
      setProfileError('Failed to load full profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:pl-[260px]">
        <button type="button" className="absolute inset-0 bg-black/70" onClick={onClose} aria-label="Close" />
        <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[#12131a] shadow-2xl">
          <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-white">
                {detail.name}{' '}
                <span className="text-sm font-normal text-zinc-500">{detail.accountType}</span>
              </h2>
              <p className="mt-1 truncate text-xs text-zinc-500">
                @{detail.username || '—'} · {detail.email || 'No email'}
              </p>
              <p className="truncate text-[10px] text-zinc-600">{detail.walletId}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {canOpenProfile && (
                <button
                  type="button"
                  onClick={() => void openFullProfile()}
                  disabled={profileLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/[0.05] hover:text-white disabled:opacity-50"
                  title="View full profile"
                >
                  {profileLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserRound className="h-3.5 w-3.5" />
                  )}
                  Full profile
                  <ExternalLink className="h-3 w-3 text-zinc-500" />
                </button>
              )}
              <button type="button" onClick={onClose} className="rounded-lg p-2 text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="mb-4 flex flex-wrap gap-2">
              {detail.frozen && (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-200">
                  Credits frozen
                </span>
              )}
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-xs text-zinc-400">
                Status: {detail.status}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-xs text-zinc-400">
                Merit: {detail.meritScore}
              </span>
              {detail.memberCount != null && (
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-xs text-zinc-400">
                  {detail.memberCount} members
                </span>
              )}
            </div>

            {profileError && (
              <p className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                {profileError}
              </p>
            )}

            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wide text-zinc-600">Total credits</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-white">
                  {detail.totalCredits.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wide text-zinc-600">Total revenue</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-emerald-300">
                  ₱{detail.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 sm:col-span-1 col-span-2">
                <p className="text-[10px] uppercase tracking-wide text-zinc-600">Transactions</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-white">
                  {loadingTx ? '…' : transactions.length.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-semibold text-zinc-300">All transactions</h3>
              <div className="flex flex-wrap gap-2">
                {(['all', 'credit', 'debit'] as const).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setStatusFilter(id)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-medium capitalize transition ${
                      statusFilter === id
                        ? 'bg-rose-500/15 text-rose-200'
                        : 'bg-white/[0.03] text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {id === 'all' ? 'All' : id === 'credit' ? 'Credits in' : 'Debits out'}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by type, status, amount…"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500/15"
              />
            </div>

            {loadingTx ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading full history…
              </div>
            ) : txError ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                {txError}
                <p className="mt-1 text-xs text-amber-200/70">Showing recent transactions from overview.</p>
                <TransactionList items={filtered.length ? filtered : wallet.transactions} />
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-10 text-center text-sm text-zinc-500">No transactions match your filters.</p>
            ) : (
              <TransactionList items={filtered} />
            )}
          </div>

          <div className="border-t border-white/[0.08] px-5 py-4">
            <button
              type="button"
              className={`w-full rounded-xl border py-2.5 text-sm font-medium ${
                detail.frozen
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                  : 'border-amber-500/40 bg-amber-500/10 text-amber-200'
              }`}
            >
              {detail.frozen ? 'Unfreeze credits' : 'Freeze credits'}
            </button>
          </div>
        </div>
      </div>

      {profileUser && (
        <UserOverviewModal user={profileUser} onClose={() => setProfileUser(null)} />
      )}
      {profileTeam && (
        <TeamOverviewModal team={profileTeam} onClose={() => setProfileTeam(null)} />
      )}
    </>
  );
}

function TransactionList({ items }: { items: WalletTransaction[] }) {
  return (
    <ul className="space-y-2">
      {items.map((tx) => (
        <li
          key={tx.id}
          className="flex items-start justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-white">{tx.type}</p>
            <p className="text-xs text-zinc-500">
              {tx.status}
              {tx.createdAt ? ` · ${formatDateTime(tx.createdAt)}` : ` · ${tx.timeAgo}`}
            </p>
            {!tx.createdAt && tx.timeAgo && (
              <p className="mt-0.5 text-[10px] text-zinc-600">{tx.label}</p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p
              className={`font-semibold tabular-nums ${
                tx.positive || tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {formatAmount(tx.amount)}
            </p>
            {tx.timeAgo && tx.createdAt && (
              <p className="mt-0.5 text-[10px] text-zinc-600">{tx.timeAgo}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
