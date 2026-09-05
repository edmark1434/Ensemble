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

async function resizeImage(file: File, maxWidth: number, maxHeight: number, quality: number, watermark: boolean, suffix: string, maxScale = 1) {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(maxScale, maxWidth / bitmap.width, maxHeight / bitmap.height);
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

export async function createAssetProxy(file: File, type: Exclude<AssetType, "template">): Promise<File> {
  if (type === "image") {
    return resizeImage(file, 640, 640, 0.36, true, "low-quality-preview", 0.55);
  }
  if (type === "video") return createVideoFramePreview(file);
  return createAudioVisualPreview(file);
}

export async function prepareAssetThumbnail(file: File): Promise<File> {
  return resizeImage(file, 480, 480, 0.68, false, "thumbnail");
}

export async function prepareTemplateThumbnail(file: File): Promise<File> {
  return resizeImage(file, 480, 480, 0.78, false, "template-thumbnail");
}

export async function createAssetDocumentPreview(file: File): Promise<File> {
  return resizeImage(file, 640, 640, 0.36, true, "low-quality-preview", 0.55);
}

function createVideoFramePreview(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let completed = false;
    const finish = () => {
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
    };
    const fail = () => {
      if (completed) return;
      completed = true;
      finish();
      reject(new Error("Unable to create a preview frame for this video."));
    };
    const capture = async () => {
      if (completed) return;
      completed = true;
      try {
        const sourceWidth = video.videoWidth || 1280;
        const sourceHeight = video.videoHeight || 720;
        const scale = Math.min(0.55, 640 / sourceWidth, 360 / sourceHeight);
        const width = Math.max(1, Math.round(sourceWidth * scale));
        const height = Math.max(1, Math.round(sourceHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Video preview processing is unavailable in this browser.");
        context.drawImage(video, 0, 0, width, height);
        drawWatermark(context, width, height);
        resolve(await canvasToFile(canvas, `${baseName(file.name)}-low-quality-preview.webp`, 0.36));
      } catch (error) {
        reject(error);
      } finally {
        finish();
      }
    };
    video.muted = true;
    video.preload = "auto";
    video.playsInline = true;
    video.onerror = fail;
    video.onloadeddata = () => {
      const target = Number.isFinite(video.duration) && video.duration > 1
        ? Math.min(1, video.duration / 10)
        : 0;
      if (target > 0) {
        video.onseeked = () => void capture();
        video.currentTime = target;
      } else {
        void capture();
      }
    };
    video.src = url;
  });
}

async function createAudioVisualPreview(file: File): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 360;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Audio preview processing is unavailable in this browser.");
  context.fillStyle = "#0d1324";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#2563eb";
  const bars = 32;
  const gap = 10;
  const barWidth = (canvas.width - 120 - gap * (bars - 1)) / bars;
  for (let index = 0; index < bars; index += 1) {
    const seed = (file.size + index * 37) % 160;
    const height = 55 + seed;
    const x = 60 + index * (barWidth + gap);
    context.fillRect(x, (canvas.height - height) / 2, barWidth, height);
  }
  context.fillStyle = "rgba(255,255,255,0.9)";
  context.font = "600 24px Inter, Arial, sans-serif";
  context.textAlign = "center";
  context.fillText("Audio Preview", canvas.width / 2, 305);
  context.textAlign = "start";
  drawWatermark(context, canvas.width, canvas.height);
  return canvasToFile(canvas, `${baseName(file.name)}-low-quality-preview.webp`, 0.36);
}
