import { useEffect, useRef } from "react";
import type { FC } from "react";
import { useNavigate } from "react-router-dom";
import FadeInScroll from "@/components/ui/FadeInScroll";
import useGlobalState from "@/lib/global_state";

type FooterLinks = Record<string, string[]>;

interface FooterProps {
  isMuted?: boolean;
}

const T_FOOT = {
  fontDisplay: "'Plus Jakarta Sans', sans-serif",
  fontBody: "'Plus Jakarta Sans', sans-serif",
} as const;

const FOOTER_LINKS: FooterLinks = {
  Product: ["Features", "Use Cases", "Pricing"],
  Company: ["About Us"],
  Resources: ["How To Hire", "How to Work", "Community", "Support Us"],
  Legal: ["Privacy", "Terms"],
};

const Logo: FC<{ size?: number; theme?: "light" | "dark" }> = ({
  size = 22,
  theme = "dark",
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
    <img
      src="/ensemble_lg.svg"
      alt="Ensemble Logo"
      style={{
        width: size + 6,
        height: size + 6,
        display: "block",
        filter: theme === "light" ? "invert(1)" : "invert(0)",
      }}
    />
    <span
      style={{
        fontSize: size,
        fontWeight: 800,
        fontFamily: T_FOOT.fontDisplay,
        letterSpacing: "-0.02em",
        color: theme === "dark" ? "#fff" : "#0f172a",
        transition: "color 0.3s ease",
      }}
    >
      Ensemble
    </span>
  </div>
);

const SectionFooter: FC<FooterProps> = ({ isMuted = false }) => {
  const navigate = useNavigate();
  const theme = useGlobalState((state) => state.theme);
  const isDark = theme === "dark";
  const minimalHoverAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    minimalHoverAudioRef.current = new Audio("/sounds/minimalhover.mp3");
    minimalHoverAudioRef.current.volume = 0.25;
  }, []);

  const playMinimalHover = () => {
    if (isMuted || !minimalHoverAudioRef.current) return;
    minimalHoverAudioRef.current.currentTime = 0;
    minimalHoverAudioRef.current.play().catch(() => {});
  };

  const handleLinkClick = (link: string) => {
    const routeMap: Record<string, string> = {
      Pricing: "/landing/Pricing",
      "About Us": "/landing/AboutUs",
      "How To Hire": "/landing/HowToHire",
      "How to Work": "/landing/HowToWork",
      "Support Us": "/landing/SupportUs",
      Privacy: "/landing/PrivacyPolicy",
      Terms: "/landing/TermsOfService",
      Community: "/forums",
      "Use Cases": "/landing/usecase/client",
    };

    if (routeMap[link]) {
      navigate(routeMap[link]);
    } else if (link === "Features") {
      document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const borderLine = isDark ? "rgba(255, 255, 255, 0.14)" : "rgba(0, 0, 0, 0.15)";
  const bgSection = isDark ? "#121214" : "#ffffff";
  const bgFrame = isDark ? "#121214" : "#ffffff";
  const textPrimary = isDark ? "#ffffff" : "#111827";
  const textSecondary = isDark ? "#a1a1aa" : "#4b5563";
  const textMeta = isDark ? "rgba(255, 255, 255, 0.45)" : "rgba(17, 24, 39, 0.45)";

  return (
    <footer
      style={{
        background: bgSection,
        borderTop: `1px solid ${borderLine}`,
        marginTop: -1,
        position: "relative",
        overflow: "hidden",
        transition: "background 0.3s ease",
        fontFamily: T_FOOT.fontDisplay,
      }}
    >
      <style>{`
        .footer-blueprint-grid {
          display: grid;
          grid-template-columns: 2fr repeat(4, 1fr);
          width: 100%;
        }
        .footer-blueprint-col {
          border-right: 1px solid ${borderLine};
          padding: 56px 36px;
        }
        .footer-blueprint-col:last-child {
          border-right: none;
        }
        @media (max-width: 960px) {
          .footer-blueprint-grid {
            grid-template-columns: 1fr 1fr;
          }
          .footer-blueprint-col:nth-child(1) {
            grid-column: 1 / -1;
            border-right: none;
            border-bottom: 1px solid ${borderLine};
          }
          .footer-blueprint-col:nth-child(2n) {
            border-right: 1px solid ${borderLine};
          }
          .footer-blueprint-col:nth-child(2n+1) {
            border-right: none;
          }
          .footer-blueprint-col {
            border-bottom: 1px solid ${borderLine};
            padding: 36px 24px;
          }
        }
        @media (max-width: 640px) {
          .footer-blueprint-col {
            padding: 20px 16px !important;
          }
          .footer-brand-desc {
            font-size: 12px !important;
            line-height: 1.5 !important;
            margin-top: 12px !important;
          }
          .footer-brand-meta {
            margin-top: 14px !important;
            font-size: 9px !important;
          }
          .footer-col-header {
            font-size: 9.5px !important;
            margin-bottom: 12px !important;
          }
          .footer-col-link {
            font-size: 11.5px !important;
            margin-bottom: 8px !important;
          }
          .footer-bottom-bar {
            padding: 16px !important;
          }
          .footer-bottom-text {
            font-size: 10.5px !important;
          }
        }
      `}</style>

      <div
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          borderLeft: `1px solid ${borderLine}`,
          borderRight: `1px solid ${borderLine}`,
          background: bgFrame,
          position: "relative",
        }}
      >
        <FadeInScroll distance={24} duration={0.7}>
          <div className="footer-blueprint-grid">
            {/* Brand Column */}
            <div className="footer-blueprint-col">
              <Logo size={22} theme={theme} />
              <p
                className="footer-brand-desc"
                style={{
                  color: textSecondary,
                  fontSize: 14,
                  lineHeight: 1.7,
                  marginTop: 20,
                  maxWidth: 290,
                  fontFamily: T_FOOT.fontBody,
                }}
              >
                The parallel workflow platform for modern film production teams, video
                editors, and creative professionals.
              </p>
              <div
                className="footer-brand-meta"
                style={{
                  marginTop: 28,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: textMeta,
                }}
              >
                RAVENLABS DEV • STUDIO SUITE
              </div>
            </div>

            {/* Directory Link Columns */}
            {Object.entries(FOOTER_LINKS).map(([col, links]) => (
              <div key={col} className="footer-blueprint-col">
                <div
                  className="footer-col-header"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: textMeta,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    marginBottom: 24,
                    fontFamily: T_FOOT.fontDisplay,
                  }}
                >
                  {col}
                </div>
                {links.map((l) => (
                  <div
                    key={l}
                    className="footer-col-link"
                    onClick={() => handleLinkClick(l)}
                    onMouseEnter={(e) => {
                      playMinimalHover();
                      e.currentTarget.style.color = textPrimary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = textSecondary;
                    }}
                    style={{
                      color: textSecondary,
                      fontSize: 14,
                      fontWeight: 500,
                      marginBottom: 14,
                      cursor: "pointer",
                      transition: "color 0.15s ease",
                      fontFamily: T_FOOT.fontBody,
                    }}
                  >
                    {l}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Bottom Copyright Bar */}
          <div
            className="footer-bottom-bar"
            style={{
              borderTop: `1px solid ${borderLine}`,
              padding: "24px clamp(20px, 4vw, 40px)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <span className="footer-bottom-text" style={{ color: textMeta, fontSize: 12, fontWeight: 600 }}>
              © 2026 Ensemble, RavenLabs Dev. All rights reserved.
            </span>
            <div style={{ display: "flex", gap: 20 }}>
              {["Twitter", "GitHub", "Discord"].map((social) => (
                <span
                  key={social}
                  className="footer-bottom-text"
                  style={{
                    color: textMeta,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    playMinimalHover();
                    e.currentTarget.style.color = textPrimary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = textMeta;
                  }}
                >
                  {social}
                </span>
              ))}
            </div>
          </div>
        </FadeInScroll>
      </div>
    </footer>
  );
};

export default SectionFooter;
