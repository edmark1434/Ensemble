import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import api from "@/lib/axios";
import type { AssetRecord } from "../../5_assets/assetTypes";
import { AssetCard } from "../../5_assets/AssetCard";
import useGlobalState from "@/lib/global_state";
import { showErrorToast } from "@/components/utility/toast";
import { GuestLoginModal } from "@/components/ui/GuestLoginModal";

export const AssetCardSkeleton: React.FC = () => (
  <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4">
    <div className="mb-3 aspect-square w-full animate-pulse rounded-lg bg-gray-200 dark:bg-white/10" />
    <div className="h-5 w-24 animate-pulse rounded-lg bg-gray-200 dark:bg-white/10" />
    <div className="mt-2 h-4 w-full animate-pulse rounded-lg bg-gray-100 dark:bg-white/5" />
    <div className="mt-2 h-4 w-3/4 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5" />
    <div className="mt-3 flex items-center justify-between">
      <div className="h-5 w-20 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5" />
      <div className="h-8 w-16 animate-pulse rounded-lg bg-gray-200 dark:bg-white/10" />
    </div>
  </div>
);

export const FilterButtonSkeleton: React.FC = () => (
  <div className="h-8 w-24 animate-pulse rounded-full bg-white/10" />
);

interface HomeFeaturedAssetsProps {
  searchQuery: string;
}

export const HomeFeaturedAssets: React.FC<HomeFeaturedAssetsProps> = ({
  searchQuery,
}) => {
  const navigate = useNavigate();
  const user = useGlobalState((state) => state.user);
  const isGuestMode = useGlobalState((state) => state.isGuestMode);
  const isGuestView = isGuestMode || !user?.account_id;
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [engagementPending, setEngagementPending] = useState<Set<string>>(new Set());
  const [isGuestLoginOpen, setIsGuestLoginOpen] = useState(false);

  const updateEngagement = async (asset: AssetRecord, kind: "like" | "save") => {
    if (isGuestView) {
      setIsGuestLoginOpen(true);
      return;
    }
    const key = `${kind}:${asset.market_asset_id}`;
    if (engagementPending.has(key)) return;
    const enabled = kind === "like" ? asset.is_liked : asset.is_saved;
    setEngagementPending((current) => new Set(current).add(key));
    try {
      const response = enabled
        ? await api.delete<{ is_liked?: boolean; like_count?: number; is_saved?: boolean; save_count?: number }>(`/api/assets/${asset.market_asset_id}/${kind}`)
        : await api.put<{ is_liked?: boolean; like_count?: number; is_saved?: boolean; save_count?: number }>(`/api/assets/${asset.market_asset_id}/${kind}`);
      
      setAssets((current) => current.map((item) => item.market_asset_id === asset.market_asset_id
        ? kind === "like"
          ? { ...item, is_liked: Boolean(response.data.is_liked), like_count: Number(response.data.like_count || 0) }
          : { ...item, is_saved: Boolean(response.data.is_saved), save_count: Number(response.data.save_count || 0) }
        : item));
    } catch (error) {
      showErrorToast("Unable to update asset.");
    } finally {
      setEngagementPending((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  };

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setLoading(true);
        const response = await api.get<{ assets: AssetRecord[] }>("/api/assets", {
          params: { page: 1, pageSize: 3, search: searchQuery, type: "all", view: "discover" },
        });
        setAssets(response.data.assets || []);
      } catch (error) {
        console.error("Failed to fetch featured assets", error);
      } finally {
        setLoading(false);
      }
    };
    const timer = setTimeout(fetchAssets, 300); // simple debounce
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2
            className="text-xl font-bold tracking-tight text-gray-900 dark:text-white"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Popular Assets
          </h2>
          <p
            className="text-xs text-gray-500 dark:text-zinc-400"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Top-rated assets trending across the platform
          </p>
        </div>
        <button
          onClick={() => navigate("/assets")}
          className="flex items-center gap-1 text-xs font-semibold text-gray-700 dark:text-white transition hover:text-gray-900 dark:hover:text-zinc-300"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          View More on Asset Library <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="grid gap-5 grid-cols-1 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <AssetCardSkeleton key={i} />
          ))}
        </div>
      ) : assets.length > 0 ? (
        <div className="grid gap-5 grid-cols-1 md:grid-cols-3">
          {assets.map((asset) => (
            <AssetCard 
              key={asset.market_asset_id} 
              asset={asset} 
              hideActions={false}
              engagementPending={engagementPending}
              onUpdateEngagement={(a, kind) => void updateEngagement(a, kind)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-white/10 p-8 text-center">
          <p className="text-sm text-gray-500 dark:text-zinc-400">No popular assets found right now.</p>
        </div>
      )}

      <GuestLoginModal
        isOpen={isGuestLoginOpen}
        onClose={() => setIsGuestLoginOpen(false)}
        title="Log in to engage"
        message="Please log in or create an account to like or save assets."
      />
    </section>
  );
};