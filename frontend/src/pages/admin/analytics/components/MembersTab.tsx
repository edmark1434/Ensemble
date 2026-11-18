import { Link } from 'react-router-dom';
import type { CohortRow, PlatformAnalytics } from '../analyticsTypes';
import {
  SERIES_COLORS,
  bucketTitle,
  fmtDateTime,
  fmtDay,
  fmtInt,
  fmtPct,
  seriesLabels,
  share,
} from '../analyticsFormat';
import { MetricRows, Notice, Panel, ProgressRow, SimpleTable, StatTile, StatusPill } from '../analyticsUi';
import { DonutChart, HorizontalBarChart, LineChart, VerticalBarChart } from './AnalyticsCharts';

const MAX_COHORT_WEEKS = 8;

function CohortTable({ cohorts, trackingSince }: { cohorts: CohortRow[]; trackingSince: string }) {
  if (!cohorts.length) {
    return <p className="py-6 text-center text-sm text-zinc-500">No members joined in the last eight weeks.</p>;
  }
  const weeks = Array.from({ length: MAX_COHORT_WEEKS }, (_, i) => i);
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-y border-white/[0.06] bg-[#0c0d12] text-[10px] uppercase tracking-wide text-zinc-500">
            <th className="px-5 py-2.5 text-left font-medium">Joined week of</th>
            <th className="px-3 py-2.5 text-right font-medium">Members</th>
            {weeks.map((w) => (
              <th key={w} className="px-2 py-2.5 text-center font-medium">
                {w === 0 ? 'Week 0' : `+${w}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((c) => (
            <tr key={c.cohortStart} className="border-b border-white/[0.04] last:border-0">
              <td className="px-5 py-2 text-zinc-300">{fmtDay(c.cohortStart, false)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-zinc-300">{fmtInt(c.size)}</td>
              {weeks.map((w) => {
                const cell = c.weeks[w];
                if (!cell) return <td key={w} className="px-2 py-2" />;
                if (cell.rate == null) {
                  return (
                    <td key={w} className="px-2 py-2 text-center text-xs text-zinc-700" title={`Before tracking started (${fmtDay(trackingSince)})`}>
                      ·
                    </td>
                  );
                }
                const alpha = 0.06 + cell.rate * 0.55;
                return (
                  <td key={w} className="px-1 py-1">
                    <span
                      className="block rounded-md px-1 py-1.5 text-center text-xs tabular-nums text-white"
                      style={{ background: `rgba(251, 113, 133, ${alpha.toFixed(3)})` }}
                      title={`${fmtInt(cell.active ?? 0)} of ${fmtInt(c.size)} active`}
                    >
                      {fmtPct(cell.rate)}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MembersTab({ data }: { data: PlatformAnalytics }) {
  const { members, engagement, summary, series, range } = data;
  const labels = seriesLabels(series, range.bucket);
  const titles = series.map((p) => bucketTitle(p, range.bucket));
  const total = members?.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="console-stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Members" value={members ? total : null} sub={members ? `${fmtInt(members.status.active)} in good standing` : undefined} />
        <StatTile label="New in period" value={summary.newMembers.value} kpi={summary.newMembers} spark={series.map((p) => p.signups)} sparkColor={SERIES_COLORS.signups} />
        <StatTile
          label="Active in period"
          value={summary.activeMembers?.value ?? null}
          kpi={summary.activeMembers}
          empty="Not tracked yet"
          spark={series.map((p) => p.active)}
          sparkColor={SERIES_COLORS.active}
          sub={engagement.available ? `${fmtPct(share(summary.activeMembers?.value ?? 0, total))} of all members` : undefined}
        />
        <StatTile
          label="Verified"
          value={members ? members.verification.verified : null}
          sub={members ? `${fmtPct(share(members.verification.verified, total))} of members · ${fmtInt(members.verification.pending)} pending` : undefined}
        />
      </div>

      {!engagement.available ? (
        <Notice>
          {engagement.reason === 'not_migrated' ? (
            <>Activity tracking needs the latest database migration. Once it runs, members are counted as active on each day they use the site.</>
          ) : (
            <>No member activity has been recorded yet. Daily, weekly and monthly active members start counting from members’ next sign-ins.</>
          )}
        </Notice>
      ) : (
        <>
          {engagement.partial && (
            <Notice>
              Activity tracking started on {fmtDay(engagement.trackingSince)}. Earlier days in this range have no activity data,
              and the comparison with the previous period is hidden until it is fully tracked.
            </Notice>
          )}
          <div className="console-stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Active today" value={engagement.dau} />
            <StatTile label="Last 7 days" value={engagement.wau} sub="Distinct active members" />
            <StatTile label="Last 30 days" value={engagement.mau} sub="Distinct active members" />
            <StatTile
              label="Stickiness"
              value={engagement.stickiness}
              format={(n) => fmtPct(n, 1)}
              animate={false}
              sub="Average daily ÷ 30-day actives"
            />
          </div>
        </>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Signups" subtitle={`New member accounts per ${range.bucket}`}>
          <VerticalBarChart
            data={series.map((p, i) => ({ label: labels[i], value: p.signups }))}
            tooltipLabels={titles}
            color={SERIES_COLORS.signups}
          />
        </Panel>
        <Panel title="Active members" subtitle={`Distinct members who used the site each ${range.bucket}`}>
          {engagement.available ? (
            <LineChart
              labels={labels}
              tooltipLabels={titles}
              series={[{ label: 'Active members', color: SERIES_COLORS.active, values: series.map((p) => p.active) }]}
            />
          ) : (
            <p className="flex h-52 items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#0c0d12] text-sm text-zinc-500">
              Not tracked yet
            </p>
          )}
        </Panel>
      </div>

      {engagement.available && (
        <div className="grid gap-5 xl:grid-cols-3">
          <Panel title="Engagement in this period">
            <MetricRows
              rows={[
                ['Average active per day', fmtInt(Math.round(engagement.averageDaily))],
                ['Returning members', fmtInt(engagement.returning), 'Joined before the period started'],
                ['New members who were active', fmtInt(engagement.newActive)],
                ['Tracking since', fmtDay(engagement.trackingSince)],
              ]}
            />
          </Panel>
          <Panel className="xl:col-span-2" title="Retention by signup week" subtitle="Share of each week’s new members active in the weeks after they joined">
            <CohortTable cohorts={engagement.cohorts} trackingSince={engagement.trackingSince} />
          </Panel>
        </div>
      )}

      {members && (
        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          <Panel title="Account standing">
            <DonutChart
              segments={[
                { label: 'Active', value: members.status.active, color: '#34d399' },
                { label: 'Suspended', value: members.status.suspended, color: '#fbbf24' },
                { label: 'Banned', value: members.status.banned, color: '#f87171' },
                { label: 'Locked', value: members.status.locked, color: '#fb923c' },
                { label: 'Deactivated', value: members.status.deactivated, color: '#71717a' },
                { label: 'Other', value: members.status.other, color: '#a1a1aa' },
              ]}
              centerLabel="members"
            />
          </Panel>
          <Panel title="Identity verification">
            <DonutChart
              segments={[
                { label: 'Verified', value: members.verification.verified, color: '#34d399' },
                { label: 'Pending review', value: members.verification.pending, color: '#fbbf24' },
                { label: 'Not verified', value: members.verification.unverified, color: '#52525b' },
              ]}
              centerLabel="members"
            />
          </Panel>
          <Panel title="Profile completeness" subtitle="Avatar and tagline set">
            <div className="space-y-4">
              <ProgressRow label="Has an avatar" value={members.profile.withAvatar} total={total} color="#60a5fa" />
              <ProgressRow label="Has a tagline" value={members.profile.withTagline} total={total} color="#a78bfa" />
              <ProgressRow label="Both" value={members.profile.complete} total={total} color="#34d399" />
            </div>
          </Panel>
        </div>
      )}

      {members && (
        <div className="grid gap-5 xl:grid-cols-3">
          <Panel title="Email providers" subtitle="Top domains among member emails">
            <HorizontalBarChart
              data={members.emailDomains.map((d) => ({ label: d.domain || 'unknown', value: d.count }))}
              colorFrom={SERIES_COLORS.signups}
              emptyMessage="No member emails yet"
            />
          </Panel>
          <Panel
            className="xl:col-span-2"
            title="Newest members"
            action={
              <Link to="/admin/user-team?tab=users" className="text-xs font-medium text-rose-300 hover:text-rose-200">
                All users →
              </Link>
            }
          >
            <SimpleTable
              columns={[{ label: 'Member' }, { label: 'Handle' }, { label: 'Standing' }, { label: 'Joined' }]}
              rows={members.newest.map((m) => [
                <span key="n" className="font-medium text-white">{m.name}</span>,
                m.handle ? `@${m.handle}` : '—',
                <StatusPill key="s" status={m.status} />,
                fmtDateTime(m.joinedAt),
              ])}
              empty="No members yet."
            />
          </Panel>
        </div>
      )}
    </div>
  );
}
