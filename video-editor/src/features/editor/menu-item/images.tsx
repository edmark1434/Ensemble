import { MediaSearchBar } from "@/components/media-search-bar";
import { MarketCollection, MarketCollectionRows, type MarketCollectionView } from "./market-collection";
import { ScrollArea } from "@/components/ui/scroll-area";
import { dispatch } from "@designcombo/events";
import { generateId } from "@designcombo/timeline";
import Draggable from "@/components/shared/draggable";
import { IImage } from "@designcombo/types";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useIsDraggingOverTimeline } from "../hooks/is-dragging-over-timeline";
import { ADD_IMAGE } from "@designcombo/state";
import { Button } from "@/components/ui/button";
import { Loader2, PlusIcon } from "lucide-react";
import { usePexelsImages } from "@/hooks/use-pexels-images";
import { useMarketAssets } from "@/hooks/use-market-assets";
import { ImageLoading } from "@/components/ui/image-loading";
import { getCurrentTime } from "@/features/editor/utils/time";
import { normalizeDimensionsToCanvas } from "@/features/editor/utils/dimensions";
import useStore from "../store/use-store";
import { useMasonryRows } from "@/features/editor/hooks/use-masonry-rows";
import { MarketAssetActions } from "@/components/market-asset-actions";
import { MarketPreview } from "@/components/market-asset-browser";
import { MarketPriceBadge } from "@/components/market-price-badge";
import { getWidestBundleShowcase, isMarketAssetBundle, MarketAssetCard, MarketAssetDetails, type MarketAssetBundle, useWidestBundleShowcaseDimensions } from "@/components/market-asset-browser";
import { addMarketAssetToTimeline } from "@/features/editor/utils/add-market-asset-to-timeline";

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
  const [selectedCollection, setSelectedCollection] = useState<MarketCollectionView | null>(null);
  const [selectedMarketAsset, setSelectedMarketAsset] = useState<MarketAssetBundle | null>(null);

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

  const {
    items: marketImages,
    loading: marketLoading,
    hasMore: marketHasMore,
    load: loadMarket,
    loadMore: loadMoreMarket
  } = useMarketAssets<MarketAssetBundle>("image");
  const marketBundles = useMemo(() => marketImages.filter(isMarketAssetBundle), [marketImages]);
  const showcaseDimensions = useWidestBundleShowcaseDimensions(marketBundles);

  // Load market + curated images on component mount
  useEffect(() => {
    loadCuratedImages();
    loadMarket("");
  }, [loadCuratedImages, loadMarket]);

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
    const q = searchQuery.trim();
    const market = loadMarket(q);

    if (!q) {
      await Promise.all([market, loadCuratedImages()]);
      return;
    }

    await Promise.all([market, searchImages(q)]);
  };

  const handleLoadMore = () => {
    // Exhaust market assets first, then continue into stock
    if (marketHasMore) {
      loadMoreMarket(searchQuery);
      return;
    }

    if (!hasNextPage) return;

    if (searchQuery.trim()) {
      searchImagesAppend(searchQuery, currentPage + 1);
    } else {
      loadCuratedImagesAppend(currentPage + 1);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    clearImages();
    loadCuratedImages();
    loadMarket("");
  };

  const isLoading = pexelsLoading || marketLoading;

  // Market assets always come first, then Pexels stock
  const displayImages = [...marketImages, ...pexelsImages].map((image) => {
    const widestShowcase = isMarketAssetBundle(image) ? getWidestBundleShowcase(image) : undefined;
    const dimensions = isMarketAssetBundle(image) ? showcaseDimensions[image.marketAssetId] : undefined;
    const width = widestShowcase?.details.width ?? dimensions?.width;
    const height = widestShowcase?.details.height ?? dimensions?.height;
    return {
      ...image,
      ...(width && height ? { details: { ...image.details, width, height } } : {}),
      metadata: { ...image.metadata, name: image.name }
    };
  });

  const rows = useMasonryRows(displayImages, containerWidth, {
    gap: GAP,
    targetRowHeight: TARGET_ROW_HEIGHT,
    minRowHeight: MIN_ROW_HEIGHT,
    maxRowHeight: MAX_ROW_HEIGHT
  });

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden">
    <div className={`flex h-full w-full flex-col min-h-0 overflow-hidden ${selectedMarketAsset || selectedCollection ? "hidden" : ""}`}>
      <MediaSearchBar value={searchQuery} placeholder="Search images..." loading={isLoading}
        onChange={setSearchQuery} onSearch={() => { void handleSearch(); }} onClear={handleClearSearch} />

      {pexelsError && (
        <div className="px-4">
          <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 p-2 rounded">
            {pexelsError}
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 px-4 h-full">
        <MarketCollectionRows type="image" onOpen={setSelectedCollection} />
        <div ref={containerRef} className="flex flex-col gap-2">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-2" style={{ height: row.height }}>
              {row.items.map(({ item: image, width }, i) => (
                <div
                  key={`${image.id}-${rowIndex}-${i}`}
                  className="h-full"
                  style={{ width, height: row.height }}
                >
                  {isMarketAssetBundle(image) ? (
                    <MarketAssetCard bundle={image} onOpen={setSelectedMarketAsset} />
                  ) : (
                    <ImageItem
                      marketListing={"marketAssetId" in image ? image as MarketAssetBundle : undefined}
                      image={((Array.isArray((image as any).assets) && (image as any).assets.length === 1)
                        ? (image as any).assets[0] : image) as Partial<IImage>}
                      shouldDisplayPreview={!isDraggingOverTimeline}
                      handleAddImage={handleAddImage}
                    />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
        {isLoading && <ImageLoading message="Searching for images..." />}
        {(hasNextPage || marketHasMore) && (
          <div className="flex items-center justify-center p-4">
            <Button size="sm" variant="outline" onClick={handleLoadMore} disabled={isLoading}>
              {isLoading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Loading...</>) : "Load more"}
            </Button>
          </div>
        )}
      </ScrollArea>
    </div>
    {selectedCollection && <MarketCollection key={selectedCollection} view={selectedCollection} type="image" onBack={() => setSelectedCollection(null)} />}
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

const ImageItem = ({
  handleAddImage,
  image,
  marketListing,
  shouldDisplayPreview
}: {
  handleAddImage: (payload: Partial<IImage>) => void;
  image: Partial<IImage>;
  marketListing?: MarketAssetBundle;
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

  if (marketListing && (marketListing.assets[0]?.proxyStatus !== "ready" || !marketListing.assets[0]?.details?.src)) {
    return <MarketAssetCard bundle={marketListing} onOpen={() => {}} />;
  }

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
        <MarketPreview src={image.preview} type="image" />
        {marketListing && <div className="absolute right-1 top-1 z-10"><MarketAssetActions bundle={marketListing} menuOnly /></div>}
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
          <div className="rounded-full p-1">
            <PlusIcon className="h-6 w-6 fill-current" />
          </div>
        </div>
        <MarketPriceBadge
          credits={(image.metadata as any)?.price_credits}
          className="absolute top-2 left-2"
        />
      </div>
    </Draggable>
  );
};
