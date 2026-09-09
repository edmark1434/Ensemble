import { Resizable, ResizableProps, Control, timeMsToUnits } from "@designcombo/timeline";
import {DEFAULT_SCENE_DURATION_MS} from "@/features/editor/types/ensemble-scene";

interface SceneProps extends ResizableProps {
  hidden: boolean;
  volume?: number;
  metadata?: { name?: string; [key: string]: any };
  details?: { blockId?: string; name?: string; [key: string]: any };
}

const getUIFont = () =>
  getComputedStyle(document.body).getPropertyValue("--font-plus-jakarta-sans").trim() ||
  "sans-serif";

class Scene extends Resizable {
  static type = "Scene";
  public name: string = "Scene";
  public blockId?: string;
  public contentDurationMs = 0;

  private stripePattern: CanvasPattern | null = null;

  declare hidden: boolean;
  public volume: number = 100;
  private componentIconPaths: Path2D[] | null = null;

  // No entries here — this is what removes every corner/edge drag handle.
  // Movement along the timeline (repositioning `display.from`) still works,
  // since that's driven by plain object dragging, not a control point.
  static createControls(): { controls: Record<string, Control> } {
    return { controls: {} };
  }

  constructor(props: SceneProps) {
    super(props);
    this.id = props.id;
    this.display = props.display;
    this.tScale = props.tScale;
    this.hidden = props.hidden ?? false;
    this.volume = props.volume ?? 100;

    // Belt-and-suspenders alongside the empty controls map above — some
    // fabric interactions (keyboard nudge-scale, programmatic setControlsVisibility)
    // don't go through Control objects at all.
    this.hasControls = false;
    this.lockScalingX = true;
    this.lockScalingY = true;

    this.fill = "#151E32";
    this.rx = 4;
    this.ry = 4;
    this.name = props.metadata?.name || props.details?.name || "Scene";
    this.blockId = props.details?.blockId;
  }

  // Call this when the nested block's actual content duration is known —
  // e.g. from a subscription to the block doc's own meta.duration, or the
  // max display.to across its trackItemIds. This resizes the fabric object
  // immediately for local visual feedback; it does NOT write back to
  // trackItemsMap/display.to on its own. That write-back needs to go
  // through stateManager.updateState from whatever's watching the nested
  // doc, the same way a real resize gesture would — see note below.
  public setContentDuration(durationMs: number) {
    this.contentDurationMs = durationMs;
    const effectiveMs = durationMs > 0 ? durationMs : DEFAULT_SCENE_DURATION_MS;
    this.width = timeMsToUnits(effectiveMs, this.tScale);
    this.setCoords();
    this.dirty = true;
    this.canvas?.requestRenderAll();
  }

  public _render(ctx: CanvasRenderingContext2D) {
    super._render(ctx);
    this.drawStripes(ctx);
    this.drawTextIdentity(ctx);
    this.updateSelected(ctx);
  }

  // Diagonal hatch, drawn at low opacity over the flat fill — the
  // permanent tell that this clip is a container/portal, not decoded
  // media. Image/Video's textures (bitmap pattern, filmstrip) both read as
  // "this holds actual pixels"; stripes read as "this holds other clips."
  private drawStripes(ctx: CanvasRenderingContext2D) {
    if (!this.stripePattern) {
      const tile = document.createElement("canvas");
      tile.width = 12;
      tile.height = 12;
      const tctx = tile.getContext("2d")!;
      tctx.strokeStyle = "rgba(255,255,255,0.08)";
      tctx.lineWidth = 3;
      tctx.beginPath();
      tctx.moveTo(-3, 15);
      tctx.lineTo(15, -3);
      tctx.stroke();
      this.stripePattern = ctx.createPattern(tile, "repeat");
    }
    ctx.save();
    ctx.fillStyle = this.stripePattern ?? "transparent";
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    ctx.restore();
  }

  public drawTextIdentity(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    ctx.restore();

    // Status row always renders — the component glyph is a permanent identity
    // cue, not a transient state like Video/Image's loading spinner.
    this.drawStatusIcons(ctx);

    const iconCount = 1 + (this.hidden ? 1 : 0) + (this.volume === 0 ? 1 : 0);
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
    ctx.fillText(this.name, textX, 23);

    ctx.restore();
  }

  public drawStatusIcons(ctx: CanvasRenderingContext2D) {
    // Extra dark backdrop only for hidden, same as Video/Image — a muted-only
    // Scene keeps the lighter dim overlay from drawTextIdentity.
    if (this.hidden) {
      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
      ctx.restore();
    }

    let iconX = -this.width / 2 + 12;

    this.drawComponentIcon(ctx, iconX);
    iconX += 24;

    if (this.hidden) {
      const eyeOffPath = new Path2D(
        "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"
      );
      ctx.save();
      ctx.translate(iconX, -this.height / 2 + 10);
      ctx.strokeStyle = "rgba(255,255,255,1)";
      ctx.lineWidth = 2;
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 8;
      ctx.scale(0.67, 0.67);
      ctx.stroke(eyeOffPath);
      ctx.restore();
      iconX += 24;
    }

    if (this.volume === 0) {
      const volumeOffPath = new Path2D(
        "M16 9a5 5 0 0 1 .95 2.293M19.364 5.636a9 9 0 0 1 1.889 9.96M2 2l20 20M7 7l-.587.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298V11M9.828 4.172A.686.686 0 0 1 11 4.657v.686"
      );
      ctx.save();
      ctx.translate(iconX, -this.height / 2 + 10);
      ctx.strokeStyle = "rgba(255,255,255,1)";
      ctx.lineWidth = 2;
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 8;
      ctx.scale(0.67, 0.67);
      ctx.stroke(volumeOffPath);
      ctx.restore();
    }
  }

  // Lucide's "Component" icon (four rounded diamonds around a shared center) —
  // drawn from the library's own path data so it reads as the same glyph
  // used anywhere else Component appears, rather than a lookalike.
  private drawComponentIcon(ctx: CanvasRenderingContext2D, iconX: number) {
    if (!this.componentIconPaths) {
      this.componentIconPaths = [
        new Path2D("M15.536 11.293a1 1 0 0 0 0 1.414l2.376 2.377a1 1 0 0 0 1.414 0l2.377-2.377a1 1 0 0 0 0-1.414l-2.377-2.377a1 1 0 0 0-1.414 0z"),
        new Path2D("M2.297 11.293a1 1 0 0 0 0 1.414l2.377 2.377a1 1 0 0 0 1.414 0l2.377-2.377a1 1 0 0 0 0-1.414L6.088 8.916a1 1 0 0 0-1.414 0z"),
        new Path2D("M8.916 17.912a1 1 0 0 0 0 1.415l2.377 2.376a1 1 0 0 0 1.414 0l2.377-2.376a1 1 0 0 0 0-1.415l-2.377-2.376a1 1 0 0 0-1.414 0z"),
        new Path2D("M8.916 4.674a1 1 0 0 0 0 1.414l2.377 2.376a1 1 0 0 0 1.414 0l2.377-2.376a1 1 0 0 0 0-1.414l-2.377-2.377a1 1 0 0 0-1.414 0z"),
      ];
    }
    ctx.save();
    ctx.translate(iconX, -this.height / 2 + 10);
    ctx.strokeStyle = "rgba(255,255,255,1)";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 4;
    ctx.scale(0.67, 0.67);
    this.componentIconPaths.forEach((path) => ctx.stroke(path));
    ctx.restore();
  }

  public updateSelected(ctx: CanvasRenderingContext2D) {
    const borderColor = this.isSelected ? "rgba(255, 255, 255,1)" : "rgba(255, 255, 255,0.05)";
    const borderWidth = 1;
    const innerRadius = 4;

    ctx.save();
    ctx.fillStyle = borderColor;
    ctx.beginPath();
    ctx.rect(-this.width / 2, -this.height / 2, this.width, this.height);
    ctx.roundRect(
      -this.width / 2 + borderWidth,
      -this.height / 2 + borderWidth,
      this.width - borderWidth * 2,
      this.height - borderWidth * 2,
      innerRadius,
    );
    ctx.fill("evenodd");
    ctx.restore();
  }
}

export default Scene;