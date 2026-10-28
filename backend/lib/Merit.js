const BASE_MERIT = 50;
const MIN_MERIT = 0;
const MAX_MERIT = 100;
const IDENTITY_POINTS = 6;
const COMPLETION_CAP = 20;
const REVIEW_CAP = 15;
const AGE_CAP = 4;
const AGE_DAYS_PER_POINT = 60;
const WARNING_HIT_PER_POINT = 2;
const MIN_WARNING_POINTS = 1;
const MAX_WARNING_POINTS = 10;
const WARNING_DURATION_DAYS = [3, 5, 7, 10, 14, 21, 30, 45, 60, 90];
const RESTRICTED_PROPOSAL_DAILY_CAP = 3;

const BANDS = [
  { id: 'frozen', min: 0, max: 19, label: 'Frozen' },
  { id: 'restricted', min: 20, max: 34, label: 'Restricted' },
  { id: 'watch', min: 35, max: 49, label: 'Watch' },
  { id: 'established', min: 50, max: 74, label: 'Established' },
  { id: 'trusted', min: 75, max: 100, label: 'Trusted' },
];

const ACTION_ALLOW = {
  create_job: { frozen: false, restricted: false, watch: true, established: true, trusted: true },
  create_urgent_job: { frozen: false, restricted: false, watch: false, established: true, trusted: true },
  create_gig: { frozen: false, restricted: false, watch: true, established: true, trusted: true },
  publish_asset: { frozen: false, restricted: false, watch: true, established: true, trusted: true },
  asset_comment: { frozen: false, restricted: false, watch: true, established: true, trusted: true },
  proposal: { frozen: false, restricted: true, watch: true, established: true, trusted: true },
  forum_write: { frozen: false, restricted: false, watch: true, established: true, trusted: true },
  new_dm: { frozen: false, restricted: true, watch: true, established: true, trusted: true },
  cashout: { frozen: false, restricted: true, watch: true, established: true, trusted: true },
  create_team: { frozen: false, restricted: false, watch: true, established: true, trusted: true },
  join_team: { frozen: false, restricted: false, watch: true, established: true, trusted: true },
  create_shared_project: { frozen: false, restricted: false, watch: true, established: true, trusted: true },
};

const ACTION_MESSAGES = {
  create_job: 'Your Platform Merit is too low to post a new job. Finish live work or wait out punishments to recover.',
  create_urgent_job: 'Urgent job posts need Established merit (50+).',
  create_gig: 'Your Platform Merit is too low to create a new gig.',
  publish_asset: 'Your Platform Merit is too low to publish a marketplace listing.',
  asset_comment: 'Your Platform Merit is too low to comment on marketplace listings.',
  proposal: 'Frozen accounts cannot send job proposals.',
  proposal_cap: `Restricted accounts can send ${RESTRICTED_PROPOSAL_DAILY_CAP} job proposals per day.`,
  forum_write: 'Your Platform Merit is too low to post in the forums. You can still read.',
  new_dm: 'Frozen accounts cannot start new messages. Existing job, gig, and contract threads stay open.',
  cashout: 'Cashout is blocked until Platform Merit is 20 or higher. Your balance is not seized.',
  create_team: 'Your Platform Merit is too low to create a team.',
  join_team: 'Your Platform Merit is too low to join a new team. Teams you already belong to stay open.',
  create_shared_project: 'Your Platform Merit is too low to start a new shared editor project. Personal projects and live team work stay open.',
};

function clampMerit(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return BASE_MERIT;
  return Math.max(MIN_MERIT, Math.min(MAX_MERIT, Math.round(n)));
}

function bandFor(score) {
  const n = clampMerit(score);
  return BANDS.find((band) => n >= band.min && n <= band.max) || BANDS[3];
}

function clampWarningPoints(points) {
  const n = Math.round(Number(points));
  if (!Number.isFinite(n)) return MIN_WARNING_POINTS;
  return Math.max(MIN_WARNING_POINTS, Math.min(MAX_WARNING_POINTS, n));
}

function warningDurationDays(points) {
  return WARNING_DURATION_DAYS[clampWarningPoints(points) - 1];
}

function warningHit(points) {
  return clampWarningPoints(points) * WARNING_HIT_PER_POINT;
}

function completionPoints(count) {
  const n = Math.max(0, Number(count) || 0);
  if (n <= 0) return 0;
  let points = 5;
  if (n >= 2) points += (Math.min(n, 10) - 1) * 1.5;
  if (n >= 11) points += (n - 10) * 0.2;
  return Math.min(points, COMPLETION_CAP);
}

function reviewPoints(average, count) {
  const n = Math.max(0, Number(count) || 0);
  if (n <= 0) return 0;
  const avg = Number(average);
  if (!Number.isFinite(avg)) return 0;
  const prior = 3;
  const priorN = 5;
  const bayesian = (n * avg + priorN * prior) / (n + priorN);
  return Math.max(0, Math.min(REVIEW_CAP, ((bayesian - 3) / 2) * REVIEW_CAP));
}

function agePoints(createdAt) {
  if (!createdAt) return 0;
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return 0;
  const days = Math.max(0, (Date.now() - created.getTime()) / 86400000);
  return Math.min(AGE_CAP, Math.floor(days / AGE_DAYS_PER_POINT));
}

function computeMeritScore(facts = {}) {
  let score = BASE_MERIT;
  score += completionPoints(facts.completions);
  score += reviewPoints(facts.reviewAverage, facts.reviewCount);
  if (facts.verified) score += IDENTITY_POINTS;
  score += agePoints(facts.createdAt);
  score -= Number(facts.warningHits || 0);
  return clampMerit(score);
}

function actionAllowed(action, bandId) {
  const matrix = ACTION_ALLOW[action];
  if (!matrix) return true;
  return matrix[bandId] !== false;
}

function meritError(message, code = 'MERIT_RESTRICTED') {
  const error = new Error(message);
  error.statusCode = 403;
  error.code = code;
  return error;
}

module.exports = {
  BASE_MERIT,
  BANDS,
  MIN_WARNING_POINTS,
  MAX_WARNING_POINTS,
  WARNING_HIT_PER_POINT,
  WARNING_DURATION_DAYS,
  RESTRICTED_PROPOSAL_DAILY_CAP,
  ACTION_MESSAGES,
  clampMerit,
  bandFor,
  clampWarningPoints,
  warningDurationDays,
  warningHit,
  completionPoints,
  reviewPoints,
  agePoints,
  computeMeritScore,
  actionAllowed,
  meritError,
};
