import { useCallback, useEffect, useState } from "react";
import { AudioLines, Bookmark, CheckCircle2, ChevronLeft, ChevronRight, Compass, Folder, Heart, Image, LayoutTemplate, Loader2, Pencil, Plus, Search, ShoppingBag, Star, Trash2, Video, Zap } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { CreditIcon } from "@/components/ui/credit-icon";
import api from "@/lib/axios";
import socket from "@/lib/socket";
import UserHeader from "@/components/nav/user_header";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast";
import AssetEditorModal from "./AssetEditorModal";
import AssetMedia from "./AssetMedia";
import { AssetCard } from "./AssetCard";
import type { AssetPagination, AssetRecord, AssetType } from "./assetTypes";
import { mediaUrl } from "./assetTypes";
import { getAssetPostingEligibility, type AssetPostingEligibility } from "./assetPostingEligibility";
import useGlobalState from "@/lib/global_state";
import { continueIfAccountVerified } from "@/lib/accountVerification";
import { GuestLoginModal } from "@/components/ui/GuestLoginModal";

type FilterType = "all" | AssetType;
type AssetView = "discover" | "mine" | "purchased" | "saved";
type MineStatus = "all" | "uploaded" | "in_review" | "rejected" | "draft";
type SavedStatus = "saved" | "liked";

const MINE_STATUS_OPTIONS: { id: MineStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "uploaded", label: "Published" },
  { id: "in_review", label: "Under Review" },
  { id: "rejected", label: "Rejected" },
  { id: "draft", label: "Drafts" },
];

const FILTERS: { value: FilterType; label: string; icon: typeof Image }[] = [
  { value: "all", label: "All", icon: Image },
  { value: "image", label: "Images", icon: Image },
  { value: "video", label: "Videos", icon: Video },
  { value: "audio", label: "Audio", icon: AudioLines },
  { value: "template", label: "Templates", icon: LayoutTemplate },
];

function requestError(error: unknown) {
  if (typeof error === "object" && error && "response" in error) {
    const response = (error as { response?: { data?: { error?: string } } }).response;
    return response?.data?.error || "Unable to load assets.";
  }
  return "Unable to load assets.";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

function AssetSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-dark-surface">
      <div className="h-48 animate-pulse bg-gray-200 dark:bg-white/5" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100 dark:bg-white/5" />
        <div className="h-8 animate-pulse rounded bg-gray-100 dark:bg-white/5" />
      </div>
    </div>
  );
}

export default function AssetsLibrary() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useGlobalState((state) => state.user);
  const isGuestMode = useGlobalState((state) => state.isGuestMode);
  const isGuestView = isGuestMode || !user?.account_id;
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [pagination, setPagination] = useState<AssetPagination>({ page: 1, pageSize: 12, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FilterType>("all");
  const getTabFromPath = (): AssetView => {
    const path = location.pathname;
    if (path.includes('/owned')) return 'mine';
    if (path.includes('/purchased')) return 'purchased';
    if (path.includes('/saved')) return 'saved';
    return 'discover';
  };
  const view: AssetView = getTabFromPath();

  const handleTabClick = (tab: AssetView) => {
    setPage(1);
    if (tab === 'discover') navigate('/assets');
    else if (tab === 'mine') navigate('/assets/owned');
    else navigate(`/assets/${tab}`);
  };
  const [mineStatus, setMineStatus] = useState<MineStatus>("all");
  const [savedStatus, setSavedStatus] = useState<SavedStatus>("saved");
  const [search, setSearch] = useState(location.state?.searchQuery || "");
  const [debouncedSearch, setDebouncedSearch] = useState(location.state?.searchQuery || "");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [eligibility, setEligibility] = useState<AssetPostingEligibility | null>(null);

  const fetchEligibility = useCallback(async () => {
    if (isGuestView) return;
    try {
      const data = await getAssetPostingEligibility();
      setEligibility(data);
    } catch (e) {
      // ignore
    }
  }, [isGuestView]);

  useEffect(() => {
    void fetchEligibility();
  }, [fetchEligibility]);
  
  useEffect(() => {
    if (location.state?.action === "upload" && !loading) {
      openCreate();
      // Clear the state so it doesn't keep opening on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, loading]);
  const [checkingPostEligibility, setCheckingPostEligibility] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetRecord | null>(null);
  const [deletingAsset, setDeletingAsset] = useState<AssetRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [engagementPending, setEngagementPending] = useState<Set<string>>(new Set());
  const [isGuestLoginOpen, setIsGuestLoginOpen] = useState(false);
  const availableViews: AssetView[] = isGuestView
    ? ["discover"]
    : ["discover", "mine", "purchased", "saved"];

  useEffect(() => {
    if (isGuestView && view !== "discover") {
      setPage(1);
      navigate('/assets', { replace: true });
    }
  }, [isGuestView, view, navigate]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadAssets = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError("");
    try {
      const statusParam = view === "mine"
        ? (mineStatus === "all"
            ? "all"
            : mineStatus === "uploaded"
              ? "published"
              : mineStatus === "in_review"
                ? "pending"
                : mineStatus === "rejected"
                  ? "rejected"
                  : "draft")
        : undefined;

      const response = await api.get<{ assets: AssetRecord[]; pagination: AssetPagination }>("/api/assets", {
        params: {
          page,
          pageSize: 12,
          search: debouncedSearch,
          type: filter,
          view: view === "saved" ? savedStatus : view,
          status: statusParam,
        },
        signal,
      });
      setAssets(response.data.assets || []);
      setPagination(response.data.pagination);
    } catch (error) {
      if (signal?.aborted) return;
      setLoadError(requestError(error));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [debouncedSearch, filter, mineStatus, savedStatus, page, view]);

  useEffect(() => {
    const controller = new AbortController();
    void loadAssets(controller.signal);
    return () => controller.abort();
  }, [loadAssets]);

  useEffect(() => {
    const handleStatusUpdate = () => {
      void loadAssets();
    };
    socket.on("assetStatusUpdated", handleStatusUpdate);
    socket.on("notification", handleStatusUpdate);
    return () => {
      socket.off("assetStatusUpdated", handleStatusUpdate);
      socket.off("notification", handleStatusUpdate);
    };
  }, [loadAssets]);

  const openCreate = async () => {
    if (isGuestView) {
      setIsGuestLoginOpen(true);
      return;
    }
    
    const canContinue = await continueIfAccountVerified(
      () => {},
      false,
      "Account Verification is required to upload Assets. Please verify your identity to proceed."
    );
    if (!canContinue) return;

    if (checkingPostEligibility) return;
    setCheckingPostEligibility(true);
    try {
      const eligibility = await getAssetPostingEligibility();
      if (!eligibility.allowed) {
        showErrorToast(eligibility.message || "Asset posting is unavailable for this account.");
        return;
      }
      setEditingAsset(null);
      setEditorOpen(true);
    } catch (error) {
      showErrorToast(requestError(error));
    } finally {
      setCheckingPostEligibility(false);
    }
  };

  const openEdit = (asset: AssetRecord) => {
    setEditingAsset(asset);
    setEditorOpen(true);
  };

  const onSaved = (asset: AssetRecord) => {
    const wasEditing = Boolean(editingAsset);
    setEditorOpen(false);
    setEditingAsset(null);
    showSuccessToast(wasEditing ? "Asset updated." : "Asset uploaded.");
    void fetchEligibility();
    if (!wasEditing && asset.status === "draft") {
      setPage(1);
      navigate('/assets/owned');
      setMineStatus(asset.review_status === "pending" || asset.status === "draft" ? "all" : "uploaded");
      return;
    }
    if (page !== 1) setPage(1);
    else void loadAssets();
  };

  const confirmDelete = async () => {
    if (!deletingAsset || deleting) return;
    setDeleting(true);
    try {
      await api.delete(`/api/assets/${deletingAsset.market_asset_id}`);
      setAssets((current) => current.filter((item) => item.market_asset_id !== deletingAsset.market_asset_id));
      setPagination((current) => ({ ...current, total: Math.max(0, current.total - 1) }));
      showSuccessToast("Asset deleted.");
      setDeletingAsset(null);
      void fetchEligibility();
    } catch (error) {
      showErrorToast(requestError(error));
    } finally {
      setDeleting(false);
    }
  };

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
      if ((kind === "save" && view === "saved" && savedStatus === "saved" && !response.data.is_saved) || (kind === "like" && view === "saved" && savedStatus === "liked" && !response.data.is_liked)) {
        setAssets((current) => current.filter((item) => item.market_asset_id !== asset.market_asset_id));
        setPagination((current) => ({ ...current, total: Math.max(0, current.total - 1) }));
      } else {
        setAssets((current) => current.map((item) => item.market_asset_id === asset.market_asset_id
          ? kind === "like"
            ? { ...item, is_liked: Boolean(response.data.is_liked), like_count: Number(response.data.like_count || 0) }
            : { ...item, is_saved: Boolean(response.data.is_saved), save_count: Number(response.data.save_count || 0) }
          : item));
      }
    } catch (error) {
      showErrorToast(requestError(error));
    } finally {
      setEngagementPending((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-dark-base dark:text-white">
      <UserHeader pageTitle="Asset Library" />
      <main className="mx-auto w-full max-w-7xl p-5 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Assets Library</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">Discover images, videos, audio, and templates shared by the community.</p>
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center w-full">
          <button
            onClick={() => void openCreate()}
            disabled={checkingPostEligibility}
            className="shrink-0 flex items-center gap-2 rounded-full bg-black dark:bg-white px-6 py-3 text-sm font-bold text-white dark:text-black transition hover:scale-105 group disabled:cursor-not-allowed disabled:opacity-60"
          >
            {checkingPostEligibility ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />}
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {checkingPostEligibility ? "Checking..." : "Upload Asset"}
            </span>
          </button>

          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Search title, creator, or tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 pl-11 pr-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-500"
            />
          </div>
        </div>

          {/* Tabs & View Toggle */}
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-gray-200 dark:border-white/10">
            <div className="flex gap-1 relative flex-1">
            {availableViews.map((tab) => {
              const isActive = view === tab;
              return (
                <button
                  key={tab}
                  onClick={() => handleTabClick(tab)}
                  className={`relative px-4 py-3 text-sm font-semibold transition-colors ${
                    isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-white/5 rounded-t-lg"
                  }`}
                >
                  <span className="relative z-10 flex items-center gap-2 capitalize">
                    {tab === "discover" && <Compass className="h-4 w-4" />}
                    {tab === "mine" && <Folder className="h-4 w-4" />}
                    {tab === "purchased" && <ShoppingBag className="h-4 w-4" />}
                    {tab === "saved" && <Bookmark className="h-4 w-4" />}
                    {tab === "liked" && <Heart className="h-4 w-4" />}
                    {tab === "mine" ? "My Assets" : tab}
                  </span>

                  {isActive && (
                    <>
                      <motion.div
                        layoutId="activeAssetTabGlow"
                        className="absolute inset-0 bg-blue-500/5 rounded-t-lg"
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      />
                      <motion.div
                        layoutId="activeAssetTabUnderline"
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500 z-10"
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      />
                    </>
                  )}
                </button>
              );
            })}
            </div>
  
            <div className="flex flex-wrap items-center justify-end gap-4 pb-2">
              {/* Mine sub-status */}
              {view === "mine" && (
                <div className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-white/15 bg-white dark:bg-white/5 p-1" role="tablist" aria-label="My asset status">
                  {MINE_STATUS_OPTIONS.map((statusTab) => (
                    <button
                      key={statusTab.id}
                      type="button"
                      role="tab"
                      aria-selected={mineStatus === statusTab.id}
                      onClick={() => { setPage(1); setMineStatus(statusTab.id); }}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition ${
                        mineStatus === statusTab.id
                          ? "bg-gray-100 text-gray-900 shadow-sm dark:bg-white/10 dark:text-white"
                          : "text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                      }`}
                    >
                      {statusTab.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Saved sub-status */}
              {view === "saved" && (
                <div className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-white/15 bg-white dark:bg-white/5 p-1" role="tablist" aria-label="Saved asset filter">
                  {(["saved", "liked"] as SavedStatus[]).map((statusTab) => (
                    <button
                      key={statusTab}
                      type="button"
                      role="tab"
                      aria-selected={savedStatus === statusTab}
                      onClick={() => { setPage(1); setSavedStatus(statusTab); }}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition ${
                        savedStatus === statusTab
                          ? "bg-gray-100 text-gray-900 shadow-sm dark:bg-white/10 dark:text-white"
                          : "text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                      }`}
                    >
                      {statusTab}
                    </button>
                  ))}
                </div>
              )}

              {/* Filters */}
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Media types">
                {FILTERS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={filter === value}
                    onClick={() => { setPage(1); setFilter(value); }}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition ${
                      filter === value
                        ? "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-300"
                        : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </button>
                ))}
              </div>
            </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold">{view === "mine" ? (mineStatus === "draft" ? "Your draft assets" : "Your uploaded assets") : view === "purchased" ? "Your purchased assets" : view === "saved" ? (savedStatus === "liked" ? "Your liked assets" : "Your saved assets") : "Community assets"}</p>
            {view === "mine" && eligibility && (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 ring-1 ring-inset ring-gray-500/10 dark:bg-white/10 dark:text-zinc-300 dark:ring-white/20">
                  {eligibility.unlimited ? "Unlimited uploads" : `${eligibility.used} / ${eligibility.limit} Uploaded`}
                </span>
                {!eligibility.unlimited && (
                  <button 
                    onClick={() => navigate("/credits-subscriptions")}
                    className="group relative inline-flex items-center justify-center gap-1 overflow-hidden rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 shadow-sm transition-all duration-500 hover:scale-105 hover:shadow-[0_0_15px_rgba(251,191,36,0.4)] dark:border-amber-600/80 dark:bg-transparent dark:text-amber-500 dark:hover:border-amber-500 dark:hover:text-amber-400 dark:hover:shadow-[0_0_15px_rgba(251,191,36,0.3)]"
                  >
                    <div 
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/20 dark:via-amber-400/20 to-transparent z-10"
                      style={{ animation: 'passiveShine 3s ease-in-out infinite' }}
                    />
                    <Zap className="relative z-20 h-3 w-3 fill-amber-500/70 text-amber-500 dark:fill-amber-500/70 dark:text-amber-500 group-hover:dark:text-amber-400 group-hover:dark:fill-amber-400/70 transition-colors" />
                    <span className="relative z-20">Upgrade</span>
                  </button>
                )}
              </div>
            )}
          </div>
          {!loading && <p className="text-xs text-gray-500 dark:text-zinc-500">{pagination.total.toLocaleString()} {pagination.total === 1 ? "asset" : "assets"}</p>}
        </div>

        {loading ? (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <AssetSkeleton key={index} />)}</div>
        ) : loadError ? (
          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-10 text-center">
            <p className="text-sm text-red-600 dark:text-red-300">{loadError}</p>
            <button type="button" onClick={() => void loadAssets()} className="mt-4 rounded-lg border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-500/10 dark:text-red-300">Try again</button>
          </div>
        ) : assets.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-16 text-center dark:border-white/10 dark:bg-dark-surface">
            <AudioLines className="mx-auto h-10 w-10 text-gray-400 dark:text-zinc-600" />
            <h2 className="mt-4 font-semibold">
              {view === "mine"
                ? (mineStatus === "all"
                    ? "You haven't uploaded any assets yet."
                    : mineStatus === "uploaded"
                      ? "You don't have any published assets."
                      : mineStatus === "in_review"
                        ? "No assets are currently under review."
                        : mineStatus === "rejected"
                          ? "No assets have been rejected."
                          : "You don't have any draft assets.")
                : view === "purchased"
                  ? "You haven't purchased any assets yet."
                  : view === "saved"
                    ? (savedStatus === "liked" ? "You haven't liked any assets yet." : "You haven't saved any assets yet.")
                    : "No assets found."}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-zinc-500">
              {search
                ? "Try a different search or filter."
                : view === "mine"
                  ? (mineStatus === "all"
                      ? "Assets you create and submit will appear here."
                      : mineStatus === "uploaded"
                        ? "Assets that have been approved by moderators will appear here."
                        : mineStatus === "in_review"
                          ? "Assets currently in the moderation review queue will appear here."
                          : mineStatus === "rejected"
                            ? "Assets rejected by moderators will appear here for revision."
                            : "Assets saved as drafts will appear here.")
                  : view === "purchased"
                    ? "Assets you purchase will appear here."
                    : view === "saved"
                      ? (savedStatus === "liked" ? "Like assets to find them here later." : "Save assets to find them here later.")
                      : "Uploaded media will appear here."}
            </p>
            {view === "mine" && <button type="button" onClick={() => void openCreate()} disabled={checkingPostEligibility} className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60">{checkingPostEligibility ? "Checking..." : "Upload your first asset"}</button>}
          </div>
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {assets.map((asset) => (
              <AssetCard
                key={asset.market_asset_id}
                asset={asset}
                view={view}
                engagementPending={engagementPending}
                onUpdateEngagement={(a, kind) => void updateEngagement(a, kind)}
                onEdit={openEdit}
                onDelete={setDeletingAsset}
              />
            ))}
          </div>
        )}

        {!loading && !loadError && pagination.totalPages > 1 && (
          <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Asset pages">
            <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:hover:bg-white/5"><ChevronLeft className="h-4 w-4" /> Previous</button>
            <span className="px-2 text-sm text-gray-500 dark:text-zinc-400">Page {pagination.page} of {pagination.totalPages}</span>
            <button type="button" onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))} disabled={page >= pagination.totalPages} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:hover:bg-white/5">Next <ChevronRight className="h-4 w-4" /></button>
          </nav>
        )}
      </main>

      <AssetEditorModal open={editorOpen} asset={editingAsset} onClose={() => !deleting && setEditorOpen(false)} onSaved={onSaved} />
      <GuestLoginModal
        isOpen={isGuestLoginOpen}
        onClose={() => setIsGuestLoginOpen(false)}
        title="Log in to use Asset Library actions"
        message="Please log in or create an account to upload, like, or save marketplace assets."
      />
      <ConfirmationModal isOpen={Boolean(deletingAsset)} title="Delete asset?" message={`Delete “${deletingAsset?.name || "this asset"}”? This removes it from the library.`} confirmText={deleting ? "Deleting..." : "Delete asset"} cancelText="Keep asset" onConfirm={() => void confirmDelete()} onCancel={() => !deleting && setDeletingAsset(null)} />
      {deleting && <span className="sr-only"><Loader2 className="animate-spin" /> Deleting asset</span>}
    </div>
  );
}
