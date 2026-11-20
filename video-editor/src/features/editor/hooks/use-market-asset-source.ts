import { useMissingMedia } from "../store/use-missing-media";
import { isMissingMediaSource, isPendingMediaSource } from "../utils/missing-media";
import { useContext, useEffect } from "react";
import type { ITrackItem } from "@designcombo/types";
import { getMarketAssetId, useMarketLicenses } from "../store/use-market-licenses";
import useStore from "../store/use-store";
import { marketPlaybackSource, readyMarketPlaybackSource } from "../utils/market-playback-source";
import { useRemotionEnvironment } from "remotion";
import { PreparedMarketImages, PrepareMarketImage, FailedMarketImages } from "../components/prepared-market-images";
import { useLocalMediaCache } from "../utils/local-media-cache";

export function useMarketImageFailed(item: ITrackItem): boolean {
  const failed = useContext(FailedMarketImages);
  const projectId = useStore(state => state.projectId);
  const assetId = getMarketAssetId(item);
  const status = useMarketLicenses(state => assetId && state.projectId === projectId ? state.assets[assetId] : undefined);
  return !!(assetId && status && failed[marketPlaybackSource(item, projectId, status)]);
}

// Resolve at playback time so expiring signed URLs never enter project history.
export function useMarketAssetSource(item: ITrackItem): string | null {
  const { isRendering } = useRemotionEnvironment();
  const projectId = useStore(state => state.projectId);
  const missing = useMissingMedia(state => state.projectId === projectId && state.missing.has(item.details.src));
  const localUrl = useLocalMediaCache(state => state.entries[item.details.src]?.url ?? null);
  const assetId = getMarketAssetId(item);
  const status = useMarketLicenses(state => assetId && state.projectId === projectId ? state.assets[assetId] : undefined);
  const preparedImages = useContext(PreparedMarketImages);
  const prepareImage = useContext(PrepareMarketImage);
  const source = assetId && status ? marketPlaybackSource(item, projectId, status) : null;
  useEffect(() => {
    if (!isRendering && source && String(item.type) === "image") prepareImage?.(source);
  }, [isRendering, source, item.type, prepareImage]);
  // The batch loader covers the timeline and nested scenes. Media components
  // consume its result instead of issuing duplicate license requests on mount.
  if (isPendingMediaSource(item.details.src) && !localUrl) return null;
  if (isRendering) return item.details.src;
  if (missing || isMissingMediaSource(item.details.src)) return null;
  if (localUrl) return localUrl;
  return readyMarketPlaybackSource(item, projectId, status, preparedImages);
}
