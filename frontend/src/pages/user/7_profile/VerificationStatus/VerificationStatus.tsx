import React, { useState } from "react";
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
  UserCheck
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
  const [verificationState, setVerificationState] = useState<"not_started" | "pending_review">("not_started");

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

  const handleStartVerification = () => {
    navigate("/account-verification/level-2/submit-id");
  };

  return (
    <div className="min-h-screen bg-[#080a12] font-['Plus Jakarta Sans',sans-serif] text-white overflow-y-auto selection:bg-blue-500/30">
      <div className="mx-auto max-w-4xl p-6 md:p-8 animate-[fadeIn_0.4s_ease-out]">

        {/* Navigation Breadcrumb */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-300 transition uppercase tracking-wider mb-8 group animate-[slideIn_0.3s_ease-out]"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Profile Workspace
        </button>

        {/* Level Milestone Progression Card */}
        <div className="relative mb-8 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/40 p-6 md:p-8 shadow-2xl backdrop-blur-xl animate-[slideIn_0.4s_ease-out_both] delay-75">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/[0.03] via-purple-500/[0.01] to-transparent" />

          <div className="relative z-10 flex flex-col gap-6">

            {/* Top Row: holds big verification badge alongside main text context */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 w-full">

              {/* Upgraded Circle Container for Current Verification Status Badge Asset */}
              <div className="flex-shrink-0 h-32 w-32 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center shadow-inner group transition duration-300 hover:border-emerald-500/30 hover:bg-emerald-500/[0.02]">
                <img
                  src="/icons/verification/lvl1_verified.png"
                  alt="Current Verification Badge"
                  className="h-27 w-27 object-contain filter drop-shadow-[0_0_8px_rgba(16,185,129,0.15)] transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              {/* Text Information Stack */}
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
              </div>
            </div>
          </div>
        </div>

        {/* Master 2-Column Split Track Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-[slideIn_0.5s_ease-out_both] delay-150">

          {/* COLUMN 1: LEVEL 1 (LEFT COLUMN) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <img src="/icons/verification/lvl1_verified.png" alt="Lvl1 Icon" className="h-7 w-7 object-contain filter drop-shadow-[0_0_2px_rgba(16,185,129,0.2)]" />
              <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Level 1 Milestones</h2>
            </div>

            <div className="space-y-3">
              {/* Card 1: Email Verification */}
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

              {/* Card 2: Account Activation */}
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

          {/* COLUMN 2: LEVEL 2 ROADMAP (RIGHT COLUMN) */}
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

        {/* UNIFIED PRIMARY CTA ACTION BUTTON */}
        <div className="pt-6 animate-[slideIn_0.4s_ease-out_both] delay-[500ms]">
          {verificationState === "not_started" ? (
            <button
              onClick={handleStartVerification}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:opacity-95 text-white rounded-xl text-sm font-bold tracking-wide transition-all duration-300 shadow-xl shadow-blue-500/10 hover:shadow-blue-500/20 group"
            >
              Start Verifying Now
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          ) : (
            <div className="w-full p-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.02] text-center text-xs font-medium text-amber-400/90 leading-relaxed">
              ⏳ Pipeline locked. Your files are currently safely routed to our verification team. You'll receive a global dashboard alert upon activation.
            </div>
          )}
        </div>

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