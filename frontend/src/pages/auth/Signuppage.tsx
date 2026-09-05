// SignupPage.jsx
// Ensemble — Sign Up page

import { useState, useEffect, useCallback } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useGoogleAuth } from "./Oauth";
import axios from "axios";
import useGlobalState from "@/lib/global_state";
import { Check, Eye, EyeOff, Mail, Lock, User, UserCheck } from "lucide-react";
import TermsModal from "@/pages/auth/TermsModal";
import PrivacyModal from "@/pages/auth/PrivacyModal";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:        "var(--auth-bg, #09090b)",
  bgPanel:   "var(--auth-bgPanel, #18181b)",
  bgInput:   "var(--auth-bgInput, #27272a)",
  border:    "var(--auth-border, rgba(255, 255, 255, 0.1))",
  borderFoc: "var(--auth-borderFoc, #4a6fa5)",
  accent:    "var(--auth-accent, #4a6fa5)",
  text:      "var(--auth-text, #ffffff)",
  muted:     "var(--auth-muted, #888)",
  dim:       "var(--auth-dim, #555)",
  error:     "var(--auth-error, #e05252)",
  success:   "var(--auth-success, #52e0a0)",
  primaryBg: "var(--auth-primaryBg, #fff)",
  primaryText: "var(--auth-primaryText, #080a12)",
  primaryHover: "var(--auth-primaryHover, #e8e8e8)",
  overlay:   "var(--auth-overlay, rgba(18, 18, 20, 0.6))",
  overlayOpacity: "var(--auth-overlayOpacity, 1)",
  logoInvert: "var(--auth-logoInvert, invert(0))",
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
        style={{ width: size, height: size, filter: T.logoInvert }}
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
    <div className="absolute inset-0 overflow-hidden" style={{ background: T.bg }}>
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none"
        style={{ filter: "brightness(0.35) contrast(1.05)", opacity: "var(--auth-overlayOpacity, 1)" }}
      >
        <source src="/clip/signup_bg_vid.mp4" type="video/mp4" />
      </video>

      {/* Radial overlay layer optimizing layout contrast parameters */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: T.overlay
        }}
      />

      {/* Subtle Moving Accent Borders */}
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
            color: T.text,
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
const STRONG_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9\s]).{8,}$/;
const SIGNUP_SUFFIXES = ["Jr.", "Sr.", "II", "III", "IV", "V"] as const;

function StrengthMeter({ password }: { password: string }) {
  const requirements = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "At least 1 uppercase letter", met: /[A-Z]/.test(password) },
    { label: "At least 1 lowercase letter", met: /[a-z]/.test(password) },
    { label: "At least 1 special character", met: /[^A-Za-z0-9\s]/.test(password) },
  ];

  if (!password) return null;

  return (
    <div aria-live="polite" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "7px 12px", marginTop: -8, marginBottom: 16 }}>
      {requirements.map((requirement) => (
        <div key={requirement.label} style={{ display: "flex", alignItems: "center", gap: 6, color: requirement.met ? T.success : T.text, fontSize: 11, fontFamily: T.fontBody }}>
          {requirement.met ? (
            <Check size={13} strokeWidth={2.5} aria-hidden="true" />
          ) : (
            <span aria-hidden="true" style={{ width: 13, textAlign: "center" }}>−</span>
          )}
          <span>{requirement.label}</span>
        </div>
      ))}
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
        background: loading ? T.dim : T.primaryBg,
        color: T.primaryText,
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
      onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = T.primaryHover; }}
      onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = T.primaryBg; }}
    >
      {loading ? (
        <>
          <span style={{
            width: 16, height: 16,
            border: `2px solid ${T.primaryText}`,
            borderTopColor: "transparent",
            borderRadius: "50%",
            display: "inline-block",
            animation: "ens-spin .7s linear infinite",
          }} />
          Creating account...
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
        color: T.text,
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
  middleName: string;
  lastName: string;
  suffix: string;
  username: string;
  email: string;
  password: string;
  confirm: string;
}

interface Errors {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
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
    middleName: "",
    lastName: "",
    suffix: "",
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
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [, setTermsAccepted] = useState(false);
  const [, setPrivacyAccepted] = useState(false);

  const globalState = useGlobalState();
  const setIsAuthenticated = globalState?.setIsAuthenticated;
  const setSignUpData = globalState?.setSignUpData;
  const navigate = useNavigate();

  useEffect(() => {
    const styleEl = document.createElement("style");
    styleEl.innerHTML = `
      :root {
        --auth-bg: #f4f4f5;
        --auth-bgPanel: #ffffff;
        --auth-bgInput: #f4f4f5;
        --auth-border: #e4e4e7;
        --auth-borderFoc: #2563eb;
        --auth-accent: #2563eb;
        --auth-text: #18181b;
        --auth-muted: #71717a;
        --auth-dim: #a1a1aa;
        --auth-error: #ef4444;
        --auth-success: #10b981;
        --auth-primaryBg: #18181b;
        --auth-primaryText: #ffffff;
        --auth-primaryHover: #27272a;
        --auth-googleHover: #e4e4e7;
        --auth-overlay: radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(244,244,245,0.5) 100%);
        --auth-overlayOpacity: 1;
        --auth-logoInvert: invert(1);
      }
      .dark {
        --auth-bg: #121214;
        --auth-bgPanel: #1e1f22;
        --auth-bgInput: #27282b;
        --auth-border: rgba(255, 255, 255, 0.1);
        --auth-borderFoc: #4a6fa5;
        --auth-accent: #4a6fa5;
        --auth-text: #ffffff;
        --auth-muted: #888;
        --auth-dim: #555;
        --auth-error: #e05252;
        --auth-success: #52e0a0;
        --auth-primaryBg: #ffffff;
        --auth-primaryText: #080a12;
        --auth-primaryHover: #e8e8e8;
        --auth-googleHover: #1a1d2e;
        --auth-overlay: radial-gradient(circle, rgba(18,18,20,0.2) 0%, rgba(18,18,20,0.85) 100%);
        --auth-overlayOpacity: 1;
        --auth-logoInvert: invert(0);
      }
    `;
    document.head.appendChild(styleEl);
    return () => styleEl.remove();
  }, []);

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
    if (form.middleName.trim().length > 64) e.middleName = "Middle name must be 64 characters or fewer.";
    if (!form.lastName.trim()) e.lastName = "Last name is required.";
    if (form.suffix && !SIGNUP_SUFFIXES.includes(form.suffix as typeof SIGNUP_SUFFIXES[number])) e.suffix = "Select a valid suffix.";
    if (!form.username.trim()) e.username = "Username is required.";
    else if (!/^[a-zA-Z0-9_]{3,20}$/.test(form.username)) e.username = "Use 3-20 letters, numbers, or underscores.";
    if (!form.email) e.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email.";
    if (!form.password) e.password = "Password is required.";
    else if (!STRONG_PASSWORD_PATTERN.test(form.password)) e.password = "Use at least 8 characters with uppercase, lowercase, and a special character.";
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
        `${import.meta.env.VITE_BASE_URL}/api/users/signup-save-session`,
        {
          firstName: form.firstName,
          middleName: form.middleName,
          lastName: form.lastName,
          suffix: form.suffix,
          username: form.username,
          email: form.email,
          password: form.password,
        },
        { withCredentials: true }
      );

      if (res.status === 200 && res.data.success) {
        if (setSignUpData) setSignUpData(res.data.credentials);
        // if (setUser) setUser(res.data.credentials);
        // if (setIsAuthenticated) setIsAuthenticated(true);
        // if (onSuccess) onSuccess();
        // navigate(`/verify-email?email=${encodeURIComponent(form.email)}`);
        navigate("/setup/verify-email");
        return;
      } else {
        setErrors({ email: res.data.message || "Signup failed. Please try again." });
      }
    } catch (err: any) {
      setErrors(err.response?.data?.details);
    } finally {
      setLoading(false);
    }
  }, [form, validate, onSuccess, setSignUpData, setIsAuthenticated, navigate]);

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
        
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px ${T.bgInput} inset !important;
          -webkit-text-fill-color: ${T.text} !important;
          transition: background-color 5000s ease-in-out 0s;
        }
        
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
        
        /* Custom Scrollbar */
        .slide-in-left::-webkit-scrollbar { width: 6px; }
        .slide-in-left::-webkit-scrollbar-track { background: transparent; }
        .slide-in-left::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .slide-in-left::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
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
            Join thousands of video editing enthusiasts on Ensemble.
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

          <div className="fade-in-up delay-500" style={{ display: "flex", gap: 12, marginBottom: 0 }}>
            <div style={{ flex: 1 }}>
              <Input
                label="Middle name (optional)"
                placeholder="Optional"
                value={form.middleName}
                onChange={update("middleName")}
                error={errors.middleName}
              />
            </div>
            <div style={{ flex: 1, marginBottom: 20 }}>
              <label style={{ display: "block", color: T.muted, fontSize: 12, fontWeight: 500, marginBottom: 8, fontFamily: T.fontBody }}>
                Suffix (optional)
              </label>
              <select
                value={form.suffix}
                onChange={(event) => setForm((current) => ({ ...current, suffix: event.target.value }))}
                style={{ width: "100%", padding: "12px 14px", background: T.bgInput, border: `1px solid ${errors.suffix ? T.error : T.border}`, borderRadius: 12, color: T.text, fontSize: 14, outline: "none", fontFamily: T.fontBody }}
              >
                <option value="">None</option>
                {SIGNUP_SUFFIXES.map((suffix) => <option key={suffix} value={suffix}>{suffix}</option>)}
              </select>
              {errors.suffix && <p style={{ color: T.error, fontSize: 11, marginTop: 6, fontFamily: T.fontBody }}>{errors.suffix}</p>}
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
              placeholder="8+ characters with upper, lower, and special"
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
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    style={{ color: T.accent, cursor: "pointer", textDecoration: "underline", background: "none", border: "none", padding: 0 }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#7aadde")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = T.accent)}
                  >
                    Terms of Service
                  </button>
                  {" "}and{" "}
                  <button
                    type="button"
                    onClick={() => setShowPrivacyModal(true)}
                    style={{ color: T.accent, cursor: "pointer", textDecoration: "underline", background: "none", border: "none", padding: 0 }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#7aadde")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = T.accent)}
                  >
                    Privacy Policy
                  </button>
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
          <VideoBg /> {/* Dynamic asset wrapper component loads signup_bg_vid.mp4 */}
          <RightPanel />
        </div>

      </div>

      {/* Terms and Privacy Modals */}
      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={() => setTermsAccepted(true)}
      />

      <PrivacyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        onAccept={() => setPrivacyAccepted(true)}
      />
    </>
  );
}
