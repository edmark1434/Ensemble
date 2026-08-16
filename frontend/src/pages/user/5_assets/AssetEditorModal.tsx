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
  const [file, setFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState("");
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
    setFile(null);
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
    if (!open || !file) {
      setOriginalPreviewUrl("");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setOriginalPreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [file, open]);

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

  const type = file ? MIME_TO_TYPE[file.type] : undefined;

  const selectFile = (selected: File | null) => {
    setError("");
    if (!selected) return setFile(null);
    const selectedType = MIME_TO_TYPE[selected.type];
    if (!selectedType) {
      setFile(null);
      setError("Choose a supported image, MP4 video, MP3, WAV, or OGG audio file.");
      return;
    }
    if (selected.size > LIMITS[selectedType]) {
      setFile(null);
      setError(`${selectedType[0].toUpperCase()}${selectedType.slice(1)} files must be ${LIMITS[selectedType] / 1024 / 1024}MB or smaller.`);
      return;
    }
    setFile(selected);
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
    if (!asset && (!file || !type)) return setError("Choose the original media file to upload.");
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
      } else if (file && type && thumbnailFile) {
        const metadata = await inspectMedia(file, type);
        const [proxyFile, preparedThumbnail] = await Promise.all([
          createAssetProxy(file, type),
          prepareAssetThumbnail(thumbnailFile),
        ]);
        const [originalUpload, proxyUpload, thumbnailUpload] = await Promise.all([
          uploadFileWithIntent(file, "asset-originals"),
          uploadFileWithIntent(proxyFile, "assets"),
          uploadFileWithIntent(preparedThumbnail, "assets"),
        ]);
        const response = await api.post<{ asset: AssetRecord }>("/api/assets", {
          name: cleanName,
          description: cleanDescription,
          priceCredits: price,
          status,
          tags: submittedTags,
          originalFileId: originalUpload.fileId,
          proxyFileId: proxyUpload.fileId,
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
            <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">{asset ? "Update the listing details visible in the library." : "Share an image, video, or audio file with the community."}</p>
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
                <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-zinc-200">Original file <span className="text-red-500">*</span></label>
                <input ref={originalInputRef} type="file" className="hidden" accept="image/jpeg,image/png,image/gif,image/webp,image/avif,video/mp4,audio/mpeg,audio/wav,audio/x-wav,audio/ogg" onChange={(event) => selectFile(event.target.files?.[0] || null)} />
                <button type="button" onClick={() => originalInputRef.current?.click()} className="flex min-h-28 w-full min-w-0 items-center gap-3 overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-left transition hover:border-blue-400 hover:bg-blue-50/50 dark:border-white/15 dark:bg-white/[0.025] dark:hover:border-blue-500/60 dark:hover:bg-blue-500/5">
                  {file && type === "image" && originalPreviewUrl ? (
                    <img src={originalPreviewUrl} alt="Selected original" draggable={false} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-600/10 text-blue-500 dark:text-blue-300">
                      {file ? <FileIcon className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-gray-900 dark:text-white">{file ? `${type?.[0].toUpperCase()}${type?.slice(1)} selected` : "Choose original file"}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-gray-500 dark:text-zinc-500">{file ? "Click to replace the protected original" : "Stored as the protected, full-quality original"}</span>
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

              {(originalPreviewUrl || thumbnailPreviewUrl) && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {originalPreviewUrl && (
                    <div className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-[#080a12]">
                      <div className="border-b border-gray-200 px-4 py-2.5 dark:border-white/10"><p className="text-xs font-semibold text-gray-700 dark:text-zinc-300">Original file preview</p></div>
                      <div className="flex min-h-48 items-center justify-center overflow-hidden p-3">
                        {type === "image" ? (
                          <img src={originalPreviewUrl} alt="Original asset preview" draggable={false} className="max-h-72 w-full rounded-lg object-contain" />
                        ) : type === "video" ? (
                          <video src={originalPreviewUrl} controls preload="metadata" className="max-h-72 w-full rounded-lg bg-black" />
                        ) : (
                          <div className="flex w-full flex-col items-center gap-4 px-2 text-blue-500 dark:text-blue-300">
                            <FileAudio className="h-10 w-10" />
                            <audio src={originalPreviewUrl} controls preload="metadata" className="w-full" />
                          </div>
                        )}
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
