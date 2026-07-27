// features/editor/timeline/items/transition-render.ts
import { Transition } from "@designcombo/timeline";
import {createResizeControls, createTransitionControls} from "../controls";
import {drawArrowIcon, drawSelectionBorder} from "./transition-visuals";

if (!(Transition.prototype as any).__patchedRender) {
  const baseRender = Transition.prototype._render;

  Transition.prototype._render = function (ctx: CanvasRenderingContext2D) {
    // white translucent fill instead of the library's default black translucent
    this.fill = "rgba(255, 255, 255, 0.75)";

    baseRender.call(this, ctx); // keeps the built-in shape geometry

    if (this.kind !== "none") {
      ctx.save();
      ctx.translate(-this.width / 2, -this.height / 2);
      ctx.beginPath();
      ctx.rect(0, 0, this.width, this.height);
      ctx.clip();
      drawArrowIcon(ctx, this.width / 2, this.height / 2);
      ctx.restore();
    }

    // match Text's selection look instead of the library's default outline
    drawSelectionBorder(ctx, this);
  };

  // match Text's drag/resize handles too
  (Transition as any).createControls = () => ({ controls: createTransitionControls() });

  (Transition.prototype as any).__patchedRender = true;
}