/**
 * Dispute discussion threads live entirely in MongoDB (inbox + messages).
 * Postgres `dispute_chats` only stores the link: dispute_id → Mongo ObjectId string.
 * There is no Postgres dispute_messages table — do not reintroduce one.
 */
const { ObjectId } = require('mongodb');
const { pool } = require('../lib/Database');
const { getMongoClient } = require('../lib/MongoDb');
const {
  createInboxRepositories,
  createMessageRepositories,
} = require('./InboxRepositories');

const CONVERSATION_TYPE = 'dispute';

const DISPUTE_ATTACHMENT_LIMIT = 4;
/** Staging folders the presigned upload flow writes to. Anything else is rejected. */
const DISPUTE_ATTACHMENT_KEY = /^(?:chat-attachments|ticket-attachments)\/[A-Za-z0-9._/-]+$/;

function disputeAttachmentType(name, hinted) {
  const hint = String(hinted || '').toLowerCase();
  if (['image', 'gif', 'video', 'file'].includes(hint)) return hint;
  if (hint.startsWith('video') || /\.(mp4|webm|mov|m4v)$/i.test(name)) return 'video';
  if (/\.gif$/i.test(name)) return 'gif';
  if (hint.startsWith('image') || /\.(png|jpe?g|webp|avif|bmp)$/i.test(name)) return 'image';
  return 'file';
}

/**
 * Validate attachments posted with a dispute message.
 * Only server-issued staging keys are accepted, so a client cannot point a message
 * at an arbitrary object in the bucket.
 */
function normalizeDisputeAttachments(raw) {
  if (!Array.isArray(raw) || !raw.length) return [];
  const out = [];
  for (const item of raw.slice(0, DISPUTE_ATTACHMENT_LIMIT)) {
    const key = String(item?.attachment_key || item?.key || '').replace(/^\/+/, '').trim();
    if (!DISPUTE_ATTACHMENT_KEY.test(key) || key.includes('..')) continue;
    const name = String(item?.attachment_name || item?.name || 'Attachment').slice(0, 180);
    out.push({
      attachment_id: String(item?.attachment_id || item?.id || '').slice(0, 64) || `att-${out.length + 1}`,
      attachment_type: disputeAttachmentType(name, item?.attachment_type || item?.type || item?.mime),
      attachment_key: key,
      attachment_url: key,
      attachment_name: name,
      attachment_size: Number(item?.attachment_size || item?.size || 0) || 0,
    });
  }
  return out;
}

function mongoDb() {
  const client = getMongoClient();
  return client ? client.db('ensemble') : null;
}

function isMongoReady() {
  return Boolean(getMongoClient());
}

async function getDisputeChatId(disputeId) {
  const result = await pool.query(
    `SELECT chat_id FROM dispute_chats WHERE dispute_id = $1 AND deleted_at IS NULL`,
    [disputeId]
  );
  return result.rows[0]?.chat_id || null;
}

/** Create (or reuse) the Mongo inbox for a dispute and link it via dispute_chats. */
async function ensureDisputeChat(disputeId, disputeRow) {
  const existing = await getDisputeChatId(disputeId);
  if (existing) return existing;

  if (!isMongoReady()) {
    throw new Error('MongoDB is not connected — dispute chats require MONGODB_URI');
  }

  const members = [];
  const seen = new Set();
  const addMember = (accountId, role) => {
    if (!accountId || seen.has(String(accountId))) return;
    seen.add(String(accountId));
    members.push({ account_id: String(accountId), role, joined_at: new Date() });
  };

  addMember(disputeRow.by_account_id, 'member');
  addMember(disputeRow.for_account_id, 'member');

  const insertResult = await createInboxRepositories({
    conversation_name: disputeRow.dispute_number
      ? `Dispute ${disputeRow.dispute_number}`
      : `Dispute ${disputeId}`,
    conversation_type: CONVERSATION_TYPE,
    dispute_id: String(disputeId),
    members,
    pinned_messages: [],
    created_at: new Date(),
    updated_at: new Date(),
  });

  const chatId = String(insertResult.insertedId);
  await pool.query(
    `INSERT INTO dispute_chats (dispute_id, chat_id)
     VALUES ($1, $2)
     ON CONFLICT (dispute_id) DO UPDATE
       SET chat_id = EXCLUDED.chat_id, deleted_at = NULL, created_at = CURRENT_TIMESTAMP`,
    [disputeId, chatId]
  );
  return chatId;
}

/** Audience for a stored dispute message. Legacy member messages without one stay private. */
function resolveDisputeMessageAudience(m) {
  if (m?.audience) return String(m.audience).toLowerCase();
  if (m?.is_internal) return 'author_and_staff';
  if (m?.published_at) return 'parties';
  const authorType = String(m?.author_type || '').toLowerCase();
  const authorRole = String(m?.author_role || '').toLowerCase();
  if (authorType === 'staff' || authorRole === 'staff') return 'parties';
  return 'author_and_staff';
}

function mapMongoDisputeMessage(m) {
  const audience = resolveDisputeMessageAudience(m);
  const authorRole = m.author_role || (m.author_type === 'staff' ? 'staff' : null);
  return {
    id: String(m._id),
    authorType: m.author_type || (m.is_internal ? 'staff' : 'user'),
    authorName: m.author_name || 'Unknown',
    authorRole,
    senderAccountId: m.sender_id || m.senderId || null,
    body: m.message_content || m.body || '',
    isInternal: Boolean(m.is_internal) || audience === 'staff' || audience === 'author_and_staff',
    audience,
    replyToId: m.message_id_reply ? String(m.message_id_reply) : null,
    attachments: Array.isArray(m.attachments) ? m.attachments : [],
    // Community (non-party) replies are held private until staff or an admin publishes them.
    pendingReview:
      String(authorRole || '').toLowerCase() === 'community' && !isPublishedAudience(audience),
    publishedAt: m.published_at || null,
    createdAt: m.created_at || m.createdAt || null,
  };
}

const DISPUTE_MESSAGE_AUDIENCES = [
  'staff',
  'author_and_staff',
  'disputer',
  'disputee',
  'parties',
  'public',
];

function isPublishedAudience(audience) {
  return audience === 'parties' || audience === 'public';
}

function canViewerSeeMessage(
  message,
  { accountId, isParty, visibility, isStaff = false, isFiler = false, isRespondent = false } = {}
) {
  const audience = message.audience || 'author_and_staff';
  if (audience === 'public') return true;
  if (audience === 'parties') {
    // Staff read the whole case file, so a party-visible message is visible to them too.
    if (isStaff) return true;
    return Boolean(visibility && isParty);
  }
  if (audience === 'disputer') {
    if (isStaff) return true;
    return Boolean(isFiler);
  }
  if (audience === 'disputee') {
    if (isStaff) return true;
    return Boolean(isRespondent);
  }
  if (audience === 'author_and_staff') {
    if (isStaff) return true;
    return Boolean(accountId && String(message.senderAccountId) === String(accountId));
  }
  // staff-only: staff desk only
  return Boolean(isStaff);
}

/** Load all messages for a dispute chat from the Mongo `messages` collection. */
async function listDisputeMessages(chatId) {
  if (!chatId || !isMongoReady()) return [];

  const db = mongoDb();
  if (!db) return [];

  const convoId = String(chatId);
  const messages = await db.collection('messages').find({ conversation_id: convoId }).toArray();

  return (messages || [])
    .filter((m) => !m.is_deleted && !m.deleted_at)
    .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
    .map(mapMongoDisputeMessage);
}

/** One stored dispute message, mapped. Used to validate reply targets. */
async function getDisputeMessage(chatId, messageId) {
  if (!chatId || !messageId || !isMongoReady()) return null;
  if (!ObjectId.isValid(String(messageId))) return null;
  const db = mongoDb();
  if (!db) return null;
  const doc = await db.collection('messages').findOne({
    _id: new ObjectId(String(messageId)),
    conversation_id: String(chatId),
  });
  if (!doc || doc.is_deleted || doc.deleted_at) return null;
  return mapMongoDisputeMessage(doc);
}

/**
 * Validate a reply target for a dispute message.
 * The parent must live on the same chat and be one the author is allowed to see,
 * so nobody can quote a message that was never shown to them.
 * @returns {Promise<object|null>} the mapped parent message, or null when no reply was requested
 */
async function resolveDisputeReplyTarget(chatId, replyToId, viewer = {}) {
  if (replyToId === null || replyToId === undefined || replyToId === '') return null;
  const parent = await getDisputeMessage(chatId, replyToId);
  if (!parent) {
    const error = new Error('The message you replied to is no longer available.');
    error.statusCode = 400;
    throw error;
  }
  if (!canViewerSeeMessage(parent, viewer)) {
    const error = new Error('You cannot reply to that message.');
    error.statusCode = 403;
    throw error;
  }
  return parent;
}

async function ensureStaffMemberOnChat(chatId, accountId, now = new Date()) {
  if (!accountId || !ObjectId.isValid(chatId)) return;
  const db = mongoDb();
  if (!db) return;
  await db.collection('inbox').updateOne(
    { _id: new ObjectId(chatId), 'members.account_id': { $ne: String(accountId) } },
    {
      $push: { members: { account_id: String(accountId), role: 'admin', joined_at: now } },
      $set: { updated_at: now },
    }
  );
}

async function touchDisputeInbox(chatId, lastMessage, now = new Date(), { audience = null } = {}) {
  if (!ObjectId.isValid(chatId)) return;
  const db = mongoDb();
  if (!db) return;
  // Staff-only / author-private notes must not rewrite the shared inbox preview.
  if (audience && !isPublishedAudience(String(audience).toLowerCase())) {
    await db.collection('inbox').updateOne(
      { _id: new ObjectId(chatId) },
      { $set: { updated_at: now } }
    );
    return;
  }
  await db.collection('inbox').updateOne(
    { _id: new ObjectId(chatId) },
    {
      $set: {
        updated_at: now,
        last_message: lastMessage,
        last_message_time: now,
        last_message_audience: audience ? String(audience).toLowerCase() : 'parties',
      },
    }
  );
}

/** Latest parties/public preview for a dispute chat (safe for both parties). */
async function partyVisibleDisputePreview(chatId) {
  if (!chatId || !isMongoReady()) return null;
  const db = mongoDb();
  if (!db) return null;
  const latest = await db.collection('messages').findOne(
    {
      conversation_id: String(chatId),
      is_deleted: { $ne: true },
      deleted_at: null,
      is_internal: { $ne: true },
      $or: [
        { audience: { $in: ['parties', 'public'] } },
        { audience: { $exists: false }, published_at: { $ne: null } },
        { audience: { $exists: false }, author_type: 'staff' },
      ],
    },
    { sort: { created_at: -1, _id: -1 } }
  );
  if (!latest) {
    return {
      last_message: null,
      last_message_id: null,
      last_message_sender_id: null,
      last_message_time: null,
      last_message_audience: null,
    };
  }
  return {
    last_message: latest.message_content || '',
    last_message_id: String(latest._id),
    last_message_sender_id: latest.sender_id || null,
    last_message_time: latest.created_at || latest.updated_at || null,
    last_message_audience: latest.audience || 'parties',
  };
}

function publicDisputeRoom(disputeId) {
  return disputeId ? `dispute:public:${disputeId}` : null;
}

function emitDisputeChat(
  event,
  { chatId = null, disputeId = null, payload, accountIds = [], includeChatRoom = false, includePublicRoom = false } = {}
) {
  try {
    const { getIo } = require('../lib/WebSocket');
    const io = getIo();
    if (!io || !payload) return;
    const rooms = new Set();
    if (includeChatRoom && chatId) rooms.add(String(chatId));
    if (includePublicRoom) {
      const room = publicDisputeRoom(disputeId);
      if (room) rooms.add(room);
    }
    for (const accountId of accountIds || []) {
      if (accountId) rooms.add(String(accountId));
    }
    // One emit across all rooms so a socket in several of them gets the event once.
    if (rooms.size) io.to([...rooms]).emit(event, payload);
  } catch (error) {
    console.error('Dispute message saved without realtime delivery:', error.message);
  }
}

/**
 * Tell both parties, the staff working the case, and anyone reading the public page that a
 * dispute's state moved. Covers approve / hide / resolve / reopen / dismiss / ban / swap,
 * claims and handoffs, money rulings and payouts, so every open view refetches instead of
 * showing a stale decision. The payload only says *that* something changed (plus status and
 * visibility); clients read the details back over HTTP, which also enforces who sees what.
 *
 * Deliberately selects only long-standing columns: it must not break if a newer
 * migration has not been applied yet.
 * @param {string} disputeId
 * @param {{ reason?: string|null }} [options] short machine word for what changed, e.g. `parties_swapped`
 */
async function emitDisputeState(disputeId, { reason = null } = {}) {
  if (!disputeId) return null;
  let row = null;
  try {
    const result = await pool.query(
      `SELECT d.dispute_id, d.dispute_number, d.status, d.visibility, d.by_account_id,
              d.for_account_id, d.updated_at, st.account_id AS handler_account_id
       FROM disputes d
       LEFT JOIN staff st ON st.staff_id = d.handled_by_staff_id
       WHERE d.dispute_id = $1 AND d.deleted_at IS NULL`,
      [disputeId]
    );
    row = result.rows[0] || null;
  } catch (error) {
    console.warn('Dispute state broadcast skipped:', error.message);
    return null;
  }
  if (!row) return null;

  const status = String(row.status || '').toLowerCase();
  const payload = {
    disputeId: String(row.dispute_id),
    number: row.dispute_number || null,
    status,
    visibility: Boolean(row.visibility),
    closed: status === 'closed',
    reason: reason || null,
    updatedAt: row.updated_at || new Date(),
  };

  // Staff who have opened the case are members of its chat; the handler may not have yet.
  let staffIds = [];
  try {
    const chatId = await getDisputeChatId(disputeId);
    if (chatId && isMongoReady()) staffIds = await listDisputeChatStaffAccountIds(chatId);
  } catch (error) {
    console.warn('Dispute state broadcast could not list staff:', error.message);
  }

  emitDisputeChat('disputeUpdated', {
    disputeId: payload.disputeId,
    payload,
    accountIds: [row.by_account_id, row.for_account_id, row.handler_account_id, ...staffIds].filter(
      Boolean
    ),
    includePublicRoom: true,
  });
  return payload;
}

/**
 * Post a platform ruling card (author "Dispute Resolution", no account attached) in a
 * dispute's discussion. Money and party changes use this so the thread always records them.
 * @param {object} row dispute row with dispute_id, by_account_id, for_account_id, dispute_number
 * @param {string} body
 * @param {{ audience?: string }} [options]
 */
async function postDisputeSystemMessage(row, body, { audience = 'parties' } = {}) {
  if (!row?.dispute_id || !body) return null;
  if (!isMongoReady()) {
    throw new Error('MongoDB is not connected — cannot post the decision in the discussion.');
  }
  const { DISPUTE_DECISION_AUTHOR } = require('../lib/DisputeResolutions');
  const chatId = await ensureDisputeChat(row.dispute_id, row);
  const normalizedAudience = String(audience || 'parties').toLowerCase();
  const partyIds =
    normalizedAudience === 'disputer'
      ? [row.by_account_id]
      : normalizedAudience === 'disputee'
        ? [row.for_account_id]
        : [row.by_account_id, row.for_account_id];
  return createDisputeMessage({
    chatId,
    body,
    senderId: null,
    authorName: DISPUTE_DECISION_AUTHOR.name,
    authorType: DISPUTE_DECISION_AUTHOR.type,
    authorRole: DISPUTE_DECISION_AUTHOR.role,
    audience: normalizedAudience,
    audiences: normalizedAudience === 'public' ? ['public', 'parties'] : [normalizedAudience],
    isInternal: false,
    notifyAccountIds: partyIds.filter(Boolean),
    disputeId: row.dispute_id,
  });
}

/** One notification to one account about a dispute, with a live push. */
async function notifyDisputeAccount(accountId, disputeId, { message, path } = {}) {
  if (!accountId || !disputeId || !message) return;
  try {
    const NotificationRepositories = require('./NotificationRepositories');
    const notification = await NotificationRepositories.createNotification({
      account_id: accountId,
      message,
      reference_table: 'disputes',
      reference_prefix: 'DIS',
      reference_path: path || `/disputes/${disputeId}`,
      reference_id: disputeId,
    });
    let io = null;
    try {
      io = require('../lib/WebSocket').getIo();
    } catch {
      io = null;
    }
    if (io && notification) io.to(String(accountId)).emit('notification', notification);
  } catch (err) {
    console.warn('Dispute notification skipped:', err.message);
  }
}

/**
 * The money side of a ruling, shaped for one of the two parties. Each payout says how much
 * goes to whom and when; `isYou` marks the viewer's own. Null when there is no ruling, or
 * when the payouts table is not there yet (migration not applied).
 */
async function getDisputeSettlementForParty(disputeId, accountId) {
  try {
    const result = await pool.query(
      `
      SELECT dp.dispute_payout_id, dp.kind, dp.amount_credits, dp.status, dp.release_at,
             dp.paid_at, dp.recipient_account_id, dp.recipient_role,
             d.status AS dispute_status, d.financial_resolution_kind, d.financial_resolution_at,
             COALESCE(ra.display_name, ra.handle) AS recipient_name, ra.handle AS recipient_handle
      FROM dispute_payouts dp
      JOIN disputes d ON d.dispute_id = dp.dispute_id
      LEFT JOIN accounts ra ON ra.account_id = dp.recipient_account_id
      WHERE dp.dispute_id = $1
        AND dp.status <> 'cancelled'
      ORDER BY dp.created_at ASC, dp.dispute_payout_id ASC
      `,
      [disputeId]
    );
    if (!result.rows.length) return null;
    const first = result.rows[0];
    const waiting = result.rows.some((row) => ['scheduled', 'failed'].includes(row.status));
    return {
      kind: first.financial_resolution_kind || null,
      decidedAt: first.financial_resolution_at || null,
      // Payouts wait while a reopened case is reviewed again.
      paused: waiting && String(first.dispute_status || '').toLowerCase() !== 'closed',
      payouts: result.rows.map((row) => ({
        id: String(row.dispute_payout_id),
        kind: row.kind,
        amount: Number(row.amount_credits || 0),
        status: row.status,
        releaseAt: row.release_at || null,
        paidAt: row.paid_at || null,
        recipientRole: row.recipient_role || null,
        recipientName: row.recipient_name || 'Member',
        recipientHandle: row.recipient_handle || null,
        isYou: Boolean(accountId && String(row.recipient_account_id) === String(accountId)),
      })),
    };
  } catch (error) {
    if (error.code !== '42P01') console.warn('Dispute settlement summary skipped:', error.message);
    return null;
  }
}

async function listDisputeChatMemberAccountIds(chatId, { roles = null } = {}) {
  if (!chatId || !ObjectId.isValid(String(chatId))) return [];
  const db = mongoDb();
  if (!db) return [];
  const inbox = await db.collection('inbox').findOne(
    { _id: new ObjectId(String(chatId)) },
    { projection: { members: 1 } }
  );
  const allowedRoles = Array.isArray(roles) && roles.length
    ? new Set(roles.map((role) => String(role).toLowerCase()))
    : null;
  return (inbox?.members || [])
    .filter((member) => !['left', 'removed'].includes(String(member.status || '').toLowerCase()))
    .filter((member) => {
      if (!allowedRoles) return true;
      return allowedRoles.has(String(member.role || 'member').toLowerCase());
    })
    .map((member) => String(member.account_id))
    .filter(Boolean);
}

/** Staff members on a dispute chat. Checked against `staff` so stray admin-role members get nothing private. */
async function listDisputeChatStaffAccountIds(chatId) {
  const adminIds = await listDisputeChatMemberAccountIds(chatId, { roles: ['admin'] });
  if (!adminIds.length) return [];
  const result = await pool.query(
    `SELECT account_id::text AS account_id FROM staff WHERE account_id::text = ANY($1::text[])`,
    [adminIds]
  );
  const staffIds = result.rows.map((row) => String(row.account_id));
  const strays = adminIds.filter((id) => !staffIds.includes(String(id)));
  if (strays.length && ObjectId.isValid(String(chatId))) {
    // Members who commented on the public page were once added as admin; they never belong on the chat.
    try {
      await mongoDb()?.collection('inbox').updateOne(
        { _id: new ObjectId(String(chatId)) },
        { $pull: { members: { account_id: { $in: strays }, role: 'admin' } } }
      );
    } catch (error) {
      console.warn('Dispute chat member cleanup skipped:', error.message);
    }
  }
  return staffIds;
}

async function resolveDisputeRealtimeTargets(chatId, audience, notifyAccountIds = []) {
  const staffIds = await listDisputeChatStaffAccountIds(chatId);
  const published = isPublishedAudience(audience);
  if (published) {
    return {
      includeChatRoom: true,
      accountIds: [...staffIds, ...(notifyAccountIds || [])],
    };
  }
  if (
    audience === 'author_and_staff' ||
    audience === 'disputer' ||
    audience === 'disputee'
  ) {
    return {
      includeChatRoom: false,
      accountIds: [...staffIds, ...(notifyAccountIds || [])],
    };
  }
  return {
    includeChatRoom: false,
    accountIds: staffIds,
  };
}

/**
 * Insert a dispute message into Mongo `messages` and update the inbox preview.
 * @returns {Promise<object>} Mapped dispute message for API / socket clients
 */
async function createDisputeMessage({
  chatId,
  body,
  senderId,
  authorName,
  authorType = 'staff',
  authorRole = 'staff',
  audience = 'author_and_staff',
  audiences = null,
  isInternal = false,
  notifyAccountIds = [],
  disputeId = null,
  replyToId = null,
  attachments = [],
}) {
  if (!isMongoReady()) {
    throw new Error('MongoDB is not connected — cannot send dispute chat messages');
  }

  const now = new Date();
  const accountId = senderId ? String(senderId) : null;
  if (String(authorType).toLowerCase() === 'staff') {
    await ensureStaffMemberOnChat(chatId, accountId, now);
  }

  const normalizedReplyToId = replyToId ? String(replyToId) : null;
  const normalizedAttachments = normalizeDisputeAttachments(attachments);
  const normalizedAudience = String(audience || 'author_and_staff').toLowerCase();
  const audienceList =
    Array.isArray(audiences) && audiences.length
      ? [...new Set(audiences.map((a) => String(a).toLowerCase()))]
      : [normalizedAudience];
  const privateToAuthorAndStaff = !isPublishedAudience(normalizedAudience);

  const insertedId = await createMessageRepositories({
    conversation_id: String(chatId),
    sender_id: accountId,
    message_type: 'text',
    message_content: body,
    message_id_reply: normalizedReplyToId,
    attachments: normalizedAttachments,
    links: [],
    message_react: [],
    read_by: accountId ? [{ account_id: accountId, read_at: now }] : [],
    is_edited: false,
    is_deleted: false,
    is_internal: Boolean(isInternal) || privateToAuthorAndStaff,
    author_type: authorType,
    author_name: authorName || 'Staff',
    author_role: authorRole,
    audience: normalizedAudience,
    audiences: audienceList,
    published_at: isPublishedAudience(normalizedAudience) ? now : null,
    created_at: now,
    updated_at: now,
  });

  const preview =
    body ||
    (normalizedAttachments.length
      ? `Sent ${normalizedAttachments.length} attachment${normalizedAttachments.length === 1 ? '' : 's'}`
      : '');
  await touchDisputeInbox(chatId, preview, now, { audience: normalizedAudience });

  const mapped = {
    id: String(insertedId),
    conversationId: String(chatId),
    disputeId: disputeId ? String(disputeId) : null,
    authorType,
    authorName: authorName || 'Staff',
    authorRole,
    senderAccountId: accountId,
    body,
    isInternal: Boolean(isInternal) || privateToAuthorAndStaff,
    audience: normalizedAudience,
    replyToId: normalizedReplyToId,
    attachments: normalizedAttachments,
    publishedAt: isPublishedAudience(normalizedAudience) ? now : null,
    createdAt: now,
  };

  const authorNotify =
    normalizedAudience === 'author_and_staff' && accountId ? [accountId] : [];
  const targets = await resolveDisputeRealtimeTargets(chatId, normalizedAudience, [
    ...(notifyAccountIds || []),
    ...authorNotify,
  ]);
  emitDisputeChat('disputeMessage', {
    chatId,
    disputeId,
    payload: mapped,
    accountIds: targets.accountIds,
    includeChatRoom: targets.includeChatRoom,
    includePublicRoom: isPublishedAudience(normalizedAudience) && Boolean(disputeId),
  });
  return mapped;
}

async function updateDisputeMessageAudience(
  chatId,
  messageId,
  audience,
  { notifyAccountIds = [], disputeId = null } = {}
) {
  if (!isMongoReady()) {
    throw new Error('MongoDB is not connected — cannot update dispute messages');
  }

  const nextAudience = String(audience || '').toLowerCase();
  if (!DISPUTE_MESSAGE_AUDIENCES.includes(nextAudience)) {
    throw new Error(
      'Invalid audience. Use staff, author_and_staff, disputer, disputee, parties, or public.'
    );
  }

  const db = mongoDb();
  if (!db) throw new Error('MongoDB is not connected');

  const now = new Date();
  const result = await db.collection('messages').updateOne(
    {
      _id: new ObjectId(String(messageId)),
      conversation_id: String(chatId),
    },
    {
      $set: {
        audience: nextAudience,
        is_internal: !isPublishedAudience(nextAudience),
        published_at: isPublishedAudience(nextAudience) ? now : null,
        updated_at: now,
      },
    }
  );

  if (!result.matchedCount) throw new Error('Message not found.');

  const doc = await db.collection('messages').findOne({
    _id: new ObjectId(String(messageId)),
    conversation_id: String(chatId),
  });
  const mapped = doc
    ? {
        ...mapMongoDisputeMessage(doc),
        conversationId: String(chatId),
        disputeId: disputeId ? String(disputeId) : null,
      }
    : {
        id: String(messageId),
        conversationId: String(chatId),
        disputeId: disputeId ? String(disputeId) : null,
        audience: nextAudience,
        isInternal: !isPublishedAudience(nextAudience),
      };

  if (isPublishedAudience(nextAudience) && mapped.body) {
    await touchDisputeInbox(chatId, mapped.body, now, { audience: nextAudience });
  } else if (!isPublishedAudience(nextAudience)) {
    const safePreview = await partyVisibleDisputePreview(chatId);
    if (safePreview) {
      await mongoDb().collection('inbox').updateOne(
        { _id: new ObjectId(String(chatId)) },
        { $set: { ...safePreview, updated_at: now } }
      );
    }
  }

  const targets = await resolveDisputeRealtimeTargets(chatId, nextAudience, notifyAccountIds);
  emitDisputeChat('disputeMessageUpdated', {
    chatId,
    disputeId,
    payload: mapped,
    accountIds: targets.accountIds,
    includeChatRoom: targets.includeChatRoom,
    includePublicRoom: isPublishedAudience(nextAudience) && Boolean(disputeId),
  });
  if (!isPublishedAudience(nextAudience) && disputeId) {
    // Tell public viewers to drop it, without sending the text.
    emitDisputeChat('disputeMessageUpdated', {
      disputeId,
      payload: { id: String(messageId), disputeId: String(disputeId), audience: nextAudience },
      includePublicRoom: true,
    });
  }
  return mapped;
}

const PARTY_LABEL_SWAP = { disputer: 'disputee', disputee: 'disputer' };

function swappedPartyLabelExpr(field) {
  return {
    $switch: {
      branches: Object.entries(PARTY_LABEL_SWAP).map(([from, to]) => ({
        case: { $eq: [field, from] },
        then: to,
      })),
      default: field,
    },
  };
}

/**
 * Flip disputer/disputee labels on every message of a dispute chat.
 *
 * Audiences and author roles are stored as role words, not account ids. When staff swap
 * the parties, each message must follow the person it was written for or by — otherwise
 * a note shared only with the old disputer would show up for the new one. The swap is its
 * own inverse, so running it twice restores the original labels.
 * @returns {Promise<number>} messages changed
 */
async function swapDisputePartyLabels(chatId) {
  if (!chatId) return 0;
  const db = mongoDb();
  if (!db) throw new Error('MongoDB is not connected — cannot relabel the dispute discussion.');
  const roles = Object.keys(PARTY_LABEL_SWAP);
  const result = await db.collection('messages').updateMany(
    {
      conversation_id: String(chatId),
      $or: [
        { audience: { $in: roles } },
        { audiences: { $in: roles } },
        { author_role: { $in: roles } },
      ],
    },
    [
      {
        $set: {
          audience: swappedPartyLabelExpr('$audience'),
          author_role: swappedPartyLabelExpr('$author_role'),
          audiences: {
            $cond: [
              { $isArray: '$audiences' },
              { $map: { input: '$audiences', as: 'a', in: swappedPartyLabelExpr('$$a') } },
              '$audiences',
            ],
          },
        },
      },
    ]
  );
  return result.modifiedCount || 0;
}

/**
 * Realtime fan-out for dispute messages written through the shared inbox.
 * Private notes reach only the sender and staff; published ones reach the chat room and public page.
 * @returns {Promise<boolean>} true when the message belonged to a dispute and was handled here
 */
async function broadcastInboxDisputeMessage(io, event, message) {
  if (!io || !message?.dispute_id || !message?.conversation_id) return false;
  const chatId = String(message.conversation_id);
  const disputeId = String(message.dispute_id);
  const audience = resolveDisputeMessageAudience(message);
  const senderIds = message.sender_id ? [String(message.sender_id)] : [];
  const targets = await resolveDisputeRealtimeTargets(chatId, audience, senderIds);

  const rooms = new Set(targets.accountIds.map(String));
  if (targets.includeChatRoom) rooms.add(chatId);
  if (rooms.size) io.to([...rooms]).emit(event, message);

  if (!['newMessage', 'messageReplied'].includes(event)) return true;
  emitDisputeChat('disputeMessage', {
    chatId,
    disputeId,
    payload: { ...mapMongoDisputeMessage(message), conversationId: chatId, disputeId },
    accountIds: targets.accountIds,
    includeChatRoom: targets.includeChatRoom,
    includePublicRoom: isPublishedAudience(audience),
  });
  return true;
}

function mapDisputeSummary(row, accountId) {
  const filedByMe = Boolean(accountId && String(row.by_account_id) === String(accountId));
  const namesMe = Boolean(
    accountId && row.for_account_id && String(row.for_account_id) === String(accountId)
  );
  const closed = String(row.status || '').toLowerCase() === 'closed';
  const visibility = Boolean(row.visibility);
  return {
    viewerRole: filedByMe ? 'disputer' : namesMe ? 'disputee' : null,
    id: row.dispute_id,
    number: row.dispute_number,
    title: row.title || row.description,
    type: row.type,
    status: row.status,
    reason: row.description || null,
    visibility,
    filedByMe,
    canAddInformation: filedByMe && !visibility && !closed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listAccountDisputes(accountId) {
  const result = await pool.query(
    `
    SELECT dispute_id, dispute_number, title, type, status, description, visibility,
           by_account_id, for_account_id, created_at, updated_at
    FROM disputes
    WHERE deleted_at IS NULL
      AND (
        by_account_id = $1
        OR (for_account_id = $1 AND visibility IS TRUE)
      )
    ORDER BY updated_at DESC NULLS LAST, created_at DESC
    `,
    [accountId]
  );
  return result.rows.map((row) => mapDisputeSummary(row, accountId));
}

const DISPUTE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function mapVisibleDispute(row, accountId) {
  const filed = String(row.by_account_id) === String(accountId);
  return {
    id: row.dispute_id,
    number: row.dispute_number || null,
    title: row.title || 'Dispute',
    type: row.type || 'Contract',
    status: String(row.status || 'open').toLowerCase(),
    updatedAt: row.updated_at || row.created_at || null,
    role: filed ? 'filed' : 'respondent',
  };
}

/** Disputes the dispute system has made visible. Hidden cases stay off public profiles. */
async function listVisibleAccountDisputes(accountId) {
  const result = await pool.query(
    `
    SELECT dispute_id, dispute_number, title, type, status, by_account_id, created_at, updated_at
    FROM disputes
    WHERE deleted_at IS NULL
      AND visibility IS TRUE
      AND (by_account_id = $1 OR for_account_id = $1)
    ORDER BY updated_at DESC NULLS LAST, created_at DESC
    LIMIT 50
    `,
    [accountId]
  );
  return result.rows.map((row) => mapVisibleDispute(row, accountId));
}

/**
 * Public discussion for a visible dispute.
 * Once staff make a dispute visible, party + public replies are shown like a forum thread.
 * Staff-only / targeted notes stay hidden from the public page.
 */
async function getPublicDisputeDiscussion(disputeId, viewerAccountId = null) {
  if (!DISPUTE_UUID.test(String(disputeId || ''))) return null;
  const result = await pool.query(
    `
    SELECT
      d.dispute_id,
      d.dispute_number,
      d.title,
      d.type,
      d.status,
      d.description,
      d.visibility,
      d.by_account_id,
      d.for_account_id,
      COALESCE(ia.display_name, NULLIF(TRIM(CONCAT_WS(' ', iu.first_name, iu.last_name)), '')) AS initiator_name,
      ia.handle AS initiator_handle,
      COALESCE(ra.display_name, NULLIF(TRIM(CONCAT_WS(' ', ru.first_name, ru.last_name)), '')) AS respondent_name,
      ra.handle AS respondent_handle
    FROM disputes d
    LEFT JOIN accounts ia ON ia.account_id = d.by_account_id
    LEFT JOIN users iu ON iu.account_id = ia.account_id
    LEFT JOIN accounts ra ON ra.account_id = d.for_account_id
    LEFT JOIN users ru ON ru.account_id = ra.account_id
    WHERE d.dispute_id = $1
      AND d.deleted_at IS NULL
    `,
    [disputeId]
  );
  const row = result.rows[0];
  if (!row || !row.visibility) return null;

  const isParty = Boolean(
    viewerAccountId
    && (String(row.by_account_id) === String(viewerAccountId)
      || String(row.for_account_id) === String(viewerAccountId))
  );
  const chatId = await getDisputeChatId(disputeId);
  const isFiler = Boolean(
    viewerAccountId && String(row.by_account_id) === String(viewerAccountId)
  );
  const isRespondent = Boolean(
    viewerAccountId && String(row.for_account_id) === String(viewerAccountId)
  );
  const closed = String(row.status || '').toLowerCase() === 'closed';
  // Forum view: everyone sees the open discussion. A staff reply aimed at one party or at
  // `parties` stays with its audience, so the "only you and staff" badge means what it says.
  const messages = (await listDisputeMessages(chatId)).filter((message) => {
    const audience = String(message.audience || '').toLowerCase();
    if (audience === 'public') return true;
    return canViewerSeeMessage(message, {
      accountId: viewerAccountId,
      isParty,
      isFiler,
      isRespondent,
      visibility: true,
    });
  });

  return {
    id: row.dispute_id,
    number: row.dispute_number || null,
    title: row.title || 'Dispute',
    type: row.type || 'Contract',
    status: String(row.status || 'open').toLowerCase(),
    description: row.description || null,
    initiator: {
      accountId: row.by_account_id || null,
      name: row.initiator_name || 'Unknown',
      handle: row.initiator_handle || null,
    },
    respondent: {
      accountId: row.for_account_id || null,
      name: row.respondent_name || 'Unknown',
      handle: row.respondent_handle || null,
    },
    isParty,
    // Lets the client say who else can read each message it was given.
    viewerRole: isFiler ? 'disputer' : isRespondent ? 'disputee' : viewerAccountId ? 'community' : null,
    canComment: Boolean(viewerAccountId) && !closed,
    // Replies from people outside the dispute are held for staff review before they appear.
    commentsNeedApproval: Boolean(viewerAccountId) && !isParty,
    // Only the two parties see how the money was split and when it lands.
    settlement: isParty ? await getDisputeSettlementForParty(disputeId, viewerAccountId) : null,
    chatId,
    messages,
  };
}

async function getAccountDispute(disputeId, accountId) {
  const result = await pool.query(
    `
    SELECT dispute_id, dispute_number, title, type, status, description, visibility, by_account_id, for_account_id, created_at, updated_at
    FROM disputes
    WHERE dispute_id = $1
      AND deleted_at IS NULL
      AND (
        by_account_id = $2
        OR for_account_id = $2
      )
    `,
    [disputeId, accountId]
  );
  const row = result.rows[0];
  if (!row) return null;
  const filer = String(row.by_account_id) === String(accountId);
  const isRespondent = String(row.for_account_id) === String(accountId);
  const isParty = filer || isRespondent;
  if (!row.visibility && !filer) return null;
  const chatId = await getDisputeChatId(disputeId);
  const messages = (await listDisputeMessages(chatId)).filter((message) =>
    canViewerSeeMessage(message, {
      accountId,
      isParty,
      isFiler: filer,
      isRespondent,
      visibility: Boolean(row.visibility),
    })
  );
  return {
    ...mapDisputeSummary(row, accountId),
    settlement: await getDisputeSettlementForParty(disputeId, accountId),
    chatId,
    messages,
  };
}

async function postPublicDisputeComment(
  disputeId,
  accountId,
  body,
  { replyToId = null, attachments = [] } = {}
) {
  if (!DISPUTE_UUID.test(String(disputeId || ''))) {
    const error = new Error('This dispute is not public.');
    error.statusCode = 404;
    throw error;
  }
  const text = String(body || '').trim();
  const files = normalizeDisputeAttachments(attachments);
  if (!text && !files.length) {
    const error = new Error('Write a comment or attach a file before sending.');
    error.statusCode = 400;
    throw error;
  }
  if (text.length > 2000) {
    const error = new Error('Comment is too long.');
    error.statusCode = 400;
    throw error;
  }

  const result = await pool.query(
    `
    SELECT dispute_id, dispute_number, visibility, status, by_account_id, for_account_id,
           handled_by_staff_id
    FROM disputes
    WHERE dispute_id = $1 AND deleted_at IS NULL
    `,
    [disputeId]
  );
  const row = result.rows[0];
  if (!row) {
    const error = new Error('This dispute is not public.');
    error.statusCode = 404;
    throw error;
  }

  const isFiler = String(row.by_account_id) === String(accountId);
  const isRespondent = String(row.for_account_id) === String(accountId);
  const isParty = isFiler || isRespondent;
  const closed = String(row.status || '').toLowerCase() === 'closed';

  if (!row.visibility) {
    if (!isFiler) {
      const error = new Error(
        isRespondent
          ? 'This dispute is not public yet. You cannot reply until staff open it.'
          : 'This dispute is not public.'
      );
      error.statusCode = isRespondent ? 403 : 404;
      throw error;
    }
    if (closed) {
      const error = new Error('This dispute is closed.');
      error.statusCode = 400;
      throw error;
    }
  } else if (closed) {
    const error = new Error('This dispute is closed. The discussion is read-only.');
    error.statusCode = 400;
    throw error;
  }

  const account = await pool.query(
    `SELECT display_name, handle FROM accounts WHERE account_id = $1`,
    [accountId]
  );
  const profile = account.rows[0] || {};
  const authorName = profile.display_name || profile.handle || 'Member';
  const authorRole = isFiler ? 'disputer' : isRespondent ? 'disputee' : 'community';
  // Disputer/disputee replies stay private to the author and staff by default.
  // Community replies also stay private until staff publishes them.
  const pendingReview = !isParty;

  const chatId = await ensureDisputeChat(disputeId, row);
  const replyTarget = await resolveDisputeReplyTarget(chatId, replyToId, {
    accountId,
    isParty,
    isFiler,
    isRespondent,
    visibility: Boolean(row.visibility),
  });
  // Party and community replies are staff-private by default. Staff can widen
  // audience later. Quoting a private message also never leaks into public.
  const quotesPrivate = Boolean(replyTarget && !isPublishedAudience(replyTarget.audience));
  const forStaff = true;
  const audience = 'author_and_staff';

  const message = await createDisputeMessage({
    chatId,
    body: text,
    senderId: accountId,
    authorName,
    authorType: 'user',
    authorRole,
    audience,
    audiences: [audience],
    isInternal: true,
    notifyAccountIds: [],
    disputeId,
    replyToId: replyTarget ? replyTarget.id : null,
    attachments: files,
  });
  const number = row.dispute_number || 'Dispute';
  if (pendingReview) {
    await notifyDisputeHandler(row, {
      message: `A community reply on dispute ${number} is waiting for review.`,
      path: `/disputes/${disputeId}`,
    });
  } else {
    await notifyDisputeHandler(row, {
      message: `New private reply from the ${authorRole} on dispute ${number}.`,
      path: `/disputes/${disputeId}`,
    });
  }
  return {
    private: forStaff,
    forStaff,
    pendingReview,
    quotesPrivate,
    audience,
    chatId,
    replyToId: replyTarget ? replyTarget.id : null,
    message,
  };
}

/** Notify the staff handler assigned to a dispute, when there is one. */
async function notifyDisputeHandler(row, { message, path } = {}) {
  if (!row?.dispute_id || !row?.handled_by_staff_id || !message) return;
  try {
    const staffAccount = await pool.query(
      `SELECT account_id FROM staff WHERE staff_id = $1`,
      [row.handled_by_staff_id]
    );
    const accountId = staffAccount.rows[0]?.account_id;
    if (!accountId) return;

    const NotificationRepositories = require('./NotificationRepositories');
    const notification = await NotificationRepositories.createNotification({
      account_id: accountId,
      message,
      reference_table: 'disputes',
      reference_prefix: 'DIS',
      reference_path: path || `/disputes/${row.dispute_id}`,
      reference_id: row.dispute_id,
    });
    let io = null;
    try {
      io = require('../lib/WebSocket').getIo();
    } catch {
      io = null;
    }
    if (io && notification) io.to(String(accountId)).emit('notification', notification);
  } catch (err) {
    console.warn('Dispute handler notification skipped:', err.message);
  }
}

async function notifyDisputeParties(row, { message, path, excludeAccountId = null, onlyFiler = false } = {}) {
  if (!row?.dispute_id || !message) return;
  const NotificationRepositories = require('./NotificationRepositories');
  let io = null;
  try {
    io = require('../lib/WebSocket').getIo();
  } catch {
    io = null;
  }

  const disputeId = row.dispute_id;
  const recipients = onlyFiler
    ? [row.by_account_id]
    : [row.by_account_id, row.for_account_id];
  const referencePath = path || (row.visibility ? `/disputes/${disputeId}` : '/contracts/disputes');
  const seen = new Set();

  for (const accountId of recipients) {
    if (!accountId) continue;
    const key = String(accountId);
    if (seen.has(key)) continue;
    if (excludeAccountId && key === String(excludeAccountId)) continue;
    seen.add(key);
    try {
      const notification = await NotificationRepositories.createNotification({
        account_id: accountId,
        message,
        reference_table: 'disputes',
        reference_prefix: 'DIS',
        reference_path: referencePath,
        reference_id: disputeId,
      });
      if (io && notification) io.to(key).emit('notification', notification);
    } catch (err) {
      console.warn('Dispute notification skipped:', err.message);
    }
  }
}

module.exports = {
  CONVERSATION_TYPE,
  DISPUTE_MESSAGE_AUDIENCES,
  isMongoReady,
  getDisputeChatId,
  ensureDisputeChat,
  listDisputeMessages,
  swapDisputePartyLabels,
  getDisputeMessage,
  resolveDisputeReplyTarget,
  normalizeDisputeAttachments,
  DISPUTE_ATTACHMENT_LIMIT,
  listAccountDisputes,
  listVisibleAccountDisputes,
  getPublicDisputeDiscussion,
  getAccountDispute,
  postPublicDisputeComment,
  notifyDisputeParties,
  notifyDisputeHandler,
  notifyDisputeAccount,
  postDisputeSystemMessage,
  getDisputeSettlementForParty,
  emitDisputeState,
  createDisputeMessage,
  updateDisputeMessageAudience,
  ensureStaffMemberOnChat,
  partyVisibleDisputePreview,
  canViewerSeeMessage,
  mapMongoDisputeMessage,
  resolveDisputeMessageAudience,
  broadcastInboxDisputeMessage,
  isPublishedAudience,
};
