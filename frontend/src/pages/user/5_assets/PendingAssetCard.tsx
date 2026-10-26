import { AlertCircle, AudioLines, Clapperboard, Image, PanelsRightBottom, Loader2, X } from "lucide-react";
import { CreditIcon } from "@/components/ui/credit-icon";
import type { PendingAssetUpload } from "./assetUploadStore";
import type { AssetRecord } from "./assetTypes";

export default function PendingAssetCard({ upload, asset, onDismiss }: {
  upload: PendingAssetUpload; asset?: AssetRecord; onDismiss: () => void;
}) {
  const failed = upload.stage === "failed" || asset?.processing_status === "failed";
  const Icon = { image: Image, video: Clapperboard, audio: AudioLines, template: PanelsRightBottom }[upload.type];
  const label = failed ? "Upload failed" : asset ? "Preparing preview…"
    : upload.stage === "saving" ? "Finishing upload…"
      : upload.stage === "preparing" ? "Preparing upload…" : `Uploading ${upload.progress}%`;
  return <article aria-disabled="true" aria-label={`${upload.name}: ${label}`}
    className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-dark-surface">
    <div className="relative flex h-48 items-center justify-center overflow-hidden bg-gray-100 dark:bg-black/30">
      {upload.previewUrl ? <img src={upload.previewUrl} alt="" className="h-full w-full object-contain opacity-50" />
        : <Icon className="h-12 w-12 text-gray-400 dark:text-zinc-600" />}
      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
        {failed ? <AlertCircle className="h-8 w-8 text-red-400" /> : <Loader2 className="h-8 w-8 animate-spin text-white" />}
      </div>
    </div>
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5"><CreditIcon className="h-5 w-5" /><span className="text-lg font-bold text-amber-500 dark:text-amber-400">{upload.priceCredits > 0 ? upload.priceCredits.toLocaleString() : "Free"}</span></div>
      </div>
      <h2 className="truncate font-bold text-gray-900 dark:text-white">{upload.name}</h2>
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className={failed ? "text-red-500" : "text-blue-500"}>{label}</span>
        {!failed && <span className="text-gray-500">{asset ? 99 : upload.progress}%</span>}
      </div>
      <div role="progressbar" aria-label={`${upload.name} upload`} aria-valuemin={0} aria-valuemax={100}
        aria-valuenow={asset ? 99 : upload.progress} aria-valuetext={label}
        className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
        <div className={`h-full rounded-full transition-all ${failed ? "bg-red-500" : "bg-blue-500"}`}
          style={{ width: `${asset ? 99 : upload.progress}%` }} />
      </div>
      <p className="line-clamp-2 text-xs leading-relaxed text-gray-600 dark:text-zinc-400">{upload.description || "No description provided."}</p>
      {failed ? <>
        <p role="alert" className="text-xs text-red-500">{upload.error || "Preview processing failed. Remove this upload and try again."}</p>
        <button type="button" onClick={onDismiss} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-red-500"><X className="h-3 w-3" /> Remove</button>
      </> : null}
    </div>
  </article>;
}
