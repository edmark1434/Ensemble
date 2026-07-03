import {
  Control,
  Trimmable,
  TrimmableProps,
  timeMsToUnits
} from "@designcombo/timeline";
import {
  AudioData,
  getAudioData,
  getWaveformPortion
} from "@remotion/media-utils";
import { IMetadata, ITrim } from "@designcombo/types";
import { createAudioControls } from "../controls";

const MAX_CANVAS_WIDTH = 12000; // Keep canvas size reasonable
const CANVAS_SAFE_DRAWING = 2000;

interface AudioProps extends TrimmableProps {
  aspectRatio: number;
  trim: ITrim;
  duration: number;
  src: string;
  metadata?: { name?: string; [key: string]: any };
  volume: number;
}

const getUIFont = () =>
  getComputedStyle(document.body).getPropertyValue("--font-outfit").trim() ||
  "sans-serif";

class Audio extends Trimmable {
  static type = "Audio";
  public barData?: AudioData;
  public hasSrc = true;
  private offscreenCanvas: OffscreenCanvas | null = null;
  private offscreenCtx: OffscreenCanvasRenderingContext2D | null = null;

  public scrollLeft = 0;
  private isDirty = true;
  declare playbackRate: number;
  public bars: any[] = [];

  public name: string = "Audio";
  declare volume: number;

  static createControls(): { controls: Record<string, Control> } {
    return { controls: createAudioControls() };
  }

  constructor(props: AudioProps) {
    super(props);
    this.id = props.id;
    this.name = props.metadata?.name || "Audio";
    this.tScale = props.tScale;
    this.display = props.display;
    this.trim = props.trim;
    this.duration = props.duration;
    this.fill = "#2D1625";
    this.src = props.src;
    this.objectCaching = false;
    this.initOffscreenCanvas();
    this.initialize();
    this.rx = 4;
    this.ry = 4;
    this.volume = props.volume ?? 100;
  }

  // Update the _render method to handle the visible portion
  public _render(ctx: CanvasRenderingContext2D) {
    super._render(ctx);
    this.drawTextIdentity(ctx);
    this.updateSelected(ctx);

    ctx.save();
    ctx.translate(-this.width / 2, -this.height / 2);

    // Clip the area to prevent drawing outside
    ctx.beginPath();
    ctx.rect(0, 0, this.width, this.height);
    ctx.clip();

    this.renderToOffscreen();

    // Draw only the visible portion
    const displayFromInUnits = timeMsToUnits(this.display!.from, this.tScale);
    const scrollLeft = this.scrollLeft + displayFromInUnits;
    const visibleStart = Math.max(0, -scrollLeft) - CANVAS_SAFE_DRAWING;
    ctx.drawImage(
      this.offscreenCanvas!,
      0,
      0,
      this.offscreenCanvas!.width,
      this.height,
      visibleStart,
      0,
      this.offscreenCanvas!.width,
      this.height
    );

    ctx.restore();
    this.canvas?.requestRenderAll();
  }

  private async initialize() {
    const audioData = await getAudioData(this.src);
    this.barData = audioData;
    this.bars = this.getBars(0, 0) as any;
    this.canvas?.requestRenderAll();
    this.onScrollChange({ scrollLeft: 0 });
  }

  public setSrc(src: string) {
    this.src = src;
    this.initOffscreenCanvas();
    this.initialize();
    this.setCoords();
    this.canvas?.requestRenderAll();
  }

  private getBars(start: number, duration: number) {
    if (!this.barData) return;

    const durationInUnits = timeMsToUnits(
      this.duration!,
      this.tScale,
      this.playbackRate
    );

    const bars = getWaveformPortion({
      audioData: this.barData,
      startTimeInSeconds: start / 1000 || 0,
      durationInSeconds: duration || this.barData.durationInSeconds,
      numberOfSamples: Math.round(durationInUnits / 4)
    });

    // Cache the result
    return bars;
  }

  private initOffscreenCanvas() {
    if (!this.offscreenCanvas) {
      this.offscreenCanvas = new OffscreenCanvas(this.width, this.height);
      this.offscreenCtx = this.offscreenCanvas.getContext("2d");
    }

    // Resize if dimensions changed
    if (
      this.offscreenCanvas.width !== this.width ||
      this.offscreenCanvas.height !== this.height
    ) {
      this.offscreenCanvas.width = this.width;
      this.offscreenCanvas.height = this.height;
      this.isDirty = true;
    }
  }

  public drawTextIdentity(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(-this.width / 2, -this.height / 2);
    ctx.font = `400 12px ${getUIFont()}`;
    ctx.fillStyle = "rgba(255, 255, 255,1)";
    ctx.textAlign = "left";
    ctx.clip();

    if (this.volume === 0) {
      ctx.save();
      ctx.translate(12, 10);
      ctx.strokeStyle = "rgba(255,255,255,1)";
      ctx.lineWidth = 2;
      ctx.scale(0.67, 0.67);
      const volumeOffPath = new Path2D("M16 9a5 5 0 0 1 .95 2.293M19.364 5.636a9 9 0 0 1 1.889 9.96M2 2l20 20M7 7l-.587.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298V11M9.828 4.172A.686.686 0 0 1 11 4.657v.686");
      ctx.stroke(volumeOffPath);
      ctx.restore();
      ctx.fillText(this.name, 36, 22);
    } else {
      ctx.fillText(this.name, 12, 22);
    }

    ctx.restore();
  }

  public updateSelected(ctx: CanvasRenderingContext2D) {
    const borderColor = this.isSelected
      ? "rgba(255, 255, 255,1.0)"
      : "rgba(255, 255, 255,0.05)";
    const borderWidth = 1;
    const innerRadius = 4;

    ctx.save();
    ctx.fillStyle = borderColor;

    // Create a path for the outer rectangle (no radius)
    ctx.beginPath();
    if (this.isSelected) {
      ctx.rect(-this.width / 2, -this.height / 2, this.width, this.height);
    } else {
      ctx.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, innerRadius);
    }

    // Create a path for the inner rectangle with rounded corners (the hole)
    ctx.roundRect(
      -this.width / 2 + borderWidth,
      -this.height / 2 + borderWidth,
      this.width - borderWidth * 2,
      this.height - borderWidth * 2,
      innerRadius
    );

    // Use even-odd fill rule to create the border effect
    ctx.fill("evenodd");
    ctx.restore();
  }

  public calculateOffscreenWidth({ scrollLeft }: { scrollLeft: number }) {
    const offscreenWidth = Math.min(this.left + scrollLeft, 0);

    return Math.abs(offscreenWidth);
  }

  public onScrollChange({ scrollLeft }: { scrollLeft: number }) {
    this.scrollLeft = scrollLeft;
    this.isDirty = true; // Mark as dirty after preparing new thumbnails
  }

  public renderToOffscreen(force?: boolean) {
    if (!this.offscreenCtx) return;
    if (!this.isDirty && !force) return;

    this.offscreenCanvas!.width = MAX_CANVAS_WIDTH;
    this.offscreenCanvas!.height = this.height;

    const ctx = this.offscreenCtx;
    // Calculate visible range
    const displayFromInUnits = timeMsToUnits(this.display!.from, this.tScale);
    const scrollLeft = this.scrollLeft + displayFromInUnits;
    // Calculate the offset caused by the trimming
    const trimFromSize = timeMsToUnits(
      this.trim.from,
      this.tScale,
      this.playbackRate
    );
    const visibleStart =
      Math.max(0, -scrollLeft) - CANVAS_SAFE_DRAWING + trimFromSize;
    const visibleWidth = MAX_CANVAS_WIDTH;

    const bars = this.bars;
    if (!bars) return;

    // Clear the offscreen canvas
    // ctx.clearRect(0, 0, this.offscreenCanvas!.width, this.height);

    // Clip with rounded corners
    ctx.beginPath();
    ctx.rect(0, 0, this.offscreenCanvas!.width, this.height);
    ctx.clip();

    // Draw waveform
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.imageSmoothingEnabled = false;

    // Calculate which bars are visible
    const barWidth = 4; // 1px bar + 3px space
    let startBarIndex = Math.floor(visibleStart / barWidth);
    let endBarIndex = Math.ceil((visibleStart + visibleWidth) / barWidth);
    // Only draw visible bars
    ctx.beginPath();
    for (let i = startBarIndex; i < endBarIndex && i < bars.length; i++) {
      const bar = bars[i];
      if (bar) {
        const x = Math.round(i * barWidth - visibleStart);
        if (x >= 0 && x < this.offscreenCanvas!.width) {
          const amplitude = bar.amplitude || 0;
          const height = Math.round(amplitude * 15);
          const y = Math.round((20 - height) / 2 + 8);
          ctx.rect(x, y, 1, height);
        }
      }
    }
    ctx.fill();
    this.isDirty = false;
  }

  public onResizeSnap() {
    this.renderToOffscreen(true);
  }

  public onResize() {
    this.renderToOffscreen(true);
  }

  public onScale() {
    this.bars = this.getBars(0, 0) as any;
    this.onScrollChange({ scrollLeft: this.scrollLeft });
  }
}

export default Audio;
