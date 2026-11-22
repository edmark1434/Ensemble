const { createNotificationServices } = require('./NotificationServices');

/**
 * Staff actions on job and gig postings, as seen by the posting's owner (docs/punishment-system.md
 * §8.3 / §8.4).
 *
 * - `notifyPostingOwner`: every staff pause / close / archive / reopen notifies the owner. A hold
 *   notice says why and points to a support ticket ("Appeal a jobs action"), since the owner cannot
 *   reopen a held posting themselves.
 * - `applyReportPostingAction`: a sanctioned job or gig report also pauses or archives the
 *   reported posting (staff choose; pause by default).
 */

const APPEAL_TICKET_TYPE = 'Appeal a jobs action';
const APPEAL_TICKET_PATH = `/support/ticket?type=${encodeURIComponent(APPEAL_TICKET_TYPE)}`;
const REPORT_POSTING_ACTIONS = new Set(['pause', 'archive']);
const REPORT_POSTING_TYPES = new Set(['job', 'gig']);

function postingError(message, statusCode = 400, code = 'POSTING_ACTION_INVALID') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function postingPath(type, id) {
  return type === 'job' ? `/jobs/${id}/page` : `/gigs/services/${id}/page`;
}

function clip(value, max) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function buildOwnerNotice({ type, title, status, reason, reportNumber, held }) {
  const noun = type === 'job' ? 'job' : 'gig';
  const name = title ? ` “${clip(title, 120)}”` : '';
  if (status === 'active') {
    return `Your ${noun}${name} was reopened by the Ensemble team and is visible again.`;
  }
  const verb = held
    ? `was put on hold by the Ensemble team (it stays ${status})`
    : { paused: 'was paused', closed: 'was closed', archived: 'was archived' }[status] + ' by the Ensemble team';
  const cause = reportNumber ? ` after report ${reportNumber} was reviewed` : '';
  const why = reason ? ` Reason: ${clip(reason, 300)}` : '';
  // Matches what members see (docs/punishment-system.md §8.3): paused leaves the board while the
  // team reviews it, closed stays visible but takes no new work, archived is removed.
  const effect = {
    archived: ' It no longer appears on Ensemble.',
    paused: ' It is hidden from the board while the team reviews it, and you cannot reopen it yourself.',
    closed: ' It no longer takes new proposals or orders, and you cannot reopen it yourself.',
  }[status];
  return `Your ${noun}${name} ${verb}${cause}.${why}${why && !/[.!?]$/.test(why) ? '.' : ''}${effect} `
    + `If you think this is a mistake or you have fixed the problem, open a support ticket (“${APPEAL_TICKET_TYPE}”) to ask for a review.`;
}

/**
 * Tells a posting's owner what staff did to it. Never throws: the posting change is already saved.
 */
async function notifyPostingOwner({ ownerAccountId, type, id, title, status, reason = '', reportNumber = null, held = false }) {
  if (!ownerAccountId || !REPORT_POSTING_TYPES.has(type)) return;
  if (!['paused', 'closed', 'archived', 'active'].includes(status)) return;
  try {
    const notification = await createNotificationServices({
      account_id: ownerAccountId,
      message: buildOwnerNotice({ type, title, status, reason, reportNumber, held }),
      is_read: false,
      reference_table: type === 'job' ? 'jobs' : 'gigs',
      reference_prefix: type === 'job' ? 'JOB' : 'GIG',
      reference_path: status === 'active' ? postingPath(type, id) : APPEAL_TICKET_PATH,
      reference_id: String(id),
    });
    const io = require('../lib/WebSocket').getIo();
    if (io && notification) io.to(String(ownerAccountId)).emit('notification', notification);
  } catch (error) {
    console.error('Posting moderation notice failed:', error.message);
  }
}

/** The posting type a report is about, when it is a job or gig posting. */
function reportPostingType(row) {
  const type = String(row?.target_type || '').trim().toLowerCase();
  return REPORT_POSTING_TYPES.has(type) && row?.target_id ? type : null;
}

/** `postingAction` on a sanction: `pause` (default) or `archive`. */
function normalizeReportPostingAction(value) {
  if (value == null || value === '') return 'pause';
  const action = String(value).trim().toLowerCase();
  if (!REPORT_POSTING_ACTIONS.has(action)) {
    throw postingError('Choose whether to pause or archive the reported posting.');
  }
  return action;
}

/**
 * After a job or gig report is sanctioned, takes the reported posting off the board.
 * Runs after the sanction is saved and never undoes it; the outcome is returned for the desk.
 *
 * - Already archived: nothing to do.
 * - Archive: archives it (also when a ban just closed it).
 * - Pause: pauses an open posting; one already paused or closed is put on hold as it is, so the
 *   owner cannot reopen it.
 */
async function applyReportPostingAction(row, { action, reason }, staffSession) {
  const type = reportPostingType(row);
  if (!type) return null;
  const {
    readPostingState,
    holdPostingForStaff,
    updateJobsGigsPosting,
  } = require('../repositories/JobsModeratorRepositories');
  const noun = type === 'job' ? 'job' : 'gig';
  const reportNumber = row.report_number || null;

  try {
    const posting = await readPostingState(type, row.target_id);
    if (!posting) {
      return { action, result: 'missing', message: `The reported ${noun} no longer exists.` };
    }
    if (posting.status === 'archived') {
      return { action, result: 'skipped', postingStatus: 'archived', message: `The ${noun} was already archived.` };
    }
    const audit = { source: 'report', reportId: String(row.report_id), reportNumber };
    const note = clip(reason, 500);
    if (action === 'archive') {
      await updateJobsGigsPosting(type, posting.id, { status: 'archived', reason: note }, staffSession, audit, { reportNumber });
      return { action, result: 'applied', postingStatus: 'archived', message: `The ${noun} was archived and its owner notified.` };
    }
    if (posting.status === 'active') {
      await updateJobsGigsPosting(type, posting.id, { status: 'paused', reason: note }, staffSession, audit, { reportNumber });
      return { action, result: 'applied', postingStatus: 'paused', message: `The ${noun} was paused and its owner notified.` };
    }
    // Already paused or closed: keep the status, but hold it so the owner cannot reopen it.
    await holdPostingForStaff(type, posting.id);
    await notifyPostingOwner({
      ownerAccountId: posting.ownerAccountId,
      type,
      id: posting.id,
      title: posting.title,
      status: posting.status,
      reason: note,
      reportNumber,
      held: true,
    });
    return {
      action,
      result: 'held',
      postingStatus: posting.status,
      message: `The ${noun} was already ${posting.status}; it is now on hold and its owner was notified.`,
    };
  } catch (error) {
    console.error('Report posting action failed:', error.message);
    return {
      action,
      result: 'failed',
      message: `The sanction was applied, but the ${noun} could not be ${action === 'archive' ? 'archived' : 'paused'}: ${error.message}`,
    };
  }
}

/**
 * The staff hold notice an owner sees on their own job or gig page: what staff did, why, and how
 * to appeal. Null when the posting is not held or is open. Callers attach it only for people who
 * manage the posting, since the reason is written for the owner.
 */
async function ownerStaffHoldNotice(type, id) {
  if (!REPORT_POSTING_TYPES.has(type) || !id) return null;
  const { readPostingState, getLatestPostingActions } = require('../repositories/JobsModeratorRepositories');
  try {
    const posting = await readPostingState(type, id);
    if (!posting?.held || !['paused', 'closed'].includes(posting.status)) return null;
    const actions = await getLatestPostingActions([posting.id]);
    const last = actions.get(String(posting.id)) || null;
    return {
      status: posting.status,
      heldAt: posting.heldAt,
      // A report hold on an already paused or closed posting keeps no status change of its own,
      // so the reason is only shown when the last change matches the current status.
      reason: last && last.status === posting.status ? last.reason : null,
      reportNumber: last && last.status === posting.status ? last.reportNumber : null,
      actionAt: last?.at || posting.heldAt,
      appealPath: APPEAL_TICKET_PATH,
    };
  } catch (error) {
    console.error('Staff hold notice failed:', error.message);
    return null;
  }
}

/** Error for an owner trying to change the status of a posting staff put on hold. */
function postingHeldError(type) {
  const noun = type === 'job' ? 'job' : 'gig';
  return postingError(
    `This ${noun} was put on hold by the Ensemble team, so you cannot reopen or change its status. `
      + `Open a support ticket (“${APPEAL_TICKET_TYPE}”) to ask for a review.`,
    403,
    'POSTING_STAFF_HOLD'
  );
}

module.exports = {
  APPEAL_TICKET_PATH,
  notifyPostingOwner,
  reportPostingType,
  normalizeReportPostingAction,
  applyReportPostingAction,
  ownerStaffHoldNotice,
  postingHeldError,
};
