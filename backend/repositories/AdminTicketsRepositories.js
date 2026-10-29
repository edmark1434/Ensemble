const { pool } = require('../lib/Database');
const { randomUUID } = require('crypto');
const { ObjectId } = require('mongodb');
const { getMongoClient } = require('../lib/MongoDb');
const { recordAccountActivity } = require('./AccountActivityRepositories');
const {
  normalizeTicketScreenshots,
  canViewTicketPayments,
  canAdjustTicketCredits,
  recordTicketEvent,
  listTicketTimeline,
  listTicketArticles,
  listTicketPaymentEvidence,
} = require('./TicketHelpRepositories');
const {
  createInboxRepositories,
  createMessageRepositories,
  getMessageByIdRepositories,
  editMessageRepositories,
  deleteMessageRepositories,
  getConversationByConvoId,
} = require('./InboxRepositories');
const { createNotificationServices } = require('../services/NotificationServices');
const { buildReportSubject, snapshotTitle } = require('../lib/ReportSubject');
const { CLOSED_REPORT_STATUSES } = require('../lib/ReportEnums');
const { getSectionValue } = require('./AdminSettingsRepositories');
const {
  isMongoReady,
  getDisputeChatId,
  ensureDisputeChat,
  listDisputeMessages,
  createDisputeMessage,
  updateDisputeMessageAudience,
  notifyDisputeParties,
} = require('./DisputeChatRepositories');
const {
  ROLE_TO_TICKET_TYPES,
  TICKET_TYPES,
  TICKET_STATUSES,
  TICKET_PRIORITIES,
  FORUM_TYPES,
  MARKETPLACE_TYPES,
  JOBS_TYPES,
  SUPPORT_TYPES,
  normalizeTicketType,
  normalizeTicketStatus,
  normalizeTicketPriority,
  resolveTicketPriority,
  defaultPriorityForType,
  ticketTypeMeta,
  isClosedStatus,
  isTypeAllowedForRole,
  isValidTicketType,
} = require('../lib/TicketEnums');
const {
  normalizeDisputeType,
  normalizeDisputePriority,
  normalizeDisputeVisibility,
} = require('../lib/DisputeEnums');
const { mapTicketRow } = require('./ModeratorSharedRepositories');
const {
  FORUM_REPORT_TYPES,
  MARKETPLACE_REPORT_TYPES,
  JOBS_REPORT_TYPES,
  isReportTypeInScope,
} = require('../lib/ReportEnums');

/** Staff roles that may appear in assignee pickers, keyed by desk / queue. */
const ASSIGNABLE_ROLES_BY_QUEUE = Object.freeze({
  jobs: ['Jobs N Gigs Moderator', 'Jobs Moderator', 'Jobs & Gigs Moderator', 'Admin', 'Administrator'],
  marketplace: ['Marketplace Moderator', 'Admin', 'Administrator'],
  forum: ['Forum Moderator', 'Forums Moderator', 'Admin', 'Administrator'],
  forums: ['Forum Moderator', 'Forums Moderator', 'Admin', 'Administrator'],
  support: ['Support Moderator', 'Admin', 'Administrator'],
  disputes: ['Support Moderator', 'Admin', 'Administrator'],
  admin: [
    'Admin',
    'Administrator',
    'Support Moderator',
    'Forum Moderator',
    'Forums Moderator',
    'Marketplace Moderator',
    'Jobs N Gigs Moderator',
    'Jobs Moderator',
    'Jobs & Gigs Moderator',
  ],
});

function isAdminRole(role) {
  const r = String(role || '').toLowerCase().trim();
  return r === 'admin' || r === 'administrator';
}

function normalizeQueueKey(queueKey) {
  const q = String(queueKey || '')
    .trim()
    .toLowerCase();
  if (q === 'forums') return 'forum';
  if (q === 'jobs' || q === 'jobs-gigs' || q === 'job') return 'jobs';
  if (q === 'marketplace' || q === 'market') return 'marketplace';
  if (q === 'forum') return 'forum';
  if (q === 'support') return 'support';
  if (q === 'disputes' || q === 'dispute') return 'disputes';
  if (q === 'admin' || q === 'administrator') return 'admin';
  return q || 'admin';
}

function assignableRolesForQueue(queueKey) {
  const key = normalizeQueueKey(queueKey);
  return ASSIGNABLE_ROLES_BY_QUEUE[key] || ASSIGNABLE_ROLES_BY_QUEUE.admin;
}

function inferTicketAssignableQueue(ticketType) {
  const type = normalizeTicketType(ticketType) || String(ticketType || '').trim();
  if (FORUM_TYPES.includes(type)) return 'forum';
  if (MARKETPLACE_TYPES.includes(type)) return 'marketplace';
  if (JOBS_TYPES.includes(type)) return 'jobs';
  if (SUPPORT_TYPES.includes(type)) return 'support';
  return 'admin';
}

function inferReportAssignableQueue(targetType) {
  if (isReportTypeInScope(targetType, FORUM_REPORT_TYPES)) return 'forum';
  if (isReportTypeInScope(targetType, MARKETPLACE_REPORT_TYPES)) return 'marketplace';
  if (isReportTypeInScope(targetType, JOBS_REPORT_TYPES)) return 'jobs';
  return 'support';
}

function roleAllowedForQueue(role, queueKey) {
  if (isAdminRole(role)) return true;
  const allowed = assignableRolesForQueue(queueKey).map((r) => r.toLowerCase());
  return allowed.includes(String(role || '').toLowerCase());
}

async function fetchAssignableStaffForQueue(queueKey, { includeStaffId = null } = {}) {
  const roles = assignableRolesForQueue(queueKey);
  const roleList = roles.map((r) => r.toLowerCase());
  const params = [roleList];
  let includeSql = '';
  if (includeStaffId != null && includeStaffId !== '') {
    params.push(String(includeStaffId));
    includeSql = ` OR s.staff_id::text = $${params.length}`;
  }

  const result = await pool.query(
    `
    SELECT s.staff_id, s.role, COALESCE(a.display_name, s.first_name || ' ' || s.last_name) AS name
    FROM staff s
    INNER JOIN accounts a ON a.account_id = s.account_id
    WHERE a.deleted_at IS NULL
      AND (
        LOWER(s.role) = ANY($1)
        ${includeSql}
      )
    ORDER BY s.role, name
    `,
    params
  );
  return result.rows.map((s) => ({
    staffId: s.staff_id,
    name: s.name,
    role: s.role,
  }));
}

async function assertStaffAssignableToQueue(staffId, queueKey) {
  const result = await pool.query(`SELECT role FROM staff WHERE staff_id = $1`, [staffId]);
  if (!result.rows.length) {
    throw new Error('Staff member not found.');
  }
  const role = result.rows[0].role;
  // Admins can handle any report/ticket queue.
  if (isAdminRole(role)) return;
  if (!roleAllowedForQueue(role, queueKey)) {
    const label = normalizeQueueKey(queueKey);
    throw new Error(
      `That staff member is not part of the ${label} moderator queue for this case.`
    );
  }
}

function getTicketCatalog() {
  return {
    types: [...TICKET_TYPES],
    typeDetails: TICKET_TYPES.map((label) => {
      const meta = ticketTypeMeta(label);
      return {
        label,
        queueRole: meta?.queueRole || 'Support Moderator',
        description: meta?.description || null,
        group: meta?.group || null,
        subgroup: meta?.subgroup || null,
        defaultPriority: defaultPriorityForType(label),
      };
    }),
    statuses: [...TICKET_STATUSES],
    priorities: [...TICKET_PRIORITIES],
    escalateByRole: { ...ROLE_TO_TICKET_TYPES },
    escalateRoles: [
      'Support Moderator',
      'Marketplace Moderator',
      'Forum Moderator',
      'Jobs N Gigs Moderator',
      'Admin',
    ],
  };
}

function mongoDb() {
  const client = getMongoClient();
  return client ? client.db('ensemble') : null;
}

/** Session stores snake_case account_id; some older code used camelCase. */
function sessionAccountId(session) {
  const id = session?.account_id ?? session?.accountId ?? null;
  return id != null ? String(id) : null;
}

function sessionDisplayName(session) {
  return session?.displayName || session?.display_name || session?.username || 'User';
}

function isStaffSession(session) {
  const type = String(session?.type || '').toLowerCase();
  return type === 'staff' || type === 'admin' || Boolean(session?.staff_id || session?.staffId);
}

function sessionStaffId(session) {
  const id = session?.staff_id ?? session?.staffId ?? null;
  return id != null ? String(id) : null;
}

function normalizeStaffId(id) {
  if (id == null || id === '') return null;
  return String(id).trim().toLowerCase();
}

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

async function nextTicketNumber() {
  const result = await pool.query(`
    SELECT COALESCE(
      MAX(CAST(SUBSTRING(ticket_number FROM 5) AS INTEGER)),
      50000
    ) + 1 AS next_num
    FROM tickets
    WHERE ticket_number ~ '^TKT-[0-9]+$'
  `);
  return `TKT-${result.rows[0].next_num}`;
}

async function nextDisputeNumber() {
  const result = await pool.query(`
    SELECT COALESCE(
      MAX(CAST(SUBSTRING(dispute_number FROM 5) AS INTEGER)),
      50000
    ) + 1 AS next_num
    FROM disputes
    WHERE dispute_number ~ '^DIS-[0-9]+$'
  `);
  return `DIS-${result.rows[0].next_num}`;
}

/**
 * Create a support ticket in Postgres. Optional first message goes to Mongo chat.
 * @returns {Promise<{ticket, messages, chatId, chatAvailable, assignableStaff}>}
 */
async function createSupportTicket(input, session = null) {
  const reason = String(input?.reason || input?.subject || '').trim();
  if (!reason) throw new Error('Subject is required');

  const type = normalizeTicketType(input?.type || input?.category || 'Other');
  const priority = resolveTicketPriority(type, input?.priority);
  const requesterAccountId = input?.requesterAccountId || sessionAccountId(session);
  if (!requesterAccountId) throw new Error('Requester account is required');

  const description = input?.description ? String(input.description).trim() : '';
  let formAnswers = [];
  if (input.fields !== undefined) {
    const { sanitizeTicketFormValues } = require('../lib/TicketFormFields');
    formAnswers = sanitizeTicketFormValues(type, input.fields);
  }
  if (formAnswers.length) {
    formAnswers = await resolveFormAnswers(requesterAccountId, type, formAnswers);
  }
  const submissionContext = await buildSubmissionContext(requesterAccountId, input.context);
  const ticketNumber = await nextTicketNumber();
  const handledBy =
    input?.handledByStaffId ?? input?.assignedStaffId ?? null;
  const status = handledBy ? 'In Progress' : 'Open';

  const insert = await pool.query(
    `
    INSERT INTO tickets (
      ticket_number, reason, type, priority, status,
      account_id, handled_by_staff_id,
      message_count, last_message_at,
      form_answers, submission_context
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7,
      0, NULL,
      $8::jsonb, $9::jsonb
    )
    RETURNING ticket_id
    `,
    [
      ticketNumber,
      reason,
      type,
      priority,
      status,
      requesterAccountId,
      handledBy,
      JSON.stringify(formAnswers),
      JSON.stringify(submissionContext),
    ]
  );

  const ticketId = insert.rows[0].ticket_id;

  try {
    const { dispatchPlatformNotification } = require('../services/PlatformAlertServices');
    dispatchPlatformNotification('NEW_TICKET', {
      ticket_id: ticketId,
      ticket_number: ticketNumber,
      reason,
      type,
    }).catch(() => {});
  } catch {}

  if (description) {
    const authorSession = session || {
      account_id: requesterAccountId,
      type: 'User',
      username: sessionDisplayName(session),
    };
    try {
      await addTicketMessage(ticketId, description, authorSession, false, input?.attachments || [], null, {
        initial: true,
      });
    } catch (err) {
      // Ticket metadata still exists; chat can be started later when Mongo is up.
      if (!err?.message?.includes('MongoDB')) throw err;
      console.warn('Ticket created without initial chat message:', err.message);
    }
  }

  return getTicketDetail(ticketId);
}

/**
 * Staff opens a ticket owned by another account. The member is the requester;
 * the signed-in staff member is the author of the opening message.
 */
async function createStaffTicketForAccount(input, session) {
  if (!isStaffSession(session)) {
    throw ticketError('Only staff can open a ticket for someone', 403);
  }

  const requesterAccountId = String(input?.requesterAccountId || input?.accountId || '').trim();
  if (!TICKET_ACCOUNT_UUID.test(requesterAccountId)) {
    throw ticketError('Choose the member this ticket is for', 400);
  }

  const person = await findTicketParticipantAccount(requesterAccountId);
  if (!person || person.deleted_at || (!person.user_id && !person.staff_id)) {
    throw ticketError('Choose a member or staff account', 404);
  }
  const accountStatus = String(person.status || 'active').toLowerCase();
  if (['deleted', 'inactive', 'deactivated'].includes(accountStatus)) {
    throw ticketError('That account cannot receive a ticket', 400);
  }

  const reason = String(input?.reason || input?.subject || '').trim();
  if (!reason) throw ticketError('Subject is required', 400);
  if (reason.length > 200) throw ticketError('Subject must be 200 characters or less', 400);

  const description = String(input?.description || '').trim();
  if (!description) throw ticketError('Description is required', 400);
  if (description.length < 10) throw ticketError('Description must be at least 10 characters', 400);
  if (description.length > 5000) throw ticketError('Description must be 5,000 characters or less', 400);

  const rawType = input?.type || input?.category;
  if (!isValidTicketType(rawType)) throw ticketError('Pick a ticket type', 400);
  const type = normalizeTicketType(rawType);

  if (type === 'Appeal an account penalty') {
    await assertCanFileAppeal(requesterAccountId);
  }

  const staff = await resolveDisputeStaffId(session);
  if (!staff?.staff_id) throw ticketError('Staff profile not found', 403);

  let handledBy = input?.handledByStaffId ?? input?.assignedStaffId ?? null;
  if (input?.assignToMe) handledBy = staff.staff_id;
  else if (handledBy) handledBy = String(handledBy).trim() || null;

  if (handledBy) {
    const assignee =
      String(handledBy) === String(staff.staff_id)
        ? staff
        : (await pool.query(`SELECT staff_id, role FROM staff WHERE staff_id = $1`, [handledBy])).rows[0];
    if (!assignee) throw ticketError('Staff member not found', 400);
    if (!isAdminRole(assignee.role) && !isTypeAllowedForRole(assignee.role, type)) {
      throw ticketError('That staff member cannot take this ticket type', 400);
    }
  }

  const actor = await actingStaffIdentity(session);
  const personName = person.staff_id
    ? formatStaffIdentity({ name: person.name, handle: person.handle, role: person.staff_role })
    : formatAccountIdentity(person);
  const openingMessage = `${actor.label} opened this ticket on the member's behalf.\n\n${description}`;

  const data = await createSupportTicket(
    {
      subject: reason,
      reason,
      type,
      priority: input?.priority,
      description: openingMessage,
      requesterAccountId,
      handledByStaffId: handledBy,
    },
    session
  );

  const ticketId = data?.ticket?.id;
  if (ticketId) {
    await recordTicketEvent({
      ticketId,
      eventType: 'staff_created',
      summary: `${actor.label} opened this ticket for ${personName}.`,
      actorStaffId: actor.staffId,
      actorAccountId: sessionAccountId(session),
      metadata: {
        requesterAccountId,
        assigned: Boolean(handledBy),
      },
    });
    await notifyTicketParticipant(
      requesterAccountId,
      `Staff opened ticket #${data.ticket.number} on your behalf.`,
      'TICKET_STAFF_OPEN',
      ticketId,
      data.chatId || null
    );
  }

  return data;
}

function mapDisputeRow(row) {
  const closedStatuses = ['closed'];
  return {
    id: row.dispute_id,
    number: row.dispute_number,
    title: row.title,
    description: row.description || row.reason || null,
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
    type: row.type || 'Other',
    targetType: displayLabel(row.target_type),
    targetId: row.target_id || row.reference_id,
    subjectTitle: snapshotTitle(row),
    description: row.description,
    // Keep status/priority as DB snake_case for filters/forms; format in UI.
    status: String(row.status || 'open').toLowerCase(),
    priority: String(row.priority || 'medium').toLowerCase(),
    assignee: row.assigned_staff_id
      ? { staffId: row.assigned_staff_id, name: row.assignee_name || 'Unassigned' }
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

async function getTicketsOverview(staffSession = null) {
  const [
    ticketCounts,
    disputeCounts,
    reportCounts,
    tickets,
    disputes,
    reports,
    staffWorkload,
    recentActivity,
    typeBreakdown,
    priorityBreakdown,
  ] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'Open')::int AS open_status,
        COUNT(*) FILTER (WHERE status NOT IN ('Resolved', 'Closed'))::int AS open_count,
        COUNT(*) FILTER (WHERE status NOT IN ('Resolved', 'Closed'))::int AS in_progress,
        COUNT(*) FILTER (WHERE status = 'Escalated to Dev')::int AS escalated_dev,
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
      WHERE deleted_at IS NULL
    `),
    pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE LOWER(status) = 'pending_review')::int AS pending_review,
        COUNT(*) FILTER (WHERE LOWER(status) = 'open')::int AS open_only,
        COUNT(*) FILTER (WHERE LOWER(status) = 'awaiting_response')::int AS awaiting_response,
        COUNT(*) FILTER (WHERE LOWER(status) = 'under_review')::int AS under_review,
        COUNT(*) FILTER (WHERE LOWER(status) = 'closed')::int AS closed,
        COUNT(*) FILTER (
          WHERE LOWER(status) IN ('pending_review', 'open', 'awaiting_response', 'under_review')
        )::int AS open_count,
        COALESCE(
          SUM(credit_amount_involved) FILTER (
            WHERE LOWER(status) IN ('pending_review', 'open', 'awaiting_response', 'under_review')
          ),
          0
        )::int AS credits_at_risk
      FROM disputes
    `),
    pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE LOWER(status) = 'open')::int AS open_count,
        COUNT(*) FILTER (WHERE LOWER(status) = 'in_review')::int AS in_review,
        COUNT(*) FILTER (WHERE LOWER(status) = 'resolved')::int AS resolved,
        COUNT(*) FILTER (WHERE LOWER(status) NOT IN ('resolved', 'closed', 'dismissed', 'denied', 'archived', 'sanctioned'))::int AS awaiting_triage
      FROM reports
      WHERE deleted_at IS NULL
    `),
    fetchTicketsList(),
    fetchDisputesList(),
    fetchReportsList(),
    fetchStaffWorkload(),
    fetchRecentActivity(),
    pool.query(`
      SELECT type, COUNT(*)::int AS count
      FROM tickets
      WHERE deleted_at IS NULL
      GROUP BY type
      ORDER BY count DESC
    `),
    pool.query(`
      SELECT priority, COUNT(*)::int AS count
      FROM tickets
      WHERE deleted_at IS NULL
        AND status NOT IN ('Resolved', 'Closed')
      GROUP BY priority
      ORDER BY count DESC
    `),
  ]);

  const tc = ticketCounts.rows[0];
  const dc = disputeCounts.rows[0];
  const rc = reportCounts.rows[0];

  const statusChart = [
    { label: 'Open', value: Number(tc.open_status || 0), color: '#fb7185' },
    { label: 'In Progress', value: Math.max(0, Number(tc.in_progress) - Number(tc.open_status || 0)), color: '#fbbf24' },
    { label: 'Closed', value: Number(tc.resolved), color: '#a1a1aa' },
  ].filter((x) => x.value > 0);

  const catalog = await getTicketCatalog();
  const typeCountMap = Object.fromEntries(
    typeBreakdown.rows.map((r) => [String(r.type || '').trim(), Number(r.count || 0)])
  );
  const typeLabels = catalog.types.length
    ? catalog.types
    : Object.keys(typeCountMap).sort((a, b) => a.localeCompare(b));
  const typeChart = typeLabels
    .map((label, i) => ({
      label,
      value: typeCountMap[label] || 0,
      color: ['#fb7185', '#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#38bdf8'][i % 7],
    }))
    .filter((x) => x.value > 0);

  const priorityOrder = { High: 0, Medium: 1, Low: 2 };
  const priorityChart = (catalog.priorities.length ? catalog.priorities : ['High', 'Medium', 'Low'])
    .map((label) => {
      const row = priorityBreakdown.rows.find(
        (r) => String(r.priority || '').toLowerCase() === label.toLowerCase()
      );
      return { label, value: Number(row?.count || 0) };
    })
    .filter((x) => x.value > 0)
    .sort((a, b) => (priorityOrder[a.label] ?? 9) - (priorityOrder[b.label] ?? 9));

  const types = catalog.types.length ? catalog.types : typeLabels;

  const staff = staffSession ? await resolveDisputeStaffId(staffSession) : null;
  const currentStaffId = staff?.staff_id != null ? String(staff.staff_id) : sessionStaffId(staffSession);

  return {
    lastUpdated: new Date().toISOString(),
    summary: {
      openTickets: Number(tc.open_count) + Number(tc.in_progress) + Number(tc.escalated_dev),
      totalTickets: Number(tc.total),
      unassignedTickets: Number(tc.unassigned),
      highPriorityTickets: Number(tc.high_priority),
      awaitingReplyTickets: Number(tc.awaiting_reply),
      escalatedTickets: Number(tc.escalated),
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
      ticketCategories: typeChart,
      ticketTypes: typeChart,
      openByPriority: priorityChart,
      disputeStatusMix: [
        { label: 'Pending Review', value: Number(dc.pending_review || 0), color: '#fb7185' },
        { label: 'Open', value: Number(dc.open_only || 0), color: '#f87171' },
        { label: 'Awaiting Response', value: Number(dc.awaiting_response || 0), color: '#f59e0b' },
        { label: 'Under Review', value: Number(dc.under_review), color: '#fbbf24' },
        { label: 'Closed', value: Number(dc.closed || 0), color: '#94a3b8' },
      ].filter((x) => x.value > 0),
    },
    types,
    typeDetails: catalog.typeDetails,
    escalateByRole: catalog.escalateByRole,
    escalateRoles: catalog.escalateRoles,
    statuses: catalog.statuses,
    priorities: catalog.priorities,
    tickets,
    disputes,
    reports,
    staffWorkload,
    recentActivity,
    currentStaffId,
    alerts: buildTicketAlerts(tc, dc, rc),
    dataSources: {
      tables: [
        'tickets',
        'ticket_chats',
        'inbox/messages (mongo)',
        'disputes',
        'reports',
      ],
      persisted: true,
    },
  };
}

function buildTicketAlerts(tc, dc, rc) {
  const alerts = [];
  const openDisputes = Number(dc.open_count) + Number(dc.under_review);
  const openReports = Number(rc.awaiting_triage ?? Number(rc.open_count) + Number(rc.in_review || 0));

  if (Number(tc.unassigned) > 0) {
    alerts.push({
      id: 'unassigned',
      message: `${tc.unassigned} ticket(s) have no assignee.`,
      severity: 'warning',
      action: { tab: 'tickets', ticketFilters: { assignee: 'unassigned', flag: 'open_only' } },
    });
  }
  if (Number(tc.high_priority) > 0) {
    alerts.push({
      id: 'high-priority',
      message: `${tc.high_priority} high-priority ticket(s) need attention.`,
      severity: 'error',
      action: { tab: 'tickets', ticketFilters: { priority: 'High', flag: 'open_only' } },
    });
  }
  if (Number(tc.awaiting_reply) > 0) {
    alerts.push({
      id: 'awaiting-reply',
      message: `${tc.awaiting_reply} ticket(s) awaiting a staff reply.`,
      severity: 'warning',
      action: { tab: 'tickets', ticketFilters: { flag: 'awaiting' } },
    });
  }
  if (Number(tc.escalated) > 0) {
    alerts.push({
      id: 'escalated',
      message: `${tc.escalated} escalated ticket(s) need a queue handoff.`,
      severity: 'error',
      action: { tab: 'tickets', ticketFilters: { flag: 'escalated' } },
    });
  }
  if (openDisputes > 0) {
    alerts.push({
      id: 'open-disputes',
      message: `${openDisputes} open dispute(s) — ${Number(dc.credits_at_risk).toLocaleString()} credits at risk. Open Moderation → Disputes.`,
      severity: 'warning',
      action: null,
    });
  }
  if (openReports > 0) {
    alerts.push({
      id: 'open-reports',
      message: `${openReports} user report(s) awaiting triage — open Moderation → Reports.`,
      severity: 'info',
      action: null,
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
    WHERE t.deleted_at IS NULL
    ORDER BY
      CASE t.priority WHEN 'High' THEN 0 WHEN 'Medium' THEN 1 ELSE 2 END,
      t.updated_at DESC
    LIMIT 200
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
      st.role AS assignee_role,
      ct.status AS hold_status,
      ct.amount_credits AS hold_amount,
      ct.type AS hold_type
    FROM disputes d
    LEFT JOIN accounts ia ON ia.account_id = d.by_account_id
    LEFT JOIN users iu ON iu.account_id = ia.account_id
    LEFT JOIN accounts ra ON ra.account_id = d.for_account_id
    LEFT JOIN users ru ON ru.account_id = ra.account_id
    LEFT JOIN staff st ON st.staff_id = d.handled_by_staff_id
    LEFT JOIN accounts sa ON sa.account_id = st.account_id
    LEFT JOIN credit_transactions ct ON ct.credit_transaction_id = d.related_credit_transaction_id
    ORDER BY d.opened_at DESC
    LIMIT 80
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
    LIMIT 80
  `);
  return result.rows.map(mapReportRow);
}

async function fetchStaffWorkload() {
  const result = await pool.query(`
    SELECT
      s.staff_id,
      s.role,
      COALESCE(a.display_name, s.first_name || ' ' || s.last_name) AS name,
      (SELECT COUNT(*)::int FROM tickets t
        WHERE t.handled_by_staff_id = s.staff_id
          AND t.deleted_at IS NULL
          AND t.status NOT IN ('Resolved', 'Closed')) AS open_tickets,
      (SELECT COUNT(*)::int FROM disputes d
        WHERE d.handled_by_staff_id = s.staff_id
          AND LOWER(d.status) <> 'closed') AS open_disputes,
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
      SELECT 'ticket' AS type, ticket_number AS ref, reason AS label, status, updated_at AS at
      FROM tickets
      WHERE deleted_at IS NULL
      ORDER BY updated_at DESC LIMIT 8
    )
    UNION ALL
    (
      SELECT 'dispute' AS type, dispute_number AS ref, title AS label, status, updated_at AS at
      FROM disputes ORDER BY updated_at DESC LIMIT 6
    )
    UNION ALL
    (
      SELECT 'report' AS type, report_number AS ref, COALESCE(type, report_number) AS label, status, COALESCE(updated_at, created_at) AS at
      FROM reports WHERE deleted_at IS NULL ORDER BY COALESCE(updated_at, created_at) DESC LIMIT 6
    )
    ORDER BY at DESC
    LIMIT 20
  `);
  return result.rows.map((r, i) => ({
    id: `act-${i}`,
    type: displayLabel(r.type),
    ref: r.ref,
    label: r.label,
    status: displayLabel(r.status),
    at: r.at,
  }));
}

async function getTicketChatId(ticketId) {
  const result = await pool.query(
    `SELECT chat_id FROM ticket_chats WHERE ticket_id = $1 AND deleted_at IS NULL`,
    [ticketId]
  );
  return result.rows[0]?.chat_id || null;
}

/** Create (or reuse) the Mongo inbox for a support ticket and link it via ticket_chats. */
async function ensureTicketChat(ticketId, ticketRow) {
  const existing = await getTicketChatId(ticketId);
  const ticketDetails = {
    ticket_number: ticketRow.ticket_number || null,
    subject: ticketRow.reason || null,
    type: ticketRow.type || null,
    priority: ticketRow.priority || null,
    status: ticketRow.status || null,
  };

  if (existing) {
    const db = mongoDb();
    if (db && ObjectId.isValid(existing)) {
      await db.collection('inbox').updateOne(
        { _id: new ObjectId(existing) },
        {
          $set: {
            conversation_type: 'ticket',
            ticket_id: String(ticketId),
            support_ticket_id: String(ticketId),
            ticket_details: ticketDetails,
          },
        }
      );
    }
    return existing;
  }

  if (!getMongoClient()) {
    throw new Error('MongoDB is not connected — ticket chats require MONGODB_URI');
  }

  const members = [];
  const seen = new Set();
  const addMember = (accountId, role) => {
    if (!accountId || seen.has(String(accountId))) return;
    seen.add(String(accountId));
    members.push({ account_id: String(accountId), role, joined_at: new Date() });
  };

  addMember(ticketRow.account_id, 'member');

  const insertResult = await createInboxRepositories({
    conversation_name: ticketRow.ticket_number
      ? `Ticket ${ticketRow.ticket_number}`
      : `Ticket ${ticketId}`,
    conversation_type: 'ticket',
    ticket_id: String(ticketId),
    support_ticket_id: String(ticketId),
    ticket_details: ticketDetails,
    members,
    pinned_messages: [],
    created_at: new Date(),
    updated_at: new Date(),
  });

  const chatId = String(insertResult.insertedId);
  await pool.query(
    `INSERT INTO ticket_chats (ticket_id, chat_id)
     VALUES ($1, $2)
     ON CONFLICT (ticket_id) DO UPDATE
       SET chat_id = EXCLUDED.chat_id, deleted_at = NULL, created_at = CURRENT_TIMESTAMP`,
    [ticketId, chatId]
  );
  return chatId;
}

function mapMongoTicketMessage(m, senderNames = new Map()) {
  const messageType = String(m.message_type || 'text').toLowerCase();
  const unsent = Boolean(m.is_deleted || m.deleted_at || m.is_unsent);
  return {
    id: String(m._id),
    senderId: m.sender_id ? String(m.sender_id) : null,
    authorType: messageType === 'system' ? 'system' : (m.author_type || (m.is_internal ? 'staff' : 'user')),
    authorName: m.author_name || senderNames.get(String(m.sender_id)) || 'Unknown',
    body: m.message_content || m.body || '',
    attachments: Array.isArray(m.attachments) ? m.attachments : [],
    isInternal: Boolean(m.is_internal),
    isEdited: Boolean(m.is_edited),
    isUnsent: unsent,
    messageType,
    replyToId: m.message_id_reply ? String(m.message_id_reply) : null,
    createdAt: m.created_at || m.createdAt || null,
  };
}

const TICKET_ACCOUNT_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function ticketMemberIsActive(member) {
  return Boolean(member) && !['left', 'removed'].includes(String(member.status || 'active').toLowerCase());
}

function ticketError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function loadTicketInbox(chatId) {
  const db = mongoDb();
  if (!db || !chatId || !ObjectId.isValid(chatId)) return null;
  return db.collection('inbox').findOne({ _id: new ObjectId(chatId) });
}

async function upsertTicketMember(chatId, accountId, role, status) {
  const db = mongoDb();
  if (!db || !ObjectId.isValid(chatId)) {
    throw ticketError('Ticket chat is unavailable', 503);
  }
  const now = new Date();
  const inboxId = new ObjectId(chatId);
  const inbox = await db.collection('inbox').findOne(
    { _id: inboxId },
    { projection: { members: 1 } }
  );
  const current = (inbox?.members || []).find((member) => String(member.account_id) === String(accountId));
  if (current) {
    await db.collection('inbox').updateOne(
      { _id: inboxId, 'members.account_id': String(accountId) },
      {
        $set: {
          'members.$.role': role,
          'members.$.status': status,
          'members.$.joined_at': status === 'active' ? now : current.joined_at || now,
          updated_at: now,
        },
      }
    );
    return;
  }
  if (status !== 'active') return;
  await db.collection('inbox').updateOne(
    { _id: inboxId },
    {
      $push: {
        members: {
          account_id: String(accountId),
          role,
          status: 'active',
          joined_at: now,
        },
      },
      $set: { updated_at: now },
    }
  );
}

async function writeTicketMembershipNote(chatId, staffSession, body) {
  const now = new Date();
  const accountId = sessionAccountId(staffSession);
  const insertedMessageId = await createMessageRepositories({
    conversation_id: String(chatId),
    sender_id: accountId,
    message_type: 'system',
    message_content: body,
    message_id_reply: null,
    attachments: [],
    links: [],
    message_react: [],
    read_by: accountId ? [{ account_id: accountId, read_at: now }] : [],
    is_edited: false,
    is_deleted: false,
    is_internal: false,
    author_type: 'system',
    author_name: sessionDisplayName(staffSession) || 'Staff',
    created_at: now,
    updated_at: now,
  });
  const createdMessage = await getMessageByIdRepositories(insertedMessageId);
  const db = mongoDb();
  if (db && ObjectId.isValid(chatId)) {
    await db.collection('inbox').updateOne(
      { _id: new ObjectId(chatId) },
      { $set: { updated_at: now, last_message: body, last_message_time: now } }
    );
  }
  try {
    const { getIo } = require('../lib/WebSocket');
    const io = getIo();
    if (io && createdMessage) io.to(String(chatId)).emit('newMessage', createdMessage);
  } catch (error) {
    console.error('Ticket membership note saved without realtime delivery:', error.message);
  }
}

async function buildTicketPeople({ requesterAccountId, members, messages, includeEmail }) {
  const replyByAccount = new Map();
  for (const message of messages || []) {
    if (message.isInternal || message.isUnsent) continue;
    if (String(message.messageType || message.authorType || '').toLowerCase() === 'system') continue;
    const senderId = String(message.senderId || '');
    if (!TICKET_ACCOUNT_UUID.test(senderId)) continue;
    const createdAt = message.createdAt || null;
    const current = replyByAccount.get(senderId) || { replyCount: 0, lastReplyAt: null };
    current.replyCount += 1;
    if (createdAt && (!current.lastReplyAt || new Date(createdAt) > new Date(current.lastReplyAt))) {
      current.lastReplyAt = createdAt;
    }
    replyByAccount.set(senderId, current);
  }

  const memberByAccount = new Map();
  for (const member of members || []) {
    if (!member?.account_id) continue;
    memberByAccount.set(String(member.account_id), member);
  }
  if (requesterAccountId && !memberByAccount.has(String(requesterAccountId))) {
    memberByAccount.set(String(requesterAccountId), {
      account_id: String(requesterAccountId),
      role: 'member',
      status: 'active',
      joined_at: null,
    });
  }

  const accountIds = [...new Set([...memberByAccount.keys(), ...replyByAccount.keys()])]
    .filter((id) => TICKET_ACCOUNT_UUID.test(id));
  const profiles = new Map();
  if (accountIds.length) {
    const result = await pool.query(
      `SELECT
         a.account_id,
         a.handle,
         COALESCE(
           a.display_name,
           NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''),
           NULLIF(TRIM(CONCAT(s.first_name, ' ', s.last_name)), ''),
           a.handle,
           'Unknown'
         ) AS name,
         u.email_address,
         (s.staff_id IS NOT NULL) AS is_staff
       FROM accounts a
       LEFT JOIN users u ON u.account_id = a.account_id
       LEFT JOIN staff s ON s.account_id = a.account_id
       WHERE a.account_id = ANY($1::uuid[])`,
      [accountIds]
    );
    result.rows.forEach((row) => profiles.set(String(row.account_id), row));
  }

  const people = accountIds.map((accountId) => {
    const member = memberByAccount.get(accountId);
    const profile = profiles.get(accountId);
    const replies = replyByAccount.get(accountId) || { replyCount: 0, lastReplyAt: null };
    const rawStatus = member ? String(member.status || 'active').toLowerCase() : 'removed';
    return {
      accountId,
      name: profile?.name || 'Unknown',
      handle: profile?.handle || null,
      ...(includeEmail ? { email: profile?.email_address || null } : {}),
      role: member?.role || 'member',
      status: ['left', 'removed', 'active'].includes(rawStatus) ? rawStatus : 'active',
      isRequester: requesterAccountId != null && String(requesterAccountId) === accountId,
      isStaff: Boolean(profile?.is_staff),
      replyCount: replies.replyCount,
      lastReplyAt: replies.lastReplyAt,
      joinedAt: member?.joined_at || null,
    };
  });

  const participants = people
    .filter((person) => person.status === 'active' || person.isRequester)
    .sort((a, b) => Number(b.isRequester) - Number(a.isRequester) || a.name.localeCompare(b.name));
  const involved = people
    .filter((person) => person.replyCount > 0)
    .sort((a, b) => new Date(b.lastReplyAt || 0) - new Date(a.lastReplyAt || 0));
  return { participants, involved };
}

async function listParticipantTicketIds(accountId) {
  const db = mongoDb();
  if (!db || !accountId) return [];
  const rows = await db.collection('inbox').find(
    {
      conversation_type: 'ticket',
      members: {
        $elemMatch: {
          account_id: String(accountId),
          status: { $nin: ['left', 'removed'] },
        },
      },
    },
    { projection: { ticket_id: 1, support_ticket_id: 1 } }
  ).toArray();
  return [...new Set(
    rows
      .map((row) => row.ticket_id || row.support_ticket_id)
      .filter((id) => TICKET_ACCOUNT_UUID.test(String(id || '')))
      .map((id) => String(id))
  )];
}

async function getTicketDetail(ticketId, staffSession = null, options = {}) {
  const ticketResult = await pool.query(
    `
    SELECT
      t.*,
      COALESCE(ra.display_name, ru.first_name || ' ' || ru.last_name) AS requester_name,
      ra.handle AS requester_handle,
      ru.email_address AS requester_email,
      ru.user_id AS requester_user_id,
      COALESCE(sa.display_name, st.first_name || ' ' || st.last_name) AS assignee_name,
      st.account_id AS assignee_account_id,
      st.role AS assignee_role,
      COALESCE(ea.display_name, es.first_name || ' ' || es.last_name) AS escalated_by_name,
      es.role AS escalated_by_role
    FROM tickets t
    LEFT JOIN accounts ra ON ra.account_id = t.account_id
    LEFT JOIN users ru ON ru.account_id = ra.account_id
    LEFT JOIN staff st ON st.staff_id = t.handled_by_staff_id
    LEFT JOIN accounts sa ON sa.account_id = st.account_id
    LEFT JOIN staff es ON es.staff_id = t.escalated_by_staff_id
    LEFT JOIN accounts ea ON ea.account_id = es.account_id
    WHERE t.ticket_id = $1 AND t.deleted_at IS NULL
    `,
    [ticketId]
  );
  if (!ticketResult.rows.length) return null;

  const row = ticketResult.rows[0];
  const queueKey = options.assignableQueue || inferTicketAssignableQueue(row.type);
  const assignableStaff = await fetchAssignableStaffForQueue(queueKey, {
    includeStaffId: row.handled_by_staff_id,
  });

  let messages = [];
  let inboxMembers = [];
  let pendingInviteRows = [];
  let chatId = null;
  let chatAvailable = Boolean(getMongoClient());
  const staff = staffSession ? await resolveDisputeStaffId(staffSession) : null;

  try {
    chatId = await getTicketChatId(ticketId);
    if (chatId && chatAvailable) {
      // This method receives staffSession only from authenticated admin/moderator
      // ticket endpoints. Room membership must use that authenticated account
      // directly; it must not depend on a second staff-profile lookup succeeding.
      const staffAccountId = staffSession ? sessionAccountId(staffSession) : null;
      const db = mongoDb();
      if (staffAccountId && db && ObjectId.isValid(chatId)) {
        await db.collection('inbox').updateOne(
          { _id: new ObjectId(chatId), 'members.account_id': { $ne: String(staffAccountId) } },
          {
            $push: {
              members: {
                account_id: String(staffAccountId),
                role: 'admin',
                status: 'active',
                joined_at: new Date(),
              },
            },
            $set: { updated_at: new Date() },
          }
        );
      }
      const { Messages } = await getConversationByConvoId(chatId, {
        includeDeleted: Boolean(staffSession),
      });
      const activeMessages = (Messages || []).filter((message) => {
        const unsent = message.is_deleted || message.deleted_at || message.is_unsent;
        return !unsent || Boolean(staffSession);
      });
      const senderIds = [
        ...new Set(
          activeMessages
            .map((message) => String(message.sender_id || ''))
            .filter((senderId) =>
              /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(senderId)
            )
        ),
      ];
      const senderNames = new Map();
      if (senderIds.length) {
        const senderResult = await pool.query(
          `SELECT
             a.account_id,
             COALESCE(a.display_name, NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), a.handle, 'Unknown') AS sender_name
           FROM accounts a
           LEFT JOIN users u ON u.account_id = a.account_id
           WHERE a.account_id = ANY($1::uuid[])`,
          [senderIds]
        );
        senderResult.rows.forEach((sender) => {
          senderNames.set(String(sender.account_id), sender.sender_name);
        });
      }
      messages = activeMessages
        .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
        .map((message) => mapMongoTicketMessage(message, senderNames));
      if (db) {
        const inboxDoc = await db.collection('inbox').findOne(
          { _id: new ObjectId(chatId) },
          { projection: { members: 1, pending_invites: 1 } }
        );
        inboxMembers = inboxDoc?.members || [];
        pendingInviteRows = inboxDoc?.pending_invites || [];
      }
    }
  } catch (err) {
    console.error('Error loading ticket chat from MongoDB:', err.message);
    chatAvailable = false;
  }

  let participants = [];
  let involved = [];
  try {
    const people = await buildTicketPeople({
      requesterAccountId: row.account_id,
      members: inboxMembers,
      messages,
      includeEmail: Boolean(staffSession),
    });
    participants = people.participants;
    involved = people.involved;
  } catch (err) {
    console.error('Error loading ticket people:', err.message);
  }

  let pendingInvites = [];
  if (staffSession && pendingInviteRows.length) {
    const inviteIds = [...new Set(pendingInviteRows.map((invite) => String(invite.account_id || '')).filter((id) => TICKET_ACCOUNT_UUID.test(id)))];
    if (inviteIds.length) {
      const inviteResult = await pool.query(
        `SELECT
           a.account_id,
           a.handle,
           COALESCE(
             a.display_name,
             NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''),
             a.handle,
             'Unknown'
           ) AS name
         FROM accounts a
         LEFT JOIN users u ON u.account_id = a.account_id
         WHERE a.account_id = ANY($1::uuid[])`,
        [inviteIds]
      );
      const inviteNames = new Map(inviteResult.rows.map((row) => [String(row.account_id), row]));
      pendingInvites = inviteIds.map((accountId) => {
        const profile = inviteNames.get(accountId);
        return {
          accountId,
          name: profile?.name || 'Unknown',
          handle: profile?.handle || null,
        };
      });
    }
  }

  const catalog = await getTicketCatalog();
  const { buildTicketPermissions } = require('./TicketAssignmentHelpers');

  const lastPublic = [...messages].reverse().find((m) => !m.isInternal);
  const derivedAuthor =
    lastPublic?.authorType === 'staff' || lastPublic?.authorType === 'user'
      ? lastPublic.authorType
      : row.last_message_author_type;

  const ticket = mapTicketRow({
    ...row,
    message_count: messages.length || Number(row.message_count || 0),
    last_message_at: messages.length
      ? messages[messages.length - 1].createdAt
      : row.last_message_at,
    last_message_author_type: derivedAuthor,
  });
  const role = staff?.role || staffSession?.role || null;
  const showPayments = Boolean(staffSession) && canViewTicketPayments(role, ticket.type);
  const [timeline, articles, payments] = await Promise.all([
    staffSession ? listTicketTimeline(ticketId, row.account_id, row.created_at) : Promise.resolve([]),
    listTicketArticles(ticket.type),
    showPayments ? listTicketPaymentEvidence(row.account_id) : Promise.resolve(null),
  ]);

  return {
    ticket,
    messages,
    chatId,
    chatAvailable,
    types: catalog.types,
    statuses: catalog.statuses,
    priorities: catalog.priorities,
    typeDetails: catalog.typeDetails,
    escalateByRole: catalog.escalateByRole,
    escalateRoles: catalog.escalateRoles,
    permissions: buildTicketPermissions(row, staff, sessionStaffId(staffSession)),
    assignableQueue: normalizeQueueKey(queueKey),
    assignableStaff,
    timeline,
    articles,
    payments,
    formValues: mapFormAnswers(row.form_answers),
    submissionContext: mapSubmissionContext(row.submission_context),
    canAdjustCredits: Boolean(staffSession) && canAdjustTicketCredits(role, ticket.type),
    participants,
    involved,
    pendingInvites,
    canManageParticipants: Boolean(staffSession) && isStaffSession(staffSession),
    savedTranscript: await latestTicketTranscript(ticketId),
    autoClosesAt: ticketAutoClosesAt(ticket),
    scheduledCloseAt: row.scheduled_close_at || null,
    appealDecision: row.appeal_decision || null,
    appealDecidedAt: row.appeal_decided_at || null,
  };
}

async function latestTicketTranscript(ticketId) {
  try {
    const result = await pool.query(
      `SELECT metadata, created_at
       FROM ticket_events
       WHERE ticket_id = $1 AND event_type = 'transcript'
       ORDER BY created_at DESC
       LIMIT 1`,
      [ticketId]
    );
    const row = result.rows[0];
    let metadata = row?.metadata;
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
      } catch (error) {
        metadata = null;
      }
    }
    const text = metadata?.transcript;
    if (!text) return null;
    return { text: String(text), createdAt: row.created_at };
  } catch (error) {
    return null;
  }
}

function escapeTranscriptHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildTicketSummary(detail, staff, users, messages) {
  const ticket = detail.ticket || {};
  const opener = users.find((person) => person.isRequester) || users[0];
  const publicMessages = messages.filter((message) => !message.isInternal && String(message.authorType || '').toLowerCase() !== 'system');
  const first = publicMessages[0];
  const last = publicMessages[publicMessages.length - 1];
  const staffNames = staff.map((person) => person.name).filter(Boolean);
  const userNames = users.map((person) => person.name).filter(Boolean);
  const sentences = [];
  sentences.push(`${opener ? opener.name : 'A member'} opened ticket ${ticket.number || ''} about ${ticket.subject || 'a support request'}.`.replace(/\s+/g, ' ').trim());
  sentences.push(`Status: ${ticket.status || 'In Progress'}. Priority: ${ticket.priority || 'Medium'}.`);
  sentences.push(staffNames.length ? `Staff involved: ${staffNames.join(', ')}.` : 'No staff member is listed on this ticket.');
  sentences.push(userNames.length ? `Users involved: ${userNames.join(', ')}.` : 'No other users are listed on this ticket.');
  sentences.push(`${publicMessages.length} message${publicMessages.length === 1 ? '' : 's'} are in this transcript.`);
  if (first?.body) sentences.push(`It started with: ${String(first.body).replace(/\s+/g, ' ').trim().slice(0, 240)}`);
  if (last?.body && last !== first) sentences.push(`The latest reply from ${last.authorName || 'someone'} was: ${String(last.body).replace(/\s+/g, ' ').trim().slice(0, 240)}`);
  return sentences.join(' ');
}

function transcriptInitials(name) {
  const parts = String(name || '?').trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const letters = parts.map((part) => part[0]).join('').toUpperCase();
  return letters || '?';
}

function transcriptSpeaker(message) {
  if (message.isInternal) return { side: 'note', label: 'Internal note' };
  const type = String(message.authorType || message.messageType || '').toLowerCase();
  if (type === 'system') return { side: 'system', label: 'System' };
  if (type === 'staff' || message.isStaff) return { side: 'staff', label: 'Staff' };
  return { side: 'user', label: 'User' };
}

function formatTranscriptWhen(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function transcriptDayKey(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function transcriptReadableText(value) {
  const escaped = escapeTranscriptHtml(value);
  return escaped
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')
    .replace(/\n/g, '<br>');
}

function transcriptAttachmentName(file) {
  if (!file || typeof file !== 'object') return 'Attachment';
  return file.attachment_name || file.name || file.filename || 'Attachment';
}

function renderTicketTranscript(detail) {
  const people = (detail.participants || []).filter((person) => person.status === 'active' || person.isRequester);
  const staff = people.filter((person) => person.isStaff);
  const users = people.filter((person) => !person.isStaff);
  const messages = (detail.messages || []).filter((message) => !message.isUnsent);
  const ticket = detail.ticket || {};
  const summary = buildTicketSummary(detail, staff, users, messages);
  const byId = new Map(messages.map((message) => [String(message.id), message]));
  let lastDay = '';
  const thread = messages.map((message) => {
    const speaker = transcriptSpeaker(message);
    const name = message.authorName || 'Unknown';
    const when = formatTranscriptWhen(message.createdAt);
    const day = transcriptDayKey(message.createdAt);
    const dayBreak = day && day !== lastDay ? `<div class="day"><span>${escapeTranscriptHtml(day)}</span></div>` : '';
    if (day) lastDay = day;
    const body = message.body || (message.attachments?.length ? '' : '');
    const parent = message.replyToId ? byId.get(String(message.replyToId)) : null;
    const quote = parent
      ? `<blockquote><strong>${escapeTranscriptHtml(parent.authorName || 'Message')}</strong><span>${transcriptReadableText(String(parent.body || 'Attachment').replace(/\s+/g, ' ').trim().slice(0, 180))}</span></blockquote>`
      : '';
    const files = (message.attachments || []).map((file) => (
      `<li>${escapeTranscriptHtml(transcriptAttachmentName(file))}</li>`
    )).join('');
    const fileList = files ? `<ul class="files">${files}</ul>` : '';
    if (speaker.side === 'system') {
      return `${dayBreak}<p class="system"><span>System</span> ${transcriptReadableText(body || 'Update')}</p>`;
    }
    return `${dayBreak}<div class="row ${speaker.side}">
      <article class="bubble ${speaker.side}">
        <header>
          <span class="avatar" aria-hidden="true">${escapeTranscriptHtml(transcriptInitials(name))}</span>
          <span class="name">${escapeTranscriptHtml(name)}</span>
          <span class="chip">${speaker.label}</span>
          ${message.isEdited ? '<span class="chip quiet">Edited</span>' : ''}
          <time>${escapeTranscriptHtml(when)}</time>
        </header>
        ${quote}
        ${body ? `<p>${transcriptReadableText(body)}</p>` : ''}
        ${fileList}
      </article>
    </div>`;
  }).join('');
  const personCard = (person) => {
    const note = person.isRequester ? 'Opened the ticket' : person.isStaff ? 'Staff' : 'User';
    const handle = person.handle ? `@${person.handle}` : 'No handle';
    return `<article class="person">
      <span class="avatar" aria-hidden="true">${escapeTranscriptHtml(transcriptInitials(person.name))}</span>
      <div>
        <strong>${escapeTranscriptHtml(person.name || 'Unknown')}</strong>
        <p>${escapeTranscriptHtml(handle)} · ${escapeTranscriptHtml(note)}</p>
      </div>
    </article>`;
  };
  const summaryHtml = String(summary)
    .split(/(?<=\.)\s+/)
    .filter(Boolean)
    .map((sentence) => `<p>${escapeTranscriptHtml(sentence)}</p>`)
    .join('');
  const meta = [
    ticket.status,
    ticket.priority ? `${ticket.priority} priority` : '',
    ticket.type || '',
    `${messages.length} message${messages.length === 1 ? '' : 's'}`,
  ].filter(Boolean);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeTranscriptHtml(ticket.number || 'Ticket')} transcript</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #eef1f4; color: #1c1c1f; font: 15px/1.55 system-ui, sans-serif; }
    main { max-width: 820px; margin: 0 auto; padding: 28px 16px 72px; }
    header.ticket { margin-bottom: 18px; padding: 20px; background: #fff; border: 1px solid #e4e4e7; border-radius: 16px; }
    h1 { margin: 0 0 6px; font-size: 26px; letter-spacing: -0.02em; }
    .subject { margin: 0; color: #3f3f46; font-size: 16px; }
    .meta { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0 0; padding: 0; list-style: none; }
    .meta li { padding: 4px 8px; border-radius: 999px; background: #f4f4f5; color: #3f3f46; font-size: 12px; }
    .legend { display: flex; flex-wrap: wrap; gap: 10px; margin: 0 0 14px; color: #52525b; font-size: 12px; }
    .legend i { display: inline-block; width: 10px; height: 10px; margin-right: 6px; border-radius: 999px; vertical-align: -1px; }
    .legend .user { background: #fff; border: 1px solid #d4d4d8; }
    .legend .staff { background: #dbe7f6; }
    .legend .note { background: #f6e7c1; }
    .thread { display: flex; flex-direction: column; gap: 10px; }
    .day { display: flex; justify-content: center; margin: 8px 0; }
    .day span { padding: 4px 10px; border-radius: 999px; background: #fff; color: #71717a; font-size: 12px; }
    .row { display: flex; }
    .row.user { justify-content: flex-start; }
    .row.staff { justify-content: flex-end; }
    .row.note { justify-content: center; }
    .bubble { width: min(100%, 520px); padding: 12px 14px; border-radius: 16px; background: #fff; border: 1px solid #e4e4e7; }
    .bubble.staff { background: #e7f0fb; border-color: #c9daf0; }
    .bubble.note { width: min(100%, 640px); background: #fff8e8; border-color: #ead7a2; }
    .bubble header { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 8px; }
    .avatar { display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: 999px; background: #18181b; color: #fff; font-size: 11px; font-weight: 700; }
    .bubble.staff .avatar { background: #1d4f91; }
    .bubble.note .avatar { background: #8a5a12; }
    .name { font-weight: 650; }
    .chip { padding: 2px 7px; border-radius: 999px; background: rgba(0,0,0,0.06); font-size: 11px; }
    .chip.quiet { color: #71717a; }
    time { margin-left: auto; color: #71717a; font-size: 12px; }
    .bubble p { margin: 0; white-space: normal; overflow-wrap: anywhere; }
    blockquote { margin: 0 0 8px; padding: 8px 10px; border-left: 3px solid #a1a1aa; background: rgba(255,255,255,0.65); border-radius: 8px; color: #3f3f46; font-size: 13px; }
    blockquote strong { display: block; font-size: 12px; }
    .files { margin: 8px 0 0; padding-left: 18px; color: #3f3f46; font-size: 13px; }
    .system { align-self: center; max-width: 640px; margin: 0; padding: 8px 12px; border-radius: 999px; background: #fff; color: #52525b; text-align: center; font-size: 13px; }
    .system span { margin-right: 6px; font-weight: 650; }
    a { color: #1d4f91; }
    .end { margin-top: 28px; padding: 18px; background: #fff; border: 1px solid #e4e4e7; border-radius: 16px; }
    .end h2 { margin: 18px 0 8px; font-size: 18px; }
    .end h2:first-child { margin-top: 0; }
    .people { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; }
    .person { display: flex; gap: 10px; align-items: center; padding: 10px; border: 1px solid #e4e4e7; border-radius: 12px; }
    .person p { margin: 2px 0 0; color: #52525b; font-size: 13px; }
    .summary p { margin: 0 0 8px; }
    @media print {
      body { background: #fff; }
      .bubble, .person, header.ticket, .end { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <main>
    <header class="ticket">
      <h1>${escapeTranscriptHtml(ticket.number || 'Ticket')}</h1>
      <p class="subject">${escapeTranscriptHtml(ticket.subject || 'Support ticket')}</p>
      <ul class="meta">${meta.map((item) => `<li>${escapeTranscriptHtml(item)}</li>`).join('')}</ul>
    </header>
    <p class="legend"><span><i class="user"></i>User</span><span><i class="staff"></i>Staff</span><span><i class="note"></i>Internal note</span></p>
    <section class="thread">
      ${thread || '<p class="system">No messages.</p>'}
    </section>
    <section class="end">
      <h2>People involved</h2>
      <h3>Staff</h3>
      <div class="people">${staff.length ? staff.map(personCard).join('') : '<p>None</p>'}</div>
      <h3>Users</h3>
      <div class="people">${users.length ? users.map(personCard).join('') : '<p>None</p>'}</div>
      <h2>Summary</h2>
      <div class="summary">${summaryHtml}</div>
    </section>
  </main>
</body>
</html>`;
}

async function saveTicketCloseTranscript(ticketId, { reason = 'closed', actorStaffId = null, actorAccountId = null } = {}) {
  try {
    const detail = await getTicketDetail(ticketId);
    if (!detail) return null;
    const transcript = renderTicketTranscript(detail);
    await recordTicketEvent({
      ticketId,
      eventType: 'transcript',
      summary: reason === 'auto'
        ? 'Auto-closed the ticket and saved the transcript'
        : reason === 'manual'
          ? 'Saved a transcript of this ticket'
          : 'Saved the transcript when the ticket closed',
      actorStaffId,
      actorAccountId,
      metadata: { transcript, reason },
    });
    return transcript;
  } catch (error) {
    console.error('Ticket transcript was not saved:', error.message);
    return null;
  }
}

const TICKET_AUTO_CLOSE_MS = 7 * 24 * 60 * 60 * 1000;

function ticketAutoClosesAt(ticket) {
  if (!ticket || isClosedStatus(ticket.status)) return null;
  const last = ticket.lastMessageAt || ticket.createdAt;
  if (!last) return null;
  return new Date(new Date(last).getTime() + TICKET_AUTO_CLOSE_MS).toISOString();
}

async function notifyTicketClosed({ ticketId, ticketNumber, requesterAccountId, reason, staffSession }) {
  const chatId = await getTicketChatId(ticketId);
  const appealCopy = {
    appeal_accepted: {
      body: 'This appeal is accepted. The penalty ends in 24 hours, and this ticket is now closed.',
      message: `Your appeal on ticket #${ticketNumber} was accepted. The penalty ends in 24 hours.`,
    },
    appeal_denied: {
      body: 'This appeal is denied. This ticket is closed. You can submit another appeal in 12 months.',
      message: `Your appeal on ticket #${ticketNumber} was denied. You can appeal again in 12 months.`,
    },
    appeal_denied_permanent: {
      body: 'This appeal is denied permanently. This ticket is closed, and this account cannot submit another appeal.',
      message: `Your appeal on ticket #${ticketNumber} was denied permanently. This account cannot submit another appeal.`,
    },
  }[reason];
  const body = appealCopy?.body
    || (reason === 'auto'
      ? 'This ticket was closed automatically after 7 days without a reply. A transcript was saved.'
      : reason === 'scheduled'
        ? 'This ticket is now closed at the time staff scheduled. A transcript was saved.'
        : 'This ticket was closed. A transcript was saved.');
  if (chatId) {
    await writeTicketMembershipNote(chatId, staffSession || {}, body);
  }
  const inbox = chatId ? await loadTicketInbox(chatId) : null;
  const recipients = new Set();
  if (requesterAccountId) recipients.add(String(requesterAccountId));
  for (const member of inbox?.members || []) {
    if (!ticketMemberIsActive(member)) continue;
    if (['admin', 'staff', 'moderator'].includes(String(member.role || '').toLowerCase())) continue;
    recipients.add(String(member.account_id));
  }
  const actorId = sessionAccountId(staffSession);
  if (actorId) recipients.delete(String(actorId));
  const message = appealCopy?.message
    || (reason === 'auto'
      ? `Your ticket #${ticketNumber} was closed after 7 days without a reply. Open it to read the transcript.`
      : reason === 'scheduled'
        ? `Your ticket #${ticketNumber} is now closed. Open it to read the transcript.`
        : `Your ticket #${ticketNumber} is closed. Open it to read the transcript.`);
  const referencePath = chatId ? `/inbox/direct?conversation=${chatId}` : '/notifications';
  await Promise.all([...recipients].map(async (accountId) => {
    try {
      const notification = await createNotificationServices({
        account_id: accountId,
        message,
        is_read: false,
        reference_table: 'tickets',
        reference_prefix: 'TICKET_CLOSED',
        reference_path: referencePath,
        reference_id: String(ticketId),
      });
      const { getIo } = require('../lib/WebSocket');
      const io = getIo();
      if (io && notification) io.to(accountId).emit('notification', notification);
    } catch (error) {
      console.error('Ticket close notification failed:', error.message);
    }
  }));
}

async function generateTicketTranscript(ticketId, staffSession) {
  if (!isStaffSession(staffSession)) throw ticketError('Only staff can generate a transcript', 403);
  const existing = await pool.query(
    `SELECT ticket_id FROM tickets WHERE ticket_id = $1 AND deleted_at IS NULL`,
    [ticketId]
  );
  if (!existing.rows.length) return null;
  const staff = await resolveDisputeStaffId(staffSession);
  await saveTicketCloseTranscript(ticketId, {
    reason: 'manual',
    actorStaffId: staff?.staff_id || null,
    actorAccountId: sessionAccountId(staffSession),
  });
  return getTicketDetail(ticketId, staffSession);
}

async function autoCloseInactiveTickets() {
  const result = await pool.query(
    `SELECT ticket_id, account_id, ticket_number
     FROM tickets
     WHERE deleted_at IS NULL
       AND status NOT IN ('Closed', 'Resolved')
       AND COALESCE(last_message_at, created_at) < NOW() - INTERVAL '7 days'
     ORDER BY COALESCE(last_message_at, created_at) ASC
     LIMIT 25`
  );
  let closed = 0;
  for (const row of result.rows) {
    const updated = await pool.query(
      `UPDATE tickets
       SET status = 'Closed',
           resolved_at = COALESCE(resolved_at, NOW()),
           updated_at = NOW()
       WHERE ticket_id = $1
         AND deleted_at IS NULL
         AND status NOT IN ('Closed', 'Resolved')
       RETURNING ticket_id`,
      [row.ticket_id]
    );
    if (!updated.rows.length) continue;
    await pool.query(
      `UPDATE tickets SET scheduled_close_at = NULL WHERE ticket_id = $1`,
      [row.ticket_id]
    ).catch((error) => {
      if (error?.code !== '42703') throw error;
    });
    await recordTicketEvent({
      ticketId: row.ticket_id,
      eventType: 'status',
      summary: 'Auto-closed after 7 days without activity',
    });
    await saveTicketCloseTranscript(row.ticket_id, { reason: 'auto' });
    await notifyTicketClosed({
      ticketId: row.ticket_id,
      ticketNumber: row.ticket_number,
      requesterAccountId: row.account_id,
      reason: 'auto',
      staffSession: null,
    });
    closed += 1;
  }
  return { closed };
}

const TICKET_SCHEDULE_MIN_MS = 5 * 60 * 1000;
const TICKET_SCHEDULE_MAX_MS = 90 * 24 * 60 * 60 * 1000;

function describeCloseDelay(closesAt) {
  const minutes = Math.max(1, Math.round((new Date(closesAt).getTime() - Date.now()) / 60000));
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.floor(minutes / 60);
  const remain = minutes % 60;
  if (hours < 48) {
    if (!remain) return `${hours} hour${hours === 1 ? '' : 's'}`;
    return `${hours} hour${hours === 1 ? '' : 's'} ${remain} minute${remain === 1 ? '' : 's'}`;
  }
  const days = Math.max(1, Math.round(minutes / (60 * 24)));
  return `${days} day${days === 1 ? '' : 's'}`;
}

function parseScheduledCloseAt(value) {
  const closesAt = new Date(value);
  if (!value || Number.isNaN(closesAt.getTime())) throw ticketError('Choose when this ticket should close', 400);
  const delta = closesAt.getTime() - Date.now();
  if (delta < TICKET_SCHEDULE_MIN_MS) throw ticketError('Choose a time at least 5 minutes from now', 400);
  if (delta > TICKET_SCHEDULE_MAX_MS) throw ticketError('Choose a time within 90 days', 400);
  return closesAt;
}

async function scheduleTicketClose(ticketId, staffSession, closesAtInput) {
  if (!isStaffSession(staffSession)) throw ticketError('Only staff can schedule a close', 403);
  const closesAt = parseScheduledCloseAt(closesAtInput);
  const existing = await pool.query(
    `SELECT ticket_id, status, ticket_number, account_id
     FROM tickets
     WHERE ticket_id = $1 AND deleted_at IS NULL`,
    [ticketId]
  );
  if (!existing.rows.length) return null;
  const row = existing.rows[0];
  if (isClosedStatus(row.status)) throw ticketError('This ticket is already closed', 400);
  try {
    await pool.query(
      `UPDATE tickets
       SET scheduled_close_at = $2, updated_at = NOW()
       WHERE ticket_id = $1 AND deleted_at IS NULL`,
      [ticketId, closesAt]
    );
  } catch (error) {
    if (error?.code === '42703') throw ticketError('Run the latest database migration, then try again', 503);
    throw error;
  }
  const name = sessionDisplayName(staffSession) || 'Staff';
  const delay = describeCloseDelay(closesAt);
  await recordTicketEvent({
    ticketId,
    eventType: 'status',
    summary: `${name} scheduled this ticket to close in ${delay}`,
    actorStaffId: (await resolveDisputeStaffId(staffSession))?.staff_id || null,
    actorAccountId: sessionAccountId(staffSession),
  });
  await announceInTicketChat({
    ticketId,
    ticket: row,
    staffSession,
    body: `${name} set this ticket to close in ${delay}. You will be notified again when it closes.`,
    prefix: 'TICKET_CLOSE_SCHEDULED',
  });
  return getTicketDetail(ticketId, staffSession);
}

async function cancelScheduledTicketClose(ticketId, staffSession) {
  if (!isStaffSession(staffSession)) throw ticketError('Only staff can cancel a scheduled close', 403);
  const existing = await pool.query(
    `SELECT ticket_id, status, ticket_number, account_id, scheduled_close_at
     FROM tickets
     WHERE ticket_id = $1 AND deleted_at IS NULL`,
    [ticketId]
  ).catch((error) => {
    if (error?.code === '42703') throw ticketError('Run the latest database migration, then try again', 503);
    throw error;
  });
  if (!existing.rows.length) return null;
  const row = existing.rows[0];
  if (!row.scheduled_close_at) throw ticketError('This ticket is not scheduled to close', 400);
  await pool.query(
    `UPDATE tickets SET scheduled_close_at = NULL, updated_at = NOW() WHERE ticket_id = $1`,
    [ticketId]
  );
  const name = sessionDisplayName(staffSession) || 'Staff';
  await recordTicketEvent({
    ticketId,
    eventType: 'status',
    summary: `${name} cancelled the scheduled close`,
    actorStaffId: (await resolveDisputeStaffId(staffSession))?.staff_id || null,
    actorAccountId: sessionAccountId(staffSession),
  });
  await announceInTicketChat({
    ticketId,
    ticket: row,
    staffSession,
    body: `${name} cancelled the scheduled close. This ticket stays open.`,
    prefix: 'TICKET_CLOSE_SCHEDULED',
  });
  return getTicketDetail(ticketId, staffSession);
}

async function closeScheduledTickets() {
  let result;
  try {
    result = await pool.query(
      `SELECT ticket_id, account_id, ticket_number
       FROM tickets
       WHERE deleted_at IS NULL
         AND scheduled_close_at IS NOT NULL
         AND scheduled_close_at <= NOW()
         AND status NOT IN ('Closed', 'Resolved')
       ORDER BY scheduled_close_at ASC
       LIMIT 25`
    );
  } catch (error) {
    if (error?.code === '42703') return { closed: 0 };
    throw error;
  }
  let closed = 0;
  for (const row of result.rows) {
    const updated = await pool.query(
      `UPDATE tickets
       SET status = 'Closed',
           scheduled_close_at = NULL,
           resolved_at = COALESCE(resolved_at, NOW()),
           updated_at = NOW()
       WHERE ticket_id = $1
         AND deleted_at IS NULL
         AND scheduled_close_at IS NOT NULL
         AND scheduled_close_at <= NOW()
         AND status NOT IN ('Closed', 'Resolved')
       RETURNING ticket_id`,
      [row.ticket_id]
    );
    if (!updated.rows.length) continue;
    await recordTicketEvent({
      ticketId: row.ticket_id,
      eventType: 'status',
      summary: 'Closed at the time staff scheduled',
    });
    await saveTicketCloseTranscript(row.ticket_id, { reason: 'scheduled' });
    await notifyTicketClosed({
      ticketId: row.ticket_id,
      ticketNumber: row.ticket_number,
      requesterAccountId: row.account_id,
      reason: 'scheduled',
      staffSession: null,
    });
    closed += 1;
  }
  return { closed };
}

async function saveTicketInvite(chatId, invite) {
  const db = mongoDb();
  if (!db || !ObjectId.isValid(chatId)) throw ticketError('Ticket chat is unavailable', 503);
  const now = new Date();
  await db.collection('inbox').updateOne(
    { _id: new ObjectId(chatId) },
    { $pull: { pending_invites: { account_id: String(invite.account_id) } } }
  );
  await db.collection('inbox').updateOne(
    { _id: new ObjectId(chatId) },
    { $push: { pending_invites: { ...invite, invited_at: now } }, $set: { updated_at: now } }
  );
}

async function clearTicketInvite(chatId, accountId) {
  const db = mongoDb();
  if (!db || !ObjectId.isValid(chatId)) return;
  await db.collection('inbox').updateOne(
    { _id: new ObjectId(chatId) },
    {
      $pull: { pending_invites: { account_id: String(accountId) } },
      $set: { updated_at: new Date() },
    }
  );
}

async function notifyTicketInvite(accountId, message, ticketId) {
  try {
    const notification = await createNotificationServices({
      account_id: String(accountId),
      message,
      is_read: false,
      reference_table: 'tickets',
      reference_prefix: 'TICKET_INVITE',
      reference_path: '/notifications',
      reference_id: String(ticketId),
    });
    const { getIo } = require('../lib/WebSocket');
    const io = getIo();
    if (io && notification) io.to(String(accountId)).emit('notification', notification);
  } catch (error) {
    console.error('Error notifying ticket invite:', error.message);
  }
}

async function notifyTicketParticipant(accountId, message, prefix, ticketId, chatId) {
  try {
    const notification = await createNotificationServices({
      account_id: String(accountId),
      message,
      is_read: false,
      reference_table: 'inbox',
      reference_prefix: prefix,
      reference_path: chatId ? `/inbox/direct?conversation=${chatId}` : `/tickets/${ticketId}`,
      reference_id: randomUUID(),
    });
    const { getIo } = require('../lib/WebSocket');
    const io = getIo();
    if (io && notification) io.to(String(accountId)).emit('notification', notification);
  } catch (error) {
    console.error('Error notifying ticket participant:', error.message);
  }
}

async function lookupAccountIdentity(accountId) {
  const result = await pool.query(
    `SELECT
       a.handle,
       COALESCE(
         a.display_name,
         NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''),
         NULLIF(TRIM(CONCAT(s.first_name, ' ', s.last_name)), ''),
         a.handle,
         'Someone'
       ) AS name
     FROM accounts a
     LEFT JOIN users u ON u.account_id = a.account_id
     LEFT JOIN staff s ON s.account_id = a.account_id
     WHERE a.account_id = $1`,
    [accountId]
  );
  return result.rows[0] || { name: 'Someone', handle: null };
}

function formatAccountIdentity(identity) {
  const name = identity?.name || 'Someone';
  return identity?.handle ? `${name} (@${identity.handle})` : name;
}

async function lookupStaffCard(staffId) {
  if (!staffId) return null;
  const result = await pool.query(
    `SELECT
       s.role,
       a.handle,
       COALESCE(
         a.display_name,
         NULLIF(TRIM(CONCAT(s.first_name, ' ', s.last_name)), ''),
         'Staff'
       ) AS name
     FROM staff s
     LEFT JOIN accounts a ON a.account_id = s.account_id
     WHERE s.staff_id = $1`,
    [staffId]
  );
  return result.rows[0] || null;
}

function formatStaffIdentity(card) {
  const name = card?.name || 'A staff member';
  const handle = card?.handle ? ` (@${card.handle})` : '';
  const role = card?.role ? ` (${card.role})` : '';
  return `${name}${handle}${role}`;
}

async function actingStaffIdentity(staffSession) {
  const staffId = (await resolveDisputeStaffId(staffSession))?.staff_id || null;
  const card = await lookupStaffCard(staffId);
  if (card) return { staffId, label: formatStaffIdentity(card) };
  return {
    staffId,
    label: sessionDisplayName(staffSession) || 'A staff member',
  };
}

async function announceInTicketChat({
  ticketId,
  ticket,
  staffSession,
  body,
  prefix,
  extraAccountIds = [],
  skipMessage = false,
}) {
  const chatId = await ensureTicketChat(ticketId, ticket);
  if (!skipMessage) await writeTicketMembershipNote(chatId, staffSession, body);
  const inbox = await loadTicketInbox(chatId);
  const actorId = sessionAccountId(staffSession);
  const recipients = new Set(extraAccountIds.filter(Boolean).map(String));
  if (ticket?.account_id) recipients.add(String(ticket.account_id));
  for (const member of inbox?.members || []) {
    if (!ticketMemberIsActive(member)) continue;
    if (['admin', 'staff', 'moderator'].includes(String(member.role || '').toLowerCase())) continue;
    recipients.add(String(member.account_id));
  }
  if (actorId) recipients.delete(String(actorId));
  await Promise.all(
    [...recipients].map((accountId) => notifyTicketParticipant(accountId, body, prefix, ticketId, chatId))
  );
}

async function announceTicketAssignment(ticketId, staffId, staffSession) {
  try {
    const ticketResult = await pool.query(
      `SELECT * FROM tickets WHERE ticket_id = $1 AND deleted_at IS NULL`,
      [ticketId]
    );
    if (!ticketResult.rows.length || !staffId) return;
    const card = await lookupStaffCard(staffId);
    const body = `${formatStaffIdentity(card)} has been assigned to this ticket.`;
    await announceInTicketChat({
      ticketId,
      ticket: ticketResult.rows[0],
      staffSession,
      body,
      prefix: 'TICKET_HANDLER_ASSIGNED',
    });
  } catch (error) {
    console.error('Error announcing ticket assignment:', error.message);
  }
}

function escapeTicketSearch(value) {
  return String(value || '').replace(/[\\%_]/g, '\\$&');
}

async function searchTicketParticipants(rawQuery) {
  const query = String(rawQuery || '').replace(/^@/, '').trim();
  if (query.length < 2) return [];
  if (query.length > 80) throw ticketError('Search is too long', 400);
  const escaped = escapeTicketSearch(query);
  const result = await pool.query(
    `SELECT
       a.account_id,
       a.handle,
       a.status,
       COALESCE(
         a.display_name,
         NULLIF(TRIM(CONCAT(COALESCE(u.first_name, s.first_name, ''), ' ', COALESCE(u.last_name, s.last_name, ''))), ''),
         a.handle
       ) AS name,
       s.staff_id,
       s.role AS staff_role,
       COALESCE(u.email_address, s.email_address) AS email
     FROM accounts a
     LEFT JOIN users u ON u.account_id = a.account_id
     LEFT JOIN staff s ON s.account_id = a.account_id
     WHERE a.deleted_at IS NULL
       AND (u.account_id IS NOT NULL OR s.staff_id IS NOT NULL)
       AND LOWER(COALESCE(a.status, '')) NOT IN ('deleted', 'inactive', 'deactivated')
       AND (
         LOWER(a.handle) LIKE '%' || LOWER($1) || '%' ESCAPE '\\'
         OR LOWER(COALESCE(a.display_name, '')) LIKE '%' || LOWER($1) || '%' ESCAPE '\\'
         OR LOWER(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')))) LIKE '%' || LOWER($1) || '%' ESCAPE '\\'
         OR LOWER(TRIM(CONCAT(COALESCE(s.first_name, ''), ' ', COALESCE(s.last_name, '')))) LIKE '%' || LOWER($1) || '%' ESCAPE '\\'
         OR LOWER(COALESCE(u.email_address, '')) LIKE '%' || LOWER($1) || '%' ESCAPE '\\'
         OR LOWER(COALESCE(s.email_address, '')) LIKE '%' || LOWER($1) || '%' ESCAPE '\\'
       )
     ORDER BY
       CASE
         WHEN LOWER(a.handle) = LOWER($2) THEN 0
         WHEN LOWER(COALESCE(u.email_address, s.email_address, '')) = LOWER($2) THEN 0
         WHEN LOWER(a.handle) LIKE (LOWER($1) || '%') ESCAPE '\\' THEN 1
         ELSE 2
       END,
       name ASC
     LIMIT 8`,
    [escaped, query]
  );
  return result.rows.map((row) => ({
    accountId: String(row.account_id),
    name: row.name || 'Unknown',
    handle: row.handle || null,
    email: row.email || null,
    kind: row.staff_id ? 'staff' : 'user',
    role: row.staff_id ? (row.staff_role || 'Staff') : 'User',
  }));
}

async function findTicketParticipantAccount(accountId) {
  const result = await pool.query(
    `SELECT
       a.account_id,
       a.handle,
       a.deleted_at,
       a.status,
       COALESCE(
         a.display_name,
         NULLIF(TRIM(CONCAT(COALESCE(u.first_name, s.first_name, ''), ' ', COALESCE(u.last_name, s.last_name, ''))), ''),
         a.handle,
         'Someone'
       ) AS name,
       u.user_id,
       s.staff_id,
       s.role AS staff_role
     FROM accounts a
     LEFT JOIN users u ON u.account_id = a.account_id
     LEFT JOIN staff s ON s.account_id = a.account_id
     WHERE a.account_id = $1`,
    [accountId]
  );
  return result.rows[0] || null;
}

async function addTicketParticipant(ticketId, rawAccountId, staffSession) {
  if (!isStaffSession(staffSession)) {
    throw ticketError('Only staff can add someone to a ticket', 403);
  }
  const accountId = String(rawAccountId || '').trim();
  if (!TICKET_ACCOUNT_UUID.test(accountId)) {
    throw ticketError('Choose someone from the search results', 400);
  }
  const ticketResult = await pool.query(
    `SELECT * FROM tickets WHERE ticket_id = $1 AND deleted_at IS NULL`,
    [ticketId]
  );
  if (!ticketResult.rows.length) return null;

  const person = await findTicketParticipantAccount(accountId);
  if (!person || person.deleted_at || (!person.user_id && !person.staff_id)) {
    throw ticketError('Choose a moderator or a member account', 404);
  }
  const status = String(person.status || 'active').toLowerCase();
  if (status && status !== 'active') {
    throw ticketError('That account cannot be added to a ticket', 400);
  }

  const ticket = ticketResult.rows[0];
  const chatId = await ensureTicketChat(ticketId, ticket);
  const inbox = await loadTicketInbox(chatId);
  const existing = (inbox?.members || []).find((member) => String(member.account_id) === accountId);
  if (ticketMemberIsActive(existing)) {
    throw ticketError('That person is already on this ticket', 409);
  }

  const actor = await actingStaffIdentity(staffSession);
  const personName = person.staff_id
    ? formatStaffIdentity({ name: person.name, handle: person.handle, role: person.staff_role })
    : formatAccountIdentity(person);

  if (!person.staff_id) {
    const alreadyInvited = (inbox?.pending_invites || []).some((invite) => String(invite.account_id) === accountId);
    if (alreadyInvited) throw ticketError('That person already has an invite waiting', 409);
    await saveTicketInvite(chatId, {
      account_id: accountId,
      invited_by: sessionAccountId(staffSession),
    });
    const inviteMessage = `${actor.label} invited you to ticket #${ticket.ticket_number}. Accept the invite before you can open it.`;
    await notifyTicketInvite(accountId, inviteMessage, ticketId);
    await recordTicketEvent({
      ticketId,
      eventType: 'participant_invite',
      summary: `${actor.label} invited ${personName} to this ticket.`,
      actorStaffId: actor.staffId,
      actorAccountId: sessionAccountId(staffSession),
      metadata: { accountId },
    });
    const detail = await getTicketDetail(ticketId, staffSession);
    return detail ? { ...detail, invitePending: true } : null;
  }

  const memberRole = 'admin';
  await upsertTicketMember(chatId, accountId, memberRole, 'active');
  const body = `${actor.label} added ${personName} to this ticket.`;
  await announceInTicketChat({
    ticketId,
    ticket,
    staffSession,
    body,
    prefix: 'TICKET_PARTICIPANT_ADDED',
    extraAccountIds: [accountId],
  });
  await recordTicketEvent({
    ticketId,
    eventType: 'participant_add',
    summary: body,
    actorStaffId: actor.staffId,
    actorAccountId: sessionAccountId(staffSession),
    metadata: { accountId },
  });
  const detail = await getTicketDetail(ticketId, staffSession);
  return detail ? { ...detail, invitePending: false } : null;
}

async function respondTicketInvite(ticketId, rawAccountId, action) {
  const accountId = String(rawAccountId || '').trim();
  if (!TICKET_ACCOUNT_UUID.test(accountId)) throw ticketError('Authentication required', 401);
  const decision = String(action || '').trim().toLowerCase();
  if (!['accept', 'decline'].includes(decision)) throw ticketError('Choose accept or decline', 400);

  const ticketResult = await pool.query(
    `SELECT * FROM tickets WHERE ticket_id = $1 AND deleted_at IS NULL`,
    [ticketId]
  );
  if (!ticketResult.rows.length) return null;
  const ticket = ticketResult.rows[0];
  const chatId = await ensureTicketChat(ticketId, ticket);
  const inbox = await loadTicketInbox(chatId);
  const pending = (inbox?.pending_invites || []).some((invite) => String(invite.account_id) === accountId);
  const member = (inbox?.members || []).find((item) => String(item.account_id) === accountId);

  if (decision === 'decline') {
    if (!pending) throw ticketError('This invite is no longer available', 404);
    await clearTicketInvite(chatId, accountId);
    emitTicketChat('ticketMembershipUpdated', chatId, {
      conversation_id: String(chatId),
      account_id: accountId,
      status: 'declined',
    });
    return { chatId: null, joined: false };
  }

  if (ticketMemberIsActive(member)) {
    await clearTicketInvite(chatId, accountId);
    return { chatId, joined: true };
  }
  if (!pending) throw ticketError('This invite is no longer available', 404);

  await upsertTicketMember(chatId, accountId, 'member', 'active');
  await clearTicketInvite(chatId, accountId);
  const person = await lookupAccountIdentity(accountId);
  await writeTicketMembershipNote(
    chatId,
    { account_id: accountId, accountId },
    `${formatAccountIdentity(person)} joined this ticket.`
  );
  emitTicketChat('ticketMembershipUpdated', chatId, {
    conversation_id: String(chatId),
    account_id: accountId,
    status: 'active',
  });
  return { chatId, joined: true };
}

async function removeTicketParticipant(ticketId, rawAccountId, staffSession) {
  if (!isStaffSession(staffSession)) {
    throw ticketError('Only staff can remove someone from a ticket', 403);
  }
  const accountId = String(rawAccountId || '').trim();
  if (!TICKET_ACCOUNT_UUID.test(accountId)) {
    throw ticketError('Choose a user to remove', 400);
  }
  const ticketResult = await pool.query(
    `SELECT * FROM tickets WHERE ticket_id = $1 AND deleted_at IS NULL`,
    [ticketId]
  );
  if (!ticketResult.rows.length) return null;
  const ticket = ticketResult.rows[0];
  if (String(ticket.account_id) === accountId) {
    throw ticketError('The person who opened the ticket stays on it', 400);
  }
  if (ticket.handled_by_staff_id) {
    const assignee = await pool.query(
      `SELECT account_id FROM staff WHERE staff_id = $1`,
      [ticket.handled_by_staff_id]
    );
    if (assignee.rows[0] && String(assignee.rows[0].account_id) === accountId) {
      throw ticketError('The assigned staff member stays on this ticket', 400);
    }
  }

  const chatId = await getTicketChatId(ticketId);
  const inbox = chatId ? await loadTicketInbox(chatId) : null;
  const existing = (inbox?.members || []).find((member) => String(member.account_id) === accountId);
  const pending = (inbox?.pending_invites || []).some((invite) => String(invite.account_id) === accountId);
  if (!ticketMemberIsActive(existing) && pending && chatId) {
    await clearTicketInvite(chatId, accountId);
    const actor = await actingStaffIdentity(staffSession);
    const personName = formatAccountIdentity(await lookupAccountIdentity(accountId));
    await recordTicketEvent({
      ticketId,
      eventType: 'participant_invite_cancel',
      summary: `${actor.label} cancelled the invite for ${personName}.`,
      actorStaffId: actor.staffId,
      actorAccountId: sessionAccountId(staffSession),
      metadata: { accountId },
    });
    return getTicketDetail(ticketId, staffSession);
  }
  if (!ticketMemberIsActive(existing)) {
    throw ticketError('That person is not on this ticket', 404);
  }

  const actor = await actingStaffIdentity(staffSession);
  const personName = formatAccountIdentity(await lookupAccountIdentity(accountId));
  const body = `${actor.label} removed ${personName} from this ticket.`;
  await writeTicketMembershipNote(chatId, staffSession, body);
  await upsertTicketMember(chatId, accountId, existing.role || 'member', 'removed');
  await announceInTicketChat({
    ticketId,
    ticket,
    staffSession,
    body,
    prefix: 'TICKET_PARTICIPANT_REMOVED',
    extraAccountIds: [accountId],
    skipMessage: true,
  });
  await recordTicketEvent({
    ticketId,
    eventType: 'participant_remove',
    summary: body,
    actorStaffId: actor.staffId,
    actorAccountId: sessionAccountId(staffSession),
    metadata: { accountId },
  });
  return getTicketDetail(ticketId, staffSession);
}

async function applyTicketAssignmentAction(ticketId, patch, staffSession) {
  const { buildTicketPermissions } = require('./TicketAssignmentHelpers');
  const action = String(patch.action || '').trim();
  if (!action) return null;

  const staff = await resolveDisputeStaffId(staffSession);
  if (!staff) throw new Error('Could not match your login to a staff profile.');

  const fresh = await pool.query(
    `SELECT handled_by_staff_id, status FROM tickets WHERE ticket_id = $1 AND deleted_at IS NULL`,
    [ticketId]
  );
  if (!fresh.rows.length) return null;
  const row = fresh.rows[0];
  const perms = buildTicketPermissions(row, staff, sessionStaffId(staffSession));

  if (action === 'self_assign') {
    if (isClosedStatus(row.status)) {
      throw ticketError('Open this ticket before claiming it.', 400);
    }
    if (!perms.canAssignMyself && !perms.canSelfAssign) {
      throw new Error('You cannot assign this ticket to yourself.');
    }
    if (row.handled_by_staff_id && !perms.isAdmin) {
      throw new Error('This ticket already has a handler. They must release the case first.');
    }
    await pool.query(
      `UPDATE tickets
       SET handled_by_staff_id = $1,
           status = CASE WHEN status = 'Open' THEN 'In Progress' ELSE status END,
           updated_at = NOW()
       WHERE ticket_id = $2 AND deleted_at IS NULL`,
      [staff.staff_id, ticketId]
    );
    if (normalizeTicketStatus(row.status) === 'Open') {
      await recordTicketEvent({
        ticketId,
        eventType: 'status',
        summary: 'Status changed from Open to In Progress',
        actorStaffId: staff.staff_id,
      });
    }
    await recordTicketEvent({
      ticketId,
      eventType: 'assign',
      summary: 'Assigned the ticket to themselves',
      actorStaffId: staff.staff_id,
    });
    await announceTicketAssignment(ticketId, staff.staff_id, staffSession);
    return getTicketDetail(ticketId, staffSession);
  }

  if (action === 'release' || action === 'self_unassign') {
    if (!perms.canRelease && !perms.isAssignee) {
      throw new Error('Only the current handler can release this case.');
    }
    const releaseSql = perms.isAdmin && !perms.isAssignee
      ? `UPDATE tickets
         SET handled_by_staff_id = NULL,
             status = CASE WHEN status = 'In Progress' THEN 'Open' ELSE status END,
             updated_at = NOW()
         WHERE ticket_id = $1 AND deleted_at IS NULL`
      : `UPDATE tickets
         SET handled_by_staff_id = NULL,
             status = CASE WHEN status = 'In Progress' THEN 'Open' ELSE status END,
             updated_at = NOW()
         WHERE ticket_id = $1 AND deleted_at IS NULL AND handled_by_staff_id = $2`;
    const releaseParams = perms.isAdmin && !perms.isAssignee ? [ticketId] : [ticketId, staff.staff_id];
    await pool.query(releaseSql, releaseParams);
    if (normalizeTicketStatus(row.status) === 'In Progress') {
      await recordTicketEvent({
        ticketId,
        eventType: 'status',
        summary: 'Status changed from In Progress to Open',
        actorStaffId: staff.staff_id,
      });
    }
    await recordTicketEvent({
      ticketId,
      eventType: 'release',
      summary: 'Released the ticket',
      actorStaffId: staff.staff_id,
    });
    return getTicketDetail(ticketId, staffSession);
  }

  throw new Error(`Unknown ticket action: ${action}`);
}

async function updateTicket(ticketId, patch, staffSession) {
  if (patch?.action) {
    return applyTicketAssignmentAction(ticketId, patch, staffSession);
  }

  const sets = [];
  const values = [];
  let idx = 1;

  // Normalize aliases onto the tickets schema.
  if (patch.assigned_staff_id !== undefined && patch.handled_by_staff_id === undefined) {
    patch.handled_by_staff_id = patch.assigned_staff_id;
  }
  if (patch.category !== undefined && patch.type === undefined) {
    patch.type = patch.category;
  }

  const currentRow = await pool.query(
    `SELECT handled_by_staff_id, status, type, account_id, ticket_number FROM tickets WHERE ticket_id = $1 AND deleted_at IS NULL`,
    [ticketId]
  );
  if (!currentRow.rows.length) return null;
  const currentTicket = currentRow.rows[0];
  const currentAssignee = currentTicket.handled_by_staff_id;
  const currentStatus = currentTicket.status;
  const { buildTicketPermissions } = require('./TicketAssignmentHelpers');
  const staff = await resolveDisputeStaffId(staffSession);
  const ticketPerms = buildTicketPermissions(
    currentTicket,
    staff,
    sessionStaffId(staffSession)
  );

  if (patch.assigned_role) {
    const catalog = await getTicketCatalog();
    const allowed =
      catalog.escalateByRole?.[patch.assigned_role] ||
      ROLE_TO_TICKET_TYPES[patch.assigned_role] ||
      [];
    if (!allowed.length) {
      throw new Error(`Unknown escalate role: ${patch.assigned_role}`);
    }
    if (patch.type === undefined || patch.type === null || String(patch.type).trim() === '') {
      throw new Error(
        `A ticket type is required when escalating to ${patch.assigned_role}. Allowed: ${allowed.join(', ')}`
      );
    }
    const normalized = normalizeTicketType(patch.type);
    if (!allowed.includes(normalized)) {
      throw new Error(
        `Ticket type "${normalized}" is not valid for ${patch.assigned_role}. Allowed: ${allowed.join(', ')}`
      );
    }
    patch.type = normalized;

    // Escalating clears the handler — only the assigned moderator (or Admin override).
    if (!ticketPerms.canEscalate) {
      throw new Error('Only a moderator or admin can move this ticket to another group.');
    }

    sets.push(`escalated_to_role = $${idx}`);
    values.push(patch.assigned_role);
    idx += 1;

    const escalatedBy = sessionStaffId(staffSession);
    if (escalatedBy) {
      sets.push(`escalated_by_staff_id = $${idx}`);
      values.push(escalatedBy);
      idx += 1;
    }

    if (patch.handled_by_staff_id === undefined) {
      patch.handled_by_staff_id = null;
    }
  }

  if (patch.type !== undefined && patch.priority === undefined) {
    const nextType = normalizeTicketType(patch.type);
    if (nextType !== currentTicket.type) {
      const nextPriority = defaultPriorityForType(nextType);
      if (nextPriority !== 'Medium') patch.priority = nextPriority;
    }
  }

  const nextAssigneeForStatus =
    patch.handled_by_staff_id !== undefined
      ? patch.handled_by_staff_id === null || patch.handled_by_staff_id === ''
        ? null
        : patch.handled_by_staff_id
      : currentAssignee;
  const assignedAfterSave = Boolean(normalizeStaffId(nextAssigneeForStatus));
  const incomingStatus =
    patch.status !== undefined ? normalizeTicketStatus(patch.status) : normalizeTicketStatus(currentStatus);
  let enforcedStatus = incomingStatus;
  if (!assignedAfterSave && enforcedStatus !== 'Closed') enforcedStatus = 'Open';
  if (assignedAfterSave && enforcedStatus === 'Open') enforcedStatus = 'In Progress';
  if (enforcedStatus !== normalizeTicketStatus(currentStatus) || (patch.status !== undefined && normalizeTicketStatus(patch.status) !== enforcedStatus)) {
    patch.status = enforcedStatus;
  }

  if (patch.status !== undefined) {
    sets.push(`status = $${idx}`);
    values.push(normalizeTicketStatus(patch.status));
    idx += 1;
  }
  if (patch.priority !== undefined) {
    sets.push(`priority = $${idx}`);
    values.push(normalizeTicketPriority(patch.priority));
    idx += 1;
  }
  if (patch.type !== undefined) {
    if (!patch.assigned_role) {
      throw new Error('Ticket type can only be changed when escalating to a moderator queue');
    }
    sets.push(`type = $${idx}`);
    values.push(normalizeTicketType(patch.type));
    idx += 1;
  }
  if (patch.handled_by_staff_id !== undefined) {
    const nextAssignee =
      patch.handled_by_staff_id === null || patch.handled_by_staff_id === ''
        ? null
        : patch.handled_by_staff_id;
    const nextNorm = normalizeStaffId(nextAssignee);
    const curNorm = normalizeStaffId(currentAssignee);

    if (isClosedStatus(currentStatus) && nextNorm && nextNorm !== curNorm) {
      throw ticketError('Open this ticket before claiming or assigning it.', 400);
    }

    if (curNorm && nextNorm !== curNorm) {
      // Locked while assigned — handler must Release case (or escalate). Admin may override.
      if (!patch.assigned_role && !ticketPerms.isAdmin && !ticketPerms.canAssignOthers) {
        throw new Error(
          'This ticket already has a handler. They must release the case before it can be reassigned.'
        );
      }
    }

    if (!curNorm && nextNorm && !ticketPerms.canAssignOthers && !ticketPerms.canAssignMyself) {
      // Claiming should use Assign myself; Admin may still pick someone when open.
      if (!ticketPerms.isAdmin) {
        throw new Error('Use Assign myself to claim an unassigned ticket.');
      }
    }

    if (nextNorm && !patch.assigned_role) {
      const typeRow = await pool.query(
        `SELECT type FROM tickets WHERE ticket_id = $1 AND deleted_at IS NULL`,
        [ticketId]
      );
      const queueKey = inferTicketAssignableQueue(typeRow.rows[0]?.type);
      await assertStaffAssignableToQueue(nextAssignee, queueKey);
    }

    sets.push(`handled_by_staff_id = $${idx}`);
    values.push(nextAssignee);
    idx += 1;
  }

  if (!sets.length && !patch.note) return getTicketDetail(ticketId, staffSession);

  if (sets.length) {
    if (patch.status && isClosedStatus(patch.status)) {
      sets.push(`resolved_at = NOW()`);
    }

    sets.push(`updated_at = NOW()`);
    values.push(ticketId);

    await pool.query(
      `UPDATE tickets SET ${sets.join(', ')} WHERE ticket_id = $${idx} AND deleted_at IS NULL`,
      values
    );

    const actorStaffId = staff?.staff_id || null;
    const nextStatus = patch.status ? normalizeTicketStatus(patch.status) : null;
    if (nextStatus && nextStatus !== normalizeTicketStatus(currentStatus)) {
      await recordTicketEvent({
        ticketId,
        eventType: 'status',
        summary: `Status changed from ${normalizeTicketStatus(currentStatus)} to ${nextStatus}`,
        actorStaffId,
      });
      if (nextStatus === 'Closed' && !isClosedStatus(currentStatus)) {
        await pool.query(
          `UPDATE tickets SET scheduled_close_at = NULL WHERE ticket_id = $1`,
          [ticketId]
        ).catch((error) => {
          if (error?.code !== '42703') throw error;
        });
        await saveTicketCloseTranscript(ticketId, {
          reason: 'closed',
          actorStaffId,
          actorAccountId: sessionAccountId(staffSession),
        });
      }
    }
    if (patch.priority) {
      await recordTicketEvent({
        ticketId,
        eventType: 'priority',
        summary: `Priority set to ${normalizeTicketPriority(patch.priority)}`,
        actorStaffId,
      });
    }
    if (patch.assigned_role) {
      await recordTicketEvent({
        ticketId,
        eventType: 'escalate',
        summary: `Moved to ${patch.assigned_role}${patch.type ? ` as ${normalizeTicketType(patch.type)}` : ''}`,
        actorStaffId,
      });
    }
    if (patch.handled_by_staff_id !== undefined) {
      await recordTicketEvent({
        ticketId,
        eventType: 'assign',
        summary: patch.handled_by_staff_id ? 'Changed the ticket handler' : 'Cleared the ticket handler',
        actorStaffId,
      });
    }

    try {
      const notifSettings = await getSectionValue('notifications');
      const { getIo } = require('../lib/WebSocket');
      const io = getIo();

      // 1. Notify assignee on ticket assignment
      const nextAssignee = patch.handled_by_staff_id !== undefined ? patch.handled_by_staff_id : null;
      const isNewlyAssigned = nextAssignee && normalizeStaffId(nextAssignee) !== normalizeStaffId(currentAssignee);
      if (isNewlyAssigned) {
        await announceTicketAssignment(ticketId, nextAssignee, staffSession);
      }
      if (isNewlyAssigned && notifSettings?.notifyAssigneeOnTicket !== false) {
        const staffRes = await pool.query(`SELECT account_id FROM staff WHERE staff_id = $1`, [nextAssignee]);
        if (staffRes.rows.length && staffRes.rows[0].account_id) {
          const staffAccountId = staffRes.rows[0].account_id;
          const notif = await createNotificationServices({
            account_id: String(staffAccountId),
            message: `You have been assigned to ticket #${currentTicket.ticket_number}.`,
            is_read: false,
            reference_table: 'tickets',
            reference_prefix: 'TICKET_ASSIGNED',
            reference_path: ticketDeskPath(staff?.role),
            reference_id: randomUUID(),
          });
          if (io) {
            io.to(String(staffAccountId)).emit('notification', notif);
          }
        }
      }

      // 2. Notify requester on ticket resolution
      const isResolving = patch.status && isClosedStatus(patch.status) && !isClosedStatus(currentStatus);
      if (isResolving && currentTicket.account_id) {
        await notifyTicketClosed({
          ticketId,
          ticketNumber: currentTicket.ticket_number,
          requesterAccountId: currentTicket.account_id,
          reason: 'closed',
          staffSession,
        });
      }
    } catch (notifErr) {
      console.error('Error dispatching ticket configuration-based notifications:', notifErr.message);
    }
  }

  if (patch.note) {
    await addTicketMessage(ticketId, patch.note, staffSession, Boolean(patch.internalNote));
    return getTicketDetail(ticketId, staffSession);
  }

  return getTicketDetail(ticketId, staffSession);
}

function assertStaffMayAnswerTicket(ticketRow, staffSession) {
  const assigneeId = normalizeStaffId(ticketRow?.handled_by_staff_id);
  if (!assigneeId) {
    throw ticketError('Claim this ticket before replying. No one is assigned yet.', 403);
  }
  const actorId = normalizeStaffId(sessionStaffId(staffSession));
  if (!actorId || actorId !== assigneeId) {
    throw ticketError('Only the assigned staff member can reply on this ticket.', 403);
  }
}

async function addTicketMessage(ticketId, body, staffSession, isInternal = false, rawAttachments = [], replyToMessageId = null, options = {}) {
  if (!getMongoClient()) {
    throw new Error('MongoDB is not connected — cannot send ticket chat messages');
  }

  const ticketResult = await pool.query(
    `SELECT * FROM tickets WHERE ticket_id = $1 AND deleted_at IS NULL`,
    [ticketId]
  );
  if (!ticketResult.rows.length) return null;
  const requesterId = ticketResult.rows[0].account_id;
  const actorAccountId = sessionAccountId(staffSession);
  const isRequester = requesterId && actorAccountId && String(requesterId) === String(actorAccountId);
  if (!options.initial && isClosedStatus(ticketResult.rows[0].status)) {
    throw ticketError('This ticket is closed. Open it again before replying.', 403);
  }
  if (isStaffSession(staffSession) && !options.initial) {
    if (!isRequester) {
      const actor = await resolveDisputeStaffId(staffSession);
      const sessionForCheck = actor?.staff_id
        ? { ...staffSession, staff_id: actor.staff_id, staffId: actor.staff_id }
        : staffSession;
      assertStaffMayAnswerTicket(ticketResult.rows[0], sessionForCheck);
    }
  }

  const chatId = await ensureTicketChat(ticketId, ticketResult.rows[0]);
  const now = new Date();
  const accountId = sessionAccountId(staffSession);
  const staff = isStaffSession(staffSession);
  const memberRole = staff ? 'admin' : 'member';

  if (accountId && ObjectId.isValid(chatId)) {
    const db = mongoDb();
    if (db) {
      await db.collection('inbox').updateOne(
        { _id: new ObjectId(chatId), 'members.account_id': { $ne: accountId } },
        {
          $push: { members: { account_id: accountId, role: memberRole, joined_at: now } },
          $set: { updated_at: now },
        }
      );
    }
  }

  const screenshots = normalizeTicketScreenshots(rawAttachments);
  const messageBody = String(body || '').trim();
  if (!messageBody && !screenshots.length) {
    throw new Error('Message body is required');
  }
  let replyParentId = null;
  const requestedReply = String(replyToMessageId || '').trim();
  if (requestedReply) {
    const parent = await getMessageByIdRepositories(requestedReply);
    if (!parent || String(parent.conversation_id) !== String(chatId) || parent.is_deleted || parent.deleted_at) {
      throw ticketError('That message is no longer in this ticket', 400);
    }
    replyParentId = String(parent._id);
  }
  const insertedMessageId = await createMessageRepositories({
    conversation_id: String(chatId),
    sender_id: accountId,
    message_type: screenshots.length ? 'image' : 'text',
    message_content: messageBody,
    message_id_reply: replyParentId,
    attachments: screenshots,
    links: [],
    message_react: [],
    read_by: accountId ? [{ account_id: accountId, read_at: now }] : [],
    is_edited: false,
    is_deleted: false,
    is_internal: staff ? Boolean(isInternal) : false,
    author_type: staff ? 'staff' : 'user',
    author_name: sessionDisplayName(staffSession) || (staff ? 'Staff' : 'User'),
    created_at: now,
    updated_at: now,
  });
  const createdMessage = await getMessageByIdRepositories(insertedMessageId);

  await pool.query(
    `UPDATE tickets
     SET updated_at = NOW(),
         message_count = COALESCE(message_count, 0) + 1,
         last_message_at = NOW(),
         last_message_author_type = $2,
         first_staff_reply_at = CASE
           WHEN $3::boolean AND first_staff_reply_at IS NULL THEN NOW()
           ELSE first_staff_reply_at
         END
     WHERE ticket_id = $1 AND deleted_at IS NULL`,
    [ticketId, staff ? 'staff' : 'user', Boolean(staff && !isInternal)]
  );
  await recordTicketEvent({
    ticketId,
    eventType: isInternal ? 'note' : 'reply',
    summary: isInternal
      ? 'Added an internal note'
      : screenshots.length
        ? `Replied with ${screenshots.length} screenshot${screenshots.length === 1 ? '' : 's'}`
        : 'Replied on the ticket',
    actorStaffId: staff ? (await resolveDisputeStaffId(staffSession))?.staff_id || null : null,
    actorAccountId: accountId,
  });

  if (ObjectId.isValid(chatId)) {
    const db = mongoDb();
    if (db) {
      await db.collection('inbox').updateOne(
        { _id: new ObjectId(chatId) },
        { $set: { updated_at: now, last_message: body, last_message_time: now } }
      );

      const inbox = await db.collection('inbox').findOne({ _id: new ObjectId(chatId) });
      const recipients = (inbox?.members || []).filter(
        (member) =>
          String(member.account_id) !== String(accountId) &&
          !['left', 'removed'].includes(member.status || 'active') &&
          (!isInternal || ['admin', 'staff', 'moderator'].includes(String(member.role).toLowerCase()))
      );
      const { getIo } = require('../lib/WebSocket');
      let io = null;
      try {
        io = getIo();
      } catch (error) {
        console.error('Ticket message saved without realtime delivery:', error.message);
      }

      if (io && isInternal) {
        recipients.forEach((member) => {
          io.to(String(member.account_id)).emit('ticketInternalMessage', createdMessage);
        });
      } else if (io) {
        io.to(String(chatId)).emit('newMessage', createdMessage);
      }

      void Promise.all(
        recipients.map(async (member) => {
          try {
            const notification = await createNotificationServices({
              account_id: String(member.account_id),
              message: `${sessionDisplayName(staffSession) || (staff ? 'Staff' : 'A user')} replied to ticket ${ticketResult.rows[0].ticket_number}.`,
              is_read: false,
              reference_table: 'inbox',
              reference_prefix: isInternal ? 'TICKET_INTERNAL_REPLY' : 'TICKET_REPLY',
              reference_path: `/inbox/direct?conversation=${chatId}`,
              reference_id: randomUUID(),
            });
            if (io) {
              io.to(String(member.account_id)).emit('notification', notification);
            }
          } catch (error) {
            console.error('Error creating ticket reply notification:', error.message);
          }
        })
      );
    }
  }

  return mapMongoTicketMessage(createdMessage || {
    _id: insertedMessageId,
    sender_id: accountId,
    message_type: screenshots.length ? 'image' : 'text',
    message_content: messageBody,
    attachments: screenshots,
    is_internal: staff ? Boolean(isInternal) : false,
    author_type: staff ? 'staff' : 'user',
    author_name: sessionDisplayName(staffSession) || (staff ? 'Staff' : 'User'),
    message_id_reply: replyParentId,
    created_at: now,
  });
}

function emitTicketChat(event, chatId, payload) {
  try {
    const { getIo } = require('../lib/WebSocket');
    const io = getIo();
    if (io && chatId) io.to(String(chatId)).emit(event, payload);
  } catch (error) {
    console.error('Ticket message saved without realtime delivery:', error.message);
  }
}

async function refreshTicketInboxPreview(chatId) {
  const db = mongoDb();
  if (!db || !ObjectId.isValid(String(chatId))) return;
  const latest = await db.collection('messages').find({
    conversation_id: String(chatId),
    is_deleted: { $ne: true },
    deleted_at: null,
    is_internal: { $ne: true },
  }).sort({ created_at: -1, _id: -1 }).limit(1).next();
  const preview = latest
    ? String(latest.message_content || (Array.isArray(latest.attachments) && latest.attachments.length ? 'Attachment' : '')).slice(0, 180)
    : '';
  await db.collection('inbox').updateOne(
    { _id: new ObjectId(chatId) },
    {
      $set: {
        last_message: preview,
        last_message_time: latest?.created_at || new Date(),
        updated_at: new Date(),
      },
    }
  );
}

async function loadOwnedTicketMessage(ticketId, messageId) {
  if (!ObjectId.isValid(String(messageId))) {
    throw new Error('Message not found');
  }
  const chatId = await getTicketChatId(ticketId);
  const message = chatId ? await getMessageByIdRepositories(messageId) : null;
  if (!message || String(message.conversation_id) !== String(chatId) || message.is_deleted || message.deleted_at) {
    throw new Error('Message not found');
  }
  return { chatId, message };
}

function assertOwnTicketReply(message, staffSession) {
  const accountId = sessionAccountId(staffSession);
  if (!accountId || String(message.sender_id) !== String(accountId)) {
    throw new Error('You can only change your own replies');
  }
}

async function updateTicketMessage(ticketId, messageId, patch, staffSession) {
  if (!getMongoClient()) throw new Error('MongoDB is not connected — cannot update ticket chat messages');
  if (!isStaffSession(staffSession)) throw new Error('Only staff can change ticket replies');
  const ticketResult = await pool.query(
    `SELECT ticket_id, handled_by_staff_id, account_id FROM tickets WHERE ticket_id = $1 AND deleted_at IS NULL`,
    [ticketId]
  );
  if (!ticketResult.rows.length) return null;
  const editor = await resolveDisputeStaffId(staffSession);
  assertStaffMayAnswerTicket(
    ticketResult.rows[0],
    editor?.staff_id ? { ...staffSession, staff_id: editor.staff_id, staffId: editor.staff_id } : staffSession
  );

  const wantsBody = Object.prototype.hasOwnProperty.call(patch || {}, 'body');
  const wantsInternal = Object.prototype.hasOwnProperty.call(patch || {}, 'isInternal');
  if (!wantsBody && !wantsInternal) throw new Error('Nothing to update');

  const { chatId, message } = await loadOwnedTicketMessage(ticketId, messageId);
  const wasInternal = Boolean(message.is_internal);

  if (wantsBody) {
    throw new Error('Ticket messages cannot be edited. Use an internal note instead.');
  }

  if (wantsInternal) {
    const author = String(message.author_type || (wasInternal ? 'staff' : 'user')).toLowerCase();
    if (author !== 'staff') throw new Error('Only staff replies can be internal notes');
    const db = mongoDb();
    await db.collection('messages').updateOne(
      { _id: new ObjectId(messageId) },
      { $set: { is_internal: Boolean(patch.isInternal), updated_at: new Date() } }
    );
  }

  const updated = await getMessageByIdRepositories(messageId);
  const isInternal = Boolean(updated?.is_internal);
  await refreshTicketInboxPreview(chatId);
  if (!isInternal && wasInternal) {
    emitTicketChat('newMessage', chatId, updated);
  } else if (!isInternal) {
    emitTicketChat('messageUpdated', chatId, updated);
  } else if (!wasInternal) {
    emitTicketChat('messageDeleted', chatId, {
      conversation_id: String(chatId),
      message_id: String(messageId),
      deleted_at: new Date(),
    });
  }
  if (isInternal || wasInternal) {
    emitTicketChat('ticketInternalMessage', chatId, updated);
  }

  const staff = await resolveDisputeStaffId(staffSession);
  await recordTicketEvent({
    ticketId,
    eventType: wantsInternal ? 'note' : 'reply',
    summary: wantsInternal
      ? (isInternal ? 'Marked a reply as an internal note' : 'Made an internal note visible to the member')
      : 'Edited a ticket reply',
    actorStaffId: staff?.staff_id || null,
    actorAccountId: sessionAccountId(staffSession),
  });

  return getTicketDetail(ticketId, staffSession);
}

async function deleteTicketMessage(ticketId, messageId, staffSession) {
  if (!getMongoClient()) throw new Error('MongoDB is not connected — cannot delete ticket chat messages');
  if (!isStaffSession(staffSession)) throw new Error('Only staff can change ticket replies');
  const ticketResult = await pool.query(
    `SELECT ticket_id, handled_by_staff_id, account_id FROM tickets WHERE ticket_id = $1 AND deleted_at IS NULL`,
    [ticketId]
  );
  if (!ticketResult.rows.length) return null;
  const editor = await resolveDisputeStaffId(staffSession);
  assertStaffMayAnswerTicket(
    ticketResult.rows[0],
    editor?.staff_id ? { ...staffSession, staff_id: editor.staff_id, staffId: editor.staff_id } : staffSession
  );

  const { chatId, message } = await loadOwnedTicketMessage(ticketId, messageId);
  assertOwnTicketReply(message, staffSession);
  const deleted = await deleteMessageRepositories(messageId);
  await refreshTicketInboxPreview(chatId);
  emitTicketChat('messageDeleted', chatId, {
    conversation_id: String(chatId),
    message_id: String(deleted?._id || messageId),
    deleted_at: deleted?.deleted_at || new Date(),
  });

  const staff = await resolveDisputeStaffId(staffSession);
  await recordTicketEvent({
    ticketId,
    eventType: 'reply',
    summary: 'Deleted a ticket reply',
    actorStaffId: staff?.staff_id || null,
    actorAccountId: sessionAccountId(staffSession),
  });

  return getTicketDetail(ticketId, staffSession);
}

async function resolveDisputeStaffId(session) {
  const direct = sessionStaffId(session);
  if (direct) {
    const existing = await pool.query(`SELECT staff_id, role FROM staff WHERE staff_id::text = $1 LIMIT 1`, [
      String(direct),
    ]);
    if (existing.rows.length) return existing.rows[0];
  }
  const accountId = sessionAccountId(session);
  if (accountId) {
    const byAccount = await pool.query(
      `SELECT staff_id, role FROM staff WHERE account_id::text = $1 LIMIT 1`,
      [String(accountId)]
    );
    if (byAccount.rows.length) return byAccount.rows[0];
  }
  const email = session?.email || session?.email_address || null;
  if (email) {
    const byEmail = await pool.query(
      `SELECT staff_id, role FROM staff WHERE LOWER(email_address) = LOWER($1) LIMIT 1`,
      [String(email).trim()]
    );
    if (byEmail.rows.length) return byEmail.rows[0];
  }
  const handle = session?.username || session?.handle || null;
  if (handle) {
    const byHandle = await pool.query(
      `SELECT s.staff_id, s.role
       FROM staff s
       INNER JOIN accounts a ON a.account_id = s.account_id
       WHERE LOWER(a.handle) = LOWER($1)
       LIMIT 1`,
      [String(handle).trim()]
    );
    if (byHandle.rows.length) return byHandle.rows[0];
  }
  // Session fallback so Admin/Support can still claim when Redis payload has staffId/role
  if (direct && session?.role) {
    return { staff_id: direct, role: session.role };
  }
  return null;
}

function isSupportRole(role) {
  return String(role || '').toLowerCase() === 'support moderator';
}

/** Dispute handlers only — Support Moderators + Admin. */
function isDesignatedHandlerRole(role) {
  return isAdminRole(role) || isSupportRole(role);
}

/** Ticket/report claim roles — any specialist console + Support + Admin. */
function ticketDeskPath(role) {
  const label = String(role || '').toLowerCase();
  if (label.includes('forum')) return '/moderator/forum/ticket-management';
  if (label.includes('marketplace')) return '/moderator/marketplace/ticket-management';
  if (label.includes('jobs')) return '/moderator/jobs/ticket-management';
  if (label === 'admin' || label === 'administrator') return '/admin/ticket-management';
  return '/moderator/support/ticket-management';
}

function isQueueHandlerRole(role) {
  const r = String(role || '').toLowerCase();
  return (
    isDesignatedHandlerRole(role) ||
    r.includes('forum') ||
    r.includes('marketplace') ||
    r.includes('jobs')
  );
}

const DISPUTE_WORKFLOW = ['pending_review', 'open', 'awaiting_response', 'under_review', 'closed'];
const DISPUTE_LEGACY_CLOSED_STATUS = ['resolved', 'sanctioned', 'dismissed', 'withdrawn'];

function normalizeDisputeStatusPatch(patch) {
  const next = { ...patch };
  if (next.status != null) {
    let status = String(next.status).toLowerCase().trim();
    if (DISPUTE_LEGACY_CLOSED_STATUS.includes(status)) {
      status = 'closed';
    }
    if (!DISPUTE_WORKFLOW.includes(status)) {
      throw new Error(
        `Invalid dispute status "${next.status}". Use: ${DISPUTE_WORKFLOW.join(', ')}.`
      );
    }
    next.status = status;
  }
  if (next.priority != null) {
    next.priority = normalizeDisputePriority(next.priority);
  }
  if (next.type != null) {
    next.type = normalizeDisputeType(next.type);
  }
  if (next.visibility !== undefined) {
    next.visibility = normalizeDisputeVisibility(next.visibility);
  }
  if (next.description === undefined && next.reason !== undefined) {
    next.description = next.reason;
    delete next.reason;
  }
  return next;
}

async function loadDisputeRow(disputeId) {
  const result = await pool.query(
    `
    SELECT
      d.*,
      COALESCE(ia.display_name, iu.first_name || ' ' || iu.last_name) AS initiator_name,
      ia.handle AS initiator_handle,
      COALESCE(ra.display_name, ru.first_name || ' ' || ru.last_name) AS respondent_name,
      ra.handle AS respondent_handle,
      COALESCE(sa.display_name, st.first_name || ' ' || st.last_name) AS assignee_name,
      st.role AS assignee_role,
      ct.status AS hold_status,
      ct.amount_credits AS hold_amount,
      ct.type AS hold_type
    FROM disputes d
    LEFT JOIN accounts ia ON ia.account_id = d.by_account_id
    LEFT JOIN users iu ON iu.account_id = ia.account_id
    LEFT JOIN accounts ra ON ra.account_id = d.for_account_id
    LEFT JOIN users ru ON ru.account_id = ra.account_id
    LEFT JOIN staff st ON st.staff_id = d.handled_by_staff_id
    LEFT JOIN accounts sa ON sa.account_id = st.account_id
    LEFT JOIN credit_transactions ct ON ct.credit_transaction_id = d.related_credit_transaction_id
    WHERE d.dispute_id = $1
    `,
    [disputeId]
  );
  return result.rows[0] || null;
}

function buildDisputePermissions(row, staff, session = null) {
  const staffId =
    normalizeStaffId(staff?.staff_id) || normalizeStaffId(sessionStaffId(session));
  const role = staff?.role || session?.role || null;
  const assigneeId = normalizeStaffId(row?.handled_by_staff_id);
  const isAssignee = Boolean(staffId && assigneeId && staffId === assigneeId);
  const isAdmin = isAdminRole(role);
  const unassigned = !assigneeId;
  const designated = isDesignatedHandlerRole(role);
  const hasStaffSession = Boolean(staffId || staff?.staff_id || sessionStaffId(session));

  return {
    staffId: staff?.staff_id != null ? String(staff.staff_id) : sessionStaffId(session),
    role,
    isAssignee,
    isAdmin,
    canView: true,
    /** Any staff may post staff-only replies; only Support/Admin handle the case */
    canReply: hasStaffSession,
    /** Approve / status / publish — assignee, or Admin override */
    canAct: Boolean(isAdmin || (isAssignee && designated)),
    /** Admin may pick / reassign Support handlers at any time */
    canAssignOthers: Boolean(isAdmin),
    /** Claim (Support/Admin); Admin may take over an assigned dispute */
    canSelfAssign: Boolean(staffId && designated && !isAssignee && (unassigned || isAdmin)),
    canAssignMyself: Boolean(staffId && designated && !isAssignee && (unassigned || isAdmin)),
    /** Current handler or Admin may release */
    canRelease: Boolean((isAssignee && designated) || (isAdmin && Boolean(assigneeId))),
  };
}

async function updateDispute(disputeId, patch, staffSession) {
  const staff = await resolveDisputeStaffId(staffSession);
  if (!staff) {
    throw new Error('Could not match your login to a staff profile.');
  }

  const row = await loadDisputeRow(disputeId);
  if (!row) return null;

  // Accept legacy assigned_staff_id alias from older clients.
  if (patch.handled_by_staff_id === undefined && patch.assigned_staff_id !== undefined) {
    patch.handled_by_staff_id = patch.assigned_staff_id;
  }

  const perms = buildDisputePermissions(row, staff, staffSession);
  const action = String(patch.action || '').toLowerCase().trim();

  // --- Assignment actions (allowed without canAct) ---
  if (action === 'self_assign') {
    if (!perms.canSelfAssign && !perms.canAssignMyself) {
      throw new Error('Only Support Moderators or Admin can claim disputes.');
    }
    if (row.handled_by_staff_id && !perms.isAdmin) {
      throw new Error('This dispute already has a handler. They must release the case first.');
    }
    await pool.query(
      `UPDATE disputes
       SET handled_by_staff_id = $1,
           updated_at = NOW()
       WHERE dispute_id = $2`,
      [staff.staff_id, disputeId]
    );
    return getDisputeDetail(disputeId, staffSession);
  }

  if (action === 'release' || action === 'self_unassign') {
    if (!perms.canRelease && !perms.isAssignee) {
      throw new Error('Only the current handler can release this case.');
    }
    if (perms.isAdmin && !perms.isAssignee) {
      await pool.query(
        `UPDATE disputes
         SET handled_by_staff_id = NULL,
             updated_at = NOW()
         WHERE dispute_id = $1`,
        [disputeId]
      );
    } else {
      await pool.query(
        `UPDATE disputes
         SET handled_by_staff_id = NULL,
             updated_at = NOW()
         WHERE dispute_id = $1 AND handled_by_staff_id = $2`,
        [disputeId, staff.staff_id]
      );
    }
    return getDisputeDetail(disputeId, staffSession);
  }

  // Admin may designate / reassign Support handlers (override lock)
  if (patch.handled_by_staff_id !== undefined && !action) {
    const nextAssignee =
      patch.handled_by_staff_id === null || patch.handled_by_staff_id === ''
        ? null
        : patch.handled_by_staff_id;
    const nextNorm = normalizeStaffId(nextAssignee);
    const curNorm = normalizeStaffId(row.handled_by_staff_id);

    if (curNorm && nextNorm !== curNorm && !perms.canAssignOthers) {
      throw new Error(
        'This dispute already has a handler. They must release the case before it can be reassigned.'
      );
    }

    if (nextNorm !== curNorm) {
      if (!perms.canAssignOthers && !(perms.canAssignMyself && !curNorm && nextNorm === normalizeStaffId(staff.staff_id))) {
        throw new Error(
          'Use Assign myself to claim an unassigned dispute, or ask Admin to designate a handler.'
        );
      }
      if (nextNorm) {
        const target = await pool.query(`SELECT staff_id, role FROM staff WHERE staff_id::text = $1`, [
          String(nextAssignee),
        ]);
        if (!target.rows.length) throw new Error('Assignee staff not found.');
        if (!isDesignatedHandlerRole(target.rows[0].role)) {
          throw new Error('Disputes can only be assigned to Support Moderators or Admin.');
        }
      }
      await pool.query(
        `UPDATE disputes
         SET handled_by_staff_id = $1,
             updated_at = NOW()
         WHERE dispute_id = $2`,
        [nextAssignee, disputeId]
      );
    }

    const otherKeys = Object.keys(patch).filter(
      (k) => !['handled_by_staff_id', 'assigned_staff_id', 'action'].includes(k)
    );
    if (!otherKeys.length) {
      return getDisputeDetail(disputeId, staffSession);
    }
  }

  // --- Handling actions require being the assigned staff ---
  const refreshed = await loadDisputeRow(disputeId);
  const actPerms = buildDisputePermissions(refreshed, staff, staffSession);

  if (action === 'approve') {
    if (!actPerms.canAct) throw new Error('Assign yourself to this dispute before approving.');
    await pool.query(
      `UPDATE disputes
       SET status = 'open',
           visibility = TRUE,
           updated_at = NOW()
       WHERE dispute_id = $1`,
      [disputeId]
    );
    await recordAccountActivity({
      accountId: refreshed.by_account_id || refreshed.for_account_id,
      action: `Dispute ${refreshed.dispute_number || disputeId} opened to the public`,
      eventCode: 'DISPUTE_APPROVED',
      referenceTable: 'disputes',
      referencePrefix: 'DIS',
      referenceId: disputeId,
      actorStaffId: staff.staff_id,
      metadata: { status: 'open', visibility: true },
    });
    try {
      const number = refreshed.dispute_number || 'Dispute';
      await notifyDisputeParties(refreshed, {
        message: `Dispute ${number} is now open.`,
        path: `/disputes/${disputeId}`,
      });
    } catch (err) {
      console.warn('Dispute public notice skipped:', err.message);
    }
    return getDisputeDetail(disputeId, staffSession);
  }

  if (action === 'dismiss') {
    if (!actPerms.canAct) throw new Error('Assign yourself to this dispute before dismissing.');
    await pool.query(
      `UPDATE disputes
       SET status = 'closed',
           visibility = TRUE,
           resolution_notes = COALESCE($1, resolution_notes),
           resolved_at = NOW(),
           updated_at = NOW()
       WHERE dispute_id = $2`,
      [patch.resolution_notes || null, disputeId]
    );
    await recordAccountActivity({
      accountId: refreshed.by_account_id || refreshed.for_account_id,
      action: `Dispute ${refreshed.dispute_number || disputeId} dismissed`,
      eventCode: 'DISPUTE_DISMISSED',
      referenceTable: 'disputes',
      referencePrefix: 'DIS',
      referenceId: disputeId,
      actorStaffId: staff.staff_id,
      metadata: { status: 'closed' },
    });
    return getDisputeDetail(disputeId, staffSession);
  }

  if (action === 'convict' || action === 'ban') {
    return convictDispute(disputeId, refreshed, patch, staff, staffSession, actPerms);
  }

  if (action === 'reopen') {
    return reopenDispute(disputeId, refreshed, staff, staffSession, actPerms);
  }

  // Generic field updates
  if (!actPerms.canAct) {
    throw new Error('View only — assign yourself to this dispute to make changes.');
  }

  const normalized = normalizeDisputeStatusPatch(patch);
  const allowed = [
    'status',
    'priority',
    'resolution_notes',
    'visibility',
    'description',
  ];
  const sets = [];
  const values = [];
  let idx = 1;

  for (const key of allowed) {
    if (normalized[key] !== undefined) {
      sets.push(`${key} = $${idx}`);
      values.push(normalized[key]);
      idx += 1;
    }
  }

  if (normalized.status && normalized.status !== 'closed') {
    sets.push(`resolved_at = NULL`);
  }

  if (normalized.handled_by_staff_id !== undefined && (actPerms.canAct || actPerms.canAssignOthers)) {
    // Non-admin assignment changes while locked go through Release case — ignore here.
    const nextNorm = normalizeStaffId(normalized.handled_by_staff_id);
    const curNorm = normalizeStaffId(refreshed.handled_by_staff_id);
    if (curNorm && nextNorm !== curNorm && !actPerms.canAssignOthers) {
      throw new Error(
        'This dispute already has a handler. They must release the case before it can be reassigned.'
      );
    }
  }

  if (normalized.status) {
    const status = String(normalized.status).toLowerCase();
    if (status === 'closed') {
      sets.push(`resolved_at = NOW()`);
    }
  }

  if (!sets.length) {
    return getDisputeDetail(disputeId, staffSession);
  }

  sets.push(`updated_at = NOW()`);
  values.push(disputeId);
  await pool.query(`UPDATE disputes SET ${sets.join(', ')} WHERE dispute_id = $${idx}`, values);
  if (normalized.status !== undefined || normalized.visibility !== undefined) {
    await recordAccountActivity({
      accountId: refreshed.by_account_id || refreshed.for_account_id,
      action: `Dispute ${refreshed.dispute_number || disputeId} updated`,
      eventCode: 'DISPUTE_UPDATED',
      referenceTable: 'disputes',
      referencePrefix: 'DIS',
      referenceId: disputeId,
      actorStaffId: staff.staff_id,
      metadata: {
        status: normalized.status || refreshed.status,
        visibility: normalized.visibility,
      },
    });
  }
  if (normalized.visibility === true && !Boolean(refreshed.visibility)) {
    const number = refreshed.dispute_number || 'Dispute';
    await notifyDisputeParties(refreshed, {
      message: `Dispute ${number} is now open.`,
      path: `/disputes/${disputeId}`,
    });
  }
  return getDisputeDetail(disputeId, staffSession);
}

function emptyDisputeCaseFile() {
  return { contracts: [], transactions: [], relatedDisputes: [] };
}

function walletLabel(type) {
  const raw = String(type || '').replace(/[_-]+/g, ' ').trim();
  if (!raw) return 'Wallet';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

async function loadDisputeCaseFile(row) {
  const byId = row.by_account_id || null;
  const forId = row.for_account_id || null;
  const linkedContractId = row.contract_id || null;

  const contractResult = byId && forId
    ? await pool.query(
      `
      SELECT
        c.contract_id,
        c.contract_type,
        c.payment_type,
        c.status,
        c.rate_credits,
        c.revision_price_credits,
        c.starts_at,
        c.deadline_at,
        c.created_at,
        COALESCE(jc_info.title, gc_info.title, 'Contract') AS title,
        COALESCE(jc_info.client_account_id, gc_info.client_account_id) AS client_account_id,
        COALESCE(jc_info.freelancer_account_id, gc_info.freelancer_account_id) AS freelancer_account_id,
        COALESCE(ca.display_name, cu.first_name || ' ' || cu.last_name, 'Client') AS client_name,
        ca.handle AS client_handle,
        COALESCE(fa.display_name, fu.first_name || ' ' || fu.last_name, 'Freelancer') AS freelancer_name,
        fa.handle AS freelancer_handle
      FROM contracts c
      LEFT JOIN (
        SELECT jc.contract_id, j.client_account_id, p.freelancer_account_id, j.title
        FROM job_contracts jc
        JOIN proposals p ON jc.proposal_id = p.proposal_id
        JOIN jobs j ON p.job_id = j.job_id
      ) jc_info ON c.contract_id = jc_info.contract_id
      LEFT JOIN (
        SELECT gc.contract_id, gr.client_account_id, g.freelancer_account_id, g.title
        FROM gig_contracts gc
        JOIN gig_requests gr ON gc.gig_request_id = gr.gig_request_id
        JOIN gig_tiers gt ON gr.gig_tier_id = gt.gig_tier_id
        JOIN gigs g ON gt.gig_id = g.gig_id
      ) gc_info ON c.contract_id = gc_info.contract_id
      LEFT JOIN accounts ca ON ca.account_id = COALESCE(jc_info.client_account_id, gc_info.client_account_id)
      LEFT JOIN users cu ON cu.account_id = ca.account_id
      LEFT JOIN accounts fa ON fa.account_id = COALESCE(jc_info.freelancer_account_id, gc_info.freelancer_account_id)
      LEFT JOIN users fu ON fu.account_id = fa.account_id
      WHERE (
          COALESCE(jc_info.client_account_id, gc_info.client_account_id) = $1
          AND COALESCE(jc_info.freelancer_account_id, gc_info.freelancer_account_id) = $2
        )
        OR (
          COALESCE(jc_info.client_account_id, gc_info.client_account_id) = $2
          AND COALESCE(jc_info.freelancer_account_id, gc_info.freelancer_account_id) = $1
        )
        OR ($3::uuid IS NOT NULL AND c.contract_id = $3::uuid)
      ORDER BY
        CASE WHEN $3::uuid IS NOT NULL AND c.contract_id = $3::uuid THEN 0 ELSE 1 END,
        c.created_at DESC
      LIMIT 12
      `,
      [byId, forId, linkedContractId]
    )
    : { rows: [] };

  const contractIds = contractResult.rows.map((contract) => contract.contract_id);
  const milestoneResult = contractIds.length
    ? await pool.query(
      `
      SELECT
        contract_milestone_id,
        contract_id,
        index,
        name,
        description,
        status,
        credits,
        no_of_revisions_max,
        deadline_at,
        started_at
      FROM contract_milestones
      WHERE contract_id = ANY($1::uuid[])
      ORDER BY contract_id, index ASC
      `,
      [contractIds]
    )
    : { rows: [] };

  const milestoneIds = milestoneResult.rows.map((milestone) => milestone.contract_milestone_id);
  const transactionResult = await pool.query(
    `
    SELECT
      ct.credit_transaction_id,
      ct.type,
      ct.amount_credits,
      ct.status,
      ct.created_at,
      ct.reference_table,
      ct.reference_id,
      ct.related_dispute_id,
      src_w.type AS source_wallet_type,
      dst_w.type AS destination_wallet_type,
      COALESCE(src_a.display_name, src_u.first_name || ' ' || src_u.last_name, 'Platform') AS source_name,
      src_a.handle AS source_handle,
      COALESCE(dst_a.display_name, dst_u.first_name || ' ' || dst_u.last_name, 'Platform') AS destination_name,
      dst_a.handle AS destination_handle
    FROM credit_transactions ct
    JOIN wallets src_w ON src_w.wallet_id = ct.source_wallet_id
    JOIN wallets dst_w ON dst_w.wallet_id = ct.destination_wallet_id
    LEFT JOIN account_wallets src_aw ON src_aw.wallet_id = src_w.wallet_id
    LEFT JOIN accounts src_a ON src_a.account_id = src_aw.account_id
    LEFT JOIN users src_u ON src_u.account_id = src_a.account_id
    LEFT JOIN account_wallets dst_aw ON dst_aw.wallet_id = dst_w.wallet_id
    LEFT JOIN accounts dst_a ON dst_a.account_id = dst_aw.account_id
    LEFT JOIN users dst_u ON dst_u.account_id = dst_a.account_id
    WHERE ct.related_dispute_id = $1
      OR ($2::uuid IS NOT NULL AND ct.credit_transaction_id = $2::uuid)
      OR (ct.reference_table = 'contracts' AND ct.reference_id = ANY($3::uuid[]))
      OR (ct.reference_table = 'contract_milestones' AND ct.reference_id = ANY($4::uuid[]))
    ORDER BY ct.created_at ASC
    LIMIT 80
    `,
    [
      row.dispute_id,
      row.related_credit_transaction_id || null,
      contractIds,
      milestoneIds,
    ]
  );

  const relatedResult = byId && forId
    ? await pool.query(
      `
      SELECT
        d.dispute_id,
        d.dispute_number,
        d.title,
        d.type,
        d.status,
        d.priority,
        d.description,
        d.visibility,
        d.credit_amount_involved,
        d.opened_at,
        d.sanction_type,
        d.resolution_notes,
        COALESCE(ia.display_name, iu.first_name || ' ' || iu.last_name, 'Disputer') AS initiator_name,
        ia.handle AS initiator_handle,
        COALESCE(ra.display_name, ru.first_name || ' ' || ru.last_name, 'Disputee') AS respondent_name,
        ra.handle AS respondent_handle
      FROM disputes d
      LEFT JOIN accounts ia ON ia.account_id = d.by_account_id
      LEFT JOIN users iu ON iu.account_id = ia.account_id
      LEFT JOIN accounts ra ON ra.account_id = d.for_account_id
      LEFT JOIN users ru ON ru.account_id = ra.account_id
      WHERE d.dispute_id <> $1
        AND d.deleted_at IS NULL
        AND (
          (d.by_account_id = $2 AND d.for_account_id = $3)
          OR (d.by_account_id = $3 AND d.for_account_id = $2)
        )
      ORDER BY d.opened_at DESC NULLS LAST, d.created_at DESC
      LIMIT 20
      `,
      [row.dispute_id, byId, forId]
    )
    : { rows: [] };

  const milestonesByContract = new Map();
  for (const milestone of milestoneResult.rows) {
    const list = milestonesByContract.get(milestone.contract_id) || [];
    list.push({
      id: milestone.contract_milestone_id,
      index: Number(milestone.index || 0),
      name: milestone.name,
      description: milestone.description || null,
      status: milestone.status,
      credits: Number(milestone.credits || 0),
      revisions: Number(milestone.no_of_revisions_max || 0),
      deadlineAt: milestone.deadline_at || null,
      startedAt: milestone.started_at || null,
    });
    milestonesByContract.set(milestone.contract_id, list);
  }

  const contractTitleById = new Map(contractResult.rows.map((contract) => [contract.contract_id, contract.title]));
  const milestoneNameById = new Map(milestoneResult.rows.map((milestone) => [milestone.contract_milestone_id, milestone.name]));

  return {
    contracts: contractResult.rows.map((contract) => ({
      id: contract.contract_id,
      linked: Boolean(linkedContractId && String(contract.contract_id) === String(linkedContractId)),
      title: contract.title,
      contractType: contract.contract_type,
      paymentType: contract.payment_type,
      status: contract.status,
      rateCredits: Number(contract.rate_credits || 0),
      revisionPriceCredits: Number(contract.revision_price_credits || 0),
      startsAt: contract.starts_at || null,
      deadlineAt: contract.deadline_at || null,
      clientName: contract.client_name,
      clientHandle: contract.client_handle || '—',
      freelancerName: contract.freelancer_name,
      freelancerHandle: contract.freelancer_handle || '—',
      milestones: milestonesByContract.get(contract.contract_id) || [],
    })),
    transactions: transactionResult.rows.map((tx) => ({
      id: tx.credit_transaction_id,
      type: tx.type,
      amount: Number(tx.amount_credits || 0),
      status: tx.status,
      createdAt: tx.created_at,
      referenceTable: tx.reference_table || null,
      referenceLabel: tx.reference_table === 'contracts'
        ? contractTitleById.get(tx.reference_id) || 'Contract'
        : tx.reference_table === 'contract_milestones'
          ? milestoneNameById.get(tx.reference_id) || 'Milestone'
          : tx.reference_table || null,
      sourceName: tx.source_name,
      sourceHandle: tx.source_handle || null,
      sourceWallet: walletLabel(tx.source_wallet_type),
      destinationName: tx.destination_name,
      destinationHandle: tx.destination_handle || null,
      destinationWallet: walletLabel(tx.destination_wallet_type),
      tiedToThisDispute: String(tx.related_dispute_id || '') === String(row.dispute_id)
        || String(tx.credit_transaction_id) === String(row.related_credit_transaction_id || ''),
    })),
    relatedDisputes: relatedResult.rows.map((dispute) => ({
      id: dispute.dispute_id,
      number: dispute.dispute_number || null,
      title: dispute.title || 'Dispute',
      type: dispute.type || 'General',
      status: String(dispute.status || 'open').toLowerCase(),
      priority: String(dispute.priority || 'Medium'),
      description: dispute.description || null,
      visibility: Boolean(dispute.visibility),
      creditAmount: Number(dispute.credit_amount_involved || 0),
      openedAt: dispute.opened_at || null,
      sanctionType: dispute.sanction_type || null,
      resolutionNotes: dispute.resolution_notes || null,
      initiatorName: dispute.initiator_name,
      initiatorHandle: dispute.initiator_handle || '—',
      respondentName: dispute.respondent_name,
      respondentHandle: dispute.respondent_handle || '—',
    })),
  };
}

async function getDisputeDetail(disputeId, staffSession = null) {
  const row = await loadDisputeRow(disputeId);
  if (!row) return null;

  const staff = staffSession ? await resolveDisputeStaffId(staffSession) : null;
  const permissions = buildDisputePermissions(row, staff, staffSession);
  const assignableStaff = await fetchAssignableStaffForQueue('disputes', {
    includeStaffId: row.handled_by_staff_id,
  });

  let messages = [];
  let chatId = null;
  let chatAvailable = isMongoReady();
  let caseFile = emptyDisputeCaseFile();

  try {
    caseFile = await loadDisputeCaseFile(row);
  } catch (err) {
    console.error('Error loading dispute case file:', err.message);
  }

  try {
    chatId = await getDisputeChatId(disputeId);
    if (chatId && chatAvailable) {
      messages = await listDisputeMessages(chatId);
    }
  } catch (err) {
    console.error('Error loading dispute chat from MongoDB:', err.message);
    chatAvailable = false;
  }

  return {
    dispute: mapDisputeRow(row),
    caseFile,
    messages,
    chatId,
    chatAvailable,
    permissions,
    assignableQueue: 'disputes',
    assignableStaff,
  };
}

async function addDisputeMessage(disputeId, body, staffSession, options = {}) {
  if (typeof options === 'boolean') {
    options = { isInternal: options };
  }
  if (!isMongoReady()) {
    throw new Error('MongoDB is not connected — cannot send dispute chat messages');
  }

  const staff = await resolveDisputeStaffId(staffSession);
  if (!staff) throw new Error('Could not match your login to a staff profile.');

  const row = await loadDisputeRow(disputeId);
  if (!row) return null;

  const perms = buildDisputePermissions(row, staff, staffSession);
  if (!perms.canReply && !perms.canAct) {
    throw new Error('You do not have permission to reply on this dispute.');
  }

  // Non-handlers may only post staff-visible replies; designated handler publishes.
  const mayPublish = Boolean(perms.canAct);
  let isInternal = Boolean(options.isInternal);
  let audience =
    options.audience ||
    (isInternal
      ? 'staff'
      : options.visibleToPublic
        ? 'public'
        : options.visibleToParties
          ? 'parties'
          : 'staff');

  if (!mayPublish) {
    audience = 'staff';
    isInternal = true;
  }

  const chatId = await ensureDisputeChat(disputeId, row);
  const audiences = mayPublish && Array.isArray(options.audiences)
    ? options.audiences.map((a) => String(a).toLowerCase())
    : ['staff'];
  await createDisputeMessage({
    chatId,
    body,
    senderId: sessionAccountId(staffSession),
    authorName: sessionDisplayName(staffSession) || 'Staff',
    authorType: 'staff',
    authorRole: 'staff',
    audience,
    audiences,
    isInternal,
  });

  const number = row.dispute_number || 'Dispute';
  const visible = Boolean(row.visibility) && audience === 'public';
  await notifyDisputeParties(row, {
    message: visible
      ? `New reply on dispute ${number}.`
      : `New reply on dispute ${number}. It shows in the discussion after staff publish it.`,
    path: visible ? `/disputes/${disputeId}` : '/contracts/disputes',
    excludeAccountId: sessionAccountId(staffSession),
    onlyFiler: !row.visibility,
  });

  await pool.query(`UPDATE disputes SET updated_at = NOW() WHERE dispute_id = $1`, [disputeId]);
  return getDisputeDetail(disputeId, staffSession);
}

async function setDisputeMessageAudience(disputeId, messageId, audience, staffSession) {
  if (!isMongoReady()) {
    throw new Error('MongoDB is not connected — cannot update dispute messages');
  }

  const staff = await resolveDisputeStaffId(staffSession);
  if (!staff) throw new Error('Could not match your login to a staff profile.');

  const row = await loadDisputeRow(disputeId);
  if (!row) return null;

  const perms = buildDisputePermissions(row, staff, staffSession);
  if (!perms.canAct) {
    throw new Error('Assign yourself to this dispute before publishing messages.');
  }

  const chatId = await getDisputeChatId(disputeId);
  if (!chatId) throw new Error('Dispute chat not found.');

  await updateDisputeMessageAudience(chatId, messageId, audience);
  await pool.query(`UPDATE disputes SET updated_at = NOW() WHERE dispute_id = $1`, [disputeId]);
  if (String(audience).toLowerCase() === 'public') {
    const number = row.dispute_number || 'Dispute';
    await notifyDisputeParties(row, {
      message: `A reply on dispute ${number} is now public.`,
      path: `/disputes/${disputeId}`,
    });
  }
  return getDisputeDetail(disputeId, staffSession);
}

function disputeDecisionError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function decisionReason(patch) {
  const reason = String(patch?.reason || patch?.resolution_notes || '').trim();
  if (!reason) throw disputeDecisionError('Invalid ban: a reason is required.');
  if (reason.length > 2000) throw disputeDecisionError('Invalid ban: the reason is too long.');
  return reason;
}

async function postDisputeDecisionMessage(row, staffSession, body) {
  if (!isMongoReady()) {
    throw new Error('MongoDB is not connected — cannot post the decision in the discussion.');
  }
  const chatId = await ensureDisputeChat(row.dispute_id, row);
  await createDisputeMessage({
    chatId,
    body,
    senderId: sessionAccountId(staffSession),
    authorName: sessionDisplayName(staffSession) || 'Staff',
    authorType: 'staff',
    authorRole: 'staff',
    audience: 'public',
    audiences: ['public', 'parties'],
    isInternal: false,
  });
  const number = row.dispute_number || 'Dispute';
  await notifyDisputeParties(row, {
    message: `New reply on dispute ${number}.`,
    path: `/disputes/${row.dispute_id}`,
    excludeAccountId: sessionAccountId(staffSession),
  });
}

async function convictDispute(disputeId, row, patch, staff, staffSession, perms) {
  if (!perms.canAct) {
    throw disputeDecisionError('Assign yourself to this dispute before you can ban.');
  }
  const reason = decisionReason(patch);
  const accountId = row.for_account_id;
  if (!accountId) {
    throw disputeDecisionError('Invalid ban: this dispute has no respondent to sanction.');
  }
  if (String(row.sanction_type || '').toLowerCase() === 'ban') {
    throw disputeDecisionError('Cannot ban again. This dispute already ended in a permanent ban. Reopen it first.');
  }

  const handle = row.respondent_handle ? `@${row.respondent_handle}` : 'the respondent';
  const name = row.respondent_name || 'The respondent';
  const message = `${name} (${handle}) has been permanently banned.\nReason: ${reason}`;

  const { updateAccountStatus } = require('./AdminUserTeamRepositories');
  await updateAccountStatus(accountId, 'ban', staff.staff_id, {
    reason,
    duration: 'permanent',
    punishmentId: 'ban_dispute_conviction',
    disputeId: row.dispute_id,
    disputeNumber: row.dispute_number || null,
  });

  await pool.query(
    `
    UPDATE disputes
    SET status = 'closed',
        visibility = TRUE,
        sanction_type = 'ban',
        resolution_notes = $1,
        resolved_at = NOW(),
        updated_at = NOW()
    WHERE dispute_id = $2
    `,
    [reason, disputeId]
  );

  try {
    await postDisputeDecisionMessage(row, staffSession, message);
  } catch (err) {
    const wrapped = new Error(
      `${err.message || 'Could not post the discussion message.'} The account was still banned and the dispute was closed.`
    );
    wrapped.statusCode = /MongoDB/i.test(err.message || '') ? 503 : 500;
    throw wrapped;
  }

  await recordAccountActivity({
    accountId,
    action: `Dispute ${row.dispute_number || disputeId} closed with a permanent ban`,
    eventCode: 'DISPUTE_SANCTIONED',
    referenceTable: 'disputes',
    referencePrefix: 'DIS',
    referenceId: disputeId,
    actorStaffId: staff.staff_id,
    metadata: { status: 'closed', sanctionType: 'ban', reason },
  });

  return getDisputeDetail(disputeId, staffSession);
}

async function reopenDispute(disputeId, row, staff, staffSession, perms) {
  if (!perms.canAct) {
    throw disputeDecisionError('Assign yourself to this dispute before you can reopen it.');
  }
  if (String(row.status || '').toLowerCase() !== 'closed') {
    throw disputeDecisionError('Cannot reopen a dispute that is not closed.');
  }

  await pool.query(
    `
    UPDATE disputes
    SET status = 'under_review',
        resolved_at = NULL,
        updated_at = NOW()
    WHERE dispute_id = $1
    `,
    [disputeId]
  );

  const banned = String(row.sanction_type || '').toLowerCase() === 'ban';
  const message = banned
    ? 'This dispute has been reopened for appeal. The permanent ban stays in place until a staff member lifts it.'
    : 'This dispute has been reopened.';

  try {
    await postDisputeDecisionMessage(row, staffSession, message);
  } catch (err) {
    console.error('Dispute reopened without a discussion message:', err.message);
  }

  await recordAccountActivity({
    accountId: row.for_account_id || row.by_account_id,
    action: `Dispute ${row.dispute_number || disputeId} reopened`,
    eventCode: 'DISPUTE_REOPENED',
    referenceTable: 'disputes',
    referencePrefix: 'DIS',
    referenceId: disputeId,
    actorStaffId: staff.staff_id,
    metadata: { status: 'under_review', sanctionType: row.sanction_type || null },
  });

  return getDisputeDetail(disputeId, staffSession);
}

const REPORT_DECISIONS = new Set(['deny', 'sanction']);

function reportDecisionError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function notifyReportReporter(row, message) {
  if (!row?.by_account_id) return;
  try {
    const notification = await createNotificationServices({
      account_id: row.by_account_id,
      message,
      is_read: false,
      reference_table: 'reports',
      reference_prefix: 'RPT',
      reference_path: '/notifications',
      reference_id: row.report_id,
    });
    const { getIo } = require('../lib/WebSocket');
    const io = getIo();
    if (io && notification) io.to(String(row.by_account_id)).emit('notification', notification);
  } catch (error) {
    console.error('Report decision notification failed:', error.message);
  }
}

async function applyReportSanction(row, patch, staffId) {
  const accountId = row.for_account_id;
  if (!accountId) throw reportDecisionError('This report is not tied to an account');
  const reason = String(patch?.reason || '').trim();
  if (!reason) throw reportDecisionError('A sanction reason is required');
  const sanctionType = String(patch?.sanctionType || patch?.sanction_type || 'warning').toLowerCase();
  const days = patch?.days;
  const { warnAccount, updateAccountStatus } = require('./AdminUserTeamRepositories');

  if (sanctionType === 'warning' || sanctionType === 'warn') {
    return warnAccount(accountId, { warningId: 'staff_follow_up', reason, days }, staffId);
  }
  if (sanctionType === 'suspend' || sanctionType === 'suspended') {
    if (days == null || days === '') throw reportDecisionError('Choose how many days the suspension lasts');
    return updateAccountStatus(accountId, 'suspend', staffId, {
      reason,
      duration: 'temporary',
      days,
      skipPunishmentCatalog: true,
    });
  }
  if (sanctionType === 'ban' || sanctionType === 'banned') {
    return updateAccountStatus(accountId, 'ban', staffId, {
      reason,
      duration: 'permanent',
      skipPunishmentCatalog: true,
    });
  }
  throw reportDecisionError('Choose a warning, suspension, or ban');
}

async function decideReport(reportId, action, patch, staffSession) {
  const staff = await resolveDisputeStaffId(staffSession);
  if (!staff) throw reportDecisionError('Could not match your login to a staff profile.', 403);

  const fresh = await pool.query(
    `SELECT * FROM reports WHERE report_id = $1 AND deleted_at IS NULL`,
    [reportId]
  );
  if (!fresh.rows.length) return null;
  const row = fresh.rows[0];
  const perms = buildReportPermissions(row, staff, staffSession);
  if (!perms.isAssignee) {
    throw reportDecisionError('Claim this report before you decide it.', 403);
  }
  const currentStatus = String(row.status || '').toLowerCase();
  if (CLOSED_REPORT_STATUSES.includes(currentStatus)) {
    throw reportDecisionError('This report is already closed.');
  }
  if (action !== 'deny' && action !== 'sanction') {
    throw reportDecisionError('Choose sanction or deny.', 400);
  }

  let nextStatus = 'denied';
  let violationId = null;
  if (action === 'sanction') {
    const sanction = await applyReportSanction(row, patch, staff.staff_id);
    violationId = sanction?.violationId || null;
    nextStatus = 'sanctioned';
  }

  await pool.query(
    `UPDATE reports
     SET status = $1,
         violation_id = COALESCE($2, violation_id),
         updated_at = NOW()
     WHERE report_id = $3 AND deleted_at IS NULL`,
    [nextStatus, violationId, reportId]
  );

  await recordAccountActivity({
    accountId: row.for_account_id || row.by_account_id,
    action: `Report ${row.report_number || reportId} ${nextStatus}`,
    eventCode: action === 'sanction' ? 'REPORT_SANCTIONED' : 'REPORT_STATUS_CHANGED',
    referenceTable: 'reports',
    referencePrefix: 'RPT',
    referenceId: reportId,
    actorStaffId: staff.staff_id,
    metadata: {
      type: row.type,
      previousStatus: row.status,
      status: nextStatus,
      sanctionType: action === 'sanction' ? patch?.sanctionType || 'warning' : null,
    },
  });

  if (action === 'sanction') {
    const number = row.report_number ? ` ${row.report_number}` : '';
    await notifyReportReporter(
      row,
      `Thanks for your report${number}. The reported account has been sanctioned.`
    );
  }

  return getReportDetail(reportId, staffSession);
}

async function updateReport(reportId, patch, staffSession = null) {
  const action = String(patch?.action || '').toLowerCase().trim();
  if (REPORT_DECISIONS.has(action)) {
    return decideReport(reportId, action, patch, staffSession);
  }
  if (action === 'self_assign') {
    const staff = await resolveDisputeStaffId(staffSession);
    if (!staff) throw new Error('Could not match your login to a staff profile.');

    const fresh = await pool.query(
      `SELECT assigned_staff_id, for_account_id, by_account_id, report_number, type, status
       FROM reports WHERE report_id = $1 AND deleted_at IS NULL`,
      [reportId]
    );
    if (!fresh.rows.length) return null;
    const perms = buildReportPermissions(fresh.rows[0], staff, staffSession);
    if (!perms.canAssignMyself && !perms.canSelfAssign) {
      throw new Error('You cannot assign this report to yourself.');
    }
    // Reports are not release-locked like disputes — Admin may take over anytime.
    if (fresh.rows[0].assigned_staff_id && !perms.isAdmin && !perms.isAssignee) {
      throw new Error('This report already has a handler. Ask Admin to reassign it.');
    }

    await pool.query(
      `UPDATE reports
       SET assigned_staff_id = $1, updated_at = NOW()
       WHERE report_id = $2 AND deleted_at IS NULL`,
      [staff.staff_id, reportId]
    );
    const row = fresh.rows[0];
    await recordAccountActivity({
      accountId: row.for_account_id || row.by_account_id,
      action: `Report ${row.report_number || reportId} assigned`,
      eventCode: 'REPORT_ASSIGNED',
      referenceTable: 'reports',
      referencePrefix: 'RPT',
      referenceId: reportId,
      actorStaffId: staff.staff_id,
      metadata: { type: row.type, status: row.status },
    });
    return getReportDetail(reportId, staffSession);
  }

  // Release is dispute-only — keep API for old clients but treat as clear-assignee for reports.
  if (action === 'release' || action === 'self_unassign') {
    const staff = await resolveDisputeStaffId(staffSession);
    if (!staff) throw new Error('Could not match your login to a staff profile.');

    const fresh = await pool.query(
      `SELECT assigned_staff_id, for_account_id, by_account_id, report_number
       FROM reports WHERE report_id = $1 AND deleted_at IS NULL`,
      [reportId]
    );
    if (!fresh.rows.length) return null;
    const perms = buildReportPermissions(fresh.rows[0], staff, staffSession);
    if (!perms.isAssignee) {
      throw new Error('Claim this report before you change it.');
    }

    await pool.query(
      `UPDATE reports
       SET assigned_staff_id = NULL, updated_at = NOW()
       WHERE report_id = $1 AND deleted_at IS NULL`,
      [reportId]
    );
    const row = fresh.rows[0];
    await recordAccountActivity({
      accountId: row.for_account_id || row.by_account_id,
      action: `Report ${row.report_number || reportId} unassigned`,
      eventCode: 'REPORT_UNASSIGNED',
      referenceTable: 'reports',
      referencePrefix: 'RPT',
      referenceId: reportId,
      actorStaffId: staff.staff_id,
    });
    return getReportDetail(reportId, staffSession);
  }

  const fresh = await pool.query(
    `SELECT assigned_staff_id, for_account_id, by_account_id, report_number, type, status
     FROM reports WHERE report_id = $1 AND deleted_at IS NULL`,
    [reportId]
  );
  if (!fresh.rows.length) return null;
  const currentAssignee = fresh.rows[0].assigned_staff_id;
  const staffForAssign = staffSession ? await resolveDisputeStaffId(staffSession) : null;
  const reportPerms = buildReportPermissions(fresh.rows[0], staffForAssign, staffSession);
  const wantsChange = ['status', 'priority', 'assigned_staff_id'].some((key) => patch[key] !== undefined);
  if (wantsChange && !reportPerms.isAssignee) {
    throw reportDecisionError('Claim this report before you change it.', 403);
  }

  if (patch.assigned_staff_id !== undefined) {
    const nextNorm = normalizeStaffId(
      patch.assigned_staff_id === null || patch.assigned_staff_id === ''
        ? null
        : patch.assigned_staff_id
    );
    const curNorm = normalizeStaffId(currentAssignee);
    if (curNorm && nextNorm !== curNorm && !reportPerms.canAssignOthers && !reportPerms.isAssignee) {
      throw new Error('This report already has a handler. Ask Admin to reassign it.');
    }
    if (nextNorm && nextNorm !== curNorm && (!curNorm || reportPerms.canAssignOthers || reportPerms.isAssignee || reportPerms.isAdmin)) {
      const typeRow = await pool.query(
        `SELECT target_type FROM reports WHERE report_id = $1 AND deleted_at IS NULL`,
        [reportId]
      );
      const queueKey = inferReportAssignableQueue(typeRow.rows[0]?.target_type);
      await assertStaffAssignableToQueue(patch.assigned_staff_id, queueKey);
    }
  }

  const allowed = ['status', 'priority', 'assigned_staff_id'];
  const sets = [];
  const values = [];
  let idx = 1;
  const before = fresh.rows[0];

  for (const key of allowed) {
    if (patch[key] !== undefined) {
      if (key === 'assigned_staff_id' && currentAssignee) {
        const nextNorm = normalizeStaffId(
          patch.assigned_staff_id === null || patch.assigned_staff_id === ''
            ? null
            : patch.assigned_staff_id
        );
        if (nextNorm === normalizeStaffId(currentAssignee)) continue;
      }
      sets.push(`${key} = $${idx}`);
      values.push(patch[key]);
      idx += 1;
    }
  }

  if (!sets.length) return getReportDetail(reportId, staffSession);

  sets.push(`updated_at = NOW()`);
  values.push(reportId);

  await pool.query(`UPDATE reports SET ${sets.join(', ')} WHERE report_id = $${idx}`, values);

  const staffId = staffForAssign?.staff_id || sessionStaffId(staffSession);
  const statusChanged = patch.status !== undefined && String(patch.status) !== String(before.status);
  const assigneeChanged = patch.assigned_staff_id !== undefined;
  if (statusChanged || assigneeChanged) {
    await recordAccountActivity({
      accountId: before.for_account_id || before.by_account_id,
      action: statusChanged
        ? `Report ${before.report_number || reportId} set to ${patch.status}`
        : `Report ${before.report_number || reportId} assignment updated`,
      eventCode: statusChanged ? 'REPORT_STATUS_CHANGED' : 'REPORT_ASSIGNED',
      referenceTable: 'reports',
      referencePrefix: 'RPT',
      referenceId: reportId,
      actorStaffId: staffId,
      metadata: {
        type: before.type,
        previousStatus: before.status,
        status: patch.status || before.status,
      },
    });
  }

  return getReportDetail(reportId, staffSession);
}

function buildReportPermissions(row, staff, session = null) {
  const staffId =
    normalizeStaffId(staff?.staff_id) || normalizeStaffId(sessionStaffId(session));
  const role = staff?.role || session?.role || null;
  const assigneeId = normalizeStaffId(row?.assigned_staff_id);
  const isAssignee = Boolean(staffId && assigneeId && staffId === assigneeId);
  const isAdmin = isAdminRole(role);
  const unassigned = !assigneeId;
  const designated = isQueueHandlerRole(role);

  return {
    staffId: staff?.staff_id != null ? String(staff.staff_id) : sessionStaffId(session),
    role,
    isAssignee,
    isAdmin,
    canView: true,
    canAct: Boolean(isAssignee),
    canAssignOthers: Boolean(isAdmin),
    canSelfAssign: Boolean(staffId && designated && !isAssignee && (unassigned || isAdmin)),
    canAssignMyself: Boolean(staffId && designated && !isAssignee && (unassigned || isAdmin)),
    /** Release case is disputes-only; reports never expose it. */
    canRelease: false,
  };
}

async function getReportDetail(reportId, staffSession = null, options = {}) {
  const reportResult = await pool.query(
    `
    SELECT
      r.*,
      COALESCE(fa.display_name, fu.first_name || ' ' || fu.last_name, r.target_id) AS target_name,
      fa.handle AS target_handle,
      COALESCE(repa.display_name, repu.first_name || ' ' || repu.last_name) AS reporter_name,
      repa.handle AS reporter_handle,
      COALESCE(sa.display_name, st.first_name || ' ' || st.last_name) AS assignee_name,
      st.role AS assignee_role
    FROM reports r
    LEFT JOIN accounts fa ON fa.account_id = r.for_account_id
    LEFT JOIN users fu ON fu.account_id = fa.account_id
    LEFT JOIN accounts repa ON repa.account_id = r.by_account_id
    LEFT JOIN users repu ON repu.account_id = repa.account_id
    LEFT JOIN staff st ON st.staff_id = r.assigned_staff_id
    LEFT JOIN accounts sa ON sa.account_id = st.account_id
    WHERE r.report_id = $1 AND r.deleted_at IS NULL
    `,
    [reportId]
  );
  if (!reportResult.rows.length) return null;

  const row = reportResult.rows[0];
  const staff = staffSession ? await resolveDisputeStaffId(staffSession) : null;
  const queueKey = options.assignableQueue || inferReportAssignableQueue(row.target_type);
  const assignableStaff = await fetchAssignableStaffForQueue(queueKey, {
    includeStaffId: row.assigned_staff_id,
  });

  const subject = await buildReportSubject(row);
  return {
    report: mapReportRow({
      ...row,
      reporter_name: row.reporter_name,
      reporter_handle: row.reporter_handle,
      assignee_name: row.assignee_name,
    }),
    subject,
    permissions: buildReportPermissions(row, staff, staffSession),
    assignableQueue: normalizeQueueKey(queueKey),
    assignableStaff,
  };
}

async function safeTicketRows(sql, params) {
  try {
    const result = await pool.query(sql, params);
    return result.rows.map((row) => ({ id: String(row.id), label: String(row.label || row.id) }));
  } catch (err) {
    console.warn('Ticket picker query skipped:', err.message);
    return [];
  }
}

function clipContext(value, max = 500) {
  const text = value == null ? '' : String(value).trim();
  if (!text) return '';
  return text.slice(0, max);
}

function readJsonColumn(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
}

function mapFormAnswers(raw) {
  const list = readJsonColumn(raw, []);
  if (!Array.isArray(list)) return [];
  return list.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const key = String(item.key || '').trim();
    const value = item.value == null ? '' : String(item.value);
    if (!key || !value) return [];
    const answer = {
      key,
      label: String(item.label || key),
      value,
    };
    if (item.id) answer.id = String(item.id);
    return [answer];
  });
}

function mapSubmissionContext(raw) {
  const source = readJsonColumn(raw, {});
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
  const context = {};
  for (const key of ['accountId', 'username', 'email', 'plan', 'submittedAt', 'browser', 'device', 'page']) {
    const value = clipContext(source[key]);
    if (value) context[key] = value;
  }
  return Object.keys(context).length ? context : null;
}

const PICKER_LISTS = {
  project: 'projects',
  listing: 'listings',
  order: 'orders',
  contract: 'contracts',
  job: 'jobs',
};

async function resolveFormAnswers(accountId, type, rows) {
  const { fieldsForType } = require('../lib/TicketFormFields');
  const definitions = new Map(fieldsForType(type).map((field) => [field.key, field]));
  const needsPicker = rows.some((row) => definitions.get(row.key)?.picker);
  const pickers = needsPicker && accountId ? await getTicketPickers(accountId) : null;
  return rows.map((row) => {
    const field = definitions.get(row.key);
    const listName = field?.picker ? PICKER_LISTS[field.picker] : null;
    if (!listName || !pickers) return row;
    const options = pickers[listName] || [];
    const match = options.find((option) => option.id === row.value)
      || options.find((option) => option.label === row.value);
    if (match) {
      return { ...row, value: String(match.label || match.id).slice(0, 2000), id: match.id };
    }
    if (TICKET_ACCOUNT_UUID.test(row.value)) {
      throw ticketError(`Choose a ${field.label.toLowerCase()} from your account`, 400);
    }
    return row;
  });
}

async function buildSubmissionContext(accountId, clientContext) {
  const profile = await pool.query(
    `
    SELECT a.handle, u.email_address, COALESCE(p.name, 'Free') AS subscription_plan
    FROM accounts a
    LEFT JOIN users u ON u.account_id = a.account_id
    LEFT JOIN LATERAL (
      SELECT pl.name
      FROM subscriptions s
      INNER JOIN plans pl ON pl.plan_id = s.plan_id
      WHERE s.user_id = u.user_id
      ORDER BY s.created_at DESC
      LIMIT 1
    ) p ON TRUE
    WHERE a.account_id = $1
    `,
    [accountId]
  ).catch(() => ({ rows: [] }));
  const row = profile.rows[0] || {};
  const context = {};
  const assign = (key, value, max = 500) => {
    const text = clipContext(value, max);
    if (text) context[key] = text;
  };
  assign('accountId', accountId, 80);
  assign('username', row.handle);
  assign('email', row.email_address);
  assign('plan', row.subscription_plan || 'Free', 80);
  assign('submittedAt', new Date().toISOString(), 40);
  assign('browser', clientContext?.browser);
  assign('device', clientContext?.device);
  assign('page', clientContext?.page);
  return context;
}

async function findAccountByEmailOrUsername(identifier) {
  const needle = String(identifier || '').trim();
  if (!needle) return null;
  const result = await pool.query(
    `
    SELECT a.account_id
    FROM accounts a
    LEFT JOIN users u ON u.account_id = a.account_id
    WHERE a.deleted_at IS NULL
      AND (
        LOWER(u.email_address) = LOWER($1)
        OR LOWER(a.handle) = LOWER($1)
      )
    LIMIT 1
    `,
    [needle]
  );
  return result.rows[0]?.account_id || null;
}

async function getTicketPickers(accountId) {
  const [projects, listings, orders, contracts, jobs] = await Promise.all([
    safeTicketRows(
      `
      SELECT p.project_id AS id, p.name AS label
      FROM projects p
      JOIN project_members pm ON pm.project_id = p.project_id AND pm.deleted_at IS NULL
      JOIN users u ON u.user_id = pm.user_id
      WHERE u.account_id = $1 AND p.deleted_at IS NULL
      ORDER BY p.updated_at DESC
      LIMIT 50
      `,
      [accountId]
    ),
    safeTicketRows(
      `
      SELECT listing_id AS id, title AS label
      FROM marketplace_listings
      WHERE submitted_by_account_id = $1
      ORDER BY created_at DESC
      LIMIT 50
      `,
      [accountId]
    ),
    safeTicketRows(
      `
      SELECT ma.market_asset_id AS id, ma.name AS label
      FROM market_asset_licenses uma
      JOIN users u ON u.user_id = uma.buyer_user_id
      JOIN market_assets ma ON ma.market_asset_id = uma.market_asset_id
      WHERE u.account_id = $1 AND uma.deleted_at IS NULL
      GROUP BY ma.market_asset_id, ma.name
      ORDER BY MAX(uma.purchased_at) DESC, ma.market_asset_id DESC
      LIMIT 50
      `,
      [accountId]
    ),
    safeTicketRows(
      `
      SELECT c.contract_id AS id, COALESCE(j.title, c.contract_id::text) AS label
      FROM contracts c
      LEFT JOIN job_contracts jc ON jc.contract_id = c.contract_id
      LEFT JOIN proposals p ON p.proposal_id = jc.proposal_id
      LEFT JOIN jobs j ON j.job_id = p.job_id
      WHERE j.client_account_id = $1 OR p.freelancer_account_id = $1
      ORDER BY c.created_at DESC
      LIMIT 50
      `,
      [accountId]
    ),
    safeTicketRows(
      `
      SELECT id, label FROM (
        SELECT job_id AS id, title AS label, created_at FROM jobs WHERE client_account_id = $1
        UNION ALL
        SELECT gig_id AS id, title AS label, created_at FROM gigs WHERE freelancer_account_id = $1
      ) items
      ORDER BY created_at DESC
      LIMIT 50
      `,
      [accountId]
    ),
  ]);
  return { projects, listings, orders, contracts, jobs };
}

const APPEAL_TICKET_TYPE = 'Appeal an account penalty';
const APPEAL_DECISIONS = {
  accept: 'accepted',
  accepted: 'accepted',
  deny: 'denied',
  denied: 'denied',
  deny_permanent: 'denied_permanent',
  denied_permanent: 'denied_permanent',
  permanent: 'denied_permanent',
};

async function assertCanFileAppeal(accountId) {
  const hold = await pool.query(
    `SELECT permanently_denied, blocked_until
     FROM account_appeal_holds
     WHERE account_id = $1`,
    [accountId]
  );
  const row = hold.rows[0];
  if (row?.permanently_denied) {
    throw ticketError('This account cannot submit another appeal.', 403);
  }
  if (row?.blocked_until && new Date(row.blocked_until).getTime() > Date.now()) {
    const when = new Date(row.blocked_until).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    throw ticketError(`You can submit another appeal on ${when}.`, 403);
  }
  const open = await pool.query(
    `SELECT ticket_id
     FROM tickets
     WHERE account_id = $1
       AND deleted_at IS NULL
       AND type = $2
       AND status NOT IN ('Closed', 'Resolved')
     LIMIT 1`,
    [accountId, APPEAL_TICKET_TYPE]
  );
  if (open.rows.length) {
    throw ticketError('You already have an open appeal. Reply on that ticket instead.', 409);
  }
}

async function decideTicketAppeal(ticketId, decision, staffSession) {
  if (!isStaffSession(staffSession)) throw ticketError('Only staff can decide an appeal', 403);
  const normalized = APPEAL_DECISIONS[String(decision || '').toLowerCase()];
  if (!normalized) throw ticketError('Choose accept, deny, or deny permanently', 400);

  const current = await pool.query(
    `SELECT ticket_id, ticket_number, type, account_id, appeal_decision
     FROM tickets
     WHERE ticket_id = $1 AND deleted_at IS NULL`,
    [ticketId]
  );
  if (!current.rows.length) return null;
  const ticket = current.rows[0];
  if (ticket.type !== APPEAL_TICKET_TYPE) throw ticketError('This ticket is not an account appeal', 400);
  if (ticket.appeal_decision) throw ticketError('This appeal already has a decision', 409);
  if (!ticket.account_id) throw ticketError('This appeal has no account to update', 400);

  const staff = await resolveDisputeStaffId(staffSession);
  const staffId = staff?.staff_id || null;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (normalized === 'accepted') {
      await client.query(
        `UPDATE accounts
         SET ban_ends_at = CASE WHEN LOWER(status) = 'banned' THEN NOW() + INTERVAL '24 hours' ELSE ban_ends_at END,
             lock_ends_at = CASE WHEN LOWER(status) = 'locked' THEN NOW() + INTERVAL '24 hours' ELSE lock_ends_at END,
             suspension_ends_at = CASE WHEN LOWER(status) = 'suspended' THEN NOW() + INTERVAL '24 hours' ELSE suspension_ends_at END
         WHERE account_id = $1`,
        [ticket.account_id]
      );
    }
    const hold = normalized === 'denied_permanent'
      ? { decision: 'denied_permanent', permanent: true }
      : { decision: 'accepted', permanent: false };
    if (normalized === 'denied') {
      await client.query(
        `INSERT INTO account_appeal_holds (
           account_id, decision, blocked_until, permanently_denied, ticket_id, staff_id, decided_at
         ) VALUES ($1, 'denied', NOW() + INTERVAL '12 months', FALSE, $2, $3, NOW())
         ON CONFLICT (account_id) DO UPDATE
           SET decision = 'denied',
               blocked_until = NOW() + INTERVAL '12 months',
               permanently_denied = FALSE,
               ticket_id = EXCLUDED.ticket_id,
               staff_id = EXCLUDED.staff_id,
               decided_at = NOW()`,
        [ticket.account_id, ticket.ticket_id, staffId]
      );
    } else {
      await client.query(
        `INSERT INTO account_appeal_holds (
           account_id, decision, blocked_until, permanently_denied, ticket_id, staff_id, decided_at
         ) VALUES ($1, $2, NULL, $3, $4, $5, NOW())
         ON CONFLICT (account_id) DO UPDATE
           SET decision = EXCLUDED.decision,
               blocked_until = NULL,
               permanently_denied = EXCLUDED.permanently_denied,
               ticket_id = EXCLUDED.ticket_id,
               staff_id = EXCLUDED.staff_id,
               decided_at = NOW()`,
        [ticket.account_id, hold.decision, hold.permanent, ticket.ticket_id, staffId]
      );
    }
    await client.query(
      `UPDATE tickets
       SET status = 'Closed',
           resolved_at = COALESCE(resolved_at, NOW()),
           updated_at = NOW(),
           scheduled_close_at = NULL,
           appeal_decision = $2,
           appeal_decided_at = NOW()
       WHERE ticket_id = $1`,
      [ticket.ticket_id, normalized]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  const reason = normalized === 'accepted'
    ? 'appeal_accepted'
    : normalized === 'denied'
      ? 'appeal_denied'
      : 'appeal_denied_permanent';
  const action = normalized === 'accepted'
    ? 'Appeal accepted. Penalty ends in 24 hours.'
    : normalized === 'denied'
      ? 'Appeal denied. Next appeal is available in 12 months.'
      : 'Appeal denied permanently.';
  await recordTicketEvent({
    ticketId: ticket.ticket_id,
    eventType: 'status',
    summary: action,
    actorStaffId: staffId,
  }).catch((error) => {
    console.error('Appeal decision timeline failed:', error.message);
  });
  await recordAccountActivity({
    accountId: ticket.account_id,
    action,
    eventCode: 'APPEAL_DECISION',
    referenceTable: 'tickets',
    referencePrefix: 'TICKET',
    referenceId: ticket.ticket_id,
    actorStaffId: staffId,
    metadata: { decision: normalized, ticketNumber: ticket.ticket_number },
  });
  await saveTicketCloseTranscript(ticket.ticket_id, {
    reason,
    actorStaffId: staffId,
    actorAccountId: sessionAccountId(staffSession),
  }).catch((error) => {
    console.error('Appeal transcript failed:', error.message);
  });
  await notifyTicketClosed({
    ticketId: ticket.ticket_id,
    ticketNumber: ticket.ticket_number,
    requesterAccountId: ticket.account_id,
    reason,
    staffSession,
  }).catch((error) => {
    console.error('Appeal close notice failed:', error.message);
  });

  if (normalized === 'accepted') {
    try {
      const { getAccountAccess } = require('../lib/AccountRestriction');
      const restriction = await getAccountAccess(ticket.account_id);
      const { getIo } = require('../lib/WebSocket');
      const io = getIo();
      if (io) {
        io.to(String(ticket.account_id)).emit('account:status_changed', {
          accountId: ticket.account_id,
          status: restriction?.status,
          code: restriction?.code || null,
          message: 'Your appeal was accepted. The penalty ends in 24 hours.',
          restriction,
        });
      }
    } catch (error) {
      console.warn('Appeal acceptance broadcast failed:', error.message);
    }
  }

  return getTicketDetail(ticketId, staffSession);
}

module.exports = {
  getTicketsOverview,
  getTicketDetail,
  listParticipantTicketIds,
  searchTicketParticipants,
  addTicketParticipant,
  removeTicketParticipant,
  respondTicketInvite,
  getTicketCatalog,
  createSupportTicket,
  createStaffTicketForAccount,
  findAccountByEmailOrUsername,
  getTicketPickers,
  nextTicketNumber,
  nextDisputeNumber,
  updateTicket,
  autoCloseInactiveTickets,
  scheduleTicketClose,
  cancelScheduledTicketClose,
  closeScheduledTickets,
  generateTicketTranscript,
  assertCanFileAppeal,
  decideTicketAppeal,
  addTicketMessage,
  updateTicketMessage,
  deleteTicketMessage,
  updateDispute,
  getDisputeDetail,
  addDisputeMessage,
  setDisputeMessageAudience,
  fetchDisputesList,
  fetchReportsList,
  updateReport,
  getReportDetail,
  fetchStaffWorkload,
};
