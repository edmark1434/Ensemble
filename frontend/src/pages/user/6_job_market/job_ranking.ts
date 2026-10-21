import type { Job } from "./job_components/job_lists";

export type JobRankingType = "individual_open" | "individual_ranged" | "team_pool";

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
const BAYESIAN_CONFIDENCE_WEIGHT = 3; // Number of virtual prior reviews
const FRESHNESS_WINDOW_DAYS = 14;

export function detectJobRankingType(job: Job): JobRankingType {
  const isTeam = Boolean(
    job.hiring_type === "team" ||
    job.is_team ||
    job.isTeam ||
    job.posted_as === "Team"
  );
  if (isTeam) return "team_pool";

  const maxBudget = Number(job.maxBudget) || 0;
  if (maxBudget > 0 && maxBudget >= (Number(job.minBudget) || 0)) {
    return "individual_ranged";
  }
  return "individual_open";
}

export function getJobRankingTypeLabel(type: JobRankingType): string {
  switch (type) {
    case "team_pool":
      return "Team Milestone Pool";
    case "individual_ranged":
      return "Individual • Ranged Bid";
    case "individual_open":
      return "Individual • Open Bid";
  }
}

/**
 * Computes the 100-Point Type-Aware Job Discovery Ranking score so first-time clients
 * with well-structured job briefs can compete with established repeat clients, while
 * fairly grading each of the 3 job post types:
 *   1. Individual — Open Bid (minBudget > 0, no max cap)
 *   2. Individual — Ranged / Multi-Seat Budget (minBudget & maxBudget)
 *   3. Team Job — Milestone Pool (hiring_type === "team" with role milestones)
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

  // 2. Open Seats & Low Proposal Congestion (15% weight)
  // Computed before freshness so we know proposalsPerSeat
  const positionsNeeded = Math.max(1, Number(job.positionsNeeded) || 1);
  const hiredCount = Math.max(0, Number(job.hiredCount) || 0);
  const openSeats = Math.max(1, positionsNeeded - hiredCount);
  const applicantsCount = Math.max(0, Number(job.applicantsCount) || 0);
  const proposalsPerSeat = applicantsCount / openSeats;
  const availabilityScore =
    hiredCount >= positionsNeeded
      ? 0
      : Math.max(0, Math.min(1, 1 - proposalsPerSeat / 8));

  // 3. New Job & First-Time Client Spotlight (25% weight)
  // 14-day linear decay from createdAt / postedAt; full 1.0x multiplier if < 3 proposals per seat
  let ageInDays = 30;
  const rawDate = (job as any).createdAt || job.postedAt;
  if (rawDate) {
    const postedTime = new Date(rawDate).getTime();
    if (!Number.isNaN(postedTime)) {
      ageInDays = Math.max(0, (Date.now() - postedTime) / (1000 * 60 * 60 * 24));
    }
  }
  const rawFreshness = Math.max(0, 1 - ageInDays / FRESHNESS_WINDOW_DAYS);
  const spotlightMultiplier = proposalsPerSeat < 3 ? 1.0 : 0.6;
  const freshnessScore = rawFreshness * spotlightMultiplier;

  // 4. Type-Aware Brief & Bid Quality Score (25% weight)
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
  const milestones = Array.isArray(job.milestones) ? job.milestones : [];
  const screeningCount = Array.isArray(job.screeningQuestions)
    ? job.screeningQuestions.length
    : 0;
  const minBudget = Number(job.minBudget) || 0;
  const maxBudget = Number(job.maxBudget) || 0;

  if (jobType === "individual_open") {
    // Open Bid: Freelancers propose their own quote & milestones, so we grade brief clarity
    if (descLength >= 150) completeness += 0.30;
    else if (descLength >= 80) completeness += 0.18;

    if (minBudget >= 300) completeness += 0.20;
    else if (minBudget > 0) completeness += 0.10;

    if (skillsCount >= 3) completeness += 0.20;
    else if (skillsCount >= 1) completeness += 0.10;

    if (hasCustomVisual) completeness += 0.15;

    if (hasTimeline && hasWorkflowTerms) completeness += 0.15;
    else if (hasTimeline || hasWorkflowTerms) completeness += 0.08;
  } else if (jobType === "individual_ranged") {
    // Ranged / Per-Seat Budget: Graded on realistic min-max spread + optional milestones/screening
    if (descLength >= 140) completeness += 0.25;
    else if (descLength >= 80) completeness += 0.15;

    const spreadRatio = minBudget > 0 ? maxBudget / minBudget : 1;
    if (minBudget >= 250 && maxBudget >= minBudget && spreadRatio <= 3.0) {
      completeness += 0.25;
    } else if (minBudget > 0 && maxBudget >= minBudget) {
      completeness += 0.15;
    }

    if (skillsCount >= 3) completeness += 0.15;
    else if (skillsCount >= 1) completeness += 0.08;

    if (hasCustomVisual) completeness += 0.15;

    if (milestones.length >= 1 || screeningCount >= 1 || positionsNeeded >= 1) {
      completeness += 0.10;
    }

    if (hasTimeline) completeness += 0.10;
  } else {
    // Team Milestone Pool: Graded on multi-phase milestones, task checklists, and credit pool
    if (milestones.length >= 2) completeness += 0.30;
    else if (milestones.length === 1) completeness += 0.15;

    const milestonesWithTasks = milestones.filter((m: any) => {
      if (Array.isArray(m?.tasks)) return m.tasks.length > 0;
      if (typeof m?.tasks === "string") return m.tasks.trim().length > 2;
      return Boolean(m?.description && String(m.description).trim().length > 15);
    }).length;

    if (milestonesWithTasks >= 2) completeness += 0.20;
    else if (milestonesWithTasks === 1) completeness += 0.10;

    if (descLength >= 140) completeness += 0.20;
    else if (descLength >= 80) completeness += 0.10;

    if (skillsCount >= 3) completeness += 0.15;
    else if (skillsCount >= 1) completeness += 0.08;

    if (hasCustomVisual && hasTimeline) completeness += 0.15;
    else if (hasCustomVisual || hasTimeline) completeness += 0.08;
  }

  const completenessScore = Math.min(1, completeness);

  const composite =
    0.35 * bayesianScore +
    0.25 * freshnessScore +
    0.25 * completenessScore +
    0.15 * availabilityScore;

  const totalScore = Math.round(composite * 1000) / 10; // 0.0 to 100.0

  const isRisingJob =
    proposalsPerSeat < 3 &&
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
