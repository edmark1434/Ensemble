const { createNotification } = require('../repositories/NotificationRepositories');
const { SUSPENDED_ACTION_MESSAGE } = require('../lib/AccountRestriction');

async function notifyAccountSuspended(accountId) {
  if (!accountId) return null;
  const notification = await createNotification({
    account_id: accountId,
    message: SUSPENDED_ACTION_MESSAGE,
    is_read: false,
    reference_table: 'accounts',
    reference_prefix: 'SUSPEND',
    reference_path: '/notifications',
    reference_id: accountId,
  });

  try {
    const { getIo } = require('../lib/WebSocket');
    const io = getIo();
    if (io) io.to(String(accountId)).emit('notification', notification);
  } catch (err) {
    console.warn('Suspension notification was saved but not broadcast:', err.message);
  }

  return notification;
}

module.exports = { notifyAccountSuspended };
