import {S3Client, PutObjectCommand, GetObjectCommand} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const s3Client = new S3Client({
  region: requireEnv("AWS_REGION"),
  credentials: {
    accessKeyId: requireEnv("AWS_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("AWS_SECRET_ACCESS_KEY")
  }
});

export const S3_BUCKET_NAME = requireEnv("AWS_BUCKET_NAME");

const CONTENT_TYPES: Record<string, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  flac: "audio/flac"
};

export const getContentType = (fileName: string): string => {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPES[ext] || "application/octet-stream";
};

export const sanitizeFileName = (fileName: string): string =>
  fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");

export const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

export const buildS3Key = (
  userId: string,
  fileId: string,
  fileName: string
): string => `uploads/${userId}/${fileId}/${sanitizeFileName(fileName)}`;

export const buildProxyKey = (
  userId: string,
  fileId: string,
  baseName: string
): string => `proxies/${userId}/${fileId}/${sanitizeFileName(baseName)}.mp4`;

export const buildDerivedKey = (
  kind: "proxies" | "filmstrips" | "posters" | "thumbs" | "waveforms",
  userId: string,
  fileId: string,
  baseName: string,
  ext: string
): string => `${kind}/${userId}/${fileId}/${sanitizeFileName(baseName)}.${ext}`;

export const buildPublicUrl = (key: string): string => {
  if (process.env.AWS_S3_PUBLIC_URL) {
    return `${process.env.AWS_S3_PUBLIC_URL}/${key}`;
  }
  return `https://${S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};

export const createPresignedPutUrl = async (
  key: string,
  contentType: string
): Promise<string> => {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    CacheControl: IMMUTABLE_CACHE_CONTROL
  });
  return getSignedUrl(s3Client, command, { expiresIn: 300 });
};

export const createPresignedGetUrl = async (key: string): Promise<string> =>
  getSignedUrl(
    s3Client,
    new GetObjectCommand({ Bucket: S3_BUCKET_NAME, Key: key }),
    { expiresIn: 3600 }
  );

export const uploadBufferToS3 = async (
  key: string,
  body: Buffer,
  contentType: string,
  cacheControl?: string
): Promise<void> => {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
      ...(cacheControl ? { CacheControl: cacheControl } : {})
    })
  );
};