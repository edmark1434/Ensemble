// src/components/ui/inbox/inbox_functions/inbox_upload_image.tsx
import React, { useRef, useState, useCallback } from "react";
import { X, ImagePlus } from "lucide-react";

export interface UploadedImage {
  file: File;
  previewUrl: string;
}

interface UseInboxUploadImageReturn {
  image: UploadedImage | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  openFilePicker: () => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  clearImage: () => void;
}

export const useInboxUploadImage = (): UseInboxUploadImageReturn => {
  const [image, setImage] = useState<UploadedImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return { file, previewUrl };
    });

    e.target.value = "";
  }, []);

  const clearImage = useCallback(() => {
    setImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  }, []);

  return { image, fileInputRef, openFilePicker, handleFileChange, clearImage };
};

interface InboxUploadImageButtonProps {
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClick: () => void;
}

export const InboxUploadImageButton: React.FC<InboxUploadImageButtonProps> = ({
  fileInputRef,
  onFileChange,
  onClick,
}) => {
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />
      <button
        type="button"
        onClick={onClick}
        title="Upload Image"
        className="rounded-xl p-2.5 text-zinc-400 hover:bg-white/10 hover:text-white transition flex-shrink-0"
      >
        <ImagePlus className="h-5 w-5" />
      </button>
    </>
  );
};

interface InboxUploadImagePreviewProps {
  image: UploadedImage;
  onRemove: () => void;
}

export const InboxUploadImagePreview: React.FC<InboxUploadImagePreviewProps> = ({
  image,
  onRemove,
}) => {
  return (
    <div className="px-4 pt-3 flex-shrink-0">
      <div className="relative inline-block">
        <img
          src={image.previewUrl}
          alt="Selected upload preview"
          className="h-20 w-20 rounded-xl object-cover border border-white/10"
        />
        <button
          type="button"
          onClick={onRemove}
          className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-[#12141f] border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-red-500/80 transition"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};