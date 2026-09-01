import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowLeft, ArrowRight, FileArchive, FileAudio, FileImage, FileText, FileVideo, Loader2, Plus, Upload, X } from "lucide-react";
import api from "@/lib/axios";
import { uploadFileWithIntent } from "@/lib/uploadFile";
import { mediaUrl, type AssetRecord, type AssetStatus, type AssetType } from "./assetTypes";
import { createAssetProxy, prepareAssetThumbnail, prepareTemplateThumbnail } from "./assetDerivatives";
import { getAssetPostingEligibility } from "./assetPostingEligibility";
import { showErrorToast } from "@/components/utility/toast";

type SourceKind = Exclude<AssetType, "template"> | "document" | "archive";


const MIME_TO_KIND: Record<string, SourceKind> = {
  "image/jpeg": "image", "image/jpg": "image", "image/png": "image", "image/gif": "image",
  "image/webp": "image", "image/avif": "image", "video/mp4": "video", "audio/mpeg": "audio",
  "audio/wav": "audio", "audio/x-wav": "audio", "audio/ogg": "audio",
  "application/pdf": "document", "application/zip": "archive", "application/x-zip-compressed": "archive",
};
const LIMITS: Record<SourceKind, number> = {
  image: 25 * 1024 * 1024, video: 100 * 1024 * 1024, audio: 50 * 1024 * 1024,
  document: 25 * 1024 * 1024, archive: 100 * 1024 * 1024,
};
const MAX_BUNDLE_FILES = 20;
const MAX_BUNDLE_BYTES = 500 * 1024 * 1024;
const MAX_THUMBNAILS = 8;

const IMAGE_ACCEPT = "image/jpeg,image/png,image/gif,image/webp,image/avif";
const ORIGINAL_ACCEPT = IMAGE_ACCEPT + ",video/mp4,audio/mpeg,audio/wav,audio/x-wav,audio/ogg,application/pdf,application/zip,application/x-zip-compressed,.zip";

function sourceKind(file: File): SourceKind | undefined {
  return MIME_TO_KIND[file.type] || (file.name.toLowerCase().endsWith(".zip") ? "archive" : undefined);
}
function cleanTag(value: string) { return value.trim().replace(/^#+/, "").trim().replace(/\s+/g, " "); }
function fileIdentity(file: File) { return `${file.name}:${file.size}:${file.lastModified}`; }
function errorMessage(error: unknown) {
  if (typeof error === "object" && error && "response" in error) {
    const response = (error as { response?: { data?: { error?: string; message?: string } } }).response;
    return response?.data?.error || response?.data?.message || "Unable to save the asset.";
  }
  return error instanceof Error ? error.message : "Unable to save the asset.";
}
function errorCode(error: unknown) {
  return typeof error === "object" && error && "response" in error
    ? (error as { response?: { data?: { code?: string } } }).response?.data?.code
    : undefined;
}

interface AssetEditorModalProps {
  open: boolean;
  asset?: AssetRecord | null;
  onClose: () => void;
  onSaved: (asset: AssetRecord) => void;
}
type MediaMetadata = { width: number | null; height: number | null; durationSeconds: number | null };

async function inspectMedia(file: File, type: Exclude<AssetType, "template">): Promise<MediaMetadata> {
  if (type === "image") {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        resolve({ width: image.naturalWidth || null, height: image.naturalHeight || null, durationSeconds: null });
        URL.revokeObjectURL(url);
      };
      image.onerror = () => { reject(new Error("The image could not be read.")); URL.revokeObjectURL(url); };
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
    media.onerror = () => { reject(new Error(`The ${type} file could not be read.`)); URL.revokeObjectURL(url); };
    media.src = url;
  });
}

export default function AssetEditorModal({ open, asset, onClose, onSaved }: AssetEditorModalProps) {
  const originalInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [listingType, setListingType] = useState<AssetType>("image");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceCredits, setPriceCredits] = useState("0");
  const [status, setStatus] = useState<AssetStatus>("published");
  const [files, setFiles] = useState<File[]>([]);
  const [thumbnailFiles, setThumbnailFiles] = useState<File[]>([]);
  const [retainedBundleFileIds, setRetainedBundleFileIds] = useState<string[]>([]);
  const [retainedThumbnailIds, setRetainedThumbnailIds] = useState<string[]>([]);
  const [bundleSelectionDirty, setBundleSelectionDirty] = useState(false);
  const [thumbnailSelectionDirty, setThumbnailSelectionDirty] = useState(false);
  const [originalPreviewUrls, setOriginalPreviewUrls] = useState<string[]>([]);
  const [thumbnailPreviewUrls, setThumbnailPreviewUrls] = useState<string[]>([]);



  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setListingType(asset?.type || "image");
    setName(asset?.name || "");
    setDescription(asset?.description || "");
    setPriceCredits(String(asset?.price_credits ?? 0));
    setStatus(asset?.status || "published");
    setFiles([]); setThumbnailFiles([]);
    setRetainedBundleFileIds((asset?.bundle_files || []).map((item) => item.media_asset_bundle_file_id));
    setRetainedThumbnailIds((asset?.thumbnails || []).map((item) => item.media_asset_thumbnail_id));
    setBundleSelectionDirty(false); setThumbnailSelectionDirty(false);

    setTags(asset?.tags || []); setTagInput(""); setError("");
  }, [asset, open]);


  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open, saving]);

  useEffect(() => {
    if (!open || files.length === 0) { setOriginalPreviewUrls([]); return; }
    const urls = files.map((file) => URL.createObjectURL(file));
    setOriginalPreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files, open]);

  useEffect(() => {
    if (!open || thumbnailFiles.length === 0) { setThumbnailPreviewUrls([]); return; }
    const urls = thumbnailFiles.map((file) => URL.createObjectURL(file));
    setThumbnailPreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [open, thumbnailFiles]);

  if (!open) return null;
  const primaryFile = files[0];
  const primaryKind = primaryFile ? sourceKind(primaryFile) : undefined;
  const PrimaryIcon = primaryKind === "image" ? FileImage : primaryKind === "video" ? FileVideo
    : primaryKind === "audio" ? FileAudio : primaryKind === "document" ? FileText : FileArchive;

  const changeListingType = (nextType: AssetType) => {
    setListingType(nextType);

    setError("");
  };
  const addFiles = (selected: File[]) => {
    setError("");
    const normalizedSelected = selected.map((file) => !file.type && file.name.toLowerCase().endsWith(".zip")
      ? new File([file], file.name, { type: "application/zip", lastModified: file.lastModified })
      : file);
    const combined = [...files, ...normalizedSelected];
    if (combined.length > MAX_BUNDLE_FILES) return setError(`Choose no more than ${MAX_BUNDLE_FILES} original files.`);
    const seen = new Set<string>();
    let totalBytes = 0;
    for (const file of combined) {
      const kind = sourceKind(file);
      if (!kind || (listingType !== "template" && ["document", "archive"].includes(kind))) {
        return setError(listingType === "template" ? "Choose supported media, PDF, or ZIP template files." : "Choose supported image, video, or audio files.");
      }
      if (seen.has(fileIdentity(file))) return setError("The same original file cannot be selected more than once.");
      if (file.size > LIMITS[kind]) return setError(`${file.name} exceeds the ${LIMITS[kind] / 1024 / 1024}MB limit.`);
      seen.add(fileIdentity(file)); totalBytes += file.size;
    }
    if (totalBytes > MAX_BUNDLE_BYTES) return setError("The combined original files must be 500MB or smaller.");
    if (files.length === 0 && listingType !== "template" && ["image", "video", "audio"].includes(sourceKind(normalizedSelected[0]) || "")) {
      setListingType(sourceKind(normalizedSelected[0]) as Exclude<AssetType, "template">);
    }
    setFiles(combined);
  };
  const addThumbnails = (selected: File[]) => {
    setError("");
    const combined = [...thumbnailFiles, ...selected];
    if (combined.length > MAX_THUMBNAILS) return setError(`Choose no more than ${MAX_THUMBNAILS} thumbnail images.`);
    const seen = new Set<string>();
    for (const file of combined) {
      if (sourceKind(file) !== "image") return setError("Choose JPEG, PNG, GIF, WebP, or AVIF thumbnail images.");
      if (file.size > 5 * 1024 * 1024) return setError("Each thumbnail image must be 5MB or smaller.");
      if (seen.has(fileIdentity(file))) return setError("The same thumbnail cannot be selected more than once.");
      seen.add(fileIdentity(file));
    }
    setThumbnailFiles(combined);
  };
  const moveThumbnail = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= thumbnailFiles.length) return;
    setThumbnailFiles((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };
  const addTag = (value: string) => {
    const tag = cleanTag(value);
    if (!tag) { setTagInput(""); return; }
    if (tag.length > 50) return setError("Each tag must be 50 characters or fewer.");
    if (tags.some((current) => current.toLowerCase() === tag.toLowerCase())) { setTagInput(""); return; }
    if (tags.length >= 10) return setError("You can add up to 10 tags.");
    setTags((current) => [...current, tag]); setTagInput(""); setError("");
  };
  const handleTagKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") { event.preventDefault(); addTag(tagInput); }
    else if (event.key === "Backspace" && !tagInput && tags.length) setTags((current) => current.slice(0, -1));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const cleanName = name.trim();
    const cleanDescription = description.trim();
    const price = Number(priceCredits);
    const pendingTag = cleanTag(tagInput);
    const submittedTags = [...tags];
    if (pendingTag && !submittedTags.some((tag) => tag.toLowerCase() === pendingTag.toLowerCase())) submittedTags.push(pendingTag);
    if (!cleanName || cleanName.length > 50) return setError("Enter an asset title up to 50 characters.");
    if (!cleanDescription || cleanDescription.length > 5000) return setError("Enter an asset description up to 5,000 characters.");
    if (!Number.isInteger(price) || price < 0 || price > 100000000) return setError("Enter a valid whole-number price.");
    if (submittedTags.length > 10) return setError("You can add up to 10 tags.");

    if (asset) {
      const replaceBundleFiles = files.length > 0 || bundleSelectionDirty;
      const replaceThumbnails = thumbnailFiles.length > 0 || thumbnailSelectionDirty;

      const finalBundleCount = retainedBundleFileIds.length + files.length;
      const finalThumbnailCount = retainedThumbnailIds.length + thumbnailFiles.length;
      if (replaceThumbnails && (finalThumbnailCount < 1 || finalThumbnailCount > MAX_THUMBNAILS)) {
        return setError(`Keep between 1 and ${MAX_THUMBNAILS} thumbnails.`);
      }
      if (replaceBundleFiles && listingType !== "template" && finalBundleCount < 1) {
        return setError(`Keep or add at least one ${listingType} package file.`);
      }
      if (files.length > 0 && listingType !== "template" && retainedBundleFileIds.length === 0 && primaryKind !== listingType) {
        return setError(`The primary replacement original must be a ${listingType} file.`);
      }
      if (files.length > 0 && files.some((file) => ["document", "archive"].includes(sourceKind(file) || ""))
        && !replaceThumbnails) {
        return setError("Choose replacement thumbnails when replacing a PDF or ZIP package.");
      }



      setSaving(true);
      try {
        const metadata = listingType === "template"
          ? { width: null, height: null, durationSeconds: null }
          : retainedBundleFileIds.length > 0
            ? { width: asset.width, height: asset.height, durationSeconds: asset.duration_seconds }
            : files.length > 0
              ? await inspectMedia(primaryFile!, listingType)
              : { width: asset.width, height: asset.height, durationSeconds: asset.duration_seconds };
        const previewFiles = replaceBundleFiles
          ? await Promise.all(files.map((file, index) => {
            const kind = sourceKind(file);
            return kind && ["image", "video", "audio"].includes(kind)
              ? createAssetProxy(file, kind as Exclude<AssetType, "template">)
              : prepareAssetThumbnail(thumbnailFiles[Math.min(index, thumbnailFiles.length - 1)]);
          }))
          : [];
        const preparedThumbnails = replaceThumbnails
          ? await Promise.all(thumbnailFiles.map(listingType === "template" ? prepareTemplateThumbnail : prepareAssetThumbnail))
          : [];
        const [originalUploads, previewUploads, thumbnailUploads] = await Promise.all([
          Promise.all(files.map((file) => uploadFileWithIntent(file, "asset-originals"))),
          Promise.all(previewFiles.map((file) => uploadFileWithIntent(file, "assets"))),
          Promise.all(preparedThumbnails.map((file) => uploadFileWithIntent(file, "assets"))),
        ]);
        const hasContentUpdate = replaceBundleFiles || replaceThumbnails;
        const response = await api.patch<{ asset: AssetRecord }>(`/api/assets/${asset.market_asset_id}`, {
          name: cleanName,
          description: cleanDescription,
          priceCredits: price,
          status,
          tags: submittedTags,
          ...(hasContentUpdate ? {
            contentUpdate: {
              type: listingType,
              replaceBundleFiles,
              replaceThumbnails,

              retainedBundleFileIds,
              retainedThumbnailIds,
              originalFileIds: originalUploads.map((upload) => upload.fileId),
              previewFileIds: previewUploads.map((upload) => upload.fileId),
              thumbnailFileIds: thumbnailUploads.map((upload) => upload.fileId),

              ...metadata,
            },
          } : {}),
        });
        onSaved(response.data.asset);
      } catch (requestError) {
        const message = errorMessage(requestError);
        setError(message);
        if (errorCode(requestError) === "ASSET_POST_LIMIT_REACHED") showErrorToast(message);
      } finally { setSaving(false); }
      return;
    }

    if (thumbnailFiles.length < 1) return setError("Choose at least one thumbnail image.");
    if (listingType !== "template" && (!primaryFile || primaryKind !== listingType)) return setError(`The primary original must be a ${listingType} file.`);



    setSaving(true);
    try {
      const eligibility = await getAssetPostingEligibility();
      if (!eligibility.allowed) {
        const message = eligibility.message || "Asset posting is unavailable for this account.";
        if (eligibility.code === "ASSET_POST_LIMIT_REACHED") showErrorToast(message);
        throw new Error(message);
      }
      const metadata = listingType === "template" ? { width: null, height: null, durationSeconds: null } : await inspectMedia(primaryFile!, listingType);
      const preparedThumbnails = await Promise.all(thumbnailFiles.map(listingType === "template" ? prepareTemplateThumbnail : prepareAssetThumbnail));
      const previewFiles = await Promise.all(files.map((file, index) => {
        const kind = sourceKind(file);
        return kind && ["image", "video", "audio"].includes(kind)
          ? createAssetProxy(file, kind as Exclude<AssetType, "template">)
          : prepareAssetThumbnail(thumbnailFiles[Math.min(index, thumbnailFiles.length - 1)]);
      }));
      const [originalUploads, previewUploads, thumbnailUploads] = await Promise.all([
        Promise.all(files.map((file) => uploadFileWithIntent(file, "asset-originals"))),
        Promise.all(previewFiles.map((file) => uploadFileWithIntent(file, "assets"))),
        Promise.all(preparedThumbnails.map((file) => uploadFileWithIntent(file, "assets"))),
      ]);
      const response = await api.post<{ asset: AssetRecord }>("/api/assets", {
        name: cleanName, description: cleanDescription, priceCredits: price, status, tags: submittedTags,
        originalFileIds: originalUploads.map((upload) => upload.fileId),
        previewFileIds: previewUploads.map((upload) => upload.fileId),
        thumbnailFileIds: thumbnailUploads.map((upload) => upload.fileId),
        type: listingType, ...metadata,
      });
      onSaved(response.data.asset);
    } catch (requestError) {
      const message = errorMessage(requestError);
      setError(message);
      if (errorCode(requestError) === "ASSET_POST_LIMIT_REACHED") showErrorToast(message);
    }
    finally { setSaving(false); }
  };

  const inputClass = "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-[#0b0e17] dark:text-white";
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="asset-editor-title">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#10131e]">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-200 bg-white px-5 py-4 dark:border-white/10 dark:bg-[#10131e]">
          <div><h2 id="asset-editor-title" className="text-lg font-bold">{asset ? "Edit asset" : "Upload asset"}</h2><p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">{asset ? "Update listing details, thumbnails, and package files." : "Create a protected asset package."}</p></div>
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 dark:hover:bg-white/5" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-5 p-5">
          <div className="space-y-5">
            {!asset && <div><p className="mb-2 text-sm font-semibold">Asset type</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{(["image", "video", "audio", "template"] as AssetType[]).map((type) => <button key={type} type="button" onClick={() => changeListingType(type)} aria-pressed={listingType === type} className={`rounded-xl border px-3 py-2.5 text-sm font-semibold capitalize transition ${listingType === type ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-300" : "border-gray-300 hover:border-blue-400 dark:border-white/10"}`}>{type}</button>)}</div></div>}
            {asset && <div className="rounded-xl border border-gray-200 p-4 dark:border-white/10"><div className="flex items-start justify-between gap-4"><div><h3 className="text-sm font-bold">Current asset content</h3><p className="mt-1 text-xs text-gray-500">Selected items are kept. Click an item to unselect it, then add new files below.</p></div><span className="rounded-lg bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-blue-600">{asset.type}</span></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><div><p className="mb-2 text-xs font-semibold">Current thumbnails</p><div className="flex flex-wrap gap-2">{asset.thumbnails.map((thumbnail) => { const selected = retainedThumbnailIds.includes(thumbnail.media_asset_thumbnail_id); return <button key={thumbnail.media_asset_thumbnail_id} type="button" aria-pressed={selected} aria-label={selected ? "Remove current thumbnail" : "Restore current thumbnail"} onClick={() => { setRetainedThumbnailIds((current) => selected ? current.filter((id) => id !== thumbnail.media_asset_thumbnail_id) : [...current, thumbnail.media_asset_thumbnail_id]); setThumbnailSelectionDirty(true); }} className={`relative overflow-hidden rounded-lg border-2 transition ${selected ? "border-blue-500" : "border-gray-300 opacity-40 grayscale dark:border-white/15"}`}><img src={mediaUrl(thumbnail.path)} alt="Current asset thumbnail" className="h-16 w-24 object-cover" /><span className={`absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full text-white ${selected ? "bg-red-600" : "bg-blue-600"}`}>{selected ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}</span></button>; })}</div></div><div><p className="mb-2 text-xs font-semibold">Current package files</p>{asset.bundle_files?.length ? <div className="max-h-40 space-y-2 overflow-y-auto">{asset.bundle_files.map((bundleFile) => { const selected = retainedBundleFileIds.includes(bundleFile.media_asset_bundle_file_id); return <button key={bundleFile.media_asset_bundle_file_id} type="button" aria-pressed={selected} aria-label={selected ? `Remove ${bundleFile.name}` : `Restore ${bundleFile.name}`} onClick={() => { setRetainedBundleFileIds((current) => selected ? current.filter((id) => id !== bundleFile.media_asset_bundle_file_id) : [...current, bundleFile.media_asset_bundle_file_id]); setBundleSelectionDirty(true); }} className={`flex w-full items-center gap-2 rounded-lg border p-2 text-left transition ${selected ? "border-blue-500/50 bg-blue-500/5" : "border-gray-200 bg-gray-50 opacity-40 dark:border-white/10 dark:bg-white/[0.025]"}`}><img src={mediaUrl(bundleFile.preview_path)} alt="" className="h-10 w-10 rounded object-cover" /><span className="min-w-0 flex-1 truncate text-xs">{bundleFile.name}</span><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white ${selected ? "bg-red-600" : "bg-blue-600"}`}>{selected ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}</span></button>; })}</div> : <p className="text-xs text-gray-500">No uploaded package files.</p>}</div></div></div>}
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="mb-2 block text-sm font-semibold">{asset ? "Add original files" : "Original files"} {!asset && listingType !== "template" && <span className="text-red-500">*</span>}</label><input ref={originalInputRef} type="file" multiple className="hidden" accept={ORIGINAL_ACCEPT} onChange={(event) => { addFiles(Array.from(event.target.files || [])); event.currentTarget.value = ""; }} /><button type="button" onClick={() => originalInputRef.current?.click()} className="flex min-h-28 w-full items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-left transition hover:border-blue-400 dark:border-white/15 dark:bg-white/[0.025]"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-600/10 text-blue-500">{primaryFile ? <PrimaryIcon className="h-5 w-5" /> : <Upload className="h-5 w-5" />}</span><span><span className="block text-sm font-semibold">{files.length ? `${files.length} original file${files.length === 1 ? "" : "s"} selected` : asset ? "Add files to the selected package" : listingType === "template" ? "Add optional template files" : "Choose original files"}</span><span className="mt-1 block text-xs text-gray-500">{listingType === "template" ? "Optional: media, PDF, or ZIP package files" : "Up to 20 files and 500MB combined"}</span></span></button></div>
              <div><label className="mb-2 block text-sm font-semibold">{asset ? "Add carousel thumbnails" : "Carousel thumbnails"} {!asset && <span className="text-red-500">*</span>}</label><input ref={thumbnailInputRef} type="file" multiple className="hidden" accept={IMAGE_ACCEPT} onChange={(event) => { addThumbnails(Array.from(event.target.files || [])); event.currentTarget.value = ""; }} /><button type="button" onClick={() => thumbnailInputRef.current?.click()} className="flex min-h-28 w-full items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-left transition hover:border-blue-400 dark:border-white/15 dark:bg-white/[0.025]">{thumbnailPreviewUrls[0] ? <img src={thumbnailPreviewUrls[0]} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" /> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-600/10 text-blue-500"><Upload className="h-5 w-5" /></span>}<span><span className="block text-sm font-semibold">{thumbnailFiles.length ? `${thumbnailFiles.length} of ${MAX_THUMBNAILS} selected` : asset ? "Add thumbnails to the selected set" : "Choose thumbnails"}</span><span className="mt-1 block text-xs text-gray-500">The first image is the library cover</span></span></button></div>
            </div>
            {files.length > 0 && <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-[#080a12]"><p className="mb-3 text-xs font-semibold">Package originals ({files.length})</p><div className="max-h-56 space-y-2 overflow-y-auto">{files.map((file, index) => { const kind = sourceKind(file); const Icon = kind === "image" ? FileImage : kind === "video" ? FileVideo : kind === "audio" ? FileAudio : kind === "document" ? FileText : FileArchive; return <div key={fileIdentity(file)} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2 dark:border-white/10 dark:bg-white/[0.025]">{kind === "image" ? <img src={originalPreviewUrls[index]} alt="" className="h-12 w-12 rounded-md object-cover" /> : <span className="flex h-12 w-12 items-center justify-center rounded-md bg-blue-500/10 text-blue-500"><Icon className="h-5 w-5" /></span>}<div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{file.name}</p><p className="text-[10px] uppercase text-gray-500">{kind} · {(file.size / 1024 / 1024).toFixed(1)}MB</p></div><button type="button" onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded p-1.5 text-gray-500 hover:bg-red-500/10 hover:text-red-500"><X className="h-3.5 w-3.5" /></button></div>; })}</div></div>}
            {thumbnailFiles.length > 0 && <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-[#080a12]"><div className="mb-3 flex justify-between"><p className="text-xs font-semibold">Thumbnail carousel order</p><p className="text-[10px] text-gray-500">First is the cover</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{thumbnailFiles.map((file, index) => <div key={fileIdentity(file)} className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/10 dark:bg-white/[0.025]"><div className="relative aspect-video"><img src={thumbnailPreviewUrls[index]} alt={`Thumbnail ${index + 1}`} className="h-full w-full object-cover" />{index === 0 && <span className="absolute left-2 top-2 rounded bg-blue-600 px-2 py-1 text-[9px] font-bold uppercase text-white">Cover</span>}</div><div className="flex items-center justify-between p-2"><span className="text-[10px] font-semibold">Slide {index + 1}</span><div className="flex"><button type="button" onClick={() => moveThumbnail(index, -1)} disabled={index === 0}><ArrowLeft className="h-3.5 w-3.5" /></button><button type="button" onClick={() => moveThumbnail(index, 1)} disabled={index === thumbnailFiles.length - 1}><ArrowRight className="h-3.5 w-3.5" /></button><button type="button" onClick={() => setThumbnailFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}><X className="h-3.5 w-3.5" /></button></div></div></div>)}</div></div>}
          </div>
          <label className="block"><span className="mb-2 block text-sm font-semibold">Title</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={50} className={inputClass} placeholder="Name your asset" /></label>
          <label className="block"><span className="mb-2 block text-sm font-semibold">Description</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={5000} rows={5} className={inputClass} placeholder="Describe what this asset contains" /></label>
          <div><label htmlFor="asset-tags" className="mb-2 block text-sm font-semibold">Tags <span className="font-normal text-gray-400">(optional)</span></label><div className="min-h-12 rounded-xl border border-gray-300 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#0b0e17]"><div className="flex flex-wrap items-center gap-2">{tags.map((tag) => <span key={tag.toLowerCase()} className="inline-flex items-center gap-1 rounded-lg bg-blue-500/10 px-2.5 py-1.5 text-xs font-semibold text-blue-600">#{tag}<button type="button" onClick={() => setTags((current) => current.filter((item) => item !== tag))}><X className="h-3 w-3" /></button></span>)}<input id="asset-tags" value={tagInput} onChange={(event) => setTagInput(event.target.value)} onKeyDown={handleTagKeyDown} onBlur={() => addTag(tagInput)} maxLength={50} className="min-w-36 flex-1 bg-transparent px-1 py-1.5 text-sm outline-none" placeholder="Type a tag and press Enter" /></div></div></div>
          <div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-2 block text-sm font-semibold">Price in credits</span><input type="number" min="0" max="100000000" value={priceCredits} onChange={(event) => setPriceCredits(event.target.value)} className={inputClass} /></label><label><span className="mb-2 block text-sm font-semibold">Visibility</span><select value={status} onChange={(event) => setStatus(event.target.value as AssetStatus)} className={inputClass}><option value="published">Published</option><option value="draft">Draft</option></select></label></div>
          {error && <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">{error}</p>}
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-5 dark:border-white/10"><button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold dark:border-white/10">Cancel</button><button type="submit" disabled={saving} className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? "Uploading..." : asset ? "Save changes" : "Upload asset"}</button></div>
        </form>
      </div>
    </div>
  );
}
