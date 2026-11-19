import { useEffect, useMemo } from "react";
import { Outlet, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import UserHeader from "@/components/nav/user_header";
import { showCustomToast } from "@/components/utility/toast";
import { StandingConditionCard, useNow } from "@/components/account/StandingDetails";
import { isStaffPreviewSearchForm, isStaffPreviewFrame } from "@/lib/staffPlatformView";
import { APPEAL_PATH, formatCountdown, standingConditions } from "@/lib/standing";
import useGlobalState from "@/lib/global_state";
import { useSuspension } from "@/lib/useSuspension";
import {
  SUSPENSION_LOCK_ATTR,
  applySuspensionLocks,
  clearSuspensionLocks,
  lockedAncestor,
  suspensionGuardApplies,
} from "@/lib/suspensionGuard";

const NOTICE_TOAST_ID = "account-suspended-action";

/**
 * Locked controls: faded, a "not allowed" cursor, and an amber dashed ring on hover, the
 * same amber as the Suspended banner, so it reads as "paused by your suspension", not "broken".
 */
const LOCK_CSS = `
[${SUSPENSION_LOCK_ATTR}]{opacity:.45 !important;cursor:not-allowed !important;filter:grayscale(.35);}
[${SUSPENSION_LOCK_ATTR}] *{cursor:not-allowed !important;}
[${SUSPENSION_LOCK_ATTR}]:hover,[${SUSPENSION_LOCK_ATTR}]:focus-visible{outline:1px dashed rgb(245 158 11 / .75) !important;outline-offset:2px;}
`;

function showSuspendedNotice(until: string) {
  showCustomToast(
    "Paused while your account is suspended",
    until
      ? `You can look around until ${until}, but posting, buying, ordering and messaging are off. Use Appeal in the banner if this is a mistake.`
      : "You can look around, but posting, buying, ordering and messaging are off. Use Appeal in the banner if this is a mistake.",
    { id: NOTICE_TOAST_ID },
  );
}

/**
 * Site-wide: while the member is suspended, every write control is switched off before it can
 * be used (see `suspensionGuard.ts`). Mounted once next to the standing banner.
 */
export function SuspensionGuard() {
  const { suspended, until, message } = useSuspension();
  const { pathname } = useLocation();
  const active = suspended && !isStaffPreviewFrame() && suspensionGuardApplies(pathname);

  useEffect(() => {
    if (!active) return;

    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => applySuspensionLocks(document, message));
    };

    const stop = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    const blockClick = (event: Event) => {
      if (!lockedAncestor(event.target)) return;
      stop(event);
      if (event.type === "click") showSuspendedNotice(until);
    };

    // Keys that would type or submit; Tab, Escape, arrows and modifiers keep working so
    // keyboard users can move past a locked composer.
    const WRITING_KEYS = new Set(["Enter", "Backspace", "Delete", " "]);
    const blockTyping = (event: Event) => {
      if (!lockedAncestor(event.target)) return;
      if (event instanceof KeyboardEvent) {
        const writes = event.key.length === 1 || WRITING_KEYS.has(event.key);
        if (!writes) return; // Tab, Escape, arrows, function keys
        // Copy, select-all and other shortcuts stay; paste is caught by the paste listener.
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() !== "v") return;
      }
      stop(event);
    };

    // Some menus act on press, not click.
    const blockPress = (event: Event) => {
      if (lockedAncestor(event.target)) stop(event);
    };

    // A form is a write when it holds a locked control (its Save/Send button, a composer, an
    // upload) or was sent by one. Filter and search forms keep working.
    const blockSubmit = (event: Event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (form.closest("[data-suspension-keep]") || isStaffPreviewSearchForm(form)) return;
      const submitter = (event as SubmitEvent).submitter || null;
      const writes = Boolean(lockedAncestor(submitter)) || Boolean(form.querySelector(`[${SUSPENSION_LOCK_ATTR}]`));
      if (!writes) return;
      stop(event);
      showSuspendedNotice(until);
    };

    const blockFileDrop = (event: DragEvent) => {
      if (!lockedAncestor(event.target)) return;
      if (!Array.from(event.dataTransfer?.types || []).includes("Files")) return;
      stop(event);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["aria-label", "href", "disabled", "contenteditable", "type"],
    });
    document.addEventListener("click", blockClick, true);
    document.addEventListener("auxclick", blockClick, true);
    document.addEventListener("mousedown", blockPress, true);
    document.addEventListener("pointerdown", blockPress, true);
    document.addEventListener("keydown", blockTyping, true);
    document.addEventListener("beforeinput", blockTyping, true);
    document.addEventListener("paste", blockTyping, true);
    document.addEventListener("submit", blockSubmit, true);
    document.addEventListener("dragover", blockFileDrop, true);
    document.addEventListener("drop", blockFileDrop, true);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("click", blockClick, true);
      document.removeEventListener("auxclick", blockClick, true);
      document.removeEventListener("mousedown", blockPress, true);
      document.removeEventListener("pointerdown", blockPress, true);
      document.removeEventListener("keydown", blockTyping, true);
      document.removeEventListener("beforeinput", blockTyping, true);
      document.removeEventListener("paste", blockTyping, true);
      document.removeEventListener("submit", blockSubmit, true);
      document.removeEventListener("dragover", blockFileDrop, true);
      document.removeEventListener("drop", blockFileDrop, true);
      clearSuspensionLocks(document);
    };
  }, [active, message, until]);

  return active ? <style>{LOCK_CSS}</style> : null;
}

/**
 * Route wrapper for pages that only exist to write (post a job, order a gig, checkout, …).
 * A suspended member gets a clear "paused" page instead of a form they could never submit.
 */
export function SuspendedRouteGate() {
  const context = useOutletContext();
  const { suspended, endsAt, until } = useSuspension();
  const navigate = useNavigate();
  const restriction = useGlobalState((state) => state.user?.restriction);
  const now = useNow();
  const condition = useMemo(
    () => standingConditions(restriction).find((item) => item.id === "suspended") || null,
    [restriction],
  );

  if (!suspended) return <Outlet context={context} />;

  const remaining = endsAt ? new Date(endsAt).getTime() - now : null;

  return (
    <div className="flex min-h-screen flex-col">
      <UserHeader />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-24" data-suspension-keep>
        <div className="rounded-2xl border border-amber-500/30 bg-white p-6 shadow-sm dark:bg-white/[0.03] sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-300">
              <ShieldAlert className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                Account suspended
              </p>
              <h1 className="mt-1 text-xl font-bold text-zinc-900 dark:text-white">This is paused for now</h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                While your account is suspended you can look around Ensemble, but you cannot post, order, buy, or
                send anything. We stopped you here so you don't fill this in for nothing.
              </p>
              {until ? (
                <p className="mt-3 text-sm font-medium text-zinc-900 dark:text-white">
                  Ends {until}
                  {remaining != null && remaining > 0 ? (
                    <span className="text-zinc-500 dark:text-zinc-400"> · in {formatCountdown(remaining)}</span>
                  ) : null}
                </p>
              ) : null}
            </div>
          </div>

          {condition ? (
            <div className="mt-6">
              <StandingConditionCard condition={condition} now={now} onAppeal={() => navigate(APPEAL_PATH)} />
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/home"))}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-white/15 dark:text-white dark:hover:bg-white/5"
            >
              <ArrowLeft className="h-4 w-4" />
              Go back
            </button>
            <button
              type="button"
              onClick={() => navigate(APPEAL_PATH)}
              className="inline-flex items-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-amber-400"
            >
              Appeal the suspension
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
