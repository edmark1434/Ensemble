const {
  listPunishmentCatalog,
  listPunishmentDefsService,
  createPunishmentDefService,
  updatePunishmentDefService,
  deletePunishmentDefService,
} = require('../services/PunishmentDefServices');

function sendError(res, err, fallback) {
  if (err.statusCode) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }
  console.error(fallback, err);
  return res.status(500).json({ success: false, message: fallback });
}

async function getPunishmentCatalog(req, res) {
  try {
    const desk = req.query?.desk || req.query?.variant || 'admin';
    const kind = req.query?.kind || '';
    return res.status(200).json({ success: true, data: await listPunishmentCatalog(desk, kind) });
  } catch (err) {
    return sendError(res, err, 'Unable to load punishments');
  }
}

async function getAdminPunishmentDefs(req, res) {
  try {
    return res.status(200).json({ success: true, data: await listPunishmentDefsService() });
  } catch (err) {
    return sendError(res, err, 'Unable to load punishments');
  }
}

async function postAdminPunishmentDef(req, res) {
  try {
    const data = await createPunishmentDefService(req.body || {});
    return res.status(201).json({ success: true, data, message: 'Punishment created' });
  } catch (err) {
    return sendError(res, err, 'Unable to create punishment');
  }
}

async function patchAdminPunishmentDef(req, res) {
  try {
    const data = await updatePunishmentDefService(req.params.punishmentDefId || req.params.id, req.body || {});
    return res.status(200).json({ success: true, data, message: 'Punishment updated' });
  } catch (err) {
    return sendError(res, err, 'Unable to update punishment');
  }
}

async function deleteAdminPunishmentDef(req, res) {
  try {
    const data = await deletePunishmentDefService(req.params.punishmentDefId || req.params.id);
    return res.status(200).json({ success: true, data, message: 'Punishment removed' });
  } catch (err) {
    return sendError(res, err, 'Unable to remove punishment');
  }
}

module.exports = {
  getPunishmentCatalog,
  getAdminPunishmentDefs,
  postAdminPunishmentDef,
  patchAdminPunishmentDef,
  deleteAdminPunishmentDef,
};
