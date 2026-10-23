import type { Job } from "./job_components/job_lists";

export type JobRankingType = "open_bid" | "budget_range";

export interface JobRankingBreakdown {
  totalScore: number;         // 0 to 100
  jobType: JobRankingType;
  jobTypeLabel: string;
  bayesianRating: number;     // 0 to 5.0
  bayesianScore: number;      // 0 to 1.0 (35% weight)
  freshnessScore: number;     // 0 to 1.0 (25% weight)
  completenessScore: number;  // 0 to 1.0 (25% weight)
  availabilityScore: number;  // 0 to 1.0 (15% weight)
  isRisingJob: boolean;
  isNewJob: boolean;
}

const BAYESIAN_PRIOR_RATING = 4.2; // Fair baseline for first-time clients with 0 reviews
const BAYESIAN_CONFIDENCE_WEIGHT = 3; // Virtual prior reviews weight
const FRESHNESS_WINDOW_DAYS = 14;

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
 * Computes the 100-Point Job Discovery Ranking Score.
 * 
 * In Ensemble's unified model, all job listings establish a dedicated project workspace 
 * contract (open to both Solo Freelancers and Teams). Milestone delivery roadmaps are 
 * proposed by applicants during bidding rather than prescribed by clients.
 * 
 * The algorithm grades 4 core pillars:
 *   1. Client Trust & Baseline (35%) — Bayesian smoothed client reputation; 0-review clients start at 4.2/5.0.
 *   2. 14-Day Freshness Spotlight (25%) — Priority visibility for newly published jobs, smoothly tapering after 14 days.
 *   3. Scope & Brief Quality (25%) — Detailed project scope, realistic budget benchmarks, 3+ skills, custom visual & terms.
 *   4. Open Capacity & Capacity Availability (15%) — Prevents proposal pile-ons and boosts uncongested listings.
 */
export function computeJobRankingBreakdown(job: Job): JobRankingBreakdown {
  const jobType = detectJobRankingType(job);
  const jobTypeLabel = getJobRankingTypeLabel(jobType);

  const v = Math.max(0, Number(job.ratingCount) || 0);
  const R = v > 0 ? Math.min(5, Math.max(0, Number(job.clientRating) || 0)) : 0;

  // 1. Client Trust & Fair Baseline (35% weight)
  // Smooths 0-review first-time clients to 4.20 / 5.0 (0.84 -> 29.4 / 35 pts)
  const bayesianRating =
    (v * R + BAYESIAN_CONFIDENCE_WEIGHT * BAYESIAN_PRIOR_RATING) /
    (v + BAYESIAN_CONFIDENCE_WEIGHT);
  const bayesianScore = Math.min(1, Math.max(0, bayesianRating / 5));

  // 2. Open Capacity & Proposal Availability (15% weight)
  // Evaluates proposal volume to boost listings that still need applicants (< 10 proposals)
  const applicantsCount = Math.max(0, Number(job.applicantsCount) || 0);
  const availabilityScore = Math.max(0, Math.min(1, 1 - applicantsCount / 12));

  // 3. New Job & First-Time Client Spotlight (25% weight)
  // 14-day linear decay from publication; full 1.0x multiplier if < 3 proposals
  let ageInDays = 30;
  const rawDate = (job as any).createdAt || job.postedAt;
  if (rawDate) {
    const postedTime = new Date(rawDate).getTime();
    if (!Number.isNaN(postedTime)) {
      ageInDays = Math.max(0, (Date.now() - postedTime) / (1000 * 60 * 60 * 24));
    }
  }
  const rawFreshness = Math.max(0, 1 - ageInDays / FRESHNESS_WINDOW_DAYS);
  const spotlightMultiplier = applicantsCount < 3 ? 1.0 : 0.65;
  const freshnessScore = rawFreshness * spotlightMultiplier;

  // 4. Brief Quality Score (25% weight)
  // Graded on scope clarity, realistic budget setting, tags, visuals, and workflow terms.
  // Note: Clients no longer define milestones; applicants provide milestone roadmaps on proposals.
  let completeness = 0;
  const descLength = (job.description || "").trim().length;
  const skillsCount = Array.isArray(job.skills) ? job.skills.length : 0;
  const hasCustomVisual =
    Boolean(job.thumbnail && !job.thumbnail.includes("placeholder")) ||
    (Array.isArray(job.attachments) && job.attachments.length > 0);
  const hasTimeline = Boolean(
    (job.timeline && !job.timeline.startsWith("0-0")) || job.deadline
  );
  const hasWorkflowTerms = Boolean(
    job.portfolioUseAllowed || job.requireNDA || job.isExistingProject
  );
  const minBudget = Number(job.minBudget) || 0;
  const maxBudget = Number(job.maxBudget) || 0;

  // Scope of Work description (30%)
  if (descLength >= 150) completeness += 0.30;
  else if (descLength >= 80) completeness += 0.18;
  else if (descLength > 0) completeness += 0.10;

  // Budget Quality & Realism (25%)
  if (jobType === "budget_range") {
    const spreadRatio = minBudget > 0 ? maxBudget / minBudget : 1;
    if (minBudget >= 250 && maxBudget >= minBudget && spreadRatio <= 3.0) {
      completeness += 0.25;
    } else if (minBudget > 0 && maxBudget >= minBudget) {
      completeness += 0.16;
    }
  } else {
    // Open Bid format: realistic minimum floor
    if (minBudget >= 300) completeness += 0.25;
    else if (minBudget > 0) completeness += 0.16;
  }

  // Multi-disciplinary Skills / Specificity (20%)
  if (skillsCount >= 3) completeness += 0.20;
  else if (skillsCount >= 1) completeness += 0.10;

  // Visual Assets & Reference Material (15%)
  if (hasCustomVisual) completeness += 0.15;

  // Delivery Timeline & Workflow Terms (10%)
  if (hasTimeline && hasWorkflowTerms) completeness += 0.10;
  else if (hasTimeline || hasWorkflowTerms) completeness += 0.05;

  const completenessScore = Math.min(1, completeness);

  const composite =
    0.35 * bayesianScore +
    0.25 * freshnessScore +
    0.25 * completenessScore +
    0.15 * availabilityScore;

  const totalScore = Math.round(composite * 1000) / 10; // 0.0 to 100.0

  // Rising badge unlocks for high-effort new jobs from new or unreviewed clients
  const isRisingJob =
    applicantsCount < 3 &&
    v === 0 &&
    completenessScore >= 0.85 &&
    ageInDays <= 7;

  const isNewJob = ageInDays <= 7 && v === 0;

  return {
    totalScore,
    jobType,
    jobTypeLabel,
    bayesianRating: Math.round(bayesianRating * 100) / 100,
    bayesianScore,
    freshnessScore,
    completenessScore,
    availabilityScore,
    isRisingJob,
    isNewJob,
  };
}
