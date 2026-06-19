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
import ConfirmationModal from "@/components/ui/ConfirmationModal";

const sampleUserTeams = [
  { id: "team-01", name: "Alpha Developers Lab" },
  { id: "team-02", name: "Nexus Design Studio" },
];

const categories = ["Social", "YouTube", "Corporate", "Events", "Design", "Development"];
const difficulties = ["Beginner", "Intermediate", "Expert"];

interface StepConfig {
  id: number;
  label: string;
}

const WIZARD_STEPS: StepConfig[] = [
  { id: 1, label: "Core Info" },
  { id: 2, label: "Budget & Skills" },
  { id: 3, label: "Review & Post" },
];

export const CreateJobWizard: React.FC = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState<number>(1);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);

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

  const handleDiscardTrigger = () => {
      setIsDiscardOpen(true);
  };

  const handleConfirmDiscard = () => {
      setIsDiscardOpen(false);
      navigate("/jobs");
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
            className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-widest transition shrink-0 focus:outline-none"
          >
            <ArrowLeft className="h-4 w-4" /> Return to Posts
          </button>

          {/* Stepper Assembly */}
          <div className="flex items-center w-full max-w-md mx-auto md:mx-0 relative justify-between z-0">
            {WIZARD_STEPS.map((step, idx) => {
              const isCompleted = currentSlide > step.id;
              const isActive = currentSlide === step.id;

              return (
                <React.Fragment key={step.id}>
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

              {/* Cover Image Upload */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Job Thumbnail Image</label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative h-44 w-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-4 cursor-pointer transition-all duration-300 ${
                    isDragging ? "border-blue-500 bg-blue-500/10" : previewUrl ? "border-white/20 bg-white/5" : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                  {previewUrl ? (
                    <div className="absolute inset-0 w-full h-full rounded-xl overflow-hidden group">
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover opacity-70" />
                    </div>
                  ) : (
                    <div className="text-center space-y-2 pointer-events-none">
                      <ImageIcon className="h-5 w-5 mx-auto text-zinc-400" />
                      <div className="text-xs text-zinc-400"><span className="font-bold text-blue-400">Click to browse file</span> or drop asset here</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Job Title */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Job Post Title <span className="text-red-500">*</span></label>
                  <span className="text-[10px] font-mono text-zinc-500">{title.length}/300</span>
                </div>
                <input type="text" maxLength={300} placeholder="e.g., Wedding Video Edit - Romantic Style" value={title} onChange={e => { setTitle(e.target.value); if(e.target.value.trim()) setErrors(prev => { const {title, ...r} = prev; return r; }); }} className={`w-full rounded-xl border bg-white/5 px-4 py-3 text-sm text-white outline-none focus:outline-none focus:ring-0 transition-all ${errors.title ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-blue-500/50"}`} />
                {errors.title && <p className="text-xs text-red-400">{errors.title}</p>}
              </div>

              {/* Job Description */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Job Post Description <span className="text-red-500">*</span></label>
                  <span className="text-[10px] font-mono text-zinc-500">{description.length}/2000</span>
                </div>
                <textarea rows={5} maxLength={2000} placeholder="Outline requirements, raw footage details, deliverables..." value={description} onChange={e => { setDescription(e.target.value); if(e.target.value.trim()) setErrors(prev => { const {description, ...r} = prev; return r; }); }} className={`w-full rounded-xl border bg-white/5 px-4 py-3 text-sm text-white outline-none focus:outline-none focus:ring-0 transition-all resize-none custom-scrollbar ${errors.description ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-blue-500/50"}`} />
                {errors.description && <p className="text-xs text-red-400">{errors.description}</p>}
              </div>

              {/* Dropdowns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Job Category <span className="text-red-500">*</span></label>
                  <select value={category} onChange={e => { setCategory(e.target.value); setErrors(prev => { const {category, ...r} = prev; return r; }); }} className={`w-full rounded-xl border bg-[#0d0f1a] px-4 py-3 text-sm text-white outline-none focus:outline-none focus:ring-0 transition-all ${errors.category ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-blue-500/50"}`}>
                    <option value="" disabled className="bg-[#0d0f1a] text-zinc-500">Select Category</option>
                    {categories.map(cat => <option key={cat} value={cat} className="bg-[#0d0f1a] text-white">{cat}</option>)}
                  </select>
                  {errors.category && <p className="text-xs text-red-400">{errors.category}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Job Difficulty <span className="text-red-500">*</span></label>
                  <select value={difficulty} onChange={e => { setDifficulty(e.target.value); setErrors(prev => { const {difficulty, ...r} = prev; return r; }); }} className={`w-full rounded-xl border bg-[#0d0f1a] px-4 py-3 text-sm text-white outline-none focus:outline-none focus:ring-0 transition-all ${errors.difficulty ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-blue-500/50"}`}>
                    <option value="" disabled className="bg-[#0d0f1a] text-zinc-500">Select Competency Level</option>
                    {difficulties.map(diff => <option key={diff} value={diff} className="bg-[#0d0f1a] text-white">{diff}</option>)}
                  </select>
                  {errors.difficulty && <p className="text-xs text-red-400">{errors.difficulty}</p>}
                </div>
              </div>

              {/* Posting Entity */}
              <div className="space-y-3 pt-2 border-t border-white/5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Job Posting As</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer select-none transition-all ${postingAs === 'self' ? 'border-blue-500 bg-blue-500/5' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
                    <input type="radio" name="postingAs" checked={postingAs === "self"} onChange={() => setPostingAs("self")} className="accent-blue-500 h-4 w-4 outline-none focus:ring-0" />
                    <div><p className="text-sm font-bold">Individual (Self)</p></div>
                  </label>
                  <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer select-none transition-all ${postingAs === 'team' ? 'border-blue-500 bg-blue-500/5' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
                    <input type="radio" name="postingAs" checked={postingAs === "team"} onChange={() => setPostingAs("team")} className="accent-blue-500 h-4 w-4 outline-none focus:ring-0" />
                    <div><p className="text-sm font-bold">Shared Studio Team</p></div>
                  </label>
                </div>
                {postingAs === "team" && (
                  <div className="pt-2 animate-fade-in">
                    <select value={selectedTeam} onChange={e => { setSelectedTeam(e.target.value); setErrors(prev => { const {selectedTeam, ...r} = prev; return r; }); }} className={`w-full rounded-xl border bg-[#0d0f1a] px-4 py-3 text-sm text-white outline-none focus:outline-none focus:ring-0 transition-all ${errors.selectedTeam ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-blue-500/50"}`}>
                      <option value="" disabled className="bg-[#0d0f1a] text-zinc-500">Select Team with Posting Permissions...</option>
                      {sampleUserTeams.map(t => <option key={t.id} value={t.name} className="bg-[#0d0f1a] text-white">{t.name}</option>)}
                    </select>
                    {errors.selectedTeam && <p className="text-xs text-red-400 mt-1">{errors.selectedTeam}</p>}
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="pt-6 border-t border-white/5 flex gap-3">
                <button type="button" onClick={handleDiscardTrigger} className="px-5 rounded-xl border border-white/10 text-zinc-400 font-bold hover:text-red-400 hover:border-red-500/30 transition text-sm focus:outline-none">Discard Changes</button>
                <button type="button" onClick={handleNextSlide} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-500 py-3.5 text-sm font-bold text-white hover:bg-blue-600 transition focus:outline-none">Confirm and Next <ArrowRight className="h-4 w-4" /></button>
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

              {/* Skills Tags */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Job Required Skills <span className="text-red-500">*</span></label>
                  <span className="text-[10px] text-zinc-500">{skills.length}/6 Added</span>
                </div>
                <form onSubmit={handleAddSkill} className="flex gap-2">
                  <input type="text" placeholder="e.g., Color Grading, Audio Sync" value={skillInput} onChange={e => setSkillInput(e.target.value)} className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:outline-none focus:ring-0 focus:border-blue-500/50 transition-all" />
                  <button type="submit" className="px-5 rounded-xl bg-white/10 border border-white/10 text-xs font-bold hover:bg-white/20 transition text-white focus:outline-none">Add</button>
                </form>
                {errors.skills && <p className="text-xs text-red-400">{errors.skills}</p>}
                <div className="flex flex-wrap gap-2 pt-1">
                  {skills.map(s => (
                    <span key={s} className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400">
                      {s} <X className="h-3 w-3 cursor-pointer hover:text-white" onClick={() => handleRemoveSkill(s)} />
                    </span>
                  ))}
                </div>
              </div>

              {/* Budget Estimation Range */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Budget Estimate Range <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-500 text-[10px] font-bold select-none">₱</div>
                    <input type="text" placeholder="Min Value" value={formatCommaString(minBudget)} onChange={e => { setMinBudget(e.target.value.replace(/\D/g, "")); setErrors(prev => { const {minBudget, ...r} = prev; return r; }); }} className={`w-full rounded-xl border bg-white/5 pl-8 pr-4 py-3 text-sm text-white outline-none focus:outline-none focus:ring-0 transition-all ${errors.minBudget ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-blue-500/50"}`} />
                    {errors.minBudget && <p className="text-xs text-red-400 mt-1">{errors.minBudget}</p>}
                  </div>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-500 text-[10px] font-bold select-none">₱</div>
                    <input type="text" placeholder="Max Value" value={formatCommaString(maxBudget)} onChange={e => { setMaxBudget(e.target.value.replace(/\D/g, "")); setErrors(prev => { const {maxBudget, ...r} = prev; return r; }); }} className={`w-full rounded-xl border bg-white/5 pl-8 pr-4 py-3 text-sm text-white outline-none focus:outline-none focus:ring-0 transition-all ${errors.maxBudget ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-blue-500/50"}`} />
                    {errors.maxBudget && <p className="text-xs text-red-400 mt-1">{errors.maxBudget}</p>}
                  </div>
                </div>
              </div>

              {/* Timelines Range */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Project Timeline Range (Days) <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <input type="number" placeholder="Min Days" value={minTimeline} onChange={e => { setMinTimeline(e.target.value); setErrors(prev => { const {minTimeline, ...r} = prev; return r; }); }} className={`w-full rounded-xl border bg-white/5 px-4 py-3 text-sm text-white outline-none focus:outline-none focus:ring-0 transition-all ${errors.minTimeline ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-blue-500/50"}`} />
                    {errors.minTimeline && <p className="text-xs text-red-400 mt-1">{errors.minTimeline}</p>}
                  </div>
                  <div>
                    <input type="number" placeholder="Max Days" value={maxTimeline} onChange={e => { setMaxTimeline(e.target.value); setErrors(prev => { const {maxTimeline, ...r} = prev; return r; }); }} className={`w-full rounded-xl border bg-white/5 px-4 py-3 text-sm text-white outline-none focus:outline-none focus:ring-0 transition-all ${errors.maxTimeline ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-blue-500/50"}`} />
                    {errors.maxTimeline && <p className="text-xs text-red-400 mt-1">{errors.maxTimeline}</p>}
                  </div>
                </div>
              </div>

              {/* Positions Count Block */}
              <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-between">
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Positions Needed</label>
                  <span className="text-[10px] text-zinc-500">Number of open assignment slots.</span>
                </div>
                <div className="flex items-center gap-3 border border-white/10 rounded-xl bg-[#080a12] p-1.5">
                  <button type="button" onClick={() => setPositions(prev => Math.max(1, prev - 1))} className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/5 text-white focus:outline-none"><Minus className="h-3.5 w-3.5" /></button>
                  <span className="w-8 text-center font-mono font-bold text-sm select-none">{positions}</span>
                  <button type="button" onClick={() => setPositions(prev => prev + 1)} className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/5 text-white focus:outline-none"><Plus className="h-3.5 w-3.5" /></button>
                </div>
              </div>

              {/* Slide 2 Navigation Actions */}
              <div className="pt-6 border-t border-white/5 flex gap-3">
                <button type="button" onClick={() => setCurrentSlide(1)} className="px-5 rounded-xl border border-white/10 text-zinc-400 font-bold hover:text-white transition text-sm focus:outline-none">Go Back</button>
                <button type="button" onClick={handleSlide2Advance} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-500 py-3.5 text-sm font-bold text-white hover:bg-blue-600 transition focus:outline-none">
                  Confirm and Review <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* SLIDE 3: COMPREHENSIVE JOB REVIEW       */}
          {/* ======================================= */}
          {currentSlide === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Review Your Job Post</h2>
                <p className="text-xs text-zinc-400">Confirm matching baseline metrics are correct before casting parameters to freelancers.</p>
              </div>

              <div className="space-y-4 text-xs">
                {/* Core Specifications Box */}
                <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.01] space-y-3">
                  <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                    <span className="font-bold text-blue-400 uppercase tracking-wider text-[10px]">01. Core Specifications</span>
                    <button type="button" onClick={() => setCurrentSlide(1)} className="text-[10px] text-blue-500 hover:underline font-bold transition focus:outline-none">Edit</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {previewUrl && (
                      <div className="aspect-video rounded-xl overflow-hidden border border-white/10 max-h-24 sm:col-span-1">
                        <img src={previewUrl} alt="Thumbnail Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="sm:col-span-2 space-y-1">
                      <h4 className="text-sm font-bold text-white">{title || <span className="text-red-400 italic">No Title Given</span>}</h4>
                      <p className="text-zinc-400 line-clamp-3 leading-relaxed text-[11px]">{description}</p>
                      <div className="flex gap-4 pt-1.5 text-zinc-500">
                        <span>Category: <strong className="text-zinc-300">{category}</strong></span>
                        <span>Competency Target: <strong className="text-zinc-300">{difficulty}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Budget & Scope Parameters */}
                <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.01] space-y-4">
                  <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                    <span className="font-bold text-blue-400 uppercase tracking-wider text-[10px]">02. Budget Framework & Parameters</span>
                    <button type="button" onClick={() => setCurrentSlide(2)} className="text-[10px] text-blue-500 hover:underline font-bold transition focus:outline-none">Edit</button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <span className="text-zinc-500 block mb-0.5">Budget Pool Range</span>
                      <span className="text-sm font-bold text-yellow-500">₱{formatCommaString(minBudget)} ~ ₱{formatCommaString(maxBudget)}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block mb-0.5">Timeline Envelope</span>
                      <span className="text-sm font-bold text-white font-mono">{minTimeline} - {maxTimeline} Days</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block mb-0.5">Positions Open</span>
                      <span className="text-sm font-bold text-white font-mono">{positions} Slots</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block mb-0.5">Publish Entity Context</span>
                      <span className="text-sm font-bold text-zinc-300">{postingAs === 'self' ? 'Personal Profile' : selectedTeam}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/5">
                    <span className="text-zinc-500 block mb-1.5">Target Mandatory Skills:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map(s => (
                        <span key={s} className="px-2.5 py-0.5 rounded-md bg-blue-500/5 border border-blue-500/10 text-blue-400 text-[10px] font-semibold">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Slide 3 Navigation Footer Actions */}
              <div className="pt-6 border-t border-white/5 flex gap-3">
                <button type="button" onClick={() => setCurrentSlide(2)} className="px-5 rounded-xl border border-white/10 text-zinc-400 font-bold hover:text-white transition text-sm focus:outline-none">Go Back</button>
                <button type="button" onClick={handleSubmit} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-500 py-3.5 text-sm font-bold text-white hover:bg-blue-600 transition shadow-lg shadow-blue-500/20 focus:outline-none">
                  <Check className="h-4 w-4" /> Deploy Active Job Post
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      <SuccessModal
        isOpen={isSuccessOpen}
        message="Your job post is now live. Freelancers can now send their applications and you'll be notified."
        onConfirm={() => navigate("/jobs")}
      />

      <ConfirmationModal
          isOpen={isDiscardOpen}
          message="Are you sure you want to discard your changes? All current inputs will be permanently lost."
          onConfirm={handleConfirmDiscard}
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

export default CreateJobWizard;