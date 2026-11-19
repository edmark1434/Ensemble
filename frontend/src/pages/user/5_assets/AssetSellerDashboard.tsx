import React, { useEffect, useState } from "react";
import { 
  ShoppingCart, 
  Users, 
  Package, 
  ArrowUpRight, 
  Search, 
  Loader2, 
  TrendingUp, 
  Clapperboard, 
  Image as ImageIcon, 
  AudioLines, 
  LayoutTemplate,
  Calendar,
  AlertCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import api from "@/lib/axios";
import { CreditIcon } from "@/components/ui/credit-icon";
import { mediaUrl } from "./assetTypes";

export interface SellerSummary {
  total_revenue: number;
  total_sales: number;
  total_buyers: number;
  active_assets_count: number;
}

export interface SellerAssetItem {
  market_asset_id: string;
  name: string;
  price_credits: number;
  status: string;
  created_at: string;
  type: string;
  thumbnail_path: string | null;
  sales_count: number;
  unique_buyers: number;
  revenue_credits: number;
}

export interface SellerSaleItem {
  market_asset_license_id: string;
  purchased_at: string;
  price_credits: number;
  net_credits: number;
  market_asset_id: string;
  asset_name: string;
  buyer_name: string;
  buyer_handle: string;
  buyer_avatar_path: string | null;
}

export interface SellerMetrics {
  summary: SellerSummary;
  assets: SellerAssetItem[];
  recent_sales: SellerSaleItem[];
}

function getTypeIcon(type: string) {
  switch (type.toLowerCase()) {
    case "video": return <Clapperboard className="h-3.5 w-3.5" />;
    case "image": return <ImageIcon className="h-3.5 w-3.5" />;
    case "audio": return <AudioLines className="h-3.5 w-3.5" />;
    case "template": return <LayoutTemplate className="h-3.5 w-3.5" />;
    default: return <Package className="h-3.5 w-3.5" />;
  }
}

export default function AssetSellerDashboard() {
  const [data, setData] = useState<SellerMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"revenue" | "sales" | "latest">("revenue");

  useEffect(() => {
    let active = true;
    const fetchMetrics = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get<{ success: boolean; metrics: SellerMetrics }>("/api/assets/seller/metrics");
        if (active) {
          setData(response.data.metrics);
        }
      } catch (err: any) {
        if (active) {
          setError(err?.response?.data?.error || "Unable to load seller metrics.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchMetrics();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-sm text-gray-500 dark:text-zinc-400">Loading seller analytics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-10 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-red-500 mb-2" />
        <p className="text-sm font-semibold text-red-600 dark:text-red-300">{error || "Failed to load seller dashboard."}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg border border-red-500/30 px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-500/10 dark:text-red-300"
        >
          Try again
        </button>
      </div>
    );
  }

  const { summary, assets, recent_sales } = data;

  const filteredAssets = assets
    .filter((asset) => asset.name.toLowerCase().includes(search.toLowerCase().trim()))
    .sort((a, b) => {
      if (sortBy === "revenue") return b.revenue_credits - a.revenue_credits;
      if (sortBy === "sales") return b.sales_count - a.sales_count;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div className="space-y-8">
      {/* Overview Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-dark-surface">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">Total Revenue</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <CreditIcon className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              {summary.total_revenue.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-amber-500">credits</span>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">Net earnings received from sales</p>
        </div>

        {/* Total Sales */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-dark-surface">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">Total Sales</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
              <ShoppingCart className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              {summary.total_sales.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400">{summary.total_sales === 1 ? "unit" : "units"}</span>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">Total completed asset purchases</p>
        </div>

        {/* Total Buyers */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-dark-surface">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">Unique Buyers</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              {summary.total_buyers.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400">{summary.total_buyers === 1 ? "user" : "users"}</span>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">Community members who purchased</p>
        </div>

        {/* Active Marketplace Assets */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-dark-surface">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">Live Assets</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              {summary.active_assets_count.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400">{summary.active_assets_count === 1 ? "asset" : "assets"}</span>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">Published in the library</p>
        </div>
      </div>

      {/* Main Grid: Performance Table & Recent Sales */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left 2 Cols: Asset Performance Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">Asset Performance</h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400">Sales and revenue breakdown by asset</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter assets..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-xs text-gray-900 focus:outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </div>

              <div className="flex items-center rounded-lg border border-gray-200 bg-white p-0.5 dark:border-white/10 dark:bg-white/5">
                <button
                  type="button"
                  onClick={() => setSortBy("revenue")}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                    sortBy === "revenue"
                      ? "bg-gray-100 text-gray-900 dark:bg-white/10 dark:text-white"
                      : "text-gray-500 hover:text-gray-700 dark:text-zinc-400"
                  }`}
                >
                  Revenue
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy("sales")}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                    sortBy === "sales"
                      ? "bg-gray-100 text-gray-900 dark:bg-white/10 dark:text-white"
                      : "text-gray-500 hover:text-gray-700 dark:text-zinc-400"
                  }`}
                >
                  Sales
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy("latest")}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                    sortBy === "latest"
                      ? "bg-gray-100 text-gray-900 dark:bg-white/10 dark:text-white"
                      : "text-gray-500 hover:text-gray-700 dark:text-zinc-400"
                  }`}
                >
                  Latest
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-dark-surface">
            {filteredAssets.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="mx-auto h-8 w-8 text-gray-400 dark:text-zinc-600 mb-2" />
                <p className="text-sm font-semibold text-gray-900 dark:text-white">No assets found</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
                  {search ? "No assets matched your search term." : "Upload assets to begin tracking performance."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-100 bg-gray-50/75 text-gray-500 dark:border-white/5 dark:bg-white/[0.02] dark:text-zinc-400">
                    <tr>
                      <th className="py-3 pl-4 pr-3 font-semibold">Asset</th>
                      <th className="px-3 py-3 font-semibold text-center">Price</th>
                      <th className="px-3 py-3 font-semibold text-center">Sales</th>
                      <th className="px-3 py-3 font-semibold text-center">Buyers</th>
                      <th className="py-3 pl-3 pr-4 font-semibold text-right">Net Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {filteredAssets.map((asset) => (
                      <tr key={asset.market_asset_id} className="transition hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
                        <td className="py-3 pl-4 pr-3">
                          <Link to={`/assets/${asset.market_asset_id}`} className="group flex items-center gap-3">
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-white/5">
                              {asset.thumbnail_path ? (
                                <img
                                  src={mediaUrl(asset.thumbnail_path)}
                                  alt={asset.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-gray-400">
                                  {getTypeIcon(asset.type)}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400 truncate max-w-[200px] sm:max-w-[260px]">
                                {asset.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500 dark:text-zinc-400">
                                <span className="inline-flex items-center gap-1 capitalize">
                                  {getTypeIcon(asset.type)}
                                  {asset.type}
                                </span>
                                <span>•</span>
                                <span className={`capitalize ${asset.status === "published" ? "text-emerald-500" : "text-amber-500"}`}>
                                  {asset.status}
                                </span>
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          <span className="font-semibold text-gray-700 dark:text-zinc-300">
                            {asset.price_credits > 0 ? `${asset.price_credits.toLocaleString()} c` : "Free"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {asset.sales_count.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {asset.unique_buyers.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3 pl-3 pr-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1 font-bold text-amber-500">
                            <CreditIcon className="h-3.5 w-3.5" />
                            <span>{asset.revenue_credits.toLocaleString()}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Recent Sales Activity Feed */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold">Recent Sales</h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400">Latest transactions from your buyers</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-dark-surface">
            {recent_sales.length === 0 ? (
              <div className="p-8 text-center">
                <ShoppingCart className="mx-auto h-7 w-7 text-gray-400 dark:text-zinc-600 mb-2" />
                <p className="text-xs font-semibold text-gray-900 dark:text-white">No sales recorded yet</p>
                <p className="mt-1 text-[11px] text-gray-500 dark:text-zinc-400">
                  Transactions will appear here once community members purchase or claim your assets.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-white/5 space-y-3">
                {recent_sales.map((sale) => (
                  <div key={sale.market_asset_license_id} className="pt-3 first:pt-0 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {sale.buyer_avatar_path ? (
                        <img
                          src={mediaUrl(sale.buyer_avatar_path)}
                          alt={sale.buyer_name}
                          className="h-8 w-8 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600 dark:bg-white/10 dark:text-white">
                          {(sale.buyer_name || "U").slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                          {sale.buyer_name}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-zinc-400 truncate">
                          purchased <span className="font-medium text-gray-700 dark:text-zinc-200">{sale.asset_name}</span>
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">
                          {formatDistanceToNow(new Date(sale.purchased_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="inline-flex items-center gap-1 text-xs font-bold text-amber-500">
                        <CreditIcon className="h-3.5 w-3.5" />
                        <span>+{sale.net_credits.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
