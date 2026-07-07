const {getAllPlanServices} = require('../Services/SubscriptionServices');

async function getAllPlanControllers(req, res) {
    try{
        const plans = await getAllPlanServices();
        res.status(200).json({ message: 'Plans fetched successfully', plans });
    }catch(err){
        console.error('Error in controller layer while fetching plans:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

module.exports = {
    getAllPlanControllers
};