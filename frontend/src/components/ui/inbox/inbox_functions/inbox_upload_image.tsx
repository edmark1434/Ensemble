// src/components/ui/inbox/inbox_functions/inbox_upload_image.tsx
import React, { useRef, useState, useCallback } from "react";
import { X, Paperclip, Film, FileText } from "lucide-react";
import { uploadFileWithIntent } from "@/lib/uploadFile";

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

export const useInboxUploadMedia = (maxFiles = 3): UseInboxUploadMediaReturn => {
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
        alert(`You can only upload a maximum of ${maxFiles} items.`);
        return;
      }

      const filesToProcess = selectedFiles.slice(0, availableSlots);

      filesToProcess.forEach((file) => {
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
    [maxFiles, mediaList.length]
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
            ? "text-zinc-600 cursor-not-allowed"
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
}) => {
  if (!mediaList || mediaList.length === 0) return null;

  return (
    <div className="px-4 pt-3 flex gap-2 overflow-x-auto flex-shrink-0 inbox-scroll-thin">
      {mediaList.map((media) => (
        <div key={media.id} className="relative inline-block flex-shrink-0">
          {media.type === "file" ? (
            <div className="h-20 w-40 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3 text-gray-600 dark:text-zinc-300">
              <FileText className="mb-1 h-5 w-5 text-blue-400" />
              <p className="truncate text-xs">{media.file.name}</p>
            </div>
          ) : media.type === "video" ? (
            <div className="relative h-20 w-20 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-black flex items-center justify-center">
              <video src={media.previewUrl} className="h-full w-full object-cover" muted />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <Film className="h-5 w-5 text-gray-900 dark:text-white/80" />
              </div>
            </div>
          ) : (
            <img
              src={media.previewUrl}
              alt="Media preview"
              className="h-20 w-20 rounded-xl object-cover border border-gray-200 dark:border-white/10"
            />
          )}

          <button
            type="button"
            onClick={() => onRemove(media.id)}
            className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-[#12141f] border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:text-white hover:bg-red-500/80 transition shadow-md"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
};

export const InboxUploadImageButton = InboxUploadMediaButton;
export const InboxUploadImagePreview = InboxUploadMediaPreview;
export const useInboxUploadImage = useInboxUploadMedia;
