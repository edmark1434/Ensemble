import useGlobalState from "@/lib/global_state";
import React, { useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Shield, Eye, Lock, Database, Globe, UserCheck } from "lucide-react";

const T = {
  fontDisplay: "'Plus Jakarta Sans', sans-serif",
  fontMono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
} as const;

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
      left: left ? -5 : undefined,
      right: right ? -5 : undefined,
      fontFamily: T.fontMono,
      fontSize: 12,
      lineHeight: 1,
      color,
      pointerEvents: "none",
      userSelect: "none",
      zIndex: 5,
    }}
  >
    +
  </span>
);

const PagePrivacyPolicy: React.FC = () => {
  const theme = useGlobalState((state) => state.theme);
  const isDark = theme === "dark";
  const navigate = useNavigate();

  const hoverAudioRef = useRef<HTMLAudioElement | null>(null);
  const softClickAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const initAudio = () => {
    if (!hoverAudioRef.current) {
      hoverAudioRef.current = new Audio("/sounds/minimalhover.mp3");
      hoverAudioRef.current.volume = 0.15;
    }
    if (!softClickAudioRef.current) {
      softClickAudioRef.current = new Audio("/sounds/softclick.mp3");
      softClickAudioRef.current.volume = 0.4;
    }
  };

  const playHover = useCallback(() => {
    initAudio();
    if (hoverAudioRef.current) {
      hoverAudioRef.current.currentTime = 0;
      hoverAudioRef.current.play().catch(() => {});
    }
  }, []);

  const playSoftClick = useCallback(() => {
    initAudio();
    if (softClickAudioRef.current) {
      softClickAudioRef.current.currentTime = 0;
      softClickAudioRef.current.play().catch(() => {});
    }
  }, []);

  const sections = [
    { id: "collection", code: "01", title: "1. Information Collection" },
    { id: "usage", code: "02", title: "2. Use of Information" },
    { id: "sharing", code: "03", title: "3. Information Sharing" },
    { id: "security", code: "04", title: "4. Data Security" },
    { id: "rights", code: "05", title: "5. Your Privacy Rights" },
    { id: "cookies", code: "06", title: "6. Cookies and Tracking" },
    { id: "retention", code: "07", title: "7. Data Retention" },
    { id: "contact", code: "08", title: "8. Contact Us" },
  ];

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const pageBg = isDark ? "#121214" : "#ffffff";
  const cellHoverBg = isDark ? "#18181b" : "#f8fafc";
  const borderLine = isDark ? "rgba(255, 255, 255, 0.14)" : "rgba(0, 0, 0, 0.14)";
  const textPrimary = isDark ? "#ffffff" : "#09090b";
  const textSecondary = isDark ? "#d4d4d8" : "#27272a";
  const textMeta = isDark ? "#a1a1aa" : "#52525b";
  const crosshairColor = isDark ? "rgba(255, 255, 255, 0.45)" : "rgba(0, 0, 0, 0.45)";
  const accentColor = "#2dd4bf";

  return (
    <div
      style={{
        background: pageBg,
        minHeight: "100vh",
        color: textPrimary,
        fontFamily: T.fontDisplay,
        padding: "48px 0 96px",
        position: "relative",
      }}
    >
      <style>{`
        .bp-privacy-shell {
          max-width: 1320px;
          margin: 0 auto;
          padding: 0 24px;
        }
        .bp-privacy-frame {
          position: relative;
          border: 1px solid ${borderLine};
          background: ${pageBg};
        }
        .bp-privacy-body {
          display: grid;
          grid-template-columns: 290px 1fr;
        }
        .bp-privacy-sidebar {
          border-right: 1px solid ${borderLine};
          background: ${isDark ? "#151518" : "#f8fafc"};
        }
        .bp-privacy-sidebar-inner {
          position: sticky;
          top: 24px;
        }
        .bp-privacy-nav-btn {
          width: 100%;
          appearance: none;
          border: none;
          border-bottom: 1px solid ${borderLine};
          background: transparent;
          padding: 13px 20px;
          text-align: left;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          font-family: ${T.fontDisplay};
          font-size: 13.5px;
          font-weight: 700;
          color: ${textSecondary};
          transition: background 0.16s ease, color 0.16s ease;
        }
        .bp-privacy-nav-btn:hover {
          background: ${cellHoverBg};
          color: ${accentColor};
        }
        .bp-policy-section {
          border-bottom: 1px solid ${borderLine};
          padding: 28px 36px;
          scroll-margin-top: 32px;
        }
        .bp-policy-section:last-child {
          border-bottom: none;
        }
        .bp-policy-section h2 {
          color: ${textPrimary};
          font-family: ${T.fontDisplay};
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin: 0 0 12px 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .bp-policy-section p {
          color: ${textSecondary};
          font-family: ${T.fontDisplay};
          line-height: 1.7;
          font-size: 15px;
          font-weight: 500;
          margin: 0 0 12px 0;
        }
        .bp-policy-section p:last-child {
          margin-bottom: 0;
        }
        .bp-data-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          border: 1px solid ${borderLine};
          margin-top: 16px;
        }
        .bp-data-card {
          border-right: 1px solid ${borderLine};
          padding: 18px;
          background: ${isDark ? "#151518" : "#f8fafc"};
        }
        .bp-data-card:last-child {
          border-right: none;
        }
        .bp-data-card h4 {
          font-family: ${T.fontMono};
          font-size: 11px;
          font-weight: 700;
          color: ${accentColor};
          margin: 0 0 6px 0;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }
        .bp-data-card p {
          font-size: 13.5px;
          font-weight: 500;
          margin: 0;
          color: ${textPrimary};
          line-height: 1.5;
        }
        .bp-policy-list {
          list-style: none;
          padding: 0;
          margin: 14px 0 0 0;
          border: 1px solid ${borderLine};
        }
        .bp-policy-list li {
          color: ${textPrimary};
          padding: 11px 16px;
          font-size: 14.5px;
          font-weight: 500;
          line-height: 1.6;
          border-bottom: 1px solid ${borderLine};
          background: ${isDark ? "#151518" : "#f8fafc"};
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .bp-policy-list li::before {
          content: "+";
          font-family: ${T.fontMono};
          font-weight: 700;
          color: ${accentColor};
        }
        .bp-policy-list li:last-child {
          border-bottom: none;
        }
        @media (max-width: 960px) {
          .bp-privacy-body {
            grid-template-columns: 1fr;
          }
          .bp-privacy-sidebar {
            display: none;
          }
          .bp-policy-section {
            padding: 24px 20px;
          }
          .bp-data-grid {
            grid-template-columns: 1fr;
          }
          .bp-data-card {
            border-right: none !important;
            border-bottom: 1px solid ${borderLine};
          }
          .bp-data-card:last-child {
            border-bottom: none;
          }
        }
      `}</style>

      <div className="bp-privacy-shell">
        <div className="bp-privacy-frame">
          <Crosshair top left color={crosshairColor} />
          <Crosshair top right color={crosshairColor} />
          <Crosshair bottom left color={crosshairColor} />
          <Crosshair bottom right color={crosshairColor} />

          {/* Top Blueprint Navigation Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 24px",
              borderBottom: `1px solid ${borderLine}`,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <button
              onClick={() => {
                playSoftClick();
                navigate("/");
              }}
              onMouseEnter={playHover}
              style={{
                background: "transparent",
                border: "none",
                color: textPrimary,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                fontFamily: T.fontMono,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                padding: 0,
              }}
            >
              <ArrowLeft size={14} /> BACK TO LANDING
            </button>

            <span
              style={{
                fontFamily: T.fontMono,
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: textMeta,
              }}
            >
              LEGAL // PRIVACY POLICY • DATA PROTECTION
            </span>

            <button
              onClick={() => {
                playSoftClick();
                navigate("/landing/TermsOfService");
              }}
              onMouseEnter={playHover}
              style={{
                background: "transparent",
                border: `1px solid ${borderLine}`,
                color: accentColor,
                padding: "6px 14px",
                fontFamily: T.fontMono,
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              TERMS OF SERVICE <ArrowRight size={13} />
            </button>
          </div>

          {/* Hero Title Block */}
          <div
            style={{
              padding: "clamp(32px, 5vw, 48px) clamp(24px, 4vw, 48px)",
              borderBottom: `1px solid ${borderLine}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  border: `1px solid ${accentColor}`,
                  background: isDark ? "rgba(45, 212, 191, 0.08)" : "rgba(45, 212, 191, 0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: accentColor,
                  flexShrink: 0,
                }}
              >
                <Shield size={28} />
              </div>
              <div>
                <div
                  style={{
                    fontFamily: T.fontMono,
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: accentColor,
                    marginBottom: 6,
                  }}
                >
                  DOCUMENT // ENSEMBLE DATA & PRIVACY STANDARD
                </div>
                <h1
                  style={{
                    fontFamily: T.fontDisplay,
                    fontSize: "clamp(28px, 4.2vw, 44px)",
                    fontWeight: 800,
                    letterSpacing: "-0.03em",
                    lineHeight: 1.1,
                    color: textPrimary,
                    margin: 0,
                  }}
                >
                  Privacy Policy
                </h1>
              </div>
            </div>

            <div
              style={{
                border: `1px solid ${borderLine}`,
                padding: "8px 14px",
                fontFamily: T.fontMono,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: textSecondary,
              }}
            >
              LAST UPDATED: MARCH 15, 2024
            </div>
          </div>

          {/* 2-Column Blueprint Legal Body */}
          <div className="bp-privacy-body">
            {/* Left Index Rail */}
            <aside className="bp-privacy-sidebar">
              <div className="bp-privacy-sidebar-inner">
                <div
                  style={{
                    padding: "12px 20px",
                    borderBottom: `1px solid ${borderLine}`,
                    fontFamily: T.fontMono,
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: accentColor,
                  }}
                >
                  CONTENTS // 08 SECTIONS
                </div>
                {sections.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      playSoftClick();
                      scrollToSection(s.id);
                    }}
                    onMouseEnter={playHover}
                    className="bp-privacy-nav-btn"
                  >
                    <span>{s.title}</span>
                    <span
                      style={{
                        fontFamily: T.fontMono,
                        fontSize: 10,
                        fontWeight: 700,
                        color: textMeta,
                      }}
                    >
                      {s.code}
                    </span>
                  </button>
                ))}
              </div>
            </aside>

            {/* Right Policy Sections */}
            <div>
              <section id="collection" className="bp-policy-section">
                <div
                  style={{
                    fontFamily: T.fontMono,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    color: accentColor,
                    marginBottom: 6,
                  }}
                >
                  SECTION 01 // TELEMETRY & ACCOUNT INPUTS
                </div>
                <h2>
                  <Eye size={20} color={accentColor} /> 1. Information Collection
                </h2>
                <p>
                  We collect information you provide directly to us when you create a unified account, complete Identity Verification (KYC), update your profile, use our collaborative video editor, or transact on Jobs, Gigs / Services, and the Asset Marketplace.
                </p>
                <p>
                  We also automatically collect certain technical information when you access our Platform, including device information, log data, and usage statistics to maintain security and improve our services.
                </p>

                <div className="bp-data-grid">
                  <div className="bp-data-card">
                    <h4>Account &amp; KYC Data</h4>
                    <p>Name, email, hashed credentials, avatar, KYC verification status.</p>
                  </div>
                  <div className="bp-data-card">
                    <h4>Project &amp; Asset Data</h4>
                    <p>Video timelines, comments, contracts, Template Videos, Bundles, Images, Videos &amp; Audios.</p>
                  </div>
                  <div className="bp-data-card">
                    <h4>Technical Data</h4>
                    <p>IP address, browser type, operating system, session security logs.</p>
                  </div>
                </div>
              </section>

              <section id="usage" className="bp-policy-section">
                <div
                  style={{
                    fontFamily: T.fontMono,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    color: accentColor,
                    marginBottom: 6,
                  }}
                >
                  SECTION 02 // PROCESSING PURPOSE
                </div>
                <h2>
                  <Database size={20} color={accentColor} /> 2. Use of Information
                </h2>
                <p>
                  We use the information we collect to provide, maintain, and improve our services, including:
                </p>
                <ul className="bp-policy-list">
                  <li>Facilitating real-time video editing, AI Auto Captioning, and Auto Dead-Air Cleanup.</li>
                  <li>Processing escrow contracts, milestone approvals, and credit wallet transactions.</li>
                  <li>Delivering licensed assets into your Asset Library.</li>
                  <li>Sending technical notices, contract updates, and security alerts.</li>
                  <li>Analyzing usage trends to optimize platform performance.</li>
                </ul>
              </section>

              <section id="sharing" className="bp-policy-section">
                <div
                  style={{
                    fontFamily: T.fontMono,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    color: accentColor,
                    marginBottom: 6,
                  }}
                >
                  SECTION 03 // DISCLOSURE CONTROLS
                </div>
                <h2>
                  <Globe size={20} color={accentColor} /> 3. Information Sharing
                </h2>
                <p>
                  We do not sell your personal information to third parties. We may share your information only in the following circumstances:
                </p>
                <ul className="bp-policy-list">
                  <li>With counterparties and team members on projects or contracts you explicitly collaborate on.</li>
                  <li>With trusted infrastructure and payment providers who process work on our behalf under strict confidentiality.</li>
                  <li>In response to a lawful request if required by applicable law, regulation, or legal process.</li>
                </ul>
              </section>

              <section id="security" className="bp-policy-section">
                <div
                  style={{
                    fontFamily: T.fontMono,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    color: accentColor,
                    marginBottom: 6,
                  }}
                >
                  SECTION 04 // SAFEGUARDS
                </div>
                <h2>
                  <Lock size={20} color={accentColor} /> 4. Data Security
                </h2>
                <p>
                  We implement industry-standard security measures designed to protect your personal information from unauthorized access, use, or disclosure. This includes encryption of data in transit and at rest, isolated escrow accounting, and role-based access controls.
                </p>
                <p>
                  However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee its absolute security.
                </p>
              </section>

              <section id="rights" className="bp-policy-section">
                <div
                  style={{
                    fontFamily: T.fontMono,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    color: accentColor,
                    marginBottom: 6,
                  }}
                >
                  SECTION 05 // USER CONTROL
                </div>
                <h2>
                  <UserCheck size={20} color={accentColor} /> 5. Your Privacy Rights
                </h2>
                <p>
                  Depending on your location, you may have certain rights regarding your personal information, including:
                </p>
                <ul className="bp-policy-list">
                  <li>The right to access the personal information we hold about you.</li>
                  <li>The right to request correction of inaccurate account data.</li>
                  <li>The right to request deletion of your personal data (Right to be Forgotten).</li>
                  <li>The right to opt out of non-essential promotional communications.</li>
                </ul>
              </section>

              <section id="cookies" className="bp-policy-section">
                <div
                  style={{
                    fontFamily: T.fontMono,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    color: accentColor,
                    marginBottom: 6,
                  }}
                >
                  SECTION 06 // SESSION STATE
                </div>
                <h2>6. Cookies and Tracking</h2>
                <p>
                  We use essential cookies and local storage to authenticate your session, remember your dark/light theme preference, and maintain real-time workspace state. You can instruct your browser to refuse cookies, though some authenticated features may not function without them.
                </p>
              </section>

              <section id="retention" className="bp-policy-section">
                <div
                  style={{
                    fontFamily: T.fontMono,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    color: accentColor,
                    marginBottom: 6,
                  }}
                >
                  SECTION 07 // STORAGE LIFECYCLE
                </div>
                <h2>7. Data Retention</h2>
                <p>
                  We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required by law or tax/escrow audit regulations. Once an account deletion request is finalized, associated personal data is securely purged within 30 days.
                </p>
              </section>

              <section id="contact" className="bp-policy-section">
                <div
                  style={{
                    fontFamily: T.fontMono,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    color: accentColor,
                    marginBottom: 6,
                  }}
                >
                  SECTION 08 // DATA PROTECTION OFFICER
                </div>
                <h2>8. Contact Us</h2>
                <p>
                  If you have any questions about this Privacy Policy or our data practices, please contact our Data Protection Officer at:
                </p>
                <p style={{ color: accentColor, fontFamily: T.fontMono, fontWeight: 700 }}>
                  privacy@ensemble.app
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PagePrivacyPolicy;
