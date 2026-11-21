import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Download,
  ExternalLink,
  Filter,
  Loader2,
  Lock,
  PlusCircle,
  Unlock,
  UserRound,
  X,
} from 'lucide-react';
import { peekStaffGet, staffGet } from '@/lib/staffCache';
import { TeamOverviewModal, UserOverviewModal } from '../userTeam/components/AccountModals';
import type { PlatformTeam, PlatformUserAccount } from '../userTeam/userTeamTypes';
import { AdjustCreditsDialog, HoldCreditsDialog, ReleaseHoldDialog } from './CreditActionDialogs';
import { entrySubtitle, entryTitle, exportLedger, LedgerEntryDetail, LedgerLinkChips } from './ledgerShared';
import {
  BalanceChange,
  CopyId,
  ECONOMY_ACCENT,
  ECONOMY_API,
  formatCredits,
  formatDate,
  formatDateTime,
  formatRelative,
  formatSigned,
  HoldPill,
  LedgerAmount,
  Pager,
  PartyCell,
  StatusPill,
  usePagedList,
} from './economyUi';
import type { EconomyVariant, LedgerEntry, LedgerFilters, WalletDetail } from './creditEconomyTypes';

const TX_PAGE = 25;

type Section = 'transactions' | 'adjustments' | 'holds' | 'cashouts';

type WalletDetailModalProps = {
  walletId: string;
  variant: EconomyVariant;
  onClose: () => void;
  onChanged: () => void;
  /** Open another wallet (a counterparty) in place. */
  onOpenWallet: (walletId: string) => void;
  /** Open one ledger entry with its linked rows (on top of this modal). */
  onOpenTransaction: (transactionId: string) => void;
  /** Leave the modal for the Ledger tab with these filters. */
  onShowInLedger: (filters: Partial<LedgerFilters>) => void;
  /** True while a dialog stacked above this one owns the Escape key. */
  escapeDisabled?: boolean;
};

function Tile({ label, value, hint, tone = 'text-white' }: { label: string; value: ReactNode; hint?: ReactNode; tone?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wide text-zinc-600">{label}</p>
      <p className={`mt-1 text-lg font-bold tabular-nums ${tone}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-zinc-500">{hint}</p>}
    </div>
  );
}

export default function WalletDetailModal({
  walletId,
  variant,
  onClose,
  onChanged,
  onOpenWallet,
  onOpenTransaction,
  onShowInLedger,
  escapeDisabled = false,
}: WalletDetailModalProps) {
  const accent = ECONOMY_ACCENT[variant];
  const url = ECONOMY_API.wallet(walletId);
  const cached = peekStaffGet(url)?.data;
  const [detail, setDetail] = useState<WalletDetail | null>(cached?.success ? cached.data : null);
  const [loading, setLoading] = useState(!detail);
  const [error, setError] = useState('');
  const [section, setSection] = useState<Section>('transactions');
  const [direction, setDirection] = useState<'all' | 'in' | 'out'>('all');
  const [txOffset, setTxOffset] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'adjust' | 'hold' | 'release' | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileUser, setProfileUser] = useState<PlatformUserAccount | null>(null);
  const [profileTeam, setProfileTeam] = useState<PlatformTeam | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await staffGet(url);
      if (res.data?.success) setDetail(res.data.data);
      else setError(res.data?.message || 'Could not load this wallet.');
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || 'Could not load this wallet.');
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    setSection('transactions');
    setDirection('all');
    setTxOffset(0);
    setExpanded(null);
    setProfileError('');
    void load();
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !dialog && !escapeDisabled) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog, onClose, escapeDisabled]);

  const txParams = useMemo(
    () => ({ walletId, direction, limit: TX_PAGE, offset: txOffset, sort: 'newest' }),
    [walletId, direction, txOffset]
  );
  const tx = usePagedList<LedgerEntry>(ECONOMY_API.ledger, txParams, refresh);

  const afterAction = () => {
    setDialog(null);
    setRefresh((n) => n + 1);
    void load();
    onChanged();
  };

  const wallet = detail?.wallet;
  const insights = detail?.insights;
  const viewer = detail?.viewer;

  const openFullProfile = async () => {
    if (!wallet) return;
    setProfileLoading(true);
    setProfileError('');
    try {
      if (wallet.accountType === 'Team') {
        // Contract workspaces hold wallets too, so this look-up asks for them.
        const res = await staffGet('/api/admin/teams-management', { include: 'contractual' });
        const teams: PlatformTeam[] = res.data?.data?.teams || [];
        const team = teams.find((t) => String(t.accountId) === String(wallet.accountId));
        if (team) setProfileTeam(team);
        else setProfileError('Team profile not found in account management.');
      } else {
        const res = await staffGet('/api/admin/users-management');
        const users: PlatformUserAccount[] = res.data?.data?.users || [];
        const user = users.find((u) => String(u.accountId) === String(wallet.accountId));
        if (user) setProfileUser(user);
        else setProfileError('User profile not found in account management.');
      }
    } catch {
      setProfileError('Failed to load the full profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const sections: { id: Section; label: string; count?: number }[] = [
    { id: 'transactions', label: 'Transactions', count: insights?.transactionCount },
    { id: 'adjustments', label: 'Staff adjustments', count: detail?.adjustments.length },
    { id: 'holds', label: 'Hold history', count: insights?.holdHistory.length },
    { id: 'cashouts', label: 'Cashouts', count: insights?.cashouts.length },
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:pl-[260px]" role="dialog" aria-modal="true">
        <button type="button" className="absolute inset-0 bg-black/70" onClick={onClose} aria-label="Close" />
        <div className="relative flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[#12131a] shadow-2xl">
          <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-bold text-white">{wallet?.name || 'Wallet'}</h2>
                {wallet && (
                  <>
                    <span className="text-sm text-zinc-500">
                      {wallet.accountType}
                      {wallet.staffRole ? ` · ${wallet.staffRole}` : ''}
                    </span>
                    <StatusPill status={wallet.accountStatus} />
                    {wallet.hold && <HoldPill overdue={wallet.hold.overdue} />}
                  </>
                )}
              </div>
              {wallet && (
                <>
                  <p className="mt-1 truncate text-xs text-zinc-500">
                    @{wallet.username || '—'}
                    {wallet.email ? ` · ${wallet.email}` : ''} · Joined {formatDate(wallet.createdAt)}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                    <span className="text-[10px] text-zinc-600">Wallet</span>
                    <CopyId value={wallet.walletId} />
                    <span className="text-[10px] text-zinc-600">Account</span>
                    <CopyId value={wallet.accountId} />
                  </div>
                </>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {wallet && wallet.accountType !== 'Staff' && (
                <button
                  type="button"
                  onClick={() => void openFullProfile()}
                  disabled={profileLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/[0.05] disabled:opacity-50"
                >
                  {profileLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserRound className="h-3.5 w-3.5" />}
                  Full profile
                  <ExternalLink className="h-3 w-3 text-zinc-500" />
                </button>
              )}
              <button type="button" onClick={onClose} className="rounded-lg p-2 text-zinc-400 hover:text-white" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
            {loading && !detail && (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
                <Loader2 className={`h-4 w-4 animate-spin ${accent.spinner}`} /> Loading wallet…
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                <AlertTriangle className="h-4 w-4" /> {error}
                <button type="button" onClick={() => void load()} className="ml-auto text-xs underline">
                  Retry
                </button>
              </div>
            )}
            {profileError && (
              <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">{profileError}</p>
            )}

            {wallet && insights && (
              <>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Tile
                    label="Spendable"
                    value={formatCredits(wallet.spendableCredits)}
                    tone={wallet.spendableCredits < 0 ? 'text-red-400' : 'text-white'}
                  />
                  <Tile
                    label="On hold"
                    value={formatCredits(wallet.heldCredits)}
                    tone={wallet.heldCredits ? 'text-amber-300' : 'text-zinc-500'}
                  />
                  <Tile
                    label="In escrow"
                    value={formatCredits(insights.escrow.credits)}
                    hint={insights.escrow.wallets ? `${insights.escrow.wallets} contract wallet${insights.escrow.wallets === 1 ? '' : 's'}` : 'None'}
                  />
                  <Tile
                    label="Incoming"
                    value={formatCredits(insights.pendingIn + insights.disputePayouts.scheduledCredits)}
                    hint={
                      insights.disputePayouts.scheduled
                        ? `${insights.disputePayouts.scheduled} dispute payout${insights.disputePayouts.scheduled === 1 ? '' : 's'} · next ${formatDate(insights.disputePayouts.nextReleaseAt)}`
                        : insights.pendingIn
                          ? 'Pending ledger entries'
                          : 'Nothing pending'
                    }
                  />
                </div>

                {wallet.hold && (
                  <div className={`rounded-xl border p-4 ${wallet.hold.overdue ? 'border-red-500/25 bg-red-500/[0.05]' : 'border-amber-500/25 bg-amber-500/[0.05]'}`}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className={`text-sm font-semibold ${wallet.hold.overdue ? 'text-red-200' : 'text-amber-100'}`}>
                        {formatCredits(wallet.hold.credits)} credits on hold
                        {wallet.hold.frozenUntil
                          ? wallet.hold.overdue
                            ? ` · should have released ${formatRelative(wallet.hold.frozenUntil)}`
                            : ` · releases ${formatDate(wallet.hold.frozenUntil)} (${formatRelative(wallet.hold.frozenUntil)})`
                          : ' · until staff review'}
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        Placed {formatDateTime(wallet.hold.frozenAt)} by {wallet.hold.byStaffName || 'unknown'}
                        {wallet.hold.byStaffRole ? ` (${wallet.hold.byStaffRole})` : ''}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-zinc-300">{wallet.hold.reason || 'No reason recorded.'}</p>
                  </div>
                )}

                {viewer && (viewer.canAdjust || viewer.canHold) && (
                  <div className="flex flex-wrap gap-2">
                    {viewer.canAdjust && (
                      <button
                        type="button"
                        onClick={() => setDialog('adjust')}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-xs font-medium text-white hover:bg-white/[0.08]"
                      >
                        <PlusCircle className="h-3.5 w-3.5" /> Adjust credits
                      </button>
                    )}
                    {viewer.canHold && (
                      <button
                        type="button"
                        onClick={() => setDialog('hold')}
                        disabled={wallet.spendableCredits <= 0}
                        title={wallet.spendableCredits > 0 ? undefined : 'No spendable credits to hold'}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-200 disabled:opacity-40"
                      >
                        <Lock className="h-3.5 w-3.5" /> {wallet.hold ? 'Hold more credits' : 'Freeze credits'}
                      </button>
                    )}
                    {viewer.canHold && wallet.hold && (
                      <button
                        type="button"
                        onClick={() => setDialog('release')}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-200"
                      >
                        <Unlock className="h-3.5 w-3.5" /> Release hold
                      </button>
                    )}
                  </div>
                )}

                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-zinc-500">Received (lifetime)</p>
                      <p className="mt-0.5 font-semibold tabular-nums text-emerald-300">+{formatCredits(insights.creditsIn)}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Sent (lifetime)</p>
                      <p className="mt-0.5 font-semibold tabular-nums text-red-300">−{formatCredits(insights.creditsOut)}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Staff adjustments</p>
                      <p className="mt-0.5 font-semibold tabular-nums text-zinc-200">
                        +{formatCredits(insights.staffGranted)} / −{formatCredits(insights.staffDeducted)}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Activity</p>
                      <p className="mt-0.5 text-zinc-200">
                        {insights.lastActivityAt ? `Last ${formatRelative(insights.lastActivityAt)}` : 'None yet'}
                        {insights.firstActivityAt ? ` · since ${formatDate(insights.firstActivityAt)}` : ''}
                      </p>
                    </div>
                  </div>
                  <LedgerCheck
                    total={wallet.totalCredits}
                    ledgerNet={insights.ledgerNet}
                    unexplained={insights.unexplainedCredits}
                    unsigned={insights.unsignedAdjustments}
                  />
                </div>

                <div>
                  <div className="mb-3 flex gap-1 overflow-x-auto border-b border-white/[0.06]">
                    {sections.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSection(s.id)}
                        className={`shrink-0 border-b-2 px-3 py-2 text-xs font-medium transition ${
                          section === s.id ? accent.tab : 'border-transparent text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {s.label}
                        {s.count != null && <span className="ml-1.5 text-zinc-600">{s.count.toLocaleString()}</span>}
                      </button>
                    ))}
                  </div>

                  {section === 'transactions' && (
                    <div className="overflow-hidden rounded-xl border border-white/[0.06]">
                      <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-3 py-2">
                        {(['all', 'in', 'out'] as const).map((id) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => {
                              setDirection(id);
                              setTxOffset(0);
                            }}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                              direction === id ? accent.chip : 'bg-white/[0.03] text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            {id === 'all' ? 'All' : id === 'in' ? 'Money in' : 'Money out'}
                          </button>
                        ))}
                        {tx.loading && <Loader2 className={`h-3.5 w-3.5 animate-spin ${accent.spinner}`} />}
                        <button
                          type="button"
                          onClick={() => onShowInLedger({ walletId: wallet.walletId, direction })}
                          className="ml-auto inline-flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white"
                          title="Search, filter by date, type or amount, and export every entry of this wallet"
                        >
                          <Filter className="h-3 w-3" /> Open in ledger
                        </button>
                        <button
                          type="button"
                          disabled={!tx.page?.items.length}
                          onClick={() => exportLedger(tx.page?.items || [], `wallet-${wallet.walletId.slice(0, 8)}-ledger.csv`)}
                          className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white disabled:opacity-40"
                        >
                          <Download className="h-3 w-3" /> Export page
                        </button>
                      </div>
                      {tx.error && <p className="px-3 py-2 text-xs text-red-300">{tx.error}</p>}
                      <ul className="divide-y divide-white/[0.04]">
                        {(tx.page?.items || []).map((e) => {
                          const counterparty = e.direction === 'in' ? e.source : e.destination;
                          const open = expanded === e.id;
                          // This wallet's side of the row (an internal move touches it once).
                          const ownBalance =
                            e.balances?.source?.walletId === walletId
                              ? e.balances.source
                              : e.balances?.destination?.walletId === walletId
                                ? e.balances.destination
                                : null;
                          return (
                            <li key={e.id}>
                              {/* A div, not a button: the link chips inside are buttons. */}
                              <div
                                role="button"
                                tabIndex={0}
                                aria-expanded={open}
                                onClick={() => setExpanded(open ? null : e.id)}
                                onKeyDown={(ev) => {
                                  if (ev.target !== ev.currentTarget) return;
                                  if (ev.key === 'Enter' || ev.key === ' ') {
                                    ev.preventDefault();
                                    setExpanded(open ? null : e.id);
                                  }
                                }}
                                className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left hover:bg-white/[0.02]"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm text-white">{entryTitle(e)}</p>
                                  <p className="truncate text-[11px] text-zinc-500">
                                    {formatDateTime(e.createdAt)} ·{' '}
                                    {e.isAdjustment || e.feeFor ? entrySubtitle(e) : `${e.direction === 'in' ? 'from' : 'to'} ${counterparty.name}`}
                                  </p>
                                  <LedgerLinkChips entry={e} onOpenTransaction={onOpenTransaction} />
                                </div>
                                <StatusPill status={e.status} />
                                <span className="flex shrink-0 flex-col items-end">
                                  <LedgerAmount entry={e} />
                                  <BalanceChange balance={ownBalance} />
                                </span>
                              </div>
                              {open && (
                                <div className="border-t border-white/[0.04] bg-[#0f1016] px-3 py-3">
                                  {!e.isAdjustment && (
                                    <div className="mb-3 grid gap-3 sm:grid-cols-2">
                                      <PartyCell party={e.source} />
                                      <PartyCell party={e.destination} />
                                    </div>
                                  )}
                                  <LedgerEntryDetail
                                    entry={e}
                                    currentWalletId={walletId}
                                    onOpenWallet={(id) => {
                                      if (id !== walletId) onOpenWallet(id);
                                    }}
                                    onOpenTransaction={onOpenTransaction}
                                    onShowInLedger={onShowInLedger}
                                  />
                                </div>
                              )}
                            </li>
                          );
                        })}
                        {!tx.loading && !tx.page?.items.length && (
                          <li className="px-3 py-8 text-center text-sm text-zinc-500">No transactions in this view.</li>
                        )}
                      </ul>
                      <Pager total={tx.page?.total || 0} limit={TX_PAGE} offset={txOffset} onChange={setTxOffset} loading={tx.loading} />
                    </div>
                  )}

                  {section === 'adjustments' && (
                    <ul className="space-y-2">
                      {detail.adjustments.map((a) => (
                        <li key={a.id}>
                          <button
                            type="button"
                            disabled={!a.creditTransactionId}
                            onClick={() => a.creditTransactionId && onOpenTransaction(a.creditTransactionId)}
                            title={a.creditTransactionId ? 'Open the ledger entry' : undefined}
                            className="flex w-full items-start justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left transition enabled:hover:border-white/20 disabled:cursor-default"
                          >
                            <span className="min-w-0">
                              <span className="block text-sm text-white">{a.reason || 'No reason'}</span>
                              <span className="block text-[11px] text-zinc-500">
                                {a.actorName}
                                {a.actorRole ? ` · ${a.actorRole}` : ''} · {formatDateTime(a.createdAt)}
                                {a.sourceTable === 'tickets' ? ' · from a support ticket' : ''}
                              </span>
                            </span>
                            <span className="flex shrink-0 items-start gap-2 text-right">
                              <span>
                                <span className={`block font-semibold tabular-nums ${a.delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatSigned(a.delta)}</span>
                                {a.balanceAfter != null && <span className="block text-[10px] text-zinc-600">after: {formatCredits(a.balanceAfter)}</span>}
                              </span>
                              {a.creditTransactionId && <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 text-zinc-600" />}
                            </span>
                          </button>
                        </li>
                      ))}
                      {!detail.adjustments.length && <p className="py-8 text-center text-sm text-zinc-500">No audited staff adjustments.</p>}
                    </ul>
                  )}

                  {section === 'holds' && (
                    <ul className="space-y-2">
                      {insights.holdHistory.map((h) => (
                        <li key={h.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <p className={`text-sm font-medium ${h.kind === 'hold' ? 'text-amber-200' : 'text-emerald-200'}`}>
                              {h.kind === 'hold' ? 'Held' : 'Released'} {formatCredits(h.credits)} credits
                              {h.kind === 'hold' && (h.until ? ` · until ${formatDate(h.until)}` : ' · until review')}
                              {h.source === 'hold_expired' ? ' · hold ended' : ''}
                            </p>
                            <p className="shrink-0 text-[11px] text-zinc-500">{formatDateTime(h.createdAt)}</p>
                          </div>
                          {h.reason && <p className="mt-1 text-xs text-zinc-400">{h.reason}</p>}
                          <p className="mt-1 text-[10px] text-zinc-600">
                            {h.actorName}
                            {h.actorRole ? ` · ${h.actorRole}` : ''}
                          </p>
                        </li>
                      ))}
                      {!insights.holdHistory.length && <p className="py-8 text-center text-sm text-zinc-500">No holds on record.</p>}
                    </ul>
                  )}

                  {section === 'cashouts' && (
                    <ul className="space-y-2">
                      {insights.cashouts.map((c) => (
                        <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                          <div className="min-w-0">
                            <p className="font-mono text-xs text-zinc-300">{c.referenceId}</p>
                            <p className="text-[11px] text-zinc-500">
                              {formatDateTime(c.createdAt)}
                              {c.channel ? ` · ${c.channel}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusPill status={c.status} />
                            <span className="font-semibold tabular-nums text-white">{formatCredits(c.credits)}</span>
                          </div>
                        </li>
                      ))}
                      {!insights.cashouts.length && (
                        <p className="py-8 text-center text-sm text-zinc-500">
                          {wallet.accountType === 'User' ? 'No cashouts yet.' : 'Only user accounts can cash out.'}
                        </p>
                      )}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {wallet && dialog === 'adjust' && <AdjustCreditsDialog wallet={wallet} onClose={() => setDialog(null)} onDone={afterAction} />}
      {wallet && dialog === 'hold' && <HoldCreditsDialog wallets={[wallet]} onClose={() => setDialog(null)} onDone={afterAction} />}
      {wallet && dialog === 'release' && <ReleaseHoldDialog wallets={[wallet]} onClose={() => setDialog(null)} onDone={afterAction} />}
      {profileUser && <UserOverviewModal user={profileUser} onClose={() => setProfileUser(null)} />}
      {profileTeam && <TeamOverviewModal team={profileTeam} onClose={() => setProfileTeam(null)} />}
    </>
  );
}

/**
 * Balance vs. what the ledger explains. A gap means credits changed outside the ledger
 * (seed or developer credits, or adjustments made before they were audited).
 */
function LedgerCheck({ total, ledgerNet, unexplained, unsigned }: { total: number; ledgerNet: number; unexplained: number; unsigned: number }) {
  const balanced = unexplained === 0 && unsigned === 0;
  return (
    <div
      className={`mt-3 flex flex-wrap items-start gap-2 rounded-lg px-3 py-2 text-[11px] ${
        balanced ? 'bg-emerald-500/[0.06] text-emerald-200' : 'bg-amber-500/[0.06] text-amber-100'
      }`}
    >
      {balanced ? <Check className="mt-0.5 h-3.5 w-3.5" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />}
      <p className="min-w-0 flex-1">
        Ledger check: balance {formatCredits(total)} · ledger explains {formatCredits(ledgerNet)}
        {balanced
          ? ' — every credit is accounted for.'
          : `${unexplained !== 0 ? ` · ${formatSigned(unexplained)} unexplained` : ''}${
              unsigned ? ` · ${unsigned} adjustment${unsigned === 1 ? '' : 's'} without a recorded direction` : ''
            }. Credits changed outside the audited ledger (seeded or developer credits, or older adjustments).`}
      </p>
    </div>
  );
}
