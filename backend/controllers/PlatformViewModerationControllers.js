const {
  getPlatformViewContext,
  performPlatformViewAction,
} = require('../services/PlatformViewModerationServices');

function sendError(res, err, fallback) {
  const status = Number(err?.statusCode) || 500;
  if (status >= 500) {
    console.error(fallback, err);
    return res.status(500).json({ success: false, message: fallback });
  }
  return res.status(status).json({
    success: false,
    message: err.message || fallback,
    code: err.code || null,
    ...(err.details ? { details: err.details } : {}),
  });
}

/** `GET /api/staff/platform-view/context?path=&pick=`: what the shown page is about and what this staff member may do. */
async function getContext(req, res) {
  try {
    const data = await getPlatformViewContext(req.session, {
      path: typeof req.query?.path === 'string' ? req.query.path : '',
      pick: typeof req.query?.pick === 'string' ? req.query.pick : null,
    });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return sendError(res, err, 'Could not load moderation details for this page');
  }
}

/** `POST /api/staff/platform-view/actions`: one quick action (account, content, or both). */
async function postAction(req, res) {
  try {
    const body = req.body || {};
    const data = await performPlatformViewAction(req.session, {
      path: typeof body.path === 'string' ? body.path : '',
      pick: typeof body.pick === 'string' ? body.pick : null,
      subjectKey: typeof body.subjectKey === 'string' ? body.subjectKey : null,
      accountId: typeof body.accountId === 'string' ? body.accountId : null,
      accountAction: body.accountAction && typeof body.accountAction === 'object' ? body.accountAction : null,
      contentAction: typeof body.contentAction === 'string' ? body.contentAction : null,
      reason: typeof body.reason === 'string' ? body.reason : '',
      confirmRecent: body.confirmRecent === true,
    });
    return res.status(200).json({ success: true, data, message: data.message });
  } catch (err) {
    return sendError(res, err, 'The action could not be applied');
  }
}

module.exports = { getContext, postAction };
