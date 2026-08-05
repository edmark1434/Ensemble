export type ExportType = "video" | "image" | "image-sequence" | "audio";

export type ExportFormat =
  | "mp4"
  | "mov"
  | "mkv"
  | "gif"
  | "png"
  | "jpeg"
  | "zip"
  | "mp3"
  | "wav"
  | "aac";

export interface SelectOption<T extends string | number> {
  value: T;
  label: string;
}

export const EXPORT_TYPE_OPTIONS: SelectOption<ExportType>[] = [
  { value: "video", label: "Video" },
  { value: "image", label: "Image (current frame)" },
  { value: "image-sequence", label: "Image sequence" },
  { value: "audio", label: "Audio" }
];

export const FORMATS_BY_TYPE: Record<ExportType, SelectOption<ExportFormat>[]> = {
  video: [
    { value: "mp4", label: "MP4" },
    { value: "mov", label: "MOV" },
    { value: "mkv", label: "MKV" },
    { value: "gif", label: "GIF" }
  ],
  image: [
    { value: "png", label: "PNG" },
    { value: "jpeg", label: "JPEG" }
  ],
  "image-sequence": [
    { value: "png", label: "PNG" },
    { value: "jpeg", label: "JPEG" },
    { value: "zip", label: "ZIP" }
  ],
  audio: [
    { value: "mp3", label: "MP3" },
    { value: "wav", label: "WAV" },
    { value: "aac", label: "AAC" }
  ]
};

export const STANDARD_RESOLUTIONS: SelectOption<number>[] = [
  { value: 480, label: "480p" },
  { value: 540, label: "540p" },
  { value: 720, label: "720p" },
  { value: 1080, label: "1080p" },
  { value: 1440, label: "2K" },
  { value: 2160, label: "4K" }
];

export const GIF_RESOLUTIONS: SelectOption<number>[] = [
  { value: 240, label: "240p" },
  { value: 320, label: "320p" },
  { value: 640, label: "640p" }
];

export const getResolutionOptions = (format: ExportFormat): SelectOption<number>[] =>
  format === "gif" ? GIF_RESOLUTIONS : STANDARD_RESOLUTIONS;

export const getDefaultResolution = (format: ExportFormat): number =>
  format === "gif" ? 240 : 720;

export const FRAME_RATE_OPTIONS: SelectOption<number>[] = [
  { value: 3, label: "3 fps" }, // testing only, remove later
  { value: 15, label: "15 fps" },
  { value: 24, label: "24 fps" },
  { value: 25, label: "25 fps" },
  { value: 30, label: "30 fps" },
  { value: 50, label: "50 fps" },
  { value: 60, label: "60 fps" }
];

export const DEFAULT_FRAME_RATE = 30;

// Fallback composition size, used only before the popover has synced
// the real size from the editor's composition store.
export const DEFAULT_COMPOSITION_WIDTH = 1920;
export const DEFAULT_COMPOSITION_HEIGHT = 1080;

export const VIDEO_BITRATE_RANGE_KBPS = { min: 1000, max: 96000 };
export const AUDIO_BITRATE_RANGE_KBPS = { min: 32, max: 320 };
export const DEFAULT_AUDIO_BITRATE_KBPS = 320;

// Rough bits-per-pixel constant used to estimate a sane default
// bitrate from resolution and frame rate. Higher = higher quality/size.
export const BITS_PER_PIXEL = 0.12;

/**
 * Snaps the composition's editing resolution (e.g. 1920x1080 or 1080x1920)
 * to an export resolution target, treating `resolution` as the shorter side
 * (matching how "720p", "1080p" etc. are conventionally named) and scaling
 * the other side to preserve the composition's aspect ratio.
 */
export const getSnappedExportDimensions = (
  compositionWidth: number,
  compositionHeight: number,
  resolution: number
): { width: number; height: number } => {
  if (compositionWidth <= 0 || compositionHeight <= 0) {
    return { width: resolution, height: resolution };
  }

  const isWidthShorter = compositionWidth <= compositionHeight;
  const shortSide = isWidthShorter ? compositionWidth : compositionHeight;
  const longSide = isWidthShorter ? compositionHeight : compositionWidth;

  const scale = resolution / shortSide;
  const newLongSide = Math.round(longSide * scale);

  return isWidthShorter
    ? { width: resolution, height: newLongSide }
    : { width: newLongSide, height: resolution };
};

/**
 * bitrate (bps) = width * height * fps * bits-per-pixel
 * bitrate (kbps) = bps / 1000, clamped to the video bitrate range.
 */
export const getDefaultVideoBitrateKbps = (
  compositionWidth: number,
  compositionHeight: number,
  resolution: number,
  fps: number
): number => {
  const { width, height } = getSnappedExportDimensions(
    compositionWidth,
    compositionHeight,
    resolution
  );

  const bitrateBps = width * height * fps * BITS_PER_PIXEL;
  const bitrateKbps = Math.round(bitrateBps / 1000);

  return Math.min(
    VIDEO_BITRATE_RANGE_KBPS.max,
    Math.max(VIDEO_BITRATE_RANGE_KBPS.min, bitrateKbps)
  );
};

export const DEFAULT_EXPORT_TYPE: ExportType = "video";
export const DEFAULT_EXPORT_FORMAT: ExportFormat = "mp4";
export const DEFAULT_RESOLUTION = 720;

export const GIF_MAXIMUM_DURATION_MS = 120 * 1000;