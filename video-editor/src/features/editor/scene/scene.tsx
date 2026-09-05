import { Player } from "../player";
import {useRef, useImperativeHandle, forwardRef, useEffect} from "react";
import useStore from "../store/use-store";
import StateManager from "@designcombo/state";
import SceneEmpty from "./empty";
import Board from "./board";
import useZoom from "../hooks/use-zoom";
import { SceneInteractions } from "./interactions";
import { SceneRef } from "./scene.types";

const Scene = forwardRef<
  SceneRef,
  {
    stateManager: StateManager;
    viewOnly?: boolean;
  }
>(({ stateManager, viewOnly }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { size, trackItemIds } = useStore();
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
      {trackItemIds.length === 0 && <SceneEmpty />}
      <div
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
      </div>
    </div>
  );
});

Scene.displayName = "Scene";

export default Scene;