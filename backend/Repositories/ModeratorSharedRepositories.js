const { pool } = require('../lib/database');

function normalizeStatus(status) {
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
  return {
    id: row.ticket_id,
    number: row.ticket_number,
    subject: row.subject,
    category: row.category,
    priority: row.priority,
    status: normalizeStatus(row.status),
    channel: row.channel,
    requester: {
      accountId: row.requester_account_id,
      name: row.requester_name || 'Unknown',
      username: row.requester_handle || '—',
      email: row.requester_email || null,
    },
    assignee: row.assigned_staff_id
      ? {
          staffId: row.assigned_staff_id,
          name: row.assignee_name || 'Unassigned',
          role: row.assigned_role || row.assignee_role || 'Support',
        }
      : null,
    relatedReportId: row.related_report_id,
    relatedDisputeId: row.related_dispute_id,
    messageCount: Number(row.message_count || 0),
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    closedAt: row.closed_at,
  };
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
    targetType: row.target_type || row.type,
    targetId: row.target_id || row.reference_id,
    targetLabel: row.target_label,
    reason: row.reason,
    description: row.description,
    status: normalizeStatus(row.status),
    priority: row.priority || 'medium',
    assignee: row.assigned_staff_id
      ? { staffId: row.assigned_staff_id, name: row.assignee_name || 'Unassigned' }
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
    resolvedAt: row.resolved_at,
  };
}

function mapDisputeRow(row) {
  return {
    id: row.dispute_id,
    number: row.dispute_number,
    title: row.title,
    reason: row.reason,
    status: normalizeStatus(row.status),
    priority: row.priority,
    initiator: {
      accountId: row.initiator_account_id,
      name: row.initiator_name || 'Unknown',
      username: row.initiator_handle || '—',
    },
    respondent: {
      accountId: row.respondent_account_id,
      name: row.respondent_name || 'Unknown',
      username: row.respondent_handle || '—',
    },
    relatedEntityType: row.related_entity_type,
    relatedEntityId: row.related_entity_id,
    assignee: row.assigned_staff_id
      ? { staffId: row.assigned_staff_id, name: row.assignee_name || 'Unassigned', role: row.assignee_role }
      : null,
    creditAmount: Number(row.credit_amount_involved || 0),
    openedAt: row.opened_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
    resolutionNotes: row.resolution_notes,
  };
}

// Scoped ticket list. Filter by categories to include/exclude and by status.
async function fetchScopedTickets({ categoriesIn, categoriesNotIn, status } = {}) {
  const where = [];
  const params = [];

  if (categoriesIn && categoriesIn.length) {
    params.push(categoriesIn);
    where.push(`LOWER(t.category) = ANY($${params.length})`);
  }
  if (categoriesNotIn && categoriesNotIn.length) {
    params.push(categoriesNotIn);
    where.push(`NOT (LOWER(t.category) = ANY($${params.length}))`);
  }
  if (status && status !== 'all') {
    params.push(String(status).toLowerCase());
    where.push(`LOWER(t.status) = $${params.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const result = await pool.query(
    `
    SELECT
      t.*,
      COALESCE(ra.display_name, ru.first_name || ' ' || ru.last_name) AS requester_name,
      ra.handle AS requester_handle,
      ru.email_address AS requester_email,
      COALESCE(sa.display_name, st.first_name || ' ' || st.last_name) AS assignee_name,
      st.role AS assignee_role,
      COALESCE(t.message_count, 0) AS message_count,
      t.last_message_at
    FROM support_tickets t
    LEFT JOIN accounts ra ON ra.account_id = t.requester_account_id
    LEFT JOIN users ru ON ru.account_id = ra.account_id
    LEFT JOIN staff st ON st.staff_id = t.assigned_staff_id
    LEFT JOIN accounts sa ON sa.account_id = st.account_id
    ${whereSql}
    ORDER BY
      CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
      t.updated_at DESC
    LIMIT 50
    `,
    params
  );
  return result.rows.map(mapTicketRow);
}

// Aggregate ticket counts for a category scope.
async function scopedTicketCounts({ categoriesIn, categoriesNotIn } = {}) {
  const where = [];
  const params = [];
  if (categoriesIn && categoriesIn.length) {
    params.push(categoriesIn);
    where.push(`LOWER(category) = ANY($${params.length})`);
  }
  if (categoriesNotIn && categoriesNotIn.length) {
    params.push(categoriesNotIn);
    where.push(`NOT (LOWER(category) = ANY($${params.length}))`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const result = await pool.query(
    `
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE LOWER(status) = 'open')::int AS open_count,
      COUNT(*) FILTER (WHERE LOWER(status) = 'in_progress')::int AS in_progress,
      COUNT(*) FILTER (WHERE LOWER(status) IN ('resolved', 'closed'))::int AS resolved,
      COUNT(*) FILTER (WHERE priority = 'high')::int AS high_priority,
      COUNT(*) FILTER (WHERE assigned_staff_id IS NULL AND LOWER(status) NOT IN ('resolved', 'closed'))::int AS unassigned
    FROM support_tickets
    ${whereSql}
    `,
    params
  );
  return result.rows[0];
}

// Ticket category breakdown for a scope (for charts).
async function scopedTicketCategoryBreakdown({ categoriesIn, categoriesNotIn } = {}) {
  const where = [];
  const params = [];
  if (categoriesIn && categoriesIn.length) {
    params.push(categoriesIn);
    where.push(`LOWER(category) = ANY($${params.length})`);
  }
  if (categoriesNotIn && categoriesNotIn.length) {
    params.push(categoriesNotIn);
    where.push(`NOT (LOWER(category) = ANY($${params.length}))`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const result = await pool.query(
    `SELECT category, COUNT(*)::int AS count FROM support_tickets ${whereSql} GROUP BY category ORDER BY count DESC`,
    params
  );
  return result.rows;
}

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
    LIMIT 40
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

// Scoped disputes list. Filter by related entity types and status.
async function fetchScopedDisputes({ entityTypesIn, status } = {}) {
  const where = [];
  const params = [];
  if (entityTypesIn && entityTypesIn.length) {
    params.push(entityTypesIn);
    where.push(`LOWER(d.related_entity_type) = ANY($${params.length})`);
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
    LEFT JOIN accounts ia ON ia.account_id = d.initiator_account_id
    LEFT JOIN users iu ON iu.account_id = ia.account_id
    LEFT JOIN accounts ra ON ra.account_id = d.respondent_account_id
    LEFT JOIN users ru ON ru.account_id = ra.account_id
    LEFT JOIN staff st ON st.staff_id = d.assigned_staff_id
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
    where.push(`LOWER(related_entity_type) = ANY($${params.length})`);
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
    label: r.category || 'Uncategorized',
    value: Number(r.count),
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));
}

function ticketStatusChart(counts) {
  return [
    { label: 'Open', value: Number(counts.open_count), color: '#f87171' },
    { label: 'In progress', value: Number(counts.in_progress), color: '#fbbf24' },
    { label: 'Resolved', value: Number(counts.resolved), color: '#34d399' },
  ].filter((x) => x.value > 0);
}

module.exports = {
  normalizeStatus,
  mapTicketRow,
  mapReportRow,
  mapDisputeRow,
  fetchScopedTickets,
  scopedTicketCounts,
  scopedTicketCategoryBreakdown,
  fetchScopedReports,
  scopedReportCounts,
  fetchScopedDisputes,
  scopedDisputeCounts,
  toCategoryChart,
  ticketStatusChart,
  CHART_COLORS,
};
