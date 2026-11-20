import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clapperboard, Image, Images } from "lucide-react";
import { isVideoPreviewPath, mediaUrl, type AssetRecord } from "./assetTypes";
import { MediaFallback } from "./AssetMedia";

export default function AssetThumbnailCarousel({ asset }: { asset: AssetRecord }) {
  const slides = useMemo(() => {
    const ordered = [...(asset.thumbnails || [])].sort((left, right) => left.position - right.position);
    if (ordered.length > 0) {
      return ordered.map((thumbnail) => ({ id: thumbnail.media_asset_id, path: thumbnail.path }));
    }
    const fallbackPath = asset.thumbnail_path || (asset.type !== "audio" ? asset.proxy_path : null);
    return fallbackPath ? [{ id: "primary", path: fallbackPath }] : [];
  }, [asset.proxy_path, asset.thumbnail_path, asset.thumbnails, asset.type]);
  const [active, setActive] = useState(0);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  useEffect(() => {
    setActive(0);
    setFailedSrc(null);
  }, [asset.market_asset_id]);
  if (slides.length === 0 || !slides[0].path) return null;

  const currentSlide = slides[active] ?? slides[0];
  const activeUrl = mediaUrl(currentSlide.path);
  const activeIsVideo = isVideoPreviewPath(currentSlide.path);
  const select = (index: number) => setActive((index + slides.length) % slides.length);
  return (
    <div className="bg-gray-100 dark:bg-black/30">
      <div className="relative flex min-h-64 items-center justify-center overflow-hidden md:min-h-[28rem]">
        {failedSrc === activeUrl ? (
          <MediaFallback
            icon={activeIsVideo || asset.type === "video" ? Clapperboard : Image}
            label={activeIsVideo || asset.type === "video" ? "Video preview unavailable" : "Image preview unavailable"}
            className="min-h-64 w-full md:min-h-[28rem]"
          />
        ) : activeIsVideo ? (
          <video
            key={activeUrl}
            src={activeUrl}
            autoPlay
            muted
            loop
            playsInline
            controls
            controlsList="nodownload"
            preload="metadata"
            onError={() => setFailedSrc(activeUrl)}
            onContextMenu={(event) => event.preventDefault()}
            className="max-h-[68vh] w-full bg-black object-contain"
            aria-label={`${asset.name} preview ${active + 1} of ${slides.length}`}
          />
        ) : (
          <img
            src={activeUrl}
            alt={`${asset.name} preview ${active + 1} of ${slides.length}`}
            draggable={false}
            onError={() => setFailedSrc(activeUrl)}
            onContextMenu={(event) => event.preventDefault()}
            className="max-h-[68vh] w-full select-none object-contain"
          />
        )}
        {slides.length > 1 && <>
          <button type="button" onClick={() => select(active - 1)} className="absolute left-3 rounded-full bg-black/60 p-2.5 text-white transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" aria-label="Previous thumbnail"><ChevronLeft className="h-5 w-5" /></button>
          <button type="button" onClick={() => select(active + 1)} className="absolute right-3 rounded-full bg-black/60 p-2.5 text-white transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" aria-label="Next thumbnail"><ChevronRight className="h-5 w-5" /></button>
          <span className={`absolute right-3 inline-flex items-center gap-1.5 rounded-full bg-black/65 px-3 py-1.5 text-xs font-semibold text-white ${activeIsVideo ? "top-3" : "bottom-3"}`}><Images className="h-3.5 w-3.5" /> {active + 1}/{slides.length}</span>
        </>}
      </div>
      {slides.length > 1 && <div className="flex gap-2 overflow-x-auto border-t border-gray-200 p-3 dark:border-white/10">
        {slides.map((slide, index) => {
          const slideUrl = mediaUrl(slide.path);
          return (
            <button key={slide.id} type="button" onClick={() => setActive(index)} aria-label={`View thumbnail ${index + 1}`} aria-current={active === index} className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition ${active === index ? "border-blue-500" : "border-transparent opacity-65 hover:opacity-100"}`}>
              {isVideoPreviewPath(slide.path) ? (
                <video src={slideUrl} muted playsInline preload="metadata" className="pointer-events-none h-full w-full object-cover" />
              ) : (
                <img src={slideUrl} alt="" draggable={false} className="h-full w-full object-cover" />
              )}
            </button>
          );
        })}
      </div>}
    </div>
  );
}

