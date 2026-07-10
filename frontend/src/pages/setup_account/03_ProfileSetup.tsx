import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, Plus, X, Film, Link2 } from "lucide-react";
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

interface SkillNode {
  name: string;
  proficiency: string;
  experience: number;
}

interface SocialLinkNode {
  platform: string;
  url: string;
}

export default function ProfileSetup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Substep flow control: 1 = Tagline & Bio, 2 = Skills & Socials
  const [subStep, setSubStep] = useState<1 | 2>(1);

  // Part 1 States
  const [title, setTitle] = useState("");
  const [bio, setBio] = useState("");

  // Part 2 States
  const [skills, setSkills] = useState<SkillNode[]>([]);
  const [currentSkill, setCurrentSkill] = useState("");
  const [socials, setSocials] = useState<SocialLinkNode[]>([{ platform: "Instagram", url: "" }]);

  const handleAddSkill = () => {
    const cleaned = currentSkill.trim();
    if (!cleaned) return;

    if (skills.some(s => s.name.toLowerCase() === cleaned.toLowerCase())) {
      setErrors({ ...errors, skills: "This skill has already been listed." });
      return;
    }

    setSkills([...skills, { name: cleaned, proficiency: "Intermediate", experience: 1 }]);
    setCurrentSkill("");
    if (errors.skills) setErrors({ ...errors, skills: "" });
  };

  const handleRemoveSkill = (idx: number) => {
    setSkills(skills.filter((_, i) => i !== idx));
  };

  const handleSkillChange = (idx: number, key: keyof SkillNode, value: string | number) => {
    const updated = [...skills];
    updated[idx] = { ...updated[idx], [key]: value };
    setSkills(updated);
  };

  const handleAddSocialRow = () => {
    setSocials([...socials, { platform: "YouTube", url: "" }]);
  };

  const handleRemoveSocialRow = (idx: number) => {
    setSocials(socials.filter((_, i) => i !== idx));
  };

  const handleSocialChange = (idx: number, key: keyof SocialLinkNode, value: string) => {
    const updated = [...socials];
    updated[idx] = { ...updated[idx], [key]: value };
    setSocials(updated);
  };

  const handleNextAction = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (subStep === 1) {
      if (!title.trim()) newErrors.title = "An editor role tagline is required.";
      if (!bio.trim()) newErrors.bio = "A production biography is required.";

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      setSubStep(2);
    } else {
      if (skills.length < 3) newErrors.skills = "Please list at least 3 editing capabilities.";

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      executeFinalSubmit();
    }
  };

  const executeFinalSubmit = async () => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      navigate("/setup/survey");
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
      navigate("/setup/upload-image");
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

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 20px;
          position: relative;
        }

        .input-label {
          color: ${T.muted};
          font-size: 12px;
          font-weight: 500;
        }

        .form-input {
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

        .form-input:focus {
          border-color: ${T.borderFoc};
        }

        .skills-rack-container {
          background: rgba(19, 21, 31, 0.6);
          border: 1px solid ${T.border};
          border-radius: 12px;
          padding: 12px;
          margin-bottom: 8px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .skill-config-row {
          display: flex;
          align-items: center;
          gap: 8px;
          background: ${T.bgInput};
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid rgba(42, 45, 62, 0.6);
        }

        .skill-select-mini {
          background: ${T.bg};
          border: 1px solid ${T.border};
          color: #fff;
          font-size: 11px;
          padding: 4px 6px;
          border-radius: 6px;
          outline: none;
        }

        .social-select-wrapper {
          display: flex;
          gap: 8px;
          align-items: center;
          width: 100%;
        }

        .social-dropdown {
          flex: 1;
          background: ${T.bgInput};
          border: 1px solid ${T.border};
          color: #fff;
          padding: 12px;
          border-radius: 10px;
          font-size: 14px;
          outline: none;
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
          {/* Dual Progress Tracking Stack */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.accent, letterSpacing: 0.5 }}>ACCOUNT SETUP</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>4 / 5</span>
            </div>

            {/* Primary Global Route Progress Bar */}
            <div style={{ width: "100%", height: 4, background: T.border, borderRadius: 2, overflow: "hidden", marginBottom: 6 }}>
              <div style={{
                width: "80%",
                height: "100%",
                background: T.accent,
                borderRadius: 2
              }} />
            </div>

            {/* New Sub-step Progress Bar Layer */}
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
              <Film className="h-5 w-5" />
            </div>

            <h2 style={{ fontSize: 24, fontWeight: 700, color: T.text, marginBottom: 6, letterSpacing: -.3 }}>
              {subStep === 1 ? "Editor context setup" : "Capabilities & links"}
            </h2>
            <p style={{ color: T.muted, fontSize: 14, marginBottom: 28, lineHeight: 1.5 }}>
              {subStep === 1
                ? "Configure your primary video editing professional role identity and creative bio styles."
                : "Map out your core post-production software capacities and video content portfolios."}
            </p>

            {/* ================= PART 1: TAGLINE & BIO ================= */}
            {subStep === 1 && (
              <>
                <div className="input-group">
                  <span className="input-label">Editor Role / Tagline *</span>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (errors.title) setErrors({ ...errors, title: "" });
                    }}
                    placeholder="e.g. Short-Form Video Editor"
                    className="form-input"
                    style={{ borderColor: errors.title ? T.error : T.border }}
                  />
                  {errors.title && <span className="error-text">{errors.title}</span>}
                </div>

                <div className="input-group" style={{ marginBottom: 32 }}>
                  <span className="input-label">Production Bio / Editing Style *</span>
                  <textarea
                    value={bio}
                    onChange={(e) => {
                      setBio(e.target.value);
                      if (errors.bio) setErrors({ ...errors, bio: "" });
                    }}
                    placeholder="Detail your post-production pacing style, typical project workflows, and software ecosystems (e.g., Premiere Pro, DaVinci Resolve)..."
                    rows={4}
                    className="form-input"
                    style={{
                      borderColor: errors.bio ? T.error : T.border,
                      resize: "none",
                      fontFamily: "inherit",
                      lineHeight: "1.5"
                    }}
                  />
                  {errors.bio && <span className="error-text">{errors.bio}</span>}
                </div>
              </>
            )}

            {/* ================= PART 2: SKILLS & SOCIALS ================= */}
            {subStep === 2 && (
              <>
                <div className="input-group" style={{ marginBottom: 20 }}>
                  <span className="input-label">Editing Expertise (Select at least 3) *</span>
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    <input
                      type="text"
                      value={currentSkill}
                      onChange={(e) => setCurrentSkill(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSkill(); } }}
                      placeholder="e.g. Color Grading, After Effects, Sound Design"
                      className="form-input"
                      style={{ borderColor: errors.skills ? T.error : T.border }}
                    />
                    <button
                      type="button"
                      onClick={handleAddSkill}
                      style={{
                        background: T.accent, border: "none", color: "#fff", padding: "0 14px",
                        borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  {errors.skills && <span className="error-text" style={{ marginBottom: 6 }}>{errors.skills}</span>}

                  {skills.length > 0 && (
                    <div className="skills-rack-container">
                      {skills.map((skill, idx) => (
                        <div key={idx} className="skill-config-row">
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#fff", flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                            {skill.name}
                          </span>

                          <select
                            value={skill.proficiency}
                            onChange={(e) => handleSkillChange(idx, "proficiency", e.target.value)}
                            className="skill-select-mini"
                          >
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                            <option value="Expert">Expert</option>
                          </select>

                          <select
                            value={skill.experience}
                            onChange={(e) => handleSkillChange(idx, "experience", parseInt(e.target.value))}
                            className="skill-select-mini"
                          >
                            <option value={1}>1 yr</option>
                            <option value={2}>2 yrs</option>
                            <option value={3}>3+ yrs</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(idx)}
                            style={{ background: "none", border: "none", color: T.dim, cursor: "pointer" }}
                            onMouseEnter={(e) => e.currentTarget.style.color = T.error}
                            onMouseLeave={(e) => e.currentTarget.style.color = T.dim}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 18, marginBottom: 32 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span className="input-label">Social Portfolio Channels</span>
                    <button
                      type="button"
                      onClick={handleAddSocialRow}
                      style={{ background: "none", border: "none", color: T.accent, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <Plus className="h-3 w-3" /> Add Platform
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {socials.map((social, idx) => (
                      <div key={idx} className="social-select-wrapper">
                        <select
                          value={social.platform}
                          onChange={(e) => handleSocialChange(idx, "platform", e.target.value)}
                          className="social-dropdown"
                          style={{ maxWidth: "120px" }}
                        >
                          <option value="YouTube">YouTube</option>
                          <option value="Instagram">Instagram</option>
                          <option value="TikTok">TikTok</option>
                          <option value="Vimeo">Vimeo</option>
                          <option value="Behance">Behance</option>
                          <option value="X">X (Twitter)</option>
                        </select>

                        <div style={{ position: "relative", flex: 2 }}>
                          <Link2 className="h-4 w-4" style={{ position: "absolute", left: 12, top: 14, color: T.dim }} />
                          <input
                            type="url"
                            value={social.url}
                            onChange={(e) => handleSocialChange(idx, "url", e.target.value)}
                            placeholder="https://..."
                            className="form-input"
                            style={{ paddingLeft: 36 }}
                          />
                        </div>

                        {socials.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSocialRow(idx)}
                            style={{ background: "none", border: "none", color: T.dim, cursor: "pointer" }}
                            onMouseEnter={(e) => e.currentTarget.style.color = T.error}
                            onMouseLeave={(e) => e.currentTarget.style.color = T.dim}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ================= ACTIONS FOOTER ================= */}
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
                  "Saving Profile..."
                ) : subStep === 1 ? (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Continue
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