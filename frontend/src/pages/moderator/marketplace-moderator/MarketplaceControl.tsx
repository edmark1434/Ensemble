import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import api from "@/lib/axios";
import ListingDetailModal from "./ListingDetailModal";
import type { MarketplaceListing } from "./marketplaceTypes";

const STATUS_TABS = ["pending", "approved", "rejected", "all"] as const;

export default function MarketplaceControl() {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_TABS)[number]>("pending");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = async (status: string) => {
    setLoading(true);
    try {
      const res = await api.get("/api/moderator/marketplace/listings", { params: { status } });
      if (res.data?.success) setListings(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(statusFilter);
  }, [statusFilter]);

  const selected = listings.find((l) => l.id === selectedId) || null;

  return (
    <main className="relative z-10 min-h-screen px-6 py-8 md:ml-72 md:px-10" style={{ animation: "fadeIn 420ms ease" }}>
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-400">Marketplace Moderator</p>
        <h1 className="text-2xl font-bold text-white">Marketplace Control</h1>
      </div>

      <div className="mb-4 flex gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setStatusFilter(tab)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition ${
              statusFilter === tab
                ? "border-white/20 bg-white/10 text-white"
                : "border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-rose-400" />
          </div>
        ) : listings.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500">No listings in this view.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-zinc-500">
                  <th className="pb-2">Listing</th>
                  <th className="pb-2">Submitted by</th>
                  <th className="pb-2">Category</th>
                  <th className="pb-2">Price</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {listings.map((l) => (
                  <tr
                    key={l.id}
                    onClick={() => setSelectedId(l.id)}
                    className="cursor-pointer hover:bg-white/[0.02]"
                  >
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
                    <td className="py-2.5 text-zinc-500">{new Date(l.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <ListingDetailModal
          listing={selected}
          onClose={() => setSelectedId(null)}
          onUpdated={() => void load(statusFilter)}
        />
      )}
    </main>
  );
}
