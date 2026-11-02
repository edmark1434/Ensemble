import useGlobalState from "@/lib/global_state";
import React, { useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Scale, ShieldCheck } from "lucide-react";

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

const PageTermsOfService: React.FC = () => {
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
    { id: "acceptance", code: "01", title: "1. Acceptance of Terms" },
    { id: "description", code: "02", title: "2. Description of Service" },
    { id: "accounts", code: "03", title: "3. User Accounts & KYC" },
    { id: "content", code: "04", title: "4. User Content" },
    { id: "conduct", code: "05", title: "5. Prohibited Conduct" },
    { id: "payment", code: "06", title: "6. Payment, Escrow & Milestones" },
    { id: "termination", code: "07", title: "7. Termination" },
    { id: "warranties", code: "08", title: "8. Disclaimer of Warranties" },
    { id: "liability", code: "09", title: "9. Limitation of Liability" },
    { id: "changes", code: "10", title: "10. Changes to Terms" },
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
  const accentColor = "#3b82f6";

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
        .bp-legal-shell {
          max-width: 1320px;
          margin: 0 auto;
          padding: 0 24px;
        }
        .bp-legal-frame {
          position: relative;
          border: 1px solid ${borderLine};
          background: ${pageBg};
        }
        .bp-legal-body {
          display: grid;
          grid-template-columns: 290px 1fr;
        }
        .bp-legal-sidebar {
          border-right: 1px solid ${borderLine};
          background: ${isDark ? "#151518" : "#f8fafc"};
        }
        .bp-legal-sidebar-inner {
          position: sticky;
          top: 24px;
        }
        .bp-legal-nav-btn {
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
        .bp-legal-nav-btn:hover {
          background: ${cellHoverBg};
          color: ${accentColor};
        }
        .bp-tos-section {
          border-bottom: 1px solid ${borderLine};
          padding: 28px 36px;
          scroll-margin-top: 32px;
        }
        .bp-tos-section:last-child {
          border-bottom: none;
        }
        .bp-tos-section h2 {
          color: ${textPrimary};
          font-family: ${T.fontDisplay};
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin: 0 0 12px 0;
        }
        .bp-tos-section p {
          color: ${textSecondary};
          font-family: ${T.fontDisplay};
          line-height: 1.7;
          font-size: 15px;
          font-weight: 500;
          margin: 0 0 12px 0;
        }
        .bp-tos-section p:last-child {
          margin-bottom: 0;
        }
        .bp-tos-list {
          list-style: none;
          padding: 0;
          margin: 14px 0 0 0;
          border: 1px solid ${borderLine};
        }
        .bp-tos-list li {
          color: ${textPrimary};
          padding: 12px 16px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          font-size: 14.5px;
          font-weight: 500;
          line-height: 1.65;
          border-bottom: 1px solid ${borderLine};
          background: ${isDark ? "#151518" : "#f8fafc"};
        }
        .bp-tos-list li:last-child {
          border-bottom: none;
        }
        @media (max-width: 960px) {
          .bp-legal-body {
            grid-template-columns: 1fr;
          }
          .bp-legal-sidebar {
            display: none;
          }
          .bp-tos-section {
            padding: 24px 20px;
          }
        }
      `}</style>

      <div className="bp-legal-shell">
        <div className="bp-legal-frame">
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
              LEGAL // TERMS OF SERVICE • PLATFORM GOVERNANCE
            </span>

            <button
              onClick={() => {
                playSoftClick();
                navigate("/landing/PrivacyPolicy");
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
              PRIVACY POLICY <ArrowRight size={13} />
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
                  background: isDark ? "rgba(59, 130, 246, 0.08)" : "rgba(59, 130, 246, 0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: accentColor,
                  flexShrink: 0,
                }}
              >
                <Scale size={28} />
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
                  DOCUMENT // ENSEMBLE PLATFORM AGREEMENT
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
                  Terms of Service
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
          <div className="bp-legal-body">
            {/* Left Index Rail */}
            <aside className="bp-legal-sidebar">
              <div className="bp-legal-sidebar-inner">
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
                  ON THIS PAGE // 10 CLAUSES
                </div>
                {sections.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      playSoftClick();
                      scrollToSection(s.id);
                    }}
                    onMouseEnter={playHover}
                    className="bp-legal-nav-btn"
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

            {/* Right Clause Cells */}
            <div>
              <section id="acceptance" className="bp-tos-section">
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
                  CLAUSE 01 // BINDING AGREEMENT
                </div>
                <h2>1. Acceptance of Terms</h2>
                <p>
                  By accessing and using Ensemble ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Platform.
                </p>
              </section>

              <section id="description" className="bp-tos-section">
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
                  CLAUSE 02 // PLATFORM SCOPE
                </div>
                <h2>2. Description of Service</h2>
                <p>
                  Ensemble provides a collaborative video editing and creative marketplace platform that allows unified accounts to act as Clients, Freelancers, and Asset Creators. The Platform includes real-time team editing, AI Auto Captioning, Auto Dead-Air Cleanup, Job Posts & Proposals, Discovery / Gigs & Services, escrow-backed contracts, and the Asset Marketplace / Asset Library for Template Videos, Bundles, Images, Videos, and Audios.
                </p>
              </section>

              <section id="accounts" className="bp-tos-section">
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
                  CLAUSE 03 // UNIFIED ACCOUNT & KYC
                </div>
                <h2>3. User Accounts & Identity Verification (KYC)</h2>
                <p>
                  To access platform features, you must create a unified account. Before engaging in financial or contractual transactions—such as posting jobs, submitting proposals, ordering Gigs / Services, offering contracts, funding escrow, or withdrawing earnings—you must complete Identity Verification (KYC).
                </p>
                <ul className="bp-tos-list">
                  <li>
                    <ShieldCheck size={17} color={accentColor} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>You must be at least 13 years old to use the Platform (and meet legal age requirements for KYC financial transactions).</span>
                  </li>
                  <li>
                    <ShieldCheck size={17} color={accentColor} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>You agree to provide accurate, truthful, and complete account and KYC information.</span>
                  </li>
                  <li>
                    <ShieldCheck size={17} color={accentColor} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>You are responsible for all content you post, upload, or share under your account.</span>
                  </li>
                  <li>
                    <ShieldCheck size={17} color={accentColor} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>You may not share or transfer your account credentials to others.</span>
                  </li>
                </ul>
              </section>

              <section id="content" className="bp-tos-section">
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
                  CLAUSE 04 // INTELLECTUAL PROPERTY
                </div>
                <h2>4. User Content</h2>
                <p>
                  You retain all rights to any content you upload, post, or display on or through the Platform. By uploading content, you grant Ensemble a worldwide, non-exclusive, royalty-free license to host, process, and display the content solely for the purpose of providing the Service.
                </p>
              </section>

              <section id="conduct" className="bp-tos-section">
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
                  CLAUSE 05 // PLATFORM INTEGRITY & MERIT
                </div>
                <h2>5. Prohibited Conduct</h2>
                <p>You agree not to engage in any of the following activities:</p>
                <ul className="bp-tos-list">
                  <li>
                    <ShieldCheck size={17} color={accentColor} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>Violating any applicable laws, regulations, or third-party intellectual property rights.</span>
                  </li>
                  <li>
                    <ShieldCheck size={17} color={accentColor} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>Distributing malware, viruses, or harmful code across workspaces or marketplace listings.</span>
                  </li>
                  <li>
                    <ShieldCheck size={17} color={accentColor} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>Attempting to bypass platform escrow, identity verification, or security boundaries.</span>
                  </li>
                  <li>
                    <ShieldCheck size={17} color={accentColor} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>Interfering with or disrupting the Service or other users' collaborative projects.</span>
                  </li>
                </ul>
              </section>

              <section id="payment" className="bp-tos-section">
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
                  CLAUSE 06 // CREDITS, CONTRACTS & ESCROW
                </div>
                <h2>6. Payment, Escrow, and Milestone Policy</h2>
                <p>
                  Certain features require payment using platform credits. Ensemble Credits purchased on the Platform have no direct cash value and cannot be exchanged for fiat currency outside of official cashout procedures.
                </p>
                <ul className="bp-tos-list">
                  <li>
                    <ShieldCheck size={17} color={accentColor} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>
                      <strong>Escrow Protection:</strong> When a contract is established (via approved Job Proposal or accepted Service Order on Gigs / Services), milestone funds are deposited into an independent platform escrow wallet. Escrow funds are only released to the Freelancer upon milestone approval or automatic passage.
                    </span>
                  </li>
                  <li>
                    <ShieldCheck size={17} color={accentColor} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>
                      <strong>Review Window &amp; Auto-Approval:</strong> Clients have 5 calendar days for Job Contracts (3 days for Gig Contracts) to review submitted deliverables. If no review, revision request, or dispute is submitted within this window, the milestone is automatically approved and escrow credits are released to the Freelancer.
                    </span>
                  </li>
                  <li>
                    <ShieldCheck size={17} color={accentColor} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>
                      <strong>Overdue Deliverables &amp; Cancellation:</strong> Freelancers are required to submit milestone deliverables before the agreed deadline. If a milestone becomes overdue without submission, the Client may grant a deadline extension or cancel the milestone to receive an immediate 100% credit refund.
                    </span>
                  </li>
                  <li>
                    <ShieldCheck size={17} color={accentColor} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>
                      <strong>Mutual Contract Cancellation:</strong> Either the Client or the Freelancer may initiate a formal Mutual Cancellation Request for an active contract. The counterparty has seventy-two (72) hours to accept or decline. If no response is received within 72 hours, the cancellation is automatically approved by the platform. Upon cancellation, all credits held in escrow for unapproved or unfinished milestones are refunded in full to the Client's account wallet, while earnings for previously completed and approved milestones remain with the Freelancer. If a request is declined, either party may escalate the contract to Dispute Resolution.
                    </span>
                  </li>
                </ul>
              </section>

              <section id="termination" className="bp-tos-section">
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
                  CLAUSE 07 // ACCOUNT ENFORCEMENT
                </div>
                <h2>7. Termination</h2>
                <p>
                  We reserve the right to restrict, suspend, lock, or terminate your account in accordance with our Platform Merit and Moderation policies for conduct that violates these Terms of Service or is harmful to other users of the Platform.
                </p>
              </section>

              <section id="warranties" className="bp-tos-section">
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
                  CLAUSE 08 // WARRANTY DISCLAIMER
                </div>
                <h2>8. Disclaimer of Warranties</h2>
                <p>
                  THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED OR ERROR-FREE.
                </p>
              </section>

              <section id="liability" className="bp-tos-section">
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
                  CLAUSE 09 // LIABILITY CAP
                </div>
                <h2>9. Limitation of Liability</h2>
                <p>
                  IN NO EVENT SHALL ENSEMBLE BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
                </p>
              </section>

              <section id="changes" className="bp-tos-section">
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
                  CLAUSE 10 // REVISIONS
                </div>
                <h2>10. Changes to Terms</h2>
                <p>
                  We may modify these Terms at any time. We will notify you of any changes by posting the updated Terms on this page. Your continued use of the Platform after any such changes constitutes your acceptance of the new Terms.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageTermsOfService;
