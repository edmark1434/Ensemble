import { useEffect } from "react";
import type { NavigateFunction } from "react-router-dom";
import { showCustomToast } from "@/components/utility/toast";
import {
  isStaffPreviewSearchForm,
  markStaffPreviewInteraction,
  MODERATION_SUBJECT_ATTR,
  moderationSubjectKey,
  sameOriginPath,
  staffPreviewHideTarget,
  staffPreviewViewFallback,
} from "@/lib/staffPlatformView";

/** Set on `<html>` while staff pick an item on the page; the view-only guard stands aside. */
const PICK_MODE_ATTR = "data-staff-pick";
/** The one item under the pointer in pick mode (nested items would all match `:hover`). */
const PICK_HOVER_ATTR = "data-staff-pick-hover";

/** Hides what `useStaffPlatformGuard` marks, and draws pick mode. Rendered by the frame bridge while the guard runs. */
export const STAFF_PREVIEW_HIDE_CSS = [
  "[data-staff-preview-hide]{display:none !important;}",
  `html[${PICK_MODE_ATTR}], html[${PICK_MODE_ATTR}] *{cursor:crosshair !important;}`,
  `html[${PICK_MODE_ATTR}] [${MODERATION_SUBJECT_ATTR}]{outline:1px dashed rgba(251,113,133,.45);outline-offset:3px;}`,
  `html[${PICK_MODE_ATTR}] [${PICK_HOVER_ATTR}]{outline:2px solid #fb7185 !important;outline-offset:3px;background-color:rgba(251,113,133,.07) !important;}`,
].join("");

const ACTION_QUERY = "button, a, [role='button'], textarea, input, [contenteditable='true']";
const VIEW_ONLY_TOAST_ID = "staff-platform-view-only";

/** One notice at a time, shown when staff try a member action in platform view. */
export function showStaffViewOnlyNotice() {
  showCustomToast(
    "Platform view is view-only",
    "Member actions such as posting, buying, and messaging are off for staff accounts.",
    { id: VIEW_ONLY_TOAST_ID },
  );
}

function hideStaffActions(root: ParentNode) {
  root.querySelectorAll(ACTION_QUERY).forEach((element) => {
    const target = staffPreviewHideTarget(element);
    if (!target || target.hasAttribute("data-staff-preview-hide")) return;
    target.setAttribute("data-staff-preview-hide", "");
  });
}

/** Link that should open inside the frame: a new-tab or modifier click on a page of this site. */
function inFrameLinkPath(event: MouseEvent, target: Element): string | null {
  const anchor = target.closest("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  const newTab = anchor.target === "_blank" || event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1;
  if (!newTab) return null;
  const path = sameOriginPath(anchor.getAttribute("href") || "");
  return path ? staffPreviewViewFallback(path) || path : null;
}

/**
 * "Pick an item on the page": items marked with `data-moderation-subject` light up under the
 * pointer, and a click hands that item's key to `onPicked` instead of doing anything on the
 * page. Clicks elsewhere do nothing; Escape ends it with `null`. The key is only a pointer:
 * the console asks the server what the item is.
 */
export function useStaffPickMode(active: boolean, onPicked: (subject: string | null) => void) {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    root.setAttribute(PICK_MODE_ATTR, "");
    let hovered: Element | null = null;

    const subjectOf = (target: EventTarget | null) =>
      target instanceof Element ? target.closest(`[${MODERATION_SUBJECT_ATTR}]`) : null;

    const setHovered = (next: Element | null) => {
      if (hovered === next) return;
      hovered?.removeAttribute(PICK_HOVER_ATTR);
      hovered = next;
      hovered?.setAttribute(PICK_HOVER_ATTR, "");
    };

    const stop = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    const onPointerMove = (event: PointerEvent) => setHovered(subjectOf(event.target));
    const onClick = (event: MouseEvent) => {
      stop(event);
      const element = subjectOf(event.target);
      const key = moderationSubjectKey(element?.getAttribute(MODERATION_SUBJECT_ATTR));
      if (key) onPicked(key);
    };
    // Nothing on the page reacts while picking: no menus, no navigation, no focus changes.
    const swallow = (event: Event) => stop(event);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      stop(event);
      onPicked(null);
    };

    document.addEventListener("pointermove", onPointerMove, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("pointerdown", swallow, true);
    document.addEventListener("mousedown", swallow, true);
    document.addEventListener("auxclick", swallow, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      setHovered(null);
      root.removeAttribute(PICK_MODE_ATTR);
      document.removeEventListener("pointermove", onPointerMove, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("pointerdown", swallow, true);
      document.removeEventListener("mousedown", swallow, true);
      document.removeEventListener("auxclick", swallow, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [active, onPicked]);
}

export function useStaffPlatformGuard(active: boolean, navigate: NavigateFunction) {
  useEffect(() => {
    if (!active) return;

    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => hideStaffActions(document));
    };

    const stop = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    const blockInteraction = (event: Event) => {
      // Pick mode owns clicks while it runs (`useStaffPickMode` stops every one of them).
      if (event.type === "click" && document.documentElement.hasAttribute(PICK_MODE_ATTR)) return;
      // auxclick also fires for the right button; only a middle click opens links.
      if (event.type === "auxclick" && (event as MouseEvent).button !== 1) return;
      if (event.type === "submit") {
        // Search boxes (header creator search, people search, discovery) only read; the page handles them.
        if (event.target instanceof HTMLFormElement && isStaffPreviewSearchForm(event.target)) return;
        stop(event);
        showStaffViewOnlyNotice();
        return;
      }
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (staffPreviewHideTarget(target)) {
        stop(event);
        if (event.type === "click") showStaffViewOnlyNotice();
        return;
      }
      // The frame cannot open tabs on this site (they would leave the console), so links open in place.
      const path = event instanceof MouseEvent ? inFrameLinkPath(event, target) : null;
      if (!path) return;
      stop(event);
      navigate(path);
    };

    // Dropping a file would start an upload, or open the file in place of the page.
    const blockFileDrop = (event: DragEvent) => {
      const transfer = event.dataTransfer;
      if (!transfer || !Array.from(transfer.types || []).includes("Files")) return;
      stop(event);
      if (event.type === "dragover") transfer.dropEffect = "none";
      if (event.type === "drop") showStaffViewOnlyNotice();
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["aria-label", "title", "href", "contenteditable", "type"],
    });
    document.addEventListener("pointerdown", markStaffPreviewInteraction, true);
    document.addEventListener("keydown", markStaffPreviewInteraction, true);
    document.addEventListener("submit", blockInteraction, true);
    document.addEventListener("click", blockInteraction, true);
    document.addEventListener("auxclick", blockInteraction, true);
    document.addEventListener("dragover", blockFileDrop, true);
    document.addEventListener("drop", blockFileDrop, true);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("pointerdown", markStaffPreviewInteraction, true);
      document.removeEventListener("keydown", markStaffPreviewInteraction, true);
      document.removeEventListener("submit", blockInteraction, true);
      document.removeEventListener("click", blockInteraction, true);
      document.removeEventListener("auxclick", blockInteraction, true);
      document.removeEventListener("dragover", blockFileDrop, true);
      document.removeEventListener("drop", blockFileDrop, true);
    };
  }, [active, navigate]);
}
