import { z } from "zod";
import { getMaxVideoBitrateKbps, VIDEO_BITRATE_RANGE_KBPS } from "../features/editor/constants/download-options";

const videoBitrateSettings = z.object({
  size: z.object({ width: z.number().finite().positive(), height: z.number().finite().positive() }),
  resolution: z.number().finite().positive(),
  fps: z.number().finite().positive(),
  bitrate: z.number().finite().min(VIDEO_BITRATE_RANGE_KBPS.min),
});

// GIF and ProRes do not expose a target bitrate; audio has a separate range.
export function getVideoExportBitrateError(input: Record<string, unknown>): string | null {
  if (input.type !== "video" || input.format === "gif" || input.format === "mov") return null;
  const parsed = videoBitrateSettings.safeParse(input);
  if (!parsed.success) return "Invalid video bitrate settings.";
  const { size, resolution, fps, bitrate } = parsed.data;
  const max = getMaxVideoBitrateKbps(size.width, size.height, resolution, fps);
  return bitrate > max ? `Video bitrate must be at most ${max / 1000} Mbps for this resolution and frame rate.` : null;
}
