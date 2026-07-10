import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, ArrowRight, ArrowLeft, User, Film, HelpCircle, Link2 } from "lucide-react";
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
  success:   "#52e0a0",
  fontBody:    "'Plus Jakarta Sans', sans-serif",
};

export default function Preview() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Mocked state aggregation representing collected onboard flow metadata pipelines
  const mockFormSummary = {
    personal: {
      fullName: "John Paul P. Mahilom",
      birthDate: "June 24, 2006",
      location: "Mabolo, Cebu City, Philippines",
      zipCode: "6000",
    },
    avatar: {
      previewUrl: "/profile_presets/p1.png",
      isCustom: false
    },
    profile: {
      role: "Short-Form Video Editor",
      bio: "Detailing post-production pacing styles and fast-turnaround content pipelines. Specialized in high-retention timeline engineering.",
      skills: [
        { name: "Color Grading", proficiency: "Advanced", experience: "2 yrs" },
        { name: "After Effects", proficiency: "Expert", experience: "3+ yrs" },
        { name: "Sound Design", proficiency: "Intermediate", experience: "1 yr" }
      ],
      socials: [
        { platform: "Instagram", url: "https://instagram.com/rexshimura" },
        { platform: "YouTube", url: "https://youtube.com/@studio" }
      ]
    },
    survey: {
      referral: "Online Community (Reddit/Discord)",
      studentStatus: "Yes, and I am unemployed",
      purposes: ["Earn / Find Work", "Explore / Learn"]
    }
  };

  const handleFinalConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Final platform ledger instantiation delay
      await new Promise((resolve) => setTimeout(resolve, 2000));
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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

        .preview-scroll-container {
          max-height: 400px;
          overflow-y: auto;
          padding-right: 6px;
          margin-bottom: 28px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* Custom minimal scrollbar styling */
        .preview-scroll-container::-webkit-scrollbar {
          width: 4px;
        }
        .preview-scroll-container::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.02);
          border-radius: 10px;
        }
        .preview-scroll-container::-webkit-scrollbar-thumb {
          background: ${T.border};
          border-radius: 10px;
        }

        .summary-block {
          background: ${T.bgInput};
          border: 1px solid ${T.border};
          border-radius: 12px;
          padding: 16px;
        }

        .block-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          color: ${T.accent};
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
          border-bottom: 1px solid rgba(42, 45, 62, 0.5);
          padding-bottom: 8px;
        }

        .meta-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .meta-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          line-height: 1.4;
        }

        .meta-label {
          color: ${T.muted};
          font-weight: 500;
        }

        .meta-value {
          color: #e2e8f0;
          font-weight: 600;
          text-align: right;
          max-width: 65%;
        }

        .skill-pill-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(8, 10, 18, 0.4);
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 12px;
          border: 1px solid rgba(42, 45, 62, 0.3);
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

        <form onSubmit={handleFinalConfirm} className="setup-card">
          {/* Master Progress Tracking Module Frame (Complete) */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.accent, letterSpacing: 0.5 }}>ACCOUNT SETUP</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>5 / 5</span>
            </div>
            <div style={{ width: "100%", height: 4, background: T.border, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: "100%", height: "100%", background: T.success, borderRadius: 2, transition: "width 0.5s ease" }} />
            </div>
          </div>

          <div className="animated-content">
            <div style={{
              width: 48, height: 48, borderRadius: 12, background: T.bgInput,
              border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.success, marginBottom: 20,
            }}>
              <ShieldCheck className="h-5 w-5" />
            </div>

            <h2 style={{ fontSize: 24, fontWeight: 700, color: T.text, marginBottom: 6, letterSpacing: -.3 }}>
              Review particulars
            </h2>
            <p style={{ color: T.muted, fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
              Verify your identity particulars and video post-production ecosystem setups before generating your ledger workspace.
            </p>

            {/* SCROLLABLE INTERACTIVE PREVIEW MATRIX */}
            <div className="preview-scroll-container">

              {/* SECTION 1: IDENTITY DATA */}
              <div className="summary-block">
                <div className="block-header">
                  <User className="h-3.5 w-3.5" /> Identity & Particulars
                </div>
                <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 14 }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", overflow: "hidden", border: `2px solid ${T.border}`, background: T.bg }}>
                    <img src={mockFormSummary.avatar.previewUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.15)" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{mockFormSummary.personal.fullName}</div>
                    <div style={{ fontSize: 12, color: T.muted }}>Born {mockFormSummary.personal.birthDate}</div>
                  </div>
                </div>
                <div className="meta-grid">
                  <div className="meta-row">
                    <span className="meta-label">Address</span>
                    <span className="meta-value">{mockFormSummary.personal.location}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">Zip Code</span>
                    <span className="meta-value">{mockFormSummary.personal.zipCode}</span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: EDITING CONTEXT */}
              <div className="summary-block">
                <div className="block-header">
                  <Film className="h-3.5 w-3.5" /> Post-Production Focus
                </div>
                <div className="meta-grid" style={{ gap: 12 }}>
                  <div className="meta-row" style={{ flexDirection: "column", gap: 2 }}>
                    <span className="meta-label">Role Tagline</span>
                    <span style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>{mockFormSummary.profile.role}</span>
                  </div>
                  <div className="meta-row" style={{ flexDirection: "column", gap: 2 }}>
                    <span className="meta-label">Creative Biography</span>
                    <span style={{ color: T.muted, fontSize: 12, lineHeight: 1.4 }}>{mockFormSummary.profile.bio}</span>
                  </div>

                  {/* Skill Subgroup Array */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                    <span className="meta-label" style={{ fontSize: 11, textTransform: "uppercase" }}>Configured Skills</span>
                    {mockFormSummary.profile.skills.map((skill, idx) => (
                      <div key={idx} className="skill-pill-row">
                        <span style={{ fontWeight: 600, color: "#fff" }}>{skill.name}</span>
                        <span style={{ color: T.accent }}>{skill.proficiency} • {skill.experience}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECTION 3: SOCIAL RETENTION LINKS */}
              {mockFormSummary.profile.socials.length > 0 && (
                <div className="summary-block">
                  <div className="block-header">
                    <Link2 className="h-3.5 w-3.5" /> Connected Channels
                  </div>
                  <div className="meta-grid">
                    {mockFormSummary.profile.socials.map((soc, idx) => (
                      <div key={idx} className="meta-row">
                        <span className="meta-label">{soc.platform}</span>
                        <a href={soc.url} target="_blank" rel="noreferrer" style={{ color: T.accent, textDecoration: "none", fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {soc.url.replace("https://", "")}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 4: SURVEY METRICS */}
              <div className="summary-block">
                <div className="block-header">
                  <HelpCircle className="h-3.5 w-3.5" /> Platform Intent Metrics
                </div>
                <div className="meta-grid">
                  <div className="meta-row">
                    <span className="meta-label">Referral Source</span>
                    <span className="meta-value" style={{ fontSize: 12 }}>{mockFormSummary.survey.referral}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">Student Status</span>
                    <span className="meta-value" style={{ fontSize: 12 }}>{mockFormSummary.survey.studentStatus}</span>
                  </div>
                  <div className="meta-row" style={{ flexDirection: "column", gap: 4, marginTop: 4 }}>
                    <span className="meta-label">Selected Objectives</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {mockFormSummary.survey.purposes.map((p, idx) => (
                        <span key={idx} style={{ background: "rgba(74, 111, 165, 0.15)", color: T.accent, padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* FLOW NAV CONTROLS BUTTON MATRIX */}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                type="button"
                onClick={() => navigate("/setup/survey")}
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
                  flex: 2, background: loading ? "#555" : T.success, color: "#080a12", border: "none", padding: "12px 20px",
                  borderRadius: 30, fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all .2s ease"
                }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#6ef2b4"; }}
                onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = T.success; }}
              >
                {loading ? "Creating Profile..." : (
                  <>
                    Confirm & Submit
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