import { toast } from "sonner";

export async function exitFullscreenForModal(): Promise<boolean> {
  if (!document.fullscreenElement) return true;
  try {
    await document.exitFullscreen();
    return true;
  } catch {
    // A simultaneous Escape/fullscreen change may have already completed.
    if (!document.fullscreenElement) return true;
    toast.error("Exit fullscreen to open the watermark options.");
    return false;
  }
}
