import { useCallback, useEffect, useState } from "react";
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
import { ChartCard, DonutChart, HorizontalBarChart, LineChart } from "@/pages/admin/analytics/components/AnalyticsCharts";
import type { SupportOverview } from "../shared/moderatorTypes";
import { AlertList, PriorityBadge, StatCard, StatusBadge, titleCaseWords } from "../shared/ui";

function SectionTitle({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
      <Icon className="h-3.5 w-3.5 text-sky-400" />
      {children}
    </p>
  );
}

export default function SupportModeratorDashboard() {
  const [data, setData] = useState<SupportOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await api.get("/api/moderator/support/overview");
      if (res.data?.success) {
        setData(res.data.data);
        setError(false);
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

  if (loading) {
    return (
      <main className="relative z-10 flex min-h-screen items-center justify-center md:ml-72">
        <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="relative z-10 flex min-h-screen items-center justify-center md:ml-72">
        <p className="text-sm text-zinc-500">Failed to load support overview.</p>
      </main>
    );
  }

  const { summary, charts, recentTickets, recentDisputes, recentReports, ticketLog, staffWorkload, alerts } = data;

  return (
    <main className="relative z-10 min-h-screen px-6 py-8 md:ml-72 md:px-10" style={{ animation: "fadeIn 420ms ease" }}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-400">Support Moderator</p>
          <h1 className="text-2xl font-bold text-white">Support Desk Overview</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Tickets, disputes, reports and live chat queues for the general support desk.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-zinc-600">
            Updated {new Date(data.lastUpdated).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
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

      <SectionTitle icon={Ticket}>Ticket queue</SectionTitle>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          accent="sky"
          label="Open tickets"
          value={summary.openTickets}
          sub={`${summary.totalTickets} total · ${summary.ticketsThisWeek} new this week`}
          icon={Ticket}
        />
        <StatCard accent="sky" label="Unassigned" value={summary.unassignedTickets} sub="Waiting to be picked up" icon={TimerReset} />
        <StatCard
          accent="sky"
          label="High priority"
          value={summary.highPriorityTickets}
          sub={`${summary.resolvedTickets} resolved · SLA ${summary.slaCompliancePercent}%`}
          icon={AlertCircle}
        />
        <StatCard
          accent="sky"
          label="Messages"
          value={summary.totalMessages}
          sub={`${summary.messagesThisWeek} replies this week`}
          icon={MessageSquare}
        />
      </div>

      <SectionTitle icon={Scale}>Disputes &amp; risk</SectionTitle>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard accent="sky" label="Open disputes" value={summary.openDisputes} sub={`${summary.totalDisputes} disputes total`} icon={Scale} />
        <StatCard accent="sky" label="Credits at risk" value={summary.creditsAtRisk.toLocaleString()} sub="Held in open disputes" icon={Coins} />
        <StatCard accent="sky" label="Open reports" value={summary.openReports} sub={`${summary.totalReports} reports total`} icon={ShieldAlert} />
        <StatCard
          accent="sky"
          label="Active violations"
          value={summary.activeViolations}
          sub={`${summary.activeRestrictions} active restriction(s)`}
          icon={ShieldAlert}
        />
      </div>

      <SectionTitle icon={BarChart3}>Analytics</SectionTitle>
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
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
            segments={charts.ticketStatusMix.map((s) => ({ label: s.label, value: s.value, color: s.color || "#38bdf8" }))}
          />
        </ChartCard>
        <ChartCard>
          <DonutChart
            title="Tickets by priority"
            segments={charts.priorityMix.map((s) => ({ label: s.label, value: s.value, color: s.color || "#38bdf8" }))}
          />
        </ChartCard>
        <ChartCard>
          <DonutChart
            title="Disputes by status"
            segments={charts.disputeStatusMix.map((s) => ({ label: s.label, value: s.value, color: s.color || "#38bdf8" }))}
          />
        </ChartCard>
      </div>

      <div className="mb-6 rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <AlertCircle className="h-4 w-4 text-sky-400" />
          Alerts
        </p>
        <AlertList alerts={alerts} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5 lg:col-span-2">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <Ticket className="h-4 w-4 text-sky-400" />
            Recent tickets
          </p>
          <ul className="space-y-2">
            {recentTickets.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm transition hover:bg-white/[0.04]"
              >
                <div className="min-w-0">
                  <p className="truncate text-zinc-200">{t.subject}</p>
                  <p className="text-[11px] text-zinc-500">
                    {t.number} · @{t.requester.username} · {t.category} · {t.messageCount} msg
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <PriorityBadge priority={t.priority} />
                  <StatusBadge status={t.status} />
                </div>
              </li>
            ))}
            {recentTickets.length === 0 && (
              <li className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-xs text-zinc-600">
                No support-scope tickets.
              </li>
            )}
          </ul>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <Users className="h-4 w-4 text-sky-400" />
            Team workload
          </p>
          <ul className="space-y-2">
            {staffWorkload.map((s) => (
              <li key={s.staffId} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm">
                <div>
                  <p className="text-zinc-200">{s.name}</p>
                  <p className="text-[11px] text-zinc-500">
                    {s.role} · {s.openTickets} tickets · {s.openReports} reports
                  </p>
                </div>
                <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-xs font-medium text-sky-300">{s.totalOpen}</span>
              </li>
            ))}
            {staffWorkload.length === 0 && <li className="text-sm text-zinc-500">No staff workload data.</li>}
          </ul>
        </div>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <Scale className="h-4 w-4 text-sky-400" />
            Active disputes
          </p>
          <ul className="space-y-2">
            {(recentDisputes || []).map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate text-zinc-200">{d.title}</p>
                  <p className="text-[11px] text-zinc-500">
                    {d.number} · {d.relatedEntityType || "—"} ·{" "}
                    <span className="text-amber-300/80">{d.creditAmount.toLocaleString()} credits</span>
                  </p>
                </div>
                <StatusBadge status={d.status} />
              </li>
            ))}
            {(!recentDisputes || recentDisputes.length === 0) && (
              <li className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-xs text-zinc-600">
                No disputes.
              </li>
            )}
          </ul>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <ShieldAlert className="h-4 w-4 text-sky-400" />
            Recent reports
          </p>
          <ul className="space-y-2">
            {(recentReports || []).map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate text-zinc-200">{r.reason}</p>
                  <p className="text-[11px] text-zinc-500">
                    {r.number} · {r.targetType} · @{r.reporter.username}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </li>
            ))}
            {(!recentReports || recentReports.length === 0) && (
              <li className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-xs text-zinc-600">
                No reports.
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <History className="h-4 w-4 text-sky-400" />
          Activity log
        </p>
        <ul className="space-y-2">
          {ticketLog.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate text-zinc-200">{entry.label}</p>
                <p className="text-[11px] text-zinc-500">
                  {entry.ref} · {entry.type} · {titleCaseWords(entry.status)}
                </p>
              </div>
              <span className="shrink-0 text-[11px] text-zinc-500">{new Date(entry.at).toLocaleString()}</span>
            </li>
          ))}
          {ticketLog.length === 0 && <li className="text-sm text-zinc-500">No recent activity.</li>}
        </ul>
      </div>
    </main>
  );
}
