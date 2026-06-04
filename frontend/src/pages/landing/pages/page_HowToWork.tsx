import React from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, Zap, ShieldCheck, ArrowLeft } from "lucide-react";

const PageHowToWork: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div style={{ background: "#080a12", minHeight: "100vh", color: "#fff", padding: "80px 40px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: "#7a8499", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 40, fontSize: 14 }}>
          <ArrowLeft size={16} /> Back
        </button>
        <h1 style={{ fontSize: 42, fontWeight: 800, marginBottom: 16 }}>How to Work on Ensemble</h1>
        <p style={{ color: "#7a8499", fontSize: 18, marginBottom: 48, lineHeight: 1.6 }}>Grow your remote video engineering career, secure contracts with verified clients, and work efficiently.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {[
            { icon: <Briefcase size={24} color="#2dd4bf" />, title: "1. Build an impactful profile", desc: "Highlight your expertise with past log profiles, showcase render links, and display badges that reflect your technical abilities." },
            { icon: <Zap size={24} color="#2dd4bf" />, title: "2. Submit job proposals", desc: "Find open match contracts in the creative marketplace tab, customize your pricing budget requests, and quote clear delivery dates." },
            { icon: <ShieldCheck size={24} color="#2dd4bf" />, title: "3. Produce, Edit, and Earn", desc: "Utilize real-time shared multi-cam pipelines. Payments are escrow-protected so you always get paid reliably for completed deliverables." }
          ].map((step, idx) => (
            <div key={idx} style={{ background: "#0d0f1a", border: "1px solid #1e2130", padding: 32, borderRadius: 16, display: "flex", gap: 24, alignItems: "start" }}>
              <div style={{ background: "rgba(45,212,191,0.1)", padding: 12, borderRadius: 12 }}>{step.icon}</div>
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

export default PageHowToWork;