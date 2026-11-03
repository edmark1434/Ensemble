import { useState } from "react";
import { MediaPlaceholder } from "../../components/media-placeholder";
import { useMissingMedia } from "../../store/use-missing-media";
import useStore from "../../store/use-store";
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
  const [loaded, setLoaded] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
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
        volume={volume}
      />
    );
  }

  if (missing) return <MediaPlaceholder missing />;
  if (!src) return <MediaPlaceholder />;
  return (<>
    {failed !== src && <Html5Video
      trimBefore={trimBefore}
      trimAfter={trimAfter}
      playbackRate={playbackRate}
      src={src}
      volume={volume}
      onLoadedData={() => setLoaded(src)}
      onWaiting={() => setLoaded(null)}
      onPlaying={() => setLoaded(src)}
      onCanPlay={() => setLoaded(src)}
      onError={() => setFailed(src)}
      preload="auto"
      pauseWhenBuffering={false}
      style={{ width: "100%", height: "100%", objectFit: "contain" }}
    />}
    {(loaded !== src || failed === src) && <MediaPlaceholder failed={failed === src} />}
  </>);
};

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
        overflow: "hidden"
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
