import { useState } from 'react';
import { AudioLines, Image as ImageIcon, LayoutTemplate, Package, Video } from 'lucide-react';
import { mediaUrl } from '@/pages/user/5_assets/assetTypes';

const SIZES = {
  sm: { box: 'h-10 w-10 rounded-lg', icon: 'h-4 w-4' },
  md: { box: 'h-12 w-12 rounded-lg', icon: 'h-5 w-5' },
} as const;

/** Tinted per content type so a row without a cover still says what was submitted. */
const FALLBACK: Record<string, { icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  video: { icon: Video, tone: 'bg-sky-500/10 text-sky-300' },
  audio: { icon: AudioLines, tone: 'bg-violet-500/10 text-violet-300' },
  image: { icon: ImageIcon, tone: 'bg-emerald-500/10 text-emerald-300' },
  template: { icon: LayoutTemplate, tone: 'bg-amber-500/10 text-amber-300' },
};

/**
 * Listing cover for queues and headers.
 *
 * Shows the asset's cover (a video poster is an mp4 clip, so it plays muted as a still), and
 * falls back to a content-type icon when there is no cover or the file fails to load, instead
 * of an empty broken-image square.
 */
export default function ListingThumb({
  path,
  mimeType,
  assetType,
  title,
  size = 'sm',
}: {
  path: string | null | undefined;
  mimeType?: string | null;
  assetType?: string | null;
  title?: string;
  size?: keyof typeof SIZES;
}) {
  const [failedPath, setFailedPath] = useState<string | null>(null);
  const dims = SIZES[size];
  const src = path ? mediaUrl(path) : '';
  const usable = Boolean(src) && failedPath !== src;

  if (usable && String(mimeType || '').toLowerCase().startsWith('video/')) {
    return (
      <video
        src={src}
        muted
        playsInline
        preload="metadata"
        onError={() => setFailedPath(src)}
        aria-label={title ? `Cover of ${title}` : undefined}
        className={`${dims.box} shrink-0 bg-black object-cover ring-1 ring-white/10`}
      />
    );
  }

  if (usable) {
    return (
      <img
        src={src}
        alt={title ? `Cover of ${title}` : ''}
        loading="lazy"
        onError={() => setFailedPath(src)}
        className={`${dims.box} shrink-0 object-cover ring-1 ring-white/10`}
      />
    );
  }

  const fallback = FALLBACK[String(assetType || '').toLowerCase()];
  const Icon = fallback?.icon || Package;
  return (
    <span
      className={`flex ${dims.box} shrink-0 items-center justify-center ring-1 ring-white/10 ${
        fallback?.tone || 'bg-white/[0.04] text-zinc-500'
      }`}
      title={assetType ? `${assetType} · no cover image` : 'No cover image'}
    >
      <Icon className={dims.icon} />
    </span>
  );
}
