import React, { useState, useEffect, useRef } from "react";
import api from "@/lib/axios";
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
  Smartphone,
  Monitor,
  QrCode,
  Download,
  Copy,
  X,
  Link,
  Loader2,
  ShieldCheck,
  BadgeCheck,
  Calendar
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import QRCodeStyling from "qr-code-styling";

interface Level2Step {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

export const VerificationStatus: React.FC = () => {
  const navigate = useNavigate();
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const qrCodeInstance = useRef<QRCodeStyling | null>(null);

  // Track status check: "not_started" | "pending_review"
  const [verificationState, setVerificationState] = useState<"not_started" | "pending_review">("not_started");
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [sessionData, setSessionData] = useState<any>(null);
  const [showQRModal, setShowQRModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [verificationUrl, setVerificationUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [verificationExpiryDate, setVerificationExpiryDate] = useState<string | null>(null);

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
        
        console.log("Verification status:", response.data.data);
        console.log("Verification expiry date:", response.data.data?.expires_at);
      } catch (err) {
        console.error("Error fetching verification status:", err);
      }
    };

    // Check if device is mobile or PC
    const checkDevice = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
      const isMobileDevice = mobileRegex.test(userAgent.toLowerCase());
      setIsMobile(isMobileDevice);
      
      console.log(`Device detected: ${isMobileDevice ? 'Mobile' : 'PC'}`);
    };
    
    fetchVerificationStatus();
    checkDevice();
  }, []);

  // Generate QR code when modal opens
  useEffect(() => {
    if (showQRModal && !isMobile && sessionData && qrCodeRef.current) {
      // Clear previous QR code by removing all child nodes
      while (qrCodeRef.current.firstChild) {
        qrCodeRef.current.removeChild(qrCodeRef.current.firstChild);
      }

      // Extract URL from the response
      const url = sessionData.verification_url || 
                  sessionData.session?.verification_url || 
                  sessionData.session?.url || 
                  sessionData.url;
      
      if (!url) {
        console.error("No verification URL found in response:", sessionData);
        return;
      }
      
      setVerificationUrl(url);
      
      console.log("Generating QR code for URL:", url);
      
      // Create styled QR code with smaller size
      qrCodeInstance.current = new QRCodeStyling({
        width: 180,
        height: 180,
        type: "svg",
        data: url,
        image: "/icons/verification/lvl1_verified.png",
        dotsOptions: {
          color: "#06b6d4",
          type: "rounded"
        },
        backgroundOptions: {
          color: "#ffffff",
        },
        imageOptions: {
          crossOrigin: "anonymous",
          margin: 8,
          imageSize: 0.35
        },
        cornersSquareOptions: {
          type: "extra-rounded",
          color: "#3b82f6"
        },
        cornersDotOptions: {
          type: "dot",
          color: "#2563eb"
        }
      });

      qrCodeInstance.current.append(qrCodeRef.current);
    }

    // Cleanup on unmount or modal close
    return () => {
      if (qrCodeRef.current) {
        while (qrCodeRef.current.firstChild) {
          qrCodeRef.current.removeChild(qrCodeRef.current.firstChild);
        }
      }
      qrCodeInstance.current = null;
    };
  }, [showQRModal, isMobile, sessionData]);

  const handleStartVerification = async () => {
    // Prevent duplicate clicks
    if (isProcessing || isLoading || isVerified) {
      console.log("Already processing verification request or already verified");
      return;
    }

    setIsProcessing(true);
    setIsLoading(true);

    try {
      const response = await api.post("/api/verification/create-session");
      console.log("Verification session created:", response.data);
      
      // Store the full response data
      setSessionData(response.data);
      
      // Extract the verification URL
      const verificationUrl = response.data.verification_url || 
                             response.data.session?.verification_url || 
                             response.data.session?.url || 
                             response.data.url;
      
      const isDesktop = !isMobile;
      
      console.log("Verification URL:", verificationUrl);
      console.log("Is Desktop:", isDesktop);
      console.log("Full response data:", response.data);
      
      // If on PC and we have a URL, show QR modal
      if (isDesktop && verificationUrl) {
        setShowQRModal(true);
        console.log("Showing QR modal");
      } 
      // If on mobile, redirect to the verification URL
      else if (isMobile && verificationUrl) {
        window.location.href = verificationUrl;
      } else {
        console.error("No verification URL found in response");
        alert("Unable to create verification session. Please try again.");
      }
    } catch (error) {
      console.error("Error starting verification:", error);
      alert("An error occurred while starting verification. Please try again.");
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  };

  const handleDownloadQR = () => {
    if (qrCodeInstance.current) {
      const sessionId = sessionData?.verification_session_id || 
                        sessionData?.session?.verification_session_id ||
                        sessionData?.session?.session_id || 
                        sessionData?.session_id;
      qrCodeInstance.current.download({
        name: `verification-qr-${sessionId?.slice(0, 8) || 'session'}`,
        extension: "png"
      });
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(verificationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleCloseModal = () => {
    setShowQRModal(false);
    setIsProcessing(false);
    if (qrCodeRef.current) {
      while (qrCodeRef.current.firstChild) {
        qrCodeRef.current.removeChild(qrCodeRef.current.firstChild);
      }
    }
    qrCodeInstance.current = null;
  };

  // Format expiry date for display
  const formatExpiryDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Check if verification is expired
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
      description: "Upload a crisp, clear photo of your Passport, Driver's License, or National ID.",
      icon: <UploadCloud className="h-6 w-6" />,
    },
    {
      id: 2,
      title: "Data Extraction & Form",
      description: "System automatically parses your ID details to populate your credentials form.",
      icon: <FileText className="h-6 w-6" />,
    },
    {
      id: 3,
      title: "Biometric Liveness Test",
      description: "Quick camera check to verify real-time physical ownership of the identity.",
      icon: <Camera className="h-6 w-6" />,
    },
    {
      id: 4,
      title: "Admin Approval Queue",
      description: "Submitted credentials are locked for manual administrator review (Takes 1–3 business days).",
      icon: <Clock className="h-6 w-6" />,
    },
  ];

  // If verified, show the verified UI
  if (isVerified) {
    return (
      <div className="min-h-screen bg-[#080a12] font-['Plus Jakarta Sans',sans-serif] text-white overflow-y-auto selection:bg-blue-500/30">
        <div className="mx-auto max-w-4xl p-6 md:p-8 animate-[fadeIn_0.4s_ease-out]">
          {/* Back Button */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-300 transition uppercase tracking-wider group animate-[slideIn_0.3s_ease-out]"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Back to Profile Workspace
            </button>
          </div>

          {/* Verified Status Card - Hero Style */}
          <div className="relative mb-8 overflow-hidden rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent p-8 md:p-12 shadow-2xl backdrop-blur-xl animate-[slideIn_0.4s_ease-out_both] delay-75">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/[0.05] via-emerald-500/[0.02] to-transparent" />
            
            <div className="relative z-10 flex flex-col items-center text-center">
              {/* Animated Badge */}
              <div className="relative mb-6">
                <div className="absolute inset-0 animate-ping rounded-full bg-green-500/20" />
                <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-2 border-green-500/30 shadow-xl shadow-green-500/20">
                  <BadgeCheck className="h-16 w-16 text-green-400" strokeWidth={1.5} />
                </div>
              </div>

              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-2">
                Identity Verified
              </h1>

              <p className="text-base text-zinc-300 max-w-2xl leading-relaxed">
                Your identity has been successfully verified. You now have full access to all verified features and elevated account privileges.
              </p>

              {/* Expiry Date Display */}
              {verificationExpiryDate && (
                <div className={`mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium border ${
                  isVerificationExpired() 
                    ? 'border-red-500/30 bg-red-500/10 text-red-400'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                }`}>
                  <Calendar className="h-4 w-4" />
                  <span>
                    {isVerificationExpired() ? 'Expired on: ' : 'Valid until: '}
                    {formatExpiryDate(verificationExpiryDate)}
                  </span>
                  {isVerificationExpired() && (
                    <span className="ml-1 text-xs font-bold uppercase">(Expired)</span>
                  )}
                </div>
              )}

              {/* Feature Highlights */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl">
                <div className="flex items-center justify-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-2.5">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span className="text-xs text-zinc-300">Full Account Access</span>
                </div>
                <div className="flex items-center justify-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-2.5">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span className="text-xs text-zinc-300">Verified Badge</span>
                </div>
                <div className="flex items-center justify-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-2.5">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span className="text-xs text-zinc-300">Priority Support</span>
                </div>
              </div>

              {/* Re-verify Button if Expired */}
              {isVerificationExpired() && (
                <button
                  onClick={() => {
                    setIsVerified(false);
                    setVerificationState("not_started");
                  }}
                  className="mt-6 flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg text-white text-sm font-bold transition-all hover:opacity-90 shadow-lg shadow-blue-500/20"
                >
                  <ArrowRight className="h-4 w-4" />
                  Re-verify Identity
                </button>
              )}
            </div>
          </div>

          {/* Completed Level 2 Steps - All Checked */}
          <div className="space-y-4 animate-[slideIn_0.5s_ease-out_both] delay-150">
            <div className="flex items-center gap-2 px-1">
              <img src="/icons/verification/lvl2_verified.png" alt="Lvl2 Icon" className="h-7 w-7 object-contain" />
              <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Level 2 Completed</h2>
            </div>

            <div className="space-y-3">
              {level2Checkpoints.map((step, index) => (
                <div
                  key={step.id}
                  style={{ animationDelay: `${200 + index * 50}ms` }}
                  className="relative flex items-start gap-4 p-4 rounded-xl border border-green-500/10 bg-green-500/[0.02] hover:border-green-500/20 transition-all duration-300 animate-[slideIn_0.4s_ease-out_both]"
                >
                  <div className="p-3.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 flex-shrink-0 mt-0.5">
                    {step.icon}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold tracking-tight text-white">
                        Step {step.id}: {step.title}
                      </h4>
                      <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-green-400 px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20">
                        <CheckCircle2 className="h-3 w-3" />
                        Completed
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Crypto Disclaimer */}
          <div className="mt-6 flex items-start gap-3 border border-white/5 bg-gradient-to-r from-blue-500/[0.02] to-transparent p-4 rounded-xl animate-[fadeIn_0.5s_ease-out_both] delay-[600ms]">
            <Info className="h-4 w-4 text-zinc-600 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-zinc-500 leading-relaxed font-normal">
              Zero-Knowledge Proof Compliant: All verification data is securely stored and encrypted. Your identity is protected with military-grade encryption standards.
            </p>
          </div>

          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideIn {
              from {
                opacity: 0;
                transform: translateY(12px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // If not verified, show the verification UI
  return (
    <div className="min-h-screen bg-[#080a12] font-['Plus Jakarta Sans',sans-serif] text-white overflow-y-auto selection:bg-blue-500/30">
      <div className="mx-auto max-w-4xl p-6 md:p-8 animate-[fadeIn_0.4s_ease-out]">
        {/* Device Indicator */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-300 transition uppercase tracking-wider group animate-[slideIn_0.3s_ease-out]"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Profile Workspace
          </button>
          
          <div className="flex items-center gap-2 text-xs text-zinc-500 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
            {isMobile ? (
              <>
                <Smartphone className="h-3.5 w-3.5 text-cyan-400" />
                <span className="font-mono text-[10px] text-cyan-400/70">Mobile Device</span>
              </>
            ) : (
              <>
                <Monitor className="h-3.5 w-3.5 text-purple-400" />
                <span className="font-mono text-[10px] text-purple-400/70">Desktop PC</span>
              </>
            )}
          </div>
        </div>

        {/* Level Milestone Progression Card */}
        <div className="relative mb-8 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/40 p-6 md:p-8 shadow-2xl backdrop-blur-xl animate-[slideIn_0.4s_ease-out_both] delay-75">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/[0.03] via-purple-500/[0.01] to-transparent" />

          <div className="relative z-10 flex flex-col gap-6">
            {/* Top Row */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 w-full">
              <div className="flex-shrink-0 h-32 w-32 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center shadow-inner group transition duration-300 hover:border-emerald-500/30 hover:bg-emerald-500/[0.02]">
                <img
                  src="/icons/verification/lvl1_verified.png"
                  alt="Current Verification Badge"
                  className="h-27 w-27 object-contain filter drop-shadow-[0_0_8px_rgba(16,185,129,0.15)] transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              <div className="text-center sm:text-left flex-1">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-0.5 text-[10px] font-bold text-emerald-400 mb-2 tracking-wide uppercase">
                  <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                  Current Verification Level : 1
                </div>

                <h1 className="text-2xl font-black tracking-tight text-white md:text-3xl">
                  Identity Verification Tracks
                </h1>
                <p className="mt-1 text-sm text-zinc-400 max-w-xl leading-relaxed">
                  Your email is safely authenticated. Progress through the sequential checkpoints below to elevate your account parameters to Level 2 status.
                </p>
                
                {/* Mobile/PC Instruction */}
                <div className="mt-3 inline-flex items-center gap-2 text-xs text-cyan-400/70 bg-cyan-500/5 px-3 py-1.5 rounded-full border border-cyan-500/10">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  {isMobile ? (
                    "📱 Continue verification on this device"
                  ) : (
                    "🖥️ You'll get a QR code to scan with your phone"
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Master 2-Column Split Track Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-[slideIn_0.5s_ease-out_both] delay-150">
          {/* COLUMN 1: LEVEL 1 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <img src="/icons/verification/lvl1_verified.png" alt="Lvl1 Icon" className="h-7 w-7 object-contain filter drop-shadow-[0_0_2px_rgba(16,185,129,0.2)]" />
              <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Level 1 Milestones</h2>
            </div>

            <div className="space-y-3">
              <div className="relative rounded-xl border border-emerald-500/10 bg-emerald-500/[0.01] p-5 flex flex-col justify-between border-l-2 border-l-emerald-500 shadow-md min-h-[140px]">
                <div className="flex items-start gap-4">
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex-shrink-0">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/5 border border-emerald-500/10">Step 1.1</span>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex-shrink-0">
                        <CheckCircle2 className="h-3 w-3" /> Done
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-zinc-200 mt-1.5">Email Verification</h3>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">Primary operational email has been fully verified and logged.</p>
                  </div>
                </div>
              </div>

              <div className="relative rounded-xl border border-emerald-500/10 bg-emerald-500/[0.01] p-5 flex flex-col justify-between border-l-2 border-l-emerald-500 shadow-md min-h-[140px]">
                <div className="flex items-start gap-4">
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex-shrink-0">
                    <UserCheck className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/5 border border-emerald-500/10">Step 1.2</span>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex-shrink-0">
                        <CheckCircle2 className="h-3 w-3" /> Done
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-zinc-200 mt-1.5">Account Activation</h3>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">Ecosystem profile parameters generated and synchronized safely.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMN 2: LEVEL 2 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <img src="/icons/verification/lvl2_verified.png" alt="Lvl2 Icon" className="h-7 w-7 object-contain filter drop-shadow-[0_0_2px_rgba(6,182,212,0.2)]" />
                <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Level 2 Roadmap (4 Steps)</h2>
              </div>
              {verificationState === "pending_review" && (
                <span className="text-xs text-amber-400 font-mono font-bold animate-pulse">Pending Review</span>
              )}
            </div>

            <div className="space-y-3">
              {level2Checkpoints.map((step, index) => (
                <div
                  key={step.id}
                  style={{ animationDelay: `${200 + index * 50}ms` }}
                  className={`relative flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.005] hover:border-white/10 transition-all duration-300 transform hover:translate-x-0.5 animate-[slideIn_0.4s_ease-out_both] ${
                    verificationState === "pending_review" && step.id === 4
                      ? "border-amber-500/30 bg-amber-500/[0.02]"
                      : ""
                  }`}
                >
                  <div className={`p-3.5 rounded-xl border flex-shrink-0 mt-0.5 transition-colors ${
                    verificationState === "pending_review" && step.id === 4
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      : "bg-zinc-900 border-white/5 text-zinc-400"
                  }`}>
                    {step.icon}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold tracking-tight text-white">
                        Step {step.id}: {step.title}
                      </h4>
                      {verificationState === "pending_review" && step.id === 4 && (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 animate-pulse">
                          Awaiting Verification
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Unified CTA Button - Shows only when not verified */}
        <div className="pt-6 animate-[slideIn_0.4s_ease-out_both] delay-[500ms]">
          {verificationState === "not_started" ? (
            <button
              onClick={handleStartVerification}
              disabled={isLoading || isProcessing}
              className={`w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:opacity-95 text-white rounded-xl text-sm font-bold tracking-wide transition-all duration-300 shadow-xl shadow-blue-500/10 hover:shadow-blue-500/20 group ${
                (isLoading || isProcessing) ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Session...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  Start Verification
                </>
              )}
            </button>
          ) : (
            <div className="w-full p-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.02] text-center text-xs font-medium text-amber-400/90 leading-relaxed">
              ⏳ Pipeline locked. Your files are currently safely routed to our verification team. You'll receive a global dashboard alert upon activation.
            </div>
          )}
        </div>

        {/* QR Code Modal - Only for desktop */}
        {showQRModal && !isMobile && sessionData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.3s_ease-out]">
            <div className="relative w-full max-w-sm bg-[#0f121e] rounded-2xl border border-white/10 shadow-2xl p-5 animate-[slideIn_0.3s_ease-out]">
              
              {/* Close Button */}
              <button
                onClick={handleCloseModal}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Modal Header */}
              <div className="text-center mb-4">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold mb-2">
                  <QrCode className="h-3 w-3" />
                  Scan to Continue
                </div>
                <h2 className="text-lg font-bold text-white">Verify on Your Phone</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Scan the QR code below with your mobile device to complete verification
                </p>
              </div>

              {/* QR Code - Smaller and centered */}
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-white rounded-lg shadow-lg shadow-cyan-500/10 relative">
                  <div ref={qrCodeRef} className="w-[180px] h-[180px] flex items-center justify-center" />
                  
                  {/* Download Button Overlay - Smaller */}
                  <button
                    onClick={handleDownloadQR}
                    className="absolute -bottom-2 -right-2 p-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full shadow-md shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all duration-300 hover:scale-110"
                    title="Download QR Code"
                  >
                    <Download className="h-3.5 w-3.5 text-white" />
                  </button>
                </div>
              </div>

              {/* Copy Link Section - Compact */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 justify-center">
                  <Link className="h-3 w-3" />
                  <span>Or copy the link to open on your phone</span>
                </div>
                
                <div className="flex items-center gap-1.5 bg-white/5 rounded-lg border border-white/10 p-1">
                  <input
                    type="text"
                    value={verificationUrl}
                    readOnly
                    className="flex-1 bg-transparent px-2 py-1.5 text-[10px] text-zinc-300 outline-none font-mono truncate"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-md text-white text-[10px] font-bold transition-all hover:opacity-90 whitespace-nowrap"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>

                {/* Session Info - Updated for new schema */}
                <div className="flex justify-center gap-3 text-[9px] text-zinc-500">
                  <span>Session: {sessionData?.verification_session_id?.slice(0, 12) || 'N/A'}</span>
                  <span>•</span>
                  <span className="text-emerald-400/60">KYC: {sessionData?.kyc_status || 'Not Started'}</span>
                  <span>•</span>
                  <span className="text-blue-400/60">Status: {sessionData?.verification_status || 'Pending'}</span>
                </div>
              </div>

              {/* Close Button at Bottom - More compact */}
              <button
                onClick={handleCloseModal}
                className="w-full mt-3 py-2 text-xs text-zinc-400 hover:text-white font-medium transition-colors border-t border-white/5 pt-3"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Cryptographic Vault Warning Disclaimer */}
        <div className="mt-6 flex items-start gap-3 border border-white/5 bg-gradient-to-r from-blue-500/[0.02] to-transparent p-4 rounded-xl animate-[fadeIn_0.5s_ease-out_both] delay-[600ms]">
          <Info className="h-4 w-4 text-zinc-600 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-zinc-500 leading-relaxed font-normal">
            Zero-Knowledge Proof Compliant: Extracted operational details are strictly cross-referenced inside verified sandboxes. Private identification documents undergo structural scrubbing post-review to guarantee complete asset account containment.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default VerificationStatus;