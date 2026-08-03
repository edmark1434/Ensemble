import useStore from "../store/use-store";
import React, { useEffect, useRef, useState } from "react";
import { Droppable } from "@/components/ui/droppable";
import {Loader2, Plus, PlusIcon, Send} from "lucide-react";
import { DroppableArea } from "./droppable";
import {Button} from "@/components/ui/button";
import useUploadStore from "@/features/editor/store/use-upload-store";
import {useIsMediumScreen} from "@/hooks/use-media-query";
import ModalUpload from "@/components/modal-upload";

const SceneEmpty = () => {
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

  const onSelectFiles = (files: File[]) => {
    console.log({ files });
  };

  const { setShowUploadModal } = useUploadStore();
  const isMediumScreen = useIsMediumScreen();

  return (
    <div
      ref={containerRef}
      className="absolute z-50 flex h-full w-full flex-1 dark:bg-card/80 bg-card"
    >
      <ModalUpload />

      {!isLoading ? (
        <Droppable
          maxFileCount={4}
          maxSize={4 * 1024 * 1024}
          disabled={false}
          onValueChange={onSelectFiles}
          className="h-full w-full flex-1"
        >
          <DroppableArea
            onDragStateChange={setIsDraggingOver}
            style={{
              width: desiredSize.width,
              height: desiredSize.height,
            }}
            className={`absolute bg-card left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 transform items-center justify-center border border-dashed text-center transition-colors duration-200 ease-in-out ${
              isDraggingOver ? "border-border bg-white/10" : "border-border"
            }`}
          >
            <div className="flex items-center justify-center gap-4">
              <Button
                className="flex h-9 gap-2 cursor-pointer"
                variant="default"
                size={isMediumScreen ? "sm" : "icon"}
                onClick={() => setShowUploadModal(true)}
              >
                <Plus width={16} />
                <span className="hidden md:block">Upload files</span>
              </Button>

              <div className="flex flex-col gap-px">
                <p className="text-sm text-muted-foreground/70">
                  or drag and drop files here
                </p>
              </div>
            </div>
          </DroppableArea>
        </Droppable>
      ) : (
        <div className="fixed top-0 left-0 z-50 flex h-screen w-screen flex-col items-center justify-center gap-4 bg-card">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      )}
    </div>
  );
};

export default SceneEmpty;
