import useGlobalState from "@/lib/global_state";
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  Send,
  CheckSquare,
  FileText,
  ShieldCheck,
  PlusCircle,
  Inbox,
  Layers,
  ArrowRight,
  UserCheck,
} from "lucide-react";

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

const PageHowToHire: React.FC = () => {
  const theme = useGlobalState((state) => state.theme);
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"jobs" | "gigs">("jobs");

  const minimalHoverAudioRef = useRef<HTMLAudioElement | null>(null);
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    minimalHoverAudioRef.current = new Audio("/sounds/minimalhover.mp3");
    minimalHoverAudioRef.current.volume = 0.25;
    clickAudioRef.current = new Audio("/sounds/softclick.mp3");
    clickAudioRef.current.volume = 0.4;
  }, []);

  const playMinimalHover = () => {
    if (!minimalHoverAudioRef.current) return;
    minimalHoverAudioRef.current.currentTime = 0;
    minimalHoverAudioRef.current.play().catch(() => {});
  };

  const playClick = () => {
    if (!clickAudioRef.current) return;
    clickAudioRef.current.currentTime = 0;
    clickAudioRef.current.play().catch(() => {});
  };

  const handleBack = () => {
    playClick();
    navigate("/");
  };

  const handleTab = (tab: "jobs" | "gigs") => {
    playClick();
    setActiveTab(tab);
  };

  const JOBS_STEPS = [
    {
      num: "01",
      tag: "JOB POSTING",
      icon: <PlusCircle size={20} />,
      title: "Post a Job on the Platform",
      desc: "Publish your production job post detailing the editing style, deliverables, timeline, and budget—open to individual Freelancers or multi-member Teams.",
    },
    {
      num: "02",
      tag: "PROPOSAL INBOX",
      icon: <Inbox size={20} />,
      title: "Freelancers Submit Their Proposals",
      desc: "Receive tailored solo or team proposals with portfolio reels, proposed milestone breakdowns, and turnaround commitments directly in your workspace.",
    },
    {
      num: "03",
      tag: "SHORTLIST & APPROVE",
      icon: <Layers size={20} />,
      title: "Shortlist & Approve an Individual or Team Proposal",
      desc: "Compare candidates, chat or hop on an embedded video call to align on expectations, and shortlist and approve the individual or team proposal that fits best.",
    },
    {
      num: "04",
      tag: "CONTRACT OFFER",
      icon: <FileText size={20} />,
      title: "Offer Them a Contract to Hire Them",
      desc: "Once the proposal is approved, send an official platform Contract Offer locking in scope, milestone deliverables, deadlines, and escrow payout amounts.",
    },
    {
      num: "05",
      tag: "ESCROW & MILESTONES",
      icon: <ShieldCheck size={20} />,
      title: "Fund Escrow & Track Live Progress",
      desc: "Deposit milestone credits into secure platform escrow. Review watermarked cuts on the live progress tracker and release funds only when you approve each milestone.",
    },
  ];

  const GIGS_STEPS = [
    {
      num: "01",
      tag: "DISCOVERY & SERVICES",
      icon: <Search size={20} />,
      title: "Find a Freelancer on Discovery or Gigs / Services",
      desc: "Explore the Discovery page or Gigs / Services catalog to view Freelancer portfolios, service packages, pricing tiers, and turnaround times.",
    },
    {
      num: "02",
      tag: "SERVICE ORDER",
      icon: <Send size={20} />,
      title: "Select a Matching Service & Order a Service",
      desc: "Choose the service that matches your kind of work and place a Service Order with your project brief, reference links, and target schedule.",
    },
    {
      num: "03",
      tag: "FREELANCER ACCEPTANCE",
      icon: <CheckSquare size={20} />,
      title: "Freelancer Accepts Your Service Order",
      desc: "The Freelancer reviews your brief, aligns with you via integrated chat or video call if needed, and formally accepts your service order.",
    },
    {
      num: "04",
      tag: "OFFER CONTRACT",
      icon: <FileText size={20} />,
      title: "Offer the Contract & They Are Hired",
      desc: "Once the Freelancer accepts your order, you offer the official platform contract—as soon as it is signed, the Freelancer is officially hired.",
    },
    {
      num: "05",
      tag: "ESCROW & DELIVERY",
      icon: <ShieldCheck size={20} />,
      title: "Lock Escrow Credits & Approve Deliverables",
      desc: "Milestone funds stay protected in escrow while you monitor completion on the live dashboard and release payout upon final approval.",
    },
  ];

  const activeSteps = activeTab === "jobs" ? JOBS_STEPS : GIGS_STEPS;
  const accentColor = "#3b82f6";

  const pageBg = isDark ? "#121214" : "#ffffff";
  const cellHoverBg = isDark ? "#18181b" : "#f8fafc";
  const borderLine = isDark ? "rgba(255, 255, 255, 0.14)" : "rgba(0, 0, 0, 0.14)";
  const textPrimary = isDark ? "#ffffff" : "#09090b";
  const textSecondary = isDark ? "#d4d4d8" : "#27272a";
  const textMeta = isDark ? "#a1a1aa" : "#52525b";
  const crosshairColor = isDark ? "rgba(255, 255, 255, 0.45)" : "rgba(0, 0, 0, 0.45)";

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
        .bp-hire-shell {
          max-width: 1320px;
          margin: 0 auto;
          padding: 0 24px;
        }
        .bp-hire-frame {
          position: relative;
          border: 1px solid ${borderLine};
          background: ${pageBg};
        }
        .bp-hire-switcher {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          border-bottom: 1px solid ${borderLine};
        }
        .bp-hire-tab {
          appearance: none;
          border: none;
          border-right: 1px solid ${borderLine};
          background: transparent;
          padding: 18px 24px;
          text-align: left;
          cursor: pointer;
          transition: background 0.18s ease;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .bp-hire-tab:last-child {
          border-right: none;
        }
        .bp-hire-tab:hover {
          background: ${cellHoverBg};
        }
        .bp-hire-step-row {
          display: grid;
          grid-template-columns: 200px 1fr;
          border-bottom: 1px solid ${borderLine};
          background: ${pageBg};
          transition: background 0.2s ease;
        }
        .bp-hire-step-row:hover {
          background: ${cellHoverBg};
        }
        .bp-hire-step-meta {
          padding: 24px;
          border-right: 1px solid ${borderLine};
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .bp-hire-step-body {
          padding: 24px 28px;
          display: flex;
          align-items: flex-start;
          gap: 18px;
        }
        @media (max-width: 768px) {
          .bp-hire-switcher {
            grid-template-columns: 1fr;
          }
          .bp-hire-tab {
            border-right: none !important;
            border-bottom: 1px solid ${borderLine};
          }
          .bp-hire-tab:last-child {
            border-bottom: none;
          }
          .bp-hire-step-row {
            grid-template-columns: 1fr;
          }
          .bp-hire-step-meta {
            border-right: none;
            border-bottom: 1px solid ${borderLine};
            padding: 14px 20px;
            flex-direction: row;
            align-items: center;
          }
        }
      `}</style>

      <div className="bp-hire-shell">
        <div className="bp-hire-frame">
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
              onClick={handleBack}
              onMouseEnter={playMinimalHover}
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
              CLIENT GUIDE // 2 WAYS TO HIRE A FREELANCER
            </span>

            <button
              onClick={() => {
                playClick();
                navigate("/landing/HowToWork");
              }}
              onMouseEnter={playMinimalHover}
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
              HOW TO WORK <ArrowRight size={13} />
            </button>
          </div>

          {/* Hero Title Block */}
          <div
            style={{
              padding: "clamp(32px, 5vw, 52px) clamp(24px, 4vw, 48px)",
              borderBottom: `1px solid ${borderLine}`,
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 12px",
                border: `1px solid ${accentColor}`,
                color: accentColor,
                fontFamily: T.fontMono,
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              CLIENT & FREELANCERS • HIRING WORKFLOW
            </div>

            <h1
              style={{
                fontFamily: T.fontDisplay,
                fontSize: "clamp(30px, 4.4vw, 48px)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
                color: textPrimary,
                marginBottom: 14,
              }}
            >
              How to Hire a Freelancer on Ensemble.
            </h1>

            <p
              style={{
                fontFamily: T.fontDisplay,
                fontSize: "clamp(15px, 1.4vw, 17.5px)",
                lineHeight: 1.65,
                fontWeight: 500,
                color: textSecondary,
                maxWidth: 860,
                margin: 0,
              }}
            >
              Every Ensemble account can act as both a Client and a Freelancer. You can hire a Freelancer in{" "}
              <strong style={{ color: textPrimary, fontWeight: 700 }}>2 ways</strong>: post a job and approve an individual or team proposal, or order a service from the Discovery page / Gigs & Services and offer a contract.
            </p>
          </div>

          {/* Prerequisite KYC Callout Strip */}
          <div
            style={{
              padding: "20px clamp(24px, 4vw, 48px)",
              borderBottom: `1px solid ${borderLine}`,
              borderLeft: `4px solid ${accentColor}`,
              background: isDark ? "#151518" : "#f8fafc",
              display: "flex",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                border: `1px solid ${borderLine}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: accentColor,
                flexShrink: 0,
              }}
            >
              <UserCheck size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div
                style={{
                  fontFamily: T.fontMono,
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  color: accentColor,
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                STEP 00 // MANDATORY PREREQUISITE BEFORE TRANSACTIONS
              </div>
              <p
                style={{
                  fontFamily: T.fontDisplay,
                  fontSize: 14,
                  lineHeight: 1.55,
                  fontWeight: 500,
                  color: textPrimary,
                  margin: 0,
                }}
              >
                Before posting jobs, ordering services, offering contracts, or funding escrow, complete your one-time{" "}
                <strong>Identity Verification (KYC)</strong> from your account settings.
              </p>
            </div>
          </div>

          {/* 2-Way Hiring Switcher */}
          <div className="bp-hire-switcher">
            <button
              className="bp-hire-tab"
              onClick={() => handleTab("jobs")}
              onMouseEnter={playMinimalHover}
              style={{
                background:
                  activeTab === "jobs"
                    ? isDark
                      ? "rgba(59, 130, 246, 0.08)"
                      : "rgba(59, 130, 246, 0.05)"
                    : undefined,
                borderBottom: activeTab === "jobs" ? `2px solid ${accentColor}` : undefined,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: T.fontMono,
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    color: activeTab === "jobs" ? accentColor : textMeta,
                    marginBottom: 4,
                  }}
                >
                  WAY 01 // JOB POST & PROPOSALS
                </div>
                <div
                  style={{
                    fontFamily: T.fontDisplay,
                    fontSize: 16,
                    fontWeight: 800,
                    color: activeTab === "jobs" ? textPrimary : textSecondary,
                  }}
                >
                  Post a Job → Approve Solo/Team Proposal → Offer Contract
                </div>
              </div>
              <span
                style={{
                  fontFamily: T.fontMono,
                  fontSize: 10.5,
                  fontWeight: 700,
                  padding: "4px 8px",
                  border: `1px solid ${activeTab === "jobs" ? accentColor : borderLine}`,
                  color: activeTab === "jobs" ? accentColor : textMeta,
                }}
              >
                5 STEPS
              </span>
            </button>

            <button
              className="bp-hire-tab"
              onClick={() => handleTab("gigs")}
              onMouseEnter={playMinimalHover}
              style={{
                background:
                  activeTab === "gigs"
                    ? isDark
                      ? "rgba(59, 130, 246, 0.08)"
                      : "rgba(59, 130, 246, 0.05)"
                    : undefined,
                borderBottom: activeTab === "gigs" ? `2px solid ${accentColor}` : undefined,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: T.fontMono,
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    color: activeTab === "gigs" ? accentColor : textMeta,
                    marginBottom: 4,
                  }}
                >
                  WAY 02 // DISCOVERY & GIGS / SERVICES
                </div>
                <div
                  style={{
                    fontFamily: T.fontDisplay,
                    fontSize: 16,
                    fontWeight: 800,
                    color: activeTab === "gigs" ? textPrimary : textSecondary,
                  }}
                >
                  Find on Discovery / Gigs → Order Service → Offer Contract
                </div>
              </div>
              <span
                style={{
                  fontFamily: T.fontMono,
                  fontSize: 10.5,
                  fontWeight: 700,
                  padding: "4px 8px",
                  border: `1px solid ${activeTab === "gigs" ? accentColor : borderLine}`,
                  color: activeTab === "gigs" ? accentColor : textMeta,
                }}
              >
                5 STEPS
              </span>
            </button>
          </div>

          {/* Step Rows */}
          <div>
            {activeSteps.map((step) => (
              <div
                key={step.num}
                className="bp-hire-step-row"
                onMouseEnter={playMinimalHover}
              >
                <div className="bp-hire-step-meta">
                  <span
                    style={{
                      fontFamily: T.fontMono,
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: "0.14em",
                      color: accentColor,
                    }}
                  >
                    {step.tag}
                  </span>
                  <span
                    style={{
                      fontFamily: T.fontMono,
                      fontSize: 24,
                      fontWeight: 800,
                      color: textPrimary,
                      lineHeight: 1,
                    }}
                  >
                    {step.num}
                  </span>
                </div>

                <div className="bp-hire-step-body">
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      border: `1px solid ${borderLine}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: accentColor,
                      flexShrink: 0,
                    }}
                  >
                    {step.icon}
                  </div>
                  <div>
                    <h3
                      style={{
                        fontFamily: T.fontDisplay,
                        fontSize: 18.5,
                        fontWeight: 800,
                        letterSpacing: "-0.02em",
                        color: textPrimary,
                        marginBottom: 6,
                      }}
                    >
                      {step.title}
                    </h3>
                    <p
                      style={{
                        fontFamily: T.fontDisplay,
                        fontSize: 14.5,
                        lineHeight: 1.65,
                        fontWeight: 500,
                        color: textSecondary,
                        margin: 0,
                      }}
                    >
                      {step.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom CTA Bar */}
          <div
            style={{
              padding: "28px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 16,
              background: isDark ? "#151518" : "#f8fafc",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: T.fontDisplay,
                  fontSize: 18,
                  fontWeight: 800,
                  color: textPrimary,
                  marginBottom: 4,
                }}
              >
                Ready to Hire Your Next Freelancer or Production Team?
              </div>
              <div
                style={{
                  fontFamily: T.fontDisplay,
                  fontSize: 14,
                  color: textSecondary,
                }}
              >
                Create your unified Ensemble account, verify KYC once, and start hiring with full escrow protection.
              </div>
            </div>

            <button
              onClick={() => {
                playClick();
                navigate("/signup");
              }}
              onMouseEnter={playMinimalHover}
              style={{
                background: accentColor,
                color: "#ffffff",
                border: "none",
                padding: "12px 24px",
                fontFamily: T.fontMono,
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              CREATE ACCOUNT & HIRE <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageHowToHire;
