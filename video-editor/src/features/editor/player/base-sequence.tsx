import { ISize, ITrackItem } from "@designcombo/types";
import { AbsoluteFill, Sequence } from "remotion";
import { calculateFrames } from "../utils/frames";
import { calculateContainerStyles } from "./styles";
import { TransitionSeries } from "@designcombo/transitions";

export interface SequenceItemOptions {
  handleTextChange?: (id: string, text: string) => void;
  fps: number;
  editableTextId?: string | null;
  currentTime?: number;
  zIndex?: number;
  onTextBlur?: (id: string, text: string) => void;
  size?: ISize;
  frame?: number;
  isTransition?: boolean;
  // true only for items rendered inside a Scene's nested content layer —
  // a read-only snapshot that must never be individually selectable/
  // draggable in the player
  nested?: boolean;
}

export const BaseSequence = ({
  item,
  options,
  children
}: {
  item: ITrackItem;
  options: SequenceItemOptions;
  children: React.ReactNode;
}) => {
  const { details } = item as ITrackItem;
  const { fps, isTransition, nested } = options;
  const { from, durationInFrames } = calculateFrames(
    {
      from: item.display.from,
      to: item.display.to
    },
    fps
  );
  const crop = details.crop || {
    x: 0,
    y: 0,
    width: item.details.width,
    height: item.details.height
  };

  const background =
    details?.background?.type === "color"
      ? details?.background?.value
      : typeof details?.background === "string"
        ? details?.background
        : "transparent";

  const className = nested
    ? `designcombo-scene-nested-item id-${item.id} designcombo-scene-item-type-${item.type}`
    : `designcombo-scene-item id-${item.id} designcombo-scene-item-type-${item.type}`;

  if (isTransition) {
    return (
      <TransitionSeries.Sequence
        key={item.id}
        durationInFrames={durationInFrames}
        style={{ pointerEvents: "none" }}
      >
        <AbsoluteFill
          id={item.id}
          data-track-item="transition-element"
          className={className}
          style={calculateContainerStyles(details, crop, { background, pointerEvents: nested ? "none" : "auto" })}
        >
          {children}
        </AbsoluteFill>
      </TransitionSeries.Sequence>
    );
  }

  return (
    <Sequence
      key={item.id}
      from={from}
      durationInFrames={durationInFrames || 1 / fps}
      style={{
        pointerEvents: "none"
      }}
    >
      <AbsoluteFill
        id={item.id}
        data-track-item="transition-element"
        className={className}
        style={calculateContainerStyles(
          details,
          crop,
          {
            background,
            pointerEvents: nested ? "none" : (item.type === "audio" ? "none" : "auto"),
            overflow:
              item.type !== "caption" && item.type !== "text"
                ? "hidden"
                : "visible"
          },
          item.type
        )}
      >
        {children}
      </AbsoluteFill>
    </Sequence>
  );
};
