import React from "react";
import FadeInScroll from "@/components/ui/FadeInScroll";
import useGlobalState from "@/lib/global_state";

const TESTIMONIALS = [
  {
    quote:
      "Ensemble completely changed how our post-production team collaborates. The live chat and timeline sync is magic.",
    author: "Sarah Jenkins",
    role: "Lead Editor",
    img: "https://i.pravatar.cc/100?img=1",
  },
  {
    quote:
      "I found my best clients through the integrated gig board. Getting paid securely inside the same app is a game-changer.",
    author: "Michael Chen",
    role: "Freelance Colorist",
    img: "https://i.pravatar.cc/100?img=2",
  },
  {
    quote:
      "The AI tools cut my rough cut time in half. Dead-air cleanup alone is worth it.",
    author: "Elena Rossi",
    role: "Content Creator",
    img: "https://i.pravatar.cc/100?img=3",
  },
  {
    quote:
      "We used to juggle 4 different apps for video reviews, hiring, and messaging. Ensemble does it all perfectly.",
    author: "David Kim",
    role: "Creative Director",
    img: "https://i.pravatar.cc/100?img=4",
  },
  {
    quote:
      "The best marketplace for high-quality assets. I bought a VFX pack and hired the creator in 5 minutes.",
    author: "Jessica Alaba",
    role: "VFX Supervisor",
    img: "https://i.pravatar.cc/100?img=5",
  },
];

const Crosshair: React.FC<{
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

const SectionTestimonials: React.FC = () => {
  const theme = useGlobalState((state) => state.theme);
  const isDark = theme === "dark";

  const borderLine = isDark ? "rgba(255, 255, 255, 0.14)" : "rgba(0, 0, 0, 0.15)";
  const crosshairColor = isDark ? "rgba(255, 255, 255, 0.55)" : "rgba(0, 0, 0, 0.5)";
  const bgSection = isDark ? "#121214" : "#ffffff";
  const bgFrame = isDark ? "#121214" : "#ffffff";
  const textPrimary = isDark ? "#ffffff" : "#111827";
  const textSecondary = isDark ? "#a1a1aa" : "#4b5563";
  const textMeta = isDark ? "rgba(255, 255, 255, 0.45)" : "rgba(17, 24, 39, 0.45)";

  return (
    <section
      id="testimonials"
      style={{
        background: bgSection,
        borderTop: `1px solid ${borderLine}`,
        marginTop: -1,
        overflow: "hidden",
        position: "relative",
        transition: "background 0.3s ease",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <style>{`
        @keyframes marquee-testimonials {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .testimonial-track {
          display: flex;
          width: fit-content;
          animation: marquee-testimonials 42s linear infinite;
        }
        .testimonial-track:hover {
          animation-play-state: paused;
        }
        .testimonial-card {
          background: ${bgFrame};
          border-right: 1px solid ${borderLine};
          border-radius: 0;
          padding: clamp(24px, 4vw, 40px) clamp(20px, 3.5vw, 36px);
          width: clamp(280px, 82vw, 420px);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 24px;
          transition: background 0.2s ease;
        }
        .testimonial-card:hover {
          background: ${isDark ? "rgba(255,255,255,0.025)" : "rgba(15,23,42,0.02)"};
        }
        @media (max-width: 640px) {
          .testimonial-card {
            width: 220px !important;
            padding: 14px 12px !important;
            gap: 14px !important;
          }
          .testimonial-quote {
            font-size: 11px !important;
            line-height: 1.42 !important;
          }
          .testimonial-footer {
            padding-top: 10px !important;
          }
          .testimonial-avatar {
            width: 28px !important;
            height: 28px !important;
          }
          .testimonial-author {
            font-size: 11.5px !important;
          }
          .testimonial-role {
            font-size: 9.5px !important;
          }
          .testimonial-idx {
            font-size: 9px !important;
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
        <Crosshair top left color={crosshairColor} />
        <Crosshair top right color={crosshairColor} />
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
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span>05 / COMMUNITY</span>
          <span>WALL OF LOVE</span>
        </div>

        {/* Heading Cell */}
        <FadeInScroll distance={24} duration={0.7}>
          <div
            style={{
              padding: "clamp(36px, 5vw, 56px) clamp(18px, 4vw, 40px)",
              borderBottom: `1px solid ${borderLine}`,
            }}
          >
            <h2
              style={{
                fontSize: "clamp(34px, 4.5vw, 54px)",
                fontWeight: 800,
                color: textPrimary,
                letterSpacing: "-0.03em",
                lineHeight: 1.08,
                margin: 0,
              }}
            >
              Trusted by <span style={{ color: "#3b82f6" }}>creators</span> worldwide.
            </h2>
          </div>
        </FadeInScroll>

        {/* Crisp Marquee Row */}
        <div style={{ overflow: "hidden", width: "100%" }}>
          <div className="testimonial-track">
            {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
              <div key={i} className="testimonial-card">
                <p
                  className="testimonial-quote"
                  style={{
                    color: isDark ? "#e4e4e7" : "#334155",
                    fontSize: 15.5,
                    lineHeight: 1.65,
                    fontWeight: 500,
                    margin: 0,
                  }}
                >
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div
                  className="testimonial-footer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: 20,
                    borderTop: `1px solid ${borderLine}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <img
                      src={t.img}
                      alt={t.author}
                      className="testimonial-avatar"
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                    />
                    <div>
                      <div
                        className="testimonial-author"
                        style={{
                          color: textPrimary,
                          fontWeight: 700,
                          fontSize: 14,
                        }}
                      >
                        {t.author}
                      </div>
                      <div
                        className="testimonial-role"
                        style={{
                          color: textSecondary,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {t.role}
                      </div>
                    </div>
                  </div>
                  <span
                    className="testimonial-idx"
                    style={{
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                      fontSize: 11,
                      fontWeight: 600,
                      color: textMeta,
                    }}
                  >
                    0{(i % TESTIMONIALS.length) + 1}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SectionTestimonials;
