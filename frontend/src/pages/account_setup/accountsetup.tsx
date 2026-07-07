import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  Search,
  Compass,
  Plus,
  X,
  Globe,
  Mail,
  CheckCircle,
  Sparkles,
  User,
  Check,
} from "lucide-react";

// ─── Design tokens matching Signup Page ──────────────────────────────────────
const T = {
  bg:        "#080a12",
  bgPanel:   "#0d0f1a",
  bgInput:   "#13151f",
  border:    "#2a2d3e",
  borderFoc: "#4a6fa5",
  accent:    "#4a6fa5",
  text:      "#ffffff",
  muted:     "#888",
  dim:       "#555",
  error:     "#e05252",
  success:   "#52e0a0",
  fontDisplay: "'Plus Jakarta Sans', sans-serif",
  fontBody:    "'Plus Jakarta Sans', sans-serif",
};

type UserIntent = "freelancer" | "client" | "browser" | null;
type SkillLevel = "Beginner" | "Intermediate" | "Professional";

interface SkillItem {
  name: string;
  level: SkillLevel;
}

export default function AccountSetup() {
  const navigate = useNavigate();

  // Multi-step form routing logic states
  const [step, setStep] = useState<number>(1);
  const [intent, setIntent] = useState<UserIntent>(null);

  // Freelancer Profile Fields State
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [skillInput, setSkillInput] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<SkillLevel>("Intermediate");
  const [bio, setBio] = useState<string>("");
  const [socials, setSocials] = useState({ linkedin: "", twitter: "", portfolio: "" });

  // Verification Step Mock State
  const [emailVerified, setEmailVerified] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(false);

  // Form completion state
  const [submitting, setSubmitting] = useState<boolean>(false);

  // ─── Freelancer State Handlers ─────────────────────────────────────────────
  const addSkill = () => {
    if (!skillInput.trim()) return;
    if (skills.some(s => s.name.toLowerCase() === skillInput.trim().toLowerCase())) return;
    setSkills([...skills, { name: skillInput.trim(), level: selectedLevel }]);
    setSkillInput("");
  };

  const removeSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const handleVerifyEmail = () => {
    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      setEmailVerified(true);
    }, 1500); // Simulate network roundtrip latency
  };

  // ─── Step Navigation ───────────────────────────────────────────────────────
  const handleNextStep = () => {
    if (step === 1) {
      if (!intent) return;
      if (intent === "freelancer") {
        setStep(2); // Go to detailed freelancer profiling fields
      } else {
        // Clients & Casual Browsers skip the profile building section
        setStep(5);
      }
    } else {
      setStep(prev => prev + 1);
    }
  };

  const handleBackStep = () => {
    if (step === 5 && intent !== "freelancer") {
      setStep(1);
    } else {
      setStep(prev => prev - 1);
    }
  };

  const handleSubmitProfile = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      // Dummy success route forward
      navigate("/home");
    }, 2000);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: T.bg,
      color: T.text,
      fontFamily: T.fontBody,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Background Radial Glow */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "600px",
        height: "600px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(74,111,165,0.08) 0%, transparent 70%)",
        pointerEvents: "none"
      }} />

      <div style={{
        width: "100%",
        maxWidth: 600,
        background: T.bgPanel,
        border: `1px solid ${T.border}`,
        borderRadius: 24,
        padding: "48px 40px",
        boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
        position: "relative",
        zIndex: 10
      }}>

        {/* Header Indicator */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <span style={{ fontSize: 12, color: T.muted, fontFamily: T.fontDisplay, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
            Profile Configuration Status: <span style={{ color: T.accent }}>Initial Run</span>
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            {[1, 2, 3, 4, 5].map((i) => {
              // Highlight indicator state logic
              let isActive = false;
              if (intent !== "freelancer") {
                isActive = i === 1 || (step === 5 && i === 5);
              } else {
                isActive = i <= step;
              }
              return (
                <div key={i} style={{
                  width: 24,
                  height: 4,
                  borderRadius: 2,
                  background: isActive ? T.accent : T.border,
                  transition: "background .3s"
                }} />
              );
            })}
          </div>
        </div>

        {/* ─── STEP 1: CHOOSE INTENT ────────────────────────────────────────── */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 700, fontFamily: T.fontDisplay, marginBottom: 8, letterSpacing: "-0.5px" }}>
              Welcome! How do you plan to use Ensemble?
            </h2>
            <p style={{ color: T.muted, fontSize: 14, marginBottom: 32 }}>
              Choose your focus area. We will optimize your dashboard preferences based on this configuration.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
              {/* Option A: Freelancer */}
              <div
                onClick={() => setIntent("freelancer")}
                style={{
                  padding: 20,
                  borderRadius: 16,
                  background: T.bgInput,
                  border: `2px solid ${intent === "freelancer" ? T.accent : T.border}`,
                  cursor: "pointer",
                  display: "flex",
                  gap: 16,
                  alignItems: "center",
                  transition: "all 0.2s"
                }}
              >
                <div style={{ background: intent === "freelancer" ? "rgba(74,111,165,0.15)" : "#1d2030", padding: 12, borderRadius: 12, color: intent === "freelancer" ? T.accent : T.muted }}>
                  <Briefcase size={24} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 600, fontSize: 16, color: T.text, marginBottom: 2 }}>To earn money from clients</h4>
                  <p style={{ fontSize: 13, color: T.muted }}>I am a freelance editor or developer looking to fulfill workspace contracts.</p>
                </div>
              </div>

              {/* Option B: Client */}
              <div
                onClick={() => setIntent("client")}
                style={{
                  padding: 20,
                  borderRadius: 16,
                  background: T.bgInput,
                  border: `2px solid ${intent === "client" ? T.accent : T.border}`,
                  cursor: "pointer",
                  display: "flex",
                  gap: 16,
                  alignItems: "center",
                  transition: "all 0.2s"
                }}
              >
                <div style={{ background: intent === "client" ? "rgba(74,111,165,0.15)" : "#1d2030", padding: 12, borderRadius: 12, color: intent === "client" ? T.accent : T.muted }}>
                  <Search size={24} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 600, fontSize: 16, color: T.text, marginBottom: 2 }}>To seek services from creators</h4>
                  <p style={{ fontSize: 13, color: T.muted }}>I am a manager or producer building groups and posting project contracts.</p>
                </div>
              </div>

              {/* Option C: Casual Exploration */}
              <div
                onClick={() => setIntent("browser")}
                style={{
                  padding: 20,
                  borderRadius: 16,
                  background: T.bgInput,
                  border: `2px solid ${intent === "browser" ? T.accent : T.border}`,
                  cursor: "pointer",
                  display: "flex",
                  gap: 16,
                  alignItems: "center",
                  transition: "all 0.2s"
                }}
              >
                <div style={{ background: intent === "browser" ? "rgba(74,111,165,0.15)" : "#1d2030", padding: 12, borderRadius: 12, color: intent === "browser" ? T.accent : T.muted }}>
                  <Compass size={24} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 600, fontSize: 16, color: T.text, marginBottom: 2 }}>To casually browse and explore</h4>
                  <p style={{ fontSize: 13, color: T.muted }}>I just want to evaluate the asset libraries, forums, and interact organically.</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleNextStep}
              disabled={!intent}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 30,
                border: "none",
                background: !intent ? T.dim : "#fff",
                color: T.bg,
                fontWeight: 600,
                fontSize: 14,
                cursor: !intent ? "not-allowed" : "pointer",
                transition: "all 0.2s"
              }}
            >
              Continue Setup
            </button>
          </div>
        )}

        {/* ─── STEP 2: FREELANCER SKILLS ─────────────────────────────────────── */}
        {step === 2 && intent === "freelancer" && (
          <div>
            <h2 style={{ fontSize: 26, fontWeight: 700, fontFamily: T.fontDisplay, marginBottom: 8 }}>
              What are your key creative skills?
            </h2>
            <p style={{ color: T.muted, fontSize: 14, marginBottom: 24 }}>
              List the primary development stack or production talents you bring to collaborative projects.
            </p>

            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <input
                type="text"
                placeholder="e.g. React.js, Video Editing, Laravel"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSkill()}
                style={{
                  flex: 1,
                  background: T.bgInput,
                  border: `1px solid ${T.border}`,
                  borderRadius: 12,
                  padding: "12px 14px",
                  color: "#fff",
                  fontSize: 14,
                  outline: "none"
                }}
              />
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value as SkillLevel)}
                style={{
                  background: T.bgInput,
                  border: `1px solid ${T.border}`,
                  borderRadius: 12,
                  padding: "0 10px",
                  color: "#fff",
                  fontSize: 13,
                  outline: "none"
                }}
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Professional">Professional</option>
              </select>
              <button
                onClick={addSkill}
                style={{
                  background: T.accent,
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  width: 44,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer"
                }}
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Added Skills List Container */}
            <div style={{
              minHeight: 120,
              background: T.bgInput,
              border: `1px solid ${T.border}`,
              borderRadius: 16,
              padding: 16,
              marginBottom: 32,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignContent: "flex-start"
            }}>
              {skills.length === 0 ? (
                <p style={{ color: T.dim, fontSize: 13, margin: "auto" }}>No skills added yet.</p>
              ) : (
                skills.map((s, index) => (
                  <div key={index} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "#1c1e2e",
                    border: `1px solid ${T.border}`,
                    padding: "6px 12px",
                    borderRadius: 20,
                    fontSize: 12
                  }}>
                    <span>{s.name}</span>
                    <span style={{
                      fontSize: 10,
                      background: s.level === "Professional" ? "rgba(82,224,160,0.15)" : s.level === "Intermediate" ? "rgba(74,111,165,0.15)" : "rgba(136,136,136,0.15)",
                      color: s.level === "Professional" ? T.success : s.level === "Intermediate" ? "#7aadde" : T.muted,
                      padding: "2px 6px",
                      borderRadius: 4,
                      fontWeight: 600
                    }}>{s.level}</span>
                    <X size={12} style={{ cursor: "pointer", color: T.muted }} onClick={() => removeSkill(index)} />
                  </div>
                ))
              )}
            </div>

            {/* Nav Row */}
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={handleBackStep} style={{ flex: 1, padding: 14, borderRadius: 30, border: `1px solid ${T.border}`, background: "transparent", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
                Back
              </button>
              <button onClick={handleNextStep} style={{ flex: 2, padding: 14, borderRadius: 30, border: "none", background: "#fff", color: T.bg, fontWeight: 600, cursor: "pointer" }}>
                Next Step
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: ACCOUNT DESCRIPTION / BIO ─────────────────────────────── */}
        {step === 3 && intent === "freelancer" && (
          <div>
            <h2 style={{ fontSize: 26, fontWeight: 700, fontFamily: T.fontDisplay, marginBottom: 8 }}>
              Introduce yourself to clients
            </h2>
            <p style={{ color: T.muted, fontSize: 14, marginBottom: 24 }}>
              Write a short professional summary or portfolio summary bio description detailing your project goals.
            </p>

            <div style={{ marginBottom: 32 }}>
              <textarea
                placeholder="Hi, I am a software engineering candidate building robust interactive web solutions..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={400}
                rows={5}
                style={{
                  width: "100%",
                  background: T.bgInput,
                  border: `1px solid ${T.border}`,
                  borderRadius: 16,
                  padding: 16,
                  color: "#fff",
                  fontSize: 14,
                  outline: "none",
                  resize: "none",
                  fontFamily: T.fontBody,
                  lineHeight: 1.5
                }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                <span style={{ fontSize: 11, color: T.dim }}>{bio.length}/400 characters</span>
              </div>
            </div>

            {/* Nav Row */}
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={handleBackStep} style={{ flex: 1, padding: 14, borderRadius: 30, border: `1px solid ${T.border}`, background: "transparent", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
                Back
              </button>
              <button onClick={handleNextStep} style={{ flex: 2, padding: 14, borderRadius: 30, border: "none", background: "#fff", color: T.bg, fontWeight: 600, cursor: "pointer" }}>
                Next Step
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 4: SOCIAL LINKS ─────────────────────────────────────────── */}
        {step === 4 && intent === "freelancer" && (
          <div>
            <h2 style={{ fontSize: 26, fontWeight: 700, fontFamily: T.fontDisplay, marginBottom: 8 }}>
              Link your developer platforms
            </h2>
            <p style={{ color: T.muted, fontSize: 14, marginBottom: 24 }}>
              Connect external networks to authorize secure cross-platform channel identification for clients.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
              {/* LinkedIn Row */}
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: T.muted }}><Linkedin size={16} /></div>
                <input
                  type="text"
                  placeholder="LinkedIn Profile URL"
                  value={socials.linkedin}
                  onChange={(e) => setSocials({ ...socials, linkedin: e.target.value })}
                  style={{ width: "100%", background: T.bgInput, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px 12px 42px", color: "#fff", fontSize: 14, outline: "none" }}
                />
              </div>

              {/* Twitter Row */}
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: T.muted }}><Twitter size={16} /></div>
                <input
                  type="text"
                  placeholder="Twitter / X Profile URL"
                  value={socials.twitter}
                  onChange={(e) => setSocials({ ...socials, twitter: e.target.value })}
                  style={{ width: "100%", background: T.bgInput, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px 12px 42px", color: "#fff", fontSize: 14, outline: "none" }}
                />
              </div>

              {/* Portfolio Web Link */}
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: T.muted }}><Globe size={16} /></div>
                <input
                  type="text"
                  placeholder="Personal Portfolio Web URL"
                  value={socials.portfolio}
                  onChange={(e) => setSocials({ ...socials, portfolio: e.target.value })}
                  style={{ width: "100%", background: T.bgInput, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px 12px 42px", color: "#fff", fontSize: 14, outline: "none" }}
                />
              </div>
            </div>

            {/* Nav Row */}
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={handleBackStep} style={{ flex: 1, padding: 14, borderRadius: 30, border: `1px solid ${T.border}`, background: "transparent", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
                Back
              </button>
              <button onClick={handleNextStep} style={{ flex: 2, padding: 14, borderRadius: 30, border: "none", background: "#fff", color: T.bg, fontWeight: 600, cursor: "pointer" }}>
                Next Step
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 5: VERIFY EMAIL ADDRESS & SUMMARY ────────────────────────── */}
        {step === 5 && (
          <div>
            <h2 style={{ fontSize: 26, fontWeight: 700, fontFamily: T.fontDisplay, marginBottom: 8 }}>
              Verify your security credentials
            </h2>
            <p style={{ color: T.muted, fontSize: 14, marginBottom: 28 }}>
              An authentication challenge was sent during configuration. Confirm registration parameters to complete access setup.
            </p>

            {/* Verification State Box */}
            <div style={{
              background: T.bgInput,
              border: `1px solid ${emailVerified ? T.success + "30" : T.border}`,
              borderRadius: 16,
              padding: "24px 20px",
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 32
            }}>
              <div style={{
                background: emailVerified ? "rgba(82,224,160,0.1)" : "rgba(74,111,165,0.1)",
                color: emailVerified ? T.success : T.accent,
                padding: 12,
                borderRadius: "50%"
              }}>
                {emailVerified ? <CheckCircle size={24} /> : <Mail size={24} />}
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>
                  {emailVerified ? "Secure Verification Passed" : "Pending Email Verification"}
                </h4>
                <p style={{ fontSize: 12, color: T.muted }}>
                  {emailVerified ? "Your identity credentials are safe and active." : "Confirm your account access parameters directly."}
                </p>
              </div>
              {!emailVerified && (
                <button
                  onClick={handleVerifyEmail}
                  disabled={verifying}
                  style={{
                    background: T.accent,
                    color: "#fff",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: verifying ? "not-allowed" : "pointer"
                  }}
                >
                  {verifying ? "Verifying..." : "Verify Mock"}
                </button>
              )}
            </div>

            {/* Quick Profile Overview Summary Info Container */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${T.border}`, borderRadius: 16, padding: 20, marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <Sparkles size={16} style={{ color: T.accent }} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>Configuration Summary</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12, color: T.muted }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Account Intent Classification:</span>
                  <span style={{ color: "#fff", fontWeight: 500, textTransform: "capitalize" }}>{intent}</span>
                </div>
                {intent === "freelancer" && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Skills Cataloged:</span>
                      <span style={{ color: "#fff", fontWeight: 500 }}>{skills.length} Items Selected</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Description Status:</span>
                      <span style={{ color: bio ? T.success : T.error }}>{bio ? "Populated" : "Empty Profile Bio"}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Action Row Buttons */}
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={handleBackStep} disabled={submitting} style={{ flex: 1, padding: 14, borderRadius: 30, border: `1px solid ${T.border}`, background: "transparent", color: "#fff", fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer" }}>
                Back
              </button>
              <button
                onClick={handleSubmitProfile}
                disabled={submitting || (!emailVerified && intent === "freelancer")}
                style={{
                  flex: 2,
                  padding: 14,
                  borderRadius: 30,
                  border: "none",
                  background: (submitting || (!emailVerified && intent === "freelancer")) ? T.dim : "#fff",
                  color: T.bg,
                  fontWeight: 600,
                  cursor: (submitting || (!emailVerified && intent === "freelancer")) ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8
                }}
              >
                {submitting ? (
                  <>
                    <span style={{ width: 14, height: 14, border: `2px solid ${T.bg}`, borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "ens-spin .7s linear infinite" }} />
                    Finalizing Account...
                  </>
                ) : (
                  <>
                    <Check size={16} /> Finish Setup
                  </>
                )}
              </button>
            </div>
            {!emailVerified && intent === "freelancer" && (
              <p style={{ color: T.error, fontSize: 11, textAlign: "center", marginTop: 12 }}>
                * Mock email verification must be confirmed to allow freelancer status deployment.
              </p>
            )}
          </div>
        )}

      </div>

      <style>{`
        @keyframes ens-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}