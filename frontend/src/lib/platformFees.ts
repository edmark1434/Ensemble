import api from '@/lib/axios';

export type PlatformPostingFees = {
  jobPostFeeCredits: number;
  gigCreateFeeCredits: number;
  listingFeeCredits: number;
};

const DEFAULT_FEES: PlatformPostingFees = {
  jobPostFeeCredits: 50,
  gigCreateFeeCredits: 50,
  listingFeeCredits: 0,
};

let cached: PlatformPostingFees | null = null;
let inflight: Promise<PlatformPostingFees> | null = null;

function normalize(raw: Partial<PlatformPostingFees> | null | undefined): PlatformPostingFees {
  const job = Number(raw?.jobPostFeeCredits);
  const gig = Number(raw?.gigCreateFeeCredits);
  const listing = Number(raw?.listingFeeCredits);
  return {
    jobPostFeeCredits: Number.isFinite(job) && job >= 0 ? Math.round(job) : DEFAULT_FEES.jobPostFeeCredits,
    gigCreateFeeCredits: Number.isFinite(gig) && gig >= 0 ? Math.round(gig) : DEFAULT_FEES.gigCreateFeeCredits,
    listingFeeCredits: Number.isFinite(listing) && listing >= 0 ? Math.round(listing) : DEFAULT_FEES.listingFeeCredits,
  };
}

/** Cached public posting/listing fees from System Settings → Economy. */
export async function getPlatformPostingFees(force = false): Promise<PlatformPostingFees> {
  if (!force && cached) return cached;
  if (!force && inflight) return inflight;

  inflight = api
    .get('/api/configuration/public')
    .then((res) => {
      const cfg = res.data?.configuration || {};
      cached = normalize({
        jobPostFeeCredits: cfg.feeSettings?.jobPostFeeCredits,
        gigCreateFeeCredits: cfg.feeSettings?.gigCreateFeeCredits,
        listingFeeCredits: cfg.marketplaceSettings?.listingFeeCredits,
      });
      return cached;
    })
    .catch(() => {
      cached = { ...DEFAULT_FEES };
      return cached;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function peekPlatformPostingFees(): PlatformPostingFees {
  return cached || { ...DEFAULT_FEES };
}
