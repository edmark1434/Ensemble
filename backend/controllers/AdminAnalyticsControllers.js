const {
  AnalyticsServiceError,
  getAdminAnalyticsOverviewService,
  listFinanceRecordsService,
  exportFinanceRecordsService,
  getFinanceFilterOptionsService,
} = require('../services/AdminAnalyticsServices');

function sendError(res, err, fallbackMessage) {
  if (err instanceof AnalyticsServiceError) {
    return res.status(err.statusCode).json({ success: false, code: err.code, message: err.message });
  }
  console.error(`${fallbackMessage}:`, err);
  return res.status(500).json({ success: false, message: fallbackMessage });
}

async function getAdminAnalyticsOverview(req, res) {
  try {
    const data = await getAdminAnalyticsOverviewService(req.query);
    res.set('Cache-Control', 'no-store');
    res.status(200).json({ success: true, data });
  } catch (err) {
    sendError(res, err, 'Failed to load analytics');
  }
}

async function getAdminFinanceRecords(req, res) {
  try {
    if (req.query.format === 'csv') {
      const file = await exportFinanceRecordsService(req.params.kind, req.query);
      res.set('Cache-Control', 'no-store');
      res.set('X-Export-Rows', String(file.rows));
      res.set('X-Export-Total', String(file.total));
      res.attachment(file.filename);
      res.type('text/csv; charset=utf-8');
      return res.status(200).send(file.csv);
    }
    const data = await listFinanceRecordsService(req.params.kind, req.query);
    res.set('Cache-Control', 'no-store');
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return sendError(res, err, 'Failed to load finance records');
  }
}

async function getAdminFinanceFilterOptions(req, res) {
  try {
    const data = await getFinanceFilterOptionsService();
    res.status(200).json({ success: true, data });
  } catch (err) {
    sendError(res, err, 'Failed to load finance filters');
  }
}

module.exports = {
  getAdminAnalyticsOverview,
  getAdminFinanceRecords,
  getAdminFinanceFilterOptions,
};
