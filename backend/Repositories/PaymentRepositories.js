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
            );
        `;
        const values = [userId, credits];
        await pool.query(query, values);
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

async function getPaymentCheckOutByPayload(payload){
    try{
        let condition =  payload.pay_type === 'direct_pay' ? "NOT NULL" : "NULL";
        const query = `
            SELECT * FROM PAYMENTS
            WHERE USER_ID = $1 AND AMOUNT = $2
            AND CURRENCY = $3 AND STATUS IN ('REQUIRES_ACTION', 'PENDING') AND CREDITS = $4
            AND DESCRIPTION = $5 AND PAYMENT_TOKEN_ID IS ${condition}
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
    console.log("Creating payment method for user with payload:", payload);
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
            WHERE status IN ('PENDING', 'REQUIRES_ACTION')
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

module.exports = {
    createTopUpPayment,
    createPaymentMethod,
    getPaymentByUserIdAndStatus,
    updatePaymentWithReferenceId,
    updatePaymentByReference,
    getPaymentByReferenceId,
    updateTopUpStatus,
    updateWalletFromTopUp,
    createTopUpPaymentSession,
    getPaymentCheckOutByPayload,
    updateUserCustomerId,
    updatePayment,
    createPaymentMethodForUser,
    paymentMethodExists,
    getActivePaymentSessions,
};