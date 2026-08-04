// utils/media-probe.ts
import sharp from "sharp";
import { parseBuffer } from "music-metadata";
import ffmpeg from "fluent-ffmpeg";
import ffprobeStatic from "ffprobe-static";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";

ffmpeg.setFfprobePath(ffprobeStatic.path);

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

// Audio only. music-metadata is pure JS (no child process), so keep using
// it here — it's cheaper than spawning ffprobe for a duration-only need.
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

// Video needs width/height, which music-metadata doesn't expose for any
// container — shell out to ffprobe. Grabs duration in the same pass too,
// so this fully replaces probeAudioVideoDuration for the video branch.
export async function probeVideoMetadata(
  buffer: Buffer,
  mimeType: string
): Promise<{ width: number | null; height: number | null; durationSeconds: number | null }> {
  const ext = mimeType.split("/")[1]?.split(";")[0] || "mp4";
  const tmpPath = path.join(os.tmpdir(), `probe-${randomUUID()}.${ext}`);

  await writeFile(tmpPath, buffer);

  try {
    return await new Promise((resolve) => {
      ffmpeg.ffprobe(tmpPath, (err, data) => {
        if (err) {
          console.error("ffprobe failed:", err.message);
          resolve({ width: null, height: null, durationSeconds: null });
          return;
        }

        const videoStream = data.streams.find((s) => s.codec_type === "video");

        resolve({
          width: videoStream?.width ?? null,
          height: videoStream?.height ?? null,
          durationSeconds: data.format?.duration
            ? Math.round(data.format.duration)
            : null
        });
      });
    });
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}