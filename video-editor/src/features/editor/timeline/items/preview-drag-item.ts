import {
  PreviewTrackItem as PreviewTrackItemBase,
  PreviewTrackItemProps
} from "@designcombo/timeline";

const getUIFont = () =>
  getComputedStyle(document.body).getPropertyValue("--font-outfit").trim() ||
  "sans-serif";

const getCardColor = () =>
  getComputedStyle(document.documentElement).getPropertyValue("--card").trim() || "#000000";

const FILL_COLORS: Record<string, string> = {
  text: "#201630",
  audio: "#2D1625",
  image: "#2E1D12",
  video: "#2E1D12",
  caption: "#1B272C",
};

const ITEM_NAMES: Record<string, string> = {
  text: "Text",
  audio: "Audio",
  image: "Image",
  video: "Video",
  caption: "Caption",
};

const FADEABLE_TYPES = new Set(["audio", "video"]);
const FADE_WIDTH = 96;
const MAX_FADE_RATIO = 0.4; // fade zone never eats more than 40% of the item

class PreviewTrackItem extends PreviewTrackItemBase {
  static type = "PreviewTrackItem";

  constructor(props: PreviewTrackItemProps) {
    super(props);
    this.fill = "transparent"; // real fill is hand-painted in _render
    this.stroke = "transparent";
    this.rx = 4;
    this.ry = 4;
  }

  private getBaseFill(): string {
    return `color-mix(in srgb, ${getCardColor()}, ${FILL_COLORS[this.itemType] ?? "#27272A"} 50%)`;
  }

  private getFadeWidth(): number {
    return Math.min(FADE_WIDTH, this.width * MAX_FADE_RATIO);
  }

  public drawFill(ctx: CanvasRenderingContext2D) {
    if (this.width <= 0 || this.height <= 0) return;

    ctx.save();
    ctx.translate(-this.width / 2, -this.height / 2);

    ctx.beginPath();
    ctx.roundRect(0, 0, this.width, this.height, this.rx ?? 4);

    if (FADEABLE_TYPES.has(this.itemType)) {
      const baseFill = this.getBaseFill();
      const fadeWidth = this.getFadeWidth();
      const solidStop = Math.max(0, 1 - fadeWidth / this.width);

      const gradient = ctx.createLinearGradient(0, 0, this.width, 0);
      gradient.addColorStop(0, baseFill);
      gradient.addColorStop(solidStop, baseFill);
      gradient.addColorStop(1, "rgba(1, 1, 1, 0)");

      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = this.getBaseFill();
    }

    ctx.fill();
    ctx.restore();
  }

  public _render(ctx: CanvasRenderingContext2D) {
    this.drawFill(ctx);      // paint background first
    super._render(ctx);      // fill is transparent, so this only draws text/thumbnail on top
    this.updateSelected(ctx);
  }

  public drawTextIdentity(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(-this.width / 2, -this.height / 2);
    ctx.font = `400 12px ${getUIFont()}`;
    ctx.fillStyle = "rgba(255, 255, 255, 1)";
    ctx.textAlign = "left";
    ctx.clip();
    ctx.fillText(
      ITEM_NAMES[this.itemType] ?? "Item",
      12,
      this.itemType === "text" || this.itemType === "caption" ? 20 : 22
    );
    ctx.restore();
  }

  public updateSelected(ctx: CanvasRenderingContext2D) {
    const borderWidth = 1;
    const innerRadius = 4;

    ctx.save();
    ctx.lineWidth = borderWidth;
    ctx.setLineDash([5, 0]);

    const fadeWidth = FADEABLE_TYPES.has(this.itemType) ? this.getFadeWidth() : 0;

    if (fadeWidth > 0) {
      const gradient = ctx.createLinearGradient(
        this.width / 2 - fadeWidth, 0,
        this.width / 2, 0
      );
      gradient.addColorStop(0, "rgba(255, 255, 255, 0.1)");
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.strokeStyle = gradient;
    } else {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    }

    ctx.beginPath();
    ctx.roundRect(
      -this.width / 2 + borderWidth / 2,
      -this.height / 2 + borderWidth / 2,
      this.width - borderWidth,
      this.height - borderWidth,
      innerRadius
    );
    ctx.stroke();

    ctx.restore();
  }
}

export default PreviewTrackItem;