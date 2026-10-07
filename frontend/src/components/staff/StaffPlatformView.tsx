import { useEffect } from "react";
import { staffPreviewHideTarget } from "@/lib/staffPlatformView";

const ACTION_QUERY = "button, a, [role='button'], textarea, input, [contenteditable='true']";

function hideStaffActions(root: ParentNode) {
  root.querySelectorAll(ACTION_QUERY).forEach((element) => {
    const target = staffPreviewHideTarget(element);
    if (!target || target.hasAttribute("data-staff-preview-hide")) return;
    target.setAttribute("data-staff-preview-hide", "");
  });
}

export function useStaffPlatformGuard(active: boolean) {
  useEffect(() => {
    if (!active) return;

    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => hideStaffActions(document));
    };

    const blockInteraction = (event: Event) => {
      if (event.type === "submit") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!staffPreviewHideTarget(target)) return;
      event.preventDefault();
      event.stopPropagation();
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("submit", blockInteraction, true);
    document.addEventListener("click", blockInteraction, true);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("submit", blockInteraction, true);
      document.removeEventListener("click", blockInteraction, true);
    };
  }, [active]);
}
