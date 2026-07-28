import { ITextDetails } from "@designcombo/types";
import React, { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import {getCharLayerStyles, getLineHeightPx, getWrappedTextLayout} from "../styles";
import AnimatedTextIn from "./text-animated-types/animations-in/text-animated-in";
import SunnyMorningsAnimationIn from "./text-animated-types/animations-in/sunny-mornings-in";
import DominoDreamsIn from "./text-animated-types/animations-in/domino-dreams-in";
import GetThinkersAnimationIn from "./text-animated-types/animations-in/great-thinkers-in";
import BeatifulQuestionAnimationIn from "./text-animated-types/animations-in/beatiful-question-in";
import MadeWithLoveAnimationIn from "./text-animated-types/animations-in/made-with-love-in";
import AnimatedTextOut from "./text-animated-types/animations-out/text-animated-out";
import SunnyMorningsAnimationOut from "./text-animated-types/animations-out/sunny-mornings-out";
import DominoDreamsAnimationOut from "./text-animated-types/animations-out/domino-dreams-out";
import BeatifulQuestionAnimationOut from "./text-animated-types/animations-out/beatiful-question-out";
import RealityIsBrokenAnimationIn from "./text-animated-types/animations-in/reality-is-broken-in";
import MadeWithLoveAnimationOut from "./text-animated-types/animations-out/made-with-love-out";
import RealityIsBrokenAnimationOut from "./text-animated-types/animations-out/reality-is-broken-out";
import GreatThinkersAnimationOut from "./text-animated-types/animations-out/great-thinkers-out";
import VogueLetterByLetter from "./text-animated-types/animations-loop/vogue";
import DragonflyText from "./text-animated-types/animations-loop/dragonfly";
import BillboardText from "./text-animated-types/animations-loop/billboard";
import DropAnimationIn from "./text-animated-types/animations-in/drop-in";
import DescompressAnimationIn from "./text-animated-types/animations-in/descompress-in";
import DescompressAnimationOut from "./text-animated-types/animations-out/descompress-out";
import DropAnimationOut from "./text-animated-types/animations-out/drop-out";
import Heartbeat from "./text-animated-types/animations-loop/heartbeat";
import Wave from "./text-animated-types/animations-loop/wave";
import ShakyLettersText from "./text-animated-types/animations-loop/shaky-letters-text";
import PulseText from "./text-animated-types/animations-loop/pulse";
import {AnimatedChar} from "@/features/editor/player/animated/text-animated-types/animated-char";
import TypeWriterIn from "@/features/editor/player/animated/text-animated-types/animations-in/type-writer-in";
import SoundWaveIn from "@/features/editor/player/animated/text-animated-types/animations-in/sound-wave-in";
import BackgroundIn from "./text-animated-types/animations-in/background-in";
import CountDownIn from "@/features/editor/player/animated/text-animated-types/animations-in/count-down-in";
import TypeWriterOut from "@/features/editor/player/animated/text-animated-types/animations-out/type-writer-out";
import BackgroundOut from "@/features/editor/player/animated/text-animated-types/animations-out/background-out";
import Spin from "@/features/editor/player/animated/text-animated-types/animations-loop/spin";
import Rotate3d from "@/features/editor/player/animated/text-animated-types/animations-loop/rotate-3d";
import FontChange from "@/features/editor/player/animated/text-animated-types/animations-loop/font-change";
import ShakeText from "@/features/editor/player/animated/text-animated-types/animations-loop/shake-text";
import Vintage from "@/features/editor/player/animated/text-animated-types/animations-loop/vintage";
import Glitch from "@/features/editor/player/animated/text-animated-types/animations-loop/glitch";

const animationsIn: { [key: string]: React.FC<any> } = {
  animatedTextIn: AnimatedTextIn,
  sunnyMorningsAnimationIn: SunnyMorningsAnimationIn,
  dominoDreamsIn: DominoDreamsIn,
  greatThinkersAnimationIn: GetThinkersAnimationIn,
  beautifulQuestionsAnimationIn: BeatifulQuestionAnimationIn,
  madeWithLoveAnimationIn: MadeWithLoveAnimationIn,
  realityIsBrokenAnimationIn: RealityIsBrokenAnimationIn,
  dropAnimationIn: DropAnimationIn,
  descompressAnimationIn: DescompressAnimationIn
};

const animationsOut: { [key: string]: React.FC<any> } = {
  animatedTextOut: AnimatedTextOut,
  sunnyMorningsAnimationOut: SunnyMorningsAnimationOut,
  dominoDreamsAnimationOut: DominoDreamsAnimationOut,
  beautifulQuestionsAnimationOut: BeatifulQuestionAnimationOut,
  madeWithLoveAnimationOut: MadeWithLoveAnimationOut,
  realityIsBrokenAnimationOut: RealityIsBrokenAnimationOut,
  greatThinkersAnimationOut: GreatThinkersAnimationOut,
  descompressAnimationOut: DescompressAnimationOut,
  dropAnimationOut: DropAnimationOut
};

const animationsLoop: { [key: string]: React.FC<any> } = {
  vogueAnimationLoop: VogueLetterByLetter,
  dragonFlyAnimationLoop: DragonflyText,
  billboardAnimationLoop: BillboardText,
  heartbeatAnimationLoop: Heartbeat,
  waveAnimationLoop: Wave,
  shakyLettersTextAnimationLoop: ShakyLettersText,
  pulseAnimationLoop: PulseText
};

const animationsFullIn: { [key: string]: React.FC<any> } = {
  typeWriterIn: TypeWriterIn,
  backgroundAnimationIn: BackgroundIn,
  soundWaveIn: SoundWaveIn,
  countDownAnimationIn: CountDownIn,
};

const animationsFullOut: { [key: string]: React.FC<any> } = {
  typeWriterOut: TypeWriterOut,
  backgroundAnimationOut: BackgroundOut,
};

const animationsFullLoop: { [key: string]: React.FC<any> } = {
  spinAnimationLoop: Spin,
  rotate3dAnimationLoop: Rotate3d,
  textFontChangeAnimationLoop: FontChange,
  shakeTextAnimationLoop: ShakeText,
  vintageAnimationLoop: Vintage,
  glitchAnimationLoop: Glitch,
};

export const TextAnimated: React.FC<{
  text: string;
  fps: number;
  textAnimationNameIn: string;
  textAnimationNameOut: string;
  textAnimationNameLoop: string;
  details: ITextDetails;
  animationTextInFrames: number;
  animationTextOutFrames: number;
  animationTextLoopFrames: number;
  durationInFrames: number;
  animationFonts: { fontFamily: string; url: string }[];
  textColorStyle: React.CSSProperties;
  id: string;
}> = ({
  text,
  fps,
  textAnimationNameIn,
  textAnimationNameOut,
  textAnimationNameLoop,
  details,
  animationTextInFrames,
  animationTextOutFrames,
  animationTextLoopFrames,
  durationInFrames,
  animationFonts,
  textColorStyle,
  id
}) => {
  const frame = useCurrentFrame();
  const animInFrom = animationTextInFrames;
  const animOut = durationInFrames - animationTextOutFrames;
  const validAnimIn = textAnimationNameIn ? animInFrom >= frame : false;
  const validAnimOut = textAnimationNameOut ? animOut < frame : false;

  if (!validAnimOut && !validAnimIn && !textAnimationNameLoop) {
    const isGradient = /^(linear|radial)-gradient\(/i.test((details.color || "").trim());
    if (isGradient) {
      return (
        <div
          data-text-anim-id={id}
          style={{
            position: "relative",
            width: details.width,
            height: details.height,
            display: "flex",
            alignItems: "center",
            justifyContent:
              details.textAlign === "left" ? "flex-start" : details.textAlign === "right" ? "flex-end" : "center"
          }}
        >
          <div
            style={{
              whiteSpace: "pre-line",
              width: "100%",
              height: "100%",
              position: "absolute",
              display: "flex",
              alignItems: "center",
              justifyContent:
                details.textAlign === "left" ? "flex-start" : details.textAlign === "right" ? "flex-end" : "center",
              color: "transparent",
              textDecoration: "none #000000",
              wordBreak: details.wordBreak || "normal",
            }}
          >
            {text}
          </div>
          <div
            style={{
              ...textColorStyle,
              whiteSpace: "pre-line",
              width: "100%",
              height: "100%",
              position: "absolute",
              display: "flex",
              alignItems: "center",
              justifyContent:
                details.textAlign === "left" ? "flex-start" : details.textAlign === "right" ? "flex-end" : "center",
              WebkitTextStroke: "0px transparent",
              textShadow: "none",
              textDecoration: details.textDecoration || "none",
              wordBreak: details.wordBreak || "normal",
            }}
          >
            {text}
          </div>
        </div>
      );
    }

    return (
      <div
        data-text-anim-id={id}
        style={{
          ...textColorStyle,
          whiteSpace: "pre-line",
          width: details.width,
          height: details.height ?? ((Number(details.lineHeight) ?? 1) * details.fontSize),
          display: "flex",
          alignItems: "center",
          justifyContent:
            details.textAlign === "left" ? "flex-start" : details.textAlign === "right" ? "flex-end" : "center",
          wordBreak: details.wordBreak || "normal",
        }}
      >
        {text}
      </div>
    );
  }

  const letterSpacingValue = parseFloat(details.letterSpacing as any) || 0;
  const { lines, charLeftOffsets, lineStarts } = getWrappedTextLayout(
    text,
    details.width,
    details.fontSize,
    details.fontFamily,
    details.fontWeight,
    details.textAlign,
    details.wordBreak,
    letterSpacingValue
  );

  const lineHeightPx = getLineHeightPx(details);
  const totalBlockHeight = lines.length * lineHeightPx;
  const verticalOffset = Math.max((details.height - totalBlockHeight) / 2, 0);

  const maxTextLengthInLine = lines.reduce((max, line) => Math.max(max, line.length), 0);

  const AnimationComponentIn = animationsIn[textAnimationNameIn];
  const AnimationComponentOut = animationsOut[textAnimationNameOut];
  const AnimationComponentLoop = animationsLoop[textAnimationNameLoop];

  let AnimationComponentFullIn = null;
  let AnimationComponentFullOut = null;
  let AnimationComponentFullLoop = null;

  if (validAnimIn && textAnimationNameIn) {
    AnimationComponentFullIn = animationsFullIn[textAnimationNameIn];
  }
  if (validAnimOut && textAnimationNameOut) {
    AnimationComponentFullOut = animationsFullOut[textAnimationNameOut];
  }
  if (!validAnimIn && !validAnimOut && textAnimationNameLoop) {
    AnimationComponentFullLoop = animationsFullLoop[textAnimationNameLoop];
  }

  const ActiveFullBlockComponent = AnimationComponentFullIn ?? AnimationComponentFullOut ?? AnimationComponentFullLoop;

  if (ActiveFullBlockComponent) {
    const getColorStyle = (left: number, top: number) =>
      getCharLayerStyles(
          details.color,
          { left, top },
          { width: details.width, height: details.height },
          details.textDecoration,
          details.fontSize
        );

    return (
      <div
        data-text-anim-id={id}
        style={{
          width: details.width,
            height: details.height,
            display: "flex",
            flexDirection: "column",
            alignItems:
            details.textAlign === "left" ? "flex-start" : details.textAlign === "right" ? "flex-end" : "center",
            justifyContent: "center"
        }}
      >
        <ActiveFullBlockComponent
          text={text}
          lines={lines}
          lineStarts={lineStarts}
          lineHeightPx={lineHeightPx}
          verticalOffset={verticalOffset}
          frame={frame}
          fps={fps}
          details={details}
          animationTextInFrames={animationTextInFrames}
          animationTextOutFrames={animationTextOutFrames}
          animationTextLoopFrames={animationTextLoopFrames}
          durationInFrames={durationInFrames}
          animationFonts={animationFonts}
          getColorStyle={getColorStyle}
        />
      </div>
    );
  }

  return (
    <div
      data-text-anim-id={id}
      style={{
        width: details.width,
        height: details.height,
        display: "flex",
        flexDirection: "column",
        alignItems:
          details.textAlign === "left" ? "flex-start" : details.textAlign === "right" ? "flex-end" : "center",
        justifyContent: "center"
      }}
    >
      {lines.map((line, rowIndex) => (
        <div key={rowIndex}>
          {line.split("").map((char, index) => {
            const colorStyle = getCharLayerStyles(
              details.color,
              { left: charLeftOffsets[rowIndex][index], top: verticalOffset + rowIndex * lineHeightPx },
              { width: details.width, height: details.height },
              details.textDecoration,
              details.fontSize
            );

            let charEl;
            if (validAnimIn && AnimationComponentIn) {
              charEl = (
                <AnimationComponentIn
                  char={char}
                  index={index}
                  frame={frame}
                  textLength={maxTextLengthInLine}
                  fps={fps}
                  animationTextInFrames={animationTextInFrames}
                  details={details}
                  colorStyle={colorStyle}
                />
              );
            } else if (validAnimOut && AnimationComponentOut) {
              charEl = (
                <AnimationComponentOut
                  char={char}
                  index={index}
                  frame={frame}
                  textLength={maxTextLengthInLine}
                  fps={fps}
                  animationTextOutFrames={animationTextOutFrames}
                  durationInFrames={durationInFrames}
                  details={details}
                  colorStyle={colorStyle}
                />
              );
            } else if (textAnimationNameLoop && !validAnimIn && !validAnimOut) {
              charEl = (
                <AnimationComponentLoop
                  char={char}
                  index={index}
                  frame={frame}
                  textLength={maxTextLengthInLine}
                  fps={fps}
                  animationTextInFrames={animationTextInFrames}
                  animationTextOutFrames={animationTextOutFrames}
                  durationInFrames={durationInFrames}
                  details={details}
                  colorStyle={colorStyle}
                />
              );
            } else {
              charEl = (
                <AnimatedChar
                  char={char}
                  animationStyle={{}}
                  isGradient={colorStyle.isGradient}
                  shadowStrokeStyle={colorStyle.shadowStrokeStyle}
                  fillStyle={colorStyle.fillStyle}
                />
              );
            }

            return (
              <span
                key={index}
                style={{
                  display: "inline-block",
                  marginRight: "-0.05ch"
                }}
              >
                {charEl}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};