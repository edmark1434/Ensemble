import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { FileAudio, FileImage, FileVideo, Loader2, Upload, X } from "lucide-react";
import api from "@/lib/axios";
import { uploadFileWithIntent } from "@/lib/uploadFile";
import type { AssetRecord, AssetStatus, AssetType } from "./assetTypes";
import { createAssetProxy, prepareAssetThumbnail } from "./assetDerivatives";

const MIME_TO_TYPE: Record<string, AssetType> = {
  "image/jpeg": "image",
  "image/jpg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
  "image/avif": "image",
  "video/mp4": "video",
  "audio/mpeg": "audio",
  "audio/wav": "audio",
  "audio/x-wav": "audio",
  "audio/ogg": "audio",
};

const LIMITS: Record<AssetType, number> = {
  image: 25 * 1024 * 1024,
  video: 100 * 1024 * 1024,
  audio: 50 * 1024 * 1024,
};
const MAX_BUNDLE_FILES = 20;
const MAX_BUNDLE_BYTES = 500 * 1024 * 1024;

function cleanTag(value: string) {
  return value.trim().replace(/^#+/, "").trim().replace(/\s+/g, " ");
}

interface AssetEditorModalProps {
  open: boolean;
  asset?: AssetRecord | null;
  onClose: () => void;
  onSaved: (asset: AssetRecord) => void;
}

type MediaMetadata = { width: number | null; height: number | null; durationSeconds: number | null };

function errorMessage(error: unknown) {
  if (typeof error === "object" && error && "response" in error) {
    const response = (error as { response?: { data?: { error?: string; message?: string } } }).response;
    return response?.data?.error || response?.data?.message || "Unable to save the asset.";
  }
  return error instanceof Error ? error.message : "Unable to save the asset.";
}

async function inspectMedia(file: File, type: AssetType): Promise<MediaMetadata> {
  if (type === "image") {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        resolve({ width: image.naturalWidth || null, height: image.naturalHeight || null, durationSeconds: null });
        URL.revokeObjectURL(url);
      };
      image.onerror = () => {
        reject(new Error("The image could not be read."));
        URL.revokeObjectURL(url);
      };
      image.src = url;
    });
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const media = document.createElement(type === "video" ? "video" : "audio");
    media.preload = "metadata";
    media.onloadedmetadata = () => {
      const video = type === "video" ? media as HTMLVideoElement : null;
      resolve({
        width: video?.videoWidth || null,
        height: video?.videoHeight || null,
        durationSeconds: Number.isFinite(media.duration) ? Math.max(1, Math.ceil(media.duration)) : null,
      });
      URL.revokeObjectURL(url);
    };
    media.onerror = () => {
      reject(new Error(`The ${type} file could not be read.`));
      URL.revokeObjectURL(url);
    };
    media.src = url;
  });
}

export default function AssetEditorModal({ open, asset, onClose, onSaved }: AssetEditorModalProps) {
  const originalInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceCredits, setPriceCredits] = useState("0");
  const [status, setStatus] = useState<AssetStatus>("published");
  const [files, setFiles] = useState<File[]>([]);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [originalPreviewUrls, setOriginalPreviewUrls] = useState<string[]>([]);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(asset?.name || "");
    setDescription(asset?.description || "");
    setPriceCredits(String(asset?.price_credits ?? 0));
    setStatus(asset?.status || "published");
    setFiles([]);
    setThumbnailFile(null);
    setTags(asset?.tags || []);
    setTagInput("");
    setError("");
  }, [asset, open]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open, saving]);

  useEffect(() => {
    if (!open || files.length === 0) {
      setOriginalPreviewUrls([]);
      return;
    }
    const previewUrls = files.map((file) => URL.createObjectURL(file));
    setOriginalPreviewUrls(previewUrls);
    return () => previewUrls.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
  }, [files, open]);

  useEffect(() => {
    if (!open || !thumbnailFile) {
      setThumbnailPreviewUrl("");
      return;
    }
    const previewUrl = URL.createObjectURL(thumbnailFile);
    setThumbnailPreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [open, thumbnailFile]);

  if (!open) return null;

  const primaryFile = files[0];
  const type = primaryFile ? MIME_TO_TYPE[primaryFile.type] : undefined;

  const addFiles = (selected: File[]) => {
    setError("");
    if (selected.length === 0) return;
    const combinedFiles = [...files, ...selected];
    if (combinedFiles.length > MAX_BUNDLE_FILES) {
      return setError(`Choose no more than ${MAX_BUNDLE_FILES} original files.`);
    }
    const seen = new Set<string>();
    let totalBytes = 0;
    for (const selectedFile of combinedFiles) {
      const selectedType = MIME_TO_TYPE[selectedFile.type];
      const identity = `${selectedFile.name}:${selectedFile.size}:${selectedFile.lastModified}`;
      if (!selectedType) {
        return setError("Choose only supported images, MP4 videos, MP3, WAV, or OGG audio files.");
      }
      if (seen.has(identity)) {
        return setError("The same original file cannot be selected more than once.");
      }
      if (selectedFile.size > LIMITS[selectedType]) {
        return setError(`${selectedFile.name} exceeds the ${LIMITS[selectedType] / 1024 / 1024}MB ${selectedType} limit.`);
      }
      seen.add(identity);
      totalBytes += selectedFile.size;
    }
    if (totalBytes > MAX_BUNDLE_BYTES) {
      return setError("The combined original files must be 500MB or smaller.");
    }
    setFiles(combinedFiles);
  };

  const selectThumbnail = (selected: File | null) => {
    setError("");
    if (!selected) return setThumbnailFile(null);
    if (MIME_TO_TYPE[selected.type] !== "image") {
      setThumbnailFile(null);
      setError("Choose a JPEG, PNG, GIF, WebP, or AVIF image for the thumbnail.");
      return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      setThumbnailFile(null);
      setError("The thumbnail image must be 5MB or smaller.");
      return;
    }
    setThumbnailFile(selected);
  };

  const addTag = (value: string) => {
    const tag = cleanTag(value);
    if (!tag) {
      setTagInput("");
      return;
    }
    if (tag.length > 50) return setError("Each tag must be 50 characters or fewer.");
    if (tags.some((current) => current.toLocaleLowerCase() === tag.toLocaleLowerCase())) {
      setTagInput("");
      return;
    }
    if (tags.length >= 10) return setError("You can add up to 10 tags.");
    setTags((current) => [...current, tag]);
    setTagInput("");
    setError("");
  };

  const handleTagKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(tagInput);
    } else if (event.key === "Backspace" && !tagInput && tags.length) {
      setTags((current) => current.slice(0, -1));
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const cleanName = name.trim();
    const cleanDescription = description.trim();
    const price = Number(priceCredits);
    const pendingTag = cleanTag(tagInput);
    if (pendingTag.length > 50) return setError("Each tag must be 50 characters or fewer.");
    const submittedTags = [...tags];
    if (pendingTag && !submittedTags.some((tag) => tag.toLocaleLowerCase() === pendingTag.toLocaleLowerCase())) {
      submittedTags.push(pendingTag);
    }
    if (submittedTags.length > 10) return setError("You can add up to 10 tags.");
    if (!cleanName || cleanName.length > 50) return setError("Enter an asset title up to 50 characters.");
    if (!cleanDescription || cleanDescription.length > 5000) return setError("Enter an asset description up to 5,000 characters.");
    if (!Number.isInteger(price) || price < 0 || price > 100000000) return setError("Enter a valid whole-number price.");
    if (!asset && (!primaryFile || !type || files.length === 0)) return setError("Choose at least one original file to upload.");
    if (!asset && !thumbnailFile) return setError("Choose a thumbnail image.");

    setSaving(true);
    try {
      if (asset) {
        const response = await api.patch<{ asset: AssetRecord }>(`/api/assets/${asset.market_asset_id}`, {
          name: cleanName,
          description: cleanDescription,
          priceCredits: price,
          status,
          tags: submittedTags,
        });
        onSaved(response.data.asset);
      } else if (primaryFile && type && thumbnailFile) {
        const metadata = await inspectMedia(primaryFile, type);
        const [previewFiles, preparedThumbnail] = await Promise.all([
          Promise.all(files.map((originalFile) =>
            createAssetProxy(originalFile, MIME_TO_TYPE[originalFile.type]))),
          prepareAssetThumbnail(thumbnailFile),
        ]);
        const [originalUploads, previewUploads, thumbnailUpload] = await Promise.all([
          Promise.all(files.map((originalFile) => uploadFileWithIntent(originalFile, "asset-originals"))),
          Promise.all(previewFiles.map((previewFile) => uploadFileWithIntent(previewFile, "assets"))),
          uploadFileWithIntent(preparedThumbnail, "assets"),
        ]);
        const response = await api.post<{ asset: AssetRecord }>("/api/assets", {
          name: cleanName,
          description: cleanDescription,
          priceCredits: price,
          status,
          tags: submittedTags,
          originalFileIds: originalUploads.map((upload) => upload.fileId),
          previewFileIds: previewUploads.map((upload) => upload.fileId),
          thumbnailFileId: thumbnailUpload.fileId,
          type,
          ...metadata,
        });
        onSaved(response.data.asset);
      }
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const FileIcon = type === "image" ? FileImage : type === "video" ? FileVideo : FileAudio;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="asset-editor-title">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#10131e]">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-200 bg-white px-5 py-4 dark:border-white/10 dark:bg-[#10131e]">
          <div>
            <h2 id="asset-editor-title" className="text-lg font-bold text-gray-900 dark:text-white">{asset ? "Edit asset" : "Upload asset"}</h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">{asset ? "Update the listing details visible in the library." : "Create a package with one or multiple protected original files."}</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 dark:hover:bg-white/5 dark:hover:text-white" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5 p-5">
          {!asset && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-zinc-200">Original files <span className="text-red-500">*</span></label>
                <input ref={originalInputRef} type="file" multiple className="hidden" accept="image/jpeg,image/png,image/gif,image/webp,image/avif,video/mp4,audio/mpeg,audio/wav,audio/x-wav,audio/ogg" onChange={(event) => { addFiles(Array.from(event.target.files || [])); event.currentTarget.value = ""; }} />
                <button type="button" onClick={() => originalInputRef.current?.click()} className="flex min-h-28 w-full min-w-0 items-center gap-3 overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-left transition hover:border-blue-400 hover:bg-blue-50/50 dark:border-white/15 dark:bg-white/[0.025] dark:hover:border-blue-500/60 dark:hover:bg-blue-500/5">
                  {primaryFile && type === "image" && originalPreviewUrls[0] ? (
                    <img src={originalPreviewUrls[0]} alt="Selected primary original" draggable={false} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-600/10 text-blue-500 dark:text-blue-300">
                      {primaryFile ? <FileIcon className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-gray-900 dark:text-white">{files.length ? `${files.length} original ${files.length === 1 ? "file" : "files"} selected` : "Choose original files"}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-gray-500 dark:text-zinc-500">{files.length ? "Click to add more files" : "Select 1–20 files, up to 500MB combined"}</span>
                  </span>
                </button>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-zinc-200">Thumbnail image <span className="text-red-500">*</span></label>
                <input ref={thumbnailInputRef} type="file" className="hidden" accept="image/jpeg,image/png,image/gif,image/webp,image/avif" onChange={(event) => selectThumbnail(event.target.files?.[0] || null)} />
                <button type="button" onClick={() => thumbnailInputRef.current?.click()} className="flex min-h-28 w-full min-w-0 items-center gap-3 overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-left transition hover:border-blue-400 hover:bg-blue-50/50 dark:border-white/15 dark:bg-white/[0.025] dark:hover:border-blue-500/60 dark:hover:bg-blue-500/5">
                  {thumbnailPreviewUrl ? (
                    <img src={thumbnailPreviewUrl} alt="Selected thumbnail" draggable={false} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-600/10 text-blue-500 dark:text-blue-300">
                      <Upload className="h-5 w-5" />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-gray-900 dark:text-white">{thumbnailFile ? "Thumbnail selected" : "Choose thumbnail"}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-gray-500 dark:text-zinc-500">{thumbnailFile ? "Click to replace the listing thumbnail" : "Image preview up to 5MB"}</span>
                  </span>
                </button>
              </div>
              </div>

              {(originalPreviewUrls.length > 0 || thumbnailPreviewUrl) && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {originalPreviewUrls.length > 0 && (
                    <div className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-[#080a12]">
                      <div className="border-b border-gray-200 px-4 py-2.5 dark:border-white/10"><p className="text-xs font-semibold text-gray-700 dark:text-zinc-300">Package originals ({files.length})</p></div>
                      <div className="max-h-80 space-y-2 overflow-y-auto p-3">
                        {files.map((selectedFile, index) => {
                          const selectedType = MIME_TO_TYPE[selectedFile.type];
                          return (
                            <div key={`${selectedFile.name}-${selectedFile.size}-${selectedFile.lastModified}`} className="flex min-w-0 items-center gap-3 rounded-lg border border-gray-200 bg-white p-2 dark:border-white/10 dark:bg-white/[0.025]">
                              {selectedType === "image" ? <img src={originalPreviewUrls[index]} alt="" className="h-12 w-12 shrink-0 rounded-md object-cover" /> : selectedType === "video" ? <video src={originalPreviewUrls[index]} muted preload="metadata" className="h-12 w-12 shrink-0 rounded-md bg-black object-cover" /> : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-blue-500/10 text-blue-500"><FileAudio className="h-5 w-5" /></span>}
                              <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold" title={selectedFile.name}>{selectedFile.name}</p><p className="mt-1 text-[10px] text-gray-500 dark:text-zinc-500">{selectedType} · {(selectedFile.size / 1024 / 1024).toFixed(1)}MB{index === 0 ? " · primary preview" : ""}</p></div>
                              <button type="button" onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} disabled={saving} className="rounded-md p-1.5 text-gray-500 transition hover:bg-red-500/10 hover:text-red-500" aria-label={`Remove ${selectedFile.name}`}><X className="h-3.5 w-3.5" /></button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {thumbnailPreviewUrl && (
                    <div className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-[#080a12]">
                      <div className="border-b border-gray-200 px-4 py-2.5 dark:border-white/10"><p className="text-xs font-semibold text-gray-700 dark:text-zinc-300">Listing thumbnail preview</p></div>
                      <div className="flex min-h-48 items-center justify-center overflow-hidden p-3">
                        <img src={thumbnailPreviewUrl} alt="Selected asset thumbnail preview" draggable={false} className="max-h-72 w-full rounded-lg object-contain" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-gray-800 dark:text-zinc-200">Title</span>
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={50} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-[#0b0e17] dark:text-white" placeholder="Name your asset" />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-gray-800 dark:text-zinc-200">Description</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={5000} rows={5} className="w-full resize-y rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-[#0b0e17] dark:text-white" placeholder="Describe what this asset contains" />
          </label>

          <div>
            <label htmlFor="asset-tags" className="mb-2 block text-sm font-semibold text-gray-800 dark:text-zinc-200">Tags <span className="font-normal text-gray-400 dark:text-zinc-500">(optional)</span></label>
            <div className="min-h-12 rounded-xl border border-gray-300 bg-white px-3 py-2 outline-none transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 dark:border-white/10 dark:bg-[#0b0e17]">
              <div className="flex flex-wrap items-center gap-2">
                {tags.map((tag) => (
                  <span key={tag.toLocaleLowerCase()} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-2.5 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
                    #{tag}
                    <button type="button" onClick={() => setTags((current) => current.filter((item) => item !== tag))} className="rounded p-0.5 transition hover:bg-blue-500/15" aria-label={`Remove ${tag} tag`}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  id="asset-tags"
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => addTag(tagInput)}
                  maxLength={50}
                  disabled={tags.length >= 10}
                  className="min-w-36 flex-1 bg-transparent px-1 py-1.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed dark:text-white dark:placeholder:text-zinc-600"
                  placeholder={tags.length >= 10 ? "Maximum 10 tags" : "Type a tag and press Enter"}
                />
              </div>
            </div>
            <p className="mt-1.5 text-xs text-gray-500 dark:text-zinc-500">Press Enter or comma to add up to 10 tags.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-800 dark:text-zinc-200">Price in credits</span>
              <input type="number" min="0" max="100000000" step="1" value={priceCredits} onChange={(event) => setPriceCredits(event.target.value)} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-[#0b0e17] dark:text-white" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-800 dark:text-zinc-200">Visibility</span>
              <select value={status} onChange={(event) => setStatus(event.target.value as AssetStatus)} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-[#0b0e17] dark:text-white">
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </label>
          </div>

          {error && <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">{error}</p>}

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-5 dark:border-white/10">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? (asset ? "Saving..." : "Uploading...") : (asset ? "Save changes" : "Upload asset")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
