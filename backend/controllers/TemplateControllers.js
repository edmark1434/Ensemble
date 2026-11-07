const { getTemplateUseDetails, getTemplatePreviewDetails, useTemplate } = require('../services/TemplateServices');

function handleError(res, error) {
  const status = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  if (status >= 500) console.error('Template use failed:', error.code || error.name);
  return res.status(status).json({ error: status >= 500 ? 'Unable to create a project from this template. Please try again.' : error.message });
}

async function getTemplateUseController(req, res) {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(await getTemplateUseDetails(req.params.assetId, req.user.account_id));
  } catch (error) { return handleError(res, error); }
}

async function getTemplatePreviewController(req, res) {
  try {
    res.set('Cache-Control', 'private, no-store');
    return res.json(await getTemplatePreviewDetails(req.params.assetId, req.user?.account_id));
  } catch (error) { return handleError(res, error); }
}

async function useTemplateController(req, res) {
  try { return res.json(await useTemplate(req.params.assetId, req.user.account_id, req.body || {})); }
  catch (error) { return handleError(res, error); }
}

module.exports = { getTemplatePreviewController, getTemplateUseController, useTemplateController };
