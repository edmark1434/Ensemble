import { createReadStream, createWriteStream } from "node:fs";
import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { Readable, Transform } from "node:stream";
import { randomUUID } from "node:crypto";
import path from "node:path";
import os from "node:os";
import { HeadObjectCommand, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, S3_BUCKET_NAME, buildPublicUrl, sanitizeFileName } from "@/lib/s3";
import { normalizeVideoOriginal } from "@/lib/video-original";
import { MAX_FILE_SIZE_BYTES } from "@/constants/upload-limits";

export async function discardVideoUpload(filePath: string) {
  await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET_NAME, Key: filePath }));
}

function validateUploadPath(userId: string, filePath: string) {
  if (!/^[0-9a-f-]{36}$/i.test(userId) || typeof filePath !== "string"
    || !filePath.startsWith(`uploads/${userId}/`) || filePath.includes("..") || filePath.includes("\\")) {
    throw new Error("Invalid upload path");
  }
}

export async function readUploadedFile(userId: string, filePath: string) {
  validateUploadPath(userId, filePath);
  const object = await s3Client.send(new HeadObjectCommand({ Bucket: S3_BUCKET_NAME, Key: filePath }));
  const fileSize = Number(object.ContentLength);
  if (!Number.isSafeInteger(fileSize) || fileSize <= 0 || fileSize > MAX_FILE_SIZE_BYTES) {
    throw new Error("Invalid uploaded file size");
  }
  const contentType = object.ContentType?.split(";")[0].trim().toLowerCase();
  if (!contentType) throw new Error("Missing uploaded file type");
  return { fileSize, contentType };
}

export async function prepareVideoUpload(options: {
  userId: string; fileName: string; contentType: string; buffer?: Buffer; filePath?: string;
}) {
  const { userId, fileName, contentType, buffer, filePath } = options;
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error("Invalid upload owner");
  if (filePath) validateUploadPath(userId, filePath);
  const workDir = await mkdtemp(path.join(os.tmpdir(), "ensemble-video-upload-"));
  let finalPath: string | undefined;
  try {
    const inputPath = path.join(workDir, "input");
    if (buffer) {
      if (buffer.length > MAX_FILE_SIZE_BYTES) throw new Error("Video exceeds the upload size limit");
      await writeFile(inputPath, buffer);
    } else {
      if (!filePath) throw new Error("Missing uploaded video");
      const object = await s3Client.send(new GetObjectCommand({ Bucket: S3_BUCKET_NAME, Key: filePath }));
      if (!object.Body || Number(object.ContentLength) > MAX_FILE_SIZE_BYTES) throw new Error("Invalid uploaded video size");
      if (!object.ContentType?.startsWith("video/")) throw new Error("Uploaded file is not a video");
      let bytes = 0;
      const limiter = new Transform({
        transform(chunk, _encoding, callback) {
          bytes += chunk.length;
          callback(bytes > MAX_FILE_SIZE_BYTES ? new Error("Video exceeds the upload size limit") : null, chunk);
        }
      });
      await pipeline(object.Body as Readable, limiter, createWriteStream(inputPath));
    }
    const normalized = await normalizeVideoOriginal(inputPath, workDir);
    const finalName = normalized.changed ? `${path.parse(fileName).name}.mp4` : fileName;
    const finalType = normalized.changed ? "video/mp4" : contentType;
    finalPath = `uploads/${userId}/${randomUUID()}/${sanitizeFileName(finalName)}`;
    const size = (await stat(normalized.originalPath)).size;
    await s3Client.send(new PutObjectCommand({
      Bucket: S3_BUCKET_NAME, Key: finalPath, Body: createReadStream(normalized.originalPath),
      ContentLength: size, ContentType: finalType
    }));
    return {
      fileName: finalName, filePath: finalPath, fileSize: size, contentType: finalType,
      width: normalized.width, height: normalized.height, durationSeconds: normalized.durationSeconds,
      url: buildPublicUrl(finalPath)
    };
  } catch (error) {
    if (finalPath) await discardVideoUpload(finalPath).catch(() => undefined);
    throw error;
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
