"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import useUploadStore from "@/features/editor/store/use-upload-store";
import useLayoutStore from "@/features/editor/store/use-layout-store";
import { useIsLargeScreen } from "@/hooks/use-media-query";
import { MAX_FILE_COUNT, MAX_FILE_SIZE_BYTES } from "@/constants/upload-limits";
import { useMediaStorage } from "./use-media-storage";
import { getContentType } from "@/lib/media-content-type";
import useStore from "../store/use-store";
import { useViewOnly } from "./use-view-only";
import { insertPendingUpload } from "../utils/insert-uploaded-media";
import type { AddPlacement } from "../utils/optimistic-add";

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(2)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
};

export function useFileDropUpload() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);
  const dragErrorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { addPendingUploads, processUploads } = useUploadStore();
  const { setActiveMenuItem, setShowMenuItem, setDrawerOpen } = useLayoutStore();
  const isLargeScreen = useIsLargeScreen();
  const { uploadsDisabled, checkCapacity } = useMediaStorage();
  const viewOnly = useViewOnly();
  const viewOnlyRef = useRef(viewOnly);
  viewOnlyRef.current = viewOnly;

  const openUploadsMenu = useCallback(() => {
    setActiveMenuItem("uploads");
    if (isLargeScreen) {
      setShowMenuItem(true);
    } else {
      setDrawerOpen(true);
    }
  }, [isLargeScreen, setActiveMenuItem, setShowMenuItem, setDrawerOpen]);

  const flashDragError = useCallback((message: string) => {
    if (dragErrorTimeoutRef.current) clearTimeout(dragErrorTimeoutRef.current);
    setDragError(message);
    dragErrorTimeoutRef.current = setTimeout(() => setDragError(null), 3000);
  }, []);

  useEffect(() => () => {
    if (dragErrorTimeoutRef.current) clearTimeout(dragErrorTimeoutRef.current);
  }, []);

  // Library, canvas and timeline drops share the upload checks.
  const startUpload = useCallback(
    async (files: File[], insertAt?: number | AddPlacement) => {
      if (files.length === 0 || viewOnlyRef.current) return;
      openUploadsMenu();
      if (dragErrorTimeoutRef.current) clearTimeout(dragErrorTimeoutRef.current);
      setDragError(null);
      const target = useStore.getState();
      const isCurrentTarget = () => {
        const current = useStore.getState();
        return !viewOnlyRef.current &&
          target.userId === current.userId &&
          target.projectId === current.projectId &&
          target.activeSceneBlockId === current.activeSceneBlockId &&
          (!target.collabSchema || target.collabSchema === current.collabSchema);
      };
      const report = flashDragError;

      if (files.length > MAX_FILE_COUNT) {
        report(`Upload up to ${MAX_FILE_COUNT} files at a time.`);
        return;
      }
      const media = files.map(file => ({ file, type: getContentType(file.name) }));
      const supported = media.filter(({ type }) => /^(video|image|audio)\//.test(type));
      if (supported.length !== media.length) {
        report("Only supported video, image, and audio files can be uploaded.");
      }
      const oversized = supported.filter(({ file }) => file.size > MAX_FILE_SIZE_BYTES).map(({ file }) => file);
      const validFiles = supported.filter(({ file }) => file.size <= MAX_FILE_SIZE_BYTES);

      if (oversized.length > 0) {
        const message =
          oversized.length === 1
            ? `${oversized[0].name} exceeds ${formatFileSize(MAX_FILE_SIZE_BYTES)} file size limit`
            : `${oversized.length} files exceed ${formatFileSize(MAX_FILE_SIZE_BYTES)} file size limit`;
        report(message);
      }

      if (validFiles.length === 0) return;
      const storageError = await checkCapacity(validFiles.reduce((sum, { file }) => sum + file.size, 0));
      if (storageError) { report(storageError); return; }
      if (!isCurrentTarget()) return;

      const placement = typeof insertAt === "number" ? { time: insertAt } : insertAt;
      const fileUploads = validFiles.map(({ file, type }, index) => {
        const id = crypto.randomUUID();
        const mediaFile = file.type === type ? file : new File([file], file.name, { type, lastModified: file.lastModified });
        const callbacks = placement ? insertPendingUpload(id, mediaFile, index === 0 ? placement : (
          placement.isNewTrack
            ? { time: placement.time, trackIndex: (placement.trackIndex ?? 0) + index, isNewTrack: true }
            : { time: placement.time }
        )) : {};
        return { id, file: mediaFile, type, status: "pending" as const, progress: 0, ...callbacks };
      });

      addPendingUploads(fileUploads);
      processUploads();
    },
    [addPendingUploads, processUploads, openUploadsMenu, flashDragError, checkCapacity]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = viewOnlyRef.current ? "none" : "copy";
    setIsDragOver(!viewOnlyRef.current);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = viewOnlyRef.current ? "none" : "copy";
    setIsDragOver(!viewOnlyRef.current);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, insertAt?: number | AddPlacement) => {
      e.preventDefault();
      setIsDragOver(false);

      if (e.dataTransfer.files?.length) {
        void startUpload(Array.from(e.dataTransfer.files), insertAt);
      }
    },
    [startUpload]
  );

  return {
    isDragOver,
    clearDragOver: () => setIsDragOver(false),
    dragError,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    startUpload,
    uploadsDisabled
  };
}

export default useFileDropUpload;
