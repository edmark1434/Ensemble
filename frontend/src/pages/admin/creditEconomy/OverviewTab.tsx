import { useState, type ReactNode } from 'react';
import { ArrowDownLeft, ArrowUpRight, ChevronRight, Coins, Landmark, Lock, ShieldCheck, Users } from 'lucide-react';
import { LineChart } from '@/pages/admin/analytics/components/AnalyticsCharts';
import {
  formatCredits,
  formatDateTime,
  formatPhp,
  formatRelative,
  formatSigned,
  LedgerAmount,
  Panel,
  StatTile,
  StatusPill,
} from './economyUi';
import { entrySubtitle, entryTitle } from './ledgerShared';
import type { AccountTotal, EconomyOverview, EconomyTab, EconomyVariant } from './creditEconomyTypes';

type OverviewTabProps = {
  data: EconomyOverview;
  variant: EconomyVariant;
  onOpenTab: (tab: EconomyTab, filters?: Record<string, string>) => void;
  onOpenWallet: (walletId: string) => void;
  onOpenTransaction: (transactionId: string) => void;
};

/**
 * A figure that opens the rows it was counted from. Every link below uses the same filter
 * the server counted with, so the ledger shows the same number of entries and credits.
 */
function LinkRow({
  label,
  value,
  hint,
  tone = 'text-zinc-100',
  onClick,
  credits = true,
}: {
  label: ReactNode;
  value: number;
  hint?: ReactNode;
  tone?: string;
  onClick?: () => void;
  credits?: boolean;
}) {
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-zinc-300">{label}</span>
        {hint && <span className="block text-[11px] text-zinc-500">{hint}</span>}
      </span>
      <span className={`shrink-0 font-semibold tabular-nums ${value ? tone : 'text-zinc-600'}`}>
        {credits ? formatCredits(value) : value.toLocaleString()}
      </span>
      {onClick && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-600 transition group-hover:text-zinc-300" />}
    </>
  );
  const base = 'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left';
  return (
    <li>
      {onClick ? (
        <button type="button" onClick={onClick} className={`group ${base} hover:bg-white/[0.04]`}>
          {body}
        </button>
      ) : (
        <div className={base}>{body}</div>
      )}
    </li>
  );
}

function FlowColumn({ icon, title, total, tone, children }: { icon: ReactNode; title: string; total: number; tone: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-baseline justify-between gap-2 px-2">
        <p className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${tone}`}>
          {icon} {title}
        </p>
        <p className={`text-sm font-bold tabular-nums ${tone}`}>{formatCredits(total)}</p>
      </div>
      <ul>{children}</ul>
    </div>
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
              title="Open this wallet"
            >
              <span className="w-5 text-right text-xs tabular-nums text-zinc-600">{i + 1}</span>
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
  const php = (n: number) => formatPhp(n, creditValuePhp);
  const labels = flow.series.map((p) => {
    const d = new Date(`${p.day}T00:00:00`);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  });

  // Same window, status and category the server counted with.
  const since = String(flow.hours);
  const flowLink = (kind: string) => () => onOpenTab('ledger', { kind, status: 'settled', sinceHours: since });
  const statusLink = (status: string, extra: Record<string, string> = {}) => () =>
    onOpenTab('ledger', { status, sinceHours: since, ...extra });
  const b = flow.between;
  const betweenTotal = b.escrowFunded + b.escrowReleased + b.escrowRefunded + b.sales + b.saleRefunds + b.transfers;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Credits in wallets"
          value={formatCredits(supply.circulating)}
          icon={<Coins className="h-5 w-5 text-emerald-400" />}
          hint={
            <>
              {formatCredits(supply.spendable)} spendable · {formatCredits(supply.held)} on hold
              {php(supply.circulating) && <span className="block text-zinc-600">{php(supply.circulating)}</span>}
            </>
          }
          onClick={() => onOpenTab('wallets', { sort: 'balance_desc' })}
        />
        <StatTile
          label="Locked in escrow"
          value={formatCredits(supply.escrow)}
          icon={<Landmark className="h-5 w-5 text-sky-400" />}
          hint={`${supply.fundedEscrowWallets.toLocaleString()} contract${supply.fundedEscrowWallets === 1 ? '' : 's'} still funded · open their escrow history`}
          onClick={() => onOpenTab('ledger', { kind: 'escrow_open' })}
        />
        <StatTile
          label="On hold by staff"
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
          hint="Fees and cashouts come in, top-ups go out · open its entries"
          onClick={() => onOpenTab('ledger', { kind: 'platform' })}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Panel
            title={`Money movement · last ${flow.days} days`}
            subtitle="Click any figure to see the exact entries behind it. Only settled entries count (completed or reversed)."
          >
            <LineChart
              labels={labels}
              height={200}
              series={[
                { label: 'Issued to members', color: '#34d399', values: flow.series.map((p) => p.issued) },
                { label: 'Collected by platform', color: '#f87171', values: flow.series.map((p) => p.collected) },
                { label: 'All movement', color: '#a1a1aa', values: flow.series.map((p) => p.volume) },
              ]}
            />
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <FlowColumn
                icon={<ArrowDownLeft className="h-3 w-3" />}
                title="Issued to members"
                total={flow.issued.total}
                tone="text-emerald-300"
              >
                <LinkRow label="Top-ups" value={flow.issued.topups} onClick={flowLink('flow_topups')} />
                <LinkRow
                  label="Returned by platform"
                  hint="Refunded fees and cashouts"
                  value={flow.issued.platformRefunds}
                  onClick={flowLink('flow_platform_refunds')}
                />
                <LinkRow label="Other platform payouts" value={flow.issued.platformPayouts} onClick={flowLink('flow_platform_payouts')} />
                <LinkRow label="Staff grants" value={flow.issued.staffGrants} onClick={flowLink('grant')} />
              </FlowColumn>
              <FlowColumn
                icon={<ArrowUpRight className="h-3 w-3" />}
                title="Collected by platform"
                total={flow.collected.total}
                tone="text-red-300"
              >
                <LinkRow
                  label="Platform fees"
                  hint="Sales, escrow, job posts, proposals, gigs"
                  value={flow.collected.fees}
                  onClick={flowLink('flow_fees')}
                />
                <LinkRow label="Cashouts" value={flow.collected.cashouts} onClick={flowLink('flow_cashouts')} />
                <LinkRow label="Other" value={flow.collected.other} onClick={flowLink('flow_other_collected')} />
                <LinkRow label="Staff deductions" value={flow.collected.staffDeductions} onClick={flowLink('deduction')} />
              </FlowColumn>
              <FlowColumn
                icon={<Users className="h-3 w-3" />}
                title="Between members"
                total={betweenTotal}
                tone="text-zinc-200"
              >
                <LinkRow label="Escrow funded" value={flow.between.escrowFunded} onClick={flowLink('flow_escrow_funded')} />
                <LinkRow label="Escrow released" value={flow.between.escrowReleased} onClick={flowLink('flow_escrow_released')} />
                <LinkRow label="Escrow refunded" value={flow.between.escrowRefunded} onClick={flowLink('flow_escrow_refunded')} />
                <LinkRow label="Marketplace sales" value={flow.between.sales} onClick={flowLink('flow_sales')} />
                <LinkRow label="Marketplace refunds" value={flow.between.saleRefunds} onClick={flowLink('flow_sale_refunds')} />
                <LinkRow label="Transfers" value={flow.between.transfers} onClick={flowLink('flow_transfers')} />
              </FlowColumn>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs">
              <span className="text-zinc-400" title="Issued minus collected: how much the credits outside the platform wallet (member wallets plus escrow) grew or shrank">
                Net change{' '}
                <span className={`font-semibold tabular-nums ${flow.net >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{formatSigned(flow.net)}</span>
              </span>
              <span className="hidden h-4 w-px bg-white/[0.08] sm:block" />
              <span className="text-zinc-500">Entries:</span>
              <button type="button" onClick={() => onOpenTab('ledger', { sinceHours: since })} className="text-zinc-400 hover:text-white">
                All <span className="font-semibold text-white">{flow.rows.total.toLocaleString()}</span>
              </button>
              <button type="button" onClick={statusLink('Pending', { sort: 'oldest' })} className="text-zinc-400 hover:text-white">
                Pending <span className="font-semibold text-amber-300">{flow.rows.pending.toLocaleString()}</span>
              </button>
              <button type="button" onClick={statusLink('Failed')} className="text-zinc-400 hover:text-white">
                Failed <span className="font-semibold text-red-300">{flow.rows.failed.toLocaleString()}</span>
              </button>
              <button type="button" onClick={statusLink('Reversed')} className="text-zinc-400 hover:text-white">
                Reversed <span className="font-semibold text-violet-300">{flow.rows.reversed.toLocaleString()}</span>
              </button>
            </div>
          </Panel>

          <Panel
            title="Latest entries"
            padded={false}
            action={
              <button type="button" onClick={() => onOpenTab('ledger')} className="text-xs text-zinc-400 hover:text-white">
                Open ledger →
              </button>
            }
          >
            <ul className="divide-y divide-white/[0.04]">
              {data.recentLedger.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => onOpenTransaction(e.id)}
                    title="Open this entry and everything linked to it"
                    className="group flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-white/[0.02]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-white">{entryTitle(e)}</span>
                      <span className="block truncate text-[11px] text-zinc-500">
                        {e.isAdjustment ? entrySubtitle(e) : `${e.source.name} → ${e.destination.name}`}
                      </span>
                    </span>
                    {e.status !== 'Completed' && <StatusPill status={e.status} />}
                    <span className="w-24 text-right">
                      <LedgerAmount entry={e} />
                      <span className="block text-[10px] text-zinc-600" title={formatDateTime(e.createdAt)}>
                        {formatRelative(e.createdAt)}
                      </span>
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-600 group-hover:text-zinc-300" />
                  </button>
                </li>
              ))}
              {!data.recentLedger.length && <li className="px-4 py-10 text-center text-sm text-zinc-500">No credit movements yet.</li>}
            </ul>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Waiting to settle" subtitle="Credits on their way somewhere">
            <ul>
              <LinkRow
                label="Pending entries"
                hint={
                  inFlight.pendingLedger.stale
                    ? `${inFlight.pendingLedger.stale} older than 24 hours`
                    : inFlight.pendingLedger.oldestAt
                      ? `${inFlight.pendingLedger.count.toLocaleString()} · oldest ${formatRelative(inFlight.pendingLedger.oldestAt)}`
                      : 'None'
                }
                value={inFlight.pendingLedger.credits}
                tone={inFlight.pendingLedger.stale ? 'text-amber-300' : 'text-zinc-100'}
                onClick={() => onOpenTab('ledger', { status: 'Pending', sort: 'oldest' })}
              />
              <LinkRow
                label="Cashouts not paid yet"
                hint={
                  inFlight.cashouts.stale
                    ? `${inFlight.cashouts.stale} unpaid after 24 hours`
                    : `${inFlight.cashouts.count.toLocaleString()} waiting on the payout provider`
                }
                value={inFlight.cashouts.credits}
                tone={inFlight.cashouts.stale ? 'text-amber-300' : 'text-zinc-100'}
                onClick={() => onOpenTab('ledger', { kind: 'cashout_open', sort: 'oldest' })}
              />
              <LinkRow
                label="Dispute payouts scheduled"
                hint={
                  inFlight.disputePayouts.failed
                    ? `${inFlight.disputePayouts.failed} failed · retry on the dispute desk`
                    : inFlight.disputePayouts.nextReleaseAt
                      ? `${inFlight.disputePayouts.scheduled} · next ${formatRelative(inFlight.disputePayouts.nextReleaseAt)} · dispute desk`
                      : 'None scheduled'
                }
                value={inFlight.disputePayouts.scheduledCredits}
                tone={inFlight.disputePayouts.failed ? 'text-red-300' : 'text-zinc-100'}
              />
            </ul>
          </Panel>

          <Panel title="Wallet health">
            <ul>
              <LinkRow label="Account wallets" value={supply.walletCount} credits={false} onClick={() => onOpenTab('wallets')} />
              <LinkRow label="Users" value={supply.userWallets} credits={false} onClick={() => onOpenTab('wallets', { accountType: 'user' })} />
              <LinkRow label="Teams" value={supply.teamWallets} credits={false} onClick={() => onOpenTab('wallets', { accountType: 'team' })} />
              {data.viewer.canSeeStaffWallets && (
                <LinkRow label="Staff" value={supply.staffWallets} credits={false} onClick={() => onOpenTab('wallets', { accountType: 'staff' })} />
              )}
              <LinkRow label="Empty wallets" value={supply.emptyWallets} credits={false} onClick={() => onOpenTab('wallets', { balance: 'empty' })} />
              <LinkRow
                label="Negative balances"
                value={supply.negativeWallets}
                credits={false}
                tone="text-red-300"
                onClick={() => onOpenTab('wallets', { balance: 'negative' })}
              />
              <LinkRow
                label="Holds releasing within 7 days"
                value={supply.holds.expiringSoon}
                credits={false}
                onClick={() => onOpenTab('holds', { hold: 'expiring' })}
              />
              <LinkRow
                label="Holds waiting for review"
                value={supply.holds.indefinite}
                credits={false}
                onClick={() => onOpenTab('holds', { hold: 'indefinite' })}
              />
            </ul>
            <p className="mt-2 border-t border-white/[0.06] px-2 pt-2 text-[11px] text-zinc-500">
              Average {formatCredits(supply.averageBalance)} · median {formatCredits(supply.medianBalance)} · top 10 hold{' '}
              {Math.round(supply.topTenShare * 100)}%
            </p>
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
            <ul className="space-y-1">
              {data.recentAdjustments.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    disabled={!a.creditTransactionId && !a.walletId}
                    onClick={() => (a.creditTransactionId ? onOpenTransaction(a.creditTransactionId) : a.walletId && onOpenWallet(a.walletId))}
                    title={a.creditTransactionId ? 'Open this adjustment' : 'Open this wallet'}
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
