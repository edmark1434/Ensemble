const DURATION_DAYS = [3, 5, 7, 10, 14, 21, 30, 45, 60, 90] as const;
export const MIN_WARNING_POINTS = 1;
export const MAX_WARNING_POINTS = 10;
export const MIN_DURATION_DAYS = 1;
export const MAX_DURATION_DAYS = 365;
export const DURATION_OPTIONS = [1, 3, 5, 7, 10, 14, 21, 30, 45, 60, 90, 180, 365] as const;

export function clampWarningPoints(points: number) {
  const n = Math.round(Number(points));
  if (!Number.isFinite(n)) return MIN_WARNING_POINTS;
  return Math.max(MIN_WARNING_POINTS, Math.min(MAX_WARNING_POINTS, n));
}

export function clampDurationDays(days: number, fallback = 14) {
  const n = Math.round(Number(days));
  if (!Number.isFinite(n) || n < MIN_DURATION_DAYS) {
    const fb = Math.round(Number(fallback));
    return Number.isFinite(fb) && fb >= MIN_DURATION_DAYS
      ? Math.min(MAX_DURATION_DAYS, fb)
      : 14;
  }
  return Math.max(MIN_DURATION_DAYS, Math.min(MAX_DURATION_DAYS, n));
}

export function warningDurationDays(points: number) {
  return DURATION_DAYS[clampWarningPoints(points) - 1];
}

export function warningBandForPoints(points: number) {
  const n = Math.max(0, Number(points) || 0);
  if (n <= 0) return 'Clear';
  if (n <= 2) return 'Record only';
  if (n <= 7) return 'Limited';
  if (n <= 15) return 'Restricted';
  return 'Frozen access';
}

export const WARNING_POINT_LADDER = Array.from({ length: MAX_WARNING_POINTS }, (_, index) => {
  const points = index + 1;
  return {
    points,
    durationDays: warningDurationDays(points),
  };
});

export function warningLadderSummary(points: number, durationDays?: number) {
  const pts = clampWarningPoints(points);
  const days = clampDurationDays(
    durationDays == null ? warningDurationDays(pts) : durationDays,
    warningDurationDays(pts)
  );
  return `${pts} pt · lasts ${days} day${days === 1 ? '' : 's'}. Staff cannot change the clock.`;
}
