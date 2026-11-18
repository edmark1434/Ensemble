import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Check, Eye, Globe, Home, Link2, Loader2, RotateCw } from "lucide-react";
import { showErrorToast } from "@/components/utility/toast";
import { mainSiteOrigin } from "@/lib/consoleHosts";
import {
  memberPathFromInput,
  staffPreviewStartPath,
  staffPreviewViewFallback,
  STAFF_PREVIEW_LOCATION_MESSAGE,
  STAFF_PREVIEW_NAV_MESSAGE,
  STAFF_PREVIEW_SESSION_MESSAGE,
} from "@/lib/staffPlatformView";

type Section = { label: string; path: string; match: string };

const SECTIONS: Section[] = [
  { label: "Home", path: "/home", match: "/home" },
  { label: "Forums", path: "/forums", match: "/forums" },
  { label: "Jobs", path: "/jobs/postings", match: "/jobs" },
  { label: "Gigs", path: "/gigs/services", match: "/gigs" },
  { label: "Discovery", path: "/discovery", match: "/discovery" },
  { label: "Marketplace", path: "/assets", match: "/assets" },
  { label: "Teams", path: "/teams", match: "/teams" },
];

type AddressNote = { tone: "error" | "info"; text: string };

/** Where each console's platform view opens: the part of the site that desk looks after. */
function startPathForConsole(consolePath: string): string {
  if (consolePath.startsWith("/moderator/forum")) return "/forums";
  if (consolePath.startsWith("/moderator/marketplace")) return "/assets";
  if (consolePath.startsWith("/moderator/jobs")) return "/jobs/postings";
  return "/home";
}

function sectionForPath(path: string): string | null {
  const pathname = path.split(/[?#]/)[0] || "/";
  const match = SECTIONS.find((section) => pathname === section.match || pathname.startsWith(`${section.match}/`));
  return match?.path ?? null;
}

function ToolbarButton({
  label,
  onClick,
  disabled = false,
  className = "",
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-400/50 disabled:pointer-events-none disabled:opacity-35 ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * Console tab that shows the member site in a same-origin frame. The frame side
 * (`StaffPreviewFrameBridge`) follows our navigation messages and reports every page it
 * shows; `useStaffPlatformGuard`, the axios guard and the backend keep it view-only.
 */
export default function StaffPlatformPreviewPage() {
  const { pathname: consolePath } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const startPath = startPathForConsole(consolePath);
  const requestedPath = staffPreviewStartPath(searchParams.get("path")) || startPath;

  const frameRef = useRef<HTMLIFrameElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // The frame keeps its first src; later pages are opened by message so the frame never reloads.
  const [frameSrc] = useState(requestedPath);
  const [shownPath, setShownPath] = useState(requestedPath);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [note, setNote] = useState<AddressNote | null>(null);
  const [copied, setCopied] = useState(false);
  /** The frame's app is listening (it has reported a page). Messages sent before that are lost. */
  const frameReady = useRef(false);
  const pendingPath = useRef<string | null>(null);
  /** Last path written to or read from `?path=`, so our own URL sync is not taken for a new request. */
  const syncedPath = useRef(requestedPath);

  const sendToFrame = useCallback((message: Record<string, unknown>) => {
    frameRef.current?.contentWindow?.postMessage(message, window.location.origin);
  }, []);

  const openPath = useCallback((path: string) => {
    setShownPath(path);
    if (!frameReady.current) {
      pendingPath.current = path;
      return;
    }
    sendToFrame({ type: STAFF_PREVIEW_NAV_MESSAGE, path });
  }, [sendToFrame]);

  // Another console link (or the sidebar item) changed ?path= while this tab is open.
  useEffect(() => {
    if (requestedPath === syncedPath.current) return;
    syncedPath.current = requestedPath;
    setNote(null);
    openPath(requestedPath);
  }, [requestedPath, openPath]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!frameRef.current || event.source !== frameRef.current.contentWindow) return;
      const data = event.data as { type?: unknown; path?: unknown; canGoBack?: unknown } | null;
      if (!data) return;
      if (data.type === STAFF_PREVIEW_SESSION_MESSAGE) {
        setSessionEnded(true);
        return;
      }
      if (data.type !== STAFF_PREVIEW_LOCATION_MESSAGE || typeof data.path !== "string") return;

      setLoaded(true);
      if (!frameReady.current) {
        frameReady.current = true;
        const next = pendingPath.current;
        pendingPath.current = null;
        if (next) {
          sendToFrame({ type: STAFF_PREVIEW_NAV_MESSAGE, path: next });
          return;
        }
      }

      const path = data.path;
      // A member tool or sign-in page is swapped by the frame right away; wait for that page.
      if (staffPreviewViewFallback(path)) return;
      setShownPath(path);
      setCanGoBack(data.canGoBack === true);
      if (path === syncedPath.current) return;
      syncedPath.current = path;
      // Keep the console URL on the page shown, so a reload or a shared link returns here.
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.set("path", path);
        return next;
      }, { replace: true });
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [sendToFrame, setSearchParams]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const reloadFrame = () => {
    frameReady.current = false;
    setLoaded(false);
    try {
      frameRef.current?.contentWindow?.location.reload();
    } catch {
      setLoaded(true);
    }
  };

  const submitAddress = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const path = memberPathFromInput(draft ?? "");
    if (!path) {
      setNote({ tone: "error", text: "Enter a member-site page, such as /forums, or paste a link to it." });
      return;
    }
    const target = staffPreviewViewFallback(path) || path;
    setNote(target === path ? null : {
      tone: "info",
      text: "That page is a member tool or the staff account's own page, so its section opened instead.",
    });
    setDraft(null);
    inputRef.current?.blur();
    openPath(target);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${mainSiteOrigin()}${shownPath}`);
      setCopied(true);
    } catch {
      showErrorToast("Couldn't copy the link.");
    }
  };

  const activeSection = sectionForPath(shownPath);

  return (
    <main className="relative flex h-[calc(100dvh-3.5rem)] flex-col md:h-screen md:pl-[260px]">
      <header className="border-b border-white/[0.06] px-4 py-3 md:px-6 md:py-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-sky-300">
            <Eye className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-white">Platform view</h1>
            <p className="mt-1 hidden max-w-3xl text-sm text-zinc-400 sm:block">
              Browse the member site as members see it, without leaving the console. Posting, buying,
              messaging, and other member actions are off for staff accounts.
            </p>
          </div>
        </div>
        <nav
          aria-label="Member site sections"
          className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
        >
          {SECTIONS.map((section) => {
            const selected = activeSection === section.path;
            return (
              <button
                key={section.path}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setNote(null);
                  openPath(section.path);
                }}
                className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  selected
                    ? "border-sky-400/40 bg-sky-400/15 text-sky-100"
                    : "border-white/10 text-zinc-400 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                {section.label}
              </button>
            );
          })}
        </nav>
      </header>

      {sessionEnded && (
        <div
          role="alert"
          className="mx-3 mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-2.5 text-xs text-amber-100 md:mx-5"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />
          <p className="min-w-0 flex-1">
            Your staff session could not be refreshed, so member pages may not load. Reload the console to sign in again.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg border border-amber-300/30 px-3 py-1 font-medium text-amber-100 transition hover:bg-amber-300/10"
          >
            Reload console
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 p-3 md:p-5">
        <div className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c0e16] shadow-2xl">
          <div className="flex items-center gap-1 border-b border-white/10 bg-black/40 px-2 py-1.5 sm:gap-1.5 sm:px-3">
            <ToolbarButton label="Back" onClick={() => sendToFrame({ type: STAFF_PREVIEW_NAV_MESSAGE, action: "back" })} disabled={!canGoBack}>
              <ArrowLeft className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton label="Reload page" onClick={reloadFrame}>
              <RotateCw className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              label="Back to the start page"
              onClick={() => {
                setNote(null);
                openPath(startPath);
              }}
              className="hidden sm:flex"
            >
              <Home className="h-4 w-4" />
            </ToolbarButton>
            <form onSubmit={submitAddress} className="min-w-0 flex-1" role="search">
              <label htmlFor="platform-view-address" className="sr-only">
                Member page address
              </label>
              <div className="flex items-center gap-2 rounded-md bg-white/[0.04] px-3 py-1.5 focus-within:bg-white/[0.06] focus-within:ring-1 focus-within:ring-sky-400/40">
                <Globe className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                <input
                  id="platform-view-address"
                  ref={inputRef}
                  value={draft ?? shownPath}
                  onChange={(event) => {
                    setDraft(event.target.value);
                    if (note?.tone === "error") setNote(null);
                  }}
                  onFocus={(event) => {
                    setDraft(shownPath);
                    event.currentTarget.select();
                  }}
                  onBlur={() => setDraft(null)}
                  onKeyDown={(event) => {
                    if (event.key !== "Escape") return;
                    setDraft(null);
                    setNote(null);
                    event.currentTarget.blur();
                  }}
                  placeholder="Paste a member link or path, such as /forums"
                  spellCheck={false}
                  autoComplete="off"
                  autoCapitalize="off"
                  enterKeyHint="go"
                  aria-invalid={note?.tone === "error"}
                  aria-describedby={note ? "platform-view-address-note" : undefined}
                  className="w-full min-w-0 bg-transparent text-xs text-zinc-200 outline-none placeholder:text-zinc-600"
                />
              </div>
            </form>
            <ToolbarButton label={copied ? "Link copied" : "Copy member-site link"} onClick={() => void copyLink()}>
              {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Link2 className="h-4 w-4" />}
            </ToolbarButton>
          </div>
          {note && (
            <p
              id="platform-view-address-note"
              role={note.tone === "error" ? "alert" : "status"}
              className={`border-b border-white/10 px-3 py-1.5 text-xs ${
                note.tone === "error" ? "text-rose-300" : "text-zinc-400"
              }`}
            >
              {note.text}
            </p>
          )}
          <div className="relative min-h-0 flex-1">
            <iframe
              ref={frameRef}
              title="Member platform preview"
              src={frameSrc}
              onLoad={(event) => {
                setLoaded(true);
                try {
                  const location = event.currentTarget.contentWindow?.location;
                  if (location && !staffPreviewViewFallback(location.pathname)) {
                    setShownPath(`${location.pathname}${location.search}${location.hash}`);
                  }
                } catch {
                  // The preview stays on this origin. Ignore a frame that is not readable yet.
                }
              }}
              className="h-full w-full bg-white"
              sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            />
            {!loaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0c0e16]">
                <Loader2 className="h-6 w-6 animate-spin text-sky-300" />
                <p className="text-xs text-zinc-500">Loading the member site…</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
