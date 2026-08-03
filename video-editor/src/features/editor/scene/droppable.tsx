import { dispatch } from "@designcombo/events";
import {ADD_AUDIO, ADD_IMAGE, ADD_TEXT, ADD_VIDEO} from "@designcombo/state";
import { generateId } from "@designcombo/timeline";
import React, { useCallback, useState } from "react";
import {ITrackItem} from "@designcombo/types";
import {getCurrentTime} from "@/features/editor/utils/time";

enum AcceptedDropTypes {
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  TEXT = "text",
}

interface DraggedData {
  type: AcceptedDropTypes;
  [key: string]: any;
}

interface DroppableAreaProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onDragStateChange?: (isDragging: boolean) => void;
  onFilesDropped?: (files: File[]) => void;
  id?: string;
}

// A native OS file drag reports its types as ["Files"] (no actual file
// data is readable until drop) - distinct from the internal drag system
// below, which smuggles its whole payload through `types[0]` as a JSON
// string. Check this first so we never try to JSON.parse "Files".
const isNativeFileDrag = (e: React.DragEvent<HTMLDivElement>): boolean =>
  Array.from(e.dataTransfer?.types || []).includes("Files");

const useDragAndDrop = (
  onDragStateChange?: (isDragging: boolean) => void,
  onFilesDropped?: (files: File[]) => void
) => {
  const [isPointerInside, setIsPointerInside] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleDrop = useCallback((draggedData: DraggedData) => {
    const payload = { ...draggedData, id: generateId() } as ITrackItem;
    const options = {};

    const time = getCurrentTime();

    let clipDuration;
    switch (draggedData.type) {
      case AcceptedDropTypes.IMAGE:
        const DEFAULT_IMAGE_DURATION_MS = 5000;
        clipDuration = DEFAULT_IMAGE_DURATION_MS;
        break;
      case AcceptedDropTypes.VIDEO:
      case AcceptedDropTypes.AUDIO:
        clipDuration = ((payload.details as any)?.duration ?? 5) * 1000;
        break;
      case AcceptedDropTypes.TEXT:
        clipDuration = payload.display.to - payload.display.from;
        break;
    }
    payload.display = { from: time, to: time + clipDuration };

    switch (draggedData.type) {
      case AcceptedDropTypes.IMAGE:
        dispatch(ADD_IMAGE, { payload, options });
        break;
      case AcceptedDropTypes.VIDEO:
        dispatch(ADD_VIDEO, { payload, options });
        break;
      case AcceptedDropTypes.AUDIO:
        dispatch(ADD_AUDIO, { payload, options });
        break;
      case AcceptedDropTypes.TEXT:
        dispatch(ADD_TEXT, { payload, options });
        break;
    }
  }, []);

  const onDragEnter = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();

      if (isNativeFileDrag(e)) {
        setIsDraggingOver(true);
        setIsPointerInside(true);
        onDragStateChange?.(true);
        return;
      }

      try {
        const draggedDataString = e.dataTransfer?.types[0] as string;
        if (!draggedDataString) return;
        const draggedData: DraggedData = JSON.parse(draggedDataString);

        if (!Object.values(AcceptedDropTypes).includes(draggedData.type))
          return;
        setIsDraggingOver(true);
        setIsPointerInside(true);
        onDragStateChange?.(true);
      } catch (error) {
        console.error("Error parsing dragged data:", error);
      }
    },
    [onDragStateChange]
  );

  const onDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (isPointerInside) {
        setIsDraggingOver(true);
        onDragStateChange?.(true);
      }
    },
    [isPointerInside, onDragStateChange]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!isDraggingOver) return;
      e.preventDefault();
      setIsDraggingOver(false);
      onDragStateChange?.(false);

      if (isNativeFileDrag(e)) {
        const files = Array.from(e.dataTransfer.files || []);
        if (files.length > 0) {
          onFilesDropped?.(files);
        }
        return;
      }

      try {
        const draggedDataString = e.dataTransfer?.types[0] as string;
        const draggedData = JSON.parse(
          e.dataTransfer!.getData(draggedDataString)
        );
        handleDrop(draggedData);
      } catch (error) {
        console.error("Error parsing dropped data:", error);
      }
    },
    [isDraggingOver, onDragStateChange, handleDrop, onFilesDropped]
  );

  const onDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setIsDraggingOver(false);
        setIsPointerInside(false);
        onDragStateChange?.(false);
      }
    },
    [onDragStateChange]
  );

  return { onDragEnter, onDragOver, onDrop, onDragLeave, isDraggingOver };
};

export const DroppableArea: React.FC<DroppableAreaProps> = ({
  children,
  className,
  style,
  onDragStateChange,
  onFilesDropped,
  id
}) => {
  const { onDragEnter, onDragOver, onDrop, onDragLeave } =
    useDragAndDrop(onDragStateChange, onFilesDropped);

  return (
    <div
      id={id}
      onDragEnter={onDragEnter}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={className}
      style={style}
      role="region"
      aria-label="Droppable area for images, videos, and audio"
    >
      {children}
    </div>
  );
};