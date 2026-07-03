import { useEffect, useState } from "react";

const lineHeightCache = new Map<string, number>();

export function useResolvedLineHeight(fontFamily?: string, fontSize?: number) {
  const [resolved, setResolved] = useState<number | null>(null);

  useEffect(() => {
    if (!fontFamily || !fontSize) {
      setResolved(null);
      return;
    }

    const cacheKey = `${fontFamily}-${fontSize}`;
    const cached = lineHeightCache.get(cacheKey);
    if (cached !== undefined) {
      setResolved(cached);
      return;
    }

    let cancelled = false;

    document.fonts.ready.then(() => {
      if (cancelled) return;

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.font = `${fontSize}px ${fontFamily}`;
      const metrics = ctx.measureText("Hxg"); // mix of ascenders/descenders/x-height

      const ascent = metrics.fontBoundingBoxAscent;
      const descent = metrics.fontBoundingBoxDescent;

      let value: number = 0;
      if (ascent !== undefined && descent !== undefined) {
        value = Math.round(ascent + descent);
      }
      // else {
      //   // very old browser without fontBoundingBox* support — rough fallback
      //   value = Math.round(fontSize * 1.2);
      // }

      lineHeightCache.set(cacheKey, value);
      if (!cancelled) setResolved(value);
    });

    return () => {
      cancelled = true;
    };
  }, [fontFamily, fontSize]);

  return resolved;
}