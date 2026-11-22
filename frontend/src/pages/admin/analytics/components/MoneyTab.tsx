import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, Coins, CreditCard, Landmark, Scale } from 'lucide-react';
import type { LedgerKind, PlatformAnalytics } from '../analyticsTypes';
import {
  SERIES_COLORS,
  bucketTitle,
  fmtAge,
  fmtCredits,
  fmtInt,
  fmtPhp,
  fmtPhpShort,
  seriesLabels,
  sumKpis,
} from '../analyticsFormat';
import { MetricRows, Notice, Panel, SimpleTable, StatTile } from '../analyticsUi';
import { InfoButton } from '../analyticsInfo';
import { LineChart, VerticalBarChart } from './AnalyticsCharts';
import FinanceLedger from './FinanceLedger';
import EarningsSection from './EarningsSection';

const FEE_LABELS: Record<string, string> = {
  Fee: 'Contract, gig & marketplace commissions',
  'Job Posting Fee': 'Job posting fees',
  'Proposal Fee': 'Proposal fees',
  'Service Posting Fee': 'Gig posting fees',
};

const linkCls = 'text-xs font-medium text-rose-300 hover:text-rose-200';

export default function MoneyTab({
  data,
  ledgerKind,
  onLedgerKindChange,
}: {
  data: PlatformAnalytics;
  ledgerKind: LedgerKind;
  onLedgerKindChange: (kind: LedgerKind) => void;
}) {
  const { summary, money, series, range } = data;
  const { topups, subscriptions, fees, cashouts, credits } = money;
  const labels = seriesLabels(series, range.bucket);
  const titles = series.map((p) => bucketTitle(p, range.bucket));
  const cashIn = sumKpis(summary.topupRevenuePhp, summary.subscriptionRevenuePhp);
  const feeKpi = summary.feeRevenueCredits;
  const showRecords = (kind: LedgerKind) => {
    onLedgerKindChange(kind);
    window.requestAnimationFrame(() =>
      document.getElementById('analytics-records')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    );
  };

  return (
    <div className="space-y-6">
      <EarningsSection data={data} />

      <div className="console-stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatTile
          label="Cash in"
          info="cashIn"
          icon={ArrowDownLeft}
          value={cashIn.value}
          kpi={cashIn}
          format={fmtPhpShort}
          animate={false}
          sub="Top-ups and subscriptions"
        />
        <StatTile
          label="Cash out"
          info="cashOut"
          icon={ArrowUpRight}
          value={summary.cashoutsPaidPhp.value}
          kpi={summary.cashoutsPaidPhp}
          trend="neutral"
          format={fmtPhpShort}
          animate={false}
          sub="Cashouts paid to members"
        />
        <StatTile
          label="Net cash"
          info="netCash"
          icon={Scale}
          value={money.cash.netPhp}
          format={fmtPhpShort}
          animate={false}
          sub="In minus out for the period"
        />
        <StatTile
          label="Top-up sales"
          info="topupSales"
          icon={Coins}
          value={summary.topupRevenuePhp.value}
          kpi={summary.topupRevenuePhp}
          format={fmtPhpShort}
          animate={false}
          sub={topups ? `${fmtInt(topups.buyers)} buyers · ${fmtCredits(topups.creditsIssued)}` : undefined}
        />
        <StatTile
          label="Subscriptions"
          info="subscriptionRevenue"
          icon={CreditCard}
          value={summary.subscriptionRevenuePhp.value}
          kpi={summary.subscriptionRevenuePhp}
          format={fmtPhpShort}
          animate={false}
          sub={subscriptions ? `${fmtPhpShort(subscriptions.mrrPhp)} monthly recurring` : undefined}
        />
        <StatTile
          label="Credits outstanding"
          info="creditsOutstanding"
          icon={Landmark}
          value={credits ? credits.liabilityPhp : null}
          format={fmtPhpShort}
          animate={false}
          sub={credits ? `${fmtCredits(credits.circulating)} held by members` : undefined}
        />
      </div>

      <Panel title="Cash flow" info="cashFlow" subtitle={`Pesos per ${range.bucket}. Top-ups by paid date, subscriptions by invoice date, cashouts by request date.`}>
        <LineChart
          labels={labels}
          tooltipLabels={titles}
          formatValue={fmtPhp}
          series={[
            { label: 'Top-ups', color: SERIES_COLORS.topups, values: series.map((p) => p.topupPhp) },
            { label: 'Subscriptions', color: SERIES_COLORS.subscriptions, values: series.map((p) => p.subscriptionPhp) },
            { label: 'Cashouts', color: SERIES_COLORS.cashouts, values: series.map((p) => p.cashoutPhp) },
          ]}
        />
      </Panel>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="Top-ups"
          info="topupOrders"
          subtitle="Orders placed in this period"
          action={
            <button type="button" className={linkCls} onClick={() => showRecords('topups')}>
              View records ↓
            </button>
          }
        >
          {topups ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <MetricRows
                rows={[
                  ['Paid orders', fmtInt(topups.paidCount)],
                  ['Paid', fmtPhp(topups.paidPhp)],
                  ['Average order', fmtPhp(topups.paidCount ? topups.paidPhp / topups.paidCount : 0)],
                  ['Credits issued', fmtCredits(topups.creditsIssued), undefined, 'creditsIssued'],
                  ['Still pending', fmtInt(topups.pendingCount)],
                  ['Failed or expired', fmtInt(topups.failedCount)],
                ]}
              />
              <div>
                <p className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  By payment channel
                  <InfoButton id="paymentChannel" />
                </p>
                {topups.byChannel.length ? (
                  <MetricRows rows={topups.byChannel.map((c) => [c.channel, fmtPhp(c.php), `${fmtInt(c.count)} orders`])} />
                ) : (
                  <p className="py-4 text-sm text-zinc-500">No paid top-ups in this period.</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Top-up figures could not be loaded.</p>
          )}
        </Panel>

        <Panel
          title="Subscriptions"
          info="planCounts"
          subtitle="Members on each plan right now"
          action={
            <Link to="/admin/system-settings?tab=economy" className={linkCls}>
              Edit plans →
            </Link>
          }
        >
          {subscriptions ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  ['Paying', subscriptions.activePaid],
                  ['Canceling', subscriptions.canceling],
                  ['In trial', subscriptions.trialing],
                  ['Free plan', subscriptions.freeMembers],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-[#0c0d12] px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
                    <p className="text-lg font-semibold tabular-nums text-white">{fmtInt(Number(value))}</p>
                  </div>
                ))}
              </div>
              <SimpleTable
                columns={[{ label: 'Plan' }, { label: 'Price' }, { label: 'Members', align: 'right' }, { label: 'Monthly', align: 'right' }]}
                rows={subscriptions.plans.map((p) => [
                  <span key="n" className="font-medium text-white">{p.name}</span>,
                  p.paid ? `${fmtPhp(p.pricePhp)} / ${p.billingPeriod.toLowerCase()}` : 'Free',
                  fmtInt(p.members),
                  p.paid ? fmtPhp(p.mrrPhp) : '—',
                ])}
              />
              <MetricRows
                rows={[
                  ['New paid subscriptions', fmtInt(subscriptions.period.started), 'Started in this period', 'subscriptionPeriod'],
                  ['Cancelled', fmtInt(subscriptions.period.canceled), 'Cancelled in this period'],
                  ['Renewals charged', fmtInt(subscriptions.period.paidInvoices)],
                  ['Renewals failed', fmtInt(subscriptions.period.failedInvoices)],
                  ['Upgrade payments', fmtInt(subscriptions.period.upgradePayments)],
                ]}
              />
              <p className="flex items-center gap-1.5 text-[11px] text-zinc-600">
                Monthly recurring revenue uses list prices of current paying members.
                <InfoButton id="mrr" />
              </p>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Subscription figures could not be loaded.</p>
          )}
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel
          title="Platform fees"
          info="feeTypes"
          subtitle="Credits collected in this period, net of refunds"
          action={
            <Link to="/admin/credit-economy?tab=ledger" className={linkCls}>
              Credit ledger →
            </Link>
          }
        >
          {fees ? (
            <>
              <p className="text-2xl font-semibold tabular-nums text-white">{fmtCredits(fees.netCredits)}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500">
                ≈ {fmtPhp(fees.netCredits * money.creditValuePhp)} at {fmtPhp(money.creditValuePhp)} per credit
                <InfoButton id="creditValue" />
              </p>
              <div className="mt-4">
                <MetricRows
                  rows={fees.byType.map((f) => [
                    FEE_LABELS[f.type] || f.type,
                    fmtCredits(f.netCredits),
                    f.refundedCredits ? `${fmtCredits(f.grossCredits)} charged · ${fmtCredits(f.refundedCredits)} refunded` : `${fmtInt(f.count)} charges`,
                  ])}
                />
              </div>
              {feeKpi.previous != null && (
                <p className="mt-3 text-[11px] text-zinc-600">Previous period: {fmtCredits(feeKpi.previous)}. Reversed fees are excluded.</p>
              )}
            </>
          ) : (
            <p className="text-sm text-zinc-500">Fee figures could not be loaded.</p>
          )}
        </Panel>

        <Panel
          title="Cashouts"
          info="cashoutBreakdown"
          subtitle="Requested in this period"
          action={
            <button type="button" className={linkCls} onClick={() => showRecords('cashouts')}>
              View records ↓
            </button>
          }
        >
          {cashouts ? (
            <>
              <MetricRows
                rows={[
                  ['Paid out', fmtPhp(cashouts.paidPhp), `${fmtInt(cashouts.paidCount)} cashouts · ${fmtInt(cashouts.earners)} members`],
                  ['Credits redeemed', fmtCredits(cashouts.paidCredits)],
                  ['Average payout', fmtPhp(cashouts.averagePhp)],
                  ['Failed or returned', fmtInt(cashouts.failedCount), cashouts.failedCredits ? `${fmtCredits(cashouts.failedCredits)}` : undefined],
                ]}
              />
              <div className="mt-4 rounded-xl border border-white/[0.06] bg-[#0c0d12] px-4 py-3">
                <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  In flight now
                  <InfoButton id="inFlight" />
                </p>
                <p className="mt-1 text-sm text-white">
                  {fmtInt(cashouts.inFlight.count)} cashouts · {fmtPhp(cashouts.inFlight.php)}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {cashouts.inFlight.count
                    ? `Oldest waiting ${fmtAge(cashouts.inFlight.oldestAt)} · ${fmtInt(cashouts.inFlight.stale)} over 24 hours`
                    : 'Nothing waiting'}
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-zinc-500">Cashout figures could not be loaded.</p>
          )}
        </Panel>

        <Panel
          title="Credits"
          info="creditBalances"
          subtitle="Balances right now"
          action={
            <Link to="/admin/credit-economy" className={linkCls}>
              Credits desk →
            </Link>
          }
        >
          {credits ? (
            <>
              <MetricRows
                rows={[
                  ['Held by members', fmtCredits(credits.circulating), `${fmtCredits(credits.held)} of it on staff hold`],
                  ['In contract escrow', fmtCredits(credits.escrow)],
                  ['Platform wallet', fmtCredits(credits.platform)],
                  ['Members could cash out', fmtPhp(credits.liabilityPhp), `At ${fmtPhp(money.creditValuePhp)} per credit, before fees`, 'creditsOutstanding'],
                ]}
              />
              {credits.negativeWallets > 0 && (
                <div className="mt-4">
                  <Notice tone="warning">
                    {fmtInt(credits.negativeWallets)} wallet{credits.negativeWallets === 1 ? '' : 's'} below zero.{' '}
                    <Link to="/admin/credit-economy?tab=wallets" className="underline">
                      Review
                    </Link>
                  </Notice>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-zinc-500">Credit balances could not be loaded.</p>
          )}
        </Panel>
      </div>

      <Panel title="Fee revenue over time" info="feeChart" subtitle={`Net fee credits per ${range.bucket}`}>
        <VerticalBarChart
          data={series.map((p, i) => ({ label: labels[i], value: Math.max(0, p.feeCredits) }))}
          tooltipLabels={titles}
          color={SERIES_COLORS.fees}
          formatValue={fmtCredits}
        />
      </Panel>

      <div id="analytics-records" className="scroll-mt-40">
        <FinanceLedger key={ledgerKind} kind={ledgerKind} range={range} onKindChange={onLedgerKindChange} />
      </div>

      <p className="text-[11px] text-zinc-600">
        Figures are in Philippine pesos as recorded by the payment provider. Older subscription invoices that were saved in pesos instead of
        centavos are corrected when their amount matches the plan price.
      </p>
    </div>
  );
}
