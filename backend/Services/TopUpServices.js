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
    paymentMethodExists
} = require("../Repositories/PaymentRepositories");
const redisClient = require('../lib/redis');

async function processTopUpPayment(req, res) {
    console.log("💰 Processing Top-Up Payment:", req.body);
    const { userId, email } = req.session;

    let payment;
    // Look for existing pending payment
    const existing = await getPaymentByUserIdAndStatus(userId,req.body.paymentType,req.body.channelCode,req.body.amount,req.body.currency,req.body.itemName);
    if (existing.length > 0) {

        payment = existing[0];

        // Already has a Xendit Payment Request
        if (
            payment.provider_payment_id &&
            payment.redirect_url && payment.status.includes(["PENDING", "REQUIRES_ACTION"]) &&
            payment.expired_at > new Date()
        ) {
            return res.json({
                reference_id: payment.reference_id,
                redirect_url: payment.redirect_url
            });
        }

    } else {

        // First payment attempt
        payment = await createTopUpPayment({
            user_id: userId,
            reference_id: `TOPUP-${uuidv4()}`,
            provider: "XENDIT",
            provider_payment_id: null,
            provider_payment_method_id: null,
            purpose: req.body.itemName,
            payment_type: req.body.paymentType,
            channel_code: req.body.channelCode,
            amount: req.body.amount,
            currency: req.body.currency,
            status: "PENDING",
            description: req.body.itemName,
            paid_at: null,
            credits_granted: req.body.credits,
        });

    }

    const payload = {
        reference_id: payment.reference_id,
        type: req.body.savePaymentMethod === true
            ? "PAY_AND_SAVE"
            : "PAY",

        country: "PH",
        currency: req.body.currency,
        request_amount: req.body.amount,
        capture_method: "AUTOMATIC",

        channel_code: req.body.channelCode,

        channel_properties: {
            success_return_url:
                "http://localhost:5173/credits?success",
            failure_return_url:
                "http://localhost:5173/credits?failed",
            cancel_return_url:
                "http://localhost:5173/credits?cancelled"
        },
        description: req.body.itemName
    };

    if (req.body.savePaymentMethod) {

        payload.customer = {
            reference_id: `CUST-${userId}`,
            type: "INDIVIDUAL",
            individual_detail: {
                given_names: req.body.customer.fullName.split(" ")[0],
                surname: req.body.customer.fullName
                    .split(" ")
                    .slice(1)
                    .join(" ")
            },
            mobile_number: +63 + req.body.customer.mobileNumber.replace(/^0/, ""),
            email
        };

    }
    console.dir(payload, { depth: null });
    try {

        const response = await axios.post(
            "https://api.xendit.co/v3/payment_requests",
            payload,
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

        console.log("✅ Xendit Payment Request Response:", response.data);

        const redirectAction = response.data.actions.find(
            a =>
                a.type === "REDIRECT_CUSTOMER" &&
                a.descriptor === "WEB_URL"
        );
        await updatePaymentWithReferenceId(
            payment.reference_id,
            response.data.payment_request_id,
            response.data.status,
            redirectAction?.value
        );

        return res.json({
            reference_id: payment.reference_id,
            redirect_url: redirectAction?.value
        });
        
    } catch (err) {

        console.error(err.response?.data || err);
        console.log("Request ID:", err.response?.headers["request-id"]);
        return res.status(500).json({
            error: err.response?.data || err.message
        });

    }
}

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
                                type: ['GCASH','PAYMAYA','SHOPEEPAY','GRABPAY'].includes(response.data.channel_code) ? 'E-WALLET' : response.data.channel_code,
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



async function processTopUpPaymentByCards(req, res) {
    console.log("💳 Processing Top-Up Payment:", req.body);
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
            "https://ensemble-snowy.vercel.app/credits?success",

        cancel_return_url:
            "https://ensemble-snowy.vercel.app/credits?cancel",

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




module.exports = {
    processTopUpPayment,
    xenditWebhookHandler,
    processTopUpPaymentByCards,
};
