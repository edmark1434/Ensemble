import React, { useRef, useState, type ChangeEvent } from "react";
import { ArrowRight, Image as ImageIcon, ChevronDown, Check, Bold, Italic, List, Eye, EyeOff } from "lucide-react";
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

interface CreateCoreInfoProps {
  title: string;
  setTitle: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  category: string;
  setCategory: (val: string) => void;
  previewUrl: string | null;
  setPreviewUrl: (val: string | null) => void;
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
            error ? "border-red-500/50" : isOpen ? "border-blue-500/50" : "border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
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
                          ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                          : "text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
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
  previewUrl,
  setPreviewUrl,
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
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">Service Core Specifications</h2>
        <p className="text-xs text-gray-600 dark:text-zinc-300">Provide fundamental background criteria for your service.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-5 items-start">
        {/* Left: Square Image */}
        <div className="flex flex-col">
          <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block mb-1.5">Service Thumbnail <span className="text-red-500">*</span></label>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative w-[140px] aspect-square rounded-xl border border-dashed flex flex-col items-center justify-center p-3 cursor-pointer transition-all duration-200 ${
              isDragging ? "border-blue-500 bg-blue-500/10" : previewUrl ? "border-white/20 bg-white dark:bg-white/5 shadow-sm dark:shadow-none" : "border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none hover:border-gray-300 dark:hover:border-white/20"
            }`}
          >
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            {previewUrl ? (
              <>
                <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover rounded-xl" />
                <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center rounded-xl transition-opacity">
                  <span className="text-xs font-semibold text-white">Replace Image</span>
                </div>
              </>
            ) : (
              <>
                <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-2">
                  <ImageIcon className="h-5 w-5 text-gray-400 dark:text-zinc-400" />
                </div>
                <span className="text-[10px] text-gray-500 dark:text-zinc-400 font-medium text-center">
                  Drag & Drop <br /> or Click
                </span>
              </>
            )}
          </div>
          {errors.thumbnail && <p className="text-[11px] text-red-400 mt-1.5">{errors.thumbnail}</p>}
        </div>

        {/* Right: Title & Category */}
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
              Service Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. I will edit your YouTube gaming videos with premium VFX"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                clearError("title");
              }}
              className={`w-full rounded-xl border bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-3.5 py-2.5 text-sm text-gray-900 dark:text-white transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none ${
                errors.title ? "border-red-500/50 focus:border-red-500" : "border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 focus:border-blue-500/50"
              }`}
            />
            {errors.title && <p className="text-[11px] text-red-400 mt-1">{errors.title}</p>}
          </div>

          <CustomDropdown
            label="Category"
            value={category}
            options={categories}
            placeholder="Select a category..."
            error={errors.category}
            onSelect={(val) => {
              setCategory(val);
              clearError("category");
            }}
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block">
            Service Description <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-[#080a12] rounded-lg p-1 border border-gray-200 dark:border-white/5">
            <button
              onClick={() => insertMarkdown('**', '**')}
              title="Bold"
              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-zinc-400 transition"
            >
              <Bold className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => insertMarkdown('*', '*')}
              title="Italic"
              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-zinc-400 transition"
            >
              <Italic className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => insertMarkdown('- ')}
              title="Bullet List"
              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-zinc-400 transition"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <div className="w-px h-4 bg-gray-300 dark:bg-white/10 mx-1" />
            <button
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              title={isPreviewMode ? "Edit Mode" : "Preview Mode"}
              className={`p-1.5 rounded transition flex items-center gap-1.5 px-2 ${
                isPreviewMode ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" : "hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-zinc-400"
              }`}
            >
              {isPreviewMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              <span className="text-[10px] font-bold">{isPreviewMode ? "Edit" : "Preview"}</span>
            </button>
          </div>
        </div>

        {isPreviewMode ? (
          <div className="w-full min-h-[160px] rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-4 py-3 text-sm text-gray-900 dark:text-zinc-200 shadow-inner overflow-auto custom-scrollbar prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-li:my-0">
            {description.trim() ? (
              <div dangerouslySetInnerHTML={{ __html: description.replace(/\n/g, "<br/>").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\*(.*?)\*/g, "<em>$1</em>") }} />
            ) : (
              <span className="text-gray-400 dark:text-zinc-500 italic">No description provided yet...</span>
            )}
          </div>
        ) : (
          <textarea
            ref={descriptionRef}
            placeholder="Describe what you are offering. Markdown is supported (e.g. **bold**, *italic*, - list)..."
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              clearError("description");
            }}
            className={`w-full min-h-[160px] rounded-xl border bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-3.5 py-3 text-sm text-gray-900 dark:text-white transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none resize-y custom-scrollbar ${
              errors.description ? "border-red-500/50 focus:border-red-500" : "border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 focus:border-blue-500/50"
            }`}
          />
        )}
        {errors.description && <p className="text-[11px] text-red-400 mt-1">{errors.description}</p>}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-white/5">
        <button
          onClick={onDiscard}
          className="text-xs font-bold text-gray-500 hover:text-red-500 transition-colors px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10"
        >
          Discard Draft
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2.5 text-xs font-bold text-white transition-all hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-95"
        >
          Continue <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default CreateCoreInfo;
