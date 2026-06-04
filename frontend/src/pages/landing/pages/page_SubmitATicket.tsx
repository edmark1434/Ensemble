import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PageSubmitATicket: React.FC = () => {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);

  return (
    <div style={{ background: "#080a12", minHeight: "100vh", color: "#fff", padding: "80px 40px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: "#7a8499", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 40, fontSize: 14 }}>
          <ArrowLeft size={16} /> Back
        </button>
        <h1 style={{ fontSize: 42, fontWeight: 800, marginBottom: 16 }}>Submit a Ticket</h1>
        <p style={{ color: "#7a8499", fontSize: 15, marginBottom: 36 }}>Encountered a bug or an escrow processing issue? File a support ticket and our engineering team will look into it.</p>

        {submitted ? (
          <div style={{ background: "rgba(45,212,191,0.05)", border: "1px solid rgba(45,212,191,0.2)", padding: 24, borderRadius: 12, textLeft: "left" }}>
            <h4 style={{ color: "#2dd4bf", fontSize: 18, marginBottom: 8 }}>Ticket submitted successfully</h4>
            <p style={{ color: "#7a8499", fontSize: 14 }}>Our customer success team will follow up via email within 24 hours.</p>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#7a8499", marginBottom: 8 }}>Email Address</label>
              <input required type="email" style={{ width: "100%", background: "#0d0f1a", border: "1px solid #1e2130", borderRadius: 10, padding: "14px", color: "#fff", outline: "none" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#7a8499", marginBottom: 8 }}>Issue Subject</label>
              <input required type="text" style={{ width: "100%", background: "#0d0f1a", border: "1px solid #1e2130", borderRadius: 10, padding: "14px", color: "#fff", outline: "none" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#7a8499", marginBottom: 8 }}>Detailed Description</label>
              <textarea required rows={5} style={{ width: "100%", background: "#0d0f1a", border: "1px solid #1e2130", borderRadius: 10, padding: "14px", color: "#fff", outline: "none", resize: "none" }} />
            </div>
            <button type="submit" style={{ background: "#fff", color: "#000", border: "none", borderRadius: 10, padding: "14px", fontWeight: 700, cursor: "pointer", marginTop: 10 }}>Submit Ticket</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default PageSubmitATicket;