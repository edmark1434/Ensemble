import React from "react";
import { useNavigate } from "react-router-dom";
import { Search, UserCheck, CreditCard, ArrowLeft } from "lucide-react";

const PageHowToHire: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div style={{ background: "#080a12", minHeight: "100vh", color: "#fff", padding: "80px 40px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: "#7a8499", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 40, fontSize: 14 }}>
          <ArrowLeft size={16} /> Back
        </button>
        <h1 style={{ fontSize: 42, fontWeight: 800, marginBottom: 16 }}>How to Hire on Ensemble</h1>
        <p style={{ color: "#7a8499", fontSize: 18, marginBottom: 48, lineHeight: 1.6 }}>Find world-class video editors, motion designers, and cinematic directors to bring your production scale to life.</p>

        <div style={{ spaceY: 32, display: "flex", flexDirection: "column", gap: 32 }}>
          {[
            { icon: <Search size={24} color="#3b82f6" />, title: "1. Post a Job Workspace", desc: "Describe your project scale, dynamic scope, video guidelines, and budget tiers. It's completely free to outline your job post requirements." },
            { icon: <UserCheck size={24} color="#3b82f6" />, title: "2. Review incoming proposals", desc: "Contractors will bid on your post. Compare their video portfolios, client satisfaction ratings, and timeline execution metrics immediately." },
            { icon: <CreditCard size={24} color="#3b82f6" />, title: "3. Fund securely and collaborate", desc: "Use Ensemble's browser tools to review parallel cuts in real-time. Release milestone payments only when the work meets your expectations." }
          ].map((step, idx) => (
            <div key={idx} style={{ background: "#0d0f1a", border: "1px solid #1e2130", padding: 32, borderRadius: 16, display: "flex", gap: 24, alignItems: "start" }}>
              <div style={{ background: "rgba(59,130,246,0.1)", padding: 12, borderRadius: 12 }}>{step.icon}</div>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{step.title}</h3>
                <p style={{ color: "#7a8499", lineHeight: 1.6, fontSize: 15 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PageHowToHire;