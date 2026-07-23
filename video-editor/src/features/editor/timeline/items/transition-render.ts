// features/editor/timeline/items/transition-render.ts
import { Transition } from "@designcombo/timeline";
import {createResizeControls, createTransitionControls} from "../controls";

// lucide "arrow-big-right-dash" paths (24x24 viewBox)
const ARROW_ICON_PATHS = [
  "M11 9a1 1 0 0 0 1-1V4.707a.707.707 0 0 1 1.207-.5l6.94 6.94a1.207 1.207 0 0 1 0 1.707l-6.94 6.94a.707.707 0 0 1-1.207-.5V16a1 1 0 0 0-1-1H9a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1z",
  "M4 9v6",
];
const ICON_SIZE = 18; // rendered px size; source viewBox is 24x24

function drawArrowIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const scale = ICON_SIZE / 24;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(-12, -12);
  ctx.strokeStyle = "rgba(0, 0, 0, 1)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const d of ARROW_ICON_PATHS) {
    ctx.stroke(new Path2D(d));
  }
  ctx.restore();
}

// mirrors Text.updateSelected so transitions get the same selection chrome
function drawSelectionBorder(ctx: CanvasRenderingContext2D, item: any) {
  const borderColor = item.isSelected
    ? "rgba(255, 255, 255, 1.0)"
    : "rgba(255, 255, 255, 0.05)";
  const borderWidth = 1;
  const innerRadius = 4;

  ctx.save();
  ctx.fillStyle = borderColor;

  ctx.beginPath();
  if (item.isSelected) {
    ctx.rect(-item.width / 2, -item.height / 2, item.width, item.height);
  } else {
    ctx.roundRect(-item.width / 2, -item.height / 2, item.width, item.height, innerRadius);
  }

  ctx.roundRect(
    -item.width / 2 + borderWidth,
    -item.height / 2 + borderWidth,
    item.width - borderWidth * 2,
    item.height - borderWidth * 2,
    innerRadius
  );

  ctx.fill("evenodd");
  ctx.restore();
}

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