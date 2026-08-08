import React, { useState, useEffect, useRef } from "react";
import ShapeGrid from "@/components/ui/ShapeGrid"; // Adjust this path to match your folder structure
import FadeInScroll from "@/components/ui/FadeInScroll";

interface HowItWorksProps {
  isMuted?: boolean;
}

const HIW_DATA = {
  hire: [
    { title: "Posting jobs is always free", img: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=800&q=80" },
    { title: "Get proposals and hire", img: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=800&q=80" },
    { title: "Pay when work is done", img: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=800&q=80" },
  ],
  work: [
    { title: "Create your profile", img: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80" },
    { title: "Apply for jobs and gigs", img: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80" },
    { title: "Get paid securely", img: "https://images.unsplash.com/photo-1556742044-3c52d6e88c62?auto=format&fit=crop&w=800&q=80" },
  ],
  edit: [
    { title: "Import your footage", img: "https://www.cyberlink.com/prog/learning-center/html/4137/PDR19-YouTube-85_Record_Gameplay_Videos/img/import-footage.png" },
    { title: "Edit with AI tools & Collaborate", img: "https://tse2.mm.bing.net/th/id/OIP.5igK9JhLACAy9F8tB8XQ6AHaEK?r=0&rs=1&pid=ImgDetMain&o=7&rm=3" },
    { title: "Export Video & Share", img: "https://pbblogassets.s3.amazonaws.com/uploads/2019/08/07150355/exportwindow.jpg" },
  ]
};

const SectionHowItWorks: React.FC<HowItWorksProps> = ({ isMuted = false }) => {
  const [tab, setTab] = useState<"hire" | "work" | "edit">("hire");
  const [hoveredTab, setHoveredTab] = useState<"hire" | "work" | "edit" | null>(null);

  // Audio references
  const hoverAudioRef = useRef<HTMLAudioElement | null>(null);
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);
  const popAudioRef = useRef<HTMLAudioElement | null>(null);

  // Track active timeouts to clear them out cleanly if tabs are switched mid-progression
  const timeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    // Initialize required audio clips
    hoverAudioRef.current = new Audio("/sounds/hover.mp3");
    clickAudioRef.current = new Audio("/sounds/softclick.mp3");
    popAudioRef.current = new Audio("/sounds/pop.mp3");

    hoverAudioRef.current.volume = 0.25;
    clickAudioRef.current.volume = 0.4;
    popAudioRef.current.volume = 0.35; // Snappy pop presence mix

    // Play initial structural reveal pop effects for the default tab state on mounting
    triggerCardStaggerPops();

    return () => {
      // Clean up timeouts on unmount
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

  // Dedicated audio queue builder to sync pops seamlessly with your layout fade-ins
  const triggerCardStaggerPops = () => {
    if (isMuted) return;

    // Clear previous pending timeouts if tabs are switched quickly
    timeoutsRef.current.forEach(id => clearTimeout(id));
    timeoutsRef.current = [];

    HIW_DATA[tab].forEach((_, i) => {
      // Match the 0.1s stagger threshold (0ms, 100ms, 200ms)
      const timeoutId = window.setTimeout(() => {
        if (popAudioRef.current) {
          // Clone or reuse the instance cleanly for instant overlaps
          const sequentialPop = popAudioRef.current.cloneNode(true) as HTMLAudioElement;
          sequentialPop.volume = 0.35;
          sequentialPop.play().catch(() => {});
        }
      }, i * 100);

      timeoutsRef.current.push(timeoutId);
    });
  };

  const handleTabChange = (targetTab: "hire" | "work" | "edit") => {
    if (tab === targetTab) return;
    playClickSound();
    setTab(targetTab);

    // Schedule the pops for the newly revealed cluster cards
    // Use a slight timeout to align with the React DOM node swap
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
        background: "#080a12",
        padding: "100px 60px",
        borderBottom: "1px solid #1e2130"
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
          borderColor="#1e2130"
          hoverFillColor="#13162b"
          shape="square"
          hoverTrailAmount={5}
        />
      </div>

      {/* ─── Main Content Foreground Layer ─── */}
      <FadeInScroll distance={40} duration={0.8} style={{ width: "100%", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1300, margin: "0 auto" }}>

          {/* Header with 3-Way Switcher */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 48 }}>
            <h2 style={{ fontSize: 42, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>How it works</h2>

            <div style={{ display: "flex", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 100, padding: 4 }}>
              {(["hire", "work", "edit"] as const).map((mode) => {
                const isActive = tab === mode;
                const isCurrentlyHovered = hoveredTab === mode;
                const labels = { hire: "For hiring", work: "For finding work", edit: "For editing" };

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
                        ? "#fff"
                        : (isCurrentlyHovered ? "rgba(255,255,255,0.06)" : "transparent"),
                      color: isActive
                        ? "#000"
                        : (isCurrentlyHovered ? "#fff" : "#7a8499")
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
                <div style={{ width: "100%", aspectRatio: "16/10", borderRadius: 24, overflow: "hidden", marginBottom: 20, background: "#111827", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <img src={step.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.8 }} />
                </div>
                <h4 style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{step.title}</h4>
              </div>
            ))}
          </div>
        </div>
      </FadeInScroll>
    </section>
  );
};

export default SectionHowItWorks;