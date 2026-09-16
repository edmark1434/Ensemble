const axios = require('axios');
const { getSectionValue } = require('../repositories/AdminSettingsRepositories');
const { DEFAULT_SETTINGS } = require('../lib/PlatformConfiguration');

async function getNotificationConfig() {
  try {
    const [notifications, platform] = await Promise.all([
      getSectionValue('notifications').catch(() => DEFAULT_SETTINGS.notifications),
      getSectionValue('platform').catch(() => DEFAULT_SETTINGS.platform),
    ]);
    return {
      notifications: { ...DEFAULT_SETTINGS.notifications, ...(notifications || {}) },
      platform: { ...DEFAULT_SETTINGS.platform, ...(platform || {}) },
    };
  } catch (_err) {
    return {
      notifications: DEFAULT_SETTINGS.notifications,
      platform: DEFAULT_SETTINGS.platform,
    };
  }
}

async function sendSlackAlert(message) {
  const { notifications } = await getNotificationConfig();
  if (!notifications.slackWebhookEnabled || !notifications.slackWebhookUrl) {
    return false;
  }
  try {
    await axios.post(
      notifications.slackWebhookUrl,
      { text: String(message || '') },
      { timeout: 5000, headers: { 'Content-Type': 'application/json' } }
    );
    return true;
  } catch (error) {
    console.error('Failed to post alert to Slack webhook:', error.message);
    return false;
  }
}

async function sendStaffAlertEmail(subject, text) {
  const { platform } = await getNotificationConfig();
  const recipient = platform.supportEmail || DEFAULT_SETTINGS.platform.supportEmail;
  if (!process.env.BREVO_API_KEY) {
    console.log(`[Staff Alert Email Simulator] To: ${recipient} | Subject: ${subject} | Body: ${text}`);
    return true;
  }
  try {
    const payload = {
      sender: { name: platform.siteName || 'Ensemble Support', email: recipient },
      to: [{ email: recipient, name: 'Staff Support' }],
      subject: `[${platform.siteName || 'Ensemble'} Alert] ${subject}`,
      textContent: text,
    };
    await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        Accept: 'application/json',
      },
      timeout: 5000,
    });
    return true;
  } catch (error) {
    console.error('Failed to send staff alert email:', error.message);
    return false;
  }
}

async function dispatchPlatformNotification(type, payload = {}) {
  try {
    const { notifications } = await getNotificationConfig();
    let message = '';
    let shouldEmail = false;

    switch (type) {
      case 'NEW_SIGNUP':
        message = `New user registration: ${payload.firstName || payload.displayName || 'User'} (${payload.email || payload.emailAddress || 'no-email'})`;
        shouldEmail = Boolean(notifications.emailNewSignups);
        break;

      case 'NEW_TICKET':
        message = `New support ticket #${payload.ticket_number || payload.ticketNumber || payload.ticket_id || 'new'}: ${payload.reason || payload.type || 'Support inquiry'}`;
        shouldEmail = Boolean(notifications.emailNewTickets);
        break;

      case 'DISPUTE_OPENED':
        message = `Dispute opened: #${payload.dispute_id || payload.disputeId || 'new'} - ${payload.title || payload.reason || payload.type || 'Dispute inquiry'}`;
        shouldEmail = Boolean(notifications.emailDisputeOpened);
        break;

      case 'HIGH_PRIORITY_REPORT':
        message = `High priority report filed: ${payload.reason || payload.category || 'Moderation report'}`;
        shouldEmail = Boolean(notifications.emailHighPriorityReports);
        break;

      default:
        message = `Platform event: ${type}`;
        shouldEmail = false;
        break;
    }

    const actions = [];
    if (shouldEmail) {
      actions.push(sendStaffAlertEmail(message, message));
    }
    if (notifications.slackWebhookEnabled && notifications.slackWebhookUrl) {
      actions.push(sendSlackAlert(message));
    }

    await Promise.allSettled(actions);
    return { dispatched: true, type, message };
  } catch (err) {
    console.error('Platform alert notification failed:', err.message);
    return { dispatched: false, error: err.message };
  }
}

module.exports = {
  getNotificationConfig,
  sendSlackAlert,
  sendStaffAlertEmail,
  dispatchPlatformNotification,
};
