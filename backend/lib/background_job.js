const cron = require("node-cron");
const axios = require("axios");

const {
    getActivePaymentSessions,
    updatePaymentByReference,
    updateTopUpStatus,
    updateWalletFromTopUp
} = require("../Repositories/PaymentRepositories");
const { savePaymentMethod } = require("../Services/TopUpServices");
const config = {
    auth: {
        username: process.env.XENDIT_API_KEY,
        password: ""
    },
    headers: {
        "api-version": "2024-11-11"
    }
};

async function getPayment(paymentId) {
    const { data } = await axios.get(
        `https://api.xendit.co/v3/payments/${paymentId}`,
        config
    );

    return data;
}

async function getPaymentSession(sessionId) {
    const { data } = await axios.get(
        `https://api.xendit.co/sessions/${sessionId}`,
        config
    );

    return data;
}

async function getPaymentRequest(paymentRequestId) {
    const { data } = await axios.get(
        `https://api.xendit.co/v3/payment_requests/${paymentRequestId}`,
        config
    );

    return data;
}

async function getPaymentRequestByReference(referenceId) {
    const { data } = await axios.get(
        "https://api.xendit.co/payment_requests",
        {
            ...config,
            params: {
                reference_id: referenceId
            }
        }
    );

    return data.data?.[0] ?? null;
}

async function reconcilePayment(payment) {
    try {

        let paymentRequest = null;

        /**
         * -------------------------
         * CHECKOUT SESSION
         * -------------------------
         */

        if (payment.payment_session_id) {

            const session = await getPaymentSession(payment.payment_session_id);

            switch (session.status) {

                case "ACTIVE":
                    return;

                case "EXPIRED":
                                console.log(
                `Updating payment status for ${payment.reference_id} from ${payment.status} to ${session.status}`
            );
                    if (payment.status !== "EXPIRED") {

                        await updatePaymentByReference(payment.reference_id,
                            {
                            status: "EXPIRED",
                            UPDATED_AT: new Date()
                        });
                        await updateTopUpStatus(payment.reference_id, 'EXPIRED',payment.payment_id ?? null,payment.channel_code ?? null);
                    }

                    return;

                case "COMPLETED":
                    if (session.payment_id){
                        paymentRequest = await getPayment(session.payment_id);
                    }
                    

                    break;
            }

        }

        /**
         * -------------------------
         * PAYMENT TOKEN / DIRECT PAY
         * -------------------------
         */

        else if (payment.payment_request_id) {

            paymentRequest = await getPaymentRequest(
                payment.payment_request_id
            );

        }

        else {

            paymentRequest =
                await getPaymentRequestByReference(
                    payment.reference_id
                );

        }

        if (!paymentRequest) return;

        let status = payment.status;

        switch (paymentRequest.status) {

            case "SUCCEEDED":
                status = "PAID";
                break;

            case "FAILED":
                status = "FAILED";
                break;

            case "EXPIRED":
                status = "EXPIRED";
                break;

            default:
                return;
        }

        if (status !== payment.status) {
            console.log(
                `Updating payment status for ${payment.reference_id} from ${payment.status} to ${status}`
            );
            console.log("Payment request data:", paymentRequest);

            await updatePaymentByReference(

                payment.reference_id,
                {    
                status, 
                channel_code: paymentRequest.channel_code ?? payment.channel_code,
                payment_request_id:
                    paymentRequest.payment_request_id ?? payment.payment_request_id,

                payment_id:
                    paymentRequest.payment_id ?? payment.payment_id,
                processed_at: new Date()
            });
            if(payment.payment_type === "TOPUP"){
                const payload = {
                    payment_id: paymentRequest.payment_id ?? null,
                    channel_code: paymentRequest.channel_code ?? payment.channel_code,
                }
                const result = await updateTopUpStatus(payment.reference_id, status,payload.payment_id, payload.channel_code);
                await updateWalletFromTopUp(payment.user_id, result.credits_granted);
                await savePaymentMethod(paymentRequest);
            }
        }

    } catch (err) {

        console.error(
            `Failed to reconcile ${payment.reference_id}`,
            err.response?.data || err.message
        );

    }
}

async function reconcilePendingPayments() {

    const payments = await getActivePaymentSessions();

    if (!payments.length) {

        console.log("No pending payments.");

        return;
    }

    console.log(`Reconciling ${payments.length} payments...`);

    await Promise.all(
        payments.map(reconcilePayment)
    );
}

let isRunning = false;

function startPaymentReconciliationJob() {

    cron.schedule("*/30 * * * * *", async () => {

        if (isRunning) {
            console.log("Skipping reconciliation. Previous job still running.");
            return;
        }

        isRunning = true;

        try {
            console.log("Running payment reconciliation...");
            await reconcilePendingPayments();
        } finally {
            isRunning = false;
        }

    });

}

module.exports = {
    startPaymentReconciliationJob
};