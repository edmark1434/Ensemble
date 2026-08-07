const {
    createTicket,
    createTicketChat
} = require('../repositories/TicketRepositories');

async function createTicketService(payload) {
    try {
        if (!payload.subject) {
            throw new Error('Subject is required');
        }
        if(!payload.ticketType){
            throw new Error('Ticket type is required');
        }
        if(!payload.description){
            throw new Error('Description is required');
        }
        const ticketChat = await createTicketChat({
            created_at: new Date(),
        });
        const ticket = await createTicket({
            account_id: payload.accountId || null,
            ticket_chat_id: ticketChat.ticket_chat_id,
            subject: payload.subject,
            type: payload.ticketType,
            description: payload.description,
        });
        return ticket;
    }catch (err) {
        console.error('Error in createTicketService:', err);
        throw err;
    }
}

module.exports = {
    createTicketService
};