/**
 * Why a dispute closed. `status = closed` says a case ended; this says how.
 *
 * Each entry owns the sentence staff post in the discussion when they resolve a case,
 * so the thread always ends with a plain explanation of the outcome.
 * `notifyMessage` is the shorter line used for the parties' notifications.
 */

const DISPUTE_RESOLUTIONS = [
  {
    key: 'resolved_both_parties',
    label: 'Resolved by both parties',
    hint: 'Both sides agreed on an outcome.',
    requiresNote: false,
    body: ({ disputer, disputee }) =>
      `This dispute is resolved. ${disputer} and ${disputee} reached an agreement, and staff have closed the case.`,
    notifyMessage: 'was closed — both parties reached an agreement.',
  },
  {
    key: 'disputee_refused',
    label: 'Disputee refused to cooperate',
    hint: 'The person named in the dispute would not take part.',
    requiresNote: true,
    body: ({ disputee }) =>
      `Staff have closed this dispute. ${disputee} refused to cooperate with the review.`,
    notifyMessage: 'was closed — the disputee refused to cooperate.',
  },
  {
    key: 'disputer_refused',
    label: 'Disputer refused to cooperate',
    hint: 'The person who filed would not take part.',
    requiresNote: true,
    body: ({ disputer }) =>
      `Staff have closed this dispute. ${disputer} refused to cooperate with the review.`,
    notifyMessage: 'was closed — the disputer refused to cooperate.',
  },
  {
    key: 'disputer_inactive',
    label: 'Disputer inactive',
    hint: 'The person who filed stopped responding.',
    requiresNote: false,
    body: ({ disputer }) =>
      `Staff have closed this dispute for inactivity. ${disputer} stopped responding to the review.`,
    notifyMessage: 'was closed for inactivity by the disputer.',
  },
  {
    key: 'disputee_inactive',
    label: 'Disputee inactive',
    hint: 'The person named in the dispute stopped responding.',
    requiresNote: false,
    body: ({ disputee }) =>
      `Staff have closed this dispute for inactivity. ${disputee} stopped responding to the review.`,
    notifyMessage: 'was closed for inactivity by the disputee.',
  },
  {
    key: 'withdrawn',
    label: 'Withdrawn by the disputer',
    hint: 'The person who filed asked to drop the case.',
    requiresNote: false,
    body: ({ disputer }) => `${disputer} withdrew this dispute, so staff have closed it.`,
    notifyMessage: 'was withdrawn and closed.',
  },
  {
    key: 'no_violation',
    label: 'No violation found',
    hint: 'The review found nothing to act on.',
    requiresNote: true,
    body: () =>
      'Staff have closed this dispute. The review found no violation of the platform rules.',
    notifyMessage: 'was closed — staff found no violation.',
  },
];

const DISPUTE_RESOLUTION_KEYS = DISPUTE_RESOLUTIONS.map((item) => item.key);

function findDisputeResolution(key) {
  const value = String(key || '').toLowerCase().trim();
  if (!value) return null;
  return DISPUTE_RESOLUTIONS.find((item) => item.key === value) || null;
}

function disputeResolutionLabel(key) {
  return findDisputeResolution(key)?.label || null;
}

/** Catalog shaped for the staff console: no message builders, just what the UI renders. */
function listDisputeResolutionOptions() {
  return DISPUTE_RESOLUTIONS.map(({ key, label, hint, requiresNote }) => ({
    key,
    label,
    hint,
    requiresNote,
  }));
}

/**
 * The message staff post in the discussion for a resolution.
 * @param {object} resolution one entry of DISPUTE_RESOLUTIONS
 * @param {{ disputer?: string, disputee?: string, notes?: string }} context
 */
function buildDisputeResolutionMessage(resolution, { disputer, disputee, notes } = {}) {
  if (!resolution) return '';
  const names = {
    disputer: disputer || 'The disputer',
    disputee: disputee || 'The disputee',
  };
  const body = resolution.body(names);
  const note = String(notes || '').trim();
  return note ? `${body}\n\nStaff notes: ${note}` : body;
}

module.exports = {
  DISPUTE_RESOLUTIONS,
  DISPUTE_RESOLUTION_KEYS,
  findDisputeResolution,
  disputeResolutionLabel,
  listDisputeResolutionOptions,
  buildDisputeResolutionMessage,
};
