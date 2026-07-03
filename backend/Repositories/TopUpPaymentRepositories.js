const { pool } = require('../lib/database');

async function createTopUpPayment(data) {
    try {
        const query = `
            INSERT INTO payment (
                user_id,
                reference_id,
                provider,
                provider_payment_id,
                provider_payment_request_id,
                purpose,
                payment_type,
                channel_code,
                amount,
                currency,
                status,
                description,
                paid_at
            )
            VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9, $10,
                $11, $12, $13
            )
            RETURNING *;
        `;
        const topUpQuery = `INSERT INTO TOPUPS(
        TOPUP_ID,
        XENDIT_PAYMENT_ID,
        XENDIT_CHANNEL_CODE,
        AMOUNT_PHP_CENTS,
        CREDITS_GRANTED,
        STATUS,
        CREATED_AT,
        USER_ID
        ) VALUES (
            $1, $2, $3, $4, $5,
            $6, CURRENT_TIMESTAMP, $7
        )`;
        const values = [
            data.user_id,
            data.reference_id,
            data.provider,
            data.provider_payment_id,
            data.provider_payment_method_id,
            data.purpose,
            data.payment_type,
            data.channel_code,
            data.amount,
            data.currency,
            data.status,
            data.description,
            data.paid_at
        ];
        const topUpValues = [
            data.reference_id,
            data.provider_payment_id,
            data.channel_code,
            data.amount,
            data.credits_granted,
            data.status,
            data.user_id
        ];
        const result = await pool.query(query, values);
        await pool.query(topUpQuery, topUpValues);
        return result.rows[0];
    } catch (err) {
        console.error("Error creating payment:", err);
        throw err;
    }
}

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
            SELECT * FROM payment
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
            SELECT * FROM payment
            WHERE reference_id = $1
            FOR UPDATE
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
            UPDATE payment
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

async function updatePaymentStatusAndPaymentId(reference_id, status, paymentId) {
    try{
        const query = `
            UPDATE payment
            SET status = $2,
            provider_payment_id = $3,
            paid_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
            WHERE reference_id = $1;
        `;
        const values = [reference_id, status, paymentId];
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error("Error updating payment status:", err);
        throw err;
    }
}

async function updateTopUpStatus(reference_id,status,paymentId) {
    try {
        const query = `
            UPDATE topups
            SET status = $2,
            xendit_payment_id = $3
            WHERE topup_id = $1
            RETURNING *;
        `;
        const values = [reference_id,status,paymentId];
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
            WHERE w.wallet_id = aw.wallet_id
            AND aw.account_id = (
                SELECT account_id
                FROM users
                WHERE user_id = $1
            );
        `;
        const values = [userId, credits];
        await pool.query(query, values);
    } catch (err) {
        console.error("Error updating wallet balance:", err);
        throw err;
    }
}

module.exports = {
    createTopUpPayment,
    createPaymentMethod,
    getPaymentByUserIdAndStatus,
    updatePaymentWithReferenceId,
    updatePaymentStatusAndPaymentId,
    getPaymentByReferenceId,
    updateTopUpStatus,
    updateWalletFromTopUp
};