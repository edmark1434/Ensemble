import { useEffect, useState } from "react";
import { AlertCircle, Flag, Info, Loader2, MessageSquare, MessagesSquare, Ticket, TimerReset, UsersRound } from "lucide-react";
import api from "@/lib/axios";
import { ChartCard, DonutChart, HorizontalBarChart } from "@/pages/admin/analytics/components/AnalyticsCharts";
import type { ForumOverview } from "../shared/moderatorTypes";
import { AlertList, StatCard, titleCaseWords } from "../shared/ui";

export default function ForumModeratorDashboard() {
  const [data, setData] = useState<ForumOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.get("/api/moderator/forum/overview");
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
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="relative z-10 flex min-h-screen items-center justify-center md:ml-72">
        <p className="text-sm text-zinc-500">Failed to load forum overview.</p>
      </main>
    );
  }

  const { summary, forumContent, charts, recentTickets, flaggedReports, alerts, notice } = data;

  return (
    <main className="relative z-10 min-h-screen px-6 py-8 md:ml-72 md:px-10" style={{ animation: "fadeIn 420ms ease" }}>
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-400">Forum Moderator</p>
        <h1 className="text-2xl font-bold text-white">Community Forum Overview</h1>
      </div>

      {notice && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-violet-500/20 bg-violet-500/[0.06] px-4 py-3 text-sm text-violet-100">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
          <p>{notice}</p>
        </div>
      )}

      {forumContent.available && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard accent="violet" label="Forum groups" value={forumContent.totalGroups} sub={`${forumContent.activeGroups} active`} icon={UsersRound} />
          <StatCard accent="violet" label="Discussions" value={forumContent.totalDiscussions} sub={`${forumContent.removedDiscussions} removed by moderation`} icon={MessagesSquare} />
          <StatCard accent="violet" label="Comments" value={forumContent.totalComments} sub="Across all discussions" icon={MessageSquare} />
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard accent="violet" label="Open tickets" value={summary.openTickets} sub={`${summary.totalTickets} forum tickets total`} icon={Ticket} />
        <StatCard accent="violet" label="Flagged content" value={summary.flaggedContent} sub={`${summary.totalReports} forum reports total`} icon={Flag} />
        <StatCard accent="violet" label="Unassigned" value={summary.unassignedTickets} sub="Waiting to be picked up" icon={TimerReset} />
        <StatCard accent="violet" label="Resolved" value={summary.resolvedTickets} sub="Closed forum tickets" icon={MessagesSquare} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <ChartCard>
          <DonutChart
            title="Tickets by status"
            segments={charts.ticketStatusMix.map((s) => ({ label: s.label, value: s.value, color: s.color || "#a78bfa" }))}
          />
        </ChartCard>
        <ChartCard>
          <HorizontalBarChart title="Tickets by type" data={charts.ticketCategories} />
        </ChartCard>
      </div>

      <div className="mb-6 rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <AlertCircle className="h-4 w-4 text-violet-400" />
          Alerts
        </p>
        <AlertList alerts={alerts} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
          <p className="mb-3 text-sm font-semibold text-white">Recent forum tickets</p>
          <ul className="space-y-2">
            {recentTickets.map((t) => (
              <li key={t.id} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm">
                <p className="text-zinc-200">{t.subject}</p>
                <p className="text-[11px] text-zinc-500">
                  @{t.requester.username} · {titleCaseWords(t.priority)} · {titleCaseWords(t.status)}
                </p>
              </li>
            ))}
            {recentTickets.length === 0 && <li className="text-sm text-zinc-500">No forum tickets.</li>}
          </ul>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
          <p className="mb-3 text-sm font-semibold text-white">Flagged content</p>
          <ul className="space-y-2">
            {flaggedReports.map((r) => (
              <li key={r.id} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm">
                <p className="text-zinc-200">{r.reason}</p>
                <p className="text-[11px] text-zinc-500">
                  {r.targetLabel || r.targetId} · {r.targetType} · {titleCaseWords(r.status)}
                </p>
              </li>
            ))}
            {flaggedReports.length === 0 && <li className="text-sm text-zinc-500">No flagged forum content.</li>}
          </ul>
        </div>
      </div>
    </main>
  );
}
