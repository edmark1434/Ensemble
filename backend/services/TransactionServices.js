const {
    getCreditTransactionsByAccountId,
    getUnpaidDisputePayoutsByAccountId,
    getAccountWalletSummaryByAccountId,
} = require('../repositories/TransactionRepositories');
const { fetchLedgerBalances, balanceKey } = require('../repositories/LedgerBalanceRepositories');
const { formatPayoutDate } = require('../lib/DisputeResolutions');
const { staffAdjustmentOf, staffHoldOf } = require('../lib/StaffLedgerNotes');

/** Ends free text with a full stop so a following sentence reads cleanly. */
function sentence(text) {
    const value = String(text || '').trim();
    if (!value) return '';
    return /[.!?]$/.test(value) ? value : `${value}.`;
}

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

function buildHumanReadableMeta(row, type, isCreditPurchase, direction, { adjustment = null, hold = null } = {}) {
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

    // Staff grant or deduction: the ledger row is a self-transfer, the sign is on its audit row.
    if (adjustment) {
        const reason = adjustment.reason ? ` Reason: ${sentence(adjustment.reason)}` : '';
        if (adjustment.delta > 0) {
            return {
                category: 'Staff Adjustment',
                title: 'Credits Added by Staff',
                summary: `Staff added these credits to your Account Wallet.${reason}`,
                counterparty: 'Ensemble Staff',
                walletFlow: 'Ensemble Staff → Your Account Wallet',
            };
        }
        if (adjustment.delta < 0) {
            return {
                category: 'Staff Adjustment',
                title: 'Credits Removed by Staff',
                summary: `Staff removed these credits from your Account Wallet.${reason} If you think this is a mistake, contact support.`,
                counterparty: 'Ensemble Staff',
                walletFlow: 'Your Account Wallet → Ensemble Staff',
            };
        }
        return {
            category: 'Staff Adjustment',
            title: 'Balance Adjusted by Staff',
            summary: 'Staff changed the balance of your Account Wallet.',
            counterparty: 'Ensemble Staff',
            walletFlow,
        };
    }

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
        // Only the hold's reason was written for the member; a release note is staff-only.
        const reason = held && hold?.reason ? ` Reason: ${sentence(hold.reason)}` : '';
        const releasedByStaff = hold?.source === 'staff' || hold?.source === 'reversal';
        return {
            category: held ? 'Credits on Hold' : 'Hold Released',
            title: held ? 'Credits Placed on Hold by Staff' : 'Credit Hold Released',
            summary: held
                ? `Staff put a hold on these credits.${reason} They stay yours and come back when the hold ends or an appeal is accepted.`
                : releasedByStaff
                  ? 'Staff released the hold. These credits are spendable in your Account Wallet again.'
                  : 'The hold ended and these credits are spendable in your Account Wallet again.',
            counterparty: 'Your Account Wallet',
            walletFlow: held ? 'Your Account Wallet → On hold' : 'On hold → Your Account Wallet',
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
    if (refTable === 'dev_credit_injection') {
        return {
            category: 'Fund Transfer',
            title: 'Dev Credit Injection (Inserted)',
            summary: 'Credits inserted via Dev Mode (Alt + I) into your Account Wallet.',
            counterparty: 'Dev Mode (Inserted)',
            walletFlow,
        };
    }

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
    const adjustment = staffAdjustmentOf(row);
    const hold = staffHoldOf(row);
    // A staff grant adds to the wallet and a deduction takes from it, though both are self-transfers.
    const direction = adjustment?.delta
        ? (adjustment.delta > 0 ? 'incoming' : 'outgoing')
        : getDirection(row);
    const isCreditPurchase =
        type === 'Fund Transfer' &&
        sourceIsPlatform &&
        Boolean(row.destination_owned);

    const meta = buildHumanReadableMeta(row, type, isCreditPurchase, direction, { adjustment, hold });

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
        // Reasons written for the member: an adjustment's and a hold's (never a release note).
        staffReason: adjustment?.reason || (hold?.held ? hold.reason : null) || null,
        holdUntil: hold?.held ? hold.until : null,
        staffAction: adjustment
            ? (adjustment.delta > 0 ? 'grant' : adjustment.delta < 0 ? 'deduction' : 'adjustment')
            : hold
              ? (hold.held ? 'hold' : 'release')
              : null,
    };
}

const PAYOUT_NOUN = { escrow_refund: 'Refund', escrow_release: 'Payout' };

/**
 * A dispute payout with no ledger row, shaped like a ledger entry. It never counts toward
 * balances: a waiting payout's credits stay locked in escrow until release_at (the real ledger
 * entry replaces it once paid), and a cancelled one never moved any.
 * Status: Pending (scheduled), On Hold (case reopened), Delayed (failed, retrying) or
 * Cancelled (staff withdrew the ruling).
 */
function mapPendingPayout(row) {
    const number = row.dispute_number || 'your dispute';
    const type = normalizeType(row.transaction_type);
    const cancelled = row.status === 'cancelled';
    const paused = !cancelled && String(row.dispute_status || '').toLowerCase() !== 'closed';
    const failed = row.status === 'failed';
    const destination = formatWalletTypeLabel(row.destination_wallet_type, true);
    const noun = PAYOUT_NOUN[row.kind] || 'Reversal';
    const title = cancelled ? `Dispute ${noun} Cancelled` : `Dispute ${noun} on the Way`;
    const summary = cancelled
        ? `From dispute ${number}. Staff withdrew this ruling, so no credits moved.`
        : failed
          ? `From dispute ${number}. The payout is delayed and staff are completing it.`
          : paused
            ? `From dispute ${number}. On hold while the case is reviewed again.`
            : `From dispute ${number}. Arrives in ${destination} on ${formatPayoutDate(row.release_at)}.`;
    const status = cancelled ? 'Cancelled' : failed ? 'Delayed' : paused ? 'On Hold' : 'Pending';
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
        status,
        // A cancelled payout sits in the history at the moment it was withdrawn.
        createdAt: cancelled ? row.cancelled_at || row.created_at : row.created_at,
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
            cancelled,
            cancelledAt: row.cancelled_at || null,
        },
    };
}

const BALANCE_WALLET_TYPES = new Set(['account wallets', 'escrow wallets']);

/**
 * The member's own wallet whose balance a row shows: the Account Wallet when the row touches
 * it, otherwise the escrow wallet it touches. Null for rows on no member or escrow wallet.
 */
function balanceWalletOf(row) {
    const sides = [
        row.source_owned && { walletId: row.source_wallet_id, type: String(row.source_wallet_type || '').toLowerCase() },
        row.destination_owned && { walletId: row.destination_wallet_id, type: String(row.destination_wallet_type || '').toLowerCase() },
    ].filter((side) => side && BALANCE_WALLET_TYPES.has(side.type));
    return sides.find((side) => side.type === 'account wallets') || sides[0] || null;
}

/** Each row's wallet balance before and after it; a read failure leaves the history without them. */
async function loadRowBalances(rows) {
    const pairs = [];
    for (const row of rows) {
        const wallet = balanceWalletOf(row);
        if (wallet) pairs.push({ transactionId: row.credit_transaction_id, walletId: wallet.walletId });
    }
    try {
        return await fetchLedgerBalances(pairs);
    } catch (error) {
        console.error('Transaction balances skipped:', error.message);
        return new Map();
    }
}

function withBalance(mapped, row, balances) {
    const wallet = balanceWalletOf(row);
    const found = wallet ? balances.get(balanceKey(row.credit_transaction_id, wallet.walletId)) : null;
    if (!found) return { ...mapped, balance: null };
    return {
        ...mapped,
        balance: {
            wallet: formatWalletTypeLabel(wallet.type, true),
            before: found.before,
            after: found.after,
            heldBefore: found.heldBefore,
            heldAfter: found.heldAfter,
            approximate: found.approximate,
        },
    };
}

function timeOf(value) {
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : 0;
}

async function getCreditTransactionsService(accountId) {
    if (!accountId) {
        const error = new Error('Authenticated account is required');
        error.statusCode = 401;
        throw error;
    }

    const [rows, unpaidPayouts, walletSummary] = await Promise.all([
        getCreditTransactionsByAccountId(accountId),
        getUnpaidDisputePayoutsByAccountId(accountId),
        getAccountWalletSummaryByAccountId(accountId),
    ]);
    const balances = await loadRowBalances(rows);

    const payouts = unpaidPayouts.map(mapPendingPayout);
    const waiting = payouts.filter((item) => !item.pending.cancelled);
    const cancelled = payouts.filter((item) => item.pending.cancelled);
    // Withdrawn payouts sit among the ledger rows by date (stable sort keeps ledger order on ties).
    const history = [...rows.map((row) => withBalance(mapTransaction(row), row, balances)), ...cancelled].sort(
        (a, b) => timeOf(b.createdAt) - timeOf(a.createdAt)
    );
    return {
        // Waiting payouts first: they are what a member is most likely looking for.
        transactions: [...waiting, ...history],
        walletSummary: {
            ...walletSummary,
            pendingCredits: waiting.reduce((sum, item) => sum + item.amountCredits, 0),
        },
    };
}

module.exports = { getCreditTransactionsService };
