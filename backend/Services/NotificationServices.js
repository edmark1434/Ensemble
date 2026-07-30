const {
    createNotification,
    getNotificationsByAccountId,
    markNotificationAsRead,
    markAllNotificationsAsRead
} = require("../Repositories/NotificationRepositories");


async function getNotificationsByAccountIdServices(accountId) {
    return await getNotificationsByAccountId(accountId);
}

async function createNotificationServices(notificationData) {
    return await createNotification(notificationData);
}

async function markNotificationAsReadServices(notificationId) {
    return await markNotificationAsRead(notificationId);
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