import { useCurrentFrame } from "remotion";
import { TextAnimated } from "./animated/text-animated";
import { ITextDetails } from "@designcombo/types";
import { getTextColorStyle } from "@/features/editor/player/styles";

// inline editing is now disabled

const TextLayer: React.FC<{
  id: string;
  content: string;
  onChange?: (id: string, content: string) => void;
  onBlur?: (id: string, content: string) => void;
  style?: React.CSSProperties;
  editable?: boolean;
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
}> = ({
        id,
        content,
        style = {},
        fps,
        textAnimationNameIn,
        textAnimationNameOut,
        textAnimationNameLoop,
        details,
        animationTextInFrames,
        animationTextOutFrames,
        animationTextLoopFrames,
        durationInFrames,
        animationFonts
      }) => {
  const frame = useCurrentFrame();

  // Same windowing TextAnimated uses internally (animInFrom >= frame for the
  // in-animation, animOut < frame for the out-animation), scoped to only the
  // background-color-swap animations. During those windows, BackgroundIn/Out
  // paint and own their own box (swappedBoxColor); the static
  // details.backgroundColor box behind them is what shows through as a solid
  // block outside revealWidth, so it needs to be suppressed only for the
  // duration those animations are actually active.
  const inBackgroundAnimWindow =
    textAnimationNameIn === "backgroundAnimationIn" && animationTextInFrames >= frame;
  const outBackgroundAnimWindow =
    textAnimationNameOut === "backgroundAnimationOut" &&
    durationInFrames - animationTextOutFrames < frame;
  const suppressStaticBackground = inBackgroundAnimWindow || outBackgroundAnimWindow;

  return (
    <div
      data-text-id={id}
      contentEditable={false}
      style={{
        height: "100%",
        boxShadow: "none",
        outline: "none",
        ...style,
        ...(suppressStaticBackground
          ? { backgroundColor: "transparent", backgroundImage: "none" }
          : {}),
        pointerEvents: "none",
        userSelect: "none",
        whiteSpace: "pre-line",
        width: "100%",
        display: "flex",
        alignItems: "center",
        flexDirection: "column",
        justifyContent: "center",
      }}
      suppressContentEditableWarning
      className="designcombo_textLayer"
    >
      <TextAnimated
        textAnimationNameIn={textAnimationNameIn}
        textAnimationNameOut={textAnimationNameOut}
        textAnimationNameLoop={textAnimationNameLoop}
        text={content}
        fps={fps}
        details={details}
        animationTextInFrames={animationTextInFrames}
        animationTextOutFrames={animationTextOutFrames}
        animationTextLoopFrames={animationTextLoopFrames}
        durationInFrames={durationInFrames}
        animationFonts={animationFonts}
        textColorStyle={getTextColorStyle(details.color)}
      />
    </div>
  );
};

export default TextLayer;