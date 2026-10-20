export type BudgetType = "open" | "ranged" | "fixed" | "milestone_pool" | "multi_hire";

export interface BudgetDisplayInfo {
  type: BudgetType;
  amountText: string;     // e.g. "600+", "600 – 800", "8,000"
  rawPriceRange: string;  // e.g. "600+", "600 – 800"
  tagLabel: string;       // e.g. "Open Bid", "Ranged Budget", "Fixed Price", "Milestone Pool", "Per Hire"
  tagColorClass: string;  // Ensemble neutral gray badge classes
  subtitle: string;       // Explanatory microcopy
}

const GRAY_TAG_CLASSES =
  "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-zinc-400 border border-gray-200/80 dark:border-white/10";

export function getBudgetDisplayInfo(params: {
  minBudget?: number | string | null;
  maxBudget?: number | string | null;
  isTeam?: boolean;
  hiringType?: string;
  milestonesCount?: number;
  positionsNeeded?: number;
}): BudgetDisplayInfo {
  const min = Number(params.minBudget) || 0;
  const max = Number(params.maxBudget) || 0;
  const positions = Math.max(1, Number(params.positionsNeeded) || 1);
  const isTeam = Boolean(
    params.isTeam ||
    params.hiringType === "team"
  );

  // 1. Team Milestone Pool
  if (isTeam) {
    const val = min || max || 0;
    return {
      type: "milestone_pool",
      amountText: `${val.toLocaleString()}`,
      rawPriceRange: `${val.toLocaleString()}`,
      tagLabel: "Milestone Pool",
      tagColorClass: GRAY_TAG_CLASSES,
      subtitle: params.milestonesCount ? `Distributed across ${params.milestonesCount} milestones` : "Fixed project milestone pool"
    };
  }

  // 2. Multi-Hire Divided
  if (positions > 1) {
    const perSeatMin = Math.round(min / positions);
    const perSeatMax = Math.round((max || min) / positions);
    const isRanged = max > 0 && max !== min;
    const amountText = isRanged
      ? `${perSeatMin.toLocaleString()} – ${perSeatMax.toLocaleString()} / seat`
      : `${perSeatMin.toLocaleString()} / seat`;
    return {
      type: "multi_hire",
      amountText,
      rawPriceRange: amountText,
      tagLabel: "Per Hire",
      tagColorClass: GRAY_TAG_CLASSES,
      subtitle: `Total budget: ${(max || min).toLocaleString()} (${positions} positions)`
    };
  }

  // 3. Open Bid (Min Only)
  if (min > 0 && (!max || max === 0)) {
    return {
      type: "open",
      amountText: `${min.toLocaleString()}+`,
      rawPriceRange: `${min.toLocaleString()}+`,
      tagLabel: "Open Bid",
      tagColorClass: GRAY_TAG_CLASSES,
      subtitle: "Starting minimum benchmark"
    };
  }

  // 4. Ranged Budget (Min & Max specified, and Min !== Max)
  if (min > 0 && max > 0 && min !== max) {
    return {
      type: "ranged",
      amountText: `${min.toLocaleString()} – ${max.toLocaleString()}`,
      rawPriceRange: `${min.toLocaleString()} – ${max.toLocaleString()}`,
      tagLabel: "Ranged Budget",
      tagColorClass: GRAY_TAG_CLASSES,
      subtitle: "Negotiable within target range"
    };
  }

  // 5. Fixed Price
  const fixedVal = max || min || 0;
  return {
    type: "fixed",
    amountText: `${fixedVal.toLocaleString()}`,
    rawPriceRange: `${fixedVal.toLocaleString()}`,
    tagLabel: "Fixed Price",
    tagColorClass: GRAY_TAG_CLASSES,
    subtitle: "Non-negotiable fixed budget"
  };
}

export function getJobBudgetType(job: {
  minBudget?: number | string | null;
  maxBudget?: number | string | null;
  rate_credits_min?: number | string | null;
  rate_credits_max?: number | string | null;
  hiring_type?: string;
  is_team?: boolean;
  isTeam?: boolean;
  posted_as?: string;
  positionsNeeded?: number;
}): "open" | "ranged" | "fixed" | "pooled" {
  const isTeam = Boolean(
    job.hiring_type === "team" ||
    job.is_team ||
    job.isTeam ||
    job.posted_as === "Team"
  );
  if (isTeam) return "pooled";
  const min = Number(job.minBudget ?? job.rate_credits_min) || 0;
  const max = Number(job.maxBudget ?? job.rate_credits_max) || 0;
  if (min > 0 && (!max || max === 0)) return "open";
  if (min > 0 && max > 0 && min !== max) return "ranged";
  return "fixed";
}
