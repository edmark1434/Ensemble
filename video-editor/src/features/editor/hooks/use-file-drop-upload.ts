"use client";
import { useCallback, useRef, useState } from "react";
import useUploadStore from "@/features/editor/store/use-upload-store";
import useLayoutStore from "@/features/editor/store/use-layout-store";
import { useIsLargeScreen } from "@/hooks/use-media-query";
import { MAX_FILE_SIZE_BYTES } from "@/constants/upload-limits";

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
  const dragCounterRef = useRef(0);
  const dragErrorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { addPendingUploads, processUploads } = useUploadStore();
  const { setActiveMenuItem, setShowMenuItem, setDrawerOpen } = useLayoutStore();
  const isLargeScreen = useIsLargeScreen();

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

  // Single choke point: called from handleDrop below AND directly from
  // SceneEmpty's onFilesDropped={startUpload}. Filtering here means both
  // paths get the size check without DroppableArea needing to know about it.
  const startUpload = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;

      const oversized = files.filter((f) => f.size > MAX_FILE_SIZE_BYTES);
      const validFiles = files.filter((f) => f.size <= MAX_FILE_SIZE_BYTES);

      if (oversized.length > 0) {
        const message =
          oversized.length === 1
            ? `${oversized[0].name} exceeds ${formatFileSize(MAX_FILE_SIZE_BYTES)} file size limit`
            : `${oversized.length} files exceed ${formatFileSize(MAX_FILE_SIZE_BYTES)} file size limit`;
        flashDragError(message);
      }

      if (validFiles.length === 0) return;

      const fileUploads = validFiles.map((file) => ({
        id: crypto.randomUUID(),
        file,
        type: file.type,
        status: "pending" as const,
        progress: 0
      }));

      addPendingUploads(fileUploads);
      openUploadsMenu();

      setTimeout(() => {
        processUploads();
      }, 0);
    },
    [addPendingUploads, processUploads, openUploadsMenu, flashDragError]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDragOver(false);

      if (e.dataTransfer.files?.length) {
        startUpload(Array.from(e.dataTransfer.files));
      }
    },
    [startUpload]
  );

  return {
    isDragOver,
    dragError,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    startUpload
  };
}

export default useFileDropUpload;