import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarRange,
  ExternalLink,
  Flag,
  Gavel,
  Loader2,
  MessageCircle,
  MessagesSquare,
  Minus,
  ShieldOff,
  Ticket,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { peekStaffGet, staffGet } from '@/lib/staffCache';
import { useStaffLive } from '@/lib/staffLive';
import { staffPlatformViewHref } from '@/lib/staffRoutes';
import {
  ChartCard,
  DonutChart,
  HorizontalBarChart,
  LineChart,
} from '@/pages/admin/analytics/components/AnalyticsCharts';
import { ForumAvatar, GroupImage, PersonBadges } from '@/pages/admin/moderation/forumDeskUi';
import type { ForumTrendMetric, ForumTrendPoint, ForumTrendRangeKey, ForumTrends } from '../shared/moderatorTypes';

/** Also listed in `lib/staffPrefetch.ts` with the default range. */
export const FORUM_TRENDS_URL = '/api/moderator/forum/trends';

const RANGES: { key: ForumTrendRangeKey; short: string; label: string }[] = [
  { key: '7d', short: '7D', label: 'Last 7 days' },
  { key: '30d', short: '30D', label: 'Last 30 days' },
  { key: '90d', short: '90D', label: 'Last 90 days' },
  { key: '12m', short: '12M', label: 'Last 12 months' },
];

const DEFAULT_RANGE: ForumTrendRangeKey = '30d';

function rangeFromParam(value: string | null): ForumTrendRangeKey {
  return RANGES.some((r) => r.key === value) ? (value as ForumTrendRangeKey) : DEFAULT_RANGE;
}

const COLORS = {
  discussions: '#a78bfa',
  comments: '#60a5fa',
  activeMembers: '#34d399',
  groups: '#fbbf24',
  reports: '#f472b6',
  tickets: '#fb7185',
  actions: '#38bdf8',
  takedowns: '#f97316',
} satisfies Record<ForumTrendMetric, string>;

// Range days are calendar days, so format them in UTC to keep the date as sent.
const SHORT_DAY = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const LONG_DAY = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});
const SHORT_MONTH = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
const LONG_MONTH = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

function day(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function pointLabel(point: ForumTrendPoint, bucket: ForumTrends['range']['bucket']) {
  return bucket === 'month' ? SHORT_MONTH.format(day(point.start)) : SHORT_DAY.format(day(point.start));
}

function pointTooltip(point: ForumTrendPoint, bucket: ForumTrends['range']['bucket']) {
  const partial = point.partial ? ' (partly outside the range)' : '';
  if (bucket === 'day') return LONG_DAY.format(day(point.start));
  if (bucket === 'week') {
    return `${SHORT_DAY.format(day(point.start))} – ${SHORT_DAY.format(day(point.end))}${partial}`;
  }
  return `${LONG_MONTH.format(day(point.start))}${partial}`;
}

const NUMBER = new Intl.NumberFormat('en-US');

type Delta = { text: string; direction: 'up' | 'down' | 'flat' | 'new' };

function compare(current: number, previous: number | undefined | null): Delta | null {
  if (previous == null) return null;
  if (previous === 0) return current === 0 ? { text: 'Same as before', direction: 'flat' } : { text: 'None before', direction: 'new' };
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return { text: 'Same as before', direction: 'flat' };
  return { text: `${pct > 0 ? '+' : ''}${pct}% vs before`, direction: pct > 0 ? 'up' : 'down' };
}

/**
 * `good` says which way is healthy for this metric: more posts is good, more reports is not.
 * Neutral metrics (staff actions) stay grey either way.
 */
function deltaTone(delta: Delta, good: 'up' | 'down' | null) {
  if (delta.direction === 'flat' || !good) return 'text-zinc-500';
  const rising = delta.direction === 'up' || delta.direction === 'new';
  return (good === 'up') === rising ? 'text-emerald-300' : 'text-rose-300';
}

function TrendStat({
  icon: Icon,
  label,
  value,
  delta,
  good,
  tone,
  to,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number | null;
  delta: Delta | null;
  good: 'up' | 'down' | null;
  tone: string;
  to?: string;
}) {
  const DeltaIcon =
    delta?.direction === 'up' || delta?.direction === 'new'
      ? ArrowUpRight
      : delta?.direction === 'down'
        ? ArrowDownRight
        : Minus;
  const body = (
    <div className="flex h-full items-start gap-3 rounded-2xl border border-white/[0.08] bg-[#14151c] px-4 py-3.5 transition hover:border-white/15">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
        <p className="mt-1 text-xl font-bold leading-none tabular-nums text-white">
          {value == null ? '—' : NUMBER.format(value)}
        </p>
        {delta ? (
          <p className={`mt-1.5 inline-flex items-center gap-1 text-[11px] ${deltaTone(delta, good)}`}>
            <DeltaIcon className="h-3 w-3" />
            {delta.text}
          </p>
        ) : null}
      </div>
    </div>
  );
  return to ? (
    <Link to={to} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

function RangePicker({
  value,
  onChange,
  busy,
}: {
  value: ForumTrendRangeKey;
  onChange: (next: ForumTrendRangeKey) => void;
  busy: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" aria-label="Loading range" /> : null}
      <div role="group" aria-label="Date range" className="inline-flex rounded-xl border border-white/10 bg-white/[0.02] p-0.5">
        {RANGES.map((range) => {
          const active = value === range.key;
          return (
            <button
              key={range.key}
              type="button"
              title={range.label}
              aria-pressed={active}
              onClick={() => onChange(range.key)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                active ? 'bg-violet-500/15 text-violet-200' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {range.short}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Forum dashboard → Trends: what happened on the forum over one range (7 days to 12 months,
 * kept in `?range=`), compared with the period before it. Live: re-reads silently when forum
 * content, cases or staff actions change.
 */
export default function ForumTrendsSection() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { pathname } = useLocation();
  const range = rangeFromParam(searchParams.get('range'));
  const [data, setData] = useState<ForumTrends | null>(() => {
    const cached = peekStaffGet(FORUM_TRENDS_URL, { range });
    return cached?.data?.success ? cached.data.data : null;
  });
  const [loading, setLoading] = useState(!data);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState('');
  const latest = useRef(range);
  const hasData = useRef(Boolean(data));

  const load = useCallback(async (key: ForumTrendRangeKey, silent = false) => {
    latest.current = key;
    const cached = peekStaffGet(FORUM_TRENDS_URL, { range: key });
    if (cached?.data?.success) {
      setData(cached.data.data);
      hasData.current = true;
    } else if (!silent) {
      if (hasData.current) setSwitching(true);
      else setLoading(true);
    }
    try {
      const res = await staffGet(FORUM_TRENDS_URL, { range: key });
      // A newer range pick wins over a slow answer for an older one.
      if (latest.current !== key) return;
      if (res.data?.success) {
        hasData.current = true;
        setData(res.data.data);
        setError('');
      } else if (!hasData.current) {
        setError(res.data?.message || 'Failed to load forum trends');
      }
    } catch {
      if (latest.current === key && !hasData.current) setError('Failed to load forum trends');
    } finally {
      if (latest.current === key) {
        setLoading(false);
        setSwitching(false);
      }
    }
  }, []);

  useEffect(() => {
    void load(range);
  }, [load, range]);

  useStaffLive(['forum', 'reports', 'tickets', 'moderation'], () => load(latest.current, true), {
    delayMs: 2000,
  });

  const pickRange = (next: ForumTrendRangeKey) => {
    const params = new URLSearchParams(searchParams);
    if (next === DEFAULT_RANGE) params.delete('range');
    else params.set('range', next);
    setSearchParams(params, { replace: true });
  };

  const rangeInfo = RANGES.find((r) => r.key === range) || RANGES[1];
  // While a new range loads, the last one stays on screen, dimmed.
  const shown = data;
  const stale = Boolean(data && data.range.key !== range);
  const bucket = shown?.range.bucket || 'day';
  const points = shown?.points || [];
  const labels = points.map((p) => pointLabel(p, bucket));
  const tooltipLabels = points.map((p) => pointTooltip(p, bucket));
  const totals = shown?.totals;
  const before = shown?.previousTotals;
  const periodWord = rangeInfo.label.toLowerCase();

  const series = (keys: [ForumTrendMetric, string][]) =>
    keys.map(([key, label]) => ({ label, color: COLORS[key], values: points.map((p) => p[key]) }));
  const anyIn = (keys: ForumTrendMetric[]) => keys.some((key) => (totals?.[key] || 0) > 0);

  const communityKeys: [ForumTrendMetric, string][] = [
    ['discussions', 'New discussions'],
    ['comments', 'Replies'],
    ['activeMembers', 'Members posting'],
    ['groups', 'New groups'],
  ];
  const caseKeys: [ForumTrendMetric, string][] = [
    ['reports', 'Reports filed'],
    ['tickets', 'Tickets opened'],
    ['actions', 'Staff actions'],
    ['takedowns', 'Content taken down'],
  ];

  const bucketWord = bucket === 'day' ? 'Daily' : bucket === 'week' ? 'Weekly' : 'Monthly';
  const subtitleFor = (what: string) =>
    shown ? `${bucketWord} · ${shown.range.label} · ${what}` : undefined;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Trends</h2>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
            <CalendarRange className="h-3.5 w-3.5" />
            {shown
              ? `${SHORT_DAY.format(day(shown.range.from))} – ${LONG_DAY.format(day(shown.range.to))}`
              : rangeInfo.label}
            {shown?.range.previous ? (
              <span>· changes compare with the {NUMBER.format(shown.range.days)} days before</span>
            ) : null}
          </p>
        </div>
        <RangePicker value={range} onChange={pickRange} busy={switching || stale} />
      </div>

      {error && !shown ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
          <button type="button" onClick={() => void load(range)} className="ml-3 underline">
            Retry
          </button>
        </div>
      ) : null}

      {loading && !shown ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="console-skeleton h-[92px] rounded-2xl border border-white/[0.06] bg-white/[0.02]" />
          ))}
        </div>
      ) : null}

      {shown ? (
        <div className={`space-y-4 transition-opacity ${switching || stale ? 'opacity-60' : ''}`}>
          {shown.notes.length ? (
            <div className="space-y-1.5">
              {shown.notes.map((note) => (
                <p
                  key={note}
                  className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-100"
                >
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {note}
                </p>
              ))}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <TrendStat
              icon={MessagesSquare}
              label="New discussions"
              value={shown.available.community ? totals?.discussions ?? 0 : null}
              delta={shown.available.community ? compare(totals?.discussions || 0, before?.discussions) : null}
              good="up"
              tone="bg-violet-500/15 text-violet-300"
              to="/moderator/forum/forum-control"
            />
            <TrendStat
              icon={MessageCircle}
              label="Replies"
              value={shown.available.community ? totals?.comments ?? 0 : null}
              delta={shown.available.community ? compare(totals?.comments || 0, before?.comments) : null}
              good="up"
              tone="bg-sky-500/15 text-sky-300"
            />
            <TrendStat
              icon={UserRound}
              label="Members posting"
              value={shown.available.community ? totals?.activeMembers ?? 0 : null}
              delta={shown.available.community ? compare(totals?.activeMembers || 0, before?.activeMembers) : null}
              good="up"
              tone="bg-emerald-500/15 text-emerald-300"
            />
            <TrendStat
              icon={UsersRound}
              label="New groups"
              value={shown.available.community ? totals?.groups ?? 0 : null}
              delta={shown.available.community ? compare(totals?.groups || 0, before?.groups) : null}
              good="up"
              tone="bg-amber-500/15 text-amber-300"
              to="/moderator/forum/forum-control?view=groups"
            />
            <TrendStat
              icon={Flag}
              label="Reports filed"
              value={shown.available.cases ? totals?.reports ?? 0 : null}
              delta={shown.available.cases ? compare(totals?.reports || 0, before?.reports) : null}
              good="down"
              tone="bg-fuchsia-500/15 text-fuchsia-300"
              to="/moderator/forum/reports"
            />
            <TrendStat
              icon={Ticket}
              label="Tickets opened"
              value={shown.available.cases ? totals?.tickets ?? 0 : null}
              delta={shown.available.cases ? compare(totals?.tickets || 0, before?.tickets) : null}
              good="down"
              tone="bg-rose-500/15 text-rose-300"
              to="/moderator/forum/ticket-management"
            />
            <TrendStat
              icon={Gavel}
              label="Staff actions"
              value={shown.available.cases ? totals?.actions ?? 0 : null}
              delta={shown.available.cases ? compare(totals?.actions || 0, before?.actions) : null}
              good={null}
              tone="bg-cyan-500/15 text-cyan-300"
            />
            <TrendStat
              icon={ShieldOff}
              label="Content taken down"
              value={shown.available.community ? totals?.takedowns ?? 0 : null}
              delta={shown.available.community ? compare(totals?.takedowns || 0, before?.takedowns) : null}
              good="down"
              tone="bg-orange-500/15 text-orange-300"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <ChartCard>
              <LineChart
                title="Community activity"
                subtitle={subtitleFor('posts, replies, members posting and new groups')}
                labels={shown.available.community && anyIn(['discussions', 'comments', 'groups']) ? labels : []}
                tooltipLabels={tooltipLabels}
                series={series(communityKeys)}
                emptyMessage={
                  shown.available.community
                    ? `No discussions, replies or new groups in the ${periodWord}. Try a longer range.`
                    : 'Forum content is unavailable right now.'
                }
              />
            </ChartCard>
            <ChartCard>
              <LineChart
                title="Cases and moderation"
                subtitle={subtitleFor('reports, tickets, staff actions and take-downs')}
                labels={anyIn(['reports', 'tickets', 'actions', 'takedowns']) ? labels : []}
                tooltipLabels={tooltipLabels}
                series={series(caseKeys)}
                emptyMessage={`No forum reports, tickets or moderation in the ${periodWord}.`}
              />
            </ChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
            <ChartCard>
              <DonutChart
                title="Reports by status"
                subtitle={`Forum reports filed in the ${periodWord}`}
                segments={shown.mix.reportStatus}
                emptyMessage={`No forum reports filed in the ${periodWord}.`}
              />
            </ChartCard>
            <ChartCard>
              <DonutChart
                title="Tickets by status"
                subtitle={`Forum tickets opened in the ${periodWord}`}
                segments={shown.mix.ticketStatus}
                emptyMessage={`No forum tickets opened in the ${periodWord}.`}
              />
            </ChartCard>
            <ChartCard>
              <HorizontalBarChart
                title="What gets reported"
                subtitle="Forum reports by target"
                data={shown.mix.reportTargets}
                emptyMessage={`Nothing on the forum was reported in the ${periodWord}.`}
              />
            </ChartCard>
            <ChartCard>
              <HorizontalBarChart
                title="Staff actions by kind"
                subtitle="From the moderation activity log"
                data={shown.mix.actionKinds}
                colorFrom={COLORS.actions}
                emptyMessage={`No staff forum actions in the ${periodWord}.`}
              />
            </ChartCard>
          </div>

          {shown.available.community ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard>
                <p className="text-sm font-semibold tracking-tight text-white">Busiest groups</p>
                <p className="mt-0.5 text-xs text-zinc-500">Most new discussions and replies in the {periodWord}</p>
                <ul className="mt-4 space-y-2">
                  {shown.topGroups.map((group) => (
                    <li key={group.id}>
                      <Link
                        to={`/moderator/forum/forum-control?view=groups&group=${encodeURIComponent(group.id)}`}
                        className="flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2.5 transition hover:bg-white/[0.04]"
                      >
                        <GroupImage name={group.name} imageUrl={group.imageUrl} size="md" />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-medium text-white">{group.name}</span>
                            {group.status !== 'active' ? (
                              <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-200">
                                Archived
                              </span>
                            ) : null}
                          </span>
                          <span className="block text-[11px] text-zinc-500">
                            {NUMBER.format(group.memberCount)} members
                          </span>
                        </span>
                        <span className="shrink-0 text-right text-xs tabular-nums text-zinc-300">
                          {NUMBER.format(group.posts)} posts
                          <span className="block text-[11px] text-zinc-500">{NUMBER.format(group.comments)} replies</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                  {shown.topGroups.length === 0 ? (
                    <li className="rounded-xl border border-dashed border-white/10 px-3 py-8 text-center text-sm text-zinc-500">
                      No group activity in the {periodWord}.
                    </li>
                  ) : null}
                </ul>
              </ChartCard>
              <ChartCard>
                <p className="text-sm font-semibold tracking-tight text-white">Most active members</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Most posts and replies in the {periodWord} · opens their profile in platform view
                </p>
                <ul className="mt-4 space-y-2">
                  {shown.topMembers.map((member, i) => {
                    const row = (
                      <>
                        <ForumAvatar person={member} size="md" />
                        <span className="min-w-0 flex-1">
                          <span className="flex min-w-0 items-center gap-1">
                            <span className="truncate text-sm font-medium text-white">{member.name}</span>
                            <PersonBadges person={member} />
                          </span>
                          <span className="block truncate text-[11px] text-zinc-500">
                            {member.handle ? `@${member.handle}` : 'No handle'}
                          </span>
                        </span>
                        <span className="shrink-0 text-right text-xs tabular-nums text-zinc-300">
                          {NUMBER.format(member.posts)} posts
                          <span className="block text-[11px] text-zinc-500">{NUMBER.format(member.comments)} replies</span>
                        </span>
                        {member.accountId ? <ExternalLink className="h-3.5 w-3.5 shrink-0 text-zinc-600" /> : null}
                      </>
                    );
                    const className =
                      'flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2.5 transition hover:bg-white/[0.04]';
                    return (
                      <li key={`${member.userId}-${i}`}>
                        {member.accountId ? (
                          <Link
                            to={staffPlatformViewHref(pathname, `/profile/${member.accountId}`)}
                            target="_blank"
                            rel="noreferrer"
                            className={className}
                          >
                            {row}
                          </Link>
                        ) : (
                          <div className={className}>{row}</div>
                        )}
                      </li>
                    );
                  })}
                  {shown.topMembers.length === 0 ? (
                    <li className="rounded-xl border border-dashed border-white/10 px-3 py-8 text-center text-sm text-zinc-500">
                      Nobody posted in the {periodWord}.
                    </li>
                  ) : null}
                </ul>
              </ChartCard>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
