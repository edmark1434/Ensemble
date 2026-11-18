import { MessageSquare } from 'lucide-react';
import type { Kpi, PlatformAnalytics } from '../analyticsTypes';
import { fmtDay, fmtInt } from '../analyticsFormat';
import { Panel, SimpleTable, StatTile, StatusPill } from '../analyticsUi';
import { HorizontalBarChart, VerticalBarChart } from './AnalyticsCharts';

export default function CommunityTab({ data }: { data: PlatformAnalytics }) {
  const { community } = data;

  if (!community.available) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-10 text-center">
        <MessageSquare className="mx-auto h-10 w-10 text-amber-400" />
        <p className="mt-4 text-base font-semibold text-white">Forum data is unavailable</p>
        <p className="mt-2 text-sm text-zinc-500">MongoDB did not answer. Refresh to try again.</p>
      </div>
    );
  }

  const { groups, discussions } = community;
  const discussionKpi: Kpi = {
    value: discussions.inPeriod,
    previous: discussions.previous,
    changePct:
      discussions.previous ? Math.round(((discussions.inPeriod - discussions.previous) / discussions.previous) * 1000) / 10 : null,
  };

  return (
    <div className="space-y-6">
      <div className="console-stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Discussions started" value={discussions.inPeriod} kpi={discussionKpi} sub={`${fmtInt(discussions.total)} in total`} />
        <StatTile label="Comments" value={discussions.commentsInPeriod} sub={`${fmtInt(discussions.commentersInPeriod)} people commented`} />
        <StatTile label="People posting" value={discussions.postersInPeriod} sub="Started at least one discussion" />
        <StatTile label="New groups" value={groups.createdInPeriod} sub={`${fmtInt(groups.active)} active of ${fmtInt(groups.total)}`} />
      </div>

      <div className="console-stagger grid gap-3 sm:grid-cols-3">
        <StatTile label="Group memberships" value={groups.memberships} sub="Banned members excluded" />
        <StatTile label="Average group size" value={groups.averageSize} format={(n) => n.toLocaleString('en-US', { maximumFractionDigits: 1 })} animate={false} />
        <StatTile label="Inactive groups" value={groups.inactive} sub="Archived or not active" />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Group sizes" subtitle="Members per group, all groups">
          <VerticalBarChart data={groups.sizeDistribution.map((b) => ({ label: b.label, value: b.count }))} color="#818cf8" />
        </Panel>
        <Panel title="Popular group tags" subtitle="Tags used by the most groups">
          <HorizontalBarChart data={groups.tags.map((t) => ({ label: t.tag, value: t.count }))} colorFrom="#818cf8" emptyMessage="No tags yet" />
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Most discussed in this period" subtitle="By comments, then likes">
          <SimpleTable
            columns={[{ label: 'Discussion' }, { label: 'Author' }, { label: 'Comments', align: 'right' }, { label: 'Likes', align: 'right' }]}
            rows={discussions.top.map((d) => [
              <span key="t" className="block max-w-[260px] truncate font-medium text-white" title={d.title}>
                {d.title}
                <span className="block text-[11px] font-normal text-zinc-500">{fmtDay(d.createdAt)}</span>
              </span>,
              d.author.handle ? `@${d.author.handle}` : d.author.name,
              fmtInt(d.comments),
              fmtInt(d.likes),
            ])}
            empty="No discussions started in this period."
          />
        </Panel>
        <Panel title="Largest groups">
          <SimpleTable
            columns={[{ label: 'Group' }, { label: 'Status' }, { label: 'Members', align: 'right' }]}
            rows={groups.top.map((g) => [
              <span key="n" className="block max-w-[260px] truncate font-medium text-white" title={g.name}>
                {g.name}
              </span>,
              <StatusPill key="s" status={g.status} />,
              fmtInt(g.members),
            ])}
            empty="No active groups yet."
          />
        </Panel>
      </div>
    </div>
  );
}
