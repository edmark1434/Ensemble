import { useEffect, useState } from "react";
import { AlertCircle, History, Loader2, MessageSquare, Scale, ShieldAlert, Ticket, TimerReset } from "lucide-react";
import api from "@/lib/axios";
import { ChartCard, DonutChart, HorizontalBarChart } from "@/pages/admin/analytics/components/AnalyticsCharts";
import type { SupportOverview } from "../shared/moderatorTypes";
import { AlertList, StatCard } from "../shared/ui";

export default function SupportModeratorDashboard() {
  const [data, setData] = useState<SupportOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.get("/api/moderator/support/overview");
        if (active && res.data?.success) setData(res.data.data);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

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

  const { summary, charts, recentTickets, ticketLog, staffWorkload, alerts } = data;

  return (
    <main className="relative z-10 min-h-screen px-6 py-8 md:ml-72 md:px-10" style={{ animation: "fadeIn 420ms ease" }}>
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-400">Support Moderator</p>
        <h1 className="text-2xl font-bold text-white">Support Desk Overview</h1>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard accent="sky" label="Open tickets" value={summary.openTickets} sub={`${summary.totalTickets} total in support scope`} icon={Ticket} />
        <StatCard accent="sky" label="Unassigned" value={summary.unassignedTickets} sub="Waiting to be picked up" icon={TimerReset} />
        <StatCard accent="sky" label="Open disputes" value={summary.openDisputes} sub={`${summary.creditsAtRisk.toLocaleString()} credits at risk`} icon={Scale} />
        <StatCard accent="sky" label="Open reports" value={summary.openReports} sub={`${summary.totalReports} reports total`} icon={ShieldAlert} />
        <StatCard accent="sky" label="Live chat waiting" value={summary.chatWaiting} sub={`SLA compliance ${summary.slaCompliancePercent}%`} icon={MessageSquare} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <ChartCard>
          <DonutChart
            title="Tickets by status"
            segments={charts.ticketStatusMix.map((s) => ({ label: s.label, value: s.value, color: s.color || "#38bdf8" }))}
          />
        </ChartCard>
        <ChartCard>
          <HorizontalBarChart title="Tickets by category" data={charts.ticketCategories} />
        </ChartCard>
      </div>

      <div className="mb-6 rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <AlertCircle className="h-4 w-4 text-sky-400" />
          Alerts
        </p>
        <AlertList alerts={alerts} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5 lg:col-span-2">
          <p className="mb-3 text-sm font-semibold text-white">Recent tickets</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-zinc-500">
                  <th className="pb-2">Ticket</th>
                  <th className="pb-2">Requester</th>
                  <th className="pb-2">Category</th>
                  <th className="pb-2">Priority</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-white/[0.02]">
                    <td className="py-2.5 text-zinc-200">{t.subject}</td>
                    <td className="py-2.5 text-zinc-400">@{t.requester.username}</td>
                    <td className="py-2.5 text-zinc-400">{t.category || "—"}</td>
                    <td className="py-2.5 text-zinc-400">{t.priority}</td>
                    <td className="py-2.5 text-zinc-400">{t.status.replace("_", " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
          <p className="mb-3 text-sm font-semibold text-white">Team workload</p>
          <ul className="space-y-2">
            {staffWorkload.map((s) => (
              <li key={s.staffId} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm">
                <div>
                  <p className="text-zinc-200">{s.name}</p>
                  <p className="text-[11px] text-zinc-500">{s.role}</p>
                </div>
                <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-xs font-medium text-sky-300">{s.totalOpen} open</span>
              </li>
            ))}
            {staffWorkload.length === 0 && <li className="text-sm text-zinc-500">No staff workload data.</li>}
          </ul>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <History className="h-4 w-4 text-sky-400" />
          Ticket log
        </p>
        <ul className="space-y-2">
          {ticketLog.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate text-zinc-200">{entry.label}</p>
                <p className="text-[11px] text-zinc-500">
                  {entry.ref} · {entry.type} · {entry.status.replace("_", " ")}
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
