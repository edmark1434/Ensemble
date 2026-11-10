/**
 * Admin and staff consoles are moving off the main site onto their own hosts.
 * Route modules still use /admin and /staff. On a console host the browser
 * shows the path without that prefix, and the router maps it back.
 *
 * Local:  http://admin.localhost:5173  and  http://staff.localhost:5173
 * Prod:   https://admin.ensemble.software  and  https://staff.ensemble.software
 *
 * Moderator desks stay on the main site for now.
 *
 * Platform view frames member pages from the console host itself, so the
 * preview keeps the staff session and same-origin messaging. Inside that
 * frame no path mapping or cross-host redirect applies.
 */

export type ConsoleId = 'admin' | 'staff';

const APEX = 'ensemble.software';

const ADMIN_SECTIONS = new Set([
  'dashboard',
  'feedbacks',
  'badges',
  'warnings',
  'badge-grant',
  'user-team',
  'credit-economy',
  'moderation',
  'analytics',
  'ticket-management',
  'system-settings',
  'platform-view',
]);

const STAFF_SECTIONS = new Set(['dashboard', 'platform-view']);

type LocationLike = {
  protocol: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  origin: string;
};

function envOrigin(name: 'VITE_APP_ORIGIN' | 'VITE_ADMIN_ORIGIN' | 'VITE_STAFF_ORIGIN'): string | null {
  const value = String(import.meta.env[name] || '').trim().replace(/\/$/, '');
  return value || null;
}

function bareHost(hostname: string): string {
  return hostname.toLowerCase().replace(/\.$/, '');
}

export function consoleIdFromHostname(hostname: string): ConsoleId | null {
  const host = bareHost(hostname);
  if (host === 'admin.localhost' || host === `admin.${APEX}`) return 'admin';
  if (host === 'staff.localhost' || host === `staff.${APEX}`) return 'staff';
  return null;
}

function isApexHost(hostname: string): boolean {
  const host = bareHost(hostname);
  return host === 'localhost' || host === APEX || host === `www.${APEX}`;
}

function portSuffix(loc: LocationLike): string {
  if (!loc.port) return '';
  if (loc.protocol === 'https:' && loc.port === '443') return '';
  if (loc.protocol === 'http:' && loc.port === '80') return '';
  return `:${loc.port}`;
}

export function mainSiteOrigin(loc: LocationLike = window.location): string {
  const configured = envOrigin('VITE_APP_ORIGIN');
  if (configured) return configured;
  const host = bareHost(loc.hostname);
  if (host === 'localhost' || host.endsWith('.localhost')) {
    return `${loc.protocol}//localhost${portSuffix(loc)}`;
  }
  if (host === APEX || host === `www.${APEX}` || host === `admin.${APEX}` || host === `staff.${APEX}`) {
    return `${loc.protocol}//${APEX}${portSuffix(loc)}`;
  }
  return loc.origin;
}

export function consoleOrigin(id: ConsoleId, loc: LocationLike = window.location): string | null {
  const configured = envOrigin(id === 'admin' ? 'VITE_ADMIN_ORIGIN' : 'VITE_STAFF_ORIGIN');
  if (configured) return configured;
  const host = bareHost(loc.hostname);
  if (host === 'localhost' || host.endsWith('.localhost')) {
    return `${loc.protocol}//${id}.localhost${portSuffix(loc)}`;
  }
  if (host === APEX || host === `www.${APEX}` || host === `admin.${APEX}` || host === `staff.${APEX}`) {
    return `${loc.protocol}//${id}.${APEX}`;
  }
  return null;
}

/** Same-origin API on local console hosts so session cookies stay first-party. */
export function devConsoleApiOrigin(): string | null {
  if (typeof window === 'undefined') return null;
  const host = bareHost(window.location.hostname);
  if (host !== 'admin.localhost' && host !== 'staff.localhost') return null;
  return window.location.origin;
}

export function stripConsolePrefix(pathname: string, id: ConsoleId): string | null {
  const prefix = `/${id}`;
  if (pathname === prefix) return '/';
  if (pathname.startsWith(`${prefix}/`)) return pathname.slice(prefix.length) || '/';
  return null;
}

export function routerPathFromPublic(pathname: string, id: ConsoleId): string {
  const prefix = `/${id}`;
  if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return pathname;
  if (pathname === '/') return prefix;
  return `${prefix}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

export function publicPathFromRouter(pathname: string, id: ConsoleId): string {
  const prefix = `/${id}`;
  if (pathname === prefix) return '/';
  if (pathname.startsWith(`${prefix}/`)) return pathname.slice(prefix.length) || '/';
  return pathname;
}

export function isConsolePublicPath(id: ConsoleId, pathname: string): boolean {
  const path = pathname.split('?')[0].split('#')[0].replace(/\/$/, '') || '/';
  if (path === '/') return true;
  const section = path.replace(/^\//, '').split('/')[0];
  const sections = id === 'admin' ? ADMIN_SECTIONS : STAFF_SECTIONS;
  return sections.has(section);
}

export function joinUrl(origin: string, pathname: string, search = '', hash = ''): string {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const query = search ? (search.startsWith('?') ? search : `?${search}`) : '';
  const fragment = hash ? (hash.startsWith('#') ? hash : `#${hash}`) : '';
  return `${origin}${path}${query}${fragment}`;
}

/** Old /admin and /staff URLs on the main site, sent to the console host. */
export function legacyConsoleRedirect(loc: LocationLike): string | null {
  if (consoleIdFromHostname(loc.hostname) || !isApexHost(loc.hostname)) return null;
  const id = loc.pathname === '/admin' || loc.pathname.startsWith('/admin/')
    ? 'admin'
    : loc.pathname === '/staff' || loc.pathname.startsWith('/staff/')
      ? 'staff'
      : null;
  if (!id) return null;
  const origin = consoleOrigin(id, loc);
  if (!origin) return null;
  const pathname = stripConsolePrefix(loc.pathname, id) ?? '/';
  return joinUrl(origin, pathname, loc.search, loc.hash);
}

export function consoleEntryUrl(id: ConsoleId): string {
  const origin = typeof window === 'undefined' ? null : consoleOrigin(id);
  if (origin && origin !== window.location.origin) return `${origin}/`;
  return id === 'admin' ? '/admin' : '/staff';
}

function isFramed(): boolean {
  return window.self !== window.top;
}

function hasSameOriginParent(): boolean {
  try {
    return window.parent.location.origin === window.location.origin;
  } catch {
    return false;
  }
}

/** Console host serving the address bar, not a platform-view frame. */
export function activeConsoleId(): ConsoleId | null {
  if (typeof window === 'undefined' || isFramed()) return null;
  return consoleIdFromHostname(window.location.hostname);
}

export function isConsoleLoginPath(pathname: string): boolean {
  const path = pathname.replace(/\/$/, '') || '/';
  if (path === '/login' || path === '/admin' || path === '/staff') return true;
  return Boolean(activeConsoleId()) && path === '/';
}

export function authFailureHref(): string {
  return activeConsoleId() ? '/' : '/login';
}

function canonicalizeConsoleLocation(id: ConsoleId) {
  const stripped = stripConsolePrefix(window.location.pathname, id);
  if (stripped === null) return;
  const next = `${stripped}${window.location.search}${window.location.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next === current) return;
  window.history.replaceState(window.history.state, '', next);
}

/** Run before the app renders. Returns true when the browser is leaving this page. */
export function bootConsoleHost(): boolean {
  if (typeof window === 'undefined') return false;
  if (consoleIdFromHostname(window.location.hostname) && isFramed()) {
    // Only the console's own platform view may frame it. Anything else is clickjacking.
    return !hasSameOriginParent();
  }
  if (isFramed()) return false;
  const away = legacyConsoleRedirect(window.location);
  if (away) {
    window.location.replace(away);
    return true;
  }
  const id = consoleIdFromHostname(window.location.hostname);
  if (!id) return false;
  const stripped = stripConsolePrefix(window.location.pathname, id) ?? window.location.pathname;
  if (!isConsolePublicPath(id, stripped)) {
    window.location.replace(joinUrl(mainSiteOrigin(), stripped, window.location.search, window.location.hash));
    return true;
  }
  canonicalizeConsoleLocation(id);
  return false;
}
