const {
    getNotificationsByAccountIdServices,
    markNotificationAsReadServices,
    markAllNotificationsAsReadServices
} = require('../services/NotificationServices');

async function getNotificationsByAccountIdController(req, res) {
    try {
        const accountId = req.session.account_id;
        const notifications = await getNotificationsByAccountIdServices(accountId);
        res.status(200).json({
            success: true,
            message: "Notifications fetched successfully",
            notifications: notifications
        });
    } catch (err) {
        console.error("Error fetching notifications:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

async function markNotificationAsReadController(req, res) {
    try {
        const notification = await markNotificationAsReadServices(
            req.params.notificationId,
            req.session.account_id
        );
        return res.status(200).json({ success: true, notification });
    } catch (err) {
        console.error("Error marking notification as read:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            error: err.message || "Internal Server Error"
        });
    }
}

async function markAllNotificationsAsReadController(req, res) {
    try {
        const notifications = await markAllNotificationsAsReadServices(
            req.session.account_id
        );
        return res.status(200).json({ success: true, notifications });
    } catch (err) {
        console.error("Error marking all notifications as read:", err);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error"
        });
    }
}

module.exports = {
    getNotificationsByAccountIdController,
    markNotificationAsReadController,
    markAllNotificationsAsReadController
}
