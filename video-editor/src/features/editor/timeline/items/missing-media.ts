import { useMissingMedia } from "../../store/use-missing-media";
import useStore from "../../store/use-store";
export function drawMissingMedia(
  ctx: CanvasRenderingContext2D,
  item: { id: string; width: number; height: number; rx?: number },
): boolean {
  const state = useStore.getState();
  const availability = useMissingMedia.getState();
  const src = state.trackItemsMap[item.id]?.details?.src;
  if (availability.projectId !== state.projectId || !availability.missing.has(src)) return false;
  ctx.save();
  ctx.globalAlpha *= 0.4;
  ctx.translate(-item.width / 2, -item.height / 2);
  ctx.beginPath();
  ctx.roundRect(0, 0, item.width, item.height, item.rx ?? 4);
  ctx.clip();
  ctx.fillStyle = "#27272a";
  ctx.fillRect(0, 0, item.width, item.height);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  for (let x = -item.height; x < item.width; x += 12) {
    ctx.beginPath();
    ctx.moveTo(x, item.height);
    ctx.lineTo(x + item.height, 0);
    ctx.stroke();
  }
  ctx.restore();
  return true;
}
