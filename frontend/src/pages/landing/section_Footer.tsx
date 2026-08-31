import { useEffect, useRef } from "react";
import type { FC } from "react";
import { useNavigate } from "react-router-dom";
import FadeInScroll from "@/components/ui/FadeInScroll";
import useGlobalState from "@/lib/global_state";

type FooterLinks = Record<string, string[]>;

// Added interface props to support global audio control
interface FooterProps {
  isMuted?: boolean;
}

const T_FOOT = {
  fontDisplay: "'Plus Jakarta Sans', sans-serif",
  fontBody:    "'Plus Jakarta Sans', sans-serif",
} as const;

const FOOTER_LINKS: FooterLinks = {
  Product:   ["Features", "Use Cases", "Pricing"],
  Company:   ["About Us"],
  Resources: ["How To Hire", "How to Work", "Community", "Support Us"],
  Legal:     ["Privacy", "Terms"],
};

const Logo: FC<{ size?: number; theme?: 'light' | 'dark' }> = ({ size = 22, theme = 'dark' }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
    <img src="/ensemble_lg.svg" alt="Ensemble Logo" style={{ width: size + 6, height: size + 6, display: "block", filter: theme === 'light' ? "invert(1)" : "invert(0)" }} />
    <span style={{ fontSize: size, fontWeight: 700, fontFamily: T_FOOT.fontDisplay, letterSpacing: .5, color: theme === 'dark' ? "#fff" : "#111827", transition: "color 0.3s ease" }}>
      Ensemble
    </span>
  </div>
);

const SectionFooter: FC<FooterProps> = ({ isMuted = false }) => {
  const navigate = useNavigate();
  const theme = useGlobalState((state) => state.theme);
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
      borderTop: theme === 'dark' ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.05)",
      padding: "80px 60px 40px",
      background: theme === 'dark' ? "#121214" : "#f9fafb",
      position: "relative",
      overflow: "hidden",
      transition: "background 0.3s ease, border-color 0.3s ease"
    }}>
      <div style={{
        position: "absolute",
        bottom: "-10%",
        right: "5%",
        width: "400px",
        height: "400px",
        background: theme === 'dark' ? "rgba(74, 111, 165, 0.05)" : "rgba(59, 130, 246, 0.05)",
        filter: "blur(100px)",
        borderRadius: "50%",
        pointerEvents: "none"
      }} />

      <FadeInScroll distance={40} duration={0.8} style={{ width: "100%", position: "relative", zIndex: 2 }}>
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
            <Logo size={22} theme={theme} />
            <p style={{
              color: theme === 'dark' ? "#a1a1aa" : "#6b7280",
              fontSize: 14,
              lineHeight: 1.7,
              marginTop: 20,
              maxWidth: 280,
              fontFamily: T_FOOT.fontBody,
              transition: "color 0.3s ease"
            }}>
              The parallel workflow platform for modern film production teams and creative professionals.
            </p>
          </div>

          {Object.entries(FOOTER_LINKS).map(([col, links]) => (
            <div key={col}>
              <div style={{
                fontSize: 12,
                fontWeight: 700,
                color: theme === 'dark' ? "#fff" : "#111827",
                letterSpacing: 1.5,
                textTransform: "uppercase",
                marginBottom: 24,
                fontFamily: T_FOOT.fontDisplay,
                transition: "color 0.3s ease"
              }}>
                {col}
              </div>
              {links.map((l) => (
                <div
                  key={l}
                  onClick={() => handleLinkClick(l)}
                  onMouseEnter={(e) => {
                    playMinimalHover(); // Fires your custom hover variant sound asset
                    e.currentTarget.style.color = theme === 'dark' ? "#fff" : "#111827";
                  }}
                  onMouseLeave={(e) => (e.currentTarget.style.color = theme === 'dark' ? "#a1a1aa" : "#6b7280")}
                  style={{
                    color: theme === 'dark' ? "#a1a1aa" : "#6b7280",
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
          borderTop: theme === 'dark' ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.05)",
          paddingTop: 32,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          maxWidth: 1400,
          margin: "0 auto",
          flexWrap: "wrap",
          gap: 12,
          position: "relative",
          zIndex: 2,
          transition: "border-color 0.3s ease"
        }}>
          <span style={{ color: theme === 'dark' ? "#71717a" : "#9ca3af", fontSize: 13, transition: "color 0.3s ease" }}>
            © 2026 Ensemble, RavenLabs Dev. All rights reserved.
          </span>
          <div style={{ display: "flex", gap: 24 }}>
            <span
              className="footer-social-link"
              style={{ color: theme === 'dark' ? "#52525b" : "#9ca3af", fontSize: 13, cursor: "pointer", transition: "color 0.2s" }}
              onMouseEnter={(e) => { playMinimalHover(); e.currentTarget.style.color = theme === 'dark' ? "#fff" : "#111827"; }}
              onMouseLeave={(e) => e.currentTarget.style.color = theme === 'dark' ? "#52525b" : "#9ca3af"}
            >
              Twitter
            </span>
            <span
              className="footer-social-link"
              style={{ color: theme === 'dark' ? "#52525b" : "#9ca3af", fontSize: 13, cursor: "pointer", transition: "color 0.2s" }}
              onMouseEnter={(e) => { playMinimalHover(); e.currentTarget.style.color = theme === 'dark' ? "#fff" : "#111827"; }}
              onMouseLeave={(e) => e.currentTarget.style.color = theme === 'dark' ? "#52525b" : "#9ca3af"}
            >
              GitHub
            </span>
            <span
              className="footer-social-link"
              style={{ color: theme === 'dark' ? "#52525b" : "#9ca3af", fontSize: 13, cursor: "pointer", transition: "color 0.2s" }}
              onMouseEnter={(e) => { playMinimalHover(); e.currentTarget.style.color = theme === 'dark' ? "#fff" : "#111827"; }}
              onMouseLeave={(e) => e.currentTarget.style.color = theme === 'dark' ? "#52525b" : "#9ca3af"}
            >
              Discord
            </span>
          </div>
        </div>
      </FadeInScroll>
    </footer>
  );
};

export default SectionFooter;