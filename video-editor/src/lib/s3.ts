import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
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

export { getContentType } from "./media-content-type";

export const sanitizeFileName = (fileName: string): string =>
  fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");

export const buildS3Key = (
  userId: string,
  fileId: string,
  fileName: string
): string => `uploads/${userId}/${sanitizeFileName(fileName)}`;

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
    ContentType: contentType
  });

  return getSignedUrl(s3Client, command, { expiresIn: 300 });
};

export const uploadBufferToS3 = async (
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> => {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType
    })
  );
};
