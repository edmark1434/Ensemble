const {
    getAccountDeactivation,
    deactivateAccount,
    reactivateAccount,
} = require('../repositories/AccountRepositories');

const REACTIVATION_COOLDOWN_HOURS = 72;

class DeactivationError extends Error {
    constructor(message, statusCode = 400, details = null) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
    }
}

function isStaffViewer(session) {
    return session?.type === 'Staff';
}

function isDeactivatedStatus(status) {
    return String(status || '').trim().toLowerCase() === 'deactivated';
}

function toPublicState(row) {
    if (!row || !isDeactivatedStatus(row.status)) {
        return {
            deactivated: false,
            deactivatedAt: null,
            reactivationAvailableAt: null,
            cooldownHours: REACTIVATION_COOLDOWN_HOURS,
            reactivationReady: true,
        };
    }
    const availableAt = row.reactivation_available_at ? new Date(row.reactivation_available_at) : null;
    const ready = !availableAt || availableAt.getTime() <= Date.now();
    return {
        deactivated: true,
        deactivatedAt: row.deactivated_at || null,
        reactivationAvailableAt: availableAt,
        cooldownHours: REACTIVATION_COOLDOWN_HOURS,
        reactivationReady: ready,
    };
}

function sessionAccountId(session) {
    return session?.account_id || session?.accountId || null;
}

async function getOwnDeactivation(session) {
    const accountId = sessionAccountId(session);
    if (!accountId) {
        throw new DeactivationError('Sign in to manage deactivation.', 401);
    }
    const row = await getAccountDeactivation(accountId);
    if (!row || String(row.type || '').toLowerCase() !== 'user') {
        throw new DeactivationError('Only member accounts can be deactivated.', 403);
    }
    return toPublicState(row);
}

async function deactivateOwnAccount(session) {
    const accountId = sessionAccountId(session);
    if (!accountId || String(session?.type || '') !== 'User') {
        throw new DeactivationError('Only member accounts can be deactivated.', 403);
    }
    const current = await getAccountDeactivation(accountId);
    if (!current) {
        throw new DeactivationError('Account not found.', 404);
    }
    if (isDeactivatedStatus(current.status)) {
        return toPublicState(current);
    }
    if (String(current.status || '').trim().toLowerCase() !== 'active') {
        throw new DeactivationError('Only an active account can be deactivated.', 409);
    }
    const updated = await deactivateAccount(accountId, REACTIVATION_COOLDOWN_HOURS);
    if (!updated) {
        throw new DeactivationError('This account could not be deactivated.', 409);
    }
    return toPublicState(updated);
}

async function reactivateOwnAccount(session) {
    const accountId = sessionAccountId(session);
    if (!accountId || String(session?.type || '') !== 'User') {
        throw new DeactivationError('Only member accounts can be reactivated.', 403);
    }
    const current = await getAccountDeactivation(accountId);
    if (!current || !isDeactivatedStatus(current.status)) {
        throw new DeactivationError('This account is already active.', 409);
    }
    const state = toPublicState(current);
    if (!state.reactivationReady) {
        throw new DeactivationError(
            'Reactivation unlocks 72 hours after you deactivate.',
            403,
            state
        );
    }
    const updated = await reactivateAccount(accountId);
    if (!updated) {
        const latest = await getAccountDeactivation(accountId);
        const latestState = toPublicState(latest);
        if (latestState.deactivated && !latestState.reactivationReady) {
            throw new DeactivationError(
                'Reactivation unlocks 72 hours after you deactivate.',
                403,
                latestState
            );
        }
        throw new DeactivationError('This account could not be reactivated.', 409);
    }
    return toPublicState(updated);
}

async function profileHiddenFromViewer(accountId, session) {
    if (!accountId || isStaffViewer(session)) return false;
    const row = await getAccountDeactivation(accountId);
    return isDeactivatedStatus(row?.status);
}

module.exports = {
    REACTIVATION_COOLDOWN_HOURS,
    DeactivationError,
    isStaffViewer,
    isDeactivatedStatus,
    toPublicState,
    getOwnDeactivation,
    deactivateOwnAccount,
    reactivateOwnAccount,
    profileHiddenFromViewer,
};
