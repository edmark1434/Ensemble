import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

const extractVideoThumbnailFromUrl = (src: string): Promise<string> => {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";

    const timeout = setTimeout(() => finish(""), 8000);
    const finish = (result: string) => {
      clearTimeout(timeout);
      video.onloadeddata = null;
      video.onseeked = null;
      video.onerror = null;
      video.removeAttribute("src");
      video.load(); // aborts any in-flight download
      resolve(result);
    };

    video.onloadeddata = () => {
      try {
        video.currentTime = Math.min(1, (video.duration || 2) / 2);
      } catch {
        finish("");
      }
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 480 / Math.max(video.videoWidth, video.videoHeight));
        canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
        canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        finish(canvas.toDataURL("image/jpeg", 0.7));
      } catch {
        // Tainted canvas (CORS) or decode failure - fall back gracefully.
        finish("");
      }
    };
    video.onerror = () => finish("");
    video.src = src;
  });
};

export function useVideoPoster(src?: string) {
  const { data } = useQuery({
    queryKey: ["video-poster", src],
    queryFn: () => extractVideoThumbnailFromUrl(src!),
    enabled: !!src,
  });
  return data || "";
}

// Local blob preview for a File that hasn't finished uploading yet.
// Created once per file, revoked on cleanup so we don't leak blob URLs.
export const useObjectUrl = (file?: File) => {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!file) {
      setUrl("");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return url;
};
