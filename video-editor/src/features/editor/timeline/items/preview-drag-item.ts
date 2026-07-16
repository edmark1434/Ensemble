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

// const ITEM_NAMES: Record<string, string> = {
//   text: "Text",
//   audio: "Audio",
//   image: "Image",
//   video: "Video",
//   caption: "Caption",
// };

class PreviewTrackItem extends PreviewTrackItemBase {
  static type = "PreviewTrackItem";

  constructor(props: PreviewTrackItemProps) {
    super(props);
    this.fill = `color-mix(in srgb, ${getCardColor()}, ${FILL_COLORS[this.itemType] ?? "#27272A"} 50%)`;
    this.stroke = "transparent";
    this.rx = 4;
    this.ry = 4;
  }

  public _render(ctx: CanvasRenderingContext2D) {
    super._render(ctx);
    this.updateSelected(ctx);
  }

  public drawTextIdentity(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(-this.width / 2, -this.height / 2);
    ctx.font = `400 12px ${getUIFont()}`;
    ctx.fillStyle = "rgba(255, 255, 255, 1)";
    ctx.textAlign = "left";
    ctx.clip();
    // ctx.fillText(ITEM_NAMES[this.itemType] ?? "Item", 12, 20);
    ctx.restore();
  }

  public updateSelected(ctx: CanvasRenderingContext2D) {
    const borderColor = "rgba(255, 255, 255, 0.1)";
    const borderWidth = 1;
    const innerRadius = 4;

    ctx.save();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;
    ctx.setLineDash([5, 0]);

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