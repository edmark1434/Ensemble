import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Bold,
  Italic,
  List,
  Eye,
  EyeOff,
  X,
  AlertCircle,
  Link2,
  Plus,
  Minus,
  Info,
  Calculator,
  Clock,
  Sparkles,
  Loader2,
  FileText,
  User,
  Users,
} from "lucide-react";
import api from "@/lib/axios";
import type { Job } from "../../../job_components/job_lists";
import { CreditIcon } from "@/components/ui/credit-icon";
import { JobRichText } from "../../../job_components/JobRichText";
import { showSuccessToast, showErrorToast } from "@/components/utility/toast";
import { handleRichTextPaste, stripMarkdown } from "@/lib/markdownPaste";

interface ProposalPitchProps {
  job: Job | null;
  bidAmount: string;
  setBidAmount: (val: string) => void;
  additionalWorkRate: number;
  setAdditionalWorkRate: (val: number) => void;
  coverLetter: string;
  setCoverLetter: (val: string) => void;
  selectedMilestoneId?: string;
  setSelectedMilestoneId?: (id: string) => void;
  actingTeamId?: string;
  errors: { [key: string]: string };
  setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  screeningAnswers?: { question: string; answer: string }[];
  setScreeningAnswers?: React.Dispatch<React.SetStateAction<{ question: string; answer: string }[]>>;
  onNext: () => void;
  onBack: () => void;
}

export const ProposalPitchStep: React.FC<ProposalPitchProps> = ({
  job,
  bidAmount,
  setBidAmount,
  additionalWorkRate,
  setAdditionalWorkRate,
  coverLetter,
  setCoverLetter,
  actingTeamId,
  errors,
  setErrors,
  screeningAnswers = [],
  setScreeningAnswers,
  onNext,
  onBack,
}) => {
  const [showAddLink, setShowAddLink] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [linkTitle, setLinkTitle] = useState("");

  const coverLetterRef = useRef<HTMLTextAreaElement>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Joed AI Cover Letter Generation & 180s (3-minute) Cooldown State
  const [isAiConfirmOpen, setIsAiConfirmOpen] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [pitchTone, setPitchTone] = useState<"casual" | "direct" | "professional" | "narrative">("casual");

  const PITCH_TONE_OPTIONS: {
    id: "casual" | "direct" | "professional" | "narrative";
    label: string;
    desc: string;
  }[] = [
    {
      id: "casual",
      label: "Casual",
      desc: "Friendly, natural creator-to-client voice",
    },
    {
      id: "direct",
      label: "Direct",
      desc: "Straight to the point & deliverables",
    },
    {
      id: "professional",
      label: "Professional",
      desc: "Polished, reliable studio-grade tone",
    },
    {
      id: "narrative",
      label: "Narrative",
      desc: "Story-driven focus on pacing & flow",
    },
  ];

  const formatCooldown = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return mins > 0 ? `${mins}:${String(rem).padStart(2, "0")}` : `${secs}s`;
  };

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  const handleConfirmGeneratePitch = async () => {
    if (cooldownSeconds > 0 || isGeneratingAi) return;
    setIsGeneratingAi(true);
    try {
      const res = await api.post("/api/chat/generate-proposal-pitch", {
        title: job?.title || "",
        description: job?.description || "",
        category: job?.category || "",
        difficulty: job?.difficulty || "",
        skills: job?.skills || [],
        isTeam: Boolean(actingTeamId),
        tone: pitchTone,
      });
      const generatedPitch = res.data?.data?.coverLetter;
      if (generatedPitch) {
        setCoverLetter(String(generatedPitch).slice(0, 2000));
        setErrors((prev) => {
          const { coverLetter: _, ...rest } = prev;
          return rest;
        });
        setIsAiConfirmOpen(false);
        setCooldownSeconds(180);
        showSuccessToast("Joed AI generated your tailored cover letter pitch!");
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Joed AI could not generate the cover pitch right now. Please try again.";
      showErrorToast(msg);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Budget calculations
  const rawMin = Number(job?.minBudget) || 0;
  const rawMax = Number(job?.maxBudget) || 0;
  const isOpenBid = rawMax <= 0 || (job as any)?.budgetType === "open" || (job as any)?.budget_type === "open";
  const activeMinBudget = rawMin;
  const activeMaxBudget = isOpenBid ? 0 : rawMax;

  const handleFormat = (type: "bold" | "italic" | "list") => {
    const textarea = coverLetterRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = coverLetter.substring(start, end);
    let replacement = "";

    if (type === "bold") {
      replacement = `**${selectedText || "bold text"}**`;
    } else if (type === "italic") {
      replacement = `*${selectedText || "italic text"}*`;
    } else if (type === "list") {
      const lines = selectedText ? selectedText.split("\n") : ["List item 1", "List item 2"];
      replacement = lines.map((l) => (l.startsWith("- ") ? l : `- ${l}`)).join("\n");
    }

    const updated = coverLetter.substring(0, start) + replacement + coverLetter.substring(end);
    setCoverLetter(updated);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 0);
  };

  const handleAttachLink = () => {
    if (!linkInput.trim()) return;
    let url = linkInput.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    const label = linkTitle.trim() || url;
    const snippet = `\n\n🔗 **Work Sample Link**: [${label}](${url})`;
    setCoverLetter((prev) => prev + snippet);
    setLinkInput("");
    setLinkTitle("");
    setShowAddLink(false);
    showSuccessToast("External demo link added to your pitch!");
  };

  const formatCommaString = (val: string) => {
    if (!val) return "";
    const clean = val.replace(/,/g, "");
    if (isNaN(Number(clean))) return val;
    return Number(clean).toLocaleString();
  };

  useEffect(() => {
    if ((additionalWorkRate || 0) < 25) {
      setAdditionalWorkRate(25);
    }
  }, [additionalWorkRate, setAdditionalWorkRate]);

  const handleDecrementRate = () => {
    setAdditionalWorkRate(Math.max(25, (additionalWorkRate || 25) - 5));
  };

  const handleIncrementRate = () => {
    setAdditionalWorkRate(Math.min(100, (additionalWorkRate || 25) + 5));
  };

  const quickRatePresets = [25, 30, 35, 40, 50];
  const numericBid = parseInt(bidAmount || "0");
  const extraPassCredits = Math.round((numericBid * Math.max(25, additionalWorkRate || 25)) / 100);

  return (
    <div className="space-y-6 text-left">
      <style>{`
        @keyframes shineGleam {
          0% { transform: translateX(-150%) skewX(-20deg); }
          35% { transform: translateX(250%) skewX(-20deg); }
          100% { transform: translateX(250%) skewX(-20deg); }
        }
        .animate-shine-gleam {
          animation: shineGleam 3.5s ease-in-out infinite;
        }
      `}</style>

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
          Cover Pitch & Proposed Pricing
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          Pitch your production capabilities, answer screening questions, and set your baseline bid.
        </p>
      </div>

      {/* Full-Width Client Stated Budget Benchmark Banner */}
      <div className="p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider block">
            {isOpenBid ? "Client Benchmark (Open Bid)" : "Client Budget Benchmark"}
          </span>

          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wide bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
            {isOpenBid ? "Open Bid" : "Capped Ceiling"}
          </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1 border-t border-zinc-200/70 dark:border-zinc-800/80">
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">
              {isOpenBid ? "Starting Floor:" : "Budget Range:"}
            </span>
            <div className="flex items-center gap-1.5">
              <CreditIcon className="h-5 w-5 text-amber-500" />
              <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                {isOpenBid ? (
                  <span>From {activeMinBudget > 0 ? activeMinBudget.toLocaleString() : "100"} Credits</span>
                ) : (
                  <span>{activeMinBudget.toLocaleString()} ~ {activeMaxBudget.toLocaleString()} Credits</span>
                )}
              </span>
            </div>
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xl">
            {isOpenBid
              ? "The client is open to competitive proposals at any rate. You can bid above or below based on your scope."
              : `Bids are strictly capped at the client ceiling of ${activeMaxBudget.toLocaleString()} Credits.`}
          </p>
        </div>
      </div>

      {/* Two-Column Pitch & Pricing Grid (Stretched Equal Height) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column (5 Cols): Step 1 (Proposal Bid), Step 2 (Additional Work Rate), and Step 3 (Client Screening Questions) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* STEP 1: Your Proposal Bid Card */}
          <div className="p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-2xs space-y-3.5">
            <div className="flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                1
              </span>
              <label className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Your Proposal Bid <span className="text-red-500">*</span>
              </label>
            </div>

            <div className="space-y-1.5">
              <div className="relative h-11 flex items-center">
                <div className="absolute left-3.5 inset-y-0 flex items-center pointer-events-none">
                  <CreditIcon className="h-4 w-4 text-amber-500" />
                </div>
                <input
                  type="text"
                  placeholder={`e.g. ${activeMinBudget ? activeMinBudget.toLocaleString() : "100"}`}
                  value={formatCommaString(bidAmount)}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    setBidAmount(raw);
                    setErrors((prev) => {
                      const { bidAmount: _, ...rest } = prev;
                      return rest;
                    });
                  }}
                  onBlur={() => {
                    if (!bidAmount) return;
                    const num = parseInt(bidAmount);
                    if (num < 10) {
                      setErrors((prev) => ({
                        ...prev,
                        bidAmount: "A minimum bid of at least 10 Credits is required.",
                      }));
                    } else if (!isOpenBid && activeMaxBudget > 0 && num > activeMaxBudget) {
                      setErrors((prev) => ({
                        ...prev,
                        bidAmount: `Your bid cannot exceed the client's budget ceiling of ${activeMaxBudget.toLocaleString()} Credits.`,
                      }));
                    }
                  }}
                  className={`w-full h-11 rounded-xl border bg-white dark:bg-zinc-900/80 pl-10 pr-3.5 text-sm font-bold text-zinc-900 dark:text-white outline-none transition shadow-2xs ${
                    errors.bidAmount
                      ? "border-red-500 focus:border-red-500 ring-1 ring-red-500"
                      : "border-zinc-300 dark:border-zinc-700 focus:border-zinc-900 dark:focus:border-zinc-100"
                  }`}
                />
              </div>

              {/* Dynamic Status Indicator */}
              {errors.bidAmount ? (
                <p className="text-[11px] text-red-500 font-semibold flex items-center gap-1 pt-0.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.bidAmount}</span>
                </p>
              ) : numericBid >= 10 ? (
                !isOpenBid && activeMaxBudget > 0 && numericBid > activeMaxBudget ? (
                  <p className="text-[11px] text-red-500 font-semibold flex items-center gap-1 pt-0.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>Exceeds Budget Ceiling ({activeMaxBudget.toLocaleString()} Credits max)</span>
                  </p>
                ) : !isOpenBid && activeMaxBudget > 0 ? (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1 pt-0.5 font-medium">
                    <Check className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-300 shrink-0" />
                    <span>Within client budget ceiling</span>
                  </p>
                ) : isOpenBid ? (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1 pt-0.5 font-medium">
                    <Check className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-300 shrink-0" />
                    <span>Open bid • No ceiling limit</span>
                  </p>
                ) : null
              ) : null}
            </div>

            {/* Payout Summary */}
            {numericBid > 0 && (
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Calculator className="h-3 w-3" />
                    <span>Payout Summary</span>
                  </span>
                </div>

                <div className="space-y-1.5 text-xs pt-1 border-t border-zinc-200/60 dark:border-zinc-700/60">
                  <div className="flex justify-between items-center text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                    <span>10% Platform Escrow Fee</span>
                    <span>- {formatCommaString(String(Math.round(numericBid * 0.10)))} Credits</span>
                  </div>
                  <div className="flex justify-between items-center font-bold text-zinc-900 dark:text-white text-xs pt-0.5">
                    <span>Net Take-Home Earnings</span>
                    <span className="text-sm font-bold tracking-tight text-blue-600 dark:text-blue-400">
                      {formatCommaString(String(Math.round(numericBid * 0.90)))} Credits
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: Additional Work Rate Card */}
          <div className="p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-2xs space-y-3">
            <div className="flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                2
              </span>
              <label className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Additional Work Rate <span className="text-red-500">*</span>
              </label>
            </div>

            <p className="text-[11px] text-zinc-400">
              Rate applied per extra revision pass beyond included milestone allowances.
            </p>

            {/* Stepper Controls: [-] value [+] */}
            <div className="flex items-center justify-between gap-3 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40">
              <button
                type="button"
                onClick={handleDecrementRate}
                disabled={additionalWorkRate <= 25}
                className="h-9 w-9 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shadow-2xs"
                title="Decrease revision rate (-5%, min 25%)"
              >
                <Minus className="h-4 w-4" />
              </button>

              <div className="text-center min-w-[120px]">
                <div className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">
                  +{Math.max(25, additionalWorkRate)}%
                </div>
                <div className="text-[10px] text-zinc-400 font-medium">
                  {numericBid > 0 ? `+${extraPassCredits.toLocaleString()} cr / pass` : "per extra pass (min 25%)"}
                </div>
              </div>

              <button
                type="button"
                onClick={handleIncrementRate}
                disabled={additionalWorkRate >= 100}
                className="h-9 w-9 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shadow-2xs"
                title="Increase revision rate (+5%)"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Presets Pills */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold mr-1">Presets:</span>
              {quickRatePresets.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setAdditionalWorkRate(pct)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                    additionalWorkRate === pct
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  +{pct}%
                </button>
              ))}
            </div>
          </div>

          {/* STEP 3: Client Screening Questions Card (Left Column) */}
          {job?.screening_questions && job.screening_questions.length > 0 && (
            <div className="p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-2xs space-y-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    3
                  </span>
                  <label className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                    Client Screening Questions ({job.screening_questions.length}) <span className="text-red-500">*</span>
                  </label>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed pl-7">
                  Answer in plain text below. Work samples &amp; media files are uploaded in <span className="font-semibold text-zinc-700 dark:text-zinc-300">Step 3 (Terms &amp; TOS)</span>.
                </p>
              </div>

              <div className="space-y-3">
                {job.screening_questions.map((q, idx) => {
                  const currentAns = screeningAnswers.find((sa) => sa.question === q)?.answer || "";
                  return (
                    <div key={idx} className="space-y-1.5 p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40">
                      <div className="flex items-start gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        <span className="h-5 w-5 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] shrink-0 font-bold mt-0.5">
                          Q{idx + 1}
                        </span>
                        <span className="leading-snug">{q}</span>
                      </div>
                      <input
                        type="text"
                        placeholder="Write your response (no external links needed — attach samples in Step 3)..."
                        value={currentAns}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (setScreeningAnswers) {
                            setScreeningAnswers((prev) => {
                              const rest = prev.filter((item) => item.question !== q);
                              return [...rest, { question: q, answer: val }];
                            });
                          }
                          setErrors((prev) => {
                            const { screeningAnswers: _, ...rest } = prev;
                            return rest;
                          });
                        }}
                        className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition"
                      />
                    </div>
                  );
                })}
              </div>
              {errors.screeningAnswers && (
                <p className="text-[11px] text-red-500 font-semibold">{errors.screeningAnswers}</p>
              )}
            </div>
          )}
        </div>

        {/* Right Column (7 Cols): Height Strictly Driven by Left Column (on lg+) */}
        <div className="lg:col-span-7 flex flex-col gap-4 h-full min-h-[420px] lg:min-h-0">
          {/* STEP 4: Cover Letter Pitch Card */}
          <div className="flex-1 min-h-0 flex flex-col gap-3 p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-2xs">
            <div className="flex items-center justify-between flex-wrap gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                  {job?.screening_questions && job.screening_questions.length > 0 ? "4" : "3"}
                </span>
                <label className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                  Cover Letter Pitch <span className="text-red-500">*</span>
                </label>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Generate with Joed AI Button */}
                <button
                  type="button"
                  onClick={() => setIsAiConfirmOpen(true)}
                  disabled={cooldownSeconds > 0 || isGeneratingAi}
                  className={`relative overflow-hidden inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shadow-xs active:scale-95 ${
                    cooldownSeconds > 0
                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border border-blue-400/40 shadow-blue-500/20 ring-1 ring-white/20 hover:shadow-md hover:shadow-blue-500/30 cursor-pointer"
                  }`}
                  title={
                    cooldownSeconds > 0
                      ? `Joed AI on cooldown (${formatCooldown(cooldownSeconds)})`
                      : "Generate Cover Letter Pitch from Job Post using Joed AI"
                  }
                >
                  {cooldownSeconds === 0 && (
                    <span className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none animate-shine-gleam" />
                  )}
                  {cooldownSeconds > 0 ? (
                    <>
                      <Clock className="h-3 w-3 animate-spin text-zinc-400 dark:text-zinc-500 shrink-0" />
                      <span>Cooldown ({formatCooldown(cooldownSeconds)})</span>
                    </>
                  ) : (
                    <>
                      <img src="/ensemble_lg.svg" alt="Ensemble" className="h-3.5 w-3.5 shrink-0 rounded-xs" />
                      <span>Generate with Joed AI!</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsPreviewMode(!isPreviewMode)}
                  className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-[10px] font-bold text-zinc-600 dark:text-zinc-400 transition flex items-center gap-1 cursor-pointer"
                >
                  {isPreviewMode ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  <span>{isPreviewMode ? "Editor" : "Preview"}</span>
                </button>
              </div>
            </div>

            {/* Markdown Toolbar */}
            {!isPreviewMode && (
              <div className="flex items-center gap-1 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 shrink-0">
                <button
                  type="button"
                  onClick={() => handleFormat("bold")}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition cursor-pointer"
                  title="Bold"
                >
                  <Bold className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleFormat("italic")}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition cursor-pointer"
                  title="Italic"
                >
                  <Italic className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleFormat("list")}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition cursor-pointer"
                  title="Bulleted List"
                >
                  <List className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddLink(true)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition cursor-pointer ml-auto flex items-center gap-1 text-[10px] font-bold"
                >
                  <Link2 className="h-3 w-3" />
                  <span>Add Demo Link</span>
                </button>
              </div>
            )}

            {/* Link Input Dialog */}
            {showAddLink && (
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 space-y-2 shrink-0">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  <span>Attach External Work Sample Link</span>
                  <button type="button" onClick={() => setShowAddLink(false)} className="text-zinc-400 hover:text-zinc-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Title (e.g. YouTube Showreel)"
                    value={linkTitle}
                    onChange={(e) => setLinkTitle(e.target.value)}
                    className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-900 dark:text-white outline-none"
                  />
                  <input
                    type="text"
                    placeholder="URL (e.g. https://youtu.be/...)"
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-900 dark:text-white outline-none"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAttachLink}
                    className="px-3 py-1 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-bold hover:opacity-90 cursor-pointer"
                  >
                    Insert Link
                  </button>
                </div>
              </div>
            )}

            {/* Textarea or Preview (Height Strictly Locked to Remaining Space from Left Column on lg+) */}
            <div className="relative flex-1 min-h-[260px] lg:min-h-0">
              {isPreviewMode ? (
                <div className="lg:absolute lg:inset-0 h-full w-full p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed overflow-y-auto custom-scrollbar">
                  <JobRichText content={coverLetter || "*No pitch letter written yet.*"} />
                </div>
              ) : (
                <textarea
                  ref={coverLetterRef}
                  placeholder="Introduce your relevant experience, production workflow, editing toolsets (Premiere, Resolve, After Effects), and explain why your roadmap fits the client's brief..."
                  value={coverLetter}
                  onChange={(e) => {
                    setCoverLetter(e.target.value);
                    setErrors((prev) => {
                      const { coverLetter: _, ...rest } = prev;
                      return rest;
                    });
                  }}
                  onPaste={(e) => handleRichTextPaste(e, setCoverLetter)}
                  className={`lg:absolute lg:inset-0 h-full w-full rounded-xl border bg-white dark:bg-zinc-900/60 p-4 text-xs text-zinc-900 dark:text-white outline-none transition resize-none shadow-2xs leading-relaxed custom-scrollbar ${
                    errors.coverLetter
                      ? "border-red-500 focus:border-red-500 ring-1 ring-red-500"
                      : "border-zinc-300 dark:border-zinc-700 focus:border-zinc-900 dark:focus:border-zinc-100"
                  }`}
                />
              )}
            </div>

            <div className="flex justify-between items-center text-[10px] text-zinc-400 shrink-0">
              <span>{errors.coverLetter ? <span className="text-red-500 font-semibold">{errors.coverLetter}</span> : "Minimum 50 characters required."}</span>
              <span className="font-medium">{coverLetter.length} chars</span>
            </div>
          </div>

          {/* Informational Guidance Moved Below Cover Letter Pitch */}
          <div className="shrink-0 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 flex items-start gap-2.5 shadow-2xs">
            <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Follow the numbered steps <span className="font-semibold text-zinc-800 dark:text-zinc-200">[1] to [{job?.screening_questions && job.screening_questions.length > 0 ? "4" : "3"}]</span> to set your terms and pitch your capabilities.
            </p>
          </div>
        </div>
      </div>

      {/* Step Footer Navigation */}
      <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 transition cursor-pointer shadow-xs flex items-center gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Go Back</span>
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex-1 max-w-sm flex items-center justify-center gap-2 py-3 px-8 rounded-full bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition cursor-pointer shadow-md shadow-blue-500/20"
        >
          <span>Continue to Terms & TOS</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Joed AI Cover Letter Confirmation Modal (Portaled) */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isAiConfirmOpen && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 font-['Plus_Jakarta_Sans']">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => {
                    if (!isGeneratingAi) setIsAiConfirmOpen(false);
                  }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Confirmation Modal Box */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 12 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="relative w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-visible z-10 flex flex-col"
                >
                  {/* Modal Header */}
                  <div className="px-6 py-4.5 border-b border-zinc-100 dark:border-zinc-800 rounded-t-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src="/ensemble_lg.svg"
                        alt="Ensemble"
                        className="h-7 w-7 shrink-0 invert dark:invert-0 object-contain"
                      />
                      <div>
                        <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">
                          Generate Cover Pitch with Joed AI?
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          Tailored directly from the client&apos;s job post.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isGeneratingAi}
                      onClick={() => setIsAiConfirmOpen(false)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer disabled:opacity-40"
                      title="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 space-y-4 text-left">
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                      Joed AI will read the client&apos;s <strong className="text-zinc-900 dark:text-white">Job Title</strong> and <strong className="text-zinc-900 dark:text-white">Job Description</strong> below to draft a professional cover letter pitch for your proposal.
                    </p>

                    {/* Target Job Preview Box with Representation Tag */}
                    <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/70 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                          <FileText className="h-3 w-3 shrink-0" />
                          <span>Source Job Post</span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                            actingTeamId
                              ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800"
                              : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800"
                          }`}
                        >
                          {actingTeamId ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
                          <span>{actingTeamId ? "Team" : "Solo"}</span>
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-white line-clamp-1">
                        {job?.title || "Target Job Listing"}
                      </h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                        {job?.description
                          ? stripMarkdown(job.description)
                          : "Video editing and post-production deliverables."}
                      </p>
                    </div>

                    {/* Pitch Tone / Style Selector (Pills with Hover Tooltip, Defaults to Casual) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                          Pitch Tone &amp; Style
                        </label>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                          Hover to preview tone
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {PITCH_TONE_OPTIONS.map((opt) => {
                          const isSelected = pitchTone === opt.id;
                          return (
                            <div key={opt.id} className="relative group flex-1 min-w-[85px]">
                              <button
                                type="button"
                                disabled={isGeneratingAi}
                                onClick={() => setPitchTone(opt.id)}
                                className={`w-full px-3 py-2 rounded-full border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 select-none ${
                                  isSelected
                                    ? "border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                                    : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                }`}
                              >
                                <span>{opt.label}</span>
                              </button>

                              {/* Custom Theme-Aware Hover Tooltip (Light bg in Light Mode, Dark bg in Dark Mode) */}
                              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 z-30">
                                <div className="rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-center shadow-xl">
                                  <p className="text-[11px] font-bold text-zinc-900 dark:text-white">
                                    {opt.label}
                                  </p>
                                  <p className="text-[10px] text-zinc-600 dark:text-zinc-300 leading-snug mt-0.5">
                                    {opt.desc}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3-Minute Cooldown Notice */}
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/70 text-xs text-zinc-600 dark:text-zinc-300">
                      <Clock className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-400" />
                      <span className="font-medium">3-minute cooldown applies after generation.</span>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="px-6 py-3.5 border-t border-zinc-100 dark:border-zinc-800 rounded-b-2xl bg-zinc-50/40 dark:bg-zinc-900/40 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      disabled={isGeneratingAi}
                      onClick={() => setIsAiConfirmOpen(false)}
                      className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isGeneratingAi || cooldownSeconds > 0}
                      onClick={handleConfirmGeneratePitch}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                        !isGeneratingAi && cooldownSeconds === 0
                          ? "bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/25 active:scale-[0.98] cursor-pointer"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700 cursor-not-allowed"
                      }`}
                    >
                      {isGeneratingAi ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                          <span>Generating Pitch...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5 text-white" />
                          <span>Confirm & Generate</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};

export default ProposalPitchStep;
