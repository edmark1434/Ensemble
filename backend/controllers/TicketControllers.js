const {
    createTicketService,
} = require('../services/TicketServices');

async function createTicketController(req, res) {
    try {
        const { accountId } = req.session;
        const { subject, ticketType, description } = req.body;
        const ticket = await createTicketService({
            accountId,
            subject,
            ticketType,
            description,
        });
        res.status(201).json({success: true, message: 'Ticket created successfully', ticket});
    } catch (err) {
        console.error('Error in createTicketController:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

module.exports = {
    createTicketController
};