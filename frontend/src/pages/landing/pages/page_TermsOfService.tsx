import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";

const PageTermsOfService: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div style={{ background: "#080a12", minHeight: "100vh", color: "#fff", padding: "80px 40px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: "#7a8499", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 40, fontSize: 14 }}>
          <ArrowLeft size={16} /> Back
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
           <FileText size={40} color="#3b82f6" />
           <h1 style={{ fontSize: 42, fontWeight: 800 }}>Terms of Service</h1>
        </div>

        <p style={{ color: "#7a8499", marginBottom: 32 }}>Last Updated: June 2026</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 32, lineHeight: 1.7, color: "#cbd5e1" }}>
          <section>
            <h2 style={{ color: "#fff", fontSize: 20, marginBottom: 12 }}>1. Acceptance of Terms</h2>
            <p>By accessing Ensemble, you agree to be bound by these terms. Our platform provides a workspace for video collaboration and a marketplace for creative services.</p>
          </section>

          <section>
            <h2 style={{ color: "#fff", fontSize: 20, marginBottom: 12 }}>2. User Responsibilities</h2>
            <p>Users must provide accurate information. Freelancers are responsible for the quality of their deliverables, and clients are responsible for clear project briefs.</p>
          </section>

          <section>
            <h2 style={{ color: "#fff", fontSize: 20, marginBottom: 12 }}>3. Payments & Escrow</h2>
            <p>Payments for marketplace jobs are held in escrow. Funds are released to the contractor only upon approval of the milestone by the client or through dispute resolution.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PageTermsOfService;