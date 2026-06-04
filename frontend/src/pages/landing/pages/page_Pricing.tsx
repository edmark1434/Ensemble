import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PagePricing: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div style={{ background: "#080a12", minHeight: "100vh", color: "#fff", padding: "80px 40px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: "#7a8499", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 40, fontSize: 14 }}>
          <ArrowLeft size={16} /> Home
        </button>
        <h1 style={{ fontSize: 42, fontWeight: 800, textAlign: "center", marginBottom: 12 }}>Plans & Pricing tiers</h1>
        <p style={{ color: "#7a8499", textAlign: "center", fontSize: 16, marginBottom: 48 }}>Transparent scales tailored for freelancers and enterprise film production squads alike.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {[
            { n: "Default", p: "FREE", c: "#fff", f: ["720p Export bounds", "Watermarked tracks", "3 Collaborative projects", "1 Asset store post"] },
            { n: "PREMIUM", p: "₱350", c: "#eab308", f: ["1080p high-bitrate outputs", "No video watermarks", "10 Collaborative workspaces", "Profile search prioritization +30%"] },
            { n: "BUSINESS", p: "₱950", c: "#2dd4bf", f: ["2K - 4K ProRes deliverables", "AI audio tracking access", "20 Collaborative workspaces", "Profile visibility boost +90%"] }
          ].map((tier, idx) => (
            <div key={idx} style={{ background: "rgba(13,15,26,0.6)", border: "1px solid #1e2130", borderRadius: 24, padding: 32, display: "flex", flexDirection: "column", justifyContext: "space-between" }}>
              <div>
                <span style={{ color: tier.c, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>{tier.n}</span>
                <h2 style={{ fontSize: 36, fontWeight: 800, margin: "12px 0 24px 0" }}>{tier.p}</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {tier.f.map((feat, fidx) => (
                    <div key={fidx} style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", display: "flex", gap: 8 }}>
                      <span style={{ color: tier.c }}>✓</span> {feat}
                    </div>
                  ))}
                </div>
              </div>
              <button style={{ marginTop: 40, background: idx > 0 ? "#fff" : "transparent", color: idx > 0 ? "#000" : "#fff", border: idx > 0 ? "none" : "1px solid #1e2130", borderRadius: 12, padding: 12, fontWeight: 700, cursor: "pointer" }}>Select Plan</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PagePricing;