import { useEffect, useRef, useState } from "react";
import { Eye } from "lucide-react";

const SECTIONS = [
  { label: "Home", path: "/home" },
  { label: "Forums", path: "/forums" },
  { label: "Jobs", path: "/jobs/postings" },
  { label: "Gigs", path: "/gigs/services" },
  { label: "Discovery", path: "/discovery" },
  { label: "Marketplace", path: "/assets" },
  { label: "Projects", path: "/projects" },
] as const;

function sectionForPath(pathname: string): string {
  const match = [...SECTIONS]
    .sort((a, b) => b.path.length - a.path.length)
    .find((section) => pathname === section.path || pathname.startsWith(`${section.path}/`));
  return match?.path ?? "/home";
}

export default function StaffPlatformPreviewPage() {
  const [src, setSrc] = useState("/home");
  const [shownPath, setShownPath] = useState("/home");
  const [frameKey, setFrameKey] = useState(0);
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => syncShownPath(frameRef.current), 500);
    return () => window.clearInterval(timer);
  }, []);

  const openSection = (path: string) => {
    setSrc(path);
    setShownPath(path);
    setFrameKey((key) => key + 1);
  };

  const syncShownPath = (frame: HTMLIFrameElement | null) => {
    try {
      const path = frame?.contentWindow?.location?.pathname;
      if (path) setShownPath(path);
    } catch {
      // The preview stays on this origin. Ignore a frame that is not readable yet.
    }
  };

  const activePath = sectionForPath(shownPath);

  return (
    <main className="relative z-10 flex h-screen flex-col md:pl-[260px]">
      <header className="border-b border-white/[0.06] px-4 py-4 md:px-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-sky-300">
            <Eye className="h-4 w-4" />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-white">Platform view</h1>
            <p className="mt-1 max-w-3xl text-sm text-zinc-400">
              A browse-only look at the member site, kept inside this tab. You can move through the areas below. Posting, buying, messaging, and other member actions stay off.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {SECTIONS.map((section) => {
            const selected = activePath === section.path;
            return (
              <button
                key={section.path}
                type="button"
                onClick={() => openSection(section.path)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  selected
                    ? "border-sky-400/40 bg-sky-400/15 text-sky-100"
                    : "border-white/10 text-zinc-400 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                {section.label}
              </button>
            );
          })}
        </div>
      </header>

      <div className="min-h-0 flex-1 p-4 md:p-5">
        <div className="flex h-full min-h-[480px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c0e16] shadow-2xl">
          <div className="flex items-center gap-3 border-b border-white/10 bg-black/40 px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
            <p className="min-w-0 flex-1 truncate rounded-md bg-white/[0.04] px-3 py-1 text-xs text-zinc-400">
              Member site · {shownPath}
            </p>
          </div>
          <iframe
            key={frameKey}
            ref={frameRef}
            title="Member platform preview"
            src={src}
            onLoad={(event) => syncShownPath(event.currentTarget)}
            className="min-h-0 w-full flex-1 bg-white"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
    </main>
  );
}
