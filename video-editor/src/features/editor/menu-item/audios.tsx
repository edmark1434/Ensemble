import Draggable from "@/components/shared/draggable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { dispatch } from "@designcombo/events";
import { ADD_AUDIO, ADD_ITEMS } from "@designcombo/state";
import { IAudio } from "@designcombo/types";
import { AudioLines, Loader2, PackageOpen, Pause, Play, Search } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { generateId } from "@designcombo/timeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { debounce } from "lodash";
import { useIsDraggingOverTimeline } from "@/features/editor/hooks/is-dragging-over-timeline";
import { getCurrentTime } from "@/features/editor/utils/time";
import { useMarketAssets } from "@/hooks/use-market-assets";
import { MarketPriceBadge } from "@/components/market-price-badge";
import { isMarketAssetBundle, MarketAssetDetails, type MarketAssetBundle } from "@/components/market-asset-browser";
import { addMarketAssetToTimeline } from "@/features/editor/utils/add-market-asset-to-timeline";

export const Audios = () => {
  const [searchQuery, setSearchQuery] = useState("");
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

  const fetchMusic = async (query: string, pageNumber: number = 1) => {
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
  };

  const debouncedFetch = useCallback(
    debounce((query: string) => {
      setPage(1);
      fetchMusic(query, 1);
    }, 500),
    []
  );

  useEffect(() => {
    fetchMusic("");
  }, []);
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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
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

  const handleClearSearch = () => {
    setSearchQuery("");
    fetchMusic("");
  };

  // Main view
  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden">
    <div className={`flex flex-1 flex-col max-w-full h-full ${selectedMarketAsset ? "hidden" : ""}`}>
      <div className="flex items-center gap-2 p-4">
        <div className="relative flex-1">
          <Button
            size="sm"
            variant="ghost"
            className="absolute left-2 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
            onClick={() => fetchMusic(searchQuery)}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Search className="h-3 w-3" />
            )}
          </Button>
          <Input
            placeholder="Search Freesound audios..."
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                fetchMusic(searchQuery);
              }
            }}
            className="pl-10"
          />
        </div>
        {searchQuery && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleClearSearch}
            disabled={isLoading}
          >
            Clear
          </Button>
        )}
      </div>
      <ScrollArea className="flex-1 h-full max-w-full px-4">
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
              const audio = (bundle ? bundle.assets[0] : (entry as any).assets?.[0] ?? entry) as Partial<IAudio>;
              const item = { ...audio, id: bundle?.marketAssetId ?? audio.id, name: bundle?.name ?? audio.name,
                metadata: { ...audio.metadata, author: bundle?.metadata.author ?? audio.metadata?.author,
                  price_credits: bundle?.price_credits ?? audio.metadata?.price_credits } } as Partial<IAudio>;
              return <AudioItem key={bundle?.marketAssetId ?? item.id} item={item} onAdd={handleAddAudio}
                playingId={playingId} setPlayingId={setPlayingId} marketBundle={bundle ?? undefined}
                onOpenBundle={setSelectedMarketAsset} />;
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
  onOpenBundle
}: {
  item: Partial<IAudio>;
  onAdd: (payload: Partial<IAudio>) => void;
  playingId: string | null;
  setPlayingId: (id: string | null) => void;
  marketBundle?: MarketAssetBundle;
  onOpenBundle?: (bundle: MarketAssetBundle) => void;
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [duration, setDuration] = useState<string>("--:--");
  const isPlaying = playingId === item.id;
  const isDraggingOverTimeline = useIsDraggingOverTimeline();

  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    if (isPlaying) {
      audioEl.play().catch((err) => {
        // Expected when a quick pause() (switching tracks, unmount) interrupts
        // an in-flight play() request — see https://goo.gl/LdLk22. Anything
        // else is a real playback failure worth knowing about.
        if (err.name !== "AbortError") {
          console.error("Failed to play audio preview", err);
        }
      });
    } else {
      audioEl.pause();
      audioEl.currentTime = 0;
    }
  }, [isPlaying]);

  const togglePlay = () => {
    if (marketBundle) { onOpenBundle?.(marketBundle); return; }
    if (isPlaying) {
      setPlayingId(null);
    } else {
      setPlayingId(item.id!);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const seconds = Math.round(audioRef.current.duration);
      const min = Math.floor(seconds / 60);
      const sec = seconds % 60;
      setDuration(`${min}:${sec.toString().padStart(2, "0")}`);
    }
  };

  return (
    <Draggable
      data={item}
      renderCustomPreview={
        <div
          className="w-[120px] h-[120px] rounded-md flex items-center justify-center bg-zinc-800 border border-primary">
          <AudioLines className="text-muted-foreground" size={40} />
        </div>
      }
      shouldDisplayPreview={!isDraggingOverTimeline}
    >
      <div
        className={`group relative flex items-center gap-3 cursor-pointer px-3 py-2 rounded transition-colors ${marketBundle ? "bg-secondary/70 hover:bg-secondary" : "hover:bg-zinc-800/50"}`}>
        <audio
          ref={audioRef}
          src={item.details?.src}
          onEnded={() => setPlayingId(null)}
          onLoadedMetadata={handleLoadedMetadata}
          className="hidden"
        />

        <Button
          size="icon"
          variant={marketBundle ? "secondary" : "ghost"}
          className={`h-8 w-8 rounded-full shrink-0 ${marketBundle ? "" : "bg-black/10 dark:bg-white/5 hover:bg-black/15 dark:hover:bg-white/10"}`}
          onClick={togglePlay}
        >
          {marketBundle ? <PackageOpen className="size-4" /> : isPlaying ? (
            <Pause className="size-4 fill-current" />
          ) : (
            <Play className="size-4 fill-current ml-0.5" />
          )}
        </Button>

        <div
          onClick={() => marketBundle ? onOpenBundle?.(marketBundle) : onAdd(item)}
          className="flex flex-col min-w-0 flex-1 cursor-pointer"
        >
          <span className="text-sm font-semibold truncate mb-0.5 text-zinc-900 dark:text-zinc-300">
            {item.name}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="min-w-0 truncate">
              {item.metadata?.author && `${item.metadata.author} · `}{marketBundle ? `${marketBundle.assets.length} audios` : duration}
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

        {isPlaying && (
          <div className="flex items-end gap-[2px] h-4 shrink-0">
            {[...Array(5)].map((_, i) => (
              <span
                key={i}
                className="w-[3px] bg-primary rounded-full"
                style={{
                  height: "100%",
                  animationName: "wave-bar",
                  animationDelay: `${i * 0.15}s`,
                  animationDuration: "0.8s",
                  animationIterationCount: "infinite",
                  animationTimingFunction: "ease-in-out",
                  display: "inline-block",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </Draggable>
  );
};
