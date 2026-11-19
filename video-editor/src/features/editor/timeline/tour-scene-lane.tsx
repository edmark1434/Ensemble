import { useLayoutEffect, useRef } from "react";
import Timeline, { timeMsToUnits, unitsToTimeMs } from "@designcombo/timeline";
import type { ITimelineScaleState } from "@designcombo/types";
import { tourAction, useTourDemo } from "../store/use-tour-demo";
import { makeSceneTrack, makeSceneTrackItem, type ISceneTrackItem } from "../types/ensemble-scene";
import { TIMELINE_OFFSET_CANVAS_RIGHT } from "../constants/constants";
import Scene from "./items/ensemble-scene";

// Fabric handles pointer events. Project history, selection and collaboration
// listeners belong exclusively to the live timeline.
class LocalTimeline extends Timeline {
  override initEventListeners() {}
  override setActiveIds(ids: string[]) { this.activeIds = ids; }
}

const laneHeight = 42;
const laneGap = 8;

export function TourSceneLane({ item, scale, origin, width, laneWidth, inside }: {
  item: ISceneTrackItem; scale: ITimelineScaleState; origin: number; width: number; laneWidth: number; inside: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const anchor = useRef<HTMLSpanElement>(null);
  const drawing = useRef<{ canvas: LocalTimeline; scene?: Scene; rowTop: number } | null>(null);
  const selected = useTourDemo(s => s.access);
  useLayoutEffect(() => {
    if (!host.current) return;
    const element = document.createElement("canvas");
    host.current.appendChild(element);
    const canvas = new LocalTimeline(element, {
      scale, duration: inside ? 0 : item.display.to, selection: false,
      sizesMap: { scene: laneHeight }, acceptsMap: { scene: ["scene", "image", "video"] }, itemTypes: ["scene"],
    });
    const track = makeSceneTrack({ id: item.id + "-lane", type: "scene", items: inside ? [] : [item.id],
      metadata: {}, accepts: ["scene"], index: 0, magnetic: inside, static: inside });
    canvas.tracks = [track];
    canvas.renderTracks();
    const rowTop = canvas.getObjects("Track")[0].top;
    let scene: Scene | undefined;
    if (!inside) {
      const trackItem = { ...makeSceneTrackItem(item) };
      canvas.trackItemIds = [item.id];
      canvas.trackItemsMap = { [item.id]: trackItem };
      canvas.addTrackItem(trackItem);
      canvas.alignItemsToTrack();
      scene = canvas.getTrackItems().find((object): object is Scene => object instanceof Scene);
      if (scene) {
        const clip = scene;
        clip.lockMovementY = true;
        clip.hasBorders = false;
        clip.on("mousedown", () => tourAction("scene"));
        canvas.on("mouse:dblclick", event => {
          if (event.target === clip) tourAction("enter-scene");
        });
        clip.on("modified", () => {
          const from = Math.max(0, unitsToTimeMs(clip.left, clip.tScale));
          const to = from + clip.display.to - clip.display.from;
          useTourDemo.setState(s => s.scene ? { scene: { ...s.scene, display: { from, to } } } : {});
        });
      }
    }
    drawing.current = { canvas, scene, rowTop };
    return () => {
      drawing.current = null;
      canvas.wrapperEl.remove();
      void canvas.dispose();
    };
  }, [item.id, inside]);

  useLayoutEffect(() => {
    if (!drawing.current) return;
    const { canvas, scene, rowTop } = drawing.current;
    canvas.setDimensions({ width, height: rowTop + laneHeight });
    canvas.setViewportTransform([1, 0, 0, 1, origin, 0]);
    const { from, to } = item.display;
    const clipWidth = timeMsToUnits(to - from, scale.zoom);
    const left = timeMsToUnits(from, scale.zoom);
    canvas.bounding.width = Math.max(laneWidth - canvas.spacing.right, width - origin,
      inside ? 0 : left + clipWidth + TIMELINE_OFFSET_CANVAS_RIGHT);
    canvas.refreshTrackLayout();
    if (scene) {
      scene.set({ display: item.display, tScale: scale.zoom, left, width: clipWidth, isSelected: selected });
      scene.setCoords();
    }
    if (anchor.current) {
      const start = Math.max(0, origin + left);
      const end = Math.min(width, origin + left + clipWidth);
      Object.assign(anchor.current.style, { left: start + "px", top: rowTop + "px",
        width: Math.max(0, end - start) + "px", height: laneHeight + "px" });
    }
    canvas.requestRenderAll();
  }, [item, scale, origin, width, laneWidth, selected, inside]);

  // The next canvas already includes the timeline's leading gutter. Reserve
  // one native row and the usual inter-lane gap so both rows line up.
  return <div className="relative z-[1] shrink-0" style={{ height: laneHeight + laneGap }}
    aria-label={inside ? "Empty scene lane" : "Sample scene lane"}>
    <div ref={host} className="absolute inset-x-0 top-0 overflow-hidden" />
    {!inside && <span ref={anchor} aria-hidden data-editor-tour="sample-scene" className="pointer-events-none absolute" />}
  </div>;
}
