const {
    createNotification,
    getNotificationsByAccountId,
    markNotificationAsRead,
    markAllNotificationsAsRead
} = require("../repositories/NotificationRepositories");


async function getNotificationsByAccountIdServices(accountId) {
    return await getNotificationsByAccountId(accountId);
}

async function createNotificationServices(notificationData) {
    return await createNotification(notificationData);
}

async function markNotificationAsReadServices(notificationId, accountId) {
    if (!notificationId || !accountId) {
        throw new Error('Notification ID and account ID are required');
    }
    const notification = await markNotificationAsRead(notificationId, accountId);
    if (!notification) {
        const error = new Error('Notification not found');
        error.statusCode = 404;
        throw error;
    }
    return notification;
}

async function markAllNotificationsAsReadServices(accountId) {
    return await markAllNotificationsAsRead(accountId);
}

module.exports = {
    createNotificationServices,
    getNotificationsByAccountIdServices,
    markNotificationAsReadServices,
    markAllNotificationsAsReadServices
};
