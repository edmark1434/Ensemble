export const getSpeedRange = (): { min: number; max: number } => {
  if (typeof navigator === "undefined") return { min: 0.25, max: 4 }; // SSR-safe default

  const ua = navigator.userAgent;
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);

  return isSafari ? { min: 0.25, max: 4 } : { min: 0.125, max: 16 };
};