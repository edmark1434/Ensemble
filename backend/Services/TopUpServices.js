const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const { pool } = require('../lib/database');

const {
    getPaymentByUserIdAndStatus,
    createTopUpPayment,
    updatePaymentWithReferenceId,
    getPaymentByReferenceId,
    updatePaymentStatusAndPaymentId,
    updateTopUpStatus,
    updateWalletFromTopUp
} = require("../Repositories/TopUpPaymentRepositories");

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
    const client = await pool.connect();
    try {
        const existingPayment = await getPaymentByReferenceId(req.body.data.reference_id);
        if (!existingPayment) {
            console.error("Payment not found for reference_id:", req.body.data.reference_id);
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "Payment not found" });
        }
        await client.query('BEGIN');
        if(req.body.data.status === 'SUCCEEDED'){
            if(existingPayment.status === 'PAID'){
                await client.query('ROLLBACK');
                return res.status(200).json({ message: "Payment already processed" });
            }            
            await updatePaymentStatusAndPaymentId(
                    existingPayment.reference_id,
                    'PAID',
                    req.body.data.payment_id
                );
            const updateTopUp = await updateTopUpStatus(existingPayment.reference_id, 'PAID', req.body.data.payment_id);
            await updateWalletFromTopUp(existingPayment.user_id, updateTopUp.credits_granted)            
            await client.query('COMMIT');
            return res.status(200).json({ message: "Payment processed successfully" });
        }
        if(req.body.data.status === 'FAILED'){
            await Promise.all([
                updatePaymentStatusAndPaymentId(
                    existingPayment.reference_id,
                    'FAILED',
                    req.body.data.payment_id
                ),
                updateTopUpStatus(existingPayment.reference_id, 'FAILED',req.body.data.payment_id)
            ]);
            await client.query('COMMIT');
            return res.status(200).json({ message: "Payment already failed" });
        }
    }catch (err) {
        await client.query('ROLLBACK');
        console.error("Error starting transaction:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

async function processTopUpPaymentByCards(req, res) {
    console.log("💳 Processing Top-Up Payment:", req.body);

    const payload = {
        reference_id: `TOPUP-${uuidv4()}`,
        session_type: "PAY",
        mode: "PAYMENT_LINK",

        amount: req.body.amount,
        currency: req.body.currency,
        country: "PH",

        capture_method: "AUTOMATIC",

        // Always save the card
        allow_save_payment_method: "FORCED",

        customer: {
            reference_id: `CUST-${req.session.userId}1212123`,
            type: "INDIVIDUAL",
            email: req.session.email,
            individual_detail: {
                given_names: req.body.customer.givenName,
                surname: req.body.customer.surname
            }
        },

        channel_properties: {
            cards: {
                card_on_file_type: "CUSTOMER_UNSCHEDULED"
            }
        },
        metadata: {
    item_name: `${req.body.itemName}`,
    credits: `${req.body.credits}`,
    user_id: `${req.session.userId}`
},

        success_return_url:
            "https://heavy-rules-hope.loca.lt/credits?success",

        cancel_return_url:
            "https://heavy-rules-hope.loca.lt/credits?cancel",

    };

    try {

        const response = await axios.post(
            "https://api.xendit.co/sessions",
            payload,
            {
                auth: {
                    username: process.env.XENDIT_API_KEY,
                    password: ""
                },
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        console.log(response.data);

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
    processTopUpPaymentByCards
};
