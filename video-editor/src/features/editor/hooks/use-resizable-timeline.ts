import React from "react";
import useStore from "../store/use-store";

// last "normal" height, remembered whenever we leave it for max / min
let defaultHeight = 0;

const getFallbackHeight = () => Math.round(window.innerHeight * 0.4);

// "min" = just the header row (plus the 1px top border)
const getMinHeight = () => (document.getElementById("timeline-header")?.offsetHeight || 50) + 1;

const getHeightMode = (height: number) => {
  if (height <= getMinHeight()) return "min";
  if (height >= window.innerHeight) return "max";
  return "default";
};

const applyTimelineHeight = (height: number) => {
  const container = document.getElementById("timeline-container");
  if (!container) return;

  container.style.height = `${height}px`;
  const containerHeight = Math.max(
    0,
    (document.getElementById("playhead")?.clientHeight || 0) -
    (document.getElementById("playhead-handle")?.clientHeight || 0) - 26
  );

  const { timeline, setTimelineHeight } = useStore.getState();
  timeline?.resize({ height: containerHeight }, { force: true });
  setTimelineHeight(height);
};

// backtick + header button: max -> default -> min (header only) -> max
export const cycleTimelineHeight = () => {
  const { timelineHeight } = useStore.getState();
  const mode = getHeightMode(timelineHeight);

  if (mode === "max") {
    applyTimelineHeight(defaultHeight || getFallbackHeight());
  } else if (mode === "default") {
    defaultHeight = timelineHeight;
    applyTimelineHeight(getMinHeight());
  } else {
    applyTimelineHeight(window.innerHeight);
  }
};

export const useResizbleTimeline = () => {
  const [isResizing, setIsResizing] = React.useState(false);
  const timelineContainerRef = React.useRef<HTMLDivElement>(null);
  const {
    timeline,
    timelineHeight,
    setTimelineHeight,
    setTimelineContainerRef
  } = useStore();

  React.useEffect(() => {
    setTimelineContainerRef(timelineContainerRef as React.RefObject<HTMLDivElement>);
  }, []);

  const onMouseDown = (ev: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const { y } = timelineContainerRef.current!.getBoundingClientRect();
    const cursorPosition = ev.clientY - y;
    if (cursorPosition > 15 || cursorPosition < -15) return;
    setIsResizing(true);

    const startY = ev.clientY;
    const startHeight = timelineContainerRef.current!.offsetHeight;
    let currentHeight = 0;

    const onMouseMove = (ev: MouseEvent) => {
      currentHeight = startHeight + startY - ev.clientY;

      if (currentHeight < 50 || currentHeight >= window.innerHeight * 0.5) {
        ev.preventDefault();
        return;
      }
      timelineContainerRef.current!.style.height = `${currentHeight}px`;
      timelineContainerRef.current!.style.borderTopColor = "#2B64EB";
      timelineContainerRef.current!.style.cursor = "row-resize";
      const containerHeight =
        (document.getElementById("playhead")?.clientHeight || 0) -
        (document.getElementById("playhead-handle")?.clientHeight || 0);
      timeline?.resize({
        height: containerHeight
      });
      setTimelineHeight(currentHeight);
    };
    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      setIsResizing(false);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const onMouseMove = (ev: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (isResizing) return;
    const { y } = timelineContainerRef.current!.getBoundingClientRect();
    const cursorPosition = ev.clientY - y;

    if (cursorPosition <= 15 && cursorPosition >= -15) {
      timelineContainerRef.current!.style.cursor = "row-resize";
      timelineContainerRef.current!.style.borderTopColor = "#2B64EB";
    } else {
      timelineContainerRef.current!.style.borderTopColor = "transparent";
      timelineContainerRef.current!.style.cursor = "default";
    }
  };

  const onMouseOut = () => {
    if (isResizing) return;
    timelineContainerRef.current!.style.borderTopColor = "transparent";
    timelineContainerRef.current!.style.cursor = "default";
  };

  React.useEffect(() => {
    if (!timelineContainerRef.current) return;
    if (timelineHeight) return;
    setTimelineHeight(timelineContainerRef.current.clientHeight);
  }, []);

  return {
    timelineContainerRef,
    onMouseDown,
    onMouseMove,
    onMouseOut,
    timelineHeight,
    toggleFullHeight: cycleTimelineHeight
  };
};