// backend/controllers/GigControllers.js
const { 
    createGigRepository, 
    getAllGigsRepository,
    toggleGigSaveRepository,
    getSavedGigsRepository,
    editGigOrderRepository,
    submitGigOrderRepository,
    getIncomingOrdersRepository,
    getMyOrdersRepository,
    getOrderByIdRepository,
    getGigByIdRepository,
    updateGigRepository,
    deleteGigRepository,
    acceptGigOrderRepository,
    rejectGigOrderRepository,
    withdrawGigOrderRepository
} = require('../repositories/GigRepositories');
const {
    resolveMarketplaceActor,
    getAuthorizedActorAccountIds,
    getAffiliatedAccountIds,
    MarketplaceActorError
} = require('../services/MarketplaceActorServices');
const { pool } = require('../lib/Database');
const { getIo } = require('../lib/WebSocket');
const { createNotificationServices } = require('../services/NotificationServices');
const {
    shortlistGigOrderService,
    unshortlistGigOrderService,
    acceptGigOrderService,
    confirmGigOrderContractService,
    toggleGigStatusService
} = require('../services/GigServices');

function sendControllerError(res, error, fallbackMessage) {
    if (error instanceof MarketplaceActorError || error.statusCode) {
        return res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: fallbackMessage });
}

async function createGigController(req, res) {
    try {
        const personalAccountId = req.user?.account_id;
        const actor = await resolveMarketplaceActor(
            personalAccountId,
            req.body.acting_team_id,
            { allowUnverifiedTeam: true }
        );
        const freelancer_account_id = actor.accountId;
        if (!freelancer_account_id) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const {
            title, description, category, slots, termsOfService, firstDraftDelivery,
            additionalWorkRate, tiers, addOns, milestones, questionnaires, skills,
            thumbnailFileId, galleryFileIds
        } = req.body;

        if (!title || !description || !tiers) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        if (title.trim().length > 255) {
            return res.status(400).json({ success: false, message: 'Service title cannot exceed 255 characters' });
        }

        const gigData = {
            payer_account_id: personalAccountId,
            acting_team_id: actor.teamId || null,
            freelancer_account_id, title, description, category, slots, termsOfService,
            firstDraftDelivery, additionalWorkRate, tiers, addOns, milestones, questionnaires,
            skills, thumbnailFileId, galleryFileIds
        };

        const gigId = await createGigRepository(gigData);
        try {
            require('../services/BadgeServices').scheduleBadgeEvaluation(freelancer_account_id);
        } catch (badgeErr) {
            console.error('Badge evaluation after gig create failed:', badgeErr.message);
        }
        res.status(201).json({ success: true, message: 'Gig created successfully', gigId });
    } catch (error) {
        console.error("Error in createGigController:", error);
        sendControllerError(res, error, 'Internal Server Error');
    }
}

async function getAllGigsController(req, res) {
    try {
        const personalAccountId = req.user?.account_id;
        const actorIds = personalAccountId ? await getAuthorizedActorAccountIds(personalAccountId) : [];
        const affiliatedAccountIds = personalAccountId ? await getAffiliatedAccountIds(personalAccountId) : [];
        const gigs = await getAllGigsRepository(req.query, personalAccountId, actorIds, affiliatedAccountIds);
        res.status(200).json({ success: true, data: gigs });
    } catch (error) {
        console.error("Error in getAllGigsController:", error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

async function toggleGigSaveController(req, res) {
    try {
        const result = await toggleGigSaveRepository(req.params.id, req.user.account_id);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error("Error in toggleGigSaveController:", error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

async function getSavedGigsController(req, res) {
    try {
        const gigs = await getSavedGigsRepository(req.user.account_id);
        res.status(200).json({ success: true, data: gigs });
    } catch (error) {
        console.error("Error in getSavedGigsController:", error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}


async function editGigOrderController(req, res) {
    try {
        const actorIds = await getAuthorizedActorAccountIds(req.user.account_id);
        await editGigOrderRepository(req.params.orderId, actorIds, req.body);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error in editGigOrderController:', error);
        res.status(500).json({ success: false, message: 'Failed to edit gig order' });
    }
}


async function submitGigOrderController(req, res) {
    try {
        const actor = await resolveMarketplaceActor(req.user.account_id, req.body.acting_team_id);
        const affiliatedAccountIds = await getAffiliatedAccountIds(req.user.account_id);
        const result = await submitGigOrderRepository(actor.accountId, req.params.id, req.body, affiliatedAccountIds);
        const { requestId, freelancerAccountId, gigTitle } = result;

        // Notify the freelancer or team leader and team members
        try {
            const teamCheck = await pool.query(`
                SELECT t.team_id, t.account_id, a.display_name AS team_name
                FROM teams t
                JOIN accounts a ON a.account_id = t.account_id
                WHERE t.account_id = $1 AND t.deleted_at IS NULL
            `, [freelancerAccountId]);

            const io = getIo();

            if (teamCheck.rows.length > 0) {
                const team = teamCheck.rows[0];
                const membersRes = await pool.query(`
                    SELECT u.account_id, tm.role, tm.status
                    FROM team_members tm
                    JOIN users u ON u.user_id = tm.user_id
                    WHERE tm.team_id = $1 AND tm.status = 'Active'
                `, [team.team_id]);

                const ownerMember = membersRes.rows.find(m => m.role === 'Owner');
                const otherMembers = membersRes.rows.filter(m => m.role !== 'Owner');

                // 1. Team leader gets the order request to manage/accept
                if (ownerMember) {
                    const ownerNotif = await createNotificationServices({
                        account_id: ownerMember.account_id,
                        message: `New team order received: You have a new order for team service '${gigTitle}'.`,
                        reference_table: 'gig_requests',
                        reference_prefix: 'new_order',
                        reference_path: `/gigs/orders/incoming/${req.params.id}`,
                        reference_id: requestId
                    });
                    if (io && ownerNotif) {
                        io.to(String(ownerMember.account_id)).emit('notification', ownerNotif);
                    }
                }

                const teamNotif = await createNotificationServices({
                    account_id: team.account_id,
                    message: `New order request received for team service '${gigTitle}'.`,
                    reference_table: 'gig_requests',
                    reference_prefix: 'new_order',
                    reference_path: `/gigs/orders/incoming/${req.params.id}`,
                    reference_id: requestId
                });
                if (io && teamNotif) {
                    io.to(String(team.account_id)).emit('notification', teamNotif);
                }

                // 2. Rest of the team gets notified about the order in teams
                for (const member of otherMembers) {
                    try {
                        const memberNotif = await createNotificationServices({
                            account_id: member.account_id,
                            message: `New team order: An order was placed for team service '${gigTitle}'.`,
                            reference_table: 'teams',
                            reference_prefix: 'team_order',
                            reference_path: `/teams/${team.team_id}?tab=services`,
                            reference_id: requestId
                        });
                        if (io && memberNotif) {
                            io.to(String(member.account_id)).emit('notification', memberNotif);
                        }
                    } catch (mErr) {
                        console.error('Error notifying team member:', mErr);
                    }
                }
            } else {
                const notif = await createNotificationServices({
                    account_id: freelancerAccountId,
                    message: `You have a new order request for your gig '${gigTitle}'.`,
                    reference_table: 'gig_requests',
                    reference_prefix: 'new_order',
                    reference_path: `/gigs/orders/incoming/${req.params.id}`,
                    reference_id: requestId
                });
                if (io && notif) {
                    io.to(String(freelancerAccountId)).emit('notification', notif);
                }
            }
        } catch (notifErr) {
            console.error('Error sending new gig order notification:', notifErr);
        }

        res.status(201).json({ success: true, requestId });
    } catch (error) {
        console.error("Error in submitGigOrderController:", error);
        sendControllerError(res, error, 'Internal Server Error');
    }
}

async function getIncomingOrdersController(req, res) {
    try {
        const actorIds = await getAuthorizedActorAccountIds(req.user.account_id);
        const orders = await getIncomingOrdersRepository(actorIds);
        res.status(200).json({ success: true, data: orders });
    } catch (error) {
        console.error("Error in getIncomingOrdersController:", error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

async function getMyOrdersController(req, res) {
    try {
        const actorIds = await getAuthorizedActorAccountIds(req.user.account_id);
        const orders = await getMyOrdersRepository(actorIds);
        res.status(200).json({ success: true, data: orders });
    } catch (error) {
        console.error("Error in getMyOrdersController:", error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

async function getOrderByIdController(req, res) {
    try {
        const actorIds = await getAuthorizedActorAccountIds(req.user.account_id);
        const order = await getOrderByIdRepository(req.params.orderId, actorIds);
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
        res.status(200).json({ success: true, data: order });
    } catch (error) {
        console.error("Error in getOrderByIdController:", error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

async function getGigByIdController(req, res) {
    try {
        const personalAccountId = req.user?.account_id;
        const actorIds = personalAccountId ? await getAuthorizedActorAccountIds(personalAccountId) : [];
        const affiliatedAccountIds = personalAccountId ? await getAffiliatedAccountIds(personalAccountId) : [];
        const gig = await getGigByIdRepository(req.params.id, personalAccountId, actorIds, affiliatedAccountIds);
        if (!gig) {
            return res.status(404).json({ success: false, message: 'Gig not found' });
        }
        res.status(200).json({ success: true, data: gig });
    } catch (error) {
        console.error("Error in getGigByIdController:", error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

async function updateGigController(req, res) {
    try {
        const freelancer_account_id = req.user?.account_id;
        const actorIds = await getAuthorizedActorAccountIds(freelancer_account_id);
        const gigId = req.params.id;
        if (!freelancer_account_id) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const {
            title, description, category, slots, termsOfService, firstDraftDelivery,
            additionalWorkRate, tiers, milestones, questionnaires, skills,
            thumbnailFileId, galleryFileIds
        } = req.body;

        if (!title || !description || !tiers) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        if (title.trim().length > 255) {
            return res.status(400).json({ success: false, message: 'Service title cannot exceed 255 characters' });
        }

        const gigData = {
            freelancer_account_id, title, description, category, slots, termsOfService,
            firstDraftDelivery, additionalWorkRate, tiers, milestones, questionnaires,
            skills, thumbnailFileId, galleryFileIds
        };

        await updateGigRepository(gigId, actorIds, gigData);
        res.status(200).json({ success: true, message: 'Gig updated successfully', gigId });
    } catch (error) {
        console.error('Error in updateGigController:', error);
        res.status(500).json({ success: false, message: 'Failed to update gig' });
    }
}

async function deleteGigController(req, res) {
    try {
        const freelancer_account_id = req.user?.account_id;
        const gigId = req.params.id;

        if (!freelancer_account_id) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const actorIds = await getAuthorizedActorAccountIds(freelancer_account_id);
        await deleteGigRepository(gigId, actorIds);
        res.status(200).json({ success: true, message: 'Gig successfully deleted' });
    } catch (error) {
        console.error("Error in deleteGigController:", error);
        res.status(500).json({ success: false, message: 'Failed to delete gig' });
    }
}

async function acceptGigOrderController(req, res) {
    try {
        const freelancer_account_id = req.user?.account_id;
        const orderId = req.params.orderId;

        if (!freelancer_account_id) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const actorIds = await getAuthorizedActorAccountIds(freelancer_account_id);
        const result = await acceptGigOrderService(orderId, actorIds);

        res.status(200).json({ success: true, message: 'Gig order accepted successfully', ...result });
    } catch (error) {
        console.error("Error in acceptGigOrderController:", error);
        res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Failed to accept gig order' });
    }
}

async function confirmGigOrderContractController(req, res) {
    try {
        const client_account_id = req.user?.account_id;
        const orderId = req.params.orderId;

        if (!client_account_id) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const actorIds = await getAuthorizedActorAccountIds(client_account_id);
        const result = await confirmGigOrderContractService(orderId, actorIds);

        res.status(200).json({ success: true, message: 'Gig contract confirmed and funded successfully', contractId: result.contractId });
    } catch (error) {
        console.error("Error in confirmGigOrderContractController:", error);
        res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Failed to confirm gig contract' });
    }
}

async function rejectGigOrderController(req, res) {
    try {
        const freelancer_account_id = req.user?.account_id;
        const orderId = req.params.orderId;
        const { reason } = req.body;

        if (!freelancer_account_id) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const actorIds = await getAuthorizedActorAccountIds(freelancer_account_id);
        await rejectGigOrderRepository(orderId, actorIds, reason);
        res.status(200).json({ success: true, message: 'Gig order rejected successfully' });
    } catch (error) {
        console.error("Error in rejectGigOrderController:", error);
        res.status(500).json({ success: false, message: error.message || 'Failed to reject gig order' });
    }
}

async function withdrawGigOrderController(req, res) {
    try {
        const client_account_id = req.user?.account_id;
        const orderId = req.params.orderId;

        if (!client_account_id) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const actorIds = await getAuthorizedActorAccountIds(client_account_id);
        await withdrawGigOrderRepository(orderId, actorIds);
        res.status(200).json({ success: true, message: 'Gig order withdrawn successfully' });
    } catch (error) {
        console.error("Error in withdrawGigOrderController:", error);
        res.status(500).json({ success: false, message: error.message || 'Failed to withdraw gig order' });
    }
}

async function shortlistGigOrderController(req, res) {
    try {
        const freelancer_account_id = req.user?.account_id;
        const orderId = req.params.orderId;

        if (!freelancer_account_id) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const actorIds = await getAuthorizedActorAccountIds(freelancer_account_id);
        const initialMessage = (req.body.message || req.body.shortlistMessage || '').trim();
        const order = await shortlistGigOrderService(orderId, actorIds, {
            actorAccountId: freelancer_account_id,
            initialMessage: initialMessage || null
        });
        res.status(200).json({ 
            success: true, 
            message: 'Gig order shortlisted successfully', 
            data: order, 
            conversation: order.conversation || null,
            initialMessage: order.initialMessage || null 
        });
    } catch (error) {
        console.error("Error in shortlistGigOrderController:", error);
        res.status(500).json({ success: false, message: error.message || 'Failed to shortlist gig order' });
    }
}

async function unshortlistGigOrderController(req, res) {
    try {
        const freelancer_account_id = req.user?.account_id;
        const orderId = req.params.orderId;

        if (!freelancer_account_id) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const actorIds = await getAuthorizedActorAccountIds(freelancer_account_id);
        const order = await unshortlistGigOrderService(orderId, actorIds);
        res.status(200).json({ success: true, message: 'Gig order removed from shortlist successfully', data: order });
    } catch (error) {
        console.error("Error in unshortlistGigOrderController:", error);
        res.status(500).json({ success: false, message: error.message || 'Failed to unshortlist gig order' });
    }
}

async function reportGigController(req, res) {
    try {
        const { submitGigReport } = require('../services/MemberReportServices');
        const report = await submitGigReport(req.params.id, req.body, req.session);
        return res.status(201).json({ success: true, message: 'Report submitted', report });
    } catch (err) {
        const status = err.statusCode || 500;
        if (status >= 500) console.error('Error reporting gig:', err);
        return res.status(status).json({
            success: false,
            message: status >= 500 ? 'Failed to submit the report' : err.message,
        });
    }
}

async function toggleGigStatusController(req, res) {
    try {
        const freelancer_account_id = req.user?.account_id;
        const gigId = req.params.id;
        const { status } = req.body || {};

        if (!freelancer_account_id) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const actorIds = await getAuthorizedActorAccountIds(freelancer_account_id);
        const result = await toggleGigStatusService(gigId, actorIds, status);
        res.status(200).json({
            success: true,
            data: result,
            message: `Gig status successfully changed to ${result.status === 'closed' ? 'Closed' : 'Open'}`
        });
    } catch (error) {
        console.error("Error in toggleGigStatusController:", error);
        res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Failed to update gig status' });
    }
}

module.exports = {
    toggleGigStatusController,
    updateGigController,
    createGigController,
    getAllGigsController,
    toggleGigSaveController,
    getSavedGigsController,
    editGigOrderController,
    submitGigOrderController,
    getIncomingOrdersController,
    getMyOrdersController,
    getOrderByIdController,
    getGigByIdController,
    deleteGigController,
    acceptGigOrderController,
    confirmGigOrderContractController,
    rejectGigOrderController,
    withdrawGigOrderController,
    shortlistGigOrderController,
    unshortlistGigOrderController,
    reportGigController,
};