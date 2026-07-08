const {getAllPlanServices,
    getSubcriptionByUserIdServices
} = require('../Services/SubscriptionServices');

async function getAllPlanControllers(req, res) {
    try{
        const plans = await getAllPlanServices();
        res.status(200).json({ message: 'Plans fetched successfully', plans });
    }catch(err){
        console.error('Error in controller layer while fetching plans:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

async function getSubcriptionByUserIdControllers(req, res) {
    const {userId} = req.session;
    try{
        const subscription = await getSubcriptionByUserIdServices(userId);
        res.status(200).json({ message: 'Subscription fetched successfully', subscription });
    }catch(err){
        console.error('Error in controller layer while fetching subscription:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

module.exports = {
    getAllPlanControllers,
    getSubcriptionByUserIdControllers
};