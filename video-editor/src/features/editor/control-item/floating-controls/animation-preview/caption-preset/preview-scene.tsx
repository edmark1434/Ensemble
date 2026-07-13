// animation-preview/caption-preset/preview-scene
//
// Live preview for STYLE_CAPTION_PRESETS — the "Presets" (style) picker, a
// sibling to caption/preview-scene which previews entrance *animations*
// instead. These are separate systems: a style preset's own `animation` field
// ("letterKaraoke", "captionAnimationKeyword6", etc.) drives per-character/
// keyword animation that has no standalone renderer here, so this preview
// only shows the static appeared/active/keyword styling — colors, font,
// border, box shadow — same as what "None" would look like animation-wise.
//
// preservedColorKeyWord's exact interaction with isKeywordColor isn't modeled
// here (the real logic wasn't in what I had to go on) — this just swaps to
// isKeywordColor on the last word whenever it isn't "transparent".

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Player } from "@remotion/player";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ICaptionsControlProps, getTextShadow } from "../../caption-preset-picker";
import {
  createCaptionStylePreviewItem,
  PREVIEW_CAPTION_WORDS,
  PREVIEW_KEYWORD_INDEX
} from "./preview-data";
import { loadFonts } from "../../../../utils/fonts";

const HOLD_FRAMES = 40;
const PREVIEW_W = 140;
const PREVIEW_H = 140;
const FPS = 30;
const LOOP_FRAMES =
  HOLD_FRAMES + Math.round((PREVIEW_CAPTION_WORDS.at(-1)!.end / 1000) * FPS);

const PreviewPresetWord: React.FC<{
  word: { word: string; start: number; end: number };
  isKeyword: boolean;
  details: any;
  frame: number;
  forceActive?: boolean;
}> = ({ word, isKeyword, details, frame, forceActive = false }) => {
  const startAtFrame = (word.start / 1000) * FPS;
  const endAtFrame = (word.end / 1000) * FPS;
  const isActive = forceActive || (frame > startAtFrame && frame < endAtFrame);
  const isAppeared = forceActive || frame > startAtFrame;

  const usesKeywordColor = isKeyword && details.isKeywordColor !== "transparent";
  const color = usesKeywordColor
    ? details.isKeywordColor
    : isActive
      ? details.activeColor
      : isAppeared
        ? details.appearedColor
        : details.color;

  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        padding: "0 0.2em",
        color,
        WebkitTextStroke: details.borderWidth
          ? `${Math.min(2, details.borderWidth / 6)}px ${details.borderColor}`
          : undefined,
        textTransform: details.textTransform
      }}
    >
      {isActive && !usesKeywordColor && (
        <span
          style={{
            position: "absolute",
            inset: "-2px -0.2em",
            zIndex: -1,
            borderRadius: 8,
            backgroundColor: details.activeFillColor
          }}
        />
      )}
      {word.word}
    </span>
  );
};

const CaptionStylePresetPreviewScene: React.FC<{
  preset: ICaptionsControlProps;
}> = ({ preset }) => {
  const frame = useCurrentFrame();
  const previewItem = useMemo(
    () => createCaptionStylePreviewItem(preset, PREVIEW_W, PREVIEW_H),
    [preset]
  );
  const details = previewItem.details as any;

  const frameMs = (frame / FPS) * 1000;
  const activeWordIndex = PREVIEW_CAPTION_WORDS.findIndex(
    (w) => frameMs >= w.start && frameMs < w.end
  );
  const wordsToRender =
    preset.type === "word"
      ? activeWordIndex === -1
        ? []
        : [{ word: PREVIEW_CAPTION_WORDS[activeWordIndex], originalIndex: activeWordIndex }]
      : PREVIEW_CAPTION_WORDS.map((word, originalIndex) => ({ word, originalIndex }));

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        backgroundColor:
          details.backgroundColor !== "transparent" ? details.backgroundColor : undefined
      }}
    >
      <div
        style={{
          fontSize: details.fontSize,
          fontWeight: details.fontWeight,
          textAlign: details.textAlign,
          textShadow: getTextShadow(details.boxShadow),
          padding: "8px",
          borderRadius: "16px",
          maxWidth: PREVIEW_W - 16
        }}
      >
        {wordsToRender.map(({ word, originalIndex }) => (
          <PreviewPresetWord
            key={originalIndex}
            word={word}
            isKeyword={originalIndex === PREVIEW_KEYWORD_INDEX}
            details={details}
            frame={frame}
            forceActive={preset.type === "word"}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const RemotionCaptionStylePresetPreview: React.FC<{
  preset: ICaptionsControlProps;
}> = ({ preset }) => (
  <Player
    component={CaptionStylePresetPreviewScene}
    inputProps={{ preset }}
    durationInFrames={LOOP_FRAMES}
    fps={FPS}
    compositionWidth={PREVIEW_W}
    compositionHeight={PREVIEW_H}
    loop
    autoPlay
    controls={false}
    style={{ width: "100%", height: "100%" }}
  />
);

export const LazyCaptionStylePresetPreview: React.FC<{
  preset: ICaptionsControlProps;
}> = ({ preset }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.3 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex h-full w-full items-center justify-center">
      {visible ? (
        <RemotionCaptionStylePresetPreview preset={preset} />
      ) : (
        <div className="w-full h-full"></div>
      )}
    </div>
  );
};