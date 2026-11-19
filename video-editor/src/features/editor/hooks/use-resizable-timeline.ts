import React from "react";
import useStore from "../store/use-store";

// last "normal" height, remembered whenever we leave it for max / min
let defaultHeight = 0;

const getFallbackHeight = () => Math.round(window.innerHeight * 0.4);

// "min" = just the header row (plus the 1px top border)
const getMinHeight = () => (document.getElementById("timeline-header")?.offsetHeight || 50) + 1;

// Backtick and the header button cycle through max, default and header-only.
export const cycleTimelineHeight = () => {
  const { timelineHeight, timelineMaximized, setTimelineHeight, toggleTimelineFullHeight } = useStore.getState();
  if (timelineMaximized) {
    setTimelineHeight(defaultHeight || getFallbackHeight());
  } else if (timelineHeight <= getMinHeight()) {
    toggleTimelineFullHeight();
  } else {
    defaultHeight = timelineHeight;
    setTimelineHeight(getMinHeight());
  }
};

export const useResizbleTimeline = () => {
  const [isResizing, setIsResizing] = React.useState(false);
  const timelineContainerRef = React.useRef<HTMLDivElement>(null);
  const {
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