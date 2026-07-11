import { useEffect, useRef } from "react";
import type { FC } from "react";
import { useNavigate } from "react-router-dom";

type FooterLinks = Record<string, string[]>;

// Added interface props to support global audio control
interface FooterProps {
  isMuted?: boolean;
}

const T_FOOT = {
  fontDisplay: "'Plus Jakarta Sans', sans-serif",
  fontBody:    "'Plus Jakarta Sans', sans-serif",
  muted:       "#7a8499",
  border:      "#1e2130",
} as const;

const FOOTER_LINKS: FooterLinks = {
  Product:   ["Features", "Use Cases", "Pricing"],
  Company:   ["About Us"],
  Resources: ["How To Hire", "How to Work", "Community", "Support Us"],
  Legal:     ["Privacy", "Terms"],
};

const Logo: FC<{ size?: number }> = ({ size = 22 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
    <img src="/ensemble_lg.svg" alt="Ensemble Logo" style={{ width: size + 6, height: size + 6, display: "block" }} />
    <span style={{ fontSize: size, fontWeight: 700, fontFamily: T_FOOT.fontDisplay, letterSpacing: .5, color: "#fff" }}>
      Ensemble
    </span>
  </div>
);

const SectionFooter: FC<FooterProps> = ({ isMuted = false }) => {
  const navigate = useNavigate();
  const minimalHoverAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize the micro audio effect file
    minimalHoverAudioRef.current = new Audio("/sounds/minimalhover.mp3");
    minimalHoverAudioRef.current.volume = 0.25;
  }, []);

  const playMinimalHover = () => {
    if (isMuted || !minimalHoverAudioRef.current) return;
    minimalHoverAudioRef.current.currentTime = 0; // Rewind for crisp, snappier navigation overrides
    minimalHoverAudioRef.current.play().catch(() => {});
  };

  const handleLinkClick = (link: string) => {
    if (link === "Pricing") {
      navigate("/page_Pricing");
    } else if (link === "Features") {
      document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer style={{
      borderTop: `1px solid ${T_FOOT.border}`,
      padding: "80px 60px 40px",
      background: "#06080f",
      position: "relative",
      overflow: "hidden"
    }}>
      <div style={{
        position: "absolute",
        bottom: "-10%",
        right: "5%",
        width: "400px",
        height: "400px",
        background: "rgba(74, 111, 165, 0.05)",
        filter: "blur(100px)",
        borderRadius: "50%",
        pointerEvents: "none"
      }} />

      <div style={{
        maxWidth: 1400,
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "2fr repeat(4, 1fr)",
        gap: 60,
        marginBottom: 64,
        position: "relative",
        zIndex: 2
      }}>
        <div>
          <Logo size={22} />
          <p style={{
            color: T_FOOT.muted,
            fontSize: 14,
            lineHeight: 1.7,
            marginTop: 20,
            maxWidth: 280,
            fontFamily: T_FOOT.fontBody
          }}>
            The parallel workflow platform for modern film production teams and creative professionals.
          </p>
        </div>

        {Object.entries(FOOTER_LINKS).map(([col, links]) => (
          <div key={col}>
            <div style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#fff",
              letterSpacing: 1.5,
              textTransform: "uppercase",
              marginBottom: 24,
              fontFamily: T_FOOT.fontDisplay
            }}>
              {col}
            </div>
            {links.map((l) => (
              <div
                key={l}
                onClick={() => handleLinkClick(l)}
                onMouseEnter={(e) => {
                  playMinimalHover(); // Fires your custom hover variant sound asset
                  e.currentTarget.style.color = "#fff";
                }}
                onMouseLeave={(e) => (e.currentTarget.style.color = T_FOOT.muted)}
                style={{
                  color: T_FOOT.muted,
                  fontSize: 14,
                  marginBottom: 12,
                  cursor: "pointer",
                  transition: "color .15s",
                  fontFamily: T_FOOT.fontBody
                }}
              >
                {l}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{
        borderTop: `1px solid rgba(255,255,255,0.06)`,
        paddingTop: 32,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        maxWidth: 1400,
        margin: "0 auto",
        flexWrap: "wrap",
        gap: 12,
        position: "relative",
        zIndex: 2
      }}>
        <span style={{ color: T_FOOT.muted, fontSize: 13 }}>
          © 2026 Ensemble, RavenLabs Dev. All rights reserved.
        </span>
        <div style={{ display: "flex", gap: 24 }}>
          <span
            className="footer-social-link"
            onMouseEnter={playMinimalHover}
            style={{ color: "#3a4050", fontSize: 13, cursor: "pointer", transition: "color 0.2s" }}
            onMouseEnter={(e) => { playMinimalHover(); e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={(e) => e.currentTarget.style.color = "#3a4050"}
          >
            Twitter
          </span>
          <span
            className="footer-social-link"
            style={{ color: "#3a4050", fontSize: 13, cursor: "pointer", transition: "color 0.2s" }}
            onMouseEnter={(e) => { playMinimalHover(); e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={(e) => e.currentTarget.style.color = "#3a4050"}
          >
            GitHub
          </span>
          <span
            className="footer-social-link"
            style={{ color: "#3a4050", fontSize: 13, cursor: "pointer", transition: "color 0.2s" }}
            onMouseEnter={(e) => { playMinimalHover(); e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={(e) => e.currentTarget.style.color = "#3a4050"}
          >
            Discord
          </span>
        </div>
      </div>
    </footer>
  );
};

export default SectionFooter;