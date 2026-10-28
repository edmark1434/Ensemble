import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-hot-toast";
import { 
  Check, 
  X, 
  Award, 
  ListChecks, 
  Sparkles, 
  User, 
  Image as ImageIcon, 
  Quote, 
  FileText, 
  Coins, 
  BookOpen, 
  Wrench, 
  FolderPlus,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  PartyPopper,
  Upload,
  Plus
} from "lucide-react";

export interface SetupStep {
  id: string;
  label: string;
  description: string;
  category: "identity" | "experience";
  check: boolean;
  action: () => void;
}

interface ProfileSetupWidgetProps {
  completionScore: number;
  completionSteps: SetupStep[];
  getProgressColor: (score: number) => string;
  onSaveBudget?: (credits: number) => Promise<void>;
  currentBudget?: number | null;
  onWalkthroughComplete?: () => void;
}

// Crisp & neutral gray when incomplete, emerald green when done
const getStepIcon = (id: string, isDone: boolean) => {
  const iconClass = isDone 
    ? "w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" 
    : "w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0";

  switch (id) {
    case "avatar":
      return <User className={iconClass} />;
    case "banner":
      return <ImageIcon className={iconClass} />;
    case "tagline":
      return <Quote className={iconClass} />;
    case "bio":
      return <FileText className={iconClass} />;
    case "budget":
      return <Coins className={iconClass} />;
    case "introduction":
      return <BookOpen className={iconClass} />;
    case "skills":
      return <Wrench className={iconClass} />;
    case "portfolio":
      return <FolderPlus className={iconClass} />;
    default:
      return <Sparkles className={iconClass} />;
  }
};

const getStepInstructions = (id: string): string => {
  switch (id) {
    case "avatar":
      return "Select an avatar preset or upload your custom profile photo, then click Save.";
    case "banner":
      return "Choose an artistic banner preset or upload a custom banner image, then click Save.";
    case "tagline":
      return "Enter a crisp professional tagline under your name, then save your tagline.";
    case "bio":
      return "Write a short summary describing your background, skills, and experience, then click Save.";
    case "budget":
      return "Enter your planned project budget allocation in credits below and click Save Budget.";
    case "introduction":
      return "Write your comprehensive introduction story in the highlighted box and click Save Introduction.";
    case "skills":
      return "Select at least 3 skills from the skill picker modal, then save your selection.";
    case "portfolio":
      return "Upload a document or add a portfolio link in the highlighted portfolio area.";
    default:
      return "Complete this step and save your changes to proceed.";
  }
};

export const ProfileSetupWidget: React.FC<ProfileSetupWidgetProps> = ({
  completionScore,
  completionSteps,
  getProgressColor,
  onSaveBudget,
  currentBudget = null,
  onWalkthroughComplete,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditingBudgetInline, setIsEditingBudgetInline] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState<string>(
    currentBudget !== null && currentBudget !== undefined ? String(currentBudget) : ""
  );
  const [budgetSaving, setBudgetSaving] = useState(false);

  // Guided Walkthrough state
  const [isGuidedActive, setIsGuidedActive] = useState(false);
  const [skippedStepIds, setSkippedStepIds] = useState<string[]>([]);
  const [justCompletedStepId, setJustCompletedStepId] = useState<string | null>(null);
  const [justCompletedLabel, setJustCompletedLabel] = useState<string | null>(null);
  const [isGuideMinimized, setIsGuideMinimized] = useState(false);

  // References to track previous state of steps for automatic save-and-advance
  const prevStepsRef = useRef<Record<string, boolean>>({});
  const activeStepTriggeredRef = useRef<string | null>(null);

  const completedCount = completionSteps.filter((s) => s.check).length;
  const identitySteps = completionSteps.filter((s) => s.category === "identity");
  const experienceSteps = completionSteps.filter((s) => s.category === "experience");
  const incompleteSteps = completionSteps.filter((s) => !s.check);

  // Steps remaining for the walkthrough (not yet completed and not skipped in this run)
  const remainingIncomplete = completionSteps.filter(
    (s) => !s.check && !skippedStepIds.includes(s.id)
  );
  const currentGuidedStep = remainingIncomplete[0] || null;

  // Single step manual click from the checklist modal
  const handleStepClick = (step: SetupStep) => {
    setIsModalOpen(false);
    setIsEditingBudgetInline(false);

    if (step.id === "budget" && onSaveBudget) {
      setIsEditingBudgetInline(true);
    }

    if (!step.check) {
      // Launch walkthrough focused on this step
      setIsGuidedActive(true);
      setIsGuideMinimized(shouldAutoMinimize(step.id));
      setSkippedStepIds((prev) => prev.filter((id) => id !== step.id));
      activeStepTriggeredRef.current = step.id;
    }

    step.action();
  };

  const shouldAutoMinimize = (id?: string) => id === "introduction" || id === "portfolio";

  const triggerStepAction = (step: SetupStep) => {
    if (!step) return;
    if (step.id === "budget") {
      const el = document.querySelector('[data-tour="profile-budget"]');
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      step.action();
    }
  };

  // Launch guided walkthrough starting from the first incomplete step
  const handleStartWalkthrough = () => {
    setIsModalOpen(false);
    setIsEditingBudgetInline(false);
    setSkippedStepIds([]);

    const pending = completionSteps.filter((s) => !s.check);
    if (pending.length === 0) {
      onWalkthroughComplete?.();
      return;
    }

    // Initialize snapshot of completion states
    const map: Record<string, boolean> = {};
    completionSteps.forEach((s) => {
      map[s.id] = s.check;
    });
    prevStepsRef.current = map;

    const firstStep = pending[0];
    setIsGuidedActive(true);
    setIsGuideMinimized(shouldAutoMinimize(firstStep.id));
    activeStepTriggeredRef.current = firstStep.id;
    triggerStepAction(firstStep);
  };

  // Watch for step saves: when a step transitions from false to true while guided is active
  useEffect(() => {
    if (!isGuidedActive) {
      const map: Record<string, boolean> = {};
      completionSteps.forEach((s) => {
        map[s.id] = s.check;
      });
      prevStepsRef.current = map;
      activeStepTriggeredRef.current = null;
      return;
    }

    // Find any step that was previously incomplete and just became true!
    const newlySaved = completionSteps.find(
      (s) => s.check && prevStepsRef.current[s.id] === false
    );

    // Update reference map
    const newMap: Record<string, boolean> = {};
    completionSteps.forEach((s) => {
      newMap[s.id] = s.check;
    });
    prevStepsRef.current = newMap;

    if (newlySaved) {
      setJustCompletedStepId(newlySaved.id);
      setJustCompletedLabel(newlySaved.label);

      // Brief 800ms celebration, then automatically advance to next step!
      const timer = setTimeout(() => {
        setJustCompletedStepId(null);
        setJustCompletedLabel(null);

        const nextPending = completionSteps.filter(
          (s) => s.id !== newlySaved.id && !s.check && !skippedStepIds.includes(s.id)
        );

        if (nextPending.length > 0) {
          const nextStep = nextPending[0];
          setIsGuideMinimized(shouldAutoMinimize(nextStep.id));
          activeStepTriggeredRef.current = nextStep.id;
          triggerStepAction(nextStep);
        } else {
          // If no more unskipped steps, check if all 8 steps are complete
          const allDone = completionSteps.every((s) => s.check);
          if (allDone) {
            onWalkthroughComplete?.();
          }
        }
      }, 850);

      return () => clearTimeout(timer);
    }
  }, [completionSteps, isGuidedActive, skippedStepIds, onWalkthroughComplete]);

  // Skip current guided step
  const handleSkipGuidedStep = () => {
    if (!currentGuidedStep) return;
    const nextSkipped = [...skippedStepIds, currentGuidedStep.id];
    setSkippedStepIds(nextSkipped);

    const nextPending = completionSteps.filter(
      (s) => !s.check && !nextSkipped.includes(s.id)
    );

    if (nextPending.length > 0) {
      const next = nextPending[0];
      setIsGuideMinimized(shouldAutoMinimize(next.id));
      activeStepTriggeredRef.current = next.id;
      triggerStepAction(next);
    }
  };

  const handleExitWalkthrough = () => {
    setIsGuidedActive(false);
    activeStepTriggeredRef.current = null;
  };

  // Manage spotlight class and scrolling for page-based steps
  useEffect(() => {
    if (!isGuidedActive || !currentGuidedStep || isModalOpen) return;

    let targetSelector = "";
    if (shouldAutoMinimize(currentGuidedStep.id)) {
      targetSelector = '[data-tour="profile-introduction"]';
    } else if (currentGuidedStep.id === "portfolio") {
      targetSelector = '[data-tour="profile-portfolio"]';
    } else if (currentGuidedStep.id === "budget") {
      targetSelector = '[data-tour="profile-budget"]';
    }

    if (targetSelector) {
      const el = document.querySelector(targetSelector) as HTMLElement | null;
      if (el) {
        el.classList.add("tour-spotlight-active");
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        return () => {
          el.classList.remove("tour-spotlight-active");
        };
      }
    }
  }, [isGuidedActive, currentGuidedStep, isModalOpen]);

  // Handle saving budget
  const handleSaveBudgetInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveBudget) return;
    const num = parseInt(budgetDraft.replace(/[^0-9]/g, ""), 10);
    if (isNaN(num) || num <= 0) return;
    try {
      setBudgetSaving(true);
      await onSaveBudget(num);
      setIsEditingBudgetInline(false);
    } catch (err) {
      console.error("Failed to save budget:", err);
    } finally {
      setBudgetSaving(false);
    }
  };

  return (
    <>
      {/* ========================================================= */}
      {/* 1. TOP SINGLE SLIM BAR WITH PROGRESS LINE & SETUP NOW     */}
      {/* ========================================================= */}
      <div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-md border border-gray-200/80 dark:border-white/10 rounded-2xl p-4 shadow-xs transition-all duration-300 font-['Plus_Jakarta_Sans',sans-serif] space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-900 dark:text-white">
                  Profile Setup
                </h3>
                <span className="text-xs font-mono font-bold text-gray-900 dark:text-white">
                  ({completionScore}%)
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                {completedCount} of {completionSteps.length} completed • Complete to earn the Profile Complete Badge
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            {completedCount < completionSteps.length && (
              <button
                type="button"
                onClick={handleStartWalkthrough}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:bg-black text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Setup Now</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-800 dark:text-zinc-200 border border-gray-200 dark:border-white/10 text-xs font-bold transition-all cursor-pointer"
            >
              <ListChecks className="w-3.5 h-3.5" />
              <span>View Progress</span>
            </button>
          </div>
        </div>

        {/* Dynamic Colorful Progress Line */}
        <div className="h-2 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-700 ease-out rounded-full ${getProgressColor(completionScore)}`}
            style={{ width: `${completionScore}%` }}
          />
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. WALKTHROUGH CHECKLIST POPUP MODAL (2 COLUMNS)          */}
      {/* ========================================================= */}
      {isModalOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200 font-['Plus_Jakarta_Sans',sans-serif]">
          <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-dark-base rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden text-gray-900 dark:text-white">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Profile Setup Walkthrough
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    Complete all 8 checklist steps to earn your Profile Complete badge.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setIsEditingBudgetInline(false);
                }}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Scrollable Checklist in 2 Columns */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
              
              {/* Progress Summary Card with "Setup Now" button */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200/80 dark:border-white/10 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-gray-700 dark:text-zinc-300 block">
                      Overall Walkthrough Progress
                    </span>
                    <span className="text-xs font-mono font-bold text-gray-900 dark:text-white">
                      {completionScore}% ({completedCount}/8 completed)
                    </span>
                  </div>

                  {completedCount < completionSteps.length && (
                    <button
                      type="button"
                      onClick={handleStartWalkthrough}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 text-xs font-bold transition shadow-xs cursor-pointer self-start sm:self-auto"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Setup Now ({8 - completedCount} incomplete)</span>
                    </button>
                  )}
                </div>

                <div className="h-2 w-full bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-700 ease-out rounded-full ${getProgressColor(completionScore)}`}
                    style={{ width: `${completionScore}%` }}
                  />
                </div>
              </div>

              {/* ================= 2-COLUMN CHECKLIST GRID ================= */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Column 1: Identity & Branding */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                      Identity & Branding
                    </h4>
                    <span className="text-[10px] font-mono text-gray-400 dark:text-zinc-500">
                      {identitySteps.filter(s => s.check).length}/4
                    </span>
                  </div>
                  <div className="space-y-2">
                    {identitySteps.map((step, idx) => (
                      <div
                        key={step.id}
                        onClick={() => !step.check && handleStepClick(step)}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          step.check
                            ? "bg-emerald-500/[0.04] dark:bg-emerald-500/[0.07] border-emerald-500/30 dark:border-emerald-500/40 text-emerald-950 dark:text-emerald-100"
                            : "bg-white dark:bg-white/[0.02] border-gray-200/80 dark:border-white/10 hover:border-zinc-400 dark:hover:border-zinc-500 cursor-pointer shadow-2xs"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs ${
                              step.check
                                ? "bg-emerald-500 text-white font-bold shadow-xs"
                                : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-zinc-400 font-mono text-[11px] border border-gray-200/80 dark:border-white/10"
                            }`}
                          >
                            {step.check ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : idx + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              {getStepIcon(step.id, step.check)}
                              <span className={`text-xs font-bold truncate ${
                                step.check ? "text-emerald-950 dark:text-emerald-100" : "text-gray-900 dark:text-white"
                              }`}>
                                {step.label}
                              </span>
                            </div>
                            <p className={`text-[11px] truncate ${
                              step.check ? "text-emerald-800/80 dark:text-emerald-300/70" : "text-gray-500 dark:text-zinc-400"
                            }`}>
                              {step.description}
                            </p>
                          </div>
                        </div>

                        {step.check ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-100/90 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/80 shrink-0">
                            <CheckCircle2 className="w-3 h-3" />
                            Done
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStepClick(step);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 border border-zinc-200 dark:border-white/10 transition cursor-pointer shrink-0"
                          >
                            <span>Set Up</span>
                            <ArrowRight className="w-3 h-3 text-zinc-400" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column 2: Budget & Experience */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                      Budget & Experience
                    </h4>
                    <span className="text-[10px] font-mono text-gray-400 dark:text-zinc-500">
                      {experienceSteps.filter(s => s.check).length}/4
                    </span>
                  </div>
                  <div className="space-y-2">
                    {experienceSteps.map((step, idx) => (
                      <div
                        key={step.id}
                        onClick={() => !step.check && handleStepClick(step)}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          step.check
                            ? "bg-emerald-500/[0.04] dark:bg-emerald-500/[0.07] border-emerald-500/30 dark:border-emerald-500/40 text-emerald-950 dark:text-emerald-100"
                            : "bg-white dark:bg-white/[0.02] border-gray-200/80 dark:border-white/10 hover:border-zinc-400 dark:hover:border-zinc-500 cursor-pointer shadow-2xs"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs ${
                              step.check
                                ? "bg-emerald-500 text-white font-bold shadow-xs"
                                : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-zinc-400 font-mono text-[11px] border border-gray-200/80 dark:border-white/10"
                            }`}
                          >
                            {step.check ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : idx + 5}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              {getStepIcon(step.id, step.check)}
                              <span className={`text-xs font-bold truncate ${
                                step.check ? "text-emerald-950 dark:text-emerald-100" : "text-gray-900 dark:text-white"
                              }`}>
                                {step.label}
                              </span>
                            </div>
                            <p className={`text-[11px] truncate ${
                              step.check ? "text-emerald-800/80 dark:text-emerald-300/70" : "text-gray-500 dark:text-zinc-400"
                            }`}>
                              {step.description}
                            </p>
                          </div>
                        </div>

                        {step.check ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-100/90 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/80 shrink-0">
                            <CheckCircle2 className="w-3 h-3" />
                            Done
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStepClick(step);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 border border-zinc-200 dark:border-white/10 transition cursor-pointer shrink-0"
                          >
                            <span>Set Up</span>
                            <ArrowRight className="w-3 h-3 text-zinc-400" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Inline Quick Budget Input Dialog (when user clicks Set Budget) */}
              {isEditingBudgetInline && (
                <form
                  onSubmit={handleSaveBudgetInline}
                  className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-900/80 border border-gray-300 dark:border-zinc-700 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        Enter Your Project Budget (Credits)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditingBudgetInline(false)}
                      className="text-gray-400 hover:text-gray-600 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={100000000}
                      value={budgetDraft}
                      onChange={(e) => setBudgetDraft(e.target.value)}
                      placeholder="e.g. 5000"
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                    <button
                      type="submit"
                      disabled={budgetSaving || !budgetDraft || parseInt(budgetDraft, 10) <= 0}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      {budgetSaving ? "Saving..." : "Save Budget"}
                    </button>
                  </div>
                </form>
              )}

              {/* Badge Reward Footer Card */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200/80 dark:border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 p-1 flex items-center justify-center shrink-0 shadow-xs">
                    <img
                      src="/icons/badges/setup-profile.png"
                      alt="Profile Complete Badge"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-gray-900 dark:text-white">
                      Profile Complete Badge
                    </h5>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                      Reach 100% completion to unlock and display this verified badge on your profile.
                    </p>
                  </div>
                </div>

                {completedCount === 8 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Unlocked
                  </span>
                )}
              </div>

            </div>

            {/* Modal Bottom Action Bar */}
            <div className="flex items-center justify-between p-4 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.01]">
              <div>
                {completedCount < completionSteps.length && (
                  <button
                    type="button"
                    onClick={handleStartWalkthrough}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Setup Now</span>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setIsEditingBudgetInline(false);
                }}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white text-xs font-semibold transition cursor-pointer"
              >
                Close Walkthrough
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* ========================================================= */}
      {/* 3. INTERACTIVE STEP-BY-STEP GUIDED TOUR OVERLAY          */}
      {/* ========================================================= */}
      {!isModalOpen && isGuidedActive && typeof document !== "undefined" && createPortal(
        <>
          {/* Fullscreen Backdrop Shield for non-modal steps (covers WHOLE SCREEN including navbar and sidebar) */}
          {currentGuidedStep && currentGuidedStep.id === "budget" && (
            <div 
              className="fixed inset-0 z-[80] bg-black/65 backdrop-blur-2xs transition-all pointer-events-auto w-screen h-screen"
              onClick={(e) => {
                e.stopPropagation();
              }}
            />
          )}

          {/* Floating Guided Tour Controller Card (z-[300000] to sit above all modals) */}
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300000] w-[94vw] max-w-xl animate-in slide-in-from-bottom-4 duration-300 font-['Plus_Jakarta_Sans',sans-serif]">
            {isGuideMinimized ? (
              /* Minimized Floating Bar (compact, never blocks modal buttons) */
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-full border border-gray-200 dark:border-white/10 bg-white/95 dark:bg-dark-surface/95 backdrop-blur-xl shadow-2xl text-xs font-bold text-gray-900 dark:text-white">
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse shrink-0" />
                  <span className="truncate">
                    Walkthrough: {currentGuidedStep ? `Step ${completedCount + 1} (${currentGuidedStep.label})` : "Finished"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsGuideMinimized(false)}
                    className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-zinc-300 transition cursor-pointer flex items-center gap-1 text-[11px]"
                    title="Expand walkthrough instructions"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Expand</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExitWalkthrough}
                    className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-700 dark:hover:text-white transition cursor-pointer"
                    title="Exit walkthrough"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              /* Expanded Guide Controller Card */
              <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white/95 dark:bg-dark-surface/95 backdrop-blur-md p-4 shadow-2xl space-y-3.5 text-gray-900 dark:text-white">
                
                {/* Header: Step index pill + minimize & exit guide button */}
                <div className="flex items-center justify-between">
                  {currentGuidedStep ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 shadow-2xs">
                      <Sparkles className="w-3 h-3 text-emerald-600 animate-pulse" />
                      Walkthrough Step: {completedCount + 1} of {completionSteps.length}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 shadow-2xs">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Walkthrough Finished
                    </span>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setIsGuideMinimized(true)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition text-xs flex items-center gap-1 cursor-pointer"
                      title="Minimize walkthrough guide"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>Minimize</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExitWalkthrough}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition text-xs flex items-center gap-1 cursor-pointer"
                      title="Exit guided walkthrough"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Exit</span>
                    </button>
                  </div>
                </div>

              {/* Just Saved Notification Banner */}
              {justCompletedLabel && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold animate-in fade-in duration-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-bounce" />
                  <span>{justCompletedLabel} saved! Automatically loading next step...</span>
                </div>
              )}

              {/* Step info + Instruction prompt */}
              {currentGuidedStep ? (
                <>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 flex items-center justify-center shrink-0">
                      {getStepIcon(currentGuidedStep.id, false)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          First we do this
                        </span>
                        <span className="text-gray-400 dark:text-zinc-600">•</span>
                        <span className="text-[10px] text-gray-500 dark:text-zinc-400">
                          Save to continue
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                        Set {currentGuidedStep.label.replace(/^Set\s+/, "")}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-zinc-300 mt-0.5 leading-relaxed">
                        {getStepInstructions(currentGuidedStep.id)}
                      </p>
                    </div>
                  </div>

                  {/* Inline Quick Budget Input (if current step is budget) */}
                  {currentGuidedStep.id === "budget" && (
                    <form onSubmit={handleSaveBudgetInline} className="flex items-center gap-2 pt-1">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min={1}
                          max={100000000}
                          value={budgetDraft}
                          onChange={(e) => setBudgetDraft(e.target.value)}
                          placeholder="e.g. 5000 Credits"
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                          autoFocus
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={budgetSaving || !budgetDraft || parseInt(budgetDraft, 10) <= 0}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
                      >
                        {budgetSaving ? "Saving..." : "Save Budget"}
                      </button>
                    </form>
                  )}

                  
                  {/* Quick Portfolio Action Buttons (if current step is portfolio) */}
                  {currentGuidedStep.id === "portfolio" && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsGuideMinimized(true);
                          const input = document.getElementById("profile-portfolio-pdf-input");
                          if (input) input.click();
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload CV / Resume (PDF)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsGuideMinimized(true);
                          const btn = document.querySelector('[data-tour="profile-portfolio-link-btn"]');
                          if (btn) btn.click();
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-white/5 text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Embed Website Link</span>
                      </button>
                    </div>
                  )}

                  {/* Footer Controls: Re-open setup modal / Skip / Save indicator */}
                  <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-white/5">
                    <button
                      type="button"
                      onClick={handleSkipGuidedStep}
                      className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white text-xs font-medium hover:bg-gray-100 dark:hover:bg-white/5 transition cursor-pointer"
                    >
                      Skip for now
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (shouldAutoMinimize(currentGuidedStep.id)) {
                          setIsGuideMinimized(true);
                        } else {
                          triggerStepAction(currentGuidedStep);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      <span>
                        {shouldAutoMinimize(currentGuidedStep.id) ? "Minimize Guide" : `Open ${currentGuidedStep.label} Tool`}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              ) : (
                /* Finished or Skipped steps review state */
                <div className="space-y-3 py-1">
                  {completedCount === completionSteps.length ? (
                    <div className="text-center space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 mx-auto flex items-center justify-center text-emerald-600 dark:text-emerald-300 shadow-sm">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                        All 8 Setup Steps Completed!
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-zinc-300">
                        Your profile is 100% complete and your Profile Complete badge is unlocked.
                      </p>
                      <button
                        type="button"
                        onClick={handleExitWalkthrough}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer mt-1"
                      >
                        Finish Walkthrough
                      </button>
                    </div>
                  ) : (
                    <div className="text-center space-y-2">
                      <p className="text-xs text-gray-600 dark:text-zinc-300">
                        You have completed this round, with {incompleteSteps.length} step(s) remaining.
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSkippedStepIds([]);
                            if (incompleteSteps.length > 0) {
                              activeStepTriggeredRef.current = incompleteSteps[0].id;
                              triggerStepAction(incompleteSteps[0]);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 text-xs font-bold transition cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Review Remaining ({incompleteSteps.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleExitWalkthrough}
                          className="px-3.5 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                        >
                          Exit Guide
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
        </div>
      </>,
      document.body
    )}
    </>
  );
};
