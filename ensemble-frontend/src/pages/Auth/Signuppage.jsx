// SignupPage.jsx
// Ensemble — Sign Up page
// Usage: <SignupPage onLogin={fn} onSuccess={fn} onBack={fn} />

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleAuth } from "./Oauth";
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

// ─── Swirl background ────────────────────────────────────────────────────────
function SwirlBg() {
  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: .15 }}
      viewBox="0 0 600 700" preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs><filter id="sb2"><feGaussianBlur stdDeviation="9" /></filter></defs>
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
          filter="url(#sb2)"
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

// ─── Password strength meter ──────────────────────────────────────────────────
function StrengthMeter({ password }) {
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
          Creating account…
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

// ─── Checkbox ────────────────────────────────────────────────────────────────
function Checkbox({ checked, onChange, label }) {
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

// ─── SignupPage ───────────────────────────────────────────────────────────────
export default function SignupPage({
  onSuccess,   // called after successful sign-up (e.g. navigate to verify)
  onLogin,     // navigate to login page
  onBack,      // navigate back
}) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [agreed, setAgreed]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});
  const navigate = useNavigate();

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = "First name is required.";
    if (!form.lastName.trim())  e.lastName  = "Last name is required.";
    if (!form.email)            e.email     = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email.";
    if (!form.password)         e.password  = "Password is required.";
    else if (form.password.length < 8) e.password = "Must be at least 8 characters.";
    if (!form.confirm)          e.confirm   = "Please confirm your password.";
    else if (form.confirm !== form.password) e.confirm = "Passwords don't match.";
    if (!agreed)                e.agreed    = "You must accept the terms.";
    return e;
  };

  const handleSignUp = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSuccess?.();
    }, 1500);
  };

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
        minHeight: "100vh",
        background: T.bg,
        fontFamily: T.fontBody,
        animation: "ens-fadeIn .4s ease",
      }}>

        {/* ── Left: Form panel ── */}
        <div style={{
          width: "100%",
          maxWidth: 460,
          display: "flex",
          flexDirection: "column",
          padding: "32px 40px 48px",
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
              marginBottom: 36,
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
            Create your account
          </h1>
          <p style={{ color: T.muted, fontSize: 13, marginBottom: 30 }}>
            Join thousands of filmmakers on Ensemble.
          </p>

          {/* Name row */}
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Input
                label="First name"
                placeholder="Maya"
                value={form.firstName}
                onChange={update("firstName")}
                error={errors.firstName}
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

          <Input
            label="Email address"
            type="email"
            placeholder="you@studio.com"
            value={form.email}
            onChange={update("email")}
            error={errors.email}
          />

          <Input
            label="Password"
            type="password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={update("password")}
            error={errors.password}
          />
          <StrengthMeter password={form.password} />

          <Input
            label="Confirm password"
            type="password"
            placeholder="Re-enter your password"
            value={form.confirm}
            onChange={update("confirm")}
            error={errors.confirm}
          />

          {/* Terms */}
          <div style={{ marginBottom: 24 }}>
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
          <PrimaryBtn onClick={handleSignUp} loading={loading} fullWidth>
            Create Account
          </PrimaryBtn>

          {/* Login link */}
          <p style={{ color: T.dim, fontSize: 13, margin: "16px 0 0", textAlign: "center" }}>
            Already have an account?{" "}
            <button
              onClick={() => navigate('/login')}
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
              Log in
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
          gap: 32,
        }}>
          <SwirlBg />

          <div style={{ position: "relative", zIndex: 1 }}>
            <Logo size={26} />
          </div>

          {/* Feature bullets */}
          <div style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            maxWidth: 280,
          }}>
            {[
              { icon: "⚡", text: "Parallel Workflow — no more waiting" },
              { icon: "🎬", text: "Real-time story structuring on set" },
              { icon: "🔗", text: "Your whole team, one source of truth" },
            ].map(({ icon, text }) => (
              <div key={text} style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "rgba(74,111,165,.1)",
                border: "1px solid rgba(74,111,165,.2)",
                borderRadius: 10,
                padding: "12px 16px",
              }}>
                <span style={{ fontSize: 18 }}>{icon}</span>
                <span style={{ color: "rgba(255,255,255,.6)", fontSize: 13, lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}