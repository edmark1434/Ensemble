const TermsServices = require('../Services/TermsServices');

async function getAllTermsController(req, res) {
    try {
        const accountId = req.user?.accountId || req.user?.account_id;
        if (!accountId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const terms = await TermsServices.getAllTermsServices(accountId);
        res.status(200).json({ success: true, data: terms });
    } catch (err) {
        console.error('Error in getAllTermsController:', err);
        res.status(500).json({ success: false, message: err.message || 'Server Error' });
    }
}

async function createTermsController(req, res) {
    try {
        const accountId = req.user?.accountId || req.user?.account_id;
        if (!accountId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const terms = await TermsServices.createTermsServices(accountId, req.body);
        res.status(201).json({ success: true, data: terms, message: 'Template created successfully' });
    } catch (err) {
        console.error('Error in createTermsController:', err);
        res.status(400).json({ success: false, message: err.message || 'Bad Request' });
    }
}

async function updateTermsController(req, res) {
    try {
        const accountId = req.user?.accountId || req.user?.account_id;
        const { id } = req.params;
        if (!accountId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const terms = await TermsServices.updateTermsServices(id, accountId, req.body);
        res.status(200).json({ success: true, data: terms, message: 'Template updated successfully' });
    } catch (err) {
        console.error('Error in updateTermsController:', err);
        res.status(400).json({ success: false, message: err.message || 'Bad Request' });
    }
}

async function deleteTermsController(req, res) {
    try {
        const accountId = req.user?.accountId || req.user?.account_id;
        const { id } = req.params;
        if (!accountId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        await TermsServices.deleteTermsServices(id, accountId);
        res.status(200).json({ success: true, message: 'Template deleted successfully' });
    } catch (err) {
        console.error('Error in deleteTermsController:', err);
        res.status(400).json({ success: false, message: err.message || 'Bad Request' });
    }
}

module.exports = {
    getAllTermsController,
    createTermsController,
    updateTermsController,
    deleteTermsController
};
