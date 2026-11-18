import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type FormEvent,
  type ReactNode,
} from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Compass,
  ExternalLink,
  Globe,
  Home,
  Info,
  Library,
  Link2,
  Loader2,
  Lock,
  Maximize2,
  Minimize2,
  Monitor,
  MonitorPlay,
  Projector,
  RotateCw,
  Search,
  Smartphone,
  Tablet,
  Users,
  Video,
  X,
} from "lucide-react";
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

type IconType = ComponentType<{ className?: string }>;

type Section = { label: string; path: string; match: string; icon: IconType };

/** Public member-site sections, with the icons members see in their sidebar. */
const SECTIONS: Section[] = [
  { label: "Home", path: "/home", match: "/home", icon: Home },
  { label: "Forums", path: "/forums", match: "/forums", icon: Projector },
  { label: "Jobs", path: "/jobs/postings", match: "/jobs", icon: Video },
  { label: "Gigs", path: "/gigs/services", match: "/gigs", icon: MonitorPlay },
  { label: "Discovery", path: "/discovery", match: "/discovery", icon: Compass },
  { label: "Asset Library", path: "/assets", match: "/assets", icon: Library },
  { label: "Teams", path: "/teams", match: "/teams", icon: Users },
];

type Accent = {
  kicker: string;
  chip: string;
  ring: string;
  focusRing: string;
  spinner: string;
  pressed: string;
};

/** Console accents (same hues as each console's sidebar). Full class names so Tailwind keeps them. */
const ACCENTS = {
  rose: {
    kicker: "text-rose-300/80",
    chip: "border-rose-400/40 bg-rose-400/15 text-rose-50",
    ring: "focus-within:ring-rose-400/40",
    focusRing: "focus-visible:ring-rose-400/50",
    spinner: "text-rose-300",
    pressed: "bg-rose-400/15 text-rose-100",
  },
  violet: {
    kicker: "text-violet-300/80",
    chip: "border-violet-400/40 bg-violet-400/15 text-violet-50",
    ring: "focus-within:ring-violet-400/40",
    focusRing: "focus-visible:ring-violet-400/50",
    spinner: "text-violet-300",
    pressed: "bg-violet-400/15 text-violet-100",
  },
  amber: {
    kicker: "text-amber-300/80",
    chip: "border-amber-400/40 bg-amber-400/15 text-amber-50",
    ring: "focus-within:ring-amber-400/40",
    focusRing: "focus-visible:ring-amber-400/50",
    spinner: "text-amber-300",
    pressed: "bg-amber-400/15 text-amber-100",
  },
  sky: {
    kicker: "text-sky-300/80",
    chip: "border-sky-400/40 bg-sky-400/15 text-sky-50",
    ring: "focus-within:ring-sky-400/40",
    focusRing: "focus-visible:ring-sky-400/50",
    spinner: "text-sky-300",
    pressed: "bg-sky-400/15 text-sky-100",
  },
  emerald: {
    kicker: "text-emerald-300/80",
    chip: "border-emerald-400/40 bg-emerald-400/15 text-emerald-50",
    ring: "focus-within:ring-emerald-400/40",
    focusRing: "focus-visible:ring-emerald-400/50",
    spinner: "text-emerald-300",
    pressed: "bg-emerald-400/15 text-emerald-100",
  },
} satisfies Record<string, Accent>;

type ConsoleInfo = { label: string; startPath: string; accent: Accent };

/** Each console's name and accent, and where its platform view opens: the part of the site that desk looks after. */
function consoleInfo(consolePath: string): ConsoleInfo {
  if (consolePath.startsWith("/moderator/forum")) {
    return { label: "Forum Console", startPath: "/forums", accent: ACCENTS.violet };
  }
  if (consolePath.startsWith("/moderator/marketplace")) {
    return { label: "Marketplace Console", startPath: "/assets", accent: ACCENTS.amber };
  }
  if (consolePath.startsWith("/moderator/jobs")) {
    return { label: "Jobs & Gigs Console", startPath: "/jobs/postings", accent: ACCENTS.emerald };
  }
  if (consolePath.startsWith("/moderator/support")) {
    return { label: "Support Console", startPath: "/home", accent: ACCENTS.sky };
  }
  if (consolePath.startsWith("/staff")) {
    return { label: "Staff Portal", startPath: "/home", accent: ACCENTS.emerald };
  }
  return { label: "Admin Console", startPath: "/home", accent: ACCENTS.rose };
}

type Device = "desktop" | "tablet" | "phone";

const DEVICES: { id: Device; label: string; width: number | null; icon: IconType }[] = [
  { id: "desktop", label: "Desktop width", width: null, icon: Monitor },
  { id: "tablet", label: "Tablet width (820 px)", width: 820, icon: Tablet },
  { id: "phone", label: "Phone width (390 px)", width: 390, icon: Smartphone },
];

const DEVICE_KEY = "ensemble:platform-view:device";
const FOCUS_KEY = "ensemble:platform-view:focus";
/** After this long without the member site answering, offer a retry. */
const SLOW_LOAD_MS = 12_000;

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private mode or blocked storage: the choice lasts for this visit only.
  }
}

function pathnameOf(path: string): string {
  return path.split(/[?#]/)[0] || "/";
}

function sectionForPath(path: string): Section | null {
  const pathname = pathnameOf(path);
  return SECTIONS.find((section) => pathname === section.match || pathname.startsWith(`${section.match}/`)) ?? null;
}

/** Why the frame shows a different page than the one asked for. */
function blockedPageNote(path: string): string {
  const pathname = pathnameOf(path);
  const shown = pathname === "/"
    ? "The landing page"
    : `“${pathname.length > 48 ? `${pathname.slice(0, 47)}…` : pathname}”`;
  const section = sectionForPath(staffPreviewViewFallback(pathname) || "/home")?.label ?? "Home";
  return `${shown} isn't shown in platform view (member tools, the staff account's own pages and sign-in pages stay off), so ${section} opened instead.`;
}

type Note = {
  tone: "error" | "info";
  text: string;
  /** Page the note belongs to. It clears once the frame moves to another page. */
  at?: string;
};

function toolbarControlClass(accent: Accent, pressed = false, extra = "") {
  return `flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition focus-visible:outline-none focus-visible:ring-1 ${accent.focusRing} disabled:pointer-events-none disabled:opacity-35 ${
    pressed ? accent.pressed : "text-zinc-400 hover:bg-white/[0.06] hover:text-white"
  } ${extra}`;
}

function ToolbarButton({
  label,
  onClick,
  accent,
  disabled = false,
  pressed,
  className = "",
  children,
}: {
  label: string;
  onClick: () => void;
  accent: Accent;
  disabled?: boolean;
  /** Toggle buttons only. */
  pressed?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className={toolbarControlClass(accent, pressed === true, className)}
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
  const info = consoleInfo(consolePath);
  const { accent, startPath } = info;
  const requestedPath = staffPreviewStartPath(searchParams.get("path")) || startPath;

  const frameRef = useRef<HTMLIFrameElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // The frame keeps its first src; later pages are opened by message so the frame never reloads.
  const [frameSrc] = useState(requestedPath);
  const [shownPath, setShownPath] = useState(requestedPath);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const [copied, setCopied] = useState(false);
  const [device, setDevice] = useState<Device>(() => {
    const stored = readStored(DEVICE_KEY);
    return stored === "tablet" || stored === "phone" ? stored : "desktop";
  });
  const [focusMode, setFocusMode] = useState(() => readStored(FOCUS_KEY) === "1");
  /** The frame's app is listening (it has reported a page). Messages sent before that are lost. */
  const frameReady = useRef(false);
  const pendingPath = useRef<string | null>(null);
  /** Last path written to or read from `?path=`, so our own URL sync is not taken for a new request. */
  const syncedPath = useRef(requestedPath);

  const memberHost = useMemo(() => {
    try {
      return new URL(mainSiteOrigin()).host;
    } catch {
      return "";
    }
  }, []);

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
      // A link in the frame opened a member tool or sign-in page. The frame swaps it for its
      // section's public page right away; say why, then wait for that page.
      const fallback = staffPreviewViewFallback(path);
      if (fallback) {
        setNote({ tone: "info", text: blockedPageNote(path), at: fallback });
        return;
      }
      setShownPath(path);
      setCanGoBack(data.canGoBack === true);
      setNote((current) => (current?.at && current.at !== pathnameOf(path) ? null : current));
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

  useEffect(() => {
    if (loaded) {
      setSlow(false);
      return;
    }
    const timer = window.setTimeout(() => setSlow(true), SLOW_LOAD_MS);
    return () => window.clearTimeout(timer);
  }, [loaded]);

  // "/" jumps to the address bar (when the console, not the frame, has focus).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(?:INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const reloadFrame = () => {
    frameReady.current = false;
    setLoaded(false);
    try {
      frameRef.current?.contentWindow?.location.reload();
    } catch {
      setLoaded(true);
    }
  };

  const goTo = (path: string) => {
    setNote(null);
    openPath(path);
  };

  const submitAddress = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const path = memberPathFromInput(draft ?? "");
    if (!path) {
      setNote({
        tone: "error",
        text: "Enter a member page such as /forums, paste a member-site link, or type a name or @handle to search people.",
        at: pathnameOf(shownPath),
      });
      return;
    }
    const fallback = staffPreviewViewFallback(path);
    const target = fallback || path;
    setNote(fallback ? { tone: "info", text: blockedPageNote(path), at: fallback } : null);
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

  const chooseDevice = (next: Device) => {
    setDevice(next);
    writeStored(DEVICE_KEY, next);
  };

  const toggleFocusMode = () => {
    const next = !focusMode;
    setFocusMode(next);
    writeStored(FOCUS_KEY, next ? "1" : "0");
  };

  const activeSection = sectionForPath(shownPath)?.path ?? null;
  const deviceWidth = DEVICES.find((option) => option.id === device)?.width ?? null;
  // Same console page (public URL on a console host), opened on the page shown here.
  const newTabHref = `${window.location.pathname}?path=${encodeURIComponent(shownPath)}`;
  const editing = draft !== null;

  return (
    <main className="relative flex h-[calc(100dvh-3.5rem)] flex-col md:h-screen md:pl-[260px]">
      {!focusMode && (
        <header className="border-b border-white/[0.06] px-4 py-3 md:px-8 md:py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${accent.kicker}`}>{info.label}</p>
              <h1 className="text-xl font-bold text-white">Platform view</h1>
              <p className="mt-1 hidden max-w-3xl text-xs text-zinc-500 sm:block">
                See the member site exactly as members do, without leaving the console. Search people from the
                address bar. Posting, buying, messaging and other member actions are off for staff accounts.
              </p>
            </div>
            <span
              className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-zinc-300"
              title="Member actions are blocked in the browser and refused by the server for staff accounts."
            >
              <Lock className="h-3 w-3 text-zinc-500" aria-hidden />
              View-only
            </span>
          </div>
          <nav
            aria-label="Member site sections"
            className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
          >
            {SECTIONS.map((section) => {
              const selected = activeSection === section.path;
              const Icon = section.icon;
              return (
                <button
                  key={section.path}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => goTo(section.path)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-1 ${accent.focusRing} ${
                    selected
                      ? accent.chip
                      : "border-white/10 text-zinc-400 hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {section.label}
                </button>
              );
            })}
          </nav>
        </header>
      )}

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

      <div className={`min-h-0 flex-1 ${focusMode ? "p-2 md:p-3" : "p-3 md:p-5"}`}>
        <div className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c0e16] shadow-2xl">
          <div className="flex items-center gap-1 border-b border-white/10 bg-black/40 px-2 py-1.5 sm:gap-1.5 sm:px-3">
            <ToolbarButton
              label="Back"
              accent={accent}
              onClick={() => sendToFrame({ type: STAFF_PREVIEW_NAV_MESSAGE, action: "back" })}
              disabled={!canGoBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton label="Reload page" accent={accent} onClick={reloadFrame}>
              <RotateCw className={`h-4 w-4 ${loaded ? "" : "animate-spin"}`} />
            </ToolbarButton>
            <ToolbarButton
              label={`Start page (${startPath})`}
              accent={accent}
              onClick={() => goTo(startPath)}
              className="hidden sm:flex"
            >
              <Home className="h-4 w-4" />
            </ToolbarButton>

            <form onSubmit={submitAddress} className="min-w-0 flex-1" role="search">
              <label htmlFor="platform-view-address" className="sr-only">
                Member page, link, or people search
              </label>
              <div
                className={`flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 py-1.5 focus-within:border-transparent focus-within:bg-white/[0.06] focus-within:ring-1 ${accent.ring}`}
              >
                {editing ? (
                  <Search className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
                ) : (
                  <Globe className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
                )}
                {!editing && memberHost && (
                  <span className="hidden shrink-0 select-none text-xs text-zinc-600 md:inline" aria-hidden>
                    {memberHost}
                  </span>
                )}
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
                  placeholder="Search people, or paste a member link or path"
                  spellCheck={false}
                  autoComplete="off"
                  autoCapitalize="off"
                  enterKeyHint="go"
                  aria-keyshortcuts="/"
                  aria-invalid={note?.tone === "error"}
                  aria-describedby={note ? "platform-view-address-note" : undefined}
                  className="w-full min-w-0 bg-transparent text-xs text-zinc-200 outline-none placeholder:text-zinc-600"
                />
                {!editing && (
                  <kbd
                    className="hidden shrink-0 rounded border border-white/10 px-1.5 font-sans text-[10px] leading-4 text-zinc-500 md:inline"
                    title="Press / to search or go to a page"
                  >
                    /
                  </kbd>
                )}
              </div>
            </form>

            <div
              role="group"
              aria-label="Preview width"
              className="hidden items-center gap-0.5 rounded-lg border border-white/[0.06] p-0.5 lg:flex"
            >
              {DEVICES.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => chooseDevice(option.id)}
                    aria-pressed={device === option.id}
                    aria-label={option.label}
                    title={option.label}
                    className={`flex h-7 w-7 items-center justify-center rounded-md transition focus-visible:outline-none focus-visible:ring-1 ${accent.focusRing} ${
                      device === option.id ? accent.pressed : "text-zinc-500 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                );
              })}
            </div>

            <a
              href={newTabHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open this page in a new console tab"
              title="Open this page in a new console tab"
              className={toolbarControlClass(accent, false, "hidden sm:flex")}
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            <ToolbarButton
              label={copied ? "Link copied" : "Copy member-site link"}
              accent={accent}
              onClick={() => void copyLink()}
            >
              {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Link2 className="h-4 w-4" />}
            </ToolbarButton>
            <ToolbarButton
              label={focusMode ? "Show page header" : "Focus mode (hide page header)"}
              accent={accent}
              onClick={toggleFocusMode}
              pressed={focusMode}
            >
              {focusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </ToolbarButton>
          </div>

          {note && (
            <div
              id="platform-view-address-note"
              role={note.tone === "error" ? "alert" : "status"}
              className={`flex items-start gap-2 border-b border-white/10 px-3 py-1.5 text-xs ${
                note.tone === "error" ? "bg-rose-500/[0.06] text-rose-200" : "text-zinc-400"
              }`}
            >
              {note.tone === "error" ? (
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-300" aria-hidden />
              ) : (
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
              )}
              <p className="min-w-0 flex-1">{note.text}</p>
              <button
                type="button"
                onClick={() => setNote(null)}
                aria-label="Dismiss"
                className="-my-0.5 rounded p-0.5 text-zinc-500 transition hover:bg-white/[0.06] hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className={`relative min-h-0 flex-1 ${deviceWidth ? "bg-black/30 p-3" : ""}`}>
            <div
              className={deviceWidth ? "mx-auto h-full w-full overflow-hidden rounded-xl border border-white/10 shadow-xl" : "h-full"}
              style={deviceWidth ? { maxWidth: deviceWidth } : undefined}
            >
              {/* allow-forms: search boxes submit; the frame guard cancels every other form. */}
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
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              />
            </div>
            {!loaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0c0e16] px-6 text-center">
                <Loader2 className={`h-6 w-6 animate-spin ${accent.spinner}`} />
                <p className="text-xs text-zinc-400">Loading the member site…</p>
                {slow && (
                  <>
                    <p className="max-w-xs text-xs text-zinc-500">
                      This is taking longer than usual. Check your connection, then try again.
                    </p>
                    <button
                      type="button"
                      onClick={reloadFrame}
                      className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-white/[0.06]"
                    >
                      Try again
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
