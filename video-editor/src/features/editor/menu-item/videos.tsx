import Draggable from "@/components/shared/draggable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { dispatch } from "@designcombo/events";
import { ADD_VIDEO } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";
import { IImage, IVideo } from "@designcombo/types";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useIsDraggingOverTimeline } from "../hooks/is-dragging-over-timeline";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, PlusIcon } from "lucide-react";
import { usePexelsVideos } from "@/hooks/use-pexels-videos";
import { ImageLoading } from "@/components/ui/image-loading";
import { getCurrentTime } from "@/features/editor/utils/time";
import useStore from "../store/use-store";
import { useMasonryRows } from "@/features/editor/hooks/use-masonry-rows";
import { millisecondsToHHMMSS } from "../utils/format";
import { useMarketAssets } from "@/hooks/use-market-assets";
import { MarketPriceBadge } from "@/components/market-price-badge";

// Shared by both click-to-add and drag-to-add: scales the raw video
// dimensions to fit the canvas and centers left/top accordingly.
// Returns the video unchanged if it has no usable width/height.
const buildNormalizedVideoPayload = (video: Partial<IVideo>): Partial<IVideo> => {
  const details = video.details;
  if (!details || !details.width || !details.height) return video;

  const { size } = useStore.getState();

  return {
    ...video,
    details: {
      ...details,
      left: `${(size.width - details.width) / 2}px`,
      top: `${(size.height - details.height) / 2}px`
    }
  };
};

// Row height band for the masonry grid. Rows solve to somewhere in this
// range so they stretch to fill the container width exactly (no ragged
// right edge). Set MIN and MAX to the same value for a truly fixed row
// height instead - rows will then leave a gap on the right rather than
// stretch, but will never overflow either way.
const TARGET_ROW_HEIGHT = 140;
const MIN_ROW_HEIGHT = 120;
const MAX_ROW_HEIGHT = 999999;
const GAP = 8;

export const Videos = () => {
  const isDraggingOverTimeline = useIsDraggingOverTimeline();
  const [searchQuery, setSearchQuery] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const {
    videos: pexelsVideos,
    loading: pexelsLoading,
    error: pexelsError,
    currentPage,
    hasNextPage,
    searchVideos,
    loadPopularVideos,
    searchVideosAppend,
    loadPopularVideosAppend,
    clearVideos
  } = usePexelsVideos();

  const {
    items: marketImages,
    loading: marketLoading,
    hasMore: marketHasMore,
    load: loadMarket,
    loadMore: loadMoreMarket
  } = useMarketAssets<Partial<IVideo>>("video");

  // Load market + popular videos on component mount
  useEffect(() => {
    loadPopularVideos();
    loadMarket("");
  }, [loadPopularVideos, loadMarket]);

  const handleAddVideo = (payload: Partial<IVideo>) => {
    const normalizedPayload = buildNormalizedVideoPayload(payload);

    const time = getCurrentTime();
    const durationMs = ((normalizedPayload.details as any)?.duration ?? 5) * 1000;

    const finalPayload: Partial<IVideo> = {
      ...normalizedPayload,
      id: generateId(),
      metadata: {
        ...normalizedPayload.metadata,
        name: normalizedPayload.name
      },
      display: {
        from: time,
        to: time + durationMs
      }
    };

    dispatch(ADD_VIDEO, {
      payload: finalPayload,
      options: {
        resourceId: "main",
        // scaleMode: "fit"
      }
    });
  };

  const handleSearch = async () => {
    const q = searchQuery.trim();
    const market = loadMarket(q);

    if (!q) {
      await Promise.all([market, loadPopularVideos()]);
      return;
    }

    await Promise.all([market, searchVideos(q)]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleLoadMore = () => {
    // Exhaust market assets first, then continue into stock
    if (marketHasMore) {
      loadMoreMarket(searchQuery);
      return;
    }

    if (!hasNextPage) return;

    if (searchQuery.trim()) {
      searchVideosAppend(searchQuery, currentPage + 1);
    } else {
      loadPopularVideosAppend(currentPage + 1);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    clearVideos();
    loadPopularVideos();
    loadMarket("");
  };

  const isLoading = pexelsLoading || marketLoading;

  // Market assets always come first, then Pexels stock
  const displayVideos = [...marketImages, ...pexelsVideos].map((video) => ({
    ...video,
    metadata: {
      ...video.metadata,
      name: video.name
    }
  }));

  const rows = useMasonryRows(displayVideos, containerWidth, {
    gap: GAP,
    targetRowHeight: TARGET_ROW_HEIGHT,
    minRowHeight: MIN_ROW_HEIGHT,
    maxRowHeight: MAX_ROW_HEIGHT
  });

  return (
    <div className="flex h-full w-full flex-col min-h-0 overflow-hidden">
      <div className="flex items-center gap-2 p-4">
        <div className="relative flex-1">
          <Button
            size="sm"
            variant="ghost"
            className="absolute left-2 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
            onClick={handleSearch}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Search className="h-3 w-3" />
            )}
          </Button>
          <Input
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyPress}
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

      {pexelsError && (
        <div className="px-4">
          <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 p-2 rounded">
            {pexelsError}
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 px-4 h-full">
        <div ref={containerRef} className="flex flex-col gap-2">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-2" style={{ height: row.height }}>
              {row.items.map(({ item: video, width }, i) => (
                <div
                  key={`${video.id}-${rowIndex}-${i}`}
                  className="h-full"
                  style={{ width, height: row.height }}
                >
                  <VideoItem
                    video={video}
                    shouldDisplayPreview={!isDraggingOverTimeline}
                    handleAddVideo={handleAddVideo}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
        {isLoading && <ImageLoading message="Searching for videos..." />}
        {/* Pagination */}
        {(hasNextPage || marketHasMore) && (
          <div className="flex items-center justify-center p-4">
            <Button
              size="sm"
              variant="outline"
              onClick={handleLoadMore}
              disabled={isLoading}
            >
              {isLoading ? (
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
  );
};

const VideoItem = ({
  handleAddVideo,
  video,
  shouldDisplayPreview
}: {
  handleAddVideo: (payload: Partial<IVideo>) => void;
  video: Partial<IVideo>;
  shouldDisplayPreview: boolean;
}) => {
  const normalizedVideo = useMemo(
    () => buildNormalizedVideoPayload({
      ...video,
      metadata: {
        ...video.metadata,
        previewUrl: video.preview
      }
    }),
    [video]
  );

  const style = React.useMemo(
    () => ({
      backgroundImage: `url(${video.preview})`,
      backgroundSize: "cover",
      width: "120px",
      height: "120px",
      border: "1px solid var(--primary)",
      borderRadius: "6px"
    }),
    [video.preview]
  );

  return (
    <Draggable
      data={normalizedVideo}
      renderCustomPreview={<div style={style} className="draggable" />}
      shouldDisplayPreview={shouldDisplayPreview}
    >
      <div
        onClick={() =>
          handleAddVideo({
            ...video,
            metadata: {
              ...video.metadata,
              previewUrl: video.preview
            }
          })
        }
        className="relative flex w-full h-full items-center justify-center overflow-hidden group cursor-pointer rounded-md"
      >
        <img
          draggable={false}
          src={video.preview}
          className="w-full h-full rounded-md object-cover"
          alt="Video preview"
        />
        {/* Play button overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
          <div className="rounded-full p-1">
            <PlusIcon className="h-6 w-6 fill-current" />
          </div>
        </div>
        {/* Duration badge */}
        {(video.details as any)?.duration && (
          <div className="absolute bottom-2 right-2 rounded-md bg-secondary/90 px-2 py-0.5 text-xs text-secondary-foreground/90">
            {millisecondsToHHMMSS(Math.floor((video.details as any).duration) * 1000)}
          </div>
        )}
        <MarketPriceBadge
          credits={(video.metadata as any)?.price_credits}
          className="absolute top-2 left-2"
        />
      </div>
    </Draggable>
  );
};