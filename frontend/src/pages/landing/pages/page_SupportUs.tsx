import React from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Star, Share2, ArrowLeft } from "lucide-react";

const PageSupportUs: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div style={{ background: "#080a12", minHeight: "100vh", color: "#fff", padding: "80px 40px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
        <div style={{ textAlign: "left" }}>
          <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: "#7a8499", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 40, fontSize: 14 }}>
            <ArrowLeft size={16} /> Back
          </button>
        </div>

        <div style={{ background: "rgba(234,179,8,0.05)", border: "1px solid rgba(234,179,8,0.15)", padding: 12, borderRadius: "50%", width: "fit-content", margin: "0 auto 24px" }}>
          <Heart size={32} color="#eab308" fill="#eab308" />
        </div>

        <h1 style={{ fontSize: 42, fontWeight: 800, marginBottom: 16 }}>Support the Project</h1>
        <p style={{ color: "#7a8499", fontSize: 17, maxW: "520px", margin: "0 auto 48px", lineHeight: 1.6 }}>Ensemble is built by independent creators for creative professionals. Here is how you can help support our ecosystem without financial strain.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24, textAlign: "left" }}>
          <div style={{ background: "#0d0f1a", border: "1px solid #1e2130", padding: 32, borderRadius: 16 }}>
            <Star size={24} color="#eab308" style={{ marginBottom: 16 }} />
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Star the Repository</h3>
            <p style={{ color: "#7a8499", fontSize: 14, lineHeight: 1.5 }}>Help increase our open-source discoverability by dropping a star on RavenLabs development networks.</p>
          </div>
          <div style={{ background: "#0d0f1a", border: "1px solid #1e2130", padding: 32, borderRadius: 16 }}>
            <Share2 size={24} color="#3b82f6" style={{ marginBottom: 16 }} />
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Share the Platform</h3>
            <p style={{ color: "#7a8499", fontSize: 14, lineHeight: 1.5 }}>Recommend Ensemble to other video editors, content creators, and remote post-production teams.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageSupportUs;