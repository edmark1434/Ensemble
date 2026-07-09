import { useEffect, useState, useRef } from "react";
import type { FC } from "react";
import { useNavigate } from "react-router-dom";
import ScrollToTop from "@/components/utility/scroll_to_top.tsx";

// Modular Split Section Imports
import NavLanding from "../pages/landing/nav_Landing";
import SectionHero from "../pages/landing/section_Hero";
import SectionGallery from "@/pages/landing/section_gallery.tsx";
import SectionHowItWorks from "../pages/landing/section_HowItWorks";
import SectionFeatures from "../pages/landing/section_Features";
import SectionCallForAction from "../pages/landing/section_CallForAction";
import SectionFooter from "../pages/landing/section_Footer";

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

// ─── Stats Bar Component ───────────────────────────────────────────────────
const STATS = [
  { value: "200+",   label: "Verified Clients" },
  { value: "1,000+", label: "Users" },
  { value: "4.8★",   label: "User Satisfaction" },
];

const StatsBar: FC = () => (
  <div style={{ borderBottom: `1px solid ${T.border}`, background: T.bgCard, padding: "36px 40px" }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, maxWidth: 840, margin: "0 auto", textAlign: "center" }}>
      {STATS.map((s) => (
        <div key={s.label}>
          <div style={{ fontFamily: T.fontDisplay, fontSize: 32, fontWeight: 800, color: "#fff", letterSpacing: -1 }}>{s.value}</div>
          <div style={{ color: T.muted, fontSize: 13, marginTop: 4 }}>{s.label}</div>
        </div>
      ))}
    </div>
  </div>
);

// ─── Main Landing Page Composition ───────────────────────────────────────────
const LandingPage: FC = () => {
  useGlobalStyle(GLOBAL_CSS);
  const navigate = useNavigate();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const targetVolume = 0.25; // Balanced volume mix

  // Enhanced fading routine to emphasize the gradual build-up
  const fadeInAudio = (audio: HTMLAudioElement) => {
    audio.volume = 0; // Absolute silence at start
    audio.play()
      .then(() => {
        // Steps up volume slower (0.005) every 40ms to create an explicit audible curve
        const fadeInterval = setInterval(() => {
          if (audio.volume < targetVolume) {
            audio.volume = Math.min(audio.volume + 0.005, targetVolume);
          } else {
            clearInterval(fadeInterval);
          }
        }, 40);
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

  useEffect(() => {
    // 1. Fire a 0.8-second (800ms) delay timer on page mount
    const timer = setTimeout(() => {
      if (audioRef.current) {
        fadeInAudio(audioRef.current);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  const toggleAudio = () => {
    if (!audioRef.current) return;

    if (isMuted) {
      audioRef.current.volume = targetVolume;
      audioRef.current.play()
        .then(() => setIsMuted(false))
        .catch(err => console.log("Playback interaction error:", err));
    } else {
      audioRef.current.pause();
      setIsMuted(true);
    }
  };

  const handleStartAction = () => {
    navigate("/signup");
  };

  return (
    <div style={{ background: T.bg, minHeight: "100vh", overflowX: "hidden" }}>
      {/* Background Music Resource Initialization Loop */}
      <audio ref={audioRef} src="/sounds/bgm_landing.mp3" loop />

      {/* 1. Header Navigation Module */}
      <NavLanding
        onLogin={() => navigate("/login")}
        onSignup={handleStartAction}
        isMuted={isMuted}
        onToggleAudio={toggleAudio}
      />

      {/* 2. Full Video Backdrop Hero Module */}
      <SectionHero onStart={handleStartAction} />

      {/* 3. Operational Performance Stats Module */}
      <StatsBar />

      {/* 4. Interactive WebGL Curvature Showcase */}
      <SectionGallery />

      {/* 5. Multi-Intent 3-Way Structural Flow Module */}
      <SectionHowItWorks />

      {/* 6. Marketplace Value Grid Module */}
      <SectionFeatures />

      {/* 7. Action Acquisition Strip Module */}
      <SectionCallForAction onStart={handleStartAction} />

      {/* 8. Directory Tree Architecture Footer Module */}
      <SectionFooter />

      <ScrollToTop />
    </div>
  );
};

export default LandingPage;