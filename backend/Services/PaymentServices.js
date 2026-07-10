const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const { pool } = require('../lib/database');

const {
    getPaymentByUserIdAndStatus,
    createTopUpPayment,
    updatePaymentWithReferenceId,
    getPaymentByReferenceId,
    updatePaymentByReference,
    updateTopUpStatus,
    updateWalletFromTopUp,
    createTopUpPaymentSession,
    getPaymentCheckOutByPayload,
    updateUserCustomerId,
    updatePayment,
    createPaymentMethodForUser,
    paymentMethodExists,
    getAllPaymentMethodsByUserId
} = require("../Repositories/PaymentRepositories");
const redisClient = require('../lib/redis');

async function xenditWebhookHandler(req, res) {
    console.log("📬 Xendit Webhook Received:", req.body);
    const { event, data } = req.body;

    const payment = await getPaymentByReferenceId(data.reference_id.split("_")[0]);
    if(!payment){
        console.error("Payment not found for reference_id:", data.reference_id);
        return res.status(404).json({ error: "Payment not found" });
    }
    if(payment.status === 'PAID'){
        res.status(200).json({ message: "Payment already processed" });
        return;
    }
    if(data.status === 'SUCCEEDED'){
        await pool.query(`BEGIN;`);
        try{
            //save payment method if it doesn't exist
            await savePaymentMethod(data);
            await updatePaymentByReference(payment.reference_id, {
                status: 'PAID',
                payment_id: data.payment_id,
                payment_request_id: data.payment_request_id,
                processed_at: new Date(),
                channel_code: data.channel_code
            });
            const result = await updateTopUpStatus(payment.reference_id, 'PAID',data.payment_id,data.channel_code);
            await updateWalletFromTopUp(payment.user_id, result.credits_granted);
            await pool.query(`COMMIT;`);
            res.status(200).json({ message: "Payment processed successfully" });
        }catch(err){
            await pool.query(`ROLLBACK;`);
            console.error("Error processing webhook:", err);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    }
}



async function processTopUpPayment(req, res) {
    console.log("💳 Processing Top-Up Payment:", req.body);
    let accountName = {};
    if(!req.body.currency && !req.body.amount && !req.body.itemName && !req.body.credits){
        return res.status(400).json({ error: "Missing required fields: currency, amount, itemName, credits" });
    }
if (!req.session) {
    const response = await pool.query(
        `SELECT user_id, first_name, last_name, email
         FROM users
         WHERE user_id = $1`,
        [req.body.userId]
    );

    accountName = response.rows[0];
}

const userId = accountName.user_id || req.session.userId;

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

// 3. Build customer payload
const customerPayload = customerId
    ? {
        customer_id: customerId
    }
    : {
        customer: {
            reference_id: `CUST-${userId}`,
            type: "INDIVIDUAL",
            email: accountName.email || req.session.email,
            individual_detail: {
                given_names:
                    accountName.first_name ||
                    req.session.displayName.split(" ")[0],

                surname:
                    accountName.last_name ||
                    req.session.displayName.split(" ").slice(1).join(" ")
            }
        }
    };
    const payload = {
        reference_id: `TOPUP-${uuidv4()}`,
        session_type: "PAY",
        mode: "PAYMENT_LINK",

        amount: req.body.amount,
        currency: req.body.currency,
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
            item_name: `${req.body.itemName}`,
            credits: `${req.body.credits}`,
            user_id: `${accountName.user_id || req.session.userId}`
        },

        success_return_url:
            `https://app.com/credits?success`,

        cancel_return_url:
            `https://app.com/credits?cancel`,

    };
    const topUpPayload = {
        user_id: accountName.user_id || req.session.userId,
        amount: req.body.amount,
        currency: req.body.currency,
        credits: req.body.credits,
        description: req.body.itemName,
        pay_type: "checkout_pay"
    };
    const existingTopUp = await getPaymentCheckOutByPayload(topUpPayload);
        console.log("💳 Payment Session Created:", existingTopUp);

    let payment;

    if (existingTopUp.length > 0) {
        payment = existingTopUp[0];

        // Reuse if still valid locally
        if (
            payment.status === "PENDING" &&
            payment.redirect_url &&
            new Date(payment.expired_at) > new Date()
        ) {
            return res.json({
                paymentSessionId: payment.payment_session_id,
                paymentLink: payment.redirect_url
            });
        }

        
    }

    if (!payment || payment.status !== "PENDING") {
        payment = await createTopUpPaymentSession({
            user_id: userId,
            reference_id: payload.reference_id,
            amount: payload.amount,
            currency: payload.currency,
            status: "PENDING",
            credits: req.body.credits,
            description: req.body.itemName,
            payment_type: "TOPUP"
        });
    }
    try {

        const response = await axios.post(
            "https://api.xendit.co/sessions",
            {
                ...payload,
                reference_id: payment.reference_id,
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

        console.log("response.data:", response.data);
        const redirectUrl = response.data.payment_link_url ? response.data.payment_link_url : response.data.actions.find(a => a.type === "REDIRECT_CUSTOMER" && a.descriptor === "WEB_URL")?.value;
        const updatePaymentPayload={
            reference_id: payment.reference_id,
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

    } catch (err) {

        console.error(err.response?.data || err);

        return res.status(500).json({
            error: err.response?.data || err.message
        });

    }
}

async function processSubscriptionPayment(req, res) {


}


async function createPaymentToken(req, res) {
    const { userId } = req.session;
    const customerPayload = await getCustomerPayload(req);
    try{
        const response = await axios.post(
            "https://api.xendit.co/sessions",
            {
                reference_id: `SAVE-CARD-USER-${userId}-${uuidv4()}`,
                session_type: "SAVE",
                mode: "PAYMENT_LINK",
                amount: 0,
                currency: "PHP",
                country: "PH",
                ...customerPayload,
                success_return_url:
                    `https://app.com/credits?success`,

                cancel_return_url:
                    `https://app.com/credits?cancel`,
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
        res.status(500).json({
            error: err.response?.data || err.message
        });
    }
}

async function savePaymentMethod(data) {
    const payment = await getPaymentByReferenceId(data.reference_id.split("_")[0] || data.reference_id);
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
                                console.log("✅ Xendit Payment Token Response:", response.data);

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
                                display_name: response.data.channel_code,
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


async function getCustomerPayload(req){
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

const userId = accountName.user_id || req.session.userId;

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

// 3. Build customer payload
const customerPayload = customerId
    ? {
        customer_id: customerId
    }
    : {
        customer: {
            reference_id: `CUST-${userId}`,
            type: "INDIVIDUAL",
            email: accountName.email || req.session.email,
            individual_detail: {
                given_names:
                    accountName.first_name ||
                    req.session.displayName.split(" ")[0],

                surname:
                    accountName.last_name ||
                    req.session.displayName.split(" ").slice(1).join(" ")
            }
        }
    };
    return customerPayload;
        
}

async function getAllPaymentMethodsByUserIdService(req, res) {
    const user_id = req.session.userId;
    try{
        const paymentMethods = await getAllPaymentMethodsByUserId(user_id);
        res.status(200).json({ paymentMethods });
    }catch(err){
        console.error("Error fetching payment methods:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

async function paymentSessionCompleteWebhookHandler(req, res) {
    console.log("📬 Payment Session Complete Webhook Received:", req.body);
    const { event, data } = req.body;
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
                                console.log("✅ Xendit Payment Token Response:", response.data);
                
                const checkExistingPaymentMethod = await paymentMethodExists(
                    { user_id: parseInt(data.metadata.userId), payment_token_id: data.payment_token_id }
                );
                if(!checkExistingPaymentMethod){
                    if(response.data.channel_code === 'CARDS'){
                        const checkExistingCard = await paymentMethodExists(
                            { user_id: parseInt(data.metadata.userId), fingerprint: response.data.channel_properties.card_details.fingerprint }
                        )
                        if(!checkExistingCard){
                            await createPaymentMethodForUser({
                                user_id: parseInt(data.metadata.userId),
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
                        if(response.data.channel_code === 'PAYMAYA' || response.data.channel_code === 'SHOPEEPAY' || response.data.channel_code === 'UBP_DIRECT_DEBIT'){
                            const checkExistingCard = await paymentMethodExists(
                                { user_id: parseInt(data.metadata.userId), channel_code: response.data.channel_code, display_name: response.data.token_details.account_number ?? response.data.token_details.masked_bank_account_number }
                            )
                            if(checkExistingCard){
                                console.log("Payment method already exists for user:", data.metadata.userId, "with channel code:", response.data.channel_code);
                                return;
                            }
                        }
                        await createPaymentMethodForUser({
                                user_id: parseInt(data.metadata.userId),
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
                                customer_reference_id: response.data.reference_id,
                                fingerprint: null
                        })
                    }
                }
                console.log("Payment Session Complete Webhook Processed Successfully",response.data);

            }
}

async function paymentSessionExpiredWebhookHandler(req, res) {
    console.log("📬 Payment Session Expired Webhook Received:", req.body);
}


module.exports = {
    xenditWebhookHandler,
    processSubscriptionPayment,
    processTopUpPayment,
    savePaymentMethod,
    getAllPaymentMethodsByUserIdService,
    paymentSessionCompleteWebhookHandler,
    paymentSessionExpiredWebhookHandler,
};
