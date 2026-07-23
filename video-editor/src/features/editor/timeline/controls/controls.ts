import {
  controlsUtils,
  Control,
  resize,
  changeWidth,
  unitsToTimeMs
} from "@designcombo/timeline";
import type { TransformActionHandler } from "@designcombo/timeline";
import {
  drawVerticalLeftIcon,
  drawVerticalLine,
  drawVerticalRightIcon
} from "./draw";

const { scaleSkewCursorStyleHandler, wrapWithFireEvent, wrapWithFixedAnchor } =
  controlsUtils;

const MIN_TRANSITION_DURATION_MS = 330;
const MAX_TRANSITION_DURATION_MS = 5000;

const changeTransitionWidthClamped: TransformActionHandler = (
  eventData,
  transform,
  x,
  y
) => {
  const { target } = transform;
  const originalWidth = target.width;
  const originalLeft = target.left;

  const widthChanged = changeWidth(eventData, transform, x, y);

  if (!widthChanged) {
    return false;
  }

  const newDuration = unitsToTimeMs(
    target.width,
    (target as any).tScale,
    (target as any).playbackRate
  );

  if (
    newDuration < MIN_TRANSITION_DURATION_MS ||
    newDuration >= MAX_TRANSITION_DURATION_MS
  ) {
    target.set("width", originalWidth);
    target.set("left", originalLeft);
    return false;
  }

  target.set("duration", newDuration);
  return true;
};

const resizeTransitionClamped = wrapWithFireEvent(
  "resizing",
  wrapWithFixedAnchor(changeTransitionWidthClamped)
);

export const createResizeControls = () => ({
  mr: new Control({
    x: 0.5,
    y: 0,
    render: drawVerticalRightIcon,
    actionHandler: resize.common,
    cursorStyleHandler: scaleSkewCursorStyleHandler,
    actionName: "resizing",
    sizeX: 20,
    sizeY: 32,
    offsetX: 10
  }),
  ml: new Control({
    x: -0.5,
    y: 0,
    actionHandler: resize.common,
    cursorStyleHandler: scaleSkewCursorStyleHandler,
    actionName: "resizing",
    render: drawVerticalLeftIcon,
    sizeX: 20,
    sizeY: 32,
    offsetX: -10
  })
});

export const createAudioControls = () => ({
  mr: new Control({
    x: 0.5,
    y: 0,
    render: drawVerticalRightIcon,
    actionHandler: resize.audio,
    cursorStyleHandler: scaleSkewCursorStyleHandler,
    actionName: "resizing",
    sizeX: 20,
    sizeY: 32,
    offsetX: 10
  }),
  ml: new Control({
    x: -0.5,
    y: 0,
    render: drawVerticalLeftIcon,
    actionHandler: resize.audio,
    cursorStyleHandler: scaleSkewCursorStyleHandler,
    actionName: "resizing",
    sizeX: 20,
    sizeY: 32,
    offsetX: -10
  })
});

export const createMediaControls = () => ({
  mr: new Control({
    x: 0.5,
    y: 0,
    actionHandler: resize.media,
    render: drawVerticalRightIcon,
    cursorStyleHandler: scaleSkewCursorStyleHandler,
    actionName: "resizing",
    sizeX: 20,
    sizeY: 32,
    offsetX: 10
  }),
  ml: new Control({
    x: -0.5,
    y: 0,
    render: drawVerticalLeftIcon,
    actionHandler: resize.media,
    cursorStyleHandler: scaleSkewCursorStyleHandler,
    actionName: "resizing",
    sizeX: 20,
    sizeY: 32,
    offsetX: -10
  })
});

export const createTransitionControls = () => ({
  mr: new Control({
    x: 0.5,
    y: 0,
    render: drawVerticalRightIcon,
    actionHandler: resizeTransitionClamped,
    cursorStyleHandler: scaleSkewCursorStyleHandler,
    actionName: "resizing",
    sizeX: 20,
    sizeY: 32,
    offsetX: 10
  }),
  ml: new Control({
    x: -0.5,
    y: 0,
    render: drawVerticalLeftIcon,
    actionHandler: resizeTransitionClamped,
    cursorStyleHandler: scaleSkewCursorStyleHandler,
    actionName: "resizing",
    sizeX: 20,
    sizeY: 32,
    offsetX: -10
  })
});