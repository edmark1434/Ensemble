const { pool } = require('../lib/Database');
const {
  normalizeTicketStatus,
  normalizeTicketPriority,
  normalizeTicketType,
  isClosedStatus,
} = require('../lib/TicketEnums');
const { normalizeDisputeType, normalizeDisputePriority } = require('../lib/DisputeEnums');

function normalizeStatus(status) {
  // Keep dispute/report helpers on snake-ish labels; tickets use Title Case via ticketEnums.
  if (!status) return 'open';
  const s = String(status).toLowerCase();
  if (s === 'open') return 'open';
  if (s.includes('progress')) return 'in_progress';
  if (s === 'resolved') return 'resolved';
  if (s === 'closed') return 'closed';
  if (s.includes('review')) return 'under_review';
  if (s === 'escalated') return 'escalated';
  return status;
}

function mapTicketRow(row) {
  const status = normalizeTicketStatus(row.status);
  const closed = isClosedStatus(status);
  const lastAuthor = String(row.last_message_author_type || '').toLowerCase();
  const waitingForResponse = !closed && lastAuthor === 'user';

  return {
    id: row.ticket_id,
    number: row.ticket_number,
    subject: row.reason || row.subject || '',
    reason: row.reason || row.subject || '',
    type: normalizeTicketType(row.type || row.category),
    category: normalizeTicketType(row.type || row.category),
    priority: normalizeTicketPriority(row.priority),
    status,
    channel: row.channel || 'web',
    requester: {
      accountId: row.account_id || row.requester_account_id,
      userId: row.requester_user_id || row.user_id || null,
      name: row.requester_name || 'Unknown',
      username: row.requester_handle || '—',
      email: row.requester_email || null,
    },
    assignee: row.handled_by_staff_id || row.assigned_staff_id
      ? {
          staffId: row.handled_by_staff_id || row.assigned_staff_id,
          name: row.assignee_name || 'Unassigned',
          role: row.assignee_role || 'Support Moderator',
        }
      : null,
    escalatedBy: row.escalated_by_staff_id
      ? {
          staffId: row.escalated_by_staff_id,
          name: row.escalated_by_name || 'Staff',
          role: row.escalated_by_role || null,
        }
      : null,
    escalatedToRole: row.escalated_to_role || null,
    isEscalated: Boolean(row.escalated_to_role || row.escalated_by_staff_id),
    waitingForResponse,
    lastMessageAuthorType: row.last_message_author_type || null,
    relatedReportId: row.related_report_id,
    relatedDisputeId: row.related_dispute_id,
    messageCount: Number(row.message_count || 0),
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    closedAt: row.resolved_at || row.closed_at || null,
    resolvedAt: row.resolved_at || null,
  };
}

function displayLabel(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function mapReportRow(row) {
  return {
    id: row.report_id,
    number: row.report_number,
    reporter: {
      accountId: row.reporter_account_id || row.by_account_id,
      name: row.reporter_name || 'Anonymous',
      username: row.reporter_handle || '—',
    },
    // Keep status/priority as DB snake_case for filters/forms; format in UI.
    targetType: displayLabel(row.target_type || row.type),
    targetId: row.target_id || row.reference_id,
    targetLabel: row.target_label,
    reason: row.reason,
    description: row.description,
    status: String(row.status || 'open').toLowerCase(),
    priority: String(row.priority || 'medium').toLowerCase(),
    assignee: row.assigned_staff_id
      ? { staffId: row.assigned_staff_id, name: row.assignee_name || 'Unassigned' }
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
    resolvedAt: row.resolved_at,
  };
}

function mapDisputeRow(row) {
  const closedStatuses = ['closed'];
  return {
    id: row.dispute_id,
    number: row.dispute_number,
    title: row.title,
    reason: row.reason,
    type: normalizeDisputeType(row.type),
    // Status stays snake_case; priority is Title Case in DB, lowercased for desk filters.
    status: String(row.status || 'open').toLowerCase(),
    priority: String(normalizeDisputePriority(row.priority || 'Medium')).toLowerCase(),
    visibility: Boolean(row.visibility),
    initiator: {
      accountId: row.by_account_id,
      name: row.initiator_name || 'Unknown',
      username: row.initiator_handle || '—',
    },
    respondent: {
      accountId: row.for_account_id,
      name: row.respondent_name || 'Unknown',
      username: row.respondent_handle || '—',
    },
    assignee: row.handled_by_staff_id
      ? { staffId: row.handled_by_staff_id, name: row.assignee_name || 'Unassigned', role: row.assignee_role }
      : null,
    creditAmount: Number(row.credit_amount_involved || 0),
    sanctionType: row.sanction_type || null,
    relatedCreditTransactionId: row.related_credit_transaction_id || null,
    creditHold: row.hold_status
      ? {
          transactionId: row.related_credit_transaction_id,
          status: row.hold_status,
          amount: Number(row.hold_amount ?? row.credit_amount_involved ?? 0),
          type: row.hold_type || 'Escrow Hold',
        }
      : null,
    openedAt: row.opened_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
    resolutionNotes: row.resolution_notes,
    isClosed: closedStatuses.includes(String(row.status || '').toLowerCase()),
  };
}

// Scoped ticket list. Filter by ticket types to include/exclude and by status.
async function fetchScopedTickets({ typesIn, typesNotIn, categoriesIn, categoriesNotIn, status } = {}) {
  const includeTypes = typesIn || categoriesIn;
  const excludeTypes = typesNotIn || categoriesNotIn;
  const where = ['t.deleted_at IS NULL'];
  const params = [];

  if (includeTypes && includeTypes.length) {
    params.push(includeTypes.map((t) => normalizeTicketType(t)));
    where.push(`t.type = ANY($${params.length})`);
  }
  if (excludeTypes && excludeTypes.length) {
    params.push(excludeTypes.map((t) => normalizeTicketType(t)));
    where.push(`NOT (t.type = ANY($${params.length}))`);
  }
  if (status && status !== 'all') {
    params.push(normalizeTicketStatus(status));
    where.push(`t.status = $${params.length}`);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;

  const result = await pool.query(
    `
    SELECT
      t.*,
      COALESCE(ra.display_name, ru.first_name || ' ' || ru.last_name) AS requester_name,
      ra.handle AS requester_handle,
      ru.email_address AS requester_email,
      ru.user_id AS requester_user_id,
      COALESCE(sa.display_name, st.first_name || ' ' || st.last_name) AS assignee_name,
      st.role AS assignee_role,
      COALESCE(ea.display_name, es.first_name || ' ' || es.last_name) AS escalated_by_name,
      es.role AS escalated_by_role,
      COALESCE(t.message_count, 0) AS message_count,
      t.last_message_at
    FROM tickets t
    LEFT JOIN accounts ra ON ra.account_id = t.account_id
    LEFT JOIN users ru ON ru.account_id = ra.account_id
    LEFT JOIN staff st ON st.staff_id = t.handled_by_staff_id
    LEFT JOIN accounts sa ON sa.account_id = st.account_id
    LEFT JOIN staff es ON es.staff_id = t.escalated_by_staff_id
    LEFT JOIN accounts ea ON ea.account_id = es.account_id
    ${whereSql}
    ORDER BY
      CASE t.priority WHEN 'High' THEN 0 WHEN 'Medium' THEN 1 ELSE 2 END,
      t.updated_at DESC
    LIMIT 100
    `,
    params
  );
  return result.rows.map(mapTicketRow);
}

// Aggregate ticket counts for a type scope.
async function scopedTicketCounts({ typesIn, typesNotIn, categoriesIn, categoriesNotIn } = {}) {
  const includeTypes = typesIn || categoriesIn;
  const excludeTypes = typesNotIn || categoriesNotIn;
  const where = ['deleted_at IS NULL'];
  const params = [];
  if (includeTypes && includeTypes.length) {
    params.push(includeTypes.map((t) => normalizeTicketType(t)));
    where.push(`type = ANY($${params.length})`);
  }
  if (excludeTypes && excludeTypes.length) {
    params.push(excludeTypes.map((t) => normalizeTicketType(t)));
    where.push(`NOT (type = ANY($${params.length}))`);
  }
  const whereSql = `WHERE ${where.join(' AND ')}`;

  const result = await pool.query(
    `
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'Open')::int AS open_count,
      COUNT(*) FILTER (WHERE status = 'In Progress')::int AS in_progress,
      COUNT(*) FILTER (WHERE status IN ('Resolved', 'Closed'))::int AS resolved,
      COUNT(*) FILTER (
        WHERE priority = 'High'
          AND status NOT IN ('Resolved', 'Closed')
      )::int AS high_priority,
      COUNT(*) FILTER (
        WHERE handled_by_staff_id IS NULL
          AND status NOT IN ('Resolved', 'Closed')
      )::int AS unassigned,
      COUNT(*) FILTER (
        WHERE status NOT IN ('Resolved', 'Closed')
          AND LOWER(COALESCE(last_message_author_type, '')) = 'user'
      )::int AS awaiting_reply,
      COUNT(*) FILTER (
        WHERE status NOT IN ('Resolved', 'Closed')
          AND (escalated_to_role IS NOT NULL OR escalated_by_staff_id IS NOT NULL)
      )::int AS escalated
    FROM tickets
    ${whereSql}
    `,
    params
  );
  return result.rows[0];
}

// Ticket type breakdown for a scope (for charts).
async function scopedTicketCategoryBreakdown({ typesIn, typesNotIn, categoriesIn, categoriesNotIn } = {}) {
  const includeTypes = typesIn || categoriesIn;
  const excludeTypes = typesNotIn || categoriesNotIn;
  const where = ['deleted_at IS NULL'];
  const params = [];
  if (includeTypes && includeTypes.length) {
    params.push(includeTypes.map((t) => normalizeTicketType(t)));
    where.push(`type = ANY($${params.length})`);
  }
  if (excludeTypes && excludeTypes.length) {
    params.push(excludeTypes.map((t) => normalizeTicketType(t)));
    where.push(`NOT (type = ANY($${params.length}))`);
  }
  const whereSql = `WHERE ${where.join(' AND ')}`;

  const result = await pool.query(
    `SELECT type AS category, type, COUNT(*)::int AS count FROM tickets ${whereSql} GROUP BY type ORDER BY count DESC`,
    params
  );
  return result.rows;
}

const scopedTicketTypeBreakdown = scopedTicketCategoryBreakdown;

// Scoped reports list. Filter by target types and status.
async function fetchScopedReports({ targetTypesIn, status } = {}) {
  const where = [];
  const params = [];
  if (targetTypesIn && targetTypesIn.length) {
    params.push(targetTypesIn);
    where.push(`LOWER(COALESCE(r.target_type, r.type)) = ANY($${params.length})`);
  }
  if (status && status !== 'all') {
    params.push(String(status).toLowerCase());
    where.push(`LOWER(r.status) = $${params.length}`);
  }
  where.push('r.deleted_at IS NULL');
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const result = await pool.query(
    `
    SELECT
      r.*,
      r.by_account_id AS reporter_account_id,
      COALESCE(repa.display_name, repu.first_name || ' ' || repu.last_name) AS reporter_name,
      repa.handle AS reporter_handle,
      COALESCE(sa.display_name, st.first_name || ' ' || st.last_name) AS assignee_name
    FROM reports r
    LEFT JOIN accounts repa ON repa.account_id = r.by_account_id
    LEFT JOIN users repu ON repu.account_id = repa.account_id
    LEFT JOIN staff st ON st.staff_id = r.assigned_staff_id
    LEFT JOIN accounts sa ON sa.account_id = st.account_id
    ${whereSql}
    ORDER BY r.created_at DESC
    LIMIT 200
    `,
    params
  );
  return result.rows.map(mapReportRow);
}

async function scopedReportCounts({ targetTypesIn } = {}) {
  const where = [];
  const params = [];
  if (targetTypesIn && targetTypesIn.length) {
    params.push(targetTypesIn);
    where.push(`LOWER(COALESCE(target_type, type)) = ANY($${params.length})`);
  }
  where.push('deleted_at IS NULL');
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const result = await pool.query(
    `
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE LOWER(status) NOT IN ('resolved', 'closed'))::int AS open_count
    FROM reports
    ${whereSql}
    `,
    params
  );
  return result.rows[0];
}

async function createReport({
  reportNumber,
  reporterAccountId,
  targetAccountId,
  targetType,
  targetId,
  targetLabel,
  reason,
  description,
  referenceTable,
  referencePrefix = 'forum',
}) {
  const result = await pool.query(
    `
    INSERT INTO reports (
      report_number,
      by_account_id,
      for_account_id,
      target_type,
      target_id,
      target_label,
      reason,
      description,
      priority,
      type,
      reference_table,
      reference_prefix,
      reference_id,
      status,
      is_created_by_bot
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'medium', $4, $9, $10, $5, 'open', false)
    RETURNING *
    `,
    [
      reportNumber,
      reporterAccountId,
      targetAccountId,
      targetType,
      targetId,
      targetLabel,
      reason,
      description,
      referenceTable,
      referencePrefix,
    ]
  );
  return mapReportRow(result.rows[0]);
}

// Scoped disputes list. Filter by dispute type and status.
async function fetchScopedDisputes({ entityTypesIn, status } = {}) {
  const where = [];
  const params = [];
  if (entityTypesIn && entityTypesIn.length) {
    params.push(entityTypesIn);
    where.push(`LOWER(d.type) = ANY($${params.length})`);
  }
  if (status && status !== 'all') {
    params.push(String(status).toLowerCase());
    where.push(`LOWER(d.status) = $${params.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const result = await pool.query(
    `
    SELECT
      d.*,
      COALESCE(ia.display_name, iu.first_name || ' ' || iu.last_name) AS initiator_name,
      ia.handle AS initiator_handle,
      COALESCE(ra.display_name, ru.first_name || ' ' || ru.last_name) AS respondent_name,
      ra.handle AS respondent_handle,
      COALESCE(sa.display_name, st.first_name || ' ' || st.last_name) AS assignee_name,
      st.role AS assignee_role
    FROM disputes d
    LEFT JOIN accounts ia ON ia.account_id = d.by_account_id
    LEFT JOIN users iu ON iu.account_id = ia.account_id
    LEFT JOIN accounts ra ON ra.account_id = d.for_account_id
    LEFT JOIN users ru ON ru.account_id = ra.account_id
    LEFT JOIN staff st ON st.staff_id = d.handled_by_staff_id
    LEFT JOIN accounts sa ON sa.account_id = st.account_id
    ${whereSql}
    ORDER BY d.opened_at DESC
    LIMIT 40
    `,
    params
  );
  return result.rows.map(mapDisputeRow);
}

async function scopedDisputeCounts({ entityTypesIn } = {}) {
  const where = [];
  const params = [];
  if (entityTypesIn && entityTypesIn.length) {
    params.push(entityTypesIn);
    where.push(`LOWER(type) = ANY($${params.length})`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const result = await pool.query(
    `
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE LOWER(status) IN ('open', 'under_review'))::int AS open_count,
      COALESCE(SUM(credit_amount_involved) FILTER (WHERE LOWER(status) IN ('open', 'under_review')), 0)::int AS credits_at_risk
    FROM disputes
    ${whereSql}
    `,
    params
  );
  return result.rows[0];
}

const CHART_COLORS = ['#fb7185', '#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#38bdf8', '#f472b6'];

function toCategoryChart(rows) {
  return rows.map((r, i) => ({
    label: displayLabel(r.type || r.category || 'Other'),
    value: Number(r.count),
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));
}

function ticketStatusChart(counts) {
  return [
    { label: 'Open', value: Number(counts.open_count), color: '#f87171' },
    { label: 'In Progress', value: Number(counts.in_progress), color: '#fbbf24' },
    { label: 'Resolved', value: Number(counts.resolved), color: '#34d399' },
  ].filter((x) => x.value > 0);
}

module.exports = {
  normalizeStatus,
  displayLabel,
  mapTicketRow,
  mapReportRow,
  mapDisputeRow,
  fetchScopedTickets,
  scopedTicketCounts,
  scopedTicketCategoryBreakdown,
  scopedTicketTypeBreakdown,
  fetchScopedReports,
  scopedReportCounts,
  createReport,
  fetchScopedDisputes,
  scopedDisputeCounts,
  toCategoryChart,
  ticketStatusChart,
  CHART_COLORS,
  isClosedStatus,
};
