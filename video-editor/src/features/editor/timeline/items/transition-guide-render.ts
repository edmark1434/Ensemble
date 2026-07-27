import { Rect } from "@designcombo/timeline";
import { drawArrowIcon, drawSelectionBorder } from "./transition-visuals";

export function patchTransitionGuideRender(canvas: any) {
  const onAdded = (e: any) => {
    const target = e.target;
    if (!target || target.type !== "transitionguide") return;

    const proto = Object.getPrototypeOf(target);
    if (!proto.__patchedRender) {
      proto._render = function (ctx: CanvasRenderingContext2D) {
        this.fill = "rgba(255, 255, 255, 0.75)";
        Rect.prototype._render.call(this, ctx);

        ctx.save();
        ctx.translate(-this.width / 2, -this.height / 2);
        ctx.beginPath();
        ctx.rect(0, 0, this.width, this.height);
        ctx.clip();
        drawArrowIcon(ctx, this.width / 2, this.height / 2);
        ctx.restore();

        drawSelectionBorder(ctx, this);
      };
      proto.__patchedRender = true;
    }

    canvas.off("object:added", onAdded);
  };

  canvas.on("object:added", onAdded);
}