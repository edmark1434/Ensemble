const REQUIREMENT_CATALOG = [
  { code: 'admin_grant', label: 'Honorary — admin grant only', group: 'Staff', kind: 'boolean', description: 'Never auto-awarded. Staff send it from the Grant tab.' },
  { code: 'alpha_access', label: 'Signed up during alpha', group: 'Account', kind: 'boolean', description: 'Granted on signup while alpha is open.' },
  { code: 'beta_access', label: 'Beta tester flag', group: 'Account', kind: 'boolean', description: 'Staff grant, or a dedicated beta flag.' },
  { code: 'profile_complete', label: 'Profile checklist 100%', group: 'Account', kind: 'boolean', description: 'Avatar, tagline, bio, introduction, a skill, and a portfolio item.' },
  { code: 'freelance_close', label: 'Successful freelancer closes (jobs + gigs)', group: 'Work', kind: 'count', description: 'Completed job or gig as freelancer.' },
  { code: 'client_close', label: 'Successful client closes (jobs + gigs)', group: 'Work', kind: 'count', description: 'Completed funded job or gig as client.' },
  { code: 'job_close_freelancer', label: 'Successful job closes as freelancer', group: 'Jobs', kind: 'count', description: 'Completed job contracts only.' },
  { code: 'job_close_client', label: 'Successful job closes as client', group: 'Jobs', kind: 'count', description: 'Completed job contracts you hired.' },
  { code: 'jobs_posted', label: 'Jobs posted', group: 'Jobs', kind: 'count', description: 'Job listings created.' },
  { code: 'proposals_sent', label: 'Job proposals sent', group: 'Jobs', kind: 'count', description: 'Applications submitted on job posts.' },
  { code: 'gig_close_freelancer', label: 'Successful gig closes as seller', group: 'Gigs', kind: 'count', description: 'Completed gig orders as the freelancer.' },
  { code: 'gig_close_client', label: 'Successful gig closes as buyer', group: 'Gigs', kind: 'count', description: 'Completed gig orders you purchased.' },
  { code: 'gigs_listed', label: 'Gigs listed', group: 'Gigs', kind: 'count', description: 'Gig services created.' },
  { code: 'asset_published', label: 'Marketplace assets published', group: 'Assets', kind: 'count', description: 'Listings actually published.' },
  { code: 'assets_purchased', label: 'Marketplace assets purchased', group: 'Assets', kind: 'count', description: 'Active purchased licenses.' },
  { code: 'reviews_received', label: 'Contract reviews received', group: 'Reputation', kind: 'count', description: 'Star ratings left on you after a close.' },
  { code: 'followers', label: 'Followers', group: 'Profile', kind: 'count', description: 'Accounts following this profile.' },
  { code: 'portfolio_items', label: 'Portfolio items', group: 'Profile', kind: 'count', description: 'Items in the profile gallery.' },
  { code: 'skills_added', label: 'Skills on profile', group: 'Profile', kind: 'count', description: 'Skills attached to the user profile.' },
];

const LEGACY_CODE_MAP = {
  gig_completed: 'freelance_close',
  contract_funded: 'client_close',
  custom: 'admin_grant',
};

const OPERATORS = {
  gte: { label: 'at least', compare: (current, threshold) => current >= threshold },
  eq: { label: 'exactly', compare: (current, threshold) => current === threshold },
  lte: { label: 'at most', compare: (current, threshold) => current <= threshold },
};

const byCode = new Map(REQUIREMENT_CATALOG.map((item) => [item.code, item]));

function normalizeRequirementCode(code) {
  const raw = String(code || '').trim();
  return LEGACY_CODE_MAP[raw] || raw;
}

function getRequirementDefinition(code) {
  return byCode.get(normalizeRequirementCode(code)) || null;
}

function listRequirementCatalog() {
  return REQUIREMENT_CATALOG.map((item) => ({ ...item }));
}

function requirementKind(code) {
  return getRequirementDefinition(code)?.kind || 'count';
}

function compareProgress(operator, current, threshold) {
  const fn = OPERATORS[operator] || OPERATORS.gte;
  return fn.compare(Number(current || 0), Number(threshold || 1));
}

function formatUnlockLabel(code, conditionType, conditionValue) {
  const metric = getRequirementDefinition(code);
  if (!metric || metric.code === 'admin_grant') return 'Honorary — grant only';
  if (metric.kind === 'boolean' || conditionType === 'boolean') return metric.label;
  return `${metric.label} at least ${Number(conditionValue || 1)}`;
}

function badgeUnlockIsMet(badge, progress, context) {
  const code = normalizeRequirementCode(badge.trigger_event_code);
  if (!code || code === 'admin_grant') return false;
  if (code === 'alpha_access') return context.event === 'signup';
  if (code === 'beta_access') return context.event === 'beta';
  const operator = badge.condition_type === 'boolean' ? 'eq' : 'gte';
  return compareProgress(operator, progress[code], badge.condition_value);
}

module.exports = {
  REQUIREMENT_CATALOG,
  LEGACY_CODE_MAP,
  OPERATORS,
  normalizeRequirementCode,
  getRequirementDefinition,
  listRequirementCatalog,
  requirementKind,
  compareProgress,
  formatUnlockLabel,
  badgeUnlockIsMet,
};
