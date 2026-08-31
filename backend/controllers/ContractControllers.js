const ContractRepositories = require('../repositories/ContractRepositories');
const { pool } = require('../lib/Database');
const { getIo } = require('../lib/WebSocket');
const { createNotificationServices } = require('../services/NotificationServices');
const { getAuthorizedActorAccountIds } = require('../services/MarketplaceActorServices');

async function sendJobOfferController(req, res) {
    try {
        // req.user from auth middleware (assuming verifyToken is used)
        const personalAccountId = req.user.account_id || req.user.accountId;
        const actorIds = await getAuthorizedActorAccountIds(personalAccountId);
        const { proposalId, rateCredits, startsAt } = req.body;

        if (!proposalId || !rateCredits) {
            return res.status(400).json({ success: false, message: 'Proposal ID and rate are required' });
        }

        const result = await ContractRepositories.sendJobOffer(actorIds, proposalId, rateCredits, startsAt);
        const clientId = result.client_account_id;

        try {
            const propQ = await pool.query(`
                SELECT p.freelancer_account_id, j.title, p.job_id 
                FROM proposals p 
                JOIN jobs j ON p.job_id = j.job_id 
                WHERE p.proposal_id = $1
            `, [proposalId]);
            const accQ = await pool.query('SELECT handle FROM accounts WHERE account_id = $1', [clientId]);
            
            if (propQ.rows[0] && accQ.rows[0]) {
                const freelancerAccQ = await pool.query('SELECT handle FROM accounts WHERE account_id = $1', [propQ.rows[0].freelancer_account_id]);
                if (freelancerAccQ.rows[0]) {
                    const { freelancer_account_id, title, job_id } = propQ.rows[0];
                    const clientHandle = accQ.rows[0].handle;
                    const freelancerHandle = freelancerAccQ.rows[0].handle;
                    const contractId = result.contract_id || result.id || proposalId;

                    const notif1 = await createNotificationServices({
                        message: `@${clientHandle} Sent you a Contract Offer for ${title}`,
                        reference_table: 'contracts',
                        reference_prefix: 'offer_received',
                        reference_path: `/jobs/proposals/sent/${proposalId}`,
                        reference_id: contractId,
                        account_id: freelancer_account_id
                    });

                    const notif2 = await createNotificationServices({
                        message: `You sent a Contract Offer to @${freelancerHandle} for ${title}`,
                        reference_table: 'contracts',
                        reference_prefix: 'offer_sent',
                        reference_path: `/jobs/proposals/incoming/${proposalId}`,
                        reference_id: contractId,
                        account_id: clientId
                    });

                    const io = getIo();
                    if (io) {
                        io.to(String(freelancer_account_id)).emit('notification', notif1);
                        io.to(String(clientId)).emit('notification', notif2);
                    }
                }
            }
        } catch (notifErr) {
            console.error('Error sending contract offer notification:', notifErr);
        }

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

        const actorIds = await getAuthorizedActorAccountIds(freelancerId);
        const result = await ContractRepositories.acceptJobOffer(actorIds, contractId);

        return res.status(200).json({
            success: true,
            message: 'Job offer accepted successfully',
            data: result
        });
    } catch (error) {
        console.error("Error in acceptJobOfferController:", error);
        
        const businessErrors = new Set([
            "Contract not found or not pending signature for this user",
            "Contract has an invalid rate",
            "Client escrow wallet not found",
            "Freelancer escrow wallet not found",
            "Escrow wallet is not active",
            "Client escrow balance is insufficient",
        ]);
        if (businessErrors.has(error.message)) {
            return res.status(400).json({ success: false, message: error.message });
        }

        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

async function getContractsController(req, res) {
    try {
        const accountId = req.user.account_id || req.user.accountId;
        const actorIds = await getAuthorizedActorAccountIds(accountId);
        const contracts = await ContractRepositories.getContractsByUserId(actorIds);
        return res.status(200).json({ success: true, data: contracts });
    } catch (error) {
        console.error("Error in getContractsController:", error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

async function rejectJobOfferController(req, res) {
    try {
        const freelancerId = req.user.account_id || req.user.accountId;
        const { contractId } = req.params;
        const { reason } = req.body;

        if (!contractId) {
            return res.status(400).json({ success: false, message: 'Contract ID is required' });
        }

        const actorIds = await getAuthorizedActorAccountIds(freelancerId);
        const result = await ContractRepositories.rejectJobOffer(actorIds, contractId, reason);

        return res.status(200).json({
            success: true,
            message: 'Job offer rejected successfully',
            data: result
        });
    } catch (error) {
        console.error("Error in rejectJobOfferController:", error);
        
        const businessErrors = new Set([
            "Contract not found or not pending signature for this user",
            "Contract has an invalid rate",
            "Client escrow wallet not found",
            "Freelancer escrow wallet not found",
            "Escrow wallet is not active",
            "Client escrow balance is insufficient",
        ]);
        if (businessErrors.has(error.message)) {
            return res.status(400).json({ success: false, message: error.message });
        }

        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

module.exports = {
    sendJobOfferController,
    acceptJobOfferController,
    rejectJobOfferController,
    getContractsController
};
