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

function mapMongoDisputeMessage(m) {
  const audience =
    m.audience ||
    (m.is_internal
      ? 'staff'
      : m.published_at
        ? 'parties'
        : m.author_role && m.author_role !== 'staff'
          ? 'author_and_staff'
          : 'parties');
  return {
    id: String(m._id),
    authorType: m.author_type || (m.is_internal ? 'staff' : 'user'),
    authorName: m.author_name || 'Unknown',
    authorRole: m.author_role || (m.author_type === 'staff' ? 'staff' : null),
    body: m.message_content || m.body || '',
    isInternal: Boolean(m.is_internal) || audience === 'staff',
    audience,
    publishedAt: m.published_at || null,
    createdAt: m.created_at || m.createdAt || null,
  };
}

const DISPUTE_MESSAGE_AUDIENCES = ['staff', 'author_and_staff', 'parties', 'public'];

function isPublishedAudience(audience) {
  return audience === 'parties' || audience === 'public';
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

async function touchDisputeInbox(chatId, lastMessage, now = new Date()) {
  if (!ObjectId.isValid(chatId)) return;
  const db = mongoDb();
  if (!db) return;
  await db.collection('inbox').updateOne(
    { _id: new ObjectId(chatId) },
    { $set: { updated_at: now, last_message: lastMessage, last_message_time: now } }
  );
}

/**
 * Insert a dispute message into Mongo `messages` and update the inbox preview.
 * @returns {Promise<string>} Mongo message id
 */
async function createDisputeMessage({
  chatId,
  body,
  senderId,
  authorName,
  authorType = 'staff',
  authorRole = 'staff',
  audience = 'staff',
  audiences = null,
  isInternal = false,
}) {
  if (!isMongoReady()) {
    throw new Error('MongoDB is not connected — cannot send dispute chat messages');
  }

  const now = new Date();
  const accountId = senderId ? String(senderId) : null;
  await ensureStaffMemberOnChat(chatId, accountId, now);

  const audienceList =
    Array.isArray(audiences) && audiences.length
      ? [...new Set(audiences.map((a) => String(a).toLowerCase()))]
      : [audience];

  const insertedId = await createMessageRepositories({
    conversation_id: String(chatId),
    sender_id: accountId,
    message_type: 'text',
    message_content: body,
    message_id_reply: null,
    attachments: [],
    links: [],
    message_react: [],
    read_by: accountId ? [{ account_id: accountId, read_at: now }] : [],
    is_edited: false,
    is_deleted: false,
    is_internal: Boolean(isInternal) || audience === 'staff',
    author_type: authorType,
    author_name: authorName || 'Staff',
    author_role: authorRole,
    audience,
    audiences: audienceList,
    published_at: isPublishedAudience(audience) ? now : null,
    created_at: now,
    updated_at: now,
  });

  await touchDisputeInbox(chatId, body, now);
  return String(insertedId);
}

async function updateDisputeMessageAudience(chatId, messageId, audience) {
  if (!isMongoReady()) {
    throw new Error('MongoDB is not connected — cannot update dispute messages');
  }

  const nextAudience = String(audience || '').toLowerCase();
  if (!DISPUTE_MESSAGE_AUDIENCES.includes(nextAudience)) {
    throw new Error('Invalid audience. Use staff, author_and_staff, parties, or public.');
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
        is_internal: nextAudience === 'staff',
        published_at: isPublishedAudience(nextAudience) ? now : null,
        updated_at: now,
      },
    }
  );

  if (!result.matchedCount) throw new Error('Message not found.');
  return nextAudience;
}

function mapDisputeSummary(row) {
  return {
    id: row.dispute_id,
    number: row.dispute_number,
    title: row.title || row.reason,
    type: row.type,
    status: row.status,
    reason: row.reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listAccountDisputes(accountId) {
  const result = await pool.query(
    `
    SELECT dispute_id, dispute_number, title, type, status, reason, created_at, updated_at
    FROM disputes
    WHERE deleted_at IS NULL
      AND (
        by_account_id = $1
        OR for_account_id = $1
      )
    ORDER BY updated_at DESC NULLS LAST, created_at DESC
    `,
    [accountId]
  );
  return result.rows.map(mapDisputeSummary);
}

const DISPUTE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function mapVisibleDispute(row, accountId) {
  const filed = String(row.by_account_id) === String(accountId);
  return {
    id: row.dispute_id,
    number: row.dispute_number || null,
    title: row.title || 'Dispute',
    type: row.type || 'General',
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
 * Public messages are shown to everyone. Party messages are shown only to the two parties.
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

  const viewer = viewerAccountId ? String(viewerAccountId) : '';
  const isParty = Boolean(
    viewer && (viewer === String(row.by_account_id) || viewer === String(row.for_account_id))
  );
  const chatId = await getDisputeChatId(disputeId);
  const messages = (await listDisputeMessages(chatId)).filter((message) => {
    if (message.isInternal || message.audience === 'staff' || message.audience === 'author_and_staff') {
      return false;
    }
    if (message.audience === 'public') return true;
    return message.audience === 'parties' && isParty;
  });

  return {
    id: row.dispute_id,
    number: row.dispute_number || null,
    title: row.title || 'Dispute',
    type: row.type || 'General',
    status: String(row.status || 'open').toLowerCase(),
    description: row.description || null,
    initiator: { name: row.initiator_name || 'Unknown', handle: row.initiator_handle || null },
    respondent: { name: row.respondent_name || 'Unknown', handle: row.respondent_handle || null },
    messages,
  };
}

async function getAccountDispute(disputeId, accountId) {
  const result = await pool.query(
    `
    SELECT dispute_id, dispute_number, title, type, status, reason, created_at, updated_at, outcome
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
  const chatId = await getDisputeChatId(disputeId);
  const messages = (await listDisputeMessages(chatId)).filter(
    (message) => !message.isInternal && (message.audience === 'parties' || message.audience === 'public')
  );
  return { ...mapDisputeSummary(row), outcome: row.outcome || null, messages };
}

module.exports = {
  CONVERSATION_TYPE,
  DISPUTE_MESSAGE_AUDIENCES,
  isMongoReady,
  getDisputeChatId,
  ensureDisputeChat,
  listDisputeMessages,
  listAccountDisputes,
  listVisibleAccountDisputes,
  getPublicDisputeDiscussion,
  getAccountDispute,
  createDisputeMessage,
  updateDisputeMessageAudience,
  mapMongoDisputeMessage,
};
