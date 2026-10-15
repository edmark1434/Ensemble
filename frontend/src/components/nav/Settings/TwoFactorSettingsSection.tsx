import React, { useEffect, useRef, useState } from "react";
import QRCodeStyling from "qr-code-styling";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Copy,
  Check,
  Download,
  RefreshCw,
  X,
  AlertCircle,
  Smartphone,
  Lock,
} from "lucide-react";
import api from "@/lib/axios";
import toast from "react-hot-toast";

interface TwoFactorStatus {
  enabled: boolean;
  recoveryCodesCount: number;
  hasPassword?: boolean;
}

export const TwoFactorSettingsSection: React.FC = () => {
  const [status, setStatus] = useState<TwoFactorStatus>({
    enabled: false,
    recoveryCodesCount: 0,
    hasPassword: true,
  });
  const [loading, setLoading] = useState(true);

  // Setup modal state
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [setupData, setSetupData] = useState<{
    secret: string;
    otpauthUrl: string;
    recoveryCodes: string[];
  } | null>(null);
  const [verificationToken, setVerificationToken] = useState("");
  const [setupError, setSetupError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  // Disable modal state
  const [isDisableOpen, setIsDisableOpen] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [disableError, setDisableError] = useState("");

  // Regenerate modal state
  const [isRegenOpen, setIsRegenOpen] = useState(false);
  const [regenToken, setRegenToken] = useState("");
  const [regenError, setRegenError] = useState("");
  const [newRecoveryCodes, setNewRecoveryCodes] = useState<string[] | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await api.get("/api/users/2fa/status");
      if (res.data?.success) {
        setStatus({
          enabled: Boolean(res.data.enabled),
          recoveryCodesCount: Number(res.data.recoveryCodesCount) || 0,
          hasPassword: res.data.hasPassword !== undefined ? Boolean(res.data.hasPassword) : true,
        });
      }
    } catch (err) {
      console.error("Error fetching 2FA status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const handleAccountUpdate = () => {
      fetchStatus();
    };
    window.addEventListener("ensemble:account-updated", handleAccountUpdate);
    return () => {
      window.removeEventListener("ensemble:account-updated", handleAccountUpdate);
    };
  }, []);

  // Render QR Code whenever setupData opens
  useEffect(() => {
    if (!isSetupOpen || !setupData?.otpauthUrl || !qrRef.current) return;
    qrRef.current.innerHTML = "";
    const qrCode = new QRCodeStyling({
      width: 180,
      height: 180,
      data: setupData.otpauthUrl,
      dotsOptions: {
        color: "#09090b",
        type: "rounded",
      },
      backgroundOptions: {
        color: "#ffffff",
      },
    });
    qrCode.append(qrRef.current);
  }, [isSetupOpen, setupData?.otpauthUrl]);

  // Start 2FA Setup
  const handleOpenSetup = async () => {
    if (status.hasPassword === false) {
      toast.error("Please set and save an account password above before enabling Two-Factor Authentication.");
      const pwdInput = document.querySelector('input[placeholder="Leave blank to keep current"]') as HTMLInputElement | null;
      if (pwdInput) {
        pwdInput.focus();
        pwdInput.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }
    setSetupError("");
    setVerificationToken("");
    setIsSubmitting(true);
    try {
      const res = await api.post("/api/users/2fa/setup");
      if (res.data?.success && res.data?.data) {
        setSetupData(res.data.data);
        setIsSetupOpen(true);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to start 2FA setup");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm and Enable 2FA
  const handleConfirmEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationToken.trim()) {
      setSetupError("Please enter the 6-digit code from your authenticator app.");
      return;
    }
    setIsSubmitting(true);
    setSetupError("");
    try {
      const res = await api.post("/api/users/2fa/enable", {
        token: verificationToken.trim(),
      });
      if (res.data?.success) {
        toast.success("Two-Factor Authentication is now enabled!");
        setIsSetupOpen(false);
        setSetupData(null);
        setVerificationToken("");
        fetchStatus();
      }
    } catch (err: any) {
      setSetupError(
        err.response?.data?.message ||
          "Invalid verification code. Please check your authenticator app and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm and Disable 2FA
  const handleConfirmDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disableCode.trim()) {
      setDisableError("Please enter your verification code or a recovery code.");
      return;
    }
    setIsSubmitting(true);
    setDisableError("");
    try {
      const res = await api.post("/api/users/2fa/disable", {
        code: disableCode.trim(),
      });
      if (res.data?.success) {
        toast.success("Two-factor authentication disabled and all recovery codes removed.");
        setIsDisableOpen(false);
        setDisableCode("");
        fetchStatus();
      }
    } catch (err: any) {
      setDisableError(err.response?.data?.message || "Failed to disable 2FA.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm and Regenerate Recovery Codes
  const handleConfirmRegenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regenToken.trim()) {
      setRegenError("Please enter the 6-digit code from your authenticator app.");
      return;
    }
    setIsSubmitting(true);
    setRegenError("");
    try {
      const res = await api.post("/api/users/2fa/regenerate-recovery-codes", {
        token: regenToken.trim(),
      });
      if (res.data?.success && res.data?.recoveryCodes) {
        setNewRecoveryCodes(res.data.recoveryCodes);
        toast.success("8 new recovery codes generated!");
        fetchStatus();
      }
    } catch (err: any) {
      setRegenError(err.response?.data?.message || "Failed to regenerate recovery codes.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Download recovery codes as text file
  const downloadRecoveryCodesTxt = (codes: string[]) => {
    const textContent = [
      "=================================================",
      "ENSEMBLE TWO-FACTOR AUTHENTICATION RECOVERY CODES",
      "=================================================",
      "",
      "Keep these 8 recovery codes in a safe and secure place.",
      "If you lose access to your authenticator app, each code can",
      "be used ONCE to verify and sign in to your account.",
      "",
      "RECOVERY CODES:",
      ...codes.map((code, idx) => `  [${idx + 1}] ${code}`),
      "",
      `Generated on: ${new Date().toUTCString()}`,
      "=================================================",
    ].join("\n");

    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ensemble-recovery-codes.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Recovery codes downloaded as .txt file");
  };

  // Copy recovery codes to clipboard
  const copyRecoveryCodes = (codes: string[]) => {
    navigator.clipboard.writeText(codes.join("\n"));
    setCopiedCodes(true);
    toast.success("Recovery codes copied to clipboard");
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  // Copy secret key
  const copySecret = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSecret(true);
    toast.success("Secret copied to clipboard");
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  return (
    <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.02]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-200 dark:border-white/10">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
            {status.enabled ? <ShieldCheck className="h-6 w-6" /> : <Shield className="h-6 w-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Two-Factor Authentication (2FA)
              </h3>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  status.enabled
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-500"
                    : "bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-600 dark:text-zinc-400"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    status.enabled ? "bg-emerald-500" : "bg-gray-400 dark:bg-zinc-500"
                  }`}
                />
                {status.enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
              Add a mandatory extra verification step during sign in using TOTP authenticator apps.
            </p>
          </div>
        </div>

        {/* Top Action Button */}
        <div>
          {status.enabled ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setNewRecoveryCodes(null);
                  setRegenToken("");
                  setRegenError("");
                  setIsRegenOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-zinc-200 transition hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Regenerate Codes
              </button>
              <button
                type="button"
                onClick={() => {
                  setDisableCode("");
                  setDisableError("");
                  setIsDisableOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-600 dark:text-red-400 transition hover:bg-red-100 dark:hover:bg-red-500/20"
              >
                Disable 2FA
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleOpenSetup}
              disabled={isSubmitting || loading}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-md ${
                status.hasPassword === false
                  ? "bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                  : "bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20 disabled:opacity-50"
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              {status.hasPassword === false ? "Password Required" : "Set Up 2FA"}
            </button>
          )}
        </div>
      </div>

      {/* Body Information */}
      <div className="pt-6">
        {status.enabled ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
              <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" />
              <div className="text-xs text-gray-700 dark:text-zinc-300">
                <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                  Your account is protected by Two-Factor Authentication
                </p>
                <p className="mt-0.5 text-gray-500 dark:text-zinc-400">
                  Every sign in requires your password and a verification code from your authenticator app.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.01]">
              <div className="flex items-center gap-3">
                <KeyRound className="h-4 w-4 text-zinc-500" />
                <div>
                  <p className="text-xs font-semibold text-gray-900 dark:text-white">
                    Emergency Backup Recovery Codes
                  </p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    Remaining active recovery codes: <strong className="text-gray-900 dark:text-white">{status.recoveryCodesCount} of 8</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNewRecoveryCodes(null);
                  setRegenToken("");
                  setRegenError("");
                  setIsRegenOpen(true);
                }}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline text-left sm:text-right"
              >
                Regenerate 8 new codes
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {status.hasPassword === false && (
              <div className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div className="text-xs">
                  <p className="font-semibold text-amber-700 dark:text-amber-300">
                    Password Required Before Enabling 2FA
                  </p>
                  <p className="mt-1 text-amber-800/90 dark:text-amber-200/90 leading-relaxed">
                    Your account does not currently have a password registered (common for users who sign in using Google). To ensure you are never locked out of your account, please set and save a password in the <strong>New Password</strong> section above before enabling Two-Factor Authentication.
                  </p>
                </div>
              </div>
            )}
            <div className="text-xs leading-relaxed text-gray-600 dark:text-zinc-400 space-y-2">
              <p>
                Two-factor authentication adds an essential layer of security to your Ensemble account. In addition to your password, you will be required to provide a 6-digit code from an authenticator app (such as Google Authenticator, Microsoft Authenticator, Authy, or 1Password) when logging in.
              </p>
              <p className="text-gray-500 dark:text-zinc-500">
                When you set up 2FA, 8 emergency recovery codes will be generated so you can still access your account if your device is unavailable.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ─── 1. SETUP MODAL ─── */}
      {isSetupOpen && setupData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-zinc-900 max-h-[90vh] overflow-y-auto">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setIsSetupOpen(false)}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-gray-900 dark:text-white">
                  Enable Two-Factor Authentication
                </h4>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  Follow the 3 steps below to activate 2FA
                </p>
              </div>
            </div>

            <div className="space-y-6 pt-2">
              {/* Step 1: Scan QR Code */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]">
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
                    1
                  </span>
                  <span className="text-xs font-bold text-gray-900 dark:text-white">
                    Scan this QR code with your authenticator app
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center py-2">
                  <div className="p-3 bg-white rounded-xl shadow-inner border border-gray-200" ref={qrRef} />
                </div>

                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-white/10 text-center">
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 mb-1.5">
                    Can't scan the QR code? Enter this secret manually:
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <code className="text-xs font-mono px-2.5 py-1 rounded-lg bg-gray-200 dark:bg-black/40 text-gray-900 dark:text-zinc-200 select-all tracking-wider">
                      {setupData.secret}
                    </code>
                    <button
                      type="button"
                      onClick={() => copySecret(setupData.secret)}
                      className="p-1.5 rounded-lg border border-gray-300 dark:border-white/10 text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/10"
                      title="Copy Secret"
                    >
                      {copiedSecret ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 2: 8 Recovery Codes */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
                      2
                    </span>
                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                      Save your 8 emergency recovery codes
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-gray-500 dark:text-zinc-400 mb-3">
                  If you lose your device, each code can be used once to access your account. Download or copy them now.
                </p>

                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-gray-100 dark:bg-black/30 border border-gray-200 dark:border-white/10 font-mono text-xs text-gray-800 dark:text-zinc-200">
                  {setupData.recoveryCodes.map((code, idx) => (
                    <div key={idx} className="flex items-center justify-between px-2 py-1 bg-white dark:bg-white/5 rounded">
                      <span className="text-gray-400 dark:text-zinc-500 text-[10px]">{idx + 1}.</span>
                      <span className="font-semibold tracking-wider">{code}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => copyRecoveryCodes(setupData.recoveryCodes)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-white/10"
                  >
                    {copiedCodes ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    Copy all
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadRecoveryCodesTxt(setupData.recoveryCodes)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 dark:bg-white text-xs font-semibold text-white dark:text-zinc-900 hover:bg-gray-800 dark:hover:bg-zinc-200"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download .txt
                  </button>
                </div>
              </div>

              {/* Step 3: Verify and activate */}
              <form onSubmit={handleConfirmEnable} className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]">
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
                    3
                  </span>
                  <span className="text-xs font-bold text-gray-900 dark:text-white">
                    Enter the 6-digit code from your app
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="000 000"
                    value={verificationToken}
                    onChange={(e) => {
                      setVerificationToken(e.target.value.replace(/\D/g, "").slice(0, 6));
                      setSetupError("");
                    }}
                    className="flex-1 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2 text-center text-lg font-mono tracking-widest text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={verificationToken.length !== 6 || isSubmitting}
                    className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    {isSubmitting ? "Verifying..." : "Verify & Activate"}
                  </button>
                </div>

                {setupError && (
                  <div className="flex items-center gap-1.5 mt-2.5 text-xs text-red-500">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{setupError}</span>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─── 2. DISABLE MODAL ─── */}
      {isDisableOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-red-500/20 bg-white p-6 shadow-2xl dark:border-red-500/30 dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => setIsDisableOpen(false)}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-gray-900 dark:text-white">
                  Disable Two-Factor Authentication
                </h4>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  Confirmation required
                </p>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-gray-600 dark:text-zinc-300 mb-4">
              Disabling 2FA will remove two-factor protection from your account and will{" "}
              <strong>permanently delete all 8 recovery codes</strong>. Enter your current 6-digit code or an emergency recovery code to proceed.
            </p>

            <form onSubmit={handleConfirmDisable} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                  Verification Code or Recovery Code
                </label>
                <input
                  type="text"
                  placeholder="6-digit code or recovery code"
                  value={disableCode}
                  onChange={(e) => {
                    setDisableCode(e.target.value);
                    setDisableError("");
                  }}
                  className="w-full rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-red-500"
                  autoFocus
                />
                {disableError && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {disableError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDisableOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-white/10 text-xs font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!disableCode.trim() || isSubmitting}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white transition disabled:opacity-50"
                >
                  {isSubmitting ? "Disabling..." : "Confirm & Disable 2FA"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 3. REGENERATE CODES MODAL ─── */}
      {isRegenOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => setIsRegenOpen(false)}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-gray-900 dark:text-white">
                  Regenerate Recovery Codes
                </h4>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  Replace all existing recovery codes
                </p>
              </div>
            </div>

            {newRecoveryCodes ? (
              <div className="space-y-4">
                <p className="text-xs text-gray-600 dark:text-zinc-300">
                  Your 8 new recovery codes are ready. Previous recovery codes are now invalid. Save these codes immediately:
                </p>

                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-gray-100 dark:bg-black/30 border border-gray-200 dark:border-white/10 font-mono text-xs text-gray-800 dark:text-zinc-200">
                  {newRecoveryCodes.map((code, idx) => (
                    <div key={idx} className="flex items-center justify-between px-2 py-1 bg-white dark:bg-white/5 rounded">
                      <span className="text-gray-400 dark:text-zinc-500 text-[10px]">{idx + 1}.</span>
                      <span className="font-semibold tracking-wider">{code}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => copyRecoveryCodes(newRecoveryCodes)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-white/10"
                  >
                    {copiedCodes ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    Copy all
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadRecoveryCodesTxt(newRecoveryCodes)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 dark:bg-white text-xs font-semibold text-white dark:text-zinc-900 hover:bg-gray-800 dark:hover:bg-zinc-200"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download .txt
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConfirmRegenerate} className="space-y-4">
                <p className="text-xs leading-relaxed text-gray-600 dark:text-zinc-300">
                  Enter the 6-digit code from your authenticator app to authorize regenerating 8 new recovery codes.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                    Authenticator 6-Digit Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="000 000"
                    value={regenToken}
                    onChange={(e) => {
                      setRegenToken(e.target.value.replace(/\D/g, "").slice(0, 6));
                      setRegenError("");
                    }}
                    className="w-full rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 text-center text-base font-mono tracking-widest text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                  {regenError && (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {regenError}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsRegenOpen(false)}
                    className="px-4 py-2 rounded-xl border border-gray-300 dark:border-white/10 text-xs font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={regenToken.length !== 6 || isSubmitting}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition disabled:opacity-50"
                  >
                    {isSubmitting ? "Verifying..." : "Generate 8 New Codes"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
