import { dispatch } from "@designcombo/events";
import { ADD_AUDIO, ADD_IMAGE, ADD_VIDEO } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";
import type { IAudio, IImage, IVideo } from "@designcombo/types";
import type { MarketAssetContent } from "@/components/market-asset-browser";
import { getCurrentTime } from "@/features/editor/utils/time";
import { normalizeDimensionsToCanvas } from "@/features/editor/utils/dimensions";
import useStore from "@/features/editor/store/use-store";

// The add handlers supply the remaining media defaults.
type MediaAddPayload<T extends IImage | IVideo | IAudio> =
  Omit<Partial<T>, "details"> & { details?: Partial<T["details"]> };

export function addMarketAssetToTimeline(asset: MarketAssetContent) {
  if (asset.proxyStatus !== "ready" || !asset.details?.src) return;
  const time = getCurrentTime();
  const metadata = {
    ...asset.metadata,
    name: asset.name,
    ...(asset.type !== "audio" ? { previewUrl: asset.preview ?? "" } : {})
  };

  if (asset.type === "image") {
    const sourceDetails = asset.details;
    if (!sourceDetails?.src) return;
    let details: Partial<IImage["details"]> = { ...sourceDetails };

    if (details.width && details.height) {
      const { size } = useStore.getState();
      const normalized = normalizeDimensionsToCanvas(
        details.width,
        details.height,
        size.width,
        size.height
      );
      details = {
        ...details,
        width: normalized.width,
        height: normalized.height,
        left: `${(size.width - normalized.width) / 2}px`,
        top: `${(size.height - normalized.height) / 2}px`
      };
    }

    const payload: MediaAddPayload<IImage> = {
      ...asset,
      type: "image",
      id: generateId(),
      metadata,
      details,
      display: { from: time, to: time + 5000 }
    };
    dispatch(ADD_IMAGE, { payload, options: {} });
    return;
  }

  if (asset.type === "video") {
    if (!asset.details?.src) return;
    const { size } = useStore.getState();
    const details = {
      ...asset.details,
      ...(asset.details.width && asset.details.height
        ? {
            left: `${(size.width - asset.details.width) / 2}px`,
            top: `${(size.height - asset.details.height) / 2}px`
          }
        : {})
    };
    const durationMs = (asset.details.duration ?? 5) * 1000;
    const payload: MediaAddPayload<IVideo> = {
      ...asset,
      type: "video",
      id: generateId(),
      metadata: {
        ...metadata,
        previewUrl: asset.preview ?? ""
      },
      details,
      display: { from: time, to: time + durationMs }
    };
    dispatch(ADD_VIDEO, { payload, options: { resourceId: "main" } });
    return;
  }

  if (!asset.details?.src) return;
  const durationMs = (asset.details.duration ?? 5) * 1000;
  const payload: MediaAddPayload<IAudio> = {
    ...asset,
    type: "audio",
    id: generateId(),
    metadata,
    display: { from: time, to: time + durationMs }
  };
  dispatch(ADD_AUDIO, { payload, options: {} });
}
