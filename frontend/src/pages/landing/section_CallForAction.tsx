import { useEffect, useRef } from "react";
import type { FC } from "react";
import { motion, useInView } from "framer-motion";
import ColorBends from "@/components/ui/ColorBends"; // Update path if needed
import FadeInScroll from "@/components/ui/FadeInScroll";
import useGlobalState from "@/lib/global_state";

interface CtaStripProps {
  onStart: () => void;
  isMuted?: boolean; // Support global audio toggle system
}

const fontDisplay = "'Plus Jakarta Sans', sans-serif";
const fontBody = "'Plus Jakarta Sans', sans-serif";

const SectionCallForAction: FC<CtaStripProps> = ({ onStart, isMuted = false }) => {
  const theme = useGlobalState((state) => state.theme);
  const hoverAudioRef = useRef<HTMLAudioElement | null>(null);
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);
  const textRef = useRef(null);
  const isInView = useInView(textRef, { once: false, amount: 0.5 });
  
  const text = "Ready to build your blueprint?";

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
        background: theme === 'dark' ? "#121214" : "#ffffff",
        borderTop: theme === 'dark' ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.05)",
        transition: "background 0.3s ease, border-color 0.3s ease"
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
          colors={theme === 'dark' ? ["#4f46e5", "#7c3aed", "#06b6d4", "#121214"] : ["#a5b4fc", "#d8b4fe", "#7dd3fc", "#ffffff"]}
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
      <FadeInScroll distance={40} duration={0.8} style={{ position: "relative", zIndex: 1 }}>
        <h2 ref={textRef} style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: "clamp(26px,4vw,40px)", marginBottom: 14, color: theme === 'dark' ? "#fff" : "#111827", transition: "color 0.3s ease" }}>
          {text.split("").map((char, index) => (
            <motion.span
              key={index}
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.05, delay: index * 0.05 }}
            >
              {char}
            </motion.span>
          ))}
        </h2>
        <p style={{ color: theme === 'dark' ? "#a1a1aa" : "#6b7280", fontSize: 15, maxWidth: 440, margin: "0 auto 32px", lineHeight: 1.5, transition: "color 0.3s ease" }}>
          Join thousands of filmmakers already using Ensemble to ship better stories, faster.
        </p>
        <button
          onClick={() => {
            playClickSound(); // Clean click trigger
            onStart();
          }}
          style={{
            background: theme === 'dark' ? "#fff" : "#111827",
            color: theme === 'dark' ? "#080a12" : "#ffffff",
            border: "none",
            padding: "14px 34px",
            borderRadius: 28,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: fontBody,
            transition: "all 0.3s ease"
          }}
          onMouseEnter={(e) => {
            playHoverSound(); // Clean audio link trigger
            e.currentTarget.style.transform = "scale(1.03)";
            e.currentTarget.style.boxShadow = theme === 'dark' ? "0 4px 20px rgba(255,255,255,0.2)" : "0 4px 20px rgba(0,0,0,0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          Start for free →
        </button>
      </FadeInScroll>
    </section>
  );
};

export default SectionCallForAction;