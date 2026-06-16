import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Crown, X } from "lucide-react";

const PLANS = [
  {
    name: "Default",
    price: "FREE",
    originalPrice: null,
    color: "#ffffff",
    badgeColor: "rgba(255, 255, 255, 0.05)",
    icon: null,
    features: [
      "720p Export",
      "Standard Export Speed",
      "Low Render Queue",
      "Watermarked Export",
      "Basic Tools",
      "3 Collaborators",
      "3 Collaborative Projects",
      "1 Asset Post"
    ],
    buttonText: "Get Started",
    isPrimary: false
  },
  {
    name: "PREMIUM",
    price: "₱599",
    originalPrice: "₱899",
    color: "#eab308", // Gold accent matching image_ed9fca.jpg
    badgeColor: "rgba(234, 179, 8, 0.1)",
    icon: <Crown size={16} fill="#eab308" color="#eab308" />,
    features: [
      "1080p Export",
      "Accelerated Export Speed",
      "Priority Render Queue",
      "No Watermark",
      "Premium Tools + AI",
      "10 Collaborators",
      "10 Collaborative Projects",
      "20 Asset Posts",
      "Profile Visibility +30%",
      "Badge Display"
    ],
    buttonText: "Upgrade to Premium",
    isPrimary: true
  },
  {
    name: "BUSINESS",
    price: "₱3,500",
    originalPrice: "₱3,999",
    color: "#2dd4bf", // Teal accent matching image_ed9fca.jpg
    badgeColor: "rgba(45, 212, 191, 0.1)",
    icon: <Crown size={16} fill="#2dd4bf" color="#2dd4bf" />,
    features: [
      "2K - 4K Export",
      "Maximum Export Speed",
      "Absolute Render Queue",
      "No Watermark",
      "Premium Tools + AI",
      "20 Collaborators",
      "20 Collaborative Projects",
      "Unlimited Asset Posts",
      "Profile Visibility +90%",
      "Badge Display and More"
    ],
    buttonText: "Upgrade to Business",
    isPrimary: true
  }
];

const PagePricing: React.FC = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handlePlanClick = (tierName: string) => {
    if (tierName === "Default") {
      navigate("/signup"); // Or change to dashboard if that's preferred for free tier
    } else {
      setSelectedPlan(tierName);
      setIsModalOpen(true);
    }
  };

  return (
    <div style={{ background: "#080a12", minHeight: "100vh", color: "#fff", padding: "80px 24px", position: "relative", overflowX: "hidden" }}>

      {/* Visual Component Micro-styles */}
      <style>{`
        .pricing-card {
          background: rgba(13, 15, 26, 0.45);
          backdrop-filter: blur(16px);
          border: 1px solid #1e2130;
          border-radius: 24px;
          padding: 40px 32px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .pricing-card:hover {
          transform: translateY(-8px);
          background: rgba(17, 20, 34, 0.7);
          box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.8);
        }
        .pricing-btn {
          width: 100%;
          padding: 14px;
          border-radius: 14px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
        }
        .pricing-btn:hover {
          transform: scale(1.02);
        }
        .modal-action-btn {
          padding: 12px 24px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
          flex: 1;
        }
        @media (max-width: 1024px) {
          .pricing-grid { grid-template-columns: 1fr !important; max-width: 450px !important; margin: 0 auto; }
        }
      `}</style>

      {/* Decorative Ambient Background Blurs */}
      <div style={{ position: "absolute", width: "500px", height: "500px", background: "rgba(59, 130, 246, 0.03)", filter: "blur(140px)", top: "10%", left: "-10%", pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: "500px", height: "500px", background: "rgba(45, 212, 191, 0.03)", filter: "blur(140px)", bottom: "10%", right: "-10%", pointerEvents: "none" }} />

      <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 2 }}>

        {/* Back Home Button */}
        <button
          onClick={() => navigate("/")}
          style={{ background: "none", border: "none", color: "#7a8499", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 32, fontSize: 14, fontWeight: 600, transition: "color 0.2s" }}
          onMouseEnter={(e) => e.currentTarget.style.color = "#fff"}
          onMouseLeave={(e) => e.currentTarget.style.color = "#7a8499"}
        >
          <ArrowLeft size={16} /> Back to dashboard
        </button>

        {/* Header Text */}
        <div style={{ textAlign: "center", marginBottom: "64px" }}>
          <h1 style={{ fontSize: "clamp(32px, 5vw, 46px)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 16 }}>
            Plans & Pricing Tiers
          </h1>
          <p style={{ color: "#7a8499", fontSize: 16, maxWidth: 540, margin: "0 auto", lineHeight: 1.5 }}>
            Transparent scales tailored for freelancers and enterprise film production squads alike.
          </p>
        </div>

        {/* Pricing Layout Grid */}
        <div className="pricing-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 28, alignItems: "stretch" }}>
          {PLANS.map((tier, idx) => (
            <div
              key={idx}
              className="pricing-card"
              style={{
                borderColor: tier.isPrimary ? "rgba(255, 255, 255, 0.08)" : "#1e2130"
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = tier.color}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = tier.isPrimary ? "rgba(255, 255, 255, 0.08)" : "#1e2130"}
            >
              {/* Card Content Area */}
              <div>
                {/* Header Row: Label Tag and Icon */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <span style={{
                    color: tier.color,
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    background: tier.badgeColor,
                    padding: "4px 10px",
                    borderRadius: "6px"
                  }}>
                    {tier.name}
                  </span>
                  {tier.icon}
                </div>

                {/* Pricing Block */}
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 32 }}>
                  <h2 style={{ fontSize: tier.price.includes("₱") ? 40 : 44, fontWeight: 800, margin: 0, color: "#fff", letterSpacing: "-0.02em" }}>
                    {tier.price}
                  </h2>
                  {tier.originalPrice && (
                    <span style={{ color: "rgba(255, 255, 255, 0.25)", fontSize: 16, textDecoration: "line-through", fontWeight: 500 }}>
                      {tier.originalPrice}
                    </span>
                  )}
                </div>

                {/* Separation Line */}
                <div style={{ height: "1px", background: "linear-gradient(90deg, #1e2130 0%, transparent 100%)", marginBottom: 28 }} />

                {/* Features Checklist Array */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 40 }}>
                  {tier.features.map((feat, fidx) => (
                    <div key={fidx} style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.75)", display: "flex", alignItems: "start", gap: 12, lineHeight: 1.4 }}>
                      <span style={{
                        color: tier.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: tier.badgeColor,
                        borderRadius: "50%",
                        padding: 3,
                        marginTop: 1
                      }}>
                        <Check size={12} strokeWidth={3} />
                      </span>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button Trigger */}
              <button
                className="pricing-btn"
                onClick={() => handlePlanClick(tier.name)}
                style={{
                  background: tier.isPrimary ? "#ffffff" : "transparent",
                  color: tier.isPrimary ? "#080a12" : "#ffffff",
                  border: tier.isPrimary ? "none" : "1px solid #1e2130"
                }}
                onMouseEnter={(e) => {
                  if (!tier.isPrimary) {
                    e.currentTarget.style.borderColor = "#ffffff";
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                  } else {
                    e.currentTarget.style.background = "#dde3ed";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!tier.isPrimary) {
                    e.currentTarget.style.borderColor = "#1e2130";
                    e.currentTarget.style.background = "transparent";
                  } else {
                    e.currentTarget.style.background = "#ffffff";
                  }
                }}
              >
                {tier.buttonText}
                {tier.isPrimary && (
                  <div style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "#080a12",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </div>
                )}
              </button>

            </div>
          ))}
        </div>
      </div>

      {/* Authentication Gateway Modal */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(4, 5, 9, 0.8)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 20
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            style={{
              background: "#0d0f1a",
              border: "1px solid #1e2130",
              borderRadius: "20px",
              padding: "32px",
              maxWidth: "400px",
              width: "100%",
              position: "relative",
              boxShadow: "0 40px 80px -15px rgba(0,0,0,0.9)"
            }}
            onClick={(e) => e.stopPropagation()} // Prevents closing when clicking inside modal
          >
            {/* Close Button */}
            <button
              onClick={() => setIsModalOpen(false)}
              style={{ position: "absolute", top: 20, right: 20, background: "none", border: "none", color: "#525c73", cursor: "pointer", transition: "color 0.2s" }}
              onMouseEnter={(e) => e.currentTarget.style.color = "#fff"}
              onMouseLeave={(e) => e.currentTarget.style.color = "#525c73"}
            >
              <X size={20} />
            </button>

            {/* Modal Title */}
            <div style={{ textAlign: "center", marginBottom: 24, marginTop: 8 }}>
              <div style={{ display: "inline-flex", padding: 12, borderRadius: "50%", background: "rgba(59, 130, 246, 0.05)", border: "1px solid rgba(59, 130, 246, 0.15)", marginBottom: 16 }}>
                <Crown size={28} color={selectedPlan === "BUSINESS" ? "#2dd4bf" : "#eab308"} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Account Required</h3>
              <p style={{ color: "#7a8499", fontSize: 14, lineHeight: 1.4 }}>
                To subscribe to the <span style={{ color: selectedPlan === "BUSINESS" ? "#2dd4bf" : "#eab308", fontWeight: 600 }}>{selectedPlan}</span> plan, please sign in or create a new account.
              </p>
            </div>

            {/* Modal Action Buttons */}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                className="modal-action-btn"
                onClick={() => navigate("/login")}
                style={{ background: "transparent", border: "1px solid #1e2130", color: "#fff" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                Log In
              </button>
              <button
                className="modal-action-btn"
                onClick={() => navigate("/signup")}
                style={{ background: "#fff", border: "none", color: "#080a12" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#dde3ed"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}
              >
                Sign Up Free
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PagePricing;