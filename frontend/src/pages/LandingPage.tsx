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

      <ScrollToTop />
    </div>
  );
};

export default LandingPage;