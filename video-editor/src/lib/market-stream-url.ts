import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, S3_BUCKET_NAME } from "@/lib/s3";

// Called after membership, project license and media linkage checks. The URL
// grants one file; S3 serves every range without an application redirect.
export async function signMarketStream(path: string, mimeType: string, now = Date.now()) {
  if ((!path.startsWith("asset-originals/") && !path.startsWith("assets/"))
    || path.includes("..") || path.includes("\\") || !/^(video|audio)\//.test(mimeType)) {
    throw new Error("Invalid market stream.");
  }
  const signingDate = new Date(Math.floor(now / 300_000) * 300_000);
  const url = await getSignedUrl(s3Client, new GetObjectCommand({
    Bucket: S3_BUCKET_NAME, Key: path, ResponseContentType: mimeType,
    ResponseContentDisposition: "inline", ResponseCacheControl: "private, max-age=300",
  }), { expiresIn: 3600, signingDate });
  return { url, expiresAt: signingDate.getTime() + 3_600_000 };
}
