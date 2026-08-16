const {getAllPlanRepositories,
    getSubcriptionByUserIdRepositories,
    getSubscriptionPlanDetailsByUserIdRepositories,
    forceUpdateSubscriptionByUserIdRepositories
} = require('../repositories/SubscriptionRepositories');

async function getAllPlanServices() {
    try{
        const plans = await getAllPlanRepositories();
        return plans;
    }catch(err){
        console.error('Error in service layer while fetching plans:', err);
        throw err;
    }
}
async function getSubcriptionByUserIdServices(userId) {
    try{
        const subscription = await getSubcriptionByUserIdRepositories(userId);
        return subscription;
    }catch(err){
        console.error('Error in service layer while fetching subscription:', err);
        throw err;
    }
}

async function forceUpdateSubscriptionByUserIdServices(userId, tierName) {
    try{
        return await forceUpdateSubscriptionByUserIdRepositories(userId, tierName);
    }catch(err){
        console.error('Error in service layer while force updating subscription:', err);
        throw err;
    }
}

async function getSubscriptionPlanDetailsByUserIdServices(userId) {
    try{
        const planDetails = await getSubscriptionPlanDetailsByUserIdRepositories(userId);
        return planDetails;
    }catch(err){
        console.error('Error in service layer while fetching subscription plan details:', err);
        throw err;
    }
}

module.exports = {
    getAllPlanServices,
    getSubcriptionByUserIdServices,
    getSubscriptionPlanDetailsByUserIdServices,
    forceUpdateSubscriptionByUserIdServices
}
