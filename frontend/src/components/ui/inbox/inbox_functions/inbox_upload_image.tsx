// src/components/ui/inbox/inbox_functions/inbox_upload_image.tsx
import React, { useRef, useState, useCallback } from "react";
import { X, ImagePlus, Film } from "lucide-react";

export type MediaType = "image" | "gif" | "video";

export interface UploadedMedia {
  id: string;
  file: File;
  previewUrl: string;
  type: MediaType;
}

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
        let mediaType: MediaType = "image";
        if (file.type.startsWith("video/")) {
          mediaType = "video";
        } else if (file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif")) {
          mediaType = "gif";
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          if (result) {
            setMediaList((prev) => [
              ...prev,
              {
                id: `media-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                file,
                previewUrl: result, // Persistent Base64 Data URL!
                type: mediaType,
              },
            ]);
          }
        };
        reader.readAsDataURL(file);
      });

      e.target.value = "";
    },
    [maxFiles, mediaList.length]
  );

  const removeMedia = useCallback((id: string) => {
    setMediaList((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearMedia = useCallback(() => {
    setMediaList([]);
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
        accept="image/*,video/*"
        className="hidden"
        onChange={onFileChange}
      />
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title="Upload Image, GIF, or Video (Max 3)"
        className={`rounded-xl p-2.5 transition flex-shrink-0 ${
          disabled
            ? "text-zinc-600 cursor-not-allowed"
            : "text-zinc-400 hover:bg-white/10 hover:text-white"
        }`}
      >
        <ImagePlus className="h-5 w-5" />
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
          {media.type === "video" ? (
            <div className="relative h-20 w-20 rounded-xl overflow-hidden border border-white/10 bg-black flex items-center justify-center">
              <video src={media.previewUrl} className="h-full w-full object-cover" muted />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <Film className="h-5 w-5 text-white/80" />
              </div>
            </div>
          ) : (
            <img
              src={media.previewUrl}
              alt="Media preview"
              className="h-20 w-20 rounded-xl object-cover border border-white/10"
            />
          )}

          <button
            type="button"
            onClick={() => onRemove(media.id)}
            className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-[#12141f] border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-red-500/80 transition shadow-md"
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