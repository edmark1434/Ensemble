import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Sparkles } from "lucide-react";
import useStore from "../store/use-store";
import { getMarketAssetId, useMarketLicenses } from "../store/use-market-licenses";
import { getTargetById } from "../utils/target";

export function MarketWatermarkBadge({ container, transforming }: { container: HTMLDivElement | null; transforming: boolean }) {
  const activeIds = useStore(state => state.activeIds);
  const items = useStore(state => state.trackItemsMap);
  const playerRef = useStore(state => state.playerRef);
  const selectedId = activeIds.length === 1 ? activeIds[0] : null;
  const item = selectedId ? items[selectedId] : null;
  const assetId = item ? getMarketAssetId(item) : null;
  const asset = useMarketLicenses(state => assetId ? state.assets[assetId] : undefined);
  const openPurchase = useMarketLicenses(state => state.openPurchase);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const show = !!asset && !asset.licensed && asset.priceCredits > 0 && !!item && ['image', 'video'].includes(item.type) && !transforming;
  useEffect(() => {
    if (!container || !selectedId || !show) return;
    let frame = 0;
    const position = () => {
      const button = buttonRef.current;
      const target = getTargetById(selectedId);
      if (button) {
        const visible = target && target.getBoundingClientRect().width > 0 && !playerRef?.current?.isPlaying();
        button.style.visibility = visible ? "visible" : "hidden";
        if (visible) {
          const bounds = container.getBoundingClientRect();
          const rect = target.getBoundingClientRect();
          button.style.left = `${Math.max(8, Math.min(rect.right - bounds.left - button.offsetWidth - 8, bounds.width - button.offsetWidth - 8))}px`;
          button.style.top = `${Math.max(8, Math.min(rect.top - bounds.top + 8, bounds.height - button.offsetHeight - 8))}px`;
        }
      }
      frame = requestAnimationFrame(position);
    };
    position();
    return () => cancelAnimationFrame(frame);
  }, [container, selectedId, show, playerRef]);
  if (!container || !show || !assetId) return null;
  return createPortal(<button ref={buttonRef} type="button" data-market-purchase="" style={{ visibility: "hidden" }}
    className="absolute z-[210] inline-flex h-8 items-center gap-1.5 rounded-md border bg-card px-2.5 text-xs font-medium text-foreground shadow-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    onPointerDown={event => event.stopPropagation()} onMouseDown={event => event.stopPropagation()}
    onClick={event => { event.stopPropagation(); openPurchase(assetId); }}>
    <Sparkles className="size-3.5" />Remove watermarks
  </button>, container);
}
