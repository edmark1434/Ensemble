import { useCallback, useEffect, useState } from "react";
import { AudioLines, Bookmark, CheckCircle2, ChevronLeft, ChevronRight, Compass, Folder, Heart, Image, LayoutTemplate, Loader2, Pencil, Plus, Search, ShoppingBag, Star, Trash2, Video } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { CreditIcon } from "@/components/ui/credit-icon";
import api from "@/lib/axios";
import UserHeader from "@/components/nav/user_header";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast";
import AssetEditorModal from "./AssetEditorModal";
import AssetMedia from "./AssetMedia";
import type { AssetPagination, AssetRecord, AssetType } from "./assetTypes";
import { mediaUrl } from "./assetTypes";
import { getAssetPostingEligibility } from "./assetPostingEligibility";
import useGlobalState from "@/lib/global_state";
import { continueIfAccountVerified } from "@/lib/accountVerification";
import { GuestLoginModal } from "@/components/ui/GuestLoginModal";

type FilterType = "all" | AssetType;
type AssetView = "discover" | "mine" | "purchased" | "saved";
type MineStatus = "uploaded" | "draft";

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
  const [mineStatus, setMineStatus] = useState<MineStatus>("uploaded");
  const [search, setSearch] = useState(location.state?.searchQuery || "");
  const [debouncedSearch, setDebouncedSearch] = useState(location.state?.searchQuery || "");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  
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
      const response = await api.get<{ assets: AssetRecord[]; pagination: AssetPagination }>("/api/assets", {
        params: { page, pageSize: 12, search: debouncedSearch, type: filter, view, status: view === "mine" ? (mineStatus === "uploaded" ? "published" : "draft") : undefined },
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
  }, [debouncedSearch, filter, mineStatus, page, view]);

  useEffect(() => {
    const controller = new AbortController();
    void loadAssets(controller.signal);
    return () => controller.abort();
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
    if (!wasEditing && asset.status === "draft") {
      setPage(1);
      navigate('/assets/owned');
      setMineStatus("draft");
      return;
    }
    if (!wasEditing && view === "mine" && mineStatus !== "uploaded") {
      setPage(1);
      setMineStatus("uploaded");
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
      if (kind === "save" && view === "saved" && !response.data.is_saved) {
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
                  {(["uploaded", "draft"] as MineStatus[]).map((statusTab) => (
                    <button
                      key={statusTab}
                      type="button"
                      role="tab"
                      aria-selected={mineStatus === statusTab}
                      onClick={() => { setPage(1); setMineStatus(statusTab); }}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition ${
                        mineStatus === statusTab
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

        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm font-semibold">{view === "mine" ? (mineStatus === "draft" ? "Your draft assets" : "Your uploaded assets") : view === "purchased" ? "Your purchased assets" : view === "saved" ? "Your saved assets" : "Community assets"}</p>
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
            <h2 className="mt-4 font-semibold">{view === "mine" ? (mineStatus === "draft" ? "You don't have any draft assets." : "You haven't uploaded any assets yet.") : view === "purchased" ? "You haven't purchased any assets yet." : view === "saved" ? "You haven't saved any assets yet." : "No assets found."}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-zinc-500">{search ? "Try a different search or filter." : view === "mine" && mineStatus === "draft" ? "Assets saved as drafts will appear here." : view === "purchased" ? "Assets you purchase will appear here." : view === "saved" ? "Save assets to find them here later." : "Uploaded media will appear here."}</p>
            {view === "mine" && <button type="button" onClick={() => void openCreate()} disabled={checkingPostEligibility} className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60">{checkingPostEligibility ? "Checking..." : "Upload your first asset"}</button>}
          </div>
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {assets.map((asset) => (
              <article key={asset.market_asset_id} onClick={() => navigate(`/assets/${asset.market_asset_id}`)} className="group cursor-pointer overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md dark:border-white/10 dark:bg-dark-surface dark:shadow-none dark:hover:border-blue-500/50">
                <div className="relative overflow-hidden"><AssetMedia asset={asset} compact /><span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">{asset.type}</span>{asset.is_purchased && !asset.is_owner && <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase text-white"><CheckCircle2 className="h-3 w-3" /> Owned</span>}</div>
                  <div className="p-4">
                    <div className="flex flex-col gap-2.5">
                      <h2 className="min-w-0 truncate font-bold text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-300">{asset.name}</h2>
                      
                      <div className="flex items-center gap-1.5 w-fit rounded-full bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 border border-amber-200/50 dark:border-amber-500/20">
                        <CreditIcon className="h-4 w-4" />
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{asset.price_credits.toLocaleString()}</span>
                      </div>

                      <div className="flex items-center gap-2 min-w-0">
                        {asset.creator_avatar_path ? (
                          <img src={mediaUrl(asset.creator_avatar_path)} alt={asset.creator_name} className="h-5 w-5 shrink-0 rounded-full object-cover" />
                        ) : (
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[9px] font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                            {asset.creator_name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <p className="truncate text-xs text-gray-500 dark:text-zinc-400">by {asset.creator_name}</p>
                      </div>
                    </div>
                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-[11px] text-gray-500 dark:border-white/5 dark:text-zinc-500">
                    <span>{formatDate(asset.created_at)}</span>
                    <span className="inline-flex items-center gap-3"><span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {asset.like_count}</span><span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5" /> {asset.average_rating || "—"}</span></span>
                  </div>
                  <div className="mt-3 flex gap-2" onClick={(event) => event.stopPropagation()}>
                    <button type="button" onClick={() => void updateEngagement(asset, "like")} disabled={engagementPending.has(`like:${asset.market_asset_id}`)} className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition disabled:opacity-50 ${asset.is_liked ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300" : "border-gray-200 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"}`}><Heart className={`h-3.5 w-3.5 ${asset.is_liked ? "fill-current" : ""}`} /> {asset.is_liked ? "Liked" : "Like"}</button>
                    <button type="button" onClick={() => void updateEngagement(asset, "save")} disabled={engagementPending.has(`save:${asset.market_asset_id}`)} className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition disabled:opacity-50 ${asset.is_saved ? "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-300" : "border-gray-200 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"}`}><Bookmark className={`h-3.5 w-3.5 ${asset.is_saved ? "fill-current" : ""}`} /> {asset.is_saved ? "Saved" : "Save"}</button>
                  </div>
                  {asset.is_owner && (
                    <div className="mt-3 flex gap-2" onClick={(event) => event.stopPropagation()}>
                      <button type="button" onClick={() => openEdit(asset)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-xs font-semibold transition hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                      <button type="button" onClick={() => setDeletingAsset(asset)} className="inline-flex items-center justify-center rounded-lg border border-red-500/20 px-3 text-red-600 transition hover:bg-red-500/10 dark:text-red-300" aria-label={`Delete ${asset.name}`}><Trash2 className="h-3.5 w-3.5" /></button>
                      {view === "mine" && <span className={`flex items-center rounded-lg px-2 text-[10px] font-bold uppercase ${asset.status === "published" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "bg-amber-500/10 text-amber-600 dark:text-amber-300"}`}>{asset.status}</span>}
                    </div>
                  )}
                </div>
              </article>
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
