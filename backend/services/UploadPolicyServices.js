const { getVideoUploadPlanFeaturesForAccount } = require('../repositories/UploadPolicyRepositories');

const planOrder = ['free', 'premium', 'business'];
const planNames = { free: 'Free', premium: 'Premium', business: 'Business' };
const resolutionLabel = value => ({ 1440: '2K', 2160: '4K', 4320: '8K' }[value] || `${value}p`);
const unavailable = () => Object.assign(new Error('Your video upload limits are unavailable. Please try again later.'), { statusCode: 503 });

function parseResolution(value) {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    const match = normalized.match(/^(\d+)\s*p?$/);
    const resolution = ({ '2k': 1440, '4k': 2160, '8k': 4320 })[normalized] ?? (match ? Number(match[1]) : NaN);
    if (!Number.isSafeInteger(resolution) || resolution < 2) throw unavailable();
    return resolution;
}

async function getVideoUploadPolicy(accountId) {
    const rows = await getVideoUploadPlanFeaturesForAccount(accountId);
    const current = rows.filter(row => row.is_current);
    if (current.length !== 1) throw unavailable();
    const name = current[0].name.trim().toLowerCase();
    const plan = planNames[name];
    if (!plan) throw unavailable();
    const maxHeight = parseResolution(current[0].value);
    let nextOption = null;
    for (const candidate of planOrder.slice(planOrder.indexOf(name) + 1)) {
        const options = rows.filter(row => row.name.trim().toLowerCase() === candidate);
        if (options.length !== 1) continue;
        try {
            const height = parseResolution(options[0].value);
            if (height > maxHeight) { nextOption = { plan: planNames[candidate], height }; break; }
        } catch { /* Do not advertise a tier with an invalid upload limit. */ }
    }
    return { plan, maxHeight, maxWidth: maxHeight * 16 / 9,
        label: resolutionLabel(maxHeight), showNotice: Boolean(nextOption), nextPlan: nextOption?.plan ?? null,
        nextLabel: nextOption ? resolutionLabel(nextOption.height) : '' };
}

module.exports = { getVideoUploadPolicy };
