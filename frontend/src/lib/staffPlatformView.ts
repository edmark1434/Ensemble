import { isGuestAllowedPath } from "./guestRouteAccess";

const EXTRA_BROWSE_PATHS = [
  /^\/discovery\/[^/]+$/,
  /^\/search\/user\/[^/]+$/,
  /^\/profile$/,
];

const ACTION_LABEL =
  /\b(like|unlike|save|unsave|follow|unfollow|message|chat|buy|purchase|checkout|order|post|create|edit|delete|remove|submit|send|reply|comment|upload|apply|hire|report|share|invite|join|leave|pay|publish|archive|download|bookmark|contact|offer|bid|propose|accept|decline|reject|withdraw|subscribe|upgrade|block|mute|pin|react|logout|log out|sign out)\b/i;

const PASSIVE_CONTROL_LABEL =
  /\b(back|previous|next|close|menu|expand|collapse|theme|grid|list|filter|sort|search)\b/i;

export function isStaffConsolePath(pathname: string): boolean {
  return pathname === "/admin"
    || pathname === "/staff"
    || pathname.startsWith("/admin/")
    || pathname.startsWith("/staff/")
    || pathname.startsWith("/moderator/");
}

export function isStaffBrowsePath(pathname: string): boolean {
  const path = !pathname || pathname === "/"
    ? "/"
    : pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;
  return isGuestAllowedPath(path) || EXTRA_BROWSE_PATHS.some((pattern) => pattern.test(path));
}

export function isStaffPreviewFrame(): boolean {
  return typeof window !== "undefined" && window.self !== window.top;
}

export function isStaffPlatformViewer(user: { type?: string | null } | null | undefined): boolean {
  return user?.type === "Staff" && isStaffPreviewFrame();
}

function controlLabel(element: Element): string {
  const labelled = element.getAttribute("aria-label") || element.getAttribute("title") || "";
  const text = "textContent" in element ? String(element.textContent || "") : "";
  return `${labelled} ${text}`.replace(/\s+/g, " ").trim();
}

export function isAllowedStaffBrowseClick(target: Element): boolean {
  if (target.closest("[data-staff-view-allow]")) return true;
  if (target.closest("aside, nav")) return true;

  const anchor = target.closest("a[href]");
  if (anchor) {
    const href = anchor.getAttribute("href") || "";
    if (!href || href.startsWith("#")) return true;
    if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return false;
    try {
      const url = new URL(href, window.location.origin);
      if (url.origin !== window.location.origin) return false;
      return isStaffBrowsePath(url.pathname);
    } catch {
      return false;
    }
  }

  const control = target.closest(
    "button, input, textarea, select, label, [role='button'], [contenteditable='true']"
  );
  if (!control) return true;
  if (control instanceof HTMLTextAreaElement || control.getAttribute("contenteditable") === "true") return false;
  if (control instanceof HTMLSelectElement) return true;
  if (control instanceof HTMLInputElement) {
    return control.type === "search" || control.type === "text";
  }

  const label = controlLabel(control);
  if (ACTION_LABEL.test(label)) return false;
  if (!label) return PASSIVE_CONTROL_LABEL.test(control.getAttribute("aria-label") || "");
  return true;
}
