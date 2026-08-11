const { pool } = require('../lib/Database');

async function getWalletsByUserId(userId) {
    const result = await pool.query(
        `SELECT u.account_id, w.wallet_id, w.type, w.status, w.balance_credits, w.frozen_balance_credits
         FROM users u
         JOIN account_wallets aw ON aw.account_id = u.account_id
         JOIN wallets w ON w.wallet_id = aw.wallet_id
         WHERE u.user_id = $1
           AND w.type IN ('account wallets', 'escrow wallets')
         ORDER BY w.type`,
        [userId]
    );
    return result.rows;
}

async function getWalletBalanceByUserId(userId) {
    const wallets = await getWalletsByUserId(userId);
    return wallets.find((wallet) => wallet.type === 'account wallets') || null;
}

async function getCashoutsByUserId(userId, { page = 1, pageSize = 10, search = '', sort = 'desc', status = '' } = {}) {
    const offset = (page - 1) * pageSize;
    const order = sort === 'asc' ? 'ASC' : 'DESC';
    const searchValue = search ? `%${search}%` : null;
    const result = await pool.query(
        `SELECT cashout_id, reference_id, xendit_disbursement_id, xendit_channel_code,
                account_no, account_name, amount_credits, fee_php_cents,
                net_amount_php_cents, status, failure_code, created_at, updated_at
         FROM cashouts
         WHERE user_id = $1
           AND ($2::text IS NULL OR cashout_id::text ILIKE $2 OR reference_id ILIKE $2 OR xendit_disbursement_id ILIKE $2)
           AND ($3::text IS NULL OR status = $3)
         ORDER BY created_at ${order}
         LIMIT $4 OFFSET $5`,
        [userId, searchValue, status || null, pageSize, offset]
    );
    const count = await pool.query(
        `SELECT COUNT(*)::integer AS total FROM cashouts
         WHERE user_id = $1
           AND ($2::text IS NULL OR cashout_id::text ILIKE $2 OR reference_id ILIKE $2 OR xendit_disbursement_id ILIKE $2)
           AND ($3::text IS NULL OR status = $3)`,
        [userId, searchValue, status || null]
    );
    const total = count.rows[0]?.total || 0;
    return { rows: result.rows, total, page, page_size: pageSize, total_pages: Math.max(1, Math.ceil(total / pageSize)) };
}

async function getCashoutsForReconciliation(limit = 100) {
    const result = await pool.query(
        `SELECT * FROM cashouts
         WHERE reference_id IS NOT NULL AND (
             status IN ('PENDING', 'PROCESSING', 'PENDING_COMPLIANCE')
             AND updated_at <= CURRENT_TIMESTAMP - INTERVAL '30 seconds'
         ) OR (reference_id IS NOT NULL AND notification_status IS DISTINCT FROM status)
         ORDER BY updated_at ASC
         LIMIT $1`,
        [limit]
    );
    return result.rows;
}

async function findCashoutByIdempotencyKey(userId, idempotencyKey) {
    const result = await pool.query(
        `SELECT * FROM cashouts WHERE user_id = $1 AND idempotency_key = $2 LIMIT 1`,
        [userId, idempotencyKey]
    );
    return result.rows[0] || null;
}

async function reserveCashout(data) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const existing = await client.query(
            `SELECT * FROM cashouts WHERE user_id = $1 AND idempotency_key = $2 LIMIT 1`,
            [data.user_id, data.idempotency_key]
        );
        if (existing.rows[0]) {
            await client.query('COMMIT');
            return { cashout: existing.rows[0], duplicate: true };
        }

        const walletResult = await client.query(
            `SELECT w.wallet_id, w.balance_credits, w.status
             FROM users u
             JOIN account_wallets aw ON aw.account_id = u.account_id
             JOIN wallets w ON w.wallet_id = aw.wallet_id
             WHERE u.user_id = $1 AND w.type = 'account wallets'
             FOR UPDATE OF w`,
            [data.user_id]
        );
        const wallet = walletResult.rows[0];
        if (!wallet) throw Object.assign(new Error('User wallet not found.'), { code: 'USER_WALLET_NOT_FOUND' });
        if (wallet.status !== 'active') throw Object.assign(new Error('User wallet is not active.'), { code: 'USER_WALLET_NOT_ACTIVE' });
        if (Number(wallet.balance_credits) < data.amount_credits) {
            throw Object.assign(new Error('Insufficient wallet balance.'), { code: 'INSUFFICIENT_WALLET_BALANCE' });
        }

        await client.query(
            `UPDATE wallets SET balance_credits = balance_credits - $1 WHERE wallet_id = $2`,
            [data.amount_credits, wallet.wallet_id]
        );
        const result = await client.query(
            `INSERT INTO cashouts (
                reference_id, idempotency_key, xendit_disbursement_id, xendit_channel_code,
                account_no, account_name, personal_mobile_number, street_line_1,
                city, province_state, postal_code, receipt_email, amount_credits, fee_php_cents,
                net_amount_php_cents, status, user_id
             ) VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'PENDING', $15)
             RETURNING *`,
            [data.reference_id, data.idempotency_key, data.channel_code, data.account_no,
                data.account_name, data.personal_mobile_number, data.street_line_1,
                data.city, data.province_state, data.postal_code, data.receipt_email, data.amount_credits,
                data.fee_php_cents, data.net_amount_php_cents, data.user_id]
        );
        const platformWalletResult = await client.query(
            `SELECT wallet_id FROM wallets WHERE type = 'platform wallets' AND status = 'active' LIMIT 1`
        );
        const platformWallet = platformWalletResult.rows[0];
        if (!platformWallet) throw new Error('Active platform wallet not found.');
        await client.query(
            `INSERT INTO credit_transactions (
                type, amount_credits, status, source_wallet_id, destination_wallet_id,
                reference_table, reference_id
             ) VALUES ('Cashout', $1, 'completed', $2, $3, 'cashouts', $4)
             ON CONFLICT DO NOTHING`,
            [data.amount_credits, wallet.wallet_id, platformWallet.wallet_id, result.rows[0].cashout_id]
        );
        await client.query('COMMIT');
        return { cashout: result.rows[0], duplicate: false };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function attachXenditPayout(cashoutId, payoutId, status) {
    const result = await pool.query(
        `UPDATE cashouts
         SET xendit_disbursement_id = $2, status = $3, updated_at = CURRENT_TIMESTAMP
         WHERE cashout_id = $1 RETURNING *`,
        [cashoutId, payoutId, status]
    );
    return result.rows[0] || null;
}

async function applyCashoutStatus({ referenceId, payoutId, status, failureCode = null, refund }) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const found = await client.query(
            `SELECT c.*, w.wallet_id
             FROM cashouts c
             JOIN users u ON u.user_id = c.user_id
             JOIN account_wallets aw ON aw.account_id = u.account_id
             JOIN wallets w ON w.wallet_id = aw.wallet_id AND w.type = 'account wallets'
             WHERE ($1::text IS NOT NULL AND c.reference_id = $1)
                OR ($2::text IS NOT NULL AND c.xendit_disbursement_id = $2)
             ORDER BY c.created_at DESC LIMIT 1 FOR UPDATE OF c, w`,
            [referenceId || null, payoutId || null]
        );
        const cashout = found.rows[0];
        if (!cashout) {
            await client.query('ROLLBACK');
            return null;
        }

        const terminalStatuses = new Set(['SUCCEEDED', 'FAILED', 'REVERSED', 'REJECTED', 'CANCELLED', 'EXPIRED']);
        const bouncebackStatuses = new Set(['FAILED', 'REVERSED', 'REJECTED']);
        let effectiveStatus = status;
        // Never let a delayed ACCEPTED/PROCESSING response overwrite a terminal webhook.
        // A succeeded payout may still legitimately bounce back later.
        if (terminalStatuses.has(cashout.status)) {
            const isSucceededBounceback = cashout.status === 'SUCCEEDED' && bouncebackStatuses.has(status);
            if (!isSucceededBounceback) effectiveStatus = cashout.status;
        }
        const shouldRefund = refund && effectiveStatus !== 'SUCCEEDED' && !cashout.refunded_at;
        if (shouldRefund) {
            await client.query(
                `UPDATE wallets SET balance_credits = balance_credits + $1 WHERE wallet_id = $2`,
                [cashout.amount_credits, cashout.wallet_id]
            );
            const platformWalletResult = await client.query(
                `SELECT wallet_id FROM wallets WHERE type = 'platform wallets' AND status = 'active' LIMIT 1`
            );
            const platformWallet = platformWalletResult.rows[0];
            if (!platformWallet) throw new Error('Active platform wallet not found.');
            await client.query(
                `INSERT INTO credit_transactions (
                    type, amount_credits, status, source_wallet_id, destination_wallet_id,
                    reference_table, reference_id
                 ) VALUES ('Cashout Refund', $1, 'completed', $2, $3, 'cashouts', $4)
                 ON CONFLICT DO NOTHING`,
                [cashout.amount_credits, platformWallet.wallet_id, cashout.wallet_id, cashout.cashout_id]
            );
        }
        const statusChanged = cashout.status !== effectiveStatus;
        const updated = await client.query(
            `UPDATE cashouts SET status = $2, failure_code = COALESCE($3, failure_code),
                    xendit_disbursement_id = COALESCE($4, xendit_disbursement_id),
                    refunded_at = CASE WHEN $5 THEN COALESCE(refunded_at, CURRENT_TIMESTAMP) ELSE refunded_at END,
                    updated_at = CURRENT_TIMESTAMP
             WHERE cashout_id = $1 RETURNING *`,
            [cashout.cashout_id, effectiveStatus, failureCode, payoutId || null, shouldRefund]
        );
        await client.query('COMMIT');
        return { ...updated.rows[0], status_changed: statusChanged };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function markCashoutNotificationStatus(cashoutId, status) {
    await pool.query(
        `UPDATE cashouts SET notification_status = $2 WHERE cashout_id = $1`,
        [cashoutId, status]
    );
}

module.exports = {
    getWalletsByUserId,
    getWalletBalanceByUserId,
    getCashoutsByUserId,
    getCashoutsForReconciliation,
    findCashoutByIdempotencyKey,
    reserveCashout,
    attachXenditPayout,
    applyCashoutStatus,
    markCashoutNotificationStatus,
};
