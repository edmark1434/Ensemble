import type { Gig } from "./gig_datasets";

export type SubscriptionPlanName = "Free" | "Premium" | "Business";

export const normalizeSubscriptionPlan = (rawPlan?: string | null): SubscriptionPlanName => {
  const lower = String(rawPlan || "").trim().toLowerCase();
  if (lower === "business" || lower === "studio") return "Business";
  if (lower === "premium" || lower === "pro") return "Premium";
  return "Free";
};

export const resolveSubscriptionProfileVisibility = (
  plan: SubscriptionPlanName,
  rawVisibility?: number | null
): number => {
  if (typeof rawVisibility === "number" && !Number.isNaN(rawVisibility) && rawVisibility >= 1.0) {
    return Math.min(1.45, Math.max(1.0, rawVisibility));
  }
  if (plan === "Business") return 1.45;
  if (plan === "Premium") return 1.15;
  return 1.0;
};

export interface GigRankingBreakdown {
  totalScore: number; // 0 .. 100
  bayesianRating: number; // 0 .. 5
  bayesianScore: number; // 0 .. 1 (Creator Trust & Account Standing — 35 pts max)
  freshnessScore: number; // 0 .. 1 (Freshness, Saves & Turnaround — 25 pts max)
  completenessScore: number; // 0 .. 1 (Service Package & Media Quality — 25 pts max)
  availabilityScore: number; // 0 .. 1 (Open Queue & Slot Capacity — 15 pts max)
  contentPoints: number; // 0 .. 25
  accountBasePoints: number; // 0 .. 35
  marketPoints: number; // 0 .. 40 (Freshness 25 + Open Slots 15)
  freelancerMerit: number; // 0 .. 100
  savesBoost: number; // 0 .. 1
  fastDeliverySignal: number; // 0 .. 1
  skillMatchBonus: number; // 0 .. 2.0
  subscriptionPlan: SubscriptionPlanName;
  profileVisibility: number; // 1.0 | 1.15 | 1.45
  subscriptionBoost: number; // 0 | 3 | 9
  isRisingCreator: boolean;
  isNewListing: boolean;
  serviceTypeLabel: string;
}

const stripHtmlText = (raw?: string): string => {
  if (!raw) return "";
  return raw
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const isPresetDefaultThumbnail = (thumbnail?: string): boolean => {
  if (!thumbnail) return true;
  const trimmed = thumbnail.trim();
  if (!trimmed) return true;
  if (trimmed.includes("images.unsplash.com/photo-1550751827-4bd374c3f58b")) return true;
  if (trimmed.startsWith("/gig_banners/") || trimmed.includes("/gig_banners/")) return true;
  if (trimmed.includes("placeholder-gig")) return true;
  return false;
};

/**
 * Computes a fair, multi-factor discovery ranking score (0–100) for a Gig / Service
 * aligned with the 3-pillar Job Post Algorithm:
 *  1. Creator Trust & Account Standing (35%) — Bayesian Rating (22.75), Platform Merit (7.70), Order Reliability (4.55) + Subscription Boost (+0..9)
 *  2. Freshness & Market Signals (25%)       — 14-Day Newcomer & Listing Freshness (19.50), Buyer Saves (3.75), Fast Turnaround & Add-ons (1.75)
 *  3. Service Package & Media Quality (25%)  — Title & Scope (7.50), 3-Tier Pricing (6.25), Custom Visuals & Gallery (5.00), Skills (3.75), Milestones & TOS (2.50)
 *  4. Open Queue & Slot Availability (15%)   — Available Concurrent Order Slots (15.00)
 */
export function computeGigRankingBreakdown(
  gig: Gig,
  viewerSkills?: string[]
): GigRankingBreakdown {
  // --- 1. Creator Trust & Account Standing (35 pts max) ---
  // Bayesian Rating (65% of 35 = 22.75 pts): C = 3 virtual reviews at m = 4.2 stars
  const v = Math.max(0, Number(gig.ratingCount) || 0);
  const R = Math.max(0, Math.min(5, Number(gig.clientRating) || 0));
  const C = 3;
  const m = 4.2;
  const bayesianRating = (v * R + C * m) / (v + C);
  const ratingNorm = Math.max(0, Math.min(1, bayesianRating / 5.0));

  // Platform Merit (22% of 35 = 7.70 pts): 0..100 scale, defaults to 100
  const rawMerit = (gig as any).freelancerMerit ?? (gig as any).clientMerit;
  const freelancerMerit =
    typeof rawMerit === "number" && !Number.isNaN(rawMerit)
      ? Math.max(0, Math.min(100, rawMerit))
      : 100;
  const meritNorm = freelancerMerit / 100;

  // Order Fulfillment Reliability (13% of 35 = 4.55 pts)
  const ordersCount = Math.max(0, Number(gig.ordersCount) || 0);
  const rawCompletionRate = (gig as any).freelancerCompletionRate;
  const completionNorm =
    typeof rawCompletionRate === "number" && !Number.isNaN(rawCompletionRate)
      ? Math.max(0, Math.min(1, rawCompletionRate))
      : ordersCount > 0
      ? 1.0
      : 1.0; // Newcomers start at 100% baseline

  const bayesianScore = Math.max(
    0,
    Math.min(1, ratingNorm * 0.65 + meritNorm * 0.22 + completionNorm * 0.13)
  );

  // --- 2. Freshness & Market Momentum (25 pts max) ---
  const postedMs = gig.postedAt ? new Date(gig.postedAt).getTime() : Date.now();
  const ageDays = Math.max(0, (Date.now() - postedMs) / (1000 * 60 * 60 * 24));
  const isNewListing = ageDays <= 7;

  // 14-day freshness decay (78% of 25 = 19.50 pts)
  let baseDecay = Math.max(0.15, 1 - (ageDays / 14) * 0.85);
  const newcomerMultiplier = ordersCount < 3 && ageDays <= 14 ? 1.25 : 1.0;
  const windowFreshness = Math.min(1, baseDecay * newcomerMultiplier);

  // Community Saves from Buyers (15% of 25 = 3.75 pts)
  const rawSaves = Math.max(0, Number(gig.savesCount) || 0);
  const effectiveSaves = gig.isOwnGig && gig.isSaved ? Math.max(0, rawSaves - 1) : rawSaves;
  const savesBoost = Math.min(1, Math.log2(effectiveSaves + 1) / Math.log2(6));

  // Fast Turnaround & Add-ons Signal (7% of 25 = 1.75 pts)
  const tiers = Array.isArray(gig.tiers) ? gig.tiers : [];
  const minDeliveryDays =
    tiers.length > 0
      ? Math.min(...tiers.map((t) => Math.max(1, Number(t.daysOfDelivery) || 7)))
      : 3;
  const addOnsCount = Array.isArray(gig.addOns) ? gig.addOns.length : 0;
  const fastDeliverySignal =
    minDeliveryDays <= 3 && addOnsCount > 0
      ? 1.0
      : minDeliveryDays <= 3 || addOnsCount > 0
      ? 0.75
      : 0.35;

  const freshnessScore = Math.max(
    0,
    Math.min(1, windowFreshness * 0.78 + savesBoost * 0.15 + fastDeliverySignal * 0.07)
  );

  // --- 3. Service Package & Media Completeness (25 pts max) ---
  let completeness = 0;

  // Factor #01: Proper Title (10%) & Plain-Text Scope (20%) = 30% (7.50 pts)
  const cleanTitle = (gig.title || "").trim();
  const titleWords = cleanTitle.split(/\s+/).filter(Boolean).length;
  const uniqueChars = new Set(cleanTitle.toLowerCase().replace(/\s+/g, "")).size;
  if (cleanTitle.length >= 15 && cleanTitle.length <= 120 && titleWords >= 3 && uniqueChars >= 5) {
    completeness += 0.1;
  } else if (cleanTitle.length >= 10 && titleWords >= 2) {
    completeness += 0.05;
  }

  const plainDesc = stripHtmlText(gig.description);
  if (plainDesc.length >= 120) {
    completeness += 0.2;
  } else if (plainDesc.length >= 60) {
    completeness += 0.1;
  }

  // Factor #02: Package Tier Structure & Pricing Realism = 25% (6.25 pts)
  const validTierPrices = tiers.every((t) => Number(t.price) >= 15);
  if (tiers.length >= 3 && validTierPrices) {
    completeness += 0.25;
  } else if (tiers.length === 2 && validTierPrices) {
    completeness += 0.17;
  } else if (tiers.length >= 1) {
    completeness += 0.1;
  }

  // Factor #03: Custom Thumbnail & Gallery Samples = 20% (5.00 pts)
  const hasCustomThumb = !isPresetDefaultThumbnail(gig.thumbnail);
  const galleryCount = Array.isArray(gig.gallery) ? gig.gallery.filter(Boolean).length : 0;
  if (hasCustomThumb && galleryCount >= 3) {
    completeness += 0.2;
  } else if (hasCustomThumb || galleryCount >= 3) {
    completeness += 0.15;
  } else if (galleryCount >= 1 || Boolean(gig.thumbnail)) {
    completeness += 0.08;
  }

  // Factor #04: Skill Tag Specificity = 15% (3.75 pts)
  const skillsCount = Array.isArray(gig.skills) ? gig.skills.length : 0;
  if (skillsCount >= 3) {
    completeness += 0.15;
  } else if (skillsCount >= 1) {
    completeness += 0.08;
  }

  // Factor #05: Project Milestones & Terms of Service = 10% (2.50 pts)
  const milestonesCount = Array.isArray(gig.milestones) ? gig.milestones.length : 0;
  const hasTos = Boolean(gig.termsOfService && gig.termsOfService.trim().length > 20);
  if (milestonesCount >= 2 && hasTos) {
    completeness += 0.1;
  } else if (milestonesCount >= 1 || hasTos) {
    completeness += 0.05;
  }

  const completenessScore = Math.min(1, completeness);

  // Personalized Skill Match Bonus (+0..2.0 pts)
  let skillMatchBonus = 0;
  if (Array.isArray(viewerSkills) && viewerSkills.length > 0 && Array.isArray(gig.skills) && gig.skills.length > 0) {
    const viewerSet = new Set(viewerSkills.map((s) => s.toLowerCase().trim()));
    const matched = gig.skills.filter((s) => viewerSet.has(s.toLowerCase().trim())).length;
    skillMatchBonus = Math.min(2.0, matched * 0.75);
  }

  // --- 4. Open Queue & Slot Availability (15 pts max) ---
  const maxSlots = Math.max(1, Number(gig.slots) || 1);
  const activeOrPending = Math.max(
    0,
    Number((gig as any).active_orders_count ?? gig.pendingOrdersCount) || 0
  );
  const isClosedOrPaused =
    gig.status?.toLowerCase() === "closed" || gig.status?.toLowerCase() === "paused";
  const availabilityScore = isClosedOrPaused
    ? 0
    : Math.max(0, Math.min(1, 1 - activeOrPending / maxSlots));

  // --- 5. Subscription Profile Visibility Boost (+0 / +3 / +9 pts) ---
  const subscriptionPlan = normalizeSubscriptionPlan(gig.freelancerSubscriptionPlan);
  const profileVisibility = resolveSubscriptionProfileVisibility(
    subscriptionPlan,
    (gig as any).freelancerProfileVisibility
  );
  const subscriptionBoost = Math.max(0, (profileVisibility - 1.0) * 20);

  const contentPoints = completenessScore * 25;
  const accountBasePoints = bayesianScore * 35;
  const marketPoints = freshnessScore * 25 + availabilityScore * 15;

  const rawTotal =
    accountBasePoints +
    freshnessScore * 25 +
    contentPoints +
    availabilityScore * 15 +
    subscriptionBoost +
    skillMatchBonus;

  const totalScore = Math.max(0, Math.min(100, rawTotal));

  // Rising Creator Badge: < 5 completed orders, completeness >= 75%, and open slots
  const isRisingCreator =
    ordersCount < 5 && completenessScore >= 0.75 && availabilityScore > 0;

  const isTeamService = Boolean(gig.isTeam || gig.is_team || gig.teamId || gig.team_id);
  const serviceTypeLabel = isTeamService
    ? "Team / Studio Service"
    : tiers.length >= 3
    ? "3-Tier Service Package"
    : "Solo Service Offering";

  return {
    totalScore,
    bayesianRating,
    bayesianScore,
    freshnessScore,
    completenessScore,
    availabilityScore,
    contentPoints,
    accountBasePoints,
    marketPoints,
    freelancerMerit,
    savesBoost,
    fastDeliverySignal,
    skillMatchBonus,
    subscriptionPlan,
    profileVisibility,
    subscriptionBoost,
    isRisingCreator,
    isNewListing,
    serviceTypeLabel,
  };
}

export function computeGigRankingScore(gig: Gig, viewerSkills?: string[]): number {
  return computeGigRankingBreakdown(gig, viewerSkills).totalScore;
}

/**
 * Generates a Score-Weighted Random Discovery Key (0–100) for a Gig on feed load/refresh,
 * matching the Job Market weighted discovery roll.
 */
export function computeWeightedGigDiscoveryOrderKey(
  gig: Gig,
  viewerSkills?: string[]
): number {
  const breakdown = computeGigRankingBreakdown(gig, viewerSkills);
  const u1 = Math.random();
  const u2 = Math.random();
  const centeredNoise = ((u1 + u2) / 2 - 0.5) * 28; // -14 to +14 pts bell-shaped jitter
  const ordersCount = Math.max(0, Number(gig.ordersCount) || 0);
  const zeroOrderBoost = ordersCount === 0 ? 3.5 : 0;
  return Math.max(0, Math.min(100, breakdown.totalScore + zeroOrderBoost + centeredNoise));
}
