import { useCallback, useEffect, useMemo, useState } from "react";
import { Bookmark, Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { debounce } from "lodash";
import { MediaSearchBar } from "@/components/media-search-bar";
import { MarketBrowserHeader } from "@/components/market-browser-header";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MarketAssetDetails, MarketAssetListings, type MarketAssetBundle } from "@/components/market-asset-browser";
import { useMarketAssets, type MarketAssetType } from "@/hooks/use-market-assets";
import { addMarketAssetToTimeline } from "../utils/add-market-asset-to-timeline";

export type MarketCollectionView = "liked" | "saved";
const mediaLabels = { image: "images", video: "videos", audio: "audios" };

function useCollectionRefresh(refresh: () => void) {
  useEffect(() => {
    refresh();
    window.addEventListener("market-engagement-updated", refresh);
    return () => window.removeEventListener("market-engagement-updated", refresh);
  }, [refresh]);
}

function CollectionRow({ type, view, onOpen }: {
  type: MarketAssetType;
  view: MarketCollectionView;
  onOpen: (view: MarketCollectionView) => void;
}) {
  const { loading, error, totalMediaCount, load } = useMarketAssets<MarketAssetBundle>(type, view);
  const refresh = useCallback(() => { void load(""); }, [load]);
  useCollectionRefresh(refresh);
  const Icon = view === "liked" ? Heart : Bookmark;
  const title = `${view === "liked" ? "Liked" : "Saved"} ${mediaLabels[type]}`;

  return (
    <button type="button" onClick={() => onOpen(view)}
      className="group flex w-full items-center gap-3 rounded bg-secondary/70 px-3 py-2 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground"><Icon className="size-4" /></span>
      <span className="min-w-0 flex-1">
        <span className="mb-0.5 block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-300">{title}</span>
        <span className="block text-xs text-muted-foreground">{loading ? "Loading…" : error ? "Collection unavailable" : totalMediaCount === 0 ? `No ${view} ${mediaLabels[type]} yet` : `${totalMediaCount} ${totalMediaCount === 1 ? type : mediaLabels[type]}`}</span>
      </span>
    </button>
  );
}

export function MarketCollectionRows({ type, onOpen }: {
  type: MarketAssetType;
  onOpen: (view: MarketCollectionView) => void;
}) {
  return <div className="mb-3 flex flex-col gap-2" aria-label={`${mediaLabels[type]} collections`}>
    <CollectionRow type={type} view="liked" onOpen={onOpen} />
    <CollectionRow type={type} view="saved" onOpen={onOpen} />
  </div>;
}

export function MarketCollection({ view, type, onBack }: {
  view: MarketCollectionView;
  type: MarketAssetType;
  onBack: () => void;
}) {
  const [selectedBundle, setSelectedBundle] = useState<MarketAssetBundle | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const { items, loading, error, hasMore, totalMediaCount, load, loadMore } = useMarketAssets<MarketAssetBundle>(type, view);
  const refresh = useCallback(() => { void load(search); }, [load, search]);
  useCollectionRefresh(refresh);
  const debouncedSearch = useMemo(() => debounce((value: string) => setSearch(value.trim()), 500), []);
  useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);
  const handleSearchChange = (value: string) => {
    setQuery(value);
    if (type === "audio") debouncedSearch(value);
  };
  const handleSearch = () => {
    debouncedSearch.cancel();
    if (search === query.trim()) refresh();
    else setSearch(query.trim());
  };
  const handleClearSearch = () => {
    debouncedSearch.cancel();
    setQuery("");
    if (search === "") refresh();
    else setSearch("");
  };
  const Icon = view === "liked" ? Heart : Bookmark;
  const title = `${view === "liked" ? "Liked" : "Saved"} ${mediaLabels[type]}`;

  if (selectedBundle) return <MarketAssetDetails bundle={selectedBundle} onBack={() => setSelectedBundle(null)} onAddAsset={addMarketAssetToTimeline} />;

  return <div className="flex h-full min-h-0 w-full flex-col">
    <MarketBrowserHeader title={title} onBack={onBack} backLabel={`Back to ${mediaLabels[type]}`}
      subtitle={<><Icon className="size-3.5 shrink-0" aria-hidden="true" /><span>{totalMediaCount} {totalMediaCount === 1 ? type : mediaLabels[type]}</span></>}>
      {(items.length > 0 || query || search) && <MediaSearchBar className="mt-4 p-0" value={query} placeholder={`Search ${title.toLowerCase()}...`} loading={loading}
        onChange={handleSearchChange} onSearch={handleSearch} onClear={handleClearSearch} />}
    </MarketBrowserHeader>
    <ScrollArea className="min-h-0 flex-1 px-4">
      <div className="pb-4">
        {error && <div role="alert" className="py-6 text-center text-xs text-muted-foreground"><p>{error}</p><Button variant="ghost" size="sm" onClick={refresh}>Try again</Button></div>}
        {!error && !loading && !items.length && <p className="py-10 text-center text-xs text-muted-foreground">{search ? "No matching assets." : `No ${view} ${mediaLabels[type]} yet.`}</p>}
        <MarketAssetListings listings={items} type={type} onOpenBundle={setSelectedBundle} onSelectAsset={addMarketAssetToTimeline} />
        {loading && <Loader2 className="mx-auto my-6 size-5 animate-spin text-muted-foreground" />}
        {hasMore && <Button className="mt-4 w-full" variant="outline" size="sm" disabled={loading} onClick={() => void loadMore(search)}>Load more</Button>}
      </div>
    </ScrollArea>
  </div>;
}
