const {getAllPlanRepositories} = require('../Repositories/SubscriptionRepositories');

async function getAllPlanServices() {
    try{
        const plans = await getAllPlanRepositories();
        return plans;
    }catch(err){
        console.error('Error in service layer while fetching plans:', err);
        throw err;
    }
}

module.exports = {
    getAllPlanServices
}
