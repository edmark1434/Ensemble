import React, { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Save, X, ChevronDown, Check, CircleDollarSign, Briefcase, Lock, Image as ImageIcon, Info, Plus, Trash2 } from "lucide-react";
import ShapeGrid from "@/components/ui/ShapeGrid";
import { useJobs } from "@/hooks/useJobs";
import PopupConfirmReturn from "../job_components/job_popups/popup_confirm_return";
import CreationSuccess from "../job_components/job_creation_components/4_creation_success";
import { categories, difficulties } from "../job_components/job_creation_components/1_create_coreinfo";
import type { Job } from "../job_components/job_lists";

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
      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`w-full flex items-center justify-between rounded-xl border bg-[#0d0f1a] px-3.5 py-2.5 text-xs text-left transition-all ${
            error
              ? "border-red-500/50 focus:border-red-500"
              : isOpen
              ? "border-blue-500 ring-2 ring-blue-500/10"
              : "border-white/10 hover:border-white/20"
          }`}
        >
          <span className={value ? "text-white font-medium" : "text-zinc-500"}>
            {value || placeholder}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-zinc-400 transition-transform duration-200 ${
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
                className="absolute left-0 right-0 z-30 max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-[#0d0f1a] p-1.5 shadow-2xl space-y-0.5 custom-scrollbar"
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
                          : "text-zinc-300 hover:bg-white/5 hover:text-white"
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
  const [priceRange, setPriceRange] = useState("");
  const [positionsNeeded, setPositionsNeeded] = useState<number>(1);
  const [hiredCount, setHiredCount] = useState<number>(0);

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
          setSkills(found.tags || []);
          setPriceRange(`₱${found.rate_credits_min?.toLocaleString() || 0} ~ ₱${found.rate_credits_max?.toLocaleString() || 0}`);
          setPositionsNeeded(found.no_of_hires || 1);
          setHiredCount(parseInt(found.hired_count) || 0);
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

  // Thumbnail Handlers
  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
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
      };

      if (!id) throw new Error("Job ID missing");

      await updateJob(id, updatedPayload);
      setIsSuccessOpen(true);
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, submit: err.message || "Failed to update job post." }));
    } finally {
      setIsSubmitting(false);
    }
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

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 mx-auto max-w-3xl p-6 md:p-8 w-full space-y-6"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Edit Job Post
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Modify requirements and details for job listing ID <span className="font-mono text-blue-400">{id}</span>
            </p>
          </div>

          <button
            onClick={handleReturnTrigger}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-800/80 hover:bg-zinc-700/80 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition shrink-0 shadow-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return</span>
          </button>
        </div>

        {/* Main Form Box */}
        <div className="rounded-3xl border border-white/10 bg-[#0d0f1a]/80 p-6 md:p-8 backdrop-blur-xl shadow-2xl space-y-5 text-left">

          {/* Read-Only Fixed Parameters Notice */}
          <div className="p-3.5 rounded-2xl border border-white/5 bg-white/[0.02] grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mb-2">
            <div className="flex items-center gap-2.5 text-zinc-400">
              <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 shrink-0">
                <CircleDollarSign className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1">
                  Budget Pool <Lock className="h-2.5 w-2.5 text-zinc-500" />
                </span>
                <span className="font-bold text-white">{priceRange}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-zinc-400">
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
                <Briefcase className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1">
                  Positions Open <Lock className="h-2.5 w-2.5 text-zinc-500" />
                </span>
                <span className="font-bold text-white">{positionsNeeded} Slots</span>
              </div>
            </div>
          </div>

          {/* Read-Only Explanation Alert */}
          <div className="flex items-start gap-2.5 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3.5 mb-2 shadow-inner mt-1">
            <div className="mt-0.5 rounded-full bg-blue-500/20 p-1 text-blue-400 shrink-0 shadow-[0_0_10px_rgba(59,130,246,0.3)]">
              <Info className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-300">Why are these locked?</p>
              <p className="text-[11px] text-blue-200/70 mt-1 leading-relaxed">
                Budget pools and available positions cannot be modified after a job is posted. This prevents disputes and ensures consistency for freelancers who have already submitted or are currently drafting proposals based on your original terms.
              </p>
            </div>
          </div>

          {/* Editable Thumbnail */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Job Thumbnail Image <span className="text-red-500">*</span>
              </label>
            </div>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative h-32 w-full rounded-xl border border-dashed flex items-center justify-center p-3 cursor-pointer transition-all duration-200 group overflow-hidden ${
                isDragging ? "border-blue-500 bg-blue-500/10" : errors.thumbnail ? "border-red-500 bg-red-500/5" : previewUrl ? "border-white/20 bg-zinc-900" : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
              {previewUrl ? (
                <>
                  <img src={previewUrl} alt="Thumbnail Preview" className="absolute inset-0 w-full h-full object-cover opacity-70 transition-all duration-300 group-hover:blur-sm group-hover:opacity-40" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="h-8 w-8 rounded-full bg-black/60 flex items-center justify-center mb-1">
                      <ImageIcon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">Change Image</span>
                  </div>
                </>
              ) : (
                <div className="text-center space-y-1 pointer-events-none">
                  <ImageIcon className="h-4 w-4 mx-auto text-zinc-400" />
                  <div className="text-xs text-zinc-400"><span className="font-bold text-blue-400">Click to browse file</span> or drop asset here</div>
                </div>
              )}
            </div>
            {errors.thumbnail && <p className="text-[11px] text-red-400">{errors.thumbnail}</p>}
          </div>

          {/* Job Title */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Job Post Title <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] font-mono text-zinc-500">{title.length}/300</span>
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
              className={`w-full rounded-xl border bg-white/5 px-3.5 py-2.5 text-xs text-white outline-none transition-all ${
                errors.title ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-blue-500/50"
              }`}
            />
            {errors.title && <p className="text-[11px] text-red-400">{errors.title}</p>}
          </div>

          {/* Job Description */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Job Post Description <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] font-mono text-zinc-500">{description.length}/2000</span>
            </div>
            <textarea
              rows={8}
              maxLength={2000}
              placeholder="Outline requirements, raw footage details, deliverables..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setIsDirty(true);
                if (e.target.value.trim()) setErrors((prev) => { const { description: _, ...r } = prev; return r; });
              }}
              className={`w-full min-h-[180px] rounded-xl border bg-white/5 px-3.5 py-3 text-xs text-white outline-none transition-all resize-y leading-relaxed custom-scrollbar ${
                errors.description ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-blue-500/50"
              }`}
            />
            {errors.description && <p className="text-[11px] text-red-400">{errors.description}</p>}
          </div>

          {/* Category & Difficulty Dropdowns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

          {/* Required Skills Management */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Required Skills <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-zinc-500">{skills.length}/6 Added</span>
            </div>
            <form onSubmit={handleAddSkill} className="flex gap-2">
              <input
                type="text"
                placeholder="e.g., Color Grading, Audio Sync"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs text-white outline-none focus:border-blue-500/50 transition-all"
              />
              <button
                type="submit"
                className="px-4 rounded-xl bg-white/10 border border-white/10 text-xs font-bold hover:bg-white/20 transition text-white focus:outline-none"
              >
                Add
              </button>
            </form>
            {errors.skills && <p className="text-[11px] text-red-400">{errors.skills}</p>}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {skills.map((s) => (
                <span
                  key={s}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-zinc-800 border border-white/10 text-zinc-300"
                >
                  {s}{" "}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-red-400 transition"
                    onClick={() => handleRemoveSkill(s)}
                  />
                </span>
              ))}
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-white/5 flex gap-2.5">
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
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block w-48 bg-black text-white text-[10px] p-2 rounded shadow-lg border border-white/10 z-10 text-center pointer-events-none">
                  Cannot delete a job post that already has positions filled.
                </div>
              )}
            </div>
            <div className="flex-1 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={handleReturnTrigger}
                className="px-4 py-2.5 rounded-xl border border-white/10 text-zinc-400 font-bold hover:text-white transition text-xs focus:outline-none"
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
      />
    </div>
  );
};

export default JobEditPostPage;