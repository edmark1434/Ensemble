import { useEffect, useRef } from "react";
import type { FC } from "react";
import ColorBends from "@/components/ui/ColorBends";
import FadeInScroll from "@/components/ui/FadeInScroll";
import useGlobalState from "@/lib/global_state";

interface CtaStripProps {
  onStart: () => void;
  isMuted?: boolean;
}

const fontDisplay = "'Plus Jakarta Sans', sans-serif";

const Crosshair: FC<{
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
      left: left ? -6 : undefined,
      right: right ? -6 : undefined,
      width: 11,
      height: 11,
      pointerEvents: "none",
      zIndex: 4,
    }}
  >
    <span
      style={{
        position: "absolute",
        top: 5,
        left: 0,
        width: 11,
        height: 1,
        background: color,
      }}
    />
    <span
      style={{
        position: "absolute",
        top: 0,
        left: 5,
        width: 1,
        height: 11,
        background: color,
      }}
    />
  </span>
);

const SectionCallForAction: FC<CtaStripProps> = ({ onStart, isMuted = false }) => {
  const theme = useGlobalState((state) => state.theme);
  const isDark = theme === "dark";
  const hoverAudioRef = useRef<HTMLAudioElement | null>(null);
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
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

  const borderLine = isDark ? "rgba(255, 255, 255, 0.14)" : "rgba(0, 0, 0, 0.15)";
  const crosshairColor = isDark ? "rgba(255, 255, 255, 0.55)" : "rgba(0, 0, 0, 0.5)";
  const bgSection = isDark ? "#121214" : "#ffffff";
  const bgFrame = isDark ? "#121214" : "#ffffff";
  const textPrimary = isDark ? "#ffffff" : "#111827";
  const textSecondary = isDark ? "#a1a1aa" : "#4b5563";
  const textMeta = isDark ? "rgba(255, 255, 255, 0.45)" : "rgba(17, 24, 39, 0.45)";

  return (
    <section
      id="cta"
      style={{
        position: "relative",
        overflow: "hidden",
        background: bgSection,
        borderTop: `1px solid ${borderLine}`,
        marginTop: -1,
        transition: "background 0.3s ease",
        fontFamily: fontDisplay,
      }}
    >
      <style>{`
        @media (max-width: 640px) {
          .cta-inner-wrap {
            padding: 44px 18px !important;
          }
          .cta-eyebrow {
            font-size: 9px !important;
            letter-spacing: 0.14em !important;
            margin-bottom: 10px !important;
          }
          .cta-desc {
            font-size: 12.5px !important;
            line-height: 1.45 !important;
            margin-bottom: 24px !important;
          }
          .cta-btn {
            padding: 12px 26px !important;
            font-size: 11px !important;
          }
        }
      `}</style>
      <div
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          borderLeft: `1px solid ${borderLine}`,
          borderRight: `1px solid ${borderLine}`,
          borderBottom: `1px solid ${borderLine}`,
          background: bgFrame,
          position: "relative",
        }}
      >
        <Crosshair bottom left color={crosshairColor} />
        <Crosshair bottom right color={crosshairColor} />

        {/* Telemetry Header Strip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px clamp(18px, 4vw, 40px)",
            borderBottom: `1px solid ${borderLine}`,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: textMeta,
            position: "relative",
            zIndex: 2,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span>06 / GET STARTED</span>
          <span>LAUNCH WORKSPACE</span>
        </div>

        <div
          className="cta-inner-wrap"
          style={{
            position: "relative",
            overflow: "hidden",
            padding: "clamp(64px, 10vw, 110px) clamp(20px, 4vw, 40px)",
            textAlign: "center",
          }}
        >
          {/* Ambient Fluid Background Layer */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 0,
              opacity: isDark ? 0.45 : 0.65,
              pointerEvents: "none",
            }}
          >
            <ColorBends
              colors={
                isDark
                  ? ["#3b82f6", "#4f46e5", "#06b6d4", "#121214"]
                  : ["#bfdbfe", "#e0e7ff", "#bae6fd", "#ffffff"]
              }
              speed={0.12}
              rotation={35}
              scale={1.2}
              warpStrength={1.2}
              mouseInfluence={0.6}
              parallax={0.3}
              intensity={2.0}
              transparent={true}
              noise={0.05}
            />
          </div>

          <FadeInScroll distance={30} duration={0.7} style={{ position: "relative", zIndex: 1 }}>
            <div
              className="cta-eyebrow"
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: textMeta,
                marginBottom: 18,
              }}
            >
              COLLABORATIVE EDITOR • MARKETPLACE
            </div>

            <h2
              style={{
                fontFamily: fontDisplay,
                fontWeight: 800,
                fontSize: "clamp(32px, 5vw, 60px)",
                letterSpacing: "-0.035em",
                lineHeight: 1.06,
                marginBottom: 14,
                color: textPrimary,
              }}
            >
              Ready to build your <span style={{ color: "#3b82f6" }}>blueprint</span>?
            </h2>

            <p
              className="cta-desc"
              style={{
                color: textSecondary,
                fontSize: 16,
                fontWeight: 500,
                maxWidth: 480,
                margin: "0 auto 36px",
                lineHeight: 1.6,
              }}
            >
              Join thousands of filmmakers and editors already using Ensemble to ship
              better stories, faster.
            </p>

            <button
              className="cta-btn"
              onClick={() => {
                playClickSound();
                onStart();
              }}
              style={{
                background: isDark ? "#ffffff" : "#0f172a",
                color: isDark ? "#0b0c10" : "#ffffff",
                border: "none",
                padding: "16px 38px",
                borderRadius: 0,
                fontWeight: 800,
                fontSize: 13,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: "pointer",
                fontFamily: fontDisplay,
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                playHoverSound();
                e.currentTarget.style.background = "#3b82f6";
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isDark ? "#ffffff" : "#0f172a";
                e.currentTarget.style.color = isDark ? "#0b0c10" : "#ffffff";
              }}
            >
              Start for free →
            </button>
          </FadeInScroll>
        </div>
      </div>
    </section>
  );
};

export default SectionCallForAction;
