import { useCallback, useEffect, useState } from "react";
import { AudioLines, Bookmark, CheckCircle2, ChevronLeft, ChevronRight, Heart, Image, Loader2, Pencil, Plus, Search, Star, Trash2, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/axios";
import UserHeader from "@/components/nav/user_header";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast";
import AssetEditorModal from "./AssetEditorModal";
import AssetMedia from "./AssetMedia";
import type { AssetPagination, AssetRecord, AssetType } from "./assetTypes";

type FilterType = "all" | AssetType;
type AssetView = "discover" | "mine" | "purchased" | "saved";

const FILTERS: { value: FilterType; label: string; icon: typeof Image }[] = [
  { value: "all", label: "All", icon: Image },
  { value: "image", label: "Images", icon: Image },
  { value: "video", label: "Videos", icon: Video },
  { value: "audio", label: "Audio", icon: AudioLines },
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
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#0d0f1a]">
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
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [pagination, setPagination] = useState<AssetPagination>({ page: 1, pageSize: 12, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FilterType>("all");
  const [view, setView] = useState<AssetView>("discover");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetRecord | null>(null);
  const [deletingAsset, setDeletingAsset] = useState<AssetRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [engagementPending, setEngagementPending] = useState<Set<string>>(new Set());

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
        params: { page, pageSize: 12, search: debouncedSearch, type: filter, view },
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
  }, [debouncedSearch, filter, page, view]);

  useEffect(() => {
    const controller = new AbortController();
    void loadAssets(controller.signal);
    return () => controller.abort();
  }, [loadAssets]);

  const openCreate = () => {
    setEditingAsset(null);
    setEditorOpen(true);
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
    if (!wasEditing && asset.status === "draft" && view === "discover") {
      setPage(1);
      setView("mine");
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
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-[#080a12] dark:text-white">
      <UserHeader pageTitle="Asset Library" />
      <main className="mx-auto w-full max-w-7xl p-5 md:p-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <h1 className="text-2xl font-bold">Assets Library</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">Discover images, videos, and audio shared by the community.</p>
          </div>
          <button type="button" onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
            <Plus className="h-4 w-4" /> Upload Asset
          </button>
        </div>

        <section className="mt-7 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0d0f1a] dark:shadow-none">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex rounded-xl bg-gray-100 p-1 dark:bg-white/5" role="tablist" aria-label="Asset views">
              {(["discover", "mine", "purchased", "saved"] as const).map((tab) => (
                <button key={tab} type="button" role="tab" aria-selected={view === tab} onClick={() => { setPage(1); setView(tab); }} className={`flex-1 rounded-lg px-5 py-2 text-sm font-semibold capitalize transition lg:flex-none ${view === tab ? "bg-white text-blue-600 shadow-sm dark:bg-blue-600 dark:text-white" : "text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"}`}>
                  {tab === "mine" ? "My Assets" : tab === "purchased" ? "Purchased" : tab === "saved" ? "Saved" : "Discover"}
                </button>
              ))}
            </div>
            <label className="relative block w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} maxLength={100} placeholder="Search title, creator, or tag..." className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-[#080a12] dark:text-white" />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-200 pt-4 dark:border-white/10" role="tablist" aria-label="Media types">
            {FILTERS.map(({ value, label, icon: Icon }) => (
              <button key={value} type="button" role="tab" aria-selected={filter === value} onClick={() => { setPage(1); setFilter(value); }} className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition ${filter === value ? "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-300" : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"}`}>
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>
        </section>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm font-semibold">{view === "mine" ? "Your uploaded assets" : view === "purchased" ? "Your purchased assets" : view === "saved" ? "Your saved assets" : "Community assets"}</p>
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
          <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-16 text-center dark:border-white/10 dark:bg-[#0d0f1a]">
            <AudioLines className="mx-auto h-10 w-10 text-gray-400 dark:text-zinc-600" />
            <h2 className="mt-4 font-semibold">{view === "mine" ? "You haven't uploaded any assets yet." : view === "purchased" ? "You haven't purchased any assets yet." : view === "saved" ? "You haven't saved any assets yet." : "No assets found."}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-zinc-500">{search ? "Try a different search or filter." : view === "purchased" ? "Assets you purchase will appear here." : view === "saved" ? "Save assets to find them here later." : "Uploaded media will appear here."}</p>
            {view === "mine" && <button type="button" onClick={openCreate} className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500">Upload your first asset</button>}
          </div>
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {assets.map((asset) => (
              <article key={asset.market_asset_id} onClick={() => navigate(`/assets/${asset.market_asset_id}`)} className="group cursor-pointer overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md dark:border-white/10 dark:bg-[#0d0f1a] dark:shadow-none dark:hover:border-blue-500/50">
                <div className="relative overflow-hidden"><AssetMedia asset={asset} compact /><span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">{asset.type}</span>{asset.is_purchased && !asset.is_owner && <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase text-white"><CheckCircle2 className="h-3 w-3" /> Owned</span>}</div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><h2 className="truncate font-bold text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-300">{asset.name}</h2><p className="mt-1 truncate text-xs text-gray-500 dark:text-zinc-500">by {asset.creator_name}</p></div>
                    <span className="shrink-0 text-sm font-bold text-amber-600 dark:text-amber-300">{asset.price_credits.toLocaleString()} cr</span>
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
      <ConfirmationModal isOpen={Boolean(deletingAsset)} title="Delete asset?" message={`Delete “${deletingAsset?.name || "this asset"}”? This removes it from the library.`} confirmText={deleting ? "Deleting..." : "Delete asset"} cancelText="Keep asset" onConfirm={() => void confirmDelete()} onCancel={() => !deleting && setDeletingAsset(null)} />
      {deleting && <span className="sr-only"><Loader2 className="animate-spin" /> Deleting asset</span>}
    </div>
  );
}
