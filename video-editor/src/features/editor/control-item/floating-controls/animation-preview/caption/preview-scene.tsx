// animation-preview/caption/preview-scene

import React, { useEffect, useRef, useState } from "react";
import { Player } from "@remotion/player";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { BoxAnim, ContentAnim } from "@designcombo/animations";
import { presets, PresetName } from "../../../../player/animated/presets";
import { getSlideAnimation } from "../../../../utils/get-animations";
import { createCaptionPreviewItem, PREVIEW_CAPTION_WORDS } from "./preview-data";

const HOLD_FRAMES = 40;
const PREVIEW_W = 140;
const PREVIEW_H = 140;
const FPS = 30;

// Real captions always trim to 4 frames in applyAnimation (animation-caption.tsx),
// regardless of preset — so the preview's loop length has to be a fixed constant
// too, not preset.durationInFrames. Using the raw preset duration was the desync
// bug: every card looped on a different cycle length and drifted out of phase.
const CAPTION_ANIM_FRAMES = 4;
const CAPTION_LOOP_FRAMES = HOLD_FRAMES + CAPTION_ANIM_FRAMES;

// Same active/appeared/fill-pill logic as CaptionWord, but frame comes from this
// preview Player's own useCurrentFrame() instead of the live app's playerRef.
const PreviewCaptionWord: React.FC<{
  word: { word: string; start: number; end: number };
  details: ReturnType<typeof createCaptionPreviewItem>["details"];
  frame: number;
}> = ({ word, details, frame }) => {
  const startAtFrame = (word.start / 1000) * FPS;
  const endAtFrame = (word.end / 1000) * FPS;
  const isActive = frame > startAtFrame && frame < endAtFrame;
  const isAppeared = frame > startAtFrame;

  const color = isActive
    ? (details as any).activeColor
    : isAppeared
      ? (details as any).appearedColor
      : (details as any).color;

  return (
    <span style={{ position: "relative", display: "inline-block", padding: "0 0.2em", color }}>
      {isActive && (
        <span
          style={{
            position: "absolute",
            inset: "-2px -0.2em",
            zIndex: -1,
            borderRadius: 8,
            backgroundColor: (details as any).activeFillColor
          }}
        />
      )}
      {word.word}
    </span>
  );
};

const CaptionPresetPreviewScene: React.FC<{ presetKey: PresetName; type: "in" | "out" | "loop" }> = ({
  presetKey,
  type
}) => {
  const frame = useCurrentFrame();
  const preset = presets[presetKey];
  const previewItem = React.useMemo(() => createCaptionPreviewItem(PREVIEW_W, PREVIEW_H), []);

  // Mirrors applyAnimation's trim-to-3-frames for every preset type. Slide is the
  // one exception: its raw from/to only make sense resolved against a real item's
  // width/height, same reason text's preview resolves it via getSlideAnimation
  // before feeding BoxAnim. Same "as any" cast text's preview uses — getSlideAnimation's
  // return type doesn't line up with Animation's ease signature.
  const isSlide = presetKey.toLowerCase().includes("slide");
  const baseAnim = isSlide
    ? getSlideAnimation(presetKey, preset as any, previewItem as any) ?? preset
    : preset;
  const composition = [{ ...baseAnim, durationInFrames: CAPTION_ANIM_FRAMES }] as any;

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <BoxAnim
        animationIn={type === "in" ? composition : undefined}
        animationOut={type === "out" ? composition : undefined}
        durationInFrames={CAPTION_LOOP_FRAMES}
        frame={frame}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", maxWidth: PREVIEW_W - 16 }}
      >
        <ContentAnim durationInFrames={CAPTION_LOOP_FRAMES} frame={frame}>
          <div
            style={{
              fontSize: (previewItem.details as any).fontSize,
              fontWeight: (previewItem.details as any).fontWeight,
              textAlign: "center",
              padding: "8px",
              borderRadius: "16px"
            }}
          >
            {PREVIEW_CAPTION_WORDS.map((word, i) => (
              <PreviewCaptionWord key={i} word={word} details={previewItem.details} frame={frame} />
            ))}
          </div>
        </ContentAnim>
      </BoxAnim>
    </AbsoluteFill>
  );
};

export const RemotionCaptionPresetPreview: React.FC<{ presetKey: PresetName; type: "in" | "out" | "loop" }> = ({
  presetKey,
  type
}) => {
  return (
    <Player
      component={CaptionPresetPreviewScene}
      inputProps={{ presetKey, type }}
      durationInFrames={CAPTION_LOOP_FRAMES}
      fps={FPS}
      compositionWidth={PREVIEW_W}
      compositionHeight={PREVIEW_H}
      loop
      autoPlay
      controls={false}
      style={{ width: "100%", height: "100%" }}
    />
  );
};

export const LazyCaptionPresetPreview: React.FC<{ presetKey: PresetName; type: "in" | "out" | "loop" }> = ({
  presetKey,
  type
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.3 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex h-full w-full items-center justify-center">
      {visible ? (
        <RemotionCaptionPresetPreview presetKey={presetKey} type={type} />
      ) : (
        <span className="text-[10px] font-medium text-white text-center px-1">This is a caption</span>
      )}
    </div>
  );
};