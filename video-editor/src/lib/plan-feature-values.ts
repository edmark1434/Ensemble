export class PlanConfigurationError extends Error {
  constructor() { super("Your plan limits are unavailable. Please try again later."); }
}

export function parseExportResolution(value: string | undefined): number {
  const normalized = value?.trim().toLowerCase();
  const kResolutions: Record<string, number> = { "2k": 1440, "4k": 2160, "8k": 4320 };
  const match = normalized?.match(/^(\d+)\s*p?$/);
  const resolution = normalized && Object.prototype.hasOwnProperty.call(kResolutions, normalized)
    ? kResolutions[normalized] : match ? Number(match[1]) : NaN;
  if (!Number.isSafeInteger(resolution) || resolution < 2) throw new PlanConfigurationError();
  return resolution;
}

export function parseExportFrameRate(value: string | undefined): number {
  const match = value?.trim().match(/^(\d+(?:\.\d+)?)\s*(?:fps)?$/i);
  const fps = match ? Number(match[1]) : NaN;
  if (!Number.isFinite(fps) || fps <= 0) throw new PlanConfigurationError();
  return fps;
}

export function parseStorageLimitBytes(value: string | undefined): number {
  const match = value?.trim().match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)$/i);
  if (!match) throw new PlanConfigurationError();
  const powers: Record<string, number> = { B: 0, KB: 1, MB: 2, GB: 3, TB: 4 };
  // Keep the existing binary storage accounting (1 GB = 1024^3 bytes).
  const bytes = Number(match[1]) * 1024 ** powers[match[2].toUpperCase()];
  if (!Number.isFinite(bytes) || bytes < 0 || bytes > Number.MAX_SAFE_INTEGER) throw new PlanConfigurationError();
  return Math.floor(bytes);
}
