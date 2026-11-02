const GUEST_EXACT_PATHS = new Set([
  "/home",
  "/forums",
  "/assets",
  "/jobs",
  "/jobs/postings",
  "/jobs/info",
  "/jobs/proposals/flow",
  "/gigs",
  "/gigs/services",
  "/gigs/info",
  "/gigs/orders/flow",
  "/gigs/orders/info",
  "/discovery",
  "/discovery/creators",
  "/discovery/teams",
  "/discovery/gallery",
  "/discovery/info",
  "/projects",
]);

const GUEST_DETAIL_PATHS = [
  /^\/forums\/(?:group|discussion)\/[^/]+$/,
  /^\/assets\/[^/]+$/,
  /^\/jobs\/postings\/[^/]+(?:\/page)?$/,
  /^\/jobs\/[^/]+\/page$/,
  /^\/gigs\/services\/[^/]+(?:\/page)?$/,
  /^\/profile\/[^/]+$/,
  /^\/disputes\/[^/]+$/,
  /^\/teams\/(?:invite|join)\/[^/]+$/,
  /^\/teams\/[^/]+$/,
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

