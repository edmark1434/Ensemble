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
    // Capture also covers native files and events stopped by the drop handlers.
    // A floating media-card preview must never cover the timeline placeholder.
    const updateOnDragOver = (event: DragEvent) => {
      const bounds = document.getElementById("timeline-container")?.getBoundingClientRect();
      setIsDraggingOverTimeline(!!bounds && event.clientX >= bounds.left && event.clientX <= bounds.right &&
        event.clientY >= bounds.top && event.clientY <= bounds.bottom);
    };
    document.addEventListener("dragover", updateOnDragOver, true);
    document.addEventListener("dragend", resetOnDragEnd);
    document.addEventListener("drop", resetOnDragEnd);

    return () => {
      dragEventsSubscription.unsubscribe();
      document.removeEventListener("dragover", updateOnDragOver, true);
      document.removeEventListener("dragend", resetOnDragEnd);
      document.removeEventListener("drop", resetOnDragEnd);
    };
  }, []);

  return isDraggingOverTimeline;
};
