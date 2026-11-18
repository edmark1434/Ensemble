import { drawMissingMedia } from "./missing-media";
import { getStickyLabelOffset } from "./sticky-label";
import { isMissingMediaSource } from "../../utils/missing-media";
import {
  Control,
  Pattern,
  Trimmable,
  TrimmableProps,
  timeMsToUnits,
  unitsToTimeMs
} from "@designcombo/timeline";
import { Filmstrip, FilmstripBacklogOptions } from "../types";
import ThumbnailCache from "../../utils/thumbnail-cache";
import { IDisplay, IMetadata, ITrim } from "@designcombo/types";
import {
  calculateOffscreenSegments,
  calculateThumbnailSegmentLayout
} from "../../utils/filmstrip";
import { videoFilmstrip } from "../../utils/video-filmstrip";
import { createMediaControls } from "../controls";


const EMPTY_FILMSTRIP: Filmstrip = {
  offset: 0,
  startTime: 0,
  thumbnailsCount: 0,
  widthOnScreen: 0
};

const getUIFont = () =>
  getComputedStyle(document.body).getPropertyValue("--font-plus-jakarta-sans").trim() ||
  "sans-serif";

interface VideoProps extends TrimmableProps {
  aspectRatio: number;
  trim: ITrim;
  duration: number;
  src: string;
  metadata: Partial<IMetadata> & {
    previewUrl: string;
    name?: string;
    [key: string]: any;
  };
  hidden: boolean;
  volume: number;
}

class Video extends Trimmable {
  static type = "Video";
  private generation = 0;
  private initializedSource?: string;
  private disposedItem = false;
  declare id: string;
  public resourceId = "";
  declare tScale: number;
  public isSelected = false;
  declare display: IDisplay;
  declare trim: ITrim;
  declare playbackRate: number;
  public hasSrc = true;
  declare duration: number;
  public prevDuration: number;
  public itemType = "video";
  public metadata?: Partial<IMetadata> & { market?: boolean };
  declare src: string;

  public aspectRatio = 1;
  public scrollLeft = 0;
  public filmstripBacklogOptions?: FilmstripBacklogOptions;
  public thumbnailsPerSegment = 0;
  public segmentSize = 0;

  public offscreenSegments = 0;
  public thumbnailWidth = 0;
  public thumbnailHeight = 42;
  public thumbnailsList: { url: string; ts: number }[] = [];
  public isFetchingThumbnails = false;
  public thumbnailCache = new ThumbnailCache();

  public currentFilmstrip: Filmstrip = EMPTY_FILMSTRIP;
  public nextFilmstrip: Filmstrip = { ...EMPTY_FILMSTRIP, segmentIndex: 0 };
  public loadingFilmstrip: Filmstrip = EMPTY_FILMSTRIP;

  private offscreenCanvas: OffscreenCanvas | null = null;
  private offscreenCtx: OffscreenCanvasRenderingContext2D | null = null;

  private isDirty = true;

  private previewUrl = "";

  declare hidden: boolean;
  declare volume: number;
  public name: string = "Video";

  public isLoading = true;
  private loaderPath: Path2D | null = null;
  private loadingRotation = 0;
  private loadingAnimationFrameId: number | null = null;

  static createControls(): { controls: Record<string, Control> } {
    return { controls: createMediaControls() };
  }

  constructor(props: VideoProps) {
    super(props);
    this.id = props.id;
    this.tScale = props.tScale;
    this.objectCaching = false;
    this.rx = 4;
    this.ry = 4;
    this.display = props.display;
    this.trim = props.trim;
    this.duration = props.duration;
    this.prevDuration = props.duration;
    this.fill = "#2E1D12";
    this.borderOpacityWhenMoving = 1;
    this.metadata = props.metadata;

    this.aspectRatio = Number.isFinite(props.aspectRatio) && props.aspectRatio > 0 ? props.aspectRatio : 16 / 9;

    this.src = props.src;
    this.strokeWidth = 0;

    this.transparentCorners = false;
    this.hasBorders = false;

    this.previewUrl = props.metadata?.previewUrl ?? "";
    this.initOffscreenCanvas();
    void this.initialize();

    this.hidden = props.hidden ?? false;
    this.volume = props.volume ?? 100;
    this.name = props.metadata?.name || "Video";
    this.startLoadingAnimation();

    this.hoverCursor = "pointer";
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

  public initDimensions() {
    this.thumbnailWidth = Math.max(1, Math.min(512, this.thumbnailHeight * this.aspectRatio));

    const segmentOptions = calculateThumbnailSegmentLayout(this.thumbnailWidth);
    this.thumbnailsPerSegment = segmentOptions.thumbnailsPerSegment;
    this.segmentSize = segmentOptions.segmentSize;
  }

  public async initialize() {
    const generation = ++this.generation;
    this.initializedSource = this.src;
    if (this.src?.startsWith("pending-upload:")) return;
    if (isMissingMediaSource(this.src)) {
      this.isLoading = false;
      this.stopLoadingAnimation();
      this.canvas?.requestRenderAll();
      return;
    }
    // Older saved items contain the former still URL. Resolve their current
    // generated preview without rewriting project history or fetching originals.
    if (this.metadata?.market && !this.hasVideoPreview()) {
      const meta = this.metadata as Record<string, unknown>;
      if (typeof meta.market_asset_id === "string" && typeof meta.media_asset_id === "string") {
        try {
          const response = await fetch(`/api/market-assets/${encodeURIComponent(meta.market_asset_id)}/thumbnail?mediaAssetId=${encodeURIComponent(meta.media_asset_id)}`);
          if (response.ok) {
            const data = await response.json();
            if (generation === this.generation && typeof data.url === "string") this.previewUrl = data.url;
          }
        } catch { /* Keep the saved still if the preview is temporarily unavailable. */ }
      }
    }
    if (generation !== this.generation) return;
    await this.loadFallbackThumbnail(generation);
    if (generation !== this.generation) return;
    this.initDimensions();
    this.createFallbackPattern();
    this.isLoading = false;
    this.stopLoadingAnimation();
    this.canvas?.requestRenderAll();
    this.onScale();
  }

  private calculateFilmstripDimensions({
    segmentIndex,
    widthOnScreen
  }: {
    segmentIndex: number;
    widthOnScreen: number;
  }) {
    const filmstripOffset = segmentIndex * this.segmentSize;
    const shouldUseLeftBacklog = segmentIndex > 0;
    const leftBacklogSize = shouldUseLeftBacklog ? this.segmentSize : 0;

    const totalWidth = timeMsToUnits(
      this.duration,
      this.tScale,
      this.playbackRate
    );

    const rightRemainingSize =
      totalWidth - widthOnScreen - leftBacklogSize - filmstripOffset;
    const rightBacklogSize = Math.min(this.segmentSize, rightRemainingSize);

    const filmstripStartTime = unitsToTimeMs(filmstripOffset, this.tScale);
    const filmstrimpThumbnailsCount =
      1 +
      Math.round(
        (widthOnScreen + leftBacklogSize + rightBacklogSize) /
        this.thumbnailWidth
      );

    return {
      filmstripOffset,
      leftBacklogSize,
      rightBacklogSize,
      filmstripStartTime,
      filmstrimpThumbnailsCount
    };
  }

  // load fallback thumbnail, resize it and cache it
  private async loadFallbackThumbnail(generation: number) {
    const fallbackThumbnail = this.previewUrl;
    if (!fallbackThumbnail || this.hasVideoPreview()) return;

    return new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.src = fallbackThumbnail;

      img.onload = () => {
        if (generation !== this.generation) { resolve(); return; }
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve();
          return;
        }

        const aspectRatio = img.width / img.height;
        const targetHeight = 40;
        const targetWidth = Math.max(1, Math.min(512, Math.round(targetHeight * aspectRatio)));
        canvas.height = targetHeight;
        canvas.width = targetWidth;
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        const resizedImg = new Image();
        this.aspectRatio = aspectRatio;
        this.thumbnailWidth = targetWidth;
        resizedImg.onload = () => {
          if (generation === this.generation) this.thumbnailCache.setThumbnail("fallback", resizedImg);
          resolve();
        };
        resizedImg.onerror = () => resolve();
        resizedImg.src = canvas.toDataURL();
      };

      img.onerror = () => {
        // Failed to load (CORS, bad/corrupted src, network) — don't let
        // this block initialize() forever, just skip the fallback thumbnail.
        resolve();
      };
    });
  }

  private hasVideoPreview() {
    return /\/thumbnails\/video-5s-(?:320|480)\/[^?#]+\.mp4(?:[?#]|$)/.test(this.previewUrl || "");
  }

  private generateTimestamps(startTime: number, count: number): number[] {
    const timePerThumbnail = unitsToTimeMs(
      this.thumbnailWidth,
      this.tScale,
      this.playbackRate
    );

    return Array.from({ length: count }, (_, i) => {
      const timeInFilmstripe = startTime + i * timePerThumbnail;
      return Math.ceil(timeInFilmstripe / 1000);
    });
  }

  private createFallbackPattern() {
    const canvas = this.canvas;
    if (!canvas) return;

    const fallbackSource = this.thumbnailCache.getThumbnail("fallback");
    if (!fallbackSource || !fallbackSource.complete || !fallbackSource.naturalWidth) return;
    const tile = document.createElement("canvas");
    tile.width = Math.max(1, Math.round(this.thumbnailWidth));
    tile.height = this.thumbnailHeight;
    const context = tile.getContext("2d");
    if (!context) return;
    context.drawImage(fallbackSource, 0, 0, tile.width, tile.height);
    const fillPattern = new Pattern({ source: tile, repeat: "repeat-x", offsetX: 0 });

    this.set("fill", fillPattern);
    this.canvas?.requestRenderAll();
  }

  public async loadAndRenderThumbnails() {
    if (this.isFetchingThumbnails || this.isLoading || this.disposedItem) return;
    const src = this.metadata?.market ? (this.hasVideoPreview() ? this.previewUrl : "") : this.src;
    if (!src || isMissingMediaSource(src)) return;
    const generation = this.generation;
    const current = () => this.generation === generation && !this.disposedItem;
    const strip = this.nextFilmstrip;
    this.isFetchingThumbnails = true;
    try {
      const lastSecond = Math.max(0, Math.ceil(this.duration / 1000) - 1);
      const times = this.generateTimestamps(strip.startTime, strip.thumbnailsCount);
      const tiles = await videoFilmstrip(src, times.map(t => Math.min(t, lastSecond)),
        this.metadata?.market ? Math.max(0.001, this.duration / 1000) : undefined, current);
      if (!current()) return;
      for (const timestamp of new Set(times)) {
        const tile = tiles.get(Math.min(timestamp, lastSecond));
        if (tile) this.thumbnailCache.setThumbnail(timestamp, tile);
      }
      if (!this.thumbnailCache.getThumbnail("fallback") && tiles.size) {
        this.thumbnailCache.setThumbnail("fallback", tiles.values().next().value!);
        this.createFallbackPattern();
      }
    } catch {
      // A failed thumbnail must never interrupt timeline drawing or playback.
    } finally {
      if (current()) {
        this.currentFilmstrip = strip;
        this.isFetchingThumbnails = false;
        this.isDirty = true;
        this.canvas?.requestRenderAll();
        if (this.nextFilmstrip !== strip) void this.loadAndRenderThumbnails();
      }
    }
  }

  public _render(ctx: CanvasRenderingContext2D) {
    if (drawMissingMedia(ctx, this)) {
      ctx.save();
      ctx.globalAlpha *= 0.4;
      this.drawTextIdentity(ctx, true);
      ctx.restore();
      this.updateSelected(ctx);
      return;
    }
    super._render(ctx);
    if (!this.isLoading && !this.isFetchingThumbnails && this.currentFilmstrip.segmentIndex === undefined) {
      this.onScrollChange({ scrollLeft: this.scrollLeft });
    }

    ctx.save();
    ctx.translate(-this.width / 2, -this.height / 2);

    ctx.beginPath();
    ctx.roundRect(0, 0, this.width, this.height, this.rx);
    ctx.clip();

    this.renderToOffscreen();
    if (Math.floor(this.width) === 0) {
      ctx.restore();
      return;
    }
    if (!this.offscreenCanvas?.width || !this.offscreenCanvas.height) {
      ctx.restore();
      return;
    }
    ctx.drawImage(this.offscreenCanvas, 0, 0);

    ctx.restore();

    this.drawTextIdentity(ctx);
    this.updateSelected(ctx);
  }

  public drawTextIdentity(ctx: CanvasRenderingContext2D, missing = false) {
    const isLoading = !missing && this.isLoading;
    // dim overlay
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    ctx.restore();

    const iconCount =
      (isLoading ? 1 : 0) + (this.hidden ? 1 : 0) + (this.volume === 0 ? 1 : 0);
    const textX = getStickyLabelOffset(this) + 12 + iconCount * 24;

    ctx.save();
    ctx.translate(-this.width / 2, -this.height / 2);
    ctx.beginPath();
    ctx.rect(0, 0, this.width, this.height);
    ctx.clip();

    if (isLoading || this.hidden || this.volume === 0) {
      this.drawStatusIcons(ctx, missing);
    }

    ctx.font = `400 12px ${getUIFont()}`;
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255, 255, 255, 1)";
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 4;

    if (isLoading) {
      ctx.globalAlpha = 0.4;
    }
    ctx.fillText(missing ? `Missing media · ${this.name}` : this.name, textX, 22);

    ctx.restore();
  }

  public drawStatusIcons(ctx: CanvasRenderingContext2D, missing = false) {
    const isLoading = !missing && this.isLoading;
    const theme = (this.canvas as any)?.theme ?? "dark";
    const overlayColor = theme === "dark" ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,0.6)";
    const iconColor = theme === "dark" ? "rgba(255,255,255,1)" : "rgba(0,0,0,0.8)";

    if (this.hidden || isLoading) {
      ctx.save();
      ctx.fillStyle = overlayColor;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
    }

    let iconX = getStickyLabelOffset(this) + 12;

    if (isLoading) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      this.drawLoader(ctx, iconX);
      ctx.restore();
      iconX += 24;
    }

    if (this.hidden) {
      const eyeOffPath = new Path2D("M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22");
      ctx.save();
      ctx.translate(iconX, 10);
      ctx.strokeStyle = iconColor;
      ctx.lineWidth = 2;
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 4;
      ctx.scale(0.67, 0.67);
      ctx.stroke(eyeOffPath);
      ctx.restore();
      iconX += 24;
    }

    if (this.volume === 0) {
      const volumeOffPath = new Path2D("M16 9a5 5 0 0 1 .95 2.293M19.364 5.636a9 9 0 0 1 1.889 9.96M2 2l20 20M7 7l-.587.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298V11M9.828 4.172A.686.686 0 0 1 11 4.657v.686");
      ctx.save();
      ctx.translate(iconX, 10);
      ctx.strokeStyle = iconColor;
      ctx.lineWidth = 2;
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 8;
      ctx.scale(0.67, 0.67);
      ctx.stroke(volumeOffPath);
      ctx.restore();
    }
  }

  public setDuration(duration: number) {
    this.duration = duration;
    this.prevDuration = duration;
  }

  public async setSrc(src: string) {
    if (this.initializedSource === src) return;
    super.setSrc(src);
    this.isFetchingThumbnails = false;
    this.thumbnailCache.clearCache();
    this.isLoading = true;
    this.startLoadingAnimation();
    this.canvas?.requestRenderAll();
    await this.initialize();
  }

  public dispose() {
    this.disposedItem = true;
    this.generation++;
    this.stopLoadingAnimation();
    this.thumbnailCache.clearCache();
    super.dispose();
  }

  public onResizeSnap() {
    this.renderToOffscreen(true);
  }

  public onResize() {
    this.renderToOffscreen(true);
  }

  public renderToOffscreen(force?: boolean) {
    if (!this.offscreenCtx) return;
    if (!this.isDirty && !force) return;

    if (!this.offscreenCanvas) return;
    this.offscreenCanvas.width = this.width;
    const ctx = this.offscreenCtx;
    const { startTime, offset, thumbnailsCount } = this.currentFilmstrip;
    const thumbnailWidth = this.thumbnailWidth;
    const thumbnailHeight = this.thumbnailHeight;
    // Calculate the offset caused by the trimming
    const trimFromSize = timeMsToUnits(
      this.trim.from,
      this.tScale,
      this.playbackRate
    );

    let timeInFilmstripe = startTime;
    const timePerThumbnail = unitsToTimeMs(
      thumbnailWidth,
      this.tScale,
      this.playbackRate || 1
    );

    // Clear the offscreen canvas
    ctx.clearRect(0, 0, this.width, this.height);

    // Clip with rounded corners
    ctx.beginPath();
    ctx.roundRect(0, 0, this.width, this.height, this.rx);
    ctx.clip();
    // Draw thumbnails
    for (let i = 0; i < thumbnailsCount; i++) {
      let img = this.thumbnailCache.getThumbnail(
        Math.ceil(timeInFilmstripe / 1000)
      );

      if (!img) {
        img = this.thumbnailCache.getThumbnail("fallback");
      }

      if (img?.complete) {
        const xPosition = i * thumbnailWidth + offset - trimFromSize;

        ctx.drawImage(img, xPosition, 0, thumbnailWidth, thumbnailHeight);
      }
      timeInFilmstripe += timePerThumbnail;
    }

    this.isDirty = false;
  }

  public setSelected(selected: boolean) {
    this.isSelected = selected;
    this.set({ dirty: true });
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
    ctx.rect(-this.width / 2, -this.height / 2, this.width, this.height);

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

  public calulateWidthOnScreen() {
    const canvasEl = document.getElementById("designcombo-timeline-canvas");
    const canvasWidth = canvasEl?.clientWidth;
    const scrollLeft = this.scrollLeft;
    if (!canvasWidth) return 0;
    const timelineWidth = canvasWidth;
    const cutFromBottomEdge = Math.max(
      timelineWidth - (this.width + this.left + scrollLeft),
      0
    );
    const visibleHeight = Math.min(
      timelineWidth - this.left - scrollLeft,
      timelineWidth
    );

    return Math.max(visibleHeight - cutFromBottomEdge, 0);
  }

  // Calculate the width that is not visible on the screen measured from the left
  public calculateOffscreenWidth({ scrollLeft }: { scrollLeft: number }) {
    const offscreenWidth = Math.min(this.left + scrollLeft, 0);

    return Math.abs(offscreenWidth);
  }

  public onScrollChange({
    scrollLeft,
    force
  }: {
    scrollLeft: number;
    force?: boolean;
  }) {
    this.scrollLeft = scrollLeft;
    if (this.isLoading || this.disposedItem || !this.segmentSize || this.calulateWidthOnScreen() <= 0) return;
    const offscreenWidth = this.calculateOffscreenWidth({ scrollLeft });
    const trimFromSize = timeMsToUnits(
      this.trim.from,
      this.tScale,
      this.playbackRate
    );

    const offscreenSegments = calculateOffscreenSegments(
      offscreenWidth,
      trimFromSize,
      this.segmentSize
    );

    this.offscreenSegments = offscreenSegments;

    // calculate start segment to draw
    const segmentToDraw = offscreenSegments;

    if (!force && this.currentFilmstrip.segmentIndex === segmentToDraw && !this.isFetchingThumbnails) {
      return false;
    }

    const widthOnScreen = this.calulateWidthOnScreen();
    const { filmstripOffset, filmstripStartTime, filmstrimpThumbnailsCount } =
      this.calculateFilmstripDimensions({
        widthOnScreen,
        segmentIndex: segmentToDraw
      });

    this.nextFilmstrip = {
      segmentIndex: segmentToDraw,
      offset: filmstripOffset,
      startTime: filmstripStartTime,
      thumbnailsCount: filmstrimpThumbnailsCount,
      widthOnScreen
    };

    this.loadAndRenderThumbnails();
  }

  public onScale() {
    this.currentFilmstrip = { ...EMPTY_FILMSTRIP };
    this.nextFilmstrip = { ...EMPTY_FILMSTRIP, segmentIndex: 0 };
    this.loadingFilmstrip = { ...EMPTY_FILMSTRIP };
    this.onScrollChange({ scrollLeft: this.scrollLeft, force: true });
  }

  private drawLoader(ctx: CanvasRenderingContext2D, iconX: number) {
    if (!this.loaderPath) {
      this.loaderPath = new Path2D("M21 12a9 9 0 1 1-6.219-8.56");
    }

    ctx.save();
    ctx.translate(iconX, 10);
    ctx.scale(0.67, 0.67);
    ctx.translate(12, 12);
    ctx.rotate((this.loadingRotation * Math.PI) / 180);
    ctx.translate(-12, -12);
    ctx.strokeStyle = "rgba(255,255,255,1)";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke(this.loaderPath);
    ctx.restore();
  }

  private startLoadingAnimation() {
    if (this.loadingAnimationFrameId !== null || this.disposedItem) return;
    const animate = () => {
      if (!this.isLoading) {
        this.loadingAnimationFrameId = null;
        return;
      }
      this.loadingRotation = (this.loadingRotation + 8) % 360;
      this.canvas?.requestRenderAll();
      this.loadingAnimationFrameId = requestAnimationFrame(animate);
    };
    this.loadingAnimationFrameId = requestAnimationFrame(animate);
  }

  private stopLoadingAnimation() {
    if (this.loadingAnimationFrameId !== null) {
      cancelAnimationFrame(this.loadingAnimationFrameId);
      this.loadingAnimationFrameId = null;
    }
  }
}

export default Video;
