export const DEFAULT_MERIT = 100;

const ACTIVE_WARNING_STATUSES = new Set(["active", "open", "pending"]);
const INACTIVE_WARNING_STATUSES = new Set(["expired", "rescinded", "pardoned", "reversed", "deleted"]);

export type MeritWarning = {
  points?: number | null;
  status?: string | null;
  expiresAt?: string | null;
};

export function isActiveWarning(warning?: MeritWarning | null): boolean {
  if (!warning) return false;
  const status = String(warning.status || "active").trim().toLowerCase();
  if (INACTIVE_WARNING_STATUSES.has(status)) return false;
  if (!ACTIVE_WARNING_STATUSES.has(status)) return false;
  if (!warning.expiresAt) return true;
  const ends = Date.parse(warning.expiresAt);
  return Number.isFinite(ends) && ends > Date.now();
}

export function meritFromWarningPoints(points: number | null | undefined): number {
  const n = Math.max(0, Math.round(Number(points) || 0));
  if (!Number.isFinite(n)) return DEFAULT_MERIT;
  return Math.max(0, Math.min(DEFAULT_MERIT, DEFAULT_MERIT - n));
}

export function meritFromWarnings(warnings: MeritWarning[] | null | undefined): number {
  const points = (warnings || []).reduce((sum, warning) => {
    if (!isActiveWarning(warning)) return sum;
    return sum + Math.max(0, Number(warning.points) || 0);
  }, 0);
  return meritFromWarningPoints(points);
}

export function meritBandLabel(merit: number): string {
  if (merit >= 100) return "Trusted";
  if (merit >= 98) return "Record";
  if (merit >= 93) return "Limited";
  if (merit >= 85) return "Restricted";
  return "Frozen";
}

export function meritColor(merit: number): string {
  const clamped = Math.max(0, Math.min(100, merit));
  if (clamped <= 50) {
    const hue = (clamped / 50) * 40;
    return `hsl(${hue}, 92%, 48%)`;
  }
  const hue = 40 + ((clamped - 50) / 50) * (142 - 40);
  return `hsl(${hue}, 82%, 42%)`;
}
