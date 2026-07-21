const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const { pool } = require('../lib/database');

const {
    getPaymentByUserIdAndStatus,
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
    getAllPaymentMethodsByUserId,
    updatePaymentMethodStatus
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
    }else if (data.status === 'FAILED' || data.status === 'EXPIRED'){
        await updatePaymentByReference(payment.reference_id, {
            status: data.status,
            payment_id: data.payment_id || data.latest_payment_id,
            payment_request_id: data.payment_request_id,
            processed_at: new Date(),
            channel_code: data.channel_code
        });
        await updateTopUpStatus(payment.reference_id, data.status, data.payment_id || data.latest_payment_id, data.channel_code);
        res.status(200).json({ message: "Payment status updated" });
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
            user_id: `${accountName.user_id || req.session.userId }`
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
        description: req.body.itemName
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

        const response = await axios.post(
            "https://api.xendit.co/sessions",
            {
                ...payload,
                reference_id: payment?.reference_id ?? payload.reference_id,
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
                    `https://app.com/credits?success`,

                cancel_return_url:
                    `https://app.com/credits?cancel`,
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
            error: err.response?.data || err.message
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
    console.log("📬 Payment Session Complete Webhook Received:", req.body);
    const { event, data } = req.body;
    const hasToken = data.payment_token_id ? true : false;
    const userId = data.metadata?.user_id|| null; // Ensure userId is an integer
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
                                console.log("✅ Xendit Payment Token Response:", response.data);
                
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
                console.log("Payment Session Complete Webhook Processed Successfully",response.data);

            }
}

async function paymentSessionExpiredWebhookHandler(req, res) {
    console.log("📬 Payment Session Expired Webhook Received:", req.body);
}

async function TopUpPaymentByPaymentMethod(req, res) {
    let { userId } = req.session;
    userId = userId, 10; // Ensure userId is an integer
    console.log("💳 Processing Top-Up Payment by Payment Method:", req.body);
    const {amount, currency, itemName, credits,itemType, paymentMethodId} = req.body;
    const reference_id = `TOPUP-${uuidv4()}`;
    const topUpPayload = {
        user_id: userId,
        amount: req.body.amount,
        currency: req.body.currency,
        credits: req.body.credits,
        description: req.body.itemName
    };
    const payload = {
        reference_id: reference_id,
        type: "PAY",
        currency: currency,
        request_amount: amount,
        metadata: {
            item_name: `${itemName}`,
            credits: `${credits}`,
        },
        capture_method: "AUTOMATIC",
        description: `Top-up ${credits} credits for ${itemName}`,
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

    try{
        const response = await axios.post(
            "https://api.xendit.co/v3/payment_requests",
            {
                ...payload,
                reference_id: payment?.reference_id ?? payload.reference_id,
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
        console.log("✅ Xendit Payment Request Response:", response.data);
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
            error: err.response?.data || err.message
        });
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
    createPaymentToken
};
