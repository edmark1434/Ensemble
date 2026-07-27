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
import { getFileFromUrl } from "../../utils/file";
import { createMediaControls } from "../controls";

// Type declaration for MP4Clip to avoid SSR issues
type MP4ClipType = any;

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
  public clip?: MP4ClipType | null;
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
  public metadata?: Partial<IMetadata>;
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

  private fallbackSegmentIndex = 0;
  private fallbackSegmentsCount = 0;
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
    this.fill = "#27272a";
    this.borderOpacityWhenMoving = 1;
    this.metadata = props.metadata;

    this.aspectRatio = props.aspectRatio;

    this.src = props.src;
    this.strokeWidth = 0;

    this.transparentCorners = false;
    this.hasBorders = false;

    this.previewUrl = props.metadata.previewUrl;
    this.initOffscreenCanvas();
    this.initialize();

    this.hidden = props.hidden ?? false;
    this.volume = props.volume ?? 100;
    this.name = props.metadata?.name || "Video";
    this.startLoadingAnimation();
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
    this.thumbnailWidth = this.thumbnailHeight * this.aspectRatio;

    const segmentOptions = calculateThumbnailSegmentLayout(this.thumbnailWidth);
    this.thumbnailsPerSegment = segmentOptions.thumbnailsPerSegment;
    this.segmentSize = segmentOptions.segmentSize;
  }

  public async initialize() {
    await this.loadFallbackThumbnail();

    this.initDimensions();
    this.onScrollChange({ scrollLeft: 0 });

    this.canvas?.requestRenderAll();

    this.createFallbackPattern();
    await this.prepareAssets();

    this.isLoading = false;
    this.stopLoadingAnimation();
    this.canvas?.requestRenderAll();

    this.onScrollChange({ scrollLeft: 0 });
  }

  public async prepareAssets() {
    const file = await getFileFromUrl(this.src);
    const stream = file.stream();

    // Dynamically import MP4Clip only on the client side
    if (typeof window !== "undefined") {
      try {
        const { MP4Clip } = await import("@designcombo/frames");
        this.clip = new MP4Clip(stream);
      } catch (error) {
        console.warn("Failed to load MP4Clip:", error);
        this.clip = null;
      }
    } else {
      // Server-side rendering - skip MP4Clip initialization
      this.clip = null;
    }
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
  private async loadFallbackThumbnail() {
    const fallbackThumbnail = this.previewUrl;
    if (!fallbackThumbnail) return;

    return new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = `${fallbackThumbnail}?t=${Date.now()}`;
      img.onload = () => {
        // Create a temporary canvas to resize the image
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Calculate new width maintaining aspect ratio
        const aspectRatio = img.width / img.height;
        const targetHeight = 40;
        const targetWidth = Math.round(targetHeight * aspectRatio);
        // Set canvas size and draw resized image
        canvas.height = targetHeight;
        canvas.width = targetWidth;
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Create new image from resized canvas
        const resizedImg = new Image();
        resizedImg.src = canvas.toDataURL();
        // Update aspect ratio and cache the resized image
        this.aspectRatio = aspectRatio;
        this.thumbnailWidth = targetWidth;
        this.thumbnailCache.setThumbnail("fallback", resizedImg);
        resolve();
      };
    });
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

    const canvasWidth = canvas.width;
    const maxPatternSize = 12000;
    const fallbackSource = this.thumbnailCache.getThumbnail("fallback");

    if (!fallbackSource) return;

    // Compute the total width and number of segments needed
    const totalWidthNeeded = Math.min(canvasWidth * 20, maxPatternSize);
    const segmentsRequired = Math.ceil(totalWidthNeeded / this.segmentSize);
    this.fallbackSegmentsCount = segmentsRequired;
    const patternWidth = segmentsRequired * this.segmentSize;

    // Setup canvas dimensions
    const offCanvas = document.createElement("canvas");
    offCanvas.height = this.thumbnailHeight;
    offCanvas.width = patternWidth;

    const context = offCanvas.getContext("2d");
    if (!context) return;
    const thumbnailsTotal = segmentsRequired * this.thumbnailsPerSegment;

    // Draw the fallback image across the entirety of the canvas horizontally
    for (let i = 0; i < thumbnailsTotal; i++) {
      const x = i * this.thumbnailWidth;
      context.drawImage(
        fallbackSource,
        x,
        0,
        this.thumbnailWidth,
        this.thumbnailHeight
      );
    }

    // Create the pattern and apply it
    const fillPattern = new Pattern({
      source: offCanvas,
      repeat: "no-repeat",
      offsetX: 0
    });

    this.set("fill", fillPattern);
    this.canvas?.requestRenderAll();
  }
  public async loadAndRenderThumbnails() {
    if (this.isFetchingThumbnails || !this.clip) return;
    // set segmentDrawn to segmentToDraw
    this.loadingFilmstrip = { ...this.nextFilmstrip };
    this.isFetchingThumbnails = true;

    // Calculate dimensions and offsets
    const { startTime, thumbnailsCount } = this.loadingFilmstrip;

    // Generate required timestamps
    const timestamps = this.generateTimestamps(startTime, thumbnailsCount);

    // Match and prepare thumbnails
    const thumbnailsArr = await this.clip.thumbnailsList(this.thumbnailWidth, {
      timestamps: timestamps.map((timestamp) => timestamp * 1e6)
    });

    const updatedThumbnails = thumbnailsArr.map(
      (thumbnail: { ts: number; img: Blob }) => {
        return {
          ts: Math.round(thumbnail.ts / 1e6),
          img: thumbnail.img
        };
      }
    );

    // Load all thumbnails in parallel
    await this.loadThumbnailBatch(updatedThumbnails);

    this.isDirty = true; // Mark as dirty after preparing new thumbnails
    // this.isFallbackDirty = true;
    this.isFetchingThumbnails = false;

    this.currentFilmstrip = { ...this.loadingFilmstrip };

    requestAnimationFrame(() => {
      this.canvas?.requestRenderAll();
    });
  }

  private async loadThumbnailBatch(thumbnails: { ts: number; img: Blob }[]) {
    const loadPromises = thumbnails.map(async (thumbnail) => {
      if (this.thumbnailCache.getThumbnail(thumbnail.ts)) return;

      return new Promise<void>((resolve) => {
        const img = new Image();
        img.src = URL.createObjectURL(thumbnail.img);
        img.onload = () => {
          URL.revokeObjectURL(img.src); // Clean up the blob URL after image loads
          this.thumbnailCache.setThumbnail(thumbnail.ts, img);
          resolve();
        };
      });
    });

    await Promise.all(loadPromises);
  }

  public _render(ctx: CanvasRenderingContext2D) {
    super._render(ctx);

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
    if (!this.offscreenCanvas) {
      ctx.restore();
      return;
    }
    ctx.drawImage(this.offscreenCanvas, 0, 0);

    ctx.restore();

    this.drawTextIdentity(ctx);
    this.updateSelected(ctx);
  }

  public drawTextIdentity(ctx: CanvasRenderingContext2D) {
    // dim overlay
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    ctx.restore();

    if (this.isLoading || this.hidden || this.volume === 0) {
      this.drawStatusIcons(ctx);
    }

    const iconCount =
      (this.isLoading ? 1 : 0) + (this.hidden ? 1 : 0) + (this.volume === 0 ? 1 : 0);
    const textX = 12 + iconCount * 24;

    ctx.save();
    ctx.translate(-this.width / 2, -this.height / 2);
    ctx.beginPath();
    ctx.rect(0, 0, this.width, this.height);
    ctx.clip();

    ctx.font = `400 12px ${getUIFont()}`;
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255, 255, 255, 1)";
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 4;

    ctx.fillText(this.name, textX, 22);

    ctx.restore();
  }

  public drawStatusIcons(ctx: CanvasRenderingContext2D) {
    const theme = (this.canvas as any)?.theme ?? "dark";
    const overlayColor = theme === "dark" ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,0.6)";
    const iconColor = theme === "dark" ? "rgba(255,255,255,1)" : "rgba(0,0,0,0.8)";

    if (this.hidden) {
      ctx.save();
      ctx.fillStyle = overlayColor;
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
      ctx.restore();
    }

    let iconX = -this.width / 2 + 12;

    if (this.isLoading) {
      this.drawLoader(ctx, iconX);
      iconX += 24;
    }

    if (this.hidden) {
      const eyeOffPath = new Path2D("M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22");
      ctx.save();
      ctx.translate(iconX, -this.height / 2 + 10);
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
      ctx.translate(iconX, -this.height / 2 + 10);
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
    super.setSrc(src);
    this.clip = null;
    this.isLoading = true;
    this.startLoadingAnimation();
    this.canvas?.requestRenderAll();
    await this.initialize();
    await this.prepareAssets();
    this.thumbnailCache.clearCacheButFallback();
    this.onScale();
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
        timeInFilmstripe += timePerThumbnail;
      }
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

    if (this.currentFilmstrip.segmentIndex === segmentToDraw) {
      return false;
    }

    if (segmentToDraw !== this.fallbackSegmentIndex) {
      const fillPattern = this.fill as Pattern;
      if (fillPattern instanceof Pattern) {
        fillPattern.offsetX =
          this.segmentSize *
          (segmentToDraw - Math.floor(this.fallbackSegmentsCount / 2));
      }

      this.fallbackSegmentIndex = segmentToDraw;
    }
    if (!this.isFetchingThumbnails || force) {
      this.scrollLeft = scrollLeft;
      const widthOnScreen = this.calulateWidthOnScreen();
      // With these lines:
      const { filmstripOffset, filmstripStartTime, filmstrimpThumbnailsCount } =
        this.calculateFilmstripDimensions({
          widthOnScreen: this.calulateWidthOnScreen(),
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
    ctx.translate(iconX, -this.height / 2 + 10);
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
