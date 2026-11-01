"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useStore from "../store/use-store";
import useUploadStore from "../store/use-upload-store";

type StorageUsage = { plan: string; usedBytes: number; limitBytes: number; upgradeUrl: string };

const queuedBytes = () => {
  const { pendingUploads, activeUploads } = useUploadStore.getState();
  return [...pendingUploads, ...activeUploads]
    .filter(item => item.status === "pending" || item.status === "uploading" || !item.status)
    .reduce((sum, item) => sum + (item.file?.size ?? item.fileSize ?? 0), 0);
};

export function useMediaStorage() {
  const userId = useStore(state => state.userId);
  // Subscribe to the queue so every upload surface reserves space for pending transfers.
  useUploadStore(state => state.pendingUploads);
  useUploadStore(state => state.activeUploads);
  const query = useQuery({
    queryKey: ["media-storage-usage", userId],
    queryFn: () => axios.get<StorageUsage>("/api/uploads/storage").then(response => response.data),
    enabled: !!userId,
    staleTime: 5_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const availableBytes = query.data
    ? Math.max(0, query.data.limitBytes - query.data.usedBytes - queuedBytes()) : 0;
  const checkCapacity = async (bytes: number) => {
    const result = await query.refetch();
    if (result.error || !result.data) return "Unable to check storage. Please try again.";
    const remaining = result.data.limitBytes - result.data.usedBytes - queuedBytes();
    if (remaining <= 0) return "Your storage is full. Get more storage to upload files.";
    if (bytes > remaining) return "These files exceed your available storage. Remove some files or get more storage.";
    return null;
  };
  return { ...query, availableBytes, uploadsDisabled: !query.data || availableBytes <= 0, checkCapacity };
}
