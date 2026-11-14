const {
    getAccountDeactivation,
    deactivateAccount,
    reactivateAccount,
    countDeactivationBlockers,
    isAccountDeactivated,
} = require('../repositories/AccountRepositories');
const { recordAccountActivity } = require('../repositories/AccountActivityRepositories');

/** Time a member must wait after turning the account off before turning it back on. */
const REACTIVATION_COOLDOWN_HOURS = 72;
/** Time a member must wait after turning the account back on before turning it off again. */
const REDEACTIVATION_COOLDOWN_DAYS = 7;

class DeactivationError extends Error {
    constructor(message, statusCode = 400, details = null, code = null) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        this.code = code;
    }
}

function isStaffViewer(session) {
    return session?.type === 'Staff';
}

function isDeactivatedStatus(status) {
    return String(status || '').trim().toLowerCase() === 'deactivated';
}

function isMemberRow(row) {
    return String(row?.type || '').trim().toLowerCase() === 'user';
}

/**
 * A member who turned the account off stays hidden even while a staff penalty is on top of
 * it (status then reads Banned/Suspended/Locked but deactivated_at is still set).
 */
function hiddenByDeactivation(row) {
    if (!row || !isMemberRow(row)) return false;
    return isDeactivatedStatus(row.status) || Boolean(row.deactivated_at);
}

function formatWhen(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

function toPublicState(row, blockers = null) {
    const now = Date.now();
    const deactivationAvailableAt = row?.deactivation_available_at ? new Date(row.deactivation_available_at) : null;
    const deactivationReady = !deactivationAvailableAt || deactivationAvailableAt.getTime() <= now;
    const shared = {
        cooldownHours: REACTIVATION_COOLDOWN_HOURS,
        redeactivateCooldownDays: REDEACTIVATION_COOLDOWN_DAYS,
    };
    if (!row || !isDeactivatedStatus(row.status)) {
        const status = String(row?.status || 'Active');
        const penalised = !['active', 'deactivated'].includes(status.trim().toLowerCase());
        return {
            ...shared,
            deactivated: false,
            deactivatedAt: null,
            reactivationAvailableAt: null,
            reactivationReady: true,
            deactivationAvailableAt: deactivationReady ? null : deactivationAvailableAt,
            deactivationReady,
            // Shown before the member confirms, so they know why the button is off.
            canDeactivate: deactivationReady && !penalised && !(blockers && (blockers.liveContracts || blockers.openDisputes)),
            standingBlocksDeactivation: penalised,
            blockers: blockers || null,
        };
    }
    const availableAt = row.reactivation_available_at ? new Date(row.reactivation_available_at) : null;
    const ready = !availableAt || availableAt.getTime() <= now;
    return {
        ...shared,
        deactivated: true,
        deactivatedAt: row.deactivated_at || null,
        reactivationAvailableAt: availableAt,
        reactivationReady: ready,
        deactivationAvailableAt: null,
        deactivationReady: false,
        canDeactivate: false,
        standingBlocksDeactivation: false,
        blockers: null,
    };
}

function sessionAccountId(session) {
    return session?.account_id || session?.accountId || null;
}

function blockerMessage(blockers) {
    const parts = [];
    if (blockers.liveContracts) {
        parts.push(`${blockers.liveContracts} contract${blockers.liveContracts === 1 ? '' : 's'} still running or waiting on a signature`);
    }
    if (blockers.openDisputes) {
        parts.push(`${blockers.openDisputes} open dispute${blockers.openDisputes === 1 ? '' : 's'}`);
    }
    return `Finish or close what other people are waiting on first: ${parts.join(' and ')}.`;
}

async function getOwnDeactivation(session) {
    const accountId = sessionAccountId(session);
    if (!accountId) {
        throw new DeactivationError('Sign in to manage deactivation.', 401);
    }
    const row = await getAccountDeactivation(accountId);
    if (!row || !isMemberRow(row)) {
        throw new DeactivationError('Only member accounts can be deactivated.', 403);
    }
    const blockers = isDeactivatedStatus(row.status) ? null : await countDeactivationBlockers(row.account_id);
    return toPublicState(row, blockers);
}

async function deactivateOwnAccount(session) {
    const accountId = sessionAccountId(session);
    if (!accountId || String(session?.type || '') !== 'User') {
        throw new DeactivationError('Only member accounts can be deactivated.', 403);
    }
    const current = await getAccountDeactivation(accountId);
    if (!current || !isMemberRow(current)) {
        throw new DeactivationError('Account not found.', 404);
    }
    if (isDeactivatedStatus(current.status)) {
        return toPublicState(current);
    }
    // A penalty cannot be hidden behind a deactivation.
    if (String(current.status || '').trim().toLowerCase() !== 'active') {
        throw new DeactivationError(
            'You cannot deactivate while a suspension, lock or ban is on this account. It can be deactivated once that ends.',
            409,
            toPublicState(current),
            'DEACTIVATION_STANDING'
        );
    }
    const state = toPublicState(current);
    if (!state.deactivationReady) {
        throw new DeactivationError(
            `You reactivated recently. You can deactivate again on ${formatWhen(state.deactivationAvailableAt)}.`,
            409,
            state,
            'DEACTIVATION_COOLDOWN'
        );
    }
    // Other members' money and work must not be stranded behind a hidden account.
    const blockers = await countDeactivationBlockers(current.account_id);
    if (blockers.liveContracts || blockers.openDisputes) {
        throw new DeactivationError(blockerMessage(blockers), 409, toPublicState(current, blockers), 'DEACTIVATION_BLOCKED');
    }

    const updated = await deactivateAccount(current.account_id, REACTIVATION_COOLDOWN_HOURS);
    if (!updated) {
        // Lost a race with a staff action, a cooldown, or another tab.
        const latest = await getAccountDeactivation(accountId);
        throw new DeactivationError('This account could not be deactivated. Refresh and try again.', 409, toPublicState(latest));
    }
    await recordAccountActivity({
        accountId: updated.account_id,
        action: 'Account deactivated by its owner',
        eventCode: 'ACCOUNT_DEACTIVATED',
        referenceTable: 'accounts',
        referencePrefix: 'ACC',
        referenceId: updated.account_id,
        metadata: {
            reactivationAvailableAt: updated.reactivation_available_at,
            source: 'member',
        },
    }).catch((err) => console.warn('Deactivation activity skipped:', err.message));
    return toPublicState(updated);
}

async function reactivateOwnAccount(session) {
    const accountId = sessionAccountId(session);
    if (!accountId || String(session?.type || '') !== 'User') {
        throw new DeactivationError('Only member accounts can be reactivated.', 403);
    }
    const current = await getAccountDeactivation(accountId);
    if (!current || !isDeactivatedStatus(current.status)) {
        throw new DeactivationError(
            current && current.deactivated_at
                ? 'A staff penalty is on this account. It returns to deactivated when the penalty ends, and you can reactivate then.'
                : 'This account is already active.',
            409
        );
    }
    const state = toPublicState(current);
    if (!state.reactivationReady) {
        throw new DeactivationError(
            `Reactivation unlocks ${REACTIVATION_COOLDOWN_HOURS} hours after you deactivate (${formatWhen(state.reactivationAvailableAt)}).`,
            403,
            state
        );
    }
    const updated = await reactivateAccount(current.account_id, REDEACTIVATION_COOLDOWN_DAYS);
    if (!updated) {
        const latest = await getAccountDeactivation(accountId);
        const latestState = toPublicState(latest);
        if (latestState.deactivated && !latestState.reactivationReady) {
            throw new DeactivationError(
                `Reactivation unlocks ${REACTIVATION_COOLDOWN_HOURS} hours after you deactivate.`,
                403,
                latestState
            );
        }
        throw new DeactivationError('This account could not be reactivated.', 409);
    }
    await recordAccountActivity({
        accountId: updated.account_id,
        action: 'Account reactivated by its owner',
        eventCode: 'ACCOUNT_REACTIVATED',
        referenceTable: 'accounts',
        referencePrefix: 'ACC',
        referenceId: updated.account_id,
        metadata: {
            deactivationAvailableAt: updated.deactivation_available_at,
            source: 'member',
        },
    }).catch((err) => console.warn('Reactivation activity skipped:', err.message));
    return toPublicState(updated);
}

/**
 * Members (and guests) cannot see a deactivated member's profile. Staff and admins always
 * can, and so can the member themselves.
 */
async function profileHiddenFromViewer(accountId, session) {
    if (!accountId || isStaffViewer(session)) return false;
    const viewerId = sessionAccountId(session);
    if (viewerId && String(viewerId) === String(accountId)) return false;
    // Reads only status/deactivated_at, so every profile route keeps working even before the
    // cooldown migration is applied.
    return isAccountDeactivated(accountId);
}

/**
 * Refuse an action that needs the other member to respond (proposal, order, offer, new DM,
 * follow) while that member is deactivated.
 */
async function assertAccountReachable(accountId, message = 'This member has deactivated their account.') {
    if (await isAccountDeactivated(accountId)) {
        throw new DeactivationError(message, 409, null, 'ACCOUNT_DEACTIVATED');
    }
}

module.exports = {
    REACTIVATION_COOLDOWN_HOURS,
    REDEACTIVATION_COOLDOWN_DAYS,
    DeactivationError,
    isStaffViewer,
    isDeactivatedStatus,
    hiddenByDeactivation,
    toPublicState,
    getOwnDeactivation,
    deactivateOwnAccount,
    reactivateOwnAccount,
    profileHiddenFromViewer,
    assertAccountReachable,
};
