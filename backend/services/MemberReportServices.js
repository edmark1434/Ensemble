const { pool } = require('../lib/Database');
const { createReport } = require('../repositories/ModeratorSharedRepositories');
const { createReportNumber, buildSubjectSnapshot } = require('../lib/ReportSubject');

function reportError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function reporterAccountId(session) {
  const direct = session?.account_id || session?.accountId;
  if (direct) return String(direct);
  if (session?.userId) {
    const result = await pool.query(
      `SELECT account_id FROM users WHERE user_id = $1`,
      [session.userId]
    );
    if (result.rows[0]?.account_id) return String(result.rows[0].account_id);
  }
  throw reportError('Reporter account not found', 401);
}

function validateReport(reason, description) {
  const type = String(reason || '').trim();
  const details = String(description || '').trim();
  if (!type || type.length > 100) throw reportError('A valid report type is required');
  if (details.length < 20) throw reportError('Report details must contain at least 20 characters');
  if (details.length > 2000) throw reportError('Report details must not exceed 2,000 characters');
  return { type, details };
}

async function submitUserReport(targetAccountId, payload, session) {
  const reporter = await reporterAccountId(session);
  if (String(reporter) === String(targetAccountId)) {
    throw reportError('You cannot report yourself', 403);
  }
  const account = await pool.query(
    `SELECT account_id, display_name, handle, type, tagline, description
     FROM accounts
     WHERE account_id = $1 AND deleted_at IS NULL`,
    [targetAccountId]
  );
  if (!account.rows.length) throw reportError('Account not found', 404);
  if (String(account.rows[0].type || '').toLowerCase() === 'staff') {
    throw reportError('This account cannot be reported', 403);
  }
  const details = validateReport(payload?.reason || payload?.type, payload?.description || payload?.details);
  const row = account.rows[0];
  const title = row.display_name || row.handle || 'Reported account';
  return createReport({
    reportNumber: createReportNumber(),
    reporterAccountId: reporter,
    targetAccountId: row.account_id,
    targetType: 'user',
    targetId: String(row.account_id),
    referenceTable: 'accounts',
    referencePrefix: 'user',
    type: details.type,
    description: details.details,
    subjectSnapshot: buildSubjectSnapshot({
      kind: 'user',
      title,
      body: row.tagline || row.description,
      href: `/profile/${row.account_id}`,
    }),
  });
}

async function submitJobReport(jobId, payload, session) {
  const reporter = await reporterAccountId(session);
  const job = await pool.query(
    `SELECT job_id, title, description, client_account_id FROM jobs WHERE job_id = $1`,
    [jobId]
  );
  if (!job.rows.length) throw reportError('Job not found', 404);
  const row = job.rows[0];
  if (!row.client_account_id) throw reportError('This job has no account to report', 404);
  if (String(row.client_account_id) === reporter) {
    throw reportError('You cannot report your own job', 403);
  }
  const details = validateReport(payload?.reason || payload?.type, payload?.description || payload?.details);
  return createReport({
    reportNumber: createReportNumber(),
    reporterAccountId: reporter,
    targetAccountId: row.client_account_id,
    targetType: 'job',
    targetId: String(row.job_id),
    referenceTable: 'jobs',
    referencePrefix: 'job',
    type: details.type,
    description: details.details,
    subjectSnapshot: buildSubjectSnapshot({
      kind: 'job',
      title: row.title,
      body: row.description,
      href: `/jobs/${row.job_id}/page`,
    }),
  });
}

async function submitGigReport(gigId, payload, session) {
  const reporter = await reporterAccountId(session);
  const gig = await pool.query(
    `SELECT gig_id, title, description, freelancer_account_id FROM gigs WHERE gig_id = $1`,
    [gigId]
  );
  if (!gig.rows.length) throw reportError('Gig not found', 404);
  const row = gig.rows[0];
  if (!row.freelancer_account_id) throw reportError('This gig has no account to report', 404);
  if (String(row.freelancer_account_id) === reporter) {
    throw reportError('You cannot report your own gig', 403);
  }
  const details = validateReport(payload?.reason || payload?.type, payload?.description || payload?.details);
  return createReport({
    reportNumber: createReportNumber(),
    reporterAccountId: reporter,
    targetAccountId: row.freelancer_account_id,
    targetType: 'gig',
    targetId: String(row.gig_id),
    referenceTable: 'gigs',
    referencePrefix: 'gig',
    type: details.type,
    description: details.details,
    subjectSnapshot: buildSubjectSnapshot({
      kind: 'gig',
      title: row.title,
      body: row.description,
      href: `/gigs/services/${row.gig_id}/page`,
    }),
  });
}

module.exports = {
  submitUserReport,
  submitJobReport,
  submitGigReport,
};
