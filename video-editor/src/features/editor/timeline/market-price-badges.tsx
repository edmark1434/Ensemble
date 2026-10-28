import { useEffect, useRef } from "react";
import { CreditIcon } from "@/components/credit-icon";
import useStore from "../store/use-store";
import { getMarketAssetId, useMarketLicenses } from "../store/use-market-licenses";

export function TimelineMarketPriceBadges({ readOnly }: { readOnly: boolean }) {
  const timeline = useStore(state => state.timeline);
  const items = useStore(state => state.trackItemsMap);
  const assets = useMarketLicenses(state => state.assets);
  const openPurchase = useMarketLicenses(state => state.openPurchase);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  useEffect(() => {
    if (!timeline) return;
    // Fabric coordinates include the scrolled viewport. Keep DOM controls in
    // that same space so they stay clickable and keyboard accessible.
    const place = () => {
      const transform = timeline.viewportTransform;
      const canvasWidth = timeline.getWidth();
      const canvasHeight = timeline.getHeight();
      const trackItems = new Map(timeline.getTrackItems().map(item => [(item as typeof item & { id: string }).id, item]));
      buttons.current.forEach((button, id) => {
        const item = trackItems.get(id);
        if (!item) { button.style.visibility = "hidden"; return; }
        const rect = item.getBoundingRect();
        const left = rect.left * transform[0] + transform[4];
        const right = left + rect.width * transform[0];
        const top = rect.top * transform[3] + transform[5];
        const visibleLeft = Math.max(0, left);
        const visibleRight = Math.min(canvasWidth, right);
        const width = button.offsetWidth;
        const visible = visibleRight - visibleLeft >= width + 16 && top >= 0 && top + button.offsetHeight + 4 <= canvasHeight;
        button.style.visibility = visible ? "visible" : "hidden";
        button.style.left = `${visibleRight - width - 8}px`;
        button.style.top = `${top + 4}px`;
      });
    };
    const unsubscribe = timeline.on("after:render", place);
    place();
    return () => { unsubscribe(); };
  }, [timeline, items, assets]);
  if (readOnly) return null;
  return <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
    {Object.values(items).map(item => {
      const assetId = getMarketAssetId(item);
      const asset = assetId ? assets[assetId] : null;
      if (!assetId || !asset || asset.licensed || asset.priceCredits === 0) return null;
      const price = asset.priceCredits;
      return <button key={item.id} type="button" ref={element => { if (element) buttons.current.set(item.id, element); else buttons.current.delete(item.id); }}
        data-market-purchase="" style={{ visibility: "hidden" }}
        className="pointer-events-auto absolute inline-flex h-6 items-center gap-1 rounded-md border border-yellow-500/30 bg-secondary px-1.5 text-xs font-medium text-yellow-600 shadow-sm dark:text-yellow-200 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Purchase a project license for ${asset.name}: ${price.toLocaleString()} credits`}
        onPointerDown={event => event.stopPropagation()} onMouseDown={event => event.stopPropagation()}
        onClick={event => { event.stopPropagation(); openPurchase(assetId); }}>
        <CreditIcon className="size-3.5" />{price > 0 ? price.toLocaleString() : "Free"}
      </button>;
    })}
  </div>;
}
