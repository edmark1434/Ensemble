import React, { useState, useEffect } from "react";
import api from "@/lib/axios";
import { showErrorToast } from "@/components/utility/toast";
import {
  CheckCircle2,
  ArrowLeft,
  UploadCloud,
  FileText,
  Camera,
  Clock,
  Mail,
  Info,
  ArrowRight,
  UserCheck,
  ShieldCheck,
  Smartphone,
  Monitor,
  Loader2,
  BadgeCheck,
  Calendar,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Level2Step {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

export const VerificationStatus: React.FC = () => {
  const navigate = useNavigate();
  // Track status check: "not_started" | "pending_review"
  const [verificationState, setVerificationState] = useState<
    "not_started" | "pending_review"
  >("not_started");
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [verificationExpiryDate, setVerificationExpiryDate] = useState<
    string | null
  >(null);

  useEffect(() => {
    const fetchVerificationStatus = async () => {
      try {
        const response = await api.get("/api/verification/status");
        const verified = response.data.data?.is_verified || false;
        setIsVerified(verified);

        // Set the expiry date from the response
        setVerificationExpiryDate(response.data.data?.expires_at || null);

        // If user is verified, set state to pending_review or completed
        if (verified) {
          setVerificationState("pending_review");
        }
      } catch (err) {
        console.error("Error fetching verification status:", err);
      }
    };

    // Check if device is mobile or PC
    const checkDevice = () => {
      const userAgent =
        navigator.userAgent ||
        navigator.vendor ||
        (window as Window & { opera?: string }).opera ||
        "";
      const mobileRegex =
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
      const isMobileDevice = mobileRegex.test(userAgent.toLowerCase());
      setIsMobile(isMobileDevice);
    };

    fetchVerificationStatus();
    checkDevice();
  }, []);

  const handleStartVerification = async () => {
    if (isProcessing || isLoading || isVerified) return;

    setIsProcessing(true);
    setIsLoading(true);

    try {
      const response = await api.post("/api/verification/create-session");
      const verificationUrl =
        response.data.verification_url ||
        response.data.session?.verification_url ||
        response.data.session?.url ||
        response.data.url;

      if (verificationUrl) {
        window.location.href = verificationUrl;
      } else {
        showErrorToast("Unable to create verification session. Please try again.");
      }
    } catch (error) {
      console.error("Error starting verification:", error);
      showErrorToast("An error occurred while starting verification. Please try again.");
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  };

  const formatExpiryDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isVerificationExpired = () => {
    if (!verificationExpiryDate) return false;
    const expiryDate = new Date(verificationExpiryDate);
    const now = new Date();
    return expiryDate < now;
  };

  const level2Checkpoints: Level2Step[] = [
    {
      id: 1,
      title: "Valid ID Submission",
      description:
        "Upload a crisp, clear photo of your Passport, Driver's License, or National ID.",
      icon: <UploadCloud className="h-5 w-5" />,
    },
    {
      id: 2,
      title: "Data Extraction & Form",
      description:
        "System automatically parses your ID details to populate your credentials form.",
      icon: <FileText className="h-5 w-5" />,
    },
    {
      id: 3,
      title: "Biometric Liveness Test",
      description:
        "Quick camera check to verify real-time physical ownership of the identity.",
      icon: <Camera className="h-5 w-5" />,
    },
    {
      id: 4,
      title: "Admin Approval Queue",
      description:
        "Submitted credentials are locked for manual administrator review (Takes 1–3 business days).",
      icon: <Clock className="h-5 w-5" />,
    },
  ];

  // If verified, show the verified UI
  if (isVerified) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-base font-['Plus_Jakarta_Sans',sans-serif] text-gray-900 dark:text-white overflow-y-auto">
        <div className="mx-auto max-w-4xl p-6 md:p-8" data-tour="verification-status">
          {/* Back Button */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate("/home")}
              className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition uppercase tracking-wider group cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              <span>Back to Home</span>
            </button>
          </div>

          {/* Verified Status Card - Crisp Neutral Card with Vibrant Green Verified Accent */}
          <div className="relative mb-8 overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-8 md:p-10 shadow-xs">
            {/* Subtle soft ambient glow centered behind the badge */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-32 bg-emerald-500/10 dark:bg-emerald-500/15 blur-3xl pointer-events-none rounded-full" />

            <div className="relative z-10 flex flex-col items-center text-center">
              {/* Green Identity Verified Badge */}
              <div className="relative mb-4">
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-500/30 shadow-lg shadow-emerald-500/15">
                  <BadgeCheck
                    className="h-12 w-12 text-emerald-600 dark:text-emerald-400"
                    strokeWidth={1.75}
                  />
                </div>
              </div>

              {/* Status pill tag */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-xs font-bold tracking-wide uppercase mb-2">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Identity Verified</span>
              </div>

              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-2">
                Identity Verified
              </h1>

              <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 max-w-xl mx-auto leading-relaxed">
                Your identity has been successfully verified. You now have full access to all verified features and elevated account privileges.
              </p>

              {/* Expiry Date Display */}
              {verificationExpiryDate && (
                <div
                  className={`mt-4 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold border ${
                    isVerificationExpired()
                      ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
                      : "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] text-gray-700 dark:text-zinc-300"
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    {isVerificationExpired() ? "Expired on: " : "Valid until: "}
                    {formatExpiryDate(verificationExpiryDate)}
                  </span>
                  {isVerificationExpired() && (
                    <span className="ml-1 text-[10px] font-bold uppercase">(Expired)</span>
                  )}
                </div>
              )}

              {/* Feature Highlights */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl">
                <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-white/[0.02] px-4 py-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-xs font-semibold text-gray-800 dark:text-zinc-200">
                    Full Account Access
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-white/[0.02] px-4 py-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-xs font-semibold text-gray-800 dark:text-zinc-200">
                    Verified Badge
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-white/[0.02] px-4 py-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-xs font-semibold text-gray-800 dark:text-zinc-200">
                    Priority Support
                  </span>
                </div>
              </div>

              {/* Re-verify Button if Expired */}
              {isVerificationExpired() && (
                <button
                  onClick={() => {
                    setIsVerified(false);
                    setVerificationState("not_started");
                  }}
                  className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <ArrowRight className="h-4 w-4" />
                  <span>Re-verify Identity</span>
                </button>
              )}
            </div>
          </div>

          {/* Completed Level 2 Steps - Clean Neutral Cards with Emerald Badges */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <img
                src="/icons/verification/lvl2_verified.png"
                alt="Lvl2 Icon"
                className="h-6 w-6 object-contain"
              />
              <h2 className="text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
                Level 2 Completed
              </h2>
            </div>

            <div className="space-y-2.5">
              {level2Checkpoints.map((step) => (
                <div
                  key={step.id}
                  className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-4 flex items-start gap-4 shadow-2xs hover:border-gray-300 dark:hover:border-white/20 transition-colors"
                >
                  <div className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/[0.05] border border-gray-200/80 dark:border-white/10 text-gray-700 dark:text-zinc-300 shrink-0 mt-0.5">
                    {step.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs sm:text-sm font-bold tracking-tight text-gray-900 dark:text-white">
                        Step {step.id}: {step.title}
                      </h4>
                      <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        Completed
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-zinc-400 mt-0.5 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Zero-Knowledge Disclaimer */}
          <div className="mt-6 flex items-start gap-3 border border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.02] p-4 rounded-xl">
            <Info className="h-4 w-4 text-gray-400 dark:text-zinc-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed font-normal">
              Zero-Knowledge Proof Compliant: All verification data is securely stored and encrypted. Your identity is protected with military-grade encryption standards.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If not verified, show the verification pipeline UI
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-base font-['Plus_Jakarta_Sans',sans-serif] text-gray-900 dark:text-white overflow-y-auto">
      <div className="mx-auto max-w-4xl p-6 md:p-8">
        {/* Device Indicator */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate("/home")}
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition uppercase tracking-wider group cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to Home</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-zinc-300 bg-white dark:bg-dark-surface px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/10 shadow-2xs">
            {isMobile ? (
              <>
                <Smartphone className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span className="font-mono text-[10px] text-gray-600 dark:text-zinc-400">Mobile Device</span>
              </>
            ) : (
              <>
                <Monitor className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                <span className="font-mono text-[10px] text-gray-600 dark:text-zinc-400">Desktop PC</span>
              </>
            )}
          </div>
        </div>

        {/* Level Milestone Progression Card */}
        <div className="relative mb-8 overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 md:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 w-full">
            <div className="shrink-0 h-28 w-28 rounded-full bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 flex items-center justify-center shadow-inner">
              <img
                src="/icons/verification/lvl1_verified.png"
                alt="Current Verification Badge"
                className="h-22 w-22 object-contain"
              />
            </div>

            <div className="text-center sm:text-left flex-1">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mb-2 tracking-wide uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Current Verification: Level 1</span>
              </div>

              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white md:text-3xl">
                Identity Verification Tracks
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-zinc-400 max-w-xl leading-relaxed">
                Your email is safely authenticated. Progress through the sequential checkpoints below to elevate your account parameters to Level 2 status.
              </p>

              <div className="mt-3 inline-flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/10 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span>
                  {isMobile
                    ? "Continue verification on this mobile device"
                    : "Continue verification in your desktop browser"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Master 2-Column Split Track Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* COLUMN 1: LEVEL 1 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <img
                src="/icons/verification/lvl1_verified.png"
                alt="Lvl1 Icon"
                className="h-6 w-6 object-contain"
              />
              <h2 className="text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
                Level 1 Milestones
              </h2>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-4 flex flex-col justify-between border-l-4 border-l-emerald-500 shadow-2xs min-h-[120px]">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/[0.05] border border-gray-200/80 dark:border-white/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                        Step 1.1
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 shrink-0">
                        <CheckCircle2 className="h-3 w-3" /> Done
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white mt-1.5">
                      Email Verification
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-zinc-400 mt-0.5 leading-relaxed">
                      Primary operational email has been fully verified and logged.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-4 flex flex-col justify-between border-l-4 border-l-emerald-500 shadow-2xs min-h-[120px]">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/[0.05] border border-gray-200/80 dark:border-white/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                        Step 1.2
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 shrink-0">
                        <CheckCircle2 className="h-3 w-3" /> Done
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white mt-1.5">
                      Account Activation
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-zinc-400 mt-0.5 leading-relaxed">
                      Ecosystem profile parameters generated and synchronized safely.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMN 2: LEVEL 2 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <img
                  src="/icons/verification/lvl2_verified.png"
                  alt="Lvl2 Icon"
                  className="h-6 w-6 object-contain"
                />
                <h2 className="text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
                  Level 2 Roadmap (4 Steps)
                </h2>
              </div>
              {verificationState === "pending_review" && (
                <span className="text-xs text-amber-600 dark:text-amber-400 font-mono font-bold animate-pulse">
                  Pending Review
                </span>
              )}
            </div>

            <div className="space-y-3">
              {level2Checkpoints.map((step) => (
                <div
                  key={step.id}
                  className={`rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-4 flex items-start gap-4 shadow-2xs hover:border-gray-300 dark:hover:border-white/20 transition-all ${
                    verificationState === "pending_review" && step.id === 4
                      ? "border-amber-500/30 bg-amber-500/[0.02]"
                      : ""
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-xl border flex-shrink-0 mt-0.5 transition-colors ${
                      verificationState === "pending_review" && step.id === 4
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                        : "bg-gray-100 dark:bg-white/[0.05] border-gray-200/80 dark:border-white/10 text-gray-600 dark:text-zinc-400"
                    }`}
                  >
                    {step.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs sm:text-sm font-bold tracking-tight text-gray-900 dark:text-white">
                        Step {step.id}: {step.title}
                      </h4>
                      {verificationState === "pending_review" && step.id === 4 && (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/10 border border-amber-500/20 animate-pulse">
                          Awaiting Review
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-zinc-400 mt-0.5 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Unified CTA Button */}
        <div className="pt-6">
          {verificationState === "not_started" ? (
            <button
              onClick={handleStartVerification}
              disabled={isLoading || isProcessing}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer active:scale-[0.99] disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating Session...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>Start Verification</span>
                </>
              )}
            </button>
          ) : (
            <div className="w-full p-4 rounded-xl border border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/[0.05] text-center text-xs font-medium text-amber-800 dark:text-amber-300 leading-relaxed">
              ⏳ Verification session submitted. Your documents are being processed by the compliance queue.
            </div>
          )}
        </div>

        {/* Cryptographic Vault Warning Disclaimer */}
        <div className="mt-6 flex items-start gap-3 border border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.02] p-4 rounded-xl">
          <Info className="h-4 w-4 text-gray-400 dark:text-zinc-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed font-normal">
            Zero-Knowledge Proof Compliant: Extracted operational details are strictly cross-referenced inside verified sandboxes. Private identification documents undergo structural scrubbing post-review to guarantee complete asset account containment.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerificationStatus;
