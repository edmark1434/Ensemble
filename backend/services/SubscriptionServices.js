const {getAllPlanRepositories,
    getRenderBudgetConfigurationRepositories,
    getSubcriptionByUserIdRepositories,
    getSubscriptionPlanDetailsByUserIdRepositories,
    forceUpdateSubscriptionByUserIdRepositories
} = require('../repositories/SubscriptionRepositories');

// Infrastructure limits stay server-side; public plans expose only display summaries.
const AWS_LAMBDA_LIMIT = 1000;
const LOCAL_RENDER_SLOTS = 4;

function readInteger(value, minimum) {
    if (value == null || String(value).trim() === '') return null;
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed >= minimum ? parsed : null;
}

function getRenderWorkers(plan) {
    return readInteger(plan?.features?.find((feature) => feature.feature_key === 'render_workers')?.value, 1);
}

function formatMultiplier(value) {
    return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 2,
        useGrouping: false,
    }).format(value);
}

async function getAllPlanServices() {
    try{
        const [plans, configuration] = await Promise.all([
            getAllPlanRepositories(),
            getRenderBudgetConfigurationRepositories(),
        ]);
        const budgets = Object.fromEntries(configuration.map((row) => [
            row.configuration_key, readInteger(row.current_value_literal, 0),
        ]));
        const stillsAudioBudget = budgets['rendering.stillsAudioBudget'];
        const freeOverflowBudget = budgets['rendering.freeOverflowBudget'];
        const freePlan = plans.find((plan) => plan.name.toLowerCase() === 'free')
            || plans.find((plan) => Number(plan.price) === 0);
        const freeWorkers = getRenderWorkers(freePlan);
        const validBudgets = stillsAudioBudget != null && freeOverflowBudget != null
            && stillsAudioBudget + freeOverflowBudget <= AWS_LAMBDA_LIMIT;
        const paidBudget = validBudgets ? AWS_LAMBDA_LIMIT - stillsAudioBudget - freeOverflowBudget : null;
        const freeQueueSlots = validBudgets && freeWorkers != null
            ? LOCAL_RENDER_SLOTS + freeOverflowBudget / (freeWorkers + 1)
            : null;

        return plans.map((plan) => {
            const isFree = plan.plan_id === freePlan?.plan_id;
            const workers = getRenderWorkers(plan);
            const speed = workers != null && freeWorkers != null ? workers / freeWorkers : null;
            const queueSlots = paidBudget != null && workers != null
                ? paidBudget / (workers + 1) * workers
                : null;
            // Paid queueSlots already includes workers per export. Compare that
            // worker capacity with Free's capacity without multiplying it twice.
            const throughput = queueSlots != null && freeQueueSlots != null
                ? queueSlots / (freeQueueSlots * freeWorkers)
                : null;

            return {
                ...plan,
                features: (plan.features || []).filter((feature) => feature.feature_key !== 'render_workers'),
                renderSummary: {
                    exportQueueing: isFree ? 'Shared free queue' : throughput != null
                        ? `Paid queue, up to ${formatMultiplier(throughput)}x faster` : 'Paid queue',
                    renderSpeed: isFree ? 'Standard' : speed != null
                        ? `up to ${formatMultiplier(speed)}x faster` : 'Unavailable',
                },
            };
        });
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
