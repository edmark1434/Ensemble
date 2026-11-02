import React, { useEffect, useRef, useState } from "react";
import useGlobalState from "@/lib/global_state";

export interface RulerSection {
  id: string;
  code: string;
  label: string;
  shortLabel: string;
}

export const LANDING_SECTIONS: RulerSection[] = [
  { id: "hero", code: "01", label: "ENSEMBLE", shortLabel: "OVERVIEW" },
  { id: "features", code: "02", label: "HIGHLIGHTS", shortLabel: "HIGHLIGHTS" },
  { id: "how-it-works", code: "03", label: "WORKFLOW", shortLabel: "WORKFLOW" },
  { id: "scroll-expand-showcase", code: "04", label: "USE CASES", shortLabel: "USE CASES" },
  { id: "testimonials", code: "05", label: "COMMUNITY", shortLabel: "COMMUNITY" },
  { id: "cta", code: "06", label: "GET STARTED", shortLabel: "GET STARTED" },
];

const TOTAL_TICKS = 40; // Clean 2.5% per tick, every 4 ticks = exact 10%, 20%, ..., 90%

const ScrollRulerRail: React.FC = () => {
  const theme = useGlobalState((state) => state.theme);
  const isDark = theme === "dark";

  const [activeId, setActiveId] = useState<string>("hero");
  const [isDesktop, setIsDesktop] = useState<boolean>(true);
  const [hasPassedHero, setHasPassedHero] = useState<boolean>(false);

  const playheadRef = useRef<HTMLDivElement>(null);
  const pctLabelRef = useRef<HTMLSpanElement>(null);
  const targetPctRef = useRef<number>(0);
  const currentPctRef = useRef<number>(0);

  useEffect(() => {
    const checkViewport = () => {
      setIsDesktop(window.innerWidth >= 1180);
    };
    checkViewport();

    const updateTargetFromScroll = () => {
      const docEl = document.documentElement;
      const scrollTop = window.scrollY || docEl.scrollTop;
      const maxScroll = Math.max(docEl.scrollHeight - window.innerHeight, 1);
      const pct = Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100));
      targetPctRef.current = pct;

      // Only reveal the side indicator once the user scrolls into/past the "What's inside" (#features) section
      const featuresEl = document.getElementById("features");
      if (featuresEl) {
        const featRect = featuresEl.getBoundingClientRect();
        setHasPassedHero(featRect.top <= window.innerHeight * 0.45);
      } else {
        setHasPassedHero(scrollTop > window.innerHeight * 0.7);
      }

      const viewportProbe = scrollTop + window.innerHeight * 0.35;
      let currentSection = LANDING_SECTIONS[0].id;
      for (const sec of LANDING_SECTIONS) {
        const el = document.getElementById(sec.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          const absTop = rect.top + scrollTop;
          if (viewportProbe >= absTop) {
            currentSection = sec.id;
          }
        }
      }
      setActiveId((prev) => (prev !== currentSection ? currentSection : prev));
    };

    let rafId = 0;
    const animateLoop = () => {
      const diff = targetPctRef.current - currentPctRef.current;
      if (Math.abs(diff) > 0.01) {
        currentPctRef.current += diff * 0.16;
      } else {
        currentPctRef.current = targetPctRef.current;
      }

      if (playheadRef.current) {
        playheadRef.current.style.top = `${currentPctRef.current.toFixed(3)}%`;
      }
      if (pctLabelRef.current) {
        const rounded = Math.round(currentPctRef.current).toString().padStart(3, "0");
        pctLabelRef.current.textContent = `${rounded}%`;
      }

      rafId = requestAnimationFrame(animateLoop);
    };

    updateTargetFromScroll();
    currentPctRef.current = targetPctRef.current;
    rafId = requestAnimationFrame(animateLoop);

    window.addEventListener("scroll", updateTargetFromScroll, { passive: true });
    window.addEventListener("resize", checkViewport);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", updateTargetFromScroll);
      window.removeEventListener("resize", checkViewport);
    };
  }, []);

  if (!isDesktop) return null;

  const activeSection = LANDING_SECTIONS.find((s) => s.id === activeId) || LANDING_SECTIONS[0];

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <aside
      aria-label="Page Scroll Telemetry"
      style={{
        position: "fixed",
        top: 68,
        right: 0,
        bottom: 150,
        width: 145,
        zIndex: 4500,
        pointerEvents: "none",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        userSelect: "none",
        opacity: hasPassedHero ? 1 : 0,
        transform: hasPassedHero ? "translateX(0)" : "translateX(20px)",
        transition:
          "opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1), transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Top-Right Section Jump Index */}
      <div
        style={{
          padding: "12px 16px 0 0",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 5,
          pointerEvents: hasPassedHero ? "auto" : "none",
        }}
      >
        {LANDING_SECTIONS.map((sec) => {
          const isCurrent = sec.id === activeId;
          return (
            <button
              key={sec.id}
              onClick={() => scrollToSection(sec.id)}
              style={{
                background: "transparent",
                border: "none",
                padding: "1px 0",
                cursor: "pointer",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: isCurrent ? 12 : 9.5,
                fontWeight: isCurrent ? 800 : 600,
                letterSpacing: isCurrent ? "0.04em" : "0.08em",
                textTransform: "uppercase",
                color: isCurrent
                  ? isDark
                    ? "#ffffff"
                    : "#111827"
                  : isDark
                  ? "rgba(255,255,255,0.34)"
                  : "rgba(17,24,39,0.38)",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                textAlign: "right",
                lineHeight: 1.25,
              }}
            >
              {sec.label}
            </button>
          );
        })}
      </div>

      {/* Ruler Track & Playhead */}
      <div
        style={{
          position: "relative",
          flex: 1,
          marginTop: 20,
          marginBottom: 16,
          width: "100%",
        }}
      >
        {/* Tick Marks along right edge (Right lane: 0px to 32px) */}
        {Array.from({ length: TOTAL_TICKS + 1 }).map((_, idx) => {
          const pctVal = Math.round((idx / TOTAL_TICKS) * 100);
          const isMajor = idx % 2 === 0; // Every 5%
          const isLabeled = idx % 4 === 0 && pctVal > 0 && pctVal < 100; // Clean 10, 20, ..., 90
          const topPos = `${(idx / TOTAL_TICKS) * 100}%`;

          return (
            <div
              key={idx}
              style={{
                position: "absolute",
                top: topPos,
                right: 0,
                transform: "translateY(-50%)",
                display: "flex",
                alignItems: "center",
                gap: 5,
                zIndex: 1,
              }}
            >
              {isLabeled && (
                <span
                  style={{
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    fontSize: 9,
                    fontWeight: 600,
                    color: isDark
                      ? "rgba(255,255,255,0.32)"
                      : "rgba(17,24,39,0.36)",
                    letterSpacing: "0.04em",
                    lineHeight: 1,
                  }}
                >
                  {pctVal}
                </span>
              )}
              <div
                style={{
                  width: isMajor ? 12 : 6,
                  height: 1,
                  background: isMajor
                    ? isDark
                      ? "rgba(255,255,255,0.28)"
                      : "rgba(17,24,39,0.28)"
                    : isDark
                    ? "rgba(255,255,255,0.12)"
                    : "rgba(17,24,39,0.14)",
                }}
              />
            </div>
          );
        })}

        {/* Vertical Rotated Active Section Label (Dedicated Left Lane: clear of tick numbers) */}
        <div
          style={{
            position: "absolute",
            right: 46,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 20,
            zIndex: 3,
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: isDark ? "rgba(255,255,255,0.48)" : "rgba(17,24,39,0.48)",
              background: isDark ? "rgba(18, 18, 20, 0.85)" : "rgba(255, 255, 255, 0.85)",
              padding: "8px 3px",
              whiteSpace: "nowrap",
              lineHeight: 1,
            }}
          >
            {activeSection.shortLabel}
          </span>
        </div>

        {/* Live Glowing Blue Playhead Indicator (Top Z-Layer with Pill Backdrop so 093% is never buried) */}
        <div
          ref={playheadRef}
          style={{
            position: "absolute",
            top: "0%",
            right: 0,
            transform: "translate3d(0, -50%, 0)",
            willChange: "top",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: 56,
              height: 2,
              background: "#3b82f6",
              boxShadow:
                "0 0 12px rgba(59, 130, 246, 0.85), 0 0 4px rgba(96, 165, 250, 0.9)",
            }}
          />
          <span
            ref={pctLabelRef}
            style={{
              marginTop: 2,
              marginRight: 6,
              padding: "2px 5px",
              background: isDark ? "#121214" : "#ffffff",
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: 10,
              fontWeight: 700,
              color: "#60a5fa",
              letterSpacing: "0.06em",
              lineHeight: 1.1,
              textShadow: isDark ? "0 0 10px rgba(59, 130, 246, 0.6)" : "none",
            }}
          >
            000%
          </span>
        </div>
      </div>
    </aside>
  );
};

export default ScrollRulerRail;
