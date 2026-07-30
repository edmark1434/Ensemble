const {
  submitGroupReport,
  submitMemberReport,
  submitDiscussionReport,
} = require('../Services/ForumReportServices');

async function createGroupReportController(req, res) {
  try {
    const report = await submitGroupReport(req.params.groupId, req.body, req.session);
    res.status(201).json({ message: 'Report submitted successfully', report });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
}

async function createDiscussionReportController(req, res) {
  try {
    const report = await submitDiscussionReport(req.params.discussionId, req.body, req.session);
    res.status(201).json({ message: 'Report submitted successfully', report });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
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
    res.status(201).json({ message: 'Report submitted successfully', report });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
}

module.exports = {
  createGroupReportController,
  createMemberReportController,
  createDiscussionReportController,
};
