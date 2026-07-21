import { useEffect, useState } from "react";
import { AlertCircle, Briefcase, Coins, FileSignature, Gem, Loader2, Scale, Ticket, TimerReset } from "lucide-react";
import api from "@/lib/axios";
import { ChartCard, DonutChart } from "@/pages/admin/analytics/components/AnalyticsCharts";
import type { JobsOverview } from "../shared/moderatorTypes";
import { AlertList, StatCard } from "../shared/ui";

export default function JobsModeratorDashboard() {
  const [data, setData] = useState<JobsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.get("/api/moderator/jobs/overview");
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
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="relative z-10 flex min-h-screen items-center justify-center md:ml-72">
        <p className="text-sm text-zinc-500">Failed to load jobs & gigs overview.</p>
      </main>
    );
  }

  const { summary, charts, recentTickets, disputes, alerts } = data;

  return (
    <main className="relative z-10 min-h-screen px-6 py-8 md:ml-72 md:px-10" style={{ animation: "fadeIn 420ms ease" }}>
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-400">Jobs &amp; Gigs Moderator</p>
        <h1 className="text-2xl font-bold text-white">Jobs &amp; Gigs Overview</h1>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard accent="emerald" label="Total jobs" value={summary.totalJobs} sub={`${summary.activeJobs} active job postings`} icon={Briefcase} />
        <StatCard accent="emerald" label="Total gigs" value={summary.totalGigs} sub={`${summary.activeGigs} active gig postings`} icon={Gem} />
        <StatCard accent="emerald" label="Active contracts" value={summary.activeContracts} sub="Contracts in progress" icon={FileSignature} />
        <StatCard accent="emerald" label="Open tickets" value={summary.openTickets} sub={`${summary.totalTickets} job/gig tickets total`} icon={Ticket} />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard accent="emerald" label="Open disputes" value={summary.openDisputes} sub={`${summary.totalDisputes} disputes total`} icon={Scale} />
        <StatCard accent="emerald" label="Credits at risk" value={summary.creditsAtRisk.toLocaleString()} sub="Held in open disputes" icon={Coins} />
        <StatCard accent="emerald" label="Unassigned" value={summary.unassignedTickets} sub="Tickets waiting" icon={TimerReset} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <ChartCard>
          <DonutChart
            title="Postings by type"
            segments={charts.postingsMix.map((s) => ({ label: s.label, value: s.value, color: s.color || "#34d399" }))}
          />
        </ChartCard>
        <ChartCard>
          <DonutChart
            title="Tickets by status"
            segments={charts.ticketStatusMix.map((s) => ({ label: s.label, value: s.value, color: s.color || "#34d399" }))}
          />
        </ChartCard>
        <ChartCard>
          <DonutChart
            title="Disputes by status"
            segments={charts.disputeStatusMix.map((s) => ({ label: s.label, value: s.value, color: s.color || "#34d399" }))}
          />
        </ChartCard>
      </div>

      <div className="mb-6 rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <AlertCircle className="h-4 w-4 text-emerald-400" />
          Alerts
        </p>
        <AlertList alerts={alerts} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
          <p className="mb-3 text-sm font-semibold text-white">Recent tickets</p>
          <ul className="space-y-2">
            {recentTickets.map((t) => (
              <li key={t.id} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm">
                <p className="text-zinc-200">{t.subject}</p>
                <p className="text-[11px] text-zinc-500">
                  @{t.requester.username} · {t.priority} · {t.status.replace("_", " ")}
                </p>
              </li>
            ))}
            {recentTickets.length === 0 && <li className="text-sm text-zinc-500">No job/gig tickets.</li>}
          </ul>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
          <p className="mb-3 text-sm font-semibold text-white">Active disputes</p>
          <ul className="space-y-2">
            {disputes.map((d) => (
              <li key={d.id} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm">
                <p className="text-zinc-200">{d.title}</p>
                <p className="text-[11px] text-zinc-500">
                  {d.number} · {d.relatedEntityType} · {d.creditAmount.toLocaleString()} credits · {d.status.replace("_", " ")}
                </p>
              </li>
            ))}
            {disputes.length === 0 && <li className="text-sm text-zinc-500">No job/gig disputes.</li>}
          </ul>
        </div>
      </div>
    </main>
  );
}
