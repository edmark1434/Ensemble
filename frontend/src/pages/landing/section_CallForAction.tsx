import type { FC } from "react";

interface CtaStripProps {
  onStart: () => void;
}

const T_CTA = {
  bgCard:      "#0d0f1a",
  border:      "#1e2130",
  muted:       "#7a8499",
  fontDisplay: "'Plus Jakarta Sans', sans-serif",
  fontBody:    "'Plus Jakarta Sans', sans-serif",
} as const;

const SectionCallForAction: FC<CtaStripProps> = ({ onStart }) => {
  return (
    <section id="cta" style={{ padding: "80px 40px", textAlign: "center", background: T_CTA.bgCard, borderTop: `1px solid ${T_CTA.border}` }}>
      <h2 style={{ fontFamily: T_CTA.fontDisplay, fontWeight: 800, fontSize: "clamp(26px,4vw,40px)", marginBottom: 14, color: "#fff" }}>
        Ready to build your blueprint?
      </h2>
      <p style={{ color: T_CTA.muted, fontSize: 15, maxWidth: 440, margin: "0 auto 32px", lineHeight: 1.5 }}>
        Join thousands of filmmakers already using Ensemble to ship better stories, faster.
      </p>
      <button
        onClick={onStart}
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
        onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.03)"}
        onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
      >
        Start for free →
      </button>
    </section>
  );
};

export default SectionCallForAction;