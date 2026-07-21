import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Briefcase,
  Coins,
  FileSignature,
  FileText,
  Gem,
  Inbox,
  Loader2,
  Lock,
  RefreshCw,
  Scale,
  Star,
  Ticket,
  TimerReset,
  TrendingUp,
} from "lucide-react";
import api from "@/lib/axios";
import { ChartCard, DonutChart, LineChart } from "@/pages/admin/analytics/components/AnalyticsCharts";
import type { JobsOverview } from "../shared/moderatorTypes";
import { AlertList, PriorityBadge, StatCard, StatusBadge } from "../shared/ui";

function SectionTitle({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
      <Icon className="h-3.5 w-3.5 text-emerald-400" />
      {children}
    </p>
  );
}

export default function JobsModeratorDashboard() {
  const [data, setData] = useState<JobsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await api.get("/api/moderator/jobs/overview");
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
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-400">Jobs &amp; Gigs Moderator</p>
          <h1 className="text-2xl font-bold text-white">Jobs &amp; Gigs Overview</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Marketplace health, hiring pipeline and dispute activity at a glance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-zinc-600">
            Updated{" "}
            {new Date(data.lastUpdated).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
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

      {/* Marketplace */}
      <SectionTitle icon={TrendingUp}>Marketplace</SectionTitle>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          accent="emerald"
          label="Total jobs"
          value={summary.totalJobs}
          sub={`${summary.activeJobs} active · ${summary.jobsThisWeek} new this week`}
          icon={Briefcase}
        />
        <StatCard
          accent="emerald"
          label="Total gigs"
          value={summary.totalGigs}
          sub={`${summary.activeGigs} active · ${summary.gigsThisWeek} new this week`}
          icon={Gem}
        />
        <StatCard
          accent="emerald"
          label="Active contracts"
          value={summary.activeContracts}
          sub={`${summary.completedContracts} of ${summary.totalContracts} completed`}
          icon={FileSignature}
        />
        <StatCard
          accent="emerald"
          label="Avg contract rating"
          value={summary.totalRatings > 0 ? `${summary.avgContractRating} / 5` : "—"}
          sub={`${summary.totalRatings} rating(s) submitted`}
          icon={Star}
        />
      </div>

      {/* Hiring pipeline */}
      <SectionTitle icon={FileText}>Hiring pipeline</SectionTitle>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          accent="emerald"
          label="Proposals"
          value={summary.totalProposals}
          sub={`${summary.pendingProposals} awaiting client response`}
          icon={FileText}
        />
        <StatCard
          accent="emerald"
          label="Gig requests"
          value={summary.totalGigRequests}
          sub={`${summary.pendingGigRequests} awaiting freelancer response`}
          icon={Inbox}
        />
        <StatCard
          accent="emerald"
          label="Credits in escrow"
          value={summary.creditsInEscrow.toLocaleString()}
          sub="Held for active contracts"
          icon={Lock}
        />
        <StatCard accent="emerald" label="Open tickets" value={summary.openTickets} sub={`${summary.totalTickets} job/gig tickets total`} icon={Ticket} />
      </div>

      {/* Risk & moderation */}
      <SectionTitle icon={Scale}>Risk &amp; moderation</SectionTitle>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard accent="emerald" label="Open disputes" value={summary.openDisputes} sub={`${summary.totalDisputes} disputes total`} icon={Scale} />
        <StatCard accent="emerald" label="Credits at risk" value={summary.creditsAtRisk.toLocaleString()} sub="Held in open disputes" icon={Coins} />
        <StatCard accent="emerald" label="Unassigned" value={summary.unassignedTickets} sub="Tickets waiting for a moderator" icon={TimerReset} />
      </div>

      {/* Analytics */}
      <SectionTitle icon={BarChart3}>Analytics</SectionTitle>
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <ChartCard>
          <LineChart
            title="New postings (last 14 days)"
            labels={charts.postingTrend.map((p) =>
              new Date(p.day).toLocaleDateString(undefined, { month: "short", day: "numeric" })
            )}
            series={[
              { label: "Jobs", color: "#60a5fa", values: charts.postingTrend.map((p) => p.jobs) },
              { label: "Gigs", color: "#34d399", values: charts.postingTrend.map((p) => p.gigs) },
            ]}
          />
        </ChartCard>
        <ChartCard>
          <DonutChart
            title="Contracts by status"
            segments={charts.contractStatusMix.map((s) => ({ label: s.label, value: s.value, color: s.color || "#34d399" }))}
          />
        </ChartCard>
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
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <Ticket className="h-4 w-4 text-emerald-400" />
            Recent tickets
          </p>
          <ul className="space-y-2">
            {recentTickets.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm transition hover:bg-white/[0.04]">
                <div className="min-w-0">
                  <p className="truncate text-zinc-200">{t.subject}</p>
                  <p className="text-[11px] text-zinc-500">
                    @{t.requester.username} · {new Date(t.updatedAt).toLocaleDateString()}
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
                No job/gig tickets.
              </li>
            )}
          </ul>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <Scale className="h-4 w-4 text-emerald-400" />
            Active disputes
          </p>
          <ul className="space-y-2">
            {disputes.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm transition hover:bg-white/[0.04]">
                <div className="min-w-0">
                  <p className="truncate text-zinc-200">{d.title}</p>
                  <p className="text-[11px] text-zinc-500">
                    {d.number} · {d.relatedEntityType} ·{" "}
                    <span className="text-amber-300/80">{d.creditAmount.toLocaleString()} credits</span>
                  </p>
                </div>
                <div className="shrink-0">
                  <StatusBadge status={d.status} />
                </div>
              </li>
            ))}
            {disputes.length === 0 && (
              <li className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-xs text-zinc-600">
                No job/gig disputes.
              </li>
            )}
          </ul>
        </div>
      </div>
    </main>
  );
}
