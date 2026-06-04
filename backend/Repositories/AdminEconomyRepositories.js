const { pool } = require('../lib/database');

const CREDIT_MULTIPLIER = 1000;

function buildCreditActivity(entity, merit) {
  const base = merit || 50;
  return [
    {
      id: `${entity.id}-t1`,
      type: 'Credit Adjustment',
      amount: 1500,
      label: 'System correction',
      timeAgo: '5 sec ago',
      positive: true,
      reversible: true,
      status: 'Completed',
    },
    {
      id: `${entity.id}-t2`,
      type: 'Freelancer Payout',
      amount: Math.round(base * 24),
      label: 'Contract payout',
      timeAgo: '10 min ago',
      positive: true,
      reversible: true,
      status: 'Completed',
    },
    {
      id: `${entity.id}-t3`,
      type: 'Asset Purchased',
      amount: -502,
      label: 'Marketplace asset',
      timeAgo: '52 min ago',
      positive: false,
      reversible: true,
      status: 'Completed',
    },
    {
      id: `${entity.id}-t4`,
      type: 'Credit Refunded',
      amount: 2521,
      label: 'Dispute resolution',
      timeAgo: '1 hr ago',
      positive: true,
      reversible: false,
      status: 'Completed',
    },
    {
      id: `${entity.id}-t5`,
      type: 'Credit Package Purchase',
      amount: Math.round(base * 10),
      label: 'Starter pack',
      timeAgo: '3 hr ago',
      positive: true,
      reversible: false,
      status: 'Completed',
    },
    {
      id: `${entity.id}-t6`,
      type: 'Platform Fee',
      amount: -Math.round(base * 2),
      label: 'Service fee',
      timeAgo: '1 day ago',
      positive: false,
      reversible: false,
      status: 'Completed',
    },
  ];
}

function mapAccountRow(row, accountType) {
  const name =
    [row.first_name, row.last_name].filter(Boolean).join(' ').trim() ||
    row.display_name ||
    'Unknown';
  const merit = row.merit_score ?? 0;
  const totalCredits = merit * CREDIT_MULTIPLIER;
  const totalAssets = Math.max(0, Math.floor(merit / 4) + (accountType === 'Team' ? 5 : 0));

  return {
    id: row.user_id || row.staff_id || row.account_id,
    accountId: row.account_id,
    walletId: `WAL-${String(row.account_id).padStart(5, '0')}`,
    name,
    email: row.email_address,
    username: row.handle,
    accountType,
    meritScore: merit,
    totalCredits,
    totalAssets,
    totalRevenue: totalCredits * 1.22 + totalAssets * 4500,
    frozen: row.status && String(row.status).toLowerCase().includes('suspend'),
    status: row.status || 'Active',
    transactions: buildCreditActivity({ id: row.account_id }, merit),
  };
}

function buildAuditEntry(wallet, index, typeIndex) {
  const tx = wallet.transactions[index % wallet.transactions.length];
  const statuses = ['Completed', 'Completed', 'Pending', 'Cancelled', 'Deducted', 'Credited'];
  const status = tx.positive ? (index % 5 === 2 ? 'Pending' : 'Credited') : 'Deducted';
  const auditStatus = statuses[(index + typeIndex) % statuses.length];

  return {
    id: `AUD-${wallet.walletId}-${index}`,
    username: wallet.username,
    name: wallet.name,
    accountType: wallet.accountType,
    status: auditStatus === 'Deducted' || auditStatus === 'Credited' ? auditStatus : auditStatus,
    creditAmount: tx.amount,
    type: tx.type,
    transactionStatus:
      auditStatus === 'Pending'
        ? 'Pending'
        : auditStatus === 'Cancelled'
          ? 'Cancelled'
          : 'Completed',
    timestamp: new Date(Date.now() - index * 3600000 * 4).toISOString(),
    walletId: wallet.walletId,
  };
}

async function getEconomyOverview() {
  const [usersResult, staffResult, meritStats] = await Promise.all([
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
        a.status
      FROM users u
      INNER JOIN accounts a ON a.account_id = u.account_id
      ORDER BY a.merit_score DESC NULLS LAST
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
        a.status
      FROM staff s
      INNER JOIN accounts a ON a.account_id = s.account_id
      ORDER BY a.merit_score DESC NULLS LAST
    `),
    pool.query(`
      SELECT
        COALESCE(SUM(merit_score), 0)::int AS total_merit,
        COALESCE(AVG(merit_score), 0)::numeric(10,1) AS avg_merit,
        COUNT(*)::int AS account_count
      FROM accounts
      WHERE deleted_at IS NULL
    `),
  ]);

  const userWallets = usersResult.rows.map((r) => mapAccountRow(r, 'User'));
  const staffWallets = staffResult.rows.map((r) => mapAccountRow(r, 'Staff'));

  const teamWallets = buildTeamWallets(userWallets);
  const allWallets = [...teamWallets, ...userWallets.filter((u) => !teamWallets.some((t) => t.leaderId === u.id))];

  const auditLog = [];
  allWallets.forEach((w, wi) => {
    for (let i = 0; i < 2; i++) {
      auditLog.push(buildAuditEntry(w, wi * 2 + i, i));
    }
  });
  auditLog.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const completed = auditLog.filter((a) => a.transactionStatus === 'Completed').length;
  const cancelled = auditLog.filter((a) => a.transactionStatus === 'Cancelled').length;
  const pending = auditLog.filter((a) => a.transactionStatus === 'Pending').length;

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
      totalSpent: Math.round(w.totalCredits * 0.35),
      totalCredits: w.totalCredits,
      initial: w.name.charAt(0),
    }));

  return {
    lastUpdated: new Date().toISOString(),
    summary: {
      completedTransactions: completed,
      cancelledTransactions: cancelled,
      pendingTransactions: pending,
      totalCreditsInCirculation: totalCredits,
      totalRevenue: Math.round(totalRevenue),
      frozenWallets,
      averageWalletBalance: allWallets.length
        ? Math.round(totalCredits / allWallets.length)
        : 0,
      totalMeritPoints: Number(meritStats.rows[0].total_merit),
      activeWallets: allWallets.filter((w) => !w.frozen).length,
    },
    wallets: allWallets,
    auditLog,
    topBuyers,
    creditPackages: [
      { id: 'pkg-starter', name: 'Starter Pack', credits: 500, pricePhp: 499, active: true, salesCount: 128 },
      { id: 'pkg-pro', name: 'Pro Pack', credits: 2500, pricePhp: 1999, active: true, salesCount: 64 },
      { id: 'pkg-studio', name: 'Studio Pack', credits: 10000, pricePhp: 6999, active: true, salesCount: 21 },
      { id: 'pkg-enterprise', name: 'Enterprise Pack', credits: 50000, pricePhp: 29999, active: false, salesCount: 3 },
    ],
    feeSettings: [
      { id: 'fee-marketplace', label: 'Marketplace transaction fee', percent: 8, flatFee: 0, appliesTo: 'Asset sales' },
      { id: 'fee-job', label: 'Jobs & gigs platform fee', percent: 12, flatFee: 50, appliesTo: 'Job contracts' },
      { id: 'fee-payout', label: 'Payout processing fee', percent: 2.5, flatFee: 25, appliesTo: 'Withdrawals' },
      { id: 'fee-listing', label: 'Asset listing fee', percent: 0, flatFee: 100, appliesTo: 'New listings' },
    ],
    marketplaceSettings: {
      listingFeeCredits: 100,
      transactionFeePercent: 8,
      escrowHoldDays: 7,
      minPayoutCredits: 500,
      refundWindowDays: 14,
    },
    alerts: buildEconomyAlerts(totalCredits, pending, frozenWallets),
  };
}

function buildTeamWallets(userWallets) {
  if (userWallets.length < 2) return [];

  const templates = [
    { name: 'RavenLabs', type: 'Team' },
    { name: 'Graphitee', type: 'Team' },
  ];

  return templates.map((tmpl, i) => {
    const leader = userWallets[i % userWallets.length];
    const members = userWallets.slice(i, i + 3);
    const totalMerit = members.reduce((s, m) => s + m.meritScore, 0);
    const totalCredits = members.reduce((s, m) => s + m.totalCredits, 0);
    const totalAssets = members.reduce((s, m) => s + m.totalAssets, 0);

    return {
      id: `team-${i + 1}`,
      accountId: leader.accountId,
      walletId: `WAL-T${String(i + 1).padStart(4, '0')}`,
      name: tmpl.name,
      email: `${tmpl.name.toLowerCase()}@business.com`,
      username: tmpl.name.toLowerCase(),
      accountType: 'Team',
      leaderId: leader.id,
      leaderName: leader.name,
      memberCount: members.length,
      meritScore: totalMerit,
      totalCredits,
      totalAssets,
      totalRevenue: totalCredits * 1.22 + totalAssets * 4500,
      frozen: members.some((m) => m.frozen),
      status: members.some((m) => m.frozen) ? 'Suspended' : 'Active',
      transactions: buildCreditActivity({ id: `team-${i}` }, totalMerit),
    };
  });
}

function buildEconomyAlerts(totalCredits, pending, frozen) {
  const alerts = [];
  if (pending > 5) {
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
      message: 'Economy health looks stable.',
      severity: 'success',
    });
  }
  return alerts;
}

module.exports = { getEconomyOverview };
