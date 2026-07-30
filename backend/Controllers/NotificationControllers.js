const {
    getNotificationsByAccountIdServices,
    markNotificationAsRead,
    markAllNotificationsAsRead
} = require('../Services/NotificationServices');

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

module.exports = {
    getNotificationsByAccountIdController
}