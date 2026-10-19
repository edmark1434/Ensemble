const {
    getNotificationsByAccountIdServices,
    markNotificationAsReadServices,
    markAllNotificationsAsReadServices
} = require('../services/NotificationServices');
const { sendDynamicEmailService } = require('../services/EmailServices');

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

async function sendDynamicEmailController(req, res) {
    try {
        const { recipient, subject, content, links } = req.body;
        const result = await sendDynamicEmailService({
            recipient,
            subject,
            content,
            links,
        });
        return res.status(200).json({
            success: true,
            message: 'Email sent successfully',
            data: {
                recipient: result.recipient,
                subject,
                linksCount: result.validLinksCount ?? (links || []).length,
                simulated: result.simulated
            }
        });
    } catch (err) {
        console.error('Error sending dynamic email:', err.message);
        return res.status(err.statusCode || 400).json({
            success: false,
            message: err.message || 'Failed to send email'
        });
    }
}

module.exports = {
    getNotificationsByAccountIdController,
    markNotificationAsReadController,
    markAllNotificationsAsReadController,
    sendDynamicEmailController
}
