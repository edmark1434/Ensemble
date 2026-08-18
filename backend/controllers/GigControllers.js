// backend/controllers/GigControllers.js
const { 
    createGigRepository, 
    getAllGigsRepository,
    toggleGigSaveRepository,
    getSavedGigsRepository,
    submitGigOrderRepository,
    getIncomingOrdersRepository,
    getMyOrdersRepository,
    getGigByIdRepository
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

module.exports = {
    createGigController,
    getAllGigsController,
    toggleGigSaveController,
    getSavedGigsController,
    submitGigOrderController,
    getIncomingOrdersController,
    getMyOrdersController,
    getGigByIdController
};
