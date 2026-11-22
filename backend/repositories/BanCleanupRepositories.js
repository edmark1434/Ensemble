const { pool } = require('../lib/Database');
const { createNotification } = require('./NotificationRepositories');

/**
 * Close what a banned account offers to others, so nobody can apply to, order from, buy
 * from, or hire a banned member — and nobody's credits are left stranded on the way.
 *
 * Each item runs in its own transaction: one stuck job never stops the rest. Every step uses
 * the same money rules as the product's own close path. Live contracts are not touched; staff
 * resolve those through a dispute, as the punishment rules say.
 */

const PROPOSAL_OPEN_STATUSES = ['Pending', 'Shortlisted', 'Interviewing'];
const GIG_ORDER_OPEN_STATUSES = ['Pending', 'Shortlisted', 'Accepted'];

async function notify(accountId, message, { table, prefix, path, id }) {
  if (!accountId) return;
  try {
    await createNotification({
      account_id: accountId,
      message,
      is_read: false,
      reference_table: table,
      reference_prefix: prefix,
      reference_path: path,
      reference_id: id,
    });
  } catch (err) {
    console.warn('Ban clean-up notification skipped:', err.message);
  }
}

async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

const BAN_LISTING_NOTE = 'Removed from the marketplace because this account was banned.';

let banItemsTableReady = false;
/** The record table arrives with migration 1830800000000; items still close without it. */
async function banItemsReady(runner) {
  if (banItemsTableReady) return true;
  const result = await runner.query(`SELECT to_regclass('public.ban_cleanup_items') IS NOT NULL AS ready`);
  banItemsTableReady = Boolean(result.rows[0]?.ready);
  return banItemsTableReady;
}

/** Remember what the ban closed and how it was, so an accepted appeal can put it back. */
async function recordBanItem(client, item) {
  if (!(await banItemsReady(client))) return;
  await client.query(
    `INSERT INTO ban_cleanup_items
       (account_id, item_type, item_id, title, previous_status, market_asset_id, previous_asset_status, closed_by_staff_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      item.accountId,
      item.type,
      String(item.id),
      item.title || null,
      item.previousStatus,
      item.marketAssetId || null,
      item.previousAssetStatus || null,
      item.staffId || null,
    ]
  );
}

async function lockAccountWallet(client, accountId) {
  const result = await client.query(
    `SELECT w.wallet_id
     FROM wallets w
     JOIN account_wallets aw ON aw.wallet_id = w.wallet_id
     WHERE aw.account_id = $1 AND w.type = 'account wallets'
     ORDER BY w.wallet_id
     LIMIT 1
     FOR UPDATE OF w`,
    [accountId]
  );
  return result.rows[0]?.wallet_id || null;
}

/** Refund a platform fee the same way the job engine does when a job closes without a hire. */
async function refundFromPlatform(client, { platformWalletId, accountId, amount, type, jobId }) {
  if (!platformWalletId || !accountId || !(amount > 0)) return 0;
  const walletId = await lockAccountWallet(client, accountId);
  if (!walletId) return 0;
  await client.query(`UPDATE wallets SET balance_credits = balance_credits + $1 WHERE wallet_id = $2`, [
    amount,
    walletId,
  ]);
  await client.query(
    `UPDATE wallets SET balance_credits = GREATEST(0, balance_credits - $1) WHERE wallet_id = $2`,
    [amount, platformWalletId]
  );
  await client.query(
    `INSERT INTO credit_transactions (
       type, amount_credits, status, source_wallet_id, destination_wallet_id, reference_table, reference_id
     ) VALUES ($1, $2, 'Completed', $3, $4, 'jobs', $5)`,
    [type, amount, platformWalletId, walletId, jobId]
  );
  return amount;
}

/**
 * Job offers waiting for a signature where the banned account is either side. The client's
 * credits sit in their escrow wallet for these, so each one is rejected through the normal
 * reject path, which returns them to the client.
 */
async function listPendingOffers(accountId) {
  const result = await pool.query(
    `SELECT c.contract_id, p.freelancer_account_id, j.client_account_id
     FROM contracts c
     JOIN job_contracts jc ON jc.contract_id = c.contract_id
     JOIN proposals p ON p.proposal_id = jc.proposal_id
     JOIN jobs j ON j.job_id = p.job_id
     WHERE c.status = 'Pending Signature'
       AND (j.client_account_id = $1 OR p.freelancer_account_id = $1)`,
    [accountId]
  );
  return result.rows;
}

/**
 * Close one job the banned account posted: refund every open applicant's proposal fee and
 * close their proposals, or refund the posting fee when nobody applied — the job engine's
 * own rule for a job that ends without a hire.
 */
async function closeJobForBan(jobId, { staffId = null } = {}) {
  return withTransaction(async (client) => {
    const jobRes = await client.query(
      `SELECT job_id, client_account_id, title, posting_fee_credits, status
       FROM jobs
       WHERE job_id = $1 AND deleted_at IS NULL AND LOWER(status) IN ('open', 'paused')
       FOR UPDATE`,
      [jobId]
    );
    const job = jobRes.rows[0];
    if (!job) return null;

    const platform = await client.query(
      `SELECT wallet_id FROM wallets WHERE type = 'platform wallets' LIMIT 1 FOR UPDATE`
    );
    const platformWalletId = platform.rows[0]?.wallet_id || null;

    const proposals = await client.query(
      `SELECT proposal_id, freelancer_account_id, submission_fee_credits
       FROM proposals
       WHERE job_id = $1 AND deleted_at IS NULL AND status = ANY($2::text[])
       FOR UPDATE`,
      [jobId, PROPOSAL_OPEN_STATUSES]
    );

    let refunded = 0;
    if (!proposals.rows.length) {
      refunded += await refundFromPlatform(client, {
        platformWalletId,
        accountId: job.client_account_id,
        amount: Number(job.posting_fee_credits || 50),
        type: 'Job Posting Fee Refund',
        jobId,
      });
    }
    for (const proposal of proposals.rows) {
      const fee = Number(proposal.submission_fee_credits || 10);
      const back = await refundFromPlatform(client, {
        platformWalletId,
        accountId: proposal.freelancer_account_id,
        amount: fee,
        type: 'Proposal Fee Refund',
        jobId,
      });
      refunded += back;
      await client.query(
        `UPDATE proposals SET status = 'Closed', updated_at = NOW() WHERE proposal_id = $1`,
        [proposal.proposal_id]
      );
      await notify(
        proposal.freelancer_account_id,
        `"${job.title}" was closed by Ensemble and is no longer hiring.${
          back ? ` Your proposal fee of ${back} credits has been refunded.` : ''
        }`,
        { table: 'jobs', prefix: 'JOB_CLOSED', path: '/jobs/applied', id: jobId }
      );
    }

    await client.query(`UPDATE jobs SET status = 'Closed', updated_at = NOW() WHERE job_id = $1`, [jobId]);
    await recordBanItem(client, {
      accountId: job.client_account_id,
      type: 'job',
      id: jobId,
      title: job.title,
      previousStatus: job.status,
      staffId,
    });
    return { jobId, title: job.title, applicants: proposals.rows.length, refunded };
  });
}

async function listOpenJobs(accountId) {
  const result = await pool.query(
    `SELECT job_id FROM jobs
     WHERE client_account_id = $1 AND deleted_at IS NULL AND LOWER(status) IN ('open', 'paused')`,
    [accountId]
  );
  return result.rows.map((row) => row.job_id);
}

/**
 * Close one gig the banned account sells and cancel its unconfirmed orders. No credits move:
 * a gig order holds nothing until the client confirms and funds the contract, and confirmed
 * contracts are left for staff.
 */
async function closeGigForBan(gigId, { staffId = null } = {}) {
  return withTransaction(async (client) => {
    const gigRes = await client.query(
      `SELECT gig_id, freelancer_account_id, title, status
       FROM gigs WHERE gig_id = $1 AND LOWER(COALESCE(status, 'active')) IN ('active', 'open', 'paused')
       FOR UPDATE`,
      [gigId]
    );
    const gig = gigRes.rows[0];
    if (!gig) return null;

    const orders = await client.query(
      `SELECT gr.gig_request_id, gr.client_account_id, gc.contract_id
       FROM gig_requests gr
       JOIN gig_tiers gt ON gt.gig_tier_id = gr.gig_tier_id
       LEFT JOIN gig_contracts gc ON gc.gig_request_id = gr.gig_request_id
       WHERE gt.gig_id = $1 AND gr.status = ANY($2::text[])
       FOR UPDATE OF gr`,
      [gigId, GIG_ORDER_OPEN_STATUSES]
    );
    const TeamProjectRepositories = require('./TeamProjectRepositories');
    for (const order of orders.rows) {
      await client.query(
        `UPDATE gig_requests SET status = 'Rejected', updated_at = NOW() WHERE gig_request_id = $1`,
        [order.gig_request_id]
      );
      if (order.contract_id) {
        await client.query(
          `UPDATE contracts SET status = 'Cancelled'
           WHERE contract_id = $1 AND LOWER(status) IN ('pending', 'waiting', 'pending signature')`,
          [order.contract_id]
        );
        await TeamProjectRepositories.syncContractWorkspacesArchived(
          client,
          order.contract_id,
          order.client_account_id,
          'Gig order cancelled'
        );
      }
      await notify(
        order.client_account_id,
        `Your order for "${gig.title}" was cancelled because the seller can no longer take orders on Ensemble. No credits were charged.`,
        { table: 'gig_requests', prefix: 'GIGR', path: `/gigs/orders/sent/${order.gig_request_id}`, id: order.gig_request_id }
      );
    }

    await client.query(`UPDATE gigs SET status = 'closed', updated_at = NOW() WHERE gig_id = $1`, [gigId]);
    await recordBanItem(client, {
      accountId: gig.freelancer_account_id,
      type: 'gig',
      id: gigId,
      title: gig.title,
      previousStatus: gig.status || 'active',
      staffId,
    });
    return { gigId, title: gig.title, ordersCancelled: orders.rows.length };
  });
}

async function listOpenGigs(accountId) {
  const result = await pool.query(
    `SELECT gig_id FROM gigs
     WHERE freelancer_account_id = $1 AND LOWER(COALESCE(status, 'active')) IN ('active', 'open', 'paused')`,
    [accountId]
  );
  return result.rows.map((row) => row.gig_id);
}

/**
 * Take the banned account's marketplace listings out of the catalog. Buyers keep their
 * licenses and originals; only new sales stop. The note is what the creator sees.
 */
async function delistListingsForBan(accountId, { staffId = null } = {}) {
  return withTransaction(async (client) => {
    // Lock and read first: the record keeps each listing's and asset's status before the ban.
    const listings = await client.query(
      `WITH prev AS (
         SELECT ml.listing_id, ml.status, ml.market_asset_id, ma.status AS asset_status, ma.name AS title
         FROM marketplace_listings ml
         LEFT JOIN market_assets ma ON ma.market_asset_id = ml.market_asset_id
         WHERE ml.submitted_by_account_id = $1
           AND ml.status IN ('approved', 'pending', 'scheduled')
         FOR UPDATE OF ml
       )
       UPDATE marketplace_listings ml
       SET status = 'delisted',
           moderation_note = $2,
           reviewed_at = NOW(),
           updated_at = NOW()
       FROM prev
       WHERE ml.listing_id = prev.listing_id
       RETURNING ml.listing_id, ml.market_asset_id, prev.status AS previous_status,
                 prev.asset_status AS previous_asset_status, prev.title`,
      [accountId, BAN_LISTING_NOTE]
    );
    const assetIds = listings.rows.map((row) => row.market_asset_id).filter(Boolean);
    if (assetIds.length) {
      await client.query(
        `UPDATE market_assets SET status = 'draft', updated_at = NOW()
         WHERE market_asset_id = ANY($1::uuid[]) AND deleted_at IS NULL`,
        [assetIds]
      );
    }
    for (const row of listings.rows) {
      await recordBanItem(client, {
        accountId,
        type: 'listing',
        id: row.listing_id,
        title: row.title,
        previousStatus: row.previous_status,
        marketAssetId: row.market_asset_id,
        previousAssetStatus: row.previous_asset_status,
        staffId,
      });
    }
    return { listings: listings.rowCount || 0 };
  });
}

/**
 * Withdraw what the banned account asked of others: pending proposals (so no client can hire
 * them) and unconfirmed gig orders. Proposal fees follow the normal withdraw rule (kept), gig
 * orders hold no credits.
 */
async function withdrawOutgoingForBan(accountId) {
  return withTransaction(async (client) => {
    const proposals = await client.query(
      `UPDATE proposals
       SET status = 'Withdrawn', deleted_at = NOW(), updated_at = NOW()
       WHERE freelancer_account_id = $1
         AND deleted_at IS NULL
         AND status = ANY($2::text[])
       RETURNING proposal_id`,
      [accountId, PROPOSAL_OPEN_STATUSES]
    );

    const orders = await client.query(
      `SELECT gr.gig_request_id, gr.status, g.freelancer_account_id, g.title, gc.contract_id
       FROM gig_requests gr
       JOIN gig_tiers gt ON gt.gig_tier_id = gr.gig_tier_id
       JOIN gigs g ON g.gig_id = gt.gig_id
       LEFT JOIN gig_contracts gc ON gc.gig_request_id = gr.gig_request_id
       WHERE gr.client_account_id = $1 AND gr.status = ANY($2::text[])
       FOR UPDATE OF gr`,
      [accountId, GIG_ORDER_OPEN_STATUSES]
    );
    const TeamProjectRepositories = require('./TeamProjectRepositories');
    for (const order of orders.rows) {
      await client.query(
        `UPDATE gig_requests SET status = $1, updated_at = NOW() WHERE gig_request_id = $2`,
        [order.status === 'Accepted' ? 'Cancelled' : 'Withdrawn', order.gig_request_id]
      );
      if (order.contract_id) {
        await client.query(
          `UPDATE contracts SET status = 'Cancelled'
           WHERE contract_id = $1 AND LOWER(status) IN ('pending', 'waiting', 'pending signature')`,
          [order.contract_id]
        );
        await TeamProjectRepositories.syncContractWorkspacesArchived(
          client,
          order.contract_id,
          order.freelancer_account_id,
          'Gig order withdrawn and cancelled'
        );
      }
      await notify(
        order.freelancer_account_id,
        `An order for "${order.title}" was withdrawn because the client can no longer place orders on Ensemble.`,
        { table: 'gig_requests', prefix: 'GIGR', path: '/gigs/orders', id: order.gig_request_id }
      );
    }
    return { proposals: proposals.rowCount || 0, gigOrders: orders.rows.length };
  });
}

/** Live work the ban leaves for staff: contracts already running or waiting to start. */
async function countLiveContracts(accountId) {
  const result = await pool.query(
    `SELECT COUNT(DISTINCT c.contract_id)::int AS n
     FROM contracts c
     LEFT JOIN job_contracts jc ON jc.contract_id = c.contract_id
     LEFT JOIN proposals p ON p.proposal_id = jc.proposal_id
     LEFT JOIN jobs j ON j.job_id = p.job_id
     LEFT JOIN gig_contracts gc ON gc.contract_id = c.contract_id
     LEFT JOIN gig_requests gr ON gr.gig_request_id = gc.gig_request_id
     LEFT JOIN gig_tiers gt ON gt.gig_tier_id = gr.gig_tier_id
     LEFT JOIN gigs g ON g.gig_id = gt.gig_id
     WHERE LOWER(c.status) IN ('active', 'waiting')
       AND $1 IN (j.client_account_id, p.freelancer_account_id, gr.client_account_id, g.freelancer_account_id)`,
    [accountId]
  );
  return Number(result.rows[0]?.n || 0);
}

/** What bans closed for this account (restored ones included), newest first. */
async function listBanCleanupItems(accountId) {
  if (!(await banItemsReady(pool))) return [];
  const result = await pool.query(
    `SELECT * FROM ban_cleanup_items WHERE account_id = $1 ORDER BY closed_at DESC LIMIT 500`,
    [accountId]
  );
  return result.rows;
}

const RESTORE_SKIP_REASONS = {
  gone: 'it was deleted',
  changed: 'it was changed after the ban',
  staff_hold: 'staff put it on hold',
  window_ended: 'its application window has ended',
};

/**
 * Put one item a ban closed back exactly as it was — only when nothing changed it since the
 * ban (so a separate staff decision is never undone). One transaction per item.
 * @param {string} itemId ban_cleanup_item_id
 * @param {{ source: 'appeal'|'staff', staffId?: string|null }} options
 * @returns {Promise<{ restored: boolean, reason?: string, item: object|null }>}
 */
async function restoreBanCleanupItem(itemId, { source, staffId = null }) {
  return withTransaction(async (client) => {
    const found = await client.query(
      `SELECT * FROM ban_cleanup_items WHERE ban_cleanup_item_id = $1 FOR UPDATE`,
      [itemId]
    );
    const item = found.rows[0];
    if (!item) return { restored: false, reason: 'gone', item: null };
    if (item.restored_at) return { restored: false, reason: 'already_restored', item };

    let reason = null;
    const previous = String(item.previous_status || '');
    if (item.item_type === 'job') {
      const job = (await client.query(
        `SELECT status, application_deadline, deleted_at, staff_hold_at
         FROM jobs WHERE job_id::text = $1 FOR UPDATE`,
        [item.item_id]
      )).rows[0];
      if (!job || job.deleted_at) reason = 'gone';
      else if (String(job.status || '').toLowerCase() !== 'closed') reason = 'changed';
      else if (job.staff_hold_at && previous.toLowerCase() !== 'paused') reason = 'staff_hold';
      else if (job.application_deadline && new Date(job.application_deadline).getTime() <= Date.now()) {
        reason = 'window_ended';
      } else {
        await client.query(`UPDATE jobs SET status = $2, updated_at = NOW() WHERE job_id::text = $1`, [
          item.item_id,
          previous,
        ]);
      }
    } else if (item.item_type === 'gig') {
      const gig = (await client.query(
        `SELECT status, deleted_at, staff_hold_at FROM gigs WHERE gig_id::text = $1 FOR UPDATE`,
        [item.item_id]
      )).rows[0];
      if (!gig || gig.deleted_at) reason = 'gone';
      else if (String(gig.status || '').toLowerCase() !== 'closed') reason = 'changed';
      else if (gig.staff_hold_at && previous.toLowerCase() !== 'paused') reason = 'staff_hold';
      else {
        await client.query(`UPDATE gigs SET status = $2, updated_at = NOW() WHERE gig_id::text = $1`, [
          item.item_id,
          previous,
        ]);
      }
    } else if (item.item_type === 'listing') {
      const listing = (await client.query(
        `SELECT ml.status, ml.moderation_note, ml.market_asset_id, ma.deleted_at AS asset_deleted_at
         FROM marketplace_listings ml
         LEFT JOIN market_assets ma ON ma.market_asset_id = ml.market_asset_id
         WHERE ml.listing_id::text = $1
         FOR UPDATE OF ml`,
        [item.item_id]
      )).rows[0];
      if (!listing || listing.asset_deleted_at) reason = 'gone';
      else if (listing.status !== 'delisted' || listing.moderation_note !== BAN_LISTING_NOTE) reason = 'changed';
      else {
        await client.query(
          `UPDATE marketplace_listings
           SET status = $2, moderation_note = NULL, updated_at = NOW()
           WHERE listing_id::text = $1`,
          [item.item_id, previous]
        );
        if (listing.market_asset_id) {
          const assetStatus = item.previous_asset_status || (previous === 'approved' ? 'published' : 'draft');
          await client.query(
            `UPDATE market_assets SET status = $2, updated_at = NOW()
             WHERE market_asset_id = $1 AND deleted_at IS NULL`,
            [listing.market_asset_id, assetStatus]
          );
        }
      }
    } else {
      reason = 'gone';
    }

    if (reason) {
      await client.query(`UPDATE ban_cleanup_items SET skipped_reason = $2 WHERE ban_cleanup_item_id = $1`, [
        itemId,
        reason,
      ]);
      return { restored: false, reason, item };
    }
    await client.query(
      `UPDATE ban_cleanup_items
       SET restored_at = NOW(), restore_source = $2, restored_by_staff_id = $3, skipped_reason = NULL
       WHERE ban_cleanup_item_id = $1`,
      [itemId, source, staffId || null]
    );
    return { restored: true, item };
  });
}

module.exports = {
  BAN_LISTING_NOTE,
  RESTORE_SKIP_REASONS,
  listBanCleanupItems,
  restoreBanCleanupItem,
  listPendingOffers,
  listOpenJobs,
  closeJobForBan,
  listOpenGigs,
  closeGigForBan,
  delistListingsForBan,
  withdrawOutgoingForBan,
  countLiveContracts,
};
