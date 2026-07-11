import { useEffect, useRef } from "react";
import type { FC } from "react";
import ColorBends from "@/components/ui/ColorBends"; // Update path if needed

interface CtaStripProps {
  onStart: () => void;
  isMuted?: boolean; // Support global audio toggle system
}

const T_CTA = {
  bgCard:      "#0d0f1a",
  border:      "#1e2130",
  muted:       "#7a8499",
  fontDisplay: "'Plus Jakarta Sans', sans-serif",
  fontBody:    "'Plus Jakarta Sans', sans-serif",
} as const;

const SectionCallForAction: FC<CtaStripProps> = ({ onStart, isMuted = false }) => {
  const hoverAudioRef = useRef<HTMLAudioElement | null>(null);
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize standard action sound effects
    hoverAudioRef.current = new Audio("/sounds/hover.mp3");
    clickAudioRef.current = new Audio("/sounds/softclick.mp3");

    hoverAudioRef.current.volume = 0.25;
    clickAudioRef.current.volume = 0.4;
  }, []);

  const playHoverSound = () => {
    if (isMuted || !hoverAudioRef.current) return;
    hoverAudioRef.current.currentTime = 0;
    hoverAudioRef.current.play().catch(() => {});
  };

  const playClickSound = () => {
    if (isMuted || !clickAudioRef.current) return;
    clickAudioRef.current.currentTime = 0;
    clickAudioRef.current.play().catch(() => {});
  };

  return (
    <section
      id="cta"
      style={{
        position: "relative",
        overflow: "hidden",
        padding: "100px 40px",
        textAlign: "center",
        background: T_CTA.bgCard,
        borderTop: `1px solid ${T_CTA.border}`
      }}
    >
      {/* ─── WebGL Ambient Fluid Background Layer ─── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
          opacity: 1.0,
        }}
      >
        <ColorBends
          colors={["#4f46e5", "#7c3aed", "#06b6d4", "#0d0f1a"]}
          speed={0.12}
          rotation={35}
          scale={1.2}
          warpStrength={1.2}
          mouseInfluence={0.6}
          parallax={0.3}
          intensity={2.2}
          transparent={true}
          noise={0.05}
        />
      </div>

      {/* ─── High-Priority Interactive Layout Content Layer ─── */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <h2 style={{ fontFamily: T_CTA.fontDisplay, fontWeight: 800, fontSize: "clamp(26px,4vw,40px)", marginBottom: 14, color: "#fff" }}>
          Ready to build your blueprint?
        </h2>
        <p style={{ color: T_CTA.muted, fontSize: 15, maxWidth: 440, margin: "0 auto 32px", lineHeight: 1.5 }}>
          Join thousands of filmmakers already using Ensemble to ship better stories, faster.
        </p>
        <button
          onClick={() => {
            playClickSound(); // Clean click trigger
            onStart();
          }}
          style={{
            background: "#fff",
            color: "#080a12",
            border: "none",
            padding: "14px 34px",
            borderRadius: 28,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: T_CTA.fontBody,
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => {
            playHoverSound(); // Clean audio link trigger
            e.currentTarget.style.transform = "scale(1.03)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          Start for free →
        </button>
      </div>
    </section>
  );
};

export default SectionCallForAction;