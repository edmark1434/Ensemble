const {
  listWarningCatalog,
  listWarningDefsService,
  createWarningDefService,
  updateWarningDefService,
  deleteWarningDefService,
} = require('../services/WarningDefServices');

function sendError(res, err, fallback) {
  if (err.statusCode) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }
  console.error(fallback, err);
  return res.status(500).json({ success: false, message: fallback });
}

async function getWarningCatalog(req, res) {
  try {
    const desk = req.query?.desk || req.query?.variant || 'admin';
    return res.status(200).json({ success: true, data: await listWarningCatalog(desk) });
  } catch (err) {
    return sendError(res, err, 'Unable to load warnings');
  }
}

async function getAdminWarningDefs(req, res) {
  try {
    return res.status(200).json({ success: true, data: await listWarningDefsService() });
  } catch (err) {
    return sendError(res, err, 'Unable to load warnings');
  }
}

async function postAdminWarningDef(req, res) {
  try {
    const data = await createWarningDefService(req.body || {});
    return res.status(201).json({ success: true, data, message: 'Warning created' });
  } catch (err) {
    return sendError(res, err, 'Unable to create warning');
  }
}

async function patchAdminWarningDef(req, res) {
  try {
    const data = await updateWarningDefService(req.params.warningDefId || req.params.id, req.body || {});
    return res.status(200).json({ success: true, data, message: 'Warning updated' });
  } catch (err) {
    return sendError(res, err, 'Unable to update warning');
  }
}

async function deleteAdminWarningDef(req, res) {
  try {
    const data = await deleteWarningDefService(req.params.warningDefId || req.params.id);
    return res.status(200).json({ success: true, data, message: 'Warning removed' });
  } catch (err) {
    return sendError(res, err, 'Unable to remove warning');
  }
}

module.exports = {
  getWarningCatalog,
  getAdminWarningDefs,
  postAdminWarningDef,
  patchAdminWarningDef,
  deleteAdminWarningDef,
};
