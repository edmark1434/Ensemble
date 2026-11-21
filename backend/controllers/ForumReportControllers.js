const {
  submitGroupReport,
  submitMemberReport,
  submitDiscussionReport,
  submitCommentReport,
} = require('../services/ForumReportServices');

/** Same response shape as the account, job and gig report endpoints. */
function sendReportError(res, error, label) {
  const status = error.statusCode || 500;
  if (status >= 500) console.error(`Error reporting forum ${label}:`, error);
  res.status(status).json({
    success: false,
    message: status >= 500 ? 'Failed to submit the report' : error.message,
    code: error.code || null,
  });
}

function sendReport(res, report) {
  res.status(201).json({ success: true, message: 'Report submitted', report });
}

async function createGroupReportController(req, res) {
  try {
    sendReport(res, await submitGroupReport(req.params.groupId, req.body, req.session));
  } catch (error) {
    sendReportError(res, error, 'group');
  }
}

async function createDiscussionReportController(req, res) {
  try {
    sendReport(res, await submitDiscussionReport(req.params.discussionId, req.body, req.session));
  } catch (error) {
    sendReportError(res, error, 'discussion');
  }
}

async function createCommentReportController(req, res) {
  try {
    const report = await submitCommentReport(
      req.params.discussionId,
      req.params.commentId,
      req.body,
      req.session
    );
    sendReport(res, report);
  } catch (error) {
    sendReportError(res, error, 'comment');
  }
}

async function createMemberReportController(req, res) {
  try {
    const report = await submitMemberReport(
      req.params.groupId,
      req.params.memberId,
      req.body,
      req.session
    );
    sendReport(res, report);
  } catch (error) {
    sendReportError(res, error, 'member');
  }
}

module.exports = {
  createGroupReportController,
  createMemberReportController,
  createDiscussionReportController,
  createCommentReportController,
};
