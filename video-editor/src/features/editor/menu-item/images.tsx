import { ScrollArea } from "@/components/ui/scroll-area";
import { dispatch } from "@designcombo/events";
import { generateId } from "@designcombo/timeline";
import Draggable from "@/components/shared/draggable";
import { IImage } from "@designcombo/types";
import React, {useState, useEffect, useRef, useMemo} from "react";
import { useIsDraggingOverTimeline } from "../hooks/is-dragging-over-timeline";
import { ADD_IMAGE } from "@designcombo/state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {Search, Loader2, PlusIcon} from "lucide-react";
import { usePexelsImages } from "@/hooks/use-pexels-images";
import { ImageLoading } from "@/components/ui/image-loading";
import {getCurrentTime} from "@/features/editor/utils/time";
import {normalizeDimensionsToCanvas} from "@/features/editor/utils/dimensions";
import useStore from "../store/use-store";
import {useMasonryRows} from "@/features/editor/hooks/use-masonry-rows";

const buildNormalizedImagePayload = (image: Partial<IImage>): Partial<IImage> => {
  const details = image.details;
  if (!details || !details.width || !details.height) return image;

  const { size } = useStore.getState();
  const normalized = normalizeDimensionsToCanvas(
    details.width,
    details.height,
    size.width,
    size.height
  );

  return {
    ...image,
    details: {
      ...details,
      width: normalized.width,
      height: normalized.height,
      left: `${(size.width - normalized.width) / 2}px`,
      top: `${(size.height - normalized.height) / 2}px`
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

export const Images = () => {
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
    images: pexelsImages,
    loading: pexelsLoading,
    error: pexelsError,
    currentPage,
    hasNextPage,
    searchImages,
    loadCuratedImages,
    searchImagesAppend,
    loadCuratedImagesAppend,
    clearImages
  } = usePexelsImages();

  // Load curated images on component mount
  useEffect(() => {
    loadCuratedImages();
  }, [loadCuratedImages]);

  const handleAddImage = (payload: Partial<IImage>) => {
    const normalizedPayload = buildNormalizedImagePayload(payload);
    if (!normalizedPayload.details) return;

    const time = getCurrentTime();
    const DEFAULT_IMAGE_DURATION_MS = 5000;

    const finalPayload: Partial<IImage> = {
      ...normalizedPayload,
      id: generateId(),
      metadata: {
        ...normalizedPayload.metadata,
        name: normalizedPayload.name
      },
      display: {
        from: time,
        to: time + DEFAULT_IMAGE_DURATION_MS
      }
    };

    dispatch(ADD_IMAGE, {
      payload: finalPayload,
      options: {}
    });
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      await loadCuratedImages();
      return;
    }

    try {
      await searchImages(searchQuery);
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
        searchImagesAppend(searchQuery, currentPage + 1);
      } else {
        loadCuratedImagesAppend(currentPage + 1);
      }
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    clearImages();
    loadCuratedImages();
  };

  // Use Pexels images if available, otherwise fall back to static images
  const displayImages = pexelsImages.map((image) => ({
    ...image,
    metadata: {
      ...image.metadata,
      name: image.name
    }
  }));

  const rows = useMasonryRows(displayImages, containerWidth, {
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
            disabled={pexelsLoading}
          >
            {pexelsLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Search className="h-3 w-3" />
            )}
          </Button>
          <Input
            placeholder="Search Pexels images..."
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

      <ScrollArea className="flex-1 px-4 h-full">
        <div ref={containerRef} className="flex flex-col gap-2">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-2" style={{ height: row.height }}>
              {row.items.map(({ item: image, width }, i) => (
                <div
                  key={`${image.id}-${rowIndex}-${i}`}
                  className="h-full"
                  style={{ width, height: row.height }}
                >
                  <ImageItem
                    image={image}
                    shouldDisplayPreview={!isDraggingOverTimeline}
                    handleAddImage={handleAddImage}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
        {pexelsLoading && <ImageLoading message="Searching for images..." />}
        {hasNextPage && (
          <div className="flex items-center justify-center p-4">
            <Button size="sm" variant="outline" onClick={handleLoadMore} disabled={pexelsLoading}>
              {pexelsLoading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Loading...</>) : "Load more"}
            </Button>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

const ImageItem = ({
                     handleAddImage,
                     image,
                     shouldDisplayPreview
                   }: {
  handleAddImage: (payload: Partial<IImage>) => void;
  image: Partial<IImage>;
  shouldDisplayPreview: boolean;
}) => {
  const normalizedImage = useMemo(
    () => buildNormalizedImagePayload(image),
    [image]
  );

  const style = React.useMemo(
    () => ({
      backgroundImage: `url(${image.preview})`,
      backgroundSize: "cover",
      width: "120px",
      height: "120px",
      border: "1px solid var(--primary)",
      borderRadius: "6px"
    }),
    [image.preview]
  );

  return (
    <Draggable
      data={normalizedImage}
      renderCustomPreview={<div style={style} />}
      shouldDisplayPreview={shouldDisplayPreview}
    >
      <div
        onClick={() =>
          handleAddImage(image)
        }
        className="relative flex w-full h-full items-center justify-center overflow-hidden cursor-pointer group rounded-md"
      >
        <img
          draggable={false}
          src={image.preview}
          className="w-full h-full rounded-md object-cover"
          alt="Visual content"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
          <div className="rounded-full p-1">
            <PlusIcon className="h-6 w-6 fill-current" />
          </div>
        </div>
      </div>
    </Draggable>
  );
};