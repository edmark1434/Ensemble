import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PageSendAFeedback: React.FC = () => {
  const navigate = useNavigate();
  const [rating, setRating] = useState<number | null>(null);
  const [complete, setComplete] = useState(false);

  return (
    <div style={{ background: "#080a12", minHeight: "100vh", color: "#fff", padding: "80px 40px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: "#7a8499", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 40, fontSize: 14 }}>
          <ArrowLeft size={16} /> Back
        </button>
        <h1 style={{ fontSize: 42, fontWeight: 800, marginBottom: 16 }}>Send Feedback</h1>
        <p style={{ color: "#7a8499", fontSize: 15, marginBottom: 36 }}>Have workflow suggestions or ui/ux insights for our dashboard? We review all feedback entries weekly.</p>

        {complete ? (
          <div style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.2)", padding: 24, borderRadius: 12 }}>
            <h4 style={{ color: "#3b82f6", fontSize: 18, marginBottom: 8 }}>Feedback logged</h4>
            <p style={{ color: "#7a8499", fontSize: 14 }}>Thank you for helping us improve Ensemble's interface architecture.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#7a8499", marginBottom: 12 }}>Rate your initial experience</label>
              <div style={{ display: "flex", gap: 10 }}>
                {[1, 2, 3, 4, 5].map(num => (
                  <button key={num} onClick={() => setRating(num)} style={{ width: 48, height: 48, borderRadius: 10, border: "1px solid #1e2130", background: rating === num ? "#fff" : "#0d0f1a", color: rating === num ? "#000" : "#fff", fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>{num}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#7a8499", marginBottom: 8 }}>What could we do better?</label>
              <textarea rows={4} placeholder="Your thoughts..." style={{ width: "100%", background: "#0d0f1a", border: "1px solid #1e2130", borderRadius: 10, padding: "14px", color: "#fff", outline: "none", resize: "none" }} />
            </div>
            <button onClick={() => setComplete(true)} style={{ background: "#fff", color: "#000", border: "none", borderRadius: 10, padding: "14px", fontWeight: 700, cursor: "pointer" }}>Submit Feedback</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PageSendAFeedback;