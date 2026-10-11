// features/editor/comments/image-preview.tsx
// Full-screen image viewer for comment attachments: dark backdrop, image, X.

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// Above floating controls (210), popovers (250) and dialogs (300).
const PREVIEW_Z_INDEX = 400;

export function ImagePreview({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // React events bubble through portals, so every click here is stopped from
  // reaching the clickable comment card underneath.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      style={{ zIndex: PREVIEW_Z_INDEX }}
      className="fixed inset-0 flex items-center justify-center bg-black/90 p-6"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <button
        type="button"
        aria-label="Close preview"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
      >
        <X size={20} />
      </button>
      <img
        src={src}
        alt={alt ?? ""}
        onClick={(e) => e.stopPropagation()}
        className="max-h-full max-w-full rounded-md object-contain"
      />
    </div>,
    document.body,
  );
}