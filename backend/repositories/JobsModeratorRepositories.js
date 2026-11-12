const { pool } = require('../lib/Database');
const { QUEUE_SCOPES } = require('../lib/TicketEnums');
const { JOBS_REPORT_TYPES, closedReportStatusListSql } = require('../lib/ReportEnums');
const {
  fetchScopedTickets,
  scopedTicketCounts,
  scopedTicketCategoryBreakdown,
  fetchScopedDisputes,
  scopedDisputeCounts,
  fetchScopedReports,
  scopedReportCounts,
  ticketStatusChart,
  toCategoryChart,
  CHART_COLORS,
} = require('./ModeratorSharedRepositories');
const { fetchStaffWorkload } = require('./AdminTicketsRepositories');
const { sumActiveWarningPoints } = require('./WarningBandRepositories');
const { meritFromWarningPoints } = require('../lib/WarningBands');
const { recordAccountActivity } = require('./AccountActivityRepositories');
const { resolveStaffForSession } = require('../lib/StaffSession');

// Jobs & Gigs moderation covers Jobs and Gigs tickets + related disputes.
const JOBS_TICKET_SCOPE = QUEUE_SCOPES.jobs;
const JOBS_DISPUTE_ENTITIES = ['contract', 'transaction'];

/** Canonical moderator statuses: active | paused | closed | archived */
function normalizePostingStatus(rawStatus, deletedAt) {
  if (deletedAt) return 'archived';
  const s = String(rawStatus || '')
    .trim()
    .toLowerCase();
  if (s === 'open' || s === 'active') return 'active';
  if (s === 'paused' || s === 'pause') return 'paused';
  if (s === 'closed' || s === 'close') return 'closed';
  if (s === 'archived') return 'archived';
  return s || 'active';
}

/** Persist jobs with user-facing Title Case; gigs keep lowercase. */
function dbStatusForWrite(type, canonical) {
  const next = String(canonical || '').toLowerCase();
  if (type === 'job') {
    if (next === 'active') return 'Open';
    if (next === 'paused') return 'Paused';
    if (next === 'closed') return 'Closed';
  }
  return next;
}

function activeStatusSql(column = 'status') {
  return `LOWER(${column}) IN ('active', 'open')`;
}

function pausedStatusSql(column = 'status') {
  return `LOWER(${column}) IN ('paused', 'pause')`;
}

function closedStatusSql(column = 'status') {
  return `LOWER(${column}) IN ('closed', 'close')`;
}

async function getJobsTickets({ status } = {}) {
  return fetchScopedTickets({ ...JOBS_TICKET_SCOPE, status });
}

async function getJobsReports({ status } = {}) {
  return fetchScopedReports({ targetTypesIn: [...JOBS_REPORT_TYPES], status });
}

async function getJobsDisputes({ status } = {}) {
  // All moderators can view the full dispute queue (reply-only unless assigned).
  return fetchScopedDisputes({ status });
}

function mapPostingRow(row) {
  return {
    id: row.post_id,
    postNumber: row.post_number,
    type: row.post_type,
    title: row.title,
    description: row.description,
    status: normalizePostingStatus(row.status, row.deleted_at),
    paymentType: row.payment_type,
    category: row.category || null,
    experienceLevel: row.experience_level,
    rateCreditsMin: row.rate_min === null ? null : Number(row.rate_min),
    rateCreditsMax: row.rate_max === null ? null : Number(row.rate_max),
    // Jobs: open proposals; gigs: gig requests across tiers.
    applicantCount: Number(row.applicant_count || 0),
    contractCount: Number(row.contract_count || 0),
    // Unresolved reports filed against this exact posting — the triage signal.
    openReportCount: Number(row.open_report_count || 0),
    tags: row.tags || [],
    author: {
      accountId: row.author_account_id,
      name: row.author_name || 'Unknown',
      handle: row.author_handle || '—',
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastViewedAt: row.last_viewed_at,
    archivedAt: row.deleted_at,
  };
}

/**
 * Queue order the Jobs & Gigs Control desk can ask for.
 *
 * `flagged` floats postings with unresolved reports to the top, which is the order a
 * moderator working the queue wants; every other key is a plain column sort.
 */
const POSTING_SORTS = {
  flagged: 'p.open_report_count DESC, p.created_at DESC',
  newest: 'p.created_at DESC',
  oldest: 'p.created_at ASC',
  updated: 'p.updated_at DESC NULLS LAST, p.created_at DESC',
  applicants: 'p.applicant_count DESC, p.created_at DESC',
  contracts: 'p.contract_count DESC, p.created_at DESC',
  rate_desc: 'p.rate_max DESC NULLS LAST, p.created_at DESC',
  rate_asc: 'p.rate_min ASC NULLS LAST, p.created_at DESC',
  title: 'LOWER(p.title) ASC',
};

function postingLimit(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 100;
  return Math.min(parsed, 500);
}

// Combined job + gig postings list for the moderation queue.
async function getJobsGigsPostings({ type, status, search, sort, limit } = {}) {
  const params = [];
  const filters = [];

  if (type === 'job' || type === 'gig') {
    params.push(type);
    filters.push(`p.post_type = $${params.length}`);
  }
  if (status && status !== 'all') {
    if (status === 'archived') {
      filters.push('p.deleted_at IS NOT NULL');
    } else if (status === 'active') {
      filters.push(`(${activeStatusSql('p.status')}) AND p.deleted_at IS NULL`);
    } else if (status === 'paused') {
      filters.push(`(${pausedStatusSql('p.status')}) AND p.deleted_at IS NULL`);
    } else if (status === 'closed') {
      filters.push(`(${closedStatusSql('p.status')}) AND p.deleted_at IS NULL`);
    } else {
      params.push(String(status).toLowerCase());
      filters.push(`LOWER(p.status) = $${params.length} AND p.deleted_at IS NULL`);
    }
  }
  if (search) {
    params.push(`%${String(search).toLowerCase()}%`);
    filters.push(
      `(LOWER(p.title) LIKE $${params.length} OR LOWER(a.display_name) LIKE $${params.length} OR LOWER(a.handle) LIKE $${params.length} OR p.post_number LIKE UPPER($${params.length}) OR p.post_id::text LIKE $${params.length})`
    );
  }

  const whereSql = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const orderBy = POSTING_SORTS[String(sort || 'newest')] || POSTING_SORTS.newest;
  params.push(postingLimit(limit));
  const limitParam = `$${params.length}`;

  // One unresolved-report count per posting, so the desk can sort by what is flagged.
  const openReportCountSql = (idColumn) => `
        (SELECT COUNT(*)::int
           FROM reports r
          WHERE r.deleted_at IS NULL
            AND r.target_id = ${idColumn}::text
            AND LOWER(r.status) NOT IN (${closedReportStatusListSql()}))`;

  const result = await pool.query(
    `
    SELECT p.*, COALESCE(a.display_name, u.first_name || ' ' || u.last_name) AS author_name, a.handle AS author_handle
    FROM (
      SELECT
        j.job_id AS post_id,
        'J-' || UPPER(LEFT(j.job_id::text, 8)) AS post_number,
        'job' AS post_type,
        j.title, j.description, j.payment_type, j.status,
        j.category,
        j.experience_level,
        ${openReportCountSql('j.job_id')} AS open_report_count,
        j.rate_credits_min AS rate_min,
        j.rate_credits_max AS rate_max,
        (SELECT COUNT(*)::int FROM proposals pr WHERE pr.job_id = j.job_id AND pr.deleted_at IS NULL) AS applicant_count,
        (SELECT COUNT(*)::int
           FROM job_contracts jc
           JOIN proposals pr2 ON pr2.proposal_id = jc.proposal_id
          WHERE pr2.job_id = j.job_id) AS contract_count,
        (SELECT COALESCE(ARRAY_AGG(t.name ORDER BY t.name), '{}')
           FROM job_tags jt JOIN tags t ON t.tag_id = jt.tag_id
          WHERE jt.job_id = j.job_id) AS tags,
        j.created_at, j.updated_at, j.last_viewed_at, j.deleted_at,
        j.client_account_id AS author_account_id
      FROM jobs j
      UNION ALL
      SELECT
        g.gig_id AS post_id,
        'G-' || UPPER(LEFT(g.gig_id::text, 8)) AS post_number,
        'gig' AS post_type,
        g.title, g.description, g.payment_type, g.status,
        g.category,
        NULL AS experience_level,
        ${openReportCountSql('g.gig_id')} AS open_report_count,
        (SELECT MIN(gt.rate_credits) FROM gig_tiers gt WHERE gt.gig_id = g.gig_id AND gt.deleted_at IS NULL) AS rate_min,
        (SELECT MAX(gt.rate_credits) FROM gig_tiers gt WHERE gt.gig_id = g.gig_id AND gt.deleted_at IS NULL) AS rate_max,
        (SELECT COUNT(*)::int
           FROM gig_requests gr
           JOIN gig_tiers gt2 ON gt2.gig_tier_id = gr.gig_tier_id
          WHERE gt2.gig_id = g.gig_id AND gr.deleted_at IS NULL) AS applicant_count,
        (SELECT COUNT(*)::int
           FROM gig_contracts gc
           JOIN gig_requests gr2 ON gr2.gig_request_id = gc.gig_request_id
           JOIN gig_tiers gt3 ON gt3.gig_tier_id = gr2.gig_tier_id
          WHERE gt3.gig_id = g.gig_id) AS contract_count,
        (SELECT COALESCE(ARRAY_AGG(t.name ORDER BY t.name), '{}')
           FROM gig_tags gg JOIN tags t ON t.tag_id = gg.tag_id
          WHERE gg.gig_id = g.gig_id) AS tags,
        g.created_at, g.updated_at, g.last_viewed_at, g.deleted_at,
        g.freelancer_account_id AS author_account_id
      FROM gigs g
    ) p
    LEFT JOIN accounts a ON a.account_id = p.author_account_id
    LEFT JOIN users u ON u.account_id = a.account_id
    ${whereSql}
    ORDER BY ${orderBy}
    LIMIT ${limitParam}
    `,
    params
  );
  return result.rows.map(mapPostingRow);
}

/** Reports filed against one posting, so the review modal shows why it was flagged. */
async function getPostingReports(postingId) {
  const result = await pool.query(
    `
    SELECT r.report_id, r.report_number, r.type, r.status, r.priority, r.description,
           r.created_at, r.updated_at,
           COALESCE(a.display_name, u.first_name || ' ' || u.last_name) AS reporter_name,
           a.handle AS reporter_handle
    FROM reports r
    LEFT JOIN accounts a ON a.account_id = r.by_account_id
    LEFT JOIN users u ON u.account_id = a.account_id
    WHERE r.deleted_at IS NULL AND r.target_id = $1::text
    ORDER BY r.created_at DESC
    LIMIT 20
    `,
    [String(postingId)]
  );
  return result.rows.map((row) => ({
    id: row.report_id,
    number: row.report_number,
    type: row.type,
    status: row.status,
    priority: row.priority,
    description: row.description,
    reporter: { name: row.reporter_name || 'Unknown', handle: row.reporter_handle || '—' },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/** Past moderation actions on one posting, with the reason each one was taken for. */
async function getPostingModerationHistory(postingId) {
  const result = await pool.query(
    `
    SELECT aa.account_activity_id, aa.action, aa.event_code, aa.created_at, aa.metadata,
           COALESCE(sa.display_name, s.first_name || ' ' || s.last_name) AS actor_name,
           s.role AS actor_role
    FROM account_activity aa
    LEFT JOIN staff s ON s.staff_id = aa.actor_staff_id
    LEFT JOIN accounts sa ON sa.account_id = s.account_id
    WHERE aa.reference_id = $1::text
      AND aa.event_code IN ('JOBS_POSTING_STATUS_CHANGED', 'JOBS_POSTING_ARCHIVED')
    ORDER BY aa.created_at DESC
    LIMIT 20
    `,
    [String(postingId)]
  );
  return result.rows.map((row) => {
    const metadata = typeof row.metadata === 'string' ? safeJson(row.metadata) : row.metadata || {};
    return {
      id: row.account_activity_id,
      action: row.action,
      eventCode: row.event_code,
      previousStatus: metadata?.previousStatus || null,
      status: metadata?.status || null,
      reason: metadata?.reason || null,
      actor: row.actor_name ? { name: row.actor_name, role: row.actor_role || 'Staff' } : null,
      createdAt: row.created_at,
    };
  });
}

function safeJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

// Full record for one posting, with everything a moderator may need to review it.
async function getJobsGigsPostingDetail(type, id) {
  if (type === 'job') {
    const jobResult = await pool.query(
      `
      SELECT j.*, COALESCE(a.display_name, u.first_name || ' ' || u.last_name) AS author_name,
             a.handle AS author_handle, a.status AS author_status
      FROM jobs j
      LEFT JOIN accounts a ON a.account_id = j.client_account_id
      LEFT JOIN users u ON u.account_id = a.account_id
      WHERE j.job_id = $1
      `,
      [id]
    );
    if (!jobResult.rows.length) return null;
    const j = jobResult.rows[0];

    const [
      tagsResult,
      proposalsResult,
      contractsResult,
      attachmentsResult,
      postingReports,
      moderationHistory,
    ] = await Promise.all([
      pool.query(
        `SELECT t.name FROM job_tags jt JOIN tags t ON t.tag_id = jt.tag_id WHERE jt.job_id = $1 ORDER BY t.name`,
        [id]
      ),
      pool.query(
        `
        SELECT pr.proposal_id, pr.status, pr.rate_credits, pr.weekly_hrs_max, pr.created_at,
               COALESCE(a.display_name, u.first_name || ' ' || u.last_name) AS freelancer_name, a.handle AS freelancer_handle,
               (SELECT COUNT(*)::int FROM proposal_milestones pm WHERE pm.proposal_id = pr.proposal_id AND pm.deleted_at IS NULL) AS milestone_count
        FROM proposals pr
        LEFT JOIN accounts a ON a.account_id = pr.freelancer_account_id
        LEFT JOIN users u ON u.account_id = a.account_id
        WHERE pr.job_id = $1 AND pr.deleted_at IS NULL
        ORDER BY pr.created_at DESC
        LIMIT 50
        `,
        [id]
      ),
      pool.query(
        `
        SELECT c.contract_id, c.contract_type, c.payment_type, c.rate_credits, c.status, c.starts_at, c.created_at,
               COALESCE(a.display_name, u.first_name || ' ' || u.last_name) AS freelancer_name, a.handle AS freelancer_handle
        FROM job_contracts jc
        JOIN proposals pr ON pr.proposal_id = jc.proposal_id
        JOIN contracts c ON c.contract_id = jc.contract_id
        LEFT JOIN accounts a ON a.account_id = pr.freelancer_account_id
        LEFT JOIN users u ON u.account_id = a.account_id
        WHERE pr.job_id = $1
        ORDER BY c.created_at DESC
        `,
        [id]
      ),
      pool.query(
        `SELECT f.file_id, f.name, f.mime_type, f.size_bytes
         FROM job_attachments ja JOIN files f ON f.file_id = ja.file_id
         WHERE ja.job_id = $1 ORDER BY ja.index`,
        [id]
      ),
      getPostingReports(id),
      getPostingModerationHistory(id),
    ]);

    return {
      type: 'job',
      id: j.job_id,
      postNumber: `J-${String(j.job_id).slice(0, 8).toUpperCase()}`,
      title: j.title,
      description: j.description,
      status: normalizePostingStatus(j.status, j.deleted_at),
      paymentType: j.payment_type,
      category: j.category || null,
      experienceLevel: j.experience_level,
      noOfHires: Number(j.no_of_hires),
      roughDeadline: j.rough_deadline,
      roughDurationHrs: j.rough_duration_hrs === null ? null : Number(j.rough_duration_hrs),
      roughNoOfRevisions: Number(j.rough_no_of_revisions),
      rateCreditsMin: Number(j.rate_credits_min),
      rateCreditsMax: Number(j.rate_credits_max),
      weeklyHrsMax: j.weekly_hrs_max === null ? null : Number(j.weekly_hrs_max),
      createdAt: j.created_at,
      updatedAt: j.updated_at,
      lastViewedAt: j.last_viewed_at,
      archivedAt: j.deleted_at,
      author: {
        accountId: j.client_account_id,
        name: j.author_name || 'Unknown',
        handle: j.author_handle || '—',
        status: j.author_status,
        warningPoints: null,
      },
      tags: tagsResult.rows.map((r) => r.name),
      attachments: attachmentsResult.rows.map((r) => ({
        fileId: r.file_id,
        name: r.name,
        mimeType: r.mime_type,
        sizeBytes: Number(r.size_bytes),
      })),
      proposals: proposalsResult.rows.map((r) => ({
        id: r.proposal_id,
        status: r.status,
        rateCredits: Number(r.rate_credits),
        weeklyHrsMax: r.weekly_hrs_max === null ? null : Number(r.weekly_hrs_max),
        milestoneCount: Number(r.milestone_count),
        freelancer: { name: r.freelancer_name || 'Unknown', handle: r.freelancer_handle || '—' },
        createdAt: r.created_at,
      })),
      contracts: contractsResult.rows.map((r) => ({
        id: r.contract_id,
        type: r.contract_type,
        paymentType: r.payment_type,
        rateCredits: Number(r.rate_credits),
        status: r.status,
        counterparty: { name: r.freelancer_name || 'Unknown', handle: r.freelancer_handle || '—' },
        startsAt: r.starts_at,
        createdAt: r.created_at,
      })),
      reports: postingReports,
      moderationHistory,
    };
  }

  if (type === 'gig') {
    const gigResult = await pool.query(
      `
      SELECT g.*, COALESCE(a.display_name, u.first_name || ' ' || u.last_name) AS author_name,
             a.handle AS author_handle, a.status AS author_status
      FROM gigs g
      LEFT JOIN accounts a ON a.account_id = g.freelancer_account_id
      LEFT JOIN users u ON u.account_id = a.account_id
      WHERE g.gig_id = $1
      `,
      [id]
    );
    if (!gigResult.rows.length) return null;
    const g = gigResult.rows[0];

    const [
      tagsResult,
      tiersResult,
      addonsResult,
      requestsResult,
      contractsResult,
      attachmentsResult,
      postingReports,
      moderationHistory,
    ] = await Promise.all([
        pool.query(
          `SELECT t.name FROM gig_tags gt JOIN tags t ON t.tag_id = gt.tag_id WHERE gt.gig_id = $1 ORDER BY t.name`,
          [id]
        ),
        pool.query(
          `SELECT gig_tier_id, title, description, rate_credits, weekly_hrs_max, delivery_days, no_of_revisions_max
           FROM gig_tiers WHERE gig_id = $1 AND deleted_at IS NULL ORDER BY rate_credits`,
          [id]
        ),
        pool.query(
          `SELECT gig_addon_id, name, price_credits, additional_days
           FROM gig_addons WHERE gig_id = $1 AND deleted_at IS NULL ORDER BY price_credits`,
          [id]
        ),
        pool.query(
          `
          SELECT gr.gig_request_id, gr.status, gr.created_at, gt.title AS tier_title, gt.rate_credits,
                 COALESCE(a.display_name, u.first_name || ' ' || u.last_name) AS client_name, a.handle AS client_handle
          FROM gig_requests gr
          JOIN gig_tiers gt ON gt.gig_tier_id = gr.gig_tier_id
          LEFT JOIN accounts a ON a.account_id = gr.client_account_id
          LEFT JOIN users u ON u.account_id = a.account_id
          WHERE gt.gig_id = $1 AND gr.deleted_at IS NULL
          ORDER BY gr.created_at DESC
          LIMIT 50
          `,
          [id]
        ),
        pool.query(
          `
          SELECT c.contract_id, c.contract_type, c.payment_type, c.rate_credits, c.status, c.starts_at, c.created_at,
                 COALESCE(a.display_name, u.first_name || ' ' || u.last_name) AS client_name, a.handle AS client_handle
          FROM gig_contracts gc
          JOIN gig_requests gr ON gr.gig_request_id = gc.gig_request_id
          JOIN gig_tiers gt ON gt.gig_tier_id = gr.gig_tier_id
          JOIN contracts c ON c.contract_id = gc.contract_id
          LEFT JOIN accounts a ON a.account_id = gr.client_account_id
          LEFT JOIN users u ON u.account_id = a.account_id
          WHERE gt.gig_id = $1
          ORDER BY c.created_at DESC
          `,
          [id]
        ),
        pool.query(
          `SELECT f.file_id, f.name, f.mime_type, f.size_bytes
           FROM gig_attachments ga JOIN files f ON f.file_id = ga.file_id
           WHERE ga.gig_id = $1 ORDER BY ga.index`,
          [id]
        ),
        getPostingReports(id),
        getPostingModerationHistory(id),
      ]);

    return {
      type: 'gig',
      id: g.gig_id,
      postNumber: `G-${String(g.gig_id).slice(0, 8).toUpperCase()}`,
      title: g.title,
      description: g.description,
      status: normalizePostingStatus(g.status, g.deleted_at),
      paymentType: g.payment_type,
      category: g.category || null,
      noOfConcurrentMax: Number(g.no_of_concurrent_max),
      createdAt: g.created_at,
      updatedAt: g.updated_at,
      lastViewedAt: g.last_viewed_at,
      archivedAt: g.deleted_at,
      author: {
        accountId: g.freelancer_account_id,
        name: g.author_name || 'Unknown',
        handle: g.author_handle || '—',
        status: g.author_status,
        warningPoints: null,
      },
      tags: tagsResult.rows.map((r) => r.name),
      attachments: attachmentsResult.rows.map((r) => ({
        fileId: r.file_id,
        name: r.name,
        mimeType: r.mime_type,
        sizeBytes: Number(r.size_bytes),
      })),
      tiers: tiersResult.rows.map((r) => ({
        id: r.gig_tier_id,
        title: r.title,
        description: r.description,
        rateCredits: Number(r.rate_credits),
        weeklyHrsMax: r.weekly_hrs_max === null ? null : Number(r.weekly_hrs_max),
        deliveryDays: Number(r.delivery_days),
        noOfRevisionsMax: Number(r.no_of_revisions_max),
      })),
      addons: addonsResult.rows.map((r) => ({
        id: r.gig_addon_id,
        name: r.name,
        priceCredits: Number(r.price_credits),
        additionalDays: Number(r.additional_days),
      })),
      requests: requestsResult.rows.map((r) => ({
        id: r.gig_request_id,
        status: r.status,
        tierTitle: r.tier_title,
        rateCredits: Number(r.rate_credits),
        client: { name: r.client_name || 'Unknown', handle: r.client_handle || '—' },
        createdAt: r.created_at,
      })),
      contracts: contractsResult.rows.map((r) => ({
        id: r.contract_id,
        type: r.contract_type,
        paymentType: r.payment_type,
        rateCredits: Number(r.rate_credits),
        status: r.status,
        counterparty: { name: r.client_name || 'Unknown', handle: r.client_handle || '—' },
        startsAt: r.starts_at,
        createdAt: r.created_at,
      })),
      reports: postingReports,
      moderationHistory,
    };
  }

  throw new Error(`Invalid posting type: ${type}`);
}

// Moderate a posting: change its status, archive it (soft delete) or restore it.
/**
 * Moderates one job or gig posting.
 *
 * The change is written to `account_activity` against the posting owner — the
 * client for a job, the freelancer for a gig — so the action shows up in
 * Moderation → Activity log with its reason and who made it.
 *
 * @param reason {string} optional note shown in the activity log
 */
async function updateJobsGigsPosting(type, id, { status, reason } = {}, session = null) {
  const table = type === 'job' ? 'jobs' : type === 'gig' ? 'gigs' : null;
  if (!table) throw new Error(`Invalid posting type: ${type}`);

  const allowed = ['active', 'paused', 'closed', 'archived'];
  const next = String(status || '').toLowerCase();
  if (!allowed.includes(next)) throw new Error(`Invalid posting status: ${status}`);
  const note = String(reason || '').trim();
  if (note.length > 500) throw new Error('Keep the reason under 500 characters');
  // Taking a posting off the board is written to the owner's activity log and shown to
  // staff reviewing the case later, so it always carries a reason.
  if (!note && ['paused', 'closed', 'archived'].includes(next)) {
    const error = new Error(`A reason is required when you ${next === 'archived' ? 'archive' : next === 'closed' ? 'close' : 'pause'} a posting`);
    error.statusCode = 400;
    throw error;
  }

  const idColumn = type === 'job' ? 'job_id' : 'gig_id';
  const ownerColumn = type === 'job' ? 'client_account_id' : 'freelancer_account_id';

  const current = await pool.query(
    `SELECT ${idColumn} AS id, title, status, deleted_at, ${ownerColumn} AS owner_account_id
     FROM ${table} WHERE ${idColumn} = $1`,
    [id]
  );
  const posting = current.rows[0];
  if (!posting) return null;

  const previousStatus = normalizePostingStatus(posting.status, posting.deleted_at);
  if (previousStatus === next) {
    const error = new Error(`This ${type} is already ${next}`);
    error.statusCode = 409;
    throw error;
  }

  if (next === 'archived') {
    await pool.query(`UPDATE ${table} SET deleted_at = NOW(), updated_at = NOW() WHERE ${idColumn} = $1`, [id]);
  } else {
    const dbStatus = dbStatusForWrite(type, next);
    await pool.query(
      `UPDATE ${table} SET status = $1, deleted_at = NULL, updated_at = NOW() WHERE ${idColumn} = $2`,
      [dbStatus, id]
    );
  }

  if (posting.owner_account_id) {
    const staff = await resolveStaffForSession(session);
    const verb = { active: 'Reopened', paused: 'Paused', closed: 'Closed', archived: 'Archived' }[next];
    await recordAccountActivity({
      accountId: posting.owner_account_id,
      action: `${verb} ${type} posting “${posting.title || id}”`,
      eventCode: next === 'archived' ? 'JOBS_POSTING_ARCHIVED' : 'JOBS_POSTING_STATUS_CHANGED',
      referenceTable: table,
      referencePrefix: type === 'job' ? 'JOB' : 'GIG',
      referenceId: id,
      actorStaffId: staff?.staff_id || null,
      actorAccountId: staff?.account_id || session?.account_id || session?.accountId || null,
      metadata: {
        postingType: type,
        postingTitle: posting.title || null,
        previousStatus,
        status: next,
        reason: note || null,
      },
    });
  }

  return getJobsGigsPostingDetail(type, id);
}

// Full jobs/gigs/contracts history for one user account.
async function getUserJobsHistory(accountId) {
  const accountResult = await pool.query(
    `
    SELECT a.account_id, COALESCE(a.display_name, u.first_name || ' ' || u.last_name) AS name, a.handle, a.status
    FROM accounts a
    LEFT JOIN users u ON u.account_id = a.account_id
    WHERE a.account_id = $1
    `,
    [accountId]
  );
  if (!accountResult.rows.length) return null;
  const acc = accountResult.rows[0];

  const [jobsResult, gigsResult, contractsResult, proposalsResult, gigRequestsResult, warningPoints] = await Promise.all([
    pool.query(
      `SELECT job_id, title, status, payment_type, rate_credits_min, rate_credits_max, created_at, deleted_at
       FROM jobs WHERE client_account_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [accountId]
    ),
    pool.query(
      `SELECT gig_id, title, status, payment_type, created_at, deleted_at
       FROM gigs WHERE freelancer_account_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [accountId]
    ),
    pool.query(
      `
      SELECT DISTINCT
        c.contract_id, c.contract_type, c.payment_type, c.rate_credits, c.status, c.created_at,
        COALESCE(j.title, g.title) AS related_title,
        CASE
          WHEN j.client_account_id = $1 OR gr.client_account_id = $1 THEN 'client'
          ELSE 'freelancer'
        END AS role
      FROM contracts c
      LEFT JOIN job_contracts jc ON jc.contract_id = c.contract_id
      LEFT JOIN proposals pr ON pr.proposal_id = jc.proposal_id
      LEFT JOIN jobs j ON j.job_id = pr.job_id
      LEFT JOIN gig_contracts gc ON gc.contract_id = c.contract_id
      LEFT JOIN gig_requests gr ON gr.gig_request_id = gc.gig_request_id
      LEFT JOIN gig_tiers gt ON gt.gig_tier_id = gr.gig_tier_id
      LEFT JOIN gigs g ON g.gig_id = gt.gig_id
      WHERE pr.freelancer_account_id = $1
         OR j.client_account_id = $1
         OR gr.client_account_id = $1
         OR g.freelancer_account_id = $1
      ORDER BY c.created_at DESC
      LIMIT 50
      `,
      [accountId]
    ),
    pool.query(
      `
      SELECT pr.proposal_id, pr.status, pr.rate_credits, pr.created_at, j.title AS job_title
      FROM proposals pr
      LEFT JOIN jobs j ON j.job_id = pr.job_id
      WHERE pr.freelancer_account_id = $1 AND pr.deleted_at IS NULL
      ORDER BY pr.created_at DESC
      LIMIT 50
      `,
      [accountId]
    ),
    pool.query(
      `
      SELECT gr.gig_request_id, gr.status, gr.created_at, gt.title AS tier_title, gt.rate_credits, g.title AS gig_title
      FROM gig_requests gr
      JOIN gig_tiers gt ON gt.gig_tier_id = gr.gig_tier_id
      JOIN gigs g ON g.gig_id = gt.gig_id
      WHERE gr.client_account_id = $1 AND gr.deleted_at IS NULL
      ORDER BY gr.created_at DESC
      LIMIT 50
      `,
      [accountId]
    ),
    sumActiveWarningPoints(accountId),
  ]);

  return {
    account: {
      accountId: acc.account_id,
      name: acc.name || 'Unknown',
      handle: acc.handle || '—',
      status: acc.status,
      merit: meritFromWarningPoints(warningPoints),
    },
    jobs: jobsResult.rows.map((r) => ({
      id: r.job_id,
      title: r.title,
      status: normalizePostingStatus(r.status, r.deleted_at),
      paymentType: r.payment_type,
      rateCreditsMin: Number(r.rate_credits_min),
      rateCreditsMax: Number(r.rate_credits_max),
      createdAt: r.created_at,
    })),
    gigs: gigsResult.rows.map((r) => ({
      id: r.gig_id,
      title: r.title,
      status: normalizePostingStatus(r.status, r.deleted_at),
      paymentType: r.payment_type,
      createdAt: r.created_at,
    })),
    contracts: contractsResult.rows.map((r) => ({
      id: r.contract_id,
      type: r.contract_type,
      paymentType: r.payment_type,
      rateCredits: Number(r.rate_credits),
      status: r.status,
      role: r.role,
      relatedTitle: r.related_title,
      createdAt: r.created_at,
    })),
    proposals: proposalsResult.rows.map((r) => ({
      id: r.proposal_id,
      jobTitle: r.job_title,
      status: r.status,
      rateCredits: Number(r.rate_credits),
      createdAt: r.created_at,
    })),
    gigRequests: gigRequestsResult.rows.map((r) => ({
      id: r.gig_request_id,
      gigTitle: r.gig_title,
      tierTitle: r.tier_title,
      rateCredits: Number(r.rate_credits),
      status: r.status,
      createdAt: r.created_at,
    })),
  };
}

function buildAlerts(tc, dc, reportBreakdown, postingCounts, pipelineCounts, queueHealth) {
  const alerts = [];
  const health = queueHealth || {};
  const openTickets = Number(tc.open_count) + Number(tc.in_progress) + Number(tc.escalated_dev || 0);
  const pausedJobs = Number(postingCounts?.paused_jobs || 0);
  const pausedGigs = Number(postingCounts?.paused_gigs || 0);
  const openJobs = Number(postingCounts?.active_jobs || 0);
  const pendingProposals = Number(pipelineCounts?.pending_proposals || 0);
  const rb = reportBreakdown?.counts || {};

  if (Number(dc.open_count) > 0) {
    alerts.push({
      id: 'open-disputes',
      message: `${dc.open_count} job/gig dispute(s) open — ${Number(dc.credits_at_risk).toLocaleString()} credits at risk.`,
      severity: 'error',
      action: { tab: 'disputes' },
    });
  }
  if (Number(tc.unassigned) > 0) {
    alerts.push({
      id: 'unassigned',
      message: `${tc.unassigned} job/gig ticket(s) have no assignee.`,
      severity: 'warning',
      action: { tab: 'ticket-management', ticketFilters: { assignee: 'unassigned' } },
    });
  }
  if (Number(tc.high_priority) > 0) {
    alerts.push({
      id: 'high-priority',
      message: `${tc.high_priority} high-priority job/gig ticket(s) need attention.`,
      severity: 'error',
      action: { tab: 'ticket-management', ticketFilters: { priority: 'High' } },
    });
  }
  if (Number(tc.awaiting_reply) > 0) {
    alerts.push({
      id: 'awaiting-reply',
      message: `${tc.awaiting_reply} job/gig ticket(s) awaiting a staff reply.`,
      severity: 'warning',
      action: { tab: 'ticket-management' },
    });
  }
  if (Number(tc.escalated) > 0) {
    alerts.push({
      id: 'escalated',
      message: `${tc.escalated} escalated job/gig ticket(s) need a handoff.`,
      severity: 'error',
      action: { tab: 'ticket-management' },
    });
  }
  if (Number(rb.openCount) > 0) {
    alerts.push({
      id: 'open-reports',
      message: `${rb.openCount} job/gig report(s) need review.`,
      severity: 'warning',
      action: { tab: 'reports' },
    });
  }
  if (Number(rb.unassigned) > 0) {
    alerts.push({
      id: 'unassigned-reports',
      message: `${rb.unassigned} job/gig report(s) are unassigned.`,
      severity: 'warning',
      action: { tab: 'reports' },
    });
  }
  if (Number(health.ticketsOver48h) > 0) {
    alerts.push({
      id: 'ageing-tickets',
      message: `${health.ticketsOver48h} job/gig ticket(s) have been open over 48h.`,
      severity: 'error',
      action: { tab: 'ticket-management', ticketFilters: { flag: 'open_only' } },
    });
  }
  if (Number(health.ticketsNeverAnswered) > 0) {
    alerts.push({
      id: 'never-answered',
      message: `${health.ticketsNeverAnswered} open job/gig ticket(s) have never had a staff reply.`,
      severity: 'warning',
      action: { tab: 'ticket-management', ticketFilters: { flag: 'open_only' } },
    });
  }
  if (Number(health.reportsOver48h) > 0) {
    alerts.push({
      id: 'ageing-reports',
      message: `${health.reportsOver48h} job/gig report(s) have waited over 48h for triage.`,
      severity: 'error',
      action: { tab: 'reports' },
    });
  }
  if (Number(health.disputesOver7d) > 0) {
    alerts.push({
      id: 'ageing-disputes',
      message: `${health.disputesOver7d} job/gig dispute(s) have been open over 7 days.`,
      severity: 'error',
      action: { tab: 'disputes' },
    });
  }
  if (Number(health.staleActivePostings) > 0) {
    alerts.push({
      id: 'stale-postings',
      message: `${health.staleActivePostings} active posting(s) have not been touched in 60 days.`,
      severity: 'info',
      action: { tab: 'control' },
    });
  }
  if (pausedJobs + pausedGigs > 0) {
    alerts.push({
      id: 'paused-postings',
      message: `${pausedJobs + pausedGigs} posting(s) currently paused (${pausedJobs} jobs · ${pausedGigs} gigs).`,
      severity: 'info',
      action: { tab: 'control' },
    });
  }
  if (pendingProposals > 0) {
    alerts.push({
      id: 'pending-proposals',
      message: `${pendingProposals} proposal(s) waiting on clients.`,
      severity: 'info',
      action: { tab: 'control' },
    });
  }
  if (openTickets > 0) {
    alerts.push({
      id: 'open-tickets',
      message: `${openTickets} job/gig ticket(s) open.`,
      severity: 'info',
      action: { tab: 'ticket-management' },
    });
  }
  if (openJobs > 0 && alerts.length < 2) {
    alerts.push({
      id: 'active-jobs',
      message: `${openJobs} active job posting(s) on the board.`,
      severity: 'info',
      action: { tab: 'control' },
    });
  }
  if (!alerts.length) {
    alerts.push({ id: 'clear', message: 'Jobs & Gigs queues are clear.', severity: 'success' });
  }
  return alerts;
}

async function getJobsReportBreakdown(targetTypesIn) {
  const params = [targetTypesIn];
  const [result, typeResult] = await Promise.all([
  pool.query(
    `
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE LOWER(status) IN ('open', 'pending'))::int AS open_status,
      COUNT(*) FILTER (WHERE LOWER(status) IN ('in_review', 'in review', 'in_progress', 'in progress'))::int AS in_review,
      COUNT(*) FILTER (WHERE LOWER(status) IN ('resolved', 'closed'))::int AS resolved,
      COUNT(*) FILTER (WHERE LOWER(status) = 'dismissed')::int AS dismissed,
      COUNT(*) FILTER (
        WHERE LOWER(status) NOT IN ('resolved', 'closed', 'dismissed', 'denied', 'archived', 'sanctioned')
          AND assigned_staff_id IS NULL
      )::int AS unassigned,
      COUNT(*) FILTER (
        WHERE LOWER(priority) = 'high'
          AND LOWER(status) NOT IN ('resolved', 'closed', 'dismissed', 'denied', 'archived', 'sanctioned')
      )::int AS high_priority
    FROM reports
    WHERE deleted_at IS NULL
      AND LOWER(COALESCE(target_type, type)) = ANY($1)
    `,
    params
  ),
  pool.query(
    `
    SELECT LOWER(COALESCE(target_type, type)) AS target_type, COUNT(*)::int AS count
    FROM reports
    WHERE deleted_at IS NULL
      AND LOWER(COALESCE(target_type, type)) = ANY($1)
    GROUP BY 1
    ORDER BY count DESC
    `,
    params
  ),
  ]);
  const c = result.rows[0] || {};
  return {
    counts: {
      total: Number(c.total || 0),
      openStatus: Number(c.open_status || 0),
      inReview: Number(c.in_review || 0),
      resolved: Number(c.resolved || 0),
      dismissed: Number(c.dismissed || 0),
      unassigned: Number(c.unassigned || 0),
      highPriority: Number(c.high_priority || 0),
      openCount: Number(c.open_status || 0) + Number(c.in_review || 0),
    },
    byType: typeResult.rows.map((r) => ({
      label: String(r.target_type || 'other')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (ch) => ch.toUpperCase()),
      value: Number(r.count),
    })),
  };
}

/**
 * Queue health for the Jobs & Gigs dashboard.
 *
 * Everything here answers "is this desk keeping up?": how old the oldest untouched case is,
 * how much is ageing past the service targets, how much the desk closed recently, and how
 * much board activity is waiting on moderation. Counted straight off the durable tables so
 * the numbers match the queues they link to.
 */
async function getJobsQueueHealth(reportTargetTypes) {
  const closedReports = closedReportStatusListSql();
  const [tickets, reports, disputes, board, actions] = await Promise.all([
    pool.query(
      `
      SELECT
        MIN(created_at) FILTER (WHERE status NOT IN ('Resolved', 'Closed')) AS oldest_open_at,
        COUNT(*) FILTER (
          WHERE status NOT IN ('Resolved', 'Closed') AND created_at < NOW() - INTERVAL '48 hours'
        )::int AS open_over_48h,
        COUNT(*) FILTER (
          WHERE status NOT IN ('Resolved', 'Closed') AND created_at < NOW() - INTERVAL '7 days'
        )::int AS open_over_7d,
        COUNT(*) FILTER (
          WHERE status NOT IN ('Resolved', 'Closed') AND first_staff_reply_at IS NULL
        )::int AS never_answered,
        COUNT(*) FILTER (WHERE resolved_at >= NOW() - INTERVAL '7 days')::int AS resolved_7d,
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))) FILTER (
          WHERE resolved_at IS NOT NULL AND resolved_at >= NOW() - INTERVAL '30 days'
        ) AS avg_resolution_seconds,
        AVG(EXTRACT(EPOCH FROM (first_staff_reply_at - created_at))) FILTER (
          WHERE first_staff_reply_at IS NOT NULL AND created_at >= NOW() - INTERVAL '30 days'
        ) AS avg_first_reply_seconds
      FROM tickets
      WHERE deleted_at IS NULL AND type = ANY($1)
      `,
      [[...QUEUE_SCOPES.jobs.typesIn]]
    ),
    pool.query(
      `
      SELECT
        MIN(created_at) FILTER (WHERE LOWER(status) NOT IN (${closedReports})) AS oldest_open_at,
        COUNT(*) FILTER (
          WHERE LOWER(status) NOT IN (${closedReports}) AND created_at < NOW() - INTERVAL '48 hours'
        )::int AS open_over_48h,
        COUNT(*) FILTER (
          WHERE LOWER(status) IN ('resolved', 'closed', 'sanctioned')
            AND updated_at >= NOW() - INTERVAL '7 days'
        )::int AS closed_7d
      FROM reports
      WHERE deleted_at IS NULL AND LOWER(COALESCE(target_type, type)) = ANY($1)
      `,
      [reportTargetTypes]
    ),
    pool.query(
      `
      SELECT
        MIN(opened_at) FILTER (WHERE LOWER(status::text) IN ('open', 'under_review')) AS oldest_open_at,
        COUNT(*) FILTER (
          WHERE LOWER(status::text) IN ('open', 'under_review')
            AND opened_at < NOW() - INTERVAL '7 days'
        )::int AS open_over_7d,
        COUNT(*) FILTER (
          WHERE LOWER(status::text) IN ('open', 'under_review') AND handled_by_staff_id IS NULL
        )::int AS unassigned,
        COUNT(*) FILTER (WHERE resolved_at >= NOW() - INTERVAL '7 days')::int AS resolved_7d
      FROM disputes
      WHERE LOWER(type::text) = ANY($1::text[])
      `,
      [JOBS_DISPUTE_ENTITIES]
    ),
    pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM jobs WHERE deleted_at IS NULL AND created_at >= NOW() - INTERVAL '24 hours')
          + (SELECT COUNT(*)::int FROM gigs WHERE deleted_at IS NULL AND created_at >= NOW() - INTERVAL '24 hours')
          AS postings_24h,
        (SELECT COUNT(*)::int
           FROM jobs
          WHERE deleted_at IS NULL
            AND ${activeStatusSql('status')}
            AND COALESCE(updated_at, created_at) < NOW() - INTERVAL '60 days')
          + (SELECT COUNT(*)::int
               FROM gigs
              WHERE deleted_at IS NULL
                AND ${activeStatusSql('status')}
                AND COALESCE(updated_at, created_at) < NOW() - INTERVAL '60 days')
          AS stale_active_postings,
        (SELECT COUNT(*)::int
           FROM proposals
          WHERE deleted_at IS NULL
            AND LOWER(status) IN ('pending', 'submitted', 'open')
            AND created_at < NOW() - INTERVAL '14 days')
          AS stale_pending_proposals,
        (SELECT COUNT(*)::int
           FROM gig_requests
          WHERE deleted_at IS NULL
            AND LOWER(status) IN ('pending', 'submitted', 'open')
            AND created_at < NOW() - INTERVAL '14 days')
          AS stale_pending_requests
    `),
    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS actions_7d,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::int AS actions_24h,
        MAX(created_at) AS last_action_at
      FROM account_activity
      WHERE event_code IN ('JOBS_POSTING_STATUS_CHANGED', 'JOBS_POSTING_ARCHIVED')
    `),
  ]);

  const t = tickets.rows[0] || {};
  const r = reports.rows[0] || {};
  const d = disputes.rows[0] || {};
  const b = board.rows[0] || {};
  const a = actions.rows[0] || {};
  const toHours = (seconds) => {
    const value = seconds === null || seconds === undefined ? null : Number(seconds);
    if (value === null || Number.isNaN(value)) return null;
    return Math.round((value / 3600) * 10) / 10;
  };

  return {
    oldestOpenTicketAt: t.oldest_open_at || null,
    ticketsOver48h: Number(t.open_over_48h || 0),
    ticketsOver7d: Number(t.open_over_7d || 0),
    ticketsNeverAnswered: Number(t.never_answered || 0),
    ticketsResolvedLast7d: Number(t.resolved_7d || 0),
    avgTicketResolutionHours: toHours(t.avg_resolution_seconds),
    avgFirstReplyHours: toHours(t.avg_first_reply_seconds),
    oldestOpenReportAt: r.oldest_open_at || null,
    reportsOver48h: Number(r.open_over_48h || 0),
    reportsClosedLast7d: Number(r.closed_7d || 0),
    oldestOpenDisputeAt: d.oldest_open_at || null,
    disputesOver7d: Number(d.open_over_7d || 0),
    unassignedDisputes: Number(d.unassigned || 0),
    disputesResolvedLast7d: Number(d.resolved_7d || 0),
    postingsLast24h: Number(b.postings_24h || 0),
    staleActivePostings: Number(b.stale_active_postings || 0),
    stalePendingProposals: Number(b.stale_pending_proposals || 0),
    stalePendingRequests: Number(b.stale_pending_requests || 0),
    postingActionsLast7d: Number(a.actions_7d || 0),
    postingActionsLast24h: Number(a.actions_24h || 0),
    lastPostingActionAt: a.last_action_at || null,
  };
}

/** Unresolved reports whose target is a job or gig posting, newest first. */
async function getFlaggedPostings(limit = 6) {
  const result = await pool.query(
    `
    SELECT
      r.report_id, r.report_number, r.type, r.status, r.priority, r.created_at,
      r.target_type, r.target_id,
      COALESCE(j.title, g.title) AS posting_title,
      CASE WHEN j.job_id IS NOT NULL THEN 'job' WHEN g.gig_id IS NOT NULL THEN 'gig' ELSE NULL END AS posting_type,
      (SELECT COUNT(*)::int
         FROM reports r2
        WHERE r2.deleted_at IS NULL
          AND r2.target_id = r.target_id
          AND LOWER(r2.status) NOT IN (${closedReportStatusListSql()})) AS report_count
    FROM reports r
    LEFT JOIN jobs j ON j.job_id::text = r.target_id
    LEFT JOIN gigs g ON g.gig_id::text = r.target_id
    WHERE r.deleted_at IS NULL
      AND LOWER(COALESCE(r.target_type, r.type)) IN ('job', 'gig', 'jobs', 'gigs')
      AND LOWER(r.status) NOT IN (${closedReportStatusListSql()})
      AND (j.job_id IS NOT NULL OR g.gig_id IS NOT NULL)
    ORDER BY report_count DESC, r.created_at ASC
    LIMIT $1
    `,
    [Math.min(Math.max(Number.parseInt(limit, 10) || 6, 1), 25)]
  );
  return result.rows.map((row) => ({
    reportId: row.report_id,
    reportNumber: row.report_number,
    reportType: row.type,
    status: row.status,
    priority: row.priority,
    createdAt: row.created_at,
    postingType: row.posting_type,
    postingId: row.target_id,
    postingTitle: row.posting_title || 'Untitled posting',
    openReports: Number(row.report_count || 0),
  }));
}

async function getJobsOverview() {
  const jobsReportTypes = [...JOBS_REPORT_TYPES];
  const [
    ticketCounts,
    categoryRows,
    disputeCounts,
    reportCounts,
    reportBreakdown,
    tickets,
    disputes,
    reports,
    postingCounts,
    pipelineCounts,
    contractMixResult,
    trendResult,
    jobCategoryMix,
    postingCategoryMix,
    experienceMix,
    recentPostings,
    staffWorkload,
    queueHealth,
    flaggedPostings,
  ] = await Promise.all([
    scopedTicketCounts(JOBS_TICKET_SCOPE),
    scopedTicketCategoryBreakdown(JOBS_TICKET_SCOPE),
    scopedDisputeCounts({ entityTypesIn: JOBS_DISPUTE_ENTITIES }),
    scopedReportCounts({ targetTypesIn: jobsReportTypes }),
    getJobsReportBreakdown(jobsReportTypes),
    getJobsTickets(),
    getJobsDisputes(),
    getJobsReports(),
    pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM jobs WHERE deleted_at IS NULL) AS total_jobs,
        (SELECT COUNT(*)::int FROM jobs WHERE deleted_at IS NULL AND ${activeStatusSql('status')}) AS active_jobs,
        (SELECT COUNT(*)::int FROM jobs WHERE deleted_at IS NULL AND ${pausedStatusSql('status')}) AS paused_jobs,
        (SELECT COUNT(*)::int FROM jobs WHERE deleted_at IS NULL AND ${closedStatusSql('status')}) AS closed_jobs,
        (SELECT COUNT(*)::int FROM jobs WHERE deleted_at IS NOT NULL) AS archived_jobs,
        (SELECT COUNT(*)::int FROM gigs WHERE deleted_at IS NULL) AS total_gigs,
        (SELECT COUNT(*)::int FROM gigs WHERE deleted_at IS NULL AND ${activeStatusSql('status')}) AS active_gigs,
        (SELECT COUNT(*)::int FROM gigs WHERE deleted_at IS NULL AND ${pausedStatusSql('status')}) AS paused_gigs,
        (SELECT COUNT(*)::int FROM gigs WHERE deleted_at IS NULL AND ${closedStatusSql('status')}) AS closed_gigs,
        (SELECT COUNT(*)::int FROM gigs WHERE deleted_at IS NOT NULL) AS archived_gigs,
        (SELECT COUNT(*)::int FROM contracts WHERE LOWER(status) NOT IN ('completed', 'closed', 'cancelled')) AS active_contracts,
        (SELECT COUNT(*)::int FROM jobs WHERE deleted_at IS NULL AND created_at >= NOW() - INTERVAL '7 days') AS jobs_this_week,
        (SELECT COUNT(*)::int FROM gigs WHERE deleted_at IS NULL AND created_at >= NOW() - INTERVAL '7 days') AS gigs_this_week
    `),
    pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM proposals WHERE deleted_at IS NULL) AS total_proposals,
        (SELECT COUNT(*)::int FROM proposals WHERE deleted_at IS NULL AND LOWER(status) IN ('pending', 'submitted', 'open')) AS pending_proposals,
        (SELECT COUNT(*)::int FROM gig_requests WHERE deleted_at IS NULL) AS total_gig_requests,
        (SELECT COUNT(*)::int FROM gig_requests WHERE deleted_at IS NULL AND LOWER(status) IN ('pending', 'submitted', 'open')) AS pending_gig_requests,
        (SELECT COUNT(*)::int FROM contracts) AS total_contracts,
        (SELECT COUNT(*)::int FROM contracts WHERE LOWER(status) IN ('completed', 'closed')) AS completed_contracts,
        (SELECT COALESCE(SUM(w.balance_credits + w.frozen_balance_credits), 0)::bigint
           FROM escrow_wallets ew JOIN wallets w ON w.wallet_id = ew.wallet_id) AS credits_in_escrow,
        (SELECT COALESCE(ROUND(AVG(stars_out_of_five)::numeric, 2), 0) FROM ratings WHERE deleted_at IS NULL) AS avg_contract_rating,
        (SELECT COUNT(*)::int FROM ratings WHERE deleted_at IS NULL) AS total_ratings
    `),
    pool.query(`
      SELECT LOWER(status) AS status, COUNT(*)::int AS count
      FROM contracts GROUP BY LOWER(status) ORDER BY count DESC
    `),
    pool.query(`
      SELECT day::date AS day,
        (SELECT COUNT(*)::int FROM jobs j WHERE j.deleted_at IS NULL AND j.created_at::date = day::date) AS jobs,
        (SELECT COUNT(*)::int FROM gigs g WHERE g.deleted_at IS NULL AND g.created_at::date = day::date) AS gigs
      FROM generate_series(NOW() - INTERVAL '13 days', NOW(), INTERVAL '1 day') day
      ORDER BY day
    `),
    pool.query(`
      SELECT COALESCE(NULLIF(TRIM(category), ''), 'Uncategorized') AS category, COUNT(*)::int AS count
      FROM jobs WHERE deleted_at IS NULL
      GROUP BY 1 ORDER BY count DESC LIMIT 8
    `),
    pool.query(`
      SELECT category, SUM(count)::int AS count FROM (
        SELECT COALESCE(NULLIF(TRIM(category), ''), 'Uncategorized') AS category, COUNT(*)::int AS count
        FROM jobs WHERE deleted_at IS NULL GROUP BY 1
        UNION ALL
        SELECT COALESCE(NULLIF(TRIM(category), ''), 'Uncategorized') AS category, COUNT(*)::int AS count
        FROM gigs WHERE deleted_at IS NULL GROUP BY 1
      ) mix
      GROUP BY category ORDER BY count DESC LIMIT 8
    `),
    pool.query(`
      SELECT COALESCE(NULLIF(TRIM(experience_level), ''), 'Unspecified') AS level, COUNT(*)::int AS count
      FROM jobs WHERE deleted_at IS NULL
      GROUP BY 1 ORDER BY count DESC
    `),
    getJobsGigsPostings({ sort: 'newest' }),
    fetchStaffWorkload(),
    getJobsQueueHealth(jobsReportTypes),
    getFlaggedPostings(6),
  ]);

  const tc = ticketCounts;
  const dc = disputeCounts;
  const pc = postingCounts.rows[0];
  const pl = pipelineCounts.rows[0];
  const rc = reportCounts;
  const rb = reportBreakdown.counts;

  const disputeStatusMix = [
    { label: 'Open', value: disputes.filter((d) => d.status === 'open').length, color: '#f87171' },
    {
      label: 'Under Review',
      value: disputes.filter((d) => d.status === 'under_review').length,
      color: '#fbbf24',
    },
    {
      label: 'Resolved',
      value: disputes.filter((d) => ['resolved', 'closed'].includes(d.status)).length,
      color: '#34d399',
    },
  ].filter((x) => x.value > 0);

  const contractStatusColors = {
    active: '#34d399',
    ongoing: '#34d399',
    in_progress: '#60a5fa',
    pending: '#fbbf24',
    completed: '#a78bfa',
    closed: '#a78bfa',
    cancelled: '#f87171',
    disputed: '#f87171',
  };
  const contractStatusMix = contractMixResult.rows.map((r) => ({
    label: r.status.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()),
    value: Number(r.count),
    color: contractStatusColors[r.status] || '#71717a',
  }));

  const postingStatusMix = [
    {
      label: 'Active',
      value: Number(pc.active_jobs) + Number(pc.active_gigs),
      color: '#34d399',
    },
    {
      label: 'Paused',
      value: Number(pc.paused_jobs) + Number(pc.paused_gigs),
      color: '#fbbf24',
    },
    {
      label: 'Closed',
      value: Number(pc.closed_jobs) + Number(pc.closed_gigs),
      color: '#a1a1aa',
    },
    {
      label: 'Archived',
      value: Number(pc.archived_jobs) + Number(pc.archived_gigs),
      color: '#f87171',
    },
  ].filter((x) => x.value > 0);

  const reportStatusMix = [
    { label: 'Open', value: rb.openStatus, color: '#f87171' },
    { label: 'In review', value: rb.inReview, color: '#fbbf24' },
    { label: 'Resolved', value: rb.resolved, color: '#34d399' },
    { label: 'Dismissed', value: rb.dismissed, color: '#a1a1aa' },
  ].filter((x) => x.value > 0);

  return {
    lastUpdated: new Date().toISOString(),
    summary: {
      openTickets: Number(tc.open_count) + Number(tc.in_progress) + Number(tc.escalated_dev || 0),
      totalTickets: Number(tc.total),
      unassignedTickets: Number(tc.unassigned),
      highPriorityTickets: Number(tc.high_priority),
      awaitingReplyTickets: Number(tc.awaiting_reply),
      escalatedTickets: Number(tc.escalated),
      inProgressTickets: Number(tc.in_progress),
      openDisputes: Number(dc.open_count),
      totalDisputes: Number(dc.total),
      creditsAtRisk: Number(dc.credits_at_risk),
      resolvedTickets: Number(tc.resolved),
      openReports: Number(rc.open_count),
      totalReports: Number(rc.total),
      unassignedReports: rb.unassigned,
      highPriorityReports: rb.highPriority,
      resolvedReports: rb.resolved,
      totalJobs: Number(pc.total_jobs),
      activeJobs: Number(pc.active_jobs),
      pausedJobs: Number(pc.paused_jobs),
      closedJobs: Number(pc.closed_jobs),
      archivedJobs: Number(pc.archived_jobs),
      totalGigs: Number(pc.total_gigs),
      activeGigs: Number(pc.active_gigs),
      pausedGigs: Number(pc.paused_gigs),
      closedGigs: Number(pc.closed_gigs),
      archivedGigs: Number(pc.archived_gigs),
      activeContracts: Number(pc.active_contracts),
      jobsThisWeek: Number(pc.jobs_this_week),
      gigsThisWeek: Number(pc.gigs_this_week),
      totalProposals: Number(pl.total_proposals),
      pendingProposals: Number(pl.pending_proposals),
      totalGigRequests: Number(pl.total_gig_requests),
      pendingGigRequests: Number(pl.pending_gig_requests),
      totalContracts: Number(pl.total_contracts),
      completedContracts: Number(pl.completed_contracts),
      creditsInEscrow: Number(pl.credits_in_escrow),
      avgContractRating: Number(pl.avg_contract_rating),
      totalRatings: Number(pl.total_ratings),
    },
    charts: {
      ticketStatusMix: ticketStatusChart(tc),
      ticketCategories: toCategoryChart(categoryRows),
      disputeStatusMix,
      reportStatusMix,
      reportTypes: reportBreakdown.byType.map((row, i) => ({
        ...row,
        color: CHART_COLORS[i % CHART_COLORS.length],
      })),
      postingsMix: [
        { label: 'Jobs', value: Number(pc.total_jobs), color: '#60a5fa' },
        { label: 'Gigs', value: Number(pc.total_gigs), color: '#34d399' },
      ].filter((x) => x.value > 0),
      postingStatusMix,
      contractStatusMix,
      jobCategories: jobCategoryMix.rows.map((r, i) => ({
        label: r.category,
        value: Number(r.count),
        color: CHART_COLORS[i % CHART_COLORS.length],
      })),
      // Jobs and gigs together: what the board actually looks like by category.
      postingCategories: postingCategoryMix.rows.map((r, i) => ({
        label: r.category,
        value: Number(r.count),
        color: CHART_COLORS[i % CHART_COLORS.length],
      })),
      experienceLevels: experienceMix.rows.map((r, i) => ({
        label: String(r.level)
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (ch) => ch.toUpperCase()),
        value: Number(r.count),
        color: CHART_COLORS[i % CHART_COLORS.length],
      })),
      postingTrend: trendResult.rows.map((r) => ({
        day: r.day,
        jobs: Number(r.jobs),
        gigs: Number(r.gigs),
      })),
    },
    queueHealth,
    recentTickets: tickets.slice(0, 10),
    recentPostings: recentPostings.slice(0, 8),
    flaggedReports: reports.slice(0, 10),
    flaggedPostings,
    disputes: disputes.slice(0, 10),
    staffWorkload,
    alerts: buildAlerts(tc, dc, reportBreakdown, pc, pl, queueHealth),
    dataSources: {
      tables: [
        'tickets',
        'disputes',
        'reports',
        'jobs',
        'gigs',
        'proposals',
        'gig_requests',
        'contracts',
        'escrow_wallets',
        'ratings',
      ],
      persisted: true,
    },
  };
}

module.exports = {
  getJobsOverview,
  getJobsTickets,
  getJobsReports,
  getJobsDisputes,
  getJobsGigsPostings,
  getJobsGigsPostingDetail,
  getJobsQueueHealth,
  getFlaggedPostings,
  updateJobsGigsPosting,
  getUserJobsHistory,
  JOBS_DISPUTE_ENTITIES,
};
