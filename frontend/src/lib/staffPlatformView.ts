const ACTION_LABEL =
  /\b(like|unlike|save|unsave|follow|unfollow|message|chat|buy|purchase|checkout|create|edit|delete|remove|submit|send|reply|comment|upload|apply|hire|report|share|invite|join|leave|pay|publish|archive|download|bookmark|contact|offer|bid|propose|accept|decline|reject|withdraw|subscribe|upgrade|block|mute|pin|react|logout|log out|sign out|settings|feedback|notification|ask ai|top up)\b/i;

/** Pages staff may open to look at people and the member site. */
const VIEW_PATH = /^\/(?:home|forums|jobs|gigs|assets|discovery|projects|teams|search)(?:\/|$)|^\/profile\/[^/]+\/?$/i;

/** The signed-in member's own account tools. Other people's profiles stay visible. */
const ACCOUNT_ONLY_PATH = /^\/(?:settings|credits(?:-subscriptions)?|notifications|account-verification-status)\/?$|^\/profile\/?$/i;

const PASSIVE_CONTROL_LABEL =
  /\b(back|previous|next|close|menu|expand|collapse|theme|grid|list|filter|sort|search)\b/i;

export function isStaffConsolePath(pathname: string): boolean {
  return pathname === "/admin"
    || pathname === "/staff"
    || pathname.startsWith("/admin/")
    || pathname.startsWith("/staff/")
    || pathname.startsWith("/moderator/");
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

function pathFromHref(href: string): string | null {
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return null;
  try {
    return new URL(href, window.location.origin).pathname;
  } catch {
    return null;
  }
}

/** Action control to hide in the staff preview. Links that open people, forums, jobs, and listings stay. */
export function staffPreviewHideTarget(element: Element): Element | null {
  if (element.closest("[data-staff-view-keep], aside, nav")) return null;

  if (element instanceof HTMLTextAreaElement || element.getAttribute("contenteditable") === "true") {
    return element.closest("form") || element;
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
  if (path && VIEW_PATH.test(path)) return null;
  if (path && ACCOUNT_ONLY_PATH.test(path)) return control;

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
