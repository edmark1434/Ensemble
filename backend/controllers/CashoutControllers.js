const { CashoutError, getWalletOverviewServices, searchPhilippineAddressesServices, createCashoutRecordsServices, handleCashoutWebhookServices } = require('../services/CashoutServices');

function sendError(res, error) {
    console.error('Cashout error:', error.response?.data || error);
    const status = error instanceof CashoutError ? error.statusCode : 500;
    return res.status(status).json({ success: false, error: error.message || 'Cashout request failed.', code: error.code || 'CASHOUT_ERROR', ...(error.details ? { details: error.details } : {}) });
}

async function getWalletOverviewController(req, res) {
    try {
        return res.json({ success: true, ...(await getWalletOverviewServices(req.session.userId, req.query)) });
    } catch (error) { return sendError(res, error); }
}

async function createCashoutRecordsController(req, res) {
    try {
        const result = await createCashoutRecordsServices({ ...req.body, user_id: req.session.userId });
        return res.status(result.duplicate ? 200 : 201).json(result);
    } catch (error) { return sendError(res, error); }
}

async function searchCashoutAddressesController(req, res) {
    try {
        return res.json({ success: true, addresses: await searchPhilippineAddressesServices(req.query.q) });
    } catch (error) { return sendError(res, error); }
}

async function cashoutWebhookController(req, res) {
    try {
        await handleCashoutWebhookServices(req.headers, req.body);
        return res.status(200).json({ received: true });
    } catch (error) { return sendError(res, error); }
}

module.exports = { getWalletOverviewController, searchCashoutAddressesController, createCashoutRecordsController, cashoutWebhookController };
