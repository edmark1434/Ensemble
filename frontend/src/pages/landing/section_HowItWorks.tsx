import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ShapeGrid from "@/components/ui/ShapeGrid";
import FadeInScroll from "@/components/ui/FadeInScroll";
import useGlobalState from "@/lib/global_state";

interface HowItWorksProps {
  isMuted?: boolean;
}

const T = {
  fontDisplay: "'Plus Jakarta Sans', sans-serif",
  fontMono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
} as const;

const HIW_DATA = {
  enthusiast: [
    {
      step: "01",
      tag: "UNIFIED ACCOUNT & KYC",
      title: "Sign Up & Complete Identity Verification",
      desc: "One Ensemble account can act as both a Client and a Freelancer. Verify your email and complete KYC verification first before engaging in any marketplace or credit transactions.",
      img: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80",
    },
    {
      step: "02",
      tag: "ASSET MARKETPLACE & LIBRARY",
      title: "Browse or Sell Template Videos, Bundles, Images, Videos & Audios",
      desc: "Use platform credits in the Asset Marketplace / Asset Library to get or sell template videos, bundles, images, videos, and audios—all managed from one wallet.",
      img: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80",
    },
    {
      step: "03",
      tag: "IN-BROWSER STUDIO",
      title: "Edit in Real-Time & Switch Roles Anytime",
      desc: "Launch the collaborative timeline editor with AI auto-captioning and dead-air cleanup—and switch seamlessly to hiring talent or working on gigs whenever you need.",
      img: "https://tse2.mm.bing.net/th/id/OIP.5igK9JhLACAy9F8tB8XQ6AHaEK?r=0&rs=1&pid=ImgDetMain&o=7&rm=3",
    },
  ],
  freelancer: [
    {
      step: "01",
      tag: "VERIFIED FREELANCER SETUP",
      title: "Verify Identity (KYC), Submit Proposals or Post Gigs / Services",
      desc: "Complete mandatory KYC verification first. Then submit an individual or team proposal to a Client's Job post, or publish your own services on Gigs / Services and Discovery.",
      img: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=800&q=80",
    },
    {
      step: "02",
      tag: "APPROVAL & CONTRACT OFFER",
      title: "Get Shortlisted & Approved or Accept a Service Order",
      desc: "When a Client shortlists and approves your proposal—or when you accept a Client's service order from Gigs / Services—the Client offers you a formal contract to get hired.",
      img: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=800&q=80",
    },
    {
      step: "03",
      tag: "DELIVER & EARN CREDITS",
      title: "Accept Contract, Collaborate on Milestones & Get Paid",
      desc: "Accept the contract and platform terms to lock credits in escrow. Deliver cuts in the shared workspace, complete milestones, and receive credit payouts to your wallet.",
      img: "https://images.unsplash.com/photo-1556742044-3c52d6e88c62?auto=format&fit=crop&w=800&q=80",
    },
  ],
  client: [
    {
      step: "01",
      tag: "VERIFIED CLIENT SETUP",
      title: "Verify Account (KYC) & Choose Your Hiring Path",
      desc: "Complete KYC verification and load credits first. You can hire in 2 ways: post a Job on the platform, or browse the Discovery page and Gigs / Services to find a Freelancer.",
      img: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=800&q=80",
    },
    {
      step: "02",
      tag: "PROPOSALS OR SERVICE ORDERS",
      title: "Approve a Job Proposal or Order a Service",
      desc: "Way 1: Review submitted proposals on your Job post, shortlist, and approve an individual or team proposal. Way 2: Select a matching service on Gigs / Services, place an order, and wait for the Freelancer to accept.",
      img: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80",
    },
    {
      step: "03",
      tag: "OFFER CONTRACT & HIRE",
      title: "Offer the Contract, Collaborate & Release Credits",
      desc: "Once a proposal is approved or your service order is accepted, offer the contract to officially hire them. Track milestones on the taskboard and release escrowed credits upon approval.",
      img: "https://images.unsplash.com/photo-1556742044-3c52d6e88c62?auto=format&fit=crop&w=800&q=80",
    },
  ],
};

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

const SectionHowItWorks: React.FC<HowItWorksProps> = ({ isMuted = false }) => {
  const navigate = useNavigate();
  const setIsGuestMode = useGlobalState((state) => state.setIsGuestMode);
  const [tab, setTab] = useState<"enthusiast" | "freelancer" | "client">("freelancer");
  const [hoveredTab, setHoveredTab] = useState<"enthusiast" | "freelancer" | "client" | null>(null);
  const theme = useGlobalState((state) => state.theme);
  const isDark = theme === "dark";

  // Audio references
  const hoverAudioRef = useRef<HTMLAudioElement | null>(null);
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);
  const popAudioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    hoverAudioRef.current = new Audio("/sounds/hover.mp3");
    clickAudioRef.current = new Audio("/sounds/softclick.mp3");
    popAudioRef.current = new Audio("/sounds/pop.mp3");

    hoverAudioRef.current.volume = 0.25;
    clickAudioRef.current.volume = 0.4;
    popAudioRef.current.volume = 0.35;

    triggerCardStaggerPops();

    return () => {
      timeoutsRef.current.forEach((id) => clearTimeout(id));
    };
  }, []);

  const playHoverSound = () => {
    if (isMuted || !hoverAudioRef.current) return;
    hoverAudioRef.current.currentTime = 0;
    hoverAudioRef.current.play().catch(() => {});
  };

  const playClickSound = () => {
    if (isMuted || !clickAudioRef.current) return;
    clickAudioRef.current.currentTime = 0;
    clickAudioRef.current.play().catch(() => {});
  };

  const triggerCardStaggerPops = () => {
    if (isMuted) return;

    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];

    HIW_DATA[tab].forEach((_, i) => {
      const timeoutId = window.setTimeout(() => {
        if (popAudioRef.current) {
          const sequentialPop = popAudioRef.current.cloneNode(true) as HTMLAudioElement;
          sequentialPop.volume = 0.35;
          sequentialPop.play().catch(() => {});
        }
      }, i * 100);

      timeoutsRef.current.push(timeoutId);
    });
  };

  const handleTabChange = (targetTab: "enthusiast" | "freelancer" | "client") => {
    if (tab === targetTab) return;
    playClickSound();
    setTab(targetTab);

    setTimeout(() => {
      triggerCardStaggerPops();
    }, 20);
  };

  const borderLine = isDark ? "rgba(255, 255, 255, 0.14)" : "rgba(0, 0, 0, 0.15)";
  const crosshairColor = isDark ? "rgba(255, 255, 255, 0.55)" : "rgba(0, 0, 0, 0.5)";
  const bgSection = isDark ? "#121214" : "#ffffff";
  const bgFrame = isDark ? "#121214" : "#ffffff";
  const textPrimary = isDark ? "#ffffff" : "#111827";
  const textSecondary = isDark ? "#a1a1aa" : "#4b5563";
  const textMeta = isDark ? "rgba(255, 255, 255, 0.45)" : "rgba(17, 24, 39, 0.45)";

  return (
    <section
      id="how-it-works"
      style={{
        position: "relative",
        overflow: "hidden",
        background: bgSection,
        borderTop: `1px solid ${borderLine}`,
        marginTop: -1,
        transition: "background 0.3s ease",
        fontFamily: T.fontDisplay,
      }}
    >
      <style>{`
        .hiw-blueprint-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          width: 100%;
        }
        .hiw-blueprint-cell {
          border-right: 1px solid ${borderLine};
          border-bottom: 1px solid ${borderLine};
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          transition: background 0.2s ease;
          background: ${bgFrame};
        }
        .hiw-blueprint-cell:last-child {
          border-right: none;
        }
        .hiw-blueprint-cell:hover {
          background: ${isDark ? "#18181b" : "#f9fafb"};
        }
        .hiw-cell-img {
          transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .hiw-blueprint-cell:hover .hiw-cell-img {
          transform: scale(1.03);
        }
        @media (max-width: 960px) {
          .hiw-blueprint-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .hiw-blueprint-cell:nth-child(2n+1) {
            border-right: 1px solid ${borderLine} !important;
          }
          .hiw-blueprint-cell:nth-child(2n) {
            border-right: none !important;
          }
          .hiw-header-row {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 20px !important;
          }
        }
        @media (max-width: 640px) {
          .hiw-tab-switcher {
            width: 100% !important;
            display: flex !important;
          }
          .hiw-tab-switcher button {
            flex: 1 !important;
            padding: 9px 6px !important;
            font-size: 11px !important;
          }
          .hiw-lead-copy {
            font-size: 12.5px !important;
            line-height: 1.45 !important;
            margin-top: 10px !important;
          }
          .hiw-cell-bar {
            padding: 6px 10px !important;
          }
          .hiw-cell-tag {
            font-size: 7.5px !important;
            letter-spacing: 0.08em !important;
          }
          .hiw-cell-step {
            font-size: 8px !important;
          }
          .hiw-cell-body {
            padding: 10px 10px 12px !important;
          }
          .hiw-cell-title {
            font-size: 12.5px !important;
            margin-bottom: 4px !important;
            line-height: 1.2 !important;
          }
          .hiw-cell-desc {
            font-size: 10.5px !important;
            line-height: 1.38 !important;
          }
          .hiw-bottom-bar {
            padding: 16px 18px !important;
          }
          .hiw-bottom-text {
            font-size: 11.5px !important;
          }
          .hiw-bottom-btn {
            padding: 10px 18px !important;
            font-size: 11px !important;
            width: 100% !important;
            justify-content: center !important;
          }
        }
      `}</style>

      {/* ─── Subtle ShapeGrid Background Layer ─── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          opacity: 0.35,
          pointerEvents: "none",
        }}
      >
        <ShapeGrid
          speed={0.4}
          squareSize={48}
          direction="diagonal"
          borderColor={isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"}
          hoverFillColor={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}
          shape="square"
          hoverTrailAmount={5}
        />
      </div>

      {/* ─── Architectural Blueprint Frame ─── */}
      <div
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          borderLeft: `1px solid ${borderLine}`,
          borderRight: `1px solid ${borderLine}`,
          borderBottom: `1px solid ${borderLine}`,
          background: bgFrame,
          position: "relative",
          zIndex: 1,
        }}
      >
        <Crosshair bottom left color={crosshairColor} />
        <Crosshair bottom right color={crosshairColor} />

        {/* Section Telemetry Header Bar */}
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
          <span>03 / WORKFLOW</span>
          <span>UNIFIED ACCOUNT • KYC &amp; ESCROW PIPELINE</span>
        </div>

        <FadeInScroll distance={24} duration={0.7}>
          {/* Header Row with Title, Unified Account Context & Crisp 3-Way Switcher */}
          <div
            className="hiw-header-row"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              padding: "clamp(36px, 5vw, 56px) clamp(18px, 4vw, 40px)",
              borderBottom: `1px solid ${borderLine}`,
              gap: 32,
            }}
          >
            <div style={{ maxWidth: 680 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "5px 12px",
                  border: `1px solid ${borderLine}`,
                  marginBottom: 16,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#3b82f6",
                }}
              >
                ONE ACCOUNT • DUAL FREELANCER &amp; CLIENT ACCESS
              </div>
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
                How it <span style={{ color: "#3b82f6" }}>works</span>.
              </h2>
              <p
                className="hiw-lead-copy"
                style={{
                  fontSize: 15.5,
                  lineHeight: 1.6,
                  color: textSecondary,
                  marginTop: 14,
                  fontWeight: 500,
                }}
              >
                Every Ensemble account can act as both a <strong>Freelancer</strong> and a{" "}
                <strong>Client</strong>. Complete identity verification (KYC) first to unlock
                escrow-protected contracts, credit transactions, and collaborative studio tools.
              </p>
            </div>

            {/* Crisp Zero-Radius Tab Switcher */}
            <div
              className="hiw-tab-switcher"
              style={{
                display: "inline-flex",
                border: `1px solid ${borderLine}`,
                background: isDark ? "#18181b" : "#f4f4f5",
                flexShrink: 0,
              }}
            >
              {(["freelancer", "client", "enthusiast"] as const).map((mode, idx) => {
                const isActive = tab === mode;
                const isCurrentlyHovered = hoveredTab === mode;
                const labels = {
                  freelancer: "As Freelancer",
                  client: "As Client",
                  enthusiast: "Studio & Assets",
                };

                return (
                  <button
                    key={mode}
                    onClick={() => handleTabChange(mode)}
                    onMouseEnter={() => {
                      setHoveredTab(mode);
                      if (!isActive) playHoverSound();
                    }}
                    onMouseLeave={() => setHoveredTab(null)}
                    style={{
                      padding: "12px 22px",
                      border: "none",
                      borderRight: idx < 2 ? `1px solid ${borderLine}` : "none",
                      borderRadius: 0,
                      fontSize: 13,
                      fontWeight: 700,
                      letterSpacing: "0.02em",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      fontFamily: T.fontDisplay,
                      background: isActive
                        ? isDark
                          ? "#ffffff"
                          : "#0f172a"
                        : isCurrentlyHovered
                        ? isDark
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(15,23,42,0.06)"
                        : "transparent",
                      color: isActive
                        ? isDark
                          ? "#0b0c10"
                          : "#ffffff"
                        : isCurrentlyHovered
                        ? textPrimary
                        : textSecondary,
                    }}
                  >
                    {labels[mode]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3-Column Step Cells (Matching Top Micro-Bar + Edge-to-Edge Image + Copy Style) */}
          <div key={tab} className="hiw-blueprint-grid">
            {HIW_DATA[tab].map((item, i) => (
              <div
                key={i}
                className="hiw-blueprint-cell animate-swap"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                {/* Step Micro-Bar */}
                <div
                  className="hiw-cell-bar"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "9px 22px",
                    borderBottom: `1px solid ${borderLine}`,
                  }}
                >
                  <span
                    className="hiw-cell-tag"
                    style={{
                      fontFamily: T.fontMono,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "#3b82f6",
                    }}
                  >
                    {item.tag}
                  </span>
                  <span
                    className="hiw-cell-step"
                    style={{
                      fontFamily: T.fontMono,
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: textMeta,
                    }}
                  >
                    STEP {item.step}
                  </span>
                </div>

                {/* Edge-to-Edge Zero-Radius Image Frame */}
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "16 / 9.5",
                    borderRadius: 0,
                    overflow: "hidden",
                    background: isDark ? "#18181b" : "#f4f4f5",
                    borderBottom: `1px solid ${borderLine}`,
                  }}
                >
                  <img
                    src={item.img}
                    alt={item.title}
                    className="hiw-cell-img"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      opacity: 0.9,
                      display: "block",
                    }}
                  />
                </div>

                {/* Copy Block (Compact & Crisp) */}
                <div className="hiw-cell-body" style={{ padding: "18px 22px 20px", flex: 1 }}>
                  <h3
                    className="hiw-cell-title"
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: textPrimary,
                      letterSpacing: "-0.02em",
                      marginBottom: 6,
                      lineHeight: 1.25,
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="hiw-cell-desc"
                    style={{
                      fontSize: 13.5,
                      lineHeight: 1.5,
                      color: textSecondary,
                      fontWeight: 500,
                      margin: 0,
                    }}
                  >
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Action Bar inside Blueprint Frame */}
          <div
            className="hiw-bottom-bar"
            style={{
              padding: "24px 40px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <span
                className="hiw-bottom-text"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: textSecondary,
                }}
              >
                {tab === "freelancer"
                  ? "Ready to verify your account, post gigs, or bid on open jobs?"
                  : tab === "client"
                  ? "Ready to post a production brief or hire a verified creator with escrow protection?"
                  : "Want to explore the collaborative studio and marketplace first?"}
              </span>
              <button
                onClick={() => {
                  playClickSound();
                  navigate(tab === "client" ? "/landing/HowToHire" : "/landing/HowToWork");
                }}
                className="hiw-bottom-text"
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  color: "#3b82f6",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: T.fontDisplay,
                  textDecoration: "underline",
                  textUnderlineOffset: "4px",
                }}
              >
                Read full {tab === "client" ? "Hiring" : "Working"} Guide ↗
              </button>
            </div>

            <button
              onClick={() => {
                playClickSound();
                setIsGuestMode(true);
                if (tab === "enthusiast") navigate("/home");
                else if (tab === "freelancer") navigate("/jobs/postings");
                else if (tab === "client") navigate("/gigs/services");
              }}
              className="group hiw-bottom-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "13px 28px",
                borderRadius: 0,
                background: isDark ? "#ffffff" : "#0f172a",
                color: isDark ? "#0b0c10" : "#ffffff",
                fontWeight: 800,
                fontSize: 13,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                playHoverSound();
                e.currentTarget.style.background = "#3b82f6";
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isDark ? "#ffffff" : "#0f172a";
                e.currentTarget.style.color = isDark ? "#0b0c10" : "#ffffff";
              }}
            >
              {tab === "freelancer"
                ? "View Job Marketplace"
                : tab === "client"
                ? "View Gig Marketplace"
                : "Browse Website"}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transition: "transform 0.25s ease" }}
                className="group-hover:translate-x-1"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
          </div>
        </FadeInScroll>
      </div>
    </section>
  );
};

export default SectionHowItWorks;
