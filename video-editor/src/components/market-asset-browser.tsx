import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Image, Clapperboard, AudioLines, PackageOpen, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export function MarketAssetCard({
  bundle,
  onOpen,
  layout = "grid"
}: {
  bundle: MarketAssetBundle;
  onOpen: (bundle: MarketAssetBundle) => void;
  layout?: "grid" | "list";
}) {
  const [isHovering, setIsHovering] = useState(false);
  const [activeShowcaseIndex, setActiveShowcaseIndex] = useState(0);
  const slides = bundle.showcases.length > 0
    ? bundle.showcases.map((showcase) => showcase.preview || showcase.details.src)
    : bundle.preview
      ? [bundle.preview]
      : [];

  useEffect(() => {
    if (!isHovering || slides.length < 2) return;
    const interval = window.setInterval(() => {
      setActiveShowcaseIndex((index) => (index + 1) % slides.length);
    }, 1100);
    return () => window.clearInterval(interval);
  }, [isHovering, slides.length]);

  const handleBlur = () => {
    setIsHovering(false);
    setActiveShowcaseIndex(0);
  };

  if (layout === "list") {
    return (
      <button
        type="button"
        onClick={() => onOpen(bundle)}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={handleBlur}
        onFocus={() => setIsHovering(true)}
        onBlur={handleBlur}
        className="group flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-zinc-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={`Open ${bundle.name} bundle`}
      >
        <span className="relative size-12 shrink-0 overflow-hidden rounded-md bg-zinc-800 text-muted-foreground">
          {slides[activeShowcaseIndex] ? (
            <img src={slides[activeShowcaseIndex]} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center"><AssetTypeIcon type={bundle.type} /></span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-200">{bundle.name}</span>
          <span className="block text-xs text-muted-foreground">{bundle.assets.length} {bundle.assets.length === 1 ? "asset" : "assets"}</span>
        </span>
        <MarketPriceBadge credits={bundle.price_credits} className="shrink-0" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(bundle)}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={handleBlur}
      onFocus={() => setIsHovering(true)}
      onBlur={handleBlur}
      className="group relative size-full overflow-hidden rounded-md bg-zinc-800 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label={`Open ${bundle.name} bundle`}
    >
      {slides[activeShowcaseIndex] ? (
        <span className="absolute inset-0 overflow-hidden">
          <img src={slides[activeShowcaseIndex]} alt="" aria-hidden="true" className="absolute inset-0 size-full scale-110 object-cover opacity-75 blur-xl" />
          <img src={slides[activeShowcaseIndex]} alt="" className="relative size-full object-contain transition-transform duration-300 group-hover:scale-[1.03]" />
        </span>
      ) : (
        <span className="flex size-full items-center justify-center text-muted-foreground"><AssetTypeIcon type={bundle.type} className="size-10" /></span>
      )}
      <span className="absolute inset-0 bg-black/20 opacity-0 transition-opacity group-hover:opacity-100" />
      <MarketPriceBadge credits={bundle.price_credits} className="absolute left-2 top-2" />
      {bundle.type !== "audio" && <span className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-secondary/90 text-secondary-foreground" aria-label="Bundle"><PackageOpen className="size-4" /></span>}
      <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-black/50 p-2.5 text-white opacity-0 transition-opacity group-hover:opacity-100">
        <span className="min-w-0">
          <span className="block truncate text-xs font-semibold">{bundle.name}</span>
          <span className="block text-[10px] text-white/75">{bundle.assets.length} {bundle.assets.length === 1 ? "asset" : "assets"}</span>
        </span>
      </span>
    </button>
  );
}

export function MarketAssetDetails({
  bundle,
  onBack,
  onAddAsset
}: {
  bundle: MarketAssetBundle;
  onBack: () => void;
  onAddAsset: (asset: MarketAssetContent) => void;
}) {
  const assetCounts = bundle.assets.reduce<Record<MarketAssetType, number>>(
    (counts, asset) => {
      counts[asset.type] += 1;
      return counts;
    },
    { image: 0, video: 0, audio: 0 }
  );
  const assetCountLabel = (Object.entries(assetCounts) as [MarketAssetType, number][])
    .filter(([, count]) => count > 0)
    .map(([type, count]) => `${count} ${type}${count === 1 ? "" : "s"}`)
    .join(" · ");

  return (
    <div className="h-full min-h-0 w-full overflow-hidden">
      <ScrollArea className="h-full px-4">
        <div className="py-4">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="group mb-3 -ml-1 size-6 p-0 text-muted-foreground hover:bg-transparent dark:hover:bg-transparent"
            onClick={onBack}
            aria-label="Back to market assets"
          >
            <ArrowLeft className="size-4 transition-colors group-hover:text-white group-focus-visible:text-white" />
          </Button>
          <h2 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-200">{bundle.name}</h2>
          <p className="mt-1 text-xs text-muted-foreground">Bundle{assetCountLabel ? ` · ${assetCountLabel}` : ""}</p>
          <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{bundle.description || "No description provided."}</p>
          <div className="mt-2 flex items-center text-xs text-muted-foreground">
            {bundle.price_credits > 0 ? <MarketPriceBadge credits={bundle.price_credits} /> : <span className="font-semibold text-zinc-900 dark:text-zinc-200">Free</span>}
          </div>
        </div>

        <section className="pb-4">
          {bundle.assets.length > 0 ? (
            bundle.type === "audio"
              ? <MarketAudioList items={bundle.assets} onSelect={onAddAsset} />
              : <MarketAssetMasonry items={bundle.assets} onSelect={onAddAsset} />
          ) : (
            <p className="text-xs text-muted-foreground">No asset files.</p>
          )}
        </section>
      </ScrollArea>
    </div>
  );
}

function MarketAudioList({ items, onSelect }: {
  items: MarketAssetContent[];
  onSelect: (asset: MarketAssetContent) => void;
}) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-1">
      {items.map((item) => <MarketAudioRow key={item.id} item={item} onSelect={onSelect}
        isPlaying={playingId === item.id} setPlayingId={setPlayingId} />)}
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

function MarketAssetMasonry({
  items,
  onSelect
}: {
  items: MarketAssetContent[];
  onSelect: (asset: MarketAssetContent) => void;
}) {
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
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              disabled={item.proxyStatus !== "ready" || !item.details?.src}
              aria-label={item.proxyStatus === "ready" ? `Add ${item.name} to the timeline` : `${item.name}: preview unavailable`}
              className="group relative h-full cursor-pointer overflow-hidden rounded-md bg-zinc-800 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
              style={{ width }}
            >
              {item.preview ? (
                <img src={item.preview} alt="" className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center text-muted-foreground"><AssetTypeIcon type={item.type} className="size-8" /></span>
              )}
              <span className="absolute inset-0 bg-black/20 opacity-0 transition-opacity group-hover:opacity-100" />
              {item.proxyStatus !== "ready" && <span className="absolute inset-x-0 top-0 bg-black/70 px-2 py-1 text-[10px] text-white">Preview unavailable</span>}
              <span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">{item.name}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
