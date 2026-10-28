const DURATION_DAYS = [3, 5, 7, 10, 14, 21, 30, 45, 60, 90] as const;
const MERIT_PER_POINT = 2;
export const MIN_WARNING_POINTS = 1;
export const MAX_WARNING_POINTS = 10;

export function clampWarningPoints(points: number) {
  const n = Math.round(Number(points));
  if (!Number.isFinite(n)) return MIN_WARNING_POINTS;
  return Math.max(MIN_WARNING_POINTS, Math.min(MAX_WARNING_POINTS, n));
}

export function warningDurationDays(points: number) {
  return DURATION_DAYS[clampWarningPoints(points) - 1];
}

export function warningMeritHit(points: number) {
  return clampWarningPoints(points) * MERIT_PER_POINT;
}

export const WARNING_POINT_LADDER = Array.from({ length: MAX_WARNING_POINTS }, (_, index) => {
  const points = index + 1;
  return {
    points,
    meritHit: warningMeritHit(points),
    durationDays: warningDurationDays(points),
  };
});

export function warningLadderSummary(points: number) {
  const pts = clampWarningPoints(points);
  const days = warningDurationDays(pts);
  const merit = warningMeritHit(pts);
  const band =
    pts <= 2 ? 'usually stays Established' :
    pts <= 6 ? 'typically Watch (minor limits)' :
    pts <= 9 ? 'typically Restricted (forums and new listings locked)' :
    'can reach Frozen if they already have other warnings';
  return `${pts} pt · −${merit} merit · ${days} days · ${band}. Warnings always expire.`;
}
