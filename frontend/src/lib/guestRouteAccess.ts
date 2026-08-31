const GUEST_EXACT_PATHS = new Set([
  "/home",
  "/forums",
  "/assets",
  "/jobs",
  "/jobs/postings",
  "/gigs",
  "/gigs/services",
]);

const GUEST_DETAIL_PATHS = [
  /^\/forums\/(?:group|discussion)\/[^/]+$/,
  /^\/assets\/[^/]+$/,
  /^\/jobs\/postings\/[^/]+$/,
  /^\/gigs\/services\/[^/]+(?:\/page)?$/,
  /^\/profile\/[^/]+$/,
  /^\/search\/user\/[^/]+$/,
];

function normalizePath(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

export function isGuestAllowedPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  return GUEST_EXACT_PATHS.has(path)
    || GUEST_DETAIL_PATHS.some((pattern) => pattern.test(path));
}

