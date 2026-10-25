import { Image, Clapperboard, AudioLines } from "lucide-react";
import type { AssetRecord } from "./assetTypes";
import { mediaUrl } from "./assetTypes";

interface AssetMediaProps {
  asset: AssetRecord;
  compact?: boolean;
  thumbnailOnly?: boolean;
}

export default function AssetMedia({ asset, compact = false, thumbnailOnly = false }: AssetMediaProps) {
  const src = mediaUrl(compact || thumbnailOnly
    ? asset.thumbnail_path || asset.proxy_path
    : asset.proxy_path || asset.thumbnail_path);
  const common = compact ? "h-48 w-full" : "max-h-[68vh] min-h-64 w-full";

  if (asset.processing_status === "processing" || asset.processing_status === "failed") {
    return <MediaFallback
      icon={asset.type === "video" ? Clapperboard : asset.type === "audio" ? AudioLines : Image}
      label={asset.processing_status === "failed" ? "Preview processing failed" : "Preparing preview…"}
      className={common}
    />;
  }

  if ((compact || thumbnailOnly) && asset.type === "audio" && !asset.thumbnail_path) {
    return <MediaFallback icon={AudioLines} label="Audio asset" className={common} />;
  }

  if ((compact || thumbnailOnly) && src) {
    return (
      <div className={`relative ${common} select-none overflow-hidden bg-gray-100 dark:bg-black/30`} onContextMenu={(event) => event.preventDefault()}>
        <img src={src} alt={`${asset.name} thumbnail`} loading={compact ? "lazy" : "eager"} draggable={false} className="h-full w-full pointer-events-none object-contain" />
        <div className="absolute inset-0" aria-hidden="true" />
      </div>
    );
  }

  if (asset.type === "image") {
    return src ? (
      <div
        className={`relative ${common} select-none overflow-hidden bg-gray-100 dark:bg-black/30`}
        onContextMenu={(event) => event.preventDefault()}
      >
        <img
          src={src}
          alt={asset.name}
          loading={compact ? "lazy" : "eager"}
          draggable={false}
          className="h-full w-full pointer-events-none object-contain"
        />
        <div className="absolute inset-0" aria-hidden="true" />
      </div>
    ) : (
      <MediaFallback icon={Image} label="Image preview unavailable" className={common} />
    );
  }

  if ((asset.type === "video" || asset.type === "audio") && asset.processing_status !== "ready") {
    return (
      <MediaFallback
        icon={asset.type === "video" ? Clapperboard : AudioLines}
        label={asset.processing_status === "failed" ? "Preview processing failed" : "Preview is being processed"}
        className={common}
      />
    );
  }

  if (asset.type === "video") {
    return src ? (
      <video
        src={src}
        controls={!compact}
        preload="metadata"
        playsInline
        className={`${common} bg-black object-contain`}
        aria-label={`${asset.name} video`}
      />
    ) : (
      <MediaFallback icon={Clapperboard} label="Video preview unavailable" className={common} />
    );
  }

  return (
    <div className={`${common} flex flex-col items-center justify-center gap-5 bg-gray-100 p-6 dark:bg-[#111522]`}>
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600/10 text-blue-500 dark:text-blue-300">
        <AudioLines className="h-8 w-8" aria-hidden="true" />
      </span>
      {!compact && src ? (
        <audio src={src} controls preload="metadata" className="w-full max-w-xl" aria-label={`${asset.name} audio`} />
      ) : (
        <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">{compact ? "Audio asset" : "Audio preview unavailable"}</p>
      )}
    </div>
  );
}

function MediaFallback({
  icon: Icon,
  label,
  className,
}: {
  icon: typeof Image;
  label: string;
  className: string;
}) {
  return (
    <div className={`${className} flex flex-col items-center justify-center gap-3 bg-gray-100 text-gray-500 dark:bg-[#111522] dark:text-zinc-500`}>
      <Icon className="h-10 w-10" aria-hidden="true" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
