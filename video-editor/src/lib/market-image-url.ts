import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, S3_BUCKET_NAME } from "@/lib/s3";

// Stable within a five-minute window for browser cache reuse, valid for an hour.
// This function is called only after project membership and licensing are checked.
export async function signMarketImage(path: string, mimeType: string, now = Date.now()) {
  if ((!path.startsWith("asset-originals/") && !path.startsWith("assets/"))
    || path.includes("..") || path.includes("\\") || !mimeType.startsWith("image/")) {
    throw new Error("Invalid market image.");
  }
  return getSignedUrl(s3Client, new GetObjectCommand({
    Bucket: S3_BUCKET_NAME, Key: path, ResponseContentType: mimeType,
    ResponseContentDisposition: "inline", ResponseCacheControl: "private, max-age=300",
  }), { expiresIn: 3600, signingDate: new Date(Math.floor(now / 300_000) * 300_000) });
}
