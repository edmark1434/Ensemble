export interface NormalizedDimensions {
  width: number;
  height: number;
}

// Fits an asset's native dimensions into the canvas, preserving aspect ratio.

export function normalizeDimensionsToCanvas(
  assetWidth: number,
  assetHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  maxCoverage = 1
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
/** Resize the visible frame, keeping an existing manual crop in the same relative position. */
export function resizeMediaFrame(
  details: { width: number; height: number; crop?: { x: number; y: number; width: number; height: number } },
  width: number,
  height: number
) {
  const crop = details.crop;
  if (!crop?.width || !crop.height) return { width, height };
  const xRatio = width / crop.width;
  const yRatio = height / crop.height;
  return {
    width: details.width * xRatio,
    height: details.height * yRatio,
    crop: { ...crop, x: crop.x * xRatio, y: crop.y * yRatio, width, height },
  };
}
