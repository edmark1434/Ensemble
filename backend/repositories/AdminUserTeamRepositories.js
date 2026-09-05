const { pool } = require('../lib/Database');
const { CREDIT_TRANSACTION_TYPE } = require('../lib/CreditTransactionEnums');
const { violationExpiryFromPoints, isViolationActive } = require('./ModeratorRepositories');

function normalizeStatus(status) {
  if (!status) return 'Pending';
  const s = String(status).toLowerCase();
  if (s === 'active') return 'Active';
  if (s.includes('suspend')) return 'Suspended';
  if (s.includes('ban')) return 'Banned';
  if (s.includes('lock')) return 'Locked';
  return status;
}

function mapVerificationLabel(raw, { forTeam = false } = {}) {
  const s = String(raw || 'unverified').toLowerCase();
  if (s === 'reverification_required' || s === 'expired') {
    return 'Reverification Required';
  }
  if (s === 'verified' || s === 'approved' || s === 'business verified') {
    return forTeam ? 'Business Verified' : 'Verified';
  }
  if (s.includes('pending') || s.includes('review')) return 'Pending Review';
  if (s.includes('partial')) return 'Partially Verified';
  if (s.includes('declin') || s.includes('reject')) return 'Unverified';
  return 'Unverified';
}

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

function mapUserRow(row) {
  const name =
    [row.first_name, row.last_name].filter(Boolean).join(' ').trim() ||
    row.display_name ||
    'Unnamed member';
  return {
    id: row.user_id,
    accountId: row.account_id,
    name,
    email: row.email_address,
    username: row.handle,
    displayName: row.display_name,
    status: normalizeStatus(row.status),
    meritCredits: row.merit_score ?? 0,
    verificationStatus: mapVerificationLabel(row.verification_status),
    joinedAt: row.created_at,
    lastSeenAt: row.created_at,
    hasAvatar: Boolean(row.avatar_file_id),
    avatarPath: row.avatar_path || null,
    tagline: row.tagline || null,
    description: row.description || null,
    hasPaymentProfile: Boolean(row.customer_id),
    hasFirebase: Boolean(row.firebase_user_uuid),
    walletBalance: Number(row.balance_credits || 0),
    frozenBalance: Number(row.frozen_balance_credits || 0),
    profile: {
      firstName: row.first_name || null,
      middleName: row.middle_name || null,
      lastName: row.last_name || null,
      suffix: row.suffix || null,
      birthDate: row.birth_date || null,
      country: row.country || null,
      address: row.address || null,
      zipCode: row.zip_code ?? null,
      isEmailVerified: Boolean(row.is_email_verified),
      completedOnboarding: row.completed_onboarding || null,
      subscriptionPlan: row.subscription_plan || null,
    },
    verificationMeta: {
      account_id: row.account_id,
      account_verification_id: row.account_verification_id,
      verification_status: row.verification_status,
      verification_session_id: row.verification_session_id,
      didit_session_id: row.didit_session_id,
      session_status: row.session_status,
      kyc_status: row.kyc_status,
      verification_expires_at: row.verification_expires_at,
      verification_updated_at: row.verification_updated_at,
      created_at: row.created_at,
      verified_by_name: row.verified_by_name,
    },
  };
}

async function fetchCreditActivityForAccounts(accountIds) {
  if (!accountIds.length) return new Map();

  const result = await pool.query(
    `
    SELECT
      aw.account_id,
      ct.credit_transaction_id,
      ct.type,
      ct.amount_credits,
      ct.status,
      ct.created_at,
      ct.source_wallet_id,
      ct.destination_wallet_id,
      aw.wallet_id AS account_wallet_id
    FROM credit_transactions ct
    INNER JOIN account_wallets aw
      ON aw.wallet_id IN (ct.source_wallet_id, ct.destination_wallet_id)
    WHERE aw.account_id = ANY($1::uuid[])
    ORDER BY ct.created_at DESC
    LIMIT 500
    `,
    [accountIds]
  );

  const map = new Map();
  for (const row of result.rows) {
    const list = map.get(row.account_id) || [];
    if (list.length >= 8) continue;
    const isCredit = String(row.destination_wallet_id) === String(row.account_wallet_id);
    const amount = Number(row.amount_credits || 0);
    list.push({
      id: row.credit_transaction_id,
      type: row.type || 'Credit transaction',
      amount: isCredit ? Math.abs(amount) : -Math.abs(amount),
      label: row.status || 'Completed',
      timeAgo: formatRelativeTime(row.created_at),
      positive: isCredit,
    });
    map.set(row.account_id, list);
  }
  return map;
}

async function fetchHistoryForAccounts(accountIds) {
  if (!accountIds.length) {
    return new Map();
  }

  const [violationsResult, disputesResult] = await Promise.all([
    pool.query(
      `
      SELECT
        v.violation_id,
        v.violation_number,
        v.account_id,
        v.type,
        v.reason,
        v.points,
        v.status,
        v.created_at,
        v.expires_at,
        v.deleted_at,
        COALESCE(sa.display_name, s.first_name || ' ' || s.last_name, 'Staff') AS issued_by
      FROM violations v
      LEFT JOIN staff s ON s.staff_id = v.staff_id
      LEFT JOIN accounts sa ON sa.account_id = s.account_id
      WHERE v.account_id = ANY($1::uuid[])
        AND v.deleted_at IS NULL
      ORDER BY v.created_at DESC
      `,
      [accountIds]
    ),
    pool.query(
      `
      SELECT
        d.dispute_id,
        d.dispute_number,
        d.title,
        d.description,
        d.status,
        d.opened_at,
        d.updated_at,
        d.by_account_id,
        d.for_account_id,
        COALESCE(sa.display_name, st.first_name || ' ' || st.last_name, 'Staff') AS handler_name,
        COALESCE(ra.display_name, ra.handle, 'Counterparty') AS against_name
      FROM disputes d
      LEFT JOIN staff st ON st.staff_id = d.handled_by_staff_id
      LEFT JOIN accounts sa ON sa.account_id = st.account_id
      LEFT JOIN accounts ra ON ra.account_id = d.for_account_id
      WHERE d.by_account_id = ANY($1::uuid[])
         OR d.for_account_id = ANY($1::uuid[])
      ORDER BY COALESCE(d.opened_at, d.created_at) DESC
      `,
      [accountIds]
    ),
  ]);

  const map = new Map();
  for (const accountId of accountIds) {
    map.set(accountId, { violations: [], disputes: [] });
  }

  for (const row of violationsResult.rows) {
    const bucket = map.get(row.account_id);
    if (!bucket) continue;
    const active = isViolationActive(row);
    const pastExpiry = Boolean(row.expires_at && new Date(row.expires_at).getTime() <= Date.now());
    bucket.violations.push({
      id: row.violation_number || row.violation_id,
      type: row.type || 'Violation',
      reason: row.reason || '—',
      points: Number(row.points || 0),
      by: row.issued_by,
      timeAgo: formatRelativeTime(row.created_at),
      expiresAt: row.expires_at || null,
      active,
      status: !active && pastExpiry ? 'expired' : row.status,
    });
  }

  for (const row of disputesResult.rows) {
    const relatedIds = [row.by_account_id, row.for_account_id].filter(Boolean);
    for (const accountId of relatedIds) {
      const bucket = map.get(accountId);
      if (!bucket) continue;
      bucket.disputes.push({
        id: row.dispute_number || row.dispute_id,
        title: row.title || 'Dispute',
        description: row.description || '—',
        status: row.status || 'open',
        by: row.handler_name,
        timeAgo: formatRelativeTime(row.opened_at || row.updated_at),
        against: row.against_name,
        handler: row.handler_name,
      });
    }
  }

  return map;
}

function buildHistory(accountId, historyMap) {
  const data = historyMap.get(accountId) || { violations: [], disputes: [] };
  const openDisputes = data.disputes.filter((d) => {
    const s = String(d.status).toLowerCase();
    return !s.includes('resolv') && !s.includes('closed') && !s.includes('dismiss');
  });
  const activeDisputes = openDisputes.map((d) => ({
    id: d.id,
    title: d.title,
    handler: d.handler || d.by || 'Staff',
    against: d.against || '—',
    description: d.description,
    status: d.status,
    by: d.by,
    timeAgo: d.timeAgo,
  }));
  const active = activeDisputes[0] || null;
  const caution =
    data.violations.some((v) => v.active !== false) || activeDisputes.length > 0;

  return {
    summaryLabel: caution
      ? 'Active, Under Review, Deal with Caution'
      : 'Active — Good standing',
    totalViolations: data.violations.length,
    totalDisputes: data.disputes.length,
    openDisputes: activeDisputes.length,
    activeDispute: active
      ? {
          title: active.title,
          handler: active.handler,
          against: active.against,
          description: active.description,
          status: active.status,
        }
      : null,
    activeDisputes,
    violations: data.violations.slice(0, 10),
    disputes: data.disputes.slice(0, 10).map(({ against, handler, ...rest }) => rest),
  };
}

function buildVerificationDetail(row) {
  const hasActivity = Boolean(row.verification_session_id);
  const label = hasActivity ? row.session_status || 'Pending' : 'No Verification Activity';
  const expiresAt = row.verification_expires_at || null;
  const isExpired = Boolean(expiresAt && new Date(expiresAt).getTime() <= Date.now());
  return {
    status: label,
    expiresAt,
    isExpired,
    reverificationDueDays: expiresAt
      ? Math.max(
          0,
          Math.ceil((new Date(expiresAt) - Date.now()) / 86400000)
        )
      : null,
    applicationId: row.account_verification_id || '—',
    document: null,
    logs: [
      {
        id: `vl-${row.account_id}`,
        title: hasActivity ? `Verification session status: ${label}` : 'No verification activity',
        timeAgo: formatRelativeTime(row.verification_updated_at || row.created_at),
        by: row.verified_by_name || 'System',
        ref: row.account_verification_id || '—',
      },
    ],
  };
}

async function markExpiredVerificationsForReverification() {
  await pool.query(`
    UPDATE account_verification
    SET status = 'reverification_required',
        updated_at = NOW()
    WHERE LOWER(COALESCE(status, '')) = 'verified'
      AND expires_at IS NOT NULL
      AND expires_at <= NOW()
      AND deleted_at IS NULL
  `);
}

async function fetchAllUsers() {
  const result = await pool.query(`
    SELECT
      u.user_id,
      u.account_id,
      u.first_name,
      u.middle_name,
      u.last_name,
      u.suffix,
      u.email_address,
      u.firebase_user_uuid,
      u.customer_id,
      u.birth_date,
      u.country,
      u.zip_code,
      u.address,
      u.is_email_verified,
      u.completed_onboarding,
      a.handle,
      a.display_name,
      a.status,
      a.merit_score,
      a.created_at,
      a.avatar_file_id,
      a.tagline,
      a.description,
      f.path AS avatar_path,
      p.name AS subscription_plan,
      v.verification_id AS account_verification_id,
      CASE WHEN COALESCE(v.is_verified, FALSE) THEN 'verified' ELSE 'unverified' END AS verification_status,
      v.verification_session_id,
      avs.didit_session_id,
      avs.verification_status AS session_status,
      avs.kyc_status,
      avs.expires_at AS verification_expires_at,
      COALESCE(avs.updated_at, v.updated_at) AS verification_updated_at,
      NULL::text AS verified_by_name,
      w.balance_credits,
      w.frozen_balance_credits
    FROM users u
    INNER JOIN accounts a ON a.account_id = u.account_id
    LEFT JOIN files f ON f.file_id = a.avatar_file_id
    LEFT JOIN LATERAL (
      SELECT pl.name
      FROM subscriptions s
      INNER JOIN plans pl ON pl.plan_id = s.plan_id
      WHERE s.user_id = u.user_id
      ORDER BY s.created_at DESC
      LIMIT 1
    ) p ON TRUE
    LEFT JOIN verifications v ON v.account_id = a.account_id
    LEFT JOIN account_verification_sessions avs
      ON avs.verification_session_id = v.verification_session_id
    LEFT JOIN LATERAL (
      SELECT w.balance_credits, w.frozen_balance_credits
      FROM account_wallets aw
      INNER JOIN wallets w ON w.wallet_id = aw.wallet_id
      WHERE aw.account_id = a.account_id
        AND w.type = 'account wallets'
      ORDER BY w.created_at DESC
      LIMIT 1
    ) w ON TRUE
    WHERE a.deleted_at IS NULL
    ORDER BY a.created_at DESC NULLS LAST, u.user_id DESC
  `);
  return result.rows.map(mapUserRow);
}

async function fetchTeamMembershipsForUsers(userIds) {
  if (!userIds.length) return new Map();

  const result = await pool.query(
    `
    SELECT
      tm.user_id,
      tm.role,
      tm.status AS membership_status,
      tm.joined_at,
      t.team_id,
      t.account_id AS team_account_id,
      a.display_name AS team_name,
      a.handle AS team_handle,
      a.status AS team_status,
      f.path AS team_avatar_path
    FROM team_members tm
    INNER JOIN teams t ON t.team_id = tm.team_id
    INNER JOIN accounts a ON a.account_id = t.account_id
    LEFT JOIN files f ON f.file_id = a.avatar_file_id
    WHERE tm.user_id = ANY($1::uuid[])
      AND tm.deleted_at IS NULL
      AND a.deleted_at IS NULL
    ORDER BY tm.joined_at DESC
    `,
    [userIds]
  );

  const memberships = new Map();
  for (const row of result.rows) {
    const list = memberships.get(row.user_id) || [];
    list.push({
      teamId: row.team_id,
      accountId: row.team_account_id,
      name: row.team_name || row.team_handle || 'Unnamed team',
      handle: row.team_handle || null,
      avatarPath: row.team_avatar_path || null,
      role: row.role || 'Member',
      membershipStatus: row.membership_status || 'Active',
      teamStatus: normalizeStatus(row.team_status),
      joinedAt: row.joined_at,
    });
    memberships.set(row.user_id, list);
  }
  return memberships;
}

async function getUserVerificationRecord(accountId) {
  const result = await pool.query(
    `
    SELECT
      v.verification_id,
      v.account_id,
      v.verification_session_id,
      v.is_verified,
      v.verified_at,
      v.updated_at AS verification_updated_at,
      a.type AS account_type,
      t.team_id,
      a.display_name AS team_name,
      avs.didit_session_id,
      avs.kyc_status,
      avs.verification_status AS internal_status,
      avs.verified_by_account_id,
      avs.expires_at,
      avs.created_at AS session_created_at,
      avs.updated_at AS session_updated_at,
      bvd.business_type,
      bvd.registered_business_name,
      bvd.registration_number,
      bvd.registration_country,
      bvd.relationship_to_business,
      bvd.submitted_by_account_id,
      bvd.submission_version,
      submitter.display_name AS submitted_by_name,
      submitter.handle AS submitted_by_handle,
      COALESCE((
        SELECT json_agg(json_build_object(
          'fileId', f.file_id,
          'name', f.name,
          'path', f.path,
          'mimeType', f.mime_type,
          'sizeBytes', f.size_bytes,
          'documentType', va.document_type,
          'index', va."index",
          'isRequired', va.is_required,
          'isLatest', va.is_latest,
          'submissionVersion', va.submission_version
        ) ORDER BY va."index")
        FROM verification_attachments va
        JOIN files f ON f.file_id = va.file_id
        WHERE va.verification_id = v.verification_id
          AND va.is_latest = TRUE
          AND f.deleted_at IS NULL
      ), '[]'::json) AS attachments
    FROM verifications v
    JOIN accounts a ON a.account_id = v.account_id
    LEFT JOIN teams t ON t.account_id = a.account_id
    LEFT JOIN account_verification_sessions avs
      ON avs.verification_session_id = v.verification_session_id
    LEFT JOIN business_verification_details bvd
      ON bvd.verification_id = v.verification_id
    LEFT JOIN accounts submitter
      ON submitter.account_id = bvd.submitted_by_account_id
    WHERE v.account_id = $1
    LIMIT 1
    `,
    [accountId]
  );
  return result.rows[0] || null;
}

async function applyTeamVerificationAction(
  accountId,
  action,
  validityDays,
  verifiedByAccountId
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const statusMap = {
      approve: 'Approved',
      decline: 'Declined',
      reverify: 'Resubmitted',
    };
    const verificationStatus = statusMap[action];
    if (!verificationStatus) throw new Error('Unsupported Team verification action');

    const isApproved = action === 'approve';
    const result = await client.query(
      `UPDATE verifications v
       SET is_verified = $2::boolean,
           verified_at = CASE WHEN $2::boolean THEN NOW() ELSE NULL END,
           updated_at = NOW()
       FROM accounts a
       WHERE v.account_id = $1::uuid
         AND a.account_id = v.account_id
         AND a.type = 'Team'
       RETURNING v.*`,
      [accountId, isApproved]
    );
    if (!result.rows[0]) throw new Error('Team verification was not found');

    const sessionResult = await client.query(
      `UPDATE account_verification_sessions avs
       SET verification_status = $2::varchar,
           verified_by_account_id = $3::uuid,
           expires_at = CASE
             WHEN $2::varchar = 'Approved'::varchar
             THEN NOW() + ($4::int * INTERVAL '1 day')
             ELSE NULL
           END,
           updated_at = NOW()
       FROM verifications v
       WHERE v.account_id = $1::uuid
         AND avs.verification_session_id = v.verification_session_id
       RETURNING avs.*`,
      [accountId, verificationStatus, verifiedByAccountId, validityDays]
    );
    if (!sessionResult.rows[0]) throw new Error('Team verification session was not found');

    await client.query('COMMIT');
    return {
      verification: result.rows[0],
      session: sessionResult.rows[0],
      verificationStatus,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function updateUserVerificationExpiry(accountId, validityDays, verifiedByAccountId) {
  const result = await pool.query(
    `
    WITH current_verification AS (
      SELECT
        avs.verification_session_id,
        (
          avs.expires_at IS NULL
          OR v.verified_at IS NULL
          OR ABS(EXTRACT(EPOCH FROM (avs.expires_at - v.verified_at)) - ($2::int * 86400)) > 60
        ) AS expiry_changed
      FROM account_verification_sessions avs
      JOIN verifications v
        ON avs.verification_session_id = v.verification_session_id
      WHERE v.account_id = $1
    )
    UPDATE account_verification_sessions avs
    SET expires_at = CASE
          WHEN cv.expiry_changed THEN NOW() + ($2::int * INTERVAL '1 day')
          ELSE avs.expires_at
        END,
        verified_by_account_id = $3,
        updated_at = NOW()
    FROM current_verification cv
    WHERE avs.verification_session_id = cv.verification_session_id
    RETURNING avs.expires_at, cv.expiry_changed
    `,
    [accountId, validityDays, verifiedByAccountId]
  );
  return result.rows[0] || null;
}

async function prepareUserVerificationApprovalExpiry(accountId, validityDays, verifiedByAccountId) {
  const result = await pool.query(
    `
    UPDATE account_verification_sessions avs
    SET expires_at = CASE
          WHEN $2::int = 365 THEN NULL
          ELSE NOW() + ($2::int * INTERVAL '1 day')
        END,
        verified_by_account_id = $3,
        updated_at = NOW()
    FROM verifications v
    WHERE v.account_id = $1
      AND avs.verification_session_id = v.verification_session_id
    RETURNING avs.expires_at
    `,
    [accountId, validityDays, verifiedByAccountId]
  );
  return result.rows[0] || null;
}

async function restoreUserVerificationExpiry(accountId, expiresAt, verifiedByAccountId) {
  await pool.query(
    `
    UPDATE account_verification_sessions avs
    SET expires_at = $2,
        verified_by_account_id = $3,
        updated_at = NOW()
    FROM verifications v
    WHERE v.account_id = $1
      AND avs.verification_session_id = v.verification_session_id
    `,
    [accountId, expiresAt || null, verifiedByAccountId || null]
  );
}

async function markUserVerificationPending(accountId) {
  await pool.query(
    `
    UPDATE verifications
    SET is_verified = FALSE, verified_at = NULL, updated_at = NOW()
    WHERE account_id = $1
    `,
    [accountId]
  );
  await pool.query(
    `
    UPDATE account_verification_sessions avs
    SET verification_status = 'Pending', updated_at = NOW()
    FROM verifications v
    WHERE v.account_id = $1
      AND avs.verification_session_id = v.verification_session_id
    `,
    [accountId]
  );
}

async function fetchTeamsFromDatabase() {
  const teamsResult = await pool.query(`
    SELECT
      t.team_id,
      t.account_id,
      a.handle,
      a.display_name,
      a.status,
      a.merit_score,
      a.created_at,
      a.avatar_file_id,
      a.tagline,
      a.description,
      f.path AS avatar_path,
      v.verification_id AS account_verification_id,
      CASE
        WHEN LOWER(COALESCE(avs.verification_status, '')) = 'approved'
          AND avs.expires_at IS NOT NULL
          AND avs.expires_at <= NOW()
        THEN 'reverification_required'
        ELSE avs.verification_status
      END AS verification_status,
      avs.expires_at AS verification_expires_at,
      COALESCE(avs.updated_at, v.updated_at) AS verification_updated_at,
      va.display_name AS verified_by_name,
      w.balance_credits,
      w.frozen_balance_credits,
      w.wallet_id,
      (
        SELECT COUNT(*)::int
        FROM team_members tm
        WHERE tm.team_id = t.team_id AND tm.deleted_at IS NULL
      ) AS member_count
    FROM teams t
    INNER JOIN accounts a ON a.account_id = t.account_id
    LEFT JOIN files f ON f.file_id = a.avatar_file_id
    LEFT JOIN verifications v ON v.account_id = a.account_id
    LEFT JOIN account_verification_sessions avs
      ON avs.verification_session_id = v.verification_session_id
    LEFT JOIN accounts va ON va.account_id = avs.verified_by_account_id
    LEFT JOIN LATERAL (
      SELECT w.wallet_id, w.balance_credits, w.frozen_balance_credits
      FROM account_wallets aw
      INNER JOIN wallets w ON w.wallet_id = aw.wallet_id
      WHERE aw.account_id = a.account_id
        AND w.type = 'account wallets'
      ORDER BY w.created_at DESC
      LIMIT 1
    ) w ON TRUE
    WHERE a.deleted_at IS NULL
    ORDER BY a.created_at DESC
  `);

  if (!teamsResult.rows.length) return [];

  const teamIds = teamsResult.rows.map((r) => r.team_id);
  const membersResult = await pool.query(
    `
    SELECT
      tm.team_id,
      tm.role,
      tm.status AS member_status,
      tm.joined_at,
      u.user_id,
      u.email_address,
      u.first_name,
      u.last_name,
      a.handle,
      a.display_name
    FROM team_members tm
    INNER JOIN users u ON u.user_id = tm.user_id
    INNER JOIN accounts a ON a.account_id = u.account_id
    WHERE tm.team_id = ANY($1::uuid[])
      AND tm.deleted_at IS NULL
    ORDER BY
      CASE WHEN LOWER(tm.role) LIKE '%leader%' THEN 0 ELSE 1 END,
      tm.joined_at ASC
    `,
    [teamIds]
  );

  const membersByTeam = new Map();
  for (const row of membersResult.rows) {
    const list = membersByTeam.get(row.team_id) || [];
    const name =
      [row.first_name, row.last_name].filter(Boolean).join(' ').trim() ||
      row.display_name ||
      row.handle;
    list.push({
      id: row.user_id,
      name,
      email: row.email_address,
      username: row.handle,
      role: row.role || 'Member',
    });
    membersByTeam.set(row.team_id, list);
  }

  const accountIds = teamsResult.rows.map((r) => r.account_id);
  const [creditMap, historyMap, assetStats] = await Promise.all([
    fetchCreditActivityForAccounts(accountIds),
    fetchHistoryForAccounts(accountIds),
    pool.query(
      `
      SELECT submitted_by_account_id AS account_id,
        COUNT(*)::int AS listing_count,
        COALESCE(SUM(price_credits), 0)::int AS listing_value
      FROM marketplace_listings
      WHERE submitted_by_account_id = ANY($1::uuid[])
      GROUP BY submitted_by_account_id
      `,
      [accountIds]
    ).catch(() => ({ rows: [] })),
  ]);

  const assetsByAccount = new Map(
    assetStats.rows.map((r) => [r.account_id, r])
  );

  return teamsResult.rows.map((row) => {
    const members = membersByTeam.get(row.team_id) || [];
    const leader = members[0] || {
      id: null,
      name: row.display_name || row.handle || 'Unknown',
      email: '',
      username: row.handle,
      role: 'Team Leader',
    };
    const teamName = row.display_name || row.handle || 'Unnamed team';
    const assets = assetsByAccount.get(row.account_id) || { listing_count: 0, listing_value: 0 };
    const balance = Number(row.balance_credits || 0);

    return {
      id: row.team_id,
      accountId: row.account_id,
      name: teamName,
      logoInitial: (teamName || 'T').charAt(0).toUpperCase(),
      avatarPath: row.avatar_path || null,
      handle: row.handle || null,
      tagline: row.tagline || null,
      description: row.description || null,
      meritCredits: row.merit_score ?? 0,
      walletBalance: Number(row.balance_credits || 0),
      frozenBalance: Number(row.frozen_balance_credits || 0),
      leaderName: leader.name,
      leaderId: leader.id,
      leaderEmail: leader.email,
      memberCount: members.length || Number(row.member_count || 0),
      members,
      email: leader.email || `${(row.handle || 'team').toLowerCase()}@ensemble.app`,
      verificationStatus: mapVerificationLabel(row.verification_status, { forTeam: true }),
      status: normalizeStatus(row.status),
      lastSeenAt: row.created_at,
      createdAt: row.created_at,
      stats: {
        totalAssets: Number(assets.listing_count || 0),
        totalCredits: balance,
        totalJobs: 0,
        totalJobEarnings: 0,
        totalRevenue: Number(assets.listing_value || 0),
        totalPosts: 0,
        totalReactions: 0,
        totalComments: 0,
      },
      documents: [],
      creditActivity: creditMap.get(row.account_id) || [],
      verification: buildVerificationDetail(row),
      history: buildHistory(row.account_id, historyMap),
    };
  });
}

function computeTeamStats(teams) {
  const suspended = teams.filter((t) => t.status === 'Suspended').length;
  const banned = teams.filter((t) => t.status === 'Banned').length;
  const active = teams.filter((t) => t.status === 'Active').length;
  const verified = teams.filter((t) => t.verificationStatus === 'Business Verified').length;
  const unverified = teams.filter((t) => t.verificationStatus === 'Unverified').length;
  const pending = teams.filter(
    (t) =>
      t.verificationStatus === 'Pending Review' ||
      t.verificationStatus === 'Reverification Required'
  ).length;

  return {
    totalSuspended: suspended,
    totalBanned: banned,
    totalTeams: teams.length,
    totalActive: active,
    totalVerifiedBusinesses: verified,
    totalUnverifiedBusiness: unverified,
    totalPendingVerification: pending,
  };
}

function computeUserStats(users) {
  const suspended = users.filter((u) => u.status === 'Suspended').length;
  const banned = users.filter((u) => u.status === 'Banned').length;
  const active = users.filter((u) => u.status === 'Active').length;
  const pending = users.filter(
    (u) => {
      const sessionStatus = String(u.verificationMeta?.session_status || '').toLowerCase();
      return u.status === 'Pending' || (
        u.verificationStatus !== 'Verified' &&
        (sessionStatus.includes('pending') ||
          sessionStatus.includes('review') ||
          sessionStatus.includes('progress') ||
          sessionStatus.includes('awaiting'))
      );
    }
  ).length;
  const verified = users.filter((u) => u.verificationStatus === 'Verified').length;
  const unverified = users.filter((u) => u.verificationStatus === 'Unverified').length;

  return {
    totalSuspended: suspended,
    totalBanned: banned,
    totalUsers: users.length,
    totalActive: active,
    totalVerified: verified,
    totalUnverified: unverified,
    totalPendingVerification: pending,
  };
}

async function getTeamsManagement() {
  await markExpiredVerificationsForReverification();
  const teams = await fetchTeamsFromDatabase();
  return {
    stats: computeTeamStats(teams),
    teams,
    lastUpdated: new Date().toISOString(),
  };
}

async function getUsersManagement() {
  await markExpiredVerificationsForReverification();
  const users = await fetchAllUsers();
  const accountIds = users.map((u) => u.accountId);
  const userIds = users.map((u) => u.id);
  const [creditMap, historyMap, assetStats, membershipsMap] = await Promise.all([
    fetchCreditActivityForAccounts(accountIds),
    fetchHistoryForAccounts(accountIds),
    accountIds.length
      ? pool.query(
          `
          SELECT submitted_by_account_id AS account_id, COUNT(*)::int AS listing_count
          FROM marketplace_listings
          WHERE submitted_by_account_id = ANY($1::uuid[])
          GROUP BY submitted_by_account_id
          `,
          [accountIds]
        ).catch(() => ({ rows: [] }))
      : { rows: [] },
    fetchTeamMembershipsForUsers(userIds),
  ]);
  const assetsByAccount = new Map(assetStats.rows.map((r) => [r.account_id, r.listing_count]));

  const enriched = users.map((u) => {
    const { verificationMeta, walletBalance, ...rest } = u;
    return {
      ...rest,
      profileId: `USR-${String(u.id).slice(0, 8).toUpperCase()}`,
      teams: membershipsMap.get(u.id) || [],
      creditActivity: creditMap.get(u.accountId) || [],
      verification: buildVerificationDetail(
        verificationMeta || {
          account_id: u.accountId,
          verification_status: u.verificationStatus,
          created_at: u.joinedAt,
        }
      ),
      history: buildHistory(u.accountId, historyMap),
      stats: {
        totalAssets: Number(assetsByAccount.get(u.accountId) || 0),
        totalCredits: walletBalance,
        totalJobs: 0,
        totalPosts: 0,
      },
    };
  });

  return {
    stats: computeUserStats(users),
    users: enriched,
    lastUpdated: new Date().toISOString(),
  };
}

async function getUserTeamOverview() {
  const [teamsData, usersData] = await Promise.all([getTeamsManagement(), getUsersManagement()]);

  const users = usersData.users;
  const teams = teamsData.teams;

  const recentSignups = users.slice(0, 6).map((u) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    status: u.status,
    verificationStatus: u.verificationStatus,
    joinedAt: u.joinedAt,
  }));

  const spotlightTeams = teams.slice(0, 4).map((t) => ({
    id: t.id,
    name: t.name,
    leaderName: t.leaderName,
    memberCount: t.memberCount,
    status: t.status,
    verificationStatus: t.verificationStatus,
  }));

  const verificationBreakdown = {
    verified: users.filter((u) => u.verificationStatus === 'Verified').length,
    partial: users.filter((u) => u.verificationStatus === 'Partially Verified').length,
    unverified: users.filter((u) => u.verificationStatus === 'Unverified').length,
    pending: users.filter((u) => u.verificationStatus === 'Pending Review').length,
  };

  return {
    lastUpdated: new Date().toISOString(),
    teamStats: teamsData.stats,
    userStats: usersData.stats,
    totals: {
      teams: teams.length,
      users: users.length,
      combinedPending:
        teamsData.stats.totalPendingVerification + usersData.stats.totalPendingVerification,
      activeTeams: teamsData.stats.totalActive,
      activeUsers: usersData.stats.totalActive,
    },
    verificationBreakdown,
    recentSignups,
    spotlightTeams,
    statusBreakdown: {
      users: [
        { label: 'Active', count: usersData.stats.totalActive },
        { label: 'Suspended', count: usersData.stats.totalSuspended },
        { label: 'Banned', count: usersData.stats.totalBanned },
        { label: 'Pending verification', count: usersData.stats.totalPendingVerification },
      ],
      teams: [
        { label: 'Active', count: teamsData.stats.totalActive },
        { label: 'Suspended', count: teamsData.stats.totalSuspended },
        { label: 'Banned', count: teamsData.stats.totalBanned },
        { label: 'Pending verification', count: teamsData.stats.totalPendingVerification },
      ],
    },
    alerts: buildUserTeamAlerts(teamsData.stats, usersData.stats, verificationBreakdown),
  };
}

function buildUserTeamAlerts(teamStats, userStats, verification) {
  const alerts = [];
  const pending = teamStats.totalPendingVerification + userStats.totalPendingVerification;

  if (pending > 0) {
    alerts.push({
      id: 'pending',
      message: `${pending} account(s) need verification or approval across users and teams.`,
      severity: 'warning',
    });
  }
  if (verification.unverified > 0) {
    alerts.push({
      id: 'unverified',
      message: `${verification.unverified} user(s) have incomplete identity linkage.`,
      severity: 'info',
    });
  }
  if (teamStats.totalSuspended + userStats.totalSuspended > 0) {
    alerts.push({
      id: 'suspended',
      message: `${teamStats.totalSuspended + userStats.totalSuspended} suspended account(s) on record.`,
      severity: 'warning',
    });
  }
  if (teamStats.totalTeams === 0) {
    alerts.push({
      id: 'no-teams',
      message: 'No production teams found in the database yet.',
      severity: 'info',
    });
  }
  if (alerts.length === 0) {
    alerts.push({
      id: 'ok',
      message: 'User and team accounts look healthy from current database scan.',
      severity: 'success',
    });
  }
  return alerts;
}

const STATUS_MAP = {
  ban: 'Banned',
  banned: 'Banned',
  suspend: 'Suspended',
  suspended: 'Suspended',
  restore: 'Active',
  active: 'Active',
  unban: 'Active',
  unsuspend: 'Active',
  unlock: 'Active',
  lock: 'Locked',
  locked: 'Locked',
};

async function assertAccountExists(accountId) {
  const result = await pool.query(
    `SELECT account_id, handle, display_name, status, type
     FROM accounts WHERE account_id = $1 AND deleted_at IS NULL`,
    [accountId]
  );
  if (!result.rows.length) throw new Error('Account not found');
  return result.rows[0];
}

async function getAccountWallet(accountId) {
  const result = await pool.query(
    `
    SELECT w.wallet_id, w.balance_credits, w.frozen_balance_credits, w.status
    FROM wallets w
    INNER JOIN account_wallets aw ON aw.wallet_id = w.wallet_id
    WHERE aw.account_id = $1 AND w.type = 'account wallets'
    ORDER BY w.created_at DESC
    LIMIT 1
    `,
    [accountId]
  );
  return result.rows[0] || null;
}

async function updateAccountStatus(accountId, actionOrStatus) {
  await assertAccountExists(accountId);
  const key = String(actionOrStatus || '').toLowerCase();
  const status = STATUS_MAP[key] || null;
  if (!status) throw new Error(`Invalid account status action: ${actionOrStatus}`);

  await pool.query(`UPDATE accounts SET status = $1 WHERE account_id = $2`, [status, accountId]);
  return { accountId, status };
}

async function updateAccountVerification(accountId, action, staffId, options = {}) {
  await assertAccountExists(accountId);
  const key = String(action || '').toLowerCase();
  const statusMap = {
    approve: 'verified',
    approved: 'verified',
    verified: 'verified',
    decline: 'declined',
    declined: 'declined',
    reject: 'declined',
    pending: 'pending',
    reverify: 'reverification_required',
    reverification_required: 'reverification_required',
    unverified: 'unverified',
  };
  const nextStatus = statusMap[key];
  if (!nextStatus) throw new Error(`Invalid verification action: ${action}`);

  let validityDays = Number(options.validityDays);
  if (!Number.isFinite(validityDays) || validityDays <= 0) validityDays = 365;
  validityDays = Math.min(Math.max(Math.floor(validityDays), 1), 3650); // 1 day – 10 years

  const userAccount = await pool.query(
    `SELECT 1 FROM users WHERE account_id = $1 LIMIT 1`,
    [accountId]
  );

  if (userAccount.rows.length) {
    const isVerified = nextStatus === 'verified';
    await pool.query(
      `
      INSERT INTO verifications (account_id, is_verified, verified_at, created_at, updated_at)
      VALUES ($1, $2, CASE WHEN $2 THEN NOW() ELSE NULL END, NOW(), NOW())
      ON CONFLICT (account_id) DO UPDATE
      SET is_verified = EXCLUDED.is_verified,
          verified_at = EXCLUDED.verified_at,
          updated_at = NOW()
      `,
      [accountId, isVerified]
    );
    await pool.query(
      `
      UPDATE account_verification_sessions avs
      SET verification_status = $2,
          expires_at = CASE
            WHEN $2 = 'verified' THEN NOW() + ($3::int * INTERVAL '1 day')
            ELSE expires_at
          END,
          updated_at = NOW()
      FROM verifications v
      WHERE v.account_id = $1
        AND avs.verification_session_id = v.verification_session_id
      `,
      [accountId, nextStatus, validityDays]
    );
    return {
      accountId,
      verificationStatus: isVerified ? 'Verified' : 'Unverified',
      validityDays: isVerified ? validityDays : null,
    };
  }

  const existing = await pool.query(
    `
    SELECT account_verification_id
    FROM account_verification
    WHERE account_id = $1 AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [accountId]
  );

  if (existing.rows.length) {
    await pool.query(
      `
      UPDATE account_verification
      SET status = $1,
          updated_at = NOW(),
          verified_by_staff_id = $2,
          expires_at = CASE
            WHEN $1 = 'verified' THEN NOW() + ($4::int * INTERVAL '1 day')
            ELSE NULL
          END
      WHERE account_verification_id = $3
      `,
      [nextStatus, staffId || null, existing.rows[0].account_verification_id, validityDays]
    );
  } else {
    await pool.query(
      `
      INSERT INTO account_verification (account_id, status, created_at, updated_at, verified_by_staff_id, expires_at)
      VALUES (
        $1, $2, NOW(), NOW(), $3,
        CASE WHEN $2 = 'verified' THEN NOW() + ($4::int * INTERVAL '1 day') ELSE NULL END
      )
      `,
      [accountId, nextStatus, staffId || null, validityDays]
    );
  }

  return {
    accountId,
    verificationStatus: mapVerificationLabel(nextStatus),
    validityDays: nextStatus === 'verified' ? validityDays : null,
  };
}

async function adjustAccountCredits(accountId, amount, _note, staffId) {
  await assertAccountExists(accountId);
  const delta = Number(amount);
  if (!Number.isFinite(delta) || delta === 0) throw new Error('Credit amount must be a non-zero number');

  const wallet = await getAccountWallet(accountId);
  if (!wallet) throw new Error('No account wallet found for this account');

  const nextBalance = Number(wallet.balance_credits || 0) + delta;
  if (nextBalance < 0) throw new Error('Insufficient wallet balance for this adjustment');

  await pool.query(`UPDATE wallets SET balance_credits = $1 WHERE wallet_id = $2`, [
    nextBalance,
    wallet.wallet_id,
  ]);

  // Admin grants/deductions are always Fund Transfer (note is UI-only for now).
  await pool.query(
    `
    INSERT INTO credit_transactions (type, amount_credits, status, source_wallet_id, destination_wallet_id)
    VALUES ($1, $2, 'completed', $3, $3)
    `,
    [CREDIT_TRANSACTION_TYPE.FUND_TRANSFER, Math.abs(delta), wallet.wallet_id]
  );

  return {
    accountId,
    walletId: wallet.wallet_id,
    balanceCredits: nextBalance,
    adjustedBy: delta,
    staffId: staffId || null,
  };
}

async function freezeAccountCredits(accountId, freeze = true) {
  await assertAccountExists(accountId);
  const wallet = await getAccountWallet(accountId);
  if (!wallet) throw new Error('No account wallet found for this account');

  const balance = Number(wallet.balance_credits || 0);
  const frozen = Number(wallet.frozen_balance_credits || 0);

  if (freeze) {
    if (balance <= 0) throw new Error('No available credits to freeze');
    await pool.query(
      `UPDATE wallets
       SET balance_credits = 0,
           frozen_balance_credits = $1
       WHERE wallet_id = $2`,
      [frozen + balance, wallet.wallet_id]
    );
    await pool.query(
      `
      INSERT INTO credit_transactions (type, amount_credits, status, source_wallet_id, destination_wallet_id)
      VALUES ($1, $2, 'completed', $3, $3)
      `,
      [CREDIT_TRANSACTION_TYPE.ESCROW_HOLD, balance, wallet.wallet_id]
    );
    return {
      accountId,
      walletId: wallet.wallet_id,
      balanceCredits: 0,
      frozenBalanceCredits: frozen + balance,
      frozen: true,
    };
  }

  if (frozen <= 0) throw new Error('No frozen credits to restore');
  await pool.query(
    `UPDATE wallets
     SET balance_credits = $1,
         frozen_balance_credits = 0
     WHERE wallet_id = $2`,
    [balance + frozen, wallet.wallet_id]
  );
  await pool.query(
    `
    INSERT INTO credit_transactions (type, amount_credits, status, source_wallet_id, destination_wallet_id)
    VALUES ($1, $2, 'completed', $3, $3)
    `,
    [CREDIT_TRANSACTION_TYPE.ESCROW_RELEASE, frozen, wallet.wallet_id]
  );
  return {
    accountId,
    walletId: wallet.wallet_id,
    balanceCredits: balance + frozen,
    frozenBalanceCredits: 0,
    frozen: false,
  };
}

async function warnAccount(accountId, { type, reason, points, expiresAt } = {}, staffId) {
  await assertAccountExists(accountId);
  if (!staffId) throw new Error('Staff session required to issue a warning');

  const violationNumber = `VIO-${Date.now().toString().slice(-8)}`;
  const warnType = String(type || 'Account warning').trim() || 'Account warning';
  const warnReason = String(reason || 'Warning issued by administrator').trim();
  const warnPoints = Number(points) || 1;
  const expiry =
    expiresAt != null && expiresAt !== ''
      ? new Date(expiresAt)
      : violationExpiryFromPoints(warnPoints);

  await pool.query(
    `
    INSERT INTO violations (
      violation_number, account_id, type, reason, points,
      status, staff_id, expires_at
    ) VALUES ($1, $2, $3, $4, $5, 'active', $6, $7)
    `,
    [violationNumber, accountId, warnType, warnReason, warnPoints, staffId, expiry]
  );

  return {
    accountId,
    violationNumber,
    type: warnType,
    points: warnPoints,
    expiresAt: expiry,
  };
}

/**
 * Pardon: staff forgive an account's active violations / restrictions and
 * restore the account to Active. Records a row in `pardons` as an audit trail.
 */
async function pardonAccount(accountId, staffId, { note } = {}) {
  const account = await assertAccountExists(accountId);
  if (!staffId) throw new Error('Staff session required to issue a pardon');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const pardonRes = await client.query(
      `INSERT INTO pardons (account_id, staff_id) VALUES ($1, $2) RETURNING pardon_id, created_at`,
      [accountId, staffId]
    );

    const clearedViolations = await client.query(
      `
      UPDATE violations
      SET status = 'pardoned', deleted_at = COALESCE(deleted_at, NOW())
      WHERE account_id = $1
        AND deleted_at IS NULL
        AND LOWER(COALESCE(status, '')) IN ('active', 'open', 'pending')
        AND (expires_at IS NULL OR expires_at > NOW())
      RETURNING violation_id
      `,
      [accountId]
    );

    // End any open restrictions for this account (with or without a violation)
    await client.query(
      `
      UPDATE restrictions
      SET ends_at = NOW()
      WHERE account_id = $1
        AND (ends_at IS NULL OR ends_at > NOW())
      `,
      [accountId]
    ).catch(() => null);

    const previousStatus = account.status;
    await client.query(`UPDATE accounts SET status = 'Active' WHERE account_id = $1`, [accountId]);

    await client.query('COMMIT');

    return {
      accountId,
      pardonId: pardonRes.rows[0].pardon_id,
      pardonedAt: pardonRes.rows[0].created_at,
      previousStatus,
      status: 'Active',
      violationsCleared: clearedViolations.rowCount || 0,
      note: note || null,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  getTeamsManagement,
  getUsersManagement,
  getUserTeamOverview,
  updateAccountStatus,
  updateAccountVerification,
  adjustAccountCredits,
  freezeAccountCredits,
  warnAccount,
  pardonAccount,
  getUserVerificationRecord,
  updateUserVerificationExpiry,
  prepareUserVerificationApprovalExpiry,
  restoreUserVerificationExpiry,
  markUserVerificationPending,
  applyTeamVerificationAction,
};
