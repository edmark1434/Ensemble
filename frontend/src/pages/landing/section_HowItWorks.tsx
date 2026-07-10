import React, { useState } from "react";
import ShapeGrid from "@/components/ui/ShapeGrid"; // Adjust this path to match your folder structure

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

const SectionHowItWorks: React.FC = () => {
  const [tab, setTab] = useState<"hire" | "work" | "edit">("hire");

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
          opacity: 0.4, // Subtle opacity so it doesn't overpower the layout cards
        }}
      >
        <ShapeGrid
          speed={0.4}
          squareSize={48}
          direction="diagonal"
          borderColor="#1e2130" // Matches your core layout border color
          hoverFillColor="#13162b" // Smooth deep tint glow when hovering over shapes
          shape="square"
          hoverTrailAmount={5}
        />
      </div>

      {/* ─── Main Content Foreground Layer ─── */}
      <div style={{ maxWidth: 1300, margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* Header with 3-Way Switcher */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 48 }}>
          <h2 style={{ fontSize: 42, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>How it works</h2>

          <div style={{ display: "flex", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 100, padding: 4 }}>
            <button
              onClick={() => setTab("hire")}
              style={{ padding: "8px 24px", borderRadius: 100, border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.3s", background: tab === "hire" ? "#fff" : "transparent", color: tab === "hire" ? "#000" : "#7a8499" }}
            >
              For hiring
            </button>
            <button
              onClick={() => setTab("work")}
              style={{ padding: "8px 24px", borderRadius: 100, border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.3s", background: tab === "work" ? "#fff" : "transparent", color: tab === "work" ? "#000" : "#7a8499" }}
            >
              For finding work
            </button>
            <button
              onClick={() => setTab("edit")}
              style={{ padding: "8px 24px", borderRadius: 100, border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.3s", background: tab === "edit" ? "#fff" : "transparent", color: tab === "edit" ? "#000" : "#7a8499" }}
            >
              For editing
            </button>
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
    </section>
  );
};

export default SectionHowItWorks;