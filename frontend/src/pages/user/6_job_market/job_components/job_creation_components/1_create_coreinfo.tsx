import React, { useRef, useState, type ChangeEvent } from "react";
import { ArrowRight, Image as ImageIcon, ChevronDown, Check, Bold, Italic, List, Eye, EyeOff } from "lucide-react";
import { JobRichText } from "../JobRichText";
import { motion, AnimatePresence } from "framer-motion";

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
  setThumbnail: (val: string | null) => void;
  setThumbnailFile?: (file: File | null) => void;
  isDragging: boolean;
  setIsDragging: (val: boolean) => void;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
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
      <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between rounded-xl border bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-3.5 py-2.5 text-xs transition-all ${
            error ? "border-red-500/50" : isOpen ? "border-blue-500/50" : "border-gray-200 dark:border-white/10 hover:border-white/20"
          }`}
        >
          <span className={value ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-zinc-400"}>
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
                className="absolute left-0 right-0 z-30 max-h-48 overflow-y-auto rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0f1a] p-1.5 shadow-2xl space-y-0.5 custom-scrollbar"
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
                          : "text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
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
  onNext,
  onDiscard,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

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

    // Handle multiline bullet insertion (when suffix is empty and we are applying a list)
    if (suffix === '' && selected.includes('\n')) {
      const lines = selected.split('\n');
      const bulleted = lines.map(line => prefix + line).join('\n');
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

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
      return;
    }
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setThumbnail(localUrl);
    if (setThumbnailFile) setThumbnailFile(file);
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
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  return (
    <div className="space-y-5 text-left">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">Job Core Specifications</h2>
        <p className="text-xs text-gray-600 dark:text-zinc-300">Provide fundamental background criteria for your project.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-5 items-start">
        {/* Left: Square Image */}
        <div className="flex flex-col">
          <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block mb-1.5">Job Thumbnail</label>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative w-[140px] aspect-square rounded-xl border border-dashed flex flex-col items-center justify-center p-3 cursor-pointer transition-all duration-200 ${
              isDragging ? "border-blue-500 bg-blue-500/10" : previewUrl ? "border-white/20 bg-white dark:bg-white/5 shadow-sm dark:shadow-none" : "border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none hover:border-white/20"
            }`}
          >
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            {previewUrl ? (
              <div className="absolute inset-0 w-full h-full rounded-xl overflow-hidden group">
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover opacity-80" />
              </div>
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
      </div>

      <div className="space-y-1.5 mt-5">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">Job Post Title <span className="text-red-500">*</span></label>
          <span className="text-[10px] font-mono text-gray-500 dark:text-zinc-500">{title.length}/300</span>
        </div>
        <input type="text" maxLength={300} placeholder="e.g., Wedding Video Edit - Romantic Style" value={title} onChange={e => { setTitle(e.target.value); if(e.target.value.trim()) clearError("title"); }} className={`w-full rounded-xl border bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-3.5 py-2.5 text-xs text-gray-900 dark:text-white outline-none transition-all ${errors.title ? "border-red-500/50 focus:border-red-500" : "border-gray-200 dark:border-white/10 focus:border-blue-500/50"}`} />
        {errors.title && <p className="text-[11px] text-red-400">{errors.title}</p>}
      </div>

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
          <textarea ref={descriptionRef} rows={8} maxLength={2000} placeholder="Outline requirements, raw footage details, deliverables..." value={description} onChange={e => { setDescription(e.target.value); if(e.target.value.trim()) clearError("description"); }} className={`w-full min-h-[180px] rounded-xl border bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-3.5 py-3 text-xs text-gray-900 dark:text-white outline-none transition-all resize-y leading-relaxed custom-scrollbar ${errors.description ? "border-red-500/50 focus:border-red-500" : "border-gray-200 dark:border-white/10 focus:border-blue-500/50"}`} />
        )}
        
        {errors.description && <p className="text-[11px] text-red-400">{errors.description}</p>}
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex gap-2.5">
        <button type="button" onClick={onDiscard} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-500 dark:text-zinc-400 font-bold hover:text-red-400 hover:border-red-500/30 transition text-xs focus:outline-none">Discard Changes</button>
        <button type="button" onClick={onNext} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-500 py-2.5 text-xs font-bold text-white hover:bg-blue-600 transition focus:outline-none shadow-lg shadow-blue-500/20">Confirm and Next <ArrowRight className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
};

export default CreateCoreInfo;