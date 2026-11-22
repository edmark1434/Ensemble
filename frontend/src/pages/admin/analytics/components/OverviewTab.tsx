import { Activity, ArrowUpRight, Coins, CreditCard, PiggyBank, TrendingUp, UserPlus, Wallet } from 'lucide-react';
import type { PlatformAnalytics } from '../analyticsTypes';
import {
  SERIES_COLORS,
  bucketTitle,
  fmtAge,
  fmtCredits,
  fmtInt,
  fmtPhp,
  fmtPhpShort,
  seriesLabels,
} from '../analyticsFormat';
import { AlertList, Panel, StatTile } from '../analyticsUi';
import { InfoButton } from '../analyticsInfo';
import { LineChart } from './AnalyticsCharts';

const BUCKET_NOUN = { day: 'day', week: 'week', month: 'month' } as const;

export default function OverviewTab({ data }: { data: PlatformAnalytics }) {
  const { summary, series, range, money, engagement, operations, alerts } = data;
  const labels = seriesLabels(series, range.bucket);
  const titles = series.map((p) => bucketTitle(p, range.bucket));
  const noun = BUCKET_NOUN[range.bucket];
  const tickets = operations.tickets;
  const queues = operations.queues;

  return (
    <div className="space-y-6">
      <div className="console-stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="New members"
          info="newMembers"
          icon={UserPlus}
          value={summary.newMembers.value}
          kpi={summary.newMembers}
          spark={series.map((p) => p.signups)}
          sparkColor={SERIES_COLORS.signups}
          sub={data.members ? `${fmtInt(data.members.total)} members in total` : undefined}
        />
        <StatTile
          label="Active members"
          info="activeMembers"
          icon={Activity}
          value={summary.activeMembers?.value ?? null}
          kpi={summary.activeMembers}
          empty="Not tracked yet"
          spark={series.map((p) => p.active)}
          sparkColor={SERIES_COLORS.active}
          sub={
            engagement.available
              ? `${fmtInt(engagement.dau)} today · ${fmtInt(engagement.mau)} in the last 30 days`
              : 'Counted from members’ sign-ins once tracking starts'
          }
        />
        <StatTile
          label="Platform revenue"
          info="platformRevenue"
          icon={TrendingUp}
          value={summary.platformRevenuePhp.value}
          format={fmtPhpShort}
          animate={false}
          kpi={summary.platformRevenuePhp}
          spark={series.map((p) => p.revenuePhp)}
          sparkColor={SERIES_COLORS.revenue}
          sub={money.lifetime ? `${fmtPhpShort(money.lifetime.revenuePhp)} lifetime` : 'Subscriptions, fees and official asset sales'}
        />
        <StatTile
          label="Net profit"
          info="netProfit"
          icon={PiggyBank}
          value={summary.platformProfitPhp?.value ?? null}
          format={fmtPhpShort}
          animate={false}
          kpi={summary.platformProfitPhp}
          empty="Could not load"
          spark={series.map((p) => p.profitPhp)}
          sparkColor={SERIES_COLORS.profit}
          sub={
            money.earnings.marginPct != null
              ? `${money.earnings.marginPct.toFixed(1)}% margin · ${fmtPhpShort(money.earnings.costPhp ?? 0)} costs`
              : 'Revenue minus credits given away'
          }
        />
        <StatTile
          label="Top-up sales"
          info="topupSales"
          icon={Coins}
          value={summary.topupRevenuePhp.value}
          format={fmtPhpShort}
          animate={false}
          kpi={summary.topupRevenuePhp}
          spark={series.map((p) => p.topupPhp)}
          sparkColor={SERIES_COLORS.topups}
          sub={`${fmtInt(series.reduce((s, p) => s + p.topupCount, 0))} paid orders`}
        />
        <StatTile
          label="Subscription revenue"
          info="subscriptionRevenue"
          icon={CreditCard}
          value={summary.subscriptionRevenuePhp.value}
          format={fmtPhpShort}
          animate={false}
          kpi={summary.subscriptionRevenuePhp}
          spark={series.map((p) => p.subscriptionPhp)}
          sparkColor={SERIES_COLORS.subscriptions}
          sub={money.subscriptions ? `${fmtPhpShort(money.subscriptions.mrrPhp)} monthly recurring` : undefined}
        />
        <StatTile
          label="Fee revenue"
          info="feeRevenue"
          icon={Wallet}
          value={summary.feeRevenueCredits.value}
          format={fmtCredits}
          kpi={summary.feeRevenueCredits}
          spark={series.map((p) => p.feeCredits)}
          sparkColor={SERIES_COLORS.fees}
          sub={`≈ ${fmtPhpShort(summary.feeRevenueCredits.value * money.creditValuePhp)} · net of refunds`}
        />
        <StatTile
          label="Cashouts paid"
          info="cashoutsPaid"
          icon={ArrowUpRight}
          value={summary.cashoutsPaidPhp.value}
          format={fmtPhpShort}
          animate={false}
          kpi={summary.cashoutsPaidPhp}
          trend="neutral"
          spark={series.map((p) => p.cashoutPhp)}
          sparkColor={SERIES_COLORS.cashouts}
          sub={money.cashouts ? `${fmtInt(money.cashouts.inFlight.count)} waiting to be paid` : undefined}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Members" subtitle={`New and active members per ${noun}`}>
          <LineChart
            labels={labels}
            tooltipLabels={titles}
            series={[
              { label: 'New members', color: SERIES_COLORS.signups, values: series.map((p) => p.signups) },
              ...(engagement.available
                ? [{ label: 'Active members', color: SERIES_COLORS.active, values: series.map((p) => p.active) }]
                : []),
            ]}
          />
        </Panel>
        <Panel title="Needs attention" info="needsAttention" subtitle="Open work across the platform">
          {/* Load failures are announced once at the top of the page. */}
          <AlertList alerts={alerts.filter((a) => a.id !== 'problems')} limit={6} />
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Money in and out" info="moneyChart" subtitle={`Pesos per ${noun}. Cashouts are dated by request.`}>
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
        <Panel title="Support and moderation volume" info="volumeChart" subtitle={`New items per ${noun}`}>
          <LineChart
            labels={labels}
            tooltipLabels={titles}
            series={[
              { label: 'Tickets', color: SERIES_COLORS.tickets, values: series.map((p) => p.tickets) },
              { label: 'Reports', color: SERIES_COLORS.reports, values: series.map((p) => p.reports) },
              { label: 'Listings submitted', color: SERIES_COLORS.listings, values: series.map((p) => p.listings) },
            ]}
          />
        </Panel>
      </div>

      <section>
        <div className="mb-3">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-white">
            Right now
            <InfoButton id="snapshot" />
          </h3>
          <p className="text-xs text-zinc-500">Current queue sizes. These are not limited to the date range.</p>
        </div>
        <div className="console-stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          <StatTile
            label="Open tickets"
            info="openTickets"
            value={tickets?.open ?? null}
            href="/admin/ticket-management?tab=tickets"
            sub={tickets ? `${fmtInt(tickets.unassigned)} unassigned · oldest ${fmtAge(tickets.oldestOpenAt)}` : undefined}
          />
          <StatTile label="Open reports" info="openReports" value={queues?.openReports ?? null} href="/admin/moderation?tab=cases&queue=reports" />
          <StatTile label="Open disputes" info="openDisputes" value={queues?.openDisputes ?? null} href="/admin/moderation?tab=cases&queue=disputes" />
          <StatTile label="Listings to review" info="pendingListings" value={queues?.pendingListings ?? null} href="/admin/moderation?tab=cases&queue=listings" />
          <StatTile label="Identity checks" info="identityChecks" value={queues?.pendingVerifications ?? null} href="/admin/moderation?tab=cases&queue=identity" />
          <StatTile
            label="Cashouts in flight"
            info="inFlight"
            value={money.cashouts?.inFlight.count ?? null}
            href="/admin/credit-economy"
            sub={money.cashouts ? `${fmtPhp(money.cashouts.inFlight.php)} · ${fmtInt(money.cashouts.inFlight.stale)} over 24 h` : undefined}
          />
        </div>
      </section>
    </div>
  );
}
