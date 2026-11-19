import { useCallback, useState } from "react";
import { Gif } from "@remotion/gif";
import { getPreparedImageType } from "../../utils/prepared-image-cache";
import { MediaPlaceholder } from "../../components/media-placeholder";
import { useMissingMedia } from "../../store/use-missing-media";
import { isMissingMediaSource } from "../../utils/missing-media";
import useStore from "../../store/use-store";
import { useMarketAssetSource, useMarketImageFailed } from "../../hooks/use-market-asset-source";
import { IImage } from "@designcombo/types";
import { BaseSequence, SequenceItemOptions } from "../base-sequence";
import { BoxAnim, ContentAnim, MaskAnim } from "@designcombo/animations";
import { calculateContainerStyles, calculateMediaStyles } from "../styles";
import { getAnimations } from "../../utils/get-animations";
import { calculateFrames } from "../../utils/frames";
import { Img, useRemotionEnvironment } from "remotion";

function MarketImage({ item }: { item: IImage }) {
  const src = useMarketAssetSource(item);
  const preparationFailed = useMarketImageFailed(item);
  const { isRendering } = useRemotionEnvironment();
  const projectId = useStore(state => state.projectId);
  const missing = useMissingMedia(state => state.projectId === projectId && state.missing.has(item.details.src));
  const [loaded, setLoaded] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const source = isRendering ? item.details.src : src;
  const onLoad = useCallback(() => setLoaded(source), [source]);
  const onError = useCallback(() => setFailed(source), [source]);

  if (!isRendering && (missing || isMissingMediaSource(item.details.src))) {
    return <MediaPlaceholder missing />;
  }
  if (!source || (!isRendering && failed === source)) {
    return <MediaPlaceholder item={item} failed={preparationFailed || (!!source && failed === source)} />;
  }

  const mimeType = getPreparedImageType(source);
  const isGif = mimeType?.startsWith("image/")
    ? mimeType === "image/gif"
    : [source, item.details.src].some(value => /^(?:data:image\/gif[;,]|[^?#]*\.gif(?:[?#]|$))/i.test(value));
  const events = isRendering ? {} : { onLoad, onError };
  return <>
    {isGif ? (
      <Gif key={source} data-id={item.id} src={source}
        width={item.details.width} height={item.details.height} fit="cover"
        playbackRate={item.playbackRate} style={{ position: "absolute", inset: 0, display: "block" }}
        {...events} />
    ) : (
      <Img key={source} data-id={item.id} src={source}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        {...events} />
    )}
    {!isRendering && loaded !== source && <MediaPlaceholder item={item} failed={preparationFailed} />}
  </>;
}

export default function Image({
  item,
  options
}: {
  item: IImage;
  options: SequenceItemOptions;
}) {
  return BaseSequence({ item, options, children: options.visualsActive === false ? null : <ImageContent item={item} options={options} /> });
}

function ImageContent({
  item,
  options
}: {
  item: IImage;
  options: SequenceItemOptions;
}) {
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
        transform: "scale(1)"
      })}
      animationIn={animationIn!}
      animationOut={animationOut!}
      frame={currentFrame}
      durationInFrames={durationInFrames}
    >
      <ContentAnim
        animationTimed={animationTimed!}
        durationInFrames={durationInFrames}
        frame={currentFrame}
      >
        <MaskAnim
          item={item}
          keyframeAnimations={animationTimed!}
          frame={frame || 0}
        >
          <div
            id={`${item.id}-reveal-mask`}
            style={calculateMediaStyles(details, crop)}
          >
            <MarketImage item={item} />
          </div>
        </MaskAnim>
      </ContentAnim>
    </BoxAnim>
  );

  return children;
}
