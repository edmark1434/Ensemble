// features/editor/player/items/ensemble-scene.tsx

import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { BoxAnim, ContentAnim } from "@designcombo/animations";
import {
  ISceneDetails,
  ISceneTrackItem,
  SceneRenderContent,
  makeSceneTrackItem
} from "../../types/ensemble-scene";
import { BaseSequence, SequenceItemOptions } from "../base-sequence";
import { getBackgroundFillStyle } from "../styles";
import { renderVisibleItems } from "../render-visible-items";
import { getAnimations } from "../../utils/get-animations";
import { calculateFrames } from "../../utils/frames";

// opacity is deliberately absent: it's an ICommonDetails field, so the
// shared container-style path in BaseSequence already applies it. Doing
// it here too would square it. borderRadius/blur/brightness have no such
// path for a scene (no media element to filter), so they land here.
const getSceneAppearanceStyle = (details: ISceneDetails): React.CSSProperties => {
  const filters: string[] = [];
  if (details.blur) filters.push(`blur(${details.blur}px)`);
  if (details.brightness !== undefined && details.brightness !== 100) {
    filters.push(`brightness(${details.brightness}%)`);
  }

  return {
    borderRadius: details.borderRadius ? `${details.borderRadius}px` : undefined,
    filter: filters.length ? filters.join(" ") : undefined
  };
};

export const Scene = ({ item, options }: { item: ISceneTrackItem; options: SequenceItemOptions }) => {
  const { details, animations } = item;
  const { fps, frame } = options;
  const content = details.content;

  // Same handoff every other item type does — ISceneTrackItem isn't
  // assignable to ITrackItem by design, so cross over once and reuse.
  const trackItem = makeSceneTrackItem(item);

  const { animationIn, animationOut, animationTimed } = getAnimations(
    animations!,
    trackItem,
    frame,
    fps
  );
  const { durationInFrames } = calculateFrames(item.display, fps);
  // Item-local frame, matching image/video/text: options.frame is the
  // composition frame, display.from is where this item starts.
  const currentFrame = (frame || 0) - (item.display.from * fps) / 1000;

  const children = (
    <>
      {/*
        Fills 100% of the outer AbsoluteFill (BaseSequence already applied
        this item's position/size/transform/opacity there) — must NOT
        recompute those from `details` again here, or the box gets scaled
        and positioned twice. That's also why BoxAnim below gets a plain
        fill-the-parent style instead of calculateContainerStyles(), which
        is what image/video hand it.
      */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
          ...getSceneAppearanceStyle(details)
        }}
      >
        <BoxAnim
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
          animationIn={animationIn!}
          animationOut={animationOut!}
          frame={currentFrame}
          durationInFrames={durationInFrames}
        >
          <ContentAnim
            animationTimed={animationTimed!}
            durationInFrames={durationInFrames}
            frame={currentFrame}
            style={{ width: "100%", height: "100%" }}
          >
            {content && !details.hidden && (
              <SceneContentLayer
                content={content}
                fps={fps}
                muted={details.volume === 0}
                outerWidth={details.width}
                outerHeight={details.height}
              />
            )}
          </ContentAnim>
        </BoxAnim>
      </div>
      {/*
        Hit target for selection. Sits OUTSIDE the animated wrapper on
        purpose — an in-animation that starts the content offscreen or at
        zero opacity shouldn't make the scene unselectable.
      */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "auto" }} />
    </>
  );

  return BaseSequence({ item: trackItem, options, children });
};

const SceneContentLayer = ({
  content,
  fps,
  muted,
  outerWidth,
  outerHeight
}: {
  content: SceneRenderContent;
  fps: number;
  muted: boolean;
  outerWidth?: number;
  outerHeight?: number;
}) => {
  const frame = useCurrentFrame();

  const nativeWidth = content.size?.width || outerWidth || 1;
  const nativeHeight = content.size?.height || outerHeight || nativeWidth;

  // Independent per axis now — a single uniform scale (old: derived from
  // width alone) only stays correct as long as the frozen base's aspect
  // ratio happens to match the current native content's aspect ratio.
  // The outer transform (details.transform) composes with this
  // multiplicatively regardless of axis, so scaling each axis to its own
  // frozen-base dimension here is what makes the two stages cancel out
  // to exactly the apparent box size, on both axes, for any native size.
  const scaleX = outerWidth ? outerWidth / nativeWidth : 1;
  const scaleY = outerHeight ? outerHeight / nativeHeight : scaleX;

  const trackItemsMap = muted
    ? Object.fromEntries(
      Object.entries(content.trackItemsMap).map(([id, it]) => [id, { ...it, details: { ...it.details, volume: 0 } }]),
    )
    : content.trackItemsMap;

  return (
    <div
      style={{
        width: nativeWidth,
        height: nativeHeight,
        transform: `scale(${scaleX}, ${scaleY})`,
        transformOrigin: "top left",
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none"
      }}
    >
      {content.background && <AbsoluteFill style={getBackgroundFillStyle(content.background.value)} />}
      {renderVisibleItems({
        trackItemIds: content.trackItemIds,
        trackItemsMap,
        transitionsMap: content.transitionsMap,
        fps,
        size: content.size!,
        frame,
        nested: true,
      })}
    </div>
  );
};

export default Scene;