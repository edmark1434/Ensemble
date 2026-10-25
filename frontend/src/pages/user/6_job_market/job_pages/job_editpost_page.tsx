import React, { useState, useEffect, useRef, useMemo, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Save,
  X,
  ChevronDown,
  Check,
  Briefcase,
  Lock,
  Info,
  Trash2,
  Bold,
  Italic,
  List,
  Eye,
  EyeOff,
  Wand2,
  Upload,
  CheckCircle2,
  XCircle,
  Sparkles,
  FileCheck,
  Calendar,
  Clock,
} from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import api from "@/lib/axios";
import ShapeGrid from "@/components/ui/ShapeGrid";
import FloatingCreditsPill from "@/components/ui/FloatingCreditsPill";
import useGlobalState from "@/lib/global_state";
import { useJobs } from "@/hooks/useJobs";
import PopupConfirmReturn from "../job_components/job_popups/popup_confirm_return";
import CreationSuccess from "../job_components/job_creation_components/4_creation_success";
import { categories, difficulties } from "../job_components/job_creation_components/1_create_coreinfo";
import { CreditIcon } from "@/components/ui/credit-icon";
import { JobRichText } from "../job_components/JobRichText";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast";
import { handleRichTextPaste, autoFormatDescription } from "@/lib/markdownPaste";
import { SkillsAutocomplete } from "../job_components/job_creation_components/SkillsAutocomplete";
import {
  DEFAULT_JOB_BANNERS,
  convertPresetUrlToFile,
  getDefaultJobBannerForJob,
  type DefaultJobBanner,
} from "@/lib/defaultJobBanners";
import { getImageUrl } from "@/lib/utils";

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
      <label className="text-[11px] font-bold text-gray-800 dark:text-zinc-200 uppercase tracking-wider block">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`w-full flex items-center justify-between rounded-xl border bg-white dark:bg-dark-base/60 shadow-sm px-4 py-3 text-xs text-left transition-all cursor-pointer ${
            error
              ? "border-red-500 focus:border-red-500 ring-2 ring-red-500/20"
              : isOpen
              ? "border-blue-500 ring-2 ring-blue-500/20"
              : "border-gray-300 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/20"
          }`}
        >
          <span className={value ? "text-gray-900 dark:text-white font-semibold" : "text-gray-400 dark:text-zinc-500"}>
            {value || placeholder}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-gray-400 dark:text-zinc-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-blue-500" : ""
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
                className="absolute left-0 right-0 z-30 max-h-56 overflow-y-auto rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-1.5 shadow-2xl space-y-0.5 custom-scrollbar"
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
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                        isSelected
                          ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold"
                          : "text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                      }`}
                    >
                      <span>{opt}</span>
                      {isSelected && <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                    </button>
                  );
                })}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
      {error && <p className="text-[11px] font-medium text-red-500 mt-1">{error}</p>}
    </div>
  );
};

export const JobEditPostPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const theme = useGlobalState((state) => state.theme);
  const [isLoadingJob, setIsLoadingJob] = useState(true);

  // Form States
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState<"Beginner" | "Intermediate" | "Expert">("Intermediate");
  const [skills, setSkills] = useState<string[]>([]);

  // Thumbnail States
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedDefaultBannerId, setSelectedDefaultBannerId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

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

  // Baseline snapshot of loaded job state to accurately detect real changes
  const [initialSnapshot, setInitialSnapshot] = useState<{
    title: string;
    description: string;
    category: string;
    difficulty: string;
    skills: string[];
    previewUrl: string | null;
    portfolioUseAllowed: boolean;
    portfolioDuration: string;
    isExistingProject: boolean;
    existingProjectId: string | null;
    initiatorRole: string;
    requireNDA: boolean;
  } | null>(null);

  const hasChanges = useMemo(() => {
    if (!initialSnapshot) return isDirty;
    if (thumbnailFile !== null) return true;
    if (title.trim() !== initialSnapshot.title.trim()) return true;
    if (description.trim() !== initialSnapshot.description.trim()) return true;
    if (category !== initialSnapshot.category) return true;
    if (difficulty !== initialSnapshot.difficulty) return true;
    if (previewUrl !== initialSnapshot.previewUrl) return true;
    if (portfolioUseAllowed !== initialSnapshot.portfolioUseAllowed) return true;
    if (portfolioDuration !== initialSnapshot.portfolioDuration) return true;
    if (isExistingProject !== initialSnapshot.isExistingProject) return true;
    if (existingProjectId !== initialSnapshot.existingProjectId) return true;
    if (initiatorRole !== initialSnapshot.initiatorRole) return true;
    if (requireNDA !== initialSnapshot.requireNDA) return true;
    if (skills.length !== initialSnapshot.skills.length) return true;
    if (skills.some((s, i) => s !== initialSnapshot.skills[i])) return true;
    return false;
  }, [
    initialSnapshot,
    isDirty,
    thumbnailFile,
    title,
    description,
    category,
    difficulty,
    previewUrl,
    portfolioUseAllowed,
    portfolioDuration,
    isExistingProject,
    existingProjectId,
    initiatorRole,
    requireNDA,
    skills,
  ]);

  useEffect(() => {
    if (previewUrl) {
      const matching = DEFAULT_JOB_BANNERS.find((b) => previewUrl.endsWith(b.url));
      setSelectedDefaultBannerId(matching ? matching.id : null);
    } else {
      setSelectedDefaultBannerId(null);
    }
  }, [previewUrl]);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      try {
        let found: any = null;
        try {
          const singleRes = await api.get(`/api/jobs/${id}`);
          if (singleRes.data?.data) {
            found = singleRes.data.data;
          }
        } catch {
          // fallback to list
        }

        if (!found) {
          const data = await fetchJobs();
          found = data.find((j: any) => j.job_id === id);
        }

        if (found) {
          setTitle(found.title || "");
          setDescription(found.description || "");
          setCategory(found.category || "");
          setDifficulty(found.experience_level || "Intermediate");
          let parsedTags: string[] = [];
          if (Array.isArray(found.tags)) {
            parsedTags = found.tags;
          } else if (typeof found.tags === "string") {
            try {
              parsedTags = JSON.parse(found.tags);
            } catch {
              parsedTags = found.tags.split(",").map((s: string) => s.trim()).filter(Boolean);
            }
          }
          setSkills(parsedTags);
          const rawMin = Number(found.rate_credits_min) || 0;
          const rawMax = Number(found.rate_credits_max) || 0;
          setMinBudget(rawMin);
          setMaxBudget(rawMax);
          setPriceRange(
            rawMax <= 0
              ? `${rawMin.toLocaleString()}+ Credits (Open Bid)`
              : `${rawMin.toLocaleString()} ~ ${rawMax.toLocaleString()} Credits`
          );
          setPositionsNeeded(found.no_of_hires || 1);
          setHiredCount(parseInt(found.hired_count) || 0);
          setMinTimeline(found.timeline_min || 0);
          setMaxTimeline(found.timeline_max || 0);

          let deadlineStr = found.rough_deadline || found.deadline;
          if (deadlineStr) {
            const d = new Date(deadlineStr);
            if (!isNaN(d.getTime())) {
              deadlineStr = d.toISOString().split("T")[0];
            }
          }
          setDeadline(deadlineStr || "");

          setPortfolioUseAllowed(Boolean(found.portfolio_use_allowed));
          setPortfolioDuration(
            found.portfolio_use_duration_seconds ? found.portfolio_use_duration_seconds.toString() : ""
          );
          setIsExistingProject(Boolean(found.is_existing_project));
          setExistingProjectId(found.existing_project_id || null);
          setInitiatorRole(found.initiator_role || "Client");
          setRequireNDA(Boolean(found.require_nda));

          const resolvedThumb =
            getImageUrl(found.thumbnail_path) || getDefaultJobBannerForJob(found.job_id || id);
          setPreviewUrl(resolvedThumb);

          setInitialSnapshot({
            title: found.title || "",
            description: found.description || "",
            category: found.category || "",
            difficulty: found.experience_level || "Intermediate",
            skills: parsedTags,
            previewUrl: resolvedThumb,
            portfolioUseAllowed: Boolean(found.portfolio_use_allowed),
            portfolioDuration: found.portfolio_use_duration_seconds
              ? found.portfolio_use_duration_seconds.toString()
              : "",
            isExistingProject: Boolean(found.is_existing_project),
            existingProjectId: found.existing_project_id || null,
            initiatorRole: found.initiator_role || "Client",
            requireNDA: Boolean(found.require_nda),
          });
        }
      } catch (err) {
        console.error("Failed to load job for editing", err);
      } finally {
        setIsLoadingJob(false);
      }
    };
    loadData();
  }, [id, fetchJobs]);

  useEffect(() => {
    if (initiatorRole === "Client" && projects.length === 0) {
      const fetchUserProjects = async () => {
        try {
          setLoadingProjects(true);
          const response = await api.get("/api/projects");
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

  const clearError = (key: string) => {
    setErrors((prev) => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  // Thumbnail Handlers
  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      showErrorToast("Please upload an image file.");
      return;
    }
    const maxSizeInBytes = 20 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      showErrorToast("File exceeds the 20MB limit.");
      return;
    }
    const localUrl = URL.createObjectURL(file);
    setSelectedDefaultBannerId(null);
    setPreviewUrl(localUrl);
    setThumbnailFile(file);
    setIsDirty(true);
    clearError("thumbnail");
    setIsUploadModalOpen(false);
    showSuccessToast("Thumbnail uploaded successfully!");
  };

  const handleSelectDefaultBanner = async (banner: DefaultJobBanner) => {
    setSelectedDefaultBannerId(banner.id);
    setPreviewUrl(banner.url);
    setIsDirty(true);
    clearError("thumbnail");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (modalFileInputRef.current) modalFileInputRef.current.value = "";

    try {
      const file = await convertPresetUrlToFile(banner.url, `${banner.id}.png`);
      setThumbnailFile(file);
    } catch (err) {
      console.error("Error setting default banner file:", err);
    }
  };

  const handleRemoveThumbnail = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDefaultBannerId(null);
    setPreviewUrl(null);
    setThumbnailFile(null);
    setIsDirty(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (modalFileInputRef.current) modalFileInputRef.current.value = "";
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

  const handleReturnTrigger = () => {
    if (hasChanges) {
      setIsDiscardOpen(true);
    } else {
      navigate(-1);
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
    if (portfolioUseAllowed && !portfolioDuration) {
      stepErrors.portfolioDuration = "Please specify allowed showcase duration.";
    }
    if (isExistingProject && initiatorRole === "Client" && !existingProjectId) {
      stepErrors.existingProjectId = "Please select an existing project or uncheck the link option.";
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleSave = async () => {
    if (!hasChanges || isSubmitting) return;
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
        require_nda: requireNDA,
      };

      if (!id) throw new Error("Job ID missing");

      await updateJob(id, updatedPayload);
      setIsSuccessOpen(true);
      setIsDirty(false);
    } catch (err: any) {
      console.error(err);
      setErrors((prev) => ({ ...prev, submit: err.message || "Failed to update job post." }));
      showErrorToast(err.message || "Failed to update job post.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const insertMarkdown = (prefix: string, suffix: string = "") => {
    const textarea = descriptionRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end, text.length);

    let newText = "";
    const finalSelectionStart = start + prefix.length;
    let finalSelectionEnd = end + prefix.length + selected.length;

    if (suffix === "" && selected.includes("\n")) {
      const lines = selected.split("\n");
      const bulleted = lines.map((line) => prefix + line).join("\n");
      newText = before + bulleted + after;
      finalSelectionEnd = start + bulleted.length;
    } else {
      newText = before + prefix + selected + suffix + after;
    }

    setDescription(newText);
    setIsDirty(true);
    clearError("description");

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(finalSelectionStart, finalSelectionEnd);
    }, 0);
  };

  const handleAutoFormat = () => {
    if (!description.trim()) return;
    const formatted = autoFormatDescription(description);
    setDescription(formatted);
    setIsDirty(true);
    clearError("description");
    showSuccessToast("Formatted description with Markdown!");
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
      showErrorToast(err.message || "Failed to delete job post.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProject = projects.find((p) => p.id === existingProjectId);

  if (isLoadingJob) {
    return (
      <div className="relative w-full min-h-screen bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-white flex items-center justify-center p-6 font-['Plus_Jakarta_Sans'] overflow-hidden">
        {/* Background Grid */}
        <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
          <ShapeGrid
            shape="square"
            squareSize={48}
            direction="diagonal"
            speed={0.4}
            borderColor={theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.07)"}
            hoverFillColor={theme === "dark" ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.1)"}
            hoverTrailAmount={3}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="relative z-10 flex flex-col items-center gap-3 text-center"
        >
          <div className="w-40 h-40 flex items-center justify-center">
            <DotLottieReact
              src="/icons/lottie/loading-ensemble.lottie"
              loop
              autoplay
            />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">
              Loading Job Post Editor
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Retrieving your job listing specifications and workflow settings...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-white overflow-x-hidden pt-6 pb-12">
      {/* Floating Upper Right Credits Pill */}
      <FloatingCreditsPill />

      {/* Background Grid Animation */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
        <ShapeGrid
          shape="square"
          squareSize={48}
          direction="diagonal"
          speed={0.4}
          borderColor={theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.06)"}
          hoverFillColor={theme === "dark" ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.1)"}
          hoverTrailAmount={3}
        />
      </div>

      {/* Main Content Container matching Job Creation Full Width */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 mx-auto max-w-6xl 2xl:max-w-7xl px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6"
      >
        {/* Top Page Title & Return Header (Matched to Job Creation Layout so Return stays on left away from upper-right Credits Pill) */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="space-y-4"
        >
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              Editing Job Post
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-1">
              Update your job post specifications, required skills, and collaboration workflow terms.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleReturnTrigger}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gray-100 dark:bg-zinc-800/80 hover:bg-gray-200 dark:hover:bg-zinc-700/80 border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white transition shrink-0 focus:outline-none cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Return</span>
            </button>

            {hasChanges && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                Unsaved changes
              </span>
            )}
          </div>
        </motion.div>

        {/* Main Studio Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 sm:p-8 lg:p-10 backdrop-blur-xl shadow-2xl space-y-8 text-left"
        >
          {/* 2-Column Studio Grid matching Job Creation */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT COLUMN: Title, Markdown Description, Skills, and Workflow & Terms (8 cols) */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
              {/* Section Heading */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                  Job Core Specifications
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-1">
                  Modify the title, detailed deliverables scope, and required skill tags for applicants.
                </p>
              </div>

              {/* Job Title */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-gray-800 dark:text-zinc-200 uppercase tracking-wider">
                    Job Post Title <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] font-mono text-gray-400 dark:text-zinc-500">
                    {title.length}/300
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={300}
                  placeholder="e.g., Cinematic Wedding Video Edit - Color Grading & Sound Design"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setIsDirty(true);
                    if (e.target.value.trim()) clearError("title");
                  }}
                  className={`w-full rounded-xl border bg-white dark:bg-dark-base/60 shadow-sm px-4 py-3 text-sm text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-500 font-medium ${
                    errors.title
                      ? "border-red-500 focus:border-red-500 ring-2 ring-red-500/20"
                      : "border-gray-300 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  }`}
                />
                {errors.title && <p className="text-[11px] font-medium text-red-500 mt-1">{errors.title}</p>}
              </div>

              {/* Spacious Markdown Description Editor */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap justify-between items-center gap-2 mb-1">
                  <label className="text-[11px] font-bold text-gray-800 dark:text-zinc-200 uppercase tracking-wider">
                    Job Post Description <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] font-mono text-gray-400 dark:text-zinc-500">
                    {description.length}/2000
                  </span>
                </div>

                <div
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    errors.description
                      ? "border-red-500 ring-2 ring-red-500/20"
                      : "border-gray-300 dark:border-white/10 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20"
                  }`}
                >
                  {/* Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-gray-50 dark:bg-white/[0.03] border-b border-gray-200 dark:border-white/10 select-none">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => insertMarkdown("**", "**")}
                        className="p-1.5 rounded-lg hover:bg-gray-200/80 dark:hover:bg-white/10 text-gray-700 dark:text-zinc-300 transition-colors cursor-pointer"
                        title="Bold (**text**)"
                        disabled={isPreviewMode}
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertMarkdown("*", "*")}
                        className="p-1.5 rounded-lg hover:bg-gray-200/80 dark:hover:bg-white/10 text-gray-700 dark:text-zinc-300 transition-colors cursor-pointer"
                        title="Italic (*text*)"
                        disabled={isPreviewMode}
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertMarkdown("- ")}
                        className="p-1.5 rounded-lg hover:bg-gray-200/80 dark:hover:bg-white/10 text-gray-700 dark:text-zinc-300 transition-colors cursor-pointer"
                        title="Bullet List (- item)"
                        disabled={isPreviewMode}
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                      <div className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-1" />
                      <button
                        type="button"
                        onClick={handleAutoFormat}
                        className="p-1.5 rounded-lg hover:bg-gray-200/80 dark:hover:bg-white/10 text-gray-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                        title="Auto-format pasted text into clean Markdown headers and bullets"
                        disabled={isPreviewMode || !description.trim()}
                      >
                        <Wand2 className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-[11px] hidden sm:inline">Format with Markdown</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsPreviewMode(!isPreviewMode)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          isPreviewMode
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-white dark:bg-white/10 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-white/15 border border-gray-200 dark:border-white/10"
                        }`}
                        title="Toggle Preview / Edit Mode"
                      >
                        {isPreviewMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{isPreviewMode ? "Edit Mode" : "Preview"}</span>
                      </button>
                    </div>
                  </div>

                  {isPreviewMode ? (
                    <div className="w-full min-h-[280px] md:min-h-[320px] bg-gray-50/50 dark:bg-black/30 p-6 text-sm overflow-y-auto custom-scrollbar">
                      <div className="max-w-none">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 pb-3 mb-3 border-b border-gray-200 dark:border-white/10 select-none">
                          <FileCheck className="w-3.5 h-3.5 text-blue-500" />
                          <span>Document Preview &bull; How applicants will see your scope</span>
                        </div>
                        {description ? (
                          <JobRichText
                            content={description}
                            className="text-gray-800 dark:text-zinc-200 font-normal leading-relaxed text-sm"
                          />
                        ) : (
                          <span className="text-gray-400 dark:text-zinc-500 italic text-xs">
                            No description entered yet. Switch to Edit Mode to describe deliverables, footage formats, and pacing.
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <textarea
                      ref={descriptionRef}
                      rows={12}
                      maxLength={2000}
                      placeholder="Outline requirements, raw footage details, deliverables..."
                      value={description}
                      onPaste={(e) => {
                        const handled = handleRichTextPaste(e, description, setDescription, 2000);
                        if (handled) {
                          setIsDirty(true);
                          clearError("description");
                        }
                      }}
                      onChange={(e) => {
                        setDescription(e.target.value);
                        setIsDirty(true);
                        if (e.target.value.trim()) clearError("description");
                      }}
                      className="w-full min-h-[280px] md:min-h-[320px] bg-white dark:bg-dark-base/60 p-4 md:p-5 text-sm text-gray-900 dark:text-white outline-none leading-relaxed resize-y custom-scrollbar font-normal placeholder:text-gray-400 dark:placeholder:text-zinc-500"
                    />
                  )}
                </div>
                {errors.description && <p className="text-[11px] font-medium text-red-500 mt-1">{errors.description}</p>}
              </div>

              {/* Required Skills Management */}
              <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-5">
                <SkillsAutocomplete
                  skills={skills}
                  setSkills={(updater) => {
                    setSkills(updater);
                    setIsDirty(true);
                    clearError("skills");
                  }}
                  error={errors.skills}
                  maxSkills={6}
                />
              </div>

              {/* Workflow & Terms Configuration */}
              <div className="space-y-4 pt-2">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                    Workflow & Terms
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
                    Set the rules for the final output, project initiation, and confidentiality agreements.
                  </p>
                </div>

                {/* 1. Initiator Role */}
                <div className="p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-xs">
                  <label className="text-sm font-bold text-gray-900 dark:text-white block mb-0.5">
                    Who will initiate the creation of the video project?
                  </label>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mb-4">
                    If this is a new collaboration, who is responsible for initiating and inviting the other party?
                  </p>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="initiatorRole"
                        value="Client"
                        checked={initiatorRole === "Client"}
                        onChange={(e) => {
                          setInitiatorRole(e.target.value);
                          setIsDirty(true);
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-white/20 bg-transparent cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-gray-800 dark:text-zinc-200">Me (Client)</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer">
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
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-white/20 bg-transparent cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-gray-800 dark:text-zinc-200">The Freelancer</span>
                    </label>
                  </div>
                </div>

                {/* 2. Confidentiality / NDA */}
                <div className="p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-xs">
                  <div className="flex items-start gap-3.5">
                    <input
                      type="checkbox"
                      checked={requireNDA}
                      onChange={(e) => {
                        setRequireNDA(e.target.checked);
                        setIsDirty(true);
                      }}
                      className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-white/20 text-blue-600 focus:ring-blue-500 bg-transparent cursor-pointer"
                    />
                    <div className="flex-1">
                      <label
                        className="text-sm font-bold text-gray-900 dark:text-white block cursor-pointer"
                        onClick={() => {
                          setRequireNDA(!requireNDA);
                          setIsDirty(true);
                        }}
                      >
                        Require Confidentiality (NDA)
                      </label>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                        Let candidates know they cannot share any details about this project with anyone while it is in active development.
                        {requireNDA && (
                          <span
                            className={`block mt-2 font-medium ${
                              portfolioUseAllowed ? "text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {portfolioUseAllowed
                              ? "✓ Since you allow Portfolio Use below, they will be permitted to showcase approved clips only after the project is officially completed."
                              : "ⓘ They will not be permitted to share the footage or finished edit even after completion unless Portfolio Use is explicitly allowed."}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Portfolio Use */}
                <div className="p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-xs">
                  <div className="flex items-start gap-3.5">
                    <input
                      type="checkbox"
                      checked={portfolioUseAllowed}
                      onChange={(e) => {
                        setPortfolioUseAllowed(e.target.checked);
                        if (!e.target.checked) setPortfolioDuration("");
                        setIsDirty(true);
                      }}
                      className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-white/20 text-blue-600 focus:ring-blue-500 bg-transparent cursor-pointer"
                    />
                    <div className="flex-1">
                      <label
                        className="text-sm font-bold text-gray-900 dark:text-white block cursor-pointer"
                        onClick={() => {
                          const nextVal = !portfolioUseAllowed;
                          setPortfolioUseAllowed(nextVal);
                          if (!nextVal) setPortfolioDuration("");
                          setIsDirty(true);
                        }}
                      >
                        Allow Freelancer Portfolio Use
                      </label>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                        Agree to let the freelancer showcase the final project cut in their personal portfolio reel.
                      </p>
                      {portfolioUseAllowed && (
                        <div className="mt-3.5 pt-3 border-t border-gray-100 dark:border-white/5">
                          <label className="text-[11px] font-bold text-gray-800 dark:text-zinc-200 uppercase tracking-wider block mb-2">
                            Allowed Showcase Duration <span className="text-red-500">*</span>
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {["5", "10", "15", "20", "30", "45", "60"].map((secs) => (
                              <button
                                key={secs}
                                type="button"
                                onClick={() => {
                                  setPortfolioDuration(secs);
                                  setIsDirty(true);
                                  clearError("portfolioDuration");
                                }}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                                  portfolioDuration === secs
                                    ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                                    : "bg-gray-50 dark:bg-white/5 border-gray-300 dark:border-white/10 text-gray-700 dark:text-zinc-300 hover:border-gray-400 dark:hover:border-white/20 hover:bg-gray-100 dark:hover:bg-white/10"
                                }`}
                              >
                                {secs} secs
                              </button>
                            ))}
                          </div>
                          {errors.portfolioDuration && (
                            <p className="text-[11px] font-medium text-red-500 mt-2">{errors.portfolioDuration}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. Existing Project Link */}
                {initiatorRole === "Client" && (
                  <div className="p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-xs">
                    <div className="flex items-start gap-3.5">
                      <input
                        type="checkbox"
                        checked={isExistingProject}
                        onChange={(e) => {
                          setIsExistingProject(e.target.checked);
                          if (!e.target.checked) setExistingProjectId(null);
                          setIsDirty(true);
                        }}
                        className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-white/20 text-blue-600 focus:ring-blue-500 bg-transparent cursor-pointer"
                      />
                      <div className="flex-1">
                        <label
                          className="text-sm font-bold text-gray-900 dark:text-white block cursor-pointer"
                          onClick={() => {
                            const nextVal = !isExistingProject;
                            setIsExistingProject(nextVal);
                            if (!nextVal) setExistingProjectId(null);
                            setIsDirty(true);
                          }}
                        >
                          Link to Existing Project
                        </label>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                          Is this job part of an existing Ensemble project?
                        </p>
                        {isExistingProject && (
                          <div className="mt-3.5 pt-3 border-t border-gray-100 dark:border-white/5">
                            <label className="text-[11px] font-bold text-gray-800 dark:text-zinc-200 uppercase tracking-wider block mb-2">
                              Select Project <span className="text-red-500">*</span>
                            </label>
                            {loadingProjects ? (
                              <div className="text-xs text-gray-500">Loading projects...</div>
                            ) : existingProjectId ? (
                              <div className="flex flex-col gap-2">
                                {projects
                                  .filter((p) => p.id === existingProjectId)
                                  .map((p) => (
                                    <div
                                      key={p.id}
                                      className="relative w-56 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1d2d] shadow-sm"
                                    >
                                      <div className="h-28 bg-gray-100 dark:bg-black/40 relative">
                                        {p.thumbnail && (
                                          <img src={p.thumbnail} alt={p.name} className="w-full h-full object-cover" />
                                        )}
                                        {p.duration_seconds && (
                                          <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1">
                                            <span className="font-bold">
                                              {new Date(p.duration_seconds * 1000).toISOString().slice(11, 19)}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                      <div className="p-2.5">
                                        <div className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                          {p.name}
                                        </div>
                                        <div className="flex justify-between items-center mt-1 text-[10px] text-gray-500">
                                          <span>
                                            {p.width}x{p.height}
                                          </span>
                                          <span>{p.size}</span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExistingProjectId(null);
                                    setIsDirty(true);
                                  }}
                                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline text-left font-bold cursor-pointer"
                                >
                                  Change Project
                                </button>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {projects.map((p) => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => {
                                      setExistingProjectId(p.id);
                                      setIsDirty(true);
                                      clearError("existingProjectId");
                                    }}
                                    className="text-left relative rounded-xl overflow-hidden border border-gray-300 dark:border-white/10 hover:border-blue-500 transition-colors bg-white dark:bg-[#1a1d2d] focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                  >
                                    <div className="h-20 bg-gray-100 dark:bg-black/40 relative">
                                      {p.thumbnail && (
                                        <img src={p.thumbnail} alt={p.name} className="w-full h-full object-cover" />
                                      )}
                                    </div>
                                    <div className="p-2">
                                      <div className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                        {p.name}
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                            {errors.existingProjectId && (
                              <p className="text-[11px] font-medium text-red-500 mt-1">{errors.existingProjectId}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Sticky Studio Sidebar (4 cols) */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-6">
              {/* 1. Locked Baseline Parameters Card */}
              <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.02] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-gray-500 dark:text-zinc-400 shrink-0" />
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                      Locked Baseline Terms
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-gray-200/70 dark:bg-white/10 text-[10px] font-bold text-gray-600 dark:text-zinc-300">
                    Read-Only
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-dark-base/60 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-zinc-500 flex items-center gap-1">
                      <CreditIcon className="h-3 w-3 text-amber-500" />
                      Budget
                    </span>
                    <div className="font-bold text-gray-900 dark:text-white truncate text-xs">
                      {priceRange}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-dark-base/60 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-zinc-500 flex items-center gap-1">
                      <Briefcase className="h-3 w-3 text-blue-500" />
                      Positions
                    </span>
                    <div className="font-bold text-gray-900 dark:text-white text-xs">
                      {positionsNeeded} {positionsNeeded === 1 ? "Slot" : "Slots"}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-dark-base/60 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-zinc-500 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-purple-500" />
                      Timeline
                    </span>
                    <div className="font-bold text-gray-900 dark:text-white text-xs">
                      {minTimeline} - {maxTimeline} Days
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-dark-base/60 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-zinc-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-rose-500" />
                      Deadline
                    </span>
                    <div className="font-bold text-gray-900 dark:text-white text-xs">
                      {deadline || "Flexible"}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 pt-1 border-t border-gray-200/60 dark:border-white/5 text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed">
                  <Info className="h-3.5 w-3.5 text-gray-400 dark:text-zinc-500 shrink-0 mt-0.5" />
                  <span>
                    Budget, timeline, and deadlines are locked after publication to protect active applicants and proposals.
                  </span>
                </div>
              </div>

              {/* 2. Job Thumbnail Card (16:9 Studio Preview + Default Presets) */}
              <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[11px] font-bold text-gray-800 dark:text-zinc-200 uppercase tracking-wider block">
                      Job Thumbnail <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-gray-400 dark:text-zinc-500">
                      Select a default banner or upload
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 border border-gray-200 dark:border-zinc-700 transition cursor-pointer shadow-2xs active:scale-95"
                  >
                    <Upload className="h-3.5 w-3.5 text-gray-500 dark:text-zinc-400" />
                    <span>Upload</span>
                  </button>
                </div>

                {/* Main 16:9 Preview Box */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => {
                    if (!previewUrl) {
                      setIsUploadModalOpen(true);
                    }
                  }}
                  className={`relative w-full aspect-[16/9] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all duration-200 overflow-hidden group ${
                    isDragging
                      ? "border-blue-500 bg-blue-500/10 cursor-pointer"
                      : previewUrl
                      ? "border-gray-200 dark:border-white/10 bg-black/5 dark:bg-white/5"
                      : "border-gray-300 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.02] hover:border-gray-400 dark:hover:border-white/20 cursor-pointer"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />

                  {previewUrl ? (
                    <>
                      <img
                        src={previewUrl}
                        alt="Thumbnail preview"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />

                      <div className="absolute top-2.5 left-2.5 pointer-events-none">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-black/60 text-white backdrop-blur-md shadow-xs">
                          {selectedDefaultBannerId ? (
                            <span>Preset Job Banner</span>
                          ) : (
                            <>
                              <Upload className="h-2.5 w-2.5 text-emerald-400" />
                              <span>Custom Upload</span>
                            </>
                          )}
                        </span>
                      </div>

                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2.5 p-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsUploadModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-sm transition cursor-pointer"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          <span>Upload</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveThumbnail}
                          className="px-3 py-1.5 rounded-xl bg-red-500/80 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-sm transition cursor-pointer"
                          title="Remove banner"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center text-center p-6 pointer-events-none space-y-2.5">
                      <div className="h-12 w-12 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-zinc-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Upload className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white">
                          Click to upload or choose a default banner below
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                          16:9 recommended &bull; JPEG, PNG, WEBP (Max 20MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Default Banners Selector Row */}
                <div className="space-y-2 pt-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">
                      Default Banners
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-zinc-500">
                      {selectedDefaultBannerId ? "Selected" : "Click to select"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {DEFAULT_JOB_BANNERS.map((banner, idx) => {
                      const isSelected = selectedDefaultBannerId === banner.id || previewUrl === banner.url;
                      return (
                        <button
                          key={banner.id}
                          type="button"
                          onClick={() => handleSelectDefaultBanner(banner)}
                          className={`group relative aspect-[16/9] rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                            isSelected
                              ? "border-blue-600 ring-2 ring-blue-500/30 shadow-sm"
                              : "border-gray-200 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/30 opacity-70 hover:opacity-100"
                          }`}
                          title={`Select Banner ${String(idx + 1).padStart(2, "0")}`}
                        >
                          <img
                            src={banner.url}
                            alt={`Banner ${String(idx + 1).padStart(2, "0")}`}
                            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-blue-600/25 flex items-center justify-center backdrop-blur-[0.5px]">
                              <div className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
                                <Check className="h-3 w-3 stroke-[3]" />
                              </div>
                            </div>
                          )}
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/60 text-white backdrop-blur-xs select-none">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {errors.thumbnail && <p className="text-[11px] font-medium text-red-500">{errors.thumbnail}</p>}
              </div>

              {/* 3. Classification Card */}
              <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-5 space-y-4">
                <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Classification
                </h3>

                <CustomDropdown
                  label="Job Category"
                  value={category}
                  options={categories}
                  placeholder="Select Category"
                  error={errors.category}
                  onSelect={(val) => {
                    setCategory(val);
                    setIsDirty(true);
                    clearError("category");
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
                    clearError("difficulty");
                  }}
                />
              </div>

              {/* 4. Live Workflow & Terms Preview Card */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-gray-500 dark:text-zinc-400" />
                    Workflow & Terms
                  </h4>
                  <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                    <Eye className="h-3 w-3" /> Live Job Post Preview
                  </span>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] space-y-4 shadow-xs">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0 text-gray-400 dark:text-zinc-500">
                      {initiatorRole === "Client" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400 dark:text-zinc-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">Client initiates the project?</p>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                        {initiatorRole === "Client"
                          ? "Yes, the client will create the project upon hiring."
                          : "No, the freelancer is expected to create the project."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0 text-gray-400 dark:text-zinc-500">
                      {isExistingProject && existingProjectId ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400 dark:text-zinc-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">Client linked an existing project?</p>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                        {isExistingProject && existingProjectId
                          ? selectedProject
                            ? `Yes, linked to "${selectedProject.name}".`
                            : "Yes, a project is already prepared for this job."
                          : "No, a project has not been linked yet."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0 text-gray-400 dark:text-zinc-500">
                      {requireNDA ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400 dark:text-zinc-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">Require Confidentiality (NDA)?</p>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                        {requireNDA
                          ? "Yes, freelancers cannot share details about this project during development."
                          : "No, a strict confidentiality agreement is not required."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0 text-gray-400 dark:text-zinc-500">
                      {portfolioUseAllowed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400 dark:text-zinc-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">Allow Portfolio Use?</p>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                        {portfolioUseAllowed
                          ? `Yes, allowed to use output for portfolio (Up to ${portfolioDuration || "45"} secs).`
                          : "No, not allowed to use final output for personal portfolio."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.01] text-[11px] text-gray-500 dark:text-zinc-400 flex items-start gap-2.5">
                  <Sparkles className="h-4 w-4 text-zinc-400 dark:text-zinc-500 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">
                    <strong>Marketplace Transparency:</strong> This preview reflects how candidates see your terms before applying.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* FULL-WIDTH ACTION FOOTER */}
          <div className="pt-6 border-t border-gray-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative group self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(true)}
                disabled={hiredCount > 0 || isSubmitting}
                className={`px-5 py-3 rounded-xl border border-red-500/25 text-red-500 dark:text-red-400 font-bold hover:bg-red-500/10 transition text-xs sm:text-sm focus:outline-none flex items-center gap-2 ${
                  hiredCount > 0 ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                <Trash2 className="h-4 w-4" /> Delete Job Post
              </button>
              {hiredCount > 0 && (
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-56 bg-zinc-900 text-white text-[11px] p-2.5 rounded-xl shadow-xl border border-white/10 z-10 pointer-events-none">
                  Cannot delete a job post that already has positions filled.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleReturnTrigger}
                className="px-6 py-3 rounded-xl border border-gray-300 dark:border-white/10 text-gray-700 dark:text-zinc-300 font-bold hover:bg-gray-100 dark:hover:bg-white/5 transition text-xs sm:text-sm focus:outline-none shadow-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!hasChanges || isSubmitting}
                title={!hasChanges ? "Make a change to your job post before saving" : "Save updated job post"}
                className={`min-w-[190px] px-7 py-3 flex items-center justify-center gap-2 rounded-xl text-xs sm:text-sm font-bold transition focus:outline-none ${
                  !hasChanges || isSubmitting
                    ? "bg-gray-100 dark:bg-zinc-800/80 text-gray-400 dark:text-zinc-500 border border-gray-200 dark:border-zinc-700/60 cursor-not-allowed opacity-75 shadow-none"
                    : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 active:scale-[0.99] cursor-pointer"
                }`}
              >
                <Save className="h-4 w-4" />
                <span>{isSubmitting ? "Saving Changes..." : !hasChanges ? "No Changes to Save" : "Save Changes"}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Upload Thumbnail Popup Modal (Portaled) */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isUploadModalOpen && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsUploadModalOpen(false)}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                />

                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 12 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-2xl overflow-hidden z-10 flex flex-col"
                >
                  <div className="px-6 py-4.5 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-zinc-700">
                        <Upload className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                          Upload Job Thumbnail
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                          Drag and drop your thumbnail image or browse files.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsUploadModalOpen(false)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                      title="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="p-6">
                    <input
                      type="file"
                      ref={modalFileInputRef}
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          processFile(e.target.files[0]);
                        }
                      }}
                      accept="image/*"
                      className="hidden"
                    />

                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                          processFile(e.dataTransfer.files[0]);
                        }
                      }}
                      onClick={() => modalFileInputRef.current?.click()}
                      className={`w-full aspect-[16/9] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-200 group ${
                        isDragging
                          ? "border-blue-500 bg-blue-500/10 scale-[1.01]"
                          : "border-gray-300 dark:border-zinc-700 bg-gray-50/60 dark:bg-zinc-800/40 hover:border-blue-500 hover:bg-blue-50/20 dark:hover:bg-blue-500/5"
                      }`}
                    >
                      <div className="h-14 w-14 rounded-2xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs mb-3 group-hover:scale-110 transition-transform">
                        <Upload className="h-7 w-7" />
                      </div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        Click to upload or drag image here
                      </p>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 max-w-xs">
                        Supports JPEG, PNG, WEBP up to 20MB. Recommended ratio is 16:9 for optimal discovery display.
                      </p>
                    </div>
                  </div>

                  <div className="px-6 py-3.5 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/40 dark:bg-zinc-900/40 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsUploadModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-xs font-bold hover:bg-gray-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

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

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(150,150,150,0.25); border-radius: 2px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
};

export default JobEditPostPage;
