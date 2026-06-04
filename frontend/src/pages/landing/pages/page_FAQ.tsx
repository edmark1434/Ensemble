import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ArrowLeft } from "lucide-react";

const FAQ_ITEMS = [
  { q: "Is it free to post a project listing?", a: "Yes, posting structural job requests in the creative marketplace is completely free. You only fund contract milestones when you select a freelancer." },
  { q: "How do parallel real-time editing workflows work?", a: "Ensemble routes asset configurations instantly. Multiple team members can apply caption markers or configure edit structures concurrently without rendering large source video chunks locally." },
  { q: "What fee percentage does the marketplace process?", a: "Ensemble maintains a low contract platform commission rate to maximize freelance contractor net returns while guaranteeing secure financial escrow protection for corporate clients." }
];

const PageFAQ: React.FC = () => {
  const navigate = useNavigate();
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div style={{ background: "#080a12", minHeight: "100vh", color: "#fff", padding: "80px 40px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: "#7a8499", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 40, fontSize: 14 }}>
          <ArrowLeft size={16} /> Back
        </button>
        <h1 style={{ fontSize: 42, fontWeight: 800, marginBottom: 48 }}>Frequently Asked Questions</h1>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div key={idx} style={{ background: "#0d0f1a", border: `1px solid ${isOpen ? "#3b82f6" : "#1e2130"}`, borderRadius: 16, overflow: "hidden", transition: "all 0.2s" }}>
                <button onClick={() => setOpenIdx(isOpen ? null : idx)} style={{ width: "100%", background: "none", border: "none", padding: "24px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", textLeft: "left" }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: "#fff", textAlign: "left" }}>{item.q}</span>
                  <ChevronDown size={18} color="#7a8499" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                </button>
                {isOpen && (
                  <div style={{ padding: "0 32px 24px 32px", color: "#7a8499", fontSize: 15, lineHeight: 1.6, animation: "ens-ddIn 0.2s ease" }}>
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PageFAQ;