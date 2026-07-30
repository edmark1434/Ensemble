const { pool } = require('../lib/database');


async function createTicket({
    account_id = null,
    escalated_by_staff_id = null,
    handled_by_staff_id = null,
    type = null,
    subject = null,
    ticket_chat_id = null,
    description = null,
    status = 'Open',
    created_at = new Date(),
    updated_at = new Date(),
    close_at = null,
    deleted_at = null
}) {
    try {
        const query = `INSERT INTO TICKETS (ACCOUNT_ID,TYPE,SUBJECT,DESCRIPTION,STATUS,CREATED_AT,UPDATED_AT,TICKET_CHAT_ID) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`;
        const values = [account_id, type, subject, description, status, created_at, updated_at, ticket_chat_id];
        const result = await pool.query(query, values);
        return result.rows[0];
    }catch (err) {
        console.error('Error creating ticket:', err);
        throw err;
    }
}

async function createTicketChat({
    ticket_chat_id = null,
    created_at = new Date(),
    last_message_at = null,
    deleted_at = null
}) {
    try {
        const query = `INSERT INTO ticket_chats ( created_at) VALUES ($1) RETURNING ticket_chat_id`;
        const result = await pool.query(query, [created_at]);
        return result.rows[0];
    }catch (err) {
        console.error('Error creating ticket chat:', err);
        throw err;
    }
}

async function createTicketMessage(
    ticket_chat_id = null,
    message = null,
    created_at = new Date(),
    updated_at = new Date(),
    deleted_at = null
) {
    try {
        
    }catch (err) {
        console.error('Error creating ticket message:', err);
        throw err;
    }
}

async function ticketMessageAttachment(
    ticket_message_id = null,
    file_id = null,
    index = null,
    created_at = new Date(),
) {
    
}

module.exports = {
    createTicket,
    createTicketChat,
    createTicketMessage,
    ticketMessageAttachment
};