/**
 * Reads behind a member's Cases view: their support tickets and the standing that decides
 * what they may do on them. Business rules live in `services/CaseServices.js`.
 */
const { pool } = require('../lib/Database');

/**
 * Tickets the account filed or was added to, newest activity first, with the chat each one
 * lives in (so old `?conversation=` links can find their case).
 * @param {string} accountId
 * @param {string[]} participantTicketIds tickets the account joined as a participant
 */
async function listAccountTickets(accountId, participantTicketIds = []) {
  const result = await pool.query(
    `
    SELECT t.ticket_id, t.ticket_number, t.reason, t.type, t.priority, t.status, t.account_id,
           t.message_count, t.last_message_at, t.last_message_author_type, t.satisfaction_score,
           t.created_at, t.updated_at, t.resolved_at, tc.chat_id
    FROM tickets t
    LEFT JOIN ticket_chats tc ON tc.ticket_id = t.ticket_id AND tc.deleted_at IS NULL
    WHERE t.deleted_at IS NULL
      AND (t.account_id = $1 OR t.ticket_id = ANY($2::uuid[]))
    ORDER BY t.updated_at DESC NULLS LAST, t.created_at DESC
    `,
    [accountId, participantTicketIds]
  );
  return result.rows;
}

/** One ticket row with its chat id, for live updates. */
async function getTicketCaseRow(ticketId) {
  const result = await pool.query(
    `
    SELECT t.ticket_id, t.ticket_number, t.reason, t.type, t.priority, t.status, t.account_id,
           t.message_count, t.last_message_at, t.last_message_author_type, t.satisfaction_score,
           t.created_at, t.updated_at, t.resolved_at, tc.chat_id
    FROM tickets t
    LEFT JOIN ticket_chats tc ON tc.ticket_id = t.ticket_id AND tc.deleted_at IS NULL
    WHERE t.ticket_id = $1 AND t.deleted_at IS NULL
    `,
    [ticketId]
  );
  return result.rows[0] || null;
}

/**
 * Status and type of each account, for working out what a live update allows. The full
 * standing (`getAccountAccess`) also lifts expired penalties, which is too heavy per event;
 * the client reads the case back over HTTP right after, where the full check applies.
 * @returns {Promise<Map<string, { status: string, type: string }>>}
 */
async function loadAccountStatuses(accountIds) {
  const ids = [...new Set((accountIds || []).filter(Boolean).map(String))];
  if (!ids.length) return new Map();
  const result = await pool.query(
    `SELECT account_id::text AS account_id, status, type FROM accounts WHERE account_id::text = ANY($1::text[])`,
    [ids]
  );
  return new Map(result.rows.map((row) => [String(row.account_id), { status: row.status, type: row.type }]));
}

module.exports = {
  listAccountTickets,
  getTicketCaseRow,
  loadAccountStatuses,
};
