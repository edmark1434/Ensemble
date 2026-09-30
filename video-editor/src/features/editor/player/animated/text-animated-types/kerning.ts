let ctx: CanvasRenderingContext2D | null = null;
const cache = new Map<string, number>();

export const getKerningAdjustment = (
  prev: string | undefined,
  char: string,
  font: string
): number => {
  if (!prev || typeof document === "undefined") return 0;

  const key = `${font}|${prev}${char}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  ctx ??= document.createElement("canvas").getContext("2d");
  if (!ctx) return 0;
  ctx.font = font;

  const adjustment =
    ctx.measureText(prev + char).width -
    ctx.measureText(prev).width -
    ctx.measureText(char).width;

  // don't cache values measured before the font finished loading
  if (document.fonts.check(font)) cache.set(key, adjustment);
  return adjustment;
};