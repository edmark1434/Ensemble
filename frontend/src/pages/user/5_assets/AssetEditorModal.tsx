import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowDown, ArrowUp, AudioLines, Clapperboard, Image, Loader2, Upload, X } from "lucide-react";
import api from "@/lib/axios";
import { uploadFileWithIntent } from "@/lib/uploadFile";
import { mediaUrl, type AssetRecord, type AssetType } from "./assetTypes";
import { prepareAssetThumbnail, prepareTemplateThumbnail } from "./assetDerivatives";
import { enqueueAssetUpload } from "./assetUploadStore";
import useGlobalState from "@/lib/global_state";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast";

type SourceKind = Exclude<AssetType, "template">;


const MIME_TO_KIND: Record<string, SourceKind> = {
  "image/jpeg": "image", "image/jpg": "image", "image/png": "image", "image/gif": "image",
  "image/webp": "image", "image/avif": "image", "video/mp4": "video", "audio/mpeg": "audio",
  "audio/wav": "audio", "audio/x-wav": "audio", "audio/ogg": "audio",
};
const LIMITS: Record<SourceKind, number> = {
  image: 1024 * 1024 * 1024, video: 1024 * 1024 * 1024, audio: 1024 * 1024 * 1024,
};
const MAX_CONTENT_FILES = 20;
const MAX_SHOWCASE_IMAGES = 6;
const MAX_AUDIO_SHOWCASE_IMAGES = 3;
const MAX_SHOWCASE_TOTAL_BYTES = 200 * 1024 * 1024;
const MAX_AUDIO_SHOWCASE_TOTAL_BYTES = 100 * 1024 * 1024;
function maxShowcaseImages(type: AssetType) { return type === "audio" ? MAX_AUDIO_SHOWCASE_IMAGES : MAX_SHOWCASE_IMAGES; }
function maxShowcaseTotalBytes(type: AssetType) { return type === "audio" ? MAX_AUDIO_SHOWCASE_TOTAL_BYTES : MAX_SHOWCASE_TOTAL_BYTES; }
const FileImage = Image;
const FileVideo = Clapperboard;
const FileAudio = AudioLines;

const IMAGE_ACCEPT = "image/jpeg,image/png,image/gif,image/webp,image/avif";
const ORIGINAL_ACCEPT = IMAGE_ACCEPT + ",video/mp4,audio/mpeg,audio/wav,audio/x-wav,audio/ogg";

function sourceKind(file: File): SourceKind | undefined {
  return MIME_TO_KIND[file.type];
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
  onQueued?: () => void;
}
export default function AssetEditorModal({ open, asset, onClose, onSaved, onQueued }: AssetEditorModalProps) {
  const originalInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [listingType, setListingType] = useState<AssetType>("image");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceCredits, setPriceCredits] = useState("0");
  const [files, setFiles] = useState<File[]>([]);
  const [thumbnailFiles, setThumbnailFiles] = useState<File[]>([]);
  const [retainedMediaAssetIds, setRetainedMediaAssetIds] = useState<string[]>([]);
  const [showcaseOrder, setShowcaseOrder] = useState<string[]>([]);
  const [mediaSelectionDirty, setMediaSelectionDirty] = useState(false);
  const [thumbnailSelectionDirty, setThumbnailSelectionDirty] = useState(false);
  const [originalPreviewUrls, setOriginalPreviewUrls] = useState<string[]>([]);
  const [thumbnailPreviewUrls, setThumbnailPreviewUrls] = useState<string[]>([]);



  const [ydocSnapshotId, setYdocSnapshotId] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setSaving(false);
    setListingType(asset?.type || "image");
    setName(asset?.name || "");
    setDescription(asset?.description || "");
    setPriceCredits(String(asset?.price_credits ?? 0));
    setFiles([]); setThumbnailFiles([]);
    setRetainedMediaAssetIds((asset?.media_assets || []).map((item) => item.media_asset_id));
    const contentIds = new Set((asset?.media_assets || []).map((item) => item.media_asset_id));
    const imageContentIds = new Set((asset?.media_assets || [])
      .filter((item) => item.type === "image" || item.type === "video")
      .map((item) => item.media_asset_id));
    setShowcaseOrder((asset?.thumbnails || []).map((item) =>
      `${contentIds.has(item.media_asset_id) && imageContentIds.has(item.media_asset_id) ? "media" : "retained"}:${item.media_asset_id}`));
    setMediaSelectionDirty(false); setThumbnailSelectionDirty(false);

    setYdocSnapshotId("");
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
  const PrimaryIcon = primaryKind === "image" ? Image : primaryKind === "video" ? Clapperboard : AudioLines;
  const isTemplate = listingType === "template";
  const currentContentCount = asset ? retainedMediaAssetIds.length + files.length : files.length;
  const showShowcaseControls = isTemplate || currentContentCount > 1;
  const retainedThumbnailIds = showcaseOrder.filter((key) => key.startsWith("retained:")).map((key) => key.slice("retained:".length));
  const selectedShowcaseMediaIds = showcaseOrder.filter((key) => key.startsWith("media:")).map((key) => key.slice("media:".length));
  const selectedShowcaseFileKeys = showcaseOrder.filter((key) => key.startsWith("asset:")).map((key) => key.slice("asset:".length));
  const hasAvailableExistingShowcaseImages = Boolean(asset && asset.thumbnails.some((item) =>
    !asset.media_assets.some((mediaFile) => mediaFile.media_asset_id === item.media_asset_id)
    && !showcaseOrder.includes(`retained:${item.media_asset_id}`)));

  const changeListingType = (nextType: AssetType) => {
    setListingType(nextType);
    setFiles([]);
    setThumbnailFiles([]);
    setShowcaseOrder([]);
    setError("");
  };
  const addFiles = (selected: File[]) => {
    setError("");
    if (selected.length === 0) return;
    if (listingType === "template") return setError("Templates are made from a project snapshot, not files.");
    const combined = [...files, ...selected];
    if (combined.length + (asset ? retainedMediaAssetIds.length : 0) > MAX_CONTENT_FILES) {
      return setError(`Choose no more than ${MAX_CONTENT_FILES} asset files.`);
    }
    const effectiveType = !asset && files.length === 0 ? sourceKind(selected[0]) : listingType;
    const seen = new Set<string>();
    for (const file of combined) {
      const kind = sourceKind(file);
      if (!kind) return setError("Choose supported image, video, or audio files.");
      if (kind !== effectiveType) return setError("Every file in a listing must be the same type (image, video, or audio).");
      if (seen.has(fileIdentity(file))) return setError("The same asset file cannot be selected more than once.");
      if (file.size > LIMITS[kind]) return setError(`${file.name} exceeds the ${LIMITS[kind] / 1024 / 1024}MB limit.`);
      seen.add(fileIdentity(file));
    }
    const finalContentCount = combined.length + (asset ? retainedMediaAssetIds.length : 0);
    if (finalContentCount === 1) {
      setThumbnailFiles([]);
      setShowcaseOrder([]);
    }
    if (!asset && files.length === 0 && effectiveType) setListingType(effectiveType);
    setFiles(combined);
  };
  const addThumbnails = (selected: File[]) => {
    setError("");
    const combined = [...thumbnailFiles, ...selected];
    const limit = maxShowcaseImages(listingType);
    if (showcaseOrder.length + selected.length > limit) return setError(`Choose no more than ${limit} showcase images.`);
    const combinedSize = combined.reduce((total, file) => total + file.size, 0);
    if (combinedSize > maxShowcaseTotalBytes(listingType)) {
      return setError(`Showcase images must total no more than ${maxShowcaseTotalBytes(listingType) / 1024 / 1024}MB.`);
    }
    const seen = new Set<string>();
    for (const file of combined) {
      if (sourceKind(file) !== "image") return setError("Choose JPEG, PNG, GIF, WebP, or AVIF showcase images.");
      if (seen.has(fileIdentity(file))) return setError("The same showcase image cannot be selected more than once.");
      seen.add(fileIdentity(file));
    }
    setThumbnailFiles(combined);
    setShowcaseOrder((current) => [...current, ...selected.map((file) => `upload:${fileIdentity(file)}`)]);
  };
  const toggleShowcaseEntry = (key: string) => {
    if (showcaseOrder.includes(key)) {
      setShowcaseOrder(showcaseOrder.filter((item) => item !== key));
      setThumbnailSelectionDirty(true);
      setError("");
      return;
    }
    if (showcaseOrder.length >= maxShowcaseImages(listingType)) {
      setError(`Choose no more than ${maxShowcaseImages(listingType)} showcase images.`);
      return;
    }
    setShowcaseOrder([...showcaseOrder, key]);
    setThumbnailSelectionDirty(true);
    setError("");
  };
  const removeShowcaseEntry = (key: string) => {
    setShowcaseOrder((current) => current.filter((item) => item !== key));
    if (key.startsWith("upload:")) {
      const fileKey = key.slice("upload:".length);
      setThumbnailFiles((current) => current.filter((file) => fileIdentity(file) !== fileKey));
    }
    setThumbnailSelectionDirty(true);
  };
  const moveShowcaseEntry = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= showcaseOrder.length) return;
    setShowcaseOrder((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setThumbnailSelectionDirty(true);
  };
  const removeAssetFile = (index: number, key: string) => {
    setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setShowcaseOrder((current) => current.filter((item) => item !== `asset:${key}`));
    const remainingContentCount = files.length - 1 + (asset ? retainedMediaAssetIds.length : 0);
    if (remainingContentCount === 1) {
      setThumbnailFiles([]);
      setShowcaseOrder([]);
    }
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
    if (saving) return;
    setError("");
    const cleanName = name.trim();
    const cleanDescription = description.trim();
    const price = Number(priceCredits);
    const pendingTag = cleanTag(tagInput);
    const submittedTags = [...tags];
    if (pendingTag.length > 50) return setError("Each tag must be 50 characters or fewer.");
    if (pendingTag && !submittedTags.some((tag) => tag.toLowerCase() === pendingTag.toLowerCase())) submittedTags.push(pendingTag);
    if (!cleanName || cleanName.length > 50) return setError("Enter an asset title up to 50 characters.");
    if (!cleanDescription || cleanDescription.length > 5000) return setError("Enter an asset description up to 5,000 characters.");
    if (!Number.isInteger(price) || price < 0 || price > 100000000) return setError("Enter a valid whole-number price.");
    if (submittedTags.length > 10) return setError("You can add up to 10 tags.");
    const snapshotId = ydocSnapshotId.trim();
    if (snapshotId && !/^[1-9]\d{0,17}$/.test(snapshotId)) return setError("Enter a valid project snapshot ID.");

    // Proxies and preview thumbnails are made by the server (a worker for video/audio),
    // so only asset files and uploaded showcase images are uploaded.
    if (asset) {
      const replaceMedia = !isTemplate && (files.length > 0 || mediaSelectionDirty);
      const replaceYdoc = isTemplate && snapshotId !== "";
      const finalMediaCount = retainedMediaAssetIds.length + files.length;
      const hasShowcase = isTemplate || finalMediaCount > 1;
      const finalShowcaseOrder = hasShowcase ? showcaseOrder : [];
      const finalRetainedThumbnailIds = hasShowcase ? retainedThumbnailIds : [];
      const finalShowcaseMediaIds = hasShowcase ? selectedShowcaseMediaIds : [];
      const finalShowcaseFileKeys = hasShowcase ? selectedShowcaseFileKeys : [];
      const finalThumbnailFiles = hasShowcase ? thumbnailFiles : [];
      const finalThumbnailCount = finalShowcaseOrder.length;
      const showcaseLimit = maxShowcaseImages(listingType);
      if (isTemplate && (finalThumbnailCount < 1 || finalThumbnailCount > showcaseLimit)) {
        return setError(`Templates need 1–${showcaseLimit} showcase images.`);
      }
      if (!isTemplate && finalThumbnailCount > showcaseLimit) {
        return setError(`Choose no more than ${showcaseLimit} showcase images.`);
      }
      if (replaceMedia && finalMediaCount < 1) {
        return setError(`Keep or add at least one ${listingType} file.`);
      }
      const replaceThumbnails = thumbnailFiles.length > 0 || thumbnailSelectionDirty || replaceMedia
        || (!hasShowcase && showcaseOrder.length > 0);

      setSaving(true);
      try {
        const preparedThumbnails = replaceThumbnails
          ? await Promise.all(finalThumbnailFiles.map(isTemplate ? prepareTemplateThumbnail : prepareAssetThumbnail))
          : [];
        const [originalUploads, thumbnailUploads] = await Promise.all([
          Promise.all(files.map((file) => uploadFileWithIntent(file, "asset-originals"))),
          Promise.all(preparedThumbnails.map((file) => uploadFileWithIntent(file, "assets"))),
        ]);
        const uploadedOriginalByKey = new Map(files.map((file, index) => [fileIdentity(file), originalUploads[index]?.fileId]));
        const uploadedShowcaseByKey = new Map(finalThumbnailFiles.map((file, index) => [fileIdentity(file), thumbnailUploads[index]?.fileId]));
        const submittedShowcaseOrder = finalShowcaseOrder.map((key) => {
          if (key.startsWith("asset:")) return `assetFile:${uploadedOriginalByKey.get(key.slice("asset:".length))}`;
          if (key.startsWith("upload:")) return `upload:${uploadedShowcaseByKey.get(key.slice("upload:".length))}`;
          return key;
        });
        const hasContentUpdate = replaceMedia || replaceThumbnails || replaceYdoc;
        const response = await api.patch<{ asset: AssetRecord }>(`/api/assets/${asset.market_asset_id}`, {
          name: cleanName,
          description: cleanDescription,
          priceCredits: price,
          status: "published",
          tags: submittedTags,
          ...(hasContentUpdate ? {
            contentUpdate: {
              type: listingType,
              replaceMedia,
              replaceThumbnails,
              replaceYdoc,
              retainedMediaAssetIds,
              retainedThumbnailIds: finalRetainedThumbnailIds,
              showcaseMediaAssetIds: finalShowcaseMediaIds,
              showcaseOrder: submittedShowcaseOrder,
              originalFileIds: originalUploads.map((upload) => upload.fileId),
              thumbnailFileIds: thumbnailUploads.map((upload) => upload.fileId),
              showcaseOriginalFileIds: finalShowcaseFileKeys
                .map((key) => uploadedOriginalByKey.get(key))
                .filter((fileId): fileId is string => Boolean(fileId)),
              ...(replaceYdoc ? { ydocSnapshotId: snapshotId } : {}),
            },
          } : {}),
        });
        if (response.data.asset.reviewQueued && response.data.asset.reviewMessage) {
          showSuccessToast(response.data.asset.reviewMessage);
        } else if (response.data.asset.processing_status === "processing") {
          showSuccessToast("Your new files are being processed.");
        }
        onSaved(response.data.asset);
      } catch (requestError) {
        const message = errorMessage(requestError);
        setError(message);
        if (errorCode(requestError) === "ASSET_POST_LIMIT_REACHED") showErrorToast(message);
      } finally { setSaving(false); }
      return;
    }

    const showcaseCount = showcaseOrder.length;
    const showcaseLimit = maxShowcaseImages(listingType);
    if (isTemplate && (showcaseCount < 1 || showcaseCount > showcaseLimit)) return setError(`Templates need 1–${showcaseLimit} showcase images.`);
    if (!isTemplate && files.length === 1 && showcaseCount > 0) return setError("A single asset file does not use showcase images.");
    if (!isTemplate && showcaseCount > showcaseLimit) return setError(`Choose no more than ${showcaseLimit} showcase images.`);
    if (isTemplate && !snapshotId) return setError("Enter the project snapshot ID for this template.");
    if (!isTemplate && (!primaryFile || primaryKind !== listingType)) return setError(`The primary asset file must be a ${listingType} file.`);
    const accountId = useGlobalState.getState().user?.account_id;
    if (!accountId) return setError("Please sign in before uploading an asset.");
    setSaving(true);
    enqueueAssetUpload({
      accountId, name: cleanName, description: cleanDescription, priceCredits: price,
      type: listingType, tags: submittedTags, files: [...files], thumbnailFiles: [...thumbnailFiles],
      showcaseOrder: [...showcaseOrder], showcaseFileKeys: selectedShowcaseFileKeys, snapshotId,
    });
    if (onQueued) onQueued();
    else onClose();
  };

  const inputClass = "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-[#0b0e17] dark:text-white";
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="asset-editor-title">
      <div className="scroll-thin max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#10131e]">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-200 bg-white px-5 py-4 dark:border-white/10 dark:bg-[#10131e]">
          <div><h2 id="asset-editor-title" className="text-lg font-bold">{asset ? "Edit asset" : "Upload asset"}</h2><p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">{asset ? "Update listing details, showcase images, and asset files." : "Create a protected asset package."}</p></div>
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 dark:hover:bg-white/5" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-5 p-5">
          <div className="space-y-5">
            {!asset && <div><p className="mb-2 text-sm font-semibold">Asset type</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{(["image", "video", "audio"] as AssetType[]).map((type) => { const Icon = type === "image" ? Image : type === "video" ? Clapperboard : AudioLines; return <button key={type} type="button" onClick={() => changeListingType(type)} aria-pressed={listingType === type} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold capitalize transition ${listingType === type ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-300" : "border-gray-300 hover:border-blue-400 dark:border-white/10"}`}><Icon className="h-4 w-4" />{type}</button>; })}</div></div>}
            {asset && <div className="rounded-xl border border-gray-200 p-4 dark:border-white/10">
              <div className="flex items-start justify-between gap-4"><div><h3 className="text-sm font-bold">Current asset content</h3><p className="mt-1 text-xs text-gray-500">Keep selected files in the package. Add image or video files to the showcase, then order them below.</p></div><span className="rounded-lg bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-blue-600">{asset.type}</span></div>
              <div className={`mt-4 grid gap-4 ${showShowcaseControls && hasAvailableExistingShowcaseImages ? "sm:grid-cols-2" : "grid-cols-1"}`}>
                <div>
                  <p className="mb-2 text-xs font-semibold">Current asset files</p>
                  {asset.media_assets?.length ? <div className="scroll-thin max-h-48 space-y-2 overflow-y-auto pr-1">{asset.media_assets.map((mediaFile) => {
                    const retained = retainedMediaAssetIds.includes(mediaFile.media_asset_id);
                    const canShowcase = showShowcaseControls && listingType !== "audio"
                      && (mediaFile.type === "image" || mediaFile.type === "video");
                    const showcaseKey = `media:${mediaFile.media_asset_id}`;
                    const isShowcased = showcaseOrder.includes(showcaseKey);
                    const Icon = mediaFile.type === "image" ? Image : mediaFile.type === "video" ? Clapperboard : AudioLines;
                    return <div key={mediaFile.media_asset_id} className={`flex items-center gap-2 rounded-lg border p-2 transition ${retained ? "border-blue-500/50 bg-blue-500/5" : "border-gray-200 bg-gray-50 opacity-50 dark:border-white/10 dark:bg-white/[0.025]"}`}>
                      {mediaFile.thumbnail_path ? <img src={mediaUrl(mediaFile.thumbnail_path)} alt="" className="h-10 w-10 rounded object-cover" /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-blue-500/10 text-blue-500"><Icon className="h-4 w-4" /></span>}
                      <span className="min-w-0 flex-1 truncate text-xs">{mediaFile.name}</span>
                      <button type="button" aria-pressed={retained} aria-label={retained ? `Remove ${mediaFile.name}` : `Restore ${mediaFile.name}`} onClick={() => {
                        setRetainedMediaAssetIds((current) => retained ? current.filter((id) => id !== mediaFile.media_asset_id) : [...current, mediaFile.media_asset_id]);
                        if (retained) setShowcaseOrder((current) => current.filter((key) => key !== showcaseKey));
                        setMediaSelectionDirty(true);
                      }} className={`rounded-md px-2 py-1.5 text-[10px] font-semibold ${retained ? "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300" : "bg-blue-600 text-white"}`}>{retained ? "Remove" : "Restore"}</button>
                      {canShowcase && <button type="button" aria-pressed={isShowcased} disabled={!retained || (!isShowcased && showcaseOrder.length >= maxShowcaseImages(listingType))} onClick={() => toggleShowcaseEntry(showcaseKey)} className={`rounded-md px-2 py-1.5 text-[10px] font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${isShowcased ? "bg-blue-600/10 text-blue-600 dark:text-blue-300" : "bg-blue-600 text-white"}`}>{isShowcased ? "Added to showcase" : "Add to showcase"}</button>}
                    </div>;
                  })}</div> : <p className="text-xs text-gray-500">No uploaded files.</p>}
                </div>
                {showShowcaseControls && hasAvailableExistingShowcaseImages && <div>
                  <p className="mb-2 text-xs font-semibold">Available showcase images</p>
                  <div className="scroll-thin max-h-48 space-y-2 overflow-y-auto pr-1">{asset.thumbnails.filter((item) => !asset.media_assets.some((mediaFile) => mediaFile.media_asset_id === item.media_asset_id)
                    && !showcaseOrder.includes(`retained:${item.media_asset_id}`)).map((item) => <div key={item.media_asset_id} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-white/10 dark:bg-white/[0.025]">
                    <img src={mediaUrl(item.path)} alt="" className="h-10 w-10 rounded object-cover" />
                    <span className="min-w-0 flex-1 truncate text-xs">Showcase image</span>
                    <button type="button" disabled={showcaseOrder.length >= maxShowcaseImages(listingType)} onClick={() => toggleShowcaseEntry(`retained:${item.media_asset_id}`)} className="rounded-md bg-blue-600 px-2 py-1.5 text-[10px] font-semibold text-white disabled:opacity-40">Add to showcase</button>
                  </div>)}</div>
                </div>}
              </div>
            </div>}
            <div className={`grid gap-4 ${showShowcaseControls ? "sm:grid-cols-2" : "grid-cols-1"}`}>
              {isTemplate ? (
                <div><label htmlFor="asset-ydoc-snapshot" className="mb-2 block text-sm font-semibold">{asset ? "Replace project snapshot ID" : "Project snapshot ID"} {!asset && <span className="text-red-500">*</span>}</label><input id="asset-ydoc-snapshot" inputMode="numeric" value={ydocSnapshotId} onChange={(event) => setYdocSnapshotId(event.target.value)} className={inputClass} placeholder={asset ? (asset.has_ydoc ? "Leave empty to keep the current snapshot" : "Snapshot ID") : "Snapshot ID"} /><p className="mt-1 text-xs text-gray-500">A template links to one snapshot of a project.</p></div>
              ) : (<div><label className="mb-2 block text-sm font-semibold">{asset ? "Add asset files" : "Asset files"} {!asset && <span className="text-red-500">*</span>}</label><input ref={originalInputRef} type="file" multiple className="hidden" accept={ORIGINAL_ACCEPT} onChange={(event) => { addFiles(Array.from(event.target.files || [])); event.currentTarget.value = ""; }} /><button type="button" onClick={() => originalInputRef.current?.click()} className="flex min-h-28 w-full items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-left transition hover:border-blue-400 dark:border-white/15 dark:bg-white/[0.025]"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-600/10 text-blue-500">{primaryFile ? <PrimaryIcon className="h-5 w-5" /> : <Upload className="h-5 w-5" />}</span><span><span className="block text-sm font-semibold">{files.length ? `${files.length} asset file${files.length === 1 ? "" : "s"} selected` : asset ? "Add files to the selected set" : "Choose asset files"}</span><span className="mt-1 block text-xs text-gray-500">Up to 20 files, 1GB each.</span></span></button></div>)}
              {showShowcaseControls && <div><label className="mb-2 block text-sm font-semibold">Showcase images <span className="font-normal text-gray-400">({isTemplate ? "required" : "optional"})</span></label><input ref={thumbnailInputRef} type="file" multiple className="hidden" accept={IMAGE_ACCEPT} onChange={(event) => { addThumbnails(Array.from(event.target.files || [])); event.currentTarget.value = ""; }} /><button type="button" onClick={() => thumbnailInputRef.current?.click()} className="flex min-h-28 w-full items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-left transition hover:border-blue-400 dark:border-white/15 dark:bg-white/[0.025]">{thumbnailPreviewUrls[0] ? <img src={thumbnailPreviewUrls[0]} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" /> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-600/10 text-blue-500"><Upload className="h-5 w-5" /></span>}<span><span className="block text-sm font-semibold">Choose showcase images</span><span className="mt-1 block text-xs text-gray-500">{showcaseOrder.length} of {maxShowcaseImages(listingType)} selected · {maxShowcaseTotalBytes(listingType) / 1024 / 1024}MB total</span></span></button></div>}
            </div>
            {files.length > 0 && <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-[#080a12]"><p className="mb-3 text-xs font-semibold">Asset files ({files.length})</p><div className="scroll-thin max-h-56 space-y-2 overflow-y-auto pr-1">{files.map((file, index) => { const kind = sourceKind(file); const Icon = kind === "image" ? FileImage : kind === "video" ? FileVideo : FileAudio; const fileKey = fileIdentity(file); const showcaseKey = `asset:${fileKey}`; const isShowcased = showcaseOrder.includes(showcaseKey); return <div key={fileKey} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2 dark:border-white/10 dark:bg-white/[0.025]">{kind === "image" ? <img src={originalPreviewUrls[index]} alt="" className="h-12 w-12 rounded-md object-cover" /> : <span className="flex h-12 w-12 items-center justify-center rounded-md bg-blue-500/10 text-blue-500"><Icon className="h-5 w-5" /></span>}<div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{file.name}</p><p className="text-[10px] uppercase text-gray-500">{kind} · {(file.size / 1024 / 1024).toFixed(1)}MB</p></div>{showShowcaseControls && (kind === "image" || kind === "video") && <button type="button" aria-pressed={isShowcased} disabled={!isShowcased && showcaseOrder.length >= maxShowcaseImages(listingType)} onClick={() => toggleShowcaseEntry(showcaseKey)} className={`rounded-md px-2 py-1.5 text-[10px] font-semibold disabled:opacity-40 ${isShowcased ? "bg-blue-600/10 text-blue-600 dark:text-blue-300" : "bg-blue-600 text-white"}`}>{isShowcased ? "Added to showcase" : "Add to showcase"}</button>}<button type="button" onClick={() => removeAssetFile(index, fileKey)} className="rounded p-1.5 text-gray-500 hover:bg-red-500/10 hover:text-red-500"><X className="h-3.5 w-3.5" /></button></div>; })}</div></div>}
            {showShowcaseControls && showcaseOrder.length > 0 && <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-[#080a12]"><div className="mb-3 flex justify-between"><p className="text-xs font-semibold">Showcase image order</p><p className="text-[10px] text-gray-500">First is the cover · use arrows to reorder</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{showcaseOrder.map((key, index) => {
              const separator = key.indexOf(":");
              const kind = key.slice(0, separator);
              const value = key.slice(separator + 1);
              const retained = kind === "retained" || kind === "media" ? asset?.thumbnails.find((item) => item.media_asset_id === value) : undefined;
              const mediaFile = kind === "media" ? asset?.media_assets.find((item) => item.media_asset_id === value) : undefined;
              const assetIndex = kind === "asset" ? files.findIndex((file) => fileIdentity(file) === value) : -1;
              const uploadIndex = kind === "upload" ? thumbnailFiles.findIndex((file) => fileIdentity(file) === value) : -1;
              const localFile = assetIndex >= 0 ? files[assetIndex] : uploadIndex >= 0 ? thumbnailFiles[uploadIndex] : undefined;
              const preview = kind === "upload" && uploadIndex >= 0 ? thumbnailPreviewUrls[uploadIndex]
                : kind === "asset" && assetIndex >= 0 ? originalPreviewUrls[assetIndex]
                  : retained ? mediaUrl(retained.path) : mediaUrl(mediaFile?.thumbnail_path);
              const imageLike = kind === "upload" || (kind === "asset" && sourceKind(localFile!) === "image")
                || Boolean(preview && (mediaFile?.type === "image" || mediaFile?.type === "video" || retained));
              const Icon = kind === "asset" && sourceKind(localFile!) === "video" || mediaFile?.type === "video" ? Clapperboard : Image;
              const label = localFile?.name || mediaFile?.name || "Showcase image";
              return <div key={key} className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/10 dark:bg-white/[0.025]">
                <div className="relative aspect-video bg-gray-100 dark:bg-white/5">{preview && imageLike ? <img src={preview} alt={label} className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-blue-500"><Icon className="h-8 w-8" /></span>}{index === 0 && <span className="absolute left-2 top-2 rounded bg-blue-600 px-2 py-1 text-[9px] font-bold uppercase text-white">Cover</span>}</div>
                <div className="flex items-center gap-2 p-2"><span className="min-w-0 flex-1 truncate text-[10px] font-semibold">{label}</span><button type="button" aria-label={`Move ${label} up`} onClick={() => moveShowcaseEntry(index, -1)} disabled={index === 0} className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-white/10"><ArrowUp className="h-3.5 w-3.5" /></button><button type="button" aria-label={`Move ${label} down`} onClick={() => moveShowcaseEntry(index, 1)} disabled={index === showcaseOrder.length - 1} className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-white/10"><ArrowDown className="h-3.5 w-3.5" /></button><button type="button" aria-label={`Remove ${label} from showcase`} onClick={() => removeShowcaseEntry(key)} className="rounded p-1 text-gray-500 hover:bg-red-500/10 hover:text-red-500"><X className="h-3.5 w-3.5" /></button></div>
              </div>;
            })}</div></div>}
          </div>
          <label className="block"><span className="mb-2 block text-sm font-semibold">Title</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={50} className={inputClass} placeholder="Name your asset" /></label>
          <label className="block"><span className="mb-2 block text-sm font-semibold">Description</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={5000} rows={5} className={inputClass} placeholder="Describe what this asset contains" /></label>
          <div><label htmlFor="asset-tags" className="mb-2 block text-sm font-semibold">Tags <span className="font-normal text-gray-400">(optional)</span></label><div className="min-h-12 rounded-xl border border-gray-300 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#0b0e17]"><div className="flex flex-wrap items-center gap-2">{tags.map((tag) => <span key={tag.toLowerCase()} className="inline-flex items-center gap-1 rounded-lg bg-blue-500/10 px-2.5 py-1.5 text-xs font-semibold text-blue-600">#{tag}<button type="button" onClick={() => setTags((current) => current.filter((item) => item !== tag))}><X className="h-3 w-3" /></button></span>)}<input id="asset-tags" value={tagInput} onChange={(event) => setTagInput(event.target.value)} onKeyDown={handleTagKeyDown} onBlur={() => addTag(tagInput)} maxLength={50} className="min-w-36 flex-1 bg-transparent px-1 py-1.5 text-sm outline-none" placeholder="Type a tag and press Enter" /></div></div></div>
          <label className="block"><span className="mb-2 block text-sm font-semibold">Price in credits</span><input type="number" min="0" max="100000000" value={priceCredits} onChange={(event) => setPriceCredits(event.target.value)} className={inputClass} /></label>
          {error && <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">{error}</p>}
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-5 dark:border-white/10"><button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold dark:border-white/10">Cancel</button><button type="submit" disabled={saving} className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? (asset ? "Saving..." : "Uploading...") : asset ? "Save changes" : "Upload asset"}</button></div>
        </form>
      </div>
    </div>
  );
}
