const {getAllPlanServices,
    getSubcriptionByUserIdServices,
    getSubscriptionPlanDetailsByUserIdServices,
    forceUpdateSubscriptionByUserIdServices
} = require('../services/SubscriptionServices');

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

async function forceUpdateSubscriptionControllers(req, res) {
    const userId = req.session.userId || req.session.user_id || req.session.account_id;
    const { tier } = req.body;
    try{
        const updated = await forceUpdateSubscriptionByUserIdServices(userId, tier);
        res.status(200).json({ message: 'Subscription forcefully updated successfully', updated });
    }catch(err){
        console.error('Error in controller layer while forcefully updating subscription:', err);
        require('fs').appendFileSync('test_error.txt', err.toString() + '\n' + err.stack + '\n');
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

async function getSubscriptionPlanDetailsByUserIdControllers(req, res) {
    const {userId} = req.session;
    try{
        const planDetails = await getSubscriptionPlanDetailsByUserIdServices(userId);
        res.status(200).json({ message: 'Subscription plan details fetched successfully', planDetails });
    }
    catch(err){
        console.error('Error in controller layer while fetching subscription plan details:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

module.exports = {
    getAllPlanControllers,
    getSubcriptionByUserIdControllers,
    getSubscriptionPlanDetailsByUserIdControllers,
    forceUpdateSubscriptionControllers
};