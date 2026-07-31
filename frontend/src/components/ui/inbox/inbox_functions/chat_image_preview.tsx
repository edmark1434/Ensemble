import { X } from "lucide-react";
import { createPortal } from "react-dom";

interface ChatImagePreviewProps {
  url: string | null;
  type?: string;
  onClose: () => void;
}

export const ChatImagePreview = ({
  url,
  type = "image",
  onClose,
}: ChatImagePreviewProps) => {
  if (!url) return null;
  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative flex max-h-[90vh] max-w-5xl items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#12141f] shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-red-500/80"
          aria-label="Close preview"
        >
          <X className="h-5 w-5" />
        </button>
        {type === "video" ? (
          <video src={url} controls autoPlay className="max-h-[85vh] max-w-full object-contain" />
        ) : (
          <img src={url} alt="Chat attachment preview" className="max-h-[85vh] max-w-full object-contain" />
        )}
      </div>
    </div>,
    document.body
  );
};
