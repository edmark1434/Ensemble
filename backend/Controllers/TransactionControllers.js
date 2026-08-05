const {
    getCreditTransactionsService,
} = require('../Services/TransactionServices');

async function getCreditTransactionsController(req, res) {
    const accountId = req.session?.account_id;

    if (!accountId) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized. Account session not found.',
        });
    }

    try {
        const transactions = await getCreditTransactionsService(accountId);
        return res.status(200).json({ success: true, transactions });
    } catch (error) {
        console.error('Error fetching credit transactions:', error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode === 401
                ? error.message
                : 'Unable to load credit transactions.',
        });
    }
}

module.exports = { getCreditTransactionsController };
