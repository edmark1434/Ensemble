import { useEffect } from "react";
import type { FC } from "react";
import { useNavigate } from "react-router-dom";
import ScrollToTop from "@/components/utility/scroll_to_top.tsx";

// Modular Split Section Imports
import NavLanding from "../pages/landing/nav_Landing";
import SectionHero from "../pages/landing/section_Hero";
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

  const handleStartAction = () => {
    navigate("/signup");
  };

  return (
    <div style={{ background: T.bg, minHeight: "100vh", overflowX: "hidden" }}>
      {/* 1. Header Navigation Module */}
      <NavLanding onLogin={() => navigate("/login")} onSignup={handleStartAction} />

      {/* 2. Full Video Backdrop Hero Module */}
      <SectionHero onStart={handleStartAction} />

      {/* 3. Operational Performance Stats Module */}
      <StatsBar />

      {/* 4. Multi-Intent 3-Way Structural Flow Module */}
      <SectionHowItWorks />

      {/* 5. Marketplace Value Grid Module */}
      <SectionFeatures />

      {/* 6. Action Acquisition Strip Module */}
      <SectionCallForAction onStart={handleStartAction} />

      {/* 7. Directory Tree Architecture Footer Module */}
      <SectionFooter />

      <ScrollToTop />
    </div>
  );
};

export default LandingPage;