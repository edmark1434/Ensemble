import type { Gig } from "./gig_datasets";

export interface GigRankingBreakdown {
  totalScore: number;         // 0 to 100
  bayesianRating: number;     // 0 to 5.0
  bayesianScore: number;      // 0 to 1.0 (40% weight)
  freshnessScore: number;     // 0 to 1.0 (25% weight)
  completenessScore: number;  // 0 to 1.0 (20% weight)
  availabilityScore: number;  // 0 to 1.0 (15% weight)
  isRisingCreator: boolean;
  isNewListing: boolean;
}

const BAYESIAN_PRIOR_RATING = 4.2; // Neutral baseline for 0-review newcomers
const BAYESIAN_CONFIDENCE_WEIGHT = 3; // Number of prior virtual reviews
const FRESHNESS_WINDOW_DAYS = 14;

/**
 * Computes the Fair Discovery Ranking score for a Gig so high-effort new creators
 * can compete with established veterans while still rewarding proven ratings and open capacity.
 */
export function computeGigRankingBreakdown(gig: Gig): GigRankingBreakdown {
  const v = Math.max(0, Number(gig.ratingCount) || 0);
  const R = v > 0 ? Math.min(5, Math.max(0, Number(gig.clientRating) || 0)) : 0;

  // 1. Bayesian Rating (40% weight)
  // Smooths 0-review newcomers to 4.20 / 5.0 (0.84) instead of 0.00
  const bayesianRating =
    (v * R + BAYESIAN_CONFIDENCE_WEIGHT * BAYESIAN_PRIOR_RATING) /
    (v + BAYESIAN_CONFIDENCE_WEIGHT);
  const bayesianScore = Math.min(1, Math.max(0, bayesianRating / 5));

  // 2. Newcomer & Freshness Boost (25% weight)
  // 14-day linear decay from postedAt; full 1.0x multiplier if < 3 orders, 0.6x otherwise
  let ageInDays = 30;
  if (gig.postedAt) {
    const postedTime = new Date(gig.postedAt).getTime();
    if (!Number.isNaN(postedTime)) {
      ageInDays = Math.max(0, (Date.now() - postedTime) / (1000 * 60 * 60 * 24));
    }
  }
  const rawFreshness = Math.max(0, 1 - ageInDays / FRESHNESS_WINDOW_DAYS);
  const ordersCount = Math.max(0, Number(gig.ordersCount) || 0);
  const newcomerMultiplier = ordersCount < 3 ? 1.0 : 0.6;
  const freshnessScore = rawFreshness * newcomerMultiplier;

  // 3. Listing Completeness & Effort Score (20% weight)
  // Rewards day-1 effort controlled by the creator:
  // - 3 Pricing Tiers (+25%)
  // - Gallery media >= 3 items (+25%)
  // - Milestones >= 2 phases (+20%)
  // - Detailed description (>= 120 chars) + Terms of Service (+15%)
  // - Skills tags >= 3 (+15%)
  let completeness = 0;
  const tierCount = Array.isArray(gig.tiers) ? gig.tiers.length : 0;
  if (tierCount >= 3) completeness += 0.25;
  else if (tierCount === 2) completeness += 0.18;
  else if (tierCount === 1) completeness += 0.08;

  const galleryItems = Array.isArray(gig.gallery) ? gig.gallery.filter(Boolean) : [];
  const uniqueMedia = new Set(galleryItems);
  if (gig.thumbnail) uniqueMedia.add(gig.thumbnail);
  const galleryCount = uniqueMedia.size;
  if (galleryCount >= 3) completeness += 0.25;
  else if (galleryCount === 2) completeness += 0.15;
  else if (galleryCount === 1) completeness += 0.08;

  const milestoneCount = Array.isArray(gig.milestones) ? gig.milestones.length : 0;
  if (milestoneCount >= 3) completeness += 0.20;
  else if (milestoneCount === 2) completeness += 0.15;
  else if (milestoneCount === 1) completeness += 0.08;

  const descLength = (gig.description || "").trim().length;
  const hasTos = Boolean((gig.termsOfService || "").trim().length > 20);
  if (descLength >= 120 && hasTos) completeness += 0.15;
  else if (descLength >= 80 || hasTos) completeness += 0.08;

  const skillsCount = Array.isArray(gig.skills) ? gig.skills.length : 0;
  if (skillsCount >= 3) completeness += 0.15;
  else if (skillsCount >= 1) completeness += 0.08;

  const completenessScore = Math.min(1, completeness);

  // 4. Queue & Slot Availability Factor (15% weight)
  // Penalizes overloaded sellers whose active/pending orders approach their max concurrent slots
  const maxSlots = Math.max(1, Number(gig.slots) || 1);
  const pendingOrders = Math.max(0, Number(gig.pendingOrdersCount) || 0);
  const availabilityScore = Math.max(0, Math.min(1, 1 - pendingOrders / maxSlots));

  const composite =
    0.40 * bayesianScore +
    0.25 * freshnessScore +
    0.20 * completenessScore +
    0.15 * availabilityScore;

  const totalScore = Math.round(composite * 1000) / 10; // 0.0 to 100.0

  const isRisingCreator =
    ordersCount < 3 &&
    v === 0 &&
    completenessScore >= 0.85 &&
    ageInDays <= 7;

  const isNewListing = ageInDays <= 7 && v === 0;

  return {
    totalScore,
    bayesianRating: Math.round(bayesianRating * 100) / 100,
    bayesianScore,
    freshnessScore,
    completenessScore,
    availabilityScore,
    isRisingCreator,
    isNewListing,
  };
}
