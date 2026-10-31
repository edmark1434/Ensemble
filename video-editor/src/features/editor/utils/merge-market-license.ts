import type { MarketLicenseStatus } from "../store/use-market-licenses";

// Keep the player's URL stable across background checks. Only renew close to
// expiry, or when the underlying file changes; never retain revoked grants.
export function mergeMarketLicense(previous: MarketLicenseStatus | undefined, next: MarketLicenseStatus, now = Date.now()): MarketLicenseStatus {
  if (!next.licensed) return { ...next, playbackSources: {} };
  const sources = { ...next.playbackSources };
  for (const [id, old] of Object.entries(previous?.playbackSources ?? {})) {
    const fresh = sources[id];
    if (fresh && old.expiresAt > now + 60_000 && new URL(old.url).origin + new URL(old.url).pathname === new URL(fresh.url).origin + new URL(fresh.url).pathname) {
      sources[id] = old;
    }
  }
  return { ...next, playbackSources: sources };
}
