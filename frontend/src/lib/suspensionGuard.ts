import { isStaffPreviewSearchForm } from "@/lib/staffPlatformView";

/**
 * Decides which controls a suspended member cannot use. A suspension is read-only, so these
 * are the controls that write: post, buy, order, send, react, upload, and so on. Reading,
 * navigating, searching, filtering, logging out and the appeal flow stay open.
 *
 * Pages with their own suspension handling (the forums) mark controls `disabled`, which this
 * leaves alone. Wrap anything that must stay usable in `data-suspension-keep`.
 */

/** Marks a locked control; styled and click-blocked by `SuspensionGuard`. */
export const SUSPENSION_LOCK_ATTR = "data-suspension-lock";
const TITLE_SET_ATTR = "data-suspension-title";
const READONLY_SET_ATTR = "data-suspension-readonly";

/** Pages where a suspended member must still act: the appeal page and appeal tickets. */
const OPEN_PATHS = /^\/(?:account|support)(?:\/|$)/i;

/** Create/checkout pages; links to them are locked (the route gate covers direct visits). */
export const SUSPENDED_ACTION_PATHS: RegExp[] = [
  /^\/jobs\/(?:create|edit)(?:\/|$)/i,
  /^\/jobs\/[^/]+\/make-proposal$/i,
  /^\/jobs\/proposals\/edit\//i,
  /^\/gigs\/(?:create|edit)(?:\/|$)/i,
  /^\/gigs\/services\/[^/]+\/order$/i,
  /^\/credits\/checkout$/i,
  /^\/projects\/select$/i,
  /^\/contracts\/dispute-form$/i,
  /^\/teams\/(?:join|invite)\//i,
  /^\/teams\/[^/]+\/business-verification$/i,
];

const WRITE_LABEL =
  /\b(like|unlike|save|unsave|follow|unfollow|message|buy|purchase|checkout|create|edit|delete|remove|submit|send|reply|comment|upload|apply|hire|report|invite|join|leave|pay|publish|unpublish|archive|unarchive|bookmark|offer|bid|propose|accept|decline|reject|withdraw|subscribe|upgrade|downgrade|react|claim|redeem|endorse|upvote|downvote|vote|favorite|favourite|cash out|cashout|transfer|distribute|add funds|top up|file a dispute|open a dispute|raise a dispute|add to cart|request revision|buy revision|deliver|mark as complete|mark complete|release|refund|extend|rate|order now|place order|place an order|order service|post a job|post a gig|post a service|post job|new discussion|new project|start project|use template|use in project|duplicate|restore|rename|verify now|start verification|add image|add review|write a review|leave a review)\b|\bpost\b/i;

/** Labels that only look, move around, or close something. These always stay usable. */
const PASSIVE_LABEL =
  /\b(back|previous|next|close|cancel|dismiss|menu|expand|collapse|theme|grid|list|filters?|sort|search|clear|view|show|hide|see|more|less|details|how to fix|appeal|sign out|log out|logout|download|copy|open chat|help)\b/i;

function controlLabel(element: Element): string {
  const labelled = element.getAttribute("aria-label") || element.getAttribute("title") || "";
  const text = "textContent" in element ? String(element.textContent || "") : "";
  return `${labelled} ${text}`.replace(/\s+/g, " ").trim();
}

function pathFromHref(href: string): string | null {
  if (!href || href.startsWith("#") || /^(?:mailto|tel|sms|blob|data|javascript):/i.test(href)) return null;
  try {
    const url = new URL(href, window.location.origin);
    return url.origin === window.location.origin ? url.pathname : null;
  } catch {
    return null;
  }
}

export function isSuspendedActionPath(pathname: string): boolean {
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return SUSPENDED_ACTION_PATHS.some((pattern) => pattern.test(path));
}

export function suspensionGuardApplies(pathname: string): boolean {
  return !OPEN_PATHS.test(pathname);
}

function isKept(element: Element): boolean {
  return Boolean(
    element.closest(
      "[data-suspension-keep], nav, aside, [role='status'], [role='tablist'], [role='tab'], [role='search'], [data-sonner-toaster], [data-rht-toaster]",
    ),
  );
}

/** The element to lock for `element`, or null when it stays usable. */
export function suspensionLockTarget(element: Element): Element | null {
  if (isKept(element)) return null;

  if (element instanceof HTMLTextAreaElement || element.getAttribute("contenteditable") === "true") {
    const form = element.closest("form");
    if (form && isStaffPreviewSearchForm(form)) return null;
    return element.closest("[data-staff-composer]") || element;
  }

  if (element instanceof HTMLInputElement) {
    if (element.type === "file") return element;
    if (element.type === "submit") {
      const form = element.form;
      return form && isStaffPreviewSearchForm(form) ? null : element;
    }
    return null;
  }

  const control = element.matches("button, a, [role='button']")
    ? element
    : element.closest("button, a, [role='button']");
  if (!control || isKept(control)) return null;
  if (control instanceof HTMLButtonElement && control.disabled) return null;
  if (control.getAttribute("aria-disabled") === "true" && !control.hasAttribute(SUSPENSION_LOCK_ATTR)) return null;

  // Links move around the site; only links into a create/checkout page are actions.
  const href = control.getAttribute("href");
  if (href != null) {
    const path = pathFromHref(href);
    return path && isSuspendedActionPath(path) ? control : null;
  }

  const label = controlLabel(control);
  if (!label) return null;
  // Cards and rows that open something (long text, an image or a heading inside) are reads.
  if (label.length > 48 || control.querySelector("img, h1, h2, h3, h4")) return null;
  if (PASSIVE_LABEL.test(label)) return null;
  return WRITE_LABEL.test(label) ? control : null;
}

const SCAN_QUERY = "button, a, [role='button'], textarea, input[type='file'], input[type='submit'], [contenteditable='true']";

function lock(target: Element, message: string) {
  if (target.hasAttribute(SUSPENSION_LOCK_ATTR)) return;
  target.setAttribute(SUSPENSION_LOCK_ATTR, "");
  target.setAttribute("aria-disabled", "true");
  if (!target.getAttribute("title")) {
    target.setAttribute("title", message);
    target.setAttribute(TITLE_SET_ATTR, "");
  }
  const fields = target instanceof HTMLTextAreaElement
    ? [target]
    : Array.from(target.querySelectorAll("textarea"));
  for (const field of fields) {
    if (!field.readOnly) {
      field.readOnly = true;
      field.setAttribute(READONLY_SET_ATTR, "");
    }
  }
}

function unlock(target: Element) {
  target.removeAttribute(SUSPENSION_LOCK_ATTR);
  target.removeAttribute("aria-disabled");
  if (target.hasAttribute(TITLE_SET_ATTR)) {
    target.removeAttribute("title");
    target.removeAttribute(TITLE_SET_ATTR);
  }
  const fields = target instanceof HTMLTextAreaElement
    ? [target]
    : Array.from(target.querySelectorAll(`textarea[${READONLY_SET_ATTR}]`));
  for (const field of fields) {
    if (field instanceof HTMLTextAreaElement && field.hasAttribute(READONLY_SET_ATTR)) {
      field.readOnly = false;
      field.removeAttribute(READONLY_SET_ATTR);
    }
  }
}

/** Lock every write control under `root`, and release ones that no longer qualify. */
export function applySuspensionLocks(root: ParentNode, message: string) {
  const wanted = new Set<Element>();
  root.querySelectorAll(SCAN_QUERY).forEach((element) => {
    const target = suspensionLockTarget(element);
    if (target) wanted.add(target);
  });
  root.querySelectorAll(`[${SUSPENSION_LOCK_ATTR}]`).forEach((element) => {
    if (!wanted.has(element)) unlock(element);
  });
  wanted.forEach((target) => lock(target, message));
}

export function clearSuspensionLocks(root: ParentNode) {
  root.querySelectorAll(`[${SUSPENSION_LOCK_ATTR}]`).forEach(unlock);
}

/** The locked control an event landed in, if any. */
export function lockedAncestor(target: EventTarget | null): Element | null {
  return target instanceof Element ? target.closest(`[${SUSPENSION_LOCK_ATTR}]`) : null;
}
