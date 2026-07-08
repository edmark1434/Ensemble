const {getAllPlanRepositories,
    getSubcriptionByUserIdRepositories
} = require('../Repositories/SubscriptionRepositories');

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

module.exports = {
    getAllPlanServices,
    getSubcriptionByUserIdServices
}
