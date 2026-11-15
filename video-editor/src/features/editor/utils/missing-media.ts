import { useMissingMedia } from "../store/use-missing-media";
import useStore from "../store/use-store";

// The snapshot marker identifies missing content; it is never a fetchable URL.
export const isPendingMediaSource = (src?: string | null): boolean => !!src?.startsWith("pending-upload:");

export function isMissingMediaSource(src?: string | null): boolean {
  if (isPendingMediaSource(src)) return false;
  if (!src || src.startsWith("missing-template-media:")) return true;
  const availability = useMissingMedia.getState();
  return availability.projectId === useStore.getState().projectId && availability.missing.has(src);
}
