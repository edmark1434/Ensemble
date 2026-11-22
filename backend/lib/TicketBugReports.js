/**
 * Bug report ticket types. Every ticket category (each support area, Forum, Marketplace, Jobs and
 * Gigs) has its own, so a bug reaches the desk that owns that part of Ensemble. They share one
 * form (`bugReportFields` in lib/TicketFormFields.js) and the "bug" staff case layout.
 *
 * Kept apart from TicketEnums / TicketFormFields so both can read it without a circular require.
 */

/** Bug report type per category, keyed by the category label (`ticketCategoryOf`). */
const BUG_REPORT_TYPE_BY_CATEGORY = Object.freeze({
  Account: 'Account bug report',
  Billing: 'Billing bug report',
  'Video Editing Platform': 'Video editor bug report',
  Messaging: 'Messaging bug report',
  'Safety and appeals': 'Safety tools bug report',
  General: 'Website bug report',
  Forum: 'Forum bug report',
  Marketplace: 'Marketplace bug report',
  'Jobs and Gigs': 'Jobs and gigs bug report',
});

const BUG_REPORT_TYPES = Object.freeze(Object.values(BUG_REPORT_TYPE_BY_CATEGORY));

/** The "Can you still finish what you were doing?" answer that files the bug as High priority. */
const BUG_BLOCKING_ANSWER = 'No, it blocks me';
const BUG_BLOCKING_OPTIONS = Object.freeze(['Yes, with a workaround', 'Yes, it only looks wrong', BUG_BLOCKING_ANSWER]);
const BUG_FREQUENCY_OPTIONS = Object.freeze(['Every time', 'Sometimes', 'Happened once']);

function isBugReportType(type) {
  return BUG_REPORT_TYPES.includes(String(type || ''));
}

/**
 * Priority a bug report's answers ask for: High when it blocks the member, else null (the type's
 * default applies). `answers` are sanitized form rows (`{ key, value }`).
 */
function bugReportPriority(type, answers) {
  if (!isBugReportType(type) || !Array.isArray(answers)) return null;
  const blocking = answers.find((row) => row && row.key === 'blocking');
  return blocking && blocking.value === BUG_BLOCKING_ANSWER ? 'High' : null;
}

module.exports = {
  BUG_REPORT_TYPE_BY_CATEGORY,
  BUG_REPORT_TYPES,
  BUG_BLOCKING_ANSWER,
  BUG_BLOCKING_OPTIONS,
  BUG_FREQUENCY_OPTIONS,
  isBugReportType,
  bugReportPriority,
};
