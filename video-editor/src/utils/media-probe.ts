import sharp from "sharp";
import { parseBuffer } from "music-metadata";

export async function probeImageDimensions(
  buffer: Buffer
): Promise<{ width: number | null; height: number | null }> {
  try {
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width ?? null,
      height: metadata.height ?? null
    };
  } catch {
    return { width: null, height: null };
  }
}

export async function probeAudioVideoDuration(
  buffer: Buffer,
  mimeType: string
): Promise<number | null> {
  try {
    const metadata = await parseBuffer(buffer, { mimeType });
    return metadata.format.duration ?? null;
  } catch {
    return null;
  }
}