import type { AssetType } from "./assetTypes";

function baseName(filename: string) {
  return filename.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 40) || "asset";
}

function canvasToFile(canvas: HTMLCanvasElement, filename: string, quality: number) {
  return new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("Unable to create the asset preview."));
      resolve(new File([blob], filename, { type: "image/webp", lastModified: Date.now() }));
    }, "image/webp", quality);
  });
}

function drawWatermark(context: CanvasRenderingContext2D, width: number, height: number) {
  const fontSize = Math.max(16, Math.round(Math.min(width, height) * 0.035));
  const text = "Ensemble Preview";
  context.save();
  context.font = `600 ${fontSize}px Inter, Arial, sans-serif`;
  const textWidth = context.measureText(text).width;
  const padding = Math.max(10, Math.round(fontSize * 0.65));
  context.fillStyle = "rgba(0, 0, 0, 0.58)";
  context.fillRect(width - textWidth - padding * 2, height - fontSize - padding * 2, textWidth + padding * 2, fontSize + padding * 2);
  context.fillStyle = "rgba(255, 255, 255, 0.92)";
  context.textBaseline = "top";
  context.fillText(text, width - textWidth - padding, height - fontSize - padding);
  context.restore();
}

async function resizeImage(file: File, maxWidth: number, maxHeight: number, quality: number, watermark: boolean, suffix: string) {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image preview processing is unavailable in this browser.");
    context.drawImage(bitmap, 0, 0, width, height);
    if (watermark) drawWatermark(context, width, height);
    return canvasToFile(canvas, `${baseName(file.name)}-${suffix}.webp`, quality);
  } finally {
    bitmap.close();
  }
}

export async function createAssetProxy(file: File, type: AssetType): Promise<File> {
  if (type === "image") {
    return resizeImage(file, 1600, 1600, 0.72, true, "proxy");
  }

  const extension = file.name.includes(".") ? `.${file.name.split(".").pop()}` : "";
  return new File([file], `${baseName(file.name)}-proxy${extension}`, {
    type: file.type,
    lastModified: Date.now(),
  });
}

export async function prepareAssetThumbnail(file: File): Promise<File> {
  return resizeImage(file, 480, 480, 0.68, true, "thumbnail");
}
