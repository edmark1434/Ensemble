// backend/controllers/GigControllers.js
const { createGigRepository, getAllGigsRepository } = require('../repositories/GigRepositories');

async function createGigController(req, res) {
    try {
        const freelancer_account_id = req.user?.account_id;
        if (!freelancer_account_id) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const {
            title,
            description,
            category,
            slots,
            termsOfService,
            firstDraftDelivery,
            additionalWorkRate,
            tiers,
            milestones,
            questionnaires,
            skills,
            thumbnailFileId,
            galleryFileIds
        } = req.body;

        if (!title || !description || !tiers) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const gigData = {
            freelancer_account_id,
            title,
            description,
            category,
            slots,
            termsOfService,
            firstDraftDelivery,
            additionalWorkRate,
            tiers,
            milestones,
            questionnaires,
            skills,
            thumbnailFileId,
            galleryFileIds
        };

        const gigId = await createGigRepository(gigData);

        res.status(201).json({ success: true, message: 'Gig created successfully', gigId });
    } catch (error) {
        console.error("Error in createGigController:", error);
        require('fs').writeFileSync('last_error.txt', String(error.stack || error));
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

async function getAllGigsController(req, res) {
    try {
        const gigs = await getAllGigsRepository(req.query);
        res.status(200).json({ success: true, data: gigs });
    } catch (error) {
        console.error("Error in getAllGigsController:", error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

module.exports = {
    createGigController,
    getAllGigsController
};
