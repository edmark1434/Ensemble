/**
 * Dispute discussion threads live entirely in MongoDB (inbox + messages).
 * Postgres `dispute_chats` only stores the link: dispute_id → Mongo ObjectId string.
 * There is no Postgres dispute_messages table — do not reintroduce one.
 */
const { ObjectId } = require('mongodb');
const { pool } = require('../lib/database');
const { getMongoClient } = require('../lib/mongodb');
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

  addMember(disputeRow.initiator_account_id || disputeRow.by_account_id, 'member');
  addMember(disputeRow.respondent_account_id || disputeRow.for_account_id, 'member');

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
  isInternal = false,
}) {
  if (!isMongoReady()) {
    throw new Error('MongoDB is not connected — cannot send dispute chat messages');
  }

  const now = new Date();
  const accountId = senderId ? String(senderId) : null;
  await ensureStaffMemberOnChat(chatId, accountId, now);

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

module.exports = {
  CONVERSATION_TYPE,
  DISPUTE_MESSAGE_AUDIENCES,
  isMongoReady,
  getDisputeChatId,
  ensureDisputeChat,
  listDisputeMessages,
  createDisputeMessage,
  updateDisputeMessageAudience,
  mapMongoDisputeMessage,
};
