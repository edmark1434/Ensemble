import { useEffect } from "react";
import type { NavigateFunction } from "react-router-dom";
import { showCustomToast } from "@/components/utility/toast";
import {
  isStaffPreviewSearchForm,
  markStaffPreviewInteraction,
  sameOriginPath,
  staffPreviewHideTarget,
  staffPreviewViewFallback,
} from "@/lib/staffPlatformView";

/** Hides what `useStaffPlatformGuard` marks. Rendered by the frame bridge while the guard runs. */
export const STAFF_PREVIEW_HIDE_CSS = "[data-staff-preview-hide]{display:none !important;}";

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
