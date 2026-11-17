import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { readMarketTranscriptionSource } from "@/lib/db/transcription-source";
import { buildPublicUrl, s3Client, S3_BUCKET_NAME } from "@/lib/s3";

export class TranscriptionSourceError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export async function resolveTranscriptionSource(value: unknown): Promise<string> {
  let source: URL;
  try {
    if (typeof value !== "string") throw new Error();
    source = new URL(value);
    if (!["https:", "http:"].includes(source.protocol) || source.username || source.password) throw new Error();
  } catch {
    throw new TranscriptionSourceError("A valid media URL is required.", 400);
  }

  const storageBases = [
    buildPublicUrl(""),
    `https://${S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`,
  ];
  let proxyPath: string | undefined;
  for (const base of storageBases) {
    const storage = new URL(base);
    const prefix = `${storage.pathname.replace(/\/+$/, "")}/`;
    if (source.origin !== storage.origin || !source.pathname.startsWith(prefix)) continue;
    try {
      proxyPath = decodeURIComponent(source.pathname.slice(prefix.length));
    } catch {
      throw new TranscriptionSourceError("Invalid media URL encoding.", 400);
    }
    break;
  }
  if (!proxyPath?.startsWith("assets/proxies/")) return source.href;

  const original = await readMarketTranscriptionSource(proxyPath);
  if (!original?.path || !original.mimeType?.startsWith(`${original.type}/`)
    || (!original.path.startsWith("asset-originals/") && !original.path.startsWith("assets/"))
    || original.path.includes("..") || original.path.includes("\\")) {
    throw new TranscriptionSourceError("The clean source for this marketplace media is unavailable. Try again later.", 422);
  }

  // Caption-only access: the provider receives a one-file grant, even while the
  // editor plays an unlicensed preview. Never return this URL to the browser.
  return getSignedUrl(s3Client, new GetObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: original.path,
    ResponseContentType: original.mimeType,
  }), { expiresIn: 3600 });
}
