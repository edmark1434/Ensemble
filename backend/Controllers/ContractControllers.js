const ContractRepositories = require('../Repositories/ContractRepositories');

async function sendJobOfferController(req, res) {
    try {
        // req.user from auth middleware (assuming verifyToken is used)
        const clientId = req.user.accountId;
        const { proposalId, rateCredits, startsAt } = req.body;

        if (!proposalId || !rateCredits) {
            return res.status(400).json({ success: false, message: 'Proposal ID and rate are required' });
        }

        const result = await ContractRepositories.sendJobOffer(clientId, proposalId, rateCredits, startsAt);

        return res.status(200).json({
            success: true,
            message: 'Job offer sent successfully',
            data: result
        });
    } catch (error) {
        console.error("Error in sendJobOfferController:", error);
        
        // Handle specific business logic errors
        if (error.message === "Proposal not found or unauthorized" || 
            error.message === "Client wallet not found" || 
            error.message === "Insufficient balance for escrow funding") {
            return res.status(400).json({ success: false, message: error.message });
        }

        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

async function acceptJobOfferController(req, res) {
    try {
        const freelancerId = req.user.account_id || req.user.accountId;
        const { contractId } = req.params;

        if (!contractId) {
            return res.status(400).json({ success: false, message: 'Contract ID is required' });
        }

        const result = await ContractRepositories.acceptJobOffer(freelancerId, contractId);

        return res.status(200).json({
            success: true,
            message: 'Job offer accepted successfully',
            data: result
        });
    } catch (error) {
        console.error("Error in acceptJobOfferController:", error);
        
        if (error.message === "Contract not found or not pending signature for this user") {
            return res.status(400).json({ success: false, message: error.message });
        }

        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

async function getContractsController(req, res) {
    try {
        const accountId = req.user.account_id || req.user.accountId;
        const contracts = await ContractRepositories.getContractsByUserId(accountId);
        return res.status(200).json({ success: true, data: contracts });
    } catch (error) {
        console.error("Error in getContractsController:", error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

module.exports = {
    sendJobOfferController,
    acceptJobOfferController,
    getContractsController
};
