// src/pages/auth/ResetPasswordPage.tsx
import { useState, useEffect, useCallback } from "react";
import { Lock, Eye, EyeOff, CheckCircle, Shield, Sparkles } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

// ─── Design tokens ────────────────────────────────────────────────────────────
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

// ─── Shared Components ────────────────────────────────────────────────────────
function Logo({ size = 28 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
      <img src="/ensemble_lg.svg" alt="Ensemble Logo" style={{ width: size, height: size }} />
      <span style={{ fontSize: size - 6, fontWeight: 700, fontFamily: T.fontDisplay, letterSpacing: .5, color: T.text }}>
        Ensemble
      </span>
    </div>
  );
}

function AnimatedBg() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute top-20 left-10 w-96 h-96 rounded-full bg-cyan-500/15 blur-3xl animate-float-gentle" />
      <div className="absolute top-1/3 right-10 w-80 h-80 rounded-full bg-yellow-500/12 blur-3xl animate-float-gentle-delayed" />
      <div className="absolute bottom-20 left-1/4 w-96 h-96 rounded-full bg-purple-500/15 blur-3xl animate-float-gentle-slow" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-500/8 blur-3xl animate-pulse-gentle" />

      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-500/30 via-yellow-500/30 to-purple-500/30 animate-gradient-gentle" />
      <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500/30 via-yellow-500/30 to-cyan-500/30 animate-gradient-gentle-reverse" />

      {[...Array(50)].map((_, i) => (
        <div key={i} className="absolute w-0.5 h-0.5 bg-white/10 rounded-full animate-float-particle-gentle"
          style={{ top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 15}s`, animationDuration: `${20 + Math.random() * 20}s` }}
        />
      ))}
    </div>
  );
}

function RightPanel() {
  const [isHovered, setIsHovered] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setOffset({ x: (e.clientX - (rect.left + rect.width / 2)) / 50, y: (e.clientY - (rect.top + rect.height / 2)) / 50 });
  };

  return (
    <div className="relative z-10 flex flex-col items-center justify-center gap-5 transition-all duration-1000"
      onMouseMove={handleMouseMove} onMouseLeave={() => { setOffset({ x: 0, y: 0 }); setIsHovered(false); }} onMouseEnter={() => setIsHovered(true)}
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}>
      <div className={`relative transition-all duration-1000 ${isHovered ? 'scale-105' : 'scale-100'}`}>
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/15 via-yellow-500/15 to-purple-500/15 blur-xl animate-pulse-gentle" />
        <img src="/ensemble_lg.svg" alt="Ensemble Logo" className="relative w-14 h-14" />
      </div>
      <div className="text-center space-y-1.5">
        <h2 className={`text-xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent transition-all duration-1000 ${isHovered ? 'tracking-wider' : 'tracking-normal'}`}>Ensemble</h2>
        <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">The parallel workflow platform for modern film production teams.</p>
      </div>
      <div className={`h-px bg-gradient-to-r from-cyan-500/50 via-yellow-500/50 to-purple-500/50 transition-all duration-1000 ${isHovered ? 'w-28' : 'w-12'}`} />
    </div>
  );
}

// ─── Password Strength Meter ──────────────────────────────────────────────────
function StrengthMeter({ password }: { password: string }) {
  const score = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["#2a2d3e", "#e05252", "#f0a43a", "#4a9eff", "#52e0a0"];

  if (!password) return null;
  return (
    <div style={{ marginTop: -8, marginBottom: 14 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 5 }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= score ? colors[score] : "#2a2d3e", transition: "background .25s" }} />
        ))}
      </div>
      <span style={{ fontSize: 11, color: colors[score], fontFamily: T.fontBody }}>{labels[score]}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);

  useEffect(() => {
    setTimeout(() => setPageLoaded(true), 50);
      // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!token) setError("Invalid or expired reset token.");
  }, [token]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");

    setLoading(true);
    setError("");

    // Simulate API delay
    setTimeout(() => {
        setLoading(false);
        setSubmitted(true);
    }, 1500);
  }, [password, confirmPassword]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${T.bg}; font-family: ${T.fontBody}; -webkit-font-smoothing: antialiased; }
        @keyframes page-fade-in { 0% { opacity: 0; transform: scale(0.98); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes slide-in-left { 0% { opacity: 0; transform: translateX(-30px); } 100% { opacity: 1; transform: translateX(0); } }
        @keyframes slide-in-right { 0% { opacity: 0; transform: translateX(30px); } 100% { opacity: 1; transform: translateX(0); } }
        @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
        .page-container { animation: page-fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .slide-in-left { animation: slide-in-left 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .slide-in-right { animation: slide-in-right 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .fade-in-up { animation: fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes float-gentle { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(15px, -10px) scale(1.08); } 66% { transform: translate(-10px, 8px) scale(0.96); } }
        @keyframes gradient-gentle { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes gradient-gentle-reverse { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        @keyframes float-particle-gentle { 0% { transform: translateY(0) translateX(0); opacity: 0; } 50% { opacity: 0.4; } 100% { transform: translateY(-100vh) translateX(80px); opacity: 0; } }
        @keyframes pulse-gentle { 0%, 100% { opacity: 0.08; transform: scale(1); } 50% { opacity: 0.12; transform: scale(1.02); } }
        .animate-float-gentle { animation: float-gentle 14s ease-in-out infinite; }
        .animate-gradient-gentle { animation: gradient-gentle 12s ease-in-out infinite; }
        .animate-gradient-gentle-reverse { animation: gradient-gentle-reverse 12s ease-in-out infinite; }
        .animate-float-particle-gentle { animation: float-particle-gentle linear infinite; }
        .animate-pulse-gentle { animation: pulse-gentle 10s ease-in-out infinite; }
        .delay-100 { animation-delay: 0.1s; opacity: 0; animation-fill-mode: forwards; }
        .delay-200 { animation-delay: 0.2s; opacity: 0; animation-fill-mode: forwards; }
        .delay-300 { animation-delay: 0.3s; opacity: 0; animation-fill-mode: forwards; }
      `}</style>

      <div className={`page-container ${pageLoaded ? 'opacity-100' : 'opacity-0'}`} style={{ display: "flex", height: "100vh", background: T.bg, fontFamily: T.fontBody, overflow: "hidden" }}>

        {/* ── Left Section: Form ── */}
        <div className="slide-in-left" style={{ width: "100%", maxWidth: 520, padding: "48px 56px", display: "flex", flexDirection: "column", zIndex: 10 }}>
          <button onClick={() => navigate("/login")} className="fade-in-up delay-100" style={{ background: "none", border: "none", color: T.muted, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginBottom: 32 }}>
            ← Return to Login
          </button>

          <div className="fade-in-up delay-200" style={{ marginBottom: 24 }}><Logo size={32} /></div>

          {!submitted ? (
            <div className="fade-in-up delay-300">
              <h1 style={{ fontSize: 32, fontWeight: 700, color: T.text, marginBottom: 8, letterSpacing: -.5 }}>Reset Password</h1>
              <p style={{ color: T.muted, fontSize: 14, marginBottom: 32 }}>Set a new secure password for your Ensemble account.</p>

              <form onSubmit={handleSubmit}>
                {/* New Password */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", color: T.muted, fontSize: 12, fontWeight: 500, marginBottom: 8 }}>New Password</label>
                  <div style={{ position: "relative" }}>
                    <Lock size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: T.muted }} />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{ width: "100%", padding: "12px 14px 12px 42px", background: T.bgInput, border: `1px solid ${T.border}`, borderRadius: 12, color: "#e2e8f0", fontSize: 14, outline: "none" }}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: T.muted, cursor: "pointer" }}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <StrengthMeter password={password} />

                {/* Confirm Password */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", color: T.muted, fontSize: 12, fontWeight: 500, marginBottom: 8 }}>Confirm Password</label>
                  <div style={{ position: "relative" }}>
                    <Shield size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: T.muted }} />
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{ width: "100%", padding: "12px 14px 12px 42px", background: T.bgInput, border: `1px solid ${T.border}`, borderRadius: 12, color: "#e2e8f0", fontSize: 14, outline: "none" }}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: T.muted, cursor: "pointer" }}>
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {error && <p style={{ color: T.error, fontSize: 11, marginTop: 8 }}>{error}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading || !token}
                  style={{ width: "100%", background: loading ? "#555" : "#fff", color: "#080a12", border: "none", padding: "14px", borderRadius: 30, fontWeight: 600, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  {loading ? "Updating..." : "Update Password"} <Sparkles size={16} />
                </button>
              </form>
            </div>
          ) : (
            <div className="fade-in-up delay-200" style={{ textAlign: "center", marginTop: 20 }}>
              <div style={{ width: 64, height: 64, background: "rgba(82, 224, 160, 0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
                <CheckCircle size={32} color={T.success} />
              </div>
              <h2 style={{ color: T.text, fontSize: 24, marginBottom: 12 }}>Password Updated</h2>
              <p style={{ color: T.muted, fontSize: 14, marginBottom: 32 }}>Your credentials have been successfully reset. You can now use your new password to sign in.</p>
              <button onClick={() => navigate("/login")} style={{ width: "100%", background: "#fff", color: "#080a12", border: "none", padding: "14px", borderRadius: 30, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Return to Login</button>
            </div>
          )}
        </div>

        {/* ── Right Section: Decorative ── */}
        <div className="slide-in-right" style={{ flex: 1, position: "relative", overflow: "hidden", background: T.bgPanel, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <AnimatedBg />
          <RightPanel />
        </div>

      </div>
    </>
  );
}