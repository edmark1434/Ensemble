const { pool } = require('../lib/database');
const { DEFAULT_SETTINGS } = require('./AdminSettingsRepositories');

function formatRelativeTime(dateValue) {
  if (!dateValue) return 'Recently';
  const diffSec = Math.floor((Date.now() - new Date(dateValue).getTime()) / 1000);
  if (Number.isNaN(diffSec)) return 'Recently';
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hr ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} days ago`;
  return new Date(dateValue).toLocaleDateString();
}

function normalizeAccountStatus(status) {
  if (!status) return 'Active';
  const s = String(status).toLowerCase();
  if (s === 'active') return 'Active';
  if (s.includes('suspend')) return 'Suspended';
  if (s.includes('ban')) return 'Banned';
  return status;
}

function mapWalletRow(row) {
  const name =
    [row.first_name, row.last_name].filter(Boolean).join(' ').trim() ||
    row.display_name ||
    row.handle ||
    'Unknown';
  const balance = Number(row.balance_credits || 0);
  const frozenBalance = Number(row.frozen_balance_credits || 0);
  const status = normalizeAccountStatus(row.account_status);
  const walletStatus = String(row.wallet_status || '').toLowerCase();

  return {
    id: row.user_id || row.staff_id || row.team_id || row.account_id,
    accountId: row.account_id,
    walletId: row.wallet_id,
    name,
    email: row.email_address || '',
    username: row.handle,
    accountType: row.account_type_label || row.account_type || 'User',
    meritScore: Number(row.merit_score || 0),
    totalCredits: balance,
    totalAssets: Number(row.asset_count || 0),
    totalRevenue: Number(row.asset_value || 0),
    frozen: frozenBalance > 0 || walletStatus.includes('frozen') || status === 'Suspended',
    status,
    leaderId: row.leader_user_id || undefined,
    leaderName: row.leader_name || undefined,
    memberCount: row.member_count != null ? Number(row.member_count) : undefined,
    transactions: [],
  };
}

function mapTransactionRow(row, walletId) {
  const isCredit = String(row.destination_wallet_id) === String(walletId);
  const amount = Number(row.amount_credits || 0);
  return {
    id: row.credit_transaction_id,
    type: row.type || 'Credit transaction',
    amount: isCredit ? Math.abs(amount) : -Math.abs(amount),
    label: row.status || 'Completed',
    timeAgo: formatRelativeTime(row.created_at),
    createdAt: row.created_at,
    positive: isCredit,
    reversible: String(row.status || '').toLowerCase() === 'completed',
    status: row.status || 'Completed',
  };
}

async function fetchWalletTransactions(walletIds, { limitPerWallet = 8 } = {}) {
  if (!walletIds.length) return new Map();

  const result = await pool.query(
    `
    SELECT
      ct.credit_transaction_id,
      ct.type,
      ct.amount_credits,
      ct.status,
      ct.created_at,
      ct.source_wallet_id,
      ct.destination_wallet_id
    FROM credit_transactions ct
    WHERE ct.source_wallet_id = ANY($1::uuid[])
       OR ct.destination_wallet_id = ANY($1::uuid[])
    ORDER BY ct.created_at DESC
    LIMIT 2000
    `,
    [walletIds]
  );

  const walletIdSet = new Set(walletIds.map(String));
  const map = new Map();
  for (const row of result.rows) {
    for (const walletId of [row.source_wallet_id, row.destination_wallet_id]) {
      if (!walletIdSet.has(String(walletId))) continue;
      const list = map.get(walletId) || [];
      if (limitPerWallet != null && list.length >= limitPerWallet) continue;
      list.push(mapTransactionRow(row, walletId));
      map.set(walletId, list);
    }
  }
  return map;
}

async function fetchAllWalletTransactions(walletId) {
  const result = await pool.query(
    `
    SELECT
      ct.credit_transaction_id,
      ct.type,
      ct.amount_credits,
      ct.status,
      ct.created_at,
      ct.source_wallet_id,
      ct.destination_wallet_id
    FROM credit_transactions ct
    WHERE ct.source_wallet_id = $1::uuid
       OR ct.destination_wallet_id = $1::uuid
    ORDER BY ct.created_at DESC
    `,
    [walletId]
  );

  return result.rows.map((row) => mapTransactionRow(row, walletId));
}

async function getWalletDetail(walletId) {
  const result = await pool.query(
    `
    SELECT
      a.account_id,
      a.handle,
      a.display_name,
      a.merit_score,
      a.status AS account_status,
      a.type AS account_type,
      w.wallet_id,
      w.balance_credits,
      w.frozen_balance_credits,
      w.status AS wallet_status,
      u.user_id,
      u.first_name AS user_first_name,
      u.last_name AS user_last_name,
      u.email_address AS user_email,
      s.staff_id,
      s.first_name AS staff_first_name,
      s.last_name AS staff_last_name,
      s.email_address AS staff_email,
      t.team_id,
      CASE
        WHEN u.user_id IS NOT NULL THEN 'User'
        WHEN s.staff_id IS NOT NULL THEN 'Staff'
        WHEN t.team_id IS NOT NULL THEN 'Team'
        ELSE COALESCE(a.type, 'User')
      END AS account_type_label,
      (
        SELECT COUNT(*)::int FROM team_members tm
        WHERE tm.team_id = t.team_id AND tm.deleted_at IS NULL
      ) AS member_count,
      (
        SELECT COALESCE(a2.display_name, u2.first_name || ' ' || u2.last_name, a2.handle)
        FROM team_members tm
        INNER JOIN users u2 ON u2.user_id = tm.user_id
        INNER JOIN accounts a2 ON a2.account_id = u2.account_id
        WHERE tm.team_id = t.team_id AND tm.deleted_at IS NULL
        ORDER BY CASE WHEN LOWER(tm.role) LIKE '%leader%' THEN 0 ELSE 1 END, tm.joined_at
        LIMIT 1
      ) AS leader_name,
      COALESCE(assets.asset_count, 0) AS asset_count,
      COALESCE(assets.asset_value, 0) AS asset_value
    FROM wallets w
    INNER JOIN account_wallets aw ON aw.wallet_id = w.wallet_id
    INNER JOIN accounts a ON a.account_id = aw.account_id
    LEFT JOIN users u ON u.account_id = a.account_id
    LEFT JOIN staff s ON s.account_id = a.account_id
    LEFT JOIN teams t ON t.account_id = a.account_id
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS asset_count, COALESCE(SUM(price_credits), 0)::int AS asset_value
      FROM marketplace_listings ml
      WHERE ml.submitted_by_account_id = a.account_id
    ) assets ON TRUE
    WHERE w.wallet_id = $1::uuid
      AND w.type = 'account wallets'
      AND a.deleted_at IS NULL
    LIMIT 1
    `,
    [walletId]
  );

  if (!result.rows.length) {
    const err = new Error('Wallet not found');
    err.status = 404;
    throw err;
  }

  const row = result.rows[0];
  const mapped = mapWalletRow({
    ...row,
    first_name: row.user_first_name || row.staff_first_name,
    last_name: row.user_last_name || row.staff_last_name,
    email_address: row.user_email || row.staff_email,
    user_id: row.user_id,
    staff_id: row.staff_id,
    team_id: row.team_id,
    leader_user_id: undefined,
  });

  const transactions = await fetchAllWalletTransactions(walletId);

  return {
    ...mapped,
    transactions,
    transactionCount: transactions.length,
  };
}

async function loadEconomySettings() {
  try {
    const result = await pool.query(
      `SELECT setting_value FROM platform_settings WHERE setting_key = 'economy'`
    );
    if (!result.rows.length) return DEFAULT_SETTINGS.economy;
    return { ...DEFAULT_SETTINGS.economy, ...result.rows[0].setting_value };
  } catch {
    return DEFAULT_SETTINGS.economy;
  }
}

async function getEconomyOverview() {
  const [userWalletsResult, staffWalletsResult, teamWalletsResult, txStats, meritStats, economySettings] =
    await Promise.all([
      pool.query(`
        SELECT
          u.user_id,
          u.account_id,
          u.first_name,
          u.last_name,
          u.email_address,
          a.handle,
          a.display_name,
          a.merit_score,
          a.status AS account_status,
          a.type AS account_type,
          'User' AS account_type_label,
          w.wallet_id,
          w.balance_credits,
          w.frozen_balance_credits,
          w.status AS wallet_status,
          COALESCE(assets.asset_count, 0) AS asset_count,
          COALESCE(assets.asset_value, 0) AS asset_value
        FROM users u
        INNER JOIN accounts a ON a.account_id = u.account_id
        INNER JOIN account_wallets aw ON aw.account_id = a.account_id
        INNER JOIN wallets w ON w.wallet_id = aw.wallet_id AND w.type = 'account wallets'
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS asset_count, COALESCE(SUM(price_credits), 0)::int AS asset_value
          FROM marketplace_listings ml
          WHERE ml.submitted_by_account_id = a.account_id
        ) assets ON TRUE
        WHERE a.deleted_at IS NULL
        ORDER BY w.balance_credits DESC NULLS LAST
      `),
      pool.query(`
        SELECT
          s.staff_id,
          s.account_id,
          s.first_name,
          s.last_name,
          s.email_address,
          a.handle,
          a.display_name,
          a.merit_score,
          a.status AS account_status,
          a.type AS account_type,
          'Staff' AS account_type_label,
          w.wallet_id,
          w.balance_credits,
          w.frozen_balance_credits,
          w.status AS wallet_status,
          0 AS asset_count,
          0 AS asset_value
        FROM staff s
        INNER JOIN accounts a ON a.account_id = s.account_id
        INNER JOIN account_wallets aw ON aw.account_id = a.account_id
        INNER JOIN wallets w ON w.wallet_id = aw.wallet_id AND w.type = 'account wallets'
        WHERE a.deleted_at IS NULL
        ORDER BY w.balance_credits DESC NULLS LAST
      `),
      pool.query(`
        SELECT
          t.team_id,
          t.account_id,
          a.handle,
          a.display_name,
          a.merit_score,
          a.status AS account_status,
          a.type AS account_type,
          'Team' AS account_type_label,
          NULL::uuid AS user_id,
          NULL::uuid AS staff_id,
          NULL::varchar AS first_name,
          NULL::varchar AS last_name,
          NULL::varchar AS email_address,
          w.wallet_id,
          w.balance_credits,
          w.frozen_balance_credits,
          w.status AS wallet_status,
          COALESCE(assets.asset_count, 0) AS asset_count,
          COALESCE(assets.asset_value, 0) AS asset_value,
          (
            SELECT COUNT(*)::int FROM team_members tm
            WHERE tm.team_id = t.team_id AND tm.deleted_at IS NULL
          ) AS member_count,
          (
            SELECT u.user_id
            FROM team_members tm
            INNER JOIN users u ON u.user_id = tm.user_id
            WHERE tm.team_id = t.team_id AND tm.deleted_at IS NULL
            ORDER BY CASE WHEN LOWER(tm.role) LIKE '%leader%' THEN 0 ELSE 1 END, tm.joined_at
            LIMIT 1
          ) AS leader_user_id,
          (
            SELECT COALESCE(a2.display_name, u.first_name || ' ' || u.last_name, a2.handle)
            FROM team_members tm
            INNER JOIN users u ON u.user_id = tm.user_id
            INNER JOIN accounts a2 ON a2.account_id = u.account_id
            WHERE tm.team_id = t.team_id AND tm.deleted_at IS NULL
            ORDER BY CASE WHEN LOWER(tm.role) LIKE '%leader%' THEN 0 ELSE 1 END, tm.joined_at
            LIMIT 1
          ) AS leader_name
        FROM teams t
        INNER JOIN accounts a ON a.account_id = t.account_id
        INNER JOIN account_wallets aw ON aw.account_id = a.account_id
        INNER JOIN wallets w ON w.wallet_id = aw.wallet_id AND w.type = 'account wallets'
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS asset_count, COALESCE(SUM(price_credits), 0)::int AS asset_value
          FROM marketplace_listings ml
          WHERE ml.submitted_by_account_id = a.account_id
        ) assets ON TRUE
        WHERE a.deleted_at IS NULL
        ORDER BY w.balance_credits DESC NULLS LAST
      `),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE LOWER(status) IN ('completed', 'credited', 'success', 'paid'))::int AS completed,
          COUNT(*) FILTER (WHERE LOWER(status) IN ('cancelled', 'canceled', 'failed'))::int AS cancelled,
          COUNT(*) FILTER (WHERE LOWER(status) IN ('pending', 'processing', 'open'))::int AS pending,
          COUNT(*)::int AS total,
          COALESCE(SUM(amount_credits) FILTER (WHERE LOWER(status) IN ('completed', 'credited', 'success', 'paid')), 0)::int AS completed_volume
        FROM credit_transactions
      `),
      pool.query(`
        SELECT
          COALESCE(SUM(merit_score), 0)::int AS total_merit,
          COALESCE(AVG(merit_score), 0)::numeric(10,1) AS avg_merit,
          COUNT(*)::int AS account_count
        FROM accounts
        WHERE deleted_at IS NULL
      `),
      loadEconomySettings(),
    ]);

  const userWallets = userWalletsResult.rows.map(mapWalletRow);
  const staffWallets = staffWalletsResult.rows.map(mapWalletRow);
  const teamWallets = teamWalletsResult.rows.map(mapWalletRow);
  const allWallets = [...teamWallets, ...userWallets, ...staffWallets];

  const walletIds = allWallets.map((w) => w.walletId).filter(Boolean);
  const txByWallet = await fetchWalletTransactions(walletIds);
  for (const wallet of allWallets) {
    wallet.transactions = txByWallet.get(wallet.walletId) || [];
  }

  const auditResult = await pool.query(`
    SELECT
      ct.credit_transaction_id,
      ct.type,
      ct.amount_credits,
      ct.status,
      ct.created_at,
      ct.source_wallet_id,
      ct.destination_wallet_id,
      COALESCE(da.handle, sa.handle) AS username,
      COALESCE(da.display_name, sa.display_name, da.handle, sa.handle, 'Unknown') AS name,
      COALESCE(da.type, sa.type, 'User') AS account_type,
      COALESCE(dw.wallet_id, sw.wallet_id) AS wallet_id
    FROM credit_transactions ct
    LEFT JOIN wallets dw ON dw.wallet_id = ct.destination_wallet_id
    LEFT JOIN account_wallets daw ON daw.wallet_id = dw.wallet_id
    LEFT JOIN accounts da ON da.account_id = daw.account_id
    LEFT JOIN wallets sw ON sw.wallet_id = ct.source_wallet_id
    LEFT JOIN account_wallets saw ON saw.wallet_id = sw.wallet_id
    LEFT JOIN accounts sa ON sa.account_id = saw.account_id
    ORDER BY ct.created_at DESC
    LIMIT 100
  `);

  const auditLog = auditResult.rows.map((row) => {
    const status = row.status || 'Completed';
    const amount = Number(row.amount_credits || 0);
    return {
      id: row.credit_transaction_id,
      username: row.username || '—',
      name: row.name || 'Unknown',
      accountType: row.account_type || 'User',
      status: amount >= 0 ? 'Credited' : 'Deducted',
      creditAmount: amount,
      type: row.type || 'Credit transaction',
      transactionStatus: status,
      timestamp: row.created_at,
      walletId: row.wallet_id || '—',
    };
  });

  const stats = txStats.rows[0] || { completed: 0, cancelled: 0, pending: 0, completed_volume: 0 };
  const totalCredits = allWallets.reduce((s, w) => s + w.totalCredits, 0);
  const totalRevenue = allWallets.reduce((s, w) => s + w.totalRevenue, 0);
  const frozenWallets = allWallets.filter((w) => w.frozen).length;

  const topBuyers = [...userWallets]
    .sort((a, b) => b.totalCredits - a.totalCredits)
    .slice(0, 10)
    .map((w, i) => ({
      rank: i + 1,
      name: w.name,
      username: w.username,
      totalSpent: Math.max(0, Number(w.totalAssets ? w.totalRevenue : 0)),
      totalCredits: w.totalCredits,
      initial: (w.name || '?').charAt(0),
    }));

  const packages = (economySettings.creditPackages || []).map((pkg) => ({
    ...pkg,
    salesCount: Number(pkg.salesCount || 0),
  }));

  return {
    lastUpdated: new Date().toISOString(),
    summary: {
      completedTransactions: Number(stats.completed || 0),
      cancelledTransactions: Number(stats.cancelled || 0),
      pendingTransactions: Number(stats.pending || 0),
      totalCreditsInCirculation: totalCredits,
      totalRevenue: Math.round(totalRevenue),
      frozenWallets,
      averageWalletBalance: allWallets.length ? Math.round(totalCredits / allWallets.length) : 0,
      totalMeritPoints: Number(meritStats.rows[0].total_merit),
      activeWallets: allWallets.filter((w) => !w.frozen).length,
    },
    wallets: allWallets,
    auditLog,
    topBuyers,
    creditPackages: packages,
    feeSettings: economySettings.feeSettings || DEFAULT_SETTINGS.economy.feeSettings,
    marketplaceSettings:
      economySettings.marketplaceSettings || DEFAULT_SETTINGS.economy.marketplaceSettings,
    alerts: buildEconomyAlerts(totalCredits, Number(stats.pending || 0), frozenWallets, allWallets.length),
  };
}

function buildEconomyAlerts(totalCredits, pending, frozen, walletCount) {
  const alerts = [];
  if (walletCount === 0) {
    alerts.push({
      id: 'no-wallets',
      message: 'No account wallets found in the database.',
      severity: 'warning',
    });
  }
  if (pending > 0) {
    alerts.push({
      id: 'pending-tx',
      message: `${pending} transactions awaiting settlement or review.`,
      severity: 'warning',
    });
  }
  if (frozen > 0) {
    alerts.push({
      id: 'frozen',
      message: `${frozen} wallet(s) have frozen credits.`,
      severity: 'info',
    });
  }
  if (totalCredits > 500000) {
    alerts.push({
      id: 'circulation',
      message: 'High credit circulation — monitor inflation and package pricing.',
      severity: 'info',
    });
  }
  if (alerts.length === 0) {
    alerts.push({
      id: 'ok',
      message: 'Economy health looks stable from live wallet data.',
      severity: 'success',
    });
  }
  return alerts;
}

module.exports = { getEconomyOverview, getWalletDetail };
