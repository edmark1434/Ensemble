import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useGlobalState from "@/lib/global_state";
import { STAFF_PREVIEW_HIDE_CSS, useStaffPickMode, useStaffPlatformGuard } from "@/components/staff/StaffPlatformView";
import {
  isStaffConsolePath,
  isStaffPreviewFrame,
  memberPreviewPath,
  postToStaffPreviewParent,
  sameOriginPath,
  staffPreviewViewFallback,
  STAFF_PREVIEW_LOCATION_MESSAGE,
  STAFF_PREVIEW_NAV_MESSAGE,
  STAFF_PREVIEW_PICK_MESSAGE,
  STAFF_PREVIEW_PICKED_MESSAGE,
} from "@/lib/staffPlatformView";

/** Position of this frame in its own history (React Router keeps it in `history.state.idx`). */
function frameHistoryIndex(): number {
  const index = (window.history.state as { idx?: unknown } | null)?.idx;
  return typeof index === "number" ? index : 0;
}

/**
 * Frame side of platform view (and the reported-item preview). Rendered once in `App` so it
 * covers every route, not only pages inside the member `Layout`:
 * - follows navigation sent by the console, including Back;
 * - reports the page it shows so the console can show it and keep its own URL in sync;
 * - keeps staff on member pages: console pages, sign-in pages, and member-only tools are
 *   swapped for their section's public page;
 * - opens this site's links in place, since a new tab would leave the console;
 * - runs the view-only guard (hide and block member actions) on every page, including the
 *   landing and not-found pages that render outside `Layout`.
 */
export default function StaffPreviewFrameBridge() {
  const inFrame = isStaffPreviewFrame();
  const navigate = useNavigate();
  const location = useLocation();
  const isStaff = useGlobalState((state) => state.user?.type === "Staff");
  const current = `${location.pathname}${location.search}${location.hash}`;
  const guarded = inFrame && isStaff;
  const [picking, setPicking] = useState(false);
  const pickingRef = useRef(false);
  pickingRef.current = picking;

  useStaffPlatformGuard(guarded, navigate);

  const finishPick = useCallback((subject: string | null) => {
    setPicking(false);
    postToStaffPreviewParent({ type: STAFF_PREVIEW_PICKED_MESSAGE, subject });
  }, []);
  useStaffPickMode(guarded && picking, finishPick);

  // A pick belongs to the page it started on; moving away ends it.
  useEffect(() => {
    if (pickingRef.current) finishPick(null);
  }, [location.pathname, finishPick]);

  useEffect(() => {
    if (!inFrame) return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      const data = event.data as { type?: unknown; path?: unknown; action?: unknown; active?: unknown } | null;
      if (data?.type === STAFF_PREVIEW_PICK_MESSAGE) {
        setPicking(data.active === true);
        return;
      }
      if (!data || data.type !== STAFF_PREVIEW_NAV_MESSAGE) return;
      if (data.action === "back") {
        // Index 0 is the frame's first page; going back from there would move the console instead.
        if (frameHistoryIndex() > 0) navigate(-1);
        return;
      }
      const path = memberPreviewPath(typeof data.path === "string" ? data.path : null);
      if (!path) return;
      navigate(staffPreviewViewFallback(path) || path);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [inFrame, navigate]);

  useEffect(() => {
    if (!inFrame) return;
    const fallback = staffPreviewViewFallback(location.pathname);
    if (!fallback || fallback === location.pathname) return;
    // Console pages never render in a frame. Other pages wait until the session says this is staff.
    if (!isStaff && !isStaffConsolePath(location.pathname)) return;
    navigate(fallback, { replace: true });
  }, [inFrame, isStaff, location.pathname, navigate]);

  useEffect(() => {
    if (!inFrame) return;
    postToStaffPreviewParent({
      type: STAFF_PREVIEW_LOCATION_MESSAGE,
      path: current,
      canGoBack: frameHistoryIndex() > 0,
    });
  }, [inFrame, current]);

  useEffect(() => {
    if (!inFrame || !isStaff) return;
    const original = window.open;
    const openInFrame = (url?: string | URL, target?: string, features?: string) => {
      const href = url ? String(url) : "";
      const path = sameOriginPath(href);
      if (path) {
        navigate(staffPreviewViewFallback(path) || path);
        return null;
      }
      // A blank tab is opened first and filled in by the caller, which needs the handle.
      if (!href || href === "about:blank") return original.call(window, url, target, features);
      // Other sites open in a normal tab that cannot reach back into the console.
      const extra = features ? `${features},` : "";
      return original.call(window, url, target || "_blank", `${extra}noopener,noreferrer`);
    };
    window.open = openInFrame as typeof window.open;
    return () => {
      window.open = original;
    };
  }, [inFrame, isStaff, navigate]);

  return guarded ? <style>{STAFF_PREVIEW_HIDE_CSS}</style> : null;
}
