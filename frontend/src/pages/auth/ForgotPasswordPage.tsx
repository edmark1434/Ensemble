// src/pages/auth/ForgotPasswordPage.tsx
import { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import { Mail, CheckCircle, Shield } from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

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

// ─── Logo ─────────────────────────────────────────────────────────────────────
function Logo({ size = 28 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
      <img
        src="/ensemble_lg.svg"
        alt="Ensemble Logo"
        style={{ width: size, height: size }}
      />
      <span style={{ fontSize: size - 6, fontWeight: 700, fontFamily: T.fontDisplay, letterSpacing: .5, color: T.text }}>
        Ensemble
      </span>
    </div>
  );
}

// ─── Animated Background ──────────────────────────────────────────────────────
function AnimatedBg() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Moving Color Blurs */}
      <div className="absolute top-20 left-10 w-96 h-96 rounded-full bg-cyan-500/15 blur-3xl animate-float-gentle" />
      <div className="absolute top-1/3 right-10 w-80 h-80 rounded-full bg-yellow-500/12 blur-3xl animate-float-gentle-delayed" />
      <div className="absolute bottom-20 left-1/4 w-96 h-96 rounded-full bg-purple-500/15 blur-3xl animate-float-gentle-slow" />
      <div className="absolute top-1/2 right-1/3 w-80 h-80 rounded-full bg-pink-500/12 blur-3xl animate-float-gentle-very-slow" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-500/8 blur-3xl animate-pulse-gentle" />

      {/* Moving Gradient borderlines (The "m lines") */}
      <div className="absolute top-0 left-0 w-full h-2 overflow-hidden">
        <div className="w-full h-full bg-gradient-to-r from-cyan-500/30 via-yellow-500/30 to-purple-500/30 animate-gradient-gentle" />
      </div>
      <div className="absolute bottom-0 left-0 w-full h-2 overflow-hidden">
        <div className="w-full h-full bg-gradient-to-r from-purple-500/30 via-yellow-500/30 to-cyan-500/30 animate-gradient-gentle-reverse" />
      </div>

      {/* Particles */}
      {[...Array(50)].map((_, i) => (
        <div
          key={i}
          className="absolute w-0.5 h-0.5 bg-white/10 rounded-full animate-float-particle-gentle"
          style={{
              // eslint-disable-next-line react-hooks/purity
            top: `${Math.random() * 100}%`,
              // eslint-disable-next-line react-hooks/purity
            left: `${Math.random() * 100}%`,
              // eslint-disable-next-line react-hooks/purity
            animationDelay: `${Math.random() * 15}s`,
              // eslint-disable-next-line react-hooks/purity
            animationDuration: `${20 + Math.random() * 20}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Right Panel Content ──────────────────────────────────────────────────────
function RightPanel() {
  const [isHovered, setIsHovered] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    setOffset({ x: (e.clientX - centerX) / 50, y: (e.clientY - centerY) / 50 });
  };

  return (
    <div
      className="relative z-10 flex flex-col items-center justify-center gap-5 transition-all duration-1000"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { setOffset({ x: 0, y: 0 }); setIsHovered(false); }}
      onMouseEnter={() => setIsHovered(true)}
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
    >
      <div className={`relative transition-all duration-1000 ${isHovered ? 'scale-105' : 'scale-100'}`}>
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/15 via-yellow-500/15 to-purple-500/15 blur-xl animate-pulse-gentle" />
        <img src="/ensemble_lg.svg" alt="Ensemble Logo" className="relative w-14 h-14" />
      </div>
      <div className="text-center space-y-1.5">
        <h2 className={`text-xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent transition-all duration-1000 ${isHovered ? 'tracking-wider' : 'tracking-normal'}`}>
          Ensemble
        </h2>
        <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
          The parallel workflow platform for modern film production teams.
        </p>
      </div>
      <div className={`h-px bg-gradient-to-r from-cyan-500/50 via-yellow-500/50 to-purple-500/50 transition-all duration-1000 ${isHovered ? 'w-28' : 'w-12'}`} />
    </div>
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────
export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pageLoaded, setPageLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setPageLoaded(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async () => {
    if (!email) return setError("Email is required.");
    if (!/\S+@\S+\.\S+/.test(email)) return setError("Please enter a valid email.");

    setLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_BASE_URL}/api/users/forgot-password`, { email });
      if (res.data.success) setSubmitted(true);
      else setError(res.data.message || "Something went wrong.");
    } catch (err: any) {
      setError(err.response?.data?.message || "Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${T.bg}; font-family: ${T.fontBody}; -webkit-font-smoothing: antialiased; }
        
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes float-gentle {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(15px, -10px) scale(1.08); }
          66% { transform: translate(-10px, 8px) scale(0.96); }
        }
        
        @keyframes gradient-gentle {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes gradient-gentle-reverse {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        
        @keyframes float-particle-gentle {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          50% { opacity: 0.4; }
          100% { transform: translateY(-100vh) translateX(80px); opacity: 0; }
        }
        
        @keyframes pulse-gentle {
          0%, 100% { opacity: 0.08; transform: scale(1); }
          50% { opacity: 0.12; transform: scale(1.02); }
        }

        .fade-in-up { animation: fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-float-gentle { animation: float-gentle 14s ease-in-out infinite; }
        .animate-gradient-gentle { animation: gradient-gentle 12s ease-in-out infinite; }
        .animate-gradient-gentle-reverse { animation: gradient-gentle-reverse 12s ease-in-out infinite; }
        .animate-float-particle-gentle { animation: float-particle-gentle linear infinite; }
        .animate-pulse-gentle { animation: pulse-gentle 10s ease-in-out infinite; }
        
        .delay-100 { animation-delay: 0.1s; opacity: 0; animation-fill-mode: forwards; }
        .delay-200 { animation-delay: 0.2s; opacity: 0; animation-fill-mode: forwards; }
        .delay-300 { animation-delay: 0.3s; opacity: 0; animation-fill-mode: forwards; }
      `}</style>

      <div style={{
        display: "flex", height: "100vh", background: T.bg, opacity: pageLoaded ? 1 : 0, transition: "opacity 0.5s", overflow: "hidden"
      }}>

        {/* Left Side: Form */}
        <div style={{ width: "100%", maxWidth: 480, padding: "48px 56px", display: "flex", flexDirection: "column", zIndex: 10 }}>
          <button
            onClick={() => navigate("/login")}
            className="fade-in-up delay-100"
            style={{ background: "none", border: "none", color: T.muted, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginBottom: 48 }}
          >
            ← Return to Login
          </button>

          <div className="fade-in-up delay-200" style={{ marginBottom: 32 }}>
            <Logo size={32} />
          </div>

          {!submitted ? (
            <div className="fade-in-up delay-300">
              <h1 style={{ fontSize: 32, fontWeight: 700, color: T.text, marginBottom: 8, letterSpacing: -.5 }}>Forgot Password</h1>
              <p style={{ color: T.muted, fontSize: 14, marginBottom: 32 }}>Enter your email address to receive a recovery link.</p>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", color: T.muted, fontSize: 12, fontWeight: 500, marginBottom: 8 }}>Email Address</label>
                <div style={{ position: "relative" }}>
                  <Mail size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: T.muted }} />
                  <input
                    type="email"
                    placeholder="you@studio.com"
                    value={email}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => { setEmail(e.target.value); setError(""); }}
                    style={{
                      width: "100%", padding: "12px 14px 12px 42px", background: T.bgInput,
                      border: `1px solid ${error ? T.error : T.border}`, borderRadius: 12, color: "#e2e8f0", fontSize: 14, outline: "none"
                    }}
                  />
                </div>
                {error && <p style={{ color: T.error, fontSize: 11, marginTop: 6 }}>{error}</p>}
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  width: "100%", background: "#fff", color: "#080a12", border: "none", padding: "14px", borderRadius: 30, fontWeight: 600, fontSize: 14, cursor: loading ? "not-allowed" : "pointer"
                }}
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>

              <div style={{ marginTop: 24, textAlign: "center" }}>
                <p style={{ color: T.dim, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  <Shield size={12} /> Secure Account Recovery
                </p>
              </div>
            </div>
          ) : (
            <div className="fade-in-up" style={{ textAlign: "center", marginTop: 20 }}>
              <div style={{ width: 64, height: 64, background: "rgba(82, 224, 160, 0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
                <CheckCircle size={32} color={T.success} />
              </div>
              <h2 style={{ color: T.text, fontSize: 24, marginBottom: 12 }}>Check your inbox</h2>
              <p style={{ color: T.muted, fontSize: 14, lineHeight: "1.6", marginBottom: 32 }}>
                We've sent a recovery link to <br /><b style={{ color: T.text }}>{email}</b>
              </p>
              <button
                onClick={() => setSubmitted(false)}
                style={{ background: "none", border: `1px solid ${T.border}`, color: T.text, padding: "12px 24px", borderRadius: 30, fontSize: 13, cursor: "pointer" }}
              >
                Try another email
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Decorative Panel */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden", background: T.bgPanel, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <AnimatedBg />
          <RightPanel />
        </div>
      </div>
    </>
  );
}