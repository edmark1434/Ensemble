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
    rejectGigOrderRepository
} = require('../repositories/GigRepositories');

async function createGigController(req, res) {
    try {
        const freelancer_account_id = req.user?.account_id;
        if (!freelancer_account_id) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const {
            title, description, category, slots, termsOfService, firstDraftDelivery,
            additionalWorkRate, tiers, milestones, questionnaires, skills,
            thumbnailFileId, galleryFileIds
        } = req.body;

        if (!title || !description || !tiers) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const gigData = {
            freelancer_account_id, title, description, category, slots, termsOfService,
            firstDraftDelivery, additionalWorkRate, tiers, milestones, questionnaires,
            skills, thumbnailFileId, galleryFileIds
        };

        const gigId = await createGigRepository(gigData);
        res.status(201).json({ success: true, message: 'Gig created successfully', gigId });
    } catch (error) {
        console.error("Error in createGigController:", error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

async function getAllGigsController(req, res) {
    try {
        const gigs = await getAllGigsRepository(req.query, req.user?.account_id);
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
        await editGigOrderRepository(req.params.orderId, req.user.account_id, req.body);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error in editGigOrderController:', error);
        res.status(500).json({ success: false, message: 'Failed to edit gig order' });
    }
}


async function submitGigOrderController(req, res) {
    try {
        const requestId = await submitGigOrderRepository(req.user.account_id, req.params.id, req.body);
        res.status(201).json({ success: true, requestId });
    } catch (error) {
        console.error("Error in submitGigOrderController:", error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

async function getIncomingOrdersController(req, res) {
    try {
        const orders = await getIncomingOrdersRepository(req.user.account_id);
        res.status(200).json({ success: true, data: orders });
    } catch (error) {
        console.error("Error in getIncomingOrdersController:", error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

async function getMyOrdersController(req, res) {
    try {
        const orders = await getMyOrdersRepository(req.user.account_id);
        res.status(200).json({ success: true, data: orders });
    } catch (error) {
        console.error("Error in getMyOrdersController:", error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

async function getOrderByIdController(req, res) {
    try {
        const order = await getOrderByIdRepository(req.params.orderId);
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
        res.status(200).json({ success: true, data: order });
    } catch (error) {
        console.error("Error in getOrderByIdController:", error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

async function getGigByIdController(req, res) {
    try {
        const gig = await getGigByIdRepository(req.params.id, req.user?.account_id);
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

        const gigData = {
            freelancer_account_id, title, description, category, slots, termsOfService,
            firstDraftDelivery, additionalWorkRate, tiers, milestones, questionnaires,
            skills, thumbnailFileId, galleryFileIds
        };

        await updateGigRepository(gigId, freelancer_account_id, gigData);
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

        await deleteGigRepository(gigId, freelancer_account_id);
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

        const contractId = await acceptGigOrderRepository(orderId, freelancer_account_id);
        res.status(200).json({ success: true, message: 'Gig order accepted successfully', contractId });
    } catch (error) {
        console.error("Error in acceptGigOrderController:", error);
        res.status(500).json({ success: false, message: error.message || 'Failed to accept gig order' });
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

        await rejectGigOrderRepository(orderId, freelancer_account_id, reason);
        res.status(200).json({ success: true, message: 'Gig order rejected successfully' });
    } catch (error) {
        console.error("Error in rejectGigOrderController:", error);
        res.status(500).json({ success: false, message: error.message || 'Failed to reject gig order' });
    }
}

module.exports = {
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
    rejectGigOrderController
};