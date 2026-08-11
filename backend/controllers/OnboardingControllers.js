const { OnboardingError, getOnboardingState, savePersonalDetails, searchAddresses, issueAvatarUpload, saveAvatar, finalizeAvatarUpload, saveSurveyProgress, setCurrentStep, completeOnboarding } = require('../services/OnboardingServices');

function sendError(res, error) {
    const status = error instanceof OnboardingError ? error.statusCode : 500;
    if (!(error instanceof OnboardingError)) console.error('Onboarding error:', error);
    return res.status(status).json({ success: false, message: error.message || 'Onboarding request failed.', code: error.code || 'ONBOARDING_ERROR' });
}

async function getState(req, res) {
    try { return res.json({ success: true, ...(await getOnboardingState(req.session.userId)) }); }
    catch (error) { return sendError(res, error); }
}
async function savePersonal(req, res) {
    try { return res.json({ success: true, ...(await savePersonalDetails(req.session.userId, req.body)) }); }
    catch (error) { return sendError(res, error); }
}
async function getAddressSuggestions(req, res) {
    try { return res.json({ success: true, places: await searchAddresses(req.query.q) }); }
    catch (error) { return sendError(res, error); }
}
async function createAvatarUpload(req, res) {
    try { return res.json({ success: true, ...(await issueAvatarUpload(req.session.userId, req.body)) }); }
    catch (error) { return sendError(res, error); }
}
async function saveAvatarStep(req, res) {
    try { return res.json({ success: true, ...(await saveAvatar(req.session.userId, req.body)) }); }
    catch (error) { return sendError(res, error); }
}
async function finalizeAvatar(req, res) {
    try { return res.json({ success: true, ...(await finalizeAvatarUpload(req.session.userId, req.body)) }); }
    catch (error) { return sendError(res, error); }
}
async function saveSurvey(req, res) {
    try { return res.json({ success: true, ...(await saveSurveyProgress(req.session.userId, req.body)) }); }
    catch (error) { return sendError(res, error); }
}
async function changeStep(req, res) {
    try { return res.json({ success: true, ...(await setCurrentStep(req.session.userId, req.body.current_step)) }); }
    catch (error) { return sendError(res, error); }
}
async function finish(req, res) {
    try { return res.json({ success: true, ...(await completeOnboarding(req.session.userId, req.session.account_id || req.session.accountId, req.body)) }); }
    catch (error) { return sendError(res, error); }
}

module.exports = { getState, savePersonal, getAddressSuggestions, createAvatarUpload, saveAvatarStep, finalizeAvatar, saveSurvey, changeStep, finish };
