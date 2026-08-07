const cron = require("node-cron");
const axios = require("axios");

const {
    getActivePaymentSessions,
    updatePaymentByReference,
    updateTopUpStatus,
    updateWalletFromTopUp,
    updatePaymentMethodStatus,
    updatePlatformWalletBalance,
    getPlatformWallet,
    createCreditTransaction 
} = require("../repositories/PaymentRepositories");

const {
    getCancelledSubscriptionRepositories
} = require("../repositories/SubscriptionRepositories");

const {
    endSubscription,
    savePaymentMethod
} = require("../services/PaymentServices");

const {
    createNotification
} = require("../repositories/NotificationRepositories");
const { CREDIT_TRANSACTION_TYPE } = require("./CreditTransactionEnums");

const {getIo} = require('../lib/WebSocket');

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
    const io = getIo();
    try {
        let paymentRequest = null;

        if (payment.payment_session_id) {
            const session = await getPaymentSession(payment.payment_session_id);

            switch (session.status) {
                case "ACTIVE":
                    return;

                case "EXPIRED":
                    if (payment.status !== "EXPIRED") {
                        await updatePaymentByReference(payment.reference_id, {
                            status: "EXPIRED",
                        });

                        await updateTopUpStatus(
                            payment.reference_id,
                            "EXPIRED",
                            payment.payment_id ?? null,
                            payment.channel_code ?? null
                        );
                        const notification = await createNotification({
                            message: `Your payment for ${payment.reference_id} has expired. Please try again.`,
                            is_read: false,
                            reference_table: "payments",
                            reference_prefix: "PAYMENT",
                            reference_path: `${payment.redirect_url || `${process.env.FRONTEND_URL}/transactions`}`,
                            reference_id: payment.payment_id,
                            user_id: payment.user_id
                        });
                        io.to(notification.account_id).emit("notification", notification);
                    }
                    return;

                case "COMPLETED":
                    if (session.payment_id) {
                        paymentRequest = await getPayment(session.payment_id);
                    }
                    break;
            }
        } else if (payment.payment_request_id) {
            paymentRequest = await getPaymentRequest(payment.payment_request_id);
        } else {
            paymentRequest = await getPaymentRequestByReference(
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

                if (paymentRequest.failure_code === "PAYMENT_METHOD_EXPIRED") {
                    await updatePaymentMethodStatus(
                        paymentRequest.payment_method_id,
                        "INACTIVE"
                    );
                }
                const notification = await createNotification({
                    message: `Your payment for ${payment.reference_id} has failed. Please try again.`,
                    is_read: false,
                    reference_table: "payments",
                    reference_prefix: "PAYMENT",
                    reference_path: `${payment.redirect_url || payment.payment_link_url || `${process.env.FRONTEND_URL}/transactions`}`,
                    reference_id: payment.payment_id,
                    user_id: payment.user_id
                });
                io.to(notification.account_id).emit("notification", notification);
                break;

            case "EXPIRED":
                status = "EXPIRED";
                const notificationExpired = await createNotification({
                    message: `Your payment for ${payment.reference_id} has expired. Please try again.`,
                    is_read: false,
                    reference_table: "payments",
                    reference_prefix: "PAYMENT",
                    reference_path: `${payment.redirect_url || payment.payment_link_url || `${process.env.FRONTEND_URL}/transactions`}`,
                    reference_id: payment.payment_id,
                    user_id: payment.user_id
                });
                io.to(notificationExpired.account_id).emit("notification", notificationExpired);
                break;

            default:
                return;
        }

        if (status !== payment.status) {
            await updatePaymentByReference(payment.reference_id, {
                status,
                channel_code:
                    paymentRequest.channel_code ?? payment.channel_code,
                payment_request_id:
                    paymentRequest.payment_request_id ??
                    payment.payment_request_id,
                payment_id:
                    paymentRequest.payment_id ?? payment.payment_id,
                processed_at: new Date()
            });

            const payload = {
                payment_id:
                    paymentRequest.payment_id ??
                    paymentRequest.latest_payment_id ??
                    payment.payment_id ??
                    null,
                channel_code:
                    paymentRequest.channel_code ?? payment.channel_code
            };

            const result = await updateTopUpStatus(
                payment.reference_id,
                status,
                payload.payment_id,
                payload.channel_code
            );

            if (
                payment.payment_type === "TOPUP" &&
                status === "PAID"
            ) {
                const userWallet = await updateWalletFromTopUp(
                    payment.user_id,
                    result.credits_granted
                );
                await savePaymentMethod(paymentRequest);
                const getPlatformWalletDetails = await getPlatformWallet();

                const userTransaction = await createCreditTransaction({
                    type: CREDIT_TRANSACTION_TYPE.FUND_TRANSFER,
                    amount_credits: result.credits_granted,
                    status: "completed",
                    source_wallet_id: getPlatformWalletDetails.wallet_id,
                    destination_wallet_id: userWallet.wallet_id,
                    fee_transaction_id: null,
                    reference_table: "payments",
                    reference_id: payment.reference_id
                });
                await updatePlatformWalletBalance(result.credits_granted, 'add');
                const notification = await createNotification({
                    message: `Your wallet has been credited with ${result.credits_granted} credits.`,
                    is_read: false,
                    reference_table: "credit_transactions",
                    reference_prefix: "TOPUP",
                    reference_path: `${payment.redirect_url || payment.payment_link_url || `${process.env.FRONTEND_URL}/transactions`}`,
                    reference_id: userTransaction.credit_transaction_id,
                    user_id: payment.user_id
                });
                const io = getIo();
                io.to(notification.account_id).emit("notification", notification);
            }
        }
    } catch (err) {
        console.error("Reconciliation error details:",err);
    }
}

async function reconcilePendingPayments() {
    const payments = await getActivePaymentSessions();

    if (!payments.length) {
        console.log("No pending payments.");
        return;
    }

    console.log(`Reconciling ${payments.length} payments...`);

    await Promise.all(payments.map(reconcilePayment));
}

async function cancelledSubscriptionReconciliation(subscription) {
    try {
        console.log(`Ending subscription ${subscription.subscription_id}... ${subscription}`);
        await endSubscription(subscription.subscription_id);
    } catch (err) {
        console.error(
            `Failed to end subscription ${subscription.subscription_id}`,
            err
        );
    }
}

async function reconcileCancelledSubscriptions() {
    try {
        const cancelledSubscriptions =
            await getCancelledSubscriptionRepositories();

        if (!cancelledSubscriptions.length) {
            console.log("No cancelled subscriptions to reconcile.");
            return;
        }

        console.log(
            `Reconciling ${cancelledSubscriptions.length} cancelled subscriptions...`
        );

        await Promise.all(
            cancelledSubscriptions.map(cancelledSubscriptionReconciliation)
        );
    } catch (err) {
        console.error(
            "Failed to reconcile cancelled subscriptions:",
            err
        );
    }
}

async function updateForResubmission(sessionId){
    
}

/**
 * Separate locks
 */
let isPaymentJobRunning = false;
let isSubscriptionJobRunning = false;

function startPaymentReconciliationJob() {

    // Payment reconciliation every 30 seconds
    cron.schedule("*/30 * * * * *", async () => {

        if (isPaymentJobRunning) {
            console.log("Skipping payment reconciliation. Previous job still running.");
            return;
        }

        isPaymentJobRunning = true;

        try {
            console.log("Running payment reconciliation...");
            await reconcilePendingPayments();
        } catch (err) {
            console.error(err);
        } finally {
            isPaymentJobRunning = false;
        }

    });

    // Cancel subscriptions every 5 minutes
    cron.schedule("*/5 * * * *", async () => {

        if (isSubscriptionJobRunning) {
            console.log("Skipping cancelled subscription reconciliation. Previous job still running.");
            return;
        }

        isSubscriptionJobRunning = true;

        try {
            console.log("Running cancelled subscription reconciliation...");
            await reconcileCancelledSubscriptions();
        } catch (err) {
            console.error(err);
        } finally {
            isSubscriptionJobRunning = false;
        }

    });

}

module.exports = {
    startPaymentReconciliationJob
};