import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import ShapeGrid from "@/components/ui/ShapeGrid";
import { useJobs } from "@/hooks/useJobs";
import useGlobalState from "@/lib/global_state";
import { requireVerifiedAccount } from "@/lib/accountVerification";

// Sub-components & Popups
import JobCreateTeamHeader from "../job_components/job_creation_components/job_create_team_header";
import CreateCoreInfo from "../job_components/job_creation_components/1_create_coreinfo";
import CreateBudgetSkills from "../job_components/job_creation_components/2_create_budgetskills";
import CreateTerms from "../job_components/job_creation_components/3_create_terms";
import CreateTeamMilestones, { type MilestoneFormItem } from "../job_components/job_creation_components/4_create_teammilestones";
import CreateTeamReview from "../job_components/job_creation_components/5_create_teamreview";
import CreationSuccess from "../job_components/job_creation_components/4_creation_success";
import PopupConfirmReturn from "../job_components/job_popups/popup_confirm_return";

const JobCreateTeamPostPage: React.FC = () => {
  const navigate = useNavigate();
  const isVerified = useGlobalState((state) => state.isVerified);
  const isGuestMode = useGlobalState((state) => state.isGuestMode);
  const isGlobalLoading = useGlobalState((state) => state.isLoading);
  const user = useGlobalState((state) => state.user);
  const [isCheckingVerification, setIsCheckingVerification] = useState(!isVerified);

  useEffect(() => {
    let cancelled = false;

    if (isGuestMode) {
      navigate("/login");
      return;
    }

    if (isGlobalLoading) {
      return;
    }

    if (isVerified || user?.is_verified) {
      if (!isVerified && user?.is_verified) {
        useGlobalState.getState().setIsVerified(true);
      }
      setIsCheckingVerification(false);
      return;
    }

    requireVerifiedAccount()
      .then(() => {
        if (!cancelled) {
          setIsCheckingVerification(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          useGlobalState.getState().setIsVerificationModalOpen(
            true,
            "Account Verification is required to access Job Creation. Please verify your identity to proceed."
          );
          navigate("/jobs/postings");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isGuestMode, isGlobalLoading, isVerified, user?.is_verified, navigate]);

  const theme = useGlobalState((state) => state.theme);
  const [currentSlide, setCurrentSlide] = useState<number>(1);
  const [hasReachedReview, setHasReachedReview] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);

  const [thumbnail, setThumbnail] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createJob, uploadAttachment } = useJobs();

  // --- STEP 1: CORE INFO ---
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");

  // --- STEP 2: BUDGET & SKILLS ---
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [minTimeline, setMinTimeline] = useState("");
  const [maxTimeline, setMaxTimeline] = useState("");
  const [deadline, setDeadline] = useState("");
  const [positions, setPositions] = useState(2);

  // --- STEP 3: TERMS ---
  const [portfolioUseAllowed, setPortfolioUseAllowed] = useState(false);
  const [portfolioDuration, setPortfolioDuration] = useState("");
  const [isExistingProject, setIsExistingProject] = useState(false);
  const [existingProjectId, setExistingProjectId] = useState<string | null>(null);
  const [initiatorRole, setInitiatorRole] = useState("Freelancer");
  const [requireNDA, setRequireNDA] = useState(false);

  // --- STEP 4: TEAM MILESTONES ---
  const [milestones, setMilestones] = useState<MilestoneFormItem[]>([
    {
      id: "ms-1",
      title: "Milestone 1: Core Architecture",
      description: "Initial foundational structure and setup.",
      tasks: ["Initial workspace setup", "Core service integration"],
      slots_count: 1,
      budget_percentage: 50,
    },
    {
      id: "ms-2",
      title: "Milestone 2: Feature Implementation",
      description: "Building out main user flows and deliverables.",
      tasks: ["UI Implementation", "API connection"],
      slots_count: 1,
      budget_percentage: 50,
    },
  ]);

  // --- REVIEW STEP (POSTING IDENTITY) STATES ---
  const [postingAs, setPostingAs] = useState<"self" | "team">("self");
  const [selectedTeam, setSelectedTeam] = useState("");

  // --- LOCALSTORAGE AUTO-SAVE DRAFT ---
  const [isDraftRestored, setIsDraftRestored] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ensemble_team_job_create_draft");
      if (saved) {
        const data = JSON.parse(saved);
        if (data.title) setTitle(data.title);
        if (data.description) setDescription(data.description);
        if (data.category) setCategory(data.category);
        if (data.difficulty) setDifficulty(data.difficulty);
        if (Array.isArray(data.skills)) setSkills(data.skills);
        if (data.minBudget) setMinBudget(data.minBudget);
        if (data.maxBudget) setMaxBudget(data.maxBudget);
        if (data.minTimeline) setMinTimeline(data.minTimeline);
        if (data.maxTimeline) setMaxTimeline(data.maxTimeline);
        if (data.deadline) setDeadline(data.deadline);
        if (data.positions) setPositions(data.positions);
        if (Array.isArray(data.milestones) && data.milestones.length > 0) setMilestones(data.milestones);
        if (data.portfolioUseAllowed !== undefined) setPortfolioUseAllowed(data.portfolioUseAllowed);
        if (data.portfolioDuration) setPortfolioDuration(data.portfolioDuration);
        if (data.requireNDA !== undefined) setRequireNDA(data.requireNDA);
        setIsDraftRestored(true);
      }
    } catch (e) {
      console.error("Failed to restore team job draft", e);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const draftData = {
          title,
          description,
          category,
          difficulty,
          skills,
          minBudget,
          maxBudget,
          minTimeline,
          maxTimeline,
          deadline,
          positions,
          milestones,
          portfolioUseAllowed,
          portfolioDuration,
          requireNDA,
        };
        const hasContent = Boolean(title || description || category || minBudget || skills.length > 0);
        if (hasContent) {
          localStorage.setItem("ensemble_team_job_create_draft", JSON.stringify(draftData));
        }
      } catch (e) {
        console.error("Failed to auto-save team job draft", e);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [
    title, description, category, difficulty, skills, minBudget, maxBudget,
    minTimeline, maxTimeline, deadline, positions, milestones,
    portfolioUseAllowed, portfolioDuration, requireNDA
  ]);

  const handleClearDraft = () => {
    try {
      localStorage.removeItem("ensemble_team_job_create_draft");
      setTitle("");
      setDescription("");
      setCategory("");
      setDifficulty("");
      setSkills([]);
      setMinBudget("");
      setMaxBudget("");
      setMinTimeline("");
      setMaxTimeline("");
      setDeadline("");
      setPositions(2);
      setPortfolioUseAllowed(false);
      setPortfolioDuration("");
      setRequireNDA(false);
      setThumbnail("");
      setThumbnailFile(null);
      setPreviewUrl(null);
      setMilestones([
        {
          id: "ms-1",
          title: "Milestone 1: Core Architecture",
          description: "Initial foundational structure and setup.",
          tasks: ["Initial workspace setup", "Core service integration"],
          slots_count: 1,
          budget_percentage: 50,
        },
        {
          id: "ms-2",
          title: "Milestone 2: Feature Implementation",
          description: "Building out main user flows and deliverables.",
          tasks: ["UI Implementation", "API connection"],
          slots_count: 1,
          budget_percentage: 50,
        },
      ]);
      setErrors({});
      setIsDraftRestored(false);
      toast.success("Team job draft cleared.");
    } catch (e) {
      console.error("Failed to clear team job draft", e);
    }
  };

  // --- ERROR & VALIDATION STATES ---
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const hasUnsavedChanges = Boolean(
    title ||
      description ||
      category ||
      difficulty ||
      previewUrl ||
      skills.length > 0 ||
      minBudget ||
      maxBudget ||
      minTimeline ||
      maxTimeline ||
      deadline ||
      milestones.length > 0
  );

  const handleReturnTrigger = () => {
    if (hasUnsavedChanges) {
      setIsDiscardOpen(true);
    } else {
      navigate("/jobs");
    }
  };

  const formatCommaString = (val: string) => {
    const clean = val.replace(/\D/g, "");
    if (!clean) return "";
    return Number(clean).toLocaleString();
  };

  const getRawNumber = (val: string) => {
    return parseInt(val.replace(/\D/g, "")) || 0;
  };

  const validateSlide1 = () => {
    const stepErrors: { [key: string]: string } = {};
    if (!thumbnailFile && !previewUrl) stepErrors.thumbnail = "Thumbnail image is required.";
    if (!title.trim()) stepErrors.title = "Job Title is required.";
    if (title.length > 300) stepErrors.title = "Title cannot exceed 300 characters.";
    if (!description.trim()) stepErrors.description = "Job Description is required.";
    if (description.length > 2000) stepErrors.description = "Description cannot exceed 2000 characters.";
    if (!category) stepErrors.category = "Please select a category.";
    if (!difficulty) stepErrors.difficulty = "Please select a difficulty level.";

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleSlide1Advance = () => {
    if (validateSlide1()) {
      setCurrentSlide(2);
    }
  };

  const handleSlide2Advance = (jumpToReview = false) => {
    const stepErrors: { [key: string]: string } = {};
    const rawMinBudget = getRawNumber(minBudget);
    const rawMaxBudget = getRawNumber(maxBudget);

    if (skills.length < 3) {
      stepErrors.skills = `At least 3 skills are required. You currently have ${skills.length}.`;
    }
    if (!minBudget || rawMinBudget <= 0) stepErrors.minBudget = "Minimum budget must be greater than 0.";
    if (!maxBudget || rawMaxBudget <= 0) stepErrors.maxBudget = "Maximum budget must be greater than 0.";
    if (rawMinBudget > 0 && rawMaxBudget > 0 && rawMaxBudget < rawMinBudget) {
      stepErrors.maxBudget = "Maximum budget value cannot be lower than the minimum budget.";
    }
    if (!minTimeline) stepErrors.minTimeline = "Min timeline required.";
    if (!maxTimeline) stepErrors.maxTimeline = "Max timeline required.";
    if (minTimeline && maxTimeline && parseInt(maxTimeline) < parseInt(minTimeline)) {
      stepErrors.maxTimeline = "Max timeline cannot be lower than min timeline.";
    }
    if (!deadline) {
      stepErrors.deadline = "Deadline is required.";
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const parts = deadline.split('-');
      const selected = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const diffTime = selected.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        stepErrors.deadline = "Deadline cannot be in the past.";
      } else {
        if (maxTimeline && parseInt(maxTimeline) > diffDays) {
          stepErrors.maxTimeline = `Project timeline (${maxTimeline} days) cannot exceed the days until deadline (${diffDays} days).`;
        }
        if (minTimeline && parseInt(minTimeline) > diffDays) {
          stepErrors.minTimeline = `Min timeline (${minTimeline} days) cannot exceed the days until deadline (${diffDays} days).`;
        }
      }
    }

    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return false;
    }

    setErrors({});
    if (jumpToReview) setCurrentSlide(5);
    else setCurrentSlide(3);
    return true;
  };

  const handleSlide3Advance = (jumpToReview = false) => {
    const stepErrors: { [key: string]: string } = {};

    if (portfolioUseAllowed && !portfolioDuration) {
      stepErrors.portfolioDuration = "Please specify allowed duration.";
    }

    if (isExistingProject && !existingProjectId) {
      stepErrors.existingProjectId = "Please select an existing project or choose 'No'.";
    }

    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return false;
    }

    setErrors({});
    if (jumpToReview) setCurrentSlide(5);
    else setCurrentSlide(4);
    return true;
  };

  const scrollToMilestone = (milestoneId: string) => {
    setTimeout(() => {
      const el = document.getElementById(`milestone-card-${milestoneId}`) || document.getElementById(milestoneId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.remove("border-gray-200", "dark:border-white/10");
        el.classList.add("!border-red-500", "ring-2", "ring-red-500/20", "shadow-md");
        setTimeout(() => {
          el.classList.remove("!border-red-500", "ring-2", "ring-red-500/20", "shadow-md");
          el.classList.add("border-gray-200", "dark:border-white/10");
        }, 3000);
      }
    }, 60);
  };

  const handleSlide4Advance = (jumpToReview = false) => {
    const stepErrors: { [key: string]: string } = {};

    if (milestones.length === 0) {
      stepErrors.milestones = "Please add at least one milestone.";
    } else {
      const equalShare = milestones.length > 0 ? 100 / milestones.length : 100;
      const minShareThreshold = Math.max(1, Math.round(equalShare * 0.20));

      const timelineDays = parseInt(maxTimeline || "0") || parseInt(minTimeline || "0") || 3;
      const totalTimelineHours = timelineDays * 24;
      const equalHours = milestones.length > 0 ? totalTimelineHours / milestones.length : totalTimelineHours;
      const minHoursThreshold = Math.max(1, Math.round(equalHours * 0.20));

      for (let i = 0; i < milestones.length; i++) {
        const m = milestones[i];
        const name = m.title.trim() || `Milestone #${i + 1}`;
        if (!m.title.trim()) {
          stepErrors.milestones = `Milestone #${i + 1} needs a title.`;
          scrollToMilestone(m.id);
          break;
        }
        if (!m.tasks || m.tasks.length === 0) {
          stepErrors.milestones = `"${name}" needs at least 1 task.`;
          scrollToMilestone(m.id);
          break;
        }
        const pct = Number(m.budget_percentage) || 0;
        if (pct <= 0) {
          stepErrors.milestones = `"${name}" budget cannot be 0%.`;
          scrollToMilestone(m.id);
          break;
        }
        if (pct <= minShareThreshold) {
          stepErrors.milestones = `"${name}" budget is too low (min >${minShareThreshold}%).`;
          scrollToMilestone(m.id);
          break;
        }
        const hrs = Number(m.duration_hours) || 0;
        if (hrs <= 0) {
          stepErrors.milestones = `"${name}" hours cannot be 0.`;
          scrollToMilestone(m.id);
          break;
        }
        if (hrs <= minHoursThreshold) {
          stepErrors.milestones = `"${name}" hours is too low (min >${minHoursThreshold} hrs).`;
          scrollToMilestone(m.id);
          break;
        }
      }

      const totalPercentage = milestones.reduce((sum, m) => sum + (Number(m.budget_percentage) || 0), 0);
      if (!stepErrors.milestones && Math.abs(totalPercentage - 100) > 0.5) {
        stepErrors.milestones = `Total budget must equal 100% (currently ${totalPercentage}%).`;
      }

      const totalAllocatedHours = milestones.reduce((sum, m) => sum + (Number(m.duration_hours) || 0), 0);
      if (!stepErrors.milestones && totalAllocatedHours !== totalTimelineHours) {
        stepErrors.milestones = `Total milestone hours must equal the ${totalTimelineHours} hrs project timeline (currently ${totalAllocatedHours} hrs). Click Auto-Balance to distribute evenly.`;
      }
    }

    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return false;
    }

    setErrors({});
    setHasReachedReview(true);
    setCurrentSlide(5);
    return true;
  };

  const handleJumpToReview = () => {
    if (!validateSlide1()) {
      setCurrentSlide(1);
      return;
    }
    if (!handleSlide2Advance(true)) return;
    if (!handleSlide3Advance(true)) return;
    if (!handleSlide4Advance(true)) return;
    setCurrentSlide(5);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (postingAs === "team" && !selectedTeam) {
      setErrors({ selectedTeam: "Please select a team." });
      return;
    }

    setIsSubmitting(true);
    try {
      await requireVerifiedAccount();
      const rawMinBudget = getRawNumber(minBudget);
      const rawMaxBudget = getRawNumber(maxBudget);
      let fileId = null;

      if (thumbnailFile) {
        fileId = await uploadAttachment(thumbnailFile, "jobs");
      }

      const calculatedTotalHires = milestones.reduce((sum, m) => sum + Math.max(1, m.slots_count || 1), 0);

      let allocatedCredits = 0;
      const timelineDays = parseInt(maxTimeline || "0") || parseInt(minTimeline || "0") || 3;
      const totalTimelineHours = timelineDays * 24;

      const formattedMilestones = milestones.map((m, idx) => {
        const pct = Number(m.budget_percentage) || 0;
        let credits = 0;
        if (idx === milestones.length - 1) {
          credits = Math.max(0, rawMaxBudget - allocatedCredits);
        } else {
          credits = Math.round((rawMaxBudget * pct) / 100);
          allocatedCredits += credits;
        }
        const defaultHours = Math.max(1, Math.round((totalTimelineHours * pct) / 100) || 24);
        return {
          title: m.title.trim(),
          description: m.description,
          tasks: m.tasks || [],
          slots_count: Math.max(1, m.slots_count || 1),
          budget_percentage: pct,
          budget_credits: credits,
          duration_hours: Math.max(1, parseInt(m.duration_hours as any) || defaultHours),
          order_index: idx,
        };
      });

      const finalJobPayload = {
        title,
        description,
        category,
        difficulty,
        status: "Open",
        hiring_type: "team",
        posted_as: postingAs === "self" ? "Self" : "Team",
        team_id: postingAs === "self" ? null : selectedTeam,
        acting_team_id: postingAs === "self" ? null : selectedTeam,
        tags: skills,
        payment_type: "Fixed",
        experience_level: difficulty,
        rate_credits_min: rawMinBudget,
        rate_credits_max: rawMaxBudget,
        timeline_min: parseInt(minTimeline) || 0,
        timeline_max: parseInt(maxTimeline) || 0,
        deadline,
        no_of_hires: calculatedTotalHires,
        file_id: fileId,
        portfolio_use_allowed: portfolioUseAllowed,
        portfolio_use_duration_seconds: portfolioDuration ? parseInt(portfolioDuration) : null,
        is_existing_project: isExistingProject,
        existing_project_id: isExistingProject ? existingProjectId : null,
        initiator_role: initiatorRole,
        require_nda: requireNDA,
        milestones: formattedMilestones,
      };

      await createJob(finalJobPayload);
      try {
        localStorage.removeItem("ensemble_team_job_create_draft");
      } catch (_) {}
      setIsDraftRestored(false);
      setIsSuccessOpen(true);
    } catch (err: any) {
      console.error(err);
      const message = err.response?.data?.message || err.message || "Failed to submit team job post.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingVerification) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-dark-base">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-white overflow-x-hidden pt-6 pb-12">
      {/* Background Grid Animation */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
        <ShapeGrid
          shape="square"
          squareSize={48}
          direction="diagonal"
          speed={0.4}
          borderColor={theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.06)"}
          hoverFillColor={theme === "dark" ? "rgba(168, 85, 247, 0.15)" : "rgba(168, 85, 247, 0.1)"}
          hoverTrailAmount={3}
        />
      </div>

      {/* Main Form Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 mx-auto max-w-6xl 2xl:max-w-7xl px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6"
      >
        {/* Title Heading Display */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 mb-2">
            Team & Multi-Role Wizard (5 Steps)
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            Creating a Team Job Post
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Publish a collaborative team project with customizable milestones, deliverables, and role openings.
          </p>
        </motion.div>

        {/* Header Stepper & Return Button */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
        >
          <JobCreateTeamHeader
            currentSlide={currentSlide}
            onReturn={handleReturnTrigger}
            hasReachedReview={hasReachedReview}
            onJumpToReview={handleJumpToReview}
          />
        </motion.div>

        {isDraftRestored && (
          <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between text-xs text-purple-600 dark:text-purple-400 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-purple-500" />
              <span>Draft restored from your last session. Progress is saved automatically.</span>
            </div>
            <button
              type="button"
              onClick={handleClearDraft}
              className="text-[11px] font-bold text-red-500 hover:text-red-600 dark:hover:text-red-400 hover:underline px-2 py-0.5 rounded focus:outline-none"
            >
              Reset / Clear Draft
            </button>
          </div>
        )}

        {/* Form Box Wrapper */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 sm:p-8 lg:p-10 backdrop-blur-xl shadow-2xl space-y-6 relative overflow-hidden"
        >
          <AnimatePresence mode="wait">
            {currentSlide === 1 && (
              <motion.div
                key="slide-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <CreateCoreInfo
                  title={title}
                  setTitle={setTitle}
                  description={description}
                  setDescription={setDescription}
                  category={category}
                  setCategory={setCategory}
                  difficulty={difficulty}
                  setDifficulty={setDifficulty}
                  previewUrl={previewUrl}
                  setPreviewUrl={setPreviewUrl}
                  setThumbnail={setThumbnail}
                  setThumbnailFile={setThumbnailFile}
                  isDragging={isDragging}
                  setIsDragging={setIsDragging}
                  errors={errors}
                  setErrors={setErrors}
                  onNext={handleSlide1Advance}
                  onDiscard={handleReturnTrigger}
                />
              </motion.div>
            )}

            {currentSlide === 2 && (
              <motion.div
                key="slide-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <CreateBudgetSkills
                  skills={skills}
                  setSkills={setSkills}
                  skillInput={skillInput}
                  setSkillInput={setSkillInput}
                  minBudget={minBudget}
                  setMinBudget={setMinBudget}
                  maxBudget={maxBudget}
                  setMaxBudget={setMaxBudget}
                  minTimeline={minTimeline}
                  setMinTimeline={setMinTimeline}
                  maxTimeline={maxTimeline}
                  setMaxTimeline={setMaxTimeline}
                  deadline={deadline}
                  setDeadline={setDeadline}
                  positions={positions}
                  setPositions={setPositions}
                  isFixedBudget={true}
                  hidePositions={true}
                  errors={errors}
                  setErrors={setErrors}
                  formatCommaString={formatCommaString}
                  onBack={() => setCurrentSlide(1)}
                  onAdvance={() => handleSlide2Advance(false)}
                />
              </motion.div>
            )}

            {currentSlide === 3 && (
              <motion.div
                key="slide-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <CreateTerms
                  portfolioUseAllowed={portfolioUseAllowed}
                  setPortfolioUseAllowed={setPortfolioUseAllowed}
                  portfolioDuration={portfolioDuration}
                  setPortfolioDuration={setPortfolioDuration}
                  isExistingProject={isExistingProject}
                  setIsExistingProject={setIsExistingProject}
                  existingProjectId={existingProjectId}
                  setExistingProjectId={setExistingProjectId}
                  initiatorRole={initiatorRole}
                  setInitiatorRole={setInitiatorRole}
                  requireNDA={requireNDA}
                  setRequireNDA={setRequireNDA}
                  errors={errors}
                  setErrors={setErrors}
                  onBack={() => setCurrentSlide(2)}
                  onAdvance={() => handleSlide3Advance(false)}
                />
              </motion.div>
            )}

            {currentSlide === 4 && (
              <motion.div
                key="slide-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <CreateTeamMilestones
                  milestones={milestones}
                  setMilestones={setMilestones}
                  minBudget={minBudget}
                  maxBudget={maxBudget}
                  minTimeline={minTimeline}
                  maxTimeline={maxTimeline}
                  errors={errors}
                  setErrors={setErrors}
                  onBack={() => setCurrentSlide(3)}
                  onAdvance={() => handleSlide4Advance(false)}
                />
              </motion.div>
            )}

            {currentSlide === 5 && (
              <motion.div
                key="slide-5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <CreateTeamReview
                  title={title}
                  description={description}
                  category={category}
                  difficulty={difficulty}
                  previewUrl={previewUrl}
                  minBudget={minBudget}
                  maxBudget={maxBudget}
                  minTimeline={minTimeline}
                  maxTimeline={maxTimeline}
                  deadline={deadline}
                  milestones={milestones}
                  postingAs={postingAs}
                  setPostingAs={setPostingAs}
                  selectedTeam={selectedTeam}
                  setSelectedTeam={setSelectedTeam}
                  portfolioUseAllowed={portfolioUseAllowed}
                  portfolioDuration={portfolioDuration}
                  isExistingProject={isExistingProject}
                  existingProjectId={existingProjectId}
                  initiatorRole={initiatorRole}
                  requireNDA={requireNDA}
                  skills={skills}
                  errors={errors}
                  setErrors={setErrors}
                  formatCommaString={formatCommaString}
                  onEditStep={(step) => setCurrentSlide(step)}
                  onBack={() => setCurrentSlide(4)}
                  onSubmit={handleSubmit}
                  isSubmitting={isSubmitting}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* Discard / Confirm Return Modal */}
      <PopupConfirmReturn
        isOpen={isDiscardOpen}
        onCancel={() => setIsDiscardOpen(false)}
        onConfirm={() => {
          setIsDiscardOpen(false);
          navigate("/jobs");
        }}
      />

      {/* Success Modal */}
      <CreationSuccess
        isOpen={isSuccessOpen}
        onConfirm={() => {
          setIsSuccessOpen(false);
          navigate("/jobs");
        }}
        onClose={() => {
          setIsSuccessOpen(false);
          navigate("/jobs");
        }}
      />
    </div>
  );
};

export default JobCreateTeamPostPage;
