/**
 * ContractDisputeHoldRepositories.js
 *
 * A contract is on dispute hold while a dispute on it is open or a ruling's payout on it is still
 * waiting (`contractOnDisputeHoldSql`). During the hold its escrow is frozen and its clock is
 * stopped. `contracts.dispute_hold_since` records when the hold began. When it lifts, every clock
 * on the contract moves forward by the time spent on hold, so nobody loses time to the dispute:
 *   - the contract deadline and each started, unfinished milestone deadline (and `overdue_at`)
 *   - the review window of submissions waiting for the client (`milestone_submits.review_paused_for`)
 *   - the auto-cancel time of a pending cancellation request
 * Ended contracts are left alone: a settlement ruling ends the contract (see
 * DisputeFinancialRepositories.endContractAfterSettlement), and a withdrawn ruling restores it,
 * still on hold, so the hold keeps counting from when it first began.
 *
 * All timestamps are `timestamp without time zone`, so the arithmetic uses LOCALTIMESTAMP.
 */

const { pool } = require('../lib/Database');
const { contractOnDisputeHoldSql, ENDED_CONTRACT_STATUSES } = require('../lib/DisputeEscrow');

const ENDED_SQL_LIST = ENDED_CONTRACT_STATUSES.map((s) => `'${s}'`).join(', ');

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
 * `contracts.dispute_hold_since`, which the caller clears afterwards). Anything that started
 * (or was submitted, or requested) during the hold moves only by the part of the hold it lived
 * through. A milestone whose new deadline is in the future is no longer late.
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

    await client.query(
        `
        UPDATE milestone_submits ms
        SET review_paused_for = ms.review_paused_for
            + (LOCALTIMESTAMP - GREATEST(${HOLD_SINCE_SQL}, ms.submitted_at))
        FROM contract_milestones cm
        WHERE ms.contract_milestone_id = cm.contract_milestone_id
          AND cm.contract_id = $1
          AND ms.status = 'under_review'
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

/**
 * Bring `contracts.dispute_hold_since` in line with the contract's disputes:
 *   on hold, not marked   → mark it now                      → { state: 'held', started: true }
 *   marked, still on hold →                                   → { state: 'held', started: false }
 *   marked, hold lifted   → move its clocks forward, unmark  → { state: 'resumed', since, pausedSeconds }
 *   neither               →                                   → { state: 'free' }
 *   ended contract        → untouched                         → { state: 'ended' }
 * Pass `db` to run inside the caller's transaction; otherwise it runs in its own.
 */
async function syncContractDisputeHold(contractId, { db = null } = {}) {
    if (!contractId) return null;
    return withTransaction(db, async (client) => {
        const res = await client.query(
            `
            SELECT
                c.contract_id,
                c.status,
                c.dispute_hold_since,
                ${contractOnDisputeHoldSql('c.contract_id')} AS on_hold,
                EXTRACT(EPOCH FROM (LOCALTIMESTAMP - c.dispute_hold_since))::bigint AS paused_seconds
            FROM contracts c
            WHERE c.contract_id = $1
            FOR UPDATE OF c
            `,
            [contractId]
        );
        const row = res.rows[0];
        if (!row) return null;
        if (ENDED_CONTRACT_STATUSES.includes(String(row.status || '').trim().toLowerCase())) {
            return { state: 'ended', contractId };
        }

        if (row.on_hold) {
            if (row.dispute_hold_since) return { state: 'held', started: false, contractId };
            await client.query(
                `UPDATE contracts SET dispute_hold_since = LOCALTIMESTAMP WHERE contract_id = $1`,
                [contractId]
            );
            return { state: 'held', started: true, contractId };
        }

        if (!row.dispute_hold_since) return { state: 'free', contractId };

        const shifted = await shiftContractClocks(client, contractId);
        await client.query(`UPDATE contracts SET dispute_hold_since = NULL WHERE contract_id = $1`, [contractId]);
        return {
            state: 'resumed',
            contractId,
            since: row.dispute_hold_since,
            pausedSeconds: Math.max(0, Number(row.paused_seconds) || 0),
            milestones: shifted.milestones,
        };
    });
}

/** Live contracts whose hold mark disagrees with their disputes (the reconcile job's work list). */
async function listContractsNeedingHoldSync(limit = 100) {
    const res = await pool.query(
        `
        SELECT c.contract_id
        FROM contracts c
        WHERE LOWER(c.status) NOT IN (${ENDED_SQL_LIST})
          AND (
            (c.dispute_hold_since IS NULL AND ${contractOnDisputeHoldSql('c.contract_id')})
            OR (c.dispute_hold_since IS NOT NULL AND NOT ${contractOnDisputeHoldSql('c.contract_id')})
          )
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

/** Parties, title and dispute number for the notices sent when a contract's hold changes. */
async function getContractHoldContext(contractId) {
    const res = await pool.query(
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

module.exports = {
    syncContractDisputeHold,
    listContractsNeedingHoldSync,
    listLiveContractsWithStandingSettlement,
    getContractHoldContext,
    getDisputeContractId,
    disputeHoldForContracts,
};
