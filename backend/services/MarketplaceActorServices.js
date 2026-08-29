const MarketplaceActorRepositories = require('../repositories/MarketplaceActorRepositories');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class MarketplaceActorError extends Error {
    constructor(message, statusCode = 400, code = 'MARKETPLACE_ACTOR_INVALID') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
    }
}

function requirePersonalAccountId(accountId) {
    const value = String(accountId || '').trim();
    if (!UUID_PATTERN.test(value)) {
        throw new MarketplaceActorError('Authentication is required.', 401, 'AUTHENTICATION_REQUIRED');
    }
    return value;
}

async function resolveMarketplaceActor(personalAccountId, teamId, { requireVerified = true } = {}) {
    const personalId = requirePersonalAccountId(personalAccountId);
    const normalizedTeamId = String(teamId || '').trim();
    if (!normalizedTeamId) {
        if (requireVerified) {
            const actors = await MarketplaceActorRepositories.listAuthorizedActors(personalId);
            const personalActor = actors.find((candidate) => !candidate.team_id);
            if (!personalActor?.is_verified) {
                throw new MarketplaceActorError(
                    'Verify your account before performing this marketplace action.',
                    403,
                    'ACCOUNT_VERIFICATION_REQUIRED'
                );
            }
        }
        return { accountId: personalId, personalAccountId: personalId, teamId: null, type: 'User', role: 'Self' };
    }
    if (!UUID_PATTERN.test(normalizedTeamId)) {
        throw new MarketplaceActorError('A valid team is required.', 422, 'TEAM_ID_INVALID');
    }

    const actor = await MarketplaceActorRepositories.getAuthorizedTeamActor(normalizedTeamId, personalId);
    if (!actor || actor.membership_status !== 'Active' || !['Owner', 'Admin'].includes(actor.role)) {
        throw new MarketplaceActorError(
            'Only an active team Owner or Admin can perform marketplace actions for this team.',
            403,
            'TEAM_MARKETPLACE_FORBIDDEN'
        );
    }
    if (String(actor.account_status).toLowerCase() !== 'active') {
        throw new MarketplaceActorError('The selected team account is not active.', 403, 'TEAM_ACCOUNT_INACTIVE');
    }
    if (requireVerified && !actor.is_verified) {
        throw new MarketplaceActorError(
            'Verify the selected team before using it in the marketplace.',
            403,
            'TEAM_VERIFICATION_REQUIRED'
        );
    }

    return {
        accountId: String(actor.account_id),
        personalAccountId: personalId,
        teamId: String(actor.team_id),
        type: 'Team',
        role: actor.role,
        displayName: actor.display_name,
        handle: actor.handle,
    };
}

async function listMarketplaceActors(personalAccountId) {
    return MarketplaceActorRepositories.listAuthorizedActors(requirePersonalAccountId(personalAccountId));
}

async function getAuthorizedActorAccountIds(personalAccountId) {
    return MarketplaceActorRepositories.getAuthorizedActorAccountIds(requirePersonalAccountId(personalAccountId));
}

module.exports = {
    MarketplaceActorError,
    resolveMarketplaceActor,
    listMarketplaceActors,
    getAuthorizedActorAccountIds,
};
