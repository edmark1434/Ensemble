/**
 * MilestoneRepositories.js
 *
 * All SQL for milestone deadline tracking, auto-approve, and client-initiated
 * cancel/extend/approve/revision actions.
 *
 * Money flows (all inside DB transactions):
 *   Cancel & Refund  → freelancer escrow  ──→  client account wallet
 *   Approve/Release  → freelancer escrow  ──→  freelancer account wallet
 */

const { pool } = require('../lib/Database');

// ─── Constants ───────────────────────────────────────────────────────────────
const AUTO_APPROVE_DAYS_JOB  = 5;   // Days after submission before auto-approve (job contracts)
const AUTO_APPROVE_DAYS_GIG  = 3;   // Days after submission before auto-approve (gig contracts)
const REVIEW_REMINDER_DAY    = 3;   // Day to send "auto-approves in 2 days" reminder
const STALLED_DAYS           = 7;   // Days overdue before escalating to stalled
const ABANDONED_DAYS         = 30;  // Days overdue before marking abandoned
const DEADLINE_REMINDER_HRS  = 48;  // Hours before deadline to warn freelancer

// ─── Cron: Overdue Detector ───────────────────────────────────────────────────

/**
 * Returns active milestones whose real deadline has passed and
 * that have not yet been flagged overdue.
 */
async function getActiveMilestonesNowOverdue() {
    const res = await pool.query(`
        SELECT
            cm.contract_milestone_id,
            cm.name          AS milestone_name,
            cm.credits,
            cm.deadline      AS deadline_hrs,
            cm.started_at,
            cm.contract_id,
            cm.index,
            c.contract_type,
            COALESCE(jc_info.client_account_id,  gc_info.client_account_id)  AS client_account_id,
            COALESCE(jc_info.freelancer_account_id, gc_info.freelancer_account_id) AS freelancer_account_id,
            COALESCE(jc_info.title, gc_info.title, 'Your Contract') AS contract_title
        FROM contract_milestones cm
        JOIN contracts c ON cm.contract_id = c.contract_id
        LEFT JOIN (
            SELECT jc.contract_id,
                   j.client_account_id,
                   p.freelancer_account_id,
                   j.title
            FROM job_contracts jc
            JOIN proposals p ON jc.proposal_id = p.proposal_id
            JOIN jobs j ON p.job_id = j.job_id
        ) jc_info ON c.contract_id = jc_info.contract_id
        LEFT JOIN (
            SELECT gc.contract_id,
                   gr.client_account_id,
                   g.freelancer_account_id,
                   g.title
            FROM gig_contracts gc
            JOIN gig_requests gr ON gc.gig_request_id = gr.gig_request_id
            JOIN gig_tiers gt ON gr.gig_tier_id = gt.gig_tier_id
            JOIN gigs g ON gt.gig_id = g.gig_id
        ) gc_info ON c.contract_id = gc_info.contract_id
        WHERE cm.status = 'active'
          AND cm.started_at IS NOT NULL
          AND cm.overdue_at IS NULL
          AND NOW() > cm.started_at + (cm.deadline * interval '1 hour')
    `);
    return res.rows;
}

/**
 * Mark a milestone overdue (set overdue_at, status → 'overdue').
 */
async function markMilestoneOverdue(milestoneId) {
    await pool.query(`
        UPDATE contract_milestones
        SET status     = 'overdue',
            overdue_at = NOW()
        WHERE contract_milestone_id = $1
          AND status = 'active'
    `, [milestoneId]);
}

// ─── Cron: Stalled Escalator ─────────────────────────────────────────────────

/**
 * Returns overdue milestones that have been sitting for STALLED_DAYS
 * with no submission and are not yet stalled/abandoned.
 */
async function getOverdueMilestonesNowStalled() {
    const res = await pool.query(`
        SELECT
            cm.contract_milestone_id,
            cm.name          AS milestone_name,
            cm.contract_id,
            cm.overdue_at,
            COALESCE(jc_info.client_account_id,  gc_info.client_account_id)  AS client_account_id,
            COALESCE(jc_info.freelancer_account_id, gc_info.freelancer_account_id) AS freelancer_account_id,
            COALESCE(jc_info.title, gc_info.title, 'Your Contract') AS contract_title
        FROM contract_milestones cm
        JOIN contracts c ON cm.contract_id = c.contract_id
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
        WHERE cm.status = 'overdue'
          AND cm.overdue_at IS NOT NULL
          AND NOW() > cm.overdue_at + ($1 || ' days')::interval
          AND NOT EXISTS (
              SELECT 1 FROM milestone_submits ms
              WHERE ms.contract_milestone_id = cm.contract_milestone_id
          )
    `, [STALLED_DAYS]);
    return res.rows;
}

async function markMilestoneStalled(milestoneId) {
    await pool.query(`
        UPDATE contract_milestones
        SET status = 'stalled'
        WHERE contract_milestone_id = $1
          AND status = 'overdue'
    `, [milestoneId]);
}

// ─── Cron: Abandoned Marker ───────────────────────────────────────────────────

/**
 * Returns stalled milestones with no action for ABANDONED_DAYS.
 */
async function getStalledMilestonesNowAbandoned() {
    const res = await pool.query(`
        SELECT
            cm.contract_milestone_id,
            cm.name          AS milestone_name,
            cm.contract_id,
            COALESCE(jc_info.client_account_id,  gc_info.client_account_id)  AS client_account_id,
            COALESCE(jc_info.freelancer_account_id, gc_info.freelancer_account_id) AS freelancer_account_id,
            COALESCE(jc_info.title, gc_info.title, 'Your Contract') AS contract_title
        FROM contract_milestones cm
        JOIN contracts c ON cm.contract_id = c.contract_id
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
        WHERE cm.status = 'stalled'
          AND cm.overdue_at IS NOT NULL
          AND NOW() > cm.overdue_at + ($1 || ' days')::interval
    `, [ABANDONED_DAYS]);
    return res.rows;
}

async function markMilestoneAbandoned(milestoneId) {
    await pool.query(`
        UPDATE contract_milestones
        SET status = 'abandoned'
        WHERE contract_milestone_id = $1
          AND status = 'stalled'
    `, [milestoneId]);
}

// ─── Cron: Auto-Approve ───────────────────────────────────────────────────────

/**
 * Returns submissions that have been under_review beyond the auto-approve window.
 * Joins contract type to use the correct day threshold (5 for job, 3 for gig).
 */
async function getSubmissionsReadyForAutoApproval() {
    const res = await pool.query(`
        SELECT
            ms.milestone_submit_id,
            ms.submitted_at,
            ms.contract_milestone_id,
            cm.name          AS milestone_name,
            cm.credits,
            cm.contract_id,
            cm.index         AS milestone_index,
            c.contract_type,
            COALESCE(jc_info.client_account_id,  gc_info.client_account_id)  AS client_account_id,
            COALESCE(jc_info.freelancer_account_id, gc_info.freelancer_account_id) AS freelancer_account_id,
            COALESCE(jc_info.title, gc_info.title, 'Your Contract') AS contract_title
        FROM milestone_submits ms
        JOIN contract_milestones cm ON ms.contract_milestone_id = cm.contract_milestone_id
        JOIN contracts c ON cm.contract_id = c.contract_id
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
        WHERE ms.status = 'under_review'
          AND (
            (c.contract_type = 'job' AND NOW() > ms.submitted_at + ($1 || ' days')::interval)
            OR
            (c.contract_type = 'gig' AND NOW() > ms.submitted_at + ($2 || ' days')::interval)
          )
    `, [AUTO_APPROVE_DAYS_JOB, AUTO_APPROVE_DAYS_GIG]);
    return res.rows;
}

/**
 * Auto-approve a submission: release milestone credits from freelancer escrow
 * to freelancer account wallet. Activate next pending milestone if any.
 */
async function autoApproveMilestoneSubmit({ milestoneSubmitId, milestoneId, contractId, milestoneIndex, milestoneCredits, freelancerAccountId }) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Lock & verify submission is still under_review
        const lockRes = await client.query(`
            SELECT ms.milestone_submit_id
            FROM milestone_submits ms
            JOIN contract_milestones cm ON ms.contract_milestone_id = cm.contract_milestone_id
            WHERE ms.milestone_submit_id = $1
              AND ms.status = 'under_review'
              AND cm.status IN ('active', 'overdue')
            FOR UPDATE OF ms
        `, [milestoneSubmitId]);

        if (lockRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return null; // Already handled
        }

        // 2. Get freelancer escrow wallet → freelancer account wallet
        const walletsRes = await client.query(`
            SELECT w.wallet_id, w.type, w.balance_credits
            FROM account_wallets aw
            JOIN wallets w ON aw.wallet_id = w.wallet_id
            WHERE aw.account_id = $1
              AND w.status = 'active'
              AND w.type IN ('escrow wallets', 'account wallets')
            FOR UPDATE OF w
        `, [freelancerAccountId]);

        const escrowWallet  = walletsRes.rows.find(r => r.type === 'escrow wallets');
        const accountWallet = walletsRes.rows.find(r => r.type === 'account wallets');

        if (!escrowWallet || !accountWallet) throw new Error('Freelancer wallets not found');
        if (escrowWallet.balance_credits < milestoneCredits) throw new Error('Insufficient escrow balance for auto-approval');

        // 3. Debit freelancer escrow
        await client.query(`
            UPDATE wallets SET balance_credits = balance_credits - $1
            WHERE wallet_id = $2 AND balance_credits >= $1
        `, [milestoneCredits, escrowWallet.wallet_id]);

        // 4. Credit freelancer account wallet
        const creditRes = await client.query(`
            UPDATE wallets SET balance_credits = balance_credits + $1
            WHERE wallet_id = $2
            RETURNING balance_credits
        `, [milestoneCredits, accountWallet.wallet_id]);

        // 5. Log credit transaction
        const txRes = await client.query(`
            INSERT INTO credit_transactions
                (type, amount_credits, status, source_wallet_id, destination_wallet_id, reference_table, reference_id)
            VALUES
                ('Escrow Release', $1, 'completed', $2, $3, 'contract_milestones', $4)
            RETURNING credit_transaction_id
        `, [milestoneCredits, escrowWallet.wallet_id, accountWallet.wallet_id, milestoneId]);

        // 6. Update submission status
        await client.query(`
            UPDATE milestone_submits
            SET status = 'auto_approved', responded_at = NOW()
            WHERE milestone_submit_id = $1
        `, [milestoneSubmitId]);

        // 7. Update milestone status → completed
        await client.query(`
            UPDATE contract_milestones
            SET status = 'completed'
            WHERE contract_milestone_id = $1
        `, [milestoneId]);

        // 8. Activate next pending milestone (if any)
        const nextRes = await client.query(`
            UPDATE contract_milestones
            SET status = 'active', started_at = NOW()
            WHERE contract_id = $1
              AND index = $2
              AND status = 'pending'
            RETURNING contract_milestone_id, name
        `, [contractId, milestoneIndex + 1]);

        // 9. Check if all milestones completed → mark contract Done
        const pendingCount = await client.query(`
            SELECT COUNT(*) AS cnt FROM contract_milestones
            WHERE contract_id = $1 AND status NOT IN ('completed', 'cancelled', 'abandoned')
        `, [contractId]);

        if (parseInt(pendingCount.rows[0].cnt, 10) === 0) {
            await client.query(`
                UPDATE contracts SET status = 'Done' WHERE contract_id = $1
            `, [contractId]);
        }

        await client.query('COMMIT');
        return {
            transactionId: txRes.rows[0].credit_transaction_id,
            newBalance: Number(creditRes.rows[0].balance_credits),
            nextMilestone: nextRes.rows[0] || null,
        };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

// ─── Cron: Reminders ─────────────────────────────────────────────────────────

/**
 * Active milestones approaching deadline (within DEADLINE_REMINDER_HRS).
 * The cron checks once per hour so we need a 1-hour window to avoid double-sending.
 */
async function getApproachingDeadlineMilestones() {
    const res = await pool.query(`
        SELECT
            cm.contract_milestone_id,
            cm.name          AS milestone_name,
            cm.deadline      AS deadline_hrs,
            cm.started_at,
            cm.contract_id,
            COALESCE(jc_info.freelancer_account_id, gc_info.freelancer_account_id) AS freelancer_account_id,
            COALESCE(jc_info.title, gc_info.title, 'Your Contract') AS contract_title
        FROM contract_milestones cm
        JOIN contracts c ON cm.contract_id = c.contract_id
        LEFT JOIN (
            SELECT jc.contract_id, p.freelancer_account_id, j.title
            FROM job_contracts jc
            JOIN proposals p ON jc.proposal_id = p.proposal_id
            JOIN jobs j ON p.job_id = j.job_id
        ) jc_info ON c.contract_id = jc_info.contract_id
        LEFT JOIN (
            SELECT gc.contract_id, g.freelancer_account_id, g.title
            FROM gig_contracts gc
            JOIN gig_requests gr ON gc.gig_request_id = gr.gig_request_id
            JOIN gig_tiers gt ON gr.gig_tier_id = gt.gig_tier_id
            JOIN gigs g ON gt.gig_id = g.gig_id
        ) gc_info ON c.contract_id = gc_info.contract_id
        WHERE cm.status = 'active'
          AND cm.started_at IS NOT NULL
          AND cm.overdue_at IS NULL
          AND NOW() > cm.started_at + ((cm.deadline - $1) * interval '1 hour')
          AND NOW() < cm.started_at + (cm.deadline * interval '1 hour')
          AND NOT EXISTS (
              SELECT 1 FROM notifications n
              WHERE n.reference_table = 'contract_milestones'
                AND n.reference_id    = cm.contract_milestone_id
                AND n.reference_prefix = 'MILESTONE_DUE_SOON'
                AND n.account_id = COALESCE(jc_info.freelancer_account_id, gc_info.freelancer_account_id)
          )
    `, [DEADLINE_REMINDER_HRS]);
    return res.rows;
}

/**
 * Submissions under_review at REVIEW_REMINDER_DAY for job contracts (or 2 for gig)
 * that haven't had a review-reminder notification sent yet.
 */
async function getSubmissionsNeedingReviewReminder() {
    const res = await pool.query(`
        SELECT
            ms.milestone_submit_id,
            ms.submitted_at,
            ms.contract_milestone_id,
            cm.name          AS milestone_name,
            cm.contract_id,
            c.contract_type,
            COALESCE(jc_info.client_account_id, gc_info.client_account_id) AS client_account_id,
            COALESCE(jc_info.title, gc_info.title, 'Your Contract') AS contract_title
        FROM milestone_submits ms
        JOIN contract_milestones cm ON ms.contract_milestone_id = cm.contract_milestone_id
        JOIN contracts c ON cm.contract_id = c.contract_id
        LEFT JOIN (
            SELECT jc.contract_id, j.client_account_id, j.title
            FROM job_contracts jc
            JOIN proposals p ON jc.proposal_id = p.proposal_id
            JOIN jobs j ON p.job_id = j.job_id
        ) jc_info ON c.contract_id = jc_info.contract_id
        LEFT JOIN (
            SELECT gc.contract_id, gr.client_account_id, g.title
            FROM gig_contracts gc
            JOIN gig_requests gr ON gc.gig_request_id = gr.gig_request_id
            JOIN gig_tiers gt ON gr.gig_tier_id = gt.gig_tier_id
            JOIN gigs g ON gt.gig_id = g.gig_id
        ) gc_info ON c.contract_id = gc_info.contract_id
        WHERE ms.status = 'under_review'
          AND (
            (c.contract_type = 'job' AND NOW() > ms.submitted_at + ($1 || ' days')::interval
             AND NOW() < ms.submitted_at + ($2 || ' days')::interval)
            OR
            (c.contract_type = 'gig' AND NOW() > ms.submitted_at + ($3 || ' days')::interval
             AND NOW() < ms.submitted_at + ($4 || ' days')::interval)
          )
          AND NOT EXISTS (
              SELECT 1 FROM notifications n
              WHERE n.reference_table = 'milestone_submits'
                AND n.reference_id    = ms.milestone_submit_id
                AND n.reference_prefix = 'MILESTONE_REVIEW_REMINDER'
          )
    `, [REVIEW_REMINDER_DAY, AUTO_APPROVE_DAYS_JOB, 2, AUTO_APPROVE_DAYS_GIG]);
    return res.rows;
}

// ─── Client Actions (API endpoints) ──────────────────────────────────────────

/**
 * Client cancels a milestone and gets a full credit refund.
 * Milestone must be in: overdue | stalled | abandoned
 */
async function cancelMilestoneAndRefund({ milestoneId, clientAccountId, freelancerAccountId }) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Lock milestone
        const milestoneRes = await client.query(`
            SELECT contract_milestone_id, status, credits, contract_id, index
            FROM contract_milestones
            WHERE contract_milestone_id = $1
              AND status IN ('overdue', 'stalled', 'abandoned')
            FOR UPDATE
        `, [milestoneId]);

        if (milestoneRes.rows.length === 0) {
            throw new Error('Milestone not eligible for cancellation');
        }

        const { credits, contract_id, index: milestoneIndex } = milestoneRes.rows[0];
        const milestoneCredits = Number(credits);

        // 2. Get wallets
        const walletsRes = await client.query(`
            SELECT aw.account_id, w.wallet_id, w.type, w.balance_credits
            FROM account_wallets aw
            JOIN wallets w ON aw.wallet_id = w.wallet_id
            WHERE aw.account_id = ANY($1::uuid[])
              AND w.status = 'active'
              AND w.type IN ('escrow wallets', 'account wallets')
            FOR UPDATE OF w
        `, [[clientAccountId, freelancerAccountId]]);

        const freelancerEscrow = walletsRes.rows.find(
            r => String(r.account_id) === String(freelancerAccountId) && r.type === 'escrow wallets'
        );
        const clientAccountWallet = walletsRes.rows.find(
            r => String(r.account_id) === String(clientAccountId) && r.type === 'account wallets'
        );

        if (!freelancerEscrow) throw new Error('Freelancer escrow wallet not found');
        if (!clientAccountWallet) throw new Error('Client account wallet not found');
        if (freelancerEscrow.balance_credits < milestoneCredits) throw new Error('Insufficient escrow balance for refund');

        // 3. Debit freelancer escrow
        await client.query(`
            UPDATE wallets SET balance_credits = balance_credits - $1
            WHERE wallet_id = $2 AND balance_credits >= $1
        `, [milestoneCredits, freelancerEscrow.wallet_id]);

        // 4. Credit client account wallet (the refund)
        const refundRes = await client.query(`
            UPDATE wallets SET balance_credits = balance_credits + $1
            WHERE wallet_id = $2
            RETURNING balance_credits
        `, [milestoneCredits, clientAccountWallet.wallet_id]);

        // 5. Log transaction
        const txRes = await client.query(`
            INSERT INTO credit_transactions
                (type, amount_credits, status, source_wallet_id, destination_wallet_id, reference_table, reference_id)
            VALUES
                ('Escrow Release', $1, 'completed', $2, $3, 'contract_milestones', $4)
            RETURNING credit_transaction_id
        `, [milestoneCredits, freelancerEscrow.wallet_id, clientAccountWallet.wallet_id, milestoneId]);

        // 6. Mark milestone cancelled
        await client.query(`
            UPDATE contract_milestones SET status = 'cancelled'
            WHERE contract_milestone_id = $1
        `, [milestoneId]);

        // 7. If all non-completed milestones are now cancelled → mark contract Cancelled
        const remainingRes = await client.query(`
            SELECT COUNT(*) AS cnt FROM contract_milestones
            WHERE contract_id = $1
              AND status NOT IN ('completed', 'cancelled', 'abandoned')
        `, [contract_id]);

        let contractCancelled = false;
        if (parseInt(remainingRes.rows[0].cnt, 10) === 0) {
            await client.query(`UPDATE contracts SET status = 'Cancelled' WHERE contract_id = $1`, [contract_id]);
            contractCancelled = true;
        }

        await client.query('COMMIT');
        return {
            transactionId: txRes.rows[0].credit_transaction_id,
            refundedCredits: milestoneCredits,
            newClientBalance: Number(refundRes.rows[0].balance_credits),
            contractCancelled,
        };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Client extends the deadline. No money moves.
 */
async function extendMilestoneDeadline({ milestoneId, clientAccountId, extensionDays }) {
    if (!extensionDays || extensionDays < 1 || extensionDays > 90) {
        throw new Error('Extension must be between 1 and 90 days');
    }

    const res = await pool.query(`
        UPDATE contract_milestones
        SET
            deadline   = deadline + ($1 * 24),
            overdue_at = NULL,
            status     = CASE WHEN status IN ('overdue', 'stalled') THEN 'active' ELSE status END
        WHERE contract_milestone_id = $2
          AND status IN ('active', 'overdue', 'stalled')
        RETURNING contract_milestone_id, name, deadline, status
    `, [extensionDays, milestoneId]);

    if (res.rows.length === 0) throw new Error('Milestone not eligible for deadline extension');
    return res.rows[0];
}

/**
 * Client manually approves a milestone submission.
 */
async function approveMilestoneSubmit({ milestoneId, contractId, milestoneIndex, milestoneCredits, freelancerAccountId }) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Lock the latest under_review submission for this milestone
        const submitRes = await client.query(`
            SELECT milestone_submit_id FROM milestone_submits
            WHERE contract_milestone_id = $1 AND status = 'under_review'
            ORDER BY submitted_at DESC
            LIMIT 1
            FOR UPDATE
        `, [milestoneId]);

        if (submitRes.rows.length === 0) throw new Error('No pending submission found for this milestone');
        const milestoneSubmitId = submitRes.rows[0].milestone_submit_id;

        // Get wallets
        const walletsRes = await client.query(`
            SELECT w.wallet_id, w.type, w.balance_credits
            FROM account_wallets aw
            JOIN wallets w ON aw.wallet_id = w.wallet_id
            WHERE aw.account_id = $1 AND w.status = 'active'
              AND w.type IN ('escrow wallets', 'account wallets')
            FOR UPDATE OF w
        `, [freelancerAccountId]);

        const escrowWallet  = walletsRes.rows.find(r => r.type === 'escrow wallets');
        const accountWallet = walletsRes.rows.find(r => r.type === 'account wallets');

        if (!escrowWallet || !accountWallet) throw new Error('Freelancer wallets not found');
        if (escrowWallet.balance_credits < milestoneCredits) throw new Error('Insufficient escrow balance');

        // Debit escrow → credit account wallet
        await client.query(`
            UPDATE wallets SET balance_credits = balance_credits - $1
            WHERE wallet_id = $2 AND balance_credits >= $1
        `, [milestoneCredits, escrowWallet.wallet_id]);

        const creditRes = await client.query(`
            UPDATE wallets SET balance_credits = balance_credits + $1
            WHERE wallet_id = $2 RETURNING balance_credits
        `, [milestoneCredits, accountWallet.wallet_id]);

        const txRes = await client.query(`
            INSERT INTO credit_transactions
                (type, amount_credits, status, source_wallet_id, destination_wallet_id, reference_table, reference_id)
            VALUES ('Escrow Release', $1, 'completed', $2, $3, 'contract_milestones', $4)
            RETURNING credit_transaction_id
        `, [milestoneCredits, escrowWallet.wallet_id, accountWallet.wallet_id, milestoneId]);

        await client.query(`
            UPDATE milestone_submits SET status = 'approved', responded_at = NOW()
            WHERE milestone_submit_id = $1
        `, [milestoneSubmitId]);

        await client.query(`
            UPDATE contract_milestones SET status = 'completed'
            WHERE contract_milestone_id = $1
        `, [milestoneId]);

        // Activate next milestone
        const nextRes = await client.query(`
            UPDATE contract_milestones SET status = 'active', started_at = NOW()
            WHERE contract_id = $1 AND index = $2 AND status = 'pending'
            RETURNING contract_milestone_id, name
        `, [contractId, milestoneIndex + 1]);

        // Check if contract is done
        const pendingCount = await client.query(`
            SELECT COUNT(*) AS cnt FROM contract_milestones
            WHERE contract_id = $1 AND status NOT IN ('completed', 'cancelled', 'abandoned')
        `, [contractId]);

        if (parseInt(pendingCount.rows[0].cnt, 10) === 0) {
            await client.query(`UPDATE contracts SET status = 'Done' WHERE contract_id = $1`, [contractId]);
        }

        await client.query('COMMIT');
        return {
            transactionId: txRes.rows[0].credit_transaction_id,
            newBalance: Number(creditRes.rows[0].balance_credits),
            nextMilestone: nextRes.rows[0] || null,
        };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Client requests a revision on the latest submission.
 */
async function requestMilestoneRevision({ milestoneId, revisionNote }) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Verify revisions remaining
        const milestoneRes = await client.query(`
            SELECT cm.no_of_revisions_max,
                   (SELECT COUNT(*) FROM milestone_submits ms
                    WHERE ms.contract_milestone_id = cm.contract_milestone_id
                      AND ms.status = 'revision_requested') AS revision_count
            FROM contract_milestones cm
            WHERE cm.contract_milestone_id = $1
            FOR UPDATE
        `, [milestoneId]);

        if (milestoneRes.rows.length === 0) throw new Error('Milestone not found');

        const { no_of_revisions_max, revision_count } = milestoneRes.rows[0];
        if (parseInt(revision_count, 10) >= parseInt(no_of_revisions_max, 10)) {
            throw new Error(`Maximum revisions (${no_of_revisions_max}) reached`);
        }

        // Mark current submission as revision_requested
        await client.query(`
            UPDATE milestone_submits
            SET status = 'revision_requested', responded_at = NOW()
            WHERE contract_milestone_id = $1 AND status = 'under_review'
        `, [milestoneId]);

        await client.query('COMMIT');
        return { revisionsUsed: parseInt(revision_count, 10) + 1, revisionsMax: parseInt(no_of_revisions_max, 10) };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Look up the contract parties for a given milestone — used in controller
 * for authorization checks and notification targeting.
 */
async function getMilestoneWithParties(milestoneId) {
    const res = await pool.query(`
        SELECT
            cm.contract_milestone_id,
            cm.name          AS milestone_name,
            cm.credits,
            cm.status,
            cm.deadline,
            cm.index,
            cm.contract_id,
            c.contract_type,
            COALESCE(jc_info.client_account_id,  gc_info.client_account_id)  AS client_account_id,
            COALESCE(jc_info.freelancer_account_id, gc_info.freelancer_account_id) AS freelancer_account_id,
            COALESCE(jc_info.title, gc_info.title, 'Your Contract') AS contract_title
        FROM contract_milestones cm
        JOIN contracts c ON cm.contract_id = c.contract_id
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
        WHERE cm.contract_milestone_id = $1
    `, [milestoneId]);
    return res.rows[0] || null;
}

module.exports = {
    // Cron queries
    getActiveMilestonesNowOverdue,
    markMilestoneOverdue,
    getOverdueMilestonesNowStalled,
    markMilestoneStalled,
    getStalledMilestonesNowAbandoned,
    markMilestoneAbandoned,
    getSubmissionsReadyForAutoApproval,
    autoApproveMilestoneSubmit,
    getApproachingDeadlineMilestones,
    getSubmissionsNeedingReviewReminder,
    // Client action queries
    cancelMilestoneAndRefund,
    extendMilestoneDeadline,
    approveMilestoneSubmit,
    requestMilestoneRevision,
    getMilestoneWithParties,
};
