import { randomUUID } from "node:crypto";
import { readTemplateSource, readTemplateMarketMedia, readTemplateUpload } from "@/lib/db/template-copy";
import { readSceneAtSnapshot } from "@/lib/db/snapshot-preview";
import { copyTemplate, decodeTemplate } from "@/lib/collab/template-copy";
import { buildPublicUrl } from "@/lib/s3";
import { isGeneratedMarketProxy } from "@/lib/market-proxy";
import { mediaSourceKey } from "@/features/editor/utils/media-sources";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function prepareTemplateCopy(snapshotId: number, name: string) {
  const source = await readTemplateSource(snapshotId);
  if (!source) throw new Error("Template snapshot is unavailable");
  let hasPaidAssets = false;
  const mediaCache = new Map<string, ReturnType<typeof readTemplateMarketMedia>>();
  const uploadCache = new Map<string, ReturnType<typeof readTemplateUpload>>();
  const uploads = new Map<string, string>();
  const prepared = await copyTemplate(decodeTemplate(source.document), name,
    async id => {
      if (!uuid.test(id)) return null;
      const row = await readSceneAtSnapshot(id, source.project_id, source.created_at);
      return row ? decodeTemplate(row.document) : null;
    },
    async item => {
      const metadata = item.metadata as { market?: boolean; market_asset_id?: string; media_asset_id?: string } | undefined;
      if (!metadata?.market) {
        if (!["image", "video", "audio"].includes(String(item.type)) || !item.details.src) return;
        const path = mediaSourceKey(item.details.src);
        if (path.startsWith("asset-originals/") || path.startsWith("api/market-assets/")) {
          // Older snapshots can contain an original URL without the marketplace
          // identity needed to authorize it. Match preview behavior: preserve the
          // clip as missing rather than copy a protected URL or reject the project.
          item.details.src = `missing-template-media:${item.id}`;
          const metadataCopy = { ...item.metadata };
          delete metadataCopy.media_asset_id;
          item.metadata = metadataCopy;
          return;
        }
        if (!path.startsWith("uploads/")) return;
        if (!uploadCache.has(path)) uploadCache.set(path, readTemplateUpload(path, source.project_id));
        const upload = await uploadCache.get(path);
        if (!upload) {
          // Preserve the missing clip and its timing in the independent copy.
          item.details.src = `missing-template-media:${item.id}`;
          const metadataCopy = { ...item.metadata };
          delete metadataCopy.media_asset_id;
          item.metadata = metadataCopy;
          return;
        }
        if (!uploads.has(upload.media_asset_id)) uploads.set(upload.media_asset_id, randomUUID());
        item.details.src = buildPublicUrl(upload.path);
        item.metadata = { ...item.metadata, media_asset_id: uploads.get(upload.media_asset_id) };
        return;
      }
      const assetId = metadata.market_asset_id || "";
      const mediaId = metadata.media_asset_id || "";
      if (!uuid.test(assetId) || !uuid.test(mediaId)) throw new Error("Invalid template market media");
      const key = `${assetId}:${mediaId}`;
      if (!mediaCache.has(key)) mediaCache.set(key, readTemplateMarketMedia(assetId, mediaId));
      const media = await mediaCache.get(key);
      if (!media || !isGeneratedMarketProxy(media.type, media.original_file_id, media.proxy_file_id, media.path, media.mime_type)) {
        throw new Error("Template media preview is unavailable");
      }
      if (Number(media.price_credits) > 0) hasPaidAssets = true;
      // Persist only public watermarked previews. Source-project signed URLs and
      // licensing never authorize the new project. The editor resolves its own licenses.
      item.details.src = buildPublicUrl(media.path);
      item.metadata = {
        market: true, market_asset_id: assetId, media_asset_id: mediaId, price_credits: Number(media.price_credits),
        ...(typeof item.metadata?.name === "string" ? { name: item.metadata.name } : {}),
        ...(String(item.type) === "image" ? { previewUrl: item.details.src } : {}),
      };
    });
  return { ...prepared, snapshotId: String(snapshotId), hasPaidAssets,
    uploads: [...uploads].map(([sourceId, id]) => ({ sourceId, id })) };
}
