import { AudioPreviewButton } from "@/components/audio-preview-button";
import { MediaSearchBar } from "@/components/media-search-bar";
import { MarketCollection, MarketCollectionRows, type MarketCollectionView } from "./market-collection";
import Draggable from "@/components/shared/draggable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { dispatch } from "@designcombo/events";
import { ADD_AUDIO } from "@designcombo/state";
import { IAudio } from "@designcombo/types";
import { AudioLines, Loader2 } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { generateId } from "@designcombo/timeline";
import { Button } from "@/components/ui/button";
import { debounce } from "lodash";
import { useIsDraggingOverTimeline } from "@/features/editor/hooks/is-dragging-over-timeline";
import { getCurrentTime } from "@/features/editor/utils/time";
import { useMarketAssets } from "@/hooks/use-market-assets";
import { MarketAssetActions } from "@/components/market-asset-actions";
import { MarketPriceBadge } from "@/components/market-price-badge";
import { BundleIndicator, isMarketAssetBundle, MarketAssetCard, MarketAssetDetails, type MarketAssetBundle } from "@/components/market-asset-browser";
import { addMarketAssetToTimeline } from "@/features/editor/utils/add-market-asset-to-timeline";

export const Audios = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCollection, setSelectedCollection] = useState<MarketCollectionView | null>(null);
  const [selectedMarketAsset, setSelectedMarketAsset] = useState<MarketAssetBundle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<IAudio[]>([]);
  const [isMoreLoading, setIsMoreLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const {
    items: marketAudios,
    loading: marketLoading,
    hasMore: marketHasMore,
    load: loadMarket,
    loadMore: loadMoreMarket
  } = useMarketAssets<MarketAssetBundle>("audio");

  const fetchMusic = useCallback(async (query: string, pageNumber: number = 1) => {
    if (pageNumber === 1) {
      loadMarket(query);
      setIsLoading(true);
    } else {
      setIsMoreLoading(true);
    }

    try {
      const response = await fetch("/api/audio/music", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          limit: 30,
          page: pageNumber,
          query: query ? { keys: [query] } : {}
        })
      });

      const data = await response.json();

      if (data.musics) {
        const mappedMusics = data.musics.map((music: any) => ({
          id: music.id,
          details: {
            src: music.src,
            duration: music.duration,
          },
          name: music.name,
          type: music.type,
          metadata: {
            author: music.description || "",
            name: music.name
          }
        }));

        if (pageNumber === 1) {
          setSearchResults(mappedMusics);
        } else {
          setSearchResults((prev: IAudio[]) => [...prev, ...mappedMusics]);
        }

        setHasMore(data.pagination?.hasMore || false);
      } else {
        if (pageNumber === 1) {
          setSearchResults([]);
        }
        setHasMore(false);
      }
    } catch (error) {
      console.error("Failed to fetch music:", error);
    } finally {
      setIsLoading(false);
      setIsMoreLoading(false);
    }
  }, [loadMarket]);

  const debouncedFetch = useMemo(() => debounce((query: string) => {
    setPage(1);
    void fetchMusic(query, 1);
  }, 500), [fetchMusic]);

  useEffect(() => {
    void fetchMusic("");
  }, [fetchMusic]);
  useEffect(() => () => debouncedFetch.cancel(), [debouncedFetch]);

  const handleAddAudio = (payload: Partial<IAudio>) => {
    payload.id = generateId();
    payload.metadata = {
      ...payload.metadata,
      name: payload.name,
    };

    const time = getCurrentTime();
    const durationMs = ((payload.details as any)?.duration ?? 5) * 1000;

    payload.display = {
      from: time,
      to: time + durationMs
    };

    dispatch(ADD_AUDIO, {
      payload,
      options: {}
    });
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    debouncedFetch(query);
  };

  const loadMore = () => {
    if (marketHasMore) {
      loadMoreMarket(searchQuery);
      return;
    }
    const nextPage = page + 1;
    setPage(nextPage);
    fetchMusic(searchQuery, nextPage);
  };

  const uniqueResults = searchResults;

  const handleSearch = () => {
    debouncedFetch.cancel();
    setPage(1);
    void fetchMusic(searchQuery);
  };

  const handleClearSearch = () => {
    debouncedFetch.cancel();
    setSearchQuery("");
    setPage(1);
    void fetchMusic("");
  };

  // Main view
  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden">
    <div className={`flex flex-1 flex-col max-w-full h-full ${selectedMarketAsset || selectedCollection ? "hidden" : ""}`}>
      <MediaSearchBar value={searchQuery} placeholder="Search Freesound audios..." loading={isLoading}
        onChange={handleSearchChange} onSearch={handleSearch} onClear={handleClearSearch} />
      <ScrollArea className="flex-1 h-full max-w-full px-4">
        <MarketCollectionRows type="audio" onOpen={(view) => { setPlayingId(null); setSelectedCollection(view); }} />
        {isLoading && uniqueResults.length === 0 && marketAudios.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : uniqueResults.length === 0 && marketAudios.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
            <AudioLines size={32} className="opacity-50" />
            <span className="text-sm">No music found</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {marketAudios.map((entry) => {
              const bundle = isMarketAssetBundle(entry) ? entry : null;
              const audio = entry.assets[0];
              const item = { ...audio, id: bundle?.marketAssetId ?? audio?.id, name: bundle?.name ?? audio?.name,
                metadata: { ...audio?.metadata, author: entry.metadata.author, price_credits: entry.price_credits } } as Partial<IAudio>;
              return <AudioItem key={entry.marketAssetId} item={item} onAdd={handleAddAudio}
                playingId={playingId} setPlayingId={setPlayingId} marketBundle={bundle ?? undefined}
                marketListing={entry} onOpenBundle={(bundle) => { setPlayingId(null); setSelectedMarketAsset(bundle); }} />;
            })}
            {uniqueResults.map((audio, index) => (
              <AudioItem
                onAdd={handleAddAudio}
                item={audio}
                key={index}
                playingId={playingId}
                setPlayingId={setPlayingId}
              />
            ))}
          </div>
        )}

        {(hasMore || marketHasMore) && (uniqueResults.length > 0 || marketAudios.length > 0) && (
          <div className="py-4 flex justify-center">
            <Button
              size="sm"
              variant="outline"
              onClick={loadMore}
              disabled={isMoreLoading || marketLoading}
            >
              {(isMoreLoading || marketLoading) ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                "Load more"
              )}
            </Button>
          </div>
        )}
      </ScrollArea>
    </div>
    {selectedCollection && <MarketCollection key={selectedCollection} view={selectedCollection} type="audio" onBack={() => setSelectedCollection(null)} />}
    {selectedMarketAsset && (
      <MarketAssetDetails
        bundle={selectedMarketAsset}
        onBack={() => setSelectedMarketAsset(null)}
        onAddAsset={addMarketAssetToTimeline}
      />
    )}
    </div>
  );
};

const AudioItem = ({
  item,
  onAdd,
  playingId,
  setPlayingId,
  marketBundle,
  marketListing,
  onOpenBundle
}: {
  item: Partial<IAudio>;
  onAdd: (payload: Partial<IAudio>) => void;
  playingId: string | null;
  setPlayingId: (id: string | null) => void;
  marketBundle?: MarketAssetBundle;
  marketListing?: MarketAssetBundle;
  onOpenBundle?: (bundle: MarketAssetBundle) => void;
}) => {
  const [duration, setDuration] = useState<string>("--:--");
  const isPlaying = playingId === item.id;
  const isDraggingOverTimeline = useIsDraggingOverTimeline();

  const previewSrc = marketListing ? marketListing.assets[0]?.audioPreview : item.details?.src;
  const fullDuration = marketListing?.assets[0]?.details?.duration
    ?? (item.details as (IAudio["details"] & { duration?: number }) | undefined)?.duration;
  const formatDuration = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

  if (marketListing && !marketBundle && (marketListing.assets[0]?.proxyStatus !== "ready" || !marketListing.assets[0]?.details?.src)) {
    return <MarketAssetCard bundle={marketListing} layout="list" onOpen={(listing) => onOpenBundle?.(listing)} />;
  }

  const row = (
      <div
        className="group relative flex items-center gap-3 cursor-pointer px-3 py-2 rounded transition-colors hover:bg-zinc-800/50">
        {marketBundle ? <Button type="button" size="icon" variant="ghost"
          className="size-8 shrink-0 rounded-full" onClick={() => onOpenBundle?.(marketBundle)}
          aria-label={`Open ${marketBundle.name} bundle`}>
          <BundleIndicator />
        </Button> : <AudioPreviewButton src={previewSrc} name={item.name || "audio preview"}
          isPlaying={isPlaying} onToggle={() => setPlayingId(isPlaying ? null : item.id!)}
          onStop={() => setPlayingId(null)}
          onDuration={(seconds) => { if (Number.isFinite(seconds)) setDuration(formatDuration(seconds)); }} />}

        <div
          onClick={() => marketBundle ? onOpenBundle?.(marketBundle) : onAdd(item)}
          className="flex flex-col min-w-0 flex-1 cursor-pointer"
        >
          <span className="text-sm font-semibold truncate mb-0.5 text-zinc-900 dark:text-zinc-300">
            {item.name}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="min-w-0 truncate">
              {item.metadata?.author && `${item.metadata.author} · `}{marketBundle ? `${marketBundle.assets.length} audios` : fullDuration ? formatDuration(fullDuration) : duration}
            </span>
            {Number((item.metadata as any)?.price_credits) > 0 && (
              <>
                <span>·</span>
                <MarketPriceBadge
                  className="-my-0.5"
                  credits={(item.metadata as any).price_credits}
                />
              </>
            )}
          </span>
        </div>

        {isPlaying && !marketBundle && (
          <div className="flex size-7 shrink-0 items-center justify-center gap-[2px]" role="status" aria-label="Audio playing">
            {[...Array(5)].map((_, index) => (
              <span key={index} className="w-[3px] rounded-full bg-primary"
                style={{ height: "100%", animationName: "wave-bar", animationDelay: `${index * 0.15}s`,
                  animationDuration: "0.8s", animationIterationCount: "infinite",
                  animationTimingFunction: "ease-in-out", display: "inline-block" }} />
            ))}
          </div>
        )}

        {marketListing && <MarketAssetActions bundle={marketListing} menuOnly />}

      </div>
  );
  if (marketBundle) return row;
  return <Draggable data={item} shouldDisplayPreview={!isDraggingOverTimeline}
    renderCustomPreview={<div className="flex size-[120px] items-center justify-center rounded-md border border-primary bg-zinc-800"><AudioLines className="size-10 text-muted-foreground" /></div>}>{row}</Draggable>;
};
