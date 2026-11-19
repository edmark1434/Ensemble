import { Loader2 } from "lucide-react";
import { createContext, useContext, useLayoutEffect, useRef, useState } from "react";
import { useCurrentScale } from "remotion";
import { useQuery } from "@tanstack/react-query";
import type { IImage, IVideo } from "@designcombo/types";
import { useObjectUrl, useVideoPoster } from "../hooks/use-media-poster";
import useUploadStore from "../store/use-upload-store";

type VisualMedia = IImage | IVideo;

function LoadingThumbnail({ item }: { item: VisualMedia }) {
  const metadata = item.metadata;
  const assetId = metadata?.market_asset_id;
  const mediaId = metadata?.media_asset_id;
  const market = !!(metadata?.market || assetId);
  const [failedUrls, setFailedUrls] = useState<ReadonlySet<string>>(() => new Set());
  const candidates = [metadata?.previewUrl, item.preview];
  const thumbnail = candidates.find((url): url is string => typeof url === "string" && !!url && !failedUrls.has(url) &&
    (!market || /\/assets\/thumbnails\//.test(url)));
  const { data: resolvedThumbnail } = useQuery({
    queryKey: ["market-thumbnail", assetId, mediaId, item.type],
    enabled: !thumbnail && !!assetId && !!mediaId,
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ mediaAssetId: String(mediaId), type: item.type });
      const response = await fetch(`/api/market-assets/${encodeURIComponent(String(assetId))}/thumbnail?${params}`, { signal });
      if (!response.ok) return null;
      const { url } = await response.json();
      return typeof url === "string" ? url : null;
    },
  });

  const pendingId = item.details.src.startsWith("pending-upload:") ? item.details.src.slice("pending-upload:".length) : null;
  const file = useUploadStore(state => pendingId
    ? (state.activeUploads.find(upload => upload.id === pendingId) ?? state.pendingUploads.find(upload => upload.id === pendingId))?.file
    : undefined);
  const localUrl = useObjectUrl(file);
  const src = thumbnail || resolvedThumbnail || localUrl;
  const videoPreview = item.type === "video" && (src === localUrl || /\.mp4(?:[?#]|$)/i.test(src || ""));
  const poster = useVideoPoster(videoPreview ? src : undefined);
  const image = videoPreview ? poster : src;
  if (!image || failedUrls.has(image)) return null;
  return <img src={image} alt="" draggable={false} onError={() => setFailedUrls(previous => new Set(previous).add(image))}
    className="absolute inset-0 size-full object-cover opacity-50" />;
}

export const CanvasPreviewZoomContext = createContext(1);

const SCENE_PATTERN = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"><path d="M-3 15L15 -3" stroke="white" stroke-opacity=".08" stroke-width="2"/></svg>')}")`;
export function MediaPlaceholder({
  missing = false,
  failed = false,
  item,
}: { missing?: boolean; failed?: boolean; item?: VisualMedia }) {
  const loading = !missing && !failed;
  const ref = useRef<HTMLOutputElement>(null);
  const [scale, setScale] = useState(1);
  const previewZoom = useContext(CanvasPreviewZoomContext);
  const playerScale = useCurrentScale({ dontThrowIfOutsideOfRemotion: true });
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      if (element.clientWidth > 0) setScale(Math.max(0.05, element.getBoundingClientRect().width / element.clientWidth));
    };
    // CSS transforms do not trigger ResizeObserver on the media element.
    // Watch its ancestors too, including nested scenes and the preview wrapper.
    const observer = new ResizeObserver(update);
    const transforms = new MutationObserver(update);
    for (let ancestor: HTMLElement | null = element; ancestor; ancestor = ancestor.parentElement) {
      observer.observe(ancestor);
      transforms.observe(ancestor, { attributes: true, attributeFilter: ["style", "class"] });
    }
    window.addEventListener("resize", update);
    document.addEventListener("fullscreenchange", update);
    update();
    return () => {
      observer.disconnect();
      transforms.disconnect();
      window.removeEventListener("resize", update);
      document.removeEventListener("fullscreenchange", update);
    };
  }, [previewZoom, playerScale]);
  return (
    <output
      ref={ref}
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: loading ? "transparent" : "#27272a",
        backgroundImage: loading ? "none" : SCENE_PATTERN,
        backgroundSize: `${12 / scale}px ${12 / scale}px`,
        boxShadow: loading ? "none" : "inset 0 0 0 99999px rgba(0,0,0,0.25)",
        color: loading ? "white" : "#d4d4d8",
        fontFamily: "var(--font-plus-jakarta-sans), sans-serif",
        fontSize: 14 / scale,
        fontWeight: 500,
        pointerEvents: "none",
      }}
    >
      {loading && item && <LoadingThumbnail item={item} />}
      <span className="relative inline-flex items-center" style={{
        gap: 8 / scale,
        filter: loading ? `drop-shadow(0 0 ${2 / scale}px black)` : undefined,
      }}>
        {loading && <Loader2 className="shrink-0 animate-spin" size={16 / scale} />}
        {missing ? "Missing media" : failed ? "Unable to load media" : "Loading media…"}
      </span>
    </output>
  );
}
