const forum = require('../repositories/ForumModeratorRepositories');
const tickets = require('../repositories/AdminTicketsRepositories');
const restrictions = require('../repositories/ModeratorRepositories');
const { setForumGroupMemberBanServices } = require('./ForumGroupServices');

module.exports = {
  ...forum,
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
