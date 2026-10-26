import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Image, Clapperboard, AudioLines, PackageOpen, Pause, Play } from "lucide-react";
import { MarketBrowserHeader } from "./market-browser-header";
import { MarketAssetActions } from "./market-asset-actions";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MarketPriceBadge } from "@/components/market-price-badge";
import { useMasonryRows } from "@/features/editor/hooks/use-masonry-rows";

export type MarketAssetType = "image" | "video" | "audio";

export interface MarketAssetContent {
  id: string;
  name: string;
  type: MarketAssetType;
  preview?: string;
  proxyStatus?: "ready" | "unavailable";
  details?: {
    src: string;
    width?: number;
    height?: number;
    duration?: number;
  };
  metadata?: {
    market?: boolean;
    author?: string;
    market_asset_id?: string;
    media_asset_id?: string;
    price_credits?: number;
  };
}

export interface MarketAssetShowcaseImage extends MarketAssetContent {
  type: "image";
  preview: string;
  details: {
    src: string;
    width?: number;
    height?: number;
  };
}

export interface MarketAssetBundle {
  id: string;
  marketAssetId: string;
  is_liked?: boolean;
  is_saved?: boolean;
  like_count?: number;
  is_owner?: boolean;
  name: string;
  description: string;
  type: MarketAssetType;
  price_credits: number;
  preview?: string;
  details?: {
    src?: string;
    width?: number;
    height?: number;
  };
  showcases: MarketAssetShowcaseImage[];
  assets: MarketAssetContent[];
  metadata: {
    market: true;
    market_asset_id: string;
    price_credits: number;
    author?: string;
  };
}

export function isMarketAssetBundle(item: unknown): item is MarketAssetBundle {
  if (!item || typeof item !== "object") return false;
  const candidate = item as Partial<MarketAssetBundle>;
  return typeof candidate.marketAssetId === "string" && Array.isArray(candidate.assets) && candidate.assets.length > 1;
}

export function getWidestBundleShowcase(bundle: MarketAssetBundle) {
  return bundle.showcases
    .filter((image) => image.details.width && image.details.height)
    .reduce<MarketAssetShowcaseImage | undefined>((widest, image) => {
      const ratio = image.details.width! / image.details.height!;
      const widestRatio = widest ? widest.details.width! / widest.details.height! : 0;
      return ratio > widestRatio ? image : widest;
    }, undefined);
}

export function useWidestBundleShowcaseDimensions(bundles: MarketAssetBundle[]) {
  const [dimensions, setDimensions] = useState<Record<string, { width: number; height: number }>>({});

  useEffect(() => {
    let cancelled = false;

    const loadImageDimensions = (src: string) => new Promise<{ width: number; height: number } | undefined>((resolve) => {
      const image = new window.Image();
      image.onload = () => resolve(image.naturalWidth && image.naturalHeight
        ? { width: image.naturalWidth, height: image.naturalHeight }
        : undefined);
      image.onerror = () => resolve(undefined);
      image.src = src;
    });

    void Promise.all(bundles.map(async (bundle) => {
      const showcaseDimensions = await Promise.all(bundle.showcases.map(async (showcase) => {
        if (showcase.details.width && showcase.details.height) {
          return { width: showcase.details.width, height: showcase.details.height };
        }
        const src = showcase.preview || showcase.details.src;
        return src ? loadImageDimensions(src) : undefined;
      }));
      const widest = showcaseDimensions
        .filter((item): item is { width: number; height: number } => Boolean(item?.width && item.height))
        .reduce<{ width: number; height: number } | undefined>((current, item) => (
          !current || item.width / item.height > current.width / current.height ? item : current
        ), undefined);
      return widest ? [bundle.marketAssetId, widest] as const : undefined;
    })).then((results) => {
      if (cancelled) return;
      setDimensions(Object.fromEntries(results.filter((item): item is readonly [string, { width: number; height: number }] => Boolean(item))));
    });

    return () => { cancelled = true; };
  }, [bundles]);

  return dimensions;
}

function AssetTypeIcon({ type, className = "size-5" }: { type: MarketAssetType; className?: string }) {
  if (type === "image") return <Image className={className} />;
  if (type === "video") return <Clapperboard className={className} />;
  return <AudioLines className={className} />;
}

export function MarketPreview({ src, type, className = "size-full object-cover" }: { src?: string; type: MarketAssetType; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return src && failedSrc !== src
    ? <img src={src} alt="" draggable={false} onError={() => setFailedSrc(src)} className={className} />
    : <span className="flex size-full items-center justify-center bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"><AssetTypeIcon type={type} className="size-8" /></span>;
}

export function BundleIndicator() {
  return <Tooltip><TooltipTrigger asChild><span tabIndex={0} className="flex size-7 items-center justify-center rounded-full bg-secondary/90 text-secondary-foreground" aria-label="Bundle: all included assets for one price"><PackageOpen className="size-4" /></span></TooltipTrigger><TooltipContent>Asset bundle: all included assets for one price</TooltipContent></Tooltip>;
}

export function MarketAssetCard({ bundle, onOpen, layout = "grid" }: {
  bundle: MarketAssetBundle;
  onOpen: (bundle: MarketAssetBundle) => void;
  layout?: "grid" | "list";
}) {
  const [isHovering, setIsHovering] = useState(false);
  const [activeShowcaseIndex, setActiveShowcaseIndex] = useState(0);
  const slides = bundle.showcases.length > 0
    ? bundle.showcases.map((showcase) => showcase.preview || showcase.details.src)
    : bundle.preview ? [bundle.preview] : [];
  const isBundle = bundle.assets.length > 1;
  const unavailable = !isBundle && (bundle.assets[0]?.proxyStatus !== "ready" || !bundle.assets[0]?.details?.src);
  useEffect(() => {
    if (!isHovering || slides.length < 2) return;
    const interval = window.setInterval(() => setActiveShowcaseIndex((index) => (index + 1) % slides.length), 1100);
    return () => window.clearInterval(interval);
  }, [isHovering, slides.length]);
  const reset = () => { setIsHovering(false); setActiveShowcaseIndex(0); };

  if (layout === "list") return <div className="group flex w-full items-center gap-2 rounded-lg bg-secondary/40 px-2 py-2 hover:bg-secondary/70">
    <button type="button" onClick={() => onOpen(bundle)} className="flex min-w-0 flex-1 items-center gap-3 rounded text-left focus-visible:ring-2 focus-visible:ring-primary" aria-label={`Open ${bundle.name}`}>
      <span className="relative size-10 shrink-0 overflow-hidden rounded-md bg-zinc-800"><MarketPreview src={slides[0]} type={bundle.type} /></span>
      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{bundle.name}</span><span className="block text-xs text-muted-foreground">{bundle.assets.length} {bundle.assets.length === 1 ? "asset" : "assets"} · {bundle.metadata.author}</span></span>
    </button>
    <MarketPriceBadge credits={bundle.price_credits} className="shrink-0" />
    {isBundle && <BundleIndicator />}
    <MarketAssetActions bundle={bundle} menuOnly />
  </div>;

  return <div className="group relative size-full overflow-hidden rounded-md bg-zinc-800" onMouseEnter={() => setIsHovering(true)} onMouseLeave={reset} onFocus={() => setIsHovering(true)} onBlur={reset}>
    <button type="button" disabled={unavailable} onClick={() => onOpen(bundle)} className="size-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary disabled:cursor-not-allowed" aria-label={isBundle ? `Open ${bundle.name} bundle` : unavailable ? `${bundle.name}: preview unavailable` : `Add ${bundle.name} to the timeline`}>
      <MarketPreview src={slides[activeShowcaseIndex]} type={bundle.type} className="size-full object-contain transition-transform duration-300 group-hover:scale-[1.03]" />
      <MarketPriceBadge credits={bundle.price_credits} className="absolute left-2 top-2" />
      <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-black/50 p-2.5 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">{bundle.name}</span>
    </button>
    <div className="absolute right-1 top-1 flex gap-1">{isBundle && <BundleIndicator />}<MarketAssetActions bundle={bundle} menuOnly /></div>
  </div>;
}

// Browse listings without expanding bundle contents until the bundle is opened.
export function MarketAssetListings({ listings, type, onOpenBundle, onSelectAsset }: {
  listings: MarketAssetBundle[];
  type: MarketAssetType;
  onOpenBundle: (bundle: MarketAssetBundle) => void;
  onSelectAsset: (asset: MarketAssetContent) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const bundles = useMemo(() => listings.filter(isMarketAssetBundle), [listings]);
  const dimensions = useWidestBundleShowcaseDimensions(bundles);
  const displayListings = useMemo(() => listings.map((listing) => {
    const widest = getWidestBundleShowcase(listing);
    const size = widest?.details ?? dimensions[listing.marketAssetId];
    return size?.width && size.height
      ? { ...listing, details: { ...listing.details, width: size.width, height: size.height } }
      : listing;
  }), [listings, dimensions]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => setContainerWidth(entries[0].contentRect.width));
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [type]);

  const rows = useMasonryRows(displayListings, containerWidth, {
    gap: 8, targetRowHeight: 140, minRowHeight: 120, maxRowHeight: 999999,
  });
  const openListing = (listing: MarketAssetBundle) => {
    if (listing.assets.length > 1) {
      setPlayingId(null);
      onOpenBundle(listing);
    } else if (listing.assets[0]) onSelectAsset(listing.assets[0]);
  };

  if (type === "audio") return <div className="flex flex-col gap-2">
    {listings.map((listing) => {
      if (listing.assets.length > 1) return <MarketAssetCard key={listing.marketAssetId} bundle={listing} layout="list" onOpen={openListing} />;
      const asset = listing.assets[0];
      return asset ? <div key={listing.marketAssetId} className="flex items-center gap-1">
        <div className="min-w-0 flex-1"><MarketAudioRow item={asset} onSelect={onSelectAsset} isPlaying={playingId === asset.id} setPlayingId={setPlayingId} /></div>
        <MarketAssetActions bundle={listing} menuOnly />
      </div> : null;
    })}
  </div>;

  return <div ref={containerRef} className="flex flex-col gap-2">
    {rows.map((row, index) => <div key={index} className="flex gap-2" style={{ height: row.height }}>
      {row.items.map(({ item, width }) => <div key={item.marketAssetId} className="h-full" style={{ width }}>
        <MarketAssetCard bundle={item} onOpen={openListing} />
      </div>)}
    </div>)}
  </div>;
}

export function MarketAssetDetails({ bundle, onBack, onAddAsset }: {
  bundle: MarketAssetBundle;
  onBack: () => void;
  onAddAsset: (asset: MarketAssetContent) => void;
}) {
  const assetCounts = bundle.assets.reduce<Record<MarketAssetType, number>>((counts, asset) => {
    counts[asset.type] += 1;
    return counts;
  }, { image: 0, video: 0, audio: 0 });
  const assetCountLabel = (Object.entries(assetCounts) as [MarketAssetType, number][])
    .filter(([, count]) => count > 0)
    .map(([type, count]) => `${count} ${type}${count === 1 ? "" : "s"}`)
    .join(" · ");
  const isBundle = bundle.assets.length > 1;

  return <div className="h-full min-h-0 w-full overflow-hidden">
    <ScrollArea className="h-full">
      <MarketBrowserHeader title={bundle.name} onBack={onBack} backLabel="Back to market assets"
        actions={<MarketAssetActions bundle={bundle} />}
        subtitle={<>
          {isBundle && <PackageOpen className="size-3.5 shrink-0" aria-hidden="true" />}
          <span>{isBundle ? "Bundle" : "Asset"}{assetCountLabel ? ` · ${assetCountLabel}` : ""}</span>
        </>}>
        <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{bundle.description || "No description provided."}</p>
        <div className="mt-2 flex items-center text-xs text-muted-foreground">
          {bundle.price_credits > 0 ? <MarketPriceBadge credits={bundle.price_credits} /> : <span className="font-semibold text-zinc-900 dark:text-zinc-200">Free</span>}
        </div>
      </MarketBrowserHeader>
      <section className="px-4 pb-4">
        {bundle.assets.length > 0
          ? <MarketAssetContents items={bundle.assets} type={bundle.type} onSelect={onAddAsset} />
          : <p className="text-xs text-muted-foreground">No asset files.</p>}
      </section>
    </ScrollArea>
  </div>;
}

interface MarketAssetContentsProps {
  items: MarketAssetContent[];
  onSelect: (asset: MarketAssetContent) => void;
  renderActions?: (asset: MarketAssetContent) => ReactNode;
}

export function MarketAssetContents({ type, ...props }: MarketAssetContentsProps & { type: MarketAssetType }) {
  return type === "audio" ? <MarketAudioList {...props} /> : <MarketAssetMasonry {...props} />;
}

function MarketAudioList({ items, onSelect, renderActions }: MarketAssetContentsProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-1">
      {items.map((item) => <div key={item.id} className="flex items-center gap-1">
        <div className="min-w-0 flex-1"><MarketAudioRow item={item} onSelect={onSelect}
          isPlaying={playingId === item.id} setPlayingId={setPlayingId} /></div>
        {renderActions?.(item)}
      </div>)}
    </div>
  );
}

function MarketAudioRow({ item, onSelect, isPlaying, setPlayingId }: {
  item: MarketAssetContent;
  onSelect: (asset: MarketAssetContent) => void;
  isPlaying: boolean;
  setPlayingId: (id: string | null) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.play().catch(() => setPlayingId(null));
    else { audio.pause(); audio.currentTime = 0; }
  }, [isPlaying, setPlayingId]);
  const playable = item.proxyStatus === "ready" && !!item.details?.src;
  return (
    <div className="group flex w-full items-center gap-3 rounded px-3 py-2 transition-colors hover:bg-zinc-800/50">
      <audio ref={audioRef} src={item.details?.src} onEnded={() => setPlayingId(null)} className="hidden" />
      <button type="button" onClick={() => setPlayingId(isPlaying ? null : item.id)} disabled={!playable}
        aria-label={isPlaying ? `Pause ${item.name}` : `Play ${item.name}`}
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-black/10 text-zinc-700 hover:bg-black/15 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50">
        {isPlaying ? <Pause className="size-4 fill-current" /> : <Play className="ml-0.5 size-4 fill-current" />}
      </button>
      <button type="button" onClick={() => onSelect(item)} disabled={!playable}
        className="flex min-w-0 flex-1 flex-col text-left disabled:cursor-not-allowed">
        <span className="mb-0.5 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-300">{item.name}</span>
        <span className="truncate text-xs text-muted-foreground">{item.metadata?.author ? `${item.metadata.author} · ` : ""}{item.details?.duration ? `${Math.floor(item.details.duration / 60)}:${String(Math.floor(item.details.duration % 60)).padStart(2, "0")}` : "Audio"}</span>
      </button>
      {!playable && <span className="shrink-0 text-[10px] text-muted-foreground">Preview unavailable</span>}
    </div>
  );
}

function MarketAssetMasonry({ items, onSelect, renderActions }: MarketAssetContentsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => setContainerWidth(entries[0].contentRect.width));
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const rows = useMasonryRows(items, containerWidth, {
    gap: 8,
    targetRowHeight: 140,
    minRowHeight: 120,
    maxRowHeight: 999999
  });

  return (
    <div ref={containerRef} className="flex flex-col gap-2">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-2" style={{ height: row.height }}>
          {row.items.map(({ item, width }) => (
            <div key={item.id} className="group relative h-full overflow-hidden rounded-md bg-zinc-800" style={{ width }}>
            <button
              type="button"
              onClick={() => onSelect(item)}
              disabled={item.proxyStatus !== "ready" || !item.details?.src}
              aria-label={item.proxyStatus === "ready" ? `Add ${item.name} to the timeline` : `${item.name}: preview unavailable`}
              className="relative size-full cursor-pointer overflow-hidden rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              <MarketPreview src={item.preview} type={item.type} />
              <span className="absolute inset-0 bg-black/20 opacity-0 transition-opacity group-hover:opacity-100" />
              {item.proxyStatus !== "ready" && <span className="absolute inset-x-0 top-0 bg-black/70 px-2 py-1 text-[10px] text-white">Preview unavailable</span>}
              <span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">{item.name}</span>
            </button>
            {renderActions && <div className="absolute right-1 top-1">{renderActions(item)}</div>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
