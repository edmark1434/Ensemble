const { pool } = require('../lib/Database');
const { getMongoClient, connectMongoDB } = require('../lib/MongoDb');
const { CREDIT_TRANSACTION_TYPE } = require('../lib/CreditTransactionEnums');

/**
 * Read-only facts for the staff "View profile" panel of one user or team account.
 * Every query here is scoped to a single account so the panel can load on demand
 * instead of growing the full User & Team list payload.
 */

function toCount(value) {
  return Number(value || 0);
}

function statusBreakdown(rows) {
  const byStatus = {};
  let total = 0;
  for (const row of rows) {
    const label = row.status || 'Unknown';
    const count = toCount(row.count);
    byStatus[label] = (byStatus[label] || 0) + count;
    total += count;
  }
  return { total, byStatus };
}

async function fetchAccountBase(accountId) {
  const result = await pool.query(
    `
    SELECT
      a.account_id,
      a.type,
      a.handle,
      a.display_name,
      a.status,
      a.created_at,
      a.introduction,
      a.budget_credits,
      a.suspension_ends_at,
      a.ban_ends_at,
      a.lock_ends_at,
      a.deactivated_at,
      u.user_id,
      t.team_id
    FROM accounts a
    LEFT JOIN users u ON u.account_id = a.account_id
    LEFT JOIN teams t ON t.account_id = a.account_id AND t.deleted_at IS NULL
    WHERE a.account_id = $1
      AND a.deleted_at IS NULL
    `,
    [accountId]
  );
  return result.rows[0] || null;
}

/** Jobs, gigs, proposals, contracts, listings, reviews and followers for one account. */
async function fetchAccountWorkStats(accountId, { teamId = null } = {}) {
  const [jobs, gigs, proposals, contracts, listings, social, reviews] = await Promise.all([
    pool.query(
      `
      SELECT j.status, COUNT(*)::int AS count
      FROM jobs j
      WHERE j.deleted_at IS NULL
        AND (j.client_account_id = $1 OR ($2::uuid IS NOT NULL AND j.team_id = $2::uuid))
      GROUP BY j.status
      `,
      [accountId, teamId]
    ),
    pool.query(
      `
      SELECT g.status, COUNT(*)::int AS count
      FROM gigs g
      WHERE g.deleted_at IS NULL AND g.freelancer_account_id = $1
      GROUP BY g.status
      `,
      [accountId]
    ),
    pool.query(
      `
      SELECT p.status, COUNT(*)::int AS count
      FROM proposals p
      WHERE p.deleted_at IS NULL AND p.freelancer_account_id = $1
      GROUP BY p.status
      `,
      [accountId]
    ),
    pool.query(
      `
      WITH linked AS (
        SELECT c.contract_id, c.status, j.client_account_id AS client_id, p.freelancer_account_id AS freelancer_id
        FROM contracts c
        INNER JOIN job_contracts jc ON jc.contract_id = c.contract_id
        INNER JOIN proposals p ON p.proposal_id = jc.proposal_id
        INNER JOIN jobs j ON j.job_id = p.job_id
        UNION ALL
        SELECT c.contract_id, c.status, gr.client_account_id AS client_id, g.freelancer_account_id AS freelancer_id
        FROM contracts c
        INNER JOIN gig_contracts gc ON gc.contract_id = c.contract_id
        INNER JOIN gig_requests gr ON gr.gig_request_id = gc.gig_request_id
        INNER JOIN gig_tiers gt ON gt.gig_tier_id = gr.gig_tier_id
        INNER JOIN gigs g ON g.gig_id = gt.gig_id
      )
      SELECT
        CASE WHEN client_id = $1 THEN 'client' ELSE 'freelancer' END AS side,
        status,
        COUNT(DISTINCT contract_id)::int AS count
      FROM linked
      WHERE client_id = $1 OR freelancer_id = $1
      GROUP BY 1, 2
      `,
      [accountId]
    ),
    pool.query(
      `
      SELECT ml.status, COUNT(*)::int AS count
      FROM marketplace_listings ml
      WHERE ml.submitted_by_account_id = $1
      GROUP BY ml.status
      `,
      [accountId]
    ),
    pool.query(
      `
      SELECT
        (SELECT COUNT(*)::int FROM account_followers WHERE followed_id = $1) AS followers,
        (SELECT COUNT(*)::int FROM account_followers WHERE follower_id = $1) AS following
      `,
      [accountId]
    ),
    pool.query(
      `
      SELECT
        COALESCE(ROUND(AVG(score)::numeric, 1), 0) AS average,
        COUNT(*)::int AS count
      FROM (
        SELECT r.stars_out_of_five::numeric AS score
        FROM ratings r
        WHERE r.account_id = $1 AND r.deleted_at IS NULL
        UNION ALL
        SELECT tr.rating::numeric AS score
        FROM team_reviews tr
        WHERE $2::uuid IS NOT NULL AND tr.team_id = $2::uuid
      ) scores
      `,
      [accountId, teamId]
    ),
  ]);

  const asClient = contracts.rows.filter((r) => r.side === 'client');
  const asFreelancer = contracts.rows.filter((r) => r.side === 'freelancer');

  return {
    jobs: statusBreakdown(jobs.rows),
    gigs: statusBreakdown(gigs.rows),
    proposals: statusBreakdown(proposals.rows),
    contractsAsClient: statusBreakdown(asClient),
    contractsAsFreelancer: statusBreakdown(asFreelancer),
    listings: statusBreakdown(listings.rows),
    followers: toCount(social.rows[0]?.followers),
    following: toCount(social.rows[0]?.following),
    rating: {
      average: Number(reviews.rows[0]?.average || 0),
      count: toCount(reviews.rows[0]?.count),
    },
  };
}

/** Completed credit movement in and out of the account's own wallets, grouped by type. */
async function fetchAccountCreditTotals(accountId) {
  const result = await pool.query(
    `
    WITH own AS (
      SELECT aw.wallet_id
      FROM account_wallets aw
      INNER JOIN wallets w ON w.wallet_id = aw.wallet_id
      WHERE aw.account_id = $1 AND w.type = 'account wallets'
    )
    SELECT
      ct.type,
      COALESCE(SUM(ct.amount_credits) FILTER (WHERE ct.destination_wallet_id IN (SELECT wallet_id FROM own)), 0) AS received,
      COALESCE(SUM(ct.amount_credits) FILTER (WHERE ct.source_wallet_id IN (SELECT wallet_id FROM own)), 0) AS sent,
      MAX(ct.created_at) AS last_at
    FROM credit_transactions ct
    WHERE ct.status = 'Completed'
      AND (ct.source_wallet_id IN (SELECT wallet_id FROM own) OR ct.destination_wallet_id IN (SELECT wallet_id FROM own))
    GROUP BY ct.type
    `,
    [accountId]
  );

  const byType = new Map(result.rows.map((r) => [String(r.type), r]));
  const received = (type) => Number(byType.get(type)?.received || 0);
  const sent = (type) => Number(byType.get(type)?.sent || 0);
  let totalReceived = 0;
  let totalSent = 0;
  let lastAt = null;
  for (const row of result.rows) {
    totalReceived += Number(row.received || 0);
    totalSent += Number(row.sent || 0);
    if (row.last_at && (!lastAt || new Date(row.last_at) > new Date(lastAt))) lastAt = row.last_at;
  }

  return {
    totalReceived,
    totalSent,
    contractEarnings: received(CREDIT_TRANSACTION_TYPE.ESCROW_RELEASE),
    assetSales: received(CREDIT_TRANSACTION_TYPE.ASSET_PURCHASE),
    assetSpending: sent(CREDIT_TRANSACTION_TYPE.ASSET_PURCHASE),
    cashedOut: Math.max(
      0,
      sent(CREDIT_TRANSACTION_TYPE.CASHOUT) - received(CREDIT_TRANSACTION_TYPE.CASHOUT_REFUND)
    ),
    lastTransactionAt: lastAt,
  };
}

/** Projects a user owns or belongs to. */
async function fetchUserProjectStats(userId) {
  if (!userId) return { owned: 0, member: 0 };
  const result = await pool.query(
    `
    SELECT
      COUNT(*) FILTER (WHERE LOWER(pm.role) = 'owner')::int AS owned,
      COUNT(*)::int AS member
    FROM project_members pm
    INNER JOIN projects p ON p.project_id = pm.project_id
    WHERE pm.user_id = $1
      AND pm.deleted_at IS NULL
      AND p.deleted_at IS NULL
    `,
    [userId]
  );
  return {
    owned: toCount(result.rows[0]?.owned),
    member: toCount(result.rows[0]?.member),
  };
}

/** Team settings and the full roster (active members, pending invites, and who invited them). */
async function fetchTeamProfile(teamId) {
  const [teamResult, membersResult] = await Promise.all([
    pool.query(
      `
      SELECT t.team_id, t.visibility, t.join_policy, t.category, t.website, t.location,
             t.team_type, t.created_at, t.updated_at
      FROM teams t
      WHERE t.team_id = $1
      `,
      [teamId]
    ),
    pool.query(
      `
      SELECT
        tm.user_id,
        tm.role,
        tm.status,
        tm.joined_at,
        tm.invited_at,
        tm.invitation_expires_at,
        u.email_address,
        u.first_name,
        u.last_name,
        a.account_id,
        a.handle,
        a.display_name,
        a.status AS account_status,
        f.path AS avatar_path,
        ia.display_name AS invited_by_name
      FROM team_members tm
      INNER JOIN users u ON u.user_id = tm.user_id
      INNER JOIN accounts a ON a.account_id = u.account_id
      LEFT JOIN files f ON f.file_id = a.avatar_file_id
      LEFT JOIN accounts ia ON ia.account_id = tm.invited_by_account_id
      WHERE tm.team_id = $1
        AND tm.deleted_at IS NULL
      ORDER BY
        CASE LOWER(tm.role) WHEN 'owner' THEN 0 WHEN 'leader' THEN 1 WHEN 'manager' THEN 2 ELSE 3 END,
        tm.joined_at ASC NULLS LAST
      `,
      [teamId]
    ),
  ]);

  const team = teamResult.rows[0] || null;
  const members = membersResult.rows.map((row) => ({
    userId: row.user_id,
    accountId: row.account_id,
    name:
      [row.first_name, row.last_name].filter(Boolean).join(' ').trim() ||
      row.display_name ||
      row.handle ||
      'Unnamed member',
    username: row.handle || null,
    email: row.email_address || null,
    avatarPath: row.avatar_path || null,
    role: row.role || 'Member',
    status: row.status || 'Active',
    accountStatus: row.account_status || null,
    joinedAt: row.joined_at || null,
    invitedAt: row.invited_at || null,
    invitationExpiresAt: row.invitation_expires_at || null,
    invitedByName: row.invited_by_name || null,
  }));

  return {
    settings: team
      ? {
          visibility: team.visibility || null,
          joinPolicy: team.join_policy || null,
          category: team.category || null,
          website: team.website || null,
          location: team.location || null,
          teamType: team.team_type || null,
          updatedAt: team.updated_at || null,
        }
      : null,
    members,
  };
}

/** Latest action the account itself took, by account id (staff actions on the account are excluded). */
async function fetchLastActivityForAccounts(accountIds) {
  if (!accountIds.length) return new Map();
  const result = await pool.query(
    `
    SELECT account_id, MAX(at) AS last_at
    FROM (
      SELECT aa.actor_account_id AS account_id, MAX(aa.created_at)::timestamptz AS at
      FROM account_activity aa
      WHERE aa.actor_account_id = ANY($1::uuid[])
      GROUP BY aa.actor_account_id
      UNION ALL
      SELECT aw.account_id, MAX(ct.created_at)::timestamptz AS at
      FROM credit_transactions ct
      INNER JOIN account_wallets aw ON aw.wallet_id IN (ct.source_wallet_id, ct.destination_wallet_id)
      WHERE aw.account_id = ANY($1::uuid[])
      GROUP BY aw.account_id
    ) recent
    GROUP BY account_id
    `,
    [accountIds]
  );
  return new Map(result.rows.map((r) => [r.account_id, r.last_at]));
}

/**
 * Forum discussions, comments and likes for a member. Forum documents store the
 * author as either the user id or the account id, so both are matched.
 */
async function fetchForumStatsForMember(authorIds) {
  const ids = authorIds.filter(Boolean).map(String);
  const empty = { available: false, discussions: 0, comments: 0, likesReceived: 0, savesReceived: 0, lastPostAt: null };
  if (!ids.length) return empty;

  let client = getMongoClient();
  if (!client) client = await connectMongoDB();
  if (!client) return empty;

  const collection = client.db('ensemble').collection('forum_discussions');
  const notDeleted = { $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }] };
  const authoredBy = { $in: [{ $toString: '$user_id' }, ids] };

  const [authored] = await collection
    .aggregate([
      { $match: notDeleted },
      { $match: { $expr: authoredBy } },
      {
        $group: {
          _id: null,
          discussions: { $sum: 1 },
          likesReceived: { $sum: { $size: { $ifNull: ['$likes', []] } } },
          savesReceived: { $sum: { $size: { $ifNull: ['$saves', []] } } },
          lastPostAt: { $max: { $convert: { input: '$created_at', to: 'date', onError: null, onNull: null } } },
        },
      },
    ])
    .toArray();

  const [commented] = await collection
    .aggregate([
      { $match: notDeleted },
      { $unwind: '$comments' },
      {
        $match: {
          $expr: { $in: [{ $toString: '$comments.user_id' }, ids] },
          'comments.comment': { $ne: '[deleted]' },
        },
      },
      {
        $group: {
          _id: null,
          comments: { $sum: 1 },
          lastCommentAt: { $max: { $convert: { input: '$comments.created_at', to: 'date', onError: null, onNull: null } } },
        },
      },
    ])
    .toArray();

  const lastPostAt = [authored?.lastPostAt, commented?.lastCommentAt]
    .filter(Boolean)
    .sort((a, b) => new Date(b) - new Date(a))[0] || null;

  return {
    available: true,
    discussions: toCount(authored?.discussions),
    comments: toCount(commented?.comments),
    likesReceived: toCount(authored?.likesReceived),
    savesReceived: toCount(authored?.savesReceived),
    lastPostAt,
  };
}

module.exports = {
  fetchAccountBase,
  fetchAccountWorkStats,
  fetchAccountCreditTotals,
  fetchUserProjectStats,
  fetchTeamProfile,
  fetchLastActivityForAccounts,
  fetchForumStatsForMember,
};
