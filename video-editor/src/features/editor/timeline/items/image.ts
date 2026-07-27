import {
  Resizable,
  ResizableProps,
  Pattern,
  util,
  Control
} from "@designcombo/timeline";
import { createResizeControls } from "../controls";

interface ImageProps extends ResizableProps {
  src: string;
  hidden: boolean;
  metadata?: { name?: string; [key: string]: any };
}

const getUIFont = () =>
  getComputedStyle(document.body).getPropertyValue("--font-plus-jakarta-sans").trim() ||
  "sans-serif";

class Image extends Resizable {
  static type = "Image";
  public src: string;
  public hasSrc = true;
  declare hidden: boolean;
  public name: string = "Image";

  static createControls(): { controls: Record<string, Control> } {
    return { controls: createResizeControls() };
  }

  constructor(props: ImageProps) {
    super(props);
    this.id = props.id;
    this.src = props.src;
    this.display = props.display;
    this.tScale = props.tScale;
    this.hidden = props.hidden ?? false;
    this.loadImage();
    this.rx = 4;
    this.ry = 4;
    this.name = props.metadata?.name || "Image";
  }

  public _render(ctx: CanvasRenderingContext2D) {
    super._render(ctx);
    this.drawTextIdentity(ctx);
    this.updateSelected(ctx);
  }

  public drawTextIdentity(ctx: CanvasRenderingContext2D) {
    // dim overlay
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    ctx.restore();

    if (this.hidden) this.drawHiddenIcon(ctx);

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

    if (this.hidden) {
      ctx.fillText(this.name, 36, 22);
    } else {
      ctx.fillText(this.name, 12, 22);
    }

    ctx.restore();
  }

  public drawHiddenIcon(ctx: CanvasRenderingContext2D) {
    // dim overlay
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    ctx.restore();

    // icon
    const eyeOffPath = new Path2D("M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22");
    ctx.save();
    ctx.translate(-this.width / 2 + 12, -this.height / 2 + 10);
    ctx.strokeStyle = "rgba(255,255,255,1)";
    ctx.lineWidth = 2;
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 8;
    ctx.scale(0.67, 0.67);
    ctx.stroke(eyeOffPath);
    ctx.restore();
  }

  public loadImage() {
    util.loadImage(this.src).then((img) => {
      const imgHeight = img.height;
      const rectHeight = this.height;
      const scaleY = rectHeight / imgHeight;
      const pattern = new Pattern({
        source: img,
        repeat: "repeat-x",
        patternTransform: [scaleY, 0, 0, scaleY, 0, 0]
      });
      this.set("fill", pattern);
      this.canvas?.requestRenderAll();
    });
  }

  public setSrc(src: string) {
    this.src = src;
    this.loadImage();
    this.canvas?.requestRenderAll();
  }

  public updateSelected(ctx: CanvasRenderingContext2D) {
    const borderColor = this.isSelected
      ? "rgba(255, 255, 255,1)"
      : "rgba(255, 255, 255,0)";
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
}

export default Image;
