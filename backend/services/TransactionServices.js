const {
    getCreditTransactionsByAccountId,
    getPendingDisputePayoutsByAccountId,
    getAccountWalletSummaryByAccountId,
} = require('../repositories/TransactionRepositories');
const { formatPayoutDate } = require('../lib/DisputeResolutions');

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
    job_posting_fee: 'Fee',
    proposal_fee: 'Fee',
    service_posting_fee: 'Fee',
    job_posting_fee_refund: 'Escrow Refund',
    proposal_fee_refund: 'Escrow Refund',
    cashout: 'Cashout',
    cashout_refund: 'Cashout Refund',
};

function normalizeType(type) {
    const key = String(type || '')
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_');
    return TYPE_LABELS[key] || String(type || 'Unknown');
}

function formatWalletTypeLabel(walletType, isOwned) {
    const lower = String(walletType || '').trim().toLowerCase();
    if (lower === 'platform wallets') return 'Platform Wallet';
    if (lower === 'escrow wallets') return isOwned ? 'Your Escrow Wallet' : 'Escrow Wallet';
    if (lower === 'account wallets') return isOwned ? 'Your Account Wallet' : 'Account Wallet';
    return isOwned ? 'Your Wallet' : 'Wallet';
}

function formatActorLabel(name, handle, walletType, isOwned) {
    if (String(walletType || '').toLowerCase() === 'platform wallets') {
        return 'Ensemble Platform';
    }
    if (isOwned) {
        return formatWalletTypeLabel(walletType, true);
    }
    const cleanName = String(name || '').trim();
    const cleanHandle = String(handle || '').trim();
    if (cleanName && cleanHandle) return `${cleanName} (@${cleanHandle})`;
    if (cleanHandle) return `@${cleanHandle}`;
    if (cleanName) return cleanName;
    return formatWalletTypeLabel(walletType, false);
}

function buildHumanReadableMeta(row, type, isCreditPurchase, direction) {
    const refTable = String(row.reference_table || '').trim().toLowerCase();
    const rawType = String(row.type || '').trim();
    const sourceLabel = formatActorLabel(
        row.source_account_name,
        row.source_account_handle,
        row.source_wallet_type,
        row.source_owned
    );
    const destLabel = formatActorLabel(
        row.destination_account_name,
        row.destination_account_handle,
        row.destination_wallet_type,
        row.destination_owned
    );
    const walletFlow = `${sourceLabel} → ${destLabel}`;

    const counterparty =
        direction === 'internal'
            ? `${formatWalletTypeLabel(row.source_wallet_type, true)} → ${formatWalletTypeLabel(row.destination_wallet_type, true)}`
            : direction === 'incoming'
                ? sourceLabel
                : destLabel;

    if (isCreditPurchase) {
        return {
            category: 'Credit Purchase',
            title: 'Credit Top-Up',
            summary: 'Credits purchased at checkout and added to your Account Wallet.',
            counterparty: 'Ensemble Platform',
            walletFlow,
        };
    }

    if (type === 'Cashout') {
        return {
            category: 'Cashout',
            title: 'Credit Cashout',
            summary: 'Credits withdrawn from your Account Wallet for external payout.',
            counterparty: 'External Payout',
            walletFlow,
        };
    }

    if (type === 'Cashout Refund') {
        return {
            category: 'Cashout Refund',
            title: 'Cashout Refunded',
            summary: 'Credits returned to your Account Wallet after an unsuccessful or reversed cashout.',
            counterparty: 'Ensemble Platform',
            walletFlow,
        };
    }

    if (type === 'Asset Purchase') {
        if (direction === 'incoming') {
            return {
                category: 'Asset Purchase',
                title: 'Asset Sale Proceeds',
                summary: `Earned credits from a marketplace asset sale to ${counterparty}.`,
                counterparty,
                walletFlow,
            };
        }
        return {
            category: 'Asset Purchase',
            title: 'Marketplace Asset Purchase',
            summary: `Purchased a marketplace asset from ${counterparty}.`,
            counterparty,
            walletFlow,
        };
    }

    if (type === 'Asset Refund') {
        return {
            category: 'Asset Refund',
            title: direction === 'incoming' ? 'Asset Purchase Refunded' : 'Asset Sale Refunded',
            summary:
                direction === 'incoming'
                    ? 'Credits refunded to your Account Wallet for a marketplace asset.'
                    : 'Asset sale proceeds reversed for a refunded marketplace asset.',
            counterparty,
            walletFlow,
        };
    }

    // Staff credit hold: the credits stay in the Account Wallet, just not spendable.
    if (refTable === 'wallets' && (type === 'Escrow Hold' || type === 'Escrow Release')) {
        const held = type === 'Escrow Hold';
        return {
            category: held ? 'Credits on Hold' : 'Hold Released',
            title: held ? 'Credits Placed on Hold by Staff' : 'Credit Hold Released',
            summary: held
                ? 'Staff put a hold on these credits. They stay yours and come back when the hold ends or an appeal is accepted.'
                : 'The hold ended and these credits are spendable in your Account Wallet again.',
            counterparty: 'Your Account Wallet',
            walletFlow,
        };
    }

    if (type === 'Escrow Hold') {
        if (direction === 'internal') {
            return {
                category: 'Escrow Hold',
                title: 'Credits Placed on Hold',
                summary:
                    refTable === 'disputes'
                        ? 'Credits reserved in your Escrow Wallet while a dispute is under review.'
                        : 'Credits moved from your Account Wallet to your Escrow Wallet to fund a contract.',
                counterparty: 'Your Escrow Wallet',
                walletFlow,
            };
        }
        return {
            category: 'Escrow Hold',
            title: 'Contract Escrow Funded',
            summary: `Credits reserved in your Escrow Wallet by ${counterparty} for an active contract.`,
            counterparty,
            walletFlow,
        };
    }

    if (type === 'Escrow Release') {
        if (refTable === 'contract_milestones') {
            return {
                category: 'Escrow Release',
                title: 'Milestone Payout Released',
                summary:
                    direction === 'incoming'
                        ? 'Approved milestone credits released from Escrow into your Account Wallet.'
                        : 'Milestone credits released from Escrow to your Account Wallet.',
                counterparty,
                walletFlow,
            };
        }
        return {
            category: 'Escrow Release',
            title: 'Escrow Credits Released',
            summary: 'Held credits released from Escrow into your Account Wallet.',
            counterparty,
            walletFlow,
        };
    }

    if (type === 'Escrow Refund') {
        if (rawType === 'Job Posting Fee Refund' || rawType === 'Proposal Fee Refund') {
            return {
                category: 'Escrow Refund',
                title: rawType,
                summary: 'Platform fee refunded back to your Account Wallet.',
                counterparty: 'Ensemble Platform',
                walletFlow,
            };
        }
        return {
            category: 'Escrow Refund',
            title: 'Escrow Credits Refunded',
            summary: 'Held contract credits returned from your Escrow Wallet to your Account Wallet.',
            counterparty: 'Your Account Wallet',
            walletFlow,
        };
    }

    if (type === 'Fee') {
        if (refTable === 'market_assets') {
            return {
                category: 'Fee',
                title: 'Marketplace Asset Fee',
                summary: 'Platform fee deducted for a marketplace asset sale or listing.',
                counterparty: 'Ensemble Platform',
                walletFlow,
            };
        }
        if (refTable === 'contract_milestones') {
            return {
                category: 'Fee',
                title: 'Milestone Platform Fee',
                summary: 'Platform commission deducted upon milestone escrow payout.',
                counterparty: 'Ensemble Platform',
                walletFlow,
            };
        }
        if (refTable === 'jobs') {
            return {
                category: 'Fee',
                title: rawType !== 'Fee' ? rawType : 'Job Marketplace Fee',
                summary: 'Platform fee for posting a job or submitting a proposal.',
                counterparty: 'Ensemble Platform',
                walletFlow,
            };
        }
        if (refTable === 'gigs') {
            return {
                category: 'Fee',
                title: rawType !== 'Fee' ? rawType : 'Gig Service Fee',
                summary: 'Platform fee for publishing a gig service listing.',
                counterparty: 'Ensemble Platform',
                walletFlow,
            };
        }
        return {
            category: 'Fee',
            title: 'Platform Fee',
            summary: 'Platform service fee.',
            counterparty: 'Ensemble Platform',
            walletFlow,
        };
    }

    // Default / Fund Transfer variations
    if (refTable === 'teams') {
        return {
            category: 'Fund Transfer',
            title: direction === 'incoming' ? 'Team Fund Distribution' : 'Team Wallet Deposit',
            summary:
                direction === 'incoming'
                    ? `Received credit distribution from ${counterparty}.`
                    : `Added credits to Team wallet (${counterparty}).`,
            counterparty,
            walletFlow,
        };
    }

    if (refTable === 'team_contract_workspaces') {
        return {
            category: 'Fund Transfer',
            title: 'Team Task Payout',
            summary:
                direction === 'incoming'
                    ? `Received task payout from ${counterparty}.`
                    : `Sent task payout to ${counterparty}.`,
            counterparty,
            walletFlow,
        };
    }

    if (refTable === 'contracts') {
        return {
            category: 'Fund Transfer',
            title: 'Contract Escrow Transfer',
            summary:
                direction === 'outgoing'
                    ? `Transferred held contract funds from your Escrow Wallet to ${counterparty}.`
                    : `Received contract transfer from ${counterparty}.`,
            counterparty,
            walletFlow,
        };
    }

    return {
        category: 'Fund Transfer',
        title: direction === 'incoming' ? 'Received Credit Transfer' : 'Sent Credit Transfer',
        summary:
            direction === 'incoming'
                ? `Direct credit transfer received from ${counterparty}.`
                : `Direct credit transfer sent to ${counterparty}.`,
        counterparty,
        walletFlow,
    };
}

function mapTransaction(row) {
    const normalizedType = normalizeType(row.type);
    const type = normalizedType === 'Escrow Hold' && row.source_owned && !row.destination_owned
        ? 'Fund Transfer'
        : normalizedType;
    const sourceIsPlatform = String(row.source_wallet_type).toLowerCase() === 'platform wallets';
    const destinationIsPlatform = String(row.destination_wallet_type).toLowerCase() === 'platform wallets';
    const direction = getDirection(row);
    const isCreditPurchase =
        type === 'Fund Transfer' &&
        sourceIsPlatform &&
        Boolean(row.destination_owned);

    const meta = buildHumanReadableMeta(row, type, isCreditPurchase, direction);

    return {
        id: row.credit_transaction_id,
        type,
        category: meta.category,
        title: meta.title,
        summary: meta.summary,
        counterparty: meta.counterparty,
        walletFlow: meta.walletFlow,
        isCreditPurchase,
        amountCredits: Math.abs(Number(row.amount_credits)),
        status: row.status,
        createdAt: row.created_at,
        direction,
        sourceWalletId: sourceIsPlatform ? 'Platform' : row.source_wallet_id,
        destinationWalletId: destinationIsPlatform ? 'Platform' : row.destination_wallet_id,
        sourceWalletType: formatWalletTypeLabel(row.source_wallet_type, row.source_owned),
        destinationWalletType: formatWalletTypeLabel(row.destination_wallet_type, row.destination_owned),
        feeTransactionId: row.fee_transaction_id,
        referenceTable: row.reference_table,
        referenceId: row.reference_id,
    };
}

/**
 * A dispute payout that has not landed yet, shaped like a ledger entry with status Pending.
 * It never counts toward balances: the credits are still locked in escrow until release_at,
 * and the real ledger entry replaces it once the payout is paid.
 */
function mapPendingPayout(row) {
    const number = row.dispute_number || 'your dispute';
    const type = normalizeType(row.transaction_type);
    const paused = String(row.dispute_status || '').toLowerCase() !== 'closed';
    const failed = row.status === 'failed';
    const destination = formatWalletTypeLabel(row.destination_wallet_type, true);
    const title =
        row.kind === 'escrow_refund'
            ? 'Dispute Refund on the Way'
            : row.kind === 'escrow_release'
              ? 'Dispute Payout on the Way'
              : 'Dispute Reversal on the Way';
    const summary = failed
        ? `From dispute ${number}. The payout is delayed and staff are completing it.`
        : paused
          ? `From dispute ${number}. On hold while the case is reviewed again.`
          : `From dispute ${number}. Arrives in ${destination} on ${formatPayoutDate(row.release_at)}.`;
    return {
        id: `dispute-payout-${row.dispute_payout_id}`,
        type,
        category: type,
        title,
        summary,
        counterparty: `Escrow · dispute ${number}`,
        walletFlow: `Escrow (dispute ${number}) → ${destination}`,
        isCreditPurchase: false,
        amountCredits: Math.abs(Number(row.amount_credits)),
        status: 'Pending',
        createdAt: row.created_at,
        direction: 'incoming',
        sourceWalletId: 'Escrow',
        destinationWalletId: row.destination_wallet_id,
        sourceWalletType: 'Escrow Wallet',
        destinationWalletType: destination,
        feeTransactionId: null,
        referenceTable: 'disputes',
        referenceId: row.dispute_id,
        // Lets the client say when it lands without parsing the summary.
        pending: {
            kind: 'dispute_payout',
            disputeId: row.dispute_id,
            disputeNumber: row.dispute_number || null,
            releaseAt: row.release_at,
            paused,
            failed,
        },
    };
}

async function getCreditTransactionsService(accountId) {
    if (!accountId) {
        const error = new Error('Authenticated account is required');
        error.statusCode = 401;
        throw error;
    }

    const [rows, pendingPayouts, walletSummary] = await Promise.all([
        getCreditTransactionsByAccountId(accountId),
        getPendingDisputePayoutsByAccountId(accountId),
        getAccountWalletSummaryByAccountId(accountId),
    ]);

    const pending = pendingPayouts.map(mapPendingPayout);
    return {
        // Waiting payouts first: they are what a member is most likely looking for.
        transactions: [...pending, ...rows.map(mapTransaction)],
        walletSummary: {
            ...walletSummary,
            pendingCredits: pending.reduce((sum, item) => sum + item.amountCredits, 0),
        },
    };
}

module.exports = { getCreditTransactionsService };
