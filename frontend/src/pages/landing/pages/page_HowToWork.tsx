import useGlobalState from "@/lib/global_state";
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  PlusCircle,
  Inbox,
  Layers,
  FileText,
  ShieldCheck,
  Search,
  Send,
  Upload,
  Coins,
  FileCheck,
  Wallet,
  ArrowRight,
  UserCheck,
} from "lucide-react";

type WorkTrack = "gigs" | "jobs" | "assets";

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

const PageHowToWork: React.FC = () => {
  const theme = useGlobalState((state) => state.theme);
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<WorkTrack>("gigs");

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

  const handleTab = (tab: WorkTrack) => {
    playClick();
    setActiveTab(tab);
  };

  const GIGS_STEPS = [
    {
      num: "01",
      tag: "PUBLISH SERVICE",
      icon: <PlusCircle size={20} />,
      title: "List Your Gigs / Services on Discovery",
      desc: "Package your editing, color grading, VFX, or audio skills into clear service listings with fixed pricing, delivery turnarounds, and portfolio samples.",
    },
    {
      num: "02",
      tag: "INCOMING ORDER",
      icon: <Inbox size={20} />,
      title: "Receive Service Orders from Clients",
      desc: "Clients browsing the Discovery page or Gigs / Services select your listing that matches their work and submit a Service Order.",
    },
    {
      num: "03",
      tag: "ACCEPT ORDER",
      icon: <Layers size={20} />,
      title: "Review Brief & Accept the Service Order",
      desc: "Inspect the Client's requirements, align via integrated chat or embedded video call if needed, and accept their Service Order.",
    },
    {
      num: "04",
      tag: "CONTRACT OFFER",
      icon: <FileText size={20} />,
      title: "Client Offers the Contract & You Are Hired",
      desc: "Once you accept the order, the Client offers the official platform contract. Sign the contract to lock in milestones and get hired.",
    },
    {
      num: "05",
      tag: "ESCROW PAYOUT",
      icon: <ShieldCheck size={20} />,
      title: "Deliver Milestones & Receive Protected Payouts",
      desc: "Submit deliverables on the live progress dashboard. As soon as the Client approves each milestone, escrow credits release to your wallet.",
    },
  ];

  const JOBS_STEPS = [
    {
      num: "01",
      tag: "BROWSE JOBS",
      icon: <Search size={20} />,
      title: "Find a Client Job Post on the Platform",
      desc: "Explore open job posts from Clients looking for video editors, colorists, VFX artists, sound designers, or full production teams.",
    },
    {
      num: "02",
      tag: "SUBMIT PROPOSAL",
      icon: <Send size={20} />,
      title: "Submit an Individual or Team Proposal",
      desc: "Send a tailored solo or multi-member team proposal highlighting your showreel, proposed milestone breakdown, and delivery timeline.",
    },
    {
      num: "03",
      tag: "SHORTLIST & APPROVAL",
      icon: <Layers size={20} />,
      title: "Get Shortlisted & Approved by the Client",
      desc: "Discuss project details via integrated chat and video call while the Client reviews, shortlists, and approves your proposal.",
    },
    {
      num: "04",
      tag: "OFFERED CONTRACT",
      icon: <FileText size={20} />,
      title: "Receive & Sign the Offered Contract",
      desc: "After approving your individual or team proposal, the Client offers you a formal contract—accept it to begin production under escrow.",
    },
    {
      num: "05",
      tag: "ESCROW RELEASE",
      icon: <ShieldCheck size={20} />,
      title: "Complete Milestones & Withdraw Earnings",
      desc: "Track tasks on the live visual dashboard, submit watermarked review cuts, and receive guaranteed escrow credit payouts upon approval.",
    },
  ];

  const ASSETS_STEPS = [
    {
      num: "01",
      tag: "UPLOAD MEDIA",
      icon: <Upload size={20} />,
      title: "Upload Template Videos, Bundles, Images, Videos or Audios",
      desc: "Package single production assets or multi-item Bundles—including Template Videos, Images, Videos, and Audios—for the Asset Marketplace / Asset Library.",
    },
    {
      num: "02",
      tag: "PRICING & LICENSING",
      icon: <Coins size={20} />,
      title: "Set Credit Pricing & Licensing Terms",
      desc: "Configure your credit price, attach interactive video/audio previews, and add searchable category tags for discovery.",
    },
    {
      num: "03",
      tag: "MARKETPLACE & LIBRARY",
      icon: <FileCheck size={20} />,
      title: "Publish to the Asset Marketplace / Asset Library",
      desc: "Once published, creators across Ensemble can license your assets and import them directly into their Asset Library and browser editor timelines.",
    },
    {
      num: "04",
      tag: "PASSIVE REVENUE",
      icon: <Wallet size={20} />,
      title: "Earn Passive Credits on Every Download",
      desc: "Receive automated credit payouts straight into your account wallet every time a user purchases your Template Videos, Bundles, Images, Videos, or Audios.",
    },
  ];

  const getTrackDetails = () => {
    switch (activeTab) {
      case "jobs":
        return { steps: JOBS_STEPS, accent: "#a855f7", label: "JOB PROPOSALS" };
      case "assets":
        return { steps: ASSETS_STEPS, accent: "#10b981", label: "ASSET MARKETPLACE" };
      case "gigs":
      default:
        return { steps: GIGS_STEPS, accent: "#2dd4bf", label: "GIGS & SERVICES" };
    }
  };

  const { steps, accent, label } = getTrackDetails();

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
        .bp-work-shell {
          max-width: 1320px;
          margin: 0 auto;
          padding: 0 24px;
        }
        .bp-work-frame {
          position: relative;
          border: 1px solid ${borderLine};
          background: ${pageBg};
        }
        .bp-work-switcher {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          border-bottom: 1px solid ${borderLine};
        }
        .bp-work-tab {
          appearance: none;
          border: none;
          border-right: 1px solid ${borderLine};
          background: transparent;
          padding: 18px 22px;
          text-align: left;
          cursor: pointer;
          transition: background 0.18s ease;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .bp-work-tab:last-child {
          border-right: none;
        }
        .bp-work-tab:hover {
          background: ${cellHoverBg};
        }
        .bp-work-step-row {
          display: grid;
          grid-template-columns: 200px 1fr;
          border-bottom: 1px solid ${borderLine};
          background: ${pageBg};
          transition: background 0.2s ease;
        }
        .bp-work-step-row:hover {
          background: ${cellHoverBg};
        }
        .bp-work-step-meta {
          padding: 24px;
          border-right: 1px solid ${borderLine};
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .bp-work-step-body {
          padding: 24px 28px;
          display: flex;
          align-items: flex-start;
          gap: 18px;
        }
        @media (max-width: 900px) {
          .bp-work-switcher {
            grid-template-columns: 1fr;
          }
          .bp-work-tab {
            border-right: none !important;
            border-bottom: 1px solid ${borderLine};
          }
          .bp-work-tab:last-child {
            border-bottom: none;
          }
          .bp-work-step-row {
            grid-template-columns: 1fr;
          }
          .bp-work-step-meta {
            border-right: none;
            border-bottom: 1px solid ${borderLine};
            padding: 14px 20px;
            flex-direction: row;
            align-items: center;
          }
        }
      `}</style>

      <div className="bp-work-shell">
        <div className="bp-work-frame">
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
              FREELANCER & CREATOR GUIDE // {label}
            </span>

            <button
              onClick={() => {
                playClick();
                navigate("/landing/HowToHire");
              }}
              onMouseEnter={playMinimalHover}
              style={{
                background: "transparent",
                border: `1px solid ${borderLine}`,
                color: accent,
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
              HOW TO HIRE <ArrowRight size={13} />
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
                border: `1px solid ${accent}`,
                color: accent,
                fontFamily: T.fontMono,
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              FREELANCERS & ASSET CREATORS • MONETIZATION WORKFLOW
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
              How to Work & Monetize on Ensemble.
            </h1>

            <p
              style={{
                fontFamily: T.fontDisplay,
                fontSize: "clamp(15px, 1.4vw, 17.5px)",
                lineHeight: 1.65,
                fontWeight: 500,
                color: textSecondary,
                maxWidth: 880,
                margin: 0,
              }}
            >
              Monetize your Editing, Color & VFX skills by accepting service orders on Discovery / Gigs & Services, submitting solo or team proposals on Client Job Posts, or selling Template Videos, Bundles, Images, Videos, and Audios on the Asset Marketplace / Asset Library.
            </p>
          </div>

          {/* Prerequisite KYC Callout Strip */}
          <div
            style={{
              padding: "20px clamp(24px, 4vw, 48px)",
              borderBottom: `1px solid ${borderLine}`,
              borderLeft: `4px solid ${accent}`,
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
                color: accent,
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
                  color: accent,
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
                Complete your one-time <strong>Identity Verification (KYC)</strong> first so your unified Ensemble account can publish Gigs / Services, submit job proposals, sign contracts, and withdraw earnings.
              </p>
            </div>
          </div>

          {/* 3-Way Work Switcher */}
          <div className="bp-work-switcher">
            <button
              className="bp-work-tab"
              onClick={() => handleTab("gigs")}
              onMouseEnter={playMinimalHover}
              style={{
                background:
                  activeTab === "gigs"
                    ? isDark
                      ? "rgba(45, 212, 191, 0.08)"
                      : "rgba(45, 212, 191, 0.06)"
                    : undefined,
                borderBottom: activeTab === "gigs" ? "2px solid #2dd4bf" : undefined,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: T.fontMono,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    color: activeTab === "gigs" ? "#2dd4bf" : textMeta,
                    marginBottom: 4,
                  }}
                >
                  TRACK A // GIGS & SERVICES
                </div>
                <div
                  style={{
                    fontFamily: T.fontDisplay,
                    fontSize: 15,
                    fontWeight: 800,
                    color: activeTab === "gigs" ? textPrimary : textSecondary,
                  }}
                >
                  Accept Orders on Discovery → Sign Contract
                </div>
              </div>
            </button>

            <button
              className="bp-work-tab"
              onClick={() => handleTab("jobs")}
              onMouseEnter={playMinimalHover}
              style={{
                background:
                  activeTab === "jobs"
                    ? isDark
                      ? "rgba(168, 85, 247, 0.08)"
                      : "rgba(168, 85, 247, 0.06)"
                    : undefined,
                borderBottom: activeTab === "jobs" ? "2px solid #a855f7" : undefined,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: T.fontMono,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    color: activeTab === "jobs" ? "#a855f7" : textMeta,
                    marginBottom: 4,
                  }}
                >
                  TRACK B // JOB PROPOSALS
                </div>
                <div
                  style={{
                    fontFamily: T.fontDisplay,
                    fontSize: 15,
                    fontWeight: 800,
                    color: activeTab === "jobs" ? textPrimary : textSecondary,
                  }}
                >
                  Submit Solo/Team Proposal → Get Approved & Hired
                </div>
              </div>
            </button>

            <button
              className="bp-work-tab"
              onClick={() => handleTab("assets")}
              onMouseEnter={playMinimalHover}
              style={{
                background:
                  activeTab === "assets"
                    ? isDark
                      ? "rgba(16, 185, 129, 0.08)"
                      : "rgba(16, 185, 129, 0.06)"
                    : undefined,
                borderBottom: activeTab === "assets" ? "2px solid #10b981" : undefined,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: T.fontMono,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    color: activeTab === "assets" ? "#10b981" : textMeta,
                    marginBottom: 4,
                  }}
                >
                  TRACK C // ASSET MARKETPLACE
                </div>
                <div
                  style={{
                    fontFamily: T.fontDisplay,
                    fontSize: 15,
                    fontWeight: 800,
                    color: activeTab === "assets" ? textPrimary : textSecondary,
                  }}
                >
                  Sell Template Videos, Bundles, Images, Videos & Audios
                </div>
              </div>
            </button>
          </div>

          {/* Step Rows */}
          <div>
            {steps.map((step) => (
              <div
                key={step.num}
                className="bp-work-step-row"
                onMouseEnter={playMinimalHover}
              >
                <div className="bp-work-step-meta">
                  <span
                    style={{
                      fontFamily: T.fontMono,
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: "0.14em",
                      color: accent,
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

                <div className="bp-work-step-body">
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      border: `1px solid ${borderLine}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: accent,
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
                Ready to Monetize Your Creative Work on Ensemble?
              </div>
              <div
                style={{
                  fontFamily: T.fontDisplay,
                  fontSize: 14,
                  color: textSecondary,
                }}
              >
                Sign up once, verify KYC, and start selling services, bidding on jobs, or listing assets.
              </div>
            </div>

            <button
              onClick={() => {
                playClick();
                navigate("/signup");
              }}
              onMouseEnter={playMinimalHover}
              style={{
                background: accent,
                color: activeTab === "jobs" ? "#ffffff" : "#09090b",
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
              START WORKING NOW <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageHowToWork;
