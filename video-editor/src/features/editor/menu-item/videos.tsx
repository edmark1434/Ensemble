import Draggable from "@/components/shared/draggable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { dispatch } from "@designcombo/events";
import { ADD_VIDEO } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";
import { IVideo } from "@designcombo/types";
import React, {useState, useEffect, useRef, useMemo} from "react";
import { useIsDraggingOverTimeline } from "../hooks/is-dragging-over-timeline";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, PlusIcon } from "lucide-react";
import { usePexelsVideos } from "@/hooks/use-pexels-videos";
import { ImageLoading } from "@/components/ui/image-loading";
import {useMasonryColumns} from "@/features/editor/hooks/use-masonry-columns";
import {getCurrentTime} from "@/features/editor/utils/time";
import {normalizeDimensionsToCanvas} from "@/features/editor/utils/dimensions";
import useStore from "../store/use-store";

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

export const Videos = () => {
  const isDraggingOverTimeline = useIsDraggingOverTimeline();
  const [searchQuery, setSearchQuery] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const COLUMN_WIDTH = 120;
  const GAP = 8;

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

  // Load popular videos on component mount
  useEffect(() => {
    loadPopularVideos();
  }, [loadPopularVideos]);

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
    if (!searchQuery.trim()) {
      await loadPopularVideos();
      return;
    }

    try {
      await searchVideos(searchQuery);
    } finally {
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleLoadMore = () => {
    if (hasNextPage) {
      if (searchQuery.trim()) {
        searchVideosAppend(searchQuery, currentPage + 1);
      } else {
        loadPopularVideosAppend(currentPage + 1);
      }
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    clearVideos();
    loadPopularVideos();
  };

  // Use Pexels videos if available, otherwise fall back to static videos
  const displayVideos = pexelsVideos.map((video) => ({
    ...video,
    metadata: {
      ...video.metadata,
      name: video.name
    }
  }));
  const columns = useMasonryColumns(displayVideos, COLUMN_WIDTH, containerWidth, GAP);

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-2 p-4">
        <div className="relative flex-1">
          <Button
            size="sm"
            variant="ghost"
            className="absolute left-2 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
            onClick={handleSearch}
            disabled={pexelsLoading}
          >
            {pexelsLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Search className="h-3 w-3" />
            )}
          </Button>
          <Input
            placeholder="Search Pexels videos..."
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
            disabled={pexelsLoading}
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

      <ScrollArea className="flex-1 px-4 max-h-full">
        <div ref={containerRef} className="flex gap-2 max-h-full">
          {columns.map((columnItems, colIndex) => (
            <div key={colIndex} className="flex flex-1 flex-col gap-2 min-w-0">
              {columnItems.map((video, i) => (
                <VideoItem
                  key={video.id || `${colIndex}-${i}`}
                  video={video}
                  shouldDisplayPreview={!isDraggingOverTimeline}
                  handleAddVideo={handleAddVideo}
                />
              ))}
            </div>
          ))}
        </div>
        {pexelsLoading && <ImageLoading message="Searching for videos..." />}
        {/* Pagination */}
        {hasNextPage && (
          <div className="flex items-center justify-center p-4">
            <Button
              size="sm"
              variant="outline"
              onClick={handleLoadMore}
              disabled={pexelsLoading}
            >
              {pexelsLoading ? (
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
  const width = (video.details as any)?.width;
  const height = (video.details as any)?.height;

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
        className="relative flex w-full items-center justify-center overflow-hidden group cursor-pointer rounded-md"
      >
        <img
          draggable={false}
          src={video.preview}
          style={{ aspectRatio: width && height ? `${width} / ${height}` : undefined }}
          className="w-full rounded-md object-cover"
          alt="Video preview"
        />
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
          <div className="rounded-full p-1">
            <PlusIcon className="h-6 w-6 fill-current" />
          </div>
        </div>
        {/* Duration badge */}
        {(video.details as any)?.duration && (
          <div className="absolute bottom-3 right-2 bg-secondary/90 text-secondary-foreground/90 text-xs px-1 py-0.5 rounded">
            {Math.round((video.details as any).duration)}s
          </div>
        )}
      </div>
    </Draggable>
  );
};