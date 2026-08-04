import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "./ui/dialog";
import { FileIcon, Link2, Music, Plus, UploadIcon, X } from "lucide-react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { AnimatePresence } from "framer-motion";
import clsx from "clsx";
import useUploadStore from "@/features/editor/store/use-upload-store";
import { Input } from "./ui/input";
import {useIsLargeScreen, useIsMediumScreen} from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import {MAX_FILE_COUNT, MAX_FILE_SIZE_BYTES } from "@/constants/upload-limits";
import useLayoutStore from "@/features/editor/store/use-layout-store";
import { formatFileSize } from "@/features/editor/hooks/use-file-drop-upload";

type ModalUploadProps = {
  type?: string;
};

type UrlKind = "image" | "video" | "audio" | "url";

type PendingUrlItem = {
  id: string;
  url: string;
  kind: UrlKind;
  sizeBytes: number | null; // null = unknown (still probing or probe failed)
  thumbnail: string | null; // null = no thumbnail available
  probing: boolean;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
};

export const extractVideoThumbnail = (file: File) => {
  return new Promise<string>((resolve) => {
    const video = document.createElement("video");
    video.src = URL.createObjectURL(file);
    video.currentTime = 1;
    video.muted = true;
    video.playsInline = true;
    video.onloadeddata = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/png"));
    };
    video.onerror = () => resolve("");
  });
};

function guessKindFromUrl(url: string): UrlKind {
  const clean = url.split("?")[0].split("#")[0].toLowerCase();
  const ext = clean.split(".").pop() || "";
  if (["jpg", "jpeg", "png", "gif", "webp", "avif", "svg"].includes(ext)) return "image";
  if (["mp4", "mov", "webm", "mkv", "avi", "m4v"].includes(ext)) return "video";
  if (["mp3", "wav", "ogg", "m4a", "flac", "aac"].includes(ext)) return "audio";
  return "url"; // no recognizable extension — assume it's a page/video link
}

type ProbedVideoMedia = {
  thumbnail: string | null;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
};

async function probeUrlVideoMedia(url: string): Promise<ProbedVideoMedia> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";

    let width: number | null = null;
    let height: number | null = null;
    let durationSeconds: number | null = null;

    const timeout = setTimeout(
      () => resolve({ thumbnail: null, width, height, durationSeconds }),
      8000
    );

    // No CORS needed for these — only the canvas draw below needs it.
    video.onloadedmetadata = () => {
      width = video.videoWidth || null;
      height = video.videoHeight || null;
      durationSeconds = Number.isFinite(video.duration) ? Math.round(video.duration) : null;
    };

    video.onloadeddata = () => {
      try { video.currentTime = 1; } catch {}
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
        clearTimeout(timeout);
        resolve({ thumbnail: canvas.toDataURL("image/png"), width, height, durationSeconds });
      } catch {
        // canvas tainted (no CORS) — dims/duration are still valid though
        clearTimeout(timeout);
        resolve({ thumbnail: null, width, height, durationSeconds });
      }
    };
    video.onerror = () => {
      clearTimeout(timeout);
      resolve({ thumbnail: null, width, height, durationSeconds });
    };

    video.src = url;
  });
}

// Best-effort content-length lookup. Requires the target server to allow
// cross-origin HEAD requests (CORS) — many sites won't, and this quietly
// resolves to null in that case rather than blocking the entry.
async function probeUrlSize(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    const len = res.headers.get("content-length");
    return len ? parseInt(len, 10) : null;
  } catch {
    return null;
  }
}

// Images: just hand back the URL itself, the <img> tag renders it directly
// (no CORS needed for that). Video: try to grab a frame via canvas, which
// DOES need the source to send CORS headers — falls back to null (icon)
// when it can't. Audio/unknown: no thumbnail attempt.
async function probeUrlThumbnail(url: string, kind: UrlKind): Promise<string | null> {
  if (kind === "image") return url;
  if (kind !== "video") return null;

  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;

    const timeout = setTimeout(() => resolve(null), 8000);

    video.onloadeddata = () => {
      try {
        video.currentTime = 1;
      } catch {
        // seeking unsupported on this source; onseeked just won't fire below
      }
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        clearTimeout(timeout);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        // canvas tainted — source didn't send CORS headers
        clearTimeout(timeout);
        resolve(null);
      }
    };
    video.onerror = () => {
      clearTimeout(timeout);
      resolve(null);
    };

    video.src = url;
  });
}

const thumbClass =
  "h-5 w-5 sm:h-6 sm:w-6 md:h-12 md:w-12 object-cover rounded border";
const iconWrapClass =
  "h-5 w-5 sm:h-6 md:h-12 md:w-12 flex items-center justify-center rounded border bg-muted";
const iconClass =
  "ml-0.5 h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-5 md:w-5 text-foreground";

const ModalUpload: React.FC<ModalUploadProps> = ({ type = "all" }) => {
  const {
    setShowUploadModal,
    showUploadModal,
    setFiles,
    files,
    addPendingUploads,
    processUploads
  } = useUploadStore();
  const [videoThumbnails, setVideoThumbnails] = useState<{
    [name: string]: string;
  }>({});
  const [videoUrl, setVideoUrl] = useState("");
  const [urlEntries, setUrlEntries] = useState<PendingUrlItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragError, setDragError] = useState<string | null>(null);

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const isOverSizeLimit = (bytes: number | null | undefined) =>
    typeof bytes === "number" && bytes > MAX_FILE_SIZE_BYTES;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const selectedFiles = Array.from(e.target.files);
    const remainingSlots = Math.max(
      0,
      MAX_FILE_COUNT - files.length - urlEntries.length
    );

    const newFiles = selectedFiles
      .filter((f) => !files.some((fileObj) => fileObj.file?.name === f.name))
      .slice(0, remainingSlots)
      .map((f) => ({ id: crypto.randomUUID(), file: f }));

    if (newFiles.length === 0) return;

    setFiles((prev) => [...newFiles, ...prev]);

    const videoThumbnailsData = await Promise.all(
      newFiles
        .filter((f) => f.file?.type.startsWith("video/"))
        .map(async (f) => ({
          name: f.file?.name ?? "",
          thumb: f.file ? await extractVideoThumbnail(f.file) : ""
        }))
    );
    setVideoThumbnails((prev) => ({
      ...prev,
      ...Object.fromEntries(videoThumbnailsData.map((v) => [v.name, v.thumb]))
    }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      const oversized = droppedFiles.filter((f) => f.size > MAX_FILE_SIZE_BYTES);
      const validFiles = droppedFiles.filter((f) => f.size <= MAX_FILE_SIZE_BYTES);

      if (oversized.length > 0) {
        const message =
          oversized.length === 1
            ? `${oversized[0].name} exceeds ${formatFileSize(MAX_FILE_SIZE_BYTES)} file size limit`
            : `${oversized.length} files exceed ${formatFileSize(MAX_FILE_SIZE_BYTES)} file size limit`;
        setDragError(message);
        setTimeout(() => setDragError(null), 3000);
      }

      const remainingSlots = Math.max(
        0,
        MAX_FILE_COUNT - files.length - urlEntries.length
      );

      const newFiles = validFiles
        .filter((f) => !files.some((fileObj) => fileObj.file?.name === f.name))
        .slice(0, remainingSlots)
        .map((f) => ({ id: crypto.randomUUID(), file: f }));
      if (newFiles.length === 0) return;

      setFiles((prev) => [...newFiles, ...prev]);
      const videoThumbnailsData = await Promise.all(
        newFiles
          .filter((f) => f.file?.type.startsWith("video/"))
          .map(async (f) => ({
            name: f.file?.name ?? "",
            thumb: f.file ? await extractVideoThumbnail(f.file) : ""
          }))
      );
      setVideoThumbnails((prev) => ({
        ...prev,
        ...Object.fromEntries(videoThumbnailsData.map((v) => [v.name, v.thumb]))
      }));
    }
  };

  const handleRemoveFile = (id: string, file: File) => {
    setFiles(files.filter((f) => f.id !== id));
  };

  const handleRemoveUrl = (id: string) => {
    setUrlEntries((prev) => prev.filter((u) => u.id !== id));
  };

  const addUrlToList = () => {
    const trimmed = videoUrl.trim();
    setVideoUrl("");
    if (!trimmed) return;

    try {
      new URL(trimmed);
    } catch {
      return; // not a valid URL, ignore
    }

    if (urlEntries.some((u) => u.url === trimmed)) return;
    if (files.length + urlEntries.length >= MAX_FILE_COUNT) return;

    const id = crypto.randomUUID();
    const kind = guessKindFromUrl(trimmed);

    setUrlEntries((prev) => [
      {
        id,
        url: trimmed,
        kind,
        sizeBytes: null,
        thumbnail: null,
        probing: true,
        width: null,
        height: null,
        durationSeconds: null
      },
      ...prev
    ]);

    // Video gets the richer probe (dims + duration + thumbnail attempt).
    // Image/audio/unknown keep the old thumbnail-only probe — they were
    // never missing dimensions in the first place, no need to touch them.
    const mediaProbe: Promise<{
      thumbnail: string | null;
      width: number | null;
      height: number | null;
      durationSeconds: number | null;
    }> =
      kind === "video"
        ? probeUrlVideoMedia(trimmed)
        : probeUrlThumbnail(trimmed, kind).then((thumbnail) => ({
          thumbnail,
          width: null,
          height: null,
          durationSeconds: null
        }));

    Promise.all([probeUrlSize(trimmed), mediaProbe]).then(([sizeBytes, media]) => {
      setUrlEntries((prev) =>
        prev.map((entry) =>
          entry.id === id
            ? {
              ...entry,
              sizeBytes,
              thumbnail: media.thumbnail,
              width: media.width,
              height: media.height,
              durationSeconds: media.durationSeconds,
              probing: false
            }
            : entry
        )
      );
    });
  };

  const handleUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addUrlToList();
    }
  };

  const handleUrlBlur = () => {
    setVideoUrl("");
  };

  const { setActiveMenuItem, setShowMenuItem, setDrawerOpen } = useLayoutStore();
  const isLargeScreen = useIsLargeScreen();

  const handleUpload = async () => {
    const fileUploads = files
      .filter((f) => f.file?.type && !isOverSizeLimit(f.file?.size))
      .map((f) => ({
        id: f.id,
        file: f.file,
        type: f.file?.type,
        status: "pending" as const,
        progress: 0
      }));

    const urlUploads = urlEntries
      .filter((entry) => !entry.probing && entry.sizeBytes != null && entry.sizeBytes <= MAX_FILE_SIZE_BYTES)
      .map((entry) => ({
        id: entry.id,
        url: entry.url,
        type: entry.kind,
        fileSize: entry.sizeBytes ?? undefined,
        status: "pending" as const,
        progress: 0,
        width: entry.width ?? undefined,
        height: entry.height ?? undefined,
        durationSeconds: entry.durationSeconds ?? undefined
      }));

    const combinedUploads = [...fileUploads, ...urlUploads];
    if (combinedUploads.length === 0) return;

    addPendingUploads(combinedUploads);

    setActiveMenuItem("uploads");
    if (isLargeScreen) {
      setShowMenuItem(true);
    } else {
      setDrawerOpen(true);
    }

    setTimeout(() => {
      processUploads();
      setFiles([]);
      setUrlEntries([]);
      setShowUploadModal(false);
      setVideoUrl("");
    }, 0);
  };

  const getAcceptType = () => {
    switch (type) {
      case "audio":
        return "audio/*";
      case "image":
        return "image/*";
      case "video":
        return "video/*";
      default:
        return "audio/*,image/*,video/*";
    }
  };

  useEffect(() => {
    setFiles([]);
    setUrlEntries([]);
  }, [showUploadModal]);

  const isMediumScreen = useIsMediumScreen();

  const hasItems = files.length > 0 || urlEntries.length > 0;

  const fileItems = files.map((f) => ({
    id: f.id,
    name: f.file?.name ?? "",
    sizeLabel: f.file ? formatFileSize(f.file.size) : "",
    isOverLimit: isOverSizeLimit(f.file?.size),
    onRemove: () => f.file && handleRemoveFile(f.id, f.file),
    thumbnailNode: f.file?.type.startsWith("image/") ? (
      <img
        src={URL.createObjectURL(f.file)}
        alt={f.file.name}
        className={thumbClass}
      />
    ) : f.file?.type.startsWith("video/") && videoThumbnails[f.file.name] ? (
      <img src={videoThumbnails[f.file.name]} alt="" className={thumbClass} />
    ) : f.file?.type.startsWith("audio/") ? (
      <div className={iconWrapClass}>
        <Music className={iconClass} />
      </div>
    ) : (
      <div className={iconWrapClass}>
        <FileIcon className={iconClass} />
      </div>
    )
  }));

  const urlItems = urlEntries.map((entry) => {
    const unknownSize = !entry.probing && entry.sizeBytes == null;
    const tooLarge = entry.sizeBytes != null && entry.sizeBytes > MAX_FILE_SIZE_BYTES;
    const isOverLimit = unknownSize || tooLarge; // "excluded from upload"

    return {
      id: entry.id,
      name: entry.url,
      sizeLabel: entry.probing
        ? "Probing size…"
        : entry.sizeBytes != null
          ? formatFileSize(entry.sizeBytes)
          : "Couldn't verify — will be skipped",
      isOverLimit,
      onRemove: () => handleRemoveUrl(entry.id),
      thumbnailNode:
        entry.kind === "audio" ? (
          <div className={iconWrapClass}>
            <Music className={iconClass}/>
          </div>
        ) : entry.thumbnail ? (
          <img
            src={entry.thumbnail}
            alt=""
            className={thumbClass}
            onError={() =>
              setUrlEntries((prev) =>
                prev.map((u) => (u.id === entry.id ? {...u, thumbnail: null} : u))
              )
            }
          />
        ) : (
          <div className={iconWrapClass}>
            <Link2 className={iconClass}/>
          </div>
        )
    };
  });

  const allItems = [...urlItems, ...fileItems];

  return (
    <div>
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent
          className={cn(
            "border bg-card px-2 py-8 gap-6 overflow-hidden",
            hasItems ? "sm:max-w-6xl" : "sm:max-w-lg"
          )}
        >
          <DialogHeader className="px-6 -mt-0.75">
            <DialogTitle className="text-md font-semibold">Upload</DialogTitle>
          </DialogHeader>
          <div className="flex w-full">
            <div className="space-y-6 px-6 flex-1">
              <label className="flex flex-col gap-2">
                <input
                  type="file"
                  accept={getAcceptType()}
                  onChange={handleFileChange}
                  multiple
                  ref={fileInputRef}
                  style={{ display: "none" }}
                />

                <div
                  className={`h-72 flex items-center justify-center gap-4 border-dashed rounded-md p-4 transition-colors ${
                    dragError
                      ? "border border-red-500 bg-red-500/10"
                      : isDragOver
                        ? "border border-primary bg-primary/10"
                        : "border border-border hover:border-muted-foreground/50"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {!dragError && (
                    <Button
                      className="flex h-9 gap-2 cursor-pointer"
                      variant="default"
                      size={isMediumScreen ? "sm" : "icon"}
                      onClick={triggerFileInput}
                      disabled={allItems.filter(item => !item.isOverLimit).length === MAX_FILE_COUNT}
                    >
                      <span className="hidden md:block">Browse files</span>
                    </Button>
                  )}

                  <div className="flex flex-col gap-px">
                    <p
                      className={cn(
                        "text-sm",
                        dragError ? "text-red-500 font-medium" : "text-muted-foreground/70",
                        allItems.filter(item => !item.isOverLimit).length === MAX_FILE_COUNT ? "opacity-50" : ""
                      )}
                    >
                      {dragError ?? "or drag and drop files here"}
                    </p>
                  </div>
                </div>
              </label>
            </div>

            {hasItems && (
              <div className="flex flex-col gap-4 px-6 pl-3 flex-1">
                <span className="text-sm text-muted-foreground">
                  Selected items ({allItems.filter(item => !item.isOverLimit).length}/{MAX_FILE_COUNT}):
                </span>
                <ScrollArea className="max-h-63">
                  <AnimatePresence initial={false}>
                    <div className="flex flex-col gap-3">
                      {allItems.map((item) => (
                        <div
                          key={item.id}
                          className={clsx(
                            "w-full flex justify-between items-center gap-2 pl-1",
                            item.isOverLimit && "opacity-50"
                          )}
                          title={item.isOverLimit ? "Exceeds size limit — will be skipped" : undefined}
                        >
                          <Button
                            variant={"ghost"}
                            onClick={item.onRemove}
                            size={"icon"}
                            className="cursor-pointer w-4 h-4 text-muted-foreground hover:opacity-100! hover:bg-transparent! hover:text-foreground!"
                          >
                            <X className="h-4 w-4" />
                          </Button>

                          <div className="flex flex-1 gap-1 sm:gap-1.5 md:gap-2 items-center">
                            <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-12 md:h-12 flex items-center justify-center">
                              {item.thumbnailNode}
                            </div>

                            <div>
                              <div
                                className="w-full truncate text-sm font-semibold max-w-80"
                                title={item.name}
                              >
                                {item.name}
                              </div>
                              <div
                                className={clsx(
                                  "text-[11px]",
                                  item.isOverLimit
                                    ? "text-red-500"
                                    : "text-muted-foreground"
                                )}
                              >
                                {item.sizeLabel}
                                {item.isOverLimit && " · Exceeds limit"}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AnimatePresence>
                </ScrollArea>
              </div>
            )}
          </div>
          <div
            className={cn(
              "flex",
              hasItems ? "flex-row justify-between items-end" : "flex-col gap-6"
            )}
          >
            <div className="flex flex-1 flex-col gap-2 px-6">
              <div
                className={cn(
                  "flex flex-1 items-center text-sm text-muted-foreground",
                  allItems.filter(item => !item.isOverLimit).length === MAX_FILE_COUNT ? "opacity-50" : ""
                )}
              >
                or paste a media link:
              </div>
              <Input
                type="text"
                placeholder="https://..."
                value={videoUrl}
                disabled={allItems.filter(item => !item.isOverLimit).length === MAX_FILE_COUNT}
                onChange={(e) => setVideoUrl(e.target.value)}
                onKeyDown={handleUrlKeyDown}
                // onBlur={handleUrlBlur}
              />
            </div>

            <div className="flex flex-1 items-center justify-end gap-2 px-6 pl-3">
              <Button variant="outline" onClick={() => setShowUploadModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!hasItems || isUploading || urlEntries.some((e) => e.probing)}
              >
                Upload
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModalUpload;