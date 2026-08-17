import React, { useState, useRef, useEffect } from "react";
import { ArrowRight, ChevronDown, Check, Percent, Bold, Italic, List, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Job } from "../../../job_components/job_lists";
import { CreditIcon } from "@/components/ui/credit-icon";
import { JobRichText } from "../../../job_components/JobRichText";

export const additionalWorkRates = [
  { label: "+10% per extra revision pass", value: 10 },
  { label: "+15% per extra revision pass", value: 15 },
  { label: "+20% per extra revision pass", value: 20 },
  { label: "+25% per extra revision pass", value: 25 },
  { label: "+30% per extra revision pass", value: 30 },
];

interface ProposalPitchProps {
  job: Job | null;
  bidAmount: string;
  setBidAmount: (val: string) => void;
  additionalWorkRate: number;
  setAdditionalWorkRate: (val: number) => void;
  coverLetter: string;
  setCoverLetter: (val: string) => void;
  errors: { [key: string]: string };
  setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
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
  errors,
  setErrors,
  onNext,
  onDiscard,
}) => {
  const [isRateOpen, setIsRateOpen] = useState(false);
  const coverLetterRef = useRef<HTMLTextAreaElement>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [errorCountdown, setErrorCountdown] = useState<number | null>(null);

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
      
      {/* Target Client Budget Banner */}
      {job && (
        <div className="p-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-zinc-400 font-medium">Client's Budget Range</span>
          <span className="text-sm font-extrabold text-gray-900 dark:text-white flex items-center gap-1.5">
            <CreditIcon className="h-4 w-4 text-yellow-500" /> {job.priceRange}
          </span>
        </div>
      )}

      {/* Bid Input & Additional Rate Dropdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
        {/* Bid Input */}
        <div className="space-y-1.5 w-full">
          <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block h-[15px]">
            Your Bid <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <CreditIcon className="absolute left-3.5 top-3 h-4 w-4 text-yellow-500 pointer-events-none" />
            <input
              type="text"
              placeholder="e.g. 12,000"
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
                if (job && num < job.minBudget) {
                  setBidAmount(job.minBudget.toString());
                  setErrors((prev) => ({
                    ...prev,
                    bidAmount: `You cannot input under ${job.minBudget.toLocaleString()}, so it's been adjusted.`
                  }));
                  setErrorCountdown(3);
                } else if (job && num > job.maxBudget) {
                  setBidAmount(job.maxBudget.toString());
                  setErrors((prev) => ({
                    ...prev,
                    bidAmount: `You cannot input over ${job.maxBudget.toLocaleString()}, so it's been adjusted.`
                  }));
                  setErrorCountdown(3);
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
          {errors.bidAmount && (
            <p className="text-[11px] text-red-400">
              {errors.bidAmount} {errorCountdown !== null && errors.bidAmount.includes("adjusted") ? `(disappears in ${errorCountdown}s)` : ''}
            </p>
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
              className="w-full flex items-center justify-between rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0f1a] px-3.5 py-2.5 text-xs text-left transition hover:border-white/20"
            >
              <span className="text-gray-900 dark:text-white font-medium flex items-center gap-2">
                <Percent className="h-3.5 w-3.5 text-blue-400" />
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
                    className="absolute left-0 right-0 z-30 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0f1a] p-1.5 shadow-2xl space-y-0.5"
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
                            isSelected ? "bg-blue-500/15 text-blue-400" : "text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:text-white"
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