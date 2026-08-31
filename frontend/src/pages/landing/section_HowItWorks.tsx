import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ShapeGrid from "@/components/ui/ShapeGrid";
import FadeInScroll from "@/components/ui/FadeInScroll";
import useGlobalState from "@/lib/global_state";

interface HowItWorksProps {
  isMuted?: boolean;
}

const HIW_DATA = {
  casual: [
    { title: "Setup Account & Verify with KYC", img: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80" },
    { title: "Browse Marketplace & Subscriptions", img: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80" },
    { title: "Edit and Collaborate", img: "https://tse2.mm.bing.net/th/id/OIP.5igK9JhLACAy9F8tB8XQ6AHaEK?r=0&rs=1&pid=ImgDetMain&o=7&rm=3" },
  ],
  freelancer: [
    { title: "Find Jobs or Post a Service", img: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=800&q=80" },
    { title: "Propose to a Job or Receive Orders", img: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=800&q=80" },
    { title: "Get Paid with Credits", img: "https://images.unsplash.com/photo-1556742044-3c52d6e88c62?auto=format&fit=crop&w=800&q=80" },
  ],
  client: [
    { title: "Post a Job or Find Services", img: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=800&q=80" },
    { title: "Manage Proposals or Order a Service", img: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80" },
    { title: "Pay the Service / Job", img: "https://images.unsplash.com/photo-1556742044-3c52d6e88c62?auto=format&fit=crop&w=800&q=80" },
  ]
};

const SectionHowItWorks: React.FC<HowItWorksProps> = ({ isMuted = false }) => {
  const navigate = useNavigate();
  const setIsGuestMode = useGlobalState((state) => state.setIsGuestMode);
  const [tab, setTab] = useState<"casual" | "freelancer" | "client">("casual");
  const [hoveredTab, setHoveredTab] = useState<"casual" | "freelancer" | "client" | null>(null);
  const theme = useGlobalState((state) => state.theme);

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
      timeoutsRef.current.forEach(id => clearTimeout(id));
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

    timeoutsRef.current.forEach(id => clearTimeout(id));
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

  const handleTabChange = (targetTab: "casual" | "freelancer" | "client") => {
    if (tab === targetTab) return;
    playClickSound();
    setTab(targetTab);

    setTimeout(() => {
      triggerCardStaggerPops();
    }, 20);
  };

  return (
    <section
      id="how-it-works"
      style={{
        position: "relative",
        overflow: "hidden",
        background: theme === 'dark' ? "#121214" : "#ffffff",
        padding: "100px 60px",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        transition: "background 0.3s ease"
      }}
    >
      {/* ─── ShapeGrid Background Layer ─── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
          opacity: 0.4,
        }}
      >
        <ShapeGrid
          speed={0.4}
          squareSize={48}
          direction="diagonal"
          borderColor={theme === 'dark' ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"}
          hoverFillColor={theme === 'dark' ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}
          shape="square"
          hoverTrailAmount={5}
        />
      </div>

      {/* Left Side Gradient Overlay (To blend seamlessly out of the horizontal adjacent section) */}
      <div style={{
        position: "absolute",
        top: 0, left: 0, bottom: 0,
        width: "15%",
        background: theme === 'dark' ? "linear-gradient(to right, #121214 0%, transparent 100%)" : "linear-gradient(to right, #ffffff 0%, transparent 100%)",
        zIndex: 0,
        transition: "background 0.3s ease",
        pointerEvents: "none"
      }} />

      {/* Right Side Gradient Overlay (To blend seamlessly into the horizontal adjacent section) */}
      <div style={{
        position: "absolute",
        top: 0, right: 0, bottom: 0,
        width: "15%",
        background: theme === 'dark' ? "linear-gradient(to left, #121214 0%, transparent 100%)" : "linear-gradient(to left, #ffffff 0%, transparent 100%)",
        zIndex: 0,
        transition: "background 0.3s ease",
        pointerEvents: "none"
      }} />

      {/* ─── Main Content Foreground Layer ─── */}
      <FadeInScroll distance={40} duration={0.8} style={{ width: "100%", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1300, margin: "0 auto" }}>

          {/* Header with 3-Way Switcher */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 48 }}>
            <h2 style={{ fontSize: 42, fontWeight: 800, color: theme === 'dark' ? "#fff" : "#111827", letterSpacing: "-0.02em" }}>How it works</h2>

            <div style={{ display: "flex", background: theme === 'dark' ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", border: theme === 'dark' ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)", borderRadius: 100, padding: 4 }}>
              {(["casual", "freelancer", "client"] as const).map((mode) => {
                const isActive = tab === mode;
                const isCurrentlyHovered = hoveredTab === mode;
                const labels = { casual: "For Casuals", freelancer: "For Freelancers", client: "For Clients" };

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
                      padding: "8px 24px",
                      borderRadius: 100,
                      border: "none",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.25s ease",
                      background: isActive
                        ? (theme === 'dark' ? "#fff" : "#111827")
                        : (isCurrentlyHovered ? (theme === 'dark' ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)") : "transparent"),
                      color: isActive
                        ? (theme === 'dark' ? "#000" : "#fff")
                        : (isCurrentlyHovered ? (theme === 'dark' ? "#fff" : "#111827") : "#7a8499")
                    }}
                  >
                    {labels[mode]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3-Column Grid with Key to trigger CSS animation on tab change */}
          <div key={tab} style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }}>
            {HIW_DATA[tab].map((step, i) => (
              <div key={i} className="animate-swap" style={{ animationDelay: `${i * 0.1}s` }}>
                <div style={{ width: "100%", aspectRatio: "16/10", borderRadius: 24, overflow: "hidden", marginBottom: 20, background: theme === 'dark' ? "#18181b" : "#f4f4f5", border: theme === 'dark' ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.05)" }}>
                  <img src={step.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.8 }} />
                </div>
                <h4 style={{ fontSize: 20, fontWeight: 700, color: theme === 'dark' ? "#fff" : "#111827" }}>{step.title}</h4>
              </div>
            ))}
          </div>

          {/* Action Button Below Grid */}
            <div style={{ marginTop: 40, display: "flex", justifyContent: "center" }}>
              <button
                onClick={() => {
                  setIsGuestMode(true);
                  if (tab === "casual") navigate("/home");
                  else if (tab === "freelancer") navigate("/jobs/postings");
                  else if (tab === "client") navigate("/gigs/services");
                }}
                className="group"
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "16px 32px",
                borderRadius: 100,
                background: theme === 'dark' ? "#fff" : "#111827",
                color: theme === 'dark' ? "#000" : "#fff",
                fontWeight: 700,
                fontSize: 16,
                border: "none",
                cursor: "pointer",
                transition: "all 0.3s ease"
              }}
            >
              {tab === "freelancer" ? "View Job Marketplace" : tab === "client" ? "View Gig Marketplace" : "Browse Website"}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "transform 0.3s ease" }} className="group-hover:translate-x-1">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </FadeInScroll>
    </section>
  );
};

export default SectionHowItWorks;