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

async function resizeImage(file: File, maxWidth: number, maxHeight: number, quality: number, suffix: string, maxScale = 1) {
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
    return canvasToFile(canvas, `${baseName(file.name)}-${suffix}.webp`, quality);
  } finally {
    bitmap.close();
  }
}

export async function prepareAssetThumbnail(file: File): Promise<File> {
  return resizeImage(file, 480, 480, 0.68, "thumbnail");
}

export async function prepareTemplateThumbnail(file: File): Promise<File> {
  return resizeImage(file, 480, 480, 0.78, "template-thumbnail");
}
