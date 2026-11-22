import { Percent, PiggyBank, Receipt, TrendingUp } from 'lucide-react';
import type { Kpi, PlatformAnalytics } from '../analyticsTypes';
import { SERIES_COLORS, bucketTitle, fmtCredits, fmtPct, fmtPhp, fmtPhpShort, seriesLabels } from '../analyticsFormat';
import { InfoButton } from '../analyticsInfo';
import { MetricRows, Panel, StatTile } from '../analyticsUi';
import { LineChart } from './AnalyticsCharts';

function kpiOf(value: number | null, previous: number | null | undefined): Kpi | null {
  if (value == null) return null;
  const prev = previous ?? null;
  const changePct = prev ? Math.round(((value - prev) / Math.abs(prev)) * 1000) / 10 : null;
  return { value, previous: prev, changePct };
}

function profitTone(value: number | null) {
  if (value == null) return 'text-white';
  return value < 0 ? 'text-rose-300' : 'text-emerald-300';
}

function SectionLabel({ children }: { children: string }) {
  return <p className="mb-1 mt-4 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 first:mt-0">{children}</p>;
}

/** Revenue Ensemble keeps, what it gave away, and the profit left (Money tab). */
export default function EarningsSection({ data }: { data: PlatformAnalytics }) {
  const { money, series, range, summary } = data;
  const { earnings, lifetime, creditValuePhp } = money;
  const labels = seriesLabels(series, range.bucket);
  const titles = series.map((p) => bucketTitle(p, range.bucket));
  const prev = earnings.previous;
  const costKpi = kpiOf(earnings.costPhp, prev?.costPhp);
  const marginKpi = kpiOf(earnings.marginPct, prev?.marginPct);
  const costs = earnings.costs;

  return (
    <>
      <div className="console-stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Platform revenue"
          info="platformRevenue"
          icon={TrendingUp}
          value={summary.platformRevenuePhp.value}
          kpi={summary.platformRevenuePhp}
          format={fmtPhpShort}
          animate={false}
          spark={series.map((p) => p.revenuePhp)}
          sparkColor={SERIES_COLORS.revenue}
          sub="Subscriptions, fees and official asset sales"
        />
        <StatTile
          label="Platform costs"
          info="platformCosts"
          icon={Receipt}
          value={earnings.costPhp}
          kpi={costKpi}
          trend="up-bad"
          format={fmtPhpShort}
          animate={false}
          empty="Could not load"
          spark={series.map((p) => p.costPhp)}
          sparkColor={SERIES_COLORS.costs}
          sub="Credits given out without payment"
        />
        <StatTile
          label="Net profit"
          info="netProfit"
          icon={PiggyBank}
          value={summary.platformProfitPhp?.value ?? null}
          kpi={summary.platformProfitPhp}
          format={fmtPhpShort}
          animate={false}
          empty="Could not load"
          spark={series.map((p) => p.profitPhp)}
          sparkColor={SERIES_COLORS.profit}
          sub={lifetime?.profitPhp != null ? `${fmtPhpShort(lifetime.profitPhp)} lifetime` : 'Revenue minus costs'}
        />
        <StatTile
          label="Profit margin"
          info="profitMargin"
          icon={Percent}
          value={earnings.marginPct}
          kpi={marginKpi}
          format={(n) => fmtPct(n / 100, 1)}
          animate={false}
          sub="Share of revenue kept"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Platform earnings"
          info="earningsStatement"
          subtitle={`${range.label}. Credit amounts at ${fmtPhp(creditValuePhp)} per credit.`}
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <SectionLabel>Revenue</SectionLabel>
              <MetricRows
                rows={[
                  ['Subscriptions', fmtPhp(earnings.revenue.subscriptionsPhp), 'Renewals charged and upgrade payments', 'subscriptionRevenue'],
                  ['Platform fees', fmtPhp(earnings.revenue.feesPhp), 'Commissions, posting and proposal fees, net of refunds', 'feeRevenue'],
                  ['Official asset sales', fmtPhp(earnings.revenue.officialAssetsPhp), 'Ensemble’s own marketplace assets, full price', 'officialAssets'],
                  ['Top-up markup', fmtPhp(earnings.revenue.topupMarkupPhp), 'Paid above the credits’ value', 'topupMarkup'],
                ]}
              />
              <div className="mt-1 flex items-baseline justify-between border-t border-white/[0.1] pt-2 text-sm">
                <span className="font-medium text-zinc-300">Total revenue</span>
                <span className="font-semibold tabular-nums text-white">{fmtPhp(earnings.revenuePhp)}</span>
              </div>
            </div>
            <div>
              <SectionLabel>Costs</SectionLabel>
              {costs ? (
                <>
                  <MetricRows
                    rows={[
                      ['Staff credit grants', fmtPhp(-costs.grantsPhp), fmtCredits(costs.grantCredits)],
                      ['Paid out by the platform', fmtPhp(-costs.payoutsPhp), `${fmtCredits(costs.payoutCredits)} from the platform wallet`],
                      ['Top-up bonus credits', fmtPhp(-costs.topupBonusPhp), 'Credits beyond what was paid', 'topupMarkup'],
                      ['Staff deductions', fmtPhp(costs.deductionsPhp), `${fmtCredits(costs.deductionCredits)} taken back`],
                    ]}
                  />
                  <div className="mt-1 flex items-baseline justify-between border-t border-white/[0.1] pt-2 text-sm">
                    <span className="font-medium text-zinc-300">Total costs</span>
                    <span className="font-semibold tabular-nums text-white">{fmtPhp(-(earnings.costPhp ?? 0))}</span>
                  </div>
                </>
              ) : (
                <p className="py-4 text-sm text-zinc-500">Platform costs could not be loaded.</p>
              )}
            </div>
          </div>

          <div className="mt-5 grid gap-3 rounded-xl border border-white/[0.06] bg-[#0c0d12] px-4 py-3 sm:grid-cols-3">
            <div>
              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                Net profit
                <InfoButton id="netProfit" />
              </p>
              <p className={`mt-1 text-xl font-semibold tabular-nums ${profitTone(earnings.profitPhp)}`}>{fmtPhp(earnings.profitPhp)}</p>
              <p className="text-xs text-zinc-500">Margin {earnings.marginPct == null ? '—' : fmtPct(earnings.marginPct / 100, 1)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Previous period</p>
              {prev ? (
                <>
                  <p className={`mt-1 text-xl font-semibold tabular-nums ${profitTone(prev.profitPhp)}`}>{fmtPhp(prev.profitPhp)}</p>
                  <p className="text-xs text-zinc-500">
                    {fmtPhp(prev.revenuePhp)} revenue · {fmtPhp(prev.costPhp)} costs
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-zinc-500">No earlier period for All time.</p>
              )}
            </div>
            <div>
              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                Lifetime
                <InfoButton id="lifetimeEarnings" />
              </p>
              {lifetime ? (
                <>
                  <p className={`mt-1 text-xl font-semibold tabular-nums ${profitTone(lifetime.profitPhp)}`}>{fmtPhp(lifetime.profitPhp)}</p>
                  <p className="text-xs text-zinc-500">
                    {fmtPhp(lifetime.revenuePhp)} revenue · {fmtPhp(lifetime.costPhp)} costs
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-zinc-500">Could not be loaded.</p>
              )}
            </div>
          </div>
          <p className="mt-3 text-[11px] text-zinc-600">
            Cashout fees go to the payout provider and are not counted. Payment-provider charges, hosting and other running costs are not
            recorded in Ensemble and are not taken off.
          </p>
        </Panel>

        <Panel title="Lifetime revenue" info="lifetimeEarnings" subtitle="Everything recorded up to today">
          {lifetime ? (
            <>
              <p className="text-2xl font-semibold tabular-nums text-white">{fmtPhp(lifetime.revenuePhp)}</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Margin {lifetime.marginPct == null ? '—' : fmtPct(lifetime.marginPct / 100, 1)}
              </p>
              <div className="mt-4">
                <MetricRows
                  rows={[
                    ['Subscriptions', fmtPhp(lifetime.revenue.subscriptionsPhp)],
                    ['Platform fees', fmtPhp(lifetime.revenue.feesPhp)],
                    ['Official asset sales', fmtPhp(lifetime.revenue.officialAssetsPhp)],
                    ['Top-up markup', fmtPhp(lifetime.revenue.topupMarkupPhp)],
                    ['Costs', fmtPhp(lifetime.costPhp == null ? null : -lifetime.costPhp)],
                    [
                      <span key="p" className="font-medium text-zinc-300">Net profit</span>,
                      <span key="v" className={profitTone(lifetime.profitPhp)}>{fmtPhp(lifetime.profitPhp)}</span>,
                    ],
                  ]}
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-zinc-500">Lifetime figures could not be loaded.</p>
          )}
        </Panel>
      </div>

      <Panel title="Revenue, costs and profit" info="earningsChart" subtitle={`Pesos per ${range.bucket}`}>
        <LineChart
          labels={labels}
          tooltipLabels={titles}
          formatValue={fmtPhp}
          series={[
            { label: 'Revenue', color: SERIES_COLORS.revenue, values: series.map((p) => p.revenuePhp) },
            { label: 'Costs', color: SERIES_COLORS.costs, values: series.map((p) => p.costPhp) },
            { label: 'Net profit', color: SERIES_COLORS.profit, values: series.map((p) => p.profitPhp) },
          ]}
        />
      </Panel>
    </>
  );
}
