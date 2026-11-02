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
      ? 'author_and_staff'
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
    senderAccountId: m.sender_id || m.senderId || null,
    body: m.message_content || m.body || '',
    isInternal: Boolean(m.is_internal) || audience === 'staff' || audience === 'author_and_staff',
    audience,
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
  if (audience === 'parties') return Boolean(visibility && isParty);
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
        { audience: { $exists: false }, is_internal: { $ne: true } },
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
    const seen = new Set();
    if (includeChatRoom && chatId) {
      const room = String(chatId);
      io.to(room).emit(event, payload);
      seen.add(room);
    }
    if (includePublicRoom) {
      const room = publicDisputeRoom(disputeId);
      if (room && !seen.has(room)) {
        io.to(room).emit(event, payload);
        seen.add(room);
      }
    }
    for (const accountId of accountIds || []) {
      if (!accountId) continue;
      const key = String(accountId);
      if (seen.has(key)) continue;
      seen.add(key);
      io.to(key).emit(event, payload);
    }
  } catch (error) {
    console.error('Dispute message saved without realtime delivery:', error.message);
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

async function resolveDisputeRealtimeTargets(chatId, audience, notifyAccountIds = []) {
  const staffIds = await listDisputeChatMemberAccountIds(chatId, { roles: ['admin'] });
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
}) {
  if (!isMongoReady()) {
    throw new Error('MongoDB is not connected — cannot send dispute chat messages');
  }

  const now = new Date();
  const accountId = senderId ? String(senderId) : null;
  await ensureStaffMemberOnChat(chatId, accountId, now);

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
    message_id_reply: null,
    attachments: [],
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

  await touchDisputeInbox(chatId, body, now, { audience: normalizedAudience });

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
  return mapped;
}

function mapDisputeSummary(row, accountId) {
  const filedByMe = Boolean(accountId && String(row.by_account_id) === String(accountId));
  const closed = String(row.status || '').toLowerCase() === 'closed';
  const visibility = Boolean(row.visibility);
  return {
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
           by_account_id, created_at, updated_at
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
  const messages = (await listDisputeMessages(chatId)).filter((message) => {
    const audience = String(message.audience || '').toLowerCase();
    // Forum view: everyone sees the open discussion (parties + public).
    if (audience === 'public' || audience === 'parties') return true;
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
    canComment: Boolean(viewerAccountId) && !closed,
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
  return { ...mapDisputeSummary(row, accountId), chatId, messages };
}

async function postPublicDisputeComment(disputeId, accountId, body) {
  if (!DISPUTE_UUID.test(String(disputeId || ''))) {
    const error = new Error('This dispute is not public.');
    error.statusCode = 404;
    throw error;
  }
  const text = String(body || '').trim();
  if (!text) {
    const error = new Error('Write a comment before sending.');
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
    SELECT dispute_id, dispute_number, visibility, status, by_account_id, for_account_id
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
  const forStaff = !row.visibility && isFiler;
  // Hidden filer notes stay private. Once visible, replies join the public forum thread.
  const audience = forStaff ? 'author_and_staff' : 'public';

  const chatId = await ensureDisputeChat(disputeId, row);
  const notifyAccountIds = forStaff
    ? []
    : [row.by_account_id, row.for_account_id].filter(
        (id) => id && String(id) !== String(accountId)
      );
  const message = await createDisputeMessage({
    chatId,
    body: text,
    senderId: accountId,
    authorName,
    authorType: 'user',
    authorRole,
    audience,
    audiences: [audience],
    isInternal: forStaff,
    notifyAccountIds,
    disputeId,
  });
  if (row.visibility) {
    const number = row.dispute_number || 'Dispute';
    await notifyDisputeParties(row, {
      message: `New reply on dispute ${number}.`,
      path: `/disputes/${disputeId}`,
      excludeAccountId: accountId,
    });
  }
  return {
    private: forStaff,
    forStaff,
    audience,
    chatId,
    message,
  };
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
  listAccountDisputes,
  listVisibleAccountDisputes,
  getPublicDisputeDiscussion,
  getAccountDispute,
  postPublicDisputeComment,
  notifyDisputeParties,
  createDisputeMessage,
  updateDisputeMessageAudience,
  ensureStaffMemberOnChat,
  partyVisibleDisputePreview,
  canViewerSeeMessage,
  mapMongoDisputeMessage,
};
