import React, { useRef, useState, type ChangeEvent } from "react";
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
  RefreshCw
} from "lucide-react";
import { JobRichText } from "../JobRichText";
import { motion, AnimatePresence } from "framer-motion";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast";
import { handleRichTextPaste, autoFormatDescription } from "@/lib/markdownPaste";

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
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

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
    setPreviewUrl(localUrl);
    if (setThumbnail) setThumbnail(localUrl);
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

  const handleRemoveThumbnail = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewUrl(null);
    if (setThumbnail) setThumbnail(null);
    if (setThumbnailFile) setThumbnailFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearError = (key: string) => {
    setErrors((prev) => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  return (
    <div className="text-left space-y-8">
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
                    Require applicants to answer these questions with their proposal, helping you evaluate experience and weed out copy-pasted pitches.
                  </div>
                </div>
              </div>

              {setScreeningQuestions && screeningQuestions.length < 3 && (
                <button
                  type="button"
                  onClick={() => setScreeningQuestions([...screeningQuestions, ""])}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Question
                </button>
              )}
            </div>

            {screeningQuestions.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-zinc-500 italic">
                No screening questions added yet. Click &ldquo;Add Question&rdquo; to prompt applicants for portfolio reels, software mastery, or estimated delivery turnaround.
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
                          ? "e.g., Link to your most relevant DaVinci Resolve or After Effects portfolio reel"
                          : idx === 1
                          ? "e.g., What is your turnaround time for the first rough cut?"
                          : "e.g., Have you worked with multicam synchronizations before?"
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
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-gray-800 dark:text-zinc-200 uppercase tracking-wider">
                Job Thumbnail <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium">
                16:9 or 2:1 Recommended
              </span>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative w-full aspect-[16/9] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-200 overflow-hidden group ${
                isDragging
                  ? "border-blue-500 bg-blue-500/10"
                  : previewUrl
                  ? "border-gray-200 dark:border-white/10 bg-black/5 dark:bg-white/5"
                  : "border-gray-300 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.02] hover:border-blue-500 hover:bg-blue-50/20 dark:hover:bg-blue-500/5"
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
                  {/* Hover Overlay with Action Buttons */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 p-4">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-sm transition"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Replace</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveThumbnail}
                      className="px-3.5 py-2 rounded-xl bg-red-500/80 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-sm transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center text-center p-6 pointer-events-none space-y-2">
                  <div className="h-12 w-12 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-zinc-400 flex items-center justify-center">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900 dark:text-white">
                      Click to upload or drag image here
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                      Max 20MB &bull; JPEG, PNG, WEBP
                    </p>
                  </div>
                </div>
              )}
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
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.02] p-5 space-y-3">
            <div className="flex items-center gap-2 text-gray-900 dark:text-white">
              <FileCheck className="h-4 w-4 text-gray-500 dark:text-zinc-400 shrink-0" />
              <h4 className="text-xs font-bold">Posting Guidelines</h4>
            </div>
            <ul className="text-xs text-gray-600 dark:text-zinc-300 space-y-2.5 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-gray-400 dark:text-zinc-500 font-bold select-none">&bull;</span>
                <span>Specify your source video format, resolution (e.g. 4K ProRes), and camera logs if applicable.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400 dark:text-zinc-500 font-bold select-none">&bull;</span>
                <span>Screening questions help identify skilled creators and filter out automated proposals.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400 dark:text-zinc-500 font-bold select-none">&bull;</span>
                <span>Attach storyboards or reference links so creators can quote accurate budgets and milestones.</span>
              </li>
            </ul>
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

    </div>
  );
};

export default CreateCoreInfo;
