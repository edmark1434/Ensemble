const {
  listWarningThresholdsService,
  createWarningThresholdService,
  updateWarningThresholdService,
  deleteWarningThresholdService,
} = require('../services/WarningThresholdServices');

function sendError(res, err, fallback) {
  if (err.statusCode) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }
  console.error(fallback, err);
  return res.status(500).json({ success: false, message: fallback });
}

async function getAdminWarningThresholds(req, res) {
  try {
    return res.status(200).json({ success: true, data: await listWarningThresholdsService() });
  } catch (err) {
    return sendError(res, err, 'Unable to load warning thresholds');
  }
}

async function postAdminWarningThreshold(req, res) {
  try {
    const data = await createWarningThresholdService(req.body || {});
    return res.status(201).json({ success: true, data, message: 'Threshold created' });
  } catch (err) {
    return sendError(res, err, 'Unable to create threshold');
  }
}

async function patchAdminWarningThreshold(req, res) {
  try {
    const data = await updateWarningThresholdService(
      req.params.thresholdId || req.params.warningThresholdId || req.params.id,
      req.body || {}
    );
    return res.status(200).json({ success: true, data, message: 'Threshold updated' });
  } catch (err) {
    return sendError(res, err, 'Unable to update threshold');
  }
}

async function deleteAdminWarningThreshold(req, res) {
  try {
    const data = await deleteWarningThresholdService(
      req.params.thresholdId || req.params.warningThresholdId || req.params.id
    );
    return res.status(200).json({ success: true, data, message: 'Threshold removed' });
  } catch (err) {
    return sendError(res, err, 'Unable to remove threshold');
  }
}

module.exports = {
  getAdminWarningThresholds,
  postAdminWarningThreshold,
  patchAdminWarningThreshold,
  deleteAdminWarningThreshold,
};
