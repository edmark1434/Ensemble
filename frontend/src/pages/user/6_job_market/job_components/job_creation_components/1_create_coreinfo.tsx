import React, { useRef, useState, useEffect, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import api from "@/lib/axios";
import useGlobalState from "@/lib/global_state";
import { CreditIcon } from "@/components/ui/credit-icon";
import { 
  ArrowRight, 
  Image as ImageIcon, 
  ChevronDown, 
  Check, 
  Bold, 
  Italic, 
  List, 
  Eye, 
  EyeOff, 
  Wand2, 
  HelpCircle, 
  Plus, 
  Trash2, 
  Paperclip, 
  FileText, 
  X,
  FileCheck,
  Upload,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Clock,
  GraduationCap,
  Gamepad2,
  Smartphone,
  Compass,
  PartyPopper,
  Video,
  Dumbbell,
  Heart,
  Mic,
  Package,
  Clapperboard,
  Loader2
} from "lucide-react";
import { JobRichText } from "../JobRichText";
import { motion, AnimatePresence } from "framer-motion";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast";
import { handleRichTextPaste, autoFormatDescription } from "@/lib/markdownPaste";
import { 
  DEFAULT_JOB_BANNERS, 
  getRandomJobBanner, 
  convertPresetUrlToFile,
  type DefaultJobBanner
} from "@/lib/defaultJobBanners";

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

export const difficulties = ["Beginner", "Intermediate", "Expert"];

const AI_INSPIRATIONS_ROW_1 = [
  {
    icon: GraduationCap,
    label: "School project video",
    prompt: "I need an editor for a school video presentation. I have raw phone footage and voiceover, need smooth cuts, clean title cards, gentle background music, and subtitle captions."
  },
  {
    icon: Gamepad2,
    label: "Gaming montage",
    prompt: "Looking for an energetic gaming montage from my gameplay clips. Sync kills to the music beats, add speed ramping, subtle sound effects, and clean color grading."
  },
  {
    icon: Smartphone,
    label: "TikTok / Reels edit",
    prompt: "Need a fast-paced viral vertical TikTok/Reels edit. Beat-synced cuts, dynamic zoom-ins, punchy animated captions, sound design, and sound effects."
  },
  {
    icon: Compass,
    label: "Travel vlog recap",
    prompt: "Turn 45 minutes of raw vacation clips from phone and GoPro into an aesthetic 3-minute travel vlog with smooth transitions and warm color grading."
  },
  {
    icon: Sparkles,
    label: "Anime music video (AMV)",
    prompt: "Create a 60-second anime edit with fast flow transitions, beat synchronization, creative typography overlays, and sound effects."
  },
  {
    icon: PartyPopper,
    label: "Birthday party highlight",
    prompt: "Compile phone videos and photos from a birthday celebration into a memorable 2-minute recap reel with heartwarming background music."
  },
];

const AI_INSPIRATIONS_ROW_2 = [
  {
    icon: Video,
    label: "YouTube sit-down vlog",
    prompt: "Need an editor to cut a 10-minute YouTube sit-down video. Remove dead air, pauses, and stumbles; add B-roll popups, chapter text, and sound effects."
  },
  {
    icon: Dumbbell,
    label: "Gym workout montage",
    prompt: "High-intensity gym workout reel for Instagram. Heavy bass beat sync, aggressive speed ramps, dark contrast grading, and sound effects."
  },
  {
    icon: Heart,
    label: "Wedding ceremony recap",
    prompt: "Edit a romantic 3-minute cinematic highlight video from multi-cam wedding footage with audio vows sync, slow-motion shots, and soft color grading."
  },
  {
    icon: Mic,
    label: "Podcast viral clips",
    prompt: "Cut 3 viral vertical clips from a 1-hour podcast episode. Add Alex Hormozi style animated captions, emojis, and sound effects."
  },
  {
    icon: Package,
    label: "Product unboxing video",
    prompt: "Clean product unboxing edit with smooth macro shots, zoom cuts, text callouts for tech specifications, and crisp ambient audio."
  },
  {
    icon: Clapperboard,
    label: "Short film rough cut",
    prompt: "Assemble a 5-minute indie short film rough cut. Match multi-angle dialogue coverage, pacing, atmospheric audio ambience, and basic color correction."
  },
];

interface CreateCoreInfoProps {
  title: string;
  setTitle: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  category: string;
  setCategory: (val: string) => void;
  difficulty: string;
  setDifficulty: (val: string) => void;
  previewUrl: string | null;
  setPreviewUrl: (val: string | null) => void;
  setThumbnail?: (val: string | null) => void;
  setThumbnailFile?: (file: File | null) => void;
  isDragging: boolean;
  setIsDragging: (val: boolean) => void;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  screeningQuestions?: string[];
  setScreeningQuestions?: React.Dispatch<React.SetStateAction<string[]>>;
  briefFiles?: File[];
  setBriefFiles?: React.Dispatch<React.SetStateAction<File[]>>;
  onNext: () => void;
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
      <label className="text-[11px] font-bold text-gray-800 dark:text-zinc-200 uppercase tracking-wider block">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between rounded-xl border bg-white dark:bg-dark-base/60 shadow-sm px-4 py-3 text-xs transition-all ${
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
          <ChevronDown className={`h-4 w-4 text-gray-400 dark:text-zinc-400 transition-transform ${isOpen ? "rotate-180 text-blue-500" : ""}`} />
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
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition ${
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

export const CreateCoreInfo: React.FC<CreateCoreInfoProps> = ({
  title,
  setTitle,
  description,
  setDescription,
  category,
  setCategory,
  difficulty,
  setDifficulty,
  previewUrl,
  setPreviewUrl,
  setThumbnail,
  setThumbnailFile,
  isDragging,
  setIsDragging,
  errors,
  setErrors,
  screeningQuestions = [],
  setScreeningQuestions,
  briefFiles = [],
  setBriefFiles,
  onNext,
  onDiscard,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showAvoidGuidelines, setShowAvoidGuidelines] = useState(false);

  // Upload Popup Modal & Default Banners State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedDefaultBannerId, setSelectedDefaultBannerId] = useState<string | null>(null);

  useEffect(() => {
    if (previewUrl) {
      const matching = DEFAULT_JOB_BANNERS.find((b) => b.url === previewUrl);
      setSelectedDefaultBannerId(matching ? matching.id : null);
    } else {
      setSelectedDefaultBannerId(null);
    }
  }, [previewUrl]);

  const handleSelectDefaultBanner = async (banner: DefaultJobBanner) => {
    setSelectedDefaultBannerId(banner.id);
    setPreviewUrl(banner.url);
    if (setThumbnail) setThumbnail(banner.url);
    clearError("thumbnail");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (modalFileInputRef.current) modalFileInputRef.current.value = "";

    try {
      const file = await convertPresetUrlToFile(banner.url, `${banner.id}.png`);
      if (setThumbnailFile) setThumbnailFile(file);
    } catch (err) {
      console.error("Error setting default banner file:", err);
    }
  };

  // AI Generation Modal & 60s (1-minute) Cooldown State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const formatCooldown = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return mins > 0 ? `${mins}:${String(rem).padStart(2, "0")}` : `${secs}s`;
  };

  const aiPromptWordCount = aiPrompt.trim().split(/\s+/).filter(Boolean).length;
  const isGenerateDisabled = aiPromptWordCount < 2 || cooldownSeconds > 0 || isGeneratingAi;

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  const handleAiGenerate = async () => {
    if (isGenerateDisabled) return;
    setIsGeneratingAi(true);
    setAiError(null);
    try {
      const res = await api.post("/api/chat/generate-job", {
        prompt: aiPrompt.trim(),
      });
      const draft = res.data?.data;
      if (draft) {
        if (draft.title) {
          setTitle(String(draft.title).slice(0, 300));
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
        if (draft.difficulty && difficulties.includes(draft.difficulty)) {
          setDifficulty(draft.difficulty);
          clearError("difficulty");
        }
        if (
          setScreeningQuestions &&
          Array.isArray(draft.screeningQuestions) &&
          draft.screeningQuestions.length > 0 &&
          screeningQuestions.length === 0
        ) {
          setScreeningQuestions(
            draft.screeningQuestions.map((q: string) => String(q).trim()).filter(Boolean).slice(0, 3)
          );
        }
      }
      setIsAiModalOpen(false);
      setCooldownSeconds(60);
      showSuccessToast("Joed AI generated your job post specifications!");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Joed AI could not generate the job post right now. Please try again.";
      setAiError(msg);
      showErrorToast(msg);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const user = useGlobalState((state) => state.user);
  const [walletBalance, setWalletBalance] = useState<number | null>(
    user?.wallet?.balance_credits != null ? Number(user.wallet.balance_credits) : null
  );

  useEffect(() => {
    let mounted = true;
    api.get("/api/accounts/wallet", { params: { type: "account_wallets" } })
      .then((res) => {
        const bal = res.data?.data?.balance_credits ?? res.data?.balance_credits ?? res.data?.balance;
        if (mounted && bal !== undefined && bal !== null) {
          setWalletBalance(Number(bal));
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

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
    const localUrl = URL.createObjectURL(file);
    setSelectedDefaultBannerId(null);
    setPreviewUrl(localUrl);
    if (setThumbnail) setThumbnail(localUrl);
    if (setThumbnailFile) setThumbnailFile(file);
    clearError("thumbnail");
    setIsUploadModalOpen(false);
    showSuccessToast("Thumbnail uploaded successfully!");
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

  const handleRemoveThumbnail = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDefaultBannerId(null);
    setPreviewUrl(null);
    if (setThumbnail) setThumbnail(null);
    if (setThumbnailFile) setThumbnailFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (modalFileInputRef.current) modalFileInputRef.current.value = "";
  };

  const clearError = (key: string) => {
    setErrors((prev) => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  return (
    <div className="text-left space-y-8">
      {/* Dynamic Keyframes for Shimmer and Marquee */}
      <style>{`
        @keyframes shineGleam {
          0% { transform: translateX(-150%) skewX(-20deg); }
          35% { transform: translateX(250%) skewX(-20deg); }
          100% { transform: translateX(250%) skewX(-20deg); }
        }
        .animate-shine-gleam {
          animation: shineGleam 3.5s ease-in-out infinite;
        }
      `}</style>

      {/* 2-Column Studio Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Main Editing Workspace */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          
          {/* Header Description */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
              Job Core Specifications
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-1">
              Provide fundamental background criteria, scope requirements, and deliverables for your project.
            </p>
          </div>

          {/* Job Post Title */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-gray-800 dark:text-zinc-200 uppercase tracking-wider">
                Job Post Title <span className="text-red-500">*</span>
              </label>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAiModalOpen(true)}
                  disabled={cooldownSeconds > 0}
                  className={`relative overflow-hidden inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all shadow-xs active:scale-95 cursor-pointer ${
                    cooldownSeconds > 0
                      ? "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 border border-gray-200 dark:border-zinc-700 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border border-blue-400/40 shadow-blue-500/20 ring-1 ring-white/20 hover:shadow-md hover:shadow-blue-500/30"
                  }`}
                  title={cooldownSeconds > 0 ? `Joed AI on cooldown (${formatCooldown(cooldownSeconds)})` : "Generate Job Title & Description with Joed AI"}
                >
                  {cooldownSeconds === 0 && (
                    <span className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none animate-shine-gleam" />
                  )}
                  {cooldownSeconds > 0 ? (
                    <>
                      <Clock className="h-3 w-3 animate-spin text-gray-400 dark:text-zinc-500 shrink-0" />
                      <span>Cooldown ({formatCooldown(cooldownSeconds)})</span>
                    </>
                  ) : (
                    <>
                      <img src="/ensemble_lg.svg" alt="Ensemble" className="h-3.5 w-3.5 shrink-0 rounded-xs" />
                      <span>Generate with Joed AI!</span>
                    </>
                  )}
                </button>
                <span className="text-[10px] font-mono text-gray-400 dark:text-zinc-500">
                  {title.length}/300
                </span>
              </div>
            </div>
            <input
              type="text"
              maxLength={300}
              placeholder="e.g., Cinematic Wedding Video Edit - Color Grading & Sound Design"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
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

            {/* Editor Box with Integrated Sticky-style Toolbar */}
            <div className={`rounded-2xl border transition-all overflow-hidden ${
              errors.description 
                ? "border-red-500 ring-2 ring-red-500/20" 
                : "border-gray-300 dark:border-white/10 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20"
            }`}>
              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-gray-50 dark:bg-white/[0.03] border-b border-gray-200 dark:border-white/10 select-none">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => insertMarkdown("**", "**")}
                    className="p-1.5 rounded-lg hover:bg-gray-200/80 dark:hover:bg-white/10 text-gray-700 dark:text-zinc-300 transition-colors"
                    title="Bold (**text**)"
                    disabled={isPreviewMode}
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown("*", "*")}
                    className="p-1.5 rounded-lg hover:bg-gray-200/80 dark:hover:bg-white/10 text-gray-700 dark:text-zinc-300 transition-colors"
                    title="Italic (*text*)"
                    disabled={isPreviewMode}
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown("- ")}
                    className="p-1.5 rounded-lg hover:bg-gray-200/80 dark:hover:bg-white/10 text-gray-700 dark:text-zinc-300 transition-colors"
                    title="Bullet List (- item)"
                    disabled={isPreviewMode}
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-1" />
                  <button
                    type="button"
                    onClick={handleAutoFormat}
                    className="p-1.5 rounded-lg hover:bg-gray-200/80 dark:hover:bg-white/10 text-gray-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5 text-xs font-semibold"
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
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
                <div className="w-full min-h-[280px] md:min-h-[320px] bg-gray-50/50 dark:bg-black/30 p-6 text-sm overflow-y-auto custom-scrollbar">
                  <div className="max-w-none">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 pb-3 mb-3 border-b border-gray-200 dark:border-white/10 select-none">
                      <FileCheck className="w-3.5 h-3.5 text-blue-500" />
                      <span>Document Preview &bull; How applicants will see your scope</span>
                    </div>
                    {description ? (
                      <JobRichText content={description} className="text-gray-800 dark:text-zinc-200 font-normal leading-relaxed text-sm" />
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
                  placeholder="Describe your video project requirements in detail:&#10;• What is the footage format, camera type, and length?&#10;• Desired style, pacing, and color aesthetic&#10;• Specific audio, music, and sound design needs&#10;• Milestone delivery timeline and format expectations..."
                  value={description}
                  onPaste={(e) => {
                    const handled = handleRichTextPaste(e, description, setDescription, 2000);
                    if (handled) clearError("description");
                  }}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (e.target.value.trim()) clearError("description");
                  }}
                  className="w-full min-h-[280px] md:min-h-[320px] bg-white dark:bg-dark-base/60 p-4 md:p-5 text-sm text-gray-900 dark:text-white outline-none leading-relaxed resize-y custom-scrollbar font-normal placeholder:text-gray-400 dark:placeholder:text-zinc-500"
                />
              )}
            </div>
            {errors.description && <p className="text-[11px] font-medium text-red-500 mt-1">{errors.description}</p>}
          </div>

          {/* Screening Questions (Dealbreaker Criteria) */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Screening Questions <span className="text-gray-400 font-normal lowercase">(optional &bull; max 3)</span>
                </label>
                <div className="group relative flex items-center">
                  <HelpCircle className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden w-64 rounded-xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 p-3 text-center text-xs text-gray-700 dark:text-gray-300 shadow-xl group-hover:block z-10 pointer-events-none">
                    Ask short text-answerable questions about workflow, tools, or turnaround. Applicants attach work samples separately in their proposal.
                  </div>
                </div>
              </div>

              {setScreeningQuestions && screeningQuestions.length < 3 && (
                <button
                  type="button"
                  onClick={() => setScreeningQuestions([...screeningQuestions, ""])}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Question
                </button>
              )}
            </div>

            {screeningQuestions.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-zinc-500 italic">
                No screening questions added yet. Click &ldquo;Add Question&rdquo; to ask text-answerable questions about editing tools, workflow, or turnaround time (applicants attach work samples separately).
              </p>
            ) : (
              <div className="space-y-2.5">
                {screeningQuestions.map((q, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="flex items-center justify-center h-6 w-6 rounded-lg bg-gray-100 dark:bg-white/5 text-[11px] font-bold text-gray-700 dark:text-zinc-300 shrink-0 border border-gray-200 dark:border-white/10">
                      Q{idx + 1}
                    </span>
                    <input
                      type="text"
                      maxLength={150}
                      value={q}
                      placeholder={
                        idx === 0
                          ? "e.g., What editing software do you use for speed ramping and beat syncing?"
                          : idx === 1
                          ? "e.g., What is your typical turnaround time for the first rough cut?"
                          : "e.g., How do you approach audio leveling and color matching across clips?"
                      }
                      onChange={(e) => {
                        if (!setScreeningQuestions) return;
                        const updated = [...screeningQuestions];
                        updated[idx] = e.target.value;
                        setScreeningQuestions(updated);
                      }}
                      className="flex-1 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-dark-base/60 px-3.5 py-2.5 text-xs text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-medium placeholder:text-gray-400 dark:placeholder:text-zinc-500"
                    />
                    {setScreeningQuestions && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = screeningQuestions.filter((_, i) => i !== idx);
                          setScreeningQuestions(updated);
                        }}
                        className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors"
                        title="Remove Question"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Project Brief & Reference Documents */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Project Brief & Reference Documents <span className="text-gray-400 font-normal lowercase">(optional &bull; max 5)</span>
                </label>
                <div className="group relative flex items-center">
                  <HelpCircle className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden w-64 rounded-xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 p-3 text-center text-xs text-gray-700 dark:text-gray-300 shadow-xl group-hover:block z-10 pointer-events-none">
                    Upload script drafts, storyboards, brand styleguides, or reference clips to help candidates provide precise estimates.
                  </div>
                </div>
              </div>

              {setBriefFiles && briefFiles.length < 5 && (
                <label className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer transition">
                  <Paperclip className="h-3.5 w-3.5" /> Attach Documents
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.zip,.doc,.docx,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        const newFiles = Array.from(e.target.files);
                        setBriefFiles((prev) => [...prev, ...newFiles].slice(0, 5));
                      }
                    }}
                  />
                </label>
              )}
            </div>

            {briefFiles.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-zinc-500 italic">
                No reference documents attached. You can attach PDFs, scripts, moodboards, or zip files.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {briefFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs"
                  >
                    <div className="flex items-center gap-2.5 truncate pr-2">
                      <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                      <div className="truncate">
                        <p className="font-semibold text-gray-900 dark:text-white truncate text-xs">
                          {file.name}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-zinc-500">
                          {(file.size / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                    </div>
                    {setBriefFiles && (
                      <button
                        type="button"
                        onClick={() => setBriefFiles(briefFiles.filter((_, i) => i !== idx))}
                        className="p-1 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors"
                        title="Remove file"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Sticky Studio Sidebar (Thumbnail Uploader, Category & Difficulty, Gray Guidelines) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-6">
          
          {/* Job Thumbnail Card */}
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

            {/* Main Preview Box */}
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

                  {/* Badge indicating source */}
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

                  {/* Hover Overlay with Action Buttons */}
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

          {/* Categorization & Difficulty Card */}
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
                setDifficulty(val);
                clearError("difficulty");
              }}
            />
          </div>

          {/* Quality Tips Card - Clean Crisp Neutral Gray Style */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.02] p-5 space-y-3.5">
            <div className="flex items-center gap-2 text-gray-900 dark:text-white">
              <FileCheck className="h-4 w-4 text-gray-500 dark:text-zinc-400 shrink-0" />
              <h4 className="text-xs font-bold uppercase tracking-wider">Posting Guidelines</h4>
            </div>

            {/* Best Practices (Always Visible) */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block">
                What to include
              </span>
              <ul className="text-xs text-gray-600 dark:text-zinc-300 space-y-2 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 dark:text-emerald-400 font-bold select-none">&bull;</span>
                  <span>Specify your source video format, resolution (e.g. 4K ProRes), and camera logs if applicable.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 dark:text-emerald-400 font-bold select-none">&bull;</span>
                  <span>Screening questions help identify skilled creators and filter out automated proposals.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 dark:text-emerald-400 font-bold select-none">&bull;</span>
                  <span>Attach storyboards or reference links so creators can quote accurate budgets and milestones.</span>
                </li>
              </ul>
            </div>

            {/* Collapsible What to Avoid Section */}
            <div className="pt-2 border-t border-gray-200/60 dark:border-white/5 space-y-2">
              <button
                type="button"
                onClick={() => setShowAvoidGuidelines(!showAvoidGuidelines)}
                className="w-full flex items-center justify-between text-left group cursor-pointer py-0.5"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-red-500/90 dark:text-red-400 uppercase tracking-wider">
                    What to avoid
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-normal">
                    ({showAvoidGuidelines ? "Hide" : "Expand to view"})
                  </span>
                </div>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-gray-400 dark:text-zinc-500 group-hover:text-red-500 dark:group-hover:text-red-400 transition-transform duration-200 ${
                    showAvoidGuidelines ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence initial={false}>
                {showAvoidGuidelines && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <ul className="text-xs text-gray-600 dark:text-zinc-300 space-y-2 leading-relaxed pt-1.5">
                      <li className="flex items-start gap-2">
                        <span className="text-red-500 dark:text-red-400 font-bold select-none">&bull;</span>
                        <span><strong className="text-gray-900 dark:text-zinc-100 font-semibold">Do not request unpaid test edits or free sample work.</strong> All custom trial tasks must be commissioned as paid milestones.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-500 dark:text-red-400 font-bold select-none">&bull;</span>
                        <span><strong className="text-gray-900 dark:text-zinc-100 font-semibold">Avoid sharing off-platform contact info or external payments</strong> (e.g. Telegram, PayPal). Keeping communication on Ensemble protects your escrow guarantee.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-500 dark:text-red-400 font-bold select-none">&bull;</span>
                        <span><strong className="text-gray-900 dark:text-zinc-100 font-semibold">Avoid vague, one-line project descriptions</strong> lacking estimated footage duration, turnaround deadlines, or editing style references.</span>
                      </li>
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Upfront 50 Credits Publication Fee Notice (Below Posting Guidelines) */}
          <div className="p-4 rounded-2xl border border-blue-200/80 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/20 space-y-3 shadow-2xs">
            <div className="flex items-start gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center shrink-0 text-amber-500 mt-0.5">
                <CreditIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1 flex-wrap">
                  <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                    Job Publication Cost
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-600 text-white shadow-2xs">
                    <CreditIcon className="h-2.5 w-2.5 text-amber-300" /> 50 Credits
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  Publishing a job requires <strong className="text-gray-900 dark:text-zinc-200 font-semibold">50 Credits</strong>, charged upon final review and confirmation in <span className="font-semibold text-blue-600 dark:text-blue-400">Step 4 (Review & Post)</span>. No credits are charged while drafting.
                </p>
              </div>
            </div>

            <div className="pt-2.5 border-t border-blue-200/60 dark:border-blue-900/40 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 dark:text-zinc-400 text-[11px]">Your Wallet:</span>
                <span className="font-bold text-gray-900 dark:text-white inline-flex items-center gap-1 text-xs">
                  <CreditIcon className="h-3 w-3 text-amber-500" />
                  {walletBalance !== null ? `${walletBalance.toLocaleString()} Cr` : "..."}
                </span>
              </div>
              {walletBalance !== null && walletBalance < 50 ? (
                <button
                  type="button"
                  onClick={() => window.open("/credits/shop", "_blank")}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  Top up Credits <ExternalLink className="h-3 w-3" />
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <Check className="h-3 w-3" /> Sufficient
                </span>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* FULL-WIDTH ACTION FOOTER */}
      <div className="pt-6 border-t border-gray-200 dark:border-white/10 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onDiscard}
          className="px-6 py-3 rounded-xl border border-gray-300 dark:border-white/10 text-gray-700 dark:text-zinc-300 font-bold hover:text-red-500 hover:border-red-500/30 hover:bg-gray-100 dark:hover:bg-white/5 transition text-sm focus:outline-none shadow-sm"
        >
          Discard Changes
        </button>
        <button
          type="button"
          onClick={onNext}
          className="min-w-[220px] px-8 py-3.5 flex items-center justify-center gap-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold text-white transition focus:outline-none shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 active:scale-[0.99]"
        >
          Confirm and Next <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Generate with AI Modal (Portaled) */}
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

                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsAiModalOpen(false)}
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
                      onClick={() => setIsAiModalOpen(false)}
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
                          Describe what you want
                        </label>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-mono ${aiPromptWordCount < 2 && aiPrompt.length > 0 ? "text-amber-500 font-semibold" : "text-gray-400 dark:text-zinc-500"}`}>
                            {aiPromptWordCount} {aiPromptWordCount === 1 ? "word" : "words"} (min 2)
                          </span>
                          <span className="text-[10px] font-mono text-gray-400 dark:text-zinc-500">
                            &bull; {aiPrompt.length}/1000
                          </span>
                        </div>
                      </div>
                      <textarea
                        rows={4}
                        maxLength={1000}
                        placeholder="e.g., I have 30 minutes of raw phone footage from our high school play. Need a clean 3-minute recap video with music, chapter title cards, and audio cleanup..."
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
                          <span className="text-[10px] font-normal text-gray-400 dark:text-zinc-500 normal-case">(Click to autofill)</span>
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

                    {/* Highly visible short cooldown notice with clean gray icon */}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/70 text-xs text-gray-600 dark:text-zinc-300">
                      <Clock className="h-4 w-4 shrink-0 text-gray-400 dark:text-zinc-400" />
                      <span className="font-medium">1-minute cooldown applies after generation.</span>
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
                      onClick={handleAiGenerate}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                        !isGenerateDisabled
                          ? "bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/25 active:scale-[0.98] cursor-pointer"
                          : "bg-gray-100 dark:bg-zinc-800/80 text-gray-400 dark:text-zinc-500 border border-gray-200 dark:border-zinc-700/60 cursor-not-allowed opacity-70"
                      }`}
                      title={
                        isGeneratingAi
                          ? "Joed AI is generating your job post..."
                          : cooldownSeconds > 0
                          ? `Cooldown active (${cooldownSeconds}s)`
                          : aiPromptWordCount < 2
                          ? "Please write at least 2 words to generate"
                          : "Generate Title & Description with Joed AI"
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

      {/* Upload Thumbnail Popup Modal (Portaled) */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isUploadModalOpen && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsUploadModalOpen(false)}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Modal Container */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 12 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-2xl overflow-hidden z-10 flex flex-col"
                >
                  {/* Modal Header */}
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

                  {/* Modal Body */}
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

                  {/* Modal Footer */}
                  <div className="px-6 py-3.5 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/40 dark:bg-zinc-900/40 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsUploadModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-xs font-bold hover:bg-gray-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => modalFileInputRef.current?.click()}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-[0.98] cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Browse File</span>
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
