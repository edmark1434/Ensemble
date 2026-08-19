const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../controllers/GigControllers.js');
let content = fs.readFileSync(file, 'utf8');

const controllerFunc = `
async function updateGigController(req, res) {
    try {
        const freelancer_account_id = req.accountId;
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
`;

// Insert the required repo
content = content.replace('getGigByIdRepository\n} = require(', 'getGigByIdRepository,\n    updateGigRepository\n} = require(');

// Add the function
content = content.replace('module.exports = {', controllerFunc + '\nmodule.exports = {\n    updateGigController,');

fs.writeFileSync(file, content);
console.log('Added updateGigController');
