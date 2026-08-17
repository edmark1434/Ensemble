import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ShapeGrid from "@/components/ui/ShapeGrid";
import { useJobs } from "@/hooks/useJobs";
import useGlobalState from "@/lib/global_state";

// Sub-components & Popups
import JobCreateHeader from "../job_components/job_creation_components/job_create_header";
import CreateCoreInfo from "../job_components/job_creation_components/1_create_coreinfo";
import CreateBudgetSkills from "../job_components/job_creation_components/2_create_budgetskills";
import CreateReview from "../job_components/job_creation_components/3_create_review";
import CreationSuccess from "../job_components/job_creation_components/4_creation_success";
import PopupConfirmReturn from "../job_components/job_popups/popup_confirm_return";

const JobCreatePostPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useGlobalState((state) => state.theme);
  const [currentSlide, setCurrentSlide] = useState<number>(1);
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
  const [positions, setPositions] = useState(1);

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
      maxTimeline
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

  const handleSlide2Advance = () => {
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

    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }

    setErrors({});
    setCurrentSlide(3);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
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
        tags: skills, // Note: Backend may need adaptation if these are strings instead of IDs
        payment_type: "Fixed",
        experience_level: difficulty,
        rate_credits_min: rawMinBudget,
        rate_credits_max: rawMaxBudget,
        timeline_min: parseInt(minTimeline) || 0,
        timeline_max: parseInt(maxTimeline) || 0,
        no_of_hires: positions,
        file_id: fileId
      };

      await createJob(finalJobPayload);
      setIsSuccessOpen(true);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to submit job post.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <JobCreateHeader currentSlide={currentSlide} onReturn={handleReturnTrigger} />
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
                  positions={positions}
                  postingAs={postingAs}
                  setPostingAs={setPostingAs}
                  selectedTeam={selectedTeam}
                  setSelectedTeam={setSelectedTeam}
                  skills={skills}
                  errors={errors}
                  setErrors={setErrors}
                  formatCommaString={formatCommaString}
                  onEditStep={setCurrentSlide}
                  onBack={() => setCurrentSlide(2)}
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