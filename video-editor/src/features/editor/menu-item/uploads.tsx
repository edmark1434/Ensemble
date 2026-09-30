"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ADD_AUDIO, ADD_IMAGE, ADD_VIDEO } from "@designcombo/state";
import { dispatch } from "@designcombo/events";
import { generateId } from "@designcombo/timeline";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Draggable from "@/components/shared/draggable";
import { useIsDraggingOverTimeline } from "../hooks/is-dragging-over-timeline";
import useUploadStore from "../store/use-upload-store";
import ModalUpload from "@/components/modal-upload";
import {
  Music,
  Image as ImageIcon,
  Loader2,
  Upload,
  PlusIcon,
  Play,
  Pause,
  Clapperboard,
  AlertCircle
} from "lucide-react";
import useStore from "../store/use-store";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import axios from "axios";
import { getCurrentTime } from "@/features/editor/utils/time";
import { normalizeDimensionsToCanvas } from "@/features/editor/utils/dimensions";
import { useMasonryRows } from "@/features/editor/hooks/use-masonry-rows";
import useFileDropUpload from "@/features/editor/hooks/use-file-drop-upload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

// Mirrors buildNormalizedImagePayload in Images.tsx
const buildNormalizedImagePayload = (image: any) => {
  const details = image.details;
  if (!details || !details.width || !details.height) return image;

  const { size } = useStore.getState();
  const normalized = normalizeDimensionsToCanvas(
    details.width,
    details.height,
    size.width,
    size.height
  );

  return {
    ...image,
    details: {
      ...details,
      width: normalized.width,
      height: normalized.height,
      left: `${(size.width - normalized.width) / 2}px`,
      top: `${(size.height - normalized.height) / 2}px`
    }
  };
};

// Mirrors buildNormalizedVideoPayload in Videos.tsx
const buildNormalizedVideoPayload = (video: any) => {
  const details = video.details;
  if (!details || !details.width || !details.height) return video;

  const { size } = useStore.getState();

  return {
    ...video,
    details: {
      ...details,
      left: `${(size.width - details.width) / 2}px`,
      top: `${(size.height - details.height) / 2}px`
    }
  };
};

const formatDuration = (seconds: number) => {
  const rounded = Math.round(seconds);
  const min = Math.floor(rounded / 60);
  const sec = rounded % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
};

// Our own uploads don't come with a Pexels-style static thumbnail, so we
// generate a poster frame client-side. This is what feeds
// metadata.previewUrl, which the timeline's Video class reads
// unconditionally - without it, dropping a video on the timeline throws.
// Falls back to "" (no crash, just no fallback thumbnail) if the source
// blocks canvas reads via CORS - your S3/CDN needs a permissive
// crossorigin policy on video objects for this to succeed.
const extractVideoThumbnailFromUrl = (src: string): Promise<string> => {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";

    const timeout = setTimeout(() => finish(""), 8000);
    const finish = (result: string) => {
      clearTimeout(timeout);
      resolve(result);
    };

    video.onloadeddata = () => {
      try {
        video.currentTime = Math.min(1, (video.duration || 2) / 2);
      } catch {
        finish("");
      }
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        finish(canvas.toDataURL("image/jpeg", 0.7));
      } catch {
        // Tainted canvas (CORS) or decode failure - fall back gracefully.
        finish("");
      }
    };
    video.onerror = () => finish("");
    video.src = src;
  });
};

// Local blob preview for a File that hasn't finished uploading yet.
// Created once per file, revoked on cleanup so we don't leak blob URLs.
const useObjectUrl = (file?: File) => {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!file) {
      setUrl("");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return url;
};

// Classifies an in-flight upload (from useUploadStore) as image/video/audio.
// Adjust this if your store's shape for pending/active uploads differs.
const getUploadKind = (upload: any): "image" | "video" | "audio" | null => {
  const mime = upload.file?.type || upload.type || "";
  if (mime.startsWith("image/") || mime === "image") return "image";
  if (mime.startsWith("video/") || mime === "video") return "video";
  if (mime.startsWith("audio/") || mime === "audio") return "audio";
  return null;
};

// Strips our internal bookkeeping fields before an item goes to the timeline.
const stripEphemeralFields = (item: any) => {
  const { __status, __progress, file, ...rest } = item;
  return rest;
};

// Probes a File's natural width/height up front, before the DB has a
// value, so the masonry grid can lay it out correctly instead of
// defaulting to a square while the upload is still in flight.
const probeImageFileDimensions = (
  file: File
): Promise<{ width: number; height: number } | null> => {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(
        img.naturalWidth && img.naturalHeight
          ? { width: img.naturalWidth, height: img.naturalHeight }
          : null
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
};

const probeVideoFileDimensions = (
  file: File
): Promise<{ width: number; height: number; duration: number } | null> => {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(
        video.videoWidth && video.videoHeight
          ? {
            width: video.videoWidth,
            height: video.videoHeight,
            duration: Number.isFinite(video.duration) ? video.duration : 0
          }
          : null
      );
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    video.src = url;
  });
};

const probeImageUrlDimensions = (
  url: string
): Promise<{ width: number; height: number } | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve(
        img.naturalWidth && img.naturalHeight
          ? { width: img.naturalWidth, height: img.naturalHeight }
          : null
      );
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

const probeVideoUrlDimensions = (
  url: string
): Promise<{ width: number; height: number; duration: number } | null> => {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "metadata";

    const timeout = setTimeout(() => finish(null), 8000);
    const finish = (result: { width: number; height: number; duration: number } | null) => {
      clearTimeout(timeout);
      resolve(result);
    };

    video.onloadedmetadata = () => {
      finish(
        video.videoWidth && video.videoHeight
          ? {
            width: video.videoWidth,
            height: video.videoHeight,
            duration: Number.isFinite(video.duration) ? video.duration : 0
          }
          : null
      );
    };
    video.onerror = () => finish(null);
    video.src = url;
  });
};

const GRID_GAP = 8;
const TARGET_ROW_HEIGHT = 140;
const MIN_ROW_HEIGHT = 120;
const MAX_ROW_HEIGHT = 999999;

const UploadImageItem = ({
  item,
  onAdd,
  shouldDisplayPreview
}: {
  item: any;
  onAdd: (payload: any) => void;
  shouldDisplayPreview: boolean;
}) => {
  const isReady = item.__status === "ready" || item.__status == null;
  const isError = item.__status === "error";
  const progress = Math.min(100, Math.max(0, item.__progress ?? 0));

  const dbWidth = item.details?.width;
  const dbHeight = item.details?.height;

  // Only used as a fallback for assets uploaded before width/height were
  // stored server-side; if the DB already has them we never touch this.
  const [probedDimensions, setProbedDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const dimensions =
    dbWidth && dbHeight ? { width: dbWidth, height: dbHeight } : probedDimensions;

  const resolvedSrc = item.metadata?.uploadedUrl || item.url;
  const localPreviewUrl = useObjectUrl(item.file);
  const previewSrc =
    item.preview || (isReady ? resolvedSrc || localPreviewUrl : localPreviewUrl || resolvedSrc);
  const displayName = item.fileName || item.file?.name || item.name || "Untitled";

  const enrichedItem = useMemo(
    () => ({
      ...item,
      metadata: {
        ...item.metadata,
        name: displayName
      },
      details: {
        ...item.details,
        src: resolvedSrc,
        ...(dimensions ? { width: dimensions.width, height: dimensions.height } : {})
      }
    }),
    [item, dimensions, resolvedSrc, displayName]
  );

  const normalizedImage = useMemo(
    () => buildNormalizedImagePayload(enrichedItem),
    [enrichedItem]
  );

  const thumbnail = (
    <div className="relative w-full h-full rounded-md overflow-hidden bg-zinc-800">
      <div className={`w-full h-full ${!isReady ? "opacity-50" : ""}`}>
        {previewSrc ? (
          <img
            draggable={false}
            src={previewSrc}
            onLoad={(e) => {
              if (dbWidth && dbHeight) return;
              const img = e.currentTarget;
              if (img.naturalWidth && img.naturalHeight) {
                setProbedDimensions({ width: img.naturalWidth, height: img.naturalHeight });
              }
            }}
            className="w-full h-full rounded-md object-cover"
            alt={displayName}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      {!isReady &&
        (isError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-md">
            <AlertCircle className="h-6 w-6 text-red-500" />
          </div>
        ) : (
          <div className="absolute bottom-1 left-1 right-1 h-2 bg-black/30 overflow-hidden rounded-full">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        ))}
    </div>
  );

  if (!isReady) {
    return <div className="relative w-full h-full pointer-events-none">{thumbnail}</div>;
  }

  return (
    <Draggable
      data={normalizedImage}
      renderCustomPreview={
        <div
          style={{
            width: 120,
            height: 120,
            border: "1px solid var(--primary)",
            borderRadius: 6,
            overflow: "hidden",
            backgroundImage: `url(${previewSrc})`,
            backgroundSize: "cover"
          }}
        />
      }
      shouldDisplayPreview={shouldDisplayPreview}
    >
      <div
        onClick={() => onAdd(enrichedItem)}
        className="relative flex w-full h-full items-center justify-center overflow-hidden cursor-pointer group rounded-md"
      >
        {thumbnail}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
          <div className="rounded-full p-1">
            <PlusIcon className="h-6 w-6 fill-current" />
          </div>
        </div>
      </div>
    </Draggable>
  );
};

const UploadVideoItem = ({
  item,
  onAdd,
  shouldDisplayPreview
}: {
  item: any;
  onAdd: (payload: any) => void;
  shouldDisplayPreview: boolean;
}) => {
  const isReady = item.__status === "ready" || item.__status == null;
  const isError = item.__status === "error";
  const progress = Math.min(100, Math.max(0, item.__progress ?? 0));

  const dbWidth = item.details?.width;
  const dbHeight = item.details?.height;
  const dbDuration = item.details?.duration;

  const [probedMeta, setProbedMeta] = useState<{
    width: number;
    height: number;
    duration: number;
  } | null>(null);

  const meta =
    dbWidth && dbHeight
      ? { width: dbWidth, height: dbHeight, duration: dbDuration ?? probedMeta?.duration }
      : probedMeta;

  const resolvedSrc = item.metadata?.uploadedUrl || item.url;
  const localPreviewUrl = useObjectUrl(item.file);
  const videoSrc = resolvedSrc || localPreviewUrl;
  const displayName = item.fileName || item.file?.name || item.name || "Untitled";

  // Static first-frame thumbnail - this is the only visual representation
  // now, no hover-to-play. Generated once per src.
  const [posterDataUrl, setPosterDataUrl] = useState("");
  useEffect(() => {
    if (!videoSrc) return;
    let cancelled = false;
    extractVideoThumbnailFromUrl(videoSrc).then((url) => {
      if (!cancelled && url) setPosterDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [videoSrc]);

  // Fallback width/height/duration probe for assets the DB doesn't have yet,
  // done on a detached video element since we no longer render one visibly.
  useEffect(() => {
    if ((dbWidth && dbHeight && dbDuration != null) || !videoSrc) return;
    const probe = document.createElement("video");
    probe.muted = true;
    probe.preload = "metadata";
    probe.onloadedmetadata = () => {
      setProbedMeta({
        width: dbWidth || probe.videoWidth,
        height: dbHeight || probe.videoHeight,
        duration: dbDuration ?? (Number.isFinite(probe.duration) ? probe.duration : 0)
      });
    };
    probe.src = videoSrc;
    return () => {
      probe.onloadedmetadata = null;
    };
  }, [videoSrc, dbWidth, dbHeight, dbDuration]);

  const enrichedItem = useMemo(
    () => ({
      ...item,
      metadata: {
        ...item.metadata,
        name: displayName,
        previewUrl: posterDataUrl || undefined
      },
      details: {
        ...item.details,
        src: resolvedSrc,
        ...(meta ? { width: meta.width, height: meta.height, duration: meta.duration } : {})
      }
    }),
    [item, meta, resolvedSrc, displayName, posterDataUrl]
  );

  const normalizedVideo = useMemo(
    () => buildNormalizedVideoPayload(enrichedItem),
    [enrichedItem]
  );

  const thumbnail = (
    <div className="relative w-full h-full rounded-md overflow-hidden bg-zinc-800">
      <div className={`w-full h-full ${!isReady ? "opacity-50" : ""}`}>
        {posterDataUrl ? (
          <img
            draggable={false}
            src={posterDataUrl}
            className="w-full h-full rounded-md object-cover"
            alt={displayName}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      {!isReady &&
        (isError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-md">
            <AlertCircle className="h-6 w-6 text-red-500" />
          </div>
        ) : (
          <div className="absolute bottom-1 left-1 right-1 h-2 bg-black/30 overflow-hidden rounded-full">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        ))}
      {isReady && meta?.duration ? (
        <div className="absolute bottom-3 right-2 bg-secondary/90 text-secondary-foreground/90 text-xs px-1 py-0.5 rounded">
          {Math.round(meta.duration)}s
        </div>
      ) : null}
    </div>
  );

  if (!isReady) {
    return <div className="relative w-full h-full pointer-events-none">{thumbnail}</div>;
  }

  return (
    <Draggable
      data={normalizedVideo}
      renderCustomPreview={
        <div
          style={{
            width: 120,
            height: 120,
            border: "1px solid var(--primary)",
            borderRadius: 6,
            overflow: "hidden",
            backgroundImage: `url(${posterDataUrl})`,
            backgroundSize: "cover"
          }}
        />
      }
      shouldDisplayPreview={shouldDisplayPreview}
    >
      <div
        onClick={() => onAdd(enrichedItem)}
        className="relative flex w-full h-full items-center justify-center overflow-hidden cursor-pointer group rounded-md"
      >
        {thumbnail}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
          <div className="rounded-full p-1">
            <PlusIcon className="h-6 w-6 fill-current" />
          </div>
        </div>
      </div>
    </Draggable>
  );
};

const UploadAudioItem = ({
  item,
  onAdd,
  playingId,
  setPlayingId,
  shouldDisplayPreview
}: {
  item: any;
  onAdd: (payload: any) => void;
  playingId: string | null;
  setPlayingId: (id: string | null) => void;
  shouldDisplayPreview: boolean;
}) => {
  const isReady = item.__status === "ready" || item.__status == null;
  const isError = item.__status === "error";
  const progress = Math.min(100, Math.max(0, item.__progress ?? 0));

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const dbDuration = item.details?.duration;
  const [probedDurationSeconds, setProbedDurationSeconds] = useState<number | null>(null);
  const durationSeconds = dbDuration ?? probedDurationSeconds;
  const durationLabel = durationSeconds != null ? formatDuration(durationSeconds) : "--:--";

  const isPlaying = playingId === item.id;
  const resolvedSrc = item.metadata?.uploadedUrl || item.url;
  const localPreviewUrl = useObjectUrl(item.file);
  const audioSrc = resolvedSrc || localPreviewUrl;
  const displayName = item.fileName || item.file?.name || item.name || "Untitled";

  useEffect(() => {
    if (isPlaying) {
      audioRef.current?.play();
    } else {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
    }
  }, [isPlaying]);

  const togglePlay = () => {
    if (!isReady) return;
    setPlayingId(isPlaying ? null : item.id);
  };

  const handleLoadedMetadata = () => {
    if (dbDuration != null) return;
    if (audioRef.current && Number.isFinite(audioRef.current.duration)) {
      setProbedDurationSeconds(audioRef.current.duration);
    }
  };

  const enrichedItem = {
    ...item,
    metadata: {
      ...item.metadata,
      name: displayName
    },
    details: {
      ...item.details,
      src: resolvedSrc,
      ...(durationSeconds != null ? { duration: durationSeconds } : {})
    }
  };

  const row = (
    <div className="group relative flex items-center gap-3 px-3 py-2 rounded hover:bg-zinc-800/50 transition-colors">
      {isReady && (
        <audio
          ref={audioRef}
          src={audioSrc}
          onEnded={() => setPlayingId(null)}
          onLoadedMetadata={handleLoadedMetadata}
          className="hidden"
        />
      )}

      <Button
        size="icon"
        variant="ghost"
        className={`h-8 w-8 rounded-full bg-black/10 dark:bg-white/5 hover:bg-black/15 dark:hover:bg-white/10 shrink-0 ${
          !isReady && !isError ? "opacity-50 animate-spin" : ""
        }`}
        onClick={togglePlay}
        disabled={!isReady}
      >
        {isError ? (
          <AlertCircle className="size-4 text-red-500" />
        ) : !isReady ? (
          <Loader2 className="size-4 text-current" />
        ) : isPlaying ? (
          <Pause className="size-4 fill-current" />
        ) : (
          <Play className="size-4 fill-current ml-0.5" />
        )}
      </Button>

      <div
        onClick={() => isReady && onAdd(enrichedItem)}
        className="flex flex-col min-w-0 flex-1 cursor-pointer"
      >
  <span
    className={`text-sm font-semibold truncate mb-0.5 text-zinc-900 dark:text-zinc-300 ${
      !isReady ? "opacity-50" : ""
    }`}
  >
    {displayName}
  </span>
        {isReady ? (
          <span className="text-xs text-muted-foreground">
      {item.metadata?.author && `${item.metadata.author} · `}
            {durationLabel}
    </span>
        ) : isError ? (
          <span className="text-xs text-red-500">Upload failed</span>
        ) : (
          <div className="h-1 w-full max-w-[160px] bg-black/20 rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {isReady && isPlaying && (
        <div className="flex items-end gap-[2px] h-4 shrink-0">
          {[...Array(5)].map((_, i) => (
            <span
              key={i}
              className="w-[3px] bg-primary rounded-full"
              style={{
                height: "100%",
                animationName: "wave-bar",
                animationDelay: `${i * 0.15}s`,
                animationDuration: "0.8s",
                animationIterationCount: "infinite",
                animationTimingFunction: "ease-in-out",
                display: "inline-block"
              }}
            />
          ))}
        </div>
      )}
    </div>
  );

  if (!isReady) {
    return <div className="pointer-events-none">{row}</div>;
  }

  return (
    <Draggable
      data={enrichedItem}
      renderCustomPreview={
        <div className="w-[120px] h-[120px] rounded-md flex items-center justify-center bg-zinc-800 border border-primary">
          <Music className="text-muted-foreground" size={40} />
        </div>
      }
      shouldDisplayPreview={shouldDisplayPreview}
    >
      {row}
    </Draggable>
  );
};

// Mirrors Images.tsx's body exactly: own containerRef + ResizeObserver +
// useMasonryRows, not shared with any other tab.
const UploadImagesGrid = ({
  items,
  onAdd,
  shouldDisplayPreview
}: {
  items: any[];
  onAdd: (payload: any) => void;
  shouldDisplayPreview: boolean;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const rows = useMasonryRows(items, containerWidth, {
    gap: GRID_GAP,
    targetRowHeight: TARGET_ROW_HEIGHT,
    minRowHeight: MIN_ROW_HEIGHT,
    maxRowHeight: MAX_ROW_HEIGHT
  });

  if (items.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
        <ImageIcon size={32} className="opacity-50" />
        <span className="text-sm">No images uploaded yet</span>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 px-4 h-full">
      <div ref={containerRef} className="flex flex-col gap-2 pb-4">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-2" style={{ height: row.height }}>
            {row.items.map(({ item, width }, i) => (
              <div
                key={`${item.id}-${rowIndex}-${i}`}
                className="h-full"
                style={{ width, height: row.height }}
              >
                <UploadImageItem item={item} onAdd={onAdd} shouldDisplayPreview={shouldDisplayPreview} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

// Mirrors Videos.tsx's body exactly.
const UploadVideosGrid = ({
  items,
  onAdd,
  shouldDisplayPreview
}: {
  items: any[];
  onAdd: (payload: any) => void;
  shouldDisplayPreview: boolean;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const rows = useMasonryRows(items, containerWidth, {
    gap: GRID_GAP,
    targetRowHeight: TARGET_ROW_HEIGHT,
    minRowHeight: MIN_ROW_HEIGHT,
    maxRowHeight: MAX_ROW_HEIGHT
  });

  if (items.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
        <Clapperboard size={32} className="opacity-50" />
        <span className="text-sm">No videos uploaded yet</span>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 px-4 h-full">
      <div ref={containerRef} className="flex flex-col gap-2 pb-4">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-2" style={{ height: row.height }}>
            {row.items.map(({ item, width }, i) => (
              <div
                key={`${item.id}-${rowIndex}-${i}`}
                className="h-full"
                style={{ width, height: row.height }}
              >
                <UploadVideoItem item={item} onAdd={onAdd} shouldDisplayPreview={shouldDisplayPreview} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export const Uploads = () => {
  const { setShowUploadModal, pendingUploads, activeUploads, uploads, setUploads } = useUploadStore();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const isDraggingOverTimeline = useIsDraggingOverTimeline();
  const queryClient = useQueryClient();
  const { isDragOver, dragError, handleDragEnter, handleDragOver, handleDragLeave, handleDrop } =
    useFileDropUpload();

  const [activeTab, setActiveTab] = useState<"videos" | "images" | "audio">("videos");
  const seenUploadIdsRef = useRef<Set<string>>(new Set());

  const { projectId, userId } = useStore();
  const [scope, setScope] = useState<"mine" | "project" | "mine-in-project">("mine");

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["media-assets", projectId, scope, scope === "project" ? null : userId],
    queryFn: () => {
      const params = new URLSearchParams({ projectId, scope });
      if (scope !== "project") params.set("userId", userId);
      return axios.get(`/api/media-assets?${params}`).then((r) => r.data.uploads);
    },
    enabled: !!projectId && (scope === "project" || !!userId)
  });

  // Whenever a new upload lands in pending/active (i.e. its loading state
  // starts showing up in the grid below), jump to the tab matching its
  // media type. Only reacts to genuinely new ids, so progress ticks on
  // uploads already in flight don't keep yanking the tab back.
  useEffect(() => {
    const current = [...pendingUploads, ...activeUploads];
    const newOnes = current.filter((u) => !seenUploadIdsRef.current.has(u.id));

    if (newOnes.length > 0) {
      const kind = getUploadKind(newOnes[0]);
      if (kind === "video") setActiveTab("videos");
      else if (kind === "image") setActiveTab("images");
      else if (kind === "audio") setActiveTab("audio");
    }

    seenUploadIdsRef.current = new Set(current.map((u) => u.id));
  }, [pendingUploads, activeUploads]);

  // Client-side dimension probes for images that haven't hit the DB yet,
  // keyed by upload id, so the masonry grid can size them correctly.
  const [probedImageFileDims, setProbedImageFileDims] = useState<Record<string, { width: number; height: number }>>({});
  const probingImageIdsRef = useRef<Set<string>>(new Set());

  const [probedVideoFileDims, setProbedVideoFileDims] = useState<Record<string, { width: number; height: number; duration: number }>>({});
  const probingVideoIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const toProbe = [...pendingUploads, ...activeUploads].filter((u) => {
      const kind = getUploadKind(u);
      return (
        kind === "image" &&
        (u.file || u.url) &&
        !probedImageFileDims[u.id] &&
        !probingImageIdsRef.current.has(u.id)
      );
    });
    if (toProbe.length === 0) return;

    toProbe.forEach((u) => {
      probingImageIdsRef.current.add(u.id);
      const probe = u.file ? probeImageFileDimensions(u.file) : probeImageUrlDimensions(u.url!);
      probe.then((dims) => {
        probingImageIdsRef.current.delete(u.id);
        if (dims) {
          setProbedImageFileDims((prev) => ({ ...prev, [u.id]: dims }));
        }
      });
    });
  }, [pendingUploads, activeUploads, probedImageFileDims]);

  useEffect(() => {
    const toProbe = [...pendingUploads, ...activeUploads].filter((u) => {
      const kind = getUploadKind(u);
      return (
        kind === "video" &&
        (u.file || u.url) &&
        !probedVideoFileDims[u.id] &&
        !probingVideoIdsRef.current.has(u.id)
      );
    });
    if (toProbe.length === 0) return;

    toProbe.forEach((u) => {
      probingVideoIdsRef.current.add(u.id);
      const probe = u.file ? probeVideoFileDimensions(u.file) : probeVideoUrlDimensions(u.url!);
      probe.then((dims) => {
        probingVideoIdsRef.current.delete(u.id);
        if (dims) {
          setProbedVideoFileDims((prev) => ({ ...prev, [u.id]: dims }));
        }
      });
    });
  }, [pendingUploads, activeUploads, probedVideoFileDims]);

  // Completed uploads land in the store's `uploads` array (see
  // processUploads/setUploads in use-upload-store.ts) but the grid above
  // reads from react-query. Without this, a finished upload disappears
  // from the ephemeral list after removeUpload's 3s timeout and never
  // shows up as "ready" until something else refetches media-assets.
  useEffect(() => {
    if (uploads.length === 0) return;
    queryClient.invalidateQueries({ queryKey: ["media-assets", projectId] });
    setUploads([]);
  }, [uploads, queryClient, projectId, setUploads]);

  // In-flight uploads, grouped by kind and tagged with status/progress so
  // the item components know to render dimmed + non-interactive.
  const ephemeralByKind = useMemo(() => {
    const grouped: { image: any[]; video: any[]; audio: any[] } = {
      image: [],
      video: [],
      audio: []
    };
    for (const upload of [...pendingUploads, ...activeUploads]) {
      const kind = getUploadKind(upload);
      if (!kind) continue;
      const errored = upload.status === "failed" || !!upload.error;
      const probedImageDims = kind === "image" ? probedImageFileDims[upload.id] : undefined;
      const probedVideoDims = kind === "video" ? probedVideoFileDims[upload.id] : undefined;
      const probedDims = probedImageDims ?? probedVideoDims;

      grouped[kind].push({
        ...upload,
        fileName: upload.file?.name || upload.fileName || upload.name || "Uploading…",
        __status: errored ? "error" : "uploading",
        __progress: upload.progress ?? 0,
        ...(probedDims
          ? {
            details: {
              ...upload.details,
              width: probedDims.width,
              height: probedDims.height,
              ...(probedVideoDims ? { duration: probedVideoDims.duration } : {})
            }
          }
          : {})
      });
    }
    return grouped;
  }, [pendingUploads, activeUploads, probedImageFileDims, probedVideoFileDims]);

  const resolveItemName = (item: any) =>
    item.fileName || item.file?.name || item.name || "";

  const ephemeralNames = useMemo(
    () =>
      new Set(
        [...pendingUploads, ...activeUploads]
          .map(resolveItemName)
          .filter(Boolean)
      ),
    [pendingUploads, activeUploads]
  );

  const videos = useMemo(
    () => [
      ...ephemeralByKind.video,
      ...data
        .filter(
          (u: any) =>
            (u.type?.startsWith("video/") || u.type === "video") &&
            !ephemeralNames.has(resolveItemName(u))
        )
        .map((u: any) => ({ ...u, __status: "ready" }))
    ],
    [data, ephemeralByKind.video, ephemeralNames]
  );

  const images = useMemo(
    () => [
      ...ephemeralByKind.image,
      ...data
        .filter(
          (u: any) =>
            (u.type?.startsWith("image/") || u.type === "image") &&
            !ephemeralNames.has(resolveItemName(u))
        )
        .map((u: any) => ({ ...u, __status: "ready" }))
    ],
    [data, ephemeralByKind.image, ephemeralNames]
  );

  const audios = useMemo(
    () => [
      ...ephemeralByKind.audio,
      ...data
        .filter(
          (u: any) =>
            (u.type?.startsWith("audio/") || u.type === "audio") &&
            !ephemeralNames.has(resolveItemName(u))
        )
        .map((u: any) => ({ ...u, __status: "ready" }))
    ],
    [data, ephemeralByKind.audio, ephemeralNames]
  );

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full h-full flex items-center justify-center py-10 text-sm text-red-500">
        Failed to load uploads
      </div>
    );
  }

  const handleAddVideo = (video: any) => {
    if (video.__status && video.__status !== "ready") return;
    const clean = stripEphemeralFields(video);
    const srcVideo = clean.metadata?.uploadedUrl || clean.url;
    const payload = { ...clean, details: { ...clean.details, src: srcVideo } };
    const normalizedPayload = buildNormalizedVideoPayload(payload);
    const time = getCurrentTime();
    const durationMs = ((normalizedPayload.details as any)?.duration ?? 5) * 1000;

    dispatch(ADD_VIDEO, {
      payload: {
        ...normalizedPayload,
        id: generateId(),
        metadata: {
          ...normalizedPayload.metadata,
          name: normalizedPayload.fileName || normalizedPayload.name
        },
        display: {
          from: time,
          to: time + durationMs
        }
      },
      options: {
        resourceId: "main"
      }
    });
  };

  const handleAddImage = (image: any) => {
    if (image.__status && image.__status !== "ready") return;
    const clean = stripEphemeralFields(image);
    const srcImage = clean.metadata?.uploadedUrl || clean.url;
    const payload = { ...clean, details: { ...clean.details, src: srcImage } };
    const normalizedPayload = buildNormalizedImagePayload(payload);
    const time = getCurrentTime();
    const DEFAULT_IMAGE_DURATION_MS = 5000;

    dispatch(ADD_IMAGE, {
      payload: {
        ...normalizedPayload,
        id: generateId(),
        metadata: {
          ...normalizedPayload.metadata,
          name: normalizedPayload.fileName || normalizedPayload.name
        },
        display: {
          from: time,
          to: time + DEFAULT_IMAGE_DURATION_MS
        }
      },
      options: {}
    });
  };

  const handleAddAudio = (audio: any) => {
    if (audio.__status && audio.__status !== "ready") return;
    const clean = stripEphemeralFields(audio);
    const srcAudio = clean.metadata?.uploadedUrl || clean.url;
    const time = getCurrentTime();
    const durationMs = ((clean.details as any)?.duration ?? 5) * 1000;

    dispatch(ADD_AUDIO, {
      payload: {
        id: generateId(),
        type: "audio",
        details: {
          src: srcAudio,
          duration: clean.details?.duration
        },
        metadata: {
          name: clean.fileName || clean.name
        },
        display: {
          from: time,
          to: time + durationMs
        }
      },
      options: {}
    });
  };

  const noUploads = images.length === 0 && videos.length === 0 && audios.length === 0;

  return (
    <div
      className="relative flex h-full w-full flex-col min-h-0 overflow-hidden"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <ModalUpload />

      {(isDragOver || dragError) && (
        <div
          className={`pointer-events-none absolute inset-2 z-10 flex items-center justify-center rounded-md border border-dashed ${
            dragError ? "border-red-500 bg-red-500/10" : "border-primary bg-primary/10"
          }`}
        >
          {dragError && (
            <span className="rounded bg-card/90 px-3 py-1 text-sm font-medium text-red-500">
        {dragError}
      </span>
          )}
        </div>
      )}

      <div className="flex flex-col gap-4 p-4 pb-2">
        <Button
          className="w-full cursor-pointer"
          onClick={() => setShowUploadModal(true)}
          variant={"default"}
        >
          Upload files
        </Button>

        <Select value={scope} onValueChange={(value) => setScope(value as typeof scope)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mine">Your uploads</SelectItem>
            <SelectItem value="project">Uploads in this project</SelectItem>
            <SelectItem value="mine-in-project">Your uploads in this project</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {noUploads ? (
        <div className="h-full flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
          <Upload size={32} className="opacity-50" />
          <span className="text-sm">No uploads yet</span>
        </div>
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "videos" | "images" | "audio")}
          className="w-full flex-1 min-h-0 flex flex-col"
        >
          <TabsList className="h-9 mx-4 w-[calc(100%-32px)]">
            <TabsTrigger value="videos">Videos</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="audio">Audio</TabsTrigger>
          </TabsList>

          <TabsContent value="videos" className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <UploadVideosGrid
              items={videos}
              onAdd={handleAddVideo}
              shouldDisplayPreview={!isDraggingOverTimeline}
            />
          </TabsContent>

          <TabsContent value="images" className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <UploadImagesGrid
              items={images}
              onAdd={handleAddImage}
              shouldDisplayPreview={!isDraggingOverTimeline}
            />
          </TabsContent>

          <TabsContent value="audio" className="flex-1 min-h-0 flex flex-col">
            {audios.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                <Music size={32} className="opacity-50" />
                <span className="text-sm">No audio uploaded yet</span>
              </div>
            ) : (
              <ScrollArea className="flex-1 h-full max-w-full px-4">
                <div className="flex flex-col gap-2 pb-4">
                  {audios.map((audio: any, index: number) => (
                    <UploadAudioItem
                      key={audio.id || index}
                      item={audio}
                      onAdd={handleAddAudio}
                      playingId={playingId}
                      setPlayingId={setPlayingId}
                      shouldDisplayPreview={!isDraggingOverTimeline}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};