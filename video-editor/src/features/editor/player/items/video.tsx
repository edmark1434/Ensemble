import { useEffect, useRef, useState } from "react";
import { MediaPlaceholder } from "../../components/media-placeholder";
import { useMissingMedia } from "../../store/use-missing-media";
import { isMissingMediaSource } from "../../utils/missing-media";
import useStore from "../../store/use-store";
import { getMarketAssetId, useMarketLicenses } from "../../store/use-market-licenses";
import { useMarketAssetSource } from "../../hooks/use-market-asset-source";
import { IVideo } from "@designcombo/types";
import { BaseSequence, SequenceItemOptions } from "../base-sequence";
import { BoxAnim, ContentAnim, MaskAnim } from "@designcombo/animations";
import { calculateContainerStyles, calculateMediaStyles } from "../styles";
import { getAnimations } from "../../utils/get-animations";
import { calculateFrames } from "../../utils/frames";
import { Html5Video, OffthreadVideo, useRemotionEnvironment } from "remotion";

// Real component, so the hook lives in its own fiber. Video() below is called
// as a plain function from renderVisibleItems, so it must not call hooks.
const VideoMedia = ({ item, fps }: { item: IVideo; fps: number }) => {
  // true in Lambda and server renders, false in the editor Player
  const { isRendering } = useRemotionEnvironment();

  const { details } = item;
  const src = useMarketAssetSource(item);
  const projectId = useStore(state => state.projectId);
  const missing = useMissingMedia(state => state.projectId === projectId && state.missing.has(item.details.src));
  const assetId = getMarketAssetId(item);
  const mediaAssetId = (item.metadata as { media_asset_id?: string } | undefined)?.media_asset_id;
  const licensed = useMarketLicenses(state => !!(assetId && state.projectId === projectId && state.assets[assetId]?.licensed));
  const fallbackSrc = licensed && assetId && mediaAssetId
    ? `/api/market-assets/${assetId}/source?${new URLSearchParams({ projectId, mediaAssetId })}`
    : undefined;
  const playbackRate = item.playbackRate || 1;
  const hasTrimTo = typeof item.trim?.to === "number" && item.trim.to > 0;
  const trimBefore = ((item.trim?.from ?? 0) / 1000) * fps;
  const trimAfter = hasTrimTo ? (item.trim!.to! / 1000) * fps : undefined;
  const volume = () => (details.volume ?? 100) / 100;

  if (isRendering) {
    return (
      <OffthreadVideo
        trimBefore={trimBefore}
        trimAfter={trimAfter}
        playbackRate={playbackRate}
        src={details.src}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        volume={volume}
      />
    );
  }

  if (missing || isMissingMediaSource(item.details.src)) return <MediaPlaceholder missing />;
  if (!src) return <MediaPlaceholder item={item} />;
  return (
    <PreviewVideo
      key={src}
      item={item}
      src={src}
      fallbackSrc={fallbackSrc && fallbackSrc !== src ? fallbackSrc : undefined}
      trimBefore={trimBefore}
      trimAfter={trimAfter}
    />
  );
};

const RETRY_DELAYS_MS = [350, 1000, 2500];

function PreviewVideo({ item, src, fallbackSrc, trimBefore, trimAfter }: {
  item: IVideo; src: string; fallbackSrc?: string; trimBefore: number; trimAfter?: number;
}) {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [useFallback, setUseFallback] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const retryDelay = RETRY_DELAYS_MS[attempt];
  const activeSrc = useFallback && fallbackSrc ? fallbackSrc : src;

  useEffect(() => {
    if (status !== "error" || retryDelay === undefined) return;
    const timer = window.setTimeout(() => {
      if (fallbackSrc && !useFallback) setUseFallback(true);
      setAttempt(current => current + 1);
      setStatus("loading");
    }, retryDelay);
    return () => window.clearTimeout(timer);
  }, [status, retryDelay, fallbackSrc, useFallback]);

  return (<>
    {status !== "error" && <Html5Video
      key={attempt}
      ref={video}
      trimBefore={trimBefore}
      trimAfter={trimAfter}
      playbackRate={item.playbackRate || 1}
      src={activeSrc}
      volume={(item.details.volume ?? 100) / 100}
      onLoadedData={() => setStatus("ready")}
      onWaiting={() => setStatus("loading")}
      onPlaying={() => setStatus("ready")}
      onCanPlay={() => setStatus("ready")}
      onError={() => {
        if (retryDelay === undefined) {
          const error = video.current?.error;
          console.warn("Canvas video exhausted its load retries", {
            itemId: item.id, code: error?.code, message: error?.message,
          });
        }
        setStatus("error");
      }}
      preload="auto"
      pauseWhenBuffering={false}
      style={{ visibility: status === "ready" ? "visible" : "hidden", width: "100%", height: "100%", objectFit: "cover", display: "block" }}
    />}
    {status !== "ready" && <MediaPlaceholder item={item} failed={status === "error" && retryDelay === undefined} />}
  </>);
}

export const Video = ({
  item,
  options
}: {
  item: IVideo;
  options: SequenceItemOptions;
}) => {
  const { fps, frame } = options;
  const { details, animations } = item;
  const { animationIn, animationOut, animationTimed } = getAnimations(
    animations!,
    item,
    frame,
    fps
  );
  const crop = details?.crop || {
    x: 0,
    y: 0,
    width: details.width,
    height: details.height
  };
  const { durationInFrames } = calculateFrames(item.display, fps);
  const currentFrame = (frame || 0) - (item.display.from * fps) / 1000;

  const children = (
    <BoxAnim
      style={calculateContainerStyles(details, crop, {
        overflow: "hidden",
        transform: "none",
        left: 0,
        top: 0
      })}
      animationIn={animationIn}
      animationOut={animationOut}
      frame={currentFrame}
      durationInFrames={durationInFrames}
    >
      <ContentAnim
        animationTimed={animationTimed}
        durationInFrames={durationInFrames}
        frame={currentFrame}
      >
        <MaskAnim
          item={item}
          keyframeAnimations={animationTimed}
          frame={frame || 0}
        >
          <div style={calculateMediaStyles(details, crop)}>
            <VideoMedia item={item} fps={fps} />
          </div>
        </MaskAnim>
      </ContentAnim>
    </BoxAnim>
  );

  return BaseSequence({ item, options, children });
};

export default Video;
