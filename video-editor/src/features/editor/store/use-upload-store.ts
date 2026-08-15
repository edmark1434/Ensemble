import { create } from "zustand";
import { persist } from "zustand/middleware";
import { processUpload, type UploadCallbacks } from "@/utils/upload-service";
import useStore from "./use-store";

interface UploadFile {
  id: string;
  file?: File;
  url?: string;
  type?: string;
  status?: "pending" | "uploading" | "uploaded" | "failed";
  progress?: number;
  error?: string;
  fileName?: string;
  name?: string;
  details?: { width?: number; height?: number; duration?: number };
  fileSize?: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
}

interface IUploadStore {
  showUploadModal: boolean;
  setShowUploadModal: (showUploadModal: boolean) => void;
  uploadProgress: Record<string, number>;
  setUploadProgress: (uploadProgress: Record<string, number>) => void;
  uploadsVideos: any[];
  setUploadsVideos: (uploadsVideos: any[]) => void;
  uploadsAudios: any[];
  setUploadsAudios: (uploadsAudios: any[]) => void;
  uploadsImages: any[];
  setUploadsImages: (uploadsImages: any[]) => void;
  files: UploadFile[];
  setFiles: (
    files: UploadFile[] | ((prev: UploadFile[]) => UploadFile[])
  ) => void;

  pendingUploads: UploadFile[];
  addPendingUploads: (uploads: UploadFile[]) => void;
  clearPendingUploads: () => void;
  activeUploads: UploadFile[];
  processUploads: () => void;
  updateUploadProgress: (id: string, progress: number) => void;
  setUploadStatus: (
    id: string,
    status: UploadFile["status"],
    error?: string
  ) => void;
  removeUpload: (id: string) => void;
  uploads: any[];
  setUploads: (uploads: any[] | ((prev: any[]) => any[])) => void;

  updateUploadFileName: (id: string, fileName: string) => void;
}

const useUploadStore = create<IUploadStore>()(
  persist(
    (set, get) => ({
      showUploadModal: false,
      setShowUploadModal: (showUploadModal: boolean) =>
        set({ showUploadModal }),

      uploadProgress: {},
      setUploadProgress: (uploadProgress: Record<string, number>) =>
        set({ uploadProgress }),

      uploadsVideos: [],
      setUploadsVideos: (uploadsVideos: any[]) => set({ uploadsVideos }),

      uploadsAudios: [],
      setUploadsAudios: (uploadsAudios: any[]) => set({ uploadsAudios }),

      uploadsImages: [],
      setUploadsImages: (uploadsImages: any[]) => set({ uploadsImages }),

      files: [],
      setFiles: (
        files: UploadFile[] | ((prev: UploadFile[]) => UploadFile[])
      ) =>
        set((state) => ({
          files:
            typeof files === "function"
              ? (files as (prev: UploadFile[]) => UploadFile[])(state.files)
              : files
        })),

      pendingUploads: [],
      addPendingUploads: (uploads: UploadFile[]) => {
        set((state) => ({
          pendingUploads: [...state.pendingUploads, ...uploads]
        }));
      },
      clearPendingUploads: () => set({ pendingUploads: [] }),

      activeUploads: [],
      processUploads: () => {
        const {
          pendingUploads,
          activeUploads,
          updateUploadProgress,
          setUploadStatus,
          removeUpload,
          setUploads,
          updateUploadFileName
        } = get();

        const { userId, projectId } = useStore.getState();

        // Move pending uploads to active with 'uploading' status
        if (pendingUploads.length > 0) {
          set((state) => ({
            activeUploads: [
              ...state.activeUploads,
              ...pendingUploads.map((u) => ({
                ...u,
                status: "uploading" as const,
                progress: 0
              }))
            ],
            pendingUploads: []
          }));
        }

        // Get updated activeUploads after moving pending ones
        const currentActiveUploads = get().activeUploads;

        const callbacks: UploadCallbacks = {
          onProgress: (uploadId, progress) => {
            updateUploadProgress(uploadId, progress);
          },
          onFileNameResolved: (uploadId, fileName) => {
            updateUploadFileName(uploadId, fileName);
          },
          onStatus: (uploadId, status, error) => {
            setUploadStatus(uploadId, status, error);
            if (status === "uploaded") {
              setTimeout(() => removeUpload(uploadId), 3000);
            } else if (status === "failed") {
              setTimeout(() => removeUpload(uploadId), 3000);
            }
          }
        };

        // Process all uploading items
        for (const upload of currentActiveUploads.filter(
          (upload) => upload.status === "uploading"
        )) {
          processUpload(
            upload.id,
            { file: upload.file, url: upload.url },
            callbacks,
            userId,
            projectId,
            upload.fileSize ?? undefined,
            { width: upload.width, height: upload.height, durationSeconds: upload.durationSeconds }
          )
            .then((uploadData) => {
              // Add the complete upload data to the uploads array
              if (uploadData) {
                if (Array.isArray(uploadData)) {
                  // URL uploads return an array
                  setUploads((prev) => [...prev, ...uploadData]);
                } else {
                  // File uploads return a single object
                  setUploads((prev) => [...prev, uploadData]);
                }
              }
            })
            .catch((error) => {
              console.error("Upload failed:", error);
            });
        }
      },
      updateUploadProgress: (id: string, progress: number) =>
        set((state) => ({
          activeUploads: state.activeUploads.map((u) =>
            u.id === id ? { ...u, progress } : u
          )
        })),
      setUploadStatus: (
        id: string,
        status: UploadFile["status"],
        error?: string
      ) =>
        set((state) => ({
          activeUploads: state.activeUploads.map((u) =>
            u.id === id ? { ...u, status, error } : u
          )
        })),
      removeUpload: (id: string) =>
        set((state) => ({
          activeUploads: state.activeUploads.filter((u) => u.id !== id)
        })),
      uploads: [],
      setUploads: (uploads: any[] | ((prev: any[]) => any[])) =>
        set((state) => ({
          uploads:
            typeof uploads === "function"
              ? (uploads as (prev: any[]) => any[])(state.uploads)
              : uploads
        })),

      updateUploadFileName: (id: string, fileName: string) =>
        set((state) => ({
          activeUploads: state.activeUploads.map((u) =>
            u.id === id ? { ...u, fileName } : u
          )
        })),
    }),
    {
      name: "upload-store",
      partialize: (state) => ({})
    }
  )
);

export type { UploadFile };
export default useUploadStore;
