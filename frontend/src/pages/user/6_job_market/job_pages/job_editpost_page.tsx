import React, { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Save, X, ChevronDown, Check, Briefcase, Lock, Image as ImageIcon, Info, Plus, Trash2, Bold, Italic, List, Eye, EyeOff } from "lucide-react";
import api from "@/lib/axios";
import ShapeGrid from "@/components/ui/ShapeGrid";
import { useJobs } from "@/hooks/useJobs";
import PopupConfirmReturn from "../job_components/job_popups/popup_confirm_return";
import CreationSuccess from "../job_components/job_creation_components/4_creation_success";
import { categories, difficulties } from "../job_components/job_creation_components/1_create_coreinfo";
import type { Job } from "../job_components/job_lists";
import { CreditIcon } from "@/components/ui/credit-icon";
import { JobRichText } from "../job_components/JobRichText";
import { showErrorToast } from "@/components/utility/toast";
import { SkillsAutocomplete } from "../job_components/job_creation_components/SkillsAutocomplete";

interface CustomSelectProps {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  error?: string;
  onSelect: (val: string) => void;
}

const CustomDropdown: React.FC<CustomSelectProps> = ({
  label,
  value,
  options,
  placeholder,
  error,
  onSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-1.5 relative">
      <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`w-full flex items-center justify-between rounded-xl border bg-white dark:bg-dark-surface px-3.5 py-2.5 text-xs text-left transition-all ${
            error
              ? "border-red-500/50 focus:border-red-500"
              : isOpen
              ? "border-blue-500 ring-2 ring-blue-500/10"
              : "border-gray-200 dark:border-white/10 hover:border-white/20"
          }`}
        >
          <span className={value ? "text-gray-900 dark:text-white font-medium" : "text-gray-500 dark:text-zinc-500"}>
            {value || placeholder}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-gray-500 dark:text-zinc-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-blue-400" : ""
            }`}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              <div
                className="fixed inset-0 z-20 cursor-default"
                onClick={() => setIsOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 4, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute left-0 right-0 z-30 max-h-48 overflow-y-auto rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-1.5 shadow-2xl space-y-0.5 custom-scrollbar"
              >
                {options.map((opt) => {
                  const isSelected = value === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        onSelect(opt);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                        isSelected
                          ? "bg-blue-500/15 text-blue-400"
                          : "text-gray-600 dark:text-zinc-300 hover:bg-white dark:bg-white/5 shadow-sm dark:shadow-none hover:text-gray-900 dark:text-white"
                      }`}
                    >
                      <span>{opt}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-blue-400" />}
                    </button>
                  );
                })}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  );
};

export const JobEditPostPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // Form States
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState<"Beginner" | "Intermediate" | "Expert">("Intermediate");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");

  // Thumbnail States
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { fetchJobs, updateJob, uploadAttachment, deleteJob } = useJobs();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Read-only baseline state holders
  const [minBudget, setMinBudget] = useState<number>(0);
  const [maxBudget, setMaxBudget] = useState<number>(0);
  const [priceRange, setPriceRange] = useState("");
  const [positionsNeeded, setPositionsNeeded] = useState<number>(1);
  const [hiredCount, setHiredCount] = useState<number>(0);
  const [minTimeline, setMinTimeline] = useState<number>(0);
  const [maxTimeline, setMaxTimeline] = useState<number>(0);
  const [deadline, setDeadline] = useState<string>("");

  // Editable Terms State
  const [portfolioUseAllowed, setPortfolioUseAllowed] = useState(false);
  const [portfolioDuration, setPortfolioDuration] = useState("");
  const [isExistingProject, setIsExistingProject] = useState(false);
  const [existingProjectId, setExistingProjectId] = useState<string | null>(null);
  const [initiatorRole, setInitiatorRole] = useState("Client");
  const [requireNDA, setRequireNDA] = useState(false);
  
  // Project Selection
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Popup & UI States
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      try {
        const data = await fetchJobs();
        const found = data.find((j: any) => j.job_id === id);
        if (found) {
          setTitle(found.title);
          setDescription(found.description);
          setCategory(found.category);
          setDifficulty(found.experience_level || "Intermediate");
          let parsedTags: string[] = [];
          if (Array.isArray(found.tags)) {
            parsedTags = found.tags;
          } else if (typeof found.tags === 'string') {
            try {
              parsedTags = JSON.parse(found.tags);
            } catch (e) {
              parsedTags = found.tags.split(',').map((s: string) => s.trim()).filter(Boolean);
            }
          }
          setSkills(parsedTags);
          setMinBudget(found.rate_credits_min || 0);
          setMaxBudget(found.rate_credits_max || 0);
          setPriceRange(`${found.rate_credits_min?.toLocaleString() || 0} ~ ${found.rate_credits_max?.toLocaleString() || 0}`);
          setPositionsNeeded(found.no_of_hires || 1);
          setHiredCount(parseInt(found.hired_count) || 0);
          setMinTimeline(found.timeline_min || 0);
          setMaxTimeline(found.timeline_max || 0);
          
          let deadlineStr = found.rough_deadline || found.deadline;
          if (deadlineStr) {
            const d = new Date(deadlineStr);
            deadlineStr = d.toISOString().split('T')[0];
          }
          setDeadline(deadlineStr || "");
          
          setPortfolioUseAllowed(found.portfolio_use_allowed || false);
          setPortfolioDuration(found.portfolio_use_duration_seconds ? found.portfolio_use_duration_seconds.toString() : "");
          setIsExistingProject(found.is_existing_project || false);
          setExistingProjectId(found.existing_project_id || null);
          setInitiatorRole(found.initiator_role || "Client");
          setRequireNDA(found.require_nda || false);

          if (found.thumbnail_path) {
            setPreviewUrl(`${import.meta.env.VITE_CLOUDFRONT_URL}/${found.thumbnail_path}`);
          }
        }
      } catch (err) {
        console.error("Failed to load job for editing", err);
      }
    };
    loadData();
  }, [id, fetchJobs]);

  useEffect(() => {
    if (initiatorRole === "Client" && projects.length === 0) {
      const fetchUserProjects = async () => {
        try {
          setLoadingProjects(true);
          const response = await api.get('/api/projects');
          setProjects(response.data.projects || []);
        } catch (error) {
          console.error("Failed to fetch projects", error);
        } finally {
          setLoadingProjects(false);
        }
      };
      fetchUserProjects();
    }
  }, [initiatorRole, projects.length]);

  // Thumbnail Handlers
  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      showErrorToast("Please upload an image file.");
      return;
    }
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setThumbnailFile(file);
    setIsDirty(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  // Skill Handlers
  const handleAddSkill = (e: FormEvent) => {
    e.preventDefault();
    const cleanInput = skillInput.trim();
    if (!cleanInput) return;

    if (skills.length >= 6) {
      setErrors((prev) => ({ ...prev, skills: "Maximum of 6 skills allowed." }));
      return;
    }
    if (skills.includes(cleanInput)) {
      setErrors((prev) => ({ ...prev, skills: "This skill has already been added." }));
      return;
    }

    setSkills((prev) => [...prev, cleanInput]);
    setSkillInput("");
    setIsDirty(true);
    setErrors((prev) => {
      const { skills: _, ...rest } = prev;
      return rest;
    });
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills((prev) => prev.filter((s) => s !== skillToRemove));
    setIsDirty(true);
  };

  const handleReturnTrigger = () => {
    if (isDirty) {
      setIsDiscardOpen(true);
    } else {
      navigate("/jobs");
    }
  };

  const validate = () => {
    const stepErrors: { [key: string]: string } = {};
    if (!title.trim()) stepErrors.title = "Job Title is required.";
    if (!description.trim()) stepErrors.description = "Job Description is required.";
    if (!category) stepErrors.category = "Please select a category.";
    if (!difficulty) stepErrors.difficulty = "Please select a difficulty level.";
    if (skills.length < 3) stepErrors.skills = `At least 3 skills are required (${3 - skills.length} more needed).`;
    if (!previewUrl) stepErrors.thumbnail = "A thumbnail image is required.";

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      let fileId;
      if (thumbnailFile) {
        fileId = await uploadAttachment(thumbnailFile, "jobs");
      }

      const updatedPayload = {
        title,
        description,
        category,
        experience_level: difficulty,
        tags: skills,
        file_id: thumbnailFile ? fileId : undefined,
        portfolio_use_allowed: portfolioUseAllowed,
        portfolio_use_duration_seconds: portfolioDuration ? parseInt(portfolioDuration) : null,
        is_existing_project: isExistingProject,
        existing_project_id: isExistingProject ? existingProjectId : null,
        initiator_role: initiatorRole,
          require_nda: requireNDA
      };

      if (!id) throw new Error("Job ID missing");

      await updateJob(id, updatedPayload);
      setIsSuccessOpen(true);
      setIsDirty(false);
    } catch (err: any) {
      console.error(err);
      setErrors((prev) => ({ ...prev, submit: err.message || "Failed to update job post." }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const textarea = descriptionRef.current;
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

    if (suffix === '' && selected.includes('\n')) {
      const lines = selected.split('\n');
      const bulleted = lines.map(line => prefix + line).join('\n');
      newText = before + bulleted + after;
      finalSelectionEnd = start + bulleted.length;
    } else {
      newText = before + prefix + selected + suffix + after;
    }

    setDescription(newText);
    setIsDirty(true);
    setErrors((prev) => {
      const { description: _, ...rest } = prev;
      return rest;
    });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(finalSelectionStart, finalSelectionEnd);
    }, 0);
  };

  const handleDelete = async () => {
    if (!id || hiredCount > 0) return;
    setIsSubmitting(true);
    try {
      await deleteJob(id);
      setIsDeleteOpen(false);
      navigate("/jobs/postings");
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, submit: err.message || "Failed to delete job post." }));
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
          borderColor="rgba(150, 150, 150, 0.15)"
          hoverFillColor="rgba(59, 130, 246, 0.15)"
          hoverTrailAmount={3}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 mx-auto max-w-3xl p-6 md:p-8 w-full space-y-6"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              Edit Job Post
            </h1>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
              Modify requirements and details for job listing ID <span className="font-mono text-blue-400">{id}</span>
            </p>
          </div>

          <button
            onClick={handleReturnTrigger}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gray-100 dark:bg-zinc-800/80 hover:bg-gray-200 dark:hover:bg-zinc-700/80 border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white transition shrink-0 shadow-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return</span>
          </button>
        </div>

        {/* Main Form Box */}
        <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 md:p-8 backdrop-blur-xl shadow-2xl space-y-5 text-left">

          {/* Read-Only Fixed Parameters Notice */}
          <div className="flex flex-col gap-2 mb-2">
            <div className="p-3.5 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-gray-500 dark:text-zinc-400">
                <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 shrink-0">
                  <CreditIcon className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-zinc-500 flex items-center gap-1">
                    Budget Pool {positionsNeeded > 1 ? "(Divided)" : ""} <Lock className="h-2.5 w-2.5 text-gray-500 dark:text-zinc-500" />
                  </span>
                  <div className="flex flex-col">
                    {positionsNeeded > 1 ? (
                      <>
                        <span className="font-bold text-gray-900 dark:text-white line-through opacity-70 text-[10px]">{priceRange} (Original)</span>
                        <span className="font-extrabold text-blue-500">
                          {`${(minBudget / positionsNeeded).toFixed(0).toLocaleString()} ~ ${(maxBudget / positionsNeeded).toFixed(0).toLocaleString()} (Per Person)`}
                        </span>
                      </>
                    ) : (
                      <span className="font-bold text-gray-900 dark:text-white">{priceRange}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-gray-500 dark:text-zinc-400">
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
                  <Briefcase className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-zinc-500 flex items-center gap-1">
                    Positions Open <Lock className="h-2.5 w-2.5 text-gray-500 dark:text-zinc-500" />
                  </span>
                  <span className="font-bold text-gray-900 dark:text-white">{positionsNeeded} Slots</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-gray-500 dark:text-zinc-400">
                <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-zinc-500 flex items-center gap-1">
                    Project Timeline <Lock className="h-2.5 w-2.5 text-gray-500 dark:text-zinc-500" />
                  </span>
                  <span className="font-bold text-gray-900 dark:text-white">{minTimeline} - {maxTimeline} Days</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-gray-500 dark:text-zinc-400">
                <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 shrink-0">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-zinc-500 flex items-center gap-1">
                    Project Deadline <Lock className="h-2.5 w-2.5 text-gray-500 dark:text-zinc-500" />
                  </span>
                  <span className="font-bold text-gray-900 dark:text-white">{deadline}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Read-Only Explanation Alert */}
          <div className="flex items-start gap-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] p-3.5 mb-2 mt-1">
            <div className="mt-0.5 rounded-full bg-gray-200 dark:bg-white/10 p-1 text-gray-600 dark:text-zinc-400 shrink-0">
              <Info className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900 dark:text-white">Why are these locked?</p>
              <p className="text-[11px] text-gray-600 dark:text-zinc-400 mt-1 leading-relaxed">
                Budget pools and available positions cannot be modified after a job is posted. This prevents disputes and ensures consistency for freelancers who have already submitted or are currently drafting proposals based on your original terms.
              </p>
            </div>
          </div>

          {/* Thumbnail & Category/Difficulty Grid */}
          <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-5 items-start">
            {/* Left: Square Image */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block mb-1.5">
                Job Thumbnail <span className="text-red-500">*</span>
              </label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative w-[140px] h-[140px] shrink-0 rounded-xl border border-dashed flex items-center justify-center p-3 cursor-pointer transition-all duration-200 group overflow-hidden ${
                  isDragging ? "border-blue-500 bg-blue-500/10" : errors.thumbnail ? "border-red-500 bg-red-500/5" : previewUrl ? "border-white/20 bg-zinc-900" : "border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none hover:border-white/20"
                }`}
              >
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
              {previewUrl ? (
                <>
                  <img src={previewUrl} alt="Thumbnail Preview" className="absolute inset-0 w-full h-full object-cover opacity-70 transition-all duration-300 group-hover:blur-sm group-hover:opacity-40" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl">
                    <div className="h-8 w-8 rounded-full bg-black/60 flex items-center justify-center mb-1">
                      <ImageIcon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">Change Image</span>
                  </div>
                </>
              ) : (
                <div className="text-center space-y-1 pointer-events-none">
                  <ImageIcon className="h-5 w-5 mx-auto text-gray-500 dark:text-zinc-400" />
                  <div className="text-[10px] text-gray-600 dark:text-zinc-300 leading-tight">
                    <span className="font-bold text-blue-500 dark:text-blue-400 block mb-0.5">Browse</span>
                    or drop
                  </div>
                </div>
              )}
              </div>
              {errors.thumbnail && <p className="text-[11px] text-red-400 mt-1">{errors.thumbnail}</p>}
            </div>

            {/* Right: Stacked Dropdowns */}
            <div className="flex flex-col gap-4 pt-[2px]">
              <CustomDropdown
                label="Job Category"
                value={category}
                options={categories}
                placeholder="Select Category"
                error={errors.category}
                onSelect={(val) => {
                  setCategory(val);
                  setIsDirty(true);
                  setErrors((prev) => { const { category: _, ...r } = prev; return r; });
                }}
              />

              <CustomDropdown
                label="Job Difficulty"
                value={difficulty}
                options={difficulties}
                placeholder="Select Level"
                error={errors.difficulty}
                onSelect={(val) => {
                  setDifficulty(val as "Beginner" | "Intermediate" | "Expert");
                  setIsDirty(true);
                  setErrors((prev) => { const { difficulty: _, ...r } = prev; return r; });
                }}
              />
            </div>
          </div>

          {/* Job Title */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
                Job Post Title <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] font-mono text-gray-500 dark:text-zinc-500">{title.length}/300</span>
            </div>
            <input
              type="text"
              maxLength={300}
              placeholder="e.g., Wedding Video Edit - Romantic Style"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setIsDirty(true);
                if (e.target.value.trim()) setErrors((prev) => { const { title: _, ...r } = prev; return r; });
              }}
              className={`w-full rounded-xl border bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-3.5 py-2.5 text-xs text-gray-900 dark:text-white outline-none transition-all ${
                errors.title ? "border-red-500/50 focus:border-red-500" : "border-gray-200 dark:border-white/10 focus:border-blue-500/50"
              }`}
            />
            {errors.title && <p className="text-[11px] text-red-400">{errors.title}</p>}
          </div>

          {/* Job Description */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-end mb-1">
              <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
                Job Post Description <span className="text-red-500">*</span>
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
                <span className="text-[10px] font-mono text-gray-500 dark:text-zinc-500 ml-2">{description.length}/2000</span>
              </div>
            </div>
            
            {isPreviewMode ? (
              <div className="w-full min-h-[180px] rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-4 py-3 text-xs overflow-y-auto custom-scrollbar">
                {description ? (
                  <JobRichText content={description} />
                ) : (
                  <span className="text-gray-500 dark:text-zinc-500 italic">Nothing to preview</span>
                )}
              </div>
            ) : (
              <textarea
                ref={descriptionRef}
                rows={8}
                maxLength={2000}
                placeholder="Outline requirements, raw footage details, deliverables..."
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setIsDirty(true);
                  if (e.target.value.trim()) setErrors((prev) => { const { description: _, ...r } = prev; return r; });
                }}
                className={`w-full min-h-[180px] rounded-xl border bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-3.5 py-3 text-xs text-gray-900 dark:text-white outline-none transition-all resize-y leading-relaxed custom-scrollbar ${
                  errors.description ? "border-red-500/50 focus:border-red-500" : "border-gray-200 dark:border-white/10 focus:border-blue-500/50"
                }`}
              />
            )}
            
            {errors.description && <p className="text-[11px] text-red-400">{errors.description}</p>}
          </div>



          {/* Required Skills Management */}
          <SkillsAutocomplete 
            skills={skills} 
            setSkills={setSkills} 
            error={errors.skills} 
            maxSkills={6} 
          />

          {/* Workflow & Terms */}
          <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/5">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-0.5">Workflow & Terms</h3>
              <p className="text-xs text-gray-600 dark:text-zinc-400">Manage rules for the final output and collaboration initiation.</p>
            </div>

            {/* Initiator */}
            <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02]">
              <label className="text-sm font-semibold text-gray-900 dark:text-white block mb-0.5">
                Who will initiate the Creation of the video project?
              </label>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mb-3">
                If this is a new project, who is responsible for creating and inviting the other party?
              </p>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="initiatorRole"
                    value="Client"
                    checked={initiatorRole === "Client"}
                    onChange={(e) => {
                      setInitiatorRole(e.target.value);
                      setIsDirty(true);
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 bg-transparent"
                  />
                  <span className="text-xs font-medium text-gray-700 dark:text-zinc-300">Me (Client)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="initiatorRole"
                    value="Freelancer"
                    checked={initiatorRole === "Freelancer"}
                    onChange={(e) => {
                      setInitiatorRole(e.target.value);
                      setIsExistingProject(false);
                      setExistingProjectId(null);
                      setIsDirty(true);
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 bg-transparent"
                  />
                  <span className="text-xs font-medium text-gray-700 dark:text-zinc-300">The Freelancer</span>
                </label>
              </div>
            </div>

            {/* Existing Project Link */}
            {initiatorRole === "Client" && (
              <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02]">
                <div className="flex items-start gap-3">
                  <input 
                    type="checkbox" 
                    checked={isExistingProject}
                    onChange={(e) => {
                      setIsExistingProject(e.target.checked);
                      if (!e.target.checked) setExistingProjectId(null);
                      setIsDirty(true);
                    }}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-transparent"
                  />
                  <div className="flex-1">
                    <label className="text-sm font-semibold text-gray-900 dark:text-white block">
                      Link to Existing Project
                    </label>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                      Is this job part of an existing Ensemble project?
                    </p>
                    {isExistingProject && (
                      <div className="mt-3">
                        <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block mb-2">
                          Select Project <span className="text-red-500">*</span>
                        </label>
                        {loadingProjects ? (
                          <div className="text-xs text-gray-500">Loading projects...</div>
                        ) : existingProjectId ? (
                          <div className="flex flex-col gap-2">
                            {projects.filter(p => p.id === existingProjectId).map(p => (
                              <div key={p.id} className="relative w-48 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1d2d] shadow-sm">
                                <div className="h-24 bg-gray-100 dark:bg-black/40 relative">
                                  {p.thumbnail && <img src={p.thumbnail} alt={p.name} className="w-full h-full object-cover" />}
                                  {p.duration_seconds && (
                                    <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1">
                                      <span className="font-bold">{new Date(p.duration_seconds * 1000).toISOString().slice(11, 19)}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="p-2">
                                  <div className="text-xs font-bold text-gray-900 dark:text-white truncate">{p.name}</div>
                                  <div className="flex justify-between items-center mt-1 text-[9px] text-gray-500">
                                    <span>{p.width}x{p.height}</span>
                                    <span>{p.size}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                            <button 
                              type="button" 
                              onClick={() => { setExistingProjectId(null); setIsDirty(true); }}
                              className="text-[10px] text-blue-500 hover:underline text-left font-bold"
                            >
                              Change Project
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {projects.map(p => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => { setExistingProjectId(p.id); setIsDirty(true); }}
                                className="text-left relative rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 hover:border-blue-500 transition-colors bg-white dark:bg-[#1a1d2d] focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <div className="h-20 bg-gray-100 dark:bg-black/40 relative">
                                  {p.thumbnail && <img src={p.thumbnail} alt={p.name} className="w-full h-full object-cover" />}
                                </div>
                                <div className="p-2">
                                  <div className="text-[11px] font-bold text-gray-900 dark:text-white truncate">{p.name}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        {errors.existingProjectId && <p className="text-[11px] text-red-400 mt-1">{errors.existingProjectId}</p>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Confidentiality / NDA */}
            <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02]">
              <div className="flex items-start gap-3">
                <input 
                  type="checkbox" 
                  checked={requireNDA}
                  onChange={(e) => {
                    setRequireNDA(e.target.checked);
                    setIsDirty(true);
                  }}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-transparent cursor-pointer"
                />
                <div className="flex-1">
                  <label className="text-sm font-semibold text-gray-900 dark:text-white block">
                    Require Confidentiality (NDA)
                  </label>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                    Let candidates know they cannot share any details about this project with anyone while it is in development.
                    {requireNDA && (
                      <span className={`block mt-1.5 font-medium ${portfolioUseAllowed ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-300"}`}>
                        {portfolioUseAllowed 
                          ? "✓ Since you allow Portfolio Use below, they will be permitted to share it only after the project is officially completed."
                          : "ⓘ They will not be permitted to share it even after completion unless Portfolio Use is allowed."}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Portfolio Use */}
            <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02]">
              <div className="flex items-start gap-3">
                <input 
                  type="checkbox" 
                  checked={portfolioUseAllowed}
                  onChange={(e) => {
                    setPortfolioUseAllowed(e.target.checked);
                    if (!e.target.checked) setPortfolioDuration("");
                    setIsDirty(true);
                  }}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-transparent"
                />
                <div className="flex-1">
                  <label className="text-sm font-semibold text-gray-900 dark:text-white block">
                    Allow Freelancer Portfolio Use
                  </label>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                    Agree to let the freelancer use the final project output for their personal portfolio.
                  </p>
                  {portfolioUseAllowed && (
                    <div className="mt-3">
                      <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block mb-2">
                        Allowed Duration <span className="text-red-500">*</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {["5", "10", "15", "20", "30", "45", "60"].map(secs => (
                          <button
                            key={secs}
                            type="button"
                            onClick={() => { setPortfolioDuration(secs); setIsDirty(true); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                              portfolioDuration === secs 
                                ? "bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20" 
                                : "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-300 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-100 dark:hover:bg-white/10"
                            }`}
                          >
                            {secs} secs
                          </button>
                        ))}
                      </div>
                      {errors.portfolioDuration && <p className="text-[11px] text-red-400 mt-2">{errors.portfolioDuration}</p>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex gap-2.5">
            <div className="relative group">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(true)}
                disabled={hiredCount > 0 || isSubmitting}
                className={`px-4 py-2.5 rounded-xl border border-red-500/20 text-red-400 font-bold hover:bg-red-500/10 transition text-xs focus:outline-none flex items-center gap-2 ${
                  hiredCount > 0 ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <Trash2 className="h-4 w-4" /> Delete Job
              </button>
              {hiredCount > 0 && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block w-48 bg-black text-gray-900 dark:text-white text-[10px] p-2 rounded shadow-lg border border-gray-200 dark:border-white/10 z-10 text-center pointer-events-none">
                  Cannot delete a job post that already has positions filled.
                </div>
              )}
            </div>
            <div className="flex-1 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={handleReturnTrigger}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-500 dark:text-zinc-400 font-bold hover:text-gray-900 dark:text-white transition text-xs focus:outline-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting}
                className={`w-40 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-white transition focus:outline-none shadow-lg ${isSubmitting ? 'bg-blue-500/50 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20'}`}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'} <Save className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Success Popup Feedback */}
      <CreationSuccess
        isOpen={isSuccessOpen}
        title="Successfully Edited your Post"
        message="Your changes have been saved and your job post is updated."
        onConfirm={() => navigate("/jobs")}
      />

      {/* Discard Confirmation Popup */}
      <PopupConfirmReturn
        isOpen={isDiscardOpen}
        onConfirm={() => {
          setIsDiscardOpen(false);
          navigate("/jobs");
        }}
        onCancel={() => setIsDiscardOpen(false)}
      />

      {/* Delete Confirmation Popup */}
      <PopupConfirmReturn
        isOpen={isDeleteOpen}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteOpen(false)}
        title="Delete Job Post"
        subtitle="Are you sure you want to delete this?"
        description="This job post will be permanently removed from the marketplace. This action cannot be undone."
        confirmText="Yes, Delete Job"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
};

export default JobEditPostPage;
