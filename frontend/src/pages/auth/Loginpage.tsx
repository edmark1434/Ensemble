// LoginPage.jsx
// Ensemble — Login page

import { useState, useEffect } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { useGoogleAuth } from "./Oauth";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import useGlobalState from "@/lib/global_state";
import { API_BASE_URL } from "@/lib/api";
import { Eye, EyeOff } from "lucide-react";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:        "#080a12",
  bgPanel:   "#0d0f1a",
  bgInput:   "#13151f",
  border:    "#2a2d3e",
  borderFoc: "#4a6fa5",
  accent:    "#4a6fa5",
  text:      "#ffffff",
  muted:       "#888",
  dim:       "#555",
  error:     "#e05252",
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

// ─── Cinematic Video Background (right panel) ─────────────────────────────────
function VideoBg() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Native HTML5 Video Element pointing to public workspace folder */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none"
        style={{ filter: "brightness(0.35) contrast(1.05)" }}
      >
        <source src="/clip/login_bg_vid.mp4" type="video/mp4" /> {/* Referenced from public asset library */}
      </video>

      {/* Dark vignette blending mask layer ensuring premium text visibility */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(8,10,18,0.2) 0%, rgba(8,10,18,0.75) 100%)"
        }}
      />

      {/* Slowly Moving Accent Gradient Border Lines */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-cyan-500/30 via-yellow-500/30 to-purple-500/30 animate-gradient-gentle" />
      <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-500/30 via-yellow-500/30 to-cyan-500/30 animate-gradient-gentle-reverse" />
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
    const moveX = (e.clientX - centerX) / 50;
    const moveY = (e.clientY - centerY) / 50;
    setOffset({ x: moveX, y: moveY });
  };

  const handleMouseLeave = () => {
    setOffset({ x: 0, y: 0 });
    setIsHovered(false);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  return (
    <div
      className="relative z-10 flex flex-col items-center justify-center gap-5 transition-all duration-1000"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      style={{
        transform: `translate(${offset.x}px, ${offset.y}px)`,
      }}
    >
    </div>
  );
}

// ─── Input field with icon and show/hide password ─────────────────────────────
function Input({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  error,
  icon,
  showPasswordToggle = false,
  onTogglePassword
}: {
  label?: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  icon?: React.ReactNode;
  showPasswordToggle?: boolean;
  onTogglePassword?: () => void;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ marginBottom: 20 }}>
      {label && (
        <label style={{
          display: "block",
          color: focused ? T.accent : T.muted,
          fontSize: 12,
          fontWeight: 500,
          marginBottom: 8,
          transition: "color .15s",
          fontFamily: T.fontBody,
        }}>
          {label}
        </label>
      )}
      <div style={{ position: "relative" }}>
        {icon && (
          <div style={{
            position: "absolute",
            left: 14,
            top: "50%",
            transform: "translateY(-50%)",
            color: focused ? T.accent : T.muted,
            transition: "color .15s",
            zIndex: 1,
          }}>
            {icon}
          </div>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: "100%",
            padding: icon ? "12px 14px 12px 42px" : "12px 14px",
            paddingRight: showPasswordToggle ? "42px" : "14px",
            background: T.bgInput,
            border: `1px solid ${error ? T.error : focused ? T.borderFoc : T.border}`,
            borderRadius: 12,
            color: "#e2e8f0",
            fontSize: 14,
            outline: "none",
            fontFamily: T.fontBody,
            transition: "all .15s",
          }}
        />
        {showPasswordToggle && onTogglePassword && (
          <button
            type="button"
            onClick={onTogglePassword}
            style={{
              position: "absolute",
              right: 14,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: focused ? T.accent : T.muted,
              transition: "color .15s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1,
            }}
          >
            {type === "password" ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
      {error && (
        <p style={{ color: T.error, fontSize: 11, marginTop: 6, fontFamily: T.fontBody }}>{error}</p>
      )}
    </div>
  );
}

// ─── Primary button ───────────────────────────────────────────────────────────
function PrimaryBtn({ children, onClick, loading = false, fullWidth = false }: { children: React.ReactNode; onClick: () => void; loading?: boolean; fullWidth?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        background: loading ? "#555" : "#fff",
        color: "#080a12",
        border: "none",
        padding: "14px 24px",
        borderRadius: 30,
        fontWeight: 600,
        fontSize: 14,
        cursor: loading ? "not-allowed" : "pointer",
        width: fullWidth ? "100%" : "auto",
        fontFamily: T.fontBody,
        transition: "all .2s",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
      onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#e8e8e8"; }}
      onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = "#fff"; }}
    >
      {loading ? (
        <>
          <span style={{
            width: 16, height: 16,
            border: "2px solid #080a12",
            borderTopColor: "transparent",
            borderRadius: "50%",
            display: "inline-block",
            animation: "ens-spin .7s linear infinite",
          }} />
          Signing in…
        </>
      ) : children}
    </button>
  );
}

// ─── Google button ────────────────────────────────────────────────────────────
function GoogleBtn() {
  const handleGoogleSignIn = useGoogleAuth();
  return (
    <button
      onClick={handleGoogleSignIn}
      style={{
        width: "100%",
        padding: "12px 16px",
        background: T.bgInput,
        border: `1px solid ${T.border}`,
        borderRadius: 30,
        color: "#e2e8f0",
        fontSize: 13,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        fontWeight: 500,
        fontFamily: T.fontBody,
        transition: "all .2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#1a1d2e";
        e.currentTarget.style.borderColor = T.accent;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = T.bgInput;
        e.currentTarget.style.borderColor = T.border;
      }}
    >
      <svg width="18" height="18" viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      </svg>
      Continue with Google
    </button>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function Divider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0" }}>
      <div style={{ flex: 1, height: 1, background: T.border }} />
      <span style={{ color: T.muted, fontSize: 12, fontFamily: T.fontBody }}>or</span>
      <div style={{ flex: 1, height: 1, background: T.border }} />
    </div>
  );
}

// ─── LoginPage ────────────────────────────────────────────────────────────────
export default function LoginPage({
  onSuccess,
  onBack,
}: {
  onSuccess?: () => void;
  onForgotPassword?: () => void;
  onBack?: () => void;
} = {}) {
  interface LoginErrors {
    email?: string;
    password?: string;
  }
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState<LoginErrors>({});
  const [pageLoaded, setPageLoaded] = useState(false);
  const { setUser, setIsAuthenticated } = useGlobalState()
  const navigate = useNavigate();

  // Trigger page load animation
  useEffect(() => {
    const timer = setTimeout(() => setPageLoaded(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const validate = () => {
    const e: LoginErrors = {};
    if (!email)    e.email    = "Email or Username is required.";
    if (!password) e.password = "Password is required.";
    return e;
  };

  const handleSignIn = async() => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    try{
      const result = await axios.post(
        `${API_BASE_URL}/api/users/login`,
        { email, password },
        { withCredentials: true }
      );
      if(result.status === 200 && result.data.success){
        setUser(result.data.credentials ?? result.data.user);
        setIsAuthenticated(true);
        onSuccess?.();
      }else{
        setErrors({ password: result.data.message || "Login failed. Please try again." });
      }
    }catch(err){
      setLoading(false);
      if (axios.isAxiosError(err)) {
        setErrors({ password: err.response?.data?.message || "An error occurred. Please try again." });
      } else {
        setErrors({ password: "An error occurred. Please try again." });
      }
    }finally{
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") handleSignIn(); };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate("/");
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${T.bg}; font-family: ${T.fontBody}; -webkit-font-smoothing: antialiased; }
        
        @keyframes ens-spin { to { transform: rotate(360deg); } }
        
        /* Page Load Animation */
        @keyframes page-fade-in {
          0% { opacity: 0; transform: scale(0.98); }
          100% { opacity: 1; transform: scale(1); }
        }
        
        @keyframes slide-in-left {
          0% { opacity: 0; transform: translateX(-30px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes slide-in-right {
          0% { opacity: 0; transform: translateX(30px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        
        .page-container {
          animation: page-fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        .slide-in-left {
          animation: slide-in-left 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        .slide-in-right {
          animation: slide-in-right 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        .fade-in-up {
          animation: fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        /* Delay classes */
        .delay-100 { animation-delay: 0.1s; opacity: 0; animation-fill-mode: forwards; }
        .delay-200 { animation-delay: 0.2s; opacity: 0; animation-fill-mode: forwards; }
        .delay-300 { animation-delay: 0.3s; opacity: 0; animation-fill-mode: forwards; }
        .delay-400 { animation-delay: 0.4s; opacity: 0; animation-fill-mode: forwards; }
        .delay-500 { animation-delay: 0.5s; opacity: 0; animation-fill-mode: forwards; }
        
        @keyframes gradient-gentle {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes gradient-gentle-reverse {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        
        @keyframes pulse-gentle {
          0%, 100% { opacity: 0.12; transform: scale(1); }
          50% { opacity: 0.18; transform: scale(1.02); }
        }
        
        .animate-gradient-gentle {
          animation: gradient-gentle 12s ease-in-out infinite;
        }
        
        .animate-gradient-gentle-reverse {
          animation: gradient-gentle-reverse 12s ease-in-out infinite;
        }
        
        .animate-pulse-gentle {
          animation: pulse-gentle 10s ease-in-out infinite;
        }
      `}</style>

      <div className={`page-container ${pageLoaded ? 'opacity-100' : 'opacity-0'}`} style={{
        display: "flex",
        height: "100vh",
        background: T.bg,
        fontFamily: T.fontBody,
        position: "relative",
        overflow: "hidden",
      }}>

        {/* ── Left: Form panel ── */}
        <div className="slide-in-left" style={{
          width: "100%",
          maxWidth: 480,
          display: "flex",
          flexDirection: "column",
          padding: "48px 56px",
          overflowY: "auto",
          position: "relative",
          zIndex: 10,
          background: T.bg
        }}>

          {/* Back */}
          <button
            onClick={handleBack}
            className="fade-in-up delay-100"
            style={{
              background: "none",
              border: "none",
              color: T.muted,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: 0,
              marginBottom: 48,
              fontFamily: T.fontBody,
              transition: "color .15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#bbb")}
            onMouseLeave={(e) => (e.currentTarget.style.color = T.muted)}
          >
            ← Return
          </button>

          {/* Logo */}
          <div className="fade-in-up delay-200" style={{ marginBottom: 32 }}>
            <Logo size={32} />
          </div>

          {/* Heading */}
          <h1 className="fade-in-up delay-300" style={{
            fontFamily: T.fontDisplay,
            fontSize: 32,
            fontWeight: 700,
            color: T.text,
            marginBottom: 8,
            letterSpacing: -.5,
          }}>
            Welcome back
          </h1>
          <p className="fade-in-up delay-400" style={{ color: T.muted, fontSize: 14, marginBottom: 32, fontFamily: T.fontBody }}>
            Sign in to continue to Ensemble.
          </p>

          {/* Form */}
          <div className="fade-in-up delay-500" onKeyDown={handleKeyDown}>
            <Input
              label="Email or Username"
              type="text"
              placeholder="Enter your email or username"
              value={email}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              error={errors.email}
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              }
            />
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              error={errors.password}
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              }
              showPasswordToggle={true}
              onTogglePassword={toggleShowPassword}
            />
          </div>

          {/* Forgot password */}
          <div className="fade-in-up delay-500" style={{ textAlign: "right", marginBottom: 24 }}>
            <button
              onClick={() => navigate("/forgot-password")}
              style={{
                background: "none",
                border: "none",
                color: T.accent,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: T.fontBody,
                transition: "color .15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#7aadde")}
              onMouseLeave={(e) => (e.currentTarget.style.color = T.accent)}
            >
              Forgot password?
            </button>
          </div>

          {/* Sign in btn */}
          <div className="fade-in-up delay-500">
            <PrimaryBtn onClick={handleSignIn} loading={loading} fullWidth>
              Sign In
            </PrimaryBtn>
          </div>

          {/* Sign up link */}
          <p className="fade-in-up delay-500" style={{ color: T.dim, fontSize: 13, marginTop: 24, textAlign: "center", fontFamily: T.fontBody }}>
            Don't have an account?{" "}
            <button
              onClick={() => navigate('/signup')}
              style={{
                background: "none",
                border: "none",
                color: T.accent,
                fontSize: 13,
                cursor: "pointer",
                padding: 0,
                fontWeight: 500,
                fontFamily: T.fontBody,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#7aadde")}
              onMouseLeave={(e) => (e.currentTarget.style.color = T.accent)}
            >
              Sign up
            </button>
          </p>

          <Divider />
          <GoogleBtn />
        </div>

        {/* ── Right: Dynamic Video Player Layout Panel ── */}
        <div className="slide-in-right" style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
          background: T.bgPanel,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
        }}>
          <VideoBg /> {/* Dynamic asset wrapper component replaces vector circles */}
          <RightPanel />
        </div>

      </div>
    </>
  );
}