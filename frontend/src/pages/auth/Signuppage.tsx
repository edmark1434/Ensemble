// SignupPage.jsx
// Ensemble — Sign Up page

import { useState, useEffect, useCallback } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useGoogleAuth } from "./Oauth";
import axios from "axios";
import useGlobalState from "@/lib/global_state";
import { Eye, EyeOff, User, Mail, Lock, UserCheck } from "lucide-react";

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

// ─── Slowly Moving Animated Background (right panel) ──────────────────────────
function AnimatedBg() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Slowly Moving Color Blurs */}
      <div className="absolute top-20 left-10 w-96 h-96 rounded-full bg-cyan-500/15 blur-3xl animate-float-gentle" />
      <div className="absolute top-1/3 right-10 w-80 h-80 rounded-full bg-yellow-500/12 blur-3xl animate-float-gentle-delayed" />
      <div className="absolute bottom-20 left-1/4 w-96 h-96 rounded-full bg-purple-500/15 blur-3xl animate-float-gentle-slow" />
      <div className="absolute top-1/2 right-1/3 w-80 h-80 rounded-full bg-pink-500/12 blur-3xl animate-float-gentle-very-slow" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-500/8 blur-3xl animate-pulse-gentle" />

      {/* Slowly Moving Gradient Border Lines */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-500/30 via-yellow-500/30 to-purple-500/30 animate-gradient-gentle" />
      <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500/30 via-yellow-500/30 to-cyan-500/30 animate-gradient-gentle-reverse" />

      {/* Gentle Floating Particles */}
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
      {/* Animated Logo Container */}
      <div className={`relative transition-all duration-1000 ${isHovered ? 'scale-105' : 'scale-100'}`}>
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/15 via-yellow-500/15 to-purple-500/15 blur-xl animate-pulse-gentle" />
        <img
          src="/ensemble_lg.svg"
          alt="Ensemble Logo"
          className="relative w-14 h-14"
        />
      </div>

      {/* Animated Text */}
      <div className="text-center space-y-1.5">
        <h2
          className={`text-xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent transition-all duration-1000 ${
            isHovered ? 'tracking-wider' : 'tracking-normal'
          }`}
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Ensemble
        </h2>
        <p
          className="text-xs text-zinc-400 max-w-xs leading-relaxed transition-all duration-1000"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          The parallel workflow platform for modern film production teams.
        </p>
      </div>

      {/* Decorative line */}
      <div className={`h-px bg-gradient-to-r from-cyan-500/50 via-yellow-500/50 to-purple-500/50 transition-all duration-1000 ${
        isHovered ? 'w-28' : 'w-12'
      }`} />
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

// ─── Password strength meter ──────────────────────────────────────────────────
function StrengthMeter({ password }: { password: string }) {
  const score = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8)  s++;
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
          <div key={i} style={{
            flex: 1,
            height: 3,
            borderRadius: 2,
            background: i <= score ? colors[score] : "#2a2d3e",
            transition: "background .25s",
          }} />
        ))}
      </div>
      <span style={{ fontSize: 11, color: colors[score], fontFamily: T.fontBody }}>
        {labels[score]}
      </span>
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
          Creating account…
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

// ─── Checkbox ────────────────────────────────────────────────────────────────
function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (val: boolean) => void; label: React.ReactNode }) {
  return (
    <label style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
      cursor: "pointer",
      fontSize: 12,
      color: T.muted,
      fontFamily: T.fontBody,
      lineHeight: 1.6,
    }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 16,
          height: 16,
          minWidth: 16,
          borderRadius: 4,
          border: `1.5px solid ${checked ? T.accent : T.border}`,
          background: checked ? T.accent : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 1,
          transition: "background .15s, border-color .15s",
          cursor: "pointer",
        }}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span>{label}</span>
    </label>
  );
}

// ─── Type definitions ─────────────────────────────────────────────────────────
interface FormData {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  confirm: string;
}

interface Errors {
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  password?: string;
  confirm?: string;
  agreed?: string;
}

// ─── SignupPage ───────────────────────────────────────────────────────────────
export default function SignupPage({
  onSuccess,
  onBack,
}: {
  onSuccess?: () => void;
  onBack?: () => void;
} = {}) {
  const [form, setForm] = useState<FormData>({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);

  const globalState = useGlobalState();
  const setUser = globalState?.setUser;
  const setIsAuthenticated = globalState?.setIsAuthenticated;
  const setAccessToken = globalState?.setAccessToken;
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setPageLoaded(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const update = useCallback((key: keyof FormData) => (e: ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
  }, []);

  const validate = useCallback(() => {
    const e: Errors = {};
    if (!form.firstName.trim()) e.firstName = "First name is required.";
    if (!form.lastName.trim()) e.lastName = "Last name is required.";
    if (!form.username.trim()) e.username = "Username is required.";
    else if (!/^[a-zA-Z0-9_]{3,20}$/.test(form.username)) e.username = "Use 3-20 letters, numbers, or underscores.";
    if (!form.email) e.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email.";
    if (!form.password) e.password = "Password is required.";
    else if (form.password.length < 8) e.password = "Must be at least 8 characters.";
    if (!form.confirm) e.confirm = "Please confirm your password.";
    else if (form.confirm !== form.password) e.confirm = "Passwords don't match.";
    if (!agreed) e.agreed = "You must accept the terms.";
    return e;
  }, [form, agreed]);

  const handleSignUp = useCallback(async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/api/users/signup`,
        {
          firstName: form.firstName,
          lastName: form.lastName,
          username: form.username,
          email: form.email,
          password: form.password,
        },
        { withCredentials: true }
      );

      if (res.status === 200 && res.data.success) {
        if (setAccessToken) setAccessToken(res.data.accessToken);
        if (setUser) setUser(res.data.user);
        if (setIsAuthenticated) setIsAuthenticated(true);
        if (onSuccess) onSuccess();
        navigate(`/verify-email?email=${encodeURIComponent(form.email)}`);
      } else {
        setErrors({ email: res.data.message || "Signup failed. Please try again." });
      }
    } catch (err: any) {
      console.error("Signup request failed:", err);
      if (err.response?.data?.message) {
        setErrors({ email: err.response.data.message });
      } else {
        setErrors({ email: "Network error. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  }, [form, validate, onSuccess, setAccessToken, setUser, setIsAuthenticated, navigate]);

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

  const toggleShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
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
        .delay-600 { animation-delay: 0.6s; opacity: 0; animation-fill-mode: forwards; }
        
        @keyframes float-gentle {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(15px, -10px) scale(1.08); }
          66% { transform: translate(-10px, 8px) scale(0.96); }
        }
        
        @keyframes float-gentle-delayed {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-12px, -8px) scale(1.05); }
          66% { transform: translate(10px, 10px) scale(0.97); }
        }
        
        @keyframes float-gentle-slow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(10px, 12px) scale(1.06); }
          66% { transform: translate(-8px, -10px) scale(0.95); }
        }
        
        @keyframes float-gentle-very-slow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-10px, -12px) scale(1.04); }
          66% { transform: translate(12px, -8px) scale(0.96); }
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
        
        .animate-float-gentle {
          animation: float-gentle 14s ease-in-out infinite;
        }
        
        .animate-float-gentle-delayed {
          animation: float-gentle-delayed 16s ease-in-out infinite;
        }
        
        .animate-float-gentle-slow {
          animation: float-gentle-slow 18s ease-in-out infinite;
        }
        
        .animate-float-gentle-very-slow {
          animation: float-gentle-very-slow 20s ease-in-out infinite;
        }
        
        .animate-gradient-gentle {
          animation: gradient-gentle 12s ease-in-out infinite;
        }
        
        .animate-gradient-gentle-reverse {
          animation: gradient-gentle-reverse 12s ease-in-out infinite;
        }
        
        .animate-float-particle-gentle {
          animation: float-particle-gentle linear infinite;
        }
        
        .animate-pulse-gentle {
          animation: pulse-gentle 10s ease-in-out infinite;
        }
      `}</style>

      <div className={`page-container ${pageLoaded ? 'opacity-100' : 'opacity-0'}`} style={{
        display: "flex",
        minHeight: "100vh",
        background: T.bg,
        fontFamily: T.fontBody,
        position: "relative",
        overflow: "hidden",
      }}>

        {/* ── Left: Form panel ── */}
        <div className="slide-in-left" style={{
          width: "100%",
          maxWidth: 520,
          display: "flex",
          flexDirection: "column",
          padding: "48px 56px",
          overflowY: "auto",
          position: "relative",
          zIndex: 10,
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
              marginBottom: 32,
              fontFamily: T.fontBody,
              transition: "color .15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#bbb")}
            onMouseLeave={(e) => (e.currentTarget.style.color = T.muted)}
          >
            ← Return
          </button>

          {/* Logo */}
          <div className="fade-in-up delay-200" style={{ marginBottom: 24 }}>
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
            Create your account
          </h1>
          <p className="fade-in-up delay-400" style={{ color: T.muted, fontSize: 14, marginBottom: 32, fontFamily: T.fontBody }}>
            Join thousands of filmmakers on Ensemble.
          </p>

          {/* Name row */}
          <div className="fade-in-up delay-500" style={{ display: "flex", gap: 12, marginBottom: 0 }}>
            <div style={{ flex: 1 }}>
              <Input
                label="First name"
                placeholder="Maya"
                value={form.firstName}
                onChange={update("firstName")}
                error={errors.firstName}
                icon={<User className="h-4 w-4" />}
              />
            </div>
            <div style={{ flex: 1 }}>
              <Input
                label="Last name"
                placeholder="Rodriguez"
                value={form.lastName}
                onChange={update("lastName")}
                error={errors.lastName}
              />
            </div>
          </div>

          <div className="fade-in-up delay-500">
            <Input
              label="Email address"
              type="email"
              placeholder="you@studio.com"
              value={form.email}
              onChange={update("email")}
              error={errors.email}
              icon={<Mail className="h-4 w-4" />}
            />
          </div>

          <div className="fade-in-up delay-500">
            <Input
              label="Username"
              placeholder="your_handle"
              value={form.username}
              onChange={update("username")}
              error={errors.username}
              icon={<UserCheck className="h-4 w-4" />}
            />
          </div>

          <div className="fade-in-up delay-600">
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="At least 8 characters"
              value={form.password}
              onChange={update("password")}
              error={errors.password}
              icon={<Lock className="h-4 w-4" />}
              showPasswordToggle={true}
              onTogglePassword={toggleShowPassword}
            />
            <StrengthMeter password={form.password} />
          </div>

          <div className="fade-in-up delay-600">
            <Input
              label="Confirm password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Re-enter your password"
              value={form.confirm}
              onChange={update("confirm")}
              error={errors.confirm}
              icon={<Lock className="h-4 w-4" />}
              showPasswordToggle={true}
              onTogglePassword={toggleShowConfirmPassword}
            />
          </div>

          {/* Terms */}
          <div className="fade-in-up delay-600" style={{ marginBottom: 24 }}>
            <Checkbox
              checked={agreed}
              onChange={setAgreed}
              label={
                <span>
                  I agree to the{" "}
                  <span style={{ color: T.accent, cursor: "pointer" }}>Terms of Service</span>
                  {" "}and{" "}
                  <span style={{ color: T.accent, cursor: "pointer" }}>Privacy Policy</span>
                </span>
              }
            />
            {errors.agreed && (
              <p style={{ color: T.error, fontSize: 11, marginTop: 6, fontFamily: T.fontBody }}>
                {errors.agreed}
              </p>
            )}
          </div>

          {/* Sign up btn */}
          <div className="fade-in-up delay-600">
            <PrimaryBtn onClick={handleSignUp} loading={loading} fullWidth>
              Create Account
            </PrimaryBtn>
          </div>

          {/* Login link */}
          <p className="fade-in-up delay-600" style={{ color: T.dim, fontSize: 13, marginTop: 24, textAlign: "center", fontFamily: T.fontBody }}>
            Already have an account?{" "}
            <button
              onClick={() => navigate('/login')}
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
              Log in
            </button>
          </p>

          <Divider />
          <GoogleBtn />
        </div>

        {/* ── Right: Decorative panel with slowly moving animated background ── */}
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
          <AnimatedBg />
          <RightPanel />
        </div>

      </div>
    </>
  );
}