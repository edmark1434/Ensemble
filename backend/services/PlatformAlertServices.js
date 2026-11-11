const axios = require('axios');
const { getSectionValue } = require('../repositories/AdminSettingsRepositories');
const { DEFAULT_SETTINGS } = require('../lib/PlatformConfiguration');

async function getPlatformAlertConfig() {
  try {
    const platform = await getSectionValue('platform').catch(() => DEFAULT_SETTINGS.platform);
    return {
      platform: { ...DEFAULT_SETTINGS.platform, ...(platform || {}) },
    };
  } catch (_err) {
    return {
      platform: DEFAULT_SETTINGS.platform,
    };
  }
}

async function sendStaffAlertEmail(subject, text) {
  const { platform } = await getPlatformAlertConfig();
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
    let message = '';
    let shouldEmail = false;

    switch (type) {
      case 'NEW_SIGNUP':
        message = `New user registration: ${payload.firstName || payload.displayName || 'User'} (${payload.email || payload.emailAddress || 'no-email'})`;
        shouldEmail = true;
        break;

      case 'NEW_TICKET':
        message = `New support ticket #${payload.ticket_number || payload.ticketNumber || payload.ticket_id || 'new'}: ${payload.reason || payload.type || 'Support inquiry'}`;
        shouldEmail = true;
        break;

      case 'DISPUTE_OPENED':
        message = `Dispute opened: #${payload.dispute_id || payload.disputeId || 'new'} - ${payload.title || payload.reason || payload.type || 'Dispute inquiry'}`;
        shouldEmail = true;
        break;

      case 'HIGH_PRIORITY_REPORT':
        message = `High priority report filed: ${payload.reason || payload.category || 'Moderation report'}`;
        shouldEmail = true;
        break;

      default:
        message = `Platform event: ${type}`;
        shouldEmail = false;
        break;
    }

    if (shouldEmail) {
      await sendStaffAlertEmail(message, message);
    }
    return { dispatched: true, type, message };
  } catch (err) {
    console.error('Platform alert notification failed:', err.message);
    return { dispatched: false, error: err.message };
  }
}

module.exports = {
  getPlatformAlertConfig,
  /** @deprecated Use getPlatformAlertConfig. Kept for older callers. */
  getNotificationConfig: getPlatformAlertConfig,
  sendStaffAlertEmail,
  dispatchPlatformNotification,
};
