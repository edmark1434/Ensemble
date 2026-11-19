import { useState, type ReactNode } from 'react';
import { ArrowDownLeft, ArrowUpRight, Coins, Landmark, Lock, ShieldCheck, Wallet } from 'lucide-react';
import { LineChart } from '@/pages/admin/analytics/components/AnalyticsCharts';
import {
  formatCredits,
  formatDateTime,
  formatPhp,
  formatRelative,
  formatSigned,
  LedgerAmount,
  localDateDaysAgo,
  Panel,
  PartyCell,
  StatTile,
  StatusPill,
} from './economyUi';
import type { AccountTotal, EconomyOverview, EconomyTab, EconomyVariant } from './creditEconomyTypes';

type OverviewTabProps = {
  data: EconomyOverview;
  variant: EconomyVariant;
  onOpenTab: (tab: EconomyTab, filters?: Record<string, string>) => void;
  onOpenWallet: (walletId: string) => void;
  onOpenTransaction: (transactionId: string) => void;
};

function FlowRow({ label, value, tone = 'text-zinc-200', hint }: { label: string; value: number; tone?: string; hint?: string }) {
  return (
    <li className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-zinc-400">
        {label}
        {hint && <span className="ml-1 text-[10px] text-zinc-600">{hint}</span>}
      </span>
      <span className={`font-semibold tabular-nums ${tone}`}>{formatCredits(value)}</span>
    </li>
  );
}

function InFlightRow({ label, count, credits, note, warn }: { label: string; count: number; credits: number; note?: ReactNode; warn?: boolean }) {
  return (
    <li className="flex items-start justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="text-sm text-zinc-200">{label}</p>
        {note && <p className={`text-[11px] ${warn ? 'text-amber-300' : 'text-zinc-500'}`}>{note}</p>}
      </div>
      <div className="text-right">
        <p className="font-semibold tabular-nums text-white">{formatCredits(credits)}</p>
        <p className="text-[10px] text-zinc-600">{count.toLocaleString()} item{count === 1 ? '' : 's'}</p>
      </div>
    </li>
  );
}

const LEADER_TABS = [
  { id: 'spenders', label: 'Top spenders', hint: 'Credits paid out of their wallet in 30 days (purchases, escrow, fees, transfers; not cashouts)' },
  { id: 'earners', label: 'Top earners', hint: 'Credits received from other members or escrow in 30 days (refunds and top-ups excluded)' },
  { id: 'holders', label: 'Largest balances', hint: 'Spendable plus held credits right now' },
] as const;

function Leaderboard({ leaders, onOpenWallet }: { leaders: EconomyOverview['leaders']; onOpenWallet: (id: string) => void }) {
  const [tab, setTab] = useState<(typeof LEADER_TABS)[number]['id']>('spenders');
  const rows: AccountTotal[] = leaders[tab];
  const meta = LEADER_TABS.find((t) => t.id === tab)!;
  return (
    <Panel title="Leaderboard" subtitle={meta.hint}>
      <div className="mb-3 flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
        {LEADER_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition ${
              tab === t.id ? 'bg-white/[0.08] text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <ol className="space-y-1">
        {rows.map((r, i) => (
          <li key={`${tab}-${r.accountId}`}>
            <button
              type="button"
              disabled={!r.walletId}
              onClick={() => r.walletId && onOpenWallet(r.walletId)}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-white/[0.03] disabled:cursor-default"
            >
              <span className="w-5 text-right text-xs tabular-nums text-zinc-600">{i + 1}</span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-xs font-bold text-zinc-200">
                {(r.name || '?').charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-white">{r.name}</span>
                <span className="block truncate text-[10px] text-zinc-600">
                  @{r.username || '—'} · {r.accountType}
                  {r.transactions != null ? ` · ${r.transactions} entr${r.transactions === 1 ? 'y' : 'ies'}` : ''}
                </span>
              </span>
              <span className="text-sm font-semibold tabular-nums text-emerald-300">{formatCredits(r.credits)}</span>
            </button>
          </li>
        ))}
        {!rows.length && <li className="py-6 text-center text-sm text-zinc-500">No activity in the last 30 days.</li>}
      </ol>
    </Panel>
  );
}

export default function OverviewTab({ data, onOpenTab, onOpenWallet, onOpenTransaction }: OverviewTabProps) {
  const { supply, flow, inFlight, creditValuePhp } = data;
  // The flow counts cover the last `flow.days` days; their links open the same window.
  const flowFrom = localDateDaysAgo(flow.days - 1);
  const php = (n: number) => formatPhp(n, creditValuePhp);
  const labels = flow.series.map((p) => {
    const d = new Date(`${p.day}T00:00:00`);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Credits held by members"
          value={formatCredits(supply.circulating)}
          icon={<Coins className="h-5 w-5 text-emerald-400" />}
          hint={
            <>
              {formatCredits(supply.spendable)} spendable · {formatCredits(supply.held)} on hold
              {php(supply.circulating) && <span className="block text-zinc-600">{php(supply.circulating)}</span>}
            </>
          }
          onClick={() => onOpenTab('wallets')}
        />
        <StatTile
          label="Locked in escrow"
          value={formatCredits(supply.escrow)}
          icon={<Landmark className="h-5 w-5 text-sky-400" />}
          hint={`${supply.fundedEscrowWallets.toLocaleString()} funded contract wallet${supply.fundedEscrowWallets === 1 ? '' : 's'}`}
          onClick={() => onOpenTab('ledger', { kind: 'escrow' })}
        />
        <StatTile
          label="On hold"
          value={formatCredits(supply.holds.credits)}
          tone={supply.holds.overdue ? 'text-red-300' : supply.holds.wallets ? 'text-amber-300' : 'text-white'}
          icon={<Lock className="h-5 w-5 text-amber-400" />}
          hint={`${supply.holds.wallets} wallet${supply.holds.wallets === 1 ? '' : 's'}${supply.holds.overdue ? ` · ${supply.holds.overdue} overdue` : ''}`}
          onClick={() => onOpenTab('holds')}
        />
        <StatTile
          label="Platform wallet"
          value={formatCredits(supply.platform)}
          icon={<ShieldCheck className="h-5 w-5 text-violet-400" />}
          hint="Fees and cashouts collected, top-ups issued"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Panel
            title={`Credit flow · last ${flow.days} days`}
            subtitle="Issued: platform → members, plus staff grants. Collected: members → platform, plus staff deductions."
          >
            <LineChart
              labels={labels}
              height={220}
              series={[
                { label: 'Issued', color: '#34d399', values: flow.series.map((p) => p.issued) },
                { label: 'Collected', color: '#f87171', values: flow.series.map((p) => p.collected) },
                { label: 'Member volume', color: '#a1a1aa', values: flow.series.map((p) => p.volume) },
              ]}
            />
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300/80">
                  <ArrowDownLeft className="h-3 w-3" /> Issued {formatCredits(flow.issued.total)}
                </p>
                <ul className="mt-1 divide-y divide-white/[0.04]">
                  <FlowRow label="Top-ups" value={flow.issued.topups} />
                  <FlowRow label="Other platform payouts" value={flow.issued.platformPayouts} />
                  <FlowRow label="Staff grants" value={flow.issued.staffGrants} />
                </ul>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-red-300/80">
                  <ArrowUpRight className="h-3 w-3" /> Collected {formatCredits(flow.collected.total)}
                </p>
                <ul className="mt-1 divide-y divide-white/[0.04]">
                  <FlowRow label="Fees" value={flow.collected.fees} />
                  <FlowRow label="Cashouts" value={flow.collected.cashouts} />
                  <FlowRow label="Other" value={flow.collected.other} />
                  <FlowRow label="Staff deductions" value={flow.collected.staffDeductions} />
                </ul>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                  <Wallet className="h-3 w-3" /> Between members
                </p>
                <ul className="mt-1 divide-y divide-white/[0.04]">
                  <FlowRow label="Escrow funded" value={flow.escrowFunded} />
                  <FlowRow label="Escrow paid out" value={flow.escrowPaidOut} />
                  <FlowRow label="Marketplace sales" value={flow.marketplace} />
                  <FlowRow label="Refunds" value={flow.refunds} />
                </ul>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs">
              <span className="text-zinc-400">
                Net supply change{' '}
                <span className={`font-semibold tabular-nums ${flow.net >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{formatSigned(flow.net)}</span>
              </span>
              <button type="button" onClick={() => onOpenTab('ledger', { from: flowFrom })} className="text-zinc-400 hover:text-white">
                Ledger rows <span className="font-semibold text-white">{flow.rows.total.toLocaleString()}</span>
              </button>
              <button type="button" onClick={() => onOpenTab('ledger', { status: 'Pending', from: flowFrom, sort: 'oldest' })} className="text-zinc-400 hover:text-white">
                Pending <span className="font-semibold text-amber-300">{flow.rows.pending.toLocaleString()}</span>
              </button>
              <button type="button" onClick={() => onOpenTab('ledger', { status: 'Failed', from: flowFrom })} className="text-zinc-400 hover:text-white">
                Failed <span className="font-semibold text-red-300">{flow.rows.failed.toLocaleString()}</span>
              </button>
              <button type="button" onClick={() => onOpenTab('ledger', { status: 'Reversed', from: flowFrom })} className="text-zinc-400 hover:text-white">
                Reversed <span className="font-semibold text-violet-300">{flow.rows.reversed.toLocaleString()}</span>
              </button>
            </div>
          </Panel>

          <Panel
            title="Latest ledger entries"
            subtitle="Every credit movement, both parties shown"
            padded={false}
            action={
              <button type="button" onClick={() => onOpenTab('ledger')} className="text-xs text-zinc-400 hover:text-white">
                Open ledger →
              </button>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-[#0f1016] text-[10px] uppercase tracking-wide text-zinc-500">
                    <th className="px-4 py-2.5">When</th>
                    <th className="px-4 py-2.5">What</th>
                    <th className="px-4 py-2.5">From</th>
                    <th className="px-4 py-2.5">To</th>
                    <th className="px-4 py-2.5 text-right">Amount</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentLedger.map((e) => (
                    <tr
                      key={e.id}
                      onClick={() => onOpenTransaction(e.id)}
                      title="Open this entry and everything linked to it"
                      className="cursor-pointer border-b border-white/[0.04] hover:bg-white/[0.02]"
                    >
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-zinc-500" title={formatDateTime(e.createdAt)}>
                        {formatRelative(e.createdAt)}
                      </td>
                      <td className="px-4 py-2.5 text-zinc-200">{e.isAdjustment ? 'Staff adjustment' : e.type}</td>
                      <td className="max-w-[180px] px-4 py-2.5"><PartyCell party={e.source} /></td>
                      <td className="max-w-[180px] px-4 py-2.5">
                        {e.isAdjustment ? <span className="text-xs text-zinc-500">Same wallet</span> : <PartyCell party={e.destination} />}
                      </td>
                      <td className="px-4 py-2.5 text-right"><LedgerAmount entry={e} /></td>
                      <td className="px-4 py-2.5"><StatusPill status={e.status} /></td>
                    </tr>
                  ))}
                  {!data.recentLedger.length && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-500">No credit movements yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Not settled yet" subtitle="Credits that are on their way somewhere">
            <ul className="divide-y divide-white/[0.04]">
              <InFlightRow
                label="Pending ledger entries"
                count={inFlight.pendingLedger.count}
                credits={inFlight.pendingLedger.credits}
                warn={inFlight.pendingLedger.stale > 0}
                note={
                  inFlight.pendingLedger.stale
                    ? `${inFlight.pendingLedger.stale} older than 24 hours`
                    : inFlight.pendingLedger.oldestAt
                      ? `Oldest ${formatRelative(inFlight.pendingLedger.oldestAt)}`
                      : 'None'
                }
              />
              <InFlightRow
                label="Cashouts in progress"
                count={inFlight.cashouts.count}
                credits={inFlight.cashouts.credits}
                warn={inFlight.cashouts.stale > 0}
                note={
                  inFlight.cashouts.stale
                    ? `${inFlight.cashouts.stale} unpaid after 24 hours`
                    : inFlight.cashouts.failedThisWeek
                      ? `${inFlight.cashouts.failedThisWeek} failed this week`
                      : 'Waiting on the payout provider'
                }
              />
              <InFlightRow
                label="Dispute payouts scheduled"
                count={inFlight.disputePayouts.scheduled}
                credits={inFlight.disputePayouts.scheduledCredits}
                warn={inFlight.disputePayouts.failed > 0}
                note={
                  inFlight.disputePayouts.failed
                    ? `${inFlight.disputePayouts.failed} failed (${formatCredits(inFlight.disputePayouts.failedCredits)} credits)`
                    : inFlight.disputePayouts.nextReleaseAt
                      ? `Next release ${formatRelative(inFlight.disputePayouts.nextReleaseAt)}`
                      : 'None scheduled'
                }
              />
            </ul>
          </Panel>

          <Panel title="Wallet health">
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between text-zinc-400">
                <span>Account wallets</span>
                <span className="font-semibold text-white">{supply.walletCount.toLocaleString()}</span>
              </li>
              <li className="flex justify-between text-[11px] text-zinc-500">
                <span>
                  {supply.userWallets.toLocaleString()} users · {supply.teamWallets.toLocaleString()} teams
                  {data.viewer.canSeeStaffWallets ? ` · ${supply.staffWallets.toLocaleString()} staff` : ''}
                </span>
              </li>
              <li className="flex justify-between text-zinc-400">
                <span>Average / median balance</span>
                <span className="font-semibold tabular-nums text-white">
                  {formatCredits(supply.averageBalance)} / {formatCredits(supply.medianBalance)}
                </span>
              </li>
              <li className="flex justify-between text-zinc-400">
                <span>Top 10 wallets hold</span>
                <span className="font-semibold tabular-nums text-white">{Math.round(supply.topTenShare * 100)}%</span>
              </li>
              <li>
                <button type="button" onClick={() => onOpenTab('wallets', { balance: 'empty' })} className="flex w-full justify-between text-zinc-400 hover:text-white">
                  <span>Empty wallets</span>
                  <span className="font-semibold tabular-nums text-white">{supply.emptyWallets.toLocaleString()}</span>
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onOpenTab('wallets', { balance: 'negative' })} className="flex w-full justify-between text-zinc-400 hover:text-white">
                  <span>Negative balances</span>
                  <span className={`font-semibold tabular-nums ${supply.negativeWallets ? 'text-red-300' : 'text-white'}`}>
                    {supply.negativeWallets.toLocaleString()}
                  </span>
                </button>
              </li>
              <li className="border-t border-white/[0.06] pt-2">
                <button type="button" onClick={() => onOpenTab('holds', { hold: 'expiring' })} className="flex w-full justify-between text-zinc-400 hover:text-white">
                  <span>Holds releasing ≤ 7 days</span>
                  <span className="font-semibold tabular-nums text-white">{supply.holds.expiringSoon}</span>
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onOpenTab('holds', { hold: 'indefinite' })} className="flex w-full justify-between text-zinc-400 hover:text-white">
                  <span>Holds until review</span>
                  <span className="font-semibold tabular-nums text-white">{supply.holds.indefinite}</span>
                </button>
              </li>
            </ul>
          </Panel>

          <Leaderboard leaders={data.leaders} onOpenWallet={onOpenWallet} />

          <Panel
            title="Recent staff adjustments"
            action={
              <button type="button" onClick={() => onOpenTab('ledger', { kind: 'adjustment' })} className="text-xs text-zinc-400 hover:text-white">
                All →
              </button>
            }
          >
            <ul className="space-y-2">
              {data.recentAdjustments.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    disabled={!a.walletId}
                    onClick={() => a.walletId && onOpenWallet(a.walletId)}
                    className="flex w-full items-start justify-between gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-white/[0.03]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-white">{a.name}</span>
                      <span className="block truncate text-[11px] text-zinc-500">{a.reason || 'No reason'}</span>
                      <span className="block text-[10px] text-zinc-600">
                        {a.actorName} · {formatRelative(a.createdAt)}
                      </span>
                    </span>
                    <span className={`shrink-0 text-sm font-semibold tabular-nums ${a.delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatSigned(a.delta)}
                    </span>
                  </button>
                </li>
              ))}
              {!data.recentAdjustments.length && <li className="py-4 text-center text-sm text-zinc-500">No audited adjustments yet.</li>}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
