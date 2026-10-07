import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ShapeGrid from "@/components/ui/ShapeGrid";
import { useJobs } from "@/hooks/useJobs";
import useGlobalState from "@/lib/global_state";
import { requireVerifiedAccount } from "@/lib/accountVerification";

// Sub-components & Popups
import JobCreateHeader from "../job_components/job_creation_components/job_create_header";
import CreateCoreInfo from "../job_components/job_creation_components/1_create_coreinfo";
import CreateBudgetSkills from "../job_components/job_creation_components/2_create_budgetskills";
import CreateTerms from "../job_components/job_creation_components/3_create_terms";
import CreateReview from "../job_components/job_creation_components/3_create_review";
import CreationSuccess from "../job_components/job_creation_components/4_creation_success";
import PopupConfirmReturn from "../job_components/job_popups/popup_confirm_return";

const JobCreatePostPage: React.FC = () => {
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
          navigate("/");
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

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");

  // --- REVIEW STEP (POSTING IDENTITY) STATES ---
  const [postingAs, setPostingAs] = useState<"self" | "team">("self");
  const [selectedTeam, setSelectedTeam] = useState("");

  // --- SLIDE 2 STATES ---
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [minTimeline, setMinTimeline] = useState("");
  const [maxTimeline, setMaxTimeline] = useState("");
  const [deadline, setDeadline] = useState("");
  const [positions, setPositions] = useState(1);

  // --- STEP 3 STATES (TERMS) ---
  const [portfolioUseAllowed, setPortfolioUseAllowed] = useState(false);
  const [portfolioDuration, setPortfolioDuration] = useState("");
  const [isExistingProject, setIsExistingProject] = useState(false);
  const [existingProjectId, setExistingProjectId] = useState<string | null>(null);
  const [initiatorRole, setInitiatorRole] = useState("Freelancer");
  const [requireNDA, setRequireNDA] = useState(false);

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
      deadline
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

  const handleNextSlide = () => {
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
    } else if (maxTimeline && parseInt(maxTimeline)) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(deadline);
      const diffTime = selected.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (parseInt(maxTimeline) > diffDays) {
        stepErrors.maxTimeline = `Max timeline (${maxTimeline} days) cannot exceed the days until deadline (${diffDays} days).`;
      }
    }

    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return false;
    }

    setErrors({});
    if (jumpToReview) setCurrentSlide(4);
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
    setHasReachedReview(true);
    setCurrentSlide(4);
    return true;
  };

  const handleJumpToReview = () => {
    if (currentSlide === 1) {
      if (validateSlide1()) setCurrentSlide(4);
    } else if (currentSlide === 2) {
      handleSlide2Advance(true);
    } else if (currentSlide === 3) {
      handleSlide3Advance(true);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await requireVerifiedAccount();
      const rawMinBudget = getRawNumber(minBudget);
      const rawMaxBudget = getRawNumber(maxBudget);
      let fileId = null;

      if (thumbnailFile) {
        fileId = await uploadAttachment(thumbnailFile, "jobs");
      }

      const finalJobPayload = {
        title,
        description,
        category,
        difficulty,
        status: "Open",
        posted_as: postingAs === "self" ? "Self" : "Team",
        team_id: postingAs === "self" ? null : selectedTeam,
        acting_team_id: postingAs === "self" ? null : selectedTeam,
        tags: skills, // Note: Backend may need adaptation if these are strings instead of IDs
        payment_type: "Fixed",
        experience_level: difficulty,
        rate_credits_min: rawMinBudget,
        rate_credits_max: rawMaxBudget,
        timeline_min: parseInt(minTimeline) || 0,
        timeline_max: parseInt(maxTimeline) || 0,
        deadline,
        no_of_hires: positions,
        file_id: fileId,
        portfolio_use_allowed: portfolioUseAllowed,
        portfolio_use_duration_seconds: portfolioDuration ? parseInt(portfolioDuration) : null,
        is_existing_project: isExistingProject,
        existing_project_id: isExistingProject ? existingProjectId : null,
        initiator_role: initiatorRole,
          require_nda: requireNDA
      };

      await createJob(finalJobPayload);
      setIsSuccessOpen(true);
    } catch (err: any) {
      console.error(err);
      const message = err.response?.data?.message || err.message || "Failed to submit job post.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingVerification) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-dark-base">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
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
          borderColor={theme === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.06)"}
          hoverFillColor={theme === 'dark' ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.1)"}
          hoverTrailAmount={3}
        />
      </div>

      {/* Main Form Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 mx-auto max-w-3xl p-6 md:p-8 w-full space-y-6"
      >
        {/* Title Heading Display */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Creating a Job Post
          </h1>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
            Fill in the details below to publish a new job post to the marketplace.
          </p>
        </motion.div>

        {/* Header Stepper & Return Button */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
        >
          <JobCreateHeader 
            currentSlide={currentSlide} 
            onReturn={handleReturnTrigger} 
            hasReachedReview={hasReachedReview}
            onJumpToReview={handleJumpToReview}
          />
        </motion.div>

        {/* Form Box Wrapper with Slide Transition */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 md:p-8 backdrop-blur-xl shadow-2xl space-y-6"
        >
          <AnimatePresence mode="wait">
            {currentSlide === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.25 }}
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
                  onNext={handleNextSlide}
                  onDiscard={handleReturnTrigger}
                />
              </motion.div>
            )}

            {currentSlide === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25 }}
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
                  errors={errors}
                  setErrors={setErrors}
                  formatCommaString={formatCommaString}
                  onBack={() => setCurrentSlide(1)}
                  onAdvance={handleSlide2Advance}
                />
              </motion.div>
            )}

            {currentSlide === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25 }}
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
                  onBack={() => setCurrentSlide(2)}
                  onAdvance={handleSlide3Advance}
                />
              </motion.div>
            )}

            {currentSlide === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25 }}
              >
                <CreateReview
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
                  positions={positions}
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
                  onEditStep={setCurrentSlide}
                  onBack={() => setCurrentSlide(3)}
                  onSubmit={handleSubmit}
                  isSubmitting={isSubmitting}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      <CreationSuccess
        isOpen={isSuccessOpen}
        onConfirm={() => navigate("/jobs")}
      />

      <PopupConfirmReturn
        isOpen={isDiscardOpen}
        onConfirm={() => {
          setIsDiscardOpen(false);
          navigate("/jobs");
        }}
        onCancel={() => setIsDiscardOpen(false)}
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
};

export default JobCreatePostPage;
