"use client";
import { useCallback, useRef, useState } from "react";
import useUploadStore from "@/features/editor/store/use-upload-store";
import useLayoutStore from "@/features/editor/store/use-layout-store";
import { useIsLargeScreen } from "@/hooks/use-media-query";

export function useFileDropUpload() {
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounterRef = useRef(0);

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

  const startUpload = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;

      const fileUploads = files.map((file) => ({
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
    [addPendingUploads, processUploads, openUploadsMenu]
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
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    startUpload
  };
}

export default useFileDropUpload;