const { pool } = require('../lib/Database');


async function createPaymentMethod(data) {
    try {
        const query = `
            INSERT INTO payment_methods (
                user_id,
                provider,
                provider_payment_method_id,
                type,
                channel_code,
                brand,
                last4,
                expiry_month,
                expiry_year,
                masked_account,
                is_default,
                status
            )
            VALUES (
                $1, $2, $3, $4, $5, $6,
                $7, $8, $9, $10, $11, $12
            )
            RETURNING *;
        `;

        const values = [
            data.user_id,
            data.provider,
            data.provider_payment_method_id,
            data.type,
            data.channel_code,
            data.brand,
            data.last4,
            data.expiry_month,
            data.expiry_year,
            data.masked_account,
            data.is_default,
            data.status
        ];

        const result = await pool.query(query, values);

        return result.rows[0];
    } catch (err) {
        console.error("Error creating payment method:", err);
        throw err;
    }
}

async function getPaymentByUserIdAndStatus(userId,paymentType,channelCode,amount,currency,description) {
    try{
        const query = `
            SELECT * FROM payments
            WHERE user_id = $1 AND status IN ('PENDING', 'REQUIRES_ACTION')
            AND PAYMENT_TYPE = $2 AND CHANNEL_CODE = $3 AND AMOUNT = $4 AND CURRENCY = $5
            AND DESCRIPTION = $6
            ORDER BY created_at DESC
            LIMIT 1
        `;
        const values = [userId, paymentType, channelCode, amount, currency, description];
        const result = await pool.query(query, values);
        return result.rows;
    } catch (err) {
        console.error("Error fetching payment by user ID and status:", err);
        throw err;
    }
}

async function getPaymentByReferenceId(reference_id) {
    try{
        const query = `
            SELECT * FROM payments
            WHERE reference_id = $1
        `;
        const values = [reference_id];
        const result = await pool.query(query, values);
        return result.rows[0];
    }
    catch (err) {
        console.error("Error fetching payment by reference ID:", err);
        throw err;
    }
}

async function updatePaymentWithReferenceId(reference_id,paymentRequestId,status,redirect_url) {
    try{
        const query = `
            UPDATE payments
SET
    provider_payment_request_id = $2,
    status = $3,
    redirect_url = $4,
    expires_at = NOW() + INTERVAL '15 minutes',
    updated_at = CURRENT_TIMESTAMP
WHERE reference_id = $1;;
        `;
        const values = [reference_id, paymentRequestId, status, redirect_url];
        const result = await pool.query(query, values);
        return result.rows[0];
    }catch (err) {
        console.error("Error updating payment with reference ID:", err);
        throw err;
    }
}

async function updatePaymentByReference(referenceId, updates) {
    try {
        if (!referenceId) {
            throw new Error("referenceId is required.");
        }

        if (!updates || Object.keys(updates).length === 0) {
            throw new Error("No fields to update.");
        }

        const setClauses = [];
        const values = [];
        let index = 1;

        for (const [column, value] of Object.entries(updates)) {
            if (value === undefined) continue;

            setClauses.push(`${column} = $${index}`);
            values.push(value);
            index++;
        }

        // Always update updated_at
        setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

        values.push(referenceId);

        const query = `
            UPDATE payments
            SET ${setClauses.join(", ")}
            WHERE reference_id = $${index}
            RETURNING *;
        `;

        const result = await pool.query(query, values);

        return result.rows[0];
    } catch (err) {
        console.error("Error updating payment:", err);
        throw err;
    }
}

async function updateTopUpStatus(reference_id,status,paymentId,channelCode) {
    try {
        const query = `
            UPDATE topups
            SET status = $2,
            xendit_payment_id = $3,
            xendit_channel_code = $4
            WHERE topup_id = $1
            RETURNING credits_granted;
        `;
        const values = [reference_id,status,paymentId,channelCode];
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error("Error updating top-up status:", err);
        throw err;
    }
}

async function updateWalletFromTopUp(userId, credits) {
    try {
        const query = `
            UPDATE wallets w
            SET balance_credits = w.balance_credits + $2
            FROM account_wallets aw
            WHERE w.wallet_id = aw.wallet_id AND w.type = 'account wallets'
            AND aw.account_id = (
                SELECT account_id
                FROM users
                WHERE user_id = $1
            )
            returning w.wallet_id;
        `;
        const values = [userId, credits];
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error("Error updating wallet balance:", err);
        throw err;
    }
}

async function createTopUpPaymentSession(payload){
    try{
        const query = `
            INSERT INTO PAYMENTS(
            USER_ID,REFERENCE_ID,AMOUNT,
            CURRENCY,STATUS,CREDITS,DESCRIPTION,PAYMENT_TYPE)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;
        `;
        const result = await pool.query(query, [
            payload.user_id,
            payload.reference_id,
            payload.amount,
            payload.currency,
            payload.status,
            payload.credits,
            payload.description,
            payload.payment_type
        ]);
        return result.rows[0];
    }catch(err){
        console.error("Error creating top-up payment session:", err);
        throw err;
    }
}

async function createSubscriptionPayment(payload){
    try{
        const query = `
            INSERT INTO PAYMENTS(
            user_id,reference_id,amount,
            currency,status,description,payment_type, payment_request_id, payment_id, channel_code,
            payment_token_id,customer_id,processed_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *;
        `;
        const result = await pool.query(query, [
            payload.user_id,
            payload.reference_id,
            payload.amount,
            payload.currency,
            payload.status,
            payload.description,
            payload.payment_type,
            payload.payment_request_id,
            payload.payment_id,
            payload.channel_code,
            payload.payment_token_id,
            payload.customer_id,
            payload.processed_at
        ]);
        return result.rows[0];
    }catch(err){
        console.error("Error creating subscription payment:", err);
        throw err;
    }
}

async function getPaymentCheckOutByPayload(payload, type = 'checkout') {
    try{
        const paymentTokenCondition = type === 'checkout' ? 'AND PAYMENT_TOKEN_ID IS NULL' : 'AND PAYMENT_TOKEN_ID IS NOT NULL';
        const query = `
            SELECT * FROM PAYMENTS
            WHERE USER_ID = $1 AND AMOUNT = $2
            AND CURRENCY = $3 AND STATUS IN ('REQUIRES_ACTION', 'PENDING', 'ACTIVE') AND CREDITS = $4
            AND DESCRIPTION = $5 ${paymentTokenCondition}
        `;
        const values = [payload.user_id, payload.amount, payload.currency, payload.credits, payload.description];
        const result = await pool.query(query, values);
        return result.rows;
    }catch(err){
        console.error("Error fetching payment by payload:", err);
        throw err;
    }
}

async function updatePayment(payload) {
    try{
        const query = `
            UPDATE payments
            SET customer_id = $2,
            payment_session_id = $3,
            channel_code = $4,
            redirect_url = $5,
            expired_at = $6
            WHERE reference_id = $1;
        `;
        const values = [payload.reference_id, payload.customerId, payload.PaymentSessionId, payload.channelCode, payload.redirectUrl, payload.expired_at];
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error("Error updating payment status:", err);
        throw err;
    }
}

async function updateUserCustomerId(userId, customerId) {
    try {
        const query = `
            UPDATE users
            SET customer_id = $2
            WHERE user_id = $1
            RETURNING customer_id;
        `;
        const values = [userId, customerId];
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error("Error updating user customer ID:", err);
        throw err;
    }
}

async function getCustomerIdByUserId(userId) {
    try {
        const query = `
            SELECT customer_id FROM users
            WHERE user_id = $1;
        `;
        const values = [userId];
        const result = await pool.query(query, values);
        return result.rows[0]?.customer_id || null;
    } catch (err) {
        console.error("Error fetching customer ID by user ID:", err);
        throw err;
    }
}

async function createPaymentMethodForUser(payload){
    try{
        const query = `
            INSERT INTO payment_methods(
                user_id, payment_token_id, channel_code, type, status, is_default, display_name, card_brand,
                masked_card_number, card_exp_month, card_exp_year, customer_reference_id, fingerprint, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
        const values = [
            payload.user_id,
            payload.payment_token_id,
            payload.channel_code,
            payload.type,
            payload.status,
            payload.is_default,
            payload.display_name,
            payload.card_brand,
            payload.masked_card_number,
            payload.card_exp_month,
            payload.card_exp_year,
            payload.customer_reference_id,
            payload.fingerprint
        ];
        const result = await pool.query(query, values);
        return result.rows[0];
    }catch(err){
        console.error("Error creating payment method for user:", err);
        throw err;
    }
}

async function paymentMethodExists(payload) {
    try {
        const keys = Object.keys(payload);

        if (keys.length === 0) {
            throw new Error("Payload cannot be empty.");
        }

        const whereClause = keys
            .map((key, index) => `${key} = $${index + 1}`)
            .join(" AND ");

        const values = Object.values(payload);

        const query = `
            SELECT EXISTS (
                SELECT 1
                FROM payment_methods
                WHERE ${whereClause}
            ) AS exists;
        `;

        const { rows } = await pool.query(query, values);

        return rows[0].exists;
    } catch (err) {
        console.error("Error checking payment method:", err);
        throw err;
    }
}

async function getActivePaymentSessions(LIMIT = process.env.ACTIVE_PAYMENT_LIMIT || 100) {
    ;
    try{
        const query = `
            SELECT *
            FROM payments
            WHERE status IN ('PENDING', 'REQUIRES_ACTION','ACTIVE')
            ORDER BY created_at ASC
            LIMIT $1
        `;
        const result = await pool.query(query, [LIMIT]);
        return result.rows;
    }catch(err){
        console.error("Error fetching active payment sessions:", err);
        throw err;
    }
}

async function getAllPaymentMethodsByUserId(userId) {
    try{
        const query = `
            SELECT payment_token_id,channel_code, type, status, is_default, display_name, card_brand,
            masked_card_number, card_exp_month, card_exp_year, customer_reference_id from payment_methods
            WHERE user_id = $1 and status = 'ACTIVE'
        `
        const result = await pool.query(query, [userId]);
        return result.rows;
    }catch(err){
        console.error("Error fetching payment methods by user ID:", err);
        throw err;
    }

}

async function getAllPaymentMethod() {
    try {
        const query = `
            SELECT payment_token_id
            FROM payment_methods
        `;
        const result = await pool.query(query);
        return result.rows;
    } catch (err) {
        console.error("Error fetching all payment methods:", err);
        throw err;
    }
}

async function updatePaymentMethodStatus(paymentTokenId, status) {
    try{
        const query = `
            UPDATE payment_methods
            SET status = $2, updated_at = CURRENT_TIMESTAMP
            WHERE payment_token_id = $1
        `;
        const result = await pool.query(query, [paymentTokenId, status]);
        return result
    }catch(err){
        console.error("Error updating payment method status:", err);
        throw err;
    }
}

async function updatePlatformWalletBalance(credits,action = 'add') {
    try {
        if (action === 'subtract') {
            credits = -credits;
        }
        const query = `
            UPDATE wallets
            SET balance_credits = balance_credits + $1
            WHERE type = 'platform wallets'
        `;
        await pool.query(query, [credits]);
    } catch (err) {
        console.error("Error updating platform wallet balance:", err);
        throw err;
    }
}

async function getPlatformWallet() {
    try {
        const query = `
            SELECT balance_credits, wallet_id
            FROM wallets
            WHERE type = 'platform wallets'
        `;
        const result = await pool.query(query);
        return result.rows[0];
    } catch (err) {
        console.error("Error fetching platform wallet balance:", err);
        throw err;
    }
}

async function createCreditTransaction(data) {
    try {
        const result = await pool.query(`
            INSERT INTO credit_transactions (
                type,
                amount_credits,
                status,
                source_wallet_id,
                destination_wallet_id,
                fee_transaction_id,
                reference_table,
                reference_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *;
        `, [data.type, data.amount_credits, data.status, data.source_wallet_id, data.destination_wallet_id, data.fee_transaction_id, data.reference_table, data.reference_id]);
        return result.rows[0];
    }catch (err) {
        console.error("Error creating credit transaction:", err);
        throw err;
    }
}

async function settleSuccessfulTopUp(referenceId, provider = {}) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const paymentResult = await client.query(`
            SELECT p.*, t.credits_granted
            FROM payments p
            INNER JOIN topups t ON t.topup_id = p.reference_id
            WHERE p.reference_id = $1 AND p.payment_type = 'TOPUP'
            FOR UPDATE OF p, t
        `, [referenceId]);
        const payment = paymentResult.rows[0];
        if (!payment) throw new Error(`Top-up payment not found: ${referenceId}`);

        const existingResult = await client.query(`
            SELECT * FROM credit_transactions
            WHERE reference_table = 'payments'
              AND reference_id = $1
              AND type = 'Fund Transfer'
            LIMIT 1
        `, [payment.id]);
        if (existingResult.rows[0]) {
            await client.query('COMMIT');
            return { alreadySettled: true, payment, transaction: existingResult.rows[0], notification: null };
        }

        // A legacy partial settlement may already have credited the wallet. Never
        // guess and credit it again; surface it for an explicit audited repair.
        if (payment.status === 'PAID') {
            await client.query('ROLLBACK');
            return { alreadySettled: false, requiresRepair: true, payment };
        }

        const platformWalletResult = await client.query(`
            SELECT wallet_id, status FROM wallets
            WHERE type = 'platform wallets'
            LIMIT 1
            FOR UPDATE
        `);
        const userWalletResult = await client.query(`
            SELECT w.wallet_id, w.status
            FROM wallets w
            INNER JOIN account_wallets aw ON aw.wallet_id = w.wallet_id
            INNER JOIN users u ON u.account_id = aw.account_id
            WHERE u.user_id = $1 AND w.type = 'account wallets'
            LIMIT 1
            FOR UPDATE OF w
        `, [payment.user_id]);
        const platformWallet = platformWalletResult.rows[0];
        const userWallet = userWalletResult.rows[0];
        if (!platformWallet || !userWallet) throw new Error('Top-up wallet is not configured');
        if (String(platformWallet.status).toLowerCase() !== 'active' || String(userWallet.status).toLowerCase() !== 'active') {
            throw new Error('Top-up wallet is inactive');
        }

        const paymentId = provider.payment_id ?? provider.latest_payment_id ?? payment.payment_id ?? null;
        const channelCode = provider.channel_code ?? payment.channel_code ?? null;
        await client.query(`
            UPDATE payments
            SET status = 'PAID', payment_id = COALESCE($2, payment_id),
                payment_request_id = COALESCE($3, payment_request_id),
                channel_code = COALESCE($4, channel_code), processed_at = NOW(), updated_at = NOW()
            WHERE reference_id = $1
        `, [referenceId, paymentId, provider.payment_request_id ?? null, channelCode]);
        await client.query(`
            UPDATE topups
            SET status = 'PAID', xendit_payment_id = COALESCE($2, xendit_payment_id),
                xendit_channel_code = COALESCE($3, xendit_channel_code)
            WHERE topup_id = $1
        `, [referenceId, paymentId, channelCode]);
        const updatedWallet = (await client.query(`
            UPDATE wallets SET balance_credits = balance_credits + $1 WHERE wallet_id = $2
            RETURNING balance_credits
        `, [payment.credits_granted, userWallet.wallet_id])).rows[0];

        const transaction = (await client.query(`
            INSERT INTO credit_transactions (
                type, amount_credits, status, source_wallet_id, destination_wallet_id,
                fee_transaction_id, reference_table, reference_id
            ) VALUES ('Fund Transfer', $1, 'completed', $2, $3, NULL, 'payments', $4)
            RETURNING *
        `, [payment.credits_granted, platformWallet.wallet_id, userWallet.wallet_id, payment.id])).rows[0];

        const accountId = (await client.query(
            'SELECT account_id FROM users WHERE user_id = $1',
            [payment.user_id]
        )).rows[0]?.account_id;
        if (!accountId) throw new Error('Top-up account not found');
        const notification = (await client.query(`
            INSERT INTO notifications (
                message, is_read, reference_table, reference_prefix,
                reference_path, reference_id, account_id
            ) VALUES ($1, false, 'credit_transactions', 'TOPUP', $2, $3, $4)
            RETURNING *
        `, [
            `Your wallet has been credited with ${payment.credits_granted} credits.`,
            payment.redirect_url || `${process.env.FRONTEND_URL}/transactions`,
            transaction.credit_transaction_id,
            accountId,
        ])).rows[0];

        await client.query('COMMIT');
        return {
            alreadySettled: false,
            requiresRepair: false,
            payment: { ...payment, status: 'PAID' },
            transaction,
            notification,
            accountId,
            balanceDelta: Number(payment.credits_granted),
            walletBalance: Number(updatedWallet.balance_credits),
        };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function getPaidTopUpsMissingTransactions(limit = 100) {
    const result = await pool.query(`
        SELECT p.id, p.reference_id, p.user_id, p.credits, p.processed_at
        FROM payments p
        INNER JOIN topups t ON t.topup_id = p.reference_id
        WHERE p.payment_type = 'TOPUP'
          AND p.status = 'PAID'
          AND t.status = 'PAID'
          AND NOT EXISTS (
              SELECT 1 FROM credit_transactions ct
              WHERE ct.reference_table = 'payments'
                AND ct.reference_id = p.id
                AND ct.type = 'Fund Transfer'
          )
        ORDER BY p.processed_at ASC NULLS FIRST
        LIMIT $1
    `, [limit]);
    return result.rows;
}

async function repairPaidTopUpArtifacts(referenceId) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const payment = (await client.query(`
            SELECT p.*, t.credits_granted
            FROM payments p
            INNER JOIN topups t ON t.topup_id = p.reference_id
            WHERE p.reference_id = $1
              AND p.payment_type = 'TOPUP'
              AND p.status = 'PAID'
              AND t.status = 'PAID'
            FOR UPDATE OF p, t
        `, [referenceId])).rows[0];
        if (!payment) throw new Error(`Paid top-up not found: ${referenceId}`);

        const existing = (await client.query(`
            SELECT * FROM credit_transactions
            WHERE reference_table = 'payments'
              AND reference_id = $1
              AND type = 'Fund Transfer'
            LIMIT 1
        `, [payment.id])).rows[0];
        if (existing) {
            await client.query('COMMIT');
            return { repaired: false, transaction: existing, notification: null };
        }

        const platformWallet = (await client.query(`
            SELECT wallet_id FROM wallets WHERE type = 'platform wallets' LIMIT 1
        `)).rows[0];
        const destination = (await client.query(`
            SELECT w.wallet_id, u.account_id
            FROM users u
            INNER JOIN account_wallets aw ON aw.account_id = u.account_id
            INNER JOIN wallets w ON w.wallet_id = aw.wallet_id
            WHERE u.user_id = $1 AND w.type = 'account wallets'
            LIMIT 1
        `, [payment.user_id])).rows[0];
        if (!platformWallet || !destination) throw new Error('Top-up wallet is not configured');

        // This repair deliberately does not mutate either wallet. It is only for
        // a top-up whose wallet credit was independently confirmed beforehand.
        const transaction = (await client.query(`
            INSERT INTO credit_transactions (
                type, amount_credits, status, source_wallet_id, destination_wallet_id,
                fee_transaction_id, reference_table, reference_id, created_at
            ) VALUES ('Fund Transfer', $1, 'completed', $2, $3, NULL, 'payments', $4,
                      COALESCE($5, NOW()))
            RETURNING *
        `, [
            payment.credits_granted,
            platformWallet.wallet_id,
            destination.wallet_id,
            payment.id,
            payment.processed_at,
        ])).rows[0];
        const notification = (await client.query(`
            INSERT INTO notifications (
                message, is_read, reference_table, reference_prefix,
                reference_path, reference_id, account_id
            ) VALUES ($1, false, 'credit_transactions', 'TOPUP', $2, $3, $4)
            RETURNING *
        `, [
            `Your wallet has been credited with ${payment.credits_granted} credits.`,
            payment.redirect_url || `${process.env.FRONTEND_URL}/transactions`,
            transaction.credit_transaction_id,
            destination.account_id,
        ])).rows[0];

        await client.query('COMMIT');
        return { repaired: true, transaction, notification };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}


module.exports = {
    createPaymentMethod,
    getPaymentByUserIdAndStatus,
    updatePaymentWithReferenceId,
    updatePaymentByReference,
    getPaymentByReferenceId,
    updateTopUpStatus,
    updateWalletFromTopUp,
    createTopUpPaymentSession,
    createSubscriptionPayment,
    getPaymentCheckOutByPayload,
    updateUserCustomerId,
    updatePayment,
    createPaymentMethodForUser,
    paymentMethodExists,
    getActivePaymentSessions,
    getAllPaymentMethodsByUserId,
    updatePaymentMethodStatus,
    getPlatformWallet,
    updatePlatformWalletBalance,
    createCreditTransaction,
    settleSuccessfulTopUp,
    getPaidTopUpsMissingTransactions,
    repairPaidTopUpArtifacts,
};
