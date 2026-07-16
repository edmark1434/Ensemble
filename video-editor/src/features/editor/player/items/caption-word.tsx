import React, { useEffect, useRef, useState } from "react";
import styled from "@emotion/styled";
import { css, keyframes } from "@emotion/react";
import { useCurrentPlayerFrame } from "../../hooks/use-current-frame";
import useStore from "../../store/use-store";
import { ANIMATION_CAPTION_LIST } from "./caption-animations";
import { isGradientColor } from "../styles";
import {
  createAnimationFunctions,
  ANIMATION_CONFIGS,
  ANIMATION_FUNCTIONS,
  WordAnimationState
} from "./caption-word-animations";

const scalePulse = keyframes`
    0% { transform: scale(1); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
`;

interface WordSpanProps {
  isActive: boolean;
  activeFillColor: string;
  wordColor: string;
  scale: number;
  animation: string;
  isAppeared: boolean;
  scaleFactor: number;
  animationNoneCaption: boolean;
  showObject: string;
  isShapeLayer: boolean;
  isGradientColor: boolean;
  pillRadiusPx: number;
  isActiveFillGradient: boolean;
  textDecoration: string;
}

const WordSpan = styled.span<WordSpanProps>`
    position: relative;
    display: inline-block;
    scale: ${(props) => props.scale};
    border-radius: ${(props) => props.pillRadiusPx}px;
    z-index: 99;
    transition: opacity 0.2s ease;
    text-decoration: ${(props) => props.textDecoration};

    color: ${(props) =>
            props.isShapeLayer || props.isGradientColor ? "transparent" : props.wordColor};

    ${(props) =>
            !props.isShapeLayer &&
            props.isGradientColor &&
            css`
                background-image: ${props.wordColor};
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
            `}

    ${(props) => {
        if (
                !props.isShapeLayer &&
                props.isActive &&
                props.animation.includes("underline-effect")
        ) {
            return `
        text-decoration: underline;
        text-decoration-color: #9238ef;
        text-decoration-thickness: 0.2em;
      `;
        }

        if (!props.isActive && props.animationNoneCaption) {
            return `display: none;`;
        }

        if (
                !props.isAppeared &&
                (ANIMATION_CAPTION_LIST.includes(props.animation) ||
                        props.showObject === "word")
        ) {
            return `display: none;`;
        }

        if (!props.isActive && props.animation === "customAnimation1") {
            return `display: none;`;
        }

        return "";
    }}

    &::before {
        content: "";
        position: absolute;
        z-index: -1;
        left: -0.2em;
        right: -0.2em;
        top: 0;
        bottom: 0;
        transition: background-color 0.2s ease;
        border-radius: ${(props) => props.pillRadiusPx}px;
    }

    ${(props) =>
            props.isShapeLayer &&
            props.isActive &&
            css`
                &::before {
                    ${props.isActiveFillGradient
                            ? css`background-image: ${props.activeFillColor};`
                            : css`background-color: ${props.activeFillColor};`}

                    ${props.animation === "captionAnimation10" ||
                    props.animation === "captionAnimationKeyword42" ||
                    props.animation === "captionAnimationKeyword57" ||
                    (props.animation === "captionAnimationKeyword48" &&
                            css`
                                animation: ${scalePulse} 0.4s ease-in-out;
                                transform-origin: center;
                            `)}
                }
            `}
`;

interface CaptionWordProps {
  word: any;
  offsetFrom: number;
  activeColor: string;
  activeFillColor: string;
  appearedColor: string;
  color: string;
  animation: string;
  globalOpacity?: number;
  isKeywordColor: string;
  preservedColorKeyWord: boolean;
  scaleFactor: number;
  animationNoneCaption: boolean;
  showObject: string;
  lineIndex?: number;
  currentLine?: number;
  isShapeLayer: boolean;
  activeFillBorderRadius: number;
  textDecoration?: string;
}

export const CaptionWord: React.FC<CaptionWordProps> = ({
                                                          word,
                                                          offsetFrom,
                                                          activeColor,
                                                          activeFillColor,
                                                          appearedColor,
                                                          color,
                                                          animation,
                                                          globalOpacity,
                                                          isKeywordColor,
                                                          preservedColorKeyWord,
                                                          scaleFactor,
                                                          animationNoneCaption,
                                                          showObject,
                                                          lineIndex,
                                                          currentLine,
                                                          isShapeLayer,
                                                          activeFillBorderRadius,
                                                          textDecoration
                                                        }) => {
  const fps = 30;
  const { playerRef } = useStore();
  const currentFrame = useCurrentPlayerFrame(playerRef!);
  const { start, end } = word;
  const startAtFrame = ((start + offsetFrom) / 1000) * fps;
  const endAtFrame = ((end + offsetFrom) / 1000) * fps;
  const isActive = currentFrame > startAtFrame && currentFrame < endAtFrame;
  const isAppeared = currentFrame > startAtFrame;

  // Measure the pill's own rendered size so the radius formula matches the
  // background box: min(width, height) * pct / 100. This is what keeps the
  // rounding "square" (equal x/y radius) instead of CSS's elliptical %.
  const spanRef = useRef<HTMLSpanElement>(null);
  const [pillSize, setPillSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;

    const update = () => {
      setPillSize({ width: el.offsetWidth, height: el.offsetHeight });
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const pillRadiusPx =
    Math.min(pillSize.width, pillSize.height) * ((activeFillBorderRadius || 0) / 100);

  if (
    showObject === "line" &&
    lineIndex !== undefined &&
    currentLine !== undefined
  ) {
    if (lineIndex > currentLine) {
      return null;
    }
  }

  const getWordColor = () => {
    let baseColor = isActive ? activeColor : isAppeared ? appearedColor : color;

    if (word.is_keyword && isKeywordColor !== "transparent") {
      if (isActive || (preservedColorKeyWord && isAppeared)) {
        return isKeywordColor;
      }
    }

    return baseColor;
  };

  const wordColor = getWordColor();
  const wordIsGradient = isGradientColor(wordColor);
  const activeFillIsGradient = isGradientColor(activeFillColor);

  const animationState = calculateAnimationState(
    currentFrame,
    startAtFrame,
    endAtFrame,
    animation,
    word,
    globalOpacity
  );

  const getDisplayText = () => {
    if (animation.includes("typewriter-effect")) {
      const totalLetters = word.word.length;
      const animationDuration = endAtFrame - startAtFrame;
      const lettersToShow = Math.min(
        totalLetters,
        Math.floor(
          ((currentFrame - startAtFrame) / animationDuration) * totalLetters
        )
      );
      return word.word.slice(0, lettersToShow);
    }
    return word.word;
  };

  const displayText = getDisplayText();

  const getTransformStyle = () => {
    const transforms = [];
    if (animationState.translateX !== 0 || animationState.translateY !== 0) {
      transforms.push(
        `translate(${animationState.translateX}px, ${animationState.translateY}px)`
      );
    }
    return transforms.length > 0 ? transforms.join(" ") : undefined;
  };

  return (
    <WordSpan
      ref={spanRef}
      isActive={isActive}
      wordColor={wordColor}
      activeFillColor={activeFillColor}
      scale={animationState.scale}
      animation={animation}
      animationNoneCaption={animationNoneCaption}
      style={{
        opacity: animationState.opacity,
        ...(getTransformStyle() && { transform: getTransformStyle() })
      }}
      isAppeared={isAppeared}
      scaleFactor={scaleFactor}
      showObject={showObject}
      isShapeLayer={isShapeLayer}
      isGradientColor={wordIsGradient}
      pillRadiusPx={pillRadiusPx}
      isActiveFillGradient={activeFillIsGradient}
      textDecoration={textDecoration || "none"}
    >
      {displayText}
    </WordSpan>
  );
};

function calculateAnimationState(
  currentFrame: number,
  startAtFrame: number,
  endAtFrame: number,
  animation: string,
  word: any,
  globalOpacity?: number
): WordAnimationState {
  const initialState: WordAnimationState = {
    opacity: 1,
    scale: 1,
    translateX: 0,
    translateY: 0
  };

  const basicEffects = {
    scaleAnimationLetterEffect: () => ({
      scale:
        currentFrame > startAtFrame && currentFrame < endAtFrame ? 1.4 : 0.9
    }),
    animationScaleMinEffect: () => ({ scale: 0.8 }),
    animationScaleDinamicEffect: () => ({ scale: word.is_keyword ? 1.4 : 0.9 }),
    captionAnimation26: () => ({
      opacity:
        currentFrame > startAtFrame && currentFrame < endAtFrame ? 1 : 0.6
    })
  };

  Object.entries(basicEffects).forEach(([effect, handler]) => {
    if (animation.includes(effect) || animation === effect) {
      Object.assign(initialState, handler());
    }
  });

  const animationHelpers = createAnimationFunctions(
    currentFrame,
    startAtFrame,
    endAtFrame
  );

  const animationConfig = ANIMATION_CONFIGS[animation];
  if (animationConfig) {
    const configResult = animationConfig(animationHelpers);
    Object.assign(initialState, configResult);
  }

  const selectedAnimations = animation.split("/") || [];
  selectedAnimations.forEach((anim) => {
    const animationFn = ANIMATION_FUNCTIONS[anim];
    if (animationFn) {
      const result = animationFn(animationHelpers);
      Object.assign(initialState, result);
    }
  });

  if (globalOpacity !== undefined) {
    initialState.opacity = globalOpacity;
  }

  return initialState;
}