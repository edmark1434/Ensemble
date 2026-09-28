const { getAdminUserSurveyResponses } = require('../repositories/AdminSurveyRepositories');

async function getAdminSurveyResponsesController(req, res) {
  try {
    const data = await getAdminUserSurveyResponses();
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching survey responses:', err);
    res.status(500).json({ success: false, message: 'Failed to load survey responses' });
  }
}

module.exports = {
  getAdminSurveyResponsesController,
};
