const {
    getCreditTransactionsByAccountId,
} = require('../Repositories/TransactionRepositories');

function getDirection(row) {
    if (row.source_owned && row.destination_owned) return 'internal';
    return row.destination_owned ? 'incoming' : 'outgoing';
}

const TYPE_LABELS = {
    fund_transfer: 'Fund Transfer',
    credit_purchase: 'Fund Transfer',
    escrow_hold: 'Escrow Hold',
    escrow_release: 'Escrow Release',
    escrow_refund: 'Escrow Refund',
    asset_purchase: 'Asset Purchase',
    asset_refund: 'Asset Refund',
    fee: 'Fee',
};

function normalizeType(type) {
    const key = String(type || '')
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_');
    return TYPE_LABELS[key] || String(type || 'Unknown');
}

function mapTransaction(row) {
    const type = normalizeType(row.type);
    const sourceIsPlatform = String(row.source_wallet_type).toLowerCase() === 'platform wallets';
    const destinationIsPlatform = String(row.destination_wallet_type).toLowerCase() === 'platform wallets';
    return {
        id: row.credit_transaction_id,
        type,
        isCreditPurchase: type === 'Fund Transfer'
            && sourceIsPlatform
            && row.destination_owned,
        amountCredits: Math.abs(Number(row.amount_credits)),
        status: row.status,
        createdAt: row.created_at,
        direction: getDirection(row),
        sourceWalletId: sourceIsPlatform ? 'Platform' : row.source_wallet_id,
        destinationWalletId: destinationIsPlatform ? 'Platform' : row.destination_wallet_id,
        feeTransactionId: row.fee_transaction_id,
        referenceTable: row.reference_table,
        referenceId: row.reference_id,
    };
}

async function getCreditTransactionsService(accountId) {
    if (!accountId) {
        const error = new Error('Authenticated account is required');
        error.statusCode = 401;
        throw error;
    }

    const rows = await getCreditTransactionsByAccountId(accountId);
    return rows.map(mapTransaction);
}

module.exports = { getCreditTransactionsService };
