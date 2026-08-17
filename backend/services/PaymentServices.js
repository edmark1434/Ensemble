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
    updateWalletFromTopUp,
    createTopUpPaymentSession,
    createSubscriptionPayment,
    getPaymentCheckOutByPayload,
    updateUserCustomerId,
    updatePayment,
    createPaymentMethodForUser,
    paymentMethodExists,
    getAllPaymentMethodsByUserId,
    updatePaymentMethodStatus,
    getPlatformWallet,
    createCreditTransaction,
    updatePlatformWalletBalance,
} = require("../repositories/PaymentRepositories");
const { CREDIT_TRANSACTION_TYPE } = require("../lib/CreditTransactionEnums");
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

const redisClient = require('../lib/Redis');
const TOPUP_PACKS = new Map([
    [80, { amount: 99, name: 'Pocket (80 Credits)' }],
    [250, { amount: 299, name: 'Bundle (250 Credits)' }],
    [750, { amount: 849, name: 'Box (750 Credits)' }],
    [1600, { amount: 1599, name: 'Vault (1,600 Credits)' }],
]);
const CUSTOM_CREDIT_RATE = 1.25;

function validateTopupRequest(body = {}) {
    const credits = Number(body.credits);
    if (!Number.isSafeInteger(credits) || credits < 10 || credits > 1000000 || body.currency !== 'PHP') throw new Error('INVALID_TOPUP');
    const pack = body.itemType === 'topup' ? TOPUP_PACKS.get(credits) : null;
    if (body.itemType === 'topup' && !pack) throw new Error('INVALID_TOPUP');
    if (!['topup', 'custom'].includes(body.itemType)) throw new Error('INVALID_TOPUP');
    const amount = pack?.amount ?? Math.round(credits * CUSTOM_CREDIT_RATE * 100) / 100;
    return { amount, credits, currency: 'PHP', itemName: pack?.name ?? `Custom Top-up (${credits.toLocaleString()} Credits)` };
}
async function xenditWebhookHandler(req, res) {
    const { event, data } = req.body;

    try {

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

        if (payment.status === "PAID") {
            return res.status(200).json({
                message: "Already processed."
            });
        }

        if (data.status === "SUCCEEDED") {

            await pool.query("BEGIN");

            try {
                const getPlatformWalletDetails = await getPlatformWallet();
                await savePaymentMethod(data);
                await updatePaymentByReference(payment.reference_id, {
                    status: "PAID",
                    payment_id: data.payment_id,
                    payment_request_id: data.payment_request_id,
                    processed_at: new Date(),
                    channel_code: data.channel_code
                });

                const result =
                    await updateTopUpStatus(
                        payment.reference_id,
                        "PAID",
                        data.payment_id,
                        data.channel_code
                    );
                
                const userWallet = await updateWalletFromTopUp(
                    payment.user_id,
                    result.credits_granted
                );
                const userTransaction = await createCreditTransaction({
                    type: CREDIT_TRANSACTION_TYPE.FUND_TRANSFER,
                    amount_credits: result.credits_granted,
                    status: "completed",
                    source_wallet_id: getPlatformWalletDetails.wallet_id,
                    destination_wallet_id: userWallet.wallet_id,
                    fee_transaction_id: null,
                    reference_table: "payments",
                    reference_id: payment.payment_id
                });
                await updatePlatformWalletBalance(result.credits_granted, 'add');
                const notification = await createNotification({
                    message: `Your wallet has been credited with ${result.credits_granted} credits.`,
                    is_read: false,
                    reference_table: "credit_transactions",
                    reference_prefix: "TOPUP",
                    reference_path: `${payment.redirect_url || `${process.env.FRONTEND_URL}/transactions`}`,
                    reference_id: userTransaction.credit_transaction_id,
                    user_id: payment.user_id,
                });
                const io = getIo();
                io.to(notification.account_id).emit("notification", notification);
                await pool.query("COMMIT");

                return res.status(200).json({
                    message: "Payment processed."
                });

            } catch (err) {

                await pool.query("ROLLBACK");
                throw err;
            }

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
    try { validated = validateTopupRequest(req.body); }
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
            `https://app.com/credits?success`,
            // `${process.env.FRONTEND_URL}/credits?success`
        cancel_return_url:
            `https://app.com/credits?success`,
            // `${process.env.FRONTEND_URL}/credits?cancel`,

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

async function createPaymentToken(req, res) {
    const { userId } = req.session;
    const customerPayload = await getCustomerPayload(req);
    try{
        console.log({
    reference_id: `SAVE-CARD-USER-${uuidv4()}`,
    ...customerPayload
});
        const response = await axios.post(
            "https://api.xendit.co/sessions",
            {
                reference_id: `SAVE-CARD-USER-${uuidv4()}`,
                session_type: "SAVE",
                mode: "PAYMENT_LINK",
                amount: 0,
                currency: "PHP",
                country: "PH",
                ...customerPayload,
                success_return_url:
                    `${process.env.FRONTEND_URL}/credits?success`,

                cancel_return_url:
                    `${process.env.FRONTEND_URL}/credits?cancel`,
                metadata: {
                    user_id: `${userId}`
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
        res.status(200).json({
            paymentSessionId: response.data.payment_session_id,
            paymentLink: response.data.payment_link_url
        });
    }catch(err){
        console.error(err.response?.data || err);
        res.status(500).json({
            error: 'Unable to create payment token.'
        });
    }
}

async function savePaymentMethod(data) {
    let payment = await getPaymentByReferenceId(data.reference_id.split("_")[0] || data.reference_id);
    payment.user_id = payment.user_id; // Ensure user_id is an integer
    if(!payment){
        console.error("Payment not found for reference_id:", data.reference_id);
        return res.status(404).json({ error: "Payment not found" });
    }
    const hasToken = data.payment_token_id ? true : false;
            if(hasToken){
                const response = await axios.get(
                    `https://api.xendit.co/v3/payment_tokens/${data.payment_token_id}`,
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

                const checkExistingPaymentMethod = await paymentMethodExists(
                    { user_id: payment.user_id, payment_token_id: data.payment_token_id }
                );
                if(!checkExistingPaymentMethod){
                    if(response.data.channel_code === 'CARDS'){
                        const checkExistingCard = await paymentMethodExists(
                            { user_id: payment.user_id, fingerprint: response.data.channel_properties.card_details.fingerprint }
                        )
                        if(!checkExistingCard){
                            await createPaymentMethodForUser({
                                user_id: payment.user_id,
                                payment_token_id: data.payment_token_id,
                                channel_code: response.data.channel_code,
                                type: response.data.channel_properties.card_details.type,
                                status:response.data.status,
                                is_default: false,
                                display_name: `${response.data.channel_properties.card_details.cardholder_first_name} ${response.data.channel_properties.card_details.cardholder_last_name}`,
                                card_brand: response.data.channel_properties.card_details.network,
                                masked_card_number: response.data.channel_properties.card_details.masked_card_number,
                                card_exp_month: response.data.channel_properties.card_details.expiry_month,
                                card_exp_year: response.data.channel_properties.card_details.expiry_year,
                                customer_reference_id: response.data.reference_id,
                                fingerprint: response.data.channel_properties.card_details.fingerprint
                            });
                        }
                    }else{
                        await createPaymentMethodForUser({
                                user_id: payment.user_id,
                                payment_token_id: data.payment_token_id,
                                channel_code: response.data.channel_code,
                                type: ['GCASH','PAYMAYA','SHOPEEPAY','GRABPAY'].includes(response.data.channel_code) ? 'E-WALLET' : ['UBP_DIRECT_DEBIT','BPI_DIRECT_DEBIT','UBP_EADA'].includes(response.data.channel_code) ? 'DIRECT-DEBIT' : response.data.channel_code,
                                status:response.data.status,
                                is_default: false,
                                display_name: response.data.token_details.account_number || response.data.token_details.masked_bank_account_number || response.data.channel_code,
                                card_brand: null,
                                masked_card_number: null,
                                card_exp_month: null,
                                card_exp_year: null,
                                customer_reference_id: response.data.reference_id,
                                fingerprint: null
                        })
                    }
                }
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
    try{
        const paymentMethods = await getAllPaymentMethodsByUserId(user_id);
        res.status(200).json({ paymentMethods });
    }catch(err){
        console.error("Error fetching payment methods:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

async function paymentSessionCompleteWebhookHandler(req, res) {
    const { event, data } = req.body;
    const hasToken = data.payment_token_id ? true : false;
    const userId = data.metadata?.user_id|| null; 
    console.log("User ID from metadata:", userId);
    if(hasToken){
                const response = await axios.get(
                    `https://api.xendit.co/v3/payment_tokens/${data.payment_token_id}`,
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
                
                const checkExistingPaymentMethod = await paymentMethodExists(
                    { user_id: userId, payment_token_id: data.payment_token_id }
                );
                if(!checkExistingPaymentMethod){
                    if(response.data.channel_code === 'CARDS'){
                        const checkExistingCard = await paymentMethodExists(
                            { user_id: userId, fingerprint: response.data.channel_properties.card_details.fingerprint }
                        )
                        if(!checkExistingCard){
                            await createPaymentMethodForUser({
                                user_id: userId,
                                payment_token_id: data.payment_token_id,
                                channel_code: response.data.channel_code,
                                type: response.data.channel_properties.card_details.type,
                                status:response.data.status,
                                is_default: false,
                                display_name: `${response.data.channel_properties.card_details.cardholder_first_name} ${response.data.channel_properties.card_details.cardholder_last_name}`,
                                card_brand: response.data.channel_properties.card_details.network,
                                masked_card_number: response.data.channel_properties.card_details.masked_card_number,
                                card_exp_month: response.data.channel_properties.card_details.expiry_month,
                                card_exp_year: response.data.channel_properties.card_details.expiry_year,
                                fingerprint: response.data.channel_properties.card_details.fingerprint
                            });
                        }
                    }else{
                        if(response.data.channel_code === 'PAYMAYA' || response.data.channel_code === 'SHOPEEPAY' || response.data.channel_code === 'UBP_DIRECT_DEBIT'){
                            const checkExistingCard = await paymentMethodExists(
                                { user_id: userId, channel_code: response.data.channel_code, display_name: response.data.token_details.account_number ?? response.data.token_details.masked_bank_account_number }
                            )
                            if(checkExistingCard){
                                console.log("Payment method already exists for user:", userId, "with channel code:", response.data.channel_code);
                                return;
                            }
                        }
                        await createPaymentMethodForUser({
                                user_id: userId,
                                payment_token_id: data.payment_token_id,
                                channel_code: response.data.channel_code,
                                type: ['GCASH','PAYMAYA','SHOPEEPAY','GRABPAY','GCASH_LINK_AND_PAY'].includes(response.data.channel_code) ? 'E-WALLET' : ['UBP_DIRECT_DEBIT','BPI_DIRECT_DEBIT','UBP_EADA'].includes(response.data.channel_code) ? 'DIRECT-DEBIT' : response.data.channel_code,
                                status:response.data.status,
                                is_default: false,
                                display_name: response.data.token_details.account_number || response.data.token_details.masked_bank_account_number || response.data.channel_code,
                                card_brand: null,
                                masked_card_number: null,
                                card_exp_month: null,
                                card_exp_year: null,
                                fingerprint: null
                        })
                    }
                }
        const result = await pool.query(
            `SELECT customer_id
            FROM users
            WHERE user_id = $1`,
            [userId]
        );
        
        // If found in DB, cache it in Redis
        const customerId = result.rows[0]?.customer_id || null;
        if (!customerId) {
            await redisClient.set(`customerId:${userId}`, response.data.customer_id, 'EX', 60 * 60 * 24 * 30); // Cache for 30 days
            await updateUserCustomerId(userId, response.data.customer_id); // Ensure DB is updated
        }
    }
}

async function paymentSessionExpiredWebhookHandler(req, res) {
}

async function TopUpPaymentByPaymentMethod(req, res) {
    let { userId } = req.session;
    let validated;
    try { validated = validateTopupRequest(req.body); }
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
            success_return_url: `https://app.com/credits?success`,
            cancel_return_url: `https://app.com/credits?cancel`,
            failure_return_url: `https://app.com/credits?failure`
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
                success_return_url: `https://app.com/subscription?success`,
                cancel_return_url: `https://app.com/subscription?cancel`,
                failure_return_url: `https://app.com/subscription?failure`
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
    updateSubscriptionPayment
};
