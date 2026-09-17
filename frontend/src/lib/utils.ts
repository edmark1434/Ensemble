import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const cloudfrontUrl = String(import.meta.env.VITE_CLOUDFRONT_URL || "").replace(/\/$/, "");

export function getImageUrl(path?: string | null) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${cloudfrontUrl}/${path.replace(/^\/+/, "")}`;
}

