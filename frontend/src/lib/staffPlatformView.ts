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

/** Action control to hide in the staff preview. Navigation and readable content stay. */
export function staffPreviewHideTarget(element: Element): Element | null {
  if (element.closest("aside, nav, [data-staff-view-keep]")) return null;

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

  const label = controlLabel(control);
  if (ACTION_LABEL.test(label)) {
    if (control.tagName === "A" && label.length > 48) return null;
    return control;
  }

  const isButton = control.tagName === "BUTTON" || control.getAttribute("role") === "button";
  if (!isButton || label) return null;
  if (control.closest("header")) return null;
  const hint = control.getAttribute("aria-label") || control.getAttribute("title") || "";
  if (PASSIVE_CONTROL_LABEL.test(hint)) return null;
  return control;
}
