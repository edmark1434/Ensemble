const ContractRepositories = require('../repositories/ContractRepositories');
const { pool } = require('../lib/Database');
const { getIo } = require('../lib/WebSocket');
const { createNotificationServices } = require('../services/NotificationServices');
const { getAuthorizedActorAccountIds, getAffiliatedAccountIds } = require('../services/MarketplaceActorServices');
const {
    ContractSubcontractError,
    getContractTeamServices,
    addContractSubcontractorServices,
    removeContractSubcontractorServices,
    distributeContractFundsServices,
} = require('../services/ContractServices');

async function sendJobOfferController(req, res) {
    try {
        // req.user from auth middleware (assuming verifyToken is used)
        const personalAccountId = req.user.account_id || req.user.accountId;
        const actorIds = await getAuthorizedActorAccountIds(personalAccountId);
        const { proposalId, rateCredits, startsAt, milestones } = req.body;

        if (!proposalId || !rateCredits) {
            return res.status(400).json({ success: false, message: 'Proposal ID and rate are required' });
        }

        const result = await ContractRepositories.sendJobOffer(actorIds, proposalId, rateCredits, startsAt, milestones);
        const clientId = result.client_account_id;

        try {
            const propQ = await pool.query(`
                SELECT p.freelancer_account_id,
                       p.included_member_account_ids,
                       j.title,
                       p.job_id,
                       f_acc.display_name AS freelancer_name,
                       f_acc.handle AS freelancer_handle,
                       f_acc.type AS freelancer_type,
                       (
                           SELECT u_lead.account_id
                           FROM teams ft_lead
                           JOIN team_members tm_lead ON tm_lead.team_id = ft_lead.team_id AND tm_lead.status = 'Active' AND tm_lead.role = 'Owner'
                           JOIN users u_lead ON u_lead.user_id = tm_lead.user_id
                           WHERE ft_lead.account_id = p.freelancer_account_id AND ft_lead.deleted_at IS NULL
                           LIMIT 1
                       ) AS team_leader_account_id,
                       (
                           SELECT a_lead.display_name
                           FROM teams ft_lead
                           JOIN team_members tm_lead ON tm_lead.team_id = ft_lead.team_id AND tm_lead.status = 'Active' AND tm_lead.role = 'Owner'
                           JOIN users u_lead ON u_lead.user_id = tm_lead.user_id
                           JOIN accounts a_lead ON a_lead.account_id = u_lead.account_id
                           WHERE ft_lead.account_id = p.freelancer_account_id AND ft_lead.deleted_at IS NULL
                           LIMIT 1
                       ) AS team_leader_name
                FROM proposals p 
                JOIN jobs j ON p.job_id = j.job_id 
                LEFT JOIN accounts f_acc ON f_acc.account_id = p.freelancer_account_id
                WHERE p.proposal_id = $1
            `, [proposalId]);
            const accQ = await pool.query('SELECT handle, display_name FROM accounts WHERE account_id = $1', [clientId]);
            
            if (propQ.rows[0] && accQ.rows[0]) {
                const {
                    freelancer_account_id,
                    included_member_account_ids,
                    title,
                    freelancer_name,
                    freelancer_handle,
                    freelancer_type,
                    team_leader_account_id,
                    team_leader_name,
                } = propQ.rows[0];
                const clientHandle = accQ.rows[0].handle;
                const contractId = result.contract_id || result.id || proposalId;
                const io = getIo();

                const isTeamProposal = freelancer_type === 'Team' || Boolean(team_leader_account_id);

                if (isTeamProposal && team_leader_account_id) {
                    const teamDisplay = freelancer_name || `@${freelancer_handle}`;
                    const leaderName = team_leader_name || 'your Team Leader';

                    // 1. Notify the Team Leader directly to review & accept the contract offer
                    const leaderNotif = await createNotificationServices({
                        message: `@${clientHandle} sent a Contract Offer to your team ${teamDisplay} for "${title}". As Team Leader, review and accept the offer.`,
                        reference_table: 'contracts',
                        reference_prefix: 'offer_received',
                        reference_path: `/jobs/proposals/sent/${proposalId}/offer/${contractId}`,
                        reference_id: contractId,
                        account_id: team_leader_account_id,
                    });
                    if (io) io.to(String(team_leader_account_id)).emit('notification', leaderNotif);

                    // 2. Notify all other included team members that the offer was sent to their Team Leader
                    const rawIncluded = Array.isArray(included_member_account_ids)
                        ? included_member_account_ids
                        : [];
                    const otherMemberIds = Array.from(new Set(rawIncluded.map(String))).filter(
                        (mId) => mId && mId !== String(team_leader_account_id)
                    );

                    for (const memberAccId of otherMemberIds) {
                        const memberNotif = await createNotificationServices({
                            message: `@${clientHandle} sent a Contract Offer for "${title}" to your Team Leader (${leaderName}) on team ${teamDisplay}. Once accepted, your copy of the contract will be issued.`,
                            reference_table: 'contracts',
                            reference_prefix: 'offer_received_member_info',
                            reference_path: `/jobs/proposals/sent/${proposalId}`,
                            reference_id: contractId,
                            account_id: memberAccId,
                        });
                        if (io) io.to(String(memberAccId)).emit('notification', memberNotif);
                    }
                } else {
                    const notif1 = await createNotificationServices({
                        message: `@${clientHandle} Sent you a Contract Offer for ${title}`,
                        reference_table: 'contracts',
                        reference_prefix: 'offer_received',
                        reference_path: `/jobs/proposals/sent/${proposalId}/offer/${contractId}`,
                        reference_id: contractId,
                        account_id: freelancer_account_id,
                    });
                    if (io) io.to(String(freelancer_account_id)).emit('notification', notif1);
                }

                const notif2 = await createNotificationServices({
                    message: `You sent a Contract Offer to @${freelancer_handle} for ${title}`,
                    reference_table: 'contracts',
                    reference_prefix: 'offer_sent',
                    reference_path: `/jobs/proposals/incoming/${proposalId}`,
                    reference_id: contractId,
                    account_id: clientId,
                });
                if (io) io.to(String(clientId)).emit('notification', notif2);
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

        try {
            const propQ = await pool.query(`
                SELECT j.client_account_id,
                       j.title,
                       p.freelancer_account_id,
                       p.included_member_account_ids,
                       f_acc.display_name AS freelancer_name,
                       f_acc.handle AS freelancer_handle,
                       f_acc.type AS freelancer_type,
                       (
                           SELECT u_lead.account_id
                           FROM teams ft_lead
                           JOIN team_members tm_lead ON tm_lead.team_id = ft_lead.team_id AND tm_lead.status = 'Active' AND tm_lead.role = 'Owner'
                           JOIN users u_lead ON u_lead.user_id = tm_lead.user_id
                           WHERE ft_lead.account_id = p.freelancer_account_id AND ft_lead.deleted_at IS NULL
                           LIMIT 1
                       ) AS team_leader_account_id
                FROM job_contracts jc 
                JOIN proposals p ON jc.proposal_id = p.proposal_id 
                JOIN jobs j ON p.job_id = j.job_id 
                LEFT JOIN accounts f_acc ON f_acc.account_id = p.freelancer_account_id
                WHERE jc.contract_id = $1
            `, [contractId]);

            if (propQ.rows[0]) {
                const {
                    client_account_id,
                    title,
                    freelancer_handle,
                    freelancer_name,
                    included_member_account_ids,
                    team_leader_account_id,
                } = propQ.rows[0];
                const io = getIo();

                if (freelancer_handle) {
                    const notif = await createNotificationServices({
                        message: `@${freelancer_handle} accepted your contract offer for ${title}`,
                        reference_table: 'contracts',
                        reference_prefix: 'offer_accepted',
                        reference_path: `/contracts/${contractId}`,
                        reference_id: contractId,
                        account_id: client_account_id,
                    });
                    if (io) {
                        io.to(String(client_account_id)).emit('notification', notif);
                    }
                }

                // Notify all other included team members that their Team Leader accepted and their contract copy is ready
                const rawIncluded = Array.isArray(included_member_account_ids)
                    ? included_member_account_ids
                    : [];
                const otherMemberIds = Array.from(new Set(rawIncluded.map(String))).filter(
                    (mId) => mId && mId !== String(team_leader_account_id || freelancerId)
                );
                for (const memberAccId of otherMemberIds) {
                    const memberNotif = await createNotificationServices({
                        message: `Your Team Leader accepted the contract offer for "${title}" (${freelancer_name || 'Team'}). Your official copy of the contract is now active in My Contracts.`,
                        reference_table: 'contracts',
                        reference_prefix: 'offer_accepted',
                        reference_path: `/contracts/${contractId}`,
                        reference_id: contractId,
                        account_id: memberAccId,
                    });
                    if (io) io.to(String(memberAccId)).emit('notification', memberNotif);
                }
            }
        } catch (notifErr) {
            console.error('Error sending contract acceptance notification:', notifErr);
        }

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

async function createContractDisputeController(req, res) {
    try {
        const personalAccountId = req.user.account_id || req.user.accountId;
        const actorIds = await getAuthorizedActorAccountIds(personalAccountId);
        const { contractId } = req.params;
        const { reason, details } = req.body;

        if (!contractId) {
            return res.status(400).json({ success: false, message: 'Contract ID is required' });
        }
        if (!reason || !details) {
            return res.status(400).json({ success: false, message: 'Dispute reason and details are required' });
        }

        const dispute = await ContractRepositories.createContractDispute(actorIds, contractId, { reason, details });
        return res.status(201).json({
            success: true,
            message: 'Dispute submitted successfully',
            data: dispute
        });
    } catch (err) {
        console.error('Error creating contract dispute:', err);
        const status = Number(err.statusCode) || (String(err.message || '').includes('Unauthorized') ? 403 : 500);
        return res.status(status).json({
            success: false,
            message: err.message || 'Internal server error'
        });
    }
}

async function extendContractDeadlineController(req, res) {
    try {
        const personalAccountId = req.user.account_id || req.user.accountId;
        const { contractId } = req.params;
        const { extensionDays } = req.body;

        if (!contractId) {
            return res.status(400).json({ success: false, message: 'Contract ID is required' });
        }
        if (!extensionDays || isNaN(Number(extensionDays))) {
            return res.status(400).json({ success: false, message: 'extensionDays must be a number' });
        }

        const actorIds = await getAuthorizedActorAccountIds(personalAccountId);
        const { extendContractDeadlineService } = require('../services/MilestoneServices');
        const result = await extendContractDeadlineService(contractId, actorIds[0], Number(extensionDays));

        return res.status(200).json({
            success: true,
            message: `Contract deadline extended by ${extensionDays} day(s).`,
            data: result,
        });
    } catch (err) {
        console.error('extendContractDeadlineController error:', err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || 'Internal server error',
        });
    }
}

async function cancelContractController(req, res) {
    try {
        const personalAccountId = req.user.account_id || req.user.accountId;
        const { contractId } = req.params;

        if (!contractId) {
            return res.status(400).json({ success: false, message: 'Contract ID is required' });
        }

        const actorIds = await getAuthorizedActorAccountIds(personalAccountId);
        const { cancelContractService } = require('../services/MilestoneServices');
        const result = await cancelContractService(contractId, actorIds[0]);

        return res.status(200).json({
            success: true,
            message: result.isPartial
                ? `Contract closed. ${result.refundedCredits} credits for unfinished milestones were refunded to your wallet.`
                : `Contract cancelled. ${result.refundedCredits} credits were refunded to your wallet.`,
            data: result,
        });
    } catch (err) {
        console.error('cancelContractController error:', err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || 'Internal server error',
        });
    }
}

async function createCancellationRequestController(req, res) {
    try {
        const personalAccountId = req.user.account_id || req.user.accountId;
        const { contractId } = req.params;
        const { reason, message, autoCancelHours } = req.body;

        if (!contractId) {
            return res.status(400).json({ success: false, message: 'Contract ID is required' });
        }
        if (!reason || !message) {
            return res.status(400).json({ success: false, message: 'Reason and message are required' });
        }

        const actorIds = await getAuthorizedActorAccountIds(personalAccountId);
        const { requestContractCancellationService } = require('../services/MilestoneServices');
        const request = await requestContractCancellationService({
            contractId,
            callerAccountId: actorIds[0],
            reason,
            message,
            autoCancelHours: autoCancelHours ? Number(autoCancelHours) : 72,
        });

        return res.status(201).json({
            success: true,
            message: 'Mutual cancellation request submitted successfully. The counterparty has 72 hours to respond.',
            data: request,
        });
    } catch (err) {
        console.error('createCancellationRequestController error:', err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || 'Internal server error',
        });
    }
}

async function getCancellationRequestController(req, res) {
    try {
        const personalAccountId = req.user.account_id || req.user.accountId;
        const { contractId } = req.params;

        const affiliatedIds = await getAffiliatedAccountIds(personalAccountId);
        const { getActiveCancellationRequestService } = require('../services/MilestoneServices');
        const request = await getActiveCancellationRequestService(contractId, affiliatedIds);

        return res.status(200).json({
            success: true,
            data: request,
        });
    } catch (err) {
        console.error('getCancellationRequestController error:', err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || 'Internal server error',
        });
    }
}

async function respondCancellationRequestController(req, res) {
    try {
        const personalAccountId = req.user.account_id || req.user.accountId;
        const { contractId, requestId } = req.params;
        const { action, declineReason } = req.body;

        if (!['accept', 'decline'].includes(action)) {
            return res.status(400).json({ success: false, message: 'Action must be "accept" or "decline"' });
        }

        const actorIds = await getAuthorizedActorAccountIds(personalAccountId);
        const { respondContractCancellationService } = require('../services/MilestoneServices');
        const result = await respondContractCancellationService({
            contractId,
            requestId,
            callerAccountId: actorIds[0],
            action,
            declineReason,
        });

        return res.status(200).json({
            success: true,
            message: action === 'accept'
                ? 'Cancellation request accepted. The contract has ended and escrow has been settled.'
                : 'Cancellation request declined. The contract remains active.',
            data: result,
        });
    } catch (err) {
        console.error('respondCancellationRequestController error:', err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || 'Internal server error',
        });
    }
}

async function withdrawCancellationRequestController(req, res) {
    try {
        const personalAccountId = req.user.account_id || req.user.accountId;
        const { contractId, requestId } = req.params;

        const actorIds = await getAuthorizedActorAccountIds(personalAccountId);
        const { withdrawContractCancellationService } = require('../services/MilestoneServices');
        const result = await withdrawContractCancellationService({
            contractId,
            requestId,
            callerAccountId: actorIds[0],
        });

        return res.status(200).json({
            success: true,
            message: 'Cancellation request withdrawn successfully.',
            data: result,
        });
    } catch (err) {
        console.error('withdrawCancellationRequestController error:', err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || 'Internal server error',
        });
    }
}

async function getContractTeamController(req, res) {
    try {
        const personalAccountId = req.user?.account_id || req.user?.accountId;
        const affiliatedIds = await getAffiliatedAccountIds(personalAccountId);
        const data = await getContractTeamServices(req.params.contractId, affiliatedIds);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('getContractTeamController error:', err);
        return res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Internal server error' });
    }
}

async function addContractSubcontractorController(req, res) {
    try {
        const actorAccountId = req.session?.account_id || req.user?.account_id || req.user?.accountId;
        const data = await addContractSubcontractorServices(req.params.contractId, actorAccountId, req.body);
        return res.status(201).json({ success: true, message: 'Team member added successfully', data });
    } catch (err) {
        console.error('addContractSubcontractorController error:', err);
        return res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Internal server error' });
    }
}

async function removeContractSubcontractorController(req, res) {
    try {
        const actorAccountId = req.session?.account_id || req.user?.account_id || req.user?.accountId;
        const data = await removeContractSubcontractorServices(req.params.contractId, actorAccountId, req.params.memberAccountId);
        return res.status(200).json({ success: true, message: 'Team member removed successfully', data });
    } catch (err) {
        console.error('removeContractSubcontractorController error:', err);
        return res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Internal server error' });
    }
}

async function distributeContractFundsController(req, res) {
    try {
        const actorAccountId = req.session?.account_id || req.user?.account_id || req.user?.accountId;
        const data = await distributeContractFundsServices(req.params.contractId, actorAccountId, req.body);
        return res.status(200).json({ success: true, message: 'Contract funds distributed successfully', data });
    } catch (err) {
        console.error('distributeContractFundsController error:', err);
        return res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Internal server error' });
    }
}

module.exports = {
    sendJobOfferController,
    acceptJobOfferController,
    rejectJobOfferController,
    getContractsController,
    createContractDisputeController,
    extendContractDeadlineController,
    cancelContractController,
    createCancellationRequestController,
    getCancellationRequestController,
    respondCancellationRequestController,
    withdrawCancellationRequestController,
    getContractTeamController,
    addContractSubcontractorController,
    removeContractSubcontractorController,
    distributeContractFundsController,
};
