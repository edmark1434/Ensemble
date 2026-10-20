import { getBudgetDisplayInfo } from "@/lib/formatBudget";
import React, { useState, useRef, useEffect } from "react";
import { ArrowRight, ChevronDown, Check, Percent, Bold, Italic, List, Eye, EyeOff, Layers, CheckCircle2, Users, CheckSquare, Wand2, Info, Paperclip, FileText, X, AlertCircle, Film, Image as ImageIcon, Link2, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import type { Job } from "../../../job_components/job_lists";
import { CreditIcon } from "@/components/ui/credit-icon";
import { JobRichText } from "../../../job_components/JobRichText";
import { showSuccessToast } from "@/components/utility/toast";
import { handleRichTextPaste, autoFormatDescription } from "@/lib/markdownPaste";

export const additionalWorkRates = [
  { label: "+15% per extra revision pass", value: 15 },
  { label: "+20% per extra revision pass", value: 20 },
  { label: "+25% per extra revision pass", value: 25 },
  { label: "+30% per extra revision pass", value: 30 },
  { label: "+35% per extra revision pass", value: 35 },
  { label: "+40% per extra revision pass", value: 40 },
  { label: "+45% per extra revision pass", value: 45 },
  { label: "+50% per extra revision pass", value: 50 },
];

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
  errors: { [key: string]: string };
  setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  screeningAnswers?: { question: string; answer: string }[];
  setScreeningAnswers?: React.Dispatch<React.SetStateAction<{ question: string; answer: string }[]>>;
  workSampleFiles?: File[];
  setWorkSampleFiles?: React.Dispatch<React.SetStateAction<File[]>>;
  onNext: () => void;
  onDiscard: () => void;
}

export const ProposalPitchStep: React.FC<ProposalPitchProps> = ({
  job,
  bidAmount,
  setBidAmount,
  additionalWorkRate,
  setAdditionalWorkRate,
  coverLetter,
  setCoverLetter,
  selectedMilestoneId,
  setSelectedMilestoneId,
  errors,
  setErrors,
  screeningAnswers = [],
  setScreeningAnswers,
  workSampleFiles = [],
  setWorkSampleFiles,
  onNext,
  onDiscard,
}) => {
  const [isRateOpen, setIsRateOpen] = useState(false);
  const [showAddLink, setShowAddLink] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [linkTitle, setLinkTitle] = useState("");

  const MAX_LIMITS_MB: Record<string, number> = {
    video: 100,
    archive: 50,
    default: 25,
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const incoming = Array.from(e.target.files);
    const valid: File[] = [];

    for (const f of incoming) {
      const ext = f.name.split(".").pop()?.toLowerCase() || "";
      const isVideo = ["mp4", "webm", "mov"].includes(ext) || f.type.startsWith("video/");
      const isArchive = ["zip"].includes(ext) || f.type.includes("zip");
      const limit = isVideo ? MAX_LIMITS_MB.video : isArchive ? MAX_LIMITS_MB.archive : MAX_LIMITS_MB.default;

      if (f.size > limit * 1024 * 1024) {
        toast.error(`"${f.name}" exceeds the ${limit}MB limit for ${isVideo ? "videos" : isArchive ? "archives" : "files"}.`);
        continue;
      }
      valid.push(f);
    }

    if (setWorkSampleFiles && valid.length > 0) {
      setWorkSampleFiles((prev) => [...prev, ...valid].slice(0, 3));
      showSuccessToast(`Attached ${valid.length} file${valid.length === 1 ? "" : "s"}`);
    }
    e.target.value = "";
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
  const coverLetterRef = useRef<HTMLTextAreaElement>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [errorCountdown, setErrorCountdown] = useState<number | null>(null);

  const isTeamJob = Boolean(job?.hiring_type === "team" || job?.is_team || job?.isTeam || job?.posted_as === "Team");
  const currentMilestone = isTeamJob
    ? (job?.milestones?.find((m: any) => m.job_milestone_id === selectedMilestoneId) || job?.milestones?.[0])
    : null;

  useEffect(() => {
    if (isTeamJob && !selectedMilestoneId && job?.milestones?.[0]?.job_milestone_id && setSelectedMilestoneId) {
      setSelectedMilestoneId(job.milestones[0].job_milestone_id);
    }
  }, [isTeamJob, selectedMilestoneId, job?.milestones, setSelectedMilestoneId]);

  const activeMinBudget = currentMilestone && job
    ? Math.round(((job.minBudget * (Number(currentMilestone.budget_percentage) || 0)) / 100) / Math.max(1, currentMilestone.slots_count || 1))
    : (job?.minBudget || 0);

  const activeMaxBudget = currentMilestone && job
    ? (currentMilestone.budget_credits
        ? Math.round(Number(currentMilestone.budget_credits) / Math.max(1, currentMilestone.slots_count || 1))
        : Math.round(((job.maxBudget * (Number(currentMilestone.budget_percentage) || 0)) / 100) / Math.max(1, currentMilestone.slots_count || 1)))
    : (job?.maxBudget || 0);

  // Automatically lock bid to fixed milestone payout for team jobs
  useEffect(() => {
    if (isTeamJob && currentMilestone) {
      const fixedAmt = activeMaxBudget > 0 ? activeMaxBudget : (activeMinBudget > 0 ? activeMinBudget : 0);
      if (fixedAmt > 0) {
        setBidAmount(fixedAmt.toString());
      }
    }
  }, [isTeamJob, currentMilestone, activeMaxBudget, activeMinBudget, setBidAmount]);

  useEffect(() => {
    if (errorCountdown !== null && errorCountdown > 0) {
      const timer = setTimeout(() => setErrorCountdown(errorCountdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (errorCountdown === 0) {
      setErrors((prev) => {
        if (prev.bidAmount?.includes("adjusted")) {
          const { bidAmount: _, ...rest } = prev;
          return rest;
        }
        return prev;
      });
      setErrorCountdown(null);
    }
  }, [errorCountdown, setErrors]);

  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const textarea = coverLetterRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end, text.length);

    let newText = "";
    let finalSelectionStart = start + prefix.length;
    let finalSelectionEnd = end + prefix.length + selected.length;

    if (selected) {
      newText = before + prefix + selected + suffix + after;
    } else {
      newText = before + prefix + "text" + suffix + after;
      finalSelectionEnd = finalSelectionStart + 4;
    }

    setCoverLetter(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(finalSelectionStart, finalSelectionEnd);
    }, 0);
  };

  const handleAutoFormat = () => {
    if (!coverLetter.trim()) return;
    const formatted = autoFormatDescription(coverLetter);
    setCoverLetter(formatted);
    setErrors(prev => {
      const { coverLetter: _, ...rest } = prev;
      return rest;
    });
    showSuccessToast("Formatted pitch with Markdown!");
  };

  const formatCommaString = (val: string) => {
    if (!val) return "";
    const clean = val.replace(/,/g, "");
    if (isNaN(Number(clean))) return val;
    return Number(clean).toLocaleString();
  };

  const selectedRateLabel = additionalWorkRates.find((r) => r.value === additionalWorkRate)?.label || "Select Additional Work Rate";

  return (
    <div className="space-y-5 text-left">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">Cover Pitch & Pricing</h2>
        <p className="text-xs text-gray-500 dark:text-zinc-400">Specify your proposal bid within the client's budget and state your pitch.</p>
      </div>
      
      {/* Team Job: Informative Notice (on top & gray) */}
      {isTeamJob && (
        <div className="p-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-white/[0.03] flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gray-200/70 dark:bg-white/10 flex items-center justify-center text-gray-600 dark:text-zinc-400 shrink-0">
            <Layers className="h-4 w-4" />
          </div>
          <div className="text-xs">
            <div className="font-bold text-gray-900 dark:text-white">Team Project (1 Milestone Role per Contributor)</div>
            <div className="text-gray-500 dark:text-zinc-400 text-[11px] leading-relaxed">
              To promote collaborative specialization, each applicant may apply for <strong>one role</strong> per team project. You will select your role in <strong>Step 3 (Milestones)</strong>.
            </div>
          </div>
        </div>
      )}

      {/* Target Client Budget Banner */}
      {job && (() => {
        const bDisplay = getBudgetDisplayInfo({
          minBudget: job.minBudget,
          maxBudget: job.maxBudget,
          isTeam: isTeamJob,
          positionsNeeded: job.positionsNeeded,
        });
        return (
          <div className="p-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-gray-900 dark:text-white flex items-center gap-1.5">
                <CreditIcon className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                {bDisplay.amountText}
              </span>
              <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-semibold ${bDisplay.tagColorClass}`}>
                {bDisplay.tagLabel}
              </span>
            </div>
            <span className="text-xs text-gray-500 dark:text-zinc-400 font-medium">
              {bDisplay.subtitle}
            </span>
          </div>
        );
      })()}

      {/* Bid Input & Additional Rate Dropdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
        {/* Bid Input or Fixed Milestone Compensation */}
        <div className="space-y-1.5 w-full">
          {isTeamJob ? (
            <>
              <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block h-[15px]">
                Milestone Compensation <span className="text-gray-400 dark:text-zinc-500 font-bold">(Fixed Payout)</span>
              </label>
              <div className="p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.03] flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-gray-200/70 dark:bg-white/10 flex items-center justify-center text-gray-600 dark:text-zinc-400">
                    <CreditIcon className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1">
                      <span>{formatCommaString(bidAmount || activeMaxBudget.toString())}</span>
                      <span className="text-[10px] font-semibold text-gray-500 dark:text-zinc-400">Credits</span>
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-zinc-400 truncate max-w-[200px]">
                      {currentMilestone?.title || "Selected Milestone"}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-zinc-400 border border-gray-200 dark:border-white/10">
                  Fixed Rate
                </span>
              </div>
            </>
          ) : (
            <>
              <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block h-[15px]">
                Your Bid <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <CreditIcon className="absolute left-3.5 top-3 h-4 w-4 text-amber-500 dark:text-amber-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder={`e.g. ${activeMinBudget.toLocaleString()}`}
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
                        bidAmount: "A minimum bid of at least 10 Credits is required."
                      }));
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.currentTarget.blur();
                    }
                  }}
                  className={`w-full rounded-xl border bg-white dark:bg-white/5 shadow-sm dark:shadow-none pl-10 pr-3.5 py-2.5 text-xs text-gray-900 dark:text-white outline-none transition-all ${
                    errors.bidAmount ? "border-red-500/50 focus:border-red-500" : "border-gray-200 dark:border-white/10 focus:border-blue-500/50"
                  }`}
                />
              </div>
              {errors.bidAmount ? (
                <p className="text-[11px] text-red-400 font-medium">{errors.bidAmount}</p>
              ) : bidAmount && parseInt(bidAmount) >= 10 ? (
                activeMinBudget > 0 && parseInt(bidAmount) < activeMinBudget ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] font-medium">
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    <span>Competitive Bid: Your bid is below the client's suggested minimum ({formatCommaString(activeMinBudget.toString())} Credits).</span>
                  </div>
                ) : activeMaxBudget > 0 && parseInt(bidAmount) > activeMaxBudget ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[11px] font-medium">
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    <span>Custom Scope: Your bid exceeds the client's suggested maximum ({formatCommaString(activeMaxBudget.toString())} Credits).</span>
                  </div>
                ) : activeMinBudget > 0 ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>{activeMaxBudget > 0 ? "Within client's target budget range." : "Valid proposal for open bid job."}</span>
                  </div>
                ) : null
              ) : null}
            </>
          )}
          
          {/* Platform Fee Indicator */}
          {bidAmount && Number(bidAmount) > 0 && (
            <div className="pt-2 space-y-1.5">
              <div className="flex justify-between items-center text-[10px] text-gray-500 dark:text-zinc-500">
                <span>10% Platform Fee</span>
                <span>- {formatCommaString(String(Number(bidAmount) * 0.10))}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold text-gray-700 dark:text-zinc-300">
                <span>Your Net Earnings</span>
                <span>{formatCommaString(String(Number(bidAmount) * 0.90))}</span>
              </div>
            </div>
          )}
        </div>

        {/* Additional Work Rate Dropdown */}
        <div className="space-y-1.5 relative">
          <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block">
            Additional Work Rate <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsRateOpen(!isRateOpen)}
              className="w-full flex items-center justify-between rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface px-3.5 py-2.5 text-xs text-left transition hover:border-white/20"
            >
              <span className="text-gray-900 dark:text-white font-medium flex items-center gap-2">
                
                {selectedRateLabel}
              </span>
              <ChevronDown className={`h-4 w-4 text-gray-500 dark:text-zinc-400 transition-transform ${isRateOpen ? "rotate-180 text-blue-400" : ""}`} />
            </button>

            <AnimatePresence>
              {isRateOpen && (
                <>
                  <div className="fixed inset-0 z-20 cursor-default" onClick={() => setIsRateOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 4 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute left-0 right-0 z-30 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-1.5 shadow-2xl space-y-0.5"
                  >
                    {additionalWorkRates.map((rate) => {
                      const isSelected = additionalWorkRate === rate.value;
                      return (
                        <button
                          key={rate.value}
                          type="button"
                          onClick={() => {
                            setAdditionalWorkRate(rate.value);
                            setIsRateOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                            isSelected ? "bg-blue-500/15 text-blue-400" : "text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                          }`}
                        >
                          <span>{rate.label}</span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-blue-400" />}
                        </button>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          <p className="text-[10px] text-gray-500 dark:text-zinc-500">Rate added if client requests revisions beyond a milestone's quota.</p>
        </div>
      </div>

      <hr className="border-gray-200 dark:border-white/10" />

      {/* Cover Letter Pitch */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-end mb-1">
          <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">
            Cover Letter / Pitch <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => insertMarkdown('**', '**')} className="p-1 rounded bg-white dark:bg-white/5 shadow-sm dark:shadow-none hover:bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-zinc-300 transition-colors" title="Bold" disabled={isPreviewMode}>
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => insertMarkdown('*', '*')} className="p-1 rounded bg-white dark:bg-white/5 shadow-sm dark:shadow-none hover:bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-zinc-300 transition-colors" title="Italic" disabled={isPreviewMode}>
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => insertMarkdown('- ')} className="p-1 rounded bg-white dark:bg-white/5 shadow-sm dark:shadow-none hover:bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-zinc-300 transition-colors" title="Bullet List" disabled={isPreviewMode}>
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleAutoFormat}
              className="p-1 rounded bg-white dark:bg-white/5 shadow-sm dark:shadow-none hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-zinc-300 transition-colors flex items-center gap-1 px-1.5"
              title="Auto-format AI / pasted text into Markdown (Bold headers, bullets, spacing)"
              disabled={isPreviewMode || !coverLetter.trim()}
            >
              <Wand2 className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[10px] font-semibold hidden sm:inline">Format</span>
            </button>
            <div className="w-px h-4 bg-gray-100 dark:bg-white/10 mx-1" />
            <button type="button" onClick={() => setIsPreviewMode(!isPreviewMode)} className={`p-1 rounded transition-colors flex items-center gap-1 px-2 ${isPreviewMode ? 'bg-blue-500/20 text-blue-400' : 'bg-white dark:bg-white/5 shadow-sm dark:shadow-none hover:bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-zinc-300'}`} title="Toggle Preview">
              {isPreviewMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span className="text-[10px] font-bold uppercase">{isPreviewMode ? 'Edit' : 'Preview'}</span>
            </button>
            <span className="text-[10px] font-mono text-gray-500 dark:text-zinc-500 ml-2">{coverLetter.length}/2000</span>
          </div>
        </div>

        {isPreviewMode ? (
          <div className="w-full min-h-[160px] rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-4 py-3 text-xs overflow-y-auto custom-scrollbar">
            {coverLetter ? (
              <JobRichText content={coverLetter} />
            ) : (
              <span className="text-gray-500 dark:text-zinc-500 italic">Nothing to preview</span>
            )}
          </div>
        ) : (
          <textarea
            ref={coverLetterRef}
            rows={7}
            maxLength={2000}
            placeholder="Introduce yourself, your experience, and how you will execute this project..."
            value={coverLetter}
            onPaste={(e) => {
              const handled = handleRichTextPaste(e, coverLetter, setCoverLetter, 2000);
              if (handled) {
                setErrors((prev) => {
                  const { coverLetter: _, ...rest } = prev;
                  return rest;
                });
              }
            }}
            onChange={(e) => {
              setCoverLetter(e.target.value);
              if (e.target.value.trim().length >= 50) {
                setErrors((prev) => {
                  const { coverLetter: _, ...rest } = prev;
                  return rest;
                });
              }
            }}
            className={`w-full min-h-[160px] rounded-xl border bg-white dark:bg-white/5 shadow-sm dark:shadow-none p-3.5 text-xs text-gray-900 dark:text-white outline-none transition-all resize-y leading-relaxed custom-scrollbar ${
              errors.coverLetter ? "border-red-500/50 focus:border-red-500" : "border-gray-200 dark:border-white/10 focus:border-blue-500/50"
            }`}
          />
        )}
        
        {errors.coverLetter && <p className="text-[11px] text-red-400">{errors.coverLetter}</p>}
      </div>

      {/* 1.A: Screening Questions */}
      {job?.screening_questions && job.screening_questions.length > 0 && (
        <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block">
              Client Screening Questions <span className="text-red-500">*</span>
            </label>
            <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono">
              {job.screening_questions.length} Question{job.screening_questions.length > 1 ? "s" : ""}
            </span>
          </div>
          {errors.screeningAnswers && (
            <div className="flex items-center gap-1.5 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errors.screeningAnswers}</span>
            </div>
          )}
          <div className="space-y-3">
            {job.screening_questions.map((question: string, idx: number) => {
              const currentAns = screeningAnswers.find(sa => sa.question === question)?.answer || "";
              return (
                <div key={idx} className="space-y-1.5 p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
                  <p className="text-xs font-semibold text-gray-800 dark:text-zinc-200 flex items-start gap-1.5">
                    <span className="text-blue-500 font-bold shrink-0">Q{idx + 1}:</span>
                    <span>{question}</span>
                  </p>
                  <input
                    type="text"
                    value={currentAns}
                    placeholder="Type your answer or portfolio link..."
                    onChange={(e) => {
                      if (!setScreeningAnswers) return;
                      const val = e.target.value;
                      const other = screeningAnswers.filter(sa => sa.question !== question);
                      setScreeningAnswers([...other, { question, answer: val }]);
                      setErrors((prev) => {
                        const { screeningAnswers: _, ...rest } = prev;
                        return rest;
                      });
                    }}
                    className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface px-3 py-2 text-xs text-gray-900 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2.A: Portfolio & Work Sample Attachments */}
      <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-white/10">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block">
              Work Samples & Demos <span className="text-gray-400 font-normal lowercase">(optional • max 3 items)</span>
            </label>
            <p className="text-[10px] text-gray-400 dark:text-zinc-500">
              Videos (MP4/WebM ≤100MB) • Images/PDFs (≤25MB) • ZIPs (≤50MB) or External Link
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddLink((prev) => !prev)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              <Link2 className="h-3 w-3" /> Add Link
            </button>

            {setWorkSampleFiles && workSampleFiles.length < 3 && (
              <label className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                <Paperclip className="h-3 w-3" /> Attach File ({workSampleFiles.length}/3)
                <input
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.zip,.mp4,.webm,.mov"
                  className="hidden"
                  onChange={handleFilesSelected}
                />
              </label>
            )}
          </div>
        </div>

        {/* Add Link Input Panel */}
        {showAddLink && (
          <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-500/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5" /> Paste Live Demo or Repository Link
              </span>
              <button
                type="button"
                onClick={() => setShowAddLink(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Title (e.g., Figma Prototype, GitHub Repo)"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
              <input
                type="url"
                placeholder="https://..."
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddLink(false)}
                className="px-2.5 py-1 rounded-lg text-xs text-gray-500 hover:text-gray-700 dark:text-zinc-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAttachLink}
                className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-xs"
              >
                Insert Link
              </button>
            </div>
          </div>
        )}

        {workSampleFiles.length === 0 ? (
          <p className="text-[11px] text-gray-400 dark:text-zinc-500 italic">
            No files attached yet. Attaching video demos, case studies, or mockups significantly increases your proposal acceptance rate.
          </p>
        ) : (
          <div className="space-y-1.5">
            {workSampleFiles.map((file, idx) => {
              const ext = file.name.split(".").pop()?.toLowerCase() || "";
              const isVideo = ["mp4", "webm", "mov"].includes(ext);
              const isImage = ["png", "jpg", "jpeg", "webp", "gif"].includes(ext);
              const isPdf = ext === "pdf";
              const isZip = ext === "zip";

              return (
                <div key={idx} className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs">
                  <div className="flex items-center gap-2 truncate pr-2">
                    {isVideo ? (
                      <Film className="h-4 w-4 text-blue-500 shrink-0" />
                    ) : isImage ? (
                      <ImageIcon className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : isPdf ? (
                      <FileText className="h-4 w-4 text-red-500 shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-purple-500 shrink-0" />
                    )}
                    <span className="font-semibold text-gray-900 dark:text-white truncate text-[11px]">{file.name}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-zinc-300 uppercase shrink-0">
                      {isVideo ? "Video Demo" : isImage ? "Image" : isPdf ? "PDF" : isZip ? "ZIP Archive" : ext.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-zinc-500 shrink-0">
                      ({(file.size / 1024 / 1024).toFixed(1)} MB)
                    </span>
                  </div>
                  {setWorkSampleFiles && (
                    <button
                      type="button"
                      onClick={() => setWorkSampleFiles(workSampleFiles.filter((_, i) => i !== idx))}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove sample"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex gap-2.5">
        <button
          type="button"
          onClick={onDiscard}
          className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-500 dark:text-zinc-400 font-bold hover:text-red-400 transition text-xs"
        >
          Discard
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-500 py-2.5 text-xs font-bold text-white hover:bg-blue-600 transition shadow-lg shadow-blue-500/20"
        >
          Confirm Pitch & Next <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default ProposalPitchStep;