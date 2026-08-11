const axios = require('axios');
const crypto = require('crypto');
const { randomUUID } = require('crypto');
const {
    getWalletsByUserId,
    getCashoutsByUserId,
    getCashoutsForReconciliation,
    findCashoutByIdempotencyKey,
    reserveCashout,
    applyCashoutStatus,
    markCashoutNotificationStatus,
} = require('../repositories/CashoutRepositories');
const { createCashoutNotificationOnce } = require('../repositories/NotificationRepositories');
const { getIo } = require('../lib/WebSocket');

const CHANNELS = {
    PH_GCASH: { label: 'GCash', routingType: 'WALLET' },
    PH_PAYMAYA: { label: 'Maya', routingType: 'WALLET' },
    PH_BPI: { label: 'BPI', routingType: 'WALLET' },
    PH_BDO: { label: 'BDO', routingType: 'WALLET' },
    PH_UBP: { label: 'UnionBank', routingType: 'WALLET' },
};

class CashoutError extends Error {
    constructor(message, statusCode = 400, code = 'CASHOUT_ERROR', details = null) {
        super(message);
        this.name = 'CashoutError';
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
    }
}

function positiveInteger(value, field) {
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
        throw new CashoutError(`${field} must be a positive whole number.`, 422, `INVALID_${field.toUpperCase()}`);
    }
    return parsed;
}

function payloadValidation(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new CashoutError('Cashout payload is required.', 400, 'INVALID_PAYLOAD');
    }
    const channelCode = String(data.channel_code || '').trim().toUpperCase();
    if (!CHANNELS[channelCode]) throw new CashoutError('Unsupported cashout method.', 422, 'INVALID_CHANNEL_CODE');
    const accountNo = String(data.account_no || '').replace(/[\s-]/g, '');
    if (!/^\+?\d{6,20}$/.test(accountNo)) throw new CashoutError('Enter a valid account or mobile number.', 422, 'INVALID_ACCOUNT_NUMBER');
    const accountName = String(data.account_name || '').trim().replace(/\s+/g, ' ');
    if (accountName.length < 2 || accountName.length > 100) throw new CashoutError('Enter the account holder name.', 422, 'INVALID_ACCOUNT_NAME');
    const amountCredits = positiveInteger(data.amount_credits, 'amount_credits');
    const personalMobileNumber = String(data.personal_mobile_number || '').replace(/[\s-]/g, '');
    if (!/^(?:\+63|0)9\d{9}$/.test(personalMobileNumber)) throw new CashoutError('Enter a valid Philippine mobile number.', 422, 'INVALID_MOBILE_NUMBER');
    const receiptEmail = String(data.receipt_email || '').trim().toLowerCase();
    if (receiptEmail && (receiptEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(receiptEmail))) {
        throw new CashoutError('Enter a valid receipt email address.', 422, 'INVALID_RECEIPT_EMAIL');
    }
    const addressFields = {
        streetLine1: String(data.street_line_1 || '').trim(),
        city: String(data.city || '').trim(),
        provinceState: String(data.province_state || '').trim(),
        postalCode: String(data.postal_code || '').trim(),
    };
    if (!addressFields.streetLine1 || !addressFields.city || !addressFields.provinceState || !/^\d{4}$/.test(addressFields.postalCode)) {
        throw new CashoutError('Enter a complete Philippine address with a valid 4-digit postal code.', 422, 'INVALID_RECIPIENT_ADDRESS');
    }
    const idempotencyKey = String(data.idempotency_key || '').trim();
    if (idempotencyKey && !/^[A-Za-z0-9_-]{8,100}$/.test(idempotencyKey)) {
        throw new CashoutError('Invalid idempotency key.', 422, 'INVALID_IDEMPOTENCY_KEY');
    }
    return { channelCode, accountNo, accountName, amountCredits, personalMobileNumber, receiptEmail: receiptEmail || null, ...addressFields, idempotencyKey: idempotencyKey || randomUUID() };
}

function splitName(fullName) {
    const parts = fullName.split(' ');
    return { givenName: parts.shift(), surname: parts.join(' ') || '-' };
}

function mapXenditStatus(status) {
    const normalized = String(status || '').toUpperCase();
    if (normalized === 'SUCCEEDED') return 'SUCCEEDED';
    if (['FAILED', 'REVERSED', 'REJECTED', 'CANCELLED', 'EXPIRED'].includes(normalized)) return normalized;
    if (normalized.includes('COMPLIANCE')) return 'PENDING_COMPLIANCE';
    return 'PROCESSING';
}

function getCashoutConfig() {
    return {
        php_cents_per_credit: positiveInteger(process.env.CASHOUT_PHP_CENTS_PER_CREDIT || 100, 'conversion_rate'),
        fee_php_cents: Math.max(0, Number.parseInt(process.env.CASHOUT_FEE_PHP_CENTS || '0', 10) || 0),
        minimum_credits: Math.max(1, Number.parseInt(process.env.CASHOUT_MIN_CREDITS || '1', 10) || 1),
    };
}

async function searchPhilippineAddressesServices(query) {
    const text = String(query || '').trim();
    if (text.length < 3) return [];
    if (text.length > 160) throw new CashoutError('Address search is too long.', 422, 'INVALID_ADDRESS_SEARCH');
    if (!process.env.GEOAPIFY_API_KEY) throw new CashoutError('Address search is not configured.', 503, 'ADDRESS_SEARCH_NOT_CONFIGURED');

    try {
        const { data } = await axios.get('https://api.geoapify.com/v1/geocode/autocomplete', {
            params: {
                text,
                filter: 'countrycode:ph',
                format: 'json',
                limit: 6,
                lang: 'en',
                apiKey: process.env.GEOAPIFY_API_KEY,
            },
            timeout: 10000,
        });

        return (data?.results || []).map((result) => ({
            id: result.place_id,
            label: result.formatted,
            street_line_1: result.address_line1 || [result.housenumber, result.street].filter(Boolean).join(' ') || result.formatted,
            city: result.city || result.municipality || result.county || '',
            province_state: result.state || result.region || '',
            postal_code: result.postcode || '',
        })).filter((result) => result.id && result.label && result.city && result.province_state && /^\d{4}$/.test(result.postal_code));
    } catch (error) {
        if (error instanceof CashoutError) throw error;
        throw new CashoutError('Address suggestions are temporarily unavailable.', 502, 'ADDRESS_SEARCH_FAILED');
    }
}

function buildPayoutPayload(cashout) {
    const { givenName, surname } = splitName(cashout.account_name);
    const channel = CHANNELS[cashout.xendit_channel_code];
    return {
        reference_id: cashout.reference_id,
        recipient: {
            type: 'INDIVIDUAL', given_name: givenName, surname, relationship: 'CUSTOMER',
            details: { personal_mobile_number: cashout.personal_mobile_number },
            address: {
                country: 'PH', street_line_1: cashout.street_line_1, city: cashout.city,
                province_state: cashout.province_state, postal_code: cashout.postal_code,
            },
            account_details: {
                currency: 'PHP', account_country: 'PH', account_holder_name: cashout.account_name,
                account_number: cashout.account_no, routing_type_1: channel.routingType,
                routing_value_1: cashout.xendit_channel_code,
            },
        },
        payout_details: { source_currency: 'PHP', source_amount: Number(cashout.net_amount_php_cents), destination_currency: 'PHP' },
        source_of_fund: 'BUSINESS_REVENUE', purpose_code: 'SALARY',
        description: 'Ensemble creator cashout',
        metadata: { cashout_id: cashout.cashout_id, user_id: cashout.user_id },
        ...(cashout.receipt_email ? { receipt_notification: { email_to: [cashout.receipt_email] } } : {}),
    };
}

const xenditConfig = (idempotencyKey) => ({
    auth: { username: process.env.XENDIT_API_KEY, password: '' },
    headers: {
        'Content-Type': 'application/json',
        'api-version': '2025-09-01',
        ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
    },
    timeout: 20000,
});

async function emitCashoutUpdate(cashout) {
    if (!cashout) return;
    const notificationMessages = {
        SUCCEEDED: `Your cashout of ${Number(cashout.amount_credits).toLocaleString()} credits was sent successfully.`,
        FAILED: `Your cashout failed. ${Number(cashout.amount_credits).toLocaleString()} credits were returned to your wallet.`,
        REJECTED: `Your cashout was rejected. ${Number(cashout.amount_credits).toLocaleString()} credits were returned to your wallet.`,
        REVERSED: `Your cashout was reversed. ${Number(cashout.amount_credits).toLocaleString()} credits were returned to your wallet.`,
        CANCELLED: `Your cashout was cancelled. ${Number(cashout.amount_credits).toLocaleString()} credits were returned to your wallet.`,
        EXPIRED: `Your cashout expired. ${Number(cashout.amount_credits).toLocaleString()} credits were returned to your wallet.`,
        PENDING_COMPLIANCE: 'Your cashout is undergoing additional compliance review.',
    };
    const message = notificationMessages[cashout.status];
    let notification = null;
    if (message && cashout.notification_status !== cashout.status) {
        notification = await createCashoutNotificationOnce({
            message,
            is_read: false,
            reference_table: 'cashouts',
            reference_prefix: `CASHOUT_${cashout.status}`,
            reference_path: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings`,
            reference_id: cashout.cashout_id,
            user_id: cashout.user_id,
        });
    }
    await markCashoutNotificationStatus(cashout.cashout_id, cashout.status);
    const io = getIo();
    if (notification) io.to(String(notification.account_id)).emit('notification', notification);
    if (notification || cashout.status_changed) {
        const accountId = notification?.account_id || (await getWalletsByUserId(cashout.user_id))[0]?.account_id;
        // Cashout rows use user_id; notification resolution provides the canonical account room.
        if (accountId) io.to(String(accountId)).emit('cashoutUpdated', cashout);
    }
}

async function settleCashout(update) {
    const cashout = await applyCashoutStatus(update);
    if (cashout) await emitCashoutUpdate(cashout);
    return cashout;
}

async function getWalletOverviewServices(userId, query = {}) {
    const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(5, Number.parseInt(query.page_size, 10) || 10));
    const search = String(query.search || '').trim().slice(0, 100);
    const sort = query.sort === 'asc' ? 'asc' : 'desc';
    const allowedStatuses = new Set(['PENDING', 'PROCESSING', 'PENDING_COMPLIANCE', 'SUCCEEDED', 'FAILED', 'REJECTED', 'REVERSED', 'CANCELLED', 'EXPIRED']);
    const requestedStatus = String(query.status || '').trim().toUpperCase();
    const status = allowedStatuses.has(requestedStatus) ? requestedStatus : '';
    const [wallets, cashoutResult] = await Promise.all([
        getWalletsByUserId(userId),
        getCashoutsByUserId(userId, { page, pageSize, search, sort, status }),
    ]);
    return {
        wallets,
        cashouts: cashoutResult.rows,
        cashout_pagination: { total: cashoutResult.total, page: cashoutResult.page, page_size: cashoutResult.page_size, total_pages: cashoutResult.total_pages },
        channels: Object.entries(CHANNELS).map(([code, item]) => ({ code, label: item.label })),
        cashout_config: getCashoutConfig(),
    };
}

async function createCashoutRecordsServices(data) {
    if (!process.env.XENDIT_API_KEY) throw new CashoutError('Cashout provider is not configured.', 503, 'XENDIT_NOT_CONFIGURED');
    const validated = payloadValidation(data);
    const existing = await findCashoutByIdempotencyKey(data.user_id, validated.idempotencyKey);
    if (existing) {
        const sameRequest = existing.xendit_channel_code === validated.channelCode
            && existing.account_no === validated.accountNo
            && existing.account_name === validated.accountName
            && existing.personal_mobile_number === validated.personalMobileNumber
            && existing.street_line_1 === validated.streetLine1
            && existing.city === validated.city
            && existing.province_state === validated.provinceState
            && existing.postal_code === validated.postalCode
            && (existing.receipt_email || null) === validated.receiptEmail
            && Number(existing.amount_credits) === validated.amountCredits;
        if (!sameRequest) throw new CashoutError('This idempotency key was already used for a different cashout.', 409, 'IDEMPOTENCY_CONFLICT');
        return { success: true, message: 'Cashout request already received.', data: existing, duplicate: true };
    }

    const config = getCashoutConfig();
    const centsPerCredit = config.php_cents_per_credit;
    const feeCents = config.fee_php_cents;
    const grossCents = validated.amountCredits * centsPerCredit;
    const netCents = grossCents - feeCents;
    if (netCents <= 0) throw new CashoutError('Cashout amount must be greater than the payout fee.', 422, 'AMOUNT_BELOW_FEE');
    const minimum = config.minimum_credits;
    if (validated.amountCredits < minimum) throw new CashoutError(`Minimum cashout is ${minimum} credits.`, 422, 'BELOW_MINIMUM_CASHOUT');

    const referenceId = randomUUID();
    let reserved;
    try {
        reserved = await reserveCashout({
            user_id: data.user_id,
            reference_id: referenceId,
            idempotency_key: validated.idempotencyKey,
            channel_code: validated.channelCode,
            account_no: validated.accountNo,
            account_name: validated.accountName,
            personal_mobile_number: validated.personalMobileNumber,
            street_line_1: validated.streetLine1,
            city: validated.city,
            province_state: validated.provinceState,
            postal_code: validated.postalCode,
            receipt_email: validated.receiptEmail,
            amount_credits: validated.amountCredits,
            fee_php_cents: feeCents,
            net_amount_php_cents: netCents,
        });
    } catch (error) {
        const statusByCode = { USER_WALLET_NOT_FOUND: 404, USER_WALLET_NOT_ACTIVE: 403, INSUFFICIENT_WALLET_BALANCE: 409 };
        if (statusByCode[error.code]) throw new CashoutError(error.message, statusByCode[error.code], error.code);
        if (error.code === '23505') {
            const duplicate = await findCashoutByIdempotencyKey(data.user_id, validated.idempotencyKey);
            return { success: true, message: 'Cashout request already received.', data: duplicate, duplicate: true };
        }
        throw error;
    }
    if (reserved.duplicate) return { success: true, message: 'Cashout request already received.', data: reserved.cashout, duplicate: true };

    const payoutPayload = buildPayoutPayload(reserved.cashout);

    try {
        const response = await axios.post('https://api.xendit.co/v3/payouts', payoutPayload, xenditConfig(validated.idempotencyKey));
        const payoutId = response.data.payout_id || response.data.id;
        const providerStatus = mapXenditStatus(response.data.status);
        const cashout = await settleCashout({
            referenceId,
            payoutId,
            status: providerStatus,
            failureCode: response.data.failure_code || null,
            refund: ['FAILED', 'REVERSED', 'REJECTED', 'CANCELLED', 'EXPIRED'].includes(providerStatus),
        });
        return { success: true, message: 'Cashout submitted successfully.', data: cashout };
    } catch (error) {
        const provider = error.response?.data;
        // A timeout/5xx is ambiguous: Xendit may have accepted the payout. Keep the
        // reservation processing so the webhook can settle it without double-paying.
        const definitiveRejection = Boolean(error.response && error.response.status >= 400 && error.response.status < 500 && error.response.status !== 429);
        await settleCashout({
            referenceId,
            status: definitiveRejection ? 'FAILED' : 'PROCESSING',
            failureCode: provider?.error_code || (definitiveRejection ? 'PAYOUT_REQUEST_FAILED' : 'PAYOUT_STATUS_UNKNOWN'),
            refund: definitiveRejection,
        });
        throw new CashoutError(
            provider?.message || 'Xendit could not create the payout.',
            error.response?.status || 502,
            provider?.error_code || 'PAYOUT_REQUEST_FAILED',
            provider?.errors || null
        );
    }
}

function verifyWebhookToken(received) {
    const expected = process.env.XENDIT_WEBHOOK_TOKEN;
    if (!expected || !received) return false;
    const a = Buffer.from(String(received));
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function handleCashoutWebhookServices(headers, payload) {
    if (!verifyWebhookToken(headers['x-callback-token'])) throw new CashoutError('Invalid webhook token.', 401, 'INVALID_WEBHOOK_TOKEN');
    const data = payload?.data;
    if (!payload?.event?.startsWith('v3_payout.') || !data?.reference_id) throw new CashoutError('Invalid payout webhook payload.', 400, 'INVALID_WEBHOOK_PAYLOAD');
    const status = mapXenditStatus(data.status || payload.event.replace('v3_payout.', ''));
    const refund = ['FAILED', 'REVERSED', 'REJECTED', 'CANCELLED', 'EXPIRED'].includes(status);
    return settleCashout({ referenceId: data.reference_id, payoutId: data.payout_id, status, failureCode: data.failure_code || null, refund });
}

async function reconcileCashoutsServices() {
    if (!process.env.XENDIT_API_KEY) return;
    const cashouts = await getCashoutsForReconciliation();
    for (const cashout of cashouts) {
        try {
            let providerData;
            if (cashout.xendit_disbursement_id) {
                const response = await axios.get(
                    `https://api.xendit.co/v3/payouts/${encodeURIComponent(cashout.xendit_disbursement_id)}`,
                    xenditConfig()
                );
                providerData = response.data;
            } else if (['PENDING', 'PROCESSING'].includes(cashout.status)) {
                // Safe recovery for a create request whose response was lost.
                const response = await axios.post(
                    'https://api.xendit.co/v3/payouts',
                    buildPayoutPayload(cashout),
                    xenditConfig(cashout.idempotency_key)
                );
                providerData = response.data;
            }

            if (!providerData) {
                await emitCashoutUpdate(cashout);
                continue;
            }
            const status = mapXenditStatus(providerData.status);
            const refund = ['FAILED', 'REVERSED', 'REJECTED', 'CANCELLED', 'EXPIRED'].includes(status);
            await settleCashout({
                referenceId: cashout.reference_id,
                payoutId: providerData.payout_id || providerData.id || cashout.xendit_disbursement_id,
                status,
                failureCode: providerData.failure_code || null,
                refund,
            });
        } catch (error) {
            console.error(`Cashout reconciliation failed for ${cashout.cashout_id}:`, error.response?.data || error.message);
        }
    }
}

module.exports = { CashoutError, payloadValidation, getWalletOverviewServices, searchPhilippineAddressesServices, createCashoutRecordsServices, handleCashoutWebhookServices, reconcileCashoutsServices };
