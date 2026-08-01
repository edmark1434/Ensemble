import { useEffect, useState } from "react";
import { AlertCircle, Loader2, Package, ShieldAlert, ShoppingBag, Ticket } from "lucide-react";
import api from "@/lib/axios";
import { ChartCard, DonutChart, HorizontalBarChart } from "@/pages/admin/analytics/components/AnalyticsCharts";
import type { MarketplaceOverview } from "./marketplaceTypes";

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: typeof Package;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          <p className="mt-1 text-xs text-zinc-500">{sub}</p>
        </div>
        <Icon className="h-5 w-5 text-rose-400" />
      </div>
    </div>
  );
}

export default function MarketplaceModeratorDashboard() {
  const [data, setData] = useState<MarketplaceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.get("/api/moderator/marketplace/overview");
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
      <main className="relative z-10 flex min-h-screen items-center justify-center md:pl-[260px]">
        <Loader2 className="h-8 w-8 animate-spin text-rose-400" />
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="relative z-10 flex min-h-screen items-center justify-center md:pl-[260px]">
        <p className="text-sm text-zinc-500">Failed to load marketplace overview.</p>
      </main>
    );
  }

  const { summary, charts, recentListings, alerts } = data;

  return (
    <main className="relative z-10 min-h-screen px-6 py-8 md:pl-[260px] md:px-10" style={{ animation: "fadeIn 420ms ease" }}>
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-400">Marketplace Moderator</p>
        <h1 className="text-2xl font-bold text-white">Asset Marketplace Overview</h1>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pending listings" value={summary.pendingListings} sub={`${summary.totalListings} total submitted`} icon={Package} />
        <StatCard label="Approved listings" value={summary.approvedListings} sub={`${summary.approvedCreditValue.toLocaleString()} credits in catalog`} icon={ShoppingBag} />
        <StatCard label="Open tickets" value={summary.openTickets} sub={`${summary.totalTickets} marketplace tickets total`} icon={Ticket} />
        <StatCard label="Restricted accounts" value={summary.restrictedAccounts} sub="Suspended or banned" icon={ShieldAlert} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <ChartCard>
          <DonutChart title="Listings by status" segments={charts.listingStatusMix.map((s) => ({ label: s.label, value: s.value, color: s.color || "#fb7185" }))} />
        </ChartCard>
        <ChartCard>
          <HorizontalBarChart title="Listings by category" data={charts.listingCategories} />
        </ChartCard>
      </div>

      <div className="mb-6 rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <AlertCircle className="h-4 w-4 text-rose-400" />
          Alerts
        </p>
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li key={a.id} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-zinc-300">
              {a.message}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
        <p className="mb-3 text-sm font-semibold text-white">Recent submissions</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-zinc-500">
                <th className="pb-2">Listing</th>
                <th className="pb-2">Submitted by</th>
                <th className="pb-2">Category</th>
                <th className="pb-2">Price</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentListings.map((l) => (
                <tr key={l.id} className="hover:bg-white/[0.02]">
                  <td className="py-2.5 text-zinc-200">{l.title}</td>
                  <td className="py-2.5 text-zinc-400">@{l.submittedBy.handle}</td>
                  <td className="py-2.5 text-zinc-400">{l.category || "—"}</td>
                  <td className="py-2.5 text-zinc-400">{l.priceCredits.toLocaleString()}</td>
                  <td className="py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        l.status === "approved"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : l.status === "rejected"
                            ? "bg-red-500/15 text-red-300"
                            : "bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
