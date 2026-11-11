const redisClient = require('../lib/Redis');
const { getSectionValue } = require('../repositories/AdminSettingsRepositories');

const MAINTENANCE_PAYLOAD = {
  success: false,
  code: 'MAINTENANCE_MODE',
  message: 'Ensemble is undergoing scheduled maintenance. Please try again later.',
};

function normalizePath(req) {
  const raw = String(req.originalUrl || req.url || '').split('?')[0];
  return raw.replace(/^\/api/, '') || '/';
}

function isAlwaysAllowed(method, path) {
  if (path === '/configuration/public' || path.startsWith('/configuration/')) return true;
  if (path.startsWith('/admin')) return true;
  if (path.startsWith('/staff')) return true;
  if (path.startsWith('/moderator')) return true;
  if (path.startsWith('/verification/webhook')) return true;
  if (path.includes('/webhooks/')) return true;
  if (path === '/csrf-token') return true;
  if (method === 'POST' && path === '/users/login') return true;
  if (method === 'POST' && path === '/users/logout') return true;

  // Public landing / marketing reads
  if (method === 'GET' && path === '/subscription/plans') return true;
  if (method === 'GET' && (path === '/jobs' || path.startsWith('/jobs?'))) return true;
  if (method === 'GET' && (path === '/gigs' || path.startsWith('/gigs?'))) return true;
  if (method === 'GET' && path === '/accounts/recent-avatars') return true;
  if (method === 'GET' && path === '/feedbacks/rating') return true;
  if (method === 'POST' && path === '/feedbacks') return true;
  if (method === 'PUT' && path === '/feedbacks/rating') return true;
  if (method === 'POST' && (path === '/chat' || path.startsWith('/chat/'))) return true;
  if (method === 'GET' && path === '/users/ticket-catalog') return true;
  if (method === 'GET' && (path === '/countries' || path === '/places')) return true;

  return false;
}

async function readSessionType(req) {
  if (req.session?.type) return req.session.type;
  const sessionId = req.cookies?.sessionId;
  if (!sessionId) return null;
  try {
    const raw = await redisClient.get(`session:${sessionId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    req.session = parsed;
    return parsed?.type || null;
  } catch {
    return null;
  }
}

async function isMaintenanceEnabled() {
  try {
    const platform = await getSectionValue('platform');
    return Boolean(platform?.maintenanceMode);
  } catch {
    return false;
  }
}

async function maintenanceMode(req, res, next) {
  try {
    const enabled = await isMaintenanceEnabled();
    if (!enabled) return next();

    const method = String(req.method || 'GET').toUpperCase();
    const path = normalizePath(req);
    if (isAlwaysAllowed(method, path)) return next();

    const sessionType = await readSessionType(req);
    if (sessionType === 'Staff') return next();

    return res.status(503).json(MAINTENANCE_PAYLOAD);
  } catch (err) {
    console.error('Maintenance mode middleware failed:', err.message);
    return next();
  }
}

module.exports = {
  maintenanceMode,
  isMaintenanceEnabled,
  MAINTENANCE_PAYLOAD,
};
