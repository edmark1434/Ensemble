import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, ArrowRight, RefreshCw } from "lucide-react";
import ShapeGrid from "../../components/ui/ShapeGrid"; // Adjust import depth if needed
import useGlobalState from "@/lib/global_state";
import axios from "axios";

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

export default function VerifyEmail() {
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const {signUpData,setUser,setIsAuthenticated} = useGlobalState();
  const navigate = useNavigate();
  const inputRefs = useRef<HTMLInputElement[]>([]);
  const email = signUpData?.email;
  const firstName = signUpData?.firstName;
  const lastName = signUpData?.lastName;
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  useEffect(() => {
    if(!email || !firstName || !lastName){
      navigate("/");
    }
  },[])

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (!/^\d{6}$/.test(pastedData)) return;

    const newCode = pastedData.split("");
    setCode(newCode);
    inputRefs.current[5]?.focus();
  };

  const handleChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = useCallback(async () => {
    const fullCode = code.join("");
    if (fullCode.length < 6) {
      setError("Please fill out all 6 digits.");
      return;
    }

    setError(null);
    setLoading(true);
    setSuccessMessage(null);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/api/users/verify-email`,
        { email, code: fullCode },
        { withCredentials: true }
      );
        if (setUser) setUser(response.data.credentials);
        if (setIsAuthenticated) setIsAuthenticated(true);
        navigate("/setup/personal-details");
    } catch (err:any) {
      console.log("Verification error:", err.response);
      setError(err.response?.data?.message || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [code, navigate]);

  const handleResendCode = async () => {
    if (!canResend) return;
    setCountdown(30);
    setCanResend(false);
    setCode(Array(6).fill(""));
    setError(null);
    inputRefs.current[0]?.focus();

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/api/users/resend-verification-email`,
        { email, firstName, lastName },)
      if(response.status === 200 && response.data.success) {
        setSuccessMessage("Verification code resent successfully. Please check your email.");
      }
    }catch (err:any) {
      console.log("Resend code error:", err.response);
      setError(err.response?.data?.message || "Failed to resend code. Please try again.");
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

        @keyframes smooth-fade-in {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        @keyframes micro-spin {
          to { transform: rotate(360deg); }
        }

        .loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #080a12;
          border-top-color: transparent;
          border-radius: 50%;
          display: inline-block;
          animation: micro-spin .7s linear infinite;
        }
      `}</style>

      <div className="setup-page-wrapper">
        {/* Dynamic Canvas Background */}
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

        <div className="setup-card">
          {/* Static Progress Tracking */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.accent, letterSpacing: 0.5 }}>ACCOUNT SETUP</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>1 / 5</span>
            </div>
            <div style={{ width: "100%", height: 4, background: T.border, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: "20%", height: "100%", background: T.accent, borderRadius: 2, transition: "width 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }} />
            </div>
          </div>

          {/* Core Fields */}
          <div className="animated-content">
            <div style={{
              width: 48, height: 48, borderRadius: 12, background: T.bgInput,
              border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.accent, marginBottom: 20,
            }}>
              <Mail className="h-5 w-5" />
            </div>

            <h2 style={{ fontSize: 24, fontWeight: 700, color: T.text, marginBottom: 6, letterSpacing: -.3 }}>
              Verify your email
            </h2>
            <p style={{ color: T.muted, fontSize: 14, marginBottom: 28, lineHeight: 1.5 }}>
              Enter the 6-digit verification security code sent to <span style={{ color: "#fff", fontWeight: 500 }}>{email}</span>.
            </p>

            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (inputRefs.current[i] = el as HTMLInputElement)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={digit}
                    onChange={(e) => handleChange(e.target.value, i)}
                    onKeyDown={(e) => handleKeyDown(e, i)}
                    onPaste={i === 0 ? handlePaste : undefined}
                    style={{
                      width: "100%",
                      maxWidth: "68px",
                      height: "54px",
                      background: T.bgInput,
                      border: `1px solid ${error ? T.error : digit ? T.borderFoc : T.border}`,
                      borderRadius: 10,
                      color: "#fff",
                      fontSize: 20,
                      fontWeight: 700,
                      textAlign: "center",
                      outline: "none",
                      transition: "all .15s ease",
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = T.borderFoc}
                    onBlur={(e) => e.currentTarget.style.borderColor = digit ? T.borderFoc : T.border}
                  />
                ))}
              </div>

              {error && <p style={{ color: T.error, fontSize: 12, marginTop: 12 }}>{error}</p>}
              {successMessage && <p style={{ color: T.success, fontSize: 12, marginTop: 12 }}>{successMessage}</p>}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <button
                onClick={handleVerify}
                disabled={loading}
                style={{
                  background: loading ? "#555" : "#fff", color: "#080a12", border: "none", padding: "14px 24px",
                  borderRadius: 30, fontWeight: 600, fontSize: 14, cursor: loading ? "not-allowed" : "pointer",
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all .2s ease",
                }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#e8e8e8"; }}
                onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = "#fff"; }}
              >
                {loading ? (
                  <>
                    <span className="loading-spinner" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Verify code
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13, color: T.dim }}>
                <span>Didn't receive code?</span>
                <button
                  onClick={handleResendCode}
                  disabled={!canResend}
                  style={{
                    background: "none", border: "none", color: canResend ? T.accent : T.dim,
                    cursor: canResend ? "pointer" : "not-allowed", fontWeight: 500, padding: 0, display: "flex", alignItems: "center", gap: 4,
                    textDecoration: canResend ? "underline" : "none"
                  }}
                  onMouseEnter={(e) => { if (canResend) e.currentTarget.style.color = "#7aadde"; }}
                  onMouseLeave={(e) => { if (canResend) e.currentTarget.style.color = T.accent; }}
                >
                  <RefreshCw className="h-3 w-3" />
                  {canResend ? "Resend" : `${countdown}s`}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
