import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";

const PagePrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div style={{ background: "#080a12", minHeight: "100vh", color: "#fff", padding: "80px 40px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: "#7a8499", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 40, fontSize: 14 }}>
          <ArrowLeft size={16} /> Back
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
           <Shield size={40} color="#2dd4bf" />
           <h1 style={{ fontSize: 42, fontWeight: 800 }}>Privacy Policy</h1>
        </div>

        <p style={{ color: "#7a8499", marginBottom: 32 }}>Last Updated: June 2026</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 32, lineHeight: 1.7, color: "#cbd5e1" }}>
          <section>
            <h2 style={{ color: "#fff", fontSize: 20, marginBottom: 12 }}>1. Data Collection</h2>
            <p>We collect information necessary to facilitate video collaboration, including account details, project assets uploaded to our cloud, and transaction history.</p>
          </section>

          <section>
            <h2 style={{ color: "#fff", fontSize: 20, marginBottom: 12 }}>2. How We Use Your Data</h2>
            <p>Your data is used to maintain your workspaces, process payments, and improve our AI-assisted editing tools. We do not sell your personal project data to third parties.</p>
          </section>

          <section>
            <h2 style={{ color: "#fff", fontSize: 20, marginBottom: 12 }}>3. Security</h2>
            <p>Ensemble uses industry-standard encryption for all video asset transfers and financial transactions to ensure your creative intellectual property remains secure.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PagePrivacyPolicy;