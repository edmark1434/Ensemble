import { Control, Resizable, ResizableProps } from "@designcombo/timeline";
import { IDisplay } from "@designcombo/types";
import { createResizeControls } from "../controls";
import { SECONDARY_FONT } from "../../constants/constants";

interface TextProps extends ResizableProps {
  text: string;
  tScale: number;
  display: IDisplay;
}
class Text extends Resizable {
  static type = "Text";
  declare id: string;
  declare text: string;
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
    ctx.font = `400 12px ${SECONDARY_FONT}`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.textAlign = "left";
    ctx.clip();
    ctx.fillText(this.text, 12, 20);

    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.restore();
  }

  public updateSelected(ctx: CanvasRenderingContext2D) {
    const borderColor = this.isSelected
      ? "rgba(255, 255, 255,1.0)"
      : "rgba(255, 255, 255,0.05)";
    const borderWidth = 2;
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

export default Text;
