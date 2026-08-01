const { pool } = require('../lib/database');
const { QUEUE_SCOPES } = require('../lib/ticketEnums');
const { JOBS_REPORT_TYPES } = require('../lib/reportEnums');
const {
  fetchScopedTickets,
  scopedTicketCounts,
  fetchScopedDisputes,
  scopedDisputeCounts,
  fetchScopedReports,
  scopedReportCounts,
  ticketStatusChart,
} = require('./ModeratorSharedRepositories');
const { fetchStaffWorkload } = require('./AdminTicketsRepositories');

// Jobs & Gigs moderation covers Jobs and Gigs tickets + related disputes.
const JOBS_TICKET_SCOPE = QUEUE_SCOPES.jobs;
const JOBS_DISPUTE_ENTITIES = ['job', 'gig', 'contract', 'feedback'];

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
  return fetchScopedDisputes({ entityTypesIn: JOBS_DISPUTE_ENTITIES, status });
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
    experienceLevel: row.experience_level,
    rateCreditsMin: row.rate_min === null ? null : Number(row.rate_min),
    rateCreditsMax: row.rate_max === null ? null : Number(row.rate_max),
    // Jobs: open proposals; gigs: gig requests across tiers.
    applicantCount: Number(row.applicant_count || 0),
    contractCount: Number(row.contract_count || 0),
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

// Combined job + gig postings list for the moderation queue.
async function getJobsGigsPostings({ type, status, search } = {}) {
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

  const result = await pool.query(
    `
    SELECT p.*, COALESCE(a.display_name, u.first_name || ' ' || u.last_name) AS author_name, a.handle AS author_handle
    FROM (
      SELECT
        j.job_id AS post_id,
        'J-' || UPPER(LEFT(j.job_id::text, 8)) AS post_number,
        'job' AS post_type,
        j.title, j.description, j.payment_type, j.status,
        j.experience_level,
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
        NULL AS experience_level,
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
    ORDER BY p.created_at DESC
    LIMIT 100
    `,
    params
  );
  return result.rows.map(mapPostingRow);
}

// Full record for one posting, with everything a moderator may need to review it.
async function getJobsGigsPostingDetail(type, id) {
  if (type === 'job') {
    const jobResult = await pool.query(
      `
      SELECT j.*, COALESCE(a.display_name, u.first_name || ' ' || u.last_name) AS author_name,
             a.handle AS author_handle, a.status AS author_status, a.merit_score AS author_merit
      FROM jobs j
      LEFT JOIN accounts a ON a.account_id = j.client_account_id
      LEFT JOIN users u ON u.account_id = a.account_id
      WHERE j.job_id = $1
      `,
      [id]
    );
    if (!jobResult.rows.length) return null;
    const j = jobResult.rows[0];

    const [tagsResult, proposalsResult, contractsResult, attachmentsResult] = await Promise.all([
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
    ]);

    return {
      type: 'job',
      id: j.job_id,
      postNumber: `J-${String(j.job_id).slice(0, 8).toUpperCase()}`,
      title: j.title,
      description: j.description,
      status: normalizePostingStatus(j.status, j.deleted_at),
      paymentType: j.payment_type,
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
        meritScore: j.author_merit === null ? null : Number(j.author_merit),
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
    };
  }

  if (type === 'gig') {
    const gigResult = await pool.query(
      `
      SELECT g.*, COALESCE(a.display_name, u.first_name || ' ' || u.last_name) AS author_name,
             a.handle AS author_handle, a.status AS author_status, a.merit_score AS author_merit
      FROM gigs g
      LEFT JOIN accounts a ON a.account_id = g.freelancer_account_id
      LEFT JOIN users u ON u.account_id = a.account_id
      WHERE g.gig_id = $1
      `,
      [id]
    );
    if (!gigResult.rows.length) return null;
    const g = gigResult.rows[0];

    const [tagsResult, tiersResult, addonsResult, requestsResult, contractsResult, attachmentsResult] =
      await Promise.all([
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
      ]);

    return {
      type: 'gig',
      id: g.gig_id,
      postNumber: `G-${String(g.gig_id).slice(0, 8).toUpperCase()}`,
      title: g.title,
      description: g.description,
      status: normalizePostingStatus(g.status, g.deleted_at),
      paymentType: g.payment_type,
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
        meritScore: g.author_merit === null ? null : Number(g.author_merit),
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
    };
  }

  throw new Error(`Invalid posting type: ${type}`);
}

// Moderate a posting: change its status, archive it (soft delete) or restore it.
async function updateJobsGigsPosting(type, id, { status }) {
  const table = type === 'job' ? 'jobs' : type === 'gig' ? 'gigs' : null;
  if (!table) throw new Error(`Invalid posting type: ${type}`);

  const allowed = ['active', 'paused', 'closed', 'archived'];
  const next = String(status || '').toLowerCase();
  if (!allowed.includes(next)) throw new Error(`Invalid posting status: ${status}`);

  const idColumn = type === 'job' ? 'job_id' : 'gig_id';
  if (next === 'archived') {
    await pool.query(`UPDATE ${table} SET deleted_at = NOW(), updated_at = NOW() WHERE ${idColumn} = $1`, [id]);
  } else {
    const dbStatus = dbStatusForWrite(type, next);
    await pool.query(
      `UPDATE ${table} SET status = $1, deleted_at = NULL, updated_at = NOW() WHERE ${idColumn} = $2`,
      [dbStatus, id]
    );
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

  const [jobsResult, gigsResult, contractsResult, proposalsResult, gigRequestsResult] = await Promise.all([
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
  ]);

  return {
    account: { accountId: acc.account_id, name: acc.name || 'Unknown', handle: acc.handle || '—', status: acc.status },
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

function buildAlerts(tc, dc, reportCounts, postingCounts) {
  const alerts = [];
  const openTickets = Number(tc.open_count) + Number(tc.in_progress);
  const pendingJobs = Number(postingCounts?.paused_jobs || 0);
  const openJobs = Number(postingCounts?.active_jobs || 0);

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
  if (Number(reportCounts?.open_count) > 0) {
    alerts.push({
      id: 'open-reports',
      message: `${reportCounts.open_count} job/gig report(s) need review.`,
      severity: 'warning',
      action: { tab: 'reports' },
    });
  }
  if (pendingJobs > 0) {
    alerts.push({
      id: 'paused-jobs',
      message: `${pendingJobs} job posting(s) currently paused.`,
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
  if (openJobs > 0 && !alerts.length) {
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

async function getJobsOverview() {
  const [
    ticketCounts,
    disputeCounts,
    reportCounts,
    tickets,
    disputes,
    reports,
    postingCounts,
    pipelineCounts,
    contractMixResult,
    trendResult,
    recentPostings,
    staffWorkload,
  ] = await Promise.all([
      scopedTicketCounts(JOBS_TICKET_SCOPE),
      scopedDisputeCounts({ entityTypesIn: JOBS_DISPUTE_ENTITIES }),
      scopedReportCounts({ targetTypesIn: [...JOBS_REPORT_TYPES] }),
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
      getJobsGigsPostings({}),
      fetchStaffWorkload(),
    ]);

  const tc = ticketCounts;
  const dc = disputeCounts;
  const pc = postingCounts.rows[0];
  const pl = pipelineCounts.rows[0];
  const rc = reportCounts;

  const disputeStatusMix = [
    { label: 'Open', value: disputes.filter((d) => d.status === 'open').length, color: '#f87171' },
    { label: 'Under Review', value: disputes.filter((d) => d.status === 'under_review').length, color: '#fbbf24' },
    { label: 'Resolved', value: disputes.filter((d) => ['resolved', 'closed'].includes(d.status)).length, color: '#34d399' },
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

  return {
    lastUpdated: new Date().toISOString(),
    summary: {
      openTickets: Number(tc.open_count) + Number(tc.in_progress),
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
      disputeStatusMix,
      postingsMix: [
        { label: 'Jobs', value: Number(pc.total_jobs), color: '#60a5fa' },
        { label: 'Gigs', value: Number(pc.total_gigs), color: '#34d399' },
      ].filter((x) => x.value > 0),
      postingStatusMix,
      contractStatusMix,
      postingTrend: trendResult.rows.map((r) => ({
        day: r.day,
        jobs: Number(r.jobs),
        gigs: Number(r.gigs),
      })),
    },
    recentTickets: tickets.slice(0, 8),
    recentPostings: recentPostings.slice(0, 8),
    flaggedReports: reports.slice(0, 10),
    disputes: disputes.slice(0, 10),
    staffWorkload,
    alerts: buildAlerts(tc, dc, rc, pc),
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
  updateJobsGigsPosting,
  getUserJobsHistory,
  JOBS_DISPUTE_ENTITIES,
};
