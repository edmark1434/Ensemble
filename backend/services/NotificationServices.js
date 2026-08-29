const {
    createNotification,
    getNotificationsByAccountId,
    markNotificationAsRead,
    markAllNotificationsAsRead
} = require("../repositories/NotificationRepositories");
const { getAuthorizedActorAccountIds } = require("./MarketplaceActorServices");


async function getNotificationsByAccountIdServices(accountId) {
    const accountIds = await getAuthorizedActorAccountIds(accountId);
    return await getNotificationsByAccountId(accountIds);
}

async function createNotificationServices(notificationData) {
    return await createNotification(notificationData);
}

async function markNotificationAsReadServices(notificationId, accountId) {
    if (!notificationId || !accountId) {
        throw new Error('Notification ID and account ID are required');
    }
    const accountIds = await getAuthorizedActorAccountIds(accountId);
    const notification = await markNotificationAsRead(notificationId, accountIds);
    if (!notification) {
        const error = new Error('Notification not found');
        error.statusCode = 404;
        throw error;
    }
    return notification;
}

async function markAllNotificationsAsReadServices(accountId) {
    const accountIds = await getAuthorizedActorAccountIds(accountId);
    return await markAllNotificationsAsRead(accountIds);
}

module.exports = {
    createNotificationServices,
    getNotificationsByAccountIdServices,
    markNotificationAsReadServices,
    markAllNotificationsAsReadServices
};
