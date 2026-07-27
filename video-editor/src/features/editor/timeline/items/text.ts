import { Control, Resizable, ResizableProps } from "@designcombo/timeline";
import { IDisplay } from "@designcombo/types";
import { createResizeControls } from "../controls";

interface TextProps extends ResizableProps {
  text: string;
  tScale: number;
  display: IDisplay;
  hidden: boolean;
}

const getUIFont = () =>
  getComputedStyle(document.body).getPropertyValue("--font-plus-jakarta-sans").trim() ||
  "sans-serif";

class Text extends Resizable {
  static type = "Text";
  declare id: string;
  declare text: string;
  declare hidden: boolean;

  static createControls(): { controls: Record<string, Control> } {
    return { controls: createResizeControls() };
  }

  constructor(props: TextProps) {
    super(props);
    this.fill = "#201630";
    this.id = props.id;
    this.borderColor = "transparent";
    this.stroke = "transparent";
    this.text = props.text;
    this.hidden = props.hidden ?? false;
    // this.rx = 0;
    // this.ry = 0;
  }

  public _render(ctx: CanvasRenderingContext2D) {
    super._render(ctx);
    this.drawTextIdentity(ctx);
    this.updateSelected(ctx);
  }

  public drawTextIdentity(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(-this.width / 2, -this.height / 2);
    ctx.font = `400 12px ${getUIFont()}`;
    ctx.fillStyle = "rgba(255, 255, 255,1)";
    ctx.textAlign = "left";
    ctx.clip();

    if (this.hidden) {
      ctx.save();
      ctx.translate(12, 8);
      ctx.strokeStyle = "rgba(255,255,255,1)";
      ctx.lineWidth = 2;
      ctx.scale(0.67, 0.67);
      const eyeOffPath = new Path2D("M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22");
      ctx.stroke(eyeOffPath);
      ctx.restore();
      ctx.fillText(this.text, 36, 20);
    } else {
      ctx.fillText(this.text, 12, 20);
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
}

export default Text;
