const forum = require('../Repositories/ForumModeratorRepositories');
const tickets = require('../Repositories/AdminTicketsRepositories');
const restrictions = require('../Repositories/ModeratorRepositories');
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
  updateAccountRestriction: restrictions.updateAccountRestriction,
  setForumGroupMemberBan: setForumGroupMemberBanServices,
};
