import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import ShapeGrid from "@/components/ui/ShapeGrid";

// Sub-components
import JobCreateHeader from "../job_components/job_creation_components/job_create_header";
import CreateCoreInfo from "../job_components/job_creation_components/1_create_coreinfo";
import CreateBudgetSkills from "../job_components/job_creation_components/2_create_budgetskills";
import CreateReview from "../job_components/job_creation_components/3_create_review";
import CreationSuccess from "../job_components/job_creation_components/4_creation_success";

const JobCreatePostPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState<number>(1);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);

  // --- SLIDE 1 STATES ---
  const [thumbnail, setThumbnail] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");
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
    if (postingAs === "team" && !selectedTeam) stepErrors.selectedTeam = "Please assign a posting team entity.";

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
    if (!minBudget) stepErrors.minBudget = "Minimum budget is required.";
    if (!maxBudget) stepErrors.maxBudget = "Maximum budget is required.";
    if (minBudget && maxBudget && rawMaxBudget < rawMinBudget) {
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

  const handleSubmit = () => {
    const rawMinBudget = getRawNumber(minBudget);
    const rawMaxBudget = getRawNumber(maxBudget);

    const finalJobPayload = {
      title,
      description,
      category,
      difficulty,
      status: "Open",
      postingAs: postingAs === "self" ? "Self" : selectedTeam,
      skills,
      priceRange: `${formatCommaString(minBudget)} ~ ${formatCommaString(maxBudget)}`,
      minBudget: rawMinBudget,
      timeline: `${minTimeline}-${maxTimeline} Days`,
      positionsNeeded: positions,
      thumbnail: thumbnail || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80",
    };

    console.log("Submitting New Job Post Data:", finalJobPayload);
    setIsSuccessOpen(true);
  };

  return (
    <div className="relative w-full min-h-screen bg-[#080a12] text-white overflow-x-hidden pt-6 pb-12">
      {/* Background Grid Animation */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
        <ShapeGrid
          shape="square"
          squareSize={48}
          direction="diagonal"
          speed={0.4}
          borderColor="rgba(255, 255, 255, 0.05)"
          hoverFillColor="rgba(59, 130, 246, 0.15)"
          hoverTrailAmount={3}
        />
      </div>

      {/* Main Form Content */}
      <div className="relative z-10 mx-auto max-w-3xl p-6 md:p-8 w-full space-y-6">

        {/* Title Heading Display (Clean text without pill container) */}
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Creating a Job Post
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Fill in the details below to publish a new job post to the marketplace.
          </p>
        </div>

        {/* Header Stepper & Return Button */}
        <JobCreateHeader currentSlide={currentSlide} onReturn={handleReturnTrigger} />

        {/* Form Box Wrapper */}
        <div className="rounded-3xl border border-white/10 bg-[#0d0f1a]/80 p-6 md:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          {currentSlide === 1 && (
            <CreateCoreInfo
              title={title}
              setTitle={setTitle}
              description={description}
              setDescription={setDescription}
              category={category}
              setCategory={setCategory}
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              postingAs={postingAs}
              setPostingAs={setPostingAs}
              selectedTeam={selectedTeam}
              setSelectedTeam={setSelectedTeam}
              previewUrl={previewUrl}
              setPreviewUrl={setPreviewUrl}
              setThumbnail={setThumbnail}
              isDragging={isDragging}
              setIsDragging={setIsDragging}
              errors={errors}
              setErrors={setErrors}
              onNext={handleNextSlide}
              onDiscard={handleReturnTrigger}
            />
          )}

          {currentSlide === 2 && (
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
          )}

          {currentSlide === 3 && (
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
              selectedTeam={selectedTeam}
              skills={skills}
              formatCommaString={formatCommaString}
              onEditStep={setCurrentSlide}
              onBack={() => setCurrentSlide(2)}
              onSubmit={handleSubmit}
            />
          )}
        </div>
      </div>

      <CreationSuccess
        isOpen={isSuccessOpen}
        onConfirm={() => navigate("/jobs")}
      />

      <ConfirmationModal
        isOpen={isDiscardOpen}
        message="Are you sure you want to leave? All unsaved changes will be lost."
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