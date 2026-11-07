import type { Job } from "./job_components/job_lists";
import { DEFAULT_JOB_BANNERS } from "@/lib/defaultJobBanners";

export type JobRankingType = "open_bid" | "budget_range";

export interface JobRankingBreakdown {
  totalScore: number;         // 0 to 100
  jobType: JobRankingType;
  jobTypeLabel: string;
  bayesianRating: number;     // 0 to 5.0
  bayesianScore: number;      // 0 to 1.0 (35% weight: Bayesian stars + Client Merit + Hire Rate)
  freshnessScore: number;     // 0 to 1.0 (25% weight: 14-day freshness + Saves + Window urgency)
  completenessScore: number;  // 0 to 1.0 (25% weight: Proper Title & Scope + Budget + Custom Thumbnail + Skills + Terms)
  availabilityScore: number;  // 0 to 1.0 (15% weight: Low-proposal congestion per open seat)
  clientMerit: number;        // 0 to 100 (Platform Merit standing)
  hasCustomVisual: boolean;   // True custom thumbnail or brief attachments (excludes preset banners)
  hasProperTitle: boolean;    // 15-100 chars & 3+ words
  plainScopeLength: number;   // Plain-text character count of description
  proposalsPerSeat: number;   // Congestion ratio: proposals / openSeats
  savesBoost: number;         // 0 to 1.0 community bookmark signal
  subscriptionPlan: "Free" | "Premium" | "Business" | string;
  profileVisibility: number;  // 0, 30, or 90
  subscriptionBoost: number;  // Direct score boost points (+0.0, +3.0, +9.0)
  isRisingJob: boolean;
  isNewJob: boolean;
  // 3 Score Origins:
  contentPoints: number;      // 0 to 25.0 pts (Job Post Content - Editable Anytime)
  accountBasePoints: number;  // 0 to 35.0 pts (Poster Account Standing Base)
  marketPoints: number;       // 0 to 40.0 pts (Live Market Signals)
}

const BAYESIAN_PRIOR_RATING = 4.2; // Fair baseline for first-time clients with 0 reviews
const BAYESIAN_CONFIDENCE_WEIGHT = 3; // Virtual prior reviews weight
const FALLBACK_WINDOW_HOURS = 7 * 24; // 7-day fallback only when applicationDeadline is absent
const DEFAULT_BANNER_PATHS = DEFAULT_JOB_BANNERS.map((b) => b.url.toLowerCase());

export function detectJobRankingType(job: Job): JobRankingType {
  const maxBudget = Number(job.maxBudget) || 0;
  const minBudget = Number(job.minBudget) || 0;
  if (maxBudget > 0 && maxBudget >= minBudget) {
    return "budget_range";
  }
  return "open_bid";
}

export function getJobRankingTypeLabel(type: JobRankingType): string {
  switch (type) {
    case "budget_range":
      return "Budget Range";
    case "open_bid":
      return "Open Bid";
  }
}

/**
 * Strips HTML tags and normalizes whitespace so rich-text descriptions are
 * measured by actual written content rather than markup tags.
 */
export function extractPlainScopeText(raw?: string | null): string {
  if (!raw) return "";
  return String(raw)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Checks whether a job uses a genuine custom uploaded thumbnail or reference attachment,
 * excluding default preset banners (/job_banners/jb1.png, placeholder.svg, etc.).
 */
export function hasGenuineCustomVisual(job: Partial<Job>): boolean {
  if (Array.isArray(job.attachments) && job.attachments.length > 0) {
    return true;
  }
  const thumb = String(job.thumbnail || "").trim().toLowerCase();
  if (
    thumb.includes("placeholder") ||
    thumb.includes("/job_banners/") ||
    DEFAULT_BANNER_PATHS.some((preset) => thumb.endsWith(preset))
  ) {
    return false;
  }
  if (typeof job.hasCustomThumbnail === "boolean") {
    return job.hasCustomThumbnail;
  }
  if (!thumb) return false;
  return true;
}

/**
 * Evaluates title quality (proper length, 3+ words, not placeholder text).
 */
export function evaluateTitleQuality(rawTitle?: string | null): {
  score: number; // 0 to 1
  isProper: boolean;
} {
  const title = String(rawTitle || "").trim();
  if (!title || /^untitled\b/i.test(title)) {
    return { score: 0, isProper: false };
  }
  const words = title.split(/\s+/).filter((w) => w.length >= 2);
  const len = title.length;

  if (len >= 15 && len <= 100 && words.length >= 3) {
    return { score: 1.0, isProper: true };
  }
  if (len >= 8 && words.length >= 2) {
    return { score: 0.55, isProper: false };
  }
  return { score: 0.2, isProper: false };
}

/**
 * Computes the 100-Point Job Discovery Ranking Score across all 13 marketplace signals:
 *
 *   Pillar 1: Client Trust, Merit & Hire Reliability (35 pts)
 *     - Bayesian Star Rating (65% of pillar) — 0-review clients start at a fair 4.2/5.0 baseline.
 *     - Client Platform Merit (22% of pillar) — 100 minus active warning points.
 *     - Client Historical Hire Rate (13% of pillar) — rewards clients who actively hire.
 *
 *   Pillar 2: Dynamic Window Freshness, Saves & Urgency Spotlight (25 pts)
 *     - Dynamic Application Window Freshness (12h–14d intake curves, 78% of pillar).
 *     - Community Saves / Bookmarks from other users (15% of pillar, saturating at 5 saves).
 *     - Application Window Urgency / Last-Call Boost (7% of pillar when < 24h left & < 3 proposals/seat).
 *
 *   Pillar 3: Proper Title, Scope, Budget & Custom Visuals (25 pts)
 *     - Proper Title & Plain-Text Scope Description (30%: 10% title + 20% scope depth).
 *     - Budget Realism & Focused Spread (25%).
 *     - True Custom Thumbnail or Reference Attachments (20%).
 *     - Skill Tag Specificity (15%: 3+ tags).
 *     - Timeline, Workflow Terms, Screening Questions & Milestones (10%).
 *
 *   Pillar 4: Low-Proposal Congestion & Seat-Aware Open Capacity (15 pts)
 *     - Prioritizes jobs with fewer proposals per open seat (applicantsCount / openSeats).
 *
 *   13th Rule: Client Subscription Tier & Additional Profile Visibility Boost
 *     - Business Membership (+90 Profile Visibility) -> +9.0 pts direct discovery boost.
 *     - Premium Membership (+30 Profile Visibility)  -> +3.0 pts direct discovery boost.
 *     - Free Membership (0 Profile Visibility)       -> +0.0 pts (baseline).
 */
export function computeJobRankingBreakdown(
  job: Job,
  viewerSkills?: string[]
): JobRankingBreakdown {
  const jobType = detectJobRankingType(job);
  const jobTypeLabel = getJobRankingTypeLabel(jobType);

  // Open seats & congestion ratio (#1 Highest Impact Signal)
  const positionsNeeded = Math.max(1, Number(job.positionsNeeded) || 1);
  const hiredCount = Math.max(0, Number(job.hiredCount) || 0);
  const openSeats = Math.max(1, positionsNeeded - hiredCount);
  const applicantsCount = Math.max(0, Number(job.applicantsCount) || 0);
  const proposalsPerSeat = applicantsCount / openSeats;

  // ---------------------------------------------------------------------------
  // PILLAR 1: Client Trust, Platform Merit & Hire Rate (35% weight)
  // ---------------------------------------------------------------------------
  const v = Math.max(0, Number(job.ratingCount) || 0);
  const R = v > 0 ? Math.min(5, Math.max(0, Number(job.clientRating) || 0)) : 0;

  const bayesianRating =
    (v * R + BAYESIAN_CONFIDENCE_WEIGHT * BAYESIAN_PRIOR_RATING) /
    (v + BAYESIAN_CONFIDENCE_WEIGHT);
  const ratingNorm = Math.min(1, Math.max(0, bayesianRating / 5));

  // Client Platform Merit (0-100, defaults to 100 Trusted)
  const rawMerit =
    job.clientMerit !== undefined && job.clientMerit !== null
      ? Number(job.clientMerit)
      : 100;
  const clientMerit = Math.min(100, Math.max(0, Number.isFinite(rawMerit) ? rawMerit : 100));
  // Steep curve below 85 (Frozen/Restricted band) so warned accounts drop in priority
  const meritNorm =
    clientMerit >= 98
      ? 1.0
      : clientMerit >= 93
      ? 0.85
      : clientMerit >= 85
      ? 0.6
      : Math.max(0, (clientMerit / 85) * 0.4);

  // Client Hire Rate (0-100%, defaults to 100% for new clients)
  const rawHireRate =
    job.clientHireRate !== undefined && job.clientHireRate !== null
      ? Number(job.clientHireRate)
      : 100;
  const hireRateNorm = Math.min(
    1,
    Math.max(0.25, (Number.isFinite(rawHireRate) ? rawHireRate : 100) / 100)
  );

  const bayesianScore = Math.min(
    1,
    Math.max(0, 0.65 * ratingNorm + 0.22 * meritNorm + 0.13 * hireRateNorm)
  );

  // ---------------------------------------------------------------------------
  // PILLAR 4: Low-Proposal Priority & Seat-Aware Open Capacity (15% weight)
  // ---------------------------------------------------------------------------
  // 0 proposals = 1.00, 1-2 per seat = 0.92+, tapers smoothly to 0 at 10+ proposals/seat
  let availabilityScore = 0;
  if (hiredCount >= positionsNeeded && positionsNeeded > 0) {
    availabilityScore = 0;
  } else if (proposalsPerSeat === 0) {
    availabilityScore = 1.0;
  } else if (proposalsPerSeat <= 2) {
    availabilityScore = 1.0 - proposalsPerSeat * 0.04; // 0.92 - 0.96
  } else {
    availabilityScore = Math.max(0, Math.min(0.92, 1 - proposalsPerSeat / 10));
  }

  // ---------------------------------------------------------------------------
  // PILLAR 2: Dynamic Intake Window Freshness, Saves & Urgency (25% weight)
  // Adapts automatically to 12h, 24h, 3d, 7d, or 14d application windows!
  // ---------------------------------------------------------------------------
  const nowMs = Date.now();
  let ageInDays = 3;
  let postedTimeMs = nowMs;
  const rawDate = (job as any).createdAt || job.postedAt;
  if (rawDate) {
    const parsed = new Date(rawDate).getTime();
    if (!Number.isNaN(parsed)) {
      postedTimeMs = parsed;
      ageInDays = Math.max(0, (nowMs - postedTimeMs) / (1000 * 60 * 60 * 24));
    }
  }

  // Compute dynamic window duration & remaining ratio from applicationDeadline (12h, 24h, 3d, 7d, 14d)
  let windowFreshness = 0.75;
  let urgencyBoost = 0;
  let isWithinSpotlightWindow = ageInDays <= 7;

  if (job.applicationDeadline) {
    const deadlineMs = new Date(job.applicationDeadline).getTime();
    if (!Number.isNaN(deadlineMs)) {
      const totalWindowHours = Math.max(12, (deadlineMs - postedTimeMs) / (1000 * 60 * 60));
      const hoursLeft = (deadlineMs - nowMs) / (1000 * 60 * 60);
      const remainingRatio = Math.max(0, Math.min(1, hoursLeft / totalWindowHours));

      isWithinSpotlightWindow = remainingRatio >= 0.25 || ageInDays <= 3;

      if (hoursLeft <= 0) {
        // Application window expired
        windowFreshness = 0;
      } else if (remainingRatio >= 0.6) {
        // Launch phase (first 40% of its 12h/24h/3d/7d/14d window): 90% - 100% freshness
        windowFreshness = 0.9 + ((remainingRatio - 0.6) / 0.4) * 0.1;
      } else if (remainingRatio <= 0.25 && proposalsPerSeat < 3) {
        // Last-Call phase (final 25% of window & still needs proposals): rebounds to 92% - 100%
        windowFreshness = 0.92 + ((0.25 - remainingRatio) / 0.25) * 0.08;
        urgencyBoost = 1.0;
      } else {
        // Mid-window steady state: scales smoothly between 0.55 and 0.90
        windowFreshness = 0.55 + ((remainingRatio - 0.25) / 0.35) * 0.35;
      }

      if (hoursLeft > 0 && hoursLeft <= 24 && proposalsPerSeat < 3) {
        urgencyBoost = 1.0;
      } else if (hoursLeft > 24 && hoursLeft <= 72 && proposalsPerSeat === 0) {
        urgencyBoost = Math.max(urgencyBoost, 0.75);
      }
    }
  } else {
    // Fallback if applicationDeadline is not set on older/synthetic records
    const elapsedHours = ageInDays * 24;
    windowFreshness = Math.max(0, 1 - elapsedHours / FALLBACK_WINDOW_HOURS);
    if (job.isUrgent && proposalsPerSeat < 3) {
      urgencyBoost = 0.9;
    }
  }

  // Prioritize jobs with < 3 proposals per open seat
  const spotlightMultiplier =
    proposalsPerSeat === 0
      ? 1.0
      : proposalsPerSeat < 3
      ? 0.95
      : proposalsPerSeat < 6
      ? 0.75
      : 0.55;
  const baseFreshness = windowFreshness * spotlightMultiplier;

  // Community Saves from other users (saturates at 5 saves so old posts cannot coast forever)
  const savesCount = Math.max(0, Number(job.savesCount) || 0);
  const effectiveSaves = job.isOwnPost && job.isSaved ? Math.max(0, savesCount - 1) : savesCount;
  const savesBoost = Math.min(1, Math.log2(1 + effectiveSaves) / Math.log2(1 + 5));

  const freshnessScore = Math.min(
    1,
    0.78 * baseFreshness + 0.15 * savesBoost + 0.07 * Math.max(baseFreshness, urgencyBoost)
  );

  // ---------------------------------------------------------------------------
  // PILLAR 3: Proper Title, Scope, Budget, Custom Thumbnail & Terms (25% weight)
  // ---------------------------------------------------------------------------
  let completeness = 0;

  // 3A. Proper Title (10%) + Plain-Text Scope Description (20%) = 30%
  const titleEval = evaluateTitleQuality(job.title);
  completeness += 0.10 * titleEval.score;

  const plainScope = extractPlainScopeText(job.description);
  const descLength = plainScope.length;
  if (descLength >= 150) completeness += 0.20;
  else if (descLength >= 80) completeness += 0.13;
  else if (descLength >= 30) completeness += 0.06;

  // 3B. Budget Quality & Realism (25%)
  const minBudget = Number(job.minBudget) || 0;
  const maxBudget = Number(job.maxBudget) || 0;
  if (jobType === "budget_range") {
    const spreadRatio = minBudget > 0 ? maxBudget / minBudget : 1;
    if (minBudget >= 250 && maxBudget >= minBudget && spreadRatio <= 3.0) {
      completeness += 0.25;
    } else if (minBudget > 0 && maxBudget >= minBudget) {
      completeness += 0.16;
    }
  } else {
    if (minBudget >= 300) completeness += 0.25;
    else if (minBudget > 0) completeness += 0.16;
  }

  // 3C. True Custom Thumbnail or Reference Brief Attachments (20%)
  const hasCustomVisual = hasGenuineCustomVisual(job);
  if (hasCustomVisual) {
    completeness += 0.20;
  }

  // 3D. Skill Tags & Optional Viewer Skill Match (15%)
  const skillsCount = Array.isArray(job.skills) ? job.skills.length : 0;
  if (skillsCount >= 3) completeness += 0.15;
  else if (skillsCount >= 1) completeness += 0.08;

  // 3E. Delivery Timeline, Workflow Terms, Screening Questions & Milestones (10%)
  const hasTimeline = Boolean(
    (job.timeline && !job.timeline.startsWith("0-0")) || job.deadline
  );
  const hasWorkflowTerms = Boolean(
    job.portfolioUseAllowed ||
      job.requireNDA ||
      job.isExistingProject ||
      (Array.isArray(job.screeningQuestions) && job.screeningQuestions.length > 0) ||
      (Array.isArray(job.milestones) && job.milestones.length > 0)
  );
  if (hasTimeline && hasWorkflowTerms) completeness += 0.10;
  else if (hasTimeline || hasWorkflowTerms) completeness += 0.05;

  const completenessScore = Math.min(1, Math.round(completeness * 1000) / 1000);

  // Optional subtle viewer skill-match bonus (up to +2.0 pts capped at 100)
  let skillMatchBonus = 0;
  if (Array.isArray(viewerSkills) && viewerSkills.length > 0 && Array.isArray(job.skills)) {
    const normViewer = viewerSkills.map((s) => s.toLowerCase().trim()).filter(Boolean);
    const normJob = job.skills.map((s) => s.toLowerCase().trim()).filter(Boolean);
    const hasMatch = normViewer.some((vs) =>
      normJob.some((js) => js === vs || js.includes(vs) || vs.includes(js))
    );
    if (hasMatch) skillMatchBonus = 0.02;
  }

  // ---------------------------------------------------------------------------
  // 13TH RULE: Client Subscription Tier & Additional Profile Visibility
  // Business (+90 visibility): +9.0 pts direct discovery boost
  // Premium (+30 visibility):  +3.0 pts direct discovery boost
  // Free (+0 visibility):      +0.0 pts (baseline)
  // ---------------------------------------------------------------------------
  const rawPlan = String(job.clientSubscriptionPlan || "").trim().toLowerCase();
  let profileVisibility = Number(job.clientProfileVisibility);
  if (!Number.isFinite(profileVisibility) || profileVisibility < 0) {
    if (rawPlan === "business") profileVisibility = 90;
    else if (rawPlan === "premium") profileVisibility = 30;
    else profileVisibility = 0;
  } else if (profileVisibility === 0) {
    if (rawPlan === "business") profileVisibility = 90;
    else if (rawPlan === "premium") profileVisibility = 30;
  }

  const subscriptionPlan =
    rawPlan === "business" || profileVisibility >= 90
      ? "Business"
      : rawPlan === "premium" || profileVisibility >= 30
      ? "Premium"
      : "Free";

  const subscriptionBoost = Math.round((profileVisibility / 10) * 10) / 10;

  const composite = Math.min(
    1,
    0.35 * bayesianScore +
      0.25 * freshnessScore +
      0.25 * completenessScore +
      0.15 * availabilityScore +
      skillMatchBonus
  );

  const baseScore = Math.round(composite * 1000) / 10; // 0.0 to 100.0
  const totalScore = Math.min(100, Math.round((baseScore + subscriptionBoost) * 10) / 10);

  // Rising badge unlocks for high-effort active jobs with low proposals per seat
  const isRisingJob =
    proposalsPerSeat < 3 &&
    v === 0 &&
    clientMerit >= 95 &&
    completenessScore >= 0.85 &&
    isWithinSpotlightWindow;

  const isNewJob = isWithinSpotlightWindow && v === 0;

  const contentPoints = Math.round(completenessScore * 25 * 10) / 10;
  const accountBasePoints = Math.round(bayesianScore * 35 * 10) / 10;
  const marketPoints = Math.round((0.25 * freshnessScore + 0.15 * availabilityScore) * 100 * 10) / 10;

  return {
    totalScore,
    jobType,
    jobTypeLabel,
    bayesianRating: Math.round(bayesianRating * 100) / 100,
    bayesianScore,
    freshnessScore,
    completenessScore,
    availabilityScore,
    clientMerit,
    hasCustomVisual,
    hasProperTitle: titleEval.isProper,
    plainScopeLength: descLength,
    proposalsPerSeat: Math.round(proposalsPerSeat * 10) / 10,
    savesBoost,
    subscriptionPlan,
    profileVisibility,
    subscriptionBoost,
    isRisingJob,
    isNewJob,
    contentPoints,
    accountBasePoints,
    marketPoints,
  };
}

/**
 * Generates a Score-Weighted Random Discovery Key for a job on feed load/refresh.
 *
 * Uses bounded score-band jitter so that:
 *   - Every page refresh rotates jobs within comparable score tiers (keeping the feed fresh).
 *   - Higher-scored jobs (e.g. 85 pts) have a much higher probability of appearing above
 *     lower-scored jobs (e.g. 60 pts), while still giving mid/high-tier jobs a fair shot at row 1.
 *   - Jobs with 0 proposals per seat get a slight extra discovery lift.
 */
export function computeWeightedDiscoveryOrderKey(
  job: Job,
  viewerSkills?: string[]
): number {
  const breakdown = computeJobRankingBreakdown(job, viewerSkills);
  // Power-weighted Efraimidis-Spirakis sampling + score anchor:
  // Jitter band of ±14 points weighted by a beta-like distribution (two uniform draws averaged)
  const u1 = Math.random();
  const u2 = Math.random();
  const centeredNoise = ((u1 + u2) / 2 - 0.5) * 28; // -14 to +14 pts bell-shaped jitter
  const zeroProposalBoost = breakdown.proposalsPerSeat === 0 ? 3.5 : 0;
  return Math.max(0, Math.min(100, breakdown.totalScore + zeroProposalBoost + centeredNoise));
}
