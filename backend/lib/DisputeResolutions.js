/**
 * Why a dispute closed. `status = closed` says a case ended; this says how.
 *
 * Each entry owns the finding posted in the discussion when staff resolve a case, so the
 * thread always ends with a formal, plainly worded decision. The message is attributed to
 * the Dispute Resolution service rather than the individual staff member who pressed
 * Resolve — the decision is the platform's, and the acting staff id is kept in the audit
 * trail instead. `notifyMessage` is the shorter line used for the parties' notifications.
 */

/** Author shown on the decision message, in place of the staff member's own name. */
const DISPUTE_DECISION_AUTHOR = {
  name: 'Dispute Resolution',
  type: 'system',
  role: 'resolution',
};

const DISPUTE_RESOLUTIONS = [
  {
    key: 'resolved_both_parties',
    label: 'Resolved by both parties',
    hint: 'Both sides agreed on an outcome.',
    requiresNote: false,
    finding: ({ disputer, disputee }) =>
      `${disputer} and ${disputee} reached an agreement during review. The matter is settled between them and requires no further action from the platform.`,
    notifyMessage: 'was closed — both parties reached an agreement.',
  },
  {
    key: 'disputee_refused',
    label: 'Disputee refused to cooperate',
    hint: 'The person named in the dispute would not take part.',
    requiresNote: true,
    finding: ({ disputee }) =>
      `${disputee} declined to take part in the review. The case has been decided without their account of events.`,
    notifyMessage: 'was closed — the disputee refused to cooperate.',
  },
  {
    key: 'disputer_refused',
    label: 'Disputer refused to cooperate',
    hint: 'The person who filed would not take part.',
    requiresNote: true,
    finding: ({ disputer }) =>
      `${disputer} declined to take part in the review of the case they filed. No finding can be made on the complaint as it stands.`,
    notifyMessage: 'was closed — the disputer refused to cooperate.',
  },
  {
    key: 'disputer_inactive',
    label: 'Disputer inactive',
    hint: 'The person who filed stopped responding.',
    requiresNote: false,
    finding: ({ disputer }) =>
      `${disputer} stopped responding to the review and the case cannot proceed without them. It is closed for inactivity.`,
    notifyMessage: 'was closed for inactivity by the disputer.',
  },
  {
    key: 'disputee_inactive',
    label: 'Disputee inactive',
    hint: 'The person named in the dispute stopped responding.',
    requiresNote: false,
    finding: ({ disputee }) =>
      `${disputee} stopped responding to the review. The case is closed for inactivity on their side.`,
    notifyMessage: 'was closed for inactivity by the disputee.',
  },
  {
    key: 'withdrawn',
    label: 'Withdrawn by the disputer',
    hint: 'The person who filed asked to drop the case.',
    requiresNote: false,
    finding: ({ disputer }) =>
      `${disputer} withdrew the complaint. The case is closed at their request, with no finding against either party.`,
    notifyMessage: 'was withdrawn and closed.',
  },
  {
    key: 'no_violation',
    label: 'No violation found',
    hint: 'The review found nothing to act on.',
    requiresNote: true,
    finding: () =>
      'The review found no breach of the platform rules by either party. No action is taken against either account.',
    notifyMessage: 'was closed — staff found no violation.',
  },
];

const DISPUTE_RESOLUTION_KEYS = DISPUTE_RESOLUTIONS.map((item) => item.key);

/**
 * Why a closed dispute is being reopened. Posted the same way a resolution is, so the
 * thread shows plainly that the earlier decision has been set aside.
 */
const DISPUTE_REOPEN_REASONS = [
  {
    key: 'new_evidence',
    label: 'New evidence submitted',
    hint: 'A party produced something the original review did not have.',
    requiresNote: true,
    finding: () =>
      'New evidence has been submitted on this case. The earlier decision is set aside and the matter is under review again.',
    notifyMessage: 'was reopened — new evidence was submitted.',
  },
  {
    key: 'appeal_granted',
    label: 'Appeal granted',
    hint: 'A party appealed and the appeal was accepted for review.',
    requiresNote: true,
    finding: () =>
      'An appeal against the decision on this case has been granted. The matter is under review again.',
    notifyMessage: 'was reopened — an appeal was granted.',
  },
  {
    key: 'party_now_responding',
    label: 'Party is now responding',
    hint: 'A case closed for inactivity, and the missing side came back.',
    requiresNote: false,
    finding: () =>
      'This case was closed because a party had stopped responding. They have since replied, so the review is resuming.',
    notifyMessage: 'was reopened — the missing party replied.',
  },
  {
    key: 'staff_error',
    label: 'Closed in error',
    hint: 'The case was resolved by mistake or on the wrong facts.',
    requiresNote: true,
    finding: () =>
      'This case was closed in error. The earlier decision is withdrawn and the matter is being reviewed again.',
    notifyMessage: 'was reopened — it had been closed in error.',
  },
];

const DISPUTE_REOPEN_KEYS = DISPUTE_REOPEN_REASONS.map((item) => item.key);

function findDisputeReopenReason(key) {
  const value = String(key || '').toLowerCase().trim();
  if (!value) return null;
  return DISPUTE_REOPEN_REASONS.find((item) => item.key === value) || null;
}

function listDisputeReopenOptions() {
  return DISPUTE_REOPEN_REASONS.map(({ key, label, hint, requiresNote }) => ({
    key,
    label,
    hint,
    requiresNote,
  }));
}

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
 * The decision posted in the discussion when a dispute is resolved.
 * Formal and structured, so the thread ends with something that reads as a ruling.
 *
 * @param {object} resolution one entry of DISPUTE_RESOLUTIONS
 * @param {{ disputer?: string, disputee?: string, notes?: string, disputeNumber?: string }} context
 */
function buildDisputeResolutionMessage(
  resolution,
  { disputer, disputee, notes, disputeNumber } = {}
) {
  return buildDisputeRulingMessage(resolution, {
    disputer,
    disputee,
    notes,
    disputeNumber,
    heading: 'Final decision',
    outcomeLabel: 'Outcome',
    closing:
      'This case is now closed and the discussion is final. If you believe it was decided in error, contact Support to request an appeal.',
  });
}

/** The notice posted when a closed dispute is reopened. */
function buildDisputeReopenMessage(reason, { disputer, disputee, notes, disputeNumber } = {}) {
  return buildDisputeRulingMessage(reason, {
    disputer,
    disputee,
    notes,
    disputeNumber,
    heading: 'Case reopened',
    outcomeLabel: 'Reason',
    closing:
      'The case is open again and staff will review it. Both parties may reply in this discussion.',
  });
}

function buildDisputeRulingMessage(
  entry,
  { disputer, disputee, notes, disputeNumber, heading, outcomeLabel, closing } = {}
) {
  if (!entry) return '';
  const names = {
    disputer: disputer || 'The disputer',
    disputee: disputee || 'The disputee',
  };
  const lines = [
    `${heading}${disputeNumber ? ` — ${disputeNumber}` : ''}`,
    '',
    `${outcomeLabel}: ${entry.label}`,
    '',
    entry.finding(names),
  ];
  const note = String(notes || '').trim();
  if (note) lines.push('', `Reviewing staff noted: ${note}`);
  if (closing) lines.push('', closing);
  return lines.join('\n');
}

module.exports = {
  DISPUTE_RESOLUTIONS,
  DISPUTE_RESOLUTION_KEYS,
  DISPUTE_REOPEN_REASONS,
  DISPUTE_REOPEN_KEYS,
  DISPUTE_DECISION_AUTHOR,
  findDisputeResolution,
  findDisputeReopenReason,
  disputeResolutionLabel,
  listDisputeResolutionOptions,
  listDisputeReopenOptions,
  buildDisputeResolutionMessage,
  buildDisputeReopenMessage,
};
