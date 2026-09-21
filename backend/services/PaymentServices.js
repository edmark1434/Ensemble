const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const { pool } = require('../lib/Database');
const {getIo} = require('../lib/WebSocket');

const {
    getPaymentByUserIdAndStatus,
    updatePaymentWithReferenceId,
    getPaymentByReferenceId,
    updatePaymentByReference,
    updateTopUpStatus,
    createTopUpPaymentSession,
    createSubscriptionPayment,
    getPaymentCheckOutByPayload,
    updateUserCustomerId,
    updatePayment,
    createPaymentMethodForUser,
    paymentMethodExists,
    getAllPaymentMethodsByUserId,
    updatePaymentMethodStatus,
    settleSuccessfulTopUp,
} = require("../repositories/PaymentRepositories");
const {
    getSubcriptionByUserIdRepositories,
    getPlandetailsByPlanIdRepositories,
    updateSubscriptionBySubscriptionId,
    updateSubscriptionInvoiceByXenditPlanIdRepositories,
    createSubscriptionInvoice,
    updateSubscriptionInvoiceByCycleIdRepositories,
    getSubscriptionInvoiceByCycleIdRepositories,
    getFreePlanRepositories,
    getSubscriptionByXenditPlanIdRepositories,
    updateSubscriptionInvoiceAmountRepositories,
    getSubscriptionBySubscriptionIdRepositories
} = require("../repositories/SubscriptionRepositories");

const {
    createNotification
} = require("../repositories/NotificationRepositories");
const { getSectionValue } = require("../repositories/AdminSettingsRepositories");

const redisClient = require('../lib/Redis');
const TOPUP_PACKS = new Map([
    [80, { amount: 99, name: 'Pocket (80 Credits)' }],
    [250, { amount: 299, name: 'Bundle (250 Credits)' }],
    [750, { amount: 849, name: 'Box (750 Credits)' }],
    [1600, { amount: 1599, name: 'Vault (1,600 Credits)' }],
]);
const CUSTOM_CREDIT_RATE = 1.25;

async function validateTopupRequest(body = {}) {
    const credits = Number(body.credits);
    if (!Number.isSafeInteger(credits) || credits < 10 || credits > 1000000 || body.currency !== 'PHP') throw new Error('INVALID_TOPUP');
    if (!['topup', 'custom'].includes(body.itemType)) throw new Error('INVALID_TOPUP');

    let pack = null;
    if (body.itemType === 'topup') {
        try {
            const economy = await getSectionValue('economy');
            const creditPackages = Array.isArray(economy?.creditPackages) ? economy.creditPackages : [];
            const configuredPack = creditPackages.find(p => p && p.active !== false && Number(p.credits) === credits);
            if (configuredPack) {
                pack = {
                    amount: Number(configuredPack.pricePhp),
                    name: `${configuredPack.name} (${Number(configuredPack.credits).toLocaleString()} Credits)`
                };
            }
        } catch (err) {
            console.error('Error fetching economy configuration in validateTopupRequest:', err);
        }

        if (!pack && TOPUP_PACKS.has(credits)) {
            pack = TOPUP_PACKS.get(credits);
        }

        if (!pack) throw new Error('INVALID_TOPUP');
    }

    const amount = pack?.amount ?? Math.round(credits * CUSTOM_CREDIT_RATE * 100) / 100;
    return { amount, credits, currency: 'PHP', itemName: pack?.name ?? `Custom Top-up (${credits.toLocaleString()} Credits)` };
}
async function xenditWebhookHandler(req, res) {
    const { event, data } = req.body || {};

    try {
        const eventType = String(event || '').toLowerCase();
        if (
            eventType.includes('session.completed') ||
            eventType.includes('payment_session.completed') ||
            eventType.includes('payment_token.activated') ||
            eventType.includes('payment_method.activated') ||
            data?.session_type === 'SAVE' ||
            String(data?.reference_id || '').startsWith('SAVE-CARD-USER-')
        ) {
            return paymentSessionCompleteWebhookHandler(req, res);
        }

        // ==========================
        // SUBSCRIPTION PAYMENT
        // ==========================
        if (
            data?.status === "SUCCEEDED" &&
            data?.reference_id?.includes("SUBSCRIPTION")
        ) {

            // Upgrade payment completed
            if (data.metadata?.action === "UPGRADE") {

                const [subscriptionDetails, planDetails] = await Promise.all([
                    getSubcriptionByUserIdRepositories(data.metadata.userId),
                    getPlandetailsByPlanIdRepositories(data.metadata.newPlanId)
                ]);
                let anchorDate = new Date(subscriptionDetails[0].next_billing_at);
                if(anchorDate.getDate()> 28){
                    anchorDate.setDate(28);
                }
                anchorDate = anchorDate.toISOString();
                const subscription = subscriptionDetails?.[0];

                if (!subscription)
                    throw new Error("Subscription not found.");

                const payload = {
                    amount: planDetails.amount_php_cents,

                    schedule: {
                        interval: planDetails.billing_period,
                        interval_count: 1,
                        anchor_date: anchorDate,
                        retry_interval: "DAY",
                        retry_interval_count: 1,
                        total_retry: 3,
                        failed_attempt_notifications: [1, 3]
                    },

                    payment_tokens: [
                        {
                            payment_token_id: data.payment_token_id,
                            rank: 1
                        }
                    ],

                    payment_link_for_failed_attempt: true,

                    locale: "en",

                    notification_channels: ["EMAIL"],

                    description: planDetails.description,

                    metadata: {
                        planId: planDetails.plan_id,
                        userId: data.metadata.userId,
                        subscriptionId: subscription.subscription_id
                    },

                    items: [
                        {
                            type: "DIGITAL_PRODUCT",
                            reference_id: subscription.reference_id,
                            name: planDetails.name,
                            net_unit_amount: planDetails.amount_php_cents,
                            quantity: 1,
                            category: "Plan",
                            description: planDetails.description
                        }
                    ]
                };

                try {

                    const response = await axios.patch(
                        `https://api.xendit.co/recurring/plans/${subscription.xendit_plan_id}`,
                        payload,
                        {
                            auth: {
                                username: process.env.XENDIT_API_KEY,
                                password: ""
                            },
                            headers: {
                                "Content-Type": "application/json",
                                "api-version": "2026-01-01"
                            }
                        }
                    );

                    console.log("✅ Recurring plan updated.");
                    
                    await updateSubscriptionBySubscriptionId(
                        response.data.metadata.subscriptionId,
                        {
                            plan_id: response.data.metadata.planId,
                            payment_token_id: data.payment_token_id
                        }
                    );
                    
                    const notification = await createNotification({
                        message: `Your subscription has been successfully upgraded to ${planDetails.name}.`,
                        is_read: false,
                        reference_table: "subscriptions",
                        reference_prefix: "SUBSCRIPTION",
                        reference_path: `${process.env.FRONTEND_URL}/credits-subscriptions`,
                        reference_id: subscription.subscription_id,
                        user_id: subscription.user_id
                    });
                    await updateSubscriptionInvoiceAmountRepositories(
                        subscription.xendit_plan_id,
                        response.data.amount
                    );
                    const io = getIo();
                    io.to(notification.account_id).emit("notification", notification);

                } catch (err) {

                    console.error(
                        "PATCH recurring failed:",
                        JSON.stringify(err.response?.data, null, 2)
                    );

                    throw err;
                }
            }

            // Save one-time upgrade payment
            await createSubscriptionPayment({
                user_id: data.metadata?.userId,
                reference_id: data.reference_id,
                amount: data.request_amount,
                currency: data.currency,
                status: "PAID",
                description:
                    data.description ??
                    `Subscription Payment`,
                payment_type: "SUBSCRIPTION",
                payment_request_id: data.payment_request_id,
                payment_id: data.payment_id,
                payment_token_id: data.payment_token_id,
                channel_code: data.channel_code,
                customer_id: data.customer_id,
                processed_at: new Date()
            });
            const notification = await createNotification({
                message: `Your subscription payment of ${data.request_amount / 100} ${data.currency} has been successfully processed.`,
                is_read: false,
                reference_table: "payments",
                reference_prefix: "SUBSCRIPTION",
                reference_path: `${process.env.FRONTEND_URL}/transactions`,
                reference_id: data.payment_id,
                user_id: data.metadata?.userId
            });
            const io = getIo();
            io.to(notification.account_id).emit("notification", notification);
            return res.status(200).json({
                message: "Subscription payment processed."
            });
        }

        // ==========================
        // NORMAL PAYMENTS / TOPUPS
        // ==========================

        const payment = await getPaymentByReferenceId(
            data.reference_id.split("_")[0]
        );

        if (!payment) {
            console.log(
                "Payment not found:",
                data.reference_id
            );

            // don't retry forever
            return res.sendStatus(200);
        }

        if (data.status === "SUCCEEDED") {
            const settlement = await settleSuccessfulTopUp(payment.reference_id, data);
            if (settlement.requiresRepair) {
                console.error(`Paid top-up ${payment.reference_id} is missing its credit ledger and requires audited repair; wallet was not credited again.`);
                return res.status(200).json({ message: "Payment requires ledger repair." });
            }
            if (!settlement.alreadySettled) {
                const io = getIo();
                io.to(String(settlement.accountId)).emit("notification", settlement.notification);
                io.to(String(settlement.accountId)).emit("walletBalanceUpdated", {
                    balanceCredits: settlement.walletBalance,
                });
                savePaymentMethod(data).catch((error) => {
                    console.error(`Failed to save payment method for ${payment.reference_id}:`, error.message);
                });
            }
            return res.status(200).json({
                message: settlement.alreadySettled ? "Already processed." : "Payment processed."
            });
        } else if (
            data.status === "FAILED" ||
            data.status === "EXPIRED"
        ) {

            await updatePaymentByReference(payment.reference_id, {
                status: data.status,
                payment_id:
                    data.payment_id ??
                    data.latest_payment_id,
                payment_request_id: data.payment_request_id,
                processed_at: new Date(),
                channel_code: data.channel_code
            });

            await updateTopUpStatus(
                payment.reference_id,
                data.status,
                data.payment_id ?? data.latest_payment_id,
                data.channel_code
            );
            const notification = await createNotification({
                message: `Your payment of ${data.request_amount / 100} ${data.currency} has failed or expired. Please try again.`,
                is_read: false,
                reference_table: "payments",
                reference_prefix: "TOPUP",
                reference_path: `${process.env.FRONTEND_URL}/transactions`,
                reference_id: payment.payment_id,
                user_id: payment.user_id
            });
            const io = getIo();
            io.to(notification.account_id).emit("notification", notification);
            return res.status(200).json({
                message: "Payment updated."
            });
        }

        return res.sendStatus(200);

    } catch (err) {
        console.error("Webhook Error:", err);
        // Return 200 so Xendit doesn't continuously retry the webhook
        return res.sendStatus(200);
    }
}



async function processTopUpPayment(req, res) {
    let validated;
    try { validated = await validateTopupRequest(req.body); }
    catch { return res.status(422).json({ success: false, message: 'Invalid top-up selection.' }); }
    let accountName = {};
if (!req.session) {
    const response = await pool.query(
        `SELECT user_id, first_name, last_name, email
         FROM users
         WHERE user_id = $1`,
        [req.body.userId]
    );

    accountName = response.rows[0];
}

let userId = accountName.user_id || req.session.userId;
userId = userId, 10; // Ensure userId is an integer
// 1. Try Redis
let customerId = await redisClient.get(`customerId:${userId}`); 

// 2. Fallback to DB
if (!customerId) {
    const result = await pool.query(
        `SELECT customer_id
         FROM users
         WHERE user_id = $1`,
        [userId]
    );

    customerId = result.rows[0]?.customer_id || null;
}

const customerPayload = await getCustomerPayload(req);
    const payload = {
        reference_id: `TOPUP-${uuidv4()}`,
        session_type: "PAY",
        mode: "PAYMENT_LINK",

        amount: validated.amount,
        currency: validated.currency,
        country: "PH",

        capture_method: "AUTOMATIC",

        // Always save the card
        allow_save_payment_method: "OPTIONAL",

        ...customerPayload,

        // channel_properties: {
        //     cards: {
        //         card_on_file_type: "CUSTOMER_UNSCHEDULED"
        //     }
        // },
        metadata: {
            item_name: validated.itemName,
            credits: String(validated.credits),
            user_id: `${accountName.user_id || req.session.userId }`
        },

        success_return_url:
            `${process.env.FRONTEND_URL}/credits?success`
        ,
        cancel_return_url:
            `${process.env.FRONTEND_URL}/credits?cancel`,

    };
    const topUpPayload = {
        user_id: accountName.user_id || req.session.userId,
        amount: validated.amount,
        currency: validated.currency,
        credits: validated.credits,
        description: validated.itemName
        };
    const existingTopUp = await getPaymentCheckOutByPayload(topUpPayload,'checkout');
        console.log("💳 Payment Session Created:", existingTopUp);

    let payment;

    if (existingTopUp.length > 0) {
        payment = existingTopUp[0];

        // Reuse if still valid locally
        if (
            payment.status === "ACTIVE" &&
            payment.redirect_url &&
            new Date(payment.expired_at) > new Date()
        ) {
            return res.json({
                paymentSessionId: payment.payment_session_id,
                paymentLink: payment.redirect_url
            });
        }

        
    }

    try {
        const updatedReferenceId = payment?.reference_id ?? payload.reference_id;
        const response = await axios.post(
            "https://api.xendit.co/sessions",
            {
                ...payload,
                reference_id: updatedReferenceId,
            },
            {
                auth: {
                    username: process.env.XENDIT_API_KEY,
                    password: ""
                },
                headers: {
                    "Content-Type": "application/json",
                    "api-version": "2024-11-11",
                    "Idempotency-Key": `${updatedReferenceId}` // Ensure idempotency for retries
                }
            }
        );

        const redirectUrl = response.data.payment_link_url ? response.data.payment_link_url : response.data.actions.find(a => a.type === "REDIRECT_CUSTOMER" && a.descriptor === "WEB_URL")?.value;
        if(response.data.status === "REQUIRED_ACTION" || response.data.status === "ACTIVE") {
            await createTopUpPaymentSession({
                user_id: userId,
                reference_id: response.data.reference_id,
                amount: response.data.amount,
                currency: response.data.currency,
                status: response.data.status,
                credits: response.data.metadata.credits ?? response.data.credits,
                description: response.data.metadata.item_name ?? response.data.description,
                payment_type: "TOPUP"
            });
            const updatePaymentPayload={
                reference_id: response.data.reference_id,
                customerId: response.data.customer_id,
                PaymentSessionId: response.data.payment_session_id,
                channelCode: response.data.channel_code,
                redirectUrl: response.data.payment_link_url,
                expired_at: response.data.expires_at,
            }

            await Promise.all([
                updateUserCustomerId(accountName.user_id || req.session.userId, response.data.customer_id),
                updatePayment(updatePaymentPayload),
                redisClient.set(`customerId:${accountName.user_id || req.session.userId}`, response.data.customer_id, 'EX', 60 * 60 * 24 * 30) // Cache for 30 days
            ]);
            return res.json({
                paymentSessionId: response.data.payment_session_id,
                paymentLink: response.data.payment_link_url
            });
        }
    } catch (err) {

        console.error(err.response?.data || err);

        return res.status(500).json({
            error: 'Unable to create payment session.'
        });

    }
}

async function savePaymentTokenForUser(userId, paymentTokenId, sessionDetails = null) {
    if (!userId || !paymentTokenId) {
        console.warn("[savePaymentTokenForUser] Missing userId or paymentTokenId:", { userId, paymentTokenId });
        return null;
    }

    try {
        const response = await axios.get(
            `https://api.xendit.co/v3/payment_tokens/${paymentTokenId}`,
            {
                auth: {
                    username: process.env.XENDIT_API_KEY,
                    password: ""
                },
                headers: {
                    "Content-Type": "application/json",
                    "api-version": "2024-11-11"
                }
            }
        );

        const tokenData = response.data;
        const channelCode = tokenData.channel_code;
        const status = tokenData.status || 'ACTIVE';

        let type = 'PAYMENT_METHOD';
        let displayName = channelCode;
        let cardBrand = null;
        let maskedCardNumber = null;
        let cardExpMonth = null;
        let cardExpYear = null;
        let fingerprint = null;

        if (channelCode === 'CARDS') {
            const cardDetails = tokenData.channel_properties?.card_details || tokenData.card_details || {};
            type = cardDetails.type || 'CARD';
            const cardholderName = [cardDetails.cardholder_first_name, cardDetails.cardholder_last_name].filter(Boolean).join(' ').trim();
            maskedCardNumber = cardDetails.masked_card_number || null;
            displayName = cardholderName || (maskedCardNumber ? `Card ending in ${maskedCardNumber.slice(-4)}` : 'Credit/Debit Card');
            cardBrand = cardDetails.network || null;
            cardExpMonth = cardDetails.expiry_month ? String(cardDetails.expiry_month) : null;
            cardExpYear = cardDetails.expiry_year ? String(cardDetails.expiry_year) : null;
            fingerprint = cardDetails.fingerprint || null;
        } else {
            const tokenDetails = tokenData.token_details || tokenData.channel_properties || {};
            const isEWallet = ['GCASH', 'PAYMAYA', 'SHOPEEPAY', 'GRABPAY', 'GCASH_LINK_AND_PAY'].includes(channelCode);
            const isDirectDebit = ['UBP_DIRECT_DEBIT', 'BPI_DIRECT_DEBIT', 'UBP_EADA'].includes(channelCode);
            type = isEWallet ? 'E-WALLET' : (isDirectDebit ? 'DIRECT-DEBIT' : channelCode);
            displayName = tokenDetails.account_number 
                || tokenDetails.masked_bank_account_number 
                || tokenDetails.account_name 
                || channelCode;
        }

        // 1. Check if token already exists for this user
        const existingByToken = await pool.query(
            'SELECT * FROM payment_methods WHERE user_id = $1 AND payment_token_id = $2',
            [userId, paymentTokenId]
        );
        if (existingByToken.rows.length > 0) {
            if (existingByToken.rows[0].status !== 'ACTIVE' && status === 'ACTIVE') {
                await updatePaymentMethodStatus(paymentTokenId, 'ACTIVE');
            }
            return existingByToken.rows[0];
        }

        // 2. Check if card fingerprint already exists for this user
        if (channelCode === 'CARDS' && fingerprint) {
            const existingByFingerprint = await pool.query(
                'SELECT * FROM payment_methods WHERE user_id = $1 AND fingerprint = $2',
                [userId, fingerprint]
            );
            if (existingByFingerprint.rows.length > 0) {
                await pool.query(
                    `UPDATE payment_methods 
                     SET payment_token_id = $1, status = $2, card_exp_month = $3, card_exp_year = $4, updated_at = CURRENT_TIMESTAMP
                     WHERE id = $5`,
                    [paymentTokenId, status, cardExpMonth, cardExpYear, existingByFingerprint.rows[0].id]
                );
                return existingByFingerprint.rows[0];
            }
        }

        // 3. Check if e-wallet / direct debit account already exists for this user
        if (channelCode !== 'CARDS' && displayName) {
            const existingByAccount = await pool.query(
                'SELECT * FROM payment_methods WHERE user_id = $1 AND channel_code = $2 AND display_name = $3',
                [userId, channelCode, displayName]
            );
            if (existingByAccount.rows.length > 0) {
                await pool.query(
                    `UPDATE payment_methods 
                     SET payment_token_id = $1, status = $2, updated_at = CURRENT_TIMESTAMP
                     WHERE id = $3`,
                    [paymentTokenId, status, existingByAccount.rows[0].id]
                );
                return existingByAccount.rows[0];
            }
        }

        // 4. Create new payment method record
        const customerRefId = sessionDetails?.reference_id || tokenData.reference_id || null;
        const newMethod = await createPaymentMethodForUser({
            user_id: userId,
            payment_token_id: paymentTokenId,
            channel_code: channelCode,
            type: type,
            status: status,
            is_default: false,
            display_name: displayName,
            card_brand: cardBrand,
            masked_card_number: maskedCardNumber,
            card_exp_month: cardExpMonth,
            card_exp_year: cardExpYear,
            customer_reference_id: customerRefId,
            fingerprint: fingerprint
        });

        // 5. Update user customer_id if present
        if (tokenData.customer_id) {
            await redisClient.set(`customerId:${userId}`, tokenData.customer_id, 'EX', 60 * 60 * 24 * 30).catch(() => null);
            await updateUserCustomerId(userId, tokenData.customer_id).catch(err => {
                console.warn("[savePaymentTokenForUser] Error updating user customer_id:", err.message);
            });
        }

        // 6. Clean up pending save session in Redis
        await redisClient.del(`user_pending_save_session:${userId}`).catch(() => null);

        console.log(`✅ [PaymentMethod Saved] Successfully saved payment method for user ${userId}: ${channelCode} (${paymentTokenId})`);
        return newMethod;
    } catch (err) {
        console.error(`[savePaymentTokenForUser Error] Failed to save token ${paymentTokenId} for user ${userId}:`, err.response?.data || err.message);
        throw err;
    }
}

async function savePaymentMethodFromSession(sessionId, fallbackUserId = null) {
    if (!sessionId) return null;
    try {
        const response = await axios.get(
            `https://api.xendit.co/sessions/${sessionId}`,
            {
                auth: {
                    username: process.env.XENDIT_API_KEY,
                    password: ""
                },
                headers: {
                    "api-version": "2024-11-11"
                }
            }
        );

        const session = response.data;
        console.log(`[PaymentSession] Session fetched: ${sessionId}, status: ${session?.status}`);

        const paymentTokenId = session?.payment_token_id
            || session?.payment_token?.id
            || session?.payment_tokens?.[0]?.payment_token_id
            || session?.payment_tokens?.[0]?.id
            || session?.payment_method_id
            || session?.token_id;

        let userId = session?.metadata?.user_id || session?.metadata?.userId || fallbackUserId;
        if (!userId) {
            userId = await redisClient.get(`save_session_user:${sessionId}`).catch(() => null);
        }

        if (paymentTokenId && userId) {
            const saved = await savePaymentTokenForUser(userId, paymentTokenId, session);
            await redisClient.del(`save_session_user:${sessionId}`).catch(() => null);
            return saved;
        }

        return null;
    } catch (err) {
        console.error(`[savePaymentMethodFromSession Error] Failed to process session ${sessionId}:`, err.response?.data || err.message);
        throw err;
    }
}

function resolveHttpsUrl(rawUrl, req) {
    if (!rawUrl) return null;
    const trimmed = String(rawUrl).trim();
    if (trimmed.startsWith('https://')) {
        return trimmed;
    }

    // Xendit strictly requires an HTTPS URL for return endpoints.
    // When running locally on http://localhost, route through an HTTPS trampoline if an HTTPS domain/tunnel exists.
    const proto = req?.headers?.['x-forwarded-proto'] || (req?.secure ? 'https' : null);
    const host = req?.headers?.['x-forwarded-host'] || req?.headers?.host;
    let httpsOrigin = null;

    if (proto === 'https' && host) {
        httpsOrigin = `https://${host}`;
    } else if (process.env.BACKEND_URL && process.env.BACKEND_URL.startsWith('https://')) {
        httpsOrigin = process.env.BACKEND_URL.replace(/\/+$/, '');
    } else if (process.env.GOOGLE_MEET_REDIRECT_URL && process.env.GOOGLE_MEET_REDIRECT_URL.startsWith('https://')) {
        try {
            httpsOrigin = new URL(process.env.GOOGLE_MEET_REDIRECT_URL).origin;
        } catch (_) {}
    }

    if (httpsOrigin) {
        return `${httpsOrigin}/api/payment/return-trampoline?target=${encodeURIComponent(trimmed)}`;
    }

    // Fallback: convert http:// to https://
    return trimmed.replace(/^http:\/\//i, 'https://');
}

function returnTrampolineController(req, res) {
    const target = req.query.target || req.query.url;
    if (!target) {
        return res.redirect(process.env.FRONTEND_URL || '/');
    }
    try {
        const parsed = new URL(target);
        const frontendUrl = process.env.FRONTEND_URL ? new URL(process.env.FRONTEND_URL) : null;
        const isSafe = 
            parsed.hostname === 'localhost' || 
            parsed.hostname === '127.0.0.1' || 
            (frontendUrl && parsed.hostname === frontendUrl.hostname);
        if (isSafe) {
            return res.redirect(target);
        }
    } catch (e) {
        console.warn("[returnTrampolineController] Invalid target URL:", target);
    }
    return res.redirect(process.env.FRONTEND_URL || '/');
}

async function createPaymentToken(req, res) {
    const userId = req.session?.userId || req.session?.user_id;
    const { returnUrl, cancelUrl } = req.body || {};
    const customerPayload = await getCustomerPayload(req);
    try {
        const referenceId = `SAVE-CARD-USER-${uuidv4()}`;
        const rawSuccessUrl = returnUrl || `${process.env.FRONTEND_URL}/credits/checkout?save_payment=success`;
        const rawCancelUrl = cancelUrl || `${process.env.FRONTEND_URL}/credits/checkout?save_payment=cancel`;
        const successReturnUrl = resolveHttpsUrl(rawSuccessUrl, req);
        const cancelReturnUrl = resolveHttpsUrl(rawCancelUrl, req);

        const response = await axios.post(
            "https://api.xendit.co/sessions",
            {
                reference_id: referenceId,
                session_type: "SAVE",
                mode: "PAYMENT_LINK",
                amount: 0,
                currency: "PHP",
                country: "PH",
                ...customerPayload,
                success_return_url: successReturnUrl,
                cancel_return_url: cancelReturnUrl,
                metadata: {
                    user_id: `${userId}`,
                    userId: `${userId}`
                }
            },
            {
                auth: {
                    username: process.env.XENDIT_API_KEY,
                    password: ""
                },
                headers: {
                    "Content-Type": "application/json",
                    "api-version": "2024-11-11"
                }
            }
        );

        const paymentSessionId = response.data.id || response.data.payment_session_id;

        if (paymentSessionId) {
            await redisClient.set(`user_pending_save_session:${userId}`, paymentSessionId, 'EX', 86400).catch(() => null);
            await redisClient.set(`save_session_user:${paymentSessionId}`, String(userId), 'EX', 86400).catch(() => null);
        }

        return res.status(200).json({
            paymentSessionId: paymentSessionId,
            paymentLink: response.data.payment_link_url
        });
    } catch (err) {
        console.error("Error creating payment token session:", err.response?.data || err);
        return res.status(500).json({
            error: 'Unable to create payment token.'
        });
    }
}

async function savePaymentMethod(data) {
    try {
        let payment = await getPaymentByReferenceId(data.reference_id?.split("_")[0] || data.reference_id);
        if (!payment) {
            console.error("Payment not found for reference_id:", data.reference_id);
            return;
        }
        const paymentTokenId = data.payment_token_id || data.payment_tokens?.[0]?.payment_token_id || data.payment_tokens?.[0]?.id;
        if (paymentTokenId && payment.user_id) {
            return await savePaymentTokenForUser(payment.user_id, paymentTokenId, data);
        }
    } catch (err) {
        console.error("Error in savePaymentMethod:", err.message);
    }
}


async function getCustomerPayload(req) {
    let accountName = {};
    let userId;
    
    // 1. Get user data
    if (!req.session) {
        const response = await pool.query(
            `SELECT user_id, first_name, last_name, email
             FROM users
             WHERE user_id = $1`,
            [req.body.userId]
        );
        accountName = response.rows[0];
        userId = accountName.user_id;
    } else {
        userId = req.session.userId;
        // Get user data from session or database
        if (!req.session.first_name) {
            const response = await pool.query(
                `SELECT first_name, last_name, email_address
                 FROM users
                 WHERE user_id = $1`,
                [userId]
            );
            accountName = response.rows[0];
        } else {
            accountName = {
                first_name: req.session.first_name,
                last_name: req.session.last_name,
                email: req.session.email
            };
        }
    }

    // 2. Try Redis for existing customer_id
    let customerId = await redisClient.get(`customerId:${userId}`);
    console.log(`📊 Redis customerId for ${userId}:`, customerId);

    // 3. Fallback to DB
    if (!customerId) {
        const result = await pool.query(
            `SELECT customer_id
             FROM users
             WHERE user_id = $1`,
            [userId]
        );
        customerId = result.rows[0]?.customer_id || null;
        console.log(`📊 DB customerId for ${userId}:`, customerId);
        
        // If found in DB, cache it in Redis
        if (customerId) {
            await redisClient.set(`customerId:${userId}`, customerId);
            await updateUserCustomerId(userId, customerId); // Ensure DB is updated
        }
    }

    // 4. Build customer payload with unique reference_id if creating new
    if (customerId) {
        // ✅ Existing customer - use customer_id
        console.log(`✅ Using existing customer_id: ${customerId}`);
        return {
            customer_id: customerId
        };
    } else {
        // ✅ New customer - create with unique reference_id
        const firstName = accountName.first_name || req.session?.displayName?.split(" ")[0] || "User";
        const lastName = accountName.last_name || req.session?.displayName?.split(" ").slice(1).join(" ") || "Unknown";
        const email = accountName.email || req.session?.email || `user_${userId}@example.com`;
        
        // ✅ Generate unique reference_id with timestamp
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const referenceId = `CUST-${userId}-${timestamp}-${randomStr}`;
        
        console.log(`📊 Creating new customer with reference_id: ${referenceId}`);
        
        return {
            customer: {
                reference_id: referenceId,
                type: "INDIVIDUAL",
                email: email,
                individual_detail: {
                    given_names: firstName,
                    surname: lastName
                }
            }
        };
    }
}
async function getAllPaymentMethodsByUserIdService(req, res) {
    const user_id = req.session.userId || req.session.user_id;
    try {
        // Fallback reconciliation: check if user has a pending save session in Redis
        const pendingSessionId = await redisClient.get(`user_pending_save_session:${user_id}`).catch(() => null);
        if (pendingSessionId) {
            try {
                await savePaymentMethodFromSession(pendingSessionId, user_id);
            } catch (syncErr) {
                console.warn(`[PaymentSync] Auto-sync session ${pendingSessionId} skipped or failed:`, syncErr.message);
            }
        }

        const paymentMethods = await getAllPaymentMethodsByUserId(user_id);
        res.status(200).json({ paymentMethods });
    } catch (err) {
        console.error("Error fetching payment methods:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

async function syncPaymentSessionController(req, res) {
    const userId = req.session?.userId || req.session?.user_id;
    const { sessionId } = req.body || {};
    try {
        const targetSessionId = sessionId || await redisClient.get(`user_pending_save_session:${userId}`).catch(() => null);
        if (!targetSessionId) {
            return res.status(200).json({ success: false, message: "No pending save session found." });
        }
        const saved = await savePaymentMethodFromSession(targetSessionId, userId);
        const paymentMethods = await getAllPaymentMethodsByUserId(userId);
        return res.status(200).json({ success: true, saved, paymentMethods });
    } catch (err) {
        console.error("Error syncing payment session:", err);
        return res.status(500).json({ success: false, error: err.message });
    }
}

async function paymentSessionCompleteWebhookHandler(req, res) {
    try {
        const { event, data } = req.body || {};
        console.log(`[Webhook] Handling payment session/token event: ${event}`);

        let paymentTokenId = data?.payment_token_id
            || data?.payment_token?.id
            || data?.payment_tokens?.[0]?.payment_token_id
            || data?.payment_tokens?.[0]?.id
            || data?.token_id
            || data?.payment_method_id;

        const sessionId = data?.id?.startsWith('ps_') || data?.id?.startsWith('sess_') || data?.session_type
            ? data?.id
            : (data?.payment_session_id || null);

        let userId = data?.metadata?.user_id || data?.metadata?.userId || null;

        if (!userId && sessionId) {
            userId = await redisClient.get(`save_session_user:${sessionId}`).catch(() => null);
        }

        if (paymentTokenId && userId) {
            await savePaymentTokenForUser(userId, paymentTokenId, data);
        } else if (sessionId) {
            await savePaymentMethodFromSession(sessionId, userId);
        } else if (event?.toLowerCase().includes('token') && data?.id) {
            if (!userId && data?.customer_id) {
                const userRow = await pool.query('SELECT user_id FROM users WHERE customer_id = $1', [data.customer_id]);
                userId = userRow.rows[0]?.user_id;
            }
            if (userId) {
                await savePaymentTokenForUser(userId, data.id, data);
            }
        }

        return res.status(200).json({ received: true, status: "SUCCESS" });
    } catch (error) {
        console.error("[Webhook Error] paymentSessionCompleteWebhookHandler failed:", error);
        return res.status(200).json({ received: true, error: error.message });
    }
}

async function paymentSessionExpiredWebhookHandler(req, res) {
    try {
        const { data } = req.body || {};
        const sessionId = data?.id || data?.payment_session_id;
        const userId = data?.metadata?.user_id || data?.metadata?.userId;
        if (userId) {
            await redisClient.del(`user_pending_save_session:${userId}`).catch(() => null);
        }
        if (sessionId) {
            await redisClient.del(`save_session_user:${sessionId}`).catch(() => null);
        }
        return res.status(200).json({ received: true, status: "EXPIRED" });
    } catch (err) {
        console.error("Error in paymentSessionExpiredWebhookHandler:", err);
        return res.status(200).json({ received: true });
    }
}

async function TopUpPaymentByPaymentMethod(req, res) {
    let { userId } = req.session;
    let validated;
    try { validated = await validateTopupRequest(req.body); }
    catch { return res.status(422).json({ success: false, message: 'Invalid top-up selection.' }); }
    const { paymentMethodId } = req.body;
    if (typeof paymentMethodId !== 'string' || !paymentMethodId || !await paymentMethodExists({ user_id: userId, payment_token_id: paymentMethodId, status: 'ACTIVE' })) {
        return res.status(403).json({ success: false, message: 'Payment method is not available for this account.' });
    }
    const reference_id = `TOPUP-${uuidv4()}`;
    const topUpPayload = {
        user_id: userId,
        amount: validated.amount,
        currency: validated.currency,
        credits: validated.credits,
        description: validated.itemName
    };
    const payload = {
        reference_id: reference_id,
        type: "PAY",
        currency: validated.currency,
        request_amount: validated.amount,
        metadata: {
            item_name: validated.itemName,
            credits: String(validated.credits),
        },
        capture_method: "AUTOMATIC",
        description: `Top-up ${validated.credits} credits for ${validated.itemName}`,
        channel_properties: {
            success_return_url: `${process.env.FRONTEND_URL}/credits?success`,
            cancel_return_url: `${process.env.FRONTEND_URL}/credits?cancel`,
            failure_return_url: `${process.env.FRONTEND_URL}/credits?failure`
        },
        payment_token_id: paymentMethodId,
    }
    const existingTopUp = await getPaymentCheckOutByPayload(topUpPayload,'payment-method');
        console.log("💳 Payment Session Created:", existingTopUp);

    let payment;

    if (existingTopUp.length > 0) {
        payment = existingTopUp[0];

        // Reuse if still valid locally
        if (
            payment.status === "REQUIRES_ACTION" &&
            payment.redirect_url 
        ) {
            return res.json({
                paymentSessionId: payment.payment_session_id,
                paymentLink: payment.redirect_url
            });
        }

        
    }
    const updatedReferenceId = payment?.reference_id ?? reference_id;
    try{
        const response = await axios.post(
            "https://api.xendit.co/v3/payment_requests",
            {
                ...payload,
                reference_id: updatedReferenceId,
            },
            {
                auth: {
                    username: process.env.XENDIT_API_KEY,
                    password: ""
                },
                headers: {
                    "Content-Type": "application/json",
                    "api-version": "2024-11-11",
                    "Idempotency-Key": `${updatedReferenceId}` // Ensure idempotency for retries
                }
            }
        );
        const redirectUrl = response.data.actions ? response.data.actions.find(a => a.type === "REDIRECT_CUSTOMER" && a.descriptor === "WEB_URL")?.value : null;
        if(redirectUrl || (response.data.status === "REQUIRES_ACTION" || response.data.status === "ACTIVE"|| response.data.status === "SUCCEEDED")) {
            await createTopUpPaymentSession({
                user_id: userId,
                reference_id: response.data.reference_id,
                amount: response.data.amount || response.data.request_amount,
                currency: response.data.currency,
                payment_token_id: response.data.payment_token_id,
                status: response.data.status,
                credits: response.data.metadata.credits,
                description: response.data.metadata.item_name,
                payment_type: "TOPUP"
            });
            const updatePaymentPayload={
                reference_id: response.data.reference_id,
                channel_code: response.data.channel_code,
                payment_request_id: response.data.payment_request_id,
                payment_token_id: response.data.payment_token_id,
                customer_id: response.data.customer_id,
                processed_at: new Date(),
                redirect_url: redirectUrl,
            }
  
            await Promise.all([
                updatePaymentByReference(response.data.reference_id, updatePaymentPayload),
            ]);

            return res.json({
                reference_id: response.data.reference_id,
                paymentLink: redirectUrl
            });
        }

    }catch(err){
        console.log("💳 Error processing Top-Up Payment:", err.response?.data.error_code);
        if(err.response?.data.error_code === "INVALID_TOKEN"){
            await updatePaymentMethodStatus(paymentMethodId, 'INACTIVE');
        }
        return res.status(500).json({
            error: 'Unable to process top-up payment.'
        });
    }
}



async function subscriptionWebhookHandler(req,res){
    const { event, data } = req.body;
    let subscriptionId;
    if(event !== 'recurring.plan.inactived' && event !== 'recurring.plan.activated' ){
        subscriptionId = await getSubscriptionByXenditPlanIdRepositories(data.plan_id || data.id);
        console.log("💳 Subscription ID:", subscriptionId);
    }
    if(event === 'recurring.plan.inactived'){

    }else if(event === 'recurring.plan.activated'){
        await updateSubscriptionBySubscriptionId(data.metadata.subscriptionId, {
            status: 'ACTIVE',
        });
        const subscriptionDetails = await getSubscriptionBySubscriptionIdRepositories(data.metadata.subscriptionId);
        const planDetails = await getPlandetailsByPlanIdRepositories(subscriptionDetails.plan_id);
        const notification = await createNotification({
            message: `Your subscription plan ${planDetails.name} has Activated.`,
            is_read: false,
            reference_table: "subscriptions",
            reference_prefix: "SUBSCRIPTION",
            reference_path: `${process.env.FRONTEND_URL}/credits-subscriptions`,
            reference_id: subscriptionDetails.subscription_id,
            user_id: subscriptionDetails.user_id
        });
        const io = getIo();
        io.to(notification.account_id).emit("notification", notification);

    }else if(event === 'recurring.cycle.failed'){
        const checkCycleId = await getSubscriptionInvoiceByCycleIdRepositories(data.id);
        if(data.type === 'IMMEDIATE'){
            if(!checkCycleId){
                const subscriptionInvoicePayload = {
                    xendit_plan_id: data.plan_id,
                    xendit_cycle_id: data.id,
                    amount_php_cents: data.amount,
                    status: data.status,
                    attempt_count: data.attempt_count,
                    billing_period_start: data.scheduled_timestamp,
                    billing_period_end: new Date(new Date(data.scheduled_timestamp).setMonth(new Date(data.scheduled_timestamp).getMonth() + 1)).toISOString(),
                    subscription_id: subscriptionId,
                    failed_at: data.created,
                };
                await createSubscriptionInvoice(subscriptionInvoicePayload);
            }
        }else{
            if(checkCycleId){
                await updateSubscriptionInvoiceByCycleIdRepositories(data.id, {
                    status: data.status,
                    attempt_count: data.attempt_count,
                    failed_at: data.created,
                });
            }
        }

        await endSubscription(subscriptionId);
    }
    else if(event === 'recurring.cycle.created'){
        if(data.status === 'SCHEDULED'){
            const checkCycleId = await getSubscriptionInvoiceByCycleIdRepositories(data.id);
            if(!checkCycleId){
                const subscriptionInvoicePayload = {
                    xendit_plan_id: data.plan_id,
                    xendit_cycle_id: data.id,
                    amount_php_cents: data.amount,
                    status: data.status,
                    attempt_count: data.attempt_count,
                    billing_period_start: data.scheduled_timestamp,
                    billing_period_end: new Date(new Date(data.scheduled_timestamp).setMonth(new Date(data.scheduled_timestamp).getMonth() + 1)).toISOString(),
                    subscription_id: subscriptionId,
                };
                await createSubscriptionInvoice(subscriptionInvoicePayload);
            }
        }
    }else if(event === 'recurring.cycle.succeeded'){
        const checkCycleId = await getSubscriptionInvoiceByCycleIdRepositories(data.id);
        if(data.type === 'IMMEDIATE'){
            if(!checkCycleId){
                const subscriptionInvoicePayload = {
                    xendit_plan_id: data.plan_id,
                    xendit_cycle_id: data.id,
                    amount_php_cents: data.amount,
                    status: data.status,
                    attempt_count: data.attempt_count,
                    billing_period_start: data.scheduled_timestamp,
                    billing_period_end: new Date(new Date(data.scheduled_timestamp).setMonth(new Date(data.scheduled_timestamp).getMonth() + 1)).toISOString(),
                    subscription_id: subscriptionId,
                    paid_at: data.created,
                };
                await createSubscriptionInvoice(subscriptionInvoicePayload);
            }
        }else{
            if(checkCycleId){
                await updateSubscriptionInvoiceByCycleIdRepositories(data.id, {
                    status: data.status,
                    attempt_count: data.attempt_count,
                    amount_php_cents: data.amount,
                    paid_at: data.created,
                });
            }
        }
        const responsePlan = await axios.get(`
            https://api.xendit.co/recurring/plans/${data.plan_id}`,
            {
                    auth: {
                        username: process.env.XENDIT_API_KEY,
                        password: ""
                    },
                    headers: {
                        "Content-Type": "application/json",
                        "api-version": "2026-01-01"
                    }
                }
        )
        if(responsePlan.data.status !== 'INACTIVE'){
            const subscriptionUpdatePayload = {
                current_period_start: data.scheduled_timestamp,
                current_period_end: new Date(new Date(data.scheduled_timestamp).setMonth(new Date(data.scheduled_timestamp).getMonth() + 1)).toISOString(),
                xendit_plan_id: data.plan_id,
                status: 'ACTIVE',
                plan_id: responsePlan.data.metadata.planId,
                reference_id: data.reference_id,
                next_billing_at: new Date(new Date(data.scheduled_timestamp).setMonth(new Date(data.scheduled_timestamp).getMonth() + 1)).toISOString(),
            }
            const updateSubscription = await updateSubscriptionBySubscriptionId(subscriptionId, subscriptionUpdatePayload);
        }
        const getSubscriptionDetails = await getSubscriptionBySubscriptionIdRepositories(subscriptionId);
        const planDetails = await getPlandetailsByPlanIdRepositories(getSubscriptionDetails.plan_id);
        const notification = await createNotification({
            message: `Your subscription payment for plan ${planDetails.name} has succeeded.`,
            is_read: false,
            reference_table: "subscriptions",
            reference_prefix: "SUBSCRIPTION",
            reference_path: `${process.env.FRONTEND_URL}/credits-subscriptions`,
            reference_id: subscriptionId,
            user_id: getSubscriptionDetails.user_id
        });
        const io = getIo();
        io.to(notification.account_id).emit("notification", notification);
    }
    res.status(200).json({ message: "Subscription payment processing not implemented yet" });
}

async function processSubscriptionPayment(req, res) {
    let anchorDate = new Date();
    if (anchorDate.getDate() > 28) {
        anchorDate.setDate(28);
    }
    anchorDate = anchorDate.toISOString();
    let hasNoTrial = true;
    const { userId } = req.session;
    if (!userId) {
        return res.status(400).json({ error: "Missing required field: userId" });
    }
    if(!req.body.planId){
        return res.status(400).json({ error: "Missing required field: planId" });
    }
    if (typeof req.body.paymentMethodId !== 'string' || !await paymentMethodExists({ user_id: userId, payment_token_id: req.body.paymentMethodId, status: 'ACTIVE' })) {
        return res.status(403).json({ error: 'Payment method is not available for this account.' });
    }
    const [subscriptionDetails, planDetails] = await Promise.all([
        getSubcriptionByUserIdRepositories(userId),
        getPlandetailsByPlanIdRepositories(req.body.planId)
    ]);
    const subscriptionPlanDetails = await getPlandetailsByPlanIdRepositories(subscriptionDetails[0]?.plan_id);
    if(!planDetails){
        return res.status(404).json({ error: "No plan found for this planId" });
    }
    if(!subscriptionDetails){
        return res.status(404).json({ error: "No subscription found for this user" });
    }
    if(subscriptionDetails[0].plan_id === planDetails.plan_id){
        return res.status(400).json({ error: "User is already subscribed to this plan" });
    }else if(subscriptionDetails[0].plan_id !== planDetails.plan_id && planDetails.amount_php_cents === 0){
        return res.status(400).json({ error: "Cannot switch to a free plan from a paid plan" });
    }
    if (subscriptionDetails[0].plan_id !== planDetails.plan_id && planDetails.amount_php_cents !== 0 && subscriptionPlanDetails.amount_php_cents !== 0) {
        await updateSubscriptionPayment(req, res);
    } else {
        if(!subscriptionDetails[0].trial_starts_at && !subscriptionDetails[0].trial_ends_at && !subscriptionDetails[0].xendit_plan_id && planDetails.days_of_trials > 0){
            anchorDate = getAnchorDate(planDetails.days_of_trials);
            hasNoTrial = false;
            console.log("User has a trial period. Anchor date set to:", anchorDate);
        }
        console.log("Subscription Details:", subscriptionDetails);
        console.log("Plan Details:", planDetails);
        try {
            const reference_id = `SUBSCRIPTION-${uuidv4()}`;

            const customerPayload = await getCustomerPayload(req);

            const payload = {
                reference_id,
                currency: "PHP",
                amount: planDetails.amount_php_cents,

        //         // Inject either customer_id or customer_details
                ...customerPayload,

                schedule: {
                    interval: planDetails.billing_period,
                    interval_count: 1,
                    anchor_date: anchorDate,
                    retry_interval: "DAY",
                    retry_interval_count: 1,
                    total_retry: 3,
                    failed_attempt_notifications: [1, 3]
                },

                payment_tokens: [
                    {
                        payment_token_id: req.body.paymentMethodId,
                        rank: 1
                    }
                ],

                immediate_payment: hasNoTrial,
                failed_cycle_action: "RESUME",
                payment_link_for_failed_attempt: true,

                locale: "en",

                notification_channels: ["EMAIL"],

                description: planDetails.description,
                metadata: {
                    planId: planDetails.plan_id,
                    userId: userId,
                    subscriptionId: subscriptionDetails[0].subscription_id
                },
                items: [
                    {
                        type: "DIGITAL_PRODUCT",
                        reference_id,
                        name: planDetails.name,
                        net_unit_amount: planDetails.amount_php_cents,
                        quantity: 1,
                        category: "Plan",
                        description: planDetails.description,
                        metadata: {
                            "value":'string',
                        }
                    }
                ]
            };
            const response = await axios.post(
                "https://api.xendit.co/recurring/plans",
                payload,
                {
                    auth: {
                        username: process.env.XENDIT_API_KEY,
                        password: ""
                    },
                    headers: {
                        "Content-Type": "application/json",
                        "api-version": "2026-01-01"
                    }
                }
            );
            console.log("✅ Xendit Recurring Plan Response:", response.data);
            const subscriptionUpdatePayload = {
                current_period_start: new Date().toISOString(),
                current_period_end: hasNoTrial ? new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString() : anchorDate,
                xendit_plan_id: response.data.id,
                status: response.data.status,
                trial_starts_at: hasNoTrial ? null : new Date().toISOString(),
                trial_ends_at: hasNoTrial ? null : anchorDate,
                plan_id: response.data.metadata.planId,
                reference_id: response.data.reference_id,
                payment_token_id: req.body.paymentMethodId,
                next_billing_at: new Date(new Date(anchorDate).setMonth(new Date(anchorDate).getMonth() + 1)).toISOString(),
            }
            const updateSubscription = await updateSubscriptionBySubscriptionId(response.data.metadata.subscriptionId, subscriptionUpdatePayload);
            console.log("Updating subscription with payload:", subscriptionUpdatePayload);

            return res.status(200).json({
                message: "Recurring plan created successfully",
                subscriptionUpdate: updateSubscription
            });

        } catch (error) {
            console.error(error.response?.data || error);

            return res.status(error.response?.status || 500).json({
                message: "Failed to create recurring plan",
                error: error.response?.data || error.message
            });
        }
    }

}

async function cancelSubscription(req,res){
    const { userId } = req.session;
    const subscriptionDetails = await getSubcriptionByUserIdRepositories(userId);
    const subscription = subscriptionDetails[0];
    if (!subscription) {
        return res.status(404).json({ error: "No subscription found for this user" });
    }
    const planDetails = await getPlandetailsByPlanIdRepositories(subscription.plan_id);
    if (!planDetails || Number(planDetails.amount_php_cents || 0) <= 0) {
        return res.status(422).json({ error: "Free subscriptions cannot be cancelled." });
    }
    if (subscription.cancel_at_period_end) {
        return res.status(200).json({ message: "Subscription cancellation is already scheduled.", cancel_at_period_end: true });
    }
    if (!subscription.xendit_plan_id) {
        return res.status(409).json({ error: "This subscription has no active recurring plan to cancel." });
    }
    try{
        const responseCancel = await axios.post(
                `https://api.xendit.co/recurring/plans/${subscription.xendit_plan_id}/deactivate`,{},{
                    auth: {
                        username: process.env.XENDIT_API_KEY,
                        password: ""
                    },
                    headers: {
                        "Content-Type": "application/json",
                        "api-version": "2026-01-01"
                    }
                }
            );
        const [updatedInvoice] = await Promise.all([
            updateSubscriptionInvoiceByXenditPlanIdRepositories(subscription.xendit_plan_id),
            updateSubscriptionBySubscriptionId(subscription.subscription_id, {
                cancel_at_period_end: true,
                next_billing_at: null,
                canceled_at: new Date().toISOString(),
            })
        ]);
        const notification = await createNotification({
            message: `Your subscription plan ${planDetails.name} has been inactivated.`,
            is_read: false,
            reference_table: "subscriptions",
            reference_prefix: "SUBSCRIPTION",
            reference_path: `${process.env.FRONTEND_URL}/credits-subscriptions`,
            reference_id: subscription.subscription_id,
            user_id: userId
        });
        const io = getIo();
        io.to(notification.account_id).emit("notification", notification);
        console.log("Subscription canceled successfully");
        res.status(200).json({
            message: "Subscription canceled successfully",
            cancel_at_period_end: true,
            responseCancel: responseCancel.data,
            updatedInvoice: updatedInvoice
        });
    }catch(err){
        console.error(err.response?.data || err);
        return res.status(500).json({
            message: "Failed to cancel subscription",
            error: 'Unable to cancel subscription.'
        });
    }
}

async function endSubscription(subscriptionId) {
    const planDetails = await getFreePlanRepositories();
    const subscriptionDetails = await getSubscriptionBySubscriptionIdRepositories(subscriptionId);
    try{
        await updateSubscriptionBySubscriptionId(subscriptionId, {
            status: "ACTIVE",
            next_billing_at: null,
            cancel_at_period_end: false,
            canceled_at: null,
            plan_id: planDetails.plan_id,
            current_period_start: null,
            current_period_end: null,
        });
        const notification = await createNotification({
            message: `Your subscription has been downgraded to the free plan.`,
            is_read: false,
            reference_table: "subscriptions",
            reference_prefix: "SUBSCRIPTION",
            reference_path: `${process.env.FRONTEND_URL}/credits-subscriptions`,
            reference_id: subscriptionId,
            user_id: subscriptionDetails?.user_id || null
        });
        const io = getIo();
        io.to(notification.account_id).emit("notification", notification);
        console.log("Subscription ended and downgraded to free plan successfully");
    }catch(err){
        console.error(err.response?.data || err);
        throw err;
    }
}

async function updateSubscriptionPayment(req, res) {
    const { userId } = req.session;
    if (!userId) {
        return res.status(400).json({ error: "Missing required field: userId" });
    }
    if(!req.body.planId){
        return res.status(400).json({ error: "Missing required field: planId" });
    }
    const [subscriptionDetails, planDetails] = await Promise.all([
        getSubcriptionByUserIdRepositories(userId),
        getPlandetailsByPlanIdRepositories(req.body.planId)
    ]);
    const subscriptionPlanDetails = await getPlandetailsByPlanIdRepositories(subscriptionDetails[0]?.plan_id);
    if(!planDetails){
        return res.status(404).json({ error: "No plan found for this planId" });
    }
    if(!subscriptionDetails){
        return res.status(404).json({ error: "No subscription found for this user" });
    }
    if(subscriptionDetails[0].plan_id === planDetails.plan_id){
        return res.status(400).json({ error: "User is already subscribed to this plan" });
    }else if(subscriptionDetails[0].plan_id !== planDetails.plan_id && planDetails.amount_php_cents === 0){
        return res.status(400).json({ error: "Cannot switch to a free plan from a paid plan" });
    }

    const updateType = planDetails.amount_php_cents > subscriptionPlanDetails.amount_php_cents ? "UPGRADE" : "DOWNGRADE";
    if (updateType === "UPGRADE") {

        const periodStart = new Date(subscriptionDetails[0].current_period_start).getTime();
        const periodEnd = new Date(subscriptionDetails[0].current_period_end).getTime();
        const now = Date.now();
        const total = periodEnd - periodStart;
        const remainingRatio = Number.isFinite(total) && total > 0
            ? Math.max(0, Math.min(1, (periodEnd - now) / total))
            : 1;
        const priceDifference = Number(planDetails.amount_php_cents) - Number(subscriptionPlanDetails.amount_php_cents);
        const serverAmount = Math.max(1, Math.round(priceDifference * remainingRatio * 100) / 100);

        const referenceId = `SUBSCRIPTION-${uuidv4()}`;

        const paymentPayload = {
            reference_id: referenceId,
            type: "PAY",
            country: "PH",
            currency: "PHP",

            // Charge the full new plan amount
            request_amount: serverAmount,

            payment_token_id: req.body.paymentMethodId,
            description: `Subscription upgrade from ${subscriptionDetails[0].plan_id} to ${planDetails.plan_id}`,
            metadata: {
                action: "UPGRADE",
                userId,
                subscriptionId: subscriptionDetails[0].subscription_id,
                currentPlanId: subscriptionDetails[0].plan_id,
                newPlanId: planDetails.plan_id,
                xenditPlanId: subscriptionDetails[0].xendit_plan_id,
            },
            channel_properties: {
                success_return_url: `${process.env.FRONTEND_URL}/subscription?success`,
                cancel_return_url: `${process.env.FRONTEND_URL}/subscription?cancel`,
                failure_return_url: `${process.env.FRONTEND_URL}/subscription?failure`
            }
        };

        const paymentResponse = await axios.post(
            "https://api.xendit.co/v3/payment_requests",
            paymentPayload,
            {
                auth: {
                    username: process.env.XENDIT_API_KEY,
                    password: ""
                },
                headers: {
                    "Content-Type": "application/json",
                    "api-version": "2024-11-11",
                    "Idempotency-Key": `${referenceId}` // Ensure idempotency for retries
                }
            }
        );
        const redirectUrl = paymentResponse.data.actions ? paymentResponse.data.actions.find(a => a.type === "REDIRECT_CUSTOMER" && a.descriptor === "WEB_URL")?.value : null;
        return res.status(200).json({
            message: "Upgrade payment created successfully.",
            reference_id: subscriptionDetails[0].reference_id,
            payment_link: redirectUrl,
        });
    } else{
        console.log("Subscription Details:", subscriptionDetails);
        console.log("Plan Details:", planDetails);
        try {
            let anchorDate = new Date(subscriptionDetails[0].next_billing_at);
            if (anchorDate.getDate() > 28) {
                anchorDate.setDate(28);
            }
            anchorDate = anchorDate.toISOString();
            const payload = {
                amount: planDetails.amount_php_cents,
                schedule: {
                    interval: planDetails.billing_period,
                    interval_count: 1,
                    anchor_date: anchorDate,
                    retry_interval: "DAY",
                    retry_interval_count: 1,
                    total_retry: 3,
                    failed_attempt_notifications: [1, 3]
                },

                payment_tokens: [
                    {
                        payment_token_id: req.body.paymentMethodId,
                        rank: 1
                    }
                ],

                payment_link_for_failed_attempt: true,

                locale: "en",

                notification_channels: ["EMAIL"],

                description: planDetails.description,
                metadata: {
                    planId: planDetails.plan_id,
                    userId: userId,
                    subscriptionId: subscriptionDetails[0].subscription_id
                },
                items: [
                    {
                        type: "DIGITAL_PRODUCT",
                        reference_id: subscriptionDetails[0].reference_id,
                        name: planDetails.name,
                        net_unit_amount: planDetails.amount_php_cents,
                        quantity: 1,
                        category: "Plan",
                        description: planDetails.description,
                        metadata: {
                            "value":'string',
                        }
                    }
                ]
            };

            const response = await axios.patch(
                `https://api.xendit.co/recurring/plans/${subscriptionDetails[0].xendit_plan_id}`,
                payload,
                {
                    auth: {
                        username: process.env.XENDIT_API_KEY,
                        password: ""
                    },
                    headers: {
                        "Content-Type": "application/json",
                        "api-version": "2026-01-01"
                    }
                }
            );
            console.log("✅ Xendit Recurring Plan Response:", response.data);
            
            const subscriptionUpdatePayload = {
                plan_id: subscriptionDetails[0].plan_id,
                payment_token_id: req.body.paymentMethodId
            }
            const updateSubscription = await updateSubscriptionBySubscriptionId(response.data.metadata.subscriptionId, subscriptionUpdatePayload);
            await updateSubscriptionInvoiceAmountRepositories(subscriptionDetails[0].xendit_plan_id, response.data.amount);
            const currentPlanDetails = await getPlandetailsByPlanIdRepositories(subscriptionDetails[0].plan_id);
            console.log("Updating subscription with payload:", subscriptionUpdatePayload);
            const notification = await createNotification({
                message: `Your subscription downgrade from ${currentPlanDetails.name} to ${planDetails.name} has been initiated. The change will take effect in the next billing cycle.`,
                is_read: false,
                reference_table: "subscriptions",
                reference_prefix: "SUBSCRIPTION",
                reference_path: `${process.env.FRONTEND_URL}/credits-subscriptions`,
                reference_id: subscriptionDetails[0].subscription_id,
                user_id: subscriptionDetails[0].user_id
            });
            const io = getIo();
            io.to(notification.account_id).emit("notification", notification);
            return res.status(200).json({
                message: `Recurring plan created successfully. Your subscription downgrade will take effect in the next billing cycle ${subscriptionDetails[0].next_billing_at}.`,
                subscriptionUpdate: updateSubscription
            });

        } catch (error) {
            console.error(error.response?.data || error);

            return res.status(error.response?.status || 500).json({
                message: "Failed to create recurring plan",
                error: error.response?.data || error.message
            });
        }
    }

}

function getAnchorDate(daysOfTrial) {
    const date = new Date();

    date.setDate(date.getDate() + daysOfTrial);

    if (date.getDate() >= 29) {
        date.setMonth(date.getMonth() + 1);
        date.setDate(1);
    }

    return date.toISOString();
}



async function getActiveCreditPackagesService(req, res) {
    try {
        const economy = await getSectionValue('economy');
        const creditPackages = Array.isArray(economy?.creditPackages) ? economy.creditPackages : [];
        const activePackages = creditPackages
            .filter(p => p && p.active !== false)
            .map(p => ({
                id: p.id,
                name: p.name,
                price: Number(p.pricePhp),
                credits: Number(p.credits)
            }));
        return res.status(200).json({ success: true, creditPackages: activePackages });
    } catch (error) {
        console.error('Failed to get credit packages:', error);
        return res.status(500).json({ success: false, message: 'Failed to load credit packages.' });
    }
}

module.exports = {
    xenditWebhookHandler,
    processSubscriptionPayment,
    processTopUpPayment,
    savePaymentMethod,
    getAllPaymentMethodsByUserIdService,
    paymentSessionCompleteWebhookHandler,
    paymentSessionExpiredWebhookHandler,
    TopUpPaymentByPaymentMethod,
    createPaymentToken,
    subscriptionWebhookHandler,
    endSubscription,
    cancelSubscription,
    updateSubscriptionPayment,
    getActiveCreditPackagesService,
    savePaymentTokenForUser,
    savePaymentMethodFromSession,
    syncPaymentSessionController,
    returnTrampolineController,
    resolveHttpsUrl
};
