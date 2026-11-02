import useGlobalState from "@/lib/global_state";
import React, { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ArrowLeft, ArrowRight, HelpCircle, MessageSquare } from "lucide-react";

const T = {
  fontDisplay: "'Plus Jakarta Sans', sans-serif",
  fontMono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
} as const;

interface FaqItem {
  code: string;
  category: string;
  q: string;
  a: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    code: "FAQ-01",
    category: "UNIFIED ACCOUNT & KYC",
    q: "Can a single account be used as both a Client and a Freelancer?",
    a: "Yes. Every Ensemble account is unified—you can switch seamlessly between hiring talent as a Client, selling services or submitting job proposals as a Freelancer, and uploading media as an Asset Creator. Before engaging in any financial or contractual transactions, you simply complete a one-time Identity Verification (KYC).",
  },
  {
    code: "FAQ-02",
    category: "HIRING WORKFLOW",
    q: "What are the 2 ways a Client can hire a Freelancer on Ensemble?",
    a: "You can hire a Freelancer in two ways: (1) Post a Job on the platform—Freelancers submit their individual or team proposals, and you shortlist and approve one, then offer them a contract to hire them; or (2) Browse the Discovery page or Gigs / Services to find a service that matches your work and order a service—once the Freelancer accepts your order, you offer the contract and they are hired.",
  },
  {
    code: "FAQ-03",
    category: "JOB POSTINGS",
    q: "Is it free to post a job or browse Discovery / Gigs & Services?",
    a: "Yes. Posting jobs and browsing Freelancer portfolios on Discovery or Gigs / Services is completely free. You only deposit credits into escrow when you offer and fund a contract.",
  },
  {
    code: "FAQ-04",
    category: "ESCROW PROTECTION",
    q: "How does the contract escrow system protect both Clients and Freelancers?",
    a: "When a contract is established, milestone credits are locked in an independent platform escrow hold. Clients know funds are never released until deliverables are reviewed and approved, and Freelancers can edit with confidence knowing the budget is already secured upfront.",
  },
  {
    code: "FAQ-05",
    category: "MILESTONE WINDOWS",
    q: "What happens if a Client does not respond to a submitted milestone?",
    a: "Clients have 5 calendar days for Job Contracts (3 days for Gig Contracts) to review submitted deliverables. If no approval, revision request, or dispute is opened within that window, the platform automatically approves the milestone and releases the escrow credits to the Freelancer.",
  },
  {
    code: "FAQ-06",
    category: "OVERDUE DELIVERABLES",
    q: "What happens if a Freelancer misses a milestone deadline?",
    a: "If a deadline passes without a submission, the milestone enters Overdue status and both parties are notified. The Client can either grant a deadline extension or cancel the overdue milestone to receive an immediate 100% credit refund to their wallet.",
  },
  {
    code: "FAQ-07",
    category: "ASSET MARKETPLACE",
    q: "What digital items can I buy or sell on the Asset Marketplace / Asset Library?",
    a: "Creators can buy and sell Template Videos, multi-asset Bundles, Images, Videos, and Audios on the Asset Marketplace. Purchased items are added directly to your Asset Library so you can import them into your browser video editor timeline in one click.",
  },
  {
    code: "FAQ-08",
    category: "BROWSER STUDIO & AI",
    q: "How do real-time collaboration, AI Auto Captioning, and Auto Dead-Air Cleanup work?",
    a: "Ensemble's web video editor syncs timeline edits across team members in real time, includes integrated chat and embedded video calls, lets you search spoken dialogue across clips with AI Auto Captioning, and removes silent pauses in a single click with Auto Dead-Air Cleanup.",
  },
  {
    code: "FAQ-09",
    category: "DATA & SECURITY",
    q: "Are my raw video files secure, and does AI train on my private footage?",
    a: "All project media is isolated inside encrypted cloud storage. Ensemble processes your audio and video strictly to power your workspace features—we never use your private footage to train public AI models.",
  },
  {
    code: "FAQ-10",
    category: "WALLET & CASHOUTS",
    q: "How do payouts work for completed contracts and Asset Marketplace sales?",
    a: "Approved contract milestones and Asset Marketplace downloads credit your Ensemble wallet balance immediately. Verified users can withdraw earned credits through supported cashout channels at any time.",
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

const PageFAQ: React.FC = () => {
  const theme = useGlobalState((state) => state.theme);
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const [openIdx, setOpenIdx] = useState<number | null>(0);

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
        .bp-faq-shell {
          max-width: 1320px;
          margin: 0 auto;
          padding: 0 24px;
        }
        .bp-faq-frame {
          position: relative;
          border: 1px solid ${borderLine};
          background: ${pageBg};
        }
        .bp-faq-layout {
          display: grid;
          grid-template-columns: 320px 1fr;
        }
        .bp-faq-sidebar {
          border-right: 1px solid ${borderLine};
          background: ${isDark ? "#151518" : "#f8fafc"};
          padding: 28px 24px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 24px;
        }
        .bp-faq-item {
          border-bottom: 1px solid ${borderLine};
          background: ${pageBg};
          transition: background 0.18s ease;
        }
        .bp-faq-item:last-child {
          border-bottom: none;
        }
        .bp-faq-item:hover {
          background: ${cellHoverBg};
        }
        .bp-faq-item.is-open {
          background: ${isDark ? "#16171b" : "#f8fafc"};
        }
        .bp-faq-trigger {
          width: 100%;
          appearance: none;
          background: transparent;
          border: none;
          padding: 22px 28px;
          text-align: left;
          cursor: pointer;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }
        .bp-faq-answer {
          padding: 0 28px 24px 28px;
          border-top: 1px dashed ${borderLine};
          padding-top: 16px;
          font-family: ${T.fontDisplay};
          font-size: 15px;
          font-weight: 500;
          line-height: 1.7;
          color: ${textSecondary};
        }
        @media (max-width: 960px) {
          .bp-faq-layout {
            grid-template-columns: 1fr;
          }
          .bp-faq-sidebar {
            border-right: none;
            border-bottom: 1px solid ${borderLine};
            padding: 22px 20px;
          }
          .bp-faq-trigger {
            padding: 18px 20px;
          }
          .bp-faq-answer {
            padding: 14px 20px 20px 20px;
          }
        }
        @media (max-width: 640px) {
          .bp-faq-shell {
            padding: 0 14px;
          }
        }
      `}</style>

      <div className="bp-faq-shell">
        <div className="bp-faq-frame">
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
              SUPPORT // FREQUENTLY ASKED QUESTIONS
            </span>

            <button
              onClick={() => {
                playSoftClick();
                navigate("/landing/AskOurChatbot");
              }}
              onMouseEnter={playHover}
              style={{
                background: accentColor,
                border: "none",
                color: "#ffffff",
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
              ASK ENSEMBLE AI <ArrowRight size={13} />
            </button>
          </div>

          {/* Hero Title Block */}
          <div
            style={{
              padding: "clamp(28px, 5vw, 48px) clamp(20px, 4vw, 48px)",
              borderBottom: `1px solid ${borderLine}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div
                style={{
                  width: 54,
                  height: 54,
                  border: `1px solid ${accentColor}`,
                  background: isDark ? "rgba(59, 130, 246, 0.08)" : "rgba(59, 130, 246, 0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: accentColor,
                  flexShrink: 0,
                }}
              >
                <HelpCircle size={26} />
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
                  KNOWLEDGE BASE // 10 CORE ANSWERS
                </div>
                <h1
                  style={{
                    fontFamily: T.fontDisplay,
                    fontSize: "clamp(26px, 4vw, 44px)",
                    fontWeight: 800,
                    letterSpacing: "-0.03em",
                    lineHeight: 1.1,
                    color: textPrimary,
                    margin: 0,
                  }}
                >
                  Frequently Asked Questions
                </h1>
              </div>
            </div>

            <p
              style={{
                fontFamily: T.fontDisplay,
                fontSize: 15,
                lineHeight: 1.6,
                fontWeight: 500,
                color: textSecondary,
                maxWidth: 440,
                margin: 0,
              }}
            >
              Everything you need to know about unified Client &amp; Freelancer accounts, KYC verification, 2-way hiring, escrow contracts, and the Asset Marketplace.
            </p>
          </div>

          {/* 2-Column Blueprint Body */}
          <div className="bp-faq-layout">
            {/* Left Info Rail */}
            <aside className="bp-faq-sidebar">
              <div>
                <div
                  style={{
                    fontFamily: T.fontMono,
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: accentColor,
                    marginBottom: 10,
                  }}
                >
                  QUICK GUIDES
                </div>
                <h3
                  style={{
                    fontFamily: T.fontDisplay,
                    fontSize: 18,
                    fontWeight: 800,
                    color: textPrimary,
                    marginBottom: 8,
                  }}
                >
                  Explore Platform Workflows
                </h3>
                <p
                  style={{
                    fontFamily: T.fontDisplay,
                    fontSize: 13.5,
                    lineHeight: 1.6,
                    fontWeight: 500,
                    color: textSecondary,
                    marginBottom: 18,
                  }}
                >
                  Need step-by-step instructions on hiring editors, accepting service orders, or selling assets?
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { label: "How to Hire Guide", path: "/landing/HowToHire" },
                    { label: "How to Work Guide", path: "/landing/HowToWork" },
                    { label: "Client & Freelancers Use Case", path: "/landing/usecase/client" },
                    { label: "Asset Creators Use Case", path: "/landing/usecase/asset-creator" },
                  ].map((item) => (
                    <button
                      key={item.path}
                      onClick={() => {
                        playSoftClick();
                        navigate(item.path);
                      }}
                      onMouseEnter={playHover}
                      style={{
                        background: pageBg,
                        border: `1px solid ${borderLine}`,
                        padding: "10px 14px",
                        fontFamily: T.fontMono,
                        fontSize: 11,
                        fontWeight: 700,
                        color: textPrimary,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        textAlign: "left",
                      }}
                    >
                      <span>{item.label}</span>
                      <ArrowRight size={13} color={accentColor} />
                    </button>
                  ))}
                </div>
              </div>

              <div
                style={{
                  border: `1px solid ${borderLine}`,
                  background: pageBg,
                  padding: "18px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontFamily: T.fontMono,
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: accentColor,
                    marginBottom: 6,
                  }}
                >
                  <MessageSquare size={14} /> STILL HAVE QUESTIONS?
                </div>
                <p
                  style={{
                    fontFamily: T.fontDisplay,
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: textSecondary,
                    marginBottom: 12,
                  }}
                >
                  Ask our AI assistant or submit a support ticket for direct help from our team.
                </p>
                <button
                  onClick={() => {
                    playSoftClick();
                    navigate("/landing/AskOurChatbot");
                  }}
                  onMouseEnter={playHover}
                  style={{
                    width: "100%",
                    background: accentColor,
                    color: "#ffffff",
                    border: "none",
                    padding: "10px 14px",
                    fontFamily: T.fontMono,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  OPEN AI ASSISTANT →
                </button>
              </div>
            </aside>

            {/* Right Accordion Feed */}
            <div>
              {FAQ_ITEMS.map((item, idx) => {
                const isOpen = openIdx === idx;
                return (
                  <div
                    key={item.code}
                    className={`bp-faq-item ${isOpen ? "is-open" : ""}`}
                  >
                    <button
                      className="bp-faq-trigger"
                      onClick={() => {
                        playSoftClick();
                        setOpenIdx(isOpen ? null : idx);
                      }}
                      onMouseEnter={playHover}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            marginBottom: 6,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: T.fontMono,
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: "0.14em",
                              color: accentColor,
                            }}
                          >
                            {item.code}
                          </span>
                          <span
                            style={{
                              fontFamily: T.fontMono,
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: "0.12em",
                              color: textMeta,
                            }}
                          >
                            // {item.category}
                          </span>
                        </div>
                        <div
                          style={{
                            fontFamily: T.fontDisplay,
                            fontSize: "clamp(16px, 1.8vw, 18px)",
                            fontWeight: 800,
                            letterSpacing: "-0.015em",
                            color: textPrimary,
                            lineHeight: 1.35,
                          }}
                        >
                          {item.q}
                        </div>
                      </div>

                      <div
                        style={{
                          width: 32,
                          height: 32,
                          border: `1px solid ${isOpen ? accentColor : borderLine}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: isOpen ? accentColor : textMeta,
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        <ChevronDown
                          size={16}
                          style={{
                            transform: isOpen ? "rotate(180deg)" : "none",
                            transition: "transform 0.22s ease",
                          }}
                        />
                      </div>
                    </button>

                    {isOpen && <div className="bp-faq-answer">{item.a}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageFAQ;
