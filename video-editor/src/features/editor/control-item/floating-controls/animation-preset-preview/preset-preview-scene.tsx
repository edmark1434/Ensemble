import React, {useEffect, useMemo, useRef, useState} from "react";
import { Player } from "@remotion/player";
import {AbsoluteFill, useCurrentFrame} from "remotion";
import { BoxAnim } from "@designcombo/animations";
import { TextAnimated } from "../../../player/animated/text-animated";
import { presets, PresetName } from "../../../player/animated/presets";
import { createPreviewTrackItem } from "./preset-preview-data";
import { isCustomTextAnimation } from "./preset-preview-dispatch";
import { getSlideAnimation } from "../../../utils/get-animations";
import {getTextColorStyle} from "@/features/editor/player/styles";

const HOLD_FRAMES = 20;
const PREVIEW_W = 140;
const PREVIEW_H = 140;

// Mirrors AnimationPicker's own applyAnimation shake special-case —
// raw preset has from:0/to:-0, real amplitude comes from item size.
const buildShakeComposition = (preset: any, itemW: number, itemH: number) => {
  const isHorizontal = preset.property.toLowerCase().includes("horizontal");
  const isIn = preset.property.toLowerCase().endsWith("in");
  const mov = (isHorizontal ? itemW : itemH) / 6;
  const base = { ...preset, from: isIn ? mov : -mov, to: isIn ? -mov : mov };
  const scaleStep = {
    property: "scale",
    from: isIn ? 2 : 1,
    to: isIn ? 1 : 2,
    durationInFrames: 30,
    ease: preset.ease
  };
  return [base, scaleStep];
};

const PresetPreviewScene: React.FC<{
  presetKey: PresetName;
  type: "in" | "out" | "loop";
}> = ({ presetKey, type }) => {
  const frame = useCurrentFrame();
  const preset = presets[presetKey];
  const fakeItem = useMemo(() => createPreviewTrackItem(PREVIEW_W, PREVIEW_H), []);
  const previewText = fakeItem.details.text;

  if (isCustomTextAnimation(presetKey)) {
    return (
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          fontSize: fakeItem.details.fontSize,
          color: fakeItem.details.color,
          fontFamily: fakeItem.details.fontFamily || undefined
        }}
      >
        <TextAnimated
          text={previewText}
          fps={30}
          details={fakeItem.details as any}
          textAnimationNameIn={type === "in" ? presetKey : ""}
          textAnimationNameOut={type === "out" ? presetKey : ""}
          textAnimationNameLoop={type === "loop" ? presetKey : ""}
          animationTextInFrames={type === "in" ? preset.durationInFrames : 0}
          animationTextOutFrames={type === "out" ? preset.durationInFrames : 0}
          animationTextLoopFrames={type === "loop" ? preset.durationInFrames : 0}
          durationInFrames={
            type === "loop" ? preset.durationInFrames : HOLD_FRAMES + preset.durationInFrames
          }
          animationFonts={(preset as any).details?.fonts ?? []}
          textColorStyle={getTextColorStyle(fakeItem.details.color)}
        />
      </AbsoluteFill>
    );
  }

  const isShake = presetKey.toLowerCase().includes("shake");
  const isSlide = presetKey.toLowerCase().includes("slide");

  let composition = [preset];
  if (isShake) {
    composition = buildShakeComposition(preset, PREVIEW_W, PREVIEW_H);
  } else if (isSlide) {
    const slideAnim = getSlideAnimation(presetKey, preset as any, fakeItem);
    if (slideAnim) composition = [slideAnim as any];
  }

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <BoxAnim
        animationIn={type === "in" ? composition : undefined}
        animationOut={type === "out" ? composition : undefined}
        durationInFrames={HOLD_FRAMES + preset.durationInFrames}
        frame={frame}
        style={{
          color: fakeItem.details.color,
          fontSize: fakeItem.details.fontSize,
          fontWeight: fakeItem.details.fontWeight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: PREVIEW_W,
          height: PREVIEW_H
        }}
      >
        {previewText}
      </BoxAnim>
    </AbsoluteFill>
  );
};

export const RemotionPresetPreview: React.FC<{
  presetKey: PresetName;
  type: "in" | "out" | "loop";
}> = ({ presetKey, type }) => {
  const preset = presets[presetKey];
  const durationInFrames =
    type === "loop" ? Math.max(preset.durationInFrames, 30) : HOLD_FRAMES + preset.durationInFrames;

  return (
    <Player
      component={PresetPreviewScene}
      inputProps={{ presetKey, type }}
      durationInFrames={durationInFrames}
      fps={30}
      compositionWidth={PREVIEW_W}
      compositionHeight={PREVIEW_H}
      loop
      autoPlay
      controls={false}
      style={{ width: "100%", height: "100%" }}
    />
  );
};

export const LazyPresetPreview: React.FC<{
  presetKey: PresetName;
  type: "in" | "out" | "loop";
}> = ({ presetKey, type }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.3
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex h-full w-full items-center justify-center">
      {visible ? (
        <RemotionPresetPreview presetKey={presetKey} type={type} />
      ) : (
        <span className="text-lg font-semibold text-white">Text</span>
      )}
    </div>
  );
};