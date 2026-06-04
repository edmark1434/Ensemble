import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PageAboutUs: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div style={{ background: "#080a12", minHeight: "100vh", color: "#fff", padding: "80px 40px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: "#7a8499", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 40, fontSize: 14 }}>
          <ArrowLeft size={16} /> Back
        </button>
        <h1 style={{ fontSize: 42, fontWeight: 800, marginBottom: 24 }}>About Ensemble</h1>
        <p style={{ color: "#7a8499", fontSize: 18, marginBottom: 32, lineHeight: 1.6 }}>Ensemble is a structure-first real-time video collaboration application and freelance marketplace designed to eliminate friction in film production pipelines.</p>
        <p style={{ color: "#7a8499", fontSize: 16, marginBottom: 48, lineHeight: 1.6 }}>We believe that post-production shouldn't get bogged down by endless local file transfers, rendering delays, or fragmented feedback channels. Our cloud ecosystem connects creative contractors directly with clients through real-time shared playback sequences, automated silence cleanups, and a reliable freelance workspace hub.</p>

        <div style={{ borderTop: "1px solid #1e2130", paddingTop: 40 }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, color: "#3b82f6", textTransform: "uppercase", letterSpacing: 2, marginBottom: 16 }}>Engineered By</h3>
          <p style={{ fontSize: 15, color: "#fff", fontWeight: 600 }}>RavenLabs Dev Group • © 2026 Ecosystem Project</p>
        </div>
      </div>
    </div>
  );
};

export default PageAboutUs;