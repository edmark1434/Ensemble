// src/pages/user/1_home/home_components/home_banner_info.tsx
import React, { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown, Compass } from "lucide-react";
import { useTourStore } from "@/lib/tour_state";
import useGlobalState from "@/lib/global_state";
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
  const modules = import.meta.glob<{ default: string }>("./versions/*.txt", {
    query: "?raw",
    eager: true,
  });

  const parsedLogs: VersionRelease[] = [];

  for (const path in modules) {
    const filename = path.split("/").pop() || "";
    const version = filename.replace(".txt", "");
    const rawContent = modules[path].default || "";

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

  return parsedLogs.sort((a, b) =>
    b.version.localeCompare(a.version, undefined, { numeric: true, sensitivity: "base" })
  );
};

const Crosshair: React.FC<{
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
  color: string;
}> = ({ top, bottom, left, right, color }) => (
  <span
    aria-hidden="true"
    style={{
      position: "absolute",
      top: top ? -6 : undefined,
      bottom: bottom ? -6 : undefined,
      left: left ? -5 : undefined,
      right: right ? -5 : undefined,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: 12,
      lineHeight: 1,
      color,
      pointerEvents: "none",
      userSelect: "none",
      zIndex: 5,
    }}
  >
    +
  </span>
);

interface HomeBannerInfoProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HomeBannerInfo: React.FC<HomeBannerInfoProps> = ({
  isOpen,
  onClose,
}) => {
  const theme = useGlobalState((state) => state.theme);
  const isDark = theme === "dark";

  const versionLogs = useMemo(() => loadVersionFiles(), []);
  const latestVersion = versionLogs.length > 0 ? versionLogs[0].version : APP_VERSION.split("|")[0].trim();

  const [expandedVersion, setExpandedVersion] = useState<string | null>(
    versionLogs.length > 0 ? versionLogs[0].version : null
  );

  useEffect(() => {
    if (versionLogs.length > 0 && !expandedVersion) {
      setExpandedVersion(versionLogs[0].version);
    }
  }, [versionLogs, expandedVersion]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (typeof document === "undefined") return null;

  const borderLine = isDark ? "rgba(255, 255, 255, 0.14)" : "rgba(15, 23, 42, 0.14)";
  const panelBg = isDark ? "rgba(18, 18, 20, 0.98)" : "#ffffff";
  const subSurfaceBg = isDark ? "rgba(255, 255, 255, 0.03)" : "#f8fafc";
  const textPrimary = isDark ? "#fafafa" : "#0f172a";
  const textSecondary = isDark ? "#d4d4d8" : "#334155";
  const textMeta = isDark ? "#a1a1aa" : "#475569";
  const crosshairColor = isDark ? "rgba(255, 255, 255, 0.4)" : "rgba(15, 23, 42, 0.35)";

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-5"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Architectural Blueprint Modal Window */}
          <motion.div
            initial={{ scale: 0.97, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.97, opacity: 0, y: 12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] flex flex-col"
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 600,
              border: `1px solid ${borderLine}`,
              background: panelBg,
              color: textPrimary,
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              boxShadow: isDark
                ? "0 28px 80px rgba(0, 0, 0, 0.75)"
                : "0 28px 80px rgba(0, 0, 0, 0.22)",
            }}
          >
            <Crosshair top left color={crosshairColor} />
            <Crosshair top right color={crosshairColor} />
            <Crosshair bottom left color={crosshairColor} />
            <Crosshair bottom right color={crosshairColor} />

            {/* Top Blueprint Navigation Strip */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 20px",
                borderBottom: `1px solid ${borderLine}`,
                gap: 12,
                flexShrink: 0,
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: textMeta,
                  }}
                >
                  ENSEMBLE // SYSTEM RELEASE LOGS
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-extrabold tracking-[0.2em] uppercase border border-zinc-300 dark:border-white/20 bg-zinc-100 dark:bg-white/10 text-zinc-800 dark:text-zinc-100">
                  ALPHA
                </span>
              </div>

              <button
                type="button"
                onClick={onClose}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "transparent",
                  border: `1px solid ${borderLine}`,
                  padding: "4px 8px",
                  color: textSecondary,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                <span>CLOSE</span>
                <X size={12} />
              </button>
            </div>

            {/* Header */}
            <div
              style={{
                padding: "18px 20px 14px",
                borderBottom: `1px solid ${borderLine}`,
                flexShrink: 0,
              }}
            >
              <h2
                style={{
                  fontSize: "clamp(20px, 2.6vw, 24px)",
                  fontWeight: 800,
                  letterSpacing: "-0.025em",
                  lineHeight: 1.2,
                  margin: "0 0 4px",
                  color: textPrimary,
                }}
              >
                What&apos;s New in {latestVersion}?
              </h2>
              <p
                style={{
                  color: textSecondary,
                  fontSize: 12.5,
                  fontWeight: 500,
                  margin: 0,
                }}
              >
                Release channel: <strong style={{ color: textPrimary }}>Alpha</strong> · Platform updates and refinements
              </p>
            </div>

            {/* Scrollable Version Logs List */}
            <div
              className="overflow-y-auto thin-scrollbar space-y-2.5"
              style={{
                padding: "16px 20px",
                background: subSurfaceBg,
                borderBottom: `1px solid ${borderLine}`,
              }}
            >
              {versionLogs.length === 0 ? (
                <p className="py-6 text-center text-xs text-zinc-500">
                  No version log files found in <code>/versions</code>
                </p>
              ) : (
                versionLogs.map((log, index) => {
                  const isExpanded = expandedVersion === log.version;
                  const isLatest = index === 0;

                  return (
                    <div
                      key={log.version}
                      style={{
                        border: `1px solid ${borderLine}`,
                        background: panelBg,
                      }}
                    >
                      {/* Accordion Header */}
                      <button
                        type="button"
                        onClick={() => setExpandedVersion(isExpanded ? null : log.version)}
                        className="flex w-full items-center justify-between px-3.5 py-2.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.03] cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold tracking-tight" style={{ color: textPrimary }}>
                            {log.version}
                          </span>
                          {isLatest && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border border-zinc-300 dark:border-white/20 bg-zinc-100 dark:bg-white/10 text-zinc-800 dark:text-zinc-200">
                              Latest · Alpha
                            </span>
                          )}
                        </div>
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition-transform duration-200 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                          style={{ color: textMeta }}
                        />
                      </button>

                      {/* Accordion Collapsible Body */}
                      <div
                        className={`grid transition-all duration-200 ease-in-out ${
                          isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                        }`}
                      >
                        <div className="overflow-hidden">
                          <div
                            className="px-3.5 py-3 space-y-1.5"
                            style={{
                              borderTop: `1px solid ${borderLine}`,
                              background: subSurfaceBg,
                            }}
                          >
                            {log.changes.map((change, i) => (
                              <p
                                key={i}
                                className="text-[11.5px] leading-relaxed"
                                style={{ color: textSecondary }}
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
            <div
              style={{
                padding: "12px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexShrink: 0,
              }}
            >
              <span
                className="hidden sm:inline"
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: textMeta,
                }}
              >
                Press ESC or click Got it to dismiss
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    useTourStore.getState().openWelcome();
                  }}
                  style={{
                    border: `1px solid ${borderLine}`,
                    color: textPrimary,
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-transparent hover:opacity-80 transition cursor-pointer"
                >
                  <Compass className="h-3.5 w-3.5" />
                  <span>Walkthrough</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 text-xs font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:opacity-90 transition cursor-pointer"
                >
                  Got it
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
