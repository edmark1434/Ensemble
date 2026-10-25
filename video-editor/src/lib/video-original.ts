import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import ffprobeStatic from "ffprobe-static";

const execute = promisify(execFile);

export async function readVideoMetadata(filePath: string) {
  const { stdout } = await execute(process.env.FFPROBE_PATH || ffprobeStatic.path, [
    "-v", "error", "-print_format", "json", "-show_format", "-show_streams", filePath
  ], { windowsHide: true, maxBuffer: 1024 * 1024 });
  const data = JSON.parse(stdout);
  const video = data.streams?.find((stream: { codec_type: string }) => stream.codec_type === "video");
  const rotation = Math.abs(Number(video?.side_data_list?.find((item: { rotation?: number }) => item.rotation !== undefined)?.rotation ?? video?.tags?.rotate ?? 0));
  let width = Number(video?.width);
  let height = Number(video?.height);
  if (rotation === 90 || rotation === 270) [width, height] = [height, width];
  const duration = Number(data.format?.duration) || Number(video?.duration);
  if (!(width > 0 && height > 0 && duration > 0)) throw new Error("The upload has no readable video stream");
  return { width, height, durationSeconds: Math.max(1, Math.round(duration)), rotation, sampleAspectRatio: video.sample_aspect_ratio as string | undefined };
}

// Policy applies to the original at upload completion. Proxy creation must never
// choose a different resolution. Higher plan limits can be added here later.
export async function normalizeVideoOriginal(inputPath: string, workDir: string) {
  const metadata = await readVideoMetadata(inputPath);
  const [sarWidth, sarHeight] = (metadata.sampleAspectRatio || '1:1').split(':').map(Number);
  const sar = sarWidth > 0 && sarHeight > 0 ? sarWidth / sarHeight : 1;
  const rotated = metadata.rotation === 90 || metadata.rotation === 270;
  const displayWidth = metadata.width * (rotated ? 1 : sar);
  const displayHeight = metadata.height * (rotated ? sar : 1);
  const scale = Math.min(1, 1080 / Math.min(displayWidth, displayHeight), 1920 / Math.max(displayWidth, displayHeight));
  const width = Math.max(2, Math.floor(displayWidth * scale / 2) * 2);
  const height = Math.max(2, Math.floor(displayHeight * scale / 2) * 2);
  const changed = width !== metadata.width || height !== metadata.height || metadata.rotation !== 0
    || Boolean(metadata.sampleAspectRatio && !["1:1", "0:1", "N/A"].includes(metadata.sampleAspectRatio));
  if (!changed) return { ...metadata, originalPath: inputPath, changed: false };
  const originalPath = path.join(workDir, "original-1080p.mp4");
  await execute(process.env.FFMPEG_PATH || "ffmpeg", [
    "-y", "-v", "error", "-i", inputPath,
    "-map", "0:v:0", "-map", "0:a:0?",
    "-vf", `scale=${width}:${height}:flags=lanczos,setsar=1`,
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k", "-metadata:s:v:0", "rotate=0",
    "-movflags", "+faststart", originalPath
  ], { windowsHide: true, maxBuffer: 1024 * 1024 });
  const result = await readVideoMetadata(originalPath);
  if (result.width !== width || result.height !== height) throw new Error("Video normalization produced unexpected dimensions");
  return { ...result, originalPath, changed: true };
}
