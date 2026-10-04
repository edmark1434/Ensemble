import { useEffect } from "react";
import { Link } from "react-router-dom";
import { showErrorToast } from "@/components/utility/toast";
import { isAllowedStaffBrowseClick } from "@/lib/staffPlatformView";

const BROWSE_LINKS = [
  { label: "Home", to: "/home" },
  { label: "Forums", to: "/forums" },
  { label: "Jobs", to: "/jobs/postings" },
  { label: "Gigs", to: "/gigs/services" },
  { label: "Discovery", to: "/discovery" },
  { label: "Marketplace", to: "/assets" },
  { label: "Projects", to: "/projects" },
];

let lastBlockedNoticeAt = 0;

function notifyBlocked() {
  const now = Date.now();
  if (now - lastBlockedNoticeAt < 1600) return;
  lastBlockedNoticeAt = now;
  showErrorToast("Platform view is browse-only. Actions stay off for staff.");
}

export function useStaffPlatformGuard(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const block = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (event.type === "submit") {
        if (target.closest("[data-staff-view-allow]")) return;
        event.preventDefault();
        event.stopPropagation();
        notifyBlocked();
        return;
      }
      if (isAllowedStaffBrowseClick(target)) return;
      event.preventDefault();
      event.stopPropagation();
      notifyBlocked();
    };

    const blockTyping = (event: KeyboardEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-staff-view-allow]")) return;
      const locked = target instanceof HTMLTextAreaElement
        || target.getAttribute("contenteditable") === "true"
        || Boolean(target.closest("[contenteditable='true']"));
      if (!locked) return;
      event.preventDefault();
      event.stopPropagation();
    };

    document.addEventListener("click", block, true);
    document.addEventListener("submit", block, true);
    document.addEventListener("keydown", blockTyping, true);
    return () => {
      document.removeEventListener("click", block, true);
      document.removeEventListener("submit", block, true);
      document.removeEventListener("keydown", blockTyping, true);
    };
  }, [active]);
}

export function StaffPlatformBlocked() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col justify-center px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-wide text-sky-300">Platform view</p>
      <h1 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">This page is not part of browsing</h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
        Staff can look through the public member areas. Personal tools such as inbox, orders, proposals, and create forms stay closed here.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {BROWSE_LINKS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-100 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/10"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
