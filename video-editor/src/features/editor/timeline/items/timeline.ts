import TimelineBase, {Rect, timeMsToUnits} from "@designcombo/timeline";
import Video from "./video";
import { throttle } from "lodash";
import Audio from "./audio";
import { TimelineOptions } from "@designcombo/timeline";
import { ITimelineScaleState } from "@designcombo/types";
import useStore from "../../store/use-store";

class Timeline extends TimelineBase {
  public isShiftKey: boolean = false;
  private guideAnchors: any[] = [];
  private isSnappedToPlayhead: boolean = false;

  constructor(
      canvasEl: HTMLCanvasElement,
      options: Partial<TimelineOptions> & {
        scale: ITimelineScaleState;
        duration: number;
        guideLineColor?: string;
      }
  ) {
    // Intercept the wheel listener registration before super()
    let capturedWheelListener: EventListenerOrEventListenerObject | null = null;
    const origAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type: string, listener: any, options: any) {
      if (type === 'wheel') {
        capturedWheelListener = listener;
      }
      return origAddEventListener.call(this, type, listener, options);
    };

    super(canvasEl, options);

    // Restore immediately
    EventTarget.prototype.addEventListener = origAddEventListener;

    // Now remove it and add ours
    if (capturedWheelListener) {
      this.upperCanvasEl.removeEventListener('wheel', capturedWheelListener);
    }
    this.upperCanvasEl.addEventListener('wheel', this.handleWheel, { passive: false });

    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);

    this.on("before:transform", this.addMarkerAndPlayheadGuides);
    this.on("object:modified", this.removeMarkerAndPlayheadGuides);
    this.on("mouse:up", this.removeMarkerAndPlayheadGuides);

    this.on("object:moving", this.checkPlayheadSnap);
    this.on("object:modified", this.clearPlayheadSnap);
    this.on("mouse:up", this.clearPlayheadSnap);
  }

  private handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey) return; // block pinch

    const currentScrollLeft = -this.viewportTransform[4] + this.spacing.left;

    if (e.shiftKey) {
      // shift + wheel = vertical scroll
      const currentScrollTop = -this.viewportTransform[5];
      this.scrollTo({ scrollTop: Math.max(0, currentScrollTop + e.deltaY) });
    } else {
      // normal wheel = horizontal scroll
      this.scrollTo({ scrollLeft: Math.max(0, currentScrollLeft + e.deltaY) });
    }
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Shift") {
      this.isShiftKey = true;
    }
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    if (event.key === "Shift") {
      this.isShiftKey = false;
    }
  };

  private addMarkerAndPlayheadGuides = () => {
    this.removeMarkerAndPlayheadGuides();

    const { playerRef, fps, markers } = useStore.getState();
    const currentFrame = playerRef?.current?.getCurrentFrame() ?? 0;
    const playheadMs = (currentFrame / fps) * 1000;

    const positions = [
      timeMsToUnits(playheadMs, this.scale.zoom),
      ...markers.map((m) => timeMsToUnits(m.timeMs, this.scale.zoom)),
    ];

    this.guideAnchors = positions.map(
      (x) =>
        new Rect({
          left: x + 1,
          top: 0,
          width: 0,
          height: 2000,
          selectable: false,
          evented: false,
          excludeFromExport: true,
          opacity: 0,
        })
    );

    this.add(...this.guideAnchors);
  };

  private removeMarkerAndPlayheadGuides = () => {
    if (!this.guideAnchors.length) return;
    this.remove(...this.guideAnchors);
    this.guideAnchors = [];
  };

  private checkPlayheadSnap = () => {
    const { playerRef, fps } = useStore.getState();
    const currentFrame = playerRef?.current?.getCurrentFrame() ?? 0;
    const playheadMs = (currentFrame / fps) * 1000;
    const playheadX = timeMsToUnits(playheadMs, this.scale.zoom);

    const active = this.getActiveObjects();
    const snapped = active.some((obj: any) => {
      const left = obj.left;
      const right = obj.left + obj.width;
      return Math.abs(left - playheadX) < 2 || Math.abs(right - playheadX) < 2;
    });

    if (snapped !== this.isSnappedToPlayhead) {
      this.isSnappedToPlayhead = snapped;
      useStore.getState().setState({ playheadSnapped: snapped });
    }
  };

  private clearPlayheadSnap = () => {
    if (this.isSnappedToPlayhead) {
      this.isSnappedToPlayhead = false;
      useStore.getState().setState({ playheadSnapped: false });
    }
  };

  public purge(): void {
    super.purge();
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    this.upperCanvasEl?.removeEventListener('wheel', this.handleWheel);

    this.off("before:transform", this.addMarkerAndPlayheadGuides);
    this.off("object:modified", this.removeMarkerAndPlayheadGuides);
    this.off("mouse:up", this.removeMarkerAndPlayheadGuides);

    this.off("object:moving", this.checkPlayheadSnap);
    this.off("object:modified", this.clearPlayheadSnap);
    this.off("mouse:up", this.clearPlayheadSnap);
  }

  public setViewportPos(posX: number, posY: number) {
    const limitedPos = this.getViewportPos(posX, posY);
    const vt = this.viewportTransform;
    vt[4] = limitedPos.x;
    vt[5] = limitedPos.y;
    this.requestRenderAll();
    this.setActiveTrackItemCoords();
    this.onScrollChange();

    this.onScroll?.({
      scrollTop: limitedPos.y,
      scrollLeft: limitedPos.x - this.spacing.left
    });
  }

  public onScrollChange = throttle(async () => {
    const objects = this.getObjects();
    const viewportTransform = this.viewportTransform;
    const scrollLeft = viewportTransform[4];
    for (const object of objects) {
      if (object instanceof Video || object instanceof Audio) {
        object.onScrollChange({ scrollLeft });
      }
    }
  }, 250);

  public scrollTo({
    scrollLeft,
    scrollTop
  }: {
    scrollLeft?: number;
    scrollTop?: number;
  }): void {
    const vt = this.viewportTransform; // Create a shallow copy
    let hasChanged = false;

    if (typeof scrollLeft === "number") {
      vt[4] = -scrollLeft + this.spacing.left;
      hasChanged = true;
    }
    if (typeof scrollTop === "number") {
      vt[5] = -scrollTop;
      hasChanged = true;
    }

    if (hasChanged) {
      this.viewportTransform = vt;
      this.getActiveObject()?.setCoords();
      this.onScrollChange();
      this.requestRenderAll();
    }
  }
}

export default Timeline;
