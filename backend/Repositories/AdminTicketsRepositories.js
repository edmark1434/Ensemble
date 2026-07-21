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

async function getTicketsOverview() {
  const [
    ticketCounts,
    disputeCounts,
    reportCounts,
    tickets,
    disputes,
    reports,
    staffWorkload,
    recentActivity,
    categoryBreakdown,
    priorityBreakdown,
  ] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE LOWER(status) = 'open')::int AS open_count,
        COUNT(*) FILTER (WHERE LOWER(status) = 'in_progress')::int AS in_progress,
        COUNT(*) FILTER (WHERE LOWER(status) IN ('resolved', 'closed'))::int AS resolved,
        COUNT(*) FILTER (WHERE priority = 'high')::int AS high_priority,
        COUNT(*) FILTER (WHERE assigned_staff_id IS NULL AND LOWER(status) NOT IN ('resolved', 'closed'))::int AS unassigned
      FROM support_tickets
    `),
    pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE LOWER(status) = 'open')::int AS open_count,
        COUNT(*) FILTER (WHERE LOWER(status) = 'under_review')::int AS under_review,
        COUNT(*) FILTER (WHERE LOWER(status) IN ('resolved', 'closed'))::int AS resolved,
        COALESCE(SUM(credit_amount_involved) FILTER (WHERE LOWER(status) = 'open'), 0)::int AS credits_at_risk
      FROM disputes
    `),
    pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE LOWER(status) = 'open')::int AS open_count,
        COUNT(*) FILTER (WHERE LOWER(status) = 'in_review')::int AS in_review,
        COUNT(*) FILTER (WHERE LOWER(status) = 'resolved')::int AS resolved
      FROM reports
      WHERE deleted_at IS NULL
    `),
    fetchTicketsList(),
    fetchDisputesList(),
    fetchReportsList(),
    fetchStaffWorkload(),
    fetchRecentActivity(),
    pool.query(`
      SELECT category, COUNT(*)::int AS count
      FROM support_tickets GROUP BY category ORDER BY count DESC
    `),
    pool.query(`
      SELECT priority, COUNT(*)::int AS count
      FROM support_tickets
      WHERE LOWER(status) NOT IN ('resolved', 'closed')
      GROUP BY priority ORDER BY count DESC
    `),
  ]);

  const tc = ticketCounts.rows[0];
  const dc = disputeCounts.rows[0];
  const rc = reportCounts.rows[0];

  const statusChart = [
    { label: 'Open', value: Number(tc.open_count), color: '#f87171' },
    { label: 'In progress', value: Number(tc.in_progress), color: '#fbbf24' },
    { label: 'Resolved', value: Number(tc.resolved), color: '#34d399' },
  ].filter((x) => x.value > 0);

  const categoryChart = categoryBreakdown.rows.map((r, i) => ({
    label: r.category,
    value: r.count,
    color: ['#fb7185', '#a78bfa', '#60a5fa', '#34d399', '#fbbf24'][i % 5],
  }));

  return {
    lastUpdated: new Date().toISOString(),
    summary: {
      openTickets: Number(tc.open_count) + Number(tc.in_progress),
      totalTickets: Number(tc.total),
      unassignedTickets: Number(tc.unassigned),
      highPriorityTickets: Number(tc.high_priority),
      openDisputes: Number(dc.open_count) + Number(dc.under_review),
      totalDisputes: Number(dc.total),
      creditsAtRisk: Number(dc.credits_at_risk),
      openReports: Number(rc.open_count) + Number(rc.in_review),
      totalReports: Number(rc.total),
      avgResolutionHours: 18,
      slaCompliancePercent: tc.total > 0 ? Math.round(((Number(tc.resolved) / Number(tc.total)) * 100)) : 100,
    },
    charts: {
      ticketStatusMix: statusChart,
      ticketCategories: categoryChart,
      openByPriority: priorityBreakdown.rows.map((r) => ({
        label: r.priority,
        value: r.count,
      })),
      disputeStatusMix: [
        { label: 'Open', value: Number(dc.open_count), color: '#f87171' },
        { label: 'Under review', value: Number(dc.under_review), color: '#fbbf24' },
        { label: 'Resolved', value: Number(dc.resolved), color: '#34d399' },
      ].filter((x) => x.value > 0),
    },
    tickets,
    disputes,
    reports,
    staffWorkload,
    recentActivity,
    alerts: buildTicketAlerts(tc, dc, rc),
    dataSources: {
      tables: ['support_tickets', 'ticket_messages', 'disputes', 'reports', 'violations'],
      persisted: true,
    },
  };
}

function buildTicketAlerts(tc, dc, rc) {
  const alerts = [];
  if (Number(tc.unassigned) > 0) {
    alerts.push({
      id: 'unassigned',
      message: `${tc.unassigned} ticket(s) have no assignee.`,
      severity: 'warning',
    });
  }
  if (Number(tc.high_priority) > 0) {
    alerts.push({
      id: 'high-priority',
      message: `${tc.high_priority} high-priority ticket(s) need attention.`,
      severity: 'error',
    });
  }
  if (Number(dc.open_count) > 0) {
    alerts.push({
      id: 'open-disputes',
      message: `${dc.open_count} open dispute(s) — ${Number(dc.credits_at_risk).toLocaleString()} credits at risk.`,
      severity: 'warning',
    });
  }
  if (Number(rc.open_count) > 0) {
    alerts.push({
      id: 'open-reports',
      message: `${rc.open_count} user report(s) awaiting triage.`,
      severity: 'info',
    });
  }
  if (!alerts.length) {
    alerts.push({
      id: 'clear',
      message: 'Ticket desk is clear — no urgent queues.',
      severity: 'success',
    });
  }
  return alerts;
}

async function fetchTicketsList() {
  const result = await pool.query(`
    SELECT
      t.*,
      COALESCE(ra.display_name, ru.first_name || ' ' || ru.last_name) AS requester_name,
      ra.handle AS requester_handle,
      ru.email_address AS requester_email,
      COALESCE(sa.display_name, st.first_name || ' ' || st.last_name) AS assignee_name,
      st.role AS assignee_role,
      (SELECT COUNT(*)::int FROM ticket_messages tm WHERE tm.ticket_id = t.ticket_id) AS message_count,
      (SELECT MAX(tm.created_at) FROM ticket_messages tm WHERE tm.ticket_id = t.ticket_id) AS last_message_at
    FROM support_tickets t
    LEFT JOIN accounts ra ON ra.account_id = t.requester_account_id
    LEFT JOIN users ru ON ru.account_id = ra.account_id
    LEFT JOIN staff st ON st.staff_id = t.assigned_staff_id
    LEFT JOIN accounts sa ON sa.account_id = st.account_id
    ORDER BY
      CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
      t.updated_at DESC
    LIMIT 50
  `);
  return result.rows.map(mapTicketRow);
}

async function fetchDisputesList() {
  const result = await pool.query(`
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
    ORDER BY d.opened_at DESC
    LIMIT 40
  `);
  return result.rows.map(mapDisputeRow);
}

async function fetchReportsList() {
  const result = await pool.query(`
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
    WHERE r.deleted_at IS NULL
    ORDER BY r.created_at DESC
    LIMIT 40
  `);
  return result.rows.map(mapReportRow);
}

async function fetchStaffWorkload() {
  const result = await pool.query(`
    SELECT
      s.staff_id,
      s.role,
      COALESCE(a.display_name, s.first_name || ' ' || s.last_name) AS name,
      (SELECT COUNT(*)::int FROM support_tickets t
        WHERE t.assigned_staff_id = s.staff_id AND LOWER(t.status) NOT IN ('resolved', 'closed')) AS open_tickets,
      (SELECT COUNT(*)::int FROM disputes d
        WHERE d.assigned_staff_id = s.staff_id AND LOWER(d.status) NOT IN ('resolved', 'closed')) AS open_disputes,
      (SELECT COUNT(*)::int FROM reports r
        WHERE r.assigned_staff_id = s.staff_id AND LOWER(r.status) = 'open' AND r.deleted_at IS NULL) AS open_reports
    FROM staff s
    INNER JOIN accounts a ON a.account_id = s.account_id
    ORDER BY open_tickets DESC, open_disputes DESC
  `);
  return result.rows.map((r) => ({
    staffId: r.staff_id,
    name: r.name,
    role: r.role,
    openTickets: Number(r.open_tickets),
    openDisputes: Number(r.open_disputes),
    openReports: Number(r.open_reports),
    totalOpen: Number(r.open_tickets) + Number(r.open_disputes) + Number(r.open_reports),
  }));
}

async function fetchRecentActivity() {
  const result = await pool.query(`
    (
      SELECT 'ticket' AS type, ticket_number AS ref, subject AS label, status, updated_at AS at
      FROM support_tickets ORDER BY updated_at DESC LIMIT 8
    )
    UNION ALL
    (
      SELECT 'dispute' AS type, dispute_number AS ref, title AS label, status, updated_at AS at
      FROM disputes ORDER BY updated_at DESC LIMIT 6
    )
    UNION ALL
    (
      SELECT 'report' AS type, report_number AS ref, COALESCE(reason, type) AS label, status, COALESCE(updated_at, created_at) AS at
      FROM reports WHERE deleted_at IS NULL ORDER BY COALESCE(updated_at, created_at) DESC LIMIT 6
    )
    ORDER BY at DESC
    LIMIT 20
  `);
  return result.rows.map((r, i) => ({
    id: `act-${i}`,
    type: r.type,
    ref: r.ref,
    label: r.label,
    status: normalizeStatus(r.status),
    at: r.at,
  }));
}

async function getTicketDetail(ticketId) {
  const ticketResult = await pool.query(
    `
    SELECT
      t.*,
      COALESCE(ra.display_name, ru.first_name || ' ' || ru.last_name) AS requester_name,
      ra.handle AS requester_handle,
      ru.email_address AS requester_email,
      COALESCE(sa.display_name, st.first_name || ' ' || st.last_name) AS assignee_name,
      st.role AS assignee_role
    FROM support_tickets t
    LEFT JOIN accounts ra ON ra.account_id = t.requester_account_id
    LEFT JOIN users ru ON ru.account_id = ra.account_id
    LEFT JOIN staff st ON st.staff_id = t.assigned_staff_id
    LEFT JOIN accounts sa ON sa.account_id = st.account_id
    WHERE t.ticket_id = $1
    `,
    [ticketId]
  );
  if (!ticketResult.rows.length) return null;

  const messagesResult = await pool.query(
    `SELECT * FROM ticket_messages WHERE ticket_id = $1 ORDER BY created_at ASC`,
    [ticketId]
  );

  const staffResult = await pool.query(`
    SELECT s.staff_id, s.role, COALESCE(a.display_name, s.first_name || ' ' || s.last_name) AS name
    FROM staff s INNER JOIN accounts a ON a.account_id = s.account_id
    ORDER BY s.role
  `);

  return {
    ticket: mapTicketRow({ ...ticketResult.rows[0], message_count: messagesResult.rows.length }),
    messages: messagesResult.rows.map((m) => ({
      id: m.message_id,
      authorType: m.author_type,
      authorName: m.author_name,
      body: m.body,
      isInternal: m.is_internal,
      createdAt: m.created_at,
    })),
    assignableStaff: staffResult.rows.map((s) => ({
      staffId: s.staff_id,
      name: s.name,
      role: s.role,
    })),
  };
}

async function updateTicket(ticketId, patch, staffSession) {
  const allowed = ['status', 'priority', 'assigned_staff_id', 'assigned_role'];
  const sets = [];
  const values = [];
  let idx = 1;

  for (const key of allowed) {
    if (patch[key] !== undefined) {
      sets.push(`${key} = $${idx}`);
      values.push(patch[key]);
      idx += 1;
    }
  }

  if (!sets.length) return getTicketDetail(ticketId);

  if (patch.status && ['resolved', 'closed'].includes(String(patch.status).toLowerCase())) {
    sets.push(`closed_at = NOW()`);
  }

  sets.push(`updated_at = NOW()`);
  values.push(ticketId);

  await pool.query(
    `UPDATE support_tickets SET ${sets.join(', ')} WHERE ticket_id = $${idx}`,
    values
  );

  if (patch.note) {
    await pool.query(
      `INSERT INTO ticket_messages (ticket_id, author_account_id, author_type, author_name, body, is_internal)
       VALUES ($1, $2, 'staff', $3, $4, $5)`,
      [
        ticketId,
        staffSession?.accountId || null,
        staffSession?.username || 'Admin',
        patch.note,
        Boolean(patch.internalNote),
      ]
    );
  }

  return getTicketDetail(ticketId);
}

async function addTicketMessage(ticketId, body, staffSession, isInternal = false) {
  await pool.query(
    `INSERT INTO ticket_messages (ticket_id, author_account_id, author_type, author_name, body, is_internal)
     VALUES ($1, $2, 'staff', $3, $4, $5)`,
    [ticketId, staffSession?.accountId || null, staffSession?.username || 'Admin', body, isInternal]
  );
  await pool.query(`UPDATE support_tickets SET updated_at = NOW() WHERE ticket_id = $1`, [ticketId]);
  return getTicketDetail(ticketId);
}

async function updateDispute(disputeId, patch, staffSession) {
  const allowed = ['status', 'priority', 'assigned_staff_id', 'resolution_notes'];
  const sets = [];
  const values = [];
  let idx = 1;

  for (const key of allowed) {
    if (patch[key] !== undefined) {
      sets.push(`${key} = $${idx}`);
      values.push(patch[key]);
      idx += 1;
    }
  }

  if (!sets.length) {
    const list = await fetchDisputesList();
    return list.find((d) => String(d.id) === String(disputeId)) || null;
  }

  if (patch.status && ['resolved', 'closed'].includes(String(patch.status).toLowerCase())) {
    sets.push(`resolved_at = NOW()`);
  }

  sets.push(`updated_at = NOW()`);
  values.push(disputeId);

  await pool.query(`UPDATE disputes SET ${sets.join(', ')} WHERE dispute_id = $${idx}`, values);

  const list = await fetchDisputesList();
  return list.find((d) => String(d.id) === String(disputeId)) || null;
}

async function getDisputeDetail(disputeId) {
  const disputeResult = await pool.query(
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
    WHERE d.dispute_id = $1
    `,
    [disputeId]
  );
  if (!disputeResult.rows.length) return null;

  const messagesResult = await pool.query(
    `SELECT * FROM dispute_messages WHERE dispute_id = $1 ORDER BY created_at ASC`,
    [disputeId]
  );

  const staffResult = await pool.query(`
    SELECT s.staff_id, s.role, COALESCE(a.display_name, s.first_name || ' ' || s.last_name) AS name
    FROM staff s INNER JOIN accounts a ON a.account_id = s.account_id
    ORDER BY s.role
  `);

  return {
    dispute: mapDisputeRow(disputeResult.rows[0]),
    messages: messagesResult.rows.map((m) => ({
      id: m.message_id,
      authorType: m.author_type,
      authorName: m.author_name,
      body: m.body,
      isInternal: m.is_internal,
      createdAt: m.created_at,
    })),
    assignableStaff: staffResult.rows.map((s) => ({
      staffId: s.staff_id,
      name: s.name,
      role: s.role,
    })),
  };
}

async function addDisputeMessage(disputeId, body, staffSession, isInternal = false) {
  await pool.query(
    `INSERT INTO dispute_messages (dispute_id, author_account_id, author_type, author_name, body, is_internal)
     VALUES ($1, $2, 'staff', $3, $4, $5)`,
    [disputeId, staffSession?.accountId || null, staffSession?.username || 'Admin', body, isInternal]
  );
  await pool.query(`UPDATE disputes SET updated_at = NOW() WHERE dispute_id = $1`, [disputeId]);
  return getDisputeDetail(disputeId);
}

async function updateReport(reportId, patch) {
  const allowed = ['status', 'priority', 'assigned_staff_id'];
  const sets = [];
  const values = [];
  let idx = 1;

  for (const key of allowed) {
    if (patch[key] !== undefined) {
      sets.push(`${key} = $${idx}`);
      values.push(patch[key]);
      idx += 1;
    }
  }

  if (!sets.length) return null;

  if (patch.status === 'resolved') sets.push(`resolved_at = NOW()`);
  sets.push(`updated_at = NOW()`);
  values.push(reportId);

  await pool.query(`UPDATE reports SET ${sets.join(', ')} WHERE report_id = $${idx}`, values);

  const list = await fetchReportsList();
  return list.find((r) => String(r.id) === String(reportId)) || null;
}

module.exports = {
  getTicketsOverview,
  getTicketDetail,
  updateTicket,
  addTicketMessage,
  updateDispute,
  getDisputeDetail,
  addDisputeMessage,
  updateReport,
};
