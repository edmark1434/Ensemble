import React, { useRef, useState, useEffect, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight, Image as ImageIcon, X, ChevronDown, Check, Bold, Italic, List, Eye, EyeOff,
  Sparkles, Clock, RefreshCw, Loader2, GraduationCap, Gamepad2, Smartphone, Compass,
  PartyPopper, Dumbbell, Heart, Mic, Package, Clapperboard, Video, Wand2, FileCheck,
  Upload, Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast";
import { SkillsAutocomplete } from "../../../6_job_market/job_components/job_creation_components/SkillsAutocomplete";
import { JobRichText } from "../../../6_job_market/job_components/JobRichText";
import { handleRichTextPaste, autoFormatDescription } from "@/lib/markdownPaste";
import { DEFAULT_GIG_BANNERS, type DefaultGigBanner, convertGigPresetUrlToFile } from "@/lib/defaultGigBanners";
import api from "@/lib/axios";

export const categories = [
  "Ads & Social",
  "Youtube Videos",
  "Tiktoks",
  "Design",
  "Corporate Videos",
  "Gaming Videos",
  "Family & Travel",
  "Music Videos",
  "Wedding",
  "Events",
  "Explainer Videos",
  "Showreels",
  "Fiction Films",
  "Movie Trailers",
  "Podcast",
  "Sports Video",
  "Montages",
  "Anime Edits",
  "Short Drama",
  "Tutorial Videos",
  "Teaser Videos",
  "Animation",
  "Presentation",
  "Cinematic",
  "Other"
];

const AI_INSPIRATIONS_ROW_1 = [
  {
    icon: GraduationCap,
    label: "School project video",
    prompt: "I provide editing for school presentations and student films with raw phone footage and voiceover, smooth cuts, clean title cards, gentle background music, and subtitle captions."
  },
  {
    icon: Gamepad2,
    label: "Gaming montage",
    prompt: "High-energy gaming montage editing from gameplay clips. Syncing kills to music beats, adding speed ramping, impact sound effects, and clean color grading."
  },
  {
    icon: Smartphone,
    label: "TikTok / Reels edit",
    prompt: "Fast-paced viral vertical TikTok and Reels video editing. Beat-synced cuts, dynamic zoom-ins, punchy animated captions, sound design, and sound effects."
  },
  {
    icon: Compass,
    label: "Travel vlog recap",
    prompt: "Turning raw vacation clips from phone and camera into an aesthetic 3-minute travel vlog with smooth transitions and warm cinematic color grading."
  },
  {
    icon: Sparkles,
    label: "Anime AMV & Beat-synced cuts",
    prompt: "60-second anime edit with fast flow transitions, beat synchronization, creative typography overlays, velocity ramps, and sound effects."
  },
  {
    icon: PartyPopper,
    label: "Birthday party highlight",
    prompt: "Compiling phone videos and photos from celebrations into a memorable 2-minute recap reel with heartwarming background music."
  },
];

const AI_INSPIRATIONS_ROW_2 = [
  {
    icon: Video,
    label: "YouTube sit-down vlog",
    prompt: "Editing 10-minute YouTube sit-down videos. Removing dead air and pauses, adding B-roll popups, chapter text, motion graphics, and sound effects."
  },
  {
    icon: Dumbbell,
    label: "Gym workout montage",
    prompt: "High-intensity gym workout reel for Instagram. Heavy bass beat sync, aggressive speed ramps, dark contrast grading, and sound effects."
  },
  {
    icon: Heart,
    label: "Wedding ceremony recap",
    prompt: "Romantic cinematic highlight video from multi-cam wedding footage with audio vows sync, slow-motion shots, and soft color grading."
  },
  {
    icon: Mic,
    label: "Podcast viral clips",
    prompt: "Cutting 3 viral vertical clips from podcast episodes with Alex Hormozi style animated captions, emojis, and sound effects."
  },
  {
    icon: Package,
    label: "Product unboxing video",
    prompt: "Clean product unboxing edit with smooth macro shots, zoom cuts, text callouts for tech specifications, and crisp ambient audio."
  },
  {
    icon: Clapperboard,
    label: "Short film rough cut",
    prompt: "Assembling indie short film scenes matching multi-angle dialogue coverage, narrative pacing, atmospheric audio ambience, and basic color correction."
  },
];

interface CreateCoreInfoProps {
  title: string;
  setTitle: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  category: string;
  setCategory: (val: string) => void;
  skills: string[];
  setSkills: React.Dispatch<React.SetStateAction<string[]>>;
  previewUrl: string | null;
  setPreviewUrl: (val: string | null) => void;
  setThumbnailFile?: (file: File | null) => void;
  isDragging: boolean;
  setIsDragging: (val: boolean) => void;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  postingAs?: "self" | "team";
  onNext: () => void;
  onBack?: () => void;
  onDiscard: () => void;
}

const CustomDropdown: React.FC<{
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  error?: string;
  onSelect: (val: string) => void;
}> = ({ label, value, options, placeholder, error, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-1.5 relative">
      <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between rounded-xl border bg-white dark:bg-white/5 shadow-xs px-3.5 py-2.5 text-xs transition-all ${
            error ? "border-red-500/50" : isOpen ? "border-blue-500/50" : "border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
          }`}
        >
          <span className={value ? "text-gray-900 dark:text-white font-medium" : "text-gray-500 dark:text-zinc-400"}>
            {value || placeholder}
          </span>
          <ChevronDown className={`h-3.5 w-3.5 text-gray-600 dark:text-zinc-300 transition-transform ${isOpen ? "rotate-180" : ""}`} />
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
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                        isSelected
                          ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold"
                          : "text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                      }`}
                    >
                      <span>{opt}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />}
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

export const CreateCoreInfo: React.FC<CreateCoreInfoProps> = ({
  title,
  setTitle,
  description,
  setDescription,
  category,
  setCategory,
  skills,
  setSkills,
  previewUrl,
  setPreviewUrl,
  setThumbnailFile,
  isDragging,
  setIsDragging,
  errors,
  setErrors,
  postingAs = "self",
  onNext,
  onBack,
  onDiscard,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [selectedDefaultBannerId, setSelectedDefaultBannerId] = useState<string | null>(null);

  // Joed AI Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // 3-Minute Cooldown Timer
  const [aiCooldownLeft, setAiCooldownLeft] = useState<number>(0);
  const COOLDOWN_KEY = "ensemble_joed_gig_cooldown";

  useEffect(() => {
    const stored = localStorage.getItem(COOLDOWN_KEY);
    if (stored) {
      const expiry = parseInt(stored, 10);
      const remaining = Math.max(0, Math.ceil((expiry - Date.now()) / 1000));
      setAiCooldownLeft(remaining);
    }
  }, []);

  useEffect(() => {
    if (aiCooldownLeft <= 0) return;
    const interval = setInterval(() => {
      setAiCooldownLeft((prev) => {
        if (prev <= 1) {
          localStorage.removeItem(COOLDOWN_KEY);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [aiCooldownLeft]);

  const aiPromptWordCount = aiPrompt.trim().split(/\s+/).filter(Boolean).length;
  const isGenerateDisabled = isGeneratingAi || aiPromptWordCount < 3 || aiCooldownLeft > 0;

  const handleGenerateWithJoed = async () => {
    if (isGenerateDisabled) return;
    setIsGeneratingAi(true);
    setAiError(null);
    try {
      const res = await api.post("/api/chat/generate-gig", {
        prompt: aiPrompt.trim(),
        isTeam: postingAs === "team",
      });
      const draft = res.data?.data;
      if (draft) {
        if (draft.title) {
          setTitle(String(draft.title).slice(0, 80));
          clearError("title");
        }
        if (draft.description) {
          setDescription(String(draft.description).slice(0, 2000));
          clearError("description");
        }
        if (draft.category && categories.includes(draft.category)) {
          setCategory(draft.category);
          clearError("category");
        }
        if (Array.isArray(draft.skills) && draft.skills.length > 0) {
          setSkills(draft.skills.slice(0, 8));
          clearError("skills");
        }
      }
      setIsAiModalOpen(false);
      // 3 minutes cooldown (180s)
      const expiry = Date.now() + 180 * 1000;
      localStorage.setItem(COOLDOWN_KEY, String(expiry));
      setAiCooldownLeft(180);
      showSuccessToast("Joed AI generated your service specifications!");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Joed AI could not generate the service details right now. Please try again.";
      setAiError(msg);
      showErrorToast(msg);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills((prev) => prev.filter((s) => s !== skillToRemove));
  };

  const handleSelectDefaultBanner = async (banner: DefaultGigBanner) => {
    setSelectedDefaultBannerId(banner.id);
    setPreviewUrl(banner.url);
    clearError("thumbnail");
    if (setThumbnailFile) {
      try {
        const file = await convertGigPresetUrlToFile(banner.url, `${banner.id}.png`);
        setThumbnailFile(file);
      } catch (e) {
        console.warn("Could not convert preset banner to file:", e);
      }
    }
  };

  const handleRemoveThumbnail = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewUrl(null);
    setSelectedDefaultBannerId(null);
    if (setThumbnailFile) setThumbnailFile(null);
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
    let finalSelectionStart = start + prefix.length;
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
    clearError("description");
    showSuccessToast("Formatted description with Markdown!");
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      showErrorToast("Please upload an image file.");
      return;
    }
    const maxSizeInBytes = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSizeInBytes) {
      showErrorToast("File exceeds the 20MB limit.");
      return;
    }
    setSelectedDefaultBannerId(null);
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    if (setThumbnailFile) setThumbnailFile(file);
    clearError("thumbnail");
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

  const clearError = (key: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[key];
      return newErrors;
    });
  };

  // Joed AI Generation
  const handleGenerateWithAi = async () => {
    if (isGenerateDisabled) return;
    setIsGeneratingAi(true);
    setAiError(null);

    try {
      const res = await api.post("/api/chat/generate-gig", {
        prompt: aiPrompt.trim(),
        isTeam: postingAs === "team",
      });

      if (res.data?.success && res.data?.data) {
        const { title: newTitle, description: newDesc, category: newCat, skills: newSkills } = res.data.data;
        if (newTitle) setTitle(newTitle);
        if (newDesc) setDescription(newDesc);
        if (newCat) setCategory(newCat);
        if (Array.isArray(newSkills) && newSkills.length > 0) {
          setSkills((prev) => Array.from(new Set([...prev, ...newSkills])));
        }

        // Set 3-minute cooldown (180 seconds)
        const expiry = Date.now() + 180 * 1000;
        localStorage.setItem(COOLDOWN_KEY, String(expiry));
        setAiCooldownLeft(180);

        setIsAiModalOpen(false);
        showSuccessToast("Service specifications generated by Joed AI!");
      } else {
        setAiError(res.data?.message || "Failed to generate service details.");
      }
    } catch (err: any) {
      console.error("Joed AI generation error:", err);
      setAiError(err.response?.data?.message || "Joed AI is currently unavailable. Please try again.");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <div className="space-y-6 text-left font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Column (Main Specs): 7 cols on lg, 8 cols on xl - adjusts height with right rail */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col space-y-5">
          {/* Step Header */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
              Service Core Specifications
            </h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
              Define your service offering title, classification, applied skills, and descriptive scope.
            </p>
          </div>

          {/* Service Title */}
          <div className="space-y-1.5 shrink-0">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-gray-800 dark:text-zinc-200 uppercase tracking-wider">
                Service Title <span className="text-red-500">*</span>
              </label>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAiModalOpen(true)}
                  disabled={aiCooldownLeft > 0}
                  className={`relative overflow-hidden inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all shadow-xs active:scale-95 cursor-pointer ${
                    aiCooldownLeft > 0
                      ? "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 border border-gray-200 dark:border-zinc-700 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/40 shadow-blue-500/20 ring-1 ring-white/20 hover:shadow-md hover:shadow-blue-500/30"
                  }`}
                  title={aiCooldownLeft > 0 ? `Joed AI on cooldown (${Math.floor(aiCooldownLeft / 60)}:${String(aiCooldownLeft % 60).padStart(2, "0")})` : "Generate Service Title & Description with Joed AI"}
                >
                  {aiCooldownLeft === 0 && (
                    <span className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none animate-shine-gleam" />
                  )}
                  {aiCooldownLeft > 0 ? (
                    <>
                      <Clock className="h-3 w-3 animate-spin text-gray-400 dark:text-zinc-500 shrink-0" />
                      <span>Cooldown ({Math.floor(aiCooldownLeft / 60)}:{String(aiCooldownLeft % 60).padStart(2, "0")})</span>
                    </>
                  ) : (
                    <>
                      <img src="/ensemble_lg.svg" alt="Ensemble" className="h-3.5 w-3.5 shrink-0 rounded-xs" />
                      <span>Generate with Joed AI!</span>
                    </>
                  )}
                </button>
                <span className="text-[10px] font-mono text-gray-400 dark:text-zinc-500">
                  {title.length}/80
                </span>
              </div>
            </div>
            <input
              type="text"
              maxLength={80}
              placeholder="e.g. I will edit high-retention viral TikTok & Reels videos with sound effects"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                clearError("title");
              }}
              className={`w-full rounded-xl border bg-white dark:bg-dark-surface/50 px-3.5 py-2.5 text-xs text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-all ${
                errors.title ? "border-red-500/50" : "border-gray-200 dark:border-white/10"
              }`}
            />
            {errors.title && <p className="text-[11px] text-red-500">{errors.title}</p>}
          </div>

          {/* Service Description & Scope - copies Job Post editor design and flex-stretches vertically */}
          <div className="flex-1 flex flex-col min-h-0 space-y-1.5">
            <div className="flex flex-wrap justify-between items-center gap-2 mb-1 shrink-0">
              <label className="text-[11px] font-bold text-gray-800 dark:text-zinc-200 uppercase tracking-wider">
                Service Description & Scope <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] font-mono text-gray-400 dark:text-zinc-500">
                {description.length}/2000
              </span>
            </div>

            {/* Integrated Editor Box */}
            <div
              className={`rounded-2xl border transition-all overflow-hidden flex-1 flex flex-col min-h-[340px] ${
                errors.description
                  ? "border-red-500 ring-2 ring-red-500/20"
                  : "border-gray-300 dark:border-white/10 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20"
              }`}
            >
              {/* Integrated Sticky Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-gray-50 dark:bg-white/[0.03] border-b border-gray-200 dark:border-white/10 select-none shrink-0">
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
                    title="Auto-format text into clean Markdown headers and bullets"
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

              {/* Textarea or Clean Document Preview Viewport */}
              {isPreviewMode ? (
                <div className="w-full flex-1 min-h-[280px] bg-gray-50/50 dark:bg-black/30 p-5 text-sm overflow-y-auto custom-scrollbar">
                  <div className="max-w-none">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 pb-3 mb-3 border-b border-gray-200 dark:border-white/10 select-none">
                      <FileCheck className="w-3.5 h-3.5 text-blue-500" />
                      <span>Document Preview &bull; How clients will see your scope</span>
                    </div>
                    {description ? (
                      <JobRichText
                        content={description}
                        className="text-gray-800 dark:text-zinc-200 font-normal leading-relaxed text-sm"
                      />
                    ) : (
                      <span className="text-gray-400 dark:text-zinc-500 italic text-xs">
                        No description entered yet. Switch to Edit Mode to describe deliverables, workflow, and scope.
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <textarea
                  ref={descriptionRef}
                  maxLength={2000}
                  placeholder="Describe your service in detail:&#10;• What is included in your deliverables?&#10;• What software/tools do you use?&#10;• What is your delivery workflow and turnaround time?&#10;• Any prerequisites or specifications the client should provide..."
                  value={description}
                  onPaste={(e) => {
                    const handled = handleRichTextPaste(e, description, setDescription, 2000);
                    if (handled) clearError("description");
                  }}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (e.target.value.trim()) clearError("description");
                  }}
                  className="w-full flex-1 min-h-[280px] bg-white dark:bg-dark-base/60 p-4 md:p-5 text-sm text-gray-900 dark:text-white outline-none leading-relaxed resize-none custom-scrollbar font-normal placeholder:text-gray-400 dark:placeholder:text-zinc-500"
                />
              )}
            </div>
            {errors.description && <p className="text-[11px] font-medium text-red-500 mt-1">{errors.description}</p>}
          </div>
        </div>

        {/* Right Column (Visual Banners & Metadata): 5 cols on lg, 4 cols on xl */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6 flex flex-col">
          {/* Service Thumbnail Card - Exact parity with Job Post */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-[11px] font-bold text-gray-800 dark:text-zinc-200 uppercase tracking-wider block">
                  Service Thumbnail <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-gray-400 dark:text-zinc-500">
                  Select a default banner or upload
                </span>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 border border-gray-200 dark:border-zinc-700 transition cursor-pointer shadow-2xs active:scale-95"
              >
                <Upload className="h-3.5 w-3.5 text-gray-500 dark:text-zinc-400" />
                <span>Upload</span>
              </button>
            </div>

            {/* Main Preview Box */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => {
                if (!previewUrl) {
                  fileInputRef.current?.click();
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

                  {/* Badge indicating source */}
                  <div className="absolute top-2.5 left-2.5 pointer-events-none">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-black/60 text-white backdrop-blur-md shadow-xs">
                      {selectedDefaultBannerId ? (
                        <span>Preset Service Banner</span>
                      ) : (
                        <>
                          <Upload className="h-2.5 w-2.5 text-emerald-400" />
                          <span>Custom Upload</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Hover Overlay with Action Buttons */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2.5 p-4">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-sm transition cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Upload</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveThumbnail(e);
                      }}
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
                {DEFAULT_GIG_BANNERS.map((banner, idx) => {
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

          {/* Classification Card - Exact parity with Job Post */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-5 space-y-4">
            <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Classification
            </h3>

            {/* Service Category */}
            <CustomDropdown
              label="Service Category"
              value={category}
              options={categories}
              placeholder="Select Category"
              error={errors.category}
              onSelect={(val) => {
                setCategory(val);
                clearError("category");
              }}
            />

            {/* Offering Entity */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block">
                Offering Entity
              </label>
              <div className="px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.02] text-xs font-semibold text-gray-700 dark:text-zinc-300 flex items-center justify-between">
                <span>{postingAs === "team" ? "Team / Studio Service" : "Solo Freelancer"}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Step 1 Locked
                </span>
              </div>
            </div>
          </div>

          {/* Applied Skills Card */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-5 space-y-3.5">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-gray-800 dark:text-zinc-200 uppercase tracking-wider">
                Applied Skills & Tooling <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-gray-400 dark:text-zinc-500">
                Skills you bring
              </span>
            </div>

            <SkillsAutocomplete
              skills={skills || []}
              setSkills={(newSkills) => {
                setSkills(newSkills);
                clearError("skills");
              }}
              error={errors.skills}
              maxSkills={10}
              hideHeader={true}
              hideJoedAi={true}
              jobTitle={title}
              jobDescription={description}
              jobCategory={category}
            />
            {errors.skills && <p className="text-[11px] text-red-500">{errors.skills}</p>}
          </div>
        </div>
      </div>

      {/* Step Footer Navigation */}
      <div className="pt-4 border-t border-gray-100 dark:border-white/10 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/5 transition cursor-pointer"
        >
          ← Back to Identity
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onDiscard}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onNext}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>Proceed to Policies</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Generate with AI Modal (Portaled matching Job Post) */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isAiModalOpen && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                <style>{`
                  @keyframes aiMarqueeLeft {
                    0% { transform: translateX(0%); }
                    100% { transform: translateX(-50%); }
                  }
                  @keyframes aiMarqueeRight {
                    0% { transform: translateX(-50%); }
                    100% { transform: translateX(0%); }
                  }
                  .ai-marquee-left {
                    display: flex;
                    width: max-content;
                    animation: aiMarqueeLeft 38s linear infinite;
                  }
                  .ai-marquee-right {
                    display: flex;
                    width: max-content;
                    animation: aiMarqueeRight 38s linear infinite;
                  }
                  .ai-marquee-left:hover,
                  .ai-marquee-right:hover {
                    animation-play-state: paused;
                  }
                `}</style>

                {/* Full-screen Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => !isGeneratingAi && setIsAiModalOpen(false)}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Modal Container */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 12 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
                >
                  {/* Modal Header */}
                  <div className="px-6 py-4.5 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src="/ensemble_lg.svg"
                        alt="Ensemble"
                        className="h-7 w-7 shrink-0 invert dark:invert-0 object-contain"
                      />
                      <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                          Generate with Joed AI!
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                          Describe your video project in your own words.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => !isGeneratingAi && setIsAiModalOpen(false)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                      title="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 space-y-4 overflow-y-auto">
                    {/* Prompt Textarea */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[11px] font-bold text-gray-800 dark:text-zinc-200 uppercase tracking-wider">
                          Describe what you want / offer
                        </label>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-mono ${
                              aiPromptWordCount < 3 && aiPrompt.length > 0
                                ? "text-amber-500 font-semibold"
                                : "text-gray-400 dark:text-zinc-500"
                            }`}
                          >
                            {aiPromptWordCount} {aiPromptWordCount === 1 ? "word" : "words"} (min 3)
                          </span>
                          <span className="text-[10px] font-mono text-gray-400 dark:text-zinc-500">
                            &bull; {aiPrompt.length}/1000
                          </span>
                        </div>
                      </div>
                      <textarea
                        rows={4}
                        maxLength={1000}
                        placeholder="e.g., I provide high-retention vertical video editing for TikTok and Reels. Including kinetic captions, fast-paced cuts, sound effects, meme inserts, and color grading..."
                        value={aiPrompt}
                        onChange={(e) => {
                          setAiPrompt(e.target.value);
                          if (aiError) setAiError(null);
                        }}
                        className={`w-full rounded-xl border bg-gray-50/50 dark:bg-zinc-800/40 p-3.5 text-xs text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-zinc-800 placeholder:text-gray-400 dark:placeholder:text-zinc-500 leading-relaxed resize-none font-medium transition-all ${
                          aiError
                            ? "border-red-400 dark:border-red-500/60 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                            : "border-gray-200 dark:border-zinc-700/80 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        }`}
                      />
                      {aiError && (
                        <p className="text-[11px] font-medium text-red-500 dark:text-red-400 mt-1">
                          {aiError}
                        </p>
                      )}
                    </div>

                    {/* Live 2-Row Infinite Marquee Carousel */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                          <span>Quick Inspirations</span>
                          <span className="text-[10px] font-normal text-gray-400 dark:text-zinc-500 normal-case">
                            (Click to autofill)
                          </span>
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-zinc-500">
                          Hover to pause
                        </span>
                      </div>

                      <div className="relative overflow-hidden py-1 -mx-6 px-6">
                        {/* Gradient edge masks for smooth fade */}
                        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-zinc-900 to-transparent z-10 pointer-events-none" />
                        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-zinc-900 to-transparent z-10 pointer-events-none" />

                        {/* Row 1 - slides left */}
                        <div className="ai-marquee-left gap-2 mb-2">
                          {[...AI_INSPIRATIONS_ROW_1, ...AI_INSPIRATIONS_ROW_1].map((item, idx) => {
                            const IconComp = item.icon;
                            return (
                              <button
                                key={`r1-${item.label}-${idx}`}
                                type="button"
                                onClick={() => {
                                  setAiPrompt(item.prompt);
                                  if (aiError) setAiError(null);
                                }}
                                className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-50 dark:bg-zinc-800/80 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-gray-700 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-blue-400 border border-gray-200 dark:border-zinc-700/80 hover:border-blue-300 dark:hover:border-blue-500/30 transition-all shrink-0 cursor-pointer shadow-2xs active:scale-95"
                              >
                                <IconComp className="h-3.5 w-3.5 text-gray-400 dark:text-zinc-400 group-hover:text-blue-500 transition-colors shrink-0" />
                                <span>{item.label}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Row 2 - slides right */}
                        <div className="ai-marquee-right gap-2">
                          {[...AI_INSPIRATIONS_ROW_2, ...AI_INSPIRATIONS_ROW_2].map((item, idx) => {
                            const IconComp = item.icon;
                            return (
                              <button
                                key={`r2-${item.label}-${idx}`}
                                type="button"
                                onClick={() => {
                                  setAiPrompt(item.prompt);
                                  if (aiError) setAiError(null);
                                }}
                                className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-50 dark:bg-zinc-800/80 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-gray-700 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-blue-400 border border-gray-200 dark:border-zinc-700/80 hover:border-blue-300 dark:hover:border-blue-500/30 transition-all shrink-0 cursor-pointer shadow-2xs active:scale-95"
                              >
                                <IconComp className="h-3.5 w-3.5 text-gray-400 dark:text-zinc-400 group-hover:text-blue-500 transition-colors shrink-0" />
                                <span>{item.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Cooldown notice */}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/70 text-xs text-gray-600 dark:text-zinc-300">
                      <Clock className="h-4 w-4 shrink-0 text-gray-400 dark:text-zinc-400" />
                      <span className="font-medium">
                        {aiCooldownLeft > 0
                          ? `Cooldown active: ${Math.floor(aiCooldownLeft / 60)}:${String(aiCooldownLeft % 60).padStart(2, "0")} remaining.`
                          : "3-minute cooldown applies after generation."}
                      </span>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="px-6 py-3.5 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/40 dark:bg-zinc-900/40 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      disabled={isGeneratingAi}
                      onClick={() => setIsAiModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-xs font-bold hover:bg-gray-100 dark:hover:bg-zinc-800 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      disabled={isGenerateDisabled}
                      onClick={handleGenerateWithJoed}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                        !isGenerateDisabled
                          ? "bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/25 active:scale-[0.98] cursor-pointer"
                          : "bg-gray-100 dark:bg-zinc-800/80 text-gray-400 dark:text-zinc-500 border border-gray-200 dark:border-zinc-700/60 cursor-not-allowed opacity-70"
                      }`}
                      title={
                        isGeneratingAi
                          ? "Joed AI is generating your service specifications..."
                          : aiCooldownLeft > 0
                          ? `Cooldown active (${aiCooldownLeft}s)`
                          : aiPromptWordCount < 3
                          ? "Please write at least 3 words to generate"
                          : "Generate Service Details with Joed AI"
                      }
                    >
                      {isGeneratingAi ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                          <span>Generating with Joed AI...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className={`h-3.5 w-3.5 ${!isGenerateDisabled ? "text-white" : "text-gray-400 dark:text-zinc-500"}`} />
                          <span>Generate Now</span>
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

export default CreateCoreInfo;
