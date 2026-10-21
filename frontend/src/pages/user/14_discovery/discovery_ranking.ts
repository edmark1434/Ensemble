export interface DiscoveryProfileInput {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  tagline: string;
  skills: string[];
  rawSkills?: { name: string; proficiency: string; years: number }[];
  verified: boolean;
  subscriptionType: "Free" | "Premium" | "Business" | string;
  meritScore: number | string;
  ratingCount?: number;
  followersCount: number;
  totalJobs?: number;
  totalServices?: number;
  totalAssets?: number;
}

export interface DiscoveryScoreBreakdown {
  totalScore: number;         // 0 to 100
  deterministicScore: number; // 0 to 70 (Relevance & Quality Pillars)
  completenessPts: number;    // 0 to 20 pts
  matchPts: number;           // 0 to 25 pts
  reputationPts: number;      // 0 to 15 pts
  tierPts: number;            // 0 to 10 pts
  jitterPts: number;          // 0 to 30 pts (Seeded Stratified Exploration)
  matchPercent: number;       // 0 to 100
  matchedSkills: string[];
  checklist: {
    hasAvatar: boolean;
    hasBioOrTagline: boolean;
    hasSkillsDepth: boolean;
    hasPortfolioActivity: boolean;
  };
}

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Deterministic 32-bit FNV-1a + Murmur-style avalanche hash so each (profileId, sessionSeed)
 * pair receives a repeatable uniform float in [0, 1).
 * This prevents pagination jitter when flipping pages, while changing immediately when the user clicks "Shuffle".
 */
export function seededRandomUnit(profileId: string, seed: number): number {
  const input = `${profileId}::${seed}`;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/**
 * Computes skill overlap and proficiency/experience bonus between a profile and target job skills.
 */
export function computeSkillMatch(
  profile: DiscoveryProfileInput,
  targetSkills: string[]
): { matched: string[]; percent: number; rawScore: number } {
  const wanted = new Set(targetSkills.map(norm).filter(Boolean));
  if (wanted.size === 0) {
    return { matched: [], percent: 0, rawScore: 0 };
  }

  const matched = profile.skills.filter((s) => wanted.has(norm(s)));
  const coverageRatio = matched.length / wanted.size;

  // Depth bonus from proficiency and years of experience on matched skills
  let depthBonus = 0;
  if (matched.length > 0 && Array.isArray(profile.rawSkills)) {
    let totalDepth = 0;
    profile.rawSkills.forEach((rs) => {
      if (wanted.has(norm(rs.name))) {
        const prof = (rs.proficiency || "").toLowerCase();
        if (prof.includes("expert") || prof.includes("advanced") || prof.includes("senior")) {
          totalDepth += 0.6;
        } else if (prof.includes("intermediate") || prof.includes("mid")) {
          totalDepth += 0.35;
        } else {
          totalDepth += 0.15;
        }

        const y = Number(rs.years) || 0;
        if (y >= 5) totalDepth += 0.4;
        else if (y >= 2) totalDepth += 0.25;
        else if (y > 0) totalDepth += 0.1;
      }
    });
    depthBonus = Math.min(1, totalDepth / matched.length);
  }

  // Weighted match percentage: 80% coverage + 20% competency depth on matched skills
  const blended = matched.length > 0 ? Math.min(1, coverageRatio * 0.85 + depthBonus * 0.15) : 0;
  const percent = Math.round(coverageRatio * 100);
  const rawScore = Math.round(blended * 1000);

  return { matched, percent, rawScore };
}

/**
 * 100-Point Weighted Random / Stratified Exploration Algorithm for Discovery Page:
 *   1. Profile Completeness (0–20 pts)
 *   2. Skill Relevance & Competency (0–25 pts)
 *   3. Bayesian Merit & Verification (0–15 pts)
 *   4. Subscription Tier Boost (0–10 pts)
 *   5. Seeded Exploration Jitter (0–30 pts)
 */
export function computeDiscoveryScore(
  profile: DiscoveryProfileInput,
  viewerJobSkills: string[],
  sessionSeed: number
): DiscoveryScoreBreakdown {
  // 1. Profile Completeness (0 - 20 pts)
  const hasAvatar = Boolean(
    profile.avatar &&
      !profile.avatar.includes("ui-avatars.com") &&
      !profile.avatar.includes("default-avatar")
  );
  const bioLen = (profile.bio || "").trim().length;
  const taglineLen = (profile.tagline || "").trim().length;
  const hasBioOrTagline = bioLen >= 30 || (bioLen >= 10 && taglineLen >= 5) || taglineLen >= 12;
  const hasSkillsDepth = (profile.skills?.length || 0) >= 3;
  const hasPortfolioActivity =
    (Number(profile.totalServices) || 0) > 0 ||
    (Number(profile.totalAssets) || 0) > 0 ||
    (Number(profile.totalJobs) || 0) > 0;

  let completenessPts = 0;
  if (hasAvatar) completenessPts += 5;
  if (hasBioOrTagline) completenessPts += 5;
  if (hasSkillsDepth) completenessPts += 5;
  else if ((profile.skills?.length || 0) >= 1) completenessPts += 2.5;
  if (hasPortfolioActivity) completenessPts += 5;

  // 2. Skill Match / Competency Relevance (0 - 25 pts)
  const match = computeSkillMatch(profile, viewerJobSkills);
  let matchPts = 0;
  if (viewerJobSkills.length > 0) {
    matchPts = Math.round((match.rawScore / 1000) * 25 * 10) / 10;
  } else {
    // When viewer has no active job posts (or is browsing generally), reward skill breadth & experience depth (up to 18 pts)
    const skillCount = profile.skills?.length || 0;
    const breadthRatio = Math.min(1, skillCount / 5);
    let expRatio = 0;
    if (Array.isArray(profile.rawSkills) && profile.rawSkills.length > 0) {
      const avgYears =
        profile.rawSkills.reduce((acc, s) => acc + (Number(s.years) || 0), 0) /
        profile.rawSkills.length;
      expRatio = Math.min(1, avgYears / 4);
    }
    matchPts = Math.round((breadthRatio * 12 + expRatio * 6) * 10) / 10;
  }

  // 3. Reputation / Bayesian Merit + Verification (0 - 15 pts)
  // Cold-start protection: unrated talent receives a 4.0★ Bayesian prior (8.8 pts base)
  const numericRating = parseFloat(String(profile.meritScore));
  const hasRating = !Number.isNaN(numericRating) && numericRating > 0;
  const v = Math.max(hasRating ? 1 : 0, Number(profile.ratingCount) || 0);
  const R = hasRating ? numericRating : 0;
  const priorRating = 4.0;
  const priorWeight = 2;
  const bayesianRating = (v * R + priorWeight * priorRating) / (v + priorWeight);
  const ratingPts = (bayesianRating / 5) * 11; // up to 11 pts
  const verifiedPts = profile.verified ? 4 : 0; // +4 pts for verified identity
  const reputationPts = Math.round(Math.min(15, ratingPts + verifiedPts) * 10) / 10;

  // 4. Subscription Tier Boost (0 - 10 pts)
  let tierPts = 0;
  if (profile.subscriptionType === "Business") tierPts = 10;
  else if (profile.subscriptionType === "Premium") tierPts = 5;

  // 5. Seeded Exploration Jitter (0 - 30 pts)
  const unit = seededRandomUnit(profile.id, sessionSeed);
  const jitterPts = Math.round(unit * 30 * 10) / 10;

  const deterministicScore =
    Math.round((completenessPts + matchPts + reputationPts + tierPts) * 10) / 10;
  const totalScore = Math.round((deterministicScore + jitterPts) * 10) / 10;

  return {
    totalScore,
    deterministicScore,
    completenessPts,
    matchPts,
    reputationPts,
    tierPts,
    jitterPts,
    matchPercent: match.percent,
    matchedSkills: match.matched,
    checklist: {
      hasAvatar,
      hasBioOrTagline,
      hasSkillsDepth,
      hasPortfolioActivity,
    },
  };
}
