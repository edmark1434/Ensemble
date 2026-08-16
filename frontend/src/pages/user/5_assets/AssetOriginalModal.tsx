import { useEffect, useState } from "react";
import { FileAudio, Loader2, X } from "lucide-react";
import api from "@/lib/axios";
import type { AssetRecord } from "./assetTypes";

interface AssetOriginalModalProps {
  open: boolean;
  asset: AssetRecord;
  onClose: () => void;
}

interface OriginalPreviewResponse {
  previewUrl: string;
  mimeType: string;
  expiresIn: number;
}

function requestError(error: unknown) {
  if (typeof error === "object" && error && "response" in error) {
    const response = (error as { response?: { data?: { error?: string } } }).response;
    return response?.data?.error || "Unable to load the original file.";
  }
  return "Unable to load the original file.";
}

export default function AssetOriginalModal({ open, asset, onClose }: AssetOriginalModalProps) {
  if (!open) return null;
  return <OpenAssetOriginalModal key={asset.market_asset_id} asset={asset} onClose={onClose} />;
}

function OpenAssetOriginalModal({ asset, onClose }: Omit<AssetOriginalModalProps, "open">) {
  const [preview, setPreview] = useState<OriginalPreviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    api.get<OriginalPreviewResponse>(`/api/assets/${asset.market_asset_id}/original-preview`, {
      signal: controller.signal,
    }).then((response) => setPreview(response.data))
      .catch((requestErrorValue) => {
        if (!controller.signal.aborted) setError(requestError(requestErrorValue));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [asset.market_asset_id]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const mediaType = preview?.mimeType || asset.mime_type;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true" aria-labelledby="original-file-title">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d0f1a] shadow-2xl">
        <div className="flex shrink-0 items-start justify-between border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <h2 id="original-file-title" className="truncate text-lg font-bold text-white">Original file · {asset.name}</h2>
            <p className="mt-1 text-xs text-zinc-400">Protected full-quality media · link expires after 60 seconds</p>
          </div>
          <button type="button" onClick={onClose} className="ml-4 rounded-lg p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white" aria-label="Close original file viewer"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex min-h-72 flex-1 items-center justify-center overflow-auto bg-black/30 p-4 md:p-6">
          {loading ? (
            <div className="flex flex-col items-center gap-3 text-sm text-zinc-400"><Loader2 className="h-7 w-7 animate-spin" /> Loading protected original…</div>
          ) : error ? (
            <div className="max-w-md rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-center text-sm text-red-300">{error}</div>
          ) : preview?.previewUrl && mediaType.startsWith("image/") ? (
            <img src={preview.previewUrl} alt={`Original ${asset.name}`} draggable={false} className="max-h-[75vh] max-w-full object-contain" />
          ) : preview?.previewUrl && mediaType.startsWith("video/") ? (
            <video src={preview.previewUrl} controls autoPlay playsInline className="max-h-[75vh] max-w-full bg-black" />
          ) : preview?.previewUrl && mediaType.startsWith("audio/") ? (
            <div className="flex w-full max-w-xl flex-col items-center gap-6 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-blue-300">
              <FileAudio className="h-16 w-16" />
              <audio src={preview.previewUrl} controls autoPlay className="w-full" />
            </div>
          ) : (
            <p className="text-sm text-zinc-400">Original preview is unavailable.</p>
          )}
        </div>
      </div>
    </div>
  );
}
