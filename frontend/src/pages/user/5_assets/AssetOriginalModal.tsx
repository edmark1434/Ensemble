import { useEffect, useState } from "react";
import { AudioLines, X } from "lucide-react";
import { mediaUrl, type AssetMediaFile, type AssetRecord } from "./assetTypes";

interface AssetOriginalModalProps {
  open: boolean;
  asset: AssetRecord;
  mediaAsset: AssetMediaFile;
  onClose: () => void;
}

export default function AssetOriginalModal({ open, asset, mediaAsset, onClose }: AssetOriginalModalProps) {
  if (!open) return null;
  return <AssetPreview key={mediaAsset.media_asset_id} asset={asset} mediaAsset={mediaAsset} onClose={onClose} />;
}

function AssetPreview({ asset, mediaAsset, onClose }: Omit<AssetOriginalModalProps, "open">) {
  const [failed, setFailed] = useState(false);
  const previewUrl = mediaAsset.processing_status === "ready" ? mediaUrl(mediaAsset.proxy_path) : "";

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true" aria-labelledby="asset-preview-title">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-dark-surface shadow-2xl">
        <div className="flex shrink-0 items-start justify-between border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <h2 id="asset-preview-title" className="truncate text-lg font-bold text-white">{mediaAsset.name}</h2>
            <p className="mt-1 text-xs text-zinc-400">Watermarked preview{!asset.is_owner && !asset.is_purchased ? ` · purchase the ${asset.media_asset_count > 1 ? "bundle" : "asset"} to use the full ${mediaAsset.type}` : ""}</p>
          </div>
          <button type="button" onClick={onClose} className="ml-4 rounded-lg p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white" aria-label="Close preview"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex min-h-72 flex-1 items-center justify-center overflow-auto bg-black/30 p-4 md:p-6">
          {!previewUrl || failed ? (
            <p className="text-sm text-zinc-400">Watermarked preview is unavailable.</p>
          ) : mediaAsset.type === "image" ? (
            <img src={previewUrl} alt={`Watermarked preview of ${mediaAsset.name}`} onError={() => setFailed(true)} draggable={false} onContextMenu={(event) => event.preventDefault()} className="max-h-[75vh] max-w-full object-contain" />
          ) : mediaAsset.type === "video" ? (
            <video src={previewUrl} controls controlsList="nodownload" autoPlay playsInline onError={() => setFailed(true)} onContextMenu={(event) => event.preventDefault()} className="max-h-[75vh] max-w-full bg-black" />
          ) : (
            <div className="flex w-full max-w-xl flex-col items-center gap-6 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-blue-300">
              <AudioLines className="h-16 w-16" />
              <audio src={previewUrl} controls controlsList="nodownload" autoPlay onError={() => setFailed(true)} onContextMenu={(event) => event.preventDefault()} className="w-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
