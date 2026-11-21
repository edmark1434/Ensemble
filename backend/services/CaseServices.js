/**
 * Cases: a member's support tickets and disputes, in one place.
 *
 * Every member view (the Cases page, the appeal page, the case bar, the sidebar badge) shows
 * what `buildTicketAccess` / `buildDisputeAccess` return instead of re-deriving the rules.
 * Those rules mirror what the write paths enforce:
 *  - `postMyTicketMessage` + `addTicketMessage` (closed tickets, appeal-only standing),
 *  - `postPublicDisputeComment` (closed, private and not the filer, limited disputee view),
 *  - `rejectRestrictedAccount` / `rejectSuspendedWrite` (banned and locked members may not
 *    post dispute replies or ratings; suspended members may not write outside the appeal).
 * Change a rule there and here together, so every view (and the banned/locked appeal page)
 * keeps telling the truth.
 */
const CASES_PATH = '/support/cases';

const TICKET_PENALTY_REASON = 'While this penalty is active you can only reply on your appeal ticket.';
const DISPUTE_PENALTY_REASON = 'While this penalty is active, disputes are read-only. You can still follow them here.';

const STAFF_MEMBER_ROLES = new Set(['admin', 'staff', 'moderator']);

function casePath(kind, id) {
  return `${CASES_PATH}?${kind}=${encodeURIComponent(String(id))}`;
}

/** What a standing allows on cases. `access` is `req.accountAccess` (or a status-derived stand-in). */
function caseStanding(access) {
  const { appealTicketsOnly } = require('../lib/AccountRestriction');
  return {
    // Banned, locked and suspended members may only open or answer an appeal ticket, and may
    // not post dispute replies or ratings (outside the appeal allowlist / suspended writes).
    appealOnly: appealTicketsOnly(access),
  };
}

/** Stand-in standing from `accounts.status`, for live updates (see `loadAccountStatuses`). */
function caseStandingFromStatus(row) {
  const status = String(row?.status || '').toLowerCase();
  const member = String(row?.type || '').toLowerCase() === 'user';
  return caseStanding({
    banned: member && status === 'banned',
    locked: member && status === 'locked',
    suspended: status === 'suspended',
  });
}

function toTime(value) {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

/**
 * What this member may do on one ticket, and whether it is waiting on them.
 * @param {object} row ticket row (`tickets` columns)
 * @param {{ accountId: string, standing: ReturnType<typeof caseStanding> }} viewer
 */
function buildTicketAccess(row, { accountId, standing }) {
  const { normalizeTicketStatus, isClosedStatus } = require('../lib/TicketEnums');
  const { APPEAL_TICKET_TYPE } = require('../lib/AccountRestriction');
  const status = normalizeTicketStatus(row.status);
  const closed = isClosedStatus(status);
  const requester = Boolean(accountId) && String(row.account_id) === String(accountId);
  const appeal = row.type === APPEAL_TICKET_TYPE;

  let readOnlyReason = null;
  if (closed) readOnlyReason = 'This ticket is closed. You can still read it.';
  else if (standing.appealOnly && !appeal) readOnlyReason = TICKET_PENALTY_REASON;
  const canReply = !readOnlyReason;

  const lastAuthor = String(row.last_message_author_type || '').toLowerCase();
  const needsYou = canReply && lastAuthor === 'staff';

  return {
    kind: 'ticket',
    id: String(row.ticket_id),
    number: row.ticket_number || null,
    status,
    closed,
    visibility: null,
    viewerRole: requester ? 'requester' : 'participant',
    canReply,
    readOnlyReason,
    replyHint: canReply ? 'Support and anyone added to this ticket can read your reply.' : null,
    // Rating is a write that only the requester may send once the ticket is closed.
    canRate:
      closed && requester && (row.satisfaction_score === null || row.satisfaction_score === undefined) && !standing.appealOnly,
    needsYou,
    attention: needsYou ? 'Support replied and is waiting for you.' : null,
    stage: closed ? 'closed' : needsYou ? 'waiting_on_you' : 'with_support',
    stageLabel: closed ? 'Closed' : needsYou ? 'Waiting for you' : 'With support',
    publicPath: null,
    path: casePath('ticket', row.ticket_id),
  };
}

const DISPUTE_STAGE_LABELS = {
  pending_review: 'Waiting for staff review',
  open: 'Open',
  awaiting_response: 'Awaiting a response',
  under_review: 'Staff are deciding',
  closed: 'Closed',
};

/** Mine vs staff activity in the messages this member can see. */
function disputeActivity(messages, accountId) {
  let mine = 0;
  let lastMineAt = 0;
  let lastStaffAt = 0;
  for (const message of messages || []) {
    const at = toTime(message.createdAt);
    if (accountId && String(message.senderAccountId || '') === String(accountId)) {
      mine += 1;
      lastMineAt = Math.max(lastMineAt, at);
    } else if (String(message.authorType || '').toLowerCase() === 'staff') {
      // Platform notices and rulings (author type `system`) are not a staff question.
      lastStaffAt = Math.max(lastStaffAt, at);
    }
  }
  return { mine, lastMineAt, lastStaffAt };
}

/**
 * What this member may do on one dispute, and whether it is waiting on them.
 * @param {object} dispute a party summary from `mapDisputeSummary` (viewerRole, limited, …)
 * @param {{ accountId: string, standing: ReturnType<typeof caseStanding>, messages?: object[]|null }} viewer
 *   `messages` are the ones this member can see; leave null when they were not loaded.
 */
function buildDisputeAccess(dispute, { accountId, standing, messages = null }) {
  const status = String(dispute.status || '').toLowerCase();
  const closed = status === 'closed';
  const visibility = Boolean(dispute.visibility);
  const filer = dispute.viewerRole === 'disputer';
  const respondent = dispute.viewerRole === 'disputee';
  const limited = Boolean(dispute.limited);

  let readOnlyReason = null;
  if (standing.appealOnly) readOnlyReason = DISPUTE_PENALTY_REASON;
  else if (limited) readOnlyReason = 'Staff decided this case privately. Contact Support if you want to appeal.';
  else if (closed) readOnlyReason = 'This dispute is closed. The discussion is read-only.';
  else if (!visibility && !filer) readOnlyReason = 'You can reply once staff make this dispute public.';
  const canReply = !readOnlyReason;

  let attention = null;
  if (canReply && messages) {
    const activity = disputeActivity(messages, accountId);
    if (respondent && visibility && activity.mine === 0) {
      attention = 'You are named in this dispute. Give your side.';
    } else if (activity.lastStaffAt > activity.lastMineAt) {
      attention = 'Staff replied on this dispute.';
    }
  }
  if (canReply && !attention && status === 'awaiting_response') {
    attention = 'Staff are waiting for a response.';
  }
  const needsYou = Boolean(attention);

  return {
    kind: 'dispute',
    id: String(dispute.id),
    number: dispute.number || null,
    status,
    closed,
    visibility,
    viewerRole: dispute.viewerRole || null,
    limited,
    canReply,
    readOnlyReason,
    replyHint: canReply
      ? visibility
        ? 'Your reply goes to staff first. They decide whether the other party or the public sees it.'
        : 'Only you and staff can read this while the case is private.'
      : null,
    canRate: false,
    needsYou,
    attention,
    stage: closed ? 'closed' : visibility ? 'public' : 'review',
    stageLabel: closed
      ? 'Closed'
      : visibility && status === 'open'
        ? 'Public discussion'
        : DISPUTE_STAGE_LABELS[status] || 'Open',
    // Everyone may read a public dispute page, banned and locked members included (read-only).
    publicPath: visibility ? `/disputes/${dispute.id}` : null,
    path: casePath('dispute', dispute.id),
  };
}

function mapTicketListRow(row, access) {
  return {
    id: row.ticket_id,
    number: row.ticket_number,
    subject: row.reason,
    reason: row.reason,
    type: row.type,
    category: row.type,
    priority: row.priority,
    status: access.status,
    messageCount: Number(row.message_count || 0),
    lastMessageAt: row.last_message_at,
    satisfactionScore: row.satisfaction_score === null || row.satisfaction_score === undefined
      ? null
      : Number(row.satisfaction_score),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    closedAt: row.resolved_at,
    resolvedAt: row.resolved_at,
    chatId: row.chat_id || null,
    // Appeals: the one penalty this ticket is about, and the decision on it.
    appealTarget: row.appeal_target_type
      ? { type: row.appeal_target_type, id: row.appeal_target_id || null, label: row.appeal_target_label || null }
      : null,
    appealDecision: row.appeal_decision || null,
    access,
  };
}

/** Tickets this member filed or joined, each with what they may do on it. */
async function listMemberTickets(accountId, accountAccess) {
  const { listParticipantTicketIds } = require('../repositories/AdminTicketsRepositories');
  const { listAccountTickets } = require('../repositories/CaseRepositories');
  const standing = caseStanding(accountAccess);
  const participantTicketIds = await listParticipantTicketIds(accountId);
  const rows = await listAccountTickets(accountId, participantTicketIds);
  return rows.map((row) => mapTicketListRow(row, buildTicketAccess(row, { accountId, standing })));
}

function memberCanReadTicket(data, accountId) {
  if (!data?.ticket || !accountId) return false;
  if (String(data.ticket.requester?.accountId) === String(accountId)) return true;
  return (data.participants || []).some(
    (person) => String(person.accountId) === String(accountId) && person.status === 'active'
  );
}

/**
 * One ticket as its requester or a participant sees it: no internal notes, no staff tools.
 * @returns {Promise<{ status: number, data?: object, message?: string }>}
 */
async function getMemberTicket(ticketId, accountId, accountAccess) {
  const { getTicketDetail } = require('../repositories/AdminTicketsRepositories');
  const data = await getTicketDetail(ticketId);
  if (!data) return { status: 404, message: 'Ticket not found' };
  if (!memberCanReadTicket(data, accountId)) return { status: 403, message: 'Not your ticket' };
  data.messages = (data.messages || []).filter((m) => !m.isInternal);
  delete data.assignableStaff;
  delete data.permissions;
  delete data.timeline;
  delete data.payments;
  delete data.articles;
  delete data.canAdjustCredits;
  // Staff record of what a decision did (a failed follow-up's error included); the member reads
  // the decision card in the conversation instead.
  delete data.appealOutcome;
  const t = data.ticket;
  data.access = buildTicketAccess(
    {
      ticket_id: t.id,
      ticket_number: t.number,
      status: t.status,
      type: t.type,
      account_id: t.requester?.accountId,
      last_message_author_type: t.lastMessageAuthorType,
      satisfaction_score: t.satisfactionScore,
    },
    { accountId, standing: caseStanding(accountAccess) }
  );
  return { status: 200, data };
}

/** The messages of a dispute this party can see, without the avatar/mention decoration. */
async function partyVisibleDisputeMessages(dispute, accountId) {
  const {
    getDisputeChatId,
    listDisputeMessages,
    canViewerSeeMessage,
  } = require('../repositories/DisputeChatRepositories');
  const chatId = await getDisputeChatId(dispute.id);
  if (!chatId) return [];
  const isFiler = dispute.viewerRole === 'disputer';
  const isRespondent = dispute.viewerRole === 'disputee';
  return (await listDisputeMessages(chatId)).filter((message) =>
    canViewerSeeMessage(message, {
      accountId,
      isParty: isFiler || isRespondent,
      isFiler,
      isRespondent,
      visibility: Boolean(dispute.visibility),
    })
  );
}

/** Disputes this member filed or can see, each with what they may do on it. */
async function listMemberDisputes(accountId, accountAccess) {
  const { listAccountDisputes } = require('../repositories/DisputeChatRepositories');
  const standing = caseStanding(accountAccess);
  const disputes = await listAccountDisputes(accountId);
  return Promise.all(
    disputes.map(async (dispute) => {
      // Only open cases can be waiting on the member, so only they need their messages.
      let messages = null;
      if (String(dispute.status || '').toLowerCase() !== 'closed' && !dispute.limited) {
        try {
          messages = await partyVisibleDisputeMessages(dispute, accountId);
        } catch (error) {
          console.warn('Dispute activity skipped:', error.message);
        }
      }
      return { ...dispute, access: buildDisputeAccess(dispute, { accountId, standing, messages }) };
    })
  );
}

/** One dispute as this party sees it, with what they may do on it. Null when they cannot see it. */
async function getMemberDispute(disputeId, accountId, accountAccess) {
  const { getAccountDispute } = require('../repositories/DisputeChatRepositories');
  const data = await getAccountDispute(disputeId, accountId);
  if (!data) return null;
  return {
    ...data,
    access: buildDisputeAccess(data, {
      accountId,
      standing: caseStanding(accountAccess),
      messages: data.limited ? null : data.messages,
    }),
  };
}

/**
 * Open cases and what needs the member, for the case bar and the sidebar badge.
 * Disputes come first: money is on hold while one is open.
 */
async function getCaseSummary(accountId, accountAccess) {
  const [tickets, disputes] = await Promise.all([
    listMemberTickets(accountId, accountAccess),
    listMemberDisputes(accountId, accountAccess),
  ]);
  const openTickets = tickets.filter((row) => !row.access.closed);
  const openDisputes = disputes.filter((row) => !row.access.closed);
  const items = [
    ...openDisputes.map((row) => ({
      kind: 'dispute',
      id: String(row.id),
      number: row.number || null,
      title: row.title || 'Dispute',
      updatedAt: row.updatedAt || null,
      access: row.access,
    })),
    ...openTickets.map((row) => ({
      kind: 'ticket',
      id: String(row.id),
      number: row.number || null,
      title: row.subject || 'Support ticket',
      updatedAt: row.updatedAt || null,
      access: row.access,
    })),
  ].sort((left, right) => {
    if (left.access.needsYou !== right.access.needsYou) return left.access.needsYou ? -1 : 1;
    if (left.kind !== right.kind) return left.kind === 'dispute' ? -1 : 1;
    return toTime(right.updatedAt) - toTime(left.updatedAt);
  });
  return {
    openTickets: openTickets.length,
    openDisputes: openDisputes.length,
    needsYou: items.filter((item) => item.access.needsYou).length,
    items: items.slice(0, 10),
  };
}

/** Staff desks re-read their queues (`staffCaseChanged`). Never throws. */
function announceStaffCase(kind, id, reason) {
  try {
    require('../lib/WebSocket').emitStaffCaseChange({ kind, id, reason });
  } catch (error) {
    console.warn('Staff case change skipped:', error.message);
  }
}

function emitCaseUpdate(accountId, payload) {
  try {
    const io = require('../lib/WebSocket').getIo();
    if (io && accountId) io.to(String(accountId)).emit('caseUpdated', payload);
  } catch (error) {
    console.warn('Case update not delivered:', error.message);
  }
}

/** Members (not staff) on a ticket: the requester and everyone still in its chat. */
async function ticketMemberRecipients(row) {
  const recipients = new Set();
  if (row.account_id) recipients.add(String(row.account_id));
  if (!row.chat_id) return [...recipients];
  try {
    const { ObjectId } = require('mongodb');
    const { getMongoClient } = require('../lib/MongoDb');
    const db = getMongoClient()?.db('ensemble');
    if (db && ObjectId.isValid(String(row.chat_id))) {
      const inbox = await db.collection('inbox').findOne(
        { _id: new ObjectId(String(row.chat_id)) },
        { projection: { members: 1 } }
      );
      for (const member of inbox?.members || []) {
        if (['left', 'removed'].includes(String(member.status || 'active').toLowerCase())) continue;
        if (STAFF_MEMBER_ROLES.has(String(member.role || '').toLowerCase())) continue;
        recipients.add(String(member.account_id));
      }
    }
  } catch (error) {
    console.warn('Ticket case recipients limited to the requester:', error.message);
  }
  return [...recipients];
}

/**
 * Tell each member on a ticket that it changed, with what they may now do on it.
 * Call after the change is saved. Never throws.
 * @param {string} ticketId
 * @param {{ reason?: string }} [options] `message` or `status`
 */
async function announceTicketCase(ticketId, { reason = 'status' } = {}) {
  announceStaffCase('ticket', ticketId, reason);
  try {
    const { getTicketCaseRow, loadAccountStatuses } = require('../repositories/CaseRepositories');
    const row = await getTicketCaseRow(ticketId);
    if (!row) return;
    const recipients = await ticketMemberRecipients(row);
    const statuses = await loadAccountStatuses(recipients);
    for (const accountId of recipients) {
      const access = buildTicketAccess(row, {
        accountId,
        standing: caseStandingFromStatus(statuses.get(accountId)),
      });
      emitCaseUpdate(accountId, {
        kind: 'ticket',
        id: String(row.ticket_id),
        number: row.ticket_number || null,
        reason,
        access,
        updatedAt: row.updated_at || new Date(),
      });
    }
  } catch (error) {
    console.warn('Ticket case update skipped:', error.message);
  }
}

/** The parties a dispute message reaches, from its audience. */
function disputeAudienceParties(row, audience, senderId) {
  const by = row.by_account_id ? String(row.by_account_id) : null;
  const forId = row.for_account_id ? String(row.for_account_id) : null;
  const value = String(audience || '').toLowerCase();
  if (value === 'staff') return [];
  if (value === 'author_and_staff') {
    return senderId && [by, forId].includes(String(senderId)) ? [String(senderId)] : [];
  }
  if (value === 'disputer') return [by].filter(Boolean);
  if (value === 'disputee') return [forId].filter(Boolean);
  return [by, forId].filter(Boolean);
}

/**
 * Tell each party who can see a dispute that it changed, with what they may now do on it.
 * A party who cannot see the case (the disputee of a private one) is never told it exists.
 * Call after the change is saved. Never throws.
 * @param {string} disputeId
 * @param {{ reason?: string, audience?: string|null, senderId?: string|null }} [options]
 *   `audience` limits a `message` update to the parties that message reaches.
 */
async function announceDisputeCase(disputeId, { reason = 'status', audience = null, senderId = null } = {}) {
  announceStaffCase('dispute', disputeId, reason);
  try {
    const { pool } = require('../lib/Database');
    const { loadAccountStatuses } = require('../repositories/CaseRepositories');
    const result = await pool.query(
      `SELECT dispute_id, dispute_number, by_account_id, for_account_id
       FROM disputes WHERE dispute_id = $1 AND deleted_at IS NULL`,
      [disputeId]
    );
    const row = result.rows[0];
    if (!row) return;
    const recipients = audience
      ? disputeAudienceParties(row, audience, senderId)
      : [row.by_account_id, row.for_account_id].filter(Boolean).map(String);
    const unique = [...new Set(recipients)];
    const statuses = await loadAccountStatuses(unique);
    for (const accountId of unique) {
      const standing = caseStandingFromStatus(statuses.get(accountId));
      const detail = await getMemberDispute(disputeId, accountId, null);
      if (!detail) {
        // Only a party swap takes a case away from someone who already knew about it.
        if (reason === 'parties_swapped') {
          emitCaseUpdate(accountId, { kind: 'dispute', id: String(disputeId), reason, removed: true });
        }
        continue;
      }
      emitCaseUpdate(accountId, {
        kind: 'dispute',
        id: String(disputeId),
        number: row.dispute_number || null,
        reason,
        access: buildDisputeAccess(detail, {
          accountId,
          standing,
          messages: detail.limited ? null : detail.messages,
        }),
        updatedAt: detail.updatedAt || new Date(),
      });
    }
  } catch (error) {
    console.warn('Dispute case update skipped:', error.message);
  }
}

/**
 * Notice to the member who just opened a ticket or filed a dispute, so the case has a trail in
 * their notifications and the sidebar badge from the start. Never throws.
 * @param {{ accountId: string, kind: 'ticket'|'dispute', id: string, number?: string|null }} input
 */
async function notifyCaseOpened({ accountId, kind, id, number = null }) {
  if (!accountId || !id) return;
  // A new ticket or dispute lands in the staff queues without a reload.
  announceStaffCase(kind, id, 'opened');
  try {
    const { createNotificationServices } = require('./NotificationServices');
    const ref = number ? (kind === 'ticket' ? `#${number}` : number) : '';
    const message = kind === 'ticket'
      ? `We received ticket ${ref}. Support will reply in Cases, and you can add details there.`.replace(/\s{2,}/g, ' ')
      : `Dispute ${ref} is filed. Staff will review it, and you can add evidence in Cases. The other party cannot see it unless staff make it public.`.replace(/\s{2,}/g, ' ');
    const notification = await createNotificationServices({
      account_id: String(accountId),
      message,
      is_read: false,
      reference_table: kind === 'ticket' ? 'tickets' : 'disputes',
      reference_prefix: kind === 'ticket' ? 'TICKET_RECEIVED' : 'DIS',
      reference_path: casePath(kind, id),
      reference_id: String(id),
    });
    const io = require('../lib/WebSocket').getIo();
    if (io && notification) io.to(String(accountId)).emit('notification', notification);
  } catch (error) {
    console.warn('Case opened notice skipped:', error.message);
  }
}

module.exports = {
  CASES_PATH,
  notifyCaseOpened,
  casePath,
  caseStanding,
  buildTicketAccess,
  buildDisputeAccess,
  listMemberTickets,
  getMemberTicket,
  listMemberDisputes,
  getMemberDispute,
  getCaseSummary,
  announceTicketCase,
  announceDisputeCase,
};
