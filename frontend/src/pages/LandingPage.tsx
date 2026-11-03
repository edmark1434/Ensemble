import { useEffect, useState, useRef, Suspense, lazy } from "react";
import type { FC } from "react";
import { useNavigate } from "react-router-dom";
import ScrollToTop from "@/components/utility/scroll_to_top.tsx";
import ScrollRulerRail from "@/components/ui/ScrollRulerRail";
import { APP_VERSION } from "@/version.tsx";

// Modular Split Section Imports
import NavLanding from "../pages/landing/nav_Landing";
import SectionHero from "../pages/landing/section_Hero";

// Lazy-loaded vertical sections below the fold
const SectionScrollText = lazy(() => import("../pages/landing/section_ScrollText"));
const SectionHowItWorks = lazy(() => import("../pages/landing/section_HowItWorks"));
const SectionScrollExpand = lazy(() => import("../pages/landing/section_ScrollExpand"));
const SectionTestimonials = lazy(() => import("../pages/landing/section_Testimonials"));
const SectionCallForAction = lazy(() => import("../pages/landing/section_CallForAction"));
const SectionFooter = lazy(() => import("../pages/landing/section_Footer"));

// ─── Design tokens (Plus Jakarta Sans) ────────────────────────────────────────
const T = {
  bg:          "#121214",
  bgCard:      "#121214",
  border:      "#27272a",
  text:        "#ffffff",
  muted:       "#7a8499",
  fontDisplay: "'Plus Jakarta Sans', sans-serif",
} as const;

const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { background: ${T.bg}; color: ${T.text}; -webkit-font-smoothing: antialiased; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-thumb { background: #2a2d3e; border-radius: 3px; }

  /* Core Tab Switching Transition Keyframes Animation */
  @keyframes content-swap {
    0% { opacity: 0; transform: translateY(12px); filter: blur(4px); }
    100% { opacity: 1; transform: translateY(0); filter: blur(0); }
  }

  .animate-swap {
    animation: content-swap 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  /* Precision Floating Ask AI Pill */
  .ensemble-floating-ask-ai {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 999;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px 6px 7px;
    border-radius: 9999px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(18, 18, 22, 0.85);
    color: #f4f4f5;
    font-family: 'Plus Jakarta Sans', sans-serif;
    cursor: pointer;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow: 
      0 4px 18px rgba(0, 0, 0, 0.45),
      0 1px 0 rgba(255, 255, 255, 0.12) inset;
    transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    user-select: none;
  }
  .ensemble-floating-ask-ai:hover {
    transform: translateY(-2px);
    border-color: rgba(59, 130, 246, 0.5);
    background: rgba(24, 24, 32, 0.95);
    box-shadow: 
      0 8px 26px rgba(0, 0, 0, 0.55),
      0 0 16px rgba(59, 130, 246, 0.22),
      0 1px 0 rgba(255, 255, 255, 0.2) inset;
  }
  .ensemble-floating-ask-ai:active {
    transform: translateY(0) scale(0.98);
  }

  .ensemble-ai-pill-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 9999px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.2s ease;
  }
  .ensemble-floating-ask-ai:hover .ensemble-ai-pill-icon {
    background: rgba(37, 99, 235, 0.2);
    border-color: rgba(59, 130, 246, 0.5);
  }

  .ensemble-ai-pill-label {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.01em;
    line-height: 1;
    color: inherit;
  }

  .ensemble-ai-pill-kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 2.5px 5.5px;
    border-radius: 4px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 10px;
    font-weight: 600;
    line-height: 1;
    color: rgba(255, 255, 255, 0.5);
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.2s ease;
  }
  .ensemble-floating-ask-ai:hover .ensemble-ai-pill-kbd {
    color: #93c5fd;
    border-color: rgba(59, 130, 246, 0.3);
    background: rgba(37, 99, 235, 0.15);
  }

  /* Light mode (when html does not have .dark) */
  html:not(.dark) .ensemble-floating-ask-ai {
    border-color: rgba(0, 0, 0, 0.08);
    background: rgba(255, 255, 255, 0.9);
    color: #0f172a;
    box-shadow: 
      0 4px 18px rgba(0, 0, 0, 0.08),
      0 1px 0 rgba(255, 255, 255, 0.9) inset;
  }
  html:not(.dark) .ensemble-floating-ask-ai:hover {
    border-color: rgba(37, 99, 235, 0.4);
    background: #ffffff;
    box-shadow: 
      0 8px 26px rgba(0, 0, 0, 0.12),
      0 0 16px rgba(37, 99, 235, 0.15),
      0 1px 0 rgba(255, 255, 255, 1) inset;
  }
  html:not(.dark) .ensemble-ai-pill-icon {
    background: rgba(0, 0, 0, 0.04);
    border-color: rgba(0, 0, 0, 0.06);
  }
  html:not(.dark) .ensemble-ai-pill-kbd {
    color: rgba(15, 23, 42, 0.55);
    background: rgba(0, 0, 0, 0.04);
    border-color: rgba(0, 0, 0, 0.06);
  }
  html:not(.dark) .ensemble-floating-ask-ai:hover .ensemble-ai-pill-kbd {
    color: #1d4ed8;
    border-color: rgba(37, 99, 235, 0.25);
    background: rgba(37, 99, 235, 0.08);
  }
  @media (max-width: 640px) {
    .ensemble-floating-ask-ai {
      bottom: 14px;
      right: 14px;
      padding: 6px 11px 6px 7px;
    }
    .ensemble-ai-pill-kbd {
      display: none;
    }
    .ensemble-version-badge {
      bottom: 14px !important;
      left: 14px !important;
      padding: 4px 8px !important;
      font-size: 9.5px !important;
    }
  }
`;

function useGlobalStyle(css: string): void {
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = css;
    document.head.appendChild(el);
    return () => { document.head.removeChild(el); };
  }, []);
}

import useGlobalState from "@/lib/global_state";

// ─── Main Landing Page Composition (Pure Vertical + Blueprint Telemetry) ─────
const LandingPage: FC = () => {
  useGlobalStyle(GLOBAL_CSS);
  const navigate = useNavigate();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isBgmMuted, setIsBgmMuted] = useState<boolean>(false);
  const [isSfxMuted, setIsSfxMuted] = useState<boolean>(false);
  const [bgmVolume, setBgmVolume] = useState<number>(0.02); // 2% default
  const theme = useGlobalState((state) => state.theme);
  const targetVolume = bgmVolume;
  const audioSrc = theme === 'dark' ? '/sounds/dark-bgm.mp3' : '/sounds/light-bgm.mp3';
  const volumeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Unified smooth volume adjustment routine
  const smoothlyAdjustVolume = (audio: HTMLAudioElement, target: number) => {
    if (volumeIntervalRef.current) clearInterval(volumeIntervalRef.current);
    
    volumeIntervalRef.current = setInterval(() => {
      const diff = target - audio.volume;
      if (Math.abs(diff) < 0.005) {
        audio.volume = target;
        if (volumeIntervalRef.current) clearInterval(volumeIntervalRef.current);
      } else {
        const step = diff > 0 ? 0.002 : -0.002;
        audio.volume = Math.min(Math.max(audio.volume + step, 0), 1);
      }
    }, 40);
  };

  // Enhanced fading routine to emphasize the gradual build-up
  const fadeInAudio = (audio: HTMLAudioElement) => {
    if (audio.volume === 1) audio.volume = 0; // Absolute silence at start if not already fading
    audio.play()
      .then(() => {
        smoothlyAdjustVolume(audio, targetVolume);
      })
      .catch(() => {
        console.log("Autoplay blocked at 0.8s. Hooking fallback interaction gesture listener...");

        // Gesture fallback: fires the fade seamlessly on first touch
        const playAndFadeOnFirstClick = () => {
          document.removeEventListener("click", playAndFadeOnFirstClick);
          fadeInAudio(audio);
        };
        document.addEventListener("click", playAndFadeOnFirstClick);
      });
  };

  // Handle track switches and dynamic volume adjustments
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.playbackRate = 1.0;

    if (!isBgmMuted) {
      if (audio.paused) {
        audio.volume = 0;
        audio.play().then(() => {
          smoothlyAdjustVolume(audio, targetVolume);
        }).catch(e => console.log("Autoplay prevented on track switch", e));
      } else {
        smoothlyAdjustVolume(audio, targetVolume);
      }
    }
  }, [audioSrc, targetVolume, isBgmMuted]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (audioRef.current) {
        fadeInAudio(audioRef.current);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

  // Global ⌘K / Ctrl+K keyboard shortcut to launch Ask AI
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) {
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        navigate("/landing/AskOurChatbot");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  const toggleBgm = () => {
    if (!audioRef.current) return;
    if (isBgmMuted) {
      audioRef.current.volume = targetVolume;
      audioRef.current.play()
        .then(() => setIsBgmMuted(false))
        .catch(err => console.log("Playback interaction error:", err));
    } else {
      audioRef.current.pause();
      setIsBgmMuted(true);
    }
  };

  const toggleSfx = () => {
    setIsSfxMuted(!isSfxMuted);
  };

  const handleStartAction = () => {
    navigate("/signup");
  };

  return (
    <div style={{ background: theme === 'dark' ? "#121214" : "#ffffff", minHeight: "100vh", overflowX: "clip" }}>
      {/* Background Music Resource Initialization Loop */}
      <audio ref={audioRef} src={audioSrc} loop />

      {/* Right-Edge Scroll Ruler & Section Telemetry Rail */}
      <ScrollRulerRail />

      {/* 1. Sticky Header Navigation Module */}
      <NavLanding
        onLogin={() => navigate("/login")}
        onSignup={handleStartAction}
        isBgmMuted={isBgmMuted}
        isSfxMuted={isSfxMuted}
        bgmVolume={bgmVolume}
        onToggleBgm={toggleBgm}
        onToggleSfx={toggleSfx}
        onSetBgmVolume={setBgmVolume}
      />

      {/* 2. Full Video Backdrop Hero Module */}
      <SectionHero onStart={handleStartAction} isMuted={isSfxMuted} />

      {/* Pure Vertical Sections Below the Fold */}
      <Suspense fallback={<div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: T.muted }}>Loading...</div>}>
        {/* 3. Scrolling Marquee + "What's inside." 3x4 Bento Grid (Features + Overview + Stats) */}
        <SectionScrollText isMuted={isSfxMuted} />

        {/* 4. Multi-Intent 3-Way Workflow Module */}
        <SectionHowItWorks isMuted={isSfxMuted} />

        {/* 5. Scroll Expansion & Categories Ticker Module */}
        <SectionScrollExpand isMuted={isSfxMuted} />

        {/* 6. Wall of Love / Testimonials Module */}
        <SectionTestimonials />

        {/* 7. Action Acquisition Strip Module */}
        <SectionCallForAction onStart={handleStartAction} isMuted={isSfxMuted} />

        {/* 8. Directory Tree Architecture Footer Module */}
        <SectionFooter isMuted={isSfxMuted} />
      </Suspense>

      {/* Precision Floating Ask AI Command Pill (Bottom Right) */}
      <button
        onClick={() => navigate("/landing/AskOurChatbot")}
        className="ensemble-floating-ask-ai group"
        aria-label={`Ask Ensemble AI (${isMac ? "⌘K" : "Ctrl K"})`}
        title={`Ask Ensemble AI (${isMac ? "⌘K" : "Ctrl K"})`}
      >
        <span className="ensemble-ai-pill-icon">
          <img
            src="/ensemble_lg.svg"
            alt="Ensemble"
            className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110"
            style={{
              filter: theme === "dark" ? "none" : "invert(1)",
            }}
          />
        </span>
        <span className="ensemble-ai-pill-label">Ask AI</span>
        <kbd className="ensemble-ai-pill-kbd">{isMac ? "⌘K" : "Ctrl K"}</kbd>
      </button>

      <ScrollToTop bottom="82px" right="24px" />

      {/* Fixed Bottom-Left App Version Telemetry Badge */}
      <div
        className="ensemble-version-badge"
        style={{
          position: "fixed",
          bottom: 24,
          left: 24,
          zIndex: 999,
          pointerEvents: "none",
          padding: "5px 10px",
          background: theme === "dark" ? "rgba(18, 18, 20, 0.85)" : "rgba(255, 255, 255, 0.88)",
          border: theme === "dark" ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(0, 0, 0, 0.12)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: 10.5,
          fontWeight: 600,
          letterSpacing: "0.16em",
          color: theme === "dark" ? "rgba(255, 255, 255, 0.55)" : "rgba(17, 24, 39, 0.6)",
          userSelect: "none",
          lineHeight: 1,
        }}
      >
        {APP_VERSION}
      </div>
    </div>
  );
};

export default LandingPage;
