import { create } from "zustand";
import api from "@/lib/axios";
import { uploadFileWithIntent } from "@/lib/uploadFile";
import { prepareAssetThumbnail, prepareTemplateThumbnail } from "./assetDerivatives";
import { getAssetPostingEligibility } from "./assetPostingEligibility";
import type { AssetRecord, AssetType } from "./assetTypes";

export interface PendingAssetUpload {
  id: string;
  accountId: string;
  name: string;
  description: string;
  priceCredits: number;
  type: AssetType;
  fileCount: number;
  previewUrl?: string;
  progress: number;
  stage: "preparing" | "uploading" | "saving" | "processing" | "failed";
  error?: string;
  asset?: AssetRecord;
}

interface UploadInput {
  accountId: string; name: string; description: string; priceCredits: number;
  type: AssetType; tags: string[]; files: File[]; thumbnailFiles: File[];
  showcaseOrder: string[]; showcaseFileKeys: string[]; snapshotId: string;
  isAdminUpload?: boolean;
  createEndpoint?: string;
}

export const useAssetUploadStore = create<{
  uploads: PendingAssetUpload[];
  add: (upload: PendingAssetUpload) => void;
  update: (id: string, patch: Partial<PendingAssetUpload>) => void;
  remove: (id: string) => void;
}>((set, get) => ({
  uploads: [],
  add: (upload) => set((state) => ({ uploads: [upload, ...state.uploads] })),
  update: (id, patch) => set((state) => ({ uploads: state.uploads.map((item) => item.id === id ? { ...item, ...patch } : item) })),
  remove: (id) => {
    const upload = get().uploads.find((item) => item.id === id);
    if (upload?.previewUrl) URL.revokeObjectURL(upload.previewUrl);
    set((state) => ({ uploads: state.uploads.filter((item) => item.id !== id) }));
  },
}));

const identity = (file: File) => `${file.name}:${file.size}:${file.lastModified}`;

// Lives outside the modal so uploads continue when it closes or the user changes tabs.
export function enqueueAssetUpload(input: UploadInput): Promise<AssetRecord | undefined> {
  const id = crypto.randomUUID();
  const preview = input.thumbnailFiles[0] || (input.type === "image" ? input.files[0] : undefined);
  useAssetUploadStore.getState().add({
    id, accountId: input.accountId, name: input.name, description: input.description,
    priceCredits: input.priceCredits, type: input.type,
    fileCount: input.files.length, previewUrl: preview ? URL.createObjectURL(preview) : undefined,
    progress: 0, stage: "preparing",
  });
  return runUpload(id, input);
}

async function runUpload(id: string, input: UploadInput): Promise<AssetRecord | undefined> {
  const update = (patch: Partial<PendingAssetUpload>) => useAssetUploadStore.getState().update(id, patch);
  try {
    if (!input.isAdminUpload) {
      const eligibility = await getAssetPostingEligibility();
      if (!eligibility.allowed) throw new Error(eligibility.message || "Asset posting is unavailable for this account.");
    }
    const thumbnails = await Promise.all(input.thumbnailFiles.map(
      input.type === "template" ? prepareTemplateThumbnail : prepareAssetThumbnail));
    const allFiles = [...input.files, ...thumbnails];
    const totalBytes = allFiles.reduce((total, file) => total + file.size, 0);
    const loaded = allFiles.map(() => 0);
    update({ stage: "uploading" });
    const transfers = await Promise.allSettled(allFiles.map((file, index) =>
      uploadFileWithIntent(file, index < input.files.length ? "asset-originals" : "assets", (bytes) => {
        loaded[index] = bytes;
        const transferred = loaded.reduce((total, size) => total + size, 0);
        update({ progress: Math.min(99, Math.floor(transferred / Math.max(1, totalBytes) * 100)),
          stage: transferred >= totalBytes ? "saving" : "uploading" });
      })));
    const failed = transfers.find((result) => result.status === "rejected");
    if (failed?.status === "rejected") throw failed.reason;
    const uploaded = transfers.map((result) => {
      if (result.status === "rejected") throw result.reason;
      return result.value;
    });
    const originals = uploaded.slice(0, input.files.length);
    const showcase = uploaded.slice(input.files.length);
    const originalByKey = new Map(input.files.map((file, index) => [identity(file), originals[index].fileId]));
    const showcaseByKey = new Map(input.thumbnailFiles.map((file, index) => [identity(file), showcase[index].fileId]));
    const showcaseOrder = input.showcaseOrder.map((key) => {
      if (key.startsWith("asset:")) return `assetFile:${originalByKey.get(key.slice(6))}`;
      if (key.startsWith("upload:")) return `upload:${showcaseByKey.get(key.slice(7))}`;
      return key;
    });
    update({ stage: "saving", progress: 99 });
    const endpoint = input.createEndpoint || (input.isAdminUpload ? "/api/admin/moderation/marketplace/assets" : "/api/assets");
    const response = await api.post<{ asset: AssetRecord }>(endpoint, {
      name: input.name, description: input.description, priceCredits: input.priceCredits,
      status: "published", tags: input.tags, type: input.type,
      originalFileIds: originals.map((file) => file.fileId),
      thumbnailFileIds: showcase.map((file) => file.fileId),
      showcaseOriginalFileIds: input.showcaseFileKeys.map((key) => originalByKey.get(key)).filter(Boolean),
      showcaseOrder,
      ...(input.type === "template" ? { ydocSnapshotId: input.snapshotId } : {}),
    });
    update({ asset: response.data.asset, stage: "processing" });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("assetUploaded", { detail: { asset: response.data.asset } }));
    }
    if (input.isAdminUpload) {
      useAssetUploadStore.getState().remove(id);
    }
    return response.data.asset;
  } catch (error) {
    const response = (error as { response?: { data?: { error?: string; message?: string; code?: string } } })?.response;
    const errorCode = response?.data?.code;
    const errorMessage = response?.data?.error || response?.data?.message
      || (error instanceof Error ? error.message : "Unable to upload this asset.");
    if (errorCode === "ASSET_POST_LIMIT_REACHED" && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("assetLimitReached", { detail: { message: errorMessage } }));
    }
    update({ stage: "failed", error: errorMessage });
    if (input.isAdminUpload) {
      useAssetUploadStore.getState().remove(id);
      throw new Error(errorMessage);
    }
    return undefined;
  }
}
