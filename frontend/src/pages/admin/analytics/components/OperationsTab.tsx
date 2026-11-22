import { Link } from 'react-router-dom';
import type { PlatformAnalytics } from '../analyticsTypes';
import { SERIES_COLORS, bucketTitle, fmtAge, fmtHours, fmtInt, seriesLabels } from '../analyticsFormat';
import { MetricRows, Panel, SimpleTable, StatTile } from '../analyticsUi';
import { InfoButton } from '../analyticsInfo';
import { LineChart } from './AnalyticsCharts';

export default function OperationsTab({ data }: { data: PlatformAnalytics }) {
  const { operations, summary, series, range, money } = data;
  const { tickets, queues, staff } = operations;
  const labels = seriesLabels(series, range.bucket);
  const titles = series.map((p) => bucketTitle(p, range.bucket));
  const staffTotal = staff.reduce((s, r) => s + r.count, 0);

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-white">
            Queues right now
            <InfoButton id="snapshot" />
          </h3>
          <p className="text-xs text-zinc-500">Open work, not limited to the date range. Each tile opens its desk.</p>
        </div>
        <div className="console-stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Open tickets"
            info="openTickets"
            value={tickets?.open ?? null}
            href="/admin/ticket-management?tab=tickets"
            sub={tickets ? `${fmtInt(tickets.unassigned)} unassigned · ${fmtInt(tickets.highPriority)} high priority` : undefined}
          />
          <StatTile label="Open reports" info="openReports" value={queues?.openReports ?? null} href="/admin/moderation?tab=cases&queue=reports" />
          <StatTile label="Open disputes" info="openDisputes" value={queues?.openDisputes ?? null} href="/admin/moderation?tab=cases&queue=disputes" />
          <StatTile label="Listings to review" info="pendingListings" value={queues?.pendingListings ?? null} href="/admin/moderation?tab=cases&queue=listings" />
          <StatTile label="Identity checks" info="identityChecks" value={queues?.pendingVerifications ?? null} href="/admin/moderation?tab=cases&queue=identity" />
          <StatTile label="Active warnings" info="activeWarnings" value={queues?.activeViolations ?? null} sub="Unexpired warnings on members" />
          <StatTile
            label="Cashouts in flight"
            info="inFlight"
            value={queues?.cashoutsInFlight ?? null}
            href="/admin/credit-economy"
            sub={money.cashouts?.inFlight.count ? `Oldest waiting ${fmtAge(money.cashouts.inFlight.oldestAt)}` : undefined}
          />
          <StatTile label="Teams" info="teams" value={queues?.teams ?? null} href="/admin/user-team?tab=teams" />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel title="Support performance" subtitle="Tickets in this period">
          {tickets ? (
            <MetricRows
              rows={[
                ['Tickets opened', fmtInt(tickets.opened)],
                ['Tickets closed', fmtInt(tickets.resolved), undefined, 'ticketsClosed'],
                ['Median first reply', fmtHours(tickets.medianFirstReplyHours), 'From opening to the first staff reply', 'firstReply'],
                ['Median time to close', fmtHours(tickets.medianResolutionHours), undefined, 'timeToClose'],
                [
                  'Satisfaction',
                  tickets.satisfaction == null ? '—' : `${tickets.satisfaction.toFixed(2)} / 5`,
                  `${fmtInt(tickets.ratings)} rating${tickets.ratings === 1 ? '' : 's'}`,
                  'satisfaction',
                ],
                ['Oldest open ticket', fmtAge(tickets.oldestOpenAt)],
              ]}
            />
          ) : (
            <p className="text-sm text-zinc-500">Ticket figures could not be loaded.</p>
          )}
        </Panel>
        <Panel className="xl:col-span-2" title="Incoming work" info="volumeChart" subtitle={`New items per ${range.bucket}`}>
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

      <div className="console-stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Tickets opened" info="periodCounts" value={summary.tickets.value} kpi={summary.tickets} trend="up-bad" />
        <StatTile label="Reports filed" info="periodCounts" value={summary.reports.value} kpi={summary.reports} trend="up-bad" />
        <StatTile label="Disputes opened" info="periodCounts" value={summary.disputes.value} kpi={summary.disputes} trend="up-bad" />
        <StatTile label="Listings submitted" info="periodCounts" value={summary.listings.value} kpi={summary.listings} />
      </div>

      <Panel
        title="Staff"
        info="staff"
        subtitle={`${fmtInt(staffTotal)} staff accounts`}
        action={
          <Link to="/admin/moderation?tab=management" className="text-xs font-medium text-rose-300 hover:text-rose-200">
            Manage staff →
          </Link>
        }
      >
        <SimpleTable
          columns={[{ label: 'Role' }, { label: 'Accounts', align: 'right' }, { label: 'Active', align: 'right' }]}
          rows={staff.map((r) => [<span key="r" className="font-medium text-white">{r.role}</span>, fmtInt(r.count), fmtInt(r.active)])}
          empty="No staff accounts."
        />
      </Panel>
    </div>
  );
}
