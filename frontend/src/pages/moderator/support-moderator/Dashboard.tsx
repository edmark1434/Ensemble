import { useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Coins,
  Gauge,
  History,
  Inbox,
  Layers,
  Loader2,
  MessageSquare,
  RefreshCw,
  Scale,
  ShieldAlert,
  Ticket,
  TimerReset,
  UserCog,
  Users,
} from "lucide-react";
import useGlobalState from "@/lib/global_state";
import { peekStaffGet, staffGet } from "@/lib/staffCache";
import {
  ChartCard,
  DonutChart,
  HorizontalBarChart,
  LineChart,
} from "@/pages/admin/analytics/components/AnalyticsCharts";
import { ReportCaseDetailModal } from "@/pages/admin/moderation/CaseDetailModals";
import ModeratorDisputeDetailModal from "../shared/ModeratorDisputeDetailModal";
import ModeratorTicketDetailModal from "../shared/ModeratorTicketDetailModal";
import type { Alert, SupportOverview } from "../shared/moderatorTypes";
import { PriorityBadge, StatusBadge, titleCaseWords } from "../shared/ui";

const OVERVIEW_URL = "/api/moderator/support/overview";

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "3d 4h ago" style age, for backlog rows where the absolute timestamp matters less. */
function formatAge(value: string | null | undefined) {
  if (!value) return "—";
  const started = new Date(value).getTime();
  if (!Number.isFinite(started)) return "—";
  const minutes = Math.max(0, Math.round((Date.now() - started) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function formatHours(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  if (value < 1) return `${Math.round(value * 60)}m`;
  if (value < 48) return `${value}h`;
  return `${Math.round((value / 24) * 10) / 10}d`;
}

function Section({
  icon: Icon,
  title,
  subtitle,
  action,
  children,
  bodyClassName = "p-2 sm:p-3",
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0f1016]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-sky-300" />
            <h2 className="text-sm font-semibold text-white">{title}</h2>
          </div>
          {subtitle && <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

function KpiTile({
  label,
  value,
  sub,
  icon: Icon,
  tone = "neutral",
  to,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: ComponentType<{ className?: string }>;
  tone?: "neutral" | "warn" | "danger" | "good";
  to?: string;
}) {
  const iconTone =
    tone === "danger"
      ? "text-rose-300"
      : tone === "warn"
        ? "text-amber-300"
        : tone === "good"
          ? "text-emerald-300"
          : "text-sky-300";

  const body = (
    <div className="flex h-full items-start justify-between gap-3 rounded-2xl border border-white/[0.07] bg-[#14151c] px-5 py-4 transition hover:border-white/[0.14]">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
        <p className="mt-2 text-3xl font-semibold tabular-nums text-white">{value}</p>
        <p className="mt-1 text-xs text-zinc-500">{sub}</p>
      </div>
      <div className={`rounded-xl bg-white/[0.04] p-2.5 ${iconTone}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );

  return to ? (
    <Link to={to} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}

function MetricRow({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "neutral" | "warn" | "danger" | "good";
}) {
  const valueTone =
    tone === "danger"
      ? "text-rose-200"
      : tone === "warn"
        ? "text-amber-200"
        : tone === "good"
          ? "text-emerald-200"
          : "text-white";
  return (
    <div className="flex items-baseline justify-between gap-4 px-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm text-zinc-300">{label}</p>
        {hint && <p className="text-[11px] text-zinc-600">{hint}</p>}
      </div>
      <p className={`shrink-0 text-sm font-semibold tabular-nums ${valueTone}`}>{value}</p>
    </div>
  );
}

export default function SupportModeratorDashboard() {
  const { user } = useGlobalState();
  const navigate = useNavigate();
  const [data, setData] = useState<SupportOverview | null>(() => {
    const cached = peekStaffGet(OVERVIEW_URL);
    return cached?.data?.success ? cached.data.data : null;
  });
  const [loading, setLoading] = useState(!data);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | string | null>(null);
  const [selectedDisputeId, setSelectedDisputeId] = useState<number | string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<number | string | null>(null);
  const hasData = useRef(Boolean(data));

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh || hasData.current) setRefreshing(true);
    try {
      const res = await staffGet(OVERVIEW_URL);
      if (res.data?.success) {
        hasData.current = true;
        setData(res.data.data);
        setError(false);
      } else if (!hasData.current) {
        setError(true);
      }
    } catch {
      if (!hasData.current) setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openTicketDesk = (filters: Record<string, string> = {}) => {
    const params = new URLSearchParams(filters);
    params.set("tab", "tickets");
    navigate(`/moderator/support/ticket-management?${params.toString()}`);
  };

  const handleAlertClick = (alert: Alert) => {
    const tab = alert.action?.tab;
    if (!tab) return;
    if (tab === "ticket-management" || tab === "tickets") {
      openTicketDesk(alert.action?.ticketFilters || {});
      return;
    }
    navigate(tab === "overview" ? "/moderator/support" : `/moderator/support/${tab}`);
  };

  if (loading) {
    return (
      <main className="relative z-10 flex min-h-screen items-center justify-center md:pl-[260px]">
        <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-3 md:pl-[260px]">
        <p className="text-sm text-zinc-500">Failed to load support overview from the database.</p>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:text-white"
        >
          Retry
        </button>
      </main>
    );
  }

  const {
    summary,
    charts,
    recentTickets,
    recentDisputes,
    recentReports,
    ticketLog,
    staffWorkload,
    alerts,
    queueHealth,
    disputeHealth,
    myQueue,
    groupLoad,
  } = data;

  const trend = charts.activityTrend || [];

  return (
    <main className="relative z-10 min-h-screen md:pl-[260px]" style={{ animation: "fadeIn 420ms ease" }}>
      {selectedTicketId != null && (
        <ModeratorTicketDetailModal
          ticketId={selectedTicketId}
          endpointBase="/api/moderator/support/tickets"
          accent="sky"
          onClose={() => setSelectedTicketId(null)}
          onUpdated={() => void load(true)}
        />
      )}
      {selectedDisputeId != null && (
        <ModeratorDisputeDetailModal
          disputeId={selectedDisputeId}
          endpointBase="/api/moderator/support/disputes"
          accent="sky"
          adminMode
          onClose={() => setSelectedDisputeId(null)}
          onUpdated={() => void load(true)}
          onOpenDispute={(id) => setSelectedDisputeId(id)}
        />
      )}
      {selectedReportId != null && (
        <ReportCaseDetailModal
          reportId={selectedReportId}
          endpointBase="/api/moderator/support/reports"
          accent="sky"
          onClose={() => setSelectedReportId(null)}
          onUpdated={() => void load(true)}
        />
      )}

      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#07080e]/90 backdrop-blur-xl">
        <div className="flex flex-col gap-4 px-6 py-4 md:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-400/80">
              Support control center
            </p>
            <h1 className="text-xl font-bold text-white">Support desk overview</h1>
            <p className="mt-1 text-xs text-zinc-500">
              Updated {formatDateTime(data.lastUpdated)} · Signed in as @{user?.username || "support"} ·
              Account, billing, editor, messaging and appeals queue
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start">
            <Link
              to="/moderator/support/ticket-management?tab=mine"
              className="flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-500/20"
            >
              <Inbox className="h-4 w-4" />
              My tickets
            </Link>
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl border border-white/[0.08] px-4 py-2 text-sm text-zinc-300 transition hover:border-white/20 hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="space-y-6 px-6 py-6 md:px-8 md:py-8">
        {alerts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {alerts.map((a) => {
              const clickable = Boolean(a.action?.tab);
              return (
                <button
                  key={a.id}
                  type="button"
                  disabled={!clickable}
                  onClick={() => handleAlertClick(a)}
                  title={clickable ? "Open the matching queue" : undefined}
                  className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-left text-xs transition ${
                    a.severity === "error"
                      ? "border-red-500/30 bg-red-500/10 text-red-200"
                      : a.severity === "warning"
                        ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
                        : a.severity === "success"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                          : "border-white/10 bg-white/[0.03] text-zinc-300"
                  } ${clickable ? "cursor-pointer hover:brightness-110" : "cursor-default"}`}
                >
                  {a.severity === "success" ? (
                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                  )}
                  {a.message}
                </button>
              );
            })}
          </div>
        )}

        {myQueue && (
          <Section
            icon={UserCog}
            title="My desk"
            subtitle="Cases currently assigned to you across the three support queues"
            action={
              <Link
                to="/moderator/support/ticket-management?tab=mine"
                className="text-xs font-medium text-sky-300 hover:underline"
              >
                Open my tickets
              </Link>
            }
            bodyClassName="grid gap-3 p-4 sm:grid-cols-3 xl:grid-cols-6"
          >
            <MineStat label="Open tickets" value={myQueue.openTickets} />
            <MineStat label="Awaiting my reply" value={myQueue.awaitingReply} tone="warn" />
            <MineStat label="High priority" value={myQueue.highPriority} tone="danger" />
            <MineStat label="Open disputes" value={myQueue.openDisputes} />
            <MineStat label="Open reports" value={myQueue.openReports} />
            <MineStat label="Closed in 7 days" value={myQueue.closedLast7d} tone="good" />
          </Section>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <KpiTile
            label="Open tickets"
            value={summary.openTickets}
            sub={`${summary.totalTickets} filed all time · ${summary.ticketsThisWeek} new this week`}
            icon={Ticket}
            to="/moderator/support/ticket-management?tab=tickets&flag=open_only"
          />
          <KpiTile
            label="Unassigned"
            value={summary.unassignedTickets}
            sub={
              queueHealth?.oldestUnassignedAt
                ? `Oldest waiting ${formatAge(queueHealth.oldestUnassignedAt)}`
                : "Nothing waiting to be claimed"
            }
            icon={TimerReset}
            tone={summary.unassignedTickets > 0 ? "warn" : "good"}
            to="/moderator/support/ticket-management?tab=tickets&assignee=unassigned&flag=open_only"
          />
          <KpiTile
            label="Awaiting staff reply"
            value={summary.awaitingReplyTickets}
            sub={`${summary.messagesThisWeek} ticket replies this week`}
            icon={MessageSquare}
            tone={summary.awaitingReplyTickets > 0 ? "warn" : "good"}
            to="/moderator/support/ticket-management?tab=tickets&flag=awaiting"
          />
          <KpiTile
            label="High priority"
            value={summary.highPriorityTickets}
            sub={`${summary.escalatedTickets ?? 0} escalated · ${summary.slaCompliancePercent}% closed rate`}
            icon={AlertCircle}
            tone={summary.highPriorityTickets > 0 ? "danger" : "good"}
            to="/moderator/support/ticket-management?tab=tickets&priority=High&flag=open_only"
          />
          <KpiTile
            label="Open disputes"
            value={summary.openDisputes}
            sub={`${summary.creditsAtRisk.toLocaleString()} credits at risk · ${summary.totalDisputes} total`}
            icon={Scale}
            tone={summary.openDisputes > 0 ? "warn" : "good"}
            to="/moderator/support/disputes"
          />
          <KpiTile
            label="Open reports"
            value={summary.openScopedReports ?? summary.openReports}
            sub={`${summary.openReports} platform-wide · ${summary.unassignedReports ?? 0} unassigned`}
            icon={ShieldAlert}
            tone={(summary.openScopedReports ?? summary.openReports) > 0 ? "warn" : "good"}
            to="/moderator/support/reports"
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {queueHealth && (
            <Section
              icon={Gauge}
              title="Response health"
              subtitle="First-reply target is 24h; a ticket is overdue after 72h open"
              bodyClassName="divide-y divide-white/[0.04] p-2"
            >
              <MetricRow
                label="Oldest open ticket"
                value={formatAge(queueHealth.oldestOpenAt)}
                hint={formatDateTime(queueHealth.oldestOpenAt)}
                tone={queueHealth.openOver7d > 0 ? "danger" : "neutral"}
              />
              <MetricRow
                label="No staff reply yet"
                value={queueHealth.awaitingFirstReply}
                hint={`${queueHealth.firstReplyBreached} past the 24h target`}
                tone={queueHealth.firstReplyBreached > 0 ? "danger" : "good"}
              />
              <MetricRow
                label="Open over 72h"
                value={queueHealth.openOver72h}
                hint={`${queueHealth.openOver7d} open over 7 days`}
                tone={queueHealth.openOver72h > 0 ? "warn" : "good"}
              />
              <MetricRow
                label="Average first reply"
                value={formatHours(queueHealth.avgFirstReplyHours)}
                hint="Tickets opened in the last 30 days"
              />
              <MetricRow
                label="Average time to close"
                value={formatHours(queueHealth.avgResolutionHours)}
                hint="Tickets closed in the last 30 days"
              />
              <MetricRow
                label="Closed"
                value={`${queueHealth.closedLast24h} / ${queueHealth.closedLast7d}`}
                hint="Last 24 hours / last 7 days"
                tone="good"
              />
              <MetricRow
                label="Member rating"
                value={
                  queueHealth.avgSatisfaction === null ? "—" : `${queueHealth.avgSatisfaction} / 5`
                }
                hint={`${queueHealth.ratedTickets} rated ticket(s)`}
              />
            </Section>
          )}

          <Section
            icon={Layers}
            title="Load by support group"
            subtitle="Open tickets per catalog group — click to filter the desk"
            bodyClassName="divide-y divide-white/[0.04] p-2"
          >
            {(groupLoad || []).map((group) => (
              <button
                key={group.label}
                type="button"
                onClick={() =>
                  openTicketDesk({ subgroup: group.label, flag: "open_only" })
                }
                className="flex w-full items-baseline justify-between gap-4 px-3 py-2.5 text-left transition hover:bg-white/[0.03]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-zinc-300">{group.label}</p>
                  <p className="text-[11px] text-zinc-600">{group.total} filed all time</p>
                </div>
                <span className="shrink-0 rounded-full bg-sky-500/15 px-2 py-0.5 text-xs font-medium tabular-nums text-sky-200">
                  {group.open}
                </span>
              </button>
            ))}
            {!groupLoad?.length && (
              <p className="px-3 py-10 text-center text-sm text-zinc-500">
                No support tickets in the database yet.
              </p>
            )}
          </Section>

          <div className="space-y-4">
            {disputeHealth && (
              <Section
                icon={Scale}
                title="Dispute pressure"
                subtitle="Support owns the whole dispute queue"
                bodyClassName="divide-y divide-white/[0.04] p-2"
              >
                <MetricRow
                  label="Oldest open dispute"
                  value={formatAge(disputeHealth.oldestOpenAt)}
                  hint={formatDateTime(disputeHealth.oldestOpenAt)}
                />
                <MetricRow
                  label="Unassigned"
                  value={disputeHealth.unassigned}
                  tone={disputeHealth.unassigned > 0 ? "warn" : "good"}
                />
                <MetricRow
                  label="High priority"
                  value={disputeHealth.highPriority}
                  tone={disputeHealth.highPriority > 0 ? "danger" : "good"}
                />
                <MetricRow
                  label="Resolved last 7 days"
                  value={disputeHealth.resolvedLast7d}
                  tone="good"
                />
              </Section>
            )}
            <Section
              icon={ShieldAlert}
              title="Account standing"
              subtitle="Platform-wide enforcement in force right now"
              bodyClassName="divide-y divide-white/[0.04] p-2"
            >
              <MetricRow label="Active violations" value={summary.activeViolations} />
              <MetricRow label="Active restrictions" value={summary.activeRestrictions} />
              <MetricRow
                label="Reports filed this week"
                value={summary.reportsThisWeek ?? 0}
                hint="Inside the support report scope"
              />
            </Section>
          </div>
        </div>

        <ChartCard>
          <LineChart
            title="Desk activity (last 14 days)"
            subtitle="Tickets filed, tickets closed and ticket replies per day"
            labels={trend.map((p) =>
              new Date(p.day).toLocaleDateString(undefined, { month: "short", day: "numeric" })
            )}
            series={[
              { label: "Filed", color: "#38bdf8", values: trend.map((p) => p.tickets) },
              { label: "Closed", color: "#34d399", values: trend.map((p) => p.closed ?? 0) },
              { label: "Replies", color: "#a78bfa", values: trend.map((p) => p.messages) },
            ]}
          />
        </ChartCard>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <ChartCard>
            <DonutChart
              title="Tickets by status"
              segments={charts.ticketStatusMix.map((s) => ({
                label: s.label,
                value: s.value,
                color: s.color || "#38bdf8",
              }))}
            />
          </ChartCard>
          <ChartCard>
            <DonutChart
              title="Open tickets by priority"
              segments={(charts.openByPriority || charts.priorityMix).map((s) => ({
                label: s.label,
                value: s.value,
                color: s.color || "#38bdf8",
              }))}
            />
          </ChartCard>
          <ChartCard>
            <DonutChart
              title="Disputes by status"
              segments={charts.disputeStatusMix.map((s) => ({
                label: s.label,
                value: s.value,
                color: s.color || "#38bdf8",
              }))}
            />
          </ChartCard>
          <ChartCard>
            <HorizontalBarChart
              title="Tickets by type"
              subtitle="Support catalog types only"
              data={(charts.ticketTypes || charts.ticketCategories).map((c) => ({
                label: c.label,
                value: c.value,
              }))}
              colorFrom="#0ea5e9"
              colorTo="#38bdf8"
            />
          </ChartCard>
          <ChartCard>
            <DonutChart
              title="Reports by status"
              segments={(charts.reportStatusMix || []).map((s) => ({
                label: s.label,
                value: s.value,
                color: s.color || "#38bdf8",
              }))}
            />
          </ChartCard>
          <ChartCard>
            <HorizontalBarChart
              title="Reports by target"
              subtitle="Accounts, messages, teams and technical problems"
              data={charts.reportTargets || []}
              colorFrom="#6366f1"
              colorTo="#a78bfa"
            />
          </ChartCard>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <Section
              icon={Ticket}
              title="Support ticket queue"
              subtitle="Account, billing, editor, messaging and appeals tickets — click a row to open"
              action={
                <Link
                  to="/moderator/support/ticket-management"
                  className="text-xs font-medium text-sky-300 hover:underline"
                >
                  Open desk
                </Link>
              }
              bodyClassName="overflow-x-auto"
            >
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wide text-zinc-600">
                    <th className="px-4 py-2.5 font-medium">Ticket</th>
                    <th className="px-4 py-2.5 font-medium">Requester</th>
                    <th className="px-4 py-2.5 font-medium">Type</th>
                    <th className="px-4 py-2.5 font-medium">Priority</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Handler</th>
                    <th className="px-4 py-2.5 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTickets.map((t) => (
                    <tr
                      key={String(t.id)}
                      onClick={() => setSelectedTicketId(t.id)}
                      className="cursor-pointer border-b border-white/[0.04] text-zinc-300 transition hover:bg-white/[0.03]"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{t.number}</p>
                        <p className="line-clamp-1 text-xs text-zinc-500">{t.subject}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-zinc-200">{t.requester.name}</p>
                        <p className="text-[11px] text-zinc-500">@{t.requester.username || "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-xs">{t.type || t.category || "—"}</td>
                      <td className="px-4 py-3">
                        <PriorityBadge priority={t.priority} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {t.assignee?.name || <span className="text-amber-200/90">Unassigned</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">
                        {formatDateTime(t.updatedAt || t.createdAt)}
                      </td>
                    </tr>
                  ))}
                  {recentTickets.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-sm text-zinc-500">
                        No support-scope tickets in the queue.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Section>
          </div>

          <Section
            icon={ShieldAlert}
            title="Member reports"
            subtitle="Awaiting triage in the support scope"
            action={
              <Link
                to="/moderator/support/reports"
                className="text-xs font-medium text-sky-300 hover:underline"
              >
                Open desk
              </Link>
            }
            bodyClassName="max-h-[420px] space-y-2 overflow-y-auto p-3"
          >
            {(recentReports || []).map((r) => (
              <button
                key={String(r.id)}
                type="button"
                onClick={() => setSelectedReportId(r.id)}
                className="flex w-full flex-col gap-1 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 text-left transition hover:bg-white/[0.05]"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-sky-200">{r.number}</p>
                  <span className="text-[10px] text-zinc-500">{titleCaseWords(r.status)}</span>
                </div>
                <p className="line-clamp-1 text-sm text-white">{r.type}</p>
                <p className="text-[11px] text-zinc-500">
                  {titleCaseWords(r.targetType)}
                  {r.targetId ? ` · ${r.targetId}` : ""} · @{r.reporter?.username || "—"}
                  {r.assignee ? ` · ${r.assignee.name}` : " · Unassigned"}
                </p>
              </button>
            ))}
            {(!recentReports || recentReports.length === 0) && (
              <p className="py-12 text-center text-sm text-zinc-500">No reports in this scope.</p>
            )}
          </Section>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Section
            icon={Coins}
            title="Active disputes"
            subtitle="Credits held while the two sides disagree"
            action={
              <Link
                to="/moderator/support/disputes"
                className="text-xs font-medium text-sky-300 hover:underline"
              >
                Open disputes
              </Link>
            }
            bodyClassName="p-2"
          >
            <ul className="divide-y divide-white/[0.04]">
              {(recentDisputes || []).map((d) => (
                <li key={String(d.id)}>
                  <button
                    type="button"
                    onClick={() => setSelectedDisputeId(d.id)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-white/[0.03]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-zinc-200">{d.title}</p>
                      <p className="text-[11px] text-zinc-500">
                        {d.number} · {titleCaseWords(d.type) || "—"} ·{" "}
                        <span className="text-amber-300/80">
                          {d.creditAmount.toLocaleString()} credits
                        </span>
                      </p>
                    </div>
                    <StatusBadge status={d.status} />
                  </button>
                </li>
              ))}
              {(!recentDisputes || recentDisputes.length === 0) && (
                <li className="px-3 py-12 text-center text-sm text-zinc-500">No disputes.</li>
              )}
            </ul>
          </Section>

          <Section
            icon={Users}
            title="Team workload"
            subtitle="Support Moderators and what each one is holding"
            action={
              <Link
                to="/moderator/support/ticket-management?tab=assignments"
                className="text-xs font-medium text-sky-300 hover:underline"
              >
                Assignments
              </Link>
            }
            bodyClassName="p-2"
          >
            <ul className="divide-y divide-white/[0.04]">
              {staffWorkload.map((s) => (
                <li
                  key={String(s.staffId)}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate text-zinc-200">{s.name}</p>
                    <p className="text-[11px] text-zinc-500">
                      {s.openTickets} tickets · {s.openDisputes ?? 0} disputes · {s.openReports}{" "}
                      reports
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-sky-500/15 px-2 py-0.5 text-xs font-medium tabular-nums text-sky-200">
                    {s.totalOpen}
                  </span>
                </li>
              ))}
              {staffWorkload.length === 0 && (
                <li className="px-3 py-12 text-center text-sm text-zinc-500">
                  No Support Moderator accounts yet.
                </li>
              )}
            </ul>
          </Section>
        </div>

        <Section
          icon={History}
          title="Activity log"
          subtitle="Most recent ticket and dispute events on this desk"
          bodyClassName="p-2"
        >
          <ul className="divide-y divide-white/[0.04]">
            {ticketLog.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate text-zinc-200">{entry.label}</p>
                  <p className="text-[11px] text-zinc-500">
                    {entry.ref} · {entry.type} · {titleCaseWords(entry.status)}
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-zinc-500">
                  <Clock className="h-3 w-3" />
                  {formatDateTime(entry.at)}
                </span>
              </li>
            ))}
            {ticketLog.length === 0 && (
              <li className="px-3 py-12 text-center text-sm text-zinc-500">No recent activity.</li>
            )}
          </ul>
        </Section>

        <p className="flex items-center gap-2 text-[11px] text-zinc-600">
          <BarChart3 className="h-3.5 w-3.5" />
          Data sources: {data.dataSources.tables.slice(0, 5).join(", ")}
          {data.dataSources.tables.length > 5 ? "…" : ""}
        </p>
      </div>
    </main>
  );
}

function MineStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "warn" | "danger" | "good";
}) {
  const valueTone =
    tone === "danger" && value > 0
      ? "text-rose-200"
      : tone === "warn" && value > 0
        ? "text-amber-200"
        : tone === "good"
          ? "text-emerald-200"
          : "text-white";
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${valueTone}`}>{value}</p>
    </div>
  );
}
