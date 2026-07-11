import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  Zap,
  Trash2,
  ShoppingBag,
  Video,
  BarChart3
} from "lucide-react";
import Aurora from "@/components/ui/Aurora"; // Adjust path as needed

// Added interface props to support global audio control
interface FeaturesProps {
  isMuted?: boolean;
}

const ALL_FEATURES = [
  {
    id: "01",
    title: "A.I. Caption Navigation",
    desc: "Type any word or phrase and our AI will pinpoint the clip. Instantly navigate to exactly where it was spoken in your video.",
    img: "/features/m2.png",
    icon: <Zap size={18} />
  },
  {
    id: "02",
    title: "Seamless Collaboration",
    desc: "Collaborate without friction through real-time team editing. No more wasting time on rendering or sending over large files.",
    img: "/features/m1.png",
    icon: <Users size={18} />
  },
  {
    id: "03",
    title: "Auto Dead-Air Clean Up",
    desc: "Remove silence with a single click to streamline your edit. Keep your viewers engaged and get your content ready for export.",
    img: "/features/m3.png",
    icon: <Trash2 size={18} />
  },
  {
    id: "04",
    title: "Creative Marketplace",
    desc: "Buy or sell premium audio, templates, and assets to fuel any production. Browse our job board to hire top talent.",
    img: "/features/m4.png",
    icon: <ShoppingBag size={18} />
  },
  {
    id: "05",
    title: "Integrated Chat & Call",
    desc: "Conduct interviews or team meetings with high-quality video. Streamline your hiring and feedback without leaving the app.",
    img: "/features/m5.png",
    icon: <Video size={18} />
  },
  {
    id: "06",
    title: "Progress Tracking",
    desc: "Monitor every milestone with an intuitive, live visual dashboard. Track task completion and ensure your content is ready.",
    img: "/features/m6.png",
    icon: <BarChart3 size={18} />
  },
];

const SectionFeatures: React.FC<FeaturesProps> = ({ isMuted = false }) => {
  const [activeTab, setActiveTab] = useState(0);
  const hoverAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize standard hover audio configuration
    hoverAudioRef.current = new Audio("/sounds/minimalhover.mp3");
    hoverAudioRef.current.volume = 0.25;
  }, []);

  const playHoverSound = () => {
    if (isMuted || !hoverAudioRef.current) return;
    hoverAudioRef.current.currentTime = 0; // Rewind for rapid continuous trigger updates
    hoverAudioRef.current.play().catch(() => {});
  };

  const handleTabActivation = (idx: number) => {
    if (activeTab === idx) return;
    playHoverSound(); // Trigger sound cleanly on target change
    setActiveTab(idx);
  };

  return (
    <section id="features" style={{ background: "#080a12", padding: "100px 40px", position: "relative", overflow: "hidden" }}>

      {/* ─── Aurora WebGL Background Layer ─── */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, opacity: 0.35 }}>
        <Aurora
          colorStops={["#A855F7", "#080a12", "#3B82F6"]}
          blend={0.6}
          amplitude={1.2}
          speed={0.5}
        />
      </div>

      {/* Global CSS for Hardware-Accelerated Tab Shifting */}
      <style>{`
        .feature-tab {
          background: transparent;
          border: 1px solid transparent;
          border-radius: 16px;
          padding: 20px;
          text-align: left;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          width: 100%;
        }
        .feature-tab.active {
          background: rgba(13, 15, 26, 0.6);
          border-color: #1e2130;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }
        .feature-tab.active .tab-icon {
          background: #3b82f6 !important;
          color: #fff !important;
        }
        .feature-image-container {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 10;
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid #1e2130;
          background: #0d0f1a;
          box-shadow: 0 40px 80px -15px rgba(0, 0, 0, 0.6);
        }
        .feature-img-layer {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          object-fit: cover;
          opacity: 0;
          transform: scale(1.02);
          filter: blur(4px);
          transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), filter 0.3s ease;
        }
        .feature-img-layer.active {
          opacity: 1;
          transform: scale(1);
          filter: blur(0);
        }
        @media (max-width: 1024px) {
          .features-layout-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .feature-tab-list { display: grid !important; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)) !important; gap: 12px !important; }
        }
      `}</style>

      {/* ─── Main Content Foreground Layer ─── */}
      <div style={{ maxWidth: 1300, margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* Header Block */}
        <div style={{ textAlign: "center", marginBottom: "64px" }}>
          <h2 style={{ fontSize: "14px", color: "#3b82f6", fontWeight: 700, textTransform: "uppercase", letterSpacing: "4px", marginBottom: "16px" }}>
            Value Ecosystem
          </h2>
          <h3 style={{ fontSize: "clamp(32px, 4vw, 42px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
            Everything you need to ship faster
          </h3>
        </div>

        {/* Unified Interactive Features Grid Layout */}
        <div className="features-layout-grid" style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "64px", alignItems: "center" }}>

          {/* Left Panel: Hero Image Mirror Viewport */}
          <div style={{ position: "relative" }}>
            <div style={{
              position: "absolute",
              width: "120%",
              height: "120%",
              background: activeTab % 2 === 0 ? "rgba(59, 130, 246, 0.06)" : "rgba(168, 85, 247, 0.06)",
              filter: "blur(100px)",
              borderRadius: "50%",
              top: "-10%", left: "-10%",
              pointerEvents: "none",
              transition: "background 0.5s ease"
            }} />

            <div className="feature-image-container">
              {ALL_FEATURES.map((f, idx) => (
                <img
                  key={f.id}
                  src={f.img}
                  alt={f.title}
                  className={`feature-img-layer ${activeTab === idx ? "active" : ""}`}
                />
              ))}
            </div>
          </div>

          {/* Right Panel: Interactive Quick Switch Navigation Stack */}
          <div className="feature-tab-list" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {ALL_FEATURES.map((f, idx) => (
              <button
                key={f.id}
                className={`feature-tab ${activeTab === idx ? "active" : ""}`}
                onClick={() => handleTabActivation(idx)}
                onMouseEnter={() => handleTabActivation(idx)} // Triggers hover sound & toggles active layout instantly
              >
                <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                  <div
                    className="tab-icon"
                    style={{
                      width: "36px",
                      height: "36px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      color: "#7a8499",
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: "all 0.2s ease"
                    }}
                  >
                    {f.icon}
                  </div>
                  <div>
                    <h4 style={{ fontSize: "16px", fontWeight: 700, color: activeTab === idx ? "#fff" : "#94a3b8", margin: "0 0 6px 0", transition: "color 0.2s" }}>
                      {f.title}
                    </h4>
                    {activeTab === idx && (
                      <p style={{ color: "#7a8499", fontSize: "14px", lineHeight: "1.5", margin: 0, animation: "content-swap 0.3s ease forwards" }}>
                        {f.desc}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
};

export default SectionFeatures;