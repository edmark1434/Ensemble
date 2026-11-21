import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CircleOff, RefreshCw, Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import useStore from "../store/use-store";
import useLayoutStore from "../store/use-layout-store";
import { getMarketAssetId, useMarketLicenses } from "../store/use-market-licenses";
import { getTargetById } from "../utils/target";
import { exitFullscreenForModal } from "../utils/exit-fullscreen-for-modal";

export function MarketWatermarkBadge({ container, transforming }: { container: HTMLDivElement | null; transforming: boolean }) {
  const activeIds = useStore(state => state.activeIds);
  const items = useStore(state => state.trackItemsMap);
  const playerRef = useStore(state => state.playerRef);
  const replaceTargetId = useLayoutStore(state => state.replaceTargetId);
  const startReplace = useLayoutStore(state => state.startReplace);
  const selectedId = activeIds.length === 1 ? activeIds[0] : null;
  const item = selectedId ? items[selectedId] : null;
  const isMedia = !!item && (item.type === "image" || item.type === "video");
  const assetId = item ? getMarketAssetId(item) : null;
  const asset = useMarketLicenses(state => assetId ? state.assets[assetId] : undefined);
  const openPurchase = useMarketLicenses(state => state.openPurchase);
  const barRef = useRef<HTMLDivElement>(null);
  const takenDown = !!asset?.trashed;
  const showWatermark = !!asset && !asset.licensed && (takenDown || asset.priceCredits > 0) && isMedia && !transforming;
  const showReplace = isMedia && !(item?.details as any)?.locked && !transforming;
  const show = showWatermark || showReplace;

  useEffect(() => {
    if (!container || !selectedId || !show) return;
    let frame = 0;
    const position = () => {
      const bar = barRef.current;
      const target = getTargetById(selectedId);
      if (bar) {
        const visible = target && target.getBoundingClientRect().width > 0 && !playerRef?.current?.isPlaying();
        bar.style.visibility = visible ? "visible" : "hidden";
        if (visible) {
          const bounds = container.getBoundingClientRect();
          const rect = target.getBoundingClientRect();
          bar.style.left = `${Math.max(8, Math.min(rect.right - bounds.left - bar.offsetWidth - 8, bounds.width - bar.offsetWidth - 8))}px`;
          bar.style.top = `${Math.max(8, Math.min(rect.top - bounds.top + 8, bounds.height - bar.offsetHeight - 8))}px`;
        }
      }
      frame = requestAnimationFrame(position);
    };
    position();
    return () => cancelAnimationFrame(frame);
  }, [container, selectedId, show, playerRef]);

  if (!container || !show || !item) return null;

  const isReplacingThis = replaceTargetId === item.id;
  const watermarkLabel = takenDown ? "This asset was taken down" : "Remove watermarks";

  return createPortal(
    <div
      ref={barRef}
      data-canvas-media-actions=""
      style={{ visibility: "hidden" }}
      className="absolute z-[210] inline-flex items-center gap-1.5"
      onPointerDown={event => event.stopPropagation()}
      onMouseDown={event => event.stopPropagation()}
    >
      {showWatermark && assetId && (
        <Tooltip delayDuration={10}>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <button
                type="button"
                disabled={takenDown}
                aria-label={watermarkLabel}
                data-market-purchase={takenDown ? undefined : ""}
                className="inline-flex size-8 items-center justify-center rounded-md border bg-card text-foreground shadow-md disabled:pointer-events-none disabled:opacity-60 enabled:hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={async event => {
                  event.stopPropagation();
                  if (await exitFullscreenForModal()) openPurchase(assetId);
                }}
              >
                {takenDown ? <CircleOff className="size-3.5" /> : <Sparkles className="size-3.5" />}
              </button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" align="center" sideOffset={6}>
            {watermarkLabel}
          </TooltipContent>
        </Tooltip>
      )}
      {showReplace && (
        <button
          type="button"
          aria-pressed={isReplacingThis}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-md border bg-card px-2.5 text-xs font-medium text-foreground shadow-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isReplacingThis && "border-primary text-primary",
          )}
          onClick={async event => {
            event.stopPropagation();
            if (await exitFullscreenForModal()) {
              startReplace(item.id, item.type === "video" ? "videos" : "images");
            }
          }}
        >
          <RefreshCw className="size-3.5" />
          Replace
        </button>
      )}
    </div>,
    container,
  );
}
