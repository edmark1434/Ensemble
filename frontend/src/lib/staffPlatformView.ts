import { consoleIdFromHostname, isConsolePublicPath, mainSiteOrigin } from "./consoleHosts";

const ACTION_LABEL =
  /\b(like|unlike|save|unsave|follow|unfollow|message|chat|buy|purchase|checkout|create|edit|delete|remove|submit|send|reply|comment|upload|apply|hire|report|share|invite|join|leave|pay|publish|archive|download|bookmark|contact|offer|bid|propose|accept|decline|reject|withdraw|subscribe|upgrade|block|mute|pin|react|logout|log out|sign out|settings|feedback|notification|ask ai|top up|verify now|verify first|transaction history|my transaction|my terms|my contracts|add image|upload image|post a job|post a service|post a gig|post job|start project|new discussion|create discussion|create post|write a comment|write a reply|make a proposal|place an order|add review|write a review|leave a review|rate this|order now|place order|order service|request to join|use template|use in project|open in editor|claim|redeem|endorse|upvote|downvote|vote|favorite|favourite|cash out|cashout|transfer|distribute|add funds|file a dispute|open a dispute|raise a dispute|add to cart|buy revision|request revision|mark as read|mark all as read)\b|\bpost\b/i;

/**
 * Member-only tools, and the staff account's own pages (its projects, saved items,
 * orders, inbox). Staff can look at public pages, not these.
 */
const ACTION_PATHS: RegExp[] = [
  /^\/jobs\/(?:create|edit|proposals|applied|saved-posts|my-job-post)(?:\/|$)/i,
  /^\/jobs\/postings\/choose$/i,
  /^\/jobs\/[^/]+\/make-proposal$/i,
  /^\/gigs\/(?:create|edit|orders|my-orders|saved-services|my-services)(?:\/|$)/i,
  /^\/gigs\/services\/[^/]+\/order$/i,
  /^\/assets\/(?:owned|purchased|saved|liked)$/i,
  /^\/projects(?:\/|$)/i,
  /^\/teams\/(?:join|invite)\//i,
  /^\/teams\/[^/]+\/(?:business-verification|tasks)(?:\/|$)/i,
  /^\/(?:workspaces|team-project|team-projects)(?:\/|$)/i,
  /^\/(?:credits|credits-subscriptions|settings|notifications|account-verification-status|transactions|terms-of-services|contracts|contract|dashboard|inbox|review|update|orders|my-orders)(?:\/|$)/i,
  /^\/profile$/i,
  /^\/support\/ticket$/i,
];

/** Not member pages at all: sign-in, setup, the appeal page. Platform view never shows them. */
const OFF_SITE_PATH = /^\/(?:login|signup|verify-email|forgot-password|reset-password|setup|account)(?:\/|$)/i;

/** Pages staff may open to look at people and the member site. */
const VIEW_PATH = /^\/(?:home|forums|jobs|gigs|assets|discovery|teams|search|disputes)(?:\/|$)|^\/profile\/[^/]+\/?$/i;

const PASSIVE_CONTROL_LABEL =
  /\b(back|previous|next|close|menu|expand|collapse|theme|grid|list|filter|sort|search)\b/i;

export const STAFF_PREVIEW_NAV_MESSAGE = "ensemble-staff-preview-nav";
/** Frame → console: the page the frame shows now. */
export const STAFF_PREVIEW_LOCATION_MESSAGE = "ensemble-staff-preview-location";
/** Frame → console: the staff session could not be refreshed. */
export const STAFF_PREVIEW_SESSION_MESSAGE = "ensemble-staff-preview-session";

/** Member-site path that may be shown inside platform view. Staff console paths stay out. */
export function memberPreviewPath(value: string | null | undefined): string | null {
  if (!value) return null;
  const path = value.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://") || path.includes("\\")) {
    return null;
  }
  const pathname = path.split("?")[0].split("#")[0];
  if (isStaffConsolePath(pathname)) return null;
  return path;
}

/** Path to load in platform view: blocked pages are swapped for their section's public page. */
export function staffPreviewStartPath(value: string | null | undefined): string | null {
  const path = memberPreviewPath(value);
  if (!path) return null;
  return staffPreviewViewFallback(path) || path;
}

function isEnsembleHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (host === window.location.hostname.toLowerCase()) return true;
  if (consoleIdFromHostname(host)) return true;
  try {
    const main = new URL(mainSiteOrigin()).hostname.toLowerCase();
    return host === main || host === `www.${main}`;
  } catch {
    return false;
  }
}

/**
 * A member page typed or pasted into platform view: a path ("/forums", "forums/group/1")
 * or a link to the member site or a console host. Other sites return null.
 */
export function memberPathFromInput(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  if (raw.startsWith("/")) {
    const [pathname, query = ""] = raw.split("?");
    if (/\/platform-view\/?$/i.test(pathname)) {
      return memberPreviewPath(new URLSearchParams(query.split("#")[0]).get("path"));
    }
    return memberPreviewPath(raw);
  }
  const looksLikeUrl = /^[a-z][a-z\d+.-]*:\/\//i.test(raw)
    || /^(?:localhost|[\w-]+(?:\.[\w-]+)+)(?::\d+)?(?:[/?#]|$)/i.test(raw);
  if (!looksLikeUrl) return memberPreviewPath(`/${raw}`);
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!isEnsembleHost(url.hostname)) return null;
    // A platform-view link shared by another staff member opens the page it points to.
    if (/\/platform-view\/?$/i.test(url.pathname)) return memberPreviewPath(url.searchParams.get("path"));
    // Console hosts drop the /admin or /staff prefix, so "/moderation" there is a console page.
    const consoleId = consoleIdFromHostname(url.hostname);
    if (consoleId && isConsolePublicPath(consoleId, url.pathname)) return null;
    return memberPreviewPath(`${url.pathname}${url.search}${url.hash}`);
  } catch {
    return null;
  }
}

export function isStaffConsolePath(pathname: string): boolean {
  return pathname === "/admin"
    || pathname === "/staff"
    || pathname.startsWith("/admin/")
    || pathname.startsWith("/staff/")
    || pathname === "/moderator"
    || pathname.startsWith("/moderator/");
}

export function isStaffPreviewFrame(): boolean {
  return typeof window !== "undefined" && window.self !== window.top;
}

export function isStaffPlatformViewer(user: { type?: string | null } | null | undefined): boolean {
  return user?.type === "Staff" && isStaffPreviewFrame();
}

/** Tell the console that hosts this frame something. Does nothing outside platform view. */
export function postToStaffPreviewParent(message: Record<string, unknown>) {
  if (!isStaffPreviewFrame()) return;
  try {
    window.parent.postMessage(message, window.location.origin);
  } catch {
    // The console closed the frame.
  }
}

let lastInteractionAt = 0;

/** The staff viewer pressed or typed something just now. */
export function markStaffPreviewInteraction() {
  lastInteractionAt = Date.now();
}

/** True right after a click or key press, so a blocked request was the viewer's own action. */
export function staffPreviewInteractedRecently(windowMs = 1500): boolean {
  return Date.now() - lastInteractionAt < windowMs;
}

function controlLabel(element: Element): string {
  const labelled = element.getAttribute("aria-label") || element.getAttribute("title") || "";
  const text = "textContent" in element ? String(element.textContent || "") : "";
  return `${labelled} ${text}`.replace(/\s+/g, " ").trim();
}

/** Public page to show instead of a member tool, sign-in page or console page. Null when the path is viewable. */
export function staffPreviewViewFallback(pathname: string): string | null {
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  const blocked = path === "/"
    || isStaffConsolePath(path)
    || OFF_SITE_PATH.test(path)
    || ACTION_PATHS.some((pattern) => pattern.test(path));
  if (!blocked) return null;
  if (/^\/jobs(?:\/|$)/i.test(path)) return "/jobs/postings";
  if (/^\/gigs(?:\/|$)/i.test(path)) return "/gigs/services";
  if (/^\/assets(?:\/|$)/i.test(path)) return "/assets";
  if (/^\/teams(?:\/|$)/i.test(path)) return "/teams";
  return "/home";
}

/**
 * Path of a link that opens a page on this site, or null for other sites, API calls,
 * files, and non-page links (mailto, blob, ...).
 */
export function sameOriginPath(href: string): string | null {
  if (!href || href.startsWith("#") || /^(?:mailto|tel|sms|blob|data|javascript|about):/i.test(href)) return null;
  try {
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return null;
    if (/^\/(?:api|socket\.io)(?:\/|$)/i.test(url.pathname)) return null;
    if (/\.[a-z0-9]{2,5}$/i.test(url.pathname)) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

/** Pathname of a link on this site. Links to other sites are judged by their label instead. */
function pathFromHref(href: string): string | null {
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return null;
  try {
    const url = new URL(href, window.location.origin);
    return url.origin === window.location.origin ? url.pathname : null;
  } catch {
    return null;
  }
}

/** Action control to hide in the staff preview. Links that open people, forums, jobs, and listings stay. */
export function staffPreviewHideTarget(element: Element): Element | null {
  if (element.closest("[data-staff-view-keep], aside, nav")) return null;

  if (element instanceof HTMLTextAreaElement || element.getAttribute("contenteditable") === "true") {
    return element.closest("[data-staff-composer], form") || element;
  }

  if (element instanceof HTMLInputElement) {
    if (element.type === "file" || element.type === "submit" || element.type === "password") {
      return element;
    }
    return null;
  }

  const control = element.matches("button, a, [role='button']")
    ? element
    : element.closest("button, a, [role='button']");
  if (!control || control.closest("aside, nav")) return null;

  const path = pathFromHref(control.getAttribute("href") || "");
  if (path && staffPreviewViewFallback(path)) return control;
  if (path && VIEW_PATH.test(path)) return null;

  const label = controlLabel(control);
  const opensContent = label.length > 48 || Boolean(control.querySelector("img, h1, h2, h3, h4"));
  if (opensContent) return null;

  if (ACTION_LABEL.test(label)) return control;

  const isButton = control.tagName === "BUTTON" || control.getAttribute("role") === "button";
  if (!isButton || label) return null;
  if (control.querySelector("img")) return null;
  const hint = control.getAttribute("aria-label") || control.getAttribute("title") || "";
  if (PASSIVE_CONTROL_LABEL.test(hint)) return null;
  return control;
}
