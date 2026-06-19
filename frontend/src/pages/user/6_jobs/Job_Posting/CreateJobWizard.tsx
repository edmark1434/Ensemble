import React, { useState, useRef, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  Image as ImageIcon,
  Plus,
  Minus,
} from "lucide-react";
import UserHeader from "@/components/nav/user_header";
import SuccessModal from "@/components/ui/SuccessModal";

// Dummy data for teams the user belongs to with posting permissions
const sampleUserTeams = [
  { id: "team-01", name: "Alpha Developers Lab" },
  { id: "team-02", name: "Nexus Design Studio" },
];

const categories = ["Social", "YouTube", "Corporate", "Events", "Design", "Development"];
const difficulties = ["Beginner", "Intermediate", "Expert"];

// --- STEPPER CONFIGURATION ---
interface StepConfig {
  id: number;
  label: string;
}

const WIZARD_STEPS: StepConfig[] = [
  { id: 1, label: "Core Info" },
  { id: 2, label: "Budget & Skills" },
];

export const CreateJobWizard: React.FC = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState<number>(1);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);

  // --- SLIDE 1 STATES ---
  const [thumbnail, setThumbnail] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // --- UTILITY: CURRENCY COMMA FORMATTER ---
  const formatCommaString = (val: string) => {
    const clean = val.replace(/\D/g, "");
    if (!clean) return "";
    return Number(clean).toLocaleString();
  };

  const getRawNumber = (val: string) => {
    return parseInt(val.replace(/\D/g, "")) || 0;
  };

  // --- THUMBNAIL DRAG & DROP HANDLERS ---
  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
      return;
    }
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setThumbnail(localUrl);
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

  // --- SKILLS TAGS HANDLERS ---
  const handleAddSkill = (e: FormEvent) => {
    e.preventDefault();
    const cleanInput = skillInput.trim();
    if (!cleanInput) return;

    if (skills.length >= 6) {
      setErrors(prev => ({ ...prev, skills: "You can add a maximum of 6 skills." }));
      return;
    }
    if (skills.includes(cleanInput)) {
      setErrors(prev => ({ ...prev, skills: "This skill has already been added." }));
      return;
    }

    const updatedSkills = [...skills, cleanInput];
    setSkills(updatedSkills);
    setSkillInput("");

    if (updatedSkills.length >= 3) {
      setErrors(prev => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { skills: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    const updatedSkills = skills.filter(s => s !== skillToRemove);
    setSkills(updatedSkills);
    if (updatedSkills.length < 3) {
      setErrors(prev => ({ ...prev, skills: `At least 3 skills are required (${3 - updatedSkills.length} more needed).` }));
    }
  };

  // --- STEP VALIDATION PROGRESION ---
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

  const handleDiscard = () => {
    if (window.confirm("Are you sure you want to discard your changes and return to jobs?")) {
      navigate("/jobs");
    }
  };

  const handleSubmit = () => {
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

    const finalJobPayload = {
      title,
      description,
      category,
      difficulty,
      status: "Open",
      postingAs: postingAs === "self" ? "Self" : selectedTeam,
      skills,
      priceRange: `₱${formatCommaString(minBudget)} ~ ₱${formatCommaString(maxBudget)}`,
      minBudget: rawMinBudget,
      timeline: `${minTimeline}-${maxTimeline} Days`,
      positionsNeeded: positions,
      thumbnail: thumbnail || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80",
    };

    console.log("Submitting New Job Post Data:", finalJobPayload);
    setIsSuccessOpen(true);
  };

  return (
    <div className="w-full min-h-screen bg-[#080a12] text-white overflow-x-hidden">
      <UserHeader pageTitle="Create a Job Post" credits={1250} />

      <div className="mx-auto max-w-3xl p-6 md:p-8 w-full">
        {/* Navigation Action Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <button
            onClick={() => navigate("/jobs")}
            className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-widest transition shrink-0"
          >
            <ArrowLeft className="h-4 w-4" /> Return to Posts
          </button>

          {/* ========================================================================= */}
          {/* DYNAMIC CONFIGURABLE STEPPER ENGINE (WITH LAYER STACKING FIX)             */}
          {/* ========================================================================= */}
          <div className="flex items-center w-full max-w-md mx-auto md:mx-0 relative justify-between z-0">
            {WIZARD_STEPS.map((step, idx) => {
              const isCompleted = currentSlide > step.id;
              const isActive = currentSlide === step.id;

              return (
                <React.Fragment key={step.id}>
                  {/* Step Unit Block */}
                  <div className="flex flex-col items-center relative z-10 select-none">
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center border text-xs font-bold transition-all duration-300 shadow-md ${
                        isCompleted
                          ? "bg-green-500 border-green-500 text-[#080a12]"
                          : isActive
                          ? "bg-blue-500/20 border-blue-500 text-blue-400 ring-4 ring-blue-500/10"
                          : "bg-[#0d0f1a] border-white/10 text-zinc-500"
                      }`}
                    >
                      {isCompleted ? <Check className="h-4 w-4 stroke-" /> : step.id}
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider mt-2 transition-colors absolute -bottom-5 whitespace-nowrap ${
                        isActive ? "text-blue-400" : isCompleted ? "text-green-400" : "text-zinc-500"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>

                  {/* Interconnecting Process Track Connector Line */}
                  {idx < WIZARD_STEPS.length - 1 && (
                    <div className="flex-1 h-[2px] bg-white/5 mx-4 relative top-[-6px] z-0">
                      <div
                        className="absolute inset-y-0 left-0 bg-green-500 transition-all duration-500"
                        style={{ width: isCompleted ? "100%" : "0%" }}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Form Container Wrapper Block */}
        <div className="rounded-3xl border border-white/10 bg-[#0d0f1a]/60 p-6 md:p-8 backdrop-blur-md shadow-2xl space-y-6 mt-4">

          {/* ======================================= */}
          {/* SLIDE 1: CORE DETAILS                   */}
          {/* ======================================= */}
          {currentSlide === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Job Core Specifications</h2>
                <p className="text-xs text-zinc-400">Provide fundamental background criteria for your project timeline assignment.</p>
              </div>

              {/* Dynamic Drag and Drop Thumbnail Upload Area */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Job Thumbnail Image</label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative h-44 w-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-4 cursor-pointer transition-all duration-300 ${
                    isDragging 
                      ? "border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.1)]" 
                      : previewUrl 
                        ? "border-white/20 bg-white/5" 
                        : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]"
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
                    <div className="absolute inset-0 w-full h-full rounded-xl overflow-hidden group">
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover opacity-70 group-hover:opacity-40 transition-opacity" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 backdrop-blur-xs">
                        <p className="text-xs font-bold text-white bg-[#0d0f1a]/90 px-4 py-2 rounded-xl border border-white/10 shadow-xl">
                          Click or Drag to Replace Cover Image
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-2 pointer-events-none">
                      <div className="mx-auto h-12 w-12 rounded-full bg-white/5 flex items-center justify-center border border-white/5 text-zinc-400">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                      <div className="text-xs text-zinc-400">
                        <span className="font-bold text-blue-400">Click to browse file</span> or drop your image asset here
                      </div>
                      <p className="text-[10px] text-zinc-500">Supports PNG, JPG, JPEG or WEBP files</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Job Title */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Job Post Title <span className="text-red-500">*</span>
                  </label>
                  <span className={`text-[10px] font-mono ${title.length > 300 ? "text-red-400 font-bold" : "text-zinc-500"}`}>
                    {title.length}/300
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={320} // Soft buffer buffer check
                  placeholder="e.g., Wedding Video Edit - Romantic Style"
                  value={title}
                  onChange={e => {
                    setTitle(e.target.value);
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    if(e.target.value.trim()) setErrors(prev => { const {title, ...r} = prev; return r; });
                  }}
                  className={`w-full rounded-xl border bg-white/5 px-4 py-3 text-sm text-white focus:outline-none transition-all ${
                    errors.title ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-blue-500/50"
                  }`}
                />
                {errors.title && <p className="text-xs font-medium text-red-400 animate-fade-in">{errors.title}</p>}
              </div>

              {/* Job Description */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Job Post Description <span className="text-red-500">*</span>
                  </label>
                  <span className={`text-[10px] font-mono ${description.length > 2000 ? "text-red-400 font-bold" : "text-zinc-500"}`}>
                    {description.length}/2000
                  </span>
                </div>
                <textarea
                  rows={5}
                  maxLength={2100}
                  placeholder="Outline requirements, raw footage details, expected deliverables..."
                  value={description}
                  onChange={e => {
                    setDescription(e.target.value);
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    if(e.target.value.trim()) setErrors(prev => { const {description, ...r} = prev; return r; });
                  }}
                  className={`w-full rounded-xl border bg-white/5 px-4 py-3 text-sm text-white focus:outline-none transition-all resize-none custom-scrollbar ${
                    errors.description ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-blue-500/50"
                  }`}
                />
                {errors.description && <p className="text-xs font-medium text-red-400 animate-fade-in">{errors.description}</p>}
              </div>

              {/* Category & Difficulty Dropdowns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Job Post Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={e => {
                      setCategory(e.target.value);
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      setErrors(prev => { const {category, ...r} = prev; return r; });
                    }}
                    className={`w-full rounded-xl border bg-[#0d0f1a] px-4 py-3 text-sm text-white focus:outline-none transition-all ${
                      errors.category ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-blue-500/50"
                    }`}
                  >
                    <option value="" disabled>Select Category</option>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  {errors.category && <p className="text-xs font-medium text-red-400">{errors.category}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Job Post Difficulty <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={difficulty}
                    onChange={e => {
                      setDifficulty(e.target.value);
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      setErrors(prev => { const {difficulty, ...r} = prev; return r; });
                    }}
                    className={`w-full rounded-xl border bg-[#0d0f1a] px-4 py-3 text-sm text-white focus:outline-none transition-all ${
                      errors.difficulty ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-blue-500/50"
                    }`}
                  >
                    <option value="" disabled>Select Competency Level</option>
                    {difficulties.map(diff => <option key={diff} value={diff}>{diff}</option>)}
                  </select>
                  {errors.difficulty && <p className="text-xs font-medium text-red-400">{errors.difficulty}</p>}
                </div>
              </div>

              {/* Posting Entity Selection Row */}
              <div className="space-y-3 pt-2 border-t border-white/5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Job Posting As</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${postingAs === 'self' ? 'border-blue-500 bg-blue-500/5' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
                    <input type="radio" name="postingAs" checked={postingAs === "self"} onChange={() => setPostingAs("self")} className="accent-blue-500 h-4 w-4" />
                    <div>
                      <p className="text-sm font-bold">Individual (Self)</p>
                      <p className="text-[10px] text-zinc-500">Post using your direct user profile identity</p>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${postingAs === 'team' ? 'border-blue-500 bg-blue-500/5' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
                    <input type="radio" name="postingAs" checked={postingAs === "team"} onChange={() => setPostingAs("team")} className="accent-blue-500 h-4 w-4" />
                    <div>
                      <p className="text-sm font-bold">Shared Studio Team</p>
                      <p className="text-[10px] text-zinc-500">Publish under an organized collective</p>
                    </div>
                  </label>
                </div>

                {/* Accountable Team Entity Dropdown Target */}
                {postingAs === "team" && (
                  <div className="pt-2 animate-fade-in">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1.5">Select Accountable Team Entity</label>
                    <select
                      value={selectedTeam}
                      onChange={e => {
                        setSelectedTeam(e.target.value);
                          // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        setErrors(prev => { const {selectedTeam, ...r} = prev; return r; });
                      }}
                      className={`w-full rounded-xl border bg-[#0d0f1a] px-4 py-3 text-sm text-white focus:outline-none transition-all ${
                        errors.selectedTeam ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-blue-500/50"
                      }`}
                    >
                      <option value="" disabled>Select Team with Posting Permissions...</option>
                      {sampleUserTeams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                    </select>
                    {errors.selectedTeam && <p className="text-xs font-medium text-red-400 mt-1">{errors.selectedTeam}</p>}
                  </div>
                )}
              </div>

              {/* Slide 1 Navigation Footer Actions */}
              <div className="pt-6 border-t border-white/5 flex gap-3">
                <button type="button" onClick={handleDiscard} className="px-5 rounded-xl border border-white/10 text-zinc-400 font-bold hover:text-red-400 hover:border-red-500/20 transition text-sm">
                  Discard Changes
                </button>
                <button
                  type="button"
                  onClick={handleNextSlide}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-500 py-3.5 text-sm font-bold text-white hover:bg-blue-600 transition dynamic-button"
                >
                  Confirm and Next <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* SLIDE 2: BUDGET & SKILLS REQS           */}
          {/* ======================================= */}
          {currentSlide === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Budget Allocation & Requirements</h2>
                <p className="text-xs text-zinc-400">Establish operational metric scopes, timelines and targeted skill sets.</p>
              </div>

              {/* Required Technical Skills Form Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Job Required Skills <span className="text-red-500">*</span>
                    <span className="text-[10px] text-zinc-500 normal-case ml-2">(3 to 6 tags allowed)</span>
                  </label>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {skills.length}/6 Added
                  </span>
                </div>
                <form onSubmit={handleAddSkill} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Press enter or click Add (e.g., Color Grading, Audio Sync)"
                    value={skillInput}
                    onChange={e => setSkillInput(e.target.value)}
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
                  />
                  <button type="submit" className="px-5 rounded-xl bg-white/10 border border-white/10 text-xs font-bold hover:bg-white/20 transition">Add</button>
                </form>

                {errors.skills && <p className="text-xs font-medium text-red-400">{errors.skills}</p>}

                <div className="flex flex-wrap gap-2 pt-1">
                  {skills.length === 0 && <span className="text-xs text-zinc-500 italic">No target tags specified yet.</span>}
                  {skills.map(s => (
                    <span key={s} className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400">
                      {s}
                      <X className="h-3 w-3 cursor-pointer hover:text-white transition-colors" onClick={() => handleRemoveSkill(s)} />
                    </span>
                  ))}
                </div>
              </div>

              {/* Budget Range Section */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Budget Estimate Range <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Min Budget Input Box */}
                  <div className="space-y-1 relative">
                    <div className="relative">
                      {/* Gold Credit Icon Placeholder */}
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center h-4 w-4 rounded-full border border-yellow-500/60 text-yellow-500 bg-yellow-500/5 text-[10px] font-bold">
                        $
                      </div>
                      <input
                        type="text"
                        placeholder="Min Value"
                        value={formatCommaString(minBudget)}
                        onChange={e => {
                          setMinBudget(e.target.value.replace(/\D/g, ""));
                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                          setErrors(prev => { const {minBudget, ...r} = prev; return r; });
                        }}
                        className={`w-full rounded-xl border bg-white/5 pl-10 pr-4 py-3 text-sm text-white focus:outline-none transition-all ${
                          errors.minBudget ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-blue-500/50"
                        }`}
                      />
                    </div>
                    {errors.minBudget && <p className="text-xs font-medium text-red-400">{errors.minBudget}</p>}
                  </div>

                  {/* Max Budget Input Box */}
                  <div className="space-y-1 relative">
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center h-4 w-4 rounded-full border border-yellow-500/60 text-yellow-500 bg-yellow-500/5 text-[10px] font-bold">
                        $
                      </div>
                      <input
                        type="text"
                        placeholder="Max Value"
                        value={formatCommaString(maxBudget)}
                        onChange={e => {
                          setMaxBudget(e.target.value.replace(/\D/g, ""));
                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                          setErrors(prev => { const {maxBudget, ...r} = prev; return r; });
                        }}
                        className={`w-full rounded-xl border bg-white/5 pl-10 pr-4 py-3 text-sm text-white focus:outline-none transition-all ${
                          errors.maxBudget ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-blue-500/50"
                        }`}
                      />
                    </div>
                    {errors.maxBudget && <p className="text-xs font-medium text-red-400">{errors.maxBudget}</p>}
                  </div>
                </div>
              </div>

              {/* Timeline Min/Max Block */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Project Timeline Range (Days) <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <input
                      type="number"
                      placeholder="Min Days"
                      value={minTimeline}
                      onChange={e => {
                        setMinTimeline(e.target.value);
                          // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        setErrors(prev => { const {minTimeline, ...r} = prev; return r; });
                      }}
                      className={`w-full rounded-xl border bg-white/5 px-4 py-3 text-sm text-white focus:outline-none transition-all ${
                        errors.minTimeline ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-blue-500/50"
                      }`}
                    />
                    {errors.minTimeline && <p className="text-xs font-medium text-red-400">{errors.minTimeline}</p>}
                  </div>

                  <div className="space-y-1">
                    <input
                      type="number"
                      placeholder="Max Days"
                      value={maxTimeline}
                      onChange={e => {
                        setMaxTimeline(e.target.value);
                          // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        setErrors(prev => { const {maxTimeline, ...r} = prev; return r; });
                      }}
                      className={`w-full rounded-xl border bg-white/5 px-4 py-3 text-sm text-white focus:outline-none transition-all ${
                        errors.maxTimeline ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-blue-500/50"
                      }`}
                    />
                    {errors.maxTimeline && <p className="text-xs font-medium text-red-400">{errors.maxTimeline}</p>}
                  </div>
                </div>
              </div>

              {/* Counter Stepper for Positions Needed */}
              <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-between">
                <div className="text-left">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Positions Needed</label>
                  <span className="text-[10px] text-zinc-500">Number of open matching target assignment slots.</span>
                </div>
                <div className="flex items-center gap-3 border border-white/10 rounded-xl bg-[#080a12] p-1.5">
                  <button
                    type="button"
                    onClick={() => setPositions(prev => Math.max(1, prev - 1))}
                    className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 text-white transition active:scale-95"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-8 text-center font-mono font-bold text-sm">{positions}</span>
                  <button
                    type="button"
                    onClick={() => setPositions(prev => prev + 1)}
                    className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 text-white transition active:scale-95"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Slide 2 Navigation Control Actions */}
              <div className="pt-6 border-t border-white/5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentSlide(1)}
                  className="px-5 rounded-xl border border-white/10 text-zinc-400 font-bold hover:text-white transition text-sm flex items-center gap-2"
                >
                  Go Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-500 py-3.5 text-sm font-bold text-white hover:bg-blue-600 transition shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                >
                  <Check className="h-4 w-4" /> Confirm and Post Job
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Reusable Success Notification Overlay */}
      <SuccessModal
        isOpen={isSuccessOpen}
        message="Your job post is now live. Freelancers can now send their applications and you'll be notified."
        onConfirm={() => navigate("/jobs")}
      />

      {/* Scrollbar overrides for textareas inline */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
};

export default CreateJobWizard;