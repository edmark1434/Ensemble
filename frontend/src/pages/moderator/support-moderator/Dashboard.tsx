import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  BarChart3,
  Coins,
  History,
  Loader2,
  MessageSquare,
  RefreshCw,
  Scale,
  ShieldAlert,
  Ticket,
  TimerReset,
  Users,
} from "lucide-react";
import api from "@/lib/axios";
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
import { AlertList, PriorityBadge, StatCard, StatusBadge, titleCaseWords } from "../shared/ui";

function DeskPanel({
  icon: Icon,
  title,
  subtitle,
  action,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f1016]">
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
      <div className="p-2 sm:p-3">{children}</div>
    </section>
  );
}

export default function SupportModeratorDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<SupportOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | string | null>(null);
  const [selectedDisputeId, setSelectedDisputeId] = useState<number | string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<number | string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await api.get("/api/moderator/support/overview");
      if (res.data?.success) {
        setData(res.data.data);
        setError(false);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAlertClick = (alert: Alert) => {
    const tab = alert.action?.tab;
    if (!tab) return;
    if (tab === "ticket-management" && alert.action?.ticketFilters) {
      const params = new URLSearchParams(alert.action.ticketFilters);
      navigate(`/moderator/support/ticket-management?${params.toString()}`);
      return;
    }
    navigate(tab === "overview" ? "/moderator/support" : `/moderator/support/${tab}`);
  };

  if (loading) {
    return (
      <main className="relative z-10 flex min-h-screen items-center justify-center md:ml-72">
        <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-3 md:ml-72">
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

  const { summary, charts, recentTickets, recentDisputes, recentReports, ticketLog, staffWorkload, alerts } =
    data;

  return (
    <main
      className="relative z-10 min-h-screen px-6 py-8 md:ml-72 md:px-10"
      style={{ animation: "fadeIn 420ms ease" }}
    >
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
          onClose={() => setSelectedDisputeId(null)}
          onUpdated={() => void load(true)}
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

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-400">
            Support Moderator
          </p>
          <h1 className="text-2xl font-bold text-white">Support desk overview</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Live queues from Postgres tickets, disputes, and reports.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-zinc-600">
            Updated{" "}
            {new Date(data.lastUpdated).toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          accent="sky"
          label="Open tickets"
          value={summary.openTickets}
          sub={`${summary.totalTickets} total · ${summary.ticketsThisWeek} new this week`}
          icon={Ticket}
        />
        <StatCard
          accent="sky"
          label="Unassigned"
          value={summary.unassignedTickets}
          sub="Waiting to be picked up"
          icon={TimerReset}
        />
        <StatCard
          accent="sky"
          label="High priority"
          value={summary.highPriorityTickets}
          sub={`${summary.resolvedTickets} resolved · ${summary.slaCompliancePercent}% closed rate`}
          icon={AlertCircle}
        />
        <StatCard
          accent="sky"
          label="Awaiting reply"
          value={summary.awaitingReplyTickets}
          sub={`${summary.messagesThisWeek} ticket replies this week`}
          icon={MessageSquare}
        />
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          accent="sky"
          label="Open disputes"
          value={summary.openDisputes}
          sub={`${summary.totalDisputes} disputes total`}
          icon={Scale}
        />
        <StatCard
          accent="sky"
          label="Credits at risk"
          value={summary.creditsAtRisk.toLocaleString()}
          sub="Held in open disputes"
          icon={Coins}
        />
        <StatCard
          accent="sky"
          label="Open reports"
          value={summary.openReports}
          sub={`${summary.totalReports} reports total`}
          icon={ShieldAlert}
        />
        <StatCard
          accent="sky"
          label="Active violations"
          value={summary.activeViolations}
          sub={`${summary.activeRestrictions} active restriction(s)`}
          icon={ShieldAlert}
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <ChartCard>
          <LineChart
            title="Activity (last 14 days)"
            labels={charts.activityTrend.map((p) =>
              new Date(p.day).toLocaleDateString(undefined, { month: "short", day: "numeric" })
            )}
            series={[
              { label: "Tickets", color: "#38bdf8", values: charts.activityTrend.map((p) => p.tickets) },
              { label: "Messages", color: "#a78bfa", values: charts.activityTrend.map((p) => p.messages) },
            ]}
          />
        </ChartCard>
        <ChartCard>
          <HorizontalBarChart title="Tickets by type" data={charts.ticketCategories} color="#38bdf8" />
        </ChartCard>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
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
            title="Tickets by priority"
            segments={charts.priorityMix.map((s) => ({
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
      </div>

      <div className="mb-6">
        <DeskPanel
          icon={AlertCircle}
          title="Alerts"
          subtitle="Click an alert to open the matching support queue"
        >
          <div className="px-2 py-1">
            <AlertList alerts={alerts} onAlertClick={handleAlertClick} />
          </div>
        </DeskPanel>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DeskPanel
            icon={Ticket}
            title="Recent tickets"
            subtitle="Support-scope tickets from the database"
            action={
              <Link
                to="/moderator/support/ticket-management"
                className="text-xs font-medium text-sky-300 hover:underline"
              >
                Open ticket desk
              </Link>
            }
          >
            <ul className="divide-y divide-white/[0.04]">
              {recentTickets.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedTicketId(t.id)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-white/[0.03]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-zinc-200">{t.subject}</p>
                      <p className="text-[11px] text-zinc-500">
                        {t.number} · @{t.requester.username} · {t.type || t.category} · {t.messageCount}{" "}
                        msg
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <PriorityBadge priority={t.priority} />
                      <StatusBadge status={t.status} />
                    </div>
                  </button>
                </li>
              ))}
              {recentTickets.length === 0 && (
                <li className="px-3 py-8 text-center text-xs text-zinc-600">
                  No support-scope tickets in the database.
                </li>
              )}
            </ul>
          </DeskPanel>
        </div>

        <DeskPanel icon={Users} title="Team workload" subtitle="Support Moderators & Admins">
          <ul className="divide-y divide-white/[0.04]">
            {staffWorkload.map((s) => (
              <li key={s.staffId} className="flex items-center justify-between px-3 py-2.5 text-sm">
                <div>
                  <p className="text-zinc-200">{s.name}</p>
                  <p className="text-[11px] text-zinc-500">
                    {s.role} · {s.openTickets} tickets · {s.openDisputes ?? 0} disputes · {s.openReports}{" "}
                    reports
                  </p>
                </div>
                <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-xs font-medium text-sky-300">
                  {s.totalOpen}
                </span>
              </li>
            ))}
            {staffWorkload.length === 0 && (
              <li className="px-3 py-8 text-center text-sm text-zinc-500">No staff workload data.</li>
            )}
          </ul>
        </DeskPanel>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <DeskPanel
          icon={Scale}
          title="Active disputes"
          subtitle="Full dispute queue handled by Support"
          action={
            <Link to="/moderator/support/disputes" className="text-xs font-medium text-sky-300 hover:underline">
              Open disputes
            </Link>
          }
        >
          <ul className="divide-y divide-white/[0.04]">
            {(recentDisputes || []).map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => setSelectedDisputeId(d.id)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-white/[0.03]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-zinc-200">{d.title}</p>
                    <p className="text-[11px] text-zinc-500">
                      {d.number} · {d.relatedEntityType || "—"} ·{" "}
                      <span className="text-amber-300/80">{d.creditAmount.toLocaleString()} credits</span>
                    </p>
                  </div>
                  <StatusBadge status={d.status} />
                </button>
              </li>
            ))}
            {(!recentDisputes || recentDisputes.length === 0) && (
              <li className="px-3 py-8 text-center text-xs text-zinc-600">No disputes.</li>
            )}
          </ul>
        </DeskPanel>

        <DeskPanel
          icon={ShieldAlert}
          title="Recent reports"
          subtitle="Member reports awaiting triage"
          action={
            <Link to="/moderator/support/user-team" className="text-xs font-medium text-sky-300 hover:underline">
              Open reports
            </Link>
          }
        >
          <ul className="divide-y divide-white/[0.04]">
            {(recentReports || []).map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setSelectedReportId(r.id)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-white/[0.03]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-zinc-200">{r.reason}</p>
                    <p className="text-[11px] text-zinc-500">
                      {r.number} · {r.targetType} · @{r.reporter.username}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </button>
              </li>
            ))}
            {(!recentReports || recentReports.length === 0) && (
              <li className="px-3 py-8 text-center text-xs text-zinc-600">No reports.</li>
            )}
          </ul>
        </DeskPanel>
      </div>

      <DeskPanel
        icon={History}
        title="Activity log"
        subtitle="Recent ticket and dispute events"
      >
        <ul className="divide-y divide-white/[0.04]">
          {ticketLog.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate text-zinc-200">{entry.label}</p>
                <p className="text-[11px] text-zinc-500">
                  {entry.ref} · {entry.type} · {titleCaseWords(entry.status)}
                </p>
              </div>
              <span className="shrink-0 text-[11px] text-zinc-500">
                {new Date(entry.at).toLocaleString()}
              </span>
            </li>
          ))}
          {ticketLog.length === 0 && (
            <li className="px-3 py-8 text-center text-sm text-zinc-500">No recent activity.</li>
          )}
        </ul>
      </DeskPanel>

      <p className="mt-4 flex items-center gap-2 text-[11px] text-zinc-600">
        <BarChart3 className="h-3.5 w-3.5" />
        Data sources: {data.dataSources.tables.slice(0, 5).join(", ")}
        {data.dataSources.tables.length > 5 ? "…" : ""}
      </p>
    </main>
  );
}
