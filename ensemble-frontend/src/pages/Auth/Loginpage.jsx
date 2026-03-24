// LoginPage.jsx
// Ensemble — Login page
// Usage: <LoginPage onSignup={fn} onForgotPassword={fn} onSuccess={fn} />

import { useState } from "react";
import { GoogleAuth } from "./Oauth";
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
  fontDisplay: "'Syne', sans-serif",
  fontBody:    "'DM Sans', sans-serif",
};

// ─── Logo ─────────────────────────────────────────────────────────────────────
function Logo({ size = 22 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
      <svg width={size + 6} height={size + 6} viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="15.5" stroke="#fff" strokeWidth="1.8" />
        <circle cx="18" cy="18" r="8.5"  stroke="#fff" strokeWidth="1.4" />
        <circle cx="18" cy="18" r="2.8"  fill="#fff" />
        {[0, 60, 120, 180, 240, 300].map((deg, i) => (
          <line
            key={i} x1="18" y1="18"
            x2={18 + 14 * Math.cos((deg * Math.PI) / 180)}
            y2={18 + 14 * Math.sin((deg * Math.PI) / 180)}
            stroke="#fff" strokeWidth=".9" opacity=".55"
          />
        ))}
      </svg>
      <span style={{ fontSize: size, fontWeight: 700, fontFamily: T.fontDisplay, letterSpacing: .5 }}>
        Ensemble
      </span>
    </div>
  );
}

// ─── Swirl background (right panel) ──────────────────────────────────────────
function SwirlBg() {
  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: .15 }}
      viewBox="0 0 600 700" preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs><filter id="sb"><feGaussianBlur stdDeviation="9" /></filter></defs>
      {[...Array(14)].map((_, i) => (
        <ellipse
          key={i}
          cx={90 + i * 38}
          cy={80 + (i % 4) * 140}
          rx={220 - i * 7}
          ry={55 + i * 9}
          fill="none"
          stroke="#4a6fa5"
          strokeWidth="1.1"
          filter="url(#sb)"
          transform={`rotate(${i * 13}, 300, 350)`}
        />
      ))}
    </svg>
  );
}

// ─── Input field ──────────────────────────────────────────────────────────────
function Input({ label, type = "text", placeholder, value, onChange, error }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <label style={{
          display: "block",
          color: focused ? "#bbc" : T.muted,
          fontSize: 12,
          fontWeight: 500,
          marginBottom: 6,
          transition: "color .15s",
          fontFamily: T.fontBody,
        }}>
          {label}
        </label>
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
          padding: "11px 14px",
          background: T.bgInput,
          border: `1px solid ${error ? T.error : focused ? T.borderFoc : T.border}`,
          borderRadius: 8,
          color: "#e2e8f0",
          fontSize: 13,
          outline: "none",
          fontFamily: T.fontBody,
          boxSizing: "border-box",
          transition: "border-color .15s",
        }}
      />
      {error && (
        <p style={{ color: T.error, fontSize: 11, marginTop: 4, fontFamily: T.fontBody }}>{error}</p>
      )}
    </div>
  );
}

// ─── Primary button ───────────────────────────────────────────────────────────
function PrimaryBtn({ children, onClick, loading = false, fullWidth = false }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        background: loading ? "#ccc" : "#fff",
        color: "#080a12",
        border: "none",
        padding: "12px 26px",
        borderRadius: 24,
        fontWeight: 700,
        fontSize: 14,
        cursor: loading ? "not-allowed" : "pointer",
        width: fullWidth ? "100%" : "auto",
        fontFamily: T.fontBody,
        transition: "background .15s, transform .1s",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
      onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#dde3ed"; }}
      onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = "#fff"; }}
      onMouseDown={(e)  => { if (!loading) e.currentTarget.style.transform = "scale(.97)"; }}
      onMouseUp={(e)    => { if (!loading) e.currentTarget.style.transform = "scale(1)"; }}
    >
      {loading ? (
        <>
          <span style={{
            width: 14, height: 14,
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
  return (
    <button
      onClick={GoogleAuth}
      style={{
        width: "100%",
        padding: "11px 16px",
        background: T.bgInput,
        border: `1px solid ${T.border}`,
        borderRadius: 24,
        color: "#e2e8f0",
        fontSize: 13,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        fontWeight: 600,
        fontFamily: T.fontBody,
        transition: "background .15s, border-color .15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#1a1d2e";
        e.currentTarget.style.borderColor = "#3a3d52";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = T.bgInput;
        e.currentTarget.style.borderColor = T.border;
      }}
    >
      <svg width="17" height="17" viewBox="0 0 48 48">
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
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
      <div style={{ flex: 1, height: 1, background: T.border }} />
      <span style={{ color: T.muted, fontSize: 12, fontFamily: T.fontBody }}>or</span>
      <div style={{ flex: 1, height: 1, background: T.border }} />
    </div>
  );
}

// ─── LoginPage ────────────────────────────────────────────────────────────────
export default function LoginPage({
  onSuccess,         // called after successful sign-in
  onSignup,          // navigate to sign-up
  onForgotPassword,  // navigate to account recovery
  onBack,            // navigate back (e.g. to landing)
}) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState({});
  const navigate = useNavigate();
  const validate = () => {
    const e = {};
    if (!email)    e.email    = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email.";
    if (!password) e.password = "Password is required.";
    return e;
  };

  const handleSignIn = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    // Simulate async sign-in
    setTimeout(() => {
      setLoading(false);
      onSuccess?.();
    }, 1400);
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") handleSignIn(); };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${T.bg}; font-family: ${T.fontBody}; -webkit-font-smoothing: antialiased; }
        @keyframes ens-spin { to { transform: rotate(360deg); } }
        @keyframes ens-fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
      `}</style>

      <div style={{
        display: "flex",
        height: "100vh",
        background: T.bg,
        fontFamily: T.fontBody,
        animation: "ens-fadeIn .4s ease",
      }}>

        {/* ── Left: Form panel ── */}
        <div style={{
          width: "100%",
          maxWidth: 420,
          display: "flex",
          flexDirection: "column",
          padding: "32px 40px",
          overflowY: "auto",
        }}>

          {/* Back */}
          <button
            onClick={onBack}
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
              marginBottom: 40,
              fontFamily: T.fontBody,
              transition: "color .15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#bbb")}
            onMouseLeave={(e) => (e.currentTarget.style.color = T.muted)}
          >
            ‹ Return
          </button>

          {/* Heading */}
          <h1 style={{
            fontFamily: T.fontDisplay,
            fontSize: 30,
            fontWeight: 800,
            color: T.text,
            marginBottom: 6,
            letterSpacing: -.5,
          }}>
            Welcome back
          </h1>
          <p style={{ color: T.muted, fontSize: 13, marginBottom: 32 }}>
            Sign in to continue to Ensemble.
          </p>

          {/* Form */}
          <div onKeyDown={handleKeyDown}>
            <Input
              label="Email address"
              type="email"
              placeholder="you@studio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
            />
            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
            />
          </div>

          {/* Forgot password */}
          <button
            onClick={onForgotPassword}
            style={{
              background: "none",
              border: "none",
              color: T.accent,
              fontSize: 12,
              cursor: "pointer",
              padding: 0,
              marginBottom: 24,
              textAlign: "left",
              fontFamily: T.fontBody,
              transition: "color .15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#7aadde")}
            onMouseLeave={(e) => (e.currentTarget.style.color = T.accent)}
          >
            Forgot password?
          </button>

          {/* Sign in btn */}
          <PrimaryBtn onClick={handleSignIn} loading={loading} fullWidth>
            Sign In
          </PrimaryBtn>

          {/* Sign up link */}
          <p style={{ color: T.dim, fontSize: 13, margin: "16px 0 0", textAlign: "center" }}>
            Don't have an account?{" "}
            <button
              onClick={() => navigate('/signup')}
              style={{
                background: "none",
                border: "none",
                color: "#bbb",
                fontSize: 13,
                cursor: "pointer",
                padding: 0,
                textDecoration: "underline",
                fontFamily: T.fontBody,
              }}
            >
              Sign up
            </button>
          </p>

          <Divider />
          <GoogleBtn />
        </div>

        {/* ── Right: Decorative panel ── */}
        <div style={{
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
          <SwirlBg />
          <div style={{ position: "relative", zIndex: 1 }}>
            <Logo size={26} />
          </div>
          <p style={{
            position: "relative",
            zIndex: 1,
            color: "rgba(255,255,255,.3)",
            fontSize: 13,
            textAlign: "center",
            maxWidth: 260,
            lineHeight: 1.7,
          }}>
            The parallel workflow platform for modern film production teams.
          </p>
        </div>

      </div>
    </>
  );
}