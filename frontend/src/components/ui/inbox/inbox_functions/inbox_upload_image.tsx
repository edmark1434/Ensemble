// src/components/ui/inbox/inbox_functions/inbox_upload_image.tsx
import React, { useRef, useState, useCallback } from "react";
import { X, Paperclip, Film, FileText, HelpCircle } from "lucide-react";
import { uploadFileWithIntent } from "@/lib/uploadFile";
import { showErrorToast } from "@/components/utility/toast";

export type MediaType = "image" | "gif" | "video" | "file";

export interface UploadedMedia {
  id: string;
  file: File;
  previewUrl: string;
  type: MediaType;
}

export interface ChatAttachmentPayload {
  attachment_id: string;
  attachment_type: MediaType;
  attachment_key: string;
  attachment_url: string;
  attachment_name: string;
  attachment_size: number;
}

export const chatAttachmentUrl = (attachmentKey: string): string => {
  if (/^(?:https?:|blob:|data:)/i.test(attachmentKey)) return attachmentKey;
  const base = String(import.meta.env.VITE_CLOUDFRONT_URL || "").replace(/\/$/, "");
  return base ? `${base}/${attachmentKey.replace(/^\/+/, "")}` : attachmentKey;
};

export const uploadChatAttachment = async (
  media: UploadedMedia
): Promise<ChatAttachmentPayload> => {
  const { key } = await uploadFileWithIntent(media.file, "chat-attachments");
  return {
    attachment_id: media.id,
    attachment_type: media.type,
    attachment_key: key,
    attachment_url: key,
    attachment_name: media.file.name,
    attachment_size: media.file.size,
  };
};

interface UseInboxUploadMediaReturn {
  mediaList: UploadedMedia[];
  fileInputRef: React.RefObject<HTMLInputElement>;
  openFilePicker: () => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeMedia: (id: string) => void;
  clearMedia: () => void;
}

export const useInboxUploadMedia = (maxFiles = 3, batchLimitMB = 250): UseInboxUploadMediaReturn => {
  const [mediaList, setMediaList] = useState<UploadedMedia[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      if (selectedFiles.length === 0) return;

      const availableSlots = maxFiles - mediaList.length;
      if (availableSlots <= 0) {
        showErrorToast(`You can only upload a maximum of ${maxFiles} items.`);
        return;
      }

      const filesToProcess = selectedFiles.slice(0, availableSlots);

      // Calculate current total size of existing media
      const MB = 1024 * 1024;
      const BATCH_LIMIT_MB = batchLimitMB;
      let accumulatedSize = mediaList.reduce((sum, media) => sum + media.file.size, 0);

      const validFiles: File[] = [];

      filesToProcess.forEach((file) => {
        if (accumulatedSize + file.size > BATCH_LIMIT_MB * MB) {
          showErrorToast(
            `Cannot add "${file.name}". Batch limit of ${BATCH_LIMIT_MB}MB exceeded. ` +
            `(Current total: ${((accumulatedSize + file.size) / MB).toFixed(1)}MB)`
          );
          return;
        }
        accumulatedSize += file.size;
        validFiles.push(file);
      });

      validFiles.forEach((file) => {
        let mediaType: MediaType = "file";
        if (file.type.startsWith("video/")) {
          mediaType = "video";
        } else if (file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif")) {
          mediaType = "gif";
        } else if (
          file.type.startsWith("image/") ||
          /\.(?:avif|bmp|jpe?g|png|svg|webp)$/i.test(file.name)
        ) {
          mediaType = "image";
        }

        const previewUrl =
          mediaType === "file" ? "" : URL.createObjectURL(file);
        setMediaList((prev) => [
          ...prev,
          {
            id: `media-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            file,
            previewUrl,
            type: mediaType,
          },
        ]);
      });

      e.target.value = "";
    },
    [maxFiles, mediaList]
  );

  const removeMedia = useCallback((id: string) => {
    setMediaList((prev) => {
      const removed = prev.find((item) => item.id === id);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  const clearMedia = useCallback(() => {
    setMediaList((current) => {
      current.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      return [];
    });
  }, []);

  return {
    mediaList,
    fileInputRef,
    openFilePicker,
    handleFileChange,
    removeMedia,
    clearMedia,
  };
};

interface InboxUploadMediaButtonProps {
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClick: () => void;
  disabled?: boolean;
}

export const InboxUploadMediaButton: React.FC<InboxUploadMediaButtonProps> = ({
  fileInputRef,
  onFileChange,
  onClick,
  disabled = false,
}) => {
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
        className="hidden"
        onChange={onFileChange}
      />
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title="Attach images or files (Max 3)"
        className={`rounded-xl p-2.5 transition flex-shrink-0 ${
          disabled
            ? "text-gray-500 dark:text-zinc-400 cursor-not-allowed"
            : "text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:bg-white/10 hover:text-gray-900 dark:text-white"
        }`}
      >
        <Paperclip className="h-5 w-5" />
      </button>
    </>
  );
};

interface InboxUploadMediaPreviewProps {
  mediaList: UploadedMedia[];
  onRemove: (id: string) => void;
}

export const InboxUploadMediaPreview: React.FC<InboxUploadMediaPreviewProps> = ({
  mediaList = [],
  onRemove,
  batchLimitMB = 250,
}) => {
  if (!mediaList || mediaList.length === 0) return null;

  return (
    <div className="flex flex-col border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-[#1a1b23]/50">
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">Attached files</span>
        <div className="flex items-center gap-1.5 relative group">
          <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">
            {(mediaList.reduce((sum, m) => sum + m.file.size, 0) / (1024 * 1024)).toFixed(1)}MB / {batchLimitMB}MB
          </span>
          <HelpCircle className="h-3.5 w-3.5 text-gray-400 dark:text-zinc-500 cursor-help" />
          <div className="absolute right-0 bottom-full mb-1 hidden group-hover:block w-40 p-2 bg-white dark:bg-black text-gray-900 dark:text-white text-xs rounded-lg shadow-lg z-[100] border border-gray-700 dark:border-white/10 pointer-events-none">
            <p className="mb-1 font-semibold opacity-90">Your Upload Limits</p>
            <ul className="space-y-0.5 opacity-80">
              <li>Free: 50MB</li>
              <li>Premium: 250MB</li>
              <li>Business/Ent: 700MB</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="px-4 pb-3 flex gap-3 overflow-x-auto flex-shrink-0 inbox-scroll-thin">
        {mediaList.map((media) => (
          <div key={media.id} className="relative inline-block flex-shrink-0 pt-1.5 pr-1.5">
            <div className="relative overflow-hidden rounded-xl">
              {media.type === "file" ? (
                <div className="h-20 w-40 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3 text-gray-600 dark:text-zinc-300">
                  <FileText className="mb-1 h-5 w-5 text-blue-400" />
                  <p className="truncate text-xs">{media.file.name}</p>
                </div>
              ) : media.type === "video" ? (
                <div className="relative h-20 w-20 border border-gray-200 dark:border-white/10 bg-black flex items-center justify-center">
                  <video src={media.previewUrl} className="h-full w-full object-cover" muted />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <Film className="h-5 w-5 text-gray-900 dark:text-white/80" />
                  </div>
                </div>
              ) : (
                <img
                  src={media.previewUrl}
                  alt="Media preview"
                  className="h-20 w-20 object-cover border border-gray-200 dark:border-white/10"
                />
              )}
              {/* Size Indicator Overlay */}
              <div className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white backdrop-blur-md z-10 pointer-events-none">
                {(media.file.size / (1024 * 1024)).toFixed(1)}MB
              </div>
            </div>

            <button
              type="button"
              onClick={() => onRemove(media.id)}
              className="absolute top-0 right-0 h-5 w-5 rounded-full bg-gray-50 dark:bg-[#1a1b23] border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-600 dark:text-zinc-300 hover:text-gray-900 hover:dark:text-white hover:bg-red-500/80 transition shadow-md z-20"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export const InboxUploadImageButton = InboxUploadMediaButton;
export const InboxUploadImagePreview = InboxUploadMediaPreview;
export const useInboxUploadImage = useInboxUploadMedia;
