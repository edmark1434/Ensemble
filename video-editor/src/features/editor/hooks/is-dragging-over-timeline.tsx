import { useState, useEffect } from "react";
import { filter, subject } from "@designcombo/events";
import { DRAG_END, DRAG_PREFIX, DRAG_START } from "@designcombo/timeline";

export const useIsDraggingOverTimeline = () => {
  const [isDraggingOverTimeline, setIsDraggingOverTimeline] = useState(false);

  useEffect(() => {
    const dragEvents = subject.pipe(
      filter(({ key }) => key.startsWith(DRAG_PREFIX))
    );

    const dragEventsSubscription = dragEvents.subscribe((obj) => {
      if (obj.key === DRAG_START) {
        setIsDraggingOverTimeline(true);
      } else if (obj.key === DRAG_END) {
        setIsDraggingOverTimeline(false);
      }
    });

    // Native dragend always fires once a drag ends (drop or cancel).
    // DRAG_END above depends on "dragleave" firing on the timeline
    // container, which never happens on a successful drop there —
    // so without this, the flag gets stuck true after every drop.
    const resetOnDragEnd = () => setIsDraggingOverTimeline(false);
    document.addEventListener("dragend", resetOnDragEnd);

    return () => {
      dragEventsSubscription.unsubscribe();
      document.removeEventListener("dragend", resetOnDragEnd);
    };
  }, []);

  return isDraggingOverTimeline;
};