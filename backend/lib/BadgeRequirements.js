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

/** Named library rows created from the live product catalog. */
const NAMED_REQUIREMENTS = [
  { slug: 'alpha-signup', name: 'Signed up during alpha', metric: 'alpha_access', operator: 'eq', threshold: 1, description: 'Alpha Tester. Fired on signup while alpha is open.' },
  { slug: 'beta-flag', name: 'Beta tester', metric: 'beta_access', operator: 'eq', threshold: 1, description: 'Beta Tester. Admin grant or beta flag.' },
  { slug: 'profile-complete', name: 'Profile checklist 100%', metric: 'profile_complete', operator: 'eq', threshold: 1, description: 'Profile Complete.' },
  { slug: 'freelance-close-1', name: '1 freelancer close', metric: 'freelance_close', operator: 'gte', threshold: 1, description: 'Fresh Freelancer.' },
  { slug: 'freelance-close-10', name: '10 freelancer closes', metric: 'freelance_close', operator: 'gte', threshold: 10, description: 'Rising Freelancer.' },
  { slug: 'freelance-close-50', name: '50 freelancer closes', metric: 'freelance_close', operator: 'gte', threshold: 50, description: 'Elite Freelancer.' },
  { slug: 'freelance-close-100', name: '100 freelancer closes', metric: 'freelance_close', operator: 'gte', threshold: 100, description: 'Grand Freelancer.' },
  { slug: 'client-close-1', name: '1 client close', metric: 'client_close', operator: 'gte', threshold: 1, description: 'Fresh Client.' },
  { slug: 'client-close-10', name: '10 client closes', metric: 'client_close', operator: 'gte', threshold: 10, description: 'Rising Client.' },
  { slug: 'client-close-50', name: '50 client closes', metric: 'client_close', operator: 'gte', threshold: 50, description: 'Elite Client.' },
  { slug: 'client-close-100', name: '100 client closes', metric: 'client_close', operator: 'gte', threshold: 100, description: 'Grand Client.' },
  { slug: 'asset-published-1', name: '1 published asset', metric: 'asset_published', operator: 'gte', threshold: 1, description: 'Fresh Creator.' },
  { slug: 'asset-published-10', name: '10 published assets', metric: 'asset_published', operator: 'gte', threshold: 10, description: 'Rising Creator.' },
  { slug: 'asset-published-50', name: '50 published assets', metric: 'asset_published', operator: 'gte', threshold: 50, description: 'Elite Creator.' },
  { slug: 'asset-published-100', name: '100 published assets', metric: 'asset_published', operator: 'gte', threshold: 100, description: 'Grand Creator.' },
  { slug: 'jobs-posted-1', name: '1 job posted', metric: 'jobs_posted', operator: 'gte', threshold: 1, description: 'Created a job listing.' },
  { slug: 'proposals-sent-1', name: '1 job proposal sent', metric: 'proposals_sent', operator: 'gte', threshold: 1, description: 'Applied to a job.' },
  { slug: 'gigs-listed-1', name: '1 gig listed', metric: 'gigs_listed', operator: 'gte', threshold: 1, description: 'Published a gig service.' },
  { slug: 'followers-1', name: '1 follower', metric: 'followers', operator: 'gte', threshold: 1, description: 'Someone follows this profile.' },
  { slug: 'reviews-received-1', name: '1 contract review received', metric: 'reviews_received', operator: 'gte', threshold: 1, description: 'Rated after a close.' },
  { slug: 'portfolio-items-1', name: '1 portfolio item', metric: 'portfolio_items', operator: 'gte', threshold: 1, description: 'Gallery item on profile.' },
  { slug: 'skills-added-1', name: '1 skill on profile', metric: 'skills_added', operator: 'gte', threshold: 1, description: 'A skill attached to the profile.' },
];

/** registry_id → named requirement slugs, from the current 15 product badges. */
const EXISTING_BADGE_REQUIREMENTS = {
  'acc-alpha': ['alpha-signup'],
  'acc-beta': ['beta-flag'],
  'setup-profile': ['profile-complete'],
  'acc-freelance-1': ['freelance-close-1'],
  'acc-freelance-2': ['freelance-close-10'],
  'acc-freelance-3': ['freelance-close-50'],
  'acc-freelance-4': ['freelance-close-100'],
  'acc-client-1': ['client-close-1'],
  'acc-client-2': ['client-close-10'],
  'acc-client-3': ['client-close-50'],
  'acc-client-4': ['client-close-100'],
  'acc-asset-1': ['asset-published-1'],
  'acc-asset-2': ['asset-published-10'],
  'acc-asset-3': ['asset-published-50'],
  'acc-asset-4': ['asset-published-100'],
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
  return REQUIREMENT_CATALOG.filter((item) => item.code !== 'admin_grant').map((item) => ({ ...item }));
}

function listNamedRequirementSeeds() {
  return NAMED_REQUIREMENTS.map((item) => ({ ...item, is_system: true }));
}

function listExistingBadgeRequirementMap() {
  return { ...EXISTING_BADGE_REQUIREMENTS };
}

function requirementKind(code) {
  return getRequirementDefinition(code)?.kind || 'count';
}

function normalizeOperator(value) {
  const operator = String(value || 'gte').toLowerCase();
  return OPERATORS[operator] ? operator : null;
}

function compareProgress(operator, current, threshold) {
  const fn = OPERATORS[operator] || OPERATORS.gte;
  return fn.compare(Number(current || 0), Number(threshold || 1));
}

function formatRequirementLabel(def) {
  const metric = getRequirementDefinition(def.metric || def.code);
  const kind = metric?.kind || 'count';
  if (kind === 'boolean') return def.name || metric?.label || def.metric;
  const op = OPERATORS[def.operator]?.label || 'at least';
  return def.name || `${metric?.label || def.metric} ${op} ${def.threshold}`;
}

module.exports = {
  REQUIREMENT_CATALOG,
  LEGACY_CODE_MAP,
  OPERATORS,
  NAMED_REQUIREMENTS,
  EXISTING_BADGE_REQUIREMENTS,
  normalizeRequirementCode,
  getRequirementDefinition,
  listRequirementCatalog,
  listNamedRequirementSeeds,
  listExistingBadgeRequirementMap,
  requirementKind,
  normalizeOperator,
  compareProgress,
  formatRequirementLabel,
};
