import { Image as ImageIcon, Music2, Video } from "lucide-react";
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
      <MediaFallback icon={ImageIcon} label="Image preview unavailable" className={common} />
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
      <MediaFallback icon={Video} label="Video preview unavailable" className={common} />
    );
  }

  return (
    <div className={`${common} flex flex-col items-center justify-center gap-5 bg-gray-100 p-6 dark:bg-[#111522]`}>
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600/10 text-blue-500 dark:text-blue-300">
        <Music2 className="h-8 w-8" aria-hidden="true" />
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
  icon: typeof ImageIcon;
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
