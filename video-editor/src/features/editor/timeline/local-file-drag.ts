import type CanvasTimeline from "./items/timeline";
import { captureMediaPlacement, type AddPlacement } from "../utils/optimistic-add";

// Feed local-file drags through the same Fabric preview, snapping, overlap and
// helper-lane placement code used by menu drags. Browsers expose MIME types
// during hover, but file names/metadata only become readable at drop.
export class LocalFileDrag {
  private started = false;
  private type = "video";
  constructor(private canvas: CanvasTimeline) {}

  private event(event: DragEvent) {
    const data = new DataTransfer();
    const payload = JSON.stringify({ type: this.type, duration: 5000, details: {} });
    data.setData(payload, payload);
    return new DragEvent(event.type, {
      clientX: event.clientX, clientY: event.clientY,
      shiftKey: event.shiftKey, ctrlKey: event.ctrlKey, altKey: event.altKey,
      dataTransfer: data,
    });
  }

  over(event: DragEvent) {
    if (!this.started) {
      const mime = Array.from(event.dataTransfer?.items ?? []).find(item => /^(image|video|audio)\//.test(item.type))?.type;
      this.type = mime?.split("/")[0] ?? "video";
      this.canvas.fire("dragenter", { e: this.event(event) } as any);
      this.started = true;
    }
    this.canvas.fire("dragover", { e: this.event(event) } as any);
  }

  drop(event: DragEvent): AddPlacement | undefined {
    this.over(event);
    try {
      return captureMediaPlacement(() => this.canvas.fire("drop", { e: this.event(event) } as any));
    } finally {
      this.cancel();
    }
  }

  cancel() {
    if (!this.started) return;
    this.canvas.fire("dragleave", {} as any);
    this.canvas.requestRenderAll();
    this.started = false;
  }
}
