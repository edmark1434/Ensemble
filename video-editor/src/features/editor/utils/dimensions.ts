export interface NormalizedDimensions {
  width: number;
  height: number;
}

// Fits an asset's native dimensions into the canvas, preserving aspect ratio.
// maxCoverage caps how much of the canvas a freshly-added item claims by default
// (0.8 = up to 80% of the shorter relevant axis), so it doesn't fill the frame edge-to-edge.
export function normalizeDimensionsToCanvas(
  assetWidth: number,
  assetHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  maxCoverage = 0.8
): NormalizedDimensions {
  if (!assetWidth || !assetHeight) {
    return { width: canvasWidth * maxCoverage, height: canvasHeight * maxCoverage };
  }

  const assetAspect = assetWidth / assetHeight;
  const canvasAspect = canvasWidth / canvasHeight;

  let targetWidth: number;
  let targetHeight: number;

  if (assetAspect > canvasAspect) {
    // asset is relatively wider than the canvas — constrain by width
    targetWidth = canvasWidth * maxCoverage;
    targetHeight = targetWidth / assetAspect;
  } else {
    // asset is relatively taller than the canvas — constrain by height
    targetHeight = canvasHeight * maxCoverage;
    targetWidth = targetHeight * assetAspect;
  }

  return {
    width: Math.round(targetWidth),
    height: Math.round(targetHeight)
  };
}