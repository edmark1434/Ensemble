const { pool } = require('../lib/Database');
const { CREDIT_TRANSACTION_TYPE } = require('../lib/CreditTransactionEnums');
const { isViolationActive } = require('./ModeratorRepositories');
const { meritFromWarningPoints } = require('../lib/WarningBands');
const {
  recordAccountActivity,
  fetchActivityForAccounts,
} = require('./AccountActivityRepositories');
const { fetchLastActivityForAccounts } = require('./AdminAccountProfileRepositories');
const {
  staffLedgerNoteJoins,
  STAFF_LEDGER_NOTE_COLUMNS,
  staffAdjustmentOf,
  staffHoldOf,
} = require('../lib/StaffLedgerNotes');

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
    forumTimeout: Boolean(row.forum_timeout),
    verificationStatus: mapVerificationLabel(row.verification_status),
    joinedAt: row.created_at,
    lastSeenAt: null,
    hasAvatar: Boolean(row.avatar_file_id),
    avatarPath: row.avatar_path || null,
    staffRole: row.staff_role || null,
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
      verification_url: row.verification_url || null,
      has_verification_url: Boolean(row.verification_url && row.verification_url.trim()),
      session_status: row.session_status,
      kyc_status: row.kyc_status,
      verification_expires_at: row.verification_expires_at,
      verification_updated_at: row.verification_updated_at,
      created_at: row.created_at,
      verified_by_name: row.verified_by_name,
      is_team: false,
    },
  };
}

const CREDIT_ACTIVITY_PER_ACCOUNT = 8;

/** How one ledger row reads on the staff credit feed, from the account's side. */
function describeCreditActivity(row) {
  const amount = Math.abs(Number(row.amount_credits || 0));
  const adjustment = staffAdjustmentOf(row);
  if (adjustment) {
    const sign = Math.sign(adjustment.delta || 0);
    return {
      type: sign > 0 ? 'Staff grant' : sign < 0 ? 'Staff deduction' : 'Staff adjustment (no recorded direction)',
      amount: sign < 0 ? -amount : amount,
      positive: sign > 0,
      tone: sign > 0 ? 'positive' : sign < 0 ? 'negative' : 'neutral',
      detail: adjustment.reason,
      holdUntil: null,
    };
  }
  const hold = staffHoldOf(row);
  if (hold) {
    // Spendable goes down by the held amount and back up on release; nothing leaves the wallet.
    return {
      type: hold.held
        ? 'Credits frozen by staff'
        : hold.source === 'hold_expired'
          ? 'Credit hold ended'
          : 'Credit hold released',
      amount: hold.held ? -amount : amount,
      positive: !hold.held,
      tone: 'hold',
      detail: hold.reason,
      holdUntil: hold.held ? hold.until : null,
    };
  }
  const isCredit = String(row.destination_wallet_id) === String(row.account_wallet_id);
  return {
    type: teamTransferLabel(row, isCredit) || row.type || 'Credit transaction',
    amount: isCredit ? amount : -amount,
    positive: isCredit,
    tone: isCredit ? 'positive' : 'negative',
    detail: null,
    holdUntil: null,
  };
}

/** Team wallet moves read as what they are: a member's deposit, a payout, a contract payout. */
function teamTransferLabel(row, isCredit) {
  const ownerIsTeam = String(row.owner_type || '').toLowerCase() === 'team';
  const otherIsTeam = String(row.counterparty_type || '').toLowerCase() === 'team';
  if (row.reference_table === 'teams') {
    if (ownerIsTeam) return isCredit ? 'Member deposit' : 'Paid out to member';
    if (otherIsTeam) return isCredit ? 'Received from team' : 'Added to team wallet';
  }
  if (ownerIsTeam && row.reference_table === 'contracts' && isCredit && row.type === 'Escrow Release') {
    return 'Contract payout to team';
  }
  return null;
}

/**
 * The latest ledger rows of each account for the staff user / team desks. The limit is per
 * account (a shared limit left quieter accounts with an empty feed).
 */
async function fetchCreditActivityForAccounts(accountIds) {
  if (!accountIds.length) return new Map();

  const result = await pool.query(
    `
    SELECT
      acc.account_id,
      ct.credit_transaction_id,
      ct.type,
      ct.amount_credits,
      ct.status,
      ct.created_at,
      ct.source_wallet_id,
      ct.destination_wallet_id,
      ct.reference_table,
      ct.account_wallet_id,
      owner_acc.type AS owner_type,
      cp.counterparty_name,
      cp.counterparty_handle,
      cp.counterparty_type,
      ${STAFF_LEDGER_NOTE_COLUMNS}
    FROM unnest($1::uuid[]) AS acc(account_id)
    LEFT JOIN accounts owner_acc ON owner_acc.account_id = acc.account_id
    CROSS JOIN LATERAL (
      SELECT
        t.credit_transaction_id,
        t.type,
        t.amount_credits,
        t.status,
        t.created_at,
        t.source_wallet_id,
        t.destination_wallet_id,
        t.reference_table,
        aw.wallet_id AS account_wallet_id
      FROM account_wallets aw
      INNER JOIN credit_transactions t
        ON aw.wallet_id IN (t.source_wallet_id, t.destination_wallet_id)
      WHERE aw.account_id = acc.account_id
      ORDER BY t.created_at DESC, t.credit_transaction_id DESC
      LIMIT $2
    ) ct
    ${staffLedgerNoteJoins({ ledger: 'ct', accountId: 'acc.account_id' })}
    LEFT JOIN LATERAL (
      -- The other side of the move (none for staff self-transfers).
      SELECT COALESCE(oa.display_name, oa.handle) AS counterparty_name,
             oa.handle AS counterparty_handle,
             oa.type AS counterparty_type
      FROM account_wallets oaw
      INNER JOIN accounts oa ON oa.account_id = oaw.account_id
      WHERE ct.source_wallet_id <> ct.destination_wallet_id
        AND oaw.wallet_id = CASE
          WHEN ct.destination_wallet_id = ct.account_wallet_id THEN ct.source_wallet_id
          ELSE ct.destination_wallet_id
        END
      LIMIT 1
    ) cp ON TRUE
    ORDER BY ct.created_at DESC
    `,
    [accountIds, CREDIT_ACTIVITY_PER_ACCOUNT]
  );

  const map = new Map();
  for (const row of result.rows) {
    const list = map.get(row.account_id) || [];
    list.push({
      id: row.credit_transaction_id,
      ...describeCreditActivity(row),
      counterparty: row.counterparty_name
        ? { name: row.counterparty_name, handle: row.counterparty_handle || null, isTeam: String(row.counterparty_type || '').toLowerCase() === 'team' }
        : null,
      label: row.status || 'Completed',
      timeAgo: formatRelativeTime(row.created_at),
      createdAt: row.created_at,
    });
    map.set(row.account_id, list);
  }
  return map;
}

async function fetchHistoryForAccounts(accountIds) {
  if (!accountIds.length) {
    return new Map();
  }

  // Warnings staff aimed at a team sit on the leader's account and name the team.
  const { teamWarningColumnReady } = require('../lib/SchemaFeatures');
  const teamColumn = await teamWarningColumnReady();
  const [violationsResult, disputesResult] = await Promise.all([
    pool.query(
      `
      SELECT
        v.violation_id,
        v.violation_number,
        v.account_id,
        ${teamColumn ? 'v.team_account_id' : 'NULL::uuid AS team_account_id'},
        ${teamColumn ? 'COALESCE(ta.display_name, ta.handle)' : 'NULL::text'} AS team_name,
        COALESCE(la.display_name, la.handle) AS account_name,
        la.handle AS account_handle,
        v.type,
        v.reason,
        v.points,
        -- Read through jsonb so this works before the warning-lift migration too.
        (to_jsonb(v) ->> 'points_original')::int AS points_original,
        v.status,
        v.created_at,
        v.expires_at,
        v.deleted_at,
        COALESCE(sa.display_name, s.first_name || ' ' || s.last_name, 'Staff') AS issued_by
      FROM violations v
      LEFT JOIN staff s ON s.staff_id = v.staff_id
      LEFT JOIN accounts sa ON sa.account_id = s.account_id
      LEFT JOIN accounts la ON la.account_id = v.account_id
      ${teamColumn ? 'LEFT JOIN accounts ta ON ta.account_id = v.team_account_id' : ''}
      WHERE (v.account_id = ANY($1::uuid[])${teamColumn ? ' OR v.team_account_id = ANY($1::uuid[])' : ''})
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
    const buckets = [map.get(row.account_id), row.team_account_id ? map.get(row.team_account_id) : null]
      .filter((bucket, index, list) => bucket && list.indexOf(bucket) === index);
    if (!buckets.length) continue;
    const active = isViolationActive(row);
    const pastExpiry = Boolean(row.expires_at && new Date(row.expires_at).getTime() <= Date.now());
    const item = {
      id: row.violation_number || row.violation_id,
      violationId: row.violation_id,
      // The account that carries the points (the leader, for a warning issued through a team).
      accountId: row.account_id,
      issuedToName: row.account_name || null,
      issuedToHandle: row.account_handle || null,
      viaTeamAccountId: row.team_account_id || null,
      viaTeamName: row.team_name || null,
      type: row.type || 'Violation',
      reason: row.reason || '—',
      points: Number(row.points || 0),
      // Issued points when staff lifted some (or all) of them; null when never lifted.
      originalPoints: row.points_original == null ? null : Number(row.points_original),
      by: row.issued_by,
      timeAgo: formatRelativeTime(row.created_at),
      expiresAt: row.expires_at || null,
      active,
      status: !active && pastExpiry ? 'expired' : row.status,
    };
    for (const bucket of buckets) bucket.violations.push(item);
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

function buildHistory(accountId, historyMap, activityMap = new Map(), { team = false } = {}) {
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
  const activity = activityMap.get(accountId) || [];
  // Each row weighs 1–10 (missing counts as 1), exactly like sumActiveWarningPoints.
  // A team's list holds the warnings issued to its leaders, so it has no merit of its own.
  const activePoints = data.violations
    .filter((v) => v.active && (!team || String(v.accountId) !== String(accountId)))
    .reduce((sum, v) => sum + Math.min(10, Math.max(1, Math.round(Number(v.points) || 1))), 0);

  return {
    summaryLabel: caution
      ? 'Active, Under Review, Deal with Caution'
      : 'Active — Good standing',
    merit: team ? null : meritFromWarningPoints(activePoints),
    activeWarningPoints: activePoints,
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
    activity,
  };
}

function buildVerificationDetail(row) {
  const hasActivity = Boolean(row.verification_session_id);
  const label = hasActivity ? row.session_status || 'Pending' : 'No Verification Activity';
  const expiresAt = row.verification_expires_at || null;
  const isExpired = Boolean(expiresAt && new Date(expiresAt).getTime() <= Date.now());
  const hasVerificationUrl = Boolean(row.verification_url && row.verification_url.trim());
  const isTeam = Boolean(row.is_team || row.account_type === 'team');
  return {
    status: label,
    expiresAt,
    isExpired,
    hasVerificationUrl,
    verificationUrl: row.verification_url || null,
    isTeam,
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

/**
 * Table-wide sweep that every user/team list awaits. Concurrent callers share one run,
 * and repeat sweeps are skipped for EXPIRY_SWEEP_INTERVAL_MS.
 */
const EXPIRY_SWEEP_INTERVAL_MS = 30 * 1000;
let expirySweepInFlight = null;
let lastExpirySweepAt = 0;

function markExpiredVerificationsForReverification() {
  if (expirySweepInFlight) return expirySweepInFlight;
  if (Date.now() - lastExpirySweepAt < EXPIRY_SWEEP_INTERVAL_MS) return Promise.resolve();
  expirySweepInFlight = sweepExpiredVerifications()
    .then(() => {
      lastExpirySweepAt = Date.now();
    })
    .finally(() => {
      expirySweepInFlight = null;
    });
  return expirySweepInFlight;
}

async function sweepExpiredVerifications() {
  await pool.query(`
    UPDATE verification_sessions
    SET verification_status = 'reverification_required',
        updated_at = NOW()
    WHERE LOWER(COALESCE(verification_status, '')) IN ('approved', 'verified')
      AND expires_at IS NOT NULL
      AND expires_at <= NOW()
  `);

  await pool.query(`
    UPDATE verifications
    SET is_verified = FALSE,
        updated_at = NOW()
    FROM verification_sessions avs
    WHERE verifications.verification_session_id = avs.verification_session_id
      AND avs.verification_status = 'reverification_required'
      AND verifications.is_verified = TRUE
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
      a.created_at,
      a.avatar_file_id,
      a.tagline,
      a.description,
      f.path AS avatar_path,
      (
        SELECT s.role FROM staff s WHERE s.account_id = a.account_id LIMIT 1
      ) AS staff_role,
      p.name AS subscription_plan,
      v.verification_id AS account_verification_id,
      CASE WHEN COALESCE(v.is_verified, FALSE) THEN 'verified' ELSE 'unverified' END AS verification_status,
      v.verification_session_id,
      avs.didit_session_id,
      avs.verification_url,
      avs.verification_status AS session_status,
      avs.kyc_status,
      avs.expires_at AS verification_expires_at,
      COALESCE(avs.updated_at, v.updated_at) AS verification_updated_at,
      NULL::text AS verified_by_name,
      w.balance_credits,
      w.frozen_balance_credits,
      EXISTS (
        SELECT 1 FROM restrictions r
        WHERE r.account_id = a.account_id
          AND (
            LOWER(r.type) IN ('forum_timeout', 'timeout')
            OR (LOWER(COALESCE(r.module, '')) = 'forum' AND LOWER(r.type) LIKE '%timeout%')
          )
          AND r.starts_at <= NOW()
          AND (r.ends_at IS NULL OR r.ends_at > NOW())
      ) AS forum_timeout
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
    LEFT JOIN verification_sessions avs
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
      avs.verification_url,
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
    LEFT JOIN verification_sessions avs
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
      `UPDATE verification_sessions avs
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
      FROM verification_sessions avs
      JOIN verifications v
        ON avs.verification_session_id = v.verification_session_id
      WHERE v.account_id = $1
    )
    UPDATE verification_sessions avs
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
    UPDATE verification_sessions avs
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
    UPDATE verification_sessions avs
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
    UPDATE verification_sessions avs
    SET verification_status = 'Pending', updated_at = NOW()
    FROM verifications v
    WHERE v.account_id = $1
      AND avs.verification_session_id = v.verification_session_id
    `,
    [accountId]
  );
}

/** Latest status change of an account, read for "was this penalty applied with the team?". */
function linkedPenaltyFrom(row, teamAccountId) {
  if (!row) return null;
  const status = String(row.status || '').toLowerCase();
  if (!['banned', 'suspended', 'locked'].includes(status)) return null;
  let meta = row.last_status_change || row.metadata || {};
  if (typeof meta === 'string') {
    try {
      meta = JSON.parse(meta);
    } catch {
      meta = {};
    }
  }
  if (String(meta.viaTeamAccountId || '') !== String(teamAccountId)) return null;
  if (String(meta.status || '').toLowerCase() !== status) return null;
  return status;
}

/**
 * The leader's current penalty when it was applied together with this team (and is still the
 * leader's latest standing change), else null. Lifting the team can lift it too.
 */
async function leaderPenaltyLinkedToTeam(leaderAccountId, teamAccountId) {
  const result = await pool.query(
    `
    SELECT a.status, last.metadata AS last_status_change
    FROM accounts a
    LEFT JOIN LATERAL (
      SELECT aa.metadata
      FROM account_activity aa
      WHERE aa.account_id = a.account_id AND aa.event_code = 'ACCOUNT_STATUS_CHANGED'
      ORDER BY aa.created_at DESC
      LIMIT 1
    ) last ON TRUE
    WHERE a.account_id = $1
    `,
    [leaderAccountId]
  );
  return linkedPenaltyFrom(result.rows[0], teamAccountId);
}

/** Each team's leader (first active Owner) with the standing staff need to see beside the team. */
async function fetchTeamLeaders(teamIds) {
  if (!teamIds.length) return new Map();
  const { platformMeritSql } = require('./WarningBandRepositories');
  const result = await pool.query(
    `
    SELECT
      t.team_id,
      t.account_id AS team_account_id,
      o.user_id,
      o.account_id,
      o.email_address,
      o.first_name,
      o.last_name,
      o.handle,
      o.display_name,
      o.status,
      o.suspension_ends_at,
      o.ban_ends_at,
      o.lock_ends_at,
      o.avatar_path,
      o.merit,
      o.forum_timeout,
      o.last_status_change
    FROM teams t
    INNER JOIN LATERAL (
      SELECT
        u.user_id,
        a.account_id,
        u.email_address,
        u.first_name,
        u.last_name,
        a.handle,
        a.display_name,
        a.status,
        a.suspension_ends_at,
        a.ban_ends_at,
        a.lock_ends_at,
        f.path AS avatar_path,
        ${platformMeritSql('a.account_id')}::int AS merit,
        EXISTS (
          SELECT 1 FROM restrictions r
          WHERE r.account_id = a.account_id
            AND LOWER(r.type) IN ('forum_timeout', 'timeout')
            AND r.starts_at <= NOW()
            AND (r.ends_at IS NULL OR r.ends_at > NOW())
        ) AS forum_timeout,
        (
          SELECT aa.metadata
          FROM account_activity aa
          WHERE aa.account_id = a.account_id AND aa.event_code = 'ACCOUNT_STATUS_CHANGED'
          ORDER BY aa.created_at DESC
          LIMIT 1
        ) AS last_status_change
      FROM team_members tm
      INNER JOIN users u ON u.user_id = tm.user_id
      INNER JOIN accounts a ON a.account_id = u.account_id
      LEFT JOIN files f ON f.file_id = a.avatar_file_id
      WHERE tm.team_id = t.team_id
        AND tm.role = 'Owner'
        AND tm.status = 'Active'
        AND tm.deleted_at IS NULL
        AND a.deleted_at IS NULL
      ORDER BY tm.joined_at ASC
      LIMIT 1
    ) o ON TRUE
    WHERE t.team_id = ANY($1::uuid[])
    `,
    [teamIds]
  );
  const map = new Map();
  for (const row of result.rows) {
    map.set(String(row.team_id), {
      userId: row.user_id,
      accountId: row.account_id,
      name:
        [row.first_name, row.last_name].filter(Boolean).join(' ').trim() ||
        row.display_name ||
        row.handle ||
        'Unnamed member',
      username: row.handle || null,
      email: row.email_address || '',
      avatarPath: row.avatar_path || null,
      status: normalizeStatus(row.status),
      suspensionEndsAt: row.suspension_ends_at || null,
      banEndsAt: row.ban_ends_at || null,
      lockEndsAt: row.lock_ends_at || null,
      merit: Number(row.merit ?? 100),
      forumTimeout: Boolean(row.forum_timeout),
      // True when the leader's current penalty was applied together with this team.
      penaltyLinkedToTeam: Boolean(linkedPenaltyFrom(row, row.team_account_id)),
    });
  }
  return map;
}

/**
 * Team wallet breakdown, batched: spendable, held by staff, escrow, and the part of the
 * spendable balance owed to members from contract payouts (TeamsRepositories.wallet rules).
 */
async function fetchTeamWalletSummaries(teamIds) {
  if (!teamIds.length) return new Map();
  const [balances, reserved] = await Promise.all([
    pool.query(
      `
      SELECT
        t.team_id,
        (ARRAY_AGG(w.wallet_id ORDER BY w.created_at DESC) FILTER (WHERE w.type = 'account wallets'))[1] AS wallet_id,
        COALESCE(SUM(w.balance_credits) FILTER (WHERE w.type = 'account wallets'), 0)::bigint AS available,
        COALESCE(SUM(w.frozen_balance_credits), 0)::bigint AS held,
        COALESCE(SUM(w.balance_credits) FILTER (WHERE w.type = 'escrow wallets'), 0)::bigint AS escrow,
        BOOL_OR(LOWER(COALESCE(w.status, 'active')) <> 'active') AS wallet_inactive
      FROM teams t
      INNER JOIN account_wallets aw ON aw.account_id = t.account_id
      INNER JOIN wallets w ON w.wallet_id = aw.wallet_id
      WHERE t.team_id = ANY($1::uuid[])
      GROUP BY t.team_id
      `,
      [teamIds]
    ),
    pool.query(
      `
      WITH team_wallets AS (
        SELECT t.team_id, w.wallet_id
        FROM teams t
        INNER JOIN account_wallets aw ON aw.account_id = t.account_id
        INNER JOIN wallets w ON w.wallet_id = aw.wallet_id AND w.type = 'account wallets'
        WHERE t.team_id = ANY($1::uuid[])
      ),
      releases AS (
        SELECT tw.team_id, ct.reference_id AS contract_id, SUM(ct.amount_credits)::bigint AS released
        FROM team_wallets tw
        INNER JOIN credit_transactions ct ON ct.destination_wallet_id = tw.wallet_id
        WHERE ct.reference_table = 'contracts'
          AND ct.type = 'Escrow Release'
          AND LOWER(ct.status::text) = 'completed'
        GROUP BY tw.team_id, ct.reference_id
      ),
      distributions AS (
        SELECT team_id, contract_id, SUM(amount_credits)::bigint AS distributed
        FROM team_contract_distributions
        WHERE team_id = ANY($1::uuid[])
        GROUP BY team_id, contract_id
      )
      SELECT r.team_id, COALESCE(SUM(GREATEST(0, r.released - COALESCE(d.distributed, 0))), 0)::bigint AS reserved
      FROM releases r
      LEFT JOIN distributions d ON d.team_id = r.team_id AND d.contract_id = r.contract_id
      GROUP BY r.team_id
      `,
      [teamIds]
    ).catch((err) => {
      console.warn('Team contract reserve totals skipped:', err.message);
      return { rows: [] };
    }),
  ]);
  const reservedByTeam = new Map(reserved.rows.map((row) => [String(row.team_id), Number(row.reserved || 0)]));
  const map = new Map();
  for (const row of balances.rows) {
    const available = Number(row.available || 0);
    const contractReserved = reservedByTeam.get(String(row.team_id)) || 0;
    map.set(String(row.team_id), {
      walletId: row.wallet_id || null,
      available,
      held: Number(row.held || 0),
      escrow: Number(row.escrow || 0),
      contractReserved,
      unreserved: Math.max(0, available - contractReserved),
      inactive: Boolean(row.wallet_inactive),
    });
  }
  return map;
}

const EMPTY_TEAM_WALLET = { walletId: null, available: 0, held: 0, escrow: 0, contractReserved: 0, unreserved: 0, inactive: false };

/** What staff should look at first on a team row. */
function teamAttention({ teamType, leader, wallet, history, verificationStatus, status }) {
  const flags = [];
  const standard = teamType === 'standard';
  if (standard && !leader) flags.push({ id: 'no_leader', label: 'No active leader', tone: 'danger' });
  if (leader && ['Banned', 'Locked'].includes(leader.status)) {
    flags.push({ id: 'leader_restricted', label: `Leader ${leader.status.toLowerCase()}`, tone: 'danger' });
  } else if (leader && leader.status === 'Suspended') {
    flags.push({ id: 'leader_suspended', label: 'Leader suspended', tone: 'warning' });
  } else if (leader && String(leader.status).toLowerCase() === 'deactivated') {
    // Voluntary, so the team is not paused, but nobody can pay out until the leader returns.
    flags.push({ id: 'leader_deactivated', label: 'Leader deactivated', tone: 'info' });
  }
  if (wallet.held > 0) flags.push({ id: 'credits_held', label: `${wallet.held.toLocaleString()} credits held`, tone: 'warning' });
  if (wallet.inactive) flags.push({ id: 'wallet_inactive', label: 'Wallet inactive', tone: 'danger' });
  if ((history?.openDisputes || 0) > 0) {
    flags.push({ id: 'open_disputes', label: `${history.openDisputes} open dispute${history.openDisputes === 1 ? '' : 's'}`, tone: 'warning' });
  }
  if (verificationStatus === 'Reverification Required' && status === 'Active') {
    flags.push({ id: 'reverification', label: 'Business reverification due', tone: 'info' });
  }
  return flags;
}

async function fetchTeamsFromDatabase({ enrich = true } = {}) {
  const teamsResult = await pool.query(`
    SELECT
      t.team_id,
      t.account_id,
      COALESCE(t.team_type, 'standard') AS team_type,
      a.handle,
      a.display_name,
      a.status,
      a.suspension_ends_at,
      a.ban_ends_at,
      a.lock_ends_at,
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
        WHERE tm.team_id = t.team_id AND tm.deleted_at IS NULL AND tm.status = 'Active'
      ) AS member_count
    FROM teams t
    INNER JOIN accounts a ON a.account_id = t.account_id
    LEFT JOIN files f ON f.file_id = a.avatar_file_id
    LEFT JOIN verifications v ON v.account_id = a.account_id
    LEFT JOIN verification_sessions avs
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
      AND t.deleted_at IS NULL
    ORDER BY a.created_at DESC
  `);

  if (!teamsResult.rows.length) return [];

  const teamIds = teamsResult.rows.map((r) => r.team_id);
  const accountIds = teamsResult.rows.map((r) => r.account_id);
  const membersRequest = pool.query(
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
      a.account_id,
      a.status AS account_status,
      a.handle,
      a.display_name
    FROM team_members tm
    INNER JOIN users u ON u.user_id = tm.user_id
    INNER JOIN accounts a ON a.account_id = u.account_id
    WHERE tm.team_id = ANY($1::uuid[])
      AND tm.deleted_at IS NULL
      AND tm.status = 'Active'
    ORDER BY
      CASE LOWER(tm.role) WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'representative' THEN 2 WHEN 'manager' THEN 3 ELSE 4 END,
      tm.joined_at ASC NULLS LAST
    `,
    [teamIds]
  );
  const [membersResult, [creditMap, historyMap, activityMap, assetStats, lastActivityMap, leaderMap, walletMap]] = await Promise.all([
    membersRequest,
    enrich
      ? Promise.all([
          fetchCreditActivityForAccounts(accountIds),
          fetchHistoryForAccounts(accountIds),
          fetchActivityForAccounts(accountIds),
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
          fetchLastActivityForAccounts(accountIds).catch(() => new Map()),
          fetchTeamLeaders(teamIds).catch((err) => {
            console.warn('Team leaders skipped:', err.message);
            return new Map();
          }),
          fetchTeamWalletSummaries(teamIds).catch((err) => {
            console.warn('Team wallet summaries skipped:', err.message);
            return new Map();
          }),
        ])
      : [new Map(), new Map(), new Map(), { rows: [] }, new Map(), new Map(), new Map()],
  ]);

  // Leaders' running automatic punishments (they carry the team's warnings).
  const leaderAccountIds = [...leaderMap.values()].map((leader) => leader.accountId);
  let leaderPunishments = new Map();
  if (enrich && leaderAccountIds.length) {
    const { runningPunishmentsByAccount } = require('../services/MeritPenaltyServices');
    leaderPunishments = await runningPunishmentsByAccount(leaderAccountIds).catch(() => new Map());
  }

  const membersByTeam = new Map();
  for (const row of membersResult.rows) {
    const list = membersByTeam.get(row.team_id) || [];
    const name =
      [row.first_name, row.last_name].filter(Boolean).join(' ').trim() ||
      row.display_name ||
      row.handle;
    list.push({
      id: row.user_id,
      accountId: row.account_id,
      name,
      email: row.email_address,
      username: row.handle,
      role: row.role || 'Member',
      accountStatus: normalizeStatus(row.account_status),
    });
    membersByTeam.set(row.team_id, list);
  }

  const assetsByAccount = new Map(
    assetStats.rows.map((r) => [r.account_id, r])
  );

  return teamsResult.rows.map((row) => {
    const members = membersByTeam.get(row.team_id) || [];
    const owner = members.find((m) => String(m.role).toLowerCase() === 'owner') || null;
    const leaderDetail = leaderMap.get(String(row.team_id)) || null;
    const leader = leaderDetail
      ? { ...leaderDetail, meritPenalties: leaderPunishments.get(String(leaderDetail.accountId)) || [] }
      : owner
        ? {
            userId: owner.id,
            accountId: owner.accountId,
            name: owner.name,
            username: owner.username,
            email: owner.email,
            avatarPath: null,
            status: owner.accountStatus,
            merit: null,
            forumTimeout: false,
            penaltyLinkedToTeam: false,
            meritPenalties: [],
          }
        : null;
    const teamName = row.display_name || row.handle || 'Unnamed team';
    const assets = assetsByAccount.get(row.account_id) || { listing_count: 0, listing_value: 0 };
    const balance = Number(row.balance_credits || 0);
    const wallet = walletMap.get(String(row.team_id)) || {
      ...EMPTY_TEAM_WALLET,
      walletId: row.wallet_id || null,
      available: balance,
      held: Number(row.frozen_balance_credits || 0),
      unreserved: balance,
    };
    const history = buildHistory(row.account_id, historyMap, activityMap, { team: true });
    const verificationStatus = mapVerificationLabel(row.verification_status, { forTeam: true });
    const status = normalizeStatus(row.status);
    const teamType = String(row.team_type || 'standard').toLowerCase();

    return {
      id: row.team_id,
      accountId: row.account_id,
      teamType,
      name: teamName,
      logoInitial: (teamName || 'T').charAt(0).toUpperCase(),
      avatarPath: row.avatar_path || null,
      handle: row.handle || null,
      tagline: row.tagline || null,
      description: row.description || null,
      walletBalance: balance,
      frozenBalance: Number(row.frozen_balance_credits || 0),
      wallet,
      leader,
      leaderName: leader?.name || 'No active leader',
      leaderId: leader?.userId || null,
      leaderEmail: leader?.email || '',
      memberCount: members.length || Number(row.member_count || 0),
      members,
      // Teams have no mailbox of their own; staff contact the owner.
      email: leader?.email || '',
      verificationStatus,
      status,
      standing: {
        suspensionEndsAt: status === 'Suspended' ? row.suspension_ends_at || null : null,
        banEndsAt: status === 'Banned' ? row.ban_ends_at || null : null,
        lockEndsAt: status === 'Locked' ? row.lock_ends_at || null : null,
      },
      // A team never posts in the forums; a timeout is its leader's.
      forumTimeout: Boolean(leader?.forumTimeout),
      lastSeenAt: lastActivityMap.get(row.account_id) || null,
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
      verification: buildVerificationDetail({ ...row, is_team: true }),
      history,
      attention: enrich ? teamAttention({ teamType, leader, wallet, history, verificationStatus, status }) : [],
    };
  });
}

function computeTeamStats(teams) {
  const suspended = teams.filter((t) => t.status === 'Suspended').length;
  const banned = teams.filter((t) => t.status === 'Banned').length;
  const locked = teams.filter((t) => t.status === 'Locked').length;
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
    totalLocked: locked,
    totalTeams: teams.length,
    totalActive: active,
    totalVerifiedBusinesses: verified,
    totalUnverifiedBusiness: unverified,
    totalPendingVerification: pending,
    totalNeedsAttention: teams.filter((t) => (t.attention || []).some((flag) => flag.tone === 'danger')).length,
    totalLeaderRestricted: teams.filter((t) => t.leader && ['Banned', 'Locked', 'Suspended'].includes(t.leader.status)).length,
    totalWithoutLeader: teams.filter((t) => t.teamType === 'standard' && !t.leader).length,
    totalCreditsHeld: teams.reduce((sum, t) => sum + Number(t.wallet?.held || 0), 0),
    totalTeamWalletBalance: teams.reduce((sum, t) => sum + Number(t.wallet?.available || 0), 0),
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
  const { runningPunishmentsByAccount } = require('../services/MeritPenaltyServices');
  const [creditMap, historyMap, activityMap, assetStats, membershipsMap, lastActivityMap, punishmentMap] = await Promise.all([
    fetchCreditActivityForAccounts(accountIds),
    fetchHistoryForAccounts(accountIds),
    fetchActivityForAccounts(accountIds),
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
    fetchLastActivityForAccounts(accountIds).catch(() => new Map()),
    runningPunishmentsByAccount(accountIds).catch((err) => {
      console.warn('Could not load running merit punishments:', err.message);
      return new Map();
    }),
  ]);
  const assetsByAccount = new Map(assetStats.rows.map((r) => [r.account_id, r.listing_count]));

  const enriched = users.map((u) => {
    const { verificationMeta, walletBalance, ...rest } = u;
    const history = buildHistory(u.accountId, historyMap, activityMap);
    return {
      ...rest,
      lastSeenAt: lastActivityMap.get(u.accountId) || null,
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
      history,
      merit: history.merit,
      // Automatic merit punishments running now (timed; merit recovering does not end them).
      meritPenalties: punishmentMap.get(String(u.accountId)) || [],
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

/** Counts and a few rows only, so it skips the per-account history/credit enrichment of the full lists. */
async function getUserTeamOverview() {
  await markExpiredVerificationsForReverification();
  const [users, teams] = await Promise.all([
    fetchAllUsers(),
    fetchTeamsFromDatabase({ enrich: false }),
  ]);
  const teamsData = { stats: computeTeamStats(teams) };
  const usersData = { stats: computeUserStats(users) };

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
    leaderStatus: t.leader?.status || null,
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
        { label: 'Locked', count: teamsData.stats.totalLocked },
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
  const leaderIssues = (teamStats.totalWithoutLeader || 0) + (teamStats.totalLeaderRestricted || 0);
  if (leaderIssues > 0) {
    alerts.push({
      id: 'team-leaders',
      message: `${leaderIssues} team(s) have a restricted or missing leader. New work and team payouts are paused for them; transfer ownership or lock the team.`,
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

function sanctionReason(options = {}) {
  const reason = String(options.reason || '').trim();
  if (!reason) {
    const error = new Error('A reason is required');
    error.statusCode = 400;
    throw error;
  }
  return reason;
}

const FULL_STANDING_ROLES = new Set(['Admin', 'Support Moderator']);

function standingError(message, statusCode = 409) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/**
 * Status changes must make sense from where the account is now, and a ban is Admin and
 * Support's to change. Without this, "unsuspend" or "unlock" turned any account Active —
 * so a specialist moderator who cannot ban could still lift a ban.
 */
function assertStatusTransition({ key, currentStatus, actorRole }) {
  const current = String(currentStatus || 'Active').toLowerCase();
  const fullRole = FULL_STANDING_ROLES.has(String(actorRole || ''));
  const lifts = {
    unsuspend: { from: 'suspended', message: 'This account is not suspended, so there is no suspension to lift.' },
    unlock: { from: 'locked', message: 'This account is not locked, so there is nothing to unlock.' },
    unban: { from: 'banned', message: 'This account is not banned, so there is no ban to lift.' },
  };
  if (lifts[key] && current !== lifts[key].from) {
    throw standingError(lifts[key].message);
  }
  if (current === 'banned' && !fullRole && !['ban', 'banned'].includes(key)) {
    throw standingError('This account is banned. Only Admin or Support can change a ban.', 403);
  }
}

async function updateAccountStatus(accountId, actionOrStatus, staffId = null, options = {}) {
  const account = await assertAccountExists(accountId);
  const key = String(actionOrStatus || '').toLowerCase();
  // A team acts as one account but a person leads it: the team service applies the team
  // penalty, the leader cascade and the team notices, then calls back with `teamDirect`.
  if (String(account.type || '').toLowerCase() === 'team' && !options.teamDirect) {
    return require('../services/TeamSanctionServices').changeTeamStanding(account, key, staffId, options);
  }
  const viaTeamMeta = options.viaTeamAccountId
    ? { viaTeamAccountId: String(options.viaTeamAccountId), viaTeamName: options.viaTeamName || null }
    : {};
  const { assertCanSanctionTarget, staffRoleOf } = require('../lib/SuspendGuards');
  const guardAction = ['ban', 'banned'].includes(key)
    ? 'ban'
    : ['lock', 'locked'].includes(key)
      ? 'lock'
      : ['suspend', 'suspended'].includes(key)
        ? 'suspend'
        : ['timeout', 'forum_timeout'].includes(key)
          ? 'timeout'
          : 'restore';
  // System actions (no staff) such as the dispute ban path still pass their staff id.
  if (staffId || options.actorAccountId) {
    await assertCanSanctionTarget({
      actorStaffId: staffId,
      actorAccountId: options.actorAccountId || null,
      targetAccountId: accountId,
      action: guardAction,
    });
  }
  if (!['timeout', 'forum_timeout', 'clear_timeout', 'clear-timeout'].includes(key)) {
    assertStatusTransition({
      key,
      currentStatus: account.status,
      actorRole: staffId ? await staffRoleOf(staffId) : 'Admin',
    });
  }
  const { resolveStandingOptions } = require('../services/PunishmentDefServices');
  const resolvedOptions = await resolveStandingOptions(key, options);
  const reason = sanctionReason(resolvedOptions);
  const {
    sanctionEndsAt,
    getAccountAccess,
  } = require('../lib/AccountRestriction');
  const punishmentMeta = {
    ...(resolvedOptions.punishmentId ? { punishmentId: resolvedOptions.punishmentId } : {}),
    ...(resolvedOptions.punishmentLabel ? { punishmentLabel: resolvedOptions.punishmentLabel } : {}),
    ...(resolvedOptions.customDuration ? { customDuration: true } : {}),
  };

  if (key === 'timeout' || key === 'forum_timeout') {
    const endsAt = sanctionEndsAt(resolvedOptions, 'temporary');
    await pool.query(
      `
      INSERT INTO restrictions (type, module, starts_at, ends_at, account_id, staff_id)
      VALUES ('forum_timeout', 'forum', NOW(), $1, $2, $3)
      `,
      [endsAt, accountId, staffId]
    );
    await recordAccountActivity({
      accountId,
      action: endsAt ? `Timeout applied: ${reason}` : `Timeout applied until lifted: ${reason}`,
      eventCode: 'FORUM_TIMEOUT',
      referenceTable: 'restrictions',
      referencePrefix: 'RST',
      referenceId: accountId,
      actorStaffId: staffId,
      metadata: { endsAt, days: resolvedOptions.days ?? null, reason, ...punishmentMeta, ...viaTeamMeta },
    });
    let restriction = null;
    try {
      restriction = await getAccountAccess(accountId);
      const { getIo } = require('../lib/WebSocket');
      const io = getIo();
      if (io) {
        io.to(String(accountId)).emit('account:status_changed', {
          accountId,
          status: account.status,
          code: 'FORUM_TIMEOUT',
          message: restriction?.message
            ? `${restriction.message} Reason: ${reason}`
            : reason,
          restriction,
        });
      }
    } catch (notifyErr) {
      console.warn('Failed to broadcast timeout:', notifyErr.message);
    }
    return { accountId, status: account.status, forumTimeout: true, restriction };
  }

  if (key === 'clear_timeout' || key === 'clear-timeout') {
    await pool.query(
      `
      UPDATE restrictions
      SET ends_at = NOW()
      WHERE account_id = $1
        AND LOWER(type) IN ('forum_timeout', 'timeout')
        AND (ends_at IS NULL OR ends_at > NOW())
      `,
      [accountId]
    );
    await recordAccountActivity({
      accountId,
      action: `Timeout cleared: ${reason}`,
      eventCode: 'FORUM_TIMEOUT_CLEARED',
      referenceTable: 'restrictions',
      referencePrefix: 'RST',
      referenceId: accountId,
      actorStaffId: staffId,
      metadata: { reason, ...viaTeamMeta },
    });
    let restriction = null;
    try {
      restriction = await getAccountAccess(accountId);
      const { getIo } = require('../lib/WebSocket');
      const io = getIo();
      if (io) {
        io.to(String(accountId)).emit('account:status_changed', {
          accountId,
          status: account.status,
          code: null,
          message: `Your timeout has been lifted. Reason: ${reason}`,
          restriction,
        });
      }
    } catch (notifyErr) {
      console.warn('Failed to broadcast timeout clear:', notifyErr.message);
    }
    return { accountId, status: account.status, forumTimeout: false, restriction };
  }

  const status = STATUS_MAP[key] || null;
  if (!status) throw new Error(`Invalid account status action: ${actionOrStatus}`);

  const suspensionEndsAt = status === 'Suspended' ? sanctionEndsAt(resolvedOptions, 'temporary') : null;
  const banEndsAt = status === 'Banned' ? sanctionEndsAt(resolvedOptions, 'permanent') : null;
  const lockEndsAt = status === 'Locked' ? sanctionEndsAt(resolvedOptions, 'permanent') : null;
  const { restingStatusSql } = require('../lib/AccountRestriction');
  // A staff decision replaces any automatic suspension: the engine marker is cleared and its
  // punishment record closes below.
  const { clearAutoSuspendSql } = require('../lib/SchemaFeatures');
  const clearAutoSuspend = await clearAutoSuspendSql();
  // Lifting a penalty returns a member who had deactivated the account to Deactivated.
  const saved = await pool.query(
    `
    UPDATE accounts
    SET status = CASE WHEN $1::text = 'Active' THEN ${restingStatusSql()} ELSE $1::text END,
        suspension_ends_at = $2,
        ban_ends_at = $3,
        lock_ends_at = $4
        ${clearAutoSuspend}
    WHERE account_id = $5
    RETURNING status
    `,
    [status, suspensionEndsAt, banEndsAt, lockEndsAt, accountId]
  );
  const savedStatus = saved.rows[0]?.status || status;
  const backToDeactivated = savedStatus !== status;

  // The engine's suspension record (if any) closes: staff now own this account's standing.
  try {
    const { closeAutoSuspensionRecords } = require('../services/MeritPenaltyServices');
    await closeAutoSuspensionRecords(accountId, { staffId });
  } catch (err) {
    console.warn('Closing the automatic suspension record failed:', err.message);
  }

  await recordAccountActivity({
    accountId,
    action: `Account status set to ${savedStatus}: ${reason}`,
    eventCode: 'ACCOUNT_STATUS_CHANGED',
    referenceTable: 'accounts',
    referencePrefix: 'ACC',
    referenceId: accountId,
    actorStaffId: staffId,
    metadata: {
      previousStatus: account.status,
      status: savedStatus,
      action: key,
      suspensionEndsAt,
      banEndsAt,
      lockEndsAt,
      reason,
      ...punishmentMeta,
      ...viaTeamMeta,
      ...(resolvedOptions.disputeId ? { disputeId: String(resolvedOptions.disputeId) } : {}),
      ...(resolvedOptions.disputeNumber ? { disputeNumber: String(resolvedOptions.disputeNumber) } : {}),
    },
  });

  // A deactivated member is not told the account is "Active"; they reactivate it themselves.
  if (!backToDeactivated) {
    try {
      const { notifyAccountStatusChanged } = require('../services/AccountStandingServices');
      await notifyAccountStatusChanged(accountId, {
        status,
        previousStatus: account.status,
        action: key,
        actorStaffId: staffId,
        reason,
      });
    } catch (notifyErr) {
      console.warn('Failed to broadcast account status change:', notifyErr.message);
    }
  }

  // A banned account's open jobs, gigs and listings close, so no one keeps applying to,
  // ordering from or buying from it. Every ban path (Users desk, dispute ban, report ban)
  // comes through here. The ban is already saved; clean-up problems are reported, not fatal.
  let banCleanup = null;
  if (status === 'Banned') {
    try {
      const { closeBannedAccountListings } = require('../services/BanCleanupServices');
      banCleanup = await closeBannedAccountListings(accountId, { staffId });
    } catch (cleanupErr) {
      console.error('Ban clean-up failed:', cleanupErr.message);
      banCleanup = { failures: [{ step: 'all', id: null, message: cleanupErr.message }] };
    }
  }

  return { accountId, status: savedStatus, previousStatus: account.status, suspensionEndsAt, banCleanup };
}

async function updateAccountVerification(accountId, action, staffId, _options = {}) {
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

  // Approval length is fixed at 1 year. Staff do not choose a duration.
  const validityDays = 365;

  const isVerified = nextStatus === 'verified';
  const accountTypeRes = await pool.query(
    `SELECT type FROM accounts WHERE account_id = $1::uuid LIMIT 1`,
    [accountId]
  );
  const forTeam = String(accountTypeRes.rows[0]?.type || '').toLowerCase() === 'team';

  let existingSessionRes = null;
  if (!forTeam && isVerified) {
    existingSessionRes = await pool.query(
      `
      SELECT avs.verification_session_id, avs.verification_url
      FROM verification_sessions avs
      WHERE (
        avs.verification_session_id = (
          SELECT verification_session_id FROM verifications WHERE account_id = $1::uuid
        ) OR avs.account_id = $1::uuid
      )
        AND avs.verification_url IS NOT NULL
        AND TRIM(avs.verification_url) <> ''
      ORDER BY avs.created_at DESC
      LIMIT 1
      `,
      [accountId]
    );

    if (!existingSessionRes.rows.length) {
      throw new Error('Cannot approve verification: no verification URL exists in the verification session');
    }
  }

  const verificationRes = await pool.query(
    `
    INSERT INTO verifications (account_id, is_verified, verified_at, created_at, updated_at)
    VALUES ($1::uuid, $2::boolean, CASE WHEN $2::boolean THEN NOW() ELSE NULL END, NOW(), NOW())
    ON CONFLICT (account_id) DO UPDATE
    SET is_verified = EXCLUDED.is_verified,
        verified_at = EXCLUDED.verified_at,
        updated_at = NOW()
    RETURNING verification_id, verification_session_id
    `,
    [accountId, isVerified]
  );

  let staffAccountId = null;
  if (staffId) {
    const staffRes = await pool.query(
      `SELECT account_id FROM staff WHERE staff_id::text = $1 OR account_id::text = $1 LIMIT 1`,
      [String(staffId)]
    );
    staffAccountId = staffRes.rows[0]?.account_id || null;
  }

  let verificationSessionId = verificationRes.rows[0]?.verification_session_id;
  if (!verificationSessionId && existingSessionRes?.rows?.[0]?.verification_session_id) {
    verificationSessionId = existingSessionRes.rows[0].verification_session_id;
    await pool.query(
      `UPDATE verifications SET verification_session_id = $1::uuid WHERE account_id = $2::uuid`,
      [verificationSessionId, accountId]
    );
  }

  if (verificationSessionId) {
    await pool.query(
      `
      UPDATE verification_sessions
      SET verification_status = $2::varchar,
          verified_by_account_id = COALESCE($3::uuid, verified_by_account_id),
          expires_at = CASE
            WHEN $2::varchar = 'verified'::varchar THEN NOW() + ($4::int * INTERVAL '1 day')
            ELSE NULL
          END,
          updated_at = NOW()
      WHERE verification_session_id = $1::uuid
      `,
      [verificationSessionId, nextStatus, staffAccountId, validityDays]
    );
  } else {
    const sessionRes = await pool.query(
      `
      INSERT INTO verification_sessions (
        account_id, didit_session_id, verification_url, kyc_status, verification_status,
        verified_by_account_id, expires_at, created_at, updated_at
      ) VALUES (
        $1::uuid, $2::varchar, '', 'Not Started', $3::varchar,
        $4::uuid,
        CASE WHEN $3::varchar = 'verified'::varchar THEN NOW() + ($5::int * INTERVAL '1 day') ELSE NULL END,
        NOW(), NOW()
      )
      RETURNING verification_session_id
      `,
      [
        accountId,
        `manual_admin_${Date.now()}_${String(accountId).slice(0, 8)}`,
        nextStatus,
        staffAccountId,
        validityDays,
      ]
    );
    await pool.query(
      `
      UPDATE verifications
      SET verification_session_id = $1::uuid,
          updated_at = NOW()
      WHERE account_id = $2::uuid
      `,
      [sessionRes.rows[0].verification_session_id, accountId]
    );
  }

  return {
    accountId,
    verificationStatus: isVerified
      ? (forTeam ? 'Business Verified' : 'Verified')
      : mapVerificationLabel(nextStatus, { forTeam }),
    validityDays: isVerified ? validityDays : null,
  };
}

function creditAdjustError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

const MIN_ADJUSTMENT_REASON = 5;
const MAX_ADJUSTMENT_CREDITS = 1000000;

/**
 * Staff grant (+) or deduction (−) on an account wallet.
 *
 * The ledger row is a self-transfer (source = destination) with the unsigned amount, so the
 * direction, reason and actor are stored on a CREDITS_ADJUSTED account_activity row written
 * in the same transaction and referencing the ledger row. Staff desks read the sign from it.
 */
async function adjustAccountCredits(accountId, amount, note, staffId, { referenceTable = null, referenceId = null } = {}) {
  try {
    await assertAccountExists(accountId);
  } catch {
    throw creditAdjustError('Account not found', 404);
  }
  const delta = Number(amount);
  if (!Number.isInteger(delta) || delta === 0) {
    throw creditAdjustError('Credit amount must be a whole, non-zero number');
  }
  if (Math.abs(delta) > MAX_ADJUSTMENT_CREDITS) {
    throw creditAdjustError('Credit adjustments are limited to 1,000,000 at a time');
  }
  const reason = String(note || '').trim();
  if (reason.length < MIN_ADJUSTMENT_REASON) {
    throw creditAdjustError('Write why you are changing these credits (at least 5 characters)');
  }
  if (reason.length > 500) throw creditAdjustError('Keep the reason under 500 characters');
  // No staff member adjusts their own credits, and staff accounts are Admin's to adjust.
  if (staffId) {
    const { assertCanSanctionTarget } = require('../lib/SuspendGuards');
    await assertCanSanctionTarget({ actorStaffId: staffId, targetAccountId: accountId, action: 'credits' });
  }

  const wallet = await getAccountWallet(accountId);
  if (!wallet) throw creditAdjustError('No account wallet found for this account', 404);

  const client = await pool.connect();
  let result;
  try {
    await client.query('BEGIN');
    // Relative and conditional: a payout or purchase landing at the same moment is kept,
    // and a deduction can never take the spendable balance below zero.
    const updated = await client.query(
      `UPDATE wallets
       SET balance_credits = balance_credits + $1
       WHERE wallet_id = $2
         AND balance_credits + $1 >= 0
       RETURNING balance_credits, frozen_balance_credits`,
      [delta, wallet.wallet_id]
    );
    if (!updated.rows.length) {
      throw creditAdjustError(
        'Not enough spendable credits for this deduction. Held credits cannot be deducted; release the hold first.',
        409
      );
    }

    const ledger = await client.query(
      `
      INSERT INTO credit_transactions (
        type, amount_credits, status, source_wallet_id, destination_wallet_id, reference_table, reference_id
      )
      VALUES ($1, $2, 'Completed', $3, $3, $4, $5)
      RETURNING credit_transaction_id
      `,
      [CREDIT_TRANSACTION_TYPE.FUND_TRANSFER, Math.abs(delta), wallet.wallet_id, referenceTable, referenceId]
    );
    const creditTransactionId = ledger.rows[0].credit_transaction_id;
    const balanceCredits = Number(updated.rows[0].balance_credits);

    // Same transaction as the money move: no adjustment exists without its audit row.
    await client.query(
      `
      INSERT INTO account_activity (
        account_id, action, event_code, reference_table, reference_prefix, reference_id,
        actor_staff_id, metadata
      ) VALUES ($1, $2, 'CREDITS_ADJUSTED', 'credit_transactions', 'CTX', $3, $4, $5::jsonb)
      `,
      [
        accountId,
        `Credits ${delta > 0 ? 'granted' : 'deducted'} (${delta > 0 ? '+' : '−'}${Math.abs(delta).toLocaleString()}): ${reason}`,
        String(creditTransactionId),
        staffId || null,
        JSON.stringify({
          delta,
          amount: Math.abs(delta),
          direction: delta > 0 ? 'grant' : 'deduction',
          reason,
          balanceBefore: balanceCredits - delta,
          balanceAfter: balanceCredits,
          walletId: wallet.wallet_id,
          creditTransactionId,
          sourceTable: referenceTable,
          sourceId: referenceId,
        }),
      ]
    );
    await client.query('COMMIT');

    result = {
      accountId,
      walletId: wallet.wallet_id,
      creditTransactionId,
      balanceCredits,
      frozenBalanceCredits: Number(updated.rows[0].frozen_balance_credits || 0),
      adjustedBy: delta,
      reason,
      staffId: staffId || null,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  await announceCreditAdjustment(accountId, result);
  return result;
}

/** Durable notice first, then the live push, so the member's open tab refreshes its wallet. */
async function announceCreditAdjustment(accountId, { walletId, adjustedBy, reason, balanceCredits }) {
  const amount = Math.abs(adjustedBy).toLocaleString();
  const message =
    adjustedBy > 0
      ? `Staff added ${amount} credits to your Account Wallet. Reason: ${reason}`
      : `Staff removed ${amount} credits from your Account Wallet. Reason: ${reason} If you think this is a mistake, contact support.`;
  let notification = null;
  try {
    const { createNotification } = require('./NotificationRepositories');
    notification = await createNotification({
      account_id: accountId,
      message,
      is_read: false,
      reference_table: 'wallets',
      reference_prefix: 'CREDITS_ADJUSTED',
      reference_path: '/transactions',
      reference_id: walletId || accountId,
    });
  } catch (err) {
    console.warn('Credit adjustment notification skipped:', err.message);
  }
  try {
    const { getIo } = require('../lib/WebSocket');
    const io = getIo();
    if (io) {
      if (notification) io.to(String(accountId)).emit('notification', notification);
      io.to(String(accountId)).emit('account:credits_adjusted', {
        accountId,
        adjustedBy,
        balanceCredits,
      });
    }
  } catch (err) {
    console.warn('Credit adjustment broadcast skipped:', err.message);
  }
  // A team account has no inbox: its Owners and Admins hear about the team wallet.
  try {
    const { describeTeamAccount, notifyTeamManagers } = require('../services/TeamStandingServices');
    const team = await describeTeamAccount(accountId);
    if (team.isTeam) {
      await notifyTeamManagers(accountId, {
        message:
          adjustedBy > 0
            ? `Staff added ${amount} credits to Team ${team.name}'s wallet. Reason: ${reason}`
            : `Staff removed ${amount} credits from Team ${team.name}'s wallet. Reason: ${reason} If you think this is a mistake, contact Support.`,
        prefix: 'TEAM_CREDITS_ADJUSTED',
        referenceTable: 'wallets',
        referenceId: walletId || accountId,
        event: 'wallet_changed',
      });
    }
  } catch (err) {
    console.warn('Team credit adjustment notice skipped:', err.message);
  }
}

/**
 * Staff credit hold. The workflow (reason, end date, row lock, notice) lives in
 * CreditHoldServices; this keeps the existing export for callers.
 * Without a lock, the old version read the balance, then wrote an absolute value, so a
 * purchase or payout landing in between was lost or minted.
 */
async function freezeAccountCredits(accountId, freeze = true, staffId = null, options = {}) {
  const holds = require('../services/CreditHoldServices');
  if (freeze) return holds.freezeAccountCredits(accountId, options, staffId);
  return holds.unfreezeAccountCredits(accountId, { staffId, reason: options.reason, source: 'staff' });
}

async function warnAccount(accountId, payload = {}, staffId) {
  const { warningId, type, reason, viaTeam = null } = payload || {};
  const target = await assertAccountExists(accountId);
  if (!staffId) throw new Error('Staff session required to issue a warning');
  // Teams have no Platform Merit: a warning against a team is issued to its leader.
  if (String(target.type || '').toLowerCase() === 'team') {
    return require('../services/TeamSanctionServices').warnTeamLeader(target, payload, staffId);
  }
  const { assertCanSanctionTarget, staffRoleOf } = require('../lib/SuspendGuards');
  await assertCanSanctionTarget({ actorStaffId: staffId, targetAccountId: accountId, action: 'warn' });
  const { assertWarnableAccount } = require('../services/WarningBandServices');
  await assertWarnableAccount(accountId);

  const violationNumber = `VIO-${Date.now().toString().slice(-8)}`;
  const { resolveIssuedWarning } = require('../services/WarningDefServices');
  const issued = await resolveIssuedWarning({ warningId, type, actorRole: await staffRoleOf(staffId) });
  const warnType = issued.type;
  const warnPoints = issued.points;
  const warnReason = String(reason || '').trim();
  if (!warnReason) {
    const error = new Error('A reason is required');
    error.statusCode = 400;
    throw error;
  }
  const { warningExpiry } = require('../lib/AccountRestriction');
  const expiry = warningExpiry({ durationDays: issued.durationDays, points: warnPoints });

  const { teamWarningColumnReady } = require('../lib/SchemaFeatures');
  const teamAccountId = viaTeam?.accountId && (await teamWarningColumnReady()) ? viaTeam.accountId : null;
  const inserted = await pool.query(
    `
    INSERT INTO violations (
      violation_number, account_id, type, reason, points,
      status, staff_id, expires_at${teamAccountId ? ', team_account_id' : ''}
    ) VALUES ($1, $2, $3, $4, $5, 'active', $6, $7${teamAccountId ? ', $8' : ''})
    RETURNING violation_id
    `,
    [violationNumber, accountId, warnType, warnReason, warnPoints, staffId, expiry, ...(teamAccountId ? [teamAccountId] : [])]
  );

  await recordAccountActivity({
    accountId,
    action: viaTeam?.name ? `Warning issued: ${warnType} (as leader of Team ${viaTeam.name})` : `Warning issued: ${warnType}`,
    eventCode: 'ACCOUNT_WARNED',
    referenceTable: 'violations',
    referencePrefix: 'VIO',
    referenceId: inserted.rows[0]?.violation_id || violationNumber,
    actorStaffId: staffId,
    metadata: {
      violationNumber,
      type: warnType,
      reason: warnReason,
      points: warnPoints,
      warningId: issued.warningId,
      expiresAt: expiry,
      ...(viaTeam?.accountId ? { viaTeamAccountId: String(viaTeam.accountId), viaTeamName: viaTeam.name || null } : {}),
    },
  });

  // Every merit level this warning crossed starts its timed punishment (merit is unchanged).
  const { applyMeritPunishmentsForWarning } = require('../services/MeritPenaltyServices');
  const autoSuspend = await applyMeritPunishmentsForWarning(accountId, {
    violationId: inserted.rows[0]?.violation_id || null,
    staffId,
  });

  try {
    const { notifyAccountWarned } = require('../services/AccountStandingServices');
    await notifyAccountWarned(accountId, {
      violationId: inserted.rows[0]?.violation_id || null,
      violationNumber,
      type: warnType,
      reason: warnReason,
      points: warnPoints,
      expiresAt: expiry,
      autoSuspended: Boolean(autoSuspend?.suspended),
      activeWarnings: autoSuspend?.activeCount ?? null,
      maxWarningsBeforeSuspend: autoSuspend?.max ?? null,
      viaTeamName: viaTeam?.name || null,
    });
  } catch (notifyErr) {
    console.warn('Failed to broadcast warning notification:', notifyErr.message);
  }

  try {
    const { refreshWarningBand } = require('../services/WarningBandServices');
    await refreshWarningBand(accountId);
  } catch (err) {
    console.warn('Warning band refresh after warning failed:', err.message);
  }

  return {
    accountId,
    violationId: inserted.rows[0]?.violation_id || null,
    violationNumber,
    type: warnType,
    points: warnPoints,
    expiresAt: expiry,
    autoSuspended: Boolean(autoSuspend?.suspended),
    activeWarnings: autoSuspend?.activeCount ?? null,
    punishmentsStarted: autoSuspend?.started || [],
  };
}

/**
 * Pardon: staff forgive an account's active violations / restrictions and
 * restore the account to Active. Records a row in `pardons` as an audit trail.
 */
async function pardonAccount(accountId, staffId, { note } = {}) {
  const account = await assertAccountExists(accountId);
  if (!staffId) throw new Error('Staff session required to issue a pardon');
  // No self-pardon, and another staff member's record is Admin's to clear.
  const { assertCanSanctionTarget } = require('../lib/SuspendGuards');
  await assertCanSanctionTarget({ actorStaffId: staffId, targetAccountId: accountId, action: 'pardon' });

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

    // Automatic merit punishments end with the pardon, whatever their clock said.
    const { endAllMeritPenalties } = require('../services/MeritPenaltyServices');
    const punishmentsEnded = await endAllMeritPenalties(client, accountId, { staffId, note: note || null });

    const previousStatus = account.status;
    const { restingStatusSql } = require('../lib/AccountRestriction');
    const { clearAutoSuspendSql } = require('../lib/SchemaFeatures');
    const clearAutoSuspend = await clearAutoSuspendSql();
    // A member who had deactivated the account goes back to Deactivated, not Active.
    const restored = await client.query(
      `
      UPDATE accounts
      SET status = ${restingStatusSql()},
          suspension_ends_at = NULL,
          ban_ends_at = NULL,
          lock_ends_at = NULL
          ${clearAutoSuspend}
      WHERE account_id = $1
      RETURNING status
      `,
      [accountId]
    );
    const nextStatus = restored.rows[0]?.status || 'Active';

    await recordAccountActivity({
      accountId,
      action: 'Account pardoned — violations cleared and status restored',
      eventCode: 'ACCOUNT_PARDONED',
      referenceTable: 'pardons',
      referencePrefix: 'PAR',
      referenceId: pardonRes.rows[0].pardon_id,
      actorStaffId: staffId,
      metadata: {
        previousStatus,
        status: nextStatus,
        violationsCleared: clearedViolations.rowCount || 0,
        punishmentsEnded: punishmentsEnded.length,
        note: note || null,
      },
      client,
    });

    await client.query('COMMIT');

    // A deactivated member is not told the account is "Active"; they reactivate it themselves.
    if (nextStatus === 'Active') {
      try {
        const { notifyAccountStatusChanged } = require('../services/AccountStandingServices');
        await notifyAccountStatusChanged(accountId, {
          status: 'Active',
          previousStatus,
          action: 'pardon',
          reason: note || 'Account pardoned — violations cleared and status restored',
          actorStaffId: staffId,
        });
      } catch (notifyErr) {
        console.warn('Failed to broadcast pardon status change:', notifyErr.message);
      }
    }

    try {
      const { refreshWarningBand } = require('../services/WarningBandServices');
      await refreshWarningBand(accountId, 0);
      if (punishmentsEnded.length) {
        // The member hears that the pardon ended their automatic limits ("You're unfrozen").
        const { broadcastPunishmentChange, notifyPunishmentsEnded } = require('../services/MeritPenaltyServices');
        await notifyPunishmentsEnded(accountId, punishmentsEnded, { cause: 'pardoned' });
        await broadcastPunishmentChange(accountId);
      }
    } catch (err) {
      console.warn('Warning band refresh after pardon failed:', err.message);
    }

    return {
      accountId,
      pardonId: pardonRes.rows[0].pardon_id,
      pardonedAt: pardonRes.rows[0].created_at,
      previousStatus,
      status: nextStatus,
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

/**
 * After a warning was set to `rescinded` (Users desk, or an accepted appeal on that warning):
 * record it, end the automatic punishments it started, refresh the band and tell the member
 * their merit came back. Never throws past the activity row.
 * @param {{ accountId: string, warning: { violation_id: string, violation_number?: string, type?: string },
 *   staffId?: string|null, source?: 'staff'|'appeal', ticketNumber?: string|null }} input
 * @returns {Promise<{ punishmentsEnded: object[] }>}
 */
async function announceWarningRescinded({ accountId, warning, staffId = null, source = 'staff', ticketNumber = null }) {
  const label = warning.type || 'warning';
  await recordAccountActivity({
    accountId,
    action: source === 'appeal'
      ? `Warning rescinded after an accepted appeal${ticketNumber ? ` (ticket #${ticketNumber})` : ''}: ${label}`
      : `Warning rescinded: ${label}`,
    eventCode: 'WARNING_RESCINDED',
    referenceTable: 'violations',
    referencePrefix: 'VIO',
    referenceId: warning.violation_id,
    actorStaffId: staffId,
    metadata: {
      violationId: warning.violation_id,
      violationNumber: warning.violation_number,
      status: 'rescinded',
      ...(source === 'appeal' ? { source: 'appeal', ticketNumber } : {}),
    },
  });

  // Punishments this warning started end with it (other warnings' punishments keep running).
  let punishmentsEnded = [];
  try {
    const { endMeritPenaltiesForWarning } = require('../services/MeritPenaltyServices');
    punishmentsEnded = await endMeritPenaltiesForWarning(accountId, warning.violation_id, { reason: 'rescinded', staffId });
  } catch (err) {
    console.warn('Ending punishments after rescind failed:', err.message);
  }

  // The member is told their merit came back; otherwise a rescind is invisible to them.
  try {
    const { refreshWarningBand } = require('../services/WarningBandServices');
    const next = await refreshWarningBand(accountId);
    const { createNotificationServices } = require('../services/NotificationServices');
    const notification = await createNotificationServices({
      account_id: accountId,
      message: `A warning on your account (${label}) was rescinded${
        source === 'appeal' ? ' after your appeal' : ''
      }. Your Platform Merit is now ${meritFromWarningPoints(next?.points ?? 0)}.`,
      is_read: false,
      reference_table: 'violations',
      reference_prefix: 'WARNING_UP',
      reference_path: '/profile',
      reference_id: warning.violation_id,
    });
    const { getIo } = require('../lib/WebSocket');
    const io = getIo();
    if (io && notification) io.to(String(accountId)).emit('notification', notification);
  } catch (err) {
    console.warn('Warning band refresh after rescind failed:', err.message);
  }
  return { punishmentsEnded: punishmentsEnded || [] };
}

async function rescindWarning(accountId, violationId, staffId) {
  await assertAccountExists(accountId);
  if (!staffId) throw new Error('Staff session required to rescind a warning');
  if (!violationId) throw new Error('Warning id is required');
  const { assertCanSanctionTarget } = require('../lib/SuspendGuards');
  await assertCanSanctionTarget({ actorStaffId: staffId, targetAccountId: accountId, action: 'rescind' });

  const updated = await pool.query(
    `
    UPDATE violations
    SET status = 'rescinded'
    WHERE account_id = $1
      AND deleted_at IS NULL
      AND (violation_id::text = $2 OR violation_number = $2)
      AND LOWER(COALESCE(status, 'active')) IN ('active', 'open', 'pending')
    RETURNING violation_id, violation_number, type
    `,
    [accountId, String(violationId)]
  );
  if (!updated.rows.length) throw new Error('Active warning not found');

  const row = updated.rows[0];
  const { punishmentsEnded } = await announceWarningRescinded({ accountId, warning: row, staffId });

  return {
    accountId,
    violationId: row.violation_id,
    violationNumber: row.violation_number,
    punishmentsEnded,
    status: 'rescinded',
  };
}

module.exports = {
  leaderPenaltyLinkedToTeam,
  getTeamsManagement,
  getUsersManagement,
  getUserTeamOverview,
  updateAccountStatus,
  updateAccountVerification,
  adjustAccountCredits,
  freezeAccountCredits,
  warnAccount,
  rescindWarning,
  announceWarningRescinded,
  pardonAccount,
  getUserVerificationRecord,
  updateUserVerificationExpiry,
  prepareUserVerificationApprovalExpiry,
  restoreUserVerificationExpiry,
  markUserVerificationPending,
  applyTeamVerificationAction,
};
