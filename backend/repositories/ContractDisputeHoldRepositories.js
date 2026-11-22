/**
 * ContractDisputeHoldRepositories.js
 *
 * A contract is on dispute hold while a dispute on it is open, a ruling's payout on it is still
 * waiting, or its parties have not yet chosen whether to continue after the dispute
 * (`contractOnDisputeHoldSql`). During the hold its escrow is frozen and its clock is stopped.
 * `contracts.dispute_hold_since` records when the hold began.
 *
 *   dispute open / payout waiting → hold (mark `dispute_hold_since`)
 *   dispute closed, nothing waiting → open a continue-or-end question (`contract_dispute_decisions`),
 *                                   still on hold; a deleted case resumes straight away
 *   both continue / nobody ends it in time → resume: every clock moves forward by the hold time
 *                                   (one side for continuing, the other silent → the silent side
 *                                   first gets one extension, `autoContinueDecision`)
 *   either ends it                 → cancelled under the cancellation rules (services layer)
 *   case reopened / contract ended → a pending question is superseded
 *
 * Resuming moves forward the contract deadline, each started, unfinished milestone deadline (and
 * `overdue_at`), the review window of submissions waiting for the client
 * (`milestone_submits.review_paused_for`) and the auto-cancel time of a pending cancellation
 * request, so nobody loses time to the dispute.
 *
 * All timestamps are `timestamp without time zone`, so the arithmetic uses LOCALTIMESTAMP.
 */

const { pool } = require('../lib/Database');
const {
    contractOnDisputeHoldSql,
    contractDisputeActiveSql,
    contractDecisionPendingSql,
    ENDED_CONTRACT_STATUSES,
} = require('../lib/DisputeEscrow');

const ENDED_SQL_LIST = ENDED_CONTRACT_STATUSES.map((s) => `'${s}'`).join(', ');

/** How long both parties have to choose; if nobody ends the contract by then, it continues. */
const DECISION_WINDOW_HOURS = 72;
/** A reminder goes to parties who have not chosen when this little time is left. */
const DECISION_REMINDER_HOURS = 24;
/**
 * When the deadline passes with one side for continuing and the other silent, the silent side
 * gets this much more time, once (`extended_at`), before the contract continues. Longer than
 * DECISION_REMINDER_HOURS so the second reminder lands later, not right away.
 */
const DECISION_EXTENSION_HOURS = 48;

const DECISION_SIDES = ['client', 'freelancer'];
const DECISION_CHOICES = ['continue', 'end'];

// Milestones whose clock runs: started and not finished. `pending` ones have not started yet.
const RUNNING_MILESTONE_STATUSES = [
    'active',
    'overdue',
    'stalled',
    'submitted_for_review',
    'revision_requested',
    'revisions_requested',
    'in_progress',
];

async function withTransaction(db, work) {
    if (db) return work(db);
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await work(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
    } finally {
        client.release();
    }
}

// The hold start is read in SQL, never round-tripped through a JS Date, so the
// `timestamp without time zone` value cannot pick up a time-zone shift.
const HOLD_SINCE_SQL = `(SELECT dispute_hold_since FROM contracts WHERE contract_id = $1)`;

/**
 * Move every clock on a contract forward by the time it spent on hold (since
 * `contracts.dispute_hold_since`). Anything that started (or was submitted, or requested) during
 * the hold moves only by the part of the hold it lived through. A milestone whose new deadline is
 * in the future is no longer late.
 */
async function shiftContractClocks(client, contractId) {
    await client.query(
        `
        UPDATE contracts
        SET deadline_at = deadline_at + (LOCALTIMESTAMP - dispute_hold_since)
        WHERE contract_id = $1
          AND deadline_at IS NOT NULL
          AND dispute_hold_since IS NOT NULL
        `,
        [contractId]
    );

    const milestones = await client.query(
        `
        WITH hold AS (
            SELECT ${HOLD_SINCE_SQL} AS since
        ),
        shifted AS (
            SELECT
                cm.contract_milestone_id,
                COALESCE(cm.deadline_at, cm.started_at + (cm.deadline * interval '1 hour'))
                    + (LOCALTIMESTAMP - GREATEST(hold.since, cm.started_at)) AS new_deadline
            FROM contract_milestones cm, hold
            WHERE cm.contract_id = $1
              AND hold.since IS NOT NULL
              AND cm.started_at IS NOT NULL
              AND cm.status = ANY($2::text[])
        )
        UPDATE contract_milestones cm
        SET deadline_at = s.new_deadline,
            overdue_at = CASE
                WHEN s.new_deadline > LOCALTIMESTAMP OR cm.overdue_at IS NULL THEN NULL
                ELSE cm.overdue_at + (LOCALTIMESTAMP - GREATEST(hold.since, cm.overdue_at))
            END,
            status = CASE
                WHEN cm.status IN ('overdue', 'stalled') AND s.new_deadline > LOCALTIMESTAMP THEN 'active'
                ELSE cm.status
            END
        FROM shifted s, hold
        WHERE cm.contract_milestone_id = s.contract_milestone_id
        RETURNING cm.contract_milestone_id, cm.deadline_at
        `,
        [contractId, RUNNING_MILESTONE_STATUSES]
    );

    // Both submission flows: the milestone desk ('under_review') and the workspace
    // ('submitted_for_review').
    await client.query(
        `
        UPDATE milestone_submits ms
        SET review_paused_for = ms.review_paused_for
            + (LOCALTIMESTAMP - GREATEST(${HOLD_SINCE_SQL}, ms.submitted_at))
        FROM contract_milestones cm
        WHERE ms.contract_milestone_id = cm.contract_milestone_id
          AND cm.contract_id = $1
          AND ms.status IN ('under_review', 'submitted_for_review')
          AND ${HOLD_SINCE_SQL} IS NOT NULL
        `,
        [contractId]
    );

    await client.query(
        `
        UPDATE contract_cancellation_requests
        SET auto_cancel_at = auto_cancel_at + (LOCALTIMESTAMP - GREATEST(${HOLD_SINCE_SQL}, created_at))
        WHERE contract_id = $1
          AND status = 'pending'
          AND ${HOLD_SINCE_SQL} IS NOT NULL
        `,
        [contractId]
    );

    return { milestones: milestones.rows };
}

/** Lift the hold: move the clocks forward and clear the mark. Caller holds the contract lock. */
async function resumeContractClocks(client, contractId) {
    const res = await client.query(
        `SELECT EXTRACT(EPOCH FROM (LOCALTIMESTAMP - dispute_hold_since))::bigint AS paused_seconds
         FROM contracts WHERE contract_id = $1`,
        [contractId]
    );
    const pausedSeconds = Math.max(0, Number(res.rows[0]?.paused_seconds) || 0);
    const shifted = await shiftContractClocks(client, contractId);
    await client.query(`UPDATE contracts SET dispute_hold_since = NULL WHERE contract_id = $1`, [contractId]);
    return { pausedSeconds, milestones: shifted.milestones };
}

async function lockContract(client, contractId) {
    const res = await client.query(
        `SELECT contract_id, status, dispute_hold_since FROM contracts WHERE contract_id = $1 FOR UPDATE`,
        [contractId]
    );
    return res.rows[0] || null;
}

async function getPendingDecision(db, contractId, { forUpdate = false } = {}) {
    const res = await (db || pool).query(
        `SELECT * FROM contract_dispute_decisions
         WHERE contract_id = $1 AND status = 'pending'
         LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
        [contractId]
    );
    return res.rows[0] || null;
}

async function supersedeDecision(client, decisionId, resolution) {
    await client.query(
        `UPDATE contract_dispute_decisions
         SET status = 'superseded', resolution = $2, resolved_at = LOCALTIMESTAMP
         WHERE decision_id = $1 AND status = 'pending'`,
        [decisionId, resolution]
    );
}

/**
 * Bring a contract's hold in line with its disputes:
 *   ended contract                  → untouched; a pending question is superseded  → 'ended'
 *   dispute open / payout waiting   → mark the hold; a pending question is superseded → 'held'
 *   question pending                →                                                → 'awaiting_decision'
 *   hold lifted, last case closed   → ask both parties to continue or end            → 'decision_opened'
 *   hold lifted, last case deleted  → resume                                         → 'resumed'
 *   not on hold                     →                                                → 'free'
 * Pass `db` to run inside the caller's transaction; otherwise it runs in its own.
 */
async function syncContractDisputeHold(contractId, { db = null } = {}) {
    if (!contractId) return null;
    return withTransaction(db, async (client) => {
        const contract = await lockContract(client, contractId);
        if (!contract) return null;
        const pending = await getPendingDecision(client, contractId, { forUpdate: true });

        if (ENDED_CONTRACT_STATUSES.includes(String(contract.status || '').trim().toLowerCase())) {
            if (pending) await supersedeDecision(client, pending.decision_id, 'contract_ended');
            return { state: 'ended', contractId, supersededDecisionId: pending?.decision_id || null };
        }

        const active = await client.query(
            `SELECT ${contractDisputeActiveSql('$1::uuid')} AS active`,
            [contractId]
        );
        if (active.rows[0]?.active) {
            if (pending) await supersedeDecision(client, pending.decision_id, 'reopened');
            if (!contract.dispute_hold_since) {
                await client.query(
                    `UPDATE contracts SET dispute_hold_since = LOCALTIMESTAMP WHERE contract_id = $1`,
                    [contractId]
                );
            }
            return {
                state: 'held',
                started: !contract.dispute_hold_since,
                contractId,
                supersededDecisionId: pending?.decision_id || null,
            };
        }

        if (pending) return { state: 'awaiting_decision', contractId, decisionId: pending.decision_id };
        if (!contract.dispute_hold_since) return { state: 'free', contractId };

        // The dispute side of the hold lifted. A case staff deleted never really happened, so the
        // contract resumes; otherwise both parties choose whether to go on. The case that just
        // changed is the most recently updated one (a reopened older case can be newer than a
        // later-filed one).
        const latest = await client.query(
            `SELECT dispute_id, dispute_number, deleted_at
             FROM disputes WHERE contract_id = $1
             ORDER BY updated_at DESC NULLS LAST, created_at DESC LIMIT 1`,
            [contractId]
        );
        const lastDispute = latest.rows[0] || null;
        if (lastDispute && !lastDispute.deleted_at) {
            const inserted = await client.query(
                `INSERT INTO contract_dispute_decisions (contract_id, dispute_id, decide_by)
                 VALUES ($1, $2, LOCALTIMESTAMP + ($3 || ' hours')::interval)
                 RETURNING decision_id`,
                [contractId, lastDispute.dispute_id, String(DECISION_WINDOW_HOURS)]
            );
            return {
                state: 'decision_opened',
                contractId,
                decisionId: inserted.rows[0].decision_id,
                disputeId: lastDispute.dispute_id,
            };
        }

        const resumed = await resumeContractClocks(client, contractId);
        return { state: 'resumed', contractId, ...resumed };
    });
}

/**
 * Record one side's answer on a pending question. Returns the updated row, or null when the
 * question is no longer pending. `side` and `choice` are validated here, never interpolated raw.
 */
async function recordDecisionChoice(client, decisionId, { side, choice, actorAccountId }) {
    if (!DECISION_SIDES.includes(side)) throw new Error(`Invalid side: ${side}`);
    if (!DECISION_CHOICES.includes(choice)) throw new Error(`Invalid choice: ${choice}`);
    const res = await client.query(
        `UPDATE contract_dispute_decisions
         SET ${side}_choice = $2, ${side}_chosen_at = LOCALTIMESTAMP, ${side}_chosen_by = $3
         WHERE decision_id = $1 AND status = 'pending'
         RETURNING *`,
        [decisionId, choice, actorAccountId || null]
    );
    return res.rows[0] || null;
}

/**
 * Close a question as `continued` and resume the contract (new dispute round starts now).
 * When both parties chose to continue, a mutual cancellation request left over from before the
 * dispute is withdrawn: it would otherwise auto-cancel the contract they just agreed to keep.
 * When it continues because nobody answered, such a request stands (its timer resumes).
 */
async function resolveDecisionContinued(client, decision, resolution) {
    await client.query(
        `UPDATE contract_dispute_decisions
         SET status = 'continued', resolution = $2, resolved_at = LOCALTIMESTAMP
         WHERE decision_id = $1 AND status = 'pending'`,
        [decision.decision_id, resolution]
    );
    let withdrawnRequests = 0;
    if (resolution === 'both_continued') {
        const withdrawn = await client.query(
            `UPDATE contract_cancellation_requests
             SET status = 'withdrawn', responded_at = NOW()
             WHERE contract_id = $1 AND status = 'pending'`,
            [decision.contract_id]
        );
        withdrawnRequests = withdrawn.rowCount || 0;
    }
    const resumed = await resumeContractClocks(client, decision.contract_id);
    return { ...resumed, withdrawnRequests };
}

/**
 * Milestones with work the freelancer delivered before the question opened that still waits
 * for the client's review (both submission flows). The client reviews these (approve or request
 * a revision) before they can end the contract, so ending is never a way to skip paying for
 * delivered work. Work submitted after the question opened does not count, so it cannot be used
 * to stop the client from leaving.
 */
async function listWorkAwaitingReview(db, decisionId) {
    const res = await (db || pool).query(
        `
        WITH q AS (
            SELECT contract_id, created_at FROM contract_dispute_decisions WHERE decision_id = $1
        )
        SELECT cm.contract_milestone_id AS id, cm.name, cm.contract_id
        FROM contract_milestones cm, q
        WHERE cm.contract_id = q.contract_id
          AND cm.status NOT IN ('completed', 'cancelled', 'abandoned')
          AND (
            (
              cm.status = 'submitted_for_review'
              AND (
                SELECT MAX(ms.submitted_at) FROM milestone_submits ms
                WHERE ms.contract_milestone_id = cm.contract_milestone_id
                  AND ms.status = 'submitted_for_review'
              ) < q.created_at
            )
            OR EXISTS (
              SELECT 1 FROM milestone_submits ms
              WHERE ms.contract_milestone_id = cm.contract_milestone_id
                AND ms.status = 'under_review'
                AND ms.submitted_at < q.created_at
            )
          )
        ORDER BY cm.index ASC
        `,
        [decisionId]
    );
    return res.rows;
}

/** Close a question as `ended` (the contract was cancelled in the same transaction). */
async function resolveDecisionEnded(client, decision, resolution) {
    await client.query(
        `UPDATE contract_dispute_decisions
         SET status = 'ended', resolution = $2, resolved_at = LOCALTIMESTAMP
         WHERE decision_id = $1 AND status = 'pending'`,
        [decision.decision_id, resolution]
    );
    await client.query(`UPDATE contracts SET dispute_hold_since = NULL WHERE contract_id = $1`, [
        decision.contract_id,
    ]);
}

function decisionError(message, statusCode, code) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    return error;
}

/**
 * One party answers the continue-or-end question, atomically:
 *   end      → the contract is cancelled under the cancellation rules (approved milestones stay
 *              paid, unfinished escrow back to the client), the question closes as `ended`
 *   continue → recorded; once the other side has also chosen continue, the question closes as
 *              `continued`, the contract resumes and a new dispute round starts
 * Returns { outcome: 'ended' | 'continued' | 'waiting', decision, cancel?, resumed? }.
 */
async function applyDecisionChoice({ contractId, side, choice, actorAccountId, clientAccountId, freelancerAccountId }) {
    return withTransaction(null, async (client) => {
        const contract = await lockContract(client, contractId);
        if (!contract) throw decisionError('Contract not found', 404, 'CONTRACT_NOT_FOUND');
        const pending = await getPendingDecision(client, contractId, { forUpdate: true });
        if (!pending) {
            throw decisionError(
                'There is no open question on this contract. It may already have been decided.',
                409,
                'DECISION_NOT_PENDING'
            );
        }
        // The question can go stale between syncs: the contract finished (e.g. the client approved
        // the last milestone) or the case was reopened. Close it instead of acting on it.
        if (ENDED_CONTRACT_STATUSES.includes(String(contract.status || '').trim().toLowerCase())) {
            await supersedeDecision(client, pending.decision_id, 'contract_ended');
            return { outcome: 'stale', reason: 'contract_ended', decision: pending };
        }
        const active = await client.query(`SELECT ${contractDisputeActiveSql('$1::uuid')} AS active`, [contractId]);
        if (active.rows[0]?.active) {
            await supersedeDecision(client, pending.decision_id, 'reopened');
            return { outcome: 'stale', reason: 'reopened', decision: pending };
        }
        if (choice === 'end' && side === 'client') {
            const awaiting = await listWorkAwaitingReview(client, pending.decision_id);
            if (awaiting.length) {
                const names = awaiting.map((m) => `"${m.name || 'Milestone'}"`).join(', ');
                throw decisionError(
                    `The freelancer delivered work on ${names} that is still waiting for your review. Approve it or request a revision before ending the contract. If you think it breaks the agreement, continue the contract and file a new dispute.`,
                    409,
                    'REVIEW_PENDING_WORK'
                );
            }
        }

        const decision = await recordDecisionChoice(client, pending.decision_id, { side, choice, actorAccountId });

        if (choice === 'end') {
            const { cancelContractAndRefundInTransaction } = require('./MilestoneRepositories');
            const cancel = await cancelContractAndRefundInTransaction(client, {
                contractId,
                clientAccountId,
                freelancerAccountId,
                allowDecision: true,
                allowNothingToRefund: true,
                withdrawPendingRequests: true,
                archiveReason: 'Contract ended after its dispute',
            });
            await resolveDecisionEnded(client, decision, `ended_by_${side}`);
            return { outcome: 'ended', decision, cancel };
        }

        const otherSide = side === 'client' ? 'freelancer' : 'client';
        if (decision[`${otherSide}_choice`] === 'continue') {
            const resumed = await resolveDecisionContinued(client, decision, 'both_continued');
            return { outcome: 'continued', decision, resumed };
        }
        return { outcome: 'waiting', decision };
    });
}

/**
 * The side that has not answered while the other chose to continue, or null (both silent, or
 * both answered). An `end` choice never stays pending, so only `continue` or null appear here.
 */
function silentSideAgainstContinue(decision) {
    const client = decision.client_choice || null;
    const freelancer = decision.freelancer_choice || null;
    if (client === 'continue' && !freelancer) return 'freelancer';
    if (freelancer === 'continue' && !client) return 'client';
    return null;
}

/**
 * The deadline passed without anyone ending the contract. Null if the question was already
 * settled or is not due.
 *   one side chose continue, the other is silent, not yet extended
 *       → the silent side gets DECISION_EXTENSION_HOURS more, once (reminder re-armed)
 *       → { outcome: 'extended', decision, silentSide }
 *   otherwise (both silent, or the extension also ran out)
 *       → it continues → { outcome: 'continued', decision, resumed }
 */
async function autoContinueDecision(decisionId, contractId) {
    return withTransaction(null, async (client) => {
        const contract = await lockContract(client, contractId);
        if (!contract) return null;
        const pending = await getPendingDecision(client, contractId, { forUpdate: true });
        if (!pending || String(pending.decision_id) !== String(decisionId)) return null;
        const due = await client.query(
            `SELECT decide_by <= LOCALTIMESTAMP AS due FROM contract_dispute_decisions WHERE decision_id = $1`,
            [pending.decision_id]
        );
        if (!due.rows[0]?.due) return null;

        const silentSide = silentSideAgainstContinue(pending);
        // No `extended_at` key: migration 1830300000000 has not run; continue as before.
        const canExtend = Object.prototype.hasOwnProperty.call(pending, 'extended_at') && !pending.extended_at;
        if (silentSide && canExtend) {
            const extended = await client.query(
                `UPDATE contract_dispute_decisions
                 SET decide_by = LOCALTIMESTAMP + ($2 || ' hours')::interval,
                     extended_at = LOCALTIMESTAMP,
                     reminded_at = NULL
                 WHERE decision_id = $1 AND status = 'pending'
                 RETURNING *`,
                [pending.decision_id, String(DECISION_EXTENSION_HOURS)]
            );
            if (extended.rows[0]) return { outcome: 'extended', decision: extended.rows[0], silentSide };
        }

        const resumed = await resolveDecisionContinued(client, pending, 'auto_continued');
        return { outcome: 'continued', decision: pending, resumed };
    });
}

/** Pending questions whose time is up (nobody ended the contract, so it continues). */
async function listExpiredDecisions(limit = 50) {
    const res = await pool.query(
        `SELECT decision_id, contract_id
         FROM contract_dispute_decisions
         WHERE status = 'pending' AND decide_by <= LOCALTIMESTAMP
         ORDER BY decide_by ASC
         LIMIT $1`,
        [limit]
    );
    return res.rows;
}

/** Pending questions close to their deadline that have not had a reminder yet; marks them. */
async function claimDecisionsNeedingReminder(limit = 50) {
    const res = await pool.query(
        `UPDATE contract_dispute_decisions
         SET reminded_at = LOCALTIMESTAMP
         WHERE decision_id IN (
             SELECT decision_id FROM contract_dispute_decisions
             WHERE status = 'pending'
               AND reminded_at IS NULL
               AND decide_by > LOCALTIMESTAMP
               AND decide_by <= LOCALTIMESTAMP + ($1 || ' hours')::interval
             ORDER BY decide_by ASC
             LIMIT $2
         )
         RETURNING *`,
        [String(DECISION_REMINDER_HOURS), limit]
    );
    return res.rows;
}

/**
 * Live contracts whose hold disagrees with their disputes (the reconcile job's work list):
 * not marked but on hold, marked but nothing holds them (a question must be opened or the
 * contract resumed), or a pending question that a reopened case or ended contract supersedes.
 */
async function listContractsNeedingHoldSync(limit = 100) {
    const res = await pool.query(
        `
        SELECT c.contract_id
        FROM contracts c
        WHERE (
            LOWER(c.status) NOT IN (${ENDED_SQL_LIST})
            AND (
              (c.dispute_hold_since IS NULL AND ${contractDisputeActiveSql('c.contract_id')})
              OR (c.dispute_hold_since IS NOT NULL AND NOT ${contractOnDisputeHoldSql('c.contract_id')})
              OR (${contractDecisionPendingSql('c.contract_id')} AND ${contractDisputeActiveSql('c.contract_id')})
            )
          )
          OR (LOWER(c.status) IN (${ENDED_SQL_LIST}) AND ${contractDecisionPendingSql('c.contract_id')})
        LIMIT $1
        `,
        [limit]
    );
    return res.rows.map((row) => row.contract_id);
}

/**
 * Live contracts with an escrow settlement ruling that still stands (not withdrawn). A settlement
 * ends the contract when it is ruled; this finds contracts ruled before that was the case.
 */
async function listLiveContractsWithStandingSettlement(limit = 50) {
    const res = await pool.query(
        `
        SELECT DISTINCT ON (c.contract_id)
            c.contract_id,
            d.dispute_id,
            d.dispute_number
        FROM disputes d
        JOIN contracts c ON c.contract_id = d.contract_id
        WHERE d.deleted_at IS NULL
          AND d.financial_resolution_kind = 'escrow_settle'
          AND d.financial_resolution_at IS NOT NULL
          AND LOWER(c.status) NOT IN (${ENDED_SQL_LIST})
        ORDER BY c.contract_id, d.financial_resolution_at DESC
        LIMIT $1
        `,
        [limit]
    );
    return res.rows;
}

/** Parties and title of a contract, for notices. */
async function getContractHoldContext(contractId, db = null) {
    const res = await (db || pool).query(
        `
        SELECT
            c.contract_id,
            c.status,
            c.deadline_at,
            COALESCE(jc_info.client_account_id, gc_info.client_account_id) AS client_account_id,
            COALESCE(jc_info.freelancer_account_id, gc_info.freelancer_account_id) AS freelancer_account_id,
            COALESCE(jc_info.title, gc_info.title, 'Your contract') AS contract_title
        FROM contracts c
        LEFT JOIN (
            SELECT jc.contract_id, j.client_account_id, p.freelancer_account_id, j.title
            FROM job_contracts jc
            JOIN proposals p ON jc.proposal_id = p.proposal_id
            JOIN jobs j ON p.job_id = j.job_id
        ) jc_info ON c.contract_id = jc_info.contract_id
        LEFT JOIN (
            SELECT gc.contract_id, gr.client_account_id, g.freelancer_account_id, g.title
            FROM gig_contracts gc
            JOIN gig_requests gr ON gc.gig_request_id = gr.gig_request_id
            JOIN gig_tiers gt ON gr.gig_tier_id = gt.gig_tier_id
            JOIN gigs g ON gt.gig_id = g.gig_id
        ) gc_info ON c.contract_id = gc_info.contract_id
        WHERE c.contract_id = $1
        `,
        [contractId]
    );
    return res.rows[0] || null;
}

/** The case behind a question, for wording notices per recipient (number only when visible). */
async function getDecisionDispute(disputeId) {
    if (!disputeId) return null;
    const res = await pool.query(
        `SELECT dispute_id, dispute_number, visibility, by_account_id FROM disputes WHERE dispute_id = $1`,
        [disputeId]
    );
    return res.rows[0] || null;
}

async function getDisputeContractId(disputeId) {
    if (!disputeId) return null;
    const res = await pool.query(`SELECT contract_id FROM disputes WHERE dispute_id = $1`, [disputeId]);
    return res.rows[0]?.contract_id || null;
}

/**
 * Hold state per contract for the contracts API (`dispute_hold`):
 *   { since, settlement }  `since` is when the current hold began (null when not on hold);
 *   `settlement` is set when a dispute ruling ended the contract: { id, number, endedAt, ... },
 *   with id and number only when the viewer may open that case.
 * Empty before migration 1829900000000_contract-dispute-hold runs.
 */
async function disputeHoldForContracts(contractIds, viewerAccountIds) {
    const map = new Map();
    const ids = [...new Set((contractIds || []).filter(Boolean).map(String))];
    if (!ids.length) return map;
    const viewers = new Set((viewerAccountIds || []).filter(Boolean).map(String));

    let res;
    try {
        res = await pool.query(
            `
            SELECT
                c.contract_id,
                c.dispute_hold_since,
                c.dispute_settlement_end,
                sd.dispute_id AS settled_dispute_id,
                sd.dispute_number AS settled_dispute_number,
                sd.visibility AS settled_visibility,
                sd.by_account_id AS settled_by_account_id,
                sd.status AS settled_status
            FROM contracts c
            LEFT JOIN disputes sd
              ON sd.dispute_id::text = c.dispute_settlement_end->>'disputeId'
             AND sd.deleted_at IS NULL
            WHERE c.contract_id = ANY($1::uuid[])
            `,
            [ids]
        );
    } catch (err) {
        if (err.code === '42703') return map;
        throw err;
    }

    for (const row of res.rows) {
        let settlement = null;
        if (row.dispute_settlement_end && row.settled_dispute_id) {
            const filedByViewer = viewers.has(String(row.settled_by_account_id));
            const visible = Boolean(row.settled_visibility) || filedByViewer;
            settlement = {
                id: visible ? row.settled_dispute_id : null,
                number: visible ? row.settled_dispute_number || null : null,
                visibility: Boolean(row.settled_visibility),
                status: row.settled_status,
                filedByViewer,
                endedAt: row.dispute_settlement_end.endedAt || null,
            };
        }
        map.set(String(row.contract_id), {
            since: row.dispute_hold_since || null,
            settlement,
        });
    }
    return map;
}

/**
 * The pending continue-or-end question per contract, worded for one viewer (`dispute_decision`):
 *   { id, decideBy, createdAt, viewerSide, viewerChoice, otherChoice, dispute }
 * `contracts` are rows with contract_id, client_account_id and freelancer_account_id. `dispute`
 * carries id and number only when the viewer may open that case. Empty before migration
 * 1830000000000_contract-dispute-decisions runs.
 */
async function decisionsForContracts(contracts, viewerAccountIds) {
    const map = new Map();
    const rows = (contracts || []).filter((c) => c && c.contract_id);
    if (!rows.length) return map;
    const viewers = new Set((viewerAccountIds || []).filter(Boolean).map(String));

    let res;
    try {
        res = await pool.query(
            `
            SELECT q.*, d.dispute_number, d.visibility, d.by_account_id
            FROM contract_dispute_decisions q
            LEFT JOIN disputes d ON d.dispute_id = q.dispute_id
            WHERE q.contract_id = ANY($1::uuid[])
              AND q.status = 'pending'
            `,
            [[...new Set(rows.map((c) => String(c.contract_id)))]]
        );
    } catch (err) {
        if (err.code === '42P01') return map;
        throw err;
    }

    const byContract = new Map(rows.map((c) => [String(c.contract_id), c]));
    // Pending questions are few per member; one small query each.
    const awaitingByDecision = new Map();
    for (const q of res.rows) {
        awaitingByDecision.set(String(q.decision_id), await listWorkAwaitingReview(null, q.decision_id));
    }
    for (const q of res.rows) {
        const contract = byContract.get(String(q.contract_id));
        if (!contract) continue;
        const viewerSide = viewers.has(String(contract.client_account_id))
            ? 'client'
            : viewers.has(String(contract.freelancer_account_id))
                ? 'freelancer'
                : null;
        const otherSide = viewerSide === 'client' ? 'freelancer' : 'client';
        const filedByViewer = viewers.has(String(q.by_account_id));
        const visible = Boolean(q.visibility) || filedByViewer;
        map.set(String(q.contract_id), {
            id: q.decision_id,
            decideBy: q.decide_by,
            createdAt: q.created_at,
            // Set once the silent side was given extra time; the next deadline is final.
            extendedAt: q.extended_at || null,
            viewerSide,
            viewerChoice: viewerSide ? q[`${viewerSide}_choice`] || null : null,
            otherChoice: viewerSide ? q[`${otherSide}_choice`] || null : null,
            // Delivered work the client reviews before they can end the contract.
            reviewPending: (awaitingByDecision.get(String(q.decision_id)) || []).map((m) => ({
                id: m.id,
                name: m.name || 'Milestone',
            })),
            dispute: q.dispute_id
                ? {
                    id: visible ? q.dispute_id : null,
                    number: visible ? q.dispute_number || null : null,
                    visibility: Boolean(q.visibility),
                    filedByViewer,
                }
                : null,
        });
    }
    return map;
}

/**
 * For staff: what happened to the contract after this case (`contractAfterCase` on the dispute
 * detail). The latest continue-or-end question raised by this case, plus the contract's current
 * hold. Null when the case has no contract or the tables are missing (migrations not run).
 */
async function getContractAfterCase(disputeId) {
    if (!disputeId) return null;
    try {
        const res = await pool.query(
            `
            SELECT
                c.contract_id,
                c.status AS contract_status,
                c.dispute_hold_since,
                q.decision_id,
                q.status,
                q.client_choice,
                q.client_chosen_at,
                q.freelancer_choice,
                q.freelancer_chosen_at,
                q.decide_by,
                q.extended_at,
                q.resolution,
                q.resolved_at,
                q.created_at
            FROM disputes d
            JOIN contracts c ON c.contract_id = d.contract_id
            LEFT JOIN LATERAL (
                SELECT * FROM contract_dispute_decisions
                WHERE dispute_id = d.dispute_id
                ORDER BY created_at DESC
                LIMIT 1
            ) q ON true
            WHERE d.dispute_id = $1
            `,
            [disputeId]
        );
        const row = res.rows[0];
        if (!row) return null;
        return {
            contractId: row.contract_id,
            contractStatus: row.contract_status,
            onHoldSince: row.dispute_hold_since || null,
            decision: row.decision_id
                ? {
                    id: row.decision_id,
                    status: row.status,
                    clientChoice: row.client_choice || null,
                    clientChosenAt: row.client_chosen_at || null,
                    freelancerChoice: row.freelancer_choice || null,
                    freelancerChosenAt: row.freelancer_chosen_at || null,
                    decideBy: row.decide_by,
                    extendedAt: row.extended_at || null,
                    resolution: row.resolution || null,
                    resolvedAt: row.resolved_at || null,
                    createdAt: row.created_at,
                }
                : null,
        };
    } catch (err) {
        if (err.code === '42P01' || err.code === '42703') return null;
        throw err;
    }
}

module.exports = {
    DECISION_WINDOW_HOURS,
    DECISION_EXTENSION_HOURS,
    getContractAfterCase,
    syncContractDisputeHold,
    lockContract,
    getPendingDecision,
    applyDecisionChoice,
    autoContinueDecision,
    listExpiredDecisions,
    claimDecisionsNeedingReminder,
    listContractsNeedingHoldSync,
    listLiveContractsWithStandingSettlement,
    getContractHoldContext,
    getDecisionDispute,
    getDisputeContractId,
    disputeHoldForContracts,
    decisionsForContracts,
};
