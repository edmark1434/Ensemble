import { useEffect, useState, useRef, Suspense, lazy } from "react";
import type { FC } from "react";
import { useNavigate } from "react-router-dom";
import ScrollToTop from "@/components/utility/scroll_to_top.tsx";

// Modular Split Section Imports
import NavLanding from "../pages/landing/nav_Landing";
import SectionHero from "../pages/landing/section_Hero";

// Lazy-loaded components below the fold for better performance
const SectionGallery = lazy(() => import("@/pages/landing/section_gallery.tsx"));
const SectionHowItWorks = lazy(() => import("../pages/landing/section_HowItWorks"));
const SectionFeatures = lazy(() => import("../pages/landing/section_Features"));
const SectionScrollExpand = lazy(() => import("../pages/landing/section_ScrollExpand"));
const SectionScrollText = lazy(() => import("../pages/landing/section_ScrollText"));
const SectionTestimonials = lazy(() => import("../pages/landing/section_Testimonials"));
const SectionCallForAction = lazy(() => import("../pages/landing/section_CallForAction"));
const SectionFooter = lazy(() => import("../pages/landing/section_Footer"));

import HorizontalScrollJacker from "@/components/ui/HorizontalScrollJacker";

// ─── Design tokens (Plus Jakarta Sans) ────────────────────────────────────────
const T = {
  bg:          "#080a12",
  bgCard:      "#0d0f1a",
  border:      "#1e2130",
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
    bottom: 26px;
    right: 26px;
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

// ─── Main Landing Page Composition ───────────────────────────────────────────
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
    
    // We have dedicated tracks now, so ensure playback speed is normal
    audio.playbackRate = 1.0;

    if (!isBgmMuted) {
      // Whenever the source changes, we reset volume to 0 to prevent a loud cut,
      // then seamlessly play and fade it up to the new target volume.
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
    // 1. Fire a 0.8-second (800ms) delay timer on page mount
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
    <div style={{ background: T.bg, minHeight: "100vh", overflowX: "clip" }}>
      {/* Background Music Resource Initialization Loop */}
      <audio ref={audioRef} src={audioSrc} loop />

      {/* 1. Header Navigation Module */}
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

      {/* Lazy-loaded sections to prevent initial lag */}
      <Suspense fallback={<div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: T.muted }}>Loading...</div>}>
        {/* 6.5 Isolated Scrolling Text Module */}
        <SectionScrollText isMuted={isSfxMuted} />

        <HorizontalScrollJacker numPanels={3}>
          {/* 4. Interactive WebGL Curvature Showcase */}
          <SectionGallery isMuted={isSfxMuted} />

          {/* 5. Multi-Intent 3-Way Structural Flow Module */}
          <SectionHowItWorks isMuted={isSfxMuted} />

          {/* 6. Marketplace Value Grid Module */}
          <SectionFeatures isMuted={isSfxMuted} />
        </HorizontalScrollJacker>

        {/* 6.1 Scroll Expansion Module */}
        <SectionScrollExpand isMuted={isSfxMuted} />

        {/* 6.7 Wall of Love / Testimonials Module */}
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

      <ScrollToTop bottom="76px" />
    </div>
  );
};

export default LandingPage;