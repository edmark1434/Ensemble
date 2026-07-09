import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HelpCircle, ArrowRight, ArrowLeft, Check } from "lucide-react";
import ShapeGrid from "../../components/ui/ShapeGrid";

const T = {
  bg:        "#080a12",
  bgInput:   "#13151f",
  border:    "#2a2d3e",
  borderFoc: "#4a6fa5",
  accent:    "#4a6fa5",
  text:      "#ffffff",
  muted:     "#888",
  dim:       "#555",
  error:     "#e05252",
  fontBody:    "'Plus Jakarta Sans', sans-serif",
};

const REFERRAL_OPTIONS = [
  "Social Media (Facebook/X/IG)",
  "YouTube Video / Ad",
  "Friend / Colleague Recommendation",
  "Online Community (Reddit/Discord)",
  "Search Engine (Google)",
  "Other"
];

const STUDENT_OPTIONS = [
  { label: "Yes, and I am employed", value: "student_employed" },
  { label: "Yes, and I am unemployed", value: "student_unemployed" },
  { label: "No, I am employed full-time", value: "pro_employed" },
  { label: "No, I am a full-time freelancer", value: "pro_freelance" }
];

const PURPOSE_OPTIONS = [
  { label: "Earn / Find Work", desc: "List my editing skills and take on freelance video contracts.", value: "earn" },
  { label: "Look for Service / Hire", desc: "Post video projects and find post-production talent.", value: "hire" },
  { label: "Explore / Learn", desc: "Check out the workspace, browse portfolios, and network.", value: "explore" }
];

export default function Survey() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Local sub-step control state
  const [subStep, setSubStep] = useState<1 | 2>(1);

  // Survey Input Selections State Nodes
  const [referral, setReferral] = useState("");
  const [studentStatus, setStudentStatus] = useState("");
  const [purposes, setPurposes] = useState<string[]>([]); // Changed to string array for multiple selection

  const togglePurposeSelection = (value: string) => {
    if (purposes.includes(value)) {
      setPurposes(purposes.filter((p) => p !== value));
    } else {
      setPurposes([...purposes, value]);
    }
    if (errors.purposes) setErrors({ ...errors, purposes: "" });
  };

  const handleNextAction = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (subStep === 1) {
      if (!referral) newErrors.referral = "Please select where you heard about us.";
      if (!studentStatus) newErrors.studentStatus = "Please select your current academic/employment status.";

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      setErrors({});
      setSubStep(2);
    } else {
      if (purposes.length === 0) newErrors.purposes = "Please select at least one purpose for using the platform.";

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      executeFinalSubmissionPipeline();
    }
  };

  const executeFinalSubmissionPipeline = async () => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      navigate("/setup/preview");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBackAction = () => {
    if (subStep === 2) {
      setErrors({});
      setSubStep(1);
    } else {
      navigate("/setup/profile-setup");
    }
  };

  return (
    <>
      <style>{`
        .setup-page-wrapper {
          position: relative;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          min-height: 100vh;
          background: ${T.bg};
          padding: 80px 20px;
          overflow-x: hidden;
        }

        .canvas-bg-container {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: auto;
        }

        .setup-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 480px;
          display: flex;
          flex-direction: column;
          font-family: ${T.fontBody};
          background: rgba(8, 10, 18, 0.8);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 32px;
          border-radius: 20px;
          border: 1px solid rgba(42, 45, 62, 0.4);
        }

        .animated-content {
          opacity: 0;
          transform: translateY(10px);
          animation: smooth-fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 0.15s;
        }

        .survey-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 24px;
        }

        .survey-label {
          color: ${T.text};
          font-size: 14px;
          font-weight: 600;
          letter-spacing: -0.1px;
        }

        .survey-sublabel {
          color: ${T.muted};
          font-size: 12px;
          margin-bottom: 2px;
        }

        .dropdown-select {
          width: 100%;
          padding: 12px 14px;
          background: ${T.bgInput};
          border: 1px solid ${T.border};
          border-radius: 10px;
          color: #e2e8f0;
          font-size: 14px;
          outline: none;
          transition: all .15s ease;
        }

        .dropdown-select:focus {
          border-color: ${T.borderFoc};
        }

        .purpose-stack {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .purpose-card {
          background: ${T.bgInput};
          border: 1px solid ${T.border};
          color: #e2e8f0;
          padding: 14px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          text-align: left;
        }

        .purpose-card:hover {
          border-color: ${T.dim};
        }

        .purpose-card.active {
          border-color: ${T.borderFoc};
          background: rgba(74, 111, 165, 0.1);
        }

        .check-indicator {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: ${T.accent};
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          flex-shrink: 0;
        }

        .error-text {
          color: ${T.error};
          font-size: 11px;
          margin-top: 4px;
        }

        @keyframes smooth-fade-in {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="setup-page-wrapper">
        <div className="canvas-bg-container">
          <ShapeGrid
            direction="diagonal"
            speed={0.3}
            borderColor="rgba(42, 45, 62, 0.3)"
            squareSize={45}
            hoverFillColor="rgba(74, 111, 165, 0.15)"
            hoverTrailAmount={4}
            shape="square"
          />
        </div>

        <form onSubmit={handleNextAction} className="setup-card">
          {/* Dual Multi-step Progress Bar Layer Tracker */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.accent, letterSpacing: 0.5 }}>ACCOUNT SETUP</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>5 / 5</span>
            </div>

            {/* Master Route Progress Frame */}
            <div style={{ width: "100%", height: 4, background: T.border, borderRadius: 2, overflow: "hidden", marginBottom: 6 }}>
              <div style={{ width: "100%", height: "100%", background: T.accent, borderRadius: 2 }} />
            </div>

            {/* Inner Step Progress Tracker */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 500, color: T.muted }}>SECTION PROGRESS</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: T.accent }}>{subStep === 1 ? "50%" : "100%"}</span>
            </div>
            <div style={{ width: "100%", height: 2, background: "rgba(42, 45, 62, 0.4)", borderRadius: 1, overflow: "hidden" }}>
              <div style={{
                width: subStep === 1 ? "50%" : "100%",
                height: "100%",
                background: "rgba(74, 111, 165, 0.6)",
                borderRadius: 1,
                transition: "width 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
              }} />
            </div>
          </div>

          <div className="animated-content" key={subStep}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, background: T.bgInput,
              border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.accent, marginBottom: 20,
            }}>
              <HelpCircle className="h-5 w-5" />
            </div>

            <h2 style={{ fontSize: 24, fontWeight: 700, color: T.text, marginBottom: 6, letterSpacing: -.3 }}>
              {subStep === 1 ? "Onboarding survey" : "Platform purpose"}
            </h2>
            <p style={{ color: T.muted, fontSize: 14, marginBottom: 28, lineHeight: 1.5 }}>
              {subStep === 1
                ? "Please take a brief moment to share your professional background origins with us."
                : "Identify your primary objectives so we can personalize your workspace dashboards."}
            </p>

            {/* ================= PART 1: REFERRAL & STUDENT CONTEXT ================= */}
            {subStep === 1 && (
              <>
                <div className="survey-section">
                  <span className="survey-label">Where did you hear about us? *</span>
                  <select
                    value={referral}
                    onChange={(e) => {
                      setReferral(e.target.value);
                      if (errors.referral) setErrors({ ...errors, referral: "" });
                    }}
                    className="dropdown-select"
                    style={{ borderColor: errors.referral ? T.error : T.border }}
                  >
                    <option value="" disabled hidden>Select an option...</option>
                    {REFERRAL_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  {errors.referral && <span className="error-text">{errors.referral}</span>}
                </div>

                <div className="survey-section" style={{ marginBottom: 32 }}>
                  <span className="survey-label">Are you a student? *</span>
                  <select
                    value={studentStatus}
                    onChange={(e) => {
                      setStudentStatus(e.target.value);
                      if (errors.studentStatus) setErrors({ ...errors, studentStatus: "" });
                    }}
                    className="dropdown-select"
                    style={{ borderColor: errors.studentStatus ? T.error : T.border }}
                  >
                    <option value="" disabled hidden>Select your student status...</option>
                    {STUDENT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {errors.studentStatus && <span className="error-text">{errors.studentStatus}</span>}
                </div>
              </>
            )}

            {/* ================= PART 2: PLATFORM SERVICE PURPOSE (MULTIPLE SELECTION) ================= */}
            {subStep === 2 && (
              <div className="survey-section" style={{ marginBottom: 36 }}>
                <span className="survey-label">What is your purpose on the platform? *</span>
                <span className="survey-sublabel">Select all options that describe your current objectives.</span>
                <div className="purpose-stack">
                  {PURPOSE_OPTIONS.map((opt) => {
                    const isActive = purposes.includes(opt.value);
                    return (
                      <div
                        key={opt.value}
                        className={`purpose-card ${isActive ? "active" : ""}`}
                        onClick={() => togglePurposeSelection(opt.value)}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: isActive ? T.text : "#e2e8f0", marginBottom: 2 }}>
                            {opt.label}
                          </div>
                          <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.4 }}>
                            {opt.desc}
                          </div>
                        </div>
                        {isActive && (
                          <div className="check-indicator">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {errors.purposes && <span className="error-text">{errors.purposes}</span>}
              </div>
            )}

            {/* ================= INTERACTIVE FOOTER RACK ================= */}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                type="button"
                onClick={handleBackAction}
                style={{
                  flex: 1, background: "none", border: `1px solid ${T.border}`, color: T.text, padding: "12px 20px",
                  borderRadius: 30, fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 2, background: loading ? "#555" : "#fff", color: "#080a12", border: "none", padding: "12px 20px",
                  borderRadius: 30, fontWeight: 600, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all .2s ease"
                }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#e8e8e8"; }}
                onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = "#fff"; }}
              >
                {loading ? (
                  "Finalizing Workspace..."
                ) : subStep === 1 ? (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Complete Setup
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}