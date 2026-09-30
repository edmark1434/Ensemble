import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import sharp from "sharp";
import { readFile, unlink } from "fs/promises";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import {
  IMMUTABLE_CACHE_CONTROL,
  buildDerivedKey,
  createPresignedGetUrl,
  uploadBufferToS3
} from "@/lib/s3";
import {spawn} from "node:child_process";

if (ffmpegStatic) ffmpeg.setFfmpegPath(ffmpegStatic);

const SKIP_IMAGE_TYPES = new Set(["image/gif", "image/svg+xml"]);

type VideoPreset = {
  filter: string;
  fps: number;
  crf: number;
  audio: boolean;
  maxrate?: string;
};
const PROXY: VideoPreset = {
  filter: "scale=-2:'min(720,ih)'",
  fps: 30,
  crf: 28,
  audio: true,
  maxrate: "3M"
};
const FILMSTRIP: VideoPreset = {
  filter: "scale=-2:'min(180,ih)'",
  fps: 15,
  crf: 34,
  audio: false
};

function transcode(inputUrl: string, outPath: string, p: VideoPreset): Promise<void> {
  return new Promise((resolve, reject) => {
    let cmd = ffmpeg(inputUrl)
      .videoFilter(p.filter)
      .fps(p.fps) // constant frame rate so trim/display times map 1:1
      .videoCodec("libx264")
      .outputOptions([
        "-preset veryfast",
        `-crf ${p.crf}`,
        ...(p.maxrate
          ? [`-maxrate ${p.maxrate}`, `-bufsize ${parseInt(p.maxrate) * 2}M`]
          : []),
        "-g 30",
        "-keyint_min 30",
        "-sc_threshold 0",
        "-pix_fmt yuv420p",
        "-movflags +faststart",
        "-threads 2"
      ]);
    cmd = p.audio ? cmd.audioCodec("aac").audioBitrate("96k") : cmd.noAudio();
    cmd.on("end", () => resolve()).on("error", reject).save(outPath);
  });
}

function extractPoster(inputUrl: string, outPath: string, atSeconds: number): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputUrl)
      .seekInput(atSeconds)
      .frames(1)
      .videoFilter("scale=-2:'min(360,ih)'")
      .outputOptions(["-q:v 4"])
      .on("end", () => resolve())
      .on("error", reject)
      .save(outPath);
  });
}

const loadAsset = (mediaAssetId: string) =>
  db
    .selectFrom("media_assets")
    .innerJoin("files", "files.file_id", "media_assets.original_file_id")
    .select([
      "media_assets.media_asset_id",
      "media_assets.owner_user_id",
      "media_assets.name",
      "media_assets.type",
      "media_assets.duration_seconds",
      "media_assets.original_file_id",
      "media_assets.proxy_file_id",
      "media_assets.thumbnail_file_id",
      "media_assets.filmstrip_file_id",
      "files.path",
      "files.mime_type"
    ])
    .where("media_assets.media_asset_id", "=", mediaAssetId)
    .executeTakeFirst();

type AssetRow = NonNullable<Awaited<ReturnType<typeof loadAsset>>>;

// Also used by the backfill route to pick what still needs work.
export function needsDerivatives(r: {
  type: string;
  mime_type: string;
  original_file_id: string;
  proxy_file_id: string | null;
  thumbnail_file_id: string | null;
  filmstrip_file_id: string | null;
}): boolean {
  if (r.type === "video") {
    return (
      r.proxy_file_id === r.original_file_id ||
      r.thumbnail_file_id === r.original_file_id ||
      !r.filmstrip_file_id
    );
  }
  if (r.type === "image") {
    return (
      !SKIP_IMAGE_TYPES.has(r.mime_type) &&
      (r.proxy_file_id === r.original_file_id ||
        r.thumbnail_file_id === r.original_file_id)
    );
  }
  if (r.type === "audio") return !r.filmstrip_file_id;
  return false;
}

async function withTmp<T>(ext: string, fn: (tmpPath: string) => Promise<T>): Promise<T> {
  const tmpPath = path.join(os.tmpdir(), `derive-${randomUUID()}.${ext}`);
  try {
    return await fn(tmpPath);
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}

async function saveDerived(
  asset: AssetRow,
  kind: "proxies" | "filmstrips" | "posters" | "thumbs" | "waveforms",
  ext: string,
  contentType: string,
  buffer: Buffer
): Promise<string> {
  const baseName = asset.name.replace(/\.[^.]+$/, "");
  const key = buildDerivedKey(kind, asset.owner_user_id, nanoid(), baseName, ext);
  await uploadBufferToS3(key, buffer, contentType, IMMUTABLE_CACHE_CONTROL);

  const file = await db
    .insertInto("files")
    .values({
      name: `${baseName}.${ext}`,
      path: key,
      mime_type: contentType,
      size_bytes: buffer.byteLength
    })
    .returning("file_id")
    .executeTakeFirstOrThrow();

  return file.file_id;
}

async function videoDerivatives(asset: AssetRow) {
  const inputUrl = await createPresignedGetUrl(asset.path);
  const id = asset.media_asset_id;

  if (asset.proxy_file_id === asset.original_file_id) {
    const fileId = await withTmp("mp4", async (out) => {
      await transcode(inputUrl, out, PROXY);
      const buf = await readFile(out);
      console.log(
        `[derive] proxy for ${asset.name}: ${(buf.byteLength / 1048576).toFixed(1)} MB`
      );
      return saveDerived(asset, "proxies", "mp4", "video/mp4", buf);
    });
    await db.updateTable("media_assets").set({ proxy_file_id: fileId })
      .where("media_asset_id", "=", id).execute();
  }

  if (asset.thumbnail_file_id === asset.original_file_id) {
    const d = Number(asset.duration_seconds);
    const at = Number.isFinite(d) && d > 0 ? Math.min(1, d / 2) : 1;
    const fileId = await withTmp("jpg", async (out) => {
      await extractPoster(inputUrl, out, at);
      return saveDerived(asset, "posters", "jpg", "image/jpeg", await readFile(out));
    });
    await db.updateTable("media_assets").set({ thumbnail_file_id: fileId })
      .where("media_asset_id", "=", id).execute();
  }

  if (!asset.filmstrip_file_id) {
    const fileId = await withTmp("mp4", async (out) => {
      await transcode(inputUrl, out, FILMSTRIP);
      return saveDerived(asset, "filmstrips", "mp4", "video/mp4", await readFile(out));
    });
    await db.updateTable("media_assets").set({ filmstrip_file_id: fileId })
      .where("media_asset_id", "=", id).execute();
  }
}

async function imageDerivatives(asset: AssetRow) {
  const id = asset.media_asset_id;
  const res = await fetch(await createPresignedGetUrl(asset.path));
  if (!res.ok) throw new Error(`Fetching original failed: ${res.status}`);
  const input = Buffer.from(await res.arrayBuffer());

  if (asset.proxy_file_id === asset.original_file_id) {
    const buf = await sharp(input)
      .rotate()
      .resize({ width: 2560, height: 2560, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    const fileId = await saveDerived(asset, "proxies", "webp", "image/webp", buf);
    await db.updateTable("media_assets").set({ proxy_file_id: fileId })
      .where("media_asset_id", "=", id).execute();
  }

  if (asset.thumbnail_file_id === asset.original_file_id) {
    const buf = await sharp(input)
      .rotate()
      .resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer();
    const fileId = await saveDerived(asset, "thumbs", "webp", "image/webp", buf);
    await db.updateTable("media_assets").set({ thumbnail_file_id: fileId })
      .where("media_asset_id", "=", id).execute();
  }
}

const PEAKS_PER_SECOND = 100;
const DECODE_RATE = 8000;
const SAMPLES_PER_PEAK = DECODE_RATE / PEAKS_PER_SECOND;

// Decodes to mono 8 kHz PCM and stores mean |amplitude| per 10 ms as one byte.
function computePeaks(inputUrl: string): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const ff = spawn(ffmpegStatic ?? "ffmpeg", [
      "-v", "error",
      "-i", inputUrl,
      "-vn", "-ac", "1", "-ar", String(DECODE_RATE),
      "-f", "s16le", "pipe:1"
    ]);

    const peaks: number[] = [];
    let sum = 0;
    let count = 0;
    let leftover: Buffer = Buffer.alloc(0);
    let stderr = "";

    ff.stderr.on("data", (d) => (stderr += d.toString()));
    ff.stdout.on("data", (chunk: Buffer) => {
      const buf = leftover.length ? Buffer.concat([leftover, chunk]) : chunk;
      const usable = buf.length - (buf.length % 2);
      for (let i = 0; i < usable; i += 2) {
        sum += Math.abs(buf.readInt16LE(i)) / 32768;
        if (++count === SAMPLES_PER_PEAK) {
          peaks.push(Math.min(255, Math.round((sum / count) * 255)));
          sum = 0;
          count = 0;
        }
      }
      leftover = buf.subarray(usable);
    });
    ff.on("error", reject);
    ff.on("close", (code) => {
      if (count > 0) peaks.push(Math.min(255, Math.round((sum / count) * 255)));
      if (code !== 0 || peaks.length === 0) {
        reject(new Error(`audio decode failed (${code}): ${stderr.slice(-300)}`));
        return;
      }
      resolve(Uint8Array.from(peaks));
    });
  });
}

async function audioDerivatives(asset: AssetRow) {
  if (asset.filmstrip_file_id) return;
  const inputUrl = await createPresignedGetUrl(asset.path);
  const peaks = await computePeaks(inputUrl);
  const fileId = await saveDerived(
    asset,
    "waveforms",
    "bin",
    "application/octet-stream",
    Buffer.from(peaks)
  );
  await db
    .updateTable("media_assets")
    .set({ filmstrip_file_id: fileId })
    .where("media_asset_id", "=", asset.media_asset_id)
    .execute();
}

// Safe to run repeatedly: only slots that still point at the original are filled.
export async function createProxyForAsset(mediaAssetId: string) {
  const asset = await loadAsset(mediaAssetId);
  if (!asset || !needsDerivatives(asset)) return;

  try {
    if (asset.type === "video") await videoDerivatives(asset);
    else if (asset.type === "image") await imageDerivatives(asset);
    else if (asset.type === "audio") await audioDerivatives(asset);
    console.log("[derive] done", mediaAssetId);
  } catch (error) {
    // Slots keep pointing at the original, so the editor falls back to it.
    console.error("[derive] failed", mediaAssetId, error);
  }
}

// One job at a time so a batch doesn't starve the server.
let queue: Promise<unknown> = Promise.resolve();
export function enqueueProxy(mediaAssetId: string) {
  queue = queue
    .then(() => createProxyForAsset(mediaAssetId))
    .catch((e) => console.error(e));
}