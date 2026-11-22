const forum = require('../repositories/ForumModeratorRepositories');
const tickets = require('../repositories/AdminTicketsRepositories');
const restrictions = require('../repositories/ModeratorRepositories');
const { fetchCalendar } = require('../repositories/AdminAnalyticsRepositories');
const { setForumGroupMemberBanServices } = require('./ForumGroupServices');
const { resolveRange } = require('./AdminAnalyticsServices');

/** Ranges the Forum dashboard's Trends picker offers. */
const FORUM_TREND_RANGES = ['7d', '30d', '90d', '12m'];

function trendError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

/**
 * Forum dashboard Trends for one preset range (default 30 days), compared with the period of
 * the same length right before it. Days follow the database calendar, like Admin Analytics.
 */
async function getForumTrends(query = {}) {
  const key = query.range == null || query.range === '' ? '30d' : String(query.range);
  if (!FORUM_TREND_RANGES.includes(key)) throw trendError('Unknown date range.');
  const calendar = await fetchCalendar();
  const range = resolveRange({ range: key }, calendar);
  const data = await forum.getForumTrends(range);
  return {
    range: {
      key: range.key,
      from: range.from,
      to: range.to,
      days: range.days,
      bucket: range.bucket,
      label: range.label,
      previous: range.previous,
      today: range.today,
    },
    ...data,
    lastUpdated: new Date().toISOString(),
  };
}

module.exports = {
  ...forum,
  getForumTrends,
  FORUM_TREND_RANGES,
  getTicketDetail: tickets.getTicketDetail,
  updateTicket: tickets.updateTicket,
  addTicketMessage: tickets.addTicketMessage,
  updateReport: tickets.updateReport,
  getReportDetail: tickets.getReportDetail,
  getViolationsAndRestrictions: restrictions.getViolationsAndRestrictions,
  issueViolation: restrictions.issueViolation,
  issueRestriction: restrictions.issueRestriction,
  updateAccountRestriction: restrictions.updateAccountRestriction,
  setForumGroupMemberBan: setForumGroupMemberBanServices,
};
