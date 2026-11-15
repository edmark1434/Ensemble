import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  AudioLines,
  Download,
  ExternalLink,
  FileWarning,
  Image as ImageIcon,
  Loader2,
  Lock,
  Maximize2,
  ShieldCheck,
  Video,
  X,
} from 'lucide-react';
import api from '@/lib/axios';
import { showErrorToast } from '@/components/utility/toast.ts';
import { mediaUrl, readableSize } from '@/pages/user/5_assets/assetTypes';
import type {
  ListingAssetMediaFile,
  ListingAssetThumbnail,
  ListingOriginalAccess,
} from './marketplaceTypes';

type StageKind = 'image' | 'video' | 'audio' | 'other';

/** What the inspector is looking at: a content file, or a showcase image. */
export type InspectorTarget =
  | { kind: 'file'; file: ListingAssetMediaFile }
  | { kind: 'showcase'; thumb: ListingAssetThumbnail; index: number };

type ViewMode = 'preview' | 'original';

function kindFor(type: string | null | undefined, mimeType?: string | null): StageKind {
  const t = String(type || '').toLowerCase();
  const m = String(mimeType || '').toLowerCase();
  if (t === 'image' || m.startsWith('image/')) return 'image';
  if (t === 'video' || m.startsWith('video/')) return 'video';
  if (t === 'audio' || m.startsWith('audio/')) return 'audio';
  return 'other';
}

export function formatDuration(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(seconds)) return null;
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

export function FileTypeIcon({ type, className = 'h-3.5 w-3.5' }: { type: string; className?: string }) {
  if (type === 'video') return <Video className={className} />;
  if (type === 'audio') return <AudioLines className={className} />;
  return <ImageIcon className={className} />;
}

/** Renders one media source; shared by the inline stage and the full-screen view. */
function MediaStage({
  src,
  kind,
  name,
  large = false,
  watermarked,
  onError,
}: {
  src: string;
  kind: StageKind;
  name: string;
  large?: boolean;
  watermarked: boolean;
  onError: () => void;
}) {
  const height = large ? 'max-h-[80vh]' : 'max-h-[420px]';
  // The watermarked preview mirrors what buyers see, so it keeps the member-side protections.
  const protect = watermarked
    ? { onContextMenu: (event: React.MouseEvent) => event.preventDefault() }
    : {};
  if (kind === 'image') {
    return (
      <img
        src={src}
        alt={name}
        onError={onError}
        draggable={!watermarked}
        className={`${height} max-w-full object-contain`}
        {...protect}
      />
    );
  }
  if (kind === 'video') {
    return (
      <video
        key={src}
        src={src}
        controls
        playsInline
        preload="metadata"
        controlsList={watermarked ? 'nodownload' : undefined}
        onError={onError}
        className={`${height} w-full bg-black`}
        {...protect}
      />
    );
  }
  if (kind === 'audio') {
    return (
      <div className="flex w-full max-w-xl flex-col items-center gap-5 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-amber-300">
        <AudioLines className="h-14 w-14" />
        <audio
          key={src}
          src={src}
          controls
          preload="metadata"
          controlsList={watermarked ? 'nodownload' : undefined}
          onError={onError}
          className="w-full"
        />
      </div>
    );
  }
  return (
    <p className="text-sm text-zinc-400">
      This file type cannot be shown in the browser. Download it to inspect it.
    </p>
  );
}

/**
 * Review stage for one submitted file.
 *
 * "Watermarked preview" is the public proxy buyers see; it does not exist for video or audio
 * until processing finishes. "Original upload" fetches a short-lived signed link to exactly
 * what the seller uploaded, which is what a reviewer needs to judge quality or a copyright
 * claim. Opening or downloading an original is written to the seller's activity log.
 */
export default function ListingFileInspector({
  listingId,
  apiBase,
  target,
}: {
  listingId: string;
  apiBase: string;
  target: InspectorTarget;
}) {
  const file = target.kind === 'file' ? target.file : null;
  const mediaAssetId = file ? file.mediaAssetId : target.kind === 'showcase' ? target.thumb.mediaAssetId : '';
  const name =
    file?.originalName ||
    file?.name ||
    (target.kind === 'showcase' ? `Showcase image ${target.index + 1}` : 'File');
  const previewPath =
    target.kind === 'showcase'
      ? target.thumb.path
      : file?.processingStatus === 'ready'
        ? file.proxyPath || (file.type === 'image' ? file.thumbnailPath : null)
        : null;
  const previewUrl = previewPath ? mediaUrl(previewPath) : '';
  const fileKind = kindFor(file?.type || 'image', file?.mimeType);

  const [mode, setMode] = useState<ViewMode>(previewUrl ? 'preview' : 'original');
  const [original, setOriginal] = useState<(ListingOriginalAccess & { fetchedAt: number }) | null>(
    null
  );
  const [loadingOriginal, setLoadingOriginal] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // A new target starts clean; the original is only requested when the reviewer asks for it.
  useEffect(() => {
    setMode(previewUrl ? 'preview' : 'original');
    setOriginal(null);
    setFailed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaAssetId, previewPath]);

  // Escape leaves full screen without also closing the listing review behind it.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setExpanded(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [expanded]);

  const originalExpired =
    original !== null && Date.now() - original.fetchedAt > (original.expiresIn - 30) * 1000;

  const requestOriginal = async (download: boolean) => {
    const res = await api.get(`${apiBase}/listings/${listingId}/media/${mediaAssetId}/original`, {
      params: download ? { download: 1 } : undefined,
    });
    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to open the original');
    return res.data.data as ListingOriginalAccess;
  };

  const openOriginal = async () => {
    setMode('original');
    setFailed(false);
    if (original && !originalExpired) return;
    setLoadingOriginal(true);
    try {
      const data = await requestOriginal(false);
      setOriginal({ ...data, fetchedAt: Date.now() });
    } catch (err) {
      showErrorToast(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to open the original file'
      );
    } finally {
      setLoadingOriginal(false);
    }
  };

  const downloadOriginal = async () => {
    setDownloading(true);
    try {
      const data = await requestOriginal(true);
      const link = document.createElement('a');
      link.href = data.url;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      showErrorToast(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to download the original file'
      );
    } finally {
      setDownloading(false);
    }
  };

  const originalKind = kindFor(file?.type || 'image', original?.mimeType || file?.mimeType);
  const stageSrc = mode === 'preview' ? previewUrl : original && !originalExpired ? original.url : '';
  const stageKind = mode === 'preview' ? (target.kind === 'showcase' ? 'image' : fileKind) : originalKind;

  const previewUnavailableText =
    target.kind === 'showcase'
      ? 'Showcase image is unavailable.'
      : file?.processingStatus === 'processing'
        ? 'The watermarked preview is still being generated.'
        : file?.processingStatus === 'failed'
          ? 'Generating the watermarked preview failed.'
          : 'No watermarked preview exists for this file.';

  const tabClass = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
      active ? 'bg-amber-500/15 text-amber-100' : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200'
    }`;

  const stage = (large: boolean) => {
    if (mode === 'original' && loadingOriginal) {
      return <Loader2 className="h-6 w-6 animate-spin text-amber-400" />;
    }
    if (mode === 'original' && originalExpired) {
      return (
        <button
          type="button"
          onClick={() => void openOriginal()}
          className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:text-white"
        >
          The signed link expired — reopen the original
        </button>
      );
    }
    if (!stageSrc || failed) {
      if (mode === 'preview') {
        return (
          <div className="max-w-sm space-y-3 text-center">
            <p className="text-sm text-zinc-400">{previewUnavailableText}</p>
            {file?.processingStatus === 'failed' && file.processingError && (
              <p className="rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-left font-mono text-[11px] text-red-200">
                {file.processingError}
              </p>
            )}
            <button
              type="button"
              onClick={() => void openOriginal()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-200 hover:bg-amber-500/20"
            >
              <Lock className="h-3.5 w-3.5" />
              Inspect the original upload instead
            </button>
          </div>
        );
      }
      return (
        <div className="max-w-sm space-y-3 text-center">
          <p className="text-sm text-zinc-400">
            {failed
              ? 'The browser could not play this file. Download it to inspect it locally.'
              : 'Open the original to inspect exactly what the seller uploaded.'}
          </p>
          {!failed && (
            <button
              type="button"
              onClick={() => void openOriginal()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-200 hover:bg-amber-500/20"
            >
              <Lock className="h-3.5 w-3.5" />
              Open original
            </button>
          )}
        </div>
      );
    }
    return (
      <MediaStage
        src={stageSrc}
        kind={stageKind}
        name={name}
        large={large}
        watermarked={mode === 'preview'}
        onError={() => setFailed(true)}
      />
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0b0c11]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2">
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => {
              setMode('preview');
              setFailed(false);
            }}
            className={tabClass(mode === 'preview')}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {target.kind === 'showcase' ? 'Showcase image' : 'Watermarked preview'}
          </button>
          <button type="button" onClick={() => void openOriginal()} className={tabClass(mode === 'original')}>
            <Lock className="h-3.5 w-3.5" />
            Original upload
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {stageSrc && !failed && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-300 hover:text-white"
              title="Full screen"
            >
              <Maximize2 className="h-3 w-3" />
              Expand
            </button>
          )}
          {mode === 'original' && original && !originalExpired && (
            <a
              href={original.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-300 hover:text-white"
            >
              <ExternalLink className="h-3 w-3" />
              New tab
            </a>
          )}
          <button
            type="button"
            onClick={() => void downloadOriginal()}
            disabled={downloading}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-300 hover:text-white disabled:opacity-50"
          >
            {downloading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
            Download original
          </button>
        </div>
      </div>

      <div className="flex min-h-[260px] items-center justify-center bg-black/30 p-4">
        {expanded ? <p className="text-xs text-zinc-500">Showing full screen</p> : stage(false)}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/[0.06] px-3 py-2 text-[11px] text-zinc-500">
        <span className="truncate text-zinc-300" title={name}>
          {name}
        </span>
        {file?.mimeType && <span className="font-mono">{file.mimeType}</span>}
        {file?.sizeBytes ? <span>{readableSize(file.sizeBytes)}</span> : null}
        {file?.width && file?.height ? (
          <span>
            {file.width}×{file.height}
          </span>
        ) : null}
        {formatDuration(file?.durationSeconds) && <span>{formatDuration(file?.durationSeconds)}</span>}
        {mode === 'original' ? (
          <span className="inline-flex items-center gap-1 text-amber-200/80">
            <AlertTriangle className="h-3 w-3" />
            Unwatermarked seller file — access is logged
          </span>
        ) : (
          <span className="inline-flex items-center gap-1">
            <FileWarning className="h-3 w-3" />
            What buyers see before purchase
          </span>
        )}
      </div>

      {expanded && stageSrc && (
        <div
          className="fixed inset-0 z-[80] flex flex-col bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setExpanded(false)}
        >
          <div className="flex items-center justify-between pb-3" onClick={(e) => e.stopPropagation()}>
            <p className="truncate text-sm font-medium text-white">
              {name}
              <span className="ml-2 text-xs text-zinc-500">
                {mode === 'original' ? 'Original upload' : 'Watermarked preview'}
              </span>
            </p>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white"
              aria-label="Close full screen"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div
            className="flex flex-1 items-center justify-center overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {stage(true)}
          </div>
        </div>
      )}
    </div>
  );
}
