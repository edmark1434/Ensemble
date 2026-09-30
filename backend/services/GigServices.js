// backend/services/GigServices.js
const {
    shortlistGigOrderRepository,
    unshortlistGigOrderRepository,
    acceptGigOrderRepository,
    confirmGigOrderContractRepository
} = require('../repositories/GigRepositories');
const { createNotificationServices } = require('./NotificationServices');
const { getIo } = require('../lib/WebSocket');

async function shortlistGigOrderService(orderId, actorIds, options = {}) {
    const result = await shortlistGigOrderRepository(orderId, actorIds);
    try {
        const notif = await createNotificationServices({
            account_id: result.client_account_id,
            message: `Your gig order for '${result.gig_title}' has been shortlisted by the freelancer.`,
            reference_table: 'gig_requests',
            reference_prefix: 'shortlisted',
            reference_path: `/gigs/orders/sent/${orderId}`,
            reference_id: orderId
        });
        const io = getIo();
        if (io) {
            io.to(String(result.client_account_id)).emit('notification', notif);
        }
    } catch (notifErr) {
        console.error('Error sending gig shortlist notification:', notifErr);
    }

    let chatResult = null;
    let createdMessage = null;
    if (options.initialMessage && options.actorAccountId) {
        try {
            const { createMarketplaceChatServices, createMessageServices } = require('./InboxServices');
            const io = getIo();

            chatResult = await createMarketplaceChatServices(
                {
                    context_type: 'gig_order',
                    context_id: String(orderId),
                },
                options.actorAccountId,
                {
                    onNotification: (recipientId, notification) => {
                        if (io && notification) io.to(String(recipientId)).emit('notification', notification);
                    },
                    onConversationCreated: (recipientId, inbox) => {
                        if (io && inbox) io.to(String(recipientId)).emit('conversationCreated', inbox);
                    },
                }
            );

            if (chatResult?.inbox?._id) {
                const messageDoc = await createMessageServices(
                    {
                        conversation_id: String(chatResult.inbox._id),
                        message_content: options.initialMessage.trim(),
                    },
                    options.actorAccountId,
                    {
                        onNotification: (recipientId, notification) => {
                            if (io && notification) {
                                io.to(String(recipientId)).emit('notification', notification);
                            }
                        },
                    }
                );
                createdMessage = messageDoc;

                if (io) {
                    const convId = String(chatResult.inbox._id);
                    if (result.client_account_id) {
                        io.to(String(result.client_account_id)).emit('conversationCreated', chatResult.inbox);
                    }
                    io.to(String(options.actorAccountId)).emit('conversationCreated', chatResult.inbox);

                    io.to(convId).emit('newMessage', messageDoc);
                    if (result.client_account_id) {
                        io.to(String(result.client_account_id)).emit('newMessage', messageDoc);
                        io.to(String(result.client_account_id)).emit('conversationMessageNotification', messageDoc);
                        io.to(String(result.client_account_id)).emit('openFloatingChat', {
                            conversation_id: convId,
                            inbox: chatResult.inbox,
                            initialMessage: messageDoc,
                        });
                    }
                    io.to(String(options.actorAccountId)).emit('newMessage', messageDoc);
                }
            }
        } catch (msgErr) {
            console.error('Error creating marketplace conversation or sending gig shortlist initial message:', msgErr);
        }
    }

    return {
        ...result.order,
        conversation: chatResult?.inbox || null,
        initialMessage: createdMessage || null,
    };
}

async function unshortlistGigOrderService(orderId, actorIds) {
    const result = await unshortlistGigOrderRepository(orderId, actorIds);
    try {
        const notif = await createNotificationServices({
            account_id: result.client_account_id,
            message: `Your gig order for '${result.gig_title}' has been removed from the shortlist.`,
            reference_table: 'gig_requests',
            reference_prefix: 'unshortlisted',
            reference_path: `/gigs/orders/sent/${orderId}`,
            reference_id: orderId
        });
        const io = getIo();
        if (io) {
            io.to(String(result.client_account_id)).emit('notification', notif);
        }
    } catch (notifErr) {
        console.error('Error sending gig unshortlist notification:', notifErr);
    }
    return result.order;
}

async function acceptGigOrderService(orderId, actorIds) {
    const result = await acceptGigOrderRepository(orderId, actorIds);
    try {
        const notif = await createNotificationServices({
            account_id: result.client_account_id,
            message: `Your gig order for '${result.gig_title}' has been accepted by the freelancer! Please review and confirm to start the contract.`,
            reference_table: 'gig_requests',
            reference_prefix: 'accepted',
            reference_path: `/gigs/orders/sent/${orderId}`,
            reference_id: orderId
        });
        const io = getIo();
        if (io) {
            io.to(String(result.client_account_id)).emit('notification', notif);
        }
    } catch (notifErr) {
        console.error('Error sending gig accept notification:', notifErr);
    }
    return result;
}

async function confirmGigOrderContractService(orderId, actorIds) {
    const result = await confirmGigOrderContractRepository(orderId, actorIds);
    const { contractId, gig_title, freelancer_account_id, client_account_id } = result;

    try {
        const io = getIo();
        const clientNotif = await createNotificationServices({
            account_id: client_account_id,
            message: `Your gig order contract for '${gig_title}' has started successfully.`,
            reference_table: 'contracts',
            reference_prefix: 'CON',
            reference_path: `/contracts/${contractId}`,
            reference_id: contractId
        });
        const freelancerNotif = await createNotificationServices({
            account_id: freelancer_account_id,
            message: `The client confirmed and funded your gig order for '${gig_title}'. The contract is now active!`,
            reference_table: 'contracts',
            reference_prefix: 'CON',
            reference_path: `/contracts/${contractId}`,
            reference_id: contractId
        });

        if (io) {
            if (client_account_id) io.to(String(client_account_id)).emit('notification', clientNotif);
            if (freelancer_account_id) io.to(String(freelancer_account_id)).emit('notification', freelancerNotif);
        }
    } catch (notifErr) {
        console.error('Error sending contract start notifications:', notifErr);
    }

    return { contractId };
}

module.exports = {
    shortlistGigOrderService,
    unshortlistGigOrderService,
    acceptGigOrderService,
    confirmGigOrderContractService
};
