import { Player } from "../player";
import { useRef, useImperativeHandle, forwardRef, useEffect, type DragEvent } from "react";
import useStore from "../store/use-store";
import StateManager from "@designcombo/state";
import SceneEmpty from "./empty";
import Board from "./board";
import useZoom from "../hooks/use-zoom";
import { SceneInteractions } from "./interactions";
import { PresenceCursors } from "./presence-cursors";
import { SceneRef } from "./scene.types";
import { CanvasPreviewZoomContext } from "../components/media-placeholder";
import { UploadDropOverlay } from "../components/upload-drop-overlay";
import { useFileDropUpload } from "../hooks/use-file-drop-upload";
import { getCurrentTime } from "../utils/time";

const Scene = forwardRef<
  SceneRef,
  {
    stateManager: StateManager;
    viewOnly?: boolean;
  }
>(({ stateManager, viewOnly }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { size, trackItemIds } = useStore();
  const fileDrop = useFileDropUpload();
  const handleFileDrag = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes("Files") && !event.dataTransfer.files.length) return;
    event.preventDefault();
    event.stopPropagation();
    if (viewOnly) {
      event.dataTransfer.dropEffect = "none";
      return;
    }
    if (event.type === "dragenter") fileDrop.handleDragEnter(event);
    else if (event.type === "dragover") fileDrop.handleDragOver(event);
    else if (event.type === "dragleave") fileDrop.handleDragLeave(event);
    else if (event.type === "drop") fileDrop.handleDrop(event, getCurrentTime());
  };
  const { zoom, handlePinch, recalculateZoom } = useZoom(
    containerRef as React.RefObject<HTMLDivElement>,
    size
  );

  // Expose the recalculateZoom function to parent
  useImperativeHandle(ref, () => ({
    recalculateZoom
  }));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const lockScroll = () => {
      el.scrollTop = 0;
      el.scrollLeft = 0;
    };
    el.addEventListener("scroll", lockScroll);
    return () => el.removeEventListener("scroll", lockScroll);
  }, []);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        flex: 1,
        overflow: "hidden",
        background: "transparent",
        display: "flex",
        justifyContent: "center",
        alignItems: "center"
      }}
      ref={containerRef}
    >
      {!viewOnly && trackItemIds.length > 0 && (
        <div
          className="pointer-events-none absolute z-[60]"
          style={{ width: size.width * zoom, height: size.height * zoom }}
        >
          <UploadDropOverlay isDragOver={fileDrop.isDragOver} error={fileDrop.dragError} />
        </div>
      )}
      {trackItemIds.length === 0 && (
        <SceneEmpty onFileDrag={handleFileDrag} isFileDragOver={fileDrop.isDragOver} dropError={fileDrop.dragError} />
      )}
      {trackItemIds.length > 0 && (
        <PresenceCursors containerRef={containerRef} style={{ width: size.width * zoom, height: size.height * zoom }} />
      )}
      <div
        onDragEnterCapture={handleFileDrag}
        onDragOverCapture={handleFileDrag}
        onDragLeaveCapture={handleFileDrag}
        onDropCapture={handleFileDrag}
        style={{
          width: size.width,
          height: size.height,
          background: "#000000",
          transform: `scale(${zoom})`,
          position: "absolute",
          overflow: "clip",
        }}
        className="player-container bg-sidebar"
      >
        <div
          style={{
            position: "absolute",
            zIndex: 100,
            pointerEvents: "none",
            width: size.width,
            height: size.height,
            background: "transparent",
            boxShadow: "0 0 0 5000px var(--card)"
          }}
        />
        <CanvasPreviewZoomContext.Provider value={zoom}>
          <Board size={size}>
            <Player />
            <SceneInteractions
              stateManager={stateManager}
              containerRef={containerRef as React.RefObject<HTMLDivElement>}
              zoom={zoom}
              size={size}
              viewOnly={viewOnly}
            />
          </Board>
        </CanvasPreviewZoomContext.Provider>
      </div>
    </div>
  );
});

Scene.displayName = "Scene";

export default Scene;
