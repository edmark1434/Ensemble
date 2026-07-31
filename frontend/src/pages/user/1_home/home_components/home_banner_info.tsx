// src/pages/user/1_home/home_components/home_banner_info.tsx
import React, { useEffect, useState, useMemo } from "react";
import { X, ChevronDown } from "lucide-react";
import { APP_VERSION } from "@/version.tsx";

// ============================================================================
// DYNAMIC TEXT FILE LOADER (Vite import.meta.glob)
// ============================================================================
interface VersionRelease {
  version: string;
  filename: string;
  changes: string[];
}

const loadVersionFiles = (): VersionRelease[] => {
  // Automatically imports all .txt files inside the ./versions folder as raw strings
  const modules = import.meta.glob<{ default: string }>("./versions/*.txt", {
    query: "?raw",
    eager: true,
  });

  const parsedLogs: VersionRelease[] = [];

  for (const path in modules) {
    // Extract version name from file path, e.g., "./versions/V1.3.2.txt" -> "V1.3.2"
    const filename = path.split("/").pop() || "";
    const version = filename.replace(".txt", "");
    const rawContent = modules[path].default || "";

    // Split content line by line and clean up empty lines
    const changes = rawContent
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    parsedLogs.push({
      version,
      filename,
      changes,
    });
  }

  // Sort versions in descending order (e.g., V1.3.3, V1.3.2, V1.3.1)
  return parsedLogs.sort((a, b) =>
    b.version.localeCompare(a.version, undefined, { numeric: true, sensitivity: "base" })
  );
};

// ============================================================================
// COMPONENT IMPLEMENTATION
// ============================================================================
interface HomeBannerInfoProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HomeBannerInfo: React.FC<HomeBannerInfoProps> = ({
  isOpen,
  onClose,
}) => {
  const [render, setRender] = useState(isOpen);
  const [active, setActive] = useState(false);

  // Load version logs dynamically
  const versionLogs = useMemo(() => loadVersionFiles(), []);

  // Extract latest version for the header display dynamically
  const latestVersion = versionLogs.length > 0 ? versionLogs[0].version : APP_VERSION;

  // Track which accordion item is expanded (defaults to the latest version)
  const [expandedVersion, setExpandedVersion] = useState<string | null>(
    versionLogs.length > 0 ? versionLogs[0].version : null
  );

  // Sync expanded item if files reload
  useEffect(() => {
    if (versionLogs.length > 0 && !expandedVersion) {
      setExpandedVersion(versionLogs[0].version);
    }
  }, [versionLogs, expandedVersion]);

  // Manage mounting/unmounting for smooth transition
  useEffect(() => {
    if (isOpen) {
      setRender(true);
      const timer = setTimeout(() => setActive(true), 10);
      return () => clearTimeout(timer);
    } else {
      setActive(false);
      const timer = setTimeout(() => setRender(false), 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!render) return null;

  return (
    <div
      className={`fixed inset-0 z-[999999] flex items-center justify-center p-4 transition-opacity duration-300 ease-out ${
        active ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      onClick={onClose}
    >
      <div className="relative w-full max-w-lg">
        {/* Soft Ambient Radial Back Glow */}
        <div
          className={`absolute -inset-4 rounded-3xl bg-zinc-400/10 transition-all duration-300 blur-3xl pointer-events-none ${
            active ? "opacity-60 scale-100" : "opacity-0 scale-50"
          }`}
        />

        {/* Modal Card */}
        <div
          className={`relative w-full overflow-hidden rounded-2xl border border-white/15 bg-[#0a0d18]/95 p-6 md:p-8 shadow-[0_25px_100px_rgba(0,0,0,0.95)] backdrop-blur-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] origin-top-right ${
            active
              ? "scale-100 translate-y-0 opacity-100"
              : "scale-50 -translate-y-12 opacity-0"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-white/10 pb-4">
            <div>
              <span
                className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                System Release Logs
              </span>

              {/* DYNAMIC TITLE DIRECTLY READING FROM LATEST VERSION FILE */}
              <h2
                className="mt-1 text-2xl font-extrabold tracking-tight text-white"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                What's New in {latestVersion}?
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable Version Logs List - Fixed Max Height for Compact Viewing */}
          <div className="my-5 space-y-2.5 max-h-[280px] md:max-h-[320px] overflow-y-auto pr-1.5 custom-scrollbar">
            {versionLogs.length === 0 ? (
              <p className="py-4 text-center text-xs text-zinc-500">
                No version log files found in <code className="text-zinc-400">/versions</code>
              </p>
            ) : (
              versionLogs.map((log, index) => {
                const isExpanded = expandedVersion === log.version;
                const isLatest = index === 0;

                return (
                  <div
                    key={log.version}
                    className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] transition-colors hover:border-white/20"
                  >
                    {/* Accordion Header */}
                    <button
                      onClick={() =>
                        setExpandedVersion(isExpanded ? null : log.version)
                      }
                      className="flex w-full items-center justify-between p-3 text-left transition hover:bg-white/5"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-bold text-white"
                          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        >
                          {log.version}
                        </span>
                        {isLatest && (
                          <span className="rounded-md border border-zinc-700 bg-zinc-800/60 px-1.5 py-0.5 text-[9px] font-medium text-zinc-300 uppercase tracking-wider">
                            Latest
                          </span>
                        )}
                      </div>
                      <ChevronDown
                        className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-300 ${
                          isExpanded ? "rotate-180 text-white" : ""
                        }`}
                      />
                    </button>

                    {/* Accordion Collapsible Body */}
                    <div
                      className={`grid transition-all duration-300 ease-in-out ${
                        isExpanded
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="border-t border-white/5 bg-zinc-950/40 p-3 pt-2 space-y-1">
                          {log.changes.map((change, i) => (
                            <p
                              key={i}
                              className="text-[11px] leading-relaxed text-zinc-300"
                              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                            >
                              {change}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-white/10 pt-4">
            <span className="text-[11px] text-zinc-500">
              Press ESC or click Got It to dismiss
            </span>
            <button
              onClick={onClose}
              className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Got it
            </button>
          </div>
        </div>
      </div>

      {/* Slim Dark Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
};