"use client";
import useStore from "../store/use-store";
import React, { useEffect, useRef, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { DroppableArea } from "./droppable";
import { Button } from "@/components/ui/button";
import useUploadStore from "@/features/editor/store/use-upload-store";
import { useIsMediumScreen } from "@/hooks/use-media-query";
import UploadModal from "@/features/editor/modals/upload-modal";
import { useMediaStorage } from "../hooks/use-media-storage";
import { cn } from "@/lib/utils";
import { useViewOnly } from "../hooks/use-view-only";
import { UploadDropOverlay } from "../components/upload-drop-overlay";
import { PresenceCursors } from "./presence-cursors";

const SceneEmpty = ({ onFileDrag, isFileDragOver, dropError }: {
  onFileDrag: (event: React.DragEvent<HTMLDivElement>) => void;
  isFileDragOver: boolean;
  dropError: string | null;
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [desiredSize, setDesiredSize] = useState({ width: 0, height: 0 });
  const { size } = useStore();

  useEffect(() => {
    const container = containerRef.current!;

    const calculate = () => {
      const PADDING = 30;
      const containerHeight = container.clientHeight - PADDING;
      const containerWidth = container.clientWidth - PADDING;
      const { width, height } = size;

      const desiredZoom = Math.min(containerWidth / width, containerHeight / height);
      setDesiredSize({
        width: width * desiredZoom,
        height: height * desiredZoom
      });
      setIsLoading(false);
    };

    calculate();

    const observer = new ResizeObserver(calculate);
    observer.observe(container);

    return () => observer.disconnect();
  }, [size]);

  const { setShowUploadModal } = useUploadStore();
  const isMediumScreen = useIsMediumScreen();
  const { uploadsDisabled } = useMediaStorage();
  const viewOnly = useViewOnly();

  return (
    <div
      ref={containerRef}
      className="absolute z-50 flex h-full w-full flex-1 dark:bg-card/80 bg-card"
    >
      <UploadModal />

      {!isLoading ? (
        <div
          onDragEnterCapture={onFileDrag}
          onDragOverCapture={onFileDrag}
          onDragLeaveCapture={onFileDrag}
          onDropCapture={onFileDrag}
          style={{ width: desiredSize.width, height: desiredSize.height }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          {!viewOnly && <UploadDropOverlay isDragOver={isFileDragOver} error={dropError} />}
          <PresenceCursors containerRef={containerRef} style={{ inset: 0 }} />
          <DroppableArea
            onDragStateChange={setIsDraggingOver}
            disabled={viewOnly}
            style={{ width: desiredSize.width, height: desiredSize.height }}
            className={`absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 transform items-center justify-center border border-dashed bg-card text-center transition-colors duration-200 ease-in-out ${
              isDraggingOver
                  ? "border-primary bg-primary/10"
                  : "border-border"
            }`}
          >
            <div className={cn(
              "flex items-center justify-center gap-4 p-2",
              size.height >= size.width ? "flex-col" : "flex-row",
            )}
            >
                  <Button
                    className="flex h-9 gap-2 cursor-pointer"
                    variant="default"
                    size={isMediumScreen ? "sm" : "icon"}
                    onClick={() => setShowUploadModal(true)}
                    disabled={viewOnly || uploadsDisabled}
                  >
                    <Plus width={16} />
                    <span className="hidden md:block">Upload files</span>
                  </Button>
                  <div className="flex flex-col gap-px">
                    <p className="text-sm text-muted-foreground/70">or drag and drop files here</p>
                  </div>
            </div>
          </DroppableArea>
          </div>
      ) : (
        <div
          className="fixed top-0 left-0 z-50 flex h-screen w-screen flex-col items-center justify-center gap-4 bg-card">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      )}
    </div>
  );
};

export default SceneEmpty;
