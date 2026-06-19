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
  MoveUp,
  MoveDown,
  Layers,
  HelpCircle
} from "lucide-react";
import UserHeader from "@/components/nav/user_header";
import SuccessModal from "@/components/ui/SuccessModal";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import { TERMS_OF_SERVICE_DATA } from "@/data/termsOfServiceData";

const sampleUserTeams = [
  { id: "team-01", name: "Alpha Developers Lab" },
  { id: "team-02", name: "Nexus Design Studio" },
];

const categories = ["Social", "YouTube", "Corporate", "Events", "Design", "Development"];

interface StepConfig {
  id: number;
  label: string;
}

const WIZARD_STEPS: StepConfig[] = [
  { id: 1, label: "Core Scope" },
  { id: 2, label: "Skills & Assets" },
  { id: 3, label: "Milestones" },
  { id: 4, label: "Pricing Tiers" },
  { id: 5, label: "Requirements" },
  { id: 6, label: "Review & Post" },
];

interface Milestone {
  id: string;
  name: string;
  description: string;
}

interface Tier {
  id: string;
  title: string;
  name: string;
  price: string;
  description: string;
  deliveryDays: string;
  revisions: number;
}

interface Question {
  id: string;
  text: string;
  type: "Multiple Choice" | "Text Input" | "File Upload" | "Fill in the Blank";
  isRequired: boolean;
  options?: string[]; // Holds strings for multi-choice selectors
}

export const CreateGigWizard: React.FC = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState<number>(1);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // --- SLIDE 1 STATES: CORE ---
  const [thumbnail, setThumbnail] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [slots, setSlots] = useState(1);
  const [postingAs, setPostingAs] = useState<"self" | "team">("self");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedTerms, setSelectedTerms] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // --- SLIDE 2 STATES: SKILLS & EXTRA BANNERS ---
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [firstDraftDays, setFirstDraftDays] = useState("");
  const [supportingBanners, setSupportingBanners] = useState<string[]>([]);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // --- SLIDE 3 STATES: MILESTONES ---
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [milestoneName, setMilestoneName] = useState("");
  const [milestoneDesc, setMilestoneDescription] = useState("");

  // --- SLIDE 4 STATES: TIERS ---
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [tierTitle, setTierTitle] = useState("Basic");
  const [tierName, setTierName] = useState("");
  const [tierPrice, setTierPrice] = useState("");
  const [tierDesc, setTierDesc] = useState("");
  const [tierDelivery, setTierDelivery] = useState("");
  const [tierRevisions, setTierRevisions] = useState(1);

  // --- SLIDE 5 STATES: QUESTIONNAIRES ---
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState<Question["type"]>("Text Input");
  const [questionRequired, setQuestionRequired] = useState<boolean>(true);
  const [choiceInput, setChoiceInput] = useState("");
  const [choiceList, setChoiceList] = useState<string[]>([]);

  // --- FORMATTERS ---
  const formatCommaString = (val: string) => {
    const clean = val.replace(/\D/g, "");
    if (!clean) return "";
    return Number(clean).toLocaleString();
  };

  const getRawNumber = (val: string) => {
    return parseInt(val.replace(/\D/g, "")) || 0;
  };

  // --- IMAGE MULTI ASSETS HANDLERS ---
  const processThumbnail = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setThumbnail(url);
  };

  const handleBannerUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const urls: string[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        if (supportingBanners.length + urls.length >= 6) break;
        urls.push(URL.createObjectURL(e.target.files[i]));
      }
      setSupportingBanners([...supportingBanners, ...urls]);
    }
  };

  // --- SKILLS MATRIX COMPOSE ---
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

  // --- MILESTONES ARRAYS SHIFTER REARRANGE ---
  const moveMilestone = (index: number, direction: "up" | "down") => {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= milestones.length) return;
    const updated = [...milestones];
    const temp = updated[index];
    updated[index] = updated[nextIndex];
    updated[nextIndex] = temp;
    setMilestones(updated);
  };

  const handleAddMilestone = () => {
    if (!milestoneName.trim() || !milestoneDesc.trim()) return;

    if (milestones.length >= 7) {
      setErrors(prev => ({ ...prev, milestones: "You can add a maximum of 7 pipeline milestones." }));
      return;
    }

    const newMilestone: Milestone = {
      id: crypto.randomUUID(),
      name: milestoneName.trim(),
      description: milestoneDesc.trim()
    };

    setMilestones([...milestones, newMilestone]);
    setMilestoneName("");
    setMilestoneDescription("");
    setErrors(prev => { const { milestones: _, ...rest } = prev; return rest; });
  };

  // --- TIERS LOGIC ---
  const handleAddTier = () => {
    if (tiers.length >= 3) return;
    if (!tierName.trim() || !tierPrice || !tierDesc.trim() || !tierDelivery) return;
    const newTier: Tier = {
      id: crypto.randomUUID(),
      title: tierTitle,
      name: tierName.trim(),
      price: tierPrice,
      description: tierDesc.trim(),
      deliveryDays: tierDelivery,
      revisions: tierRevisions
    };
    setTiers([...tiers, newTier]);
    setTierName("");
    setTierPrice("");
    setTierDesc("");
    setTierDelivery("");
    setTierRevisions(1);

    if (tiers.length === 0) setTierTitle("Standard");
    else if (tiers.length === 1) setTierTitle("Premium");
  };

  // --- MULTIPLE CHOICE HOOKS ---
  const handleAddChoice = (e: FormEvent) => {
    e.preventDefault();
    const cleanChoice = choiceInput.trim();
    if (!cleanChoice) return;

    if (choiceList.includes(cleanChoice)) {
      setErrors(prev => ({ ...prev, choices: "This choice configuration option already exists." }));
      return;
    }

    setChoiceList([...choiceList, cleanChoice]);
    setChoiceInput("");
    setErrors(prev => { const { choices: _, ...rest } = prev; return rest; });
  };

  // --- QUESTIONNAIRE BUILDER ---
  const handleAddQuestion = () => {
    if (!questionText.trim()) return;

    if (questionType === "Multiple Choice" && choiceList.length < 2) {
      setErrors(prev => ({ ...prev, questionnaire: "Please add at least 2 choice configuration values for a multiple choice selection." }));
      return;
    }

    const newQuestion: Question = {
      id: crypto.randomUUID(),
      text: questionText.trim(),
      type: questionType,
      isRequired: questionRequired,
      ...(questionType === "Multiple Choice" && { options: choiceList })
    };

    setQuestions([...questions, newQuestion]);
    setQuestionText("");
    setQuestionRequired(true);
    setChoiceList([]);
    setChoiceInput("");
    setErrors(prev => { const { questionnaire: _, ...rest } = prev; return rest; });
  };

  // --- PROGRESS SLIDES VALIDATIONS ---
  const validateSlide = () => {
    const stepErrors: { [key: string]: string } = {};
    setErrors({});

    if (currentSlide === 1) {
      if (!title.trim() || title.length > 300) stepErrors.title = "A valid Title (up to 300 chars) is required.";
      if (!description.trim() || description.length > 2000) stepErrors.description = "A valid Description (up to 2000 chars) is required.";
      if (!category) stepErrors.category = "Please choose a category.";
      if (!selectedTerms) stepErrors.selectedTerms = "Please specify your Terms of Service protocol.";
      if (postingAs === "team" && !selectedTeam) stepErrors.selectedTeam = "Please assign a studio posting group.";
    } else if (currentSlide === 2) {
      if (skills.length < 3) stepErrors.skills = "At least 3 core target skills required.";
      if (!firstDraftDays) stepErrors.firstDraftDays = "Please enter expected first draft review delivery window.";
      if (supportingBanners.length < 3) stepErrors.banners = `Please drop at least 3 supporting preview project banners (${supportingBanners.length}/6 added).`;
    } else if (currentSlide === 3) {
      if (milestones.length === 0) stepErrors.milestones = "Please map out at least 1 deployment operational milestone segment.";
    } else if (currentSlide === 4) {
      if (tiers.length === 0) stepErrors.tiers = "Please add at least 1 pricing structure package tier.";
    }

    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return false;
    }
    return true;
  };

  const handleConfirmDiscard = () => {
      setIsDiscardOpen(false);
      navigate("/gigs");
  };

  const handleNext = () => {
    if (validateSlide()) setCurrentSlide(prev => prev + 1);
  };

  const handlePost = () => {
    const activeTosObject = TERMS_OF_SERVICE_DATA.find(t => t.id === selectedTerms);

    const finalGigPayload = {
      title,
      description,
      category,
      slotsAvailable: slots,
      postingAs: postingAs === "self" ? "Self" : selectedTeam,
      termsOfService: activeTosObject ? activeTosObject.name : "",
      skills,
      firstDraftDays: parseInt(firstDraftDays),
      supportingBanners,
      milestones,
      tiers,
      questions,
      thumbnail: thumbnail || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80"
    };

    console.log("Submitting Complex Gig Payload Structure:", finalGigPayload);
    setIsSuccessOpen(true);
  };

  return (
    <div className="w-full min-h-screen bg-[#080a12] text-white overflow-x-hidden">
      <UserHeader pageTitle="Create a Marketplace Gig" credits={1250} />

      <div className="mx-auto max-w-3xl p-6 md:p-8 w-full">
        {/* Navigation Action Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex flex-col gap-2 items-start shrink-0">
            <button
              onClick={() => setIsDiscardOpen(true)}
              className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-widest transition"
            >
              <ArrowLeft className="h-4 w-4" /> Return to Gigs
            </button>
          </div>

          {/* Stepper track indicator engine */}
          <div className="flex items-center w-full max-w-xl mx-auto md:mx-0 relative justify-between z-0">
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
                      {isCompleted ? <Check className="h-4 w-4" /> : step.id}
                    </div>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider mt-2 transition-colors absolute -bottom-5 whitespace-nowrap hidden sm:block ${
                        isActive ? "text-blue-400" : isCompleted ? "text-green-400" : "text-zinc-500"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {idx < WIZARD_STEPS.length - 1 && (
                    <div className="flex-1 h-[2px] bg-white/5 mx-2 relative top-[-6px] z-0">
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

        {/* Form Box Wrapper Container */}
        <div className="rounded-3xl border border-white/10 bg-[#0d0f1a]/60 p-6 md:p-8 backdrop-blur-md shadow-2xl space-y-6 mt-4">

          {/* ======================================= */}
          {/* SLIDE 1: CORE GIG PARAMETERS            */}
          {/* ======================================= */}
          {currentSlide === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold text-white">Gig Baseline Parameters</h2>
                <p className="text-xs text-zinc-400">Establish core listing presentation files, scope terms and assignments.</p>
              </div>

              {/* Cover Drag Field Dropzone */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Gig Cover Image</label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.length > 0) processThumbnail(e.dataTransfer.files[0]); }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative h-40 w-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-4 cursor-pointer transition-all duration-300 ${
                    isDragging ? "border-blue-500 bg-blue-500/10" : previewUrl ? "border-white/20 bg-white/5" : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.length && processThumbnail(e.target.files[0])} accept="image/*" className="hidden" />
                  {previewUrl ? (
                    <img src={previewUrl} alt="" className="absolute inset-0 w-full h-full object-cover rounded-xl opacity-60" />
                  ) : (
                    <div className="text-center text-xs text-zinc-400">
                      <span className="font-bold text-blue-400">Click to upload cover</span> or drop image file here
                    </div>
                  )}
                </div>
              </div>

              {/* Gig Title */}
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  <span>Gig Listing Title <span className="text-red-500">*</span></span>
                  <span className="font-mono text-zinc-500">{title.length}/300</span>
                </div>
                <input type="text" maxLength={300} placeholder="I will provide professional color grading for your short films..." value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm focus:outline-none focus:border-blue-500/40 text-white" />
                {errors.title && <p className="text-xs text-red-400">{errors.title}</p>}
              </div>

              {/* Gig Description */}
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  <span>Gig Detailed Description <span className="text-red-500">*</span></span>
                  <span className="font-mono text-zinc-500">{description.length}/2000</span>
                </div>
                <textarea rows={4} maxLength={2000} placeholder="Detail exactly what post-production services, formats, and creative methodology you use..." value={description} onChange={e => setDescription(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm focus:outline-none focus:border-blue-500/40 custom-scrollbar resize-none text-white" />
                {errors.description && <p className="text-xs text-red-400">{errors.description}</p>}
              </div>

              {/* Category, Terms & Counter Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Category <span className="text-red-500">*</span></label>
                  <select value={category} onChange={e => setCategory(e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0d0f1a] px-4 py-3 text-sm focus:outline-none text-white">
                    <option value="" disabled>Select Category</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="space-y-2 md:col-span-1">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Available Slots</label>
                  <div className="flex items-center justify-between border border-white/10 rounded-xl bg-[#080a12] p-1.5 h-[46px]">
                    <button type="button" onClick={() => setSlots(p => Math.max(1, p - 1))} className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white"><Minus className="h-3 w-3" /></button>
                    <span className="font-mono font-bold text-sm text-white">{slots}</span>
                    <button type="button" onClick={() => setSlots(p => p + 1)} className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white"><Plus className="h-3 w-3" /></button>
                  </div>
                </div>
              </div>

              {/* Updated Terms of Service Section Protocol */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Terms of Service <span className="text-red-500">*</span></label>
                <select
                  value={selectedTerms}
                  onChange={e => {
                    setSelectedTerms(e.target.value);
                    if (e.target.value) setErrors(prev => { const { selectedTerms: _, ...r } = prev; return r; });
                  }}
                  className={`w-full rounded-xl border bg-[#0d0f1a] px-4 py-3 text-sm text-white focus:outline-none transition-all ${
                    errors.selectedTerms ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-blue-500/50"
                  }`}
                >
                  <option value="" disabled>Select Terms of Service Protocol</option>
                  {TERMS_OF_SERVICE_DATA.map(tos => (
                    <option key={tos.id} value={tos.id}>{tos.name}</option>
                  ))}
                </select>

                {selectedTerms && (
                  <div className="p-4 rounded-xl border border-blue-500/10 bg-blue-500/[0.02] backdrop-blur-xs mt-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      Active Policy Overview
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                      {TERMS_OF_SERVICE_DATA.find(t => t.id === selectedTerms)?.details}
                    </p>
                  </div>
                )}
              </div>

              {/* Posting Identity Setup Wrapper Block */}
              <div className="space-y-3 pt-2 border-t border-white/5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Publish Entity Profile</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${postingAs === 'self' ? 'border-blue-500 bg-blue-500/5' : 'border-white/10 bg-white/5'}`}>
                    <input type="radio" checked={postingAs === "self"} onChange={() => setPostingAs("self")} className="accent-blue-500 h-4 w-4" />
                    <div><p className="text-xs font-bold">Individual Personal Account</p></div>
                  </label>
                  <label className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${postingAs === 'team' ? 'border-blue-500 bg-blue-500/5' : 'border-white/10 bg-white/5'}`}>
                    <input type="radio" checked={postingAs === "team"} onChange={() => setPostingAs("team")} className="accent-blue-500 h-4 w-4" />
                    <div><p className="text-xs font-bold">Shared Collective Studio Team</p></div>
                  </label>
                </div>
                {postingAs === "team" && (
                  <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0d0f1a] px-4 py-3 text-sm focus:outline-none text-white">
                    <option value="" disabled>Choose Studio Collective Entity...</option>
                    {sampleUserTeams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                )}
                {errors.selectedTeam && <p className="text-xs text-red-400">{errors.selectedTeam}</p>}
                {errors.selectedTerms && <p className="text-xs text-red-400">{errors.selectedTerms}</p>}
                {errors.category && <p className="text-xs text-red-400">{errors.category}</p>}
              </div>

              {/* Footer Layout Slide Controls */}
              <div className="pt-4 border-t border-white/5 flex justify-end">
                <button type="button" onClick={handleNext} className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-6 py-3 text-sm font-bold text-white hover:bg-blue-600 transition">
                  Confirm and Next <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* SLIDE 2: APPLIED SKILLS & BANNER ASSETS */}
          {/* ======================================= */}
          {currentSlide === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold text-white">Skills Matrix & Supporting Assets</h2>
                <p className="text-xs text-zinc-400">Verify applied skillset target bounds and load visual project portfolio carousels.</p>
              </div>

              {/* Skills Arrays Composers */}
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  <span>Target Competencies <span className="text-red-500">*</span> <span className="text-[10px] text-zinc-500 normal-case">(3 to 6 tags)</span></span>
                  <span>{skills.length}/6</span>
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="Type a skill tag and press Add (e.g., LUT Mapping, Audio Mastering)" value={skillInput} onChange={e => setSkillInput(e.target.value)} className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm focus:outline-none text-white" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSkill(e))} />
                  <button type="button" onClick={handleAddSkill} className="px-5 rounded-xl bg-white/10 border border-white/10 text-xs font-bold hover:bg-white/15 text-white">Add</button>
                </div>
                {errors.skills && <p className="text-xs text-red-400">{errors.skills}</p>}
                <div className="flex flex-wrap gap-2 pt-1">
                  {skills.map(s => (
                    <span key={s} className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400">
                      {s} <X className="h-3 w-3 cursor-pointer hover:text-white" onClick={() => setSkills(skills.filter(tag => tag !== s))} />
                    </span>
                  ))}
                </div>
              </div>

              {/* Delivery Speed Constraint Box */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">First Draft Delivery Commitment <span className="text-red-500">*</span></label>
                <div className="relative max-w-xs">
                  <input type="number" placeholder="e.g., 3" value={firstDraftDays} onChange={e => setFirstDraftDays(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm focus:outline-none pr-12 text-white" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500 uppercase tracking-wide">Days</span>
                </div>
                {errors.firstDraftDays && <p className="text-xs text-red-400">{errors.firstDraftDays}</p>}
              </div>

              {/* Supporting Banners Carousels Uploader Matrix */}
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  <span>Supporting Gallery Portfolio Banners <span className="text-red-500">*</span> <span className="text-[10px] text-zinc-500 normal-case">(3 to 6 image files)</span></span>
                  <span>{supportingBanners.length}/6 Loaded</span>
                </div>
                <div onClick={() => bannerInputRef.current?.click()} className="h-28 w-full border-2 border-dashed border-white/10 bg-white/5 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-white/[0.07] transition-all">
                  <input type="file" ref={bannerInputRef} multiple accept="image/*" className="hidden" onChange={handleBannerUpload} />
                  <ImageIcon className="h-5 w-5 text-zinc-500 mb-1" />
                  <span className="text-xs text-zinc-400 font-medium">Click to select multi-banner assets</span>
                </div>
                {errors.banners && <p className="text-xs text-red-400">{errors.banners}</p>}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 pt-2">
                  {supportingBanners.map((b, idx) => (
                    <div key={idx} className="relative aspect-video rounded-xl bg-zinc-900 border border-white/10 overflow-hidden group">
                      <img src={b} alt="" className="h-full w-full object-cover" />
                      <button type="button" onClick={() => setSupportingBanners(supportingBanners.filter((_, i) => i !== idx))} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 transition-opacity"><X className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Controls Footer Slide 2 */}
              <div className="pt-4 border-t border-white/5 flex justify-between gap-3">
                <button type="button" onClick={() => setCurrentSlide(1)} className="px-5 rounded-xl border border-white/10 text-zinc-400 font-bold hover:text-white transition text-sm">Go Back</button>
                <button type="button" onClick={handleNext} className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-6 py-3 text-sm font-bold text-white hover:bg-blue-600 transition">Confirm and Next <ArrowRight className="h-4 w-4" /></button>
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* SLIDE 3: OPERATIONAL MILESTONES MANAGEMENT */}
          {/* ======================================= */}
          {currentSlide === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold text-white">Project Pipeline Milestones</h2>
                <p className="text-xs text-zinc-400">Map structural progress tracking targets. Bidders review these workflow paths (Maximum 7 targets).</p>
              </div>

              <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Append Next Pipeline Milestone Segment</p>
                  <span className="text-[10px] font-mono text-zinc-500">{milestones.length}/7 Added</span>
                </div>
                <div className="space-y-3">
                  <input type="text" placeholder="Milestone Phase Title (e.g., Rough Cut V1 Assembly)" value={milestoneName} onChange={e => setMilestoneName(e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0d0f1a] px-4 py-2.5 text-sm focus:outline-none text-white" />
                  <textarea rows={2} placeholder="Detail verification parameters, client reviews, sound libraries syncing checks included..." value={milestoneDesc} onChange={e => setMilestoneDescription(e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0d0f1a] px-4 py-2.5 text-sm focus:outline-none resize-none custom-scrollbar text-white" />
                  <button type="button" onClick={handleAddMilestone} disabled={milestones.length >= 7} className="w-full py-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl text-xs font-bold hover:bg-blue-500/20 disabled:opacity-30 disabled:pointer-events-none transition flex items-center justify-center gap-1.5"><Plus className="h-3.5 w-3.5" /> Append Phase Step</button>
                </div>
              </div>

              {/* Milestone Tracking List with Manual Ordering Switches */}
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Active Pipeline Sequence Layout</label>
                {errors.milestones && <p className="text-xs text-red-400">{errors.milestones}</p>}
                {milestones.length === 0 && <p className="text-xs text-zinc-500 italic p-4 border border-dashed border-white/5 rounded-xl text-center">No structural process workflow phases assigned yet.</p>}
                <div className="space-y-2.5">
                  {milestones.map((m, idx) => (
                    <div key={m.id} className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/[0.01]">
                      <div className="font-mono text-xs font-bold text-zinc-600 bg-white/5 rounded-md h-6 w-6 flex items-center justify-center">0{idx + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{m.name}</p>
                        <p className="text-xs text-zinc-400 line-clamp-1">{m.description}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" disabled={idx === 0} onClick={() => moveMilestone(idx, "up")} className="p-1.5 bg-white/5 rounded-md hover:bg-white/10 text-zinc-400 disabled:opacity-20"><MoveUp className="h-3 w-3" /></button>
                        <button type="button" disabled={idx === milestones.length - 1} onClick={() => moveMilestone(idx, "down")} className="p-1.5 bg-white/5 rounded-md hover:bg-white/10 text-zinc-400 disabled:opacity-20"><MoveDown className="h-3 w-3" /></button>
                        <button type="button" onClick={() => setMilestones(milestones.filter(item => item.id !== m.id))} className="p-1.5 bg-red-500/10 rounded-md text-red-400 hover:bg-red-500/20 ml-2"><X className="h-3 w-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Controls Footer Slide 3 */}
              <div className="pt-4 border-t border-white/5 flex justify-between gap-3">
                <button type="button" onClick={() => setCurrentSlide(2)} className="px-5 rounded-xl border border-white/10 text-zinc-400 font-bold hover:text-white transition text-sm">Go Back</button>
                <button type="button" onClick={handleNext} className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-6 py-3 text-sm font-bold text-white hover:bg-blue-600 transition">Confirm and Next <ArrowRight className="h-4 w-4" /></button>
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* SLIDE 4: BUDGET TIERS PACKAGES CREATOR  */}
          {/* ======================================= */}
          {currentSlide === 4 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold text-white">Commercial Tier Bundles</h2>
                <p className="text-xs text-zinc-400">Map up to 3 package scopes specifying delivery rates and pricing milestones.</p>
              </div>

              {tiers.length < 3 ? (
                <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.01] space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> Compose {tierTitle} Scope</span>
                    <span className="text-[10px] font-mono text-zinc-500">{tiers.length}/3 Tiers Build</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase">Package Variant Header Name</label>
                      <input type="text" placeholder="e.g., Quick Turnaround Highlight" value={tierName} onChange={e => setTierName(e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0d0f1a] px-4 py-2 text-sm focus:outline-none text-white" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase">Credit Cost Allocation (₱)</label>
                      <input type="text" placeholder="Cost baseline value" value={formatCommaString(tierPrice)} onChange={e => setTierPrice(e.target.value.replace(/\D/g, ""))} className="w-full rounded-xl border border-white/10 bg-[#0d0f1a] px-4 py-2 text-sm focus:outline-none font-mono text-white" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Package Scope Summary Details</label>
                    <textarea rows={2} placeholder="Summarize project delivery dimensions matching this exact price bracket..." value={tierDesc} onChange={e => setTierDesc(e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0d0f1a] px-4 py-2 text-sm focus:outline-none resize-none custom-scrollbar text-white" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase">Delivery Schedule (Days)</label>
                      <input type="number" placeholder="Days limit" value={tierDelivery} onChange={e => setTierDelivery(e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0d0f1a] px-4 py-2 text-sm focus:outline-none text-white" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase">Revisions Count Block</label>
                      <div className="flex items-center justify-between border border-white/10 rounded-xl bg-[#080a12] px-3 h-[38px]">
                        <span className="text-xs text-zinc-400 font-mono">Max Cycles: <span className="text-white font-bold">{tierRevisions}</span></span>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => setTierRevisions(p => Math.max(1, p - 1))} className="h-6 w-6 rounded bg-white/5 flex items-center justify-center hover:bg-white/10 text-white"><Minus className="h-3 w-3" /></button>
                          <button type="button" onClick={() => setTierRevisions(p => p + 1)} className="h-6 w-6 rounded bg-white/5 flex items-center justify-center hover:bg-white/10 text-white"><Plus className="h-3 w-3" /></button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button type="button" onClick={handleAddTier} className="w-full py-2.5 bg-blue-500 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition shadow-md shadow-blue-500/10">Lock and Append Tier Package</button>
                </div>
              ) : (
                <p className="text-xs text-green-400 font-medium bg-green-500/5 border border-green-500/10 p-3 rounded-xl text-center">Maximum commercial variant tier slots built successfully.</p>
              )}

              {/* Tiers List Displays Grid */}
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Locked Commercial Packages Grid</label>
                {errors.tiers && <p className="text-xs text-red-400">{errors.tiers}</p>}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {tiers.map(t => (
                    <div key={t.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 flex flex-col justify-between relative shadow-lg">
                      <button type="button" onClick={() => { setTiers(tiers.filter(item => item.id !== t.id)); setTierTitle(t.title); }} className="absolute top-3 right-3 text-zinc-500 hover:text-red-400"><X className="h-3.5 w-3.5" /></button>
                      <div className="space-y-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{t.title}</span>
                        <h4 className="text-sm font-bold text-white truncate pt-1">{t.name}</h4>
                        <p className="text-[11px] text-zinc-400 line-clamp-3 leading-relaxed h-12">{t.description}</p>
                      </div>
                      <div className="pt-3 border-t border-white/5 mt-4 flex items-baseline justify-between">
                        <span className="text-[10px] text-zinc-500">{t.deliveryDays} Days / {t.revisions} Revs</span>
                        <span className="text-sm font-extrabold text-yellow-500">₱{formatCommaString(t.price)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Controls Footer Slide 4 */}
              <div className="pt-4 border-t border-white/5 flex justify-between gap-3">
                <button type="button" onClick={() => setCurrentSlide(3)} className="px-5 rounded-xl border border-white/10 text-zinc-400 font-bold hover:text-white transition text-sm">Go Back</button>
                <button type="button" onClick={handleNext} className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-6 py-3 text-sm font-bold text-white hover:bg-blue-600 transition">Confirm and Next <ArrowRight className="h-4 w-4" /></button>
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* SLIDE 5: CLIENT QUESTIONNAIRES BUILDER   */}
          {/* ======================================= */}
          {currentSlide === 5 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold text-white">Client Requirements Questionnaire</h2>
                <p className="text-xs text-zinc-400">Design automated prompts for clients to provide details or files upon checkout.</p>
              </div>

              <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.01] space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-1"><HelpCircle className="h-3.5 w-3.5 text-zinc-500" /> Compose Requirement Question Prompt</label>
                  <input type="text" placeholder="e.g., What is the preferred aspect ratio format for your delivery?" value={questionText} onChange={e => setQuestionText(e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0d0f1a] px-4 py-2.5 text-sm focus:outline-none text-white" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Input Answer Format Type</label>
                    <select value={questionType} onChange={e => { setQuestionType(e.target.value as Question["type"]); setChoiceList([]); }} className="w-full rounded-xl border border-white/10 bg-[#0d0f1a] px-4 py-2 text-xs focus:outline-none text-zinc-300 h-[38px]">
                      <option value="Text Input">Standard Text Input Area</option>
                      <option value="Multiple Choice">Multiple Choice Select Matrix</option>
                      <option value="File Upload">Direct Media File Upload Slot</option>
                      <option value="Fill in the Blank">Fill in the Blank Box</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase block">Is Response Mandatory?</label>
                    <div className="flex gap-4 h-[38px] items-center">
                      <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
                        <input type="radio" checked={questionRequired === true} onChange={() => setQuestionRequired(true)} className="accent-blue-500" /> Required Prompt
                      </label>
                      <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
                        <input type="radio" checked={questionRequired === false} onChange={() => setQuestionRequired(false)} className="accent-blue-500" /> Optional
                      </label>
                    </div>
                  </div>
                </div>

                {/* DYNAMIC MULTIPLE CHOICE CONFIGURATOR OPTION BLOCK */}
                {questionType === "Multiple Choice" && (
                  <div className="p-4 rounded-xl border border-white/5 bg-black/20 space-y-3 animate-fade-in">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase block">Configure Survey Selection Options</label>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Add choice variant value (e.g., 16:9 Landscape, 9:16 Vertical)" value={choiceInput} onChange={e => setChoiceInput(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleAddChoice(e))} className="flex-1 rounded-xl border border-white/10 bg-[#0d0f1a] px-4 py-2 text-xs focus:outline-none text-white" />
                      <button type="button" onClick={handleAddChoice} className="px-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs font-bold text-blue-400 hover:bg-blue-500/20">Add Choice</button>
                    </div>
                    {errors.choices && <p className="text-xs text-red-400">{errors.choices}</p>}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {choiceList.length === 0 && <span className="text-[11px] text-zinc-500 italic">No alternative options defined yet. (Minimum 2 required)</span>}
                      {choiceList.map(choice => (
                        <span key={choice} className="flex items-center gap-1 px-2.5 py-1 text-[10px] rounded bg-zinc-800 border border-white/5 text-zinc-300">
                          {choice}
                          <X className="h-3 w-3 cursor-pointer text-zinc-500 hover:text-white" onClick={() => setChoiceList(choiceList.filter(c => c !== choice))} />
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {errors.questionnaire && <p className="text-xs text-red-400">{errors.questionnaire}</p>}
                <button type="button" onClick={handleAddQuestion} className="w-full py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold hover:bg-white/10 transition text-white">Append Requirement Question Token</button>
              </div>

              {/* Questionnaire Form List Rendering View Layout */}
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Requirement Form Sequence Flow</label>
                {questions.length === 0 && <p className="text-xs text-zinc-500 italic p-4 border border-dashed border-white/5 rounded-xl text-center">No checkout form questions deployed yet. Clients will check out directly.</p>}

                <div className="space-y-2">
                  {questions.map((q, idx) => (
                    <div key={q.id} className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex items-start justify-between gap-4">
                      <div className="text-xs space-y-1.5">
                        <p className="font-bold text-zinc-200">Q0{idx + 1}: {q.text}</p>
                        {q.options && q.options.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {q.options.map(opt => (
                              <span key={opt} className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-zinc-400 border border-white/[0.02]">{opt}</span>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2 pt-0.5 text-[10px] font-mono text-zinc-500">
                          <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5">{q.type}</span>
                          {q.isRequired ? <span className="text-red-400 bg-red-400/5 px-2 py-0.5 rounded border border-red-500/10">Mandatory Field</span> : <span className="text-zinc-500">Optional</span>}
                        </div>
                      </div>
                      <button type="button" onClick={() => setQuestions(questions.filter(item => item.id !== q.id))} className="text-zinc-600 hover:text-red-400 p-1"><X className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Controls Footer Slide 5 */}
              <div className="pt-4 border-t border-white/5 flex justify-between gap-3">
                <button type="button" onClick={() => setCurrentSlide(4)} className="px-5 rounded-xl border border-white/10 text-zinc-400 font-bold hover:text-white transition text-sm">Go Back</button>
                <button type="button" onClick={handleNext} className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-6 py-3 text-sm font-bold text-white hover:bg-blue-600 transition">
                   Confirm and Review <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* SLIDE 6: COMPREHENSIVE GIG REVIEW       */}
          {/* ======================================= */}
          {currentSlide === 6 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold text-white">Review Your Gig Listing</h2>
                <p className="text-xs text-zinc-400">Please verify all package structures and operational configurations before posting.</p>
              </div>

              <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar text-xs">
                {/* Core Scope Summary */}
                <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.01] space-y-3">
                  <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                    <span className="font-bold text-blue-400 uppercase tracking-wider text-[10px]">01. Baseline Scope</span>
                    <button type="button" onClick={() => setCurrentSlide(1)} className="text-[10px] text-blue-500 hover:underline font-bold transition">Edit</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {previewUrl && (
                      <div className="aspect-video rounded-xl overflow-hidden border border-white/10 sm:col-span-1">
                        <img src={previewUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="sm:col-span-2 space-y-1">
                      <p className="text-zinc-500 font-semibold uppercase text-[9px] tracking-wider">Title</p>
                      <p className="text-sm font-bold text-white leading-snug">{title || <span className="text-red-400 italic">Missing Title</span>}</p>
                      <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 pt-2 text-[11px]">
                        <div>
                          <span className="text-zinc-500">Category:</span> <span className="text-zinc-300 font-semibold">{category || "None"}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">Available Slots:</span> <span className="text-zinc-300 font-semibold">{slots}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-zinc-500">Publish Profile Entity:</span> <span className="text-zinc-300 font-semibold">{postingAs === "self" ? "Individual Account" : selectedTeam}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Skills & Banners Summary */}
                <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.01] space-y-3">
                  <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                    <span className="font-bold text-blue-400 uppercase tracking-wider text-[10px]">02. Applied Competencies & Assets</span>
                    <button type="button" onClick={() => setCurrentSlide(2)} className="text-[10px] text-blue-500 hover:underline font-bold transition">Edit</button>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="text-zinc-500 block mb-1">Target Skill Tags Matrix:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {skills.map(s => (
                          <span key={s} className="px-2.5 py-0.5 rounded bg-blue-500/5 border border-blue-500/10 text-blue-400 text-[10px] font-semibold">{s}</span>
                        ))}
                      </div>
                    </div>
                    <div className="pt-1">
                      <span className="text-zinc-500">First Draft Target Window:</span> <span className="text-white font-mono font-bold">{firstDraftDays} Days</span>
                    </div>
                    {supportingBanners.length > 0 && (
                      <div className="pt-1">
                        <span className="text-zinc-500 block mb-1.5">Gallery Portfolio ({supportingBanners.length} Files):</span>
                        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                          {supportingBanners.map((b, idx) => (
                            <img key={idx} src={b} alt="" className="h-12 aspect-video object-cover rounded-lg border border-white/10 shrink-0" />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pipeline Milestones Summary */}
                <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.01] space-y-2">
                  <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                    <span className="font-bold text-blue-400 uppercase tracking-wider text-[10px]">03. Pipeline Workflow Sequences</span>
                    <button type="button" onClick={() => setCurrentSlide(3)} className="text-[10px] text-blue-500 hover:underline font-bold transition">Edit</button>
                  </div>
                  {milestones.length === 0 ? (
                    <p className="text-zinc-500 italic py-1">No custom operational pipeline milestones mapped.</p>
                  ) : (
                    <div className="space-y-2 pt-1">
                      {milestones.map((m, idx) => (
                        <div key={m.id} className="text-[11px] text-zinc-300 bg-[#080a12]/40 p-2 rounded-xl border border-white/[0.02]">
                          <span className="text-blue-400 font-mono font-bold mr-1">Phase 0{idx + 1}:</span> <strong className="text-white">{m.name}</strong> — {m.description}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pricing Tiers Summary */}
                <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.01] space-y-2">
                  <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                    <span className="font-bold text-blue-400 uppercase tracking-wider text-[10px]">04. Commercial Variant Tiers</span>
                    <button type="button" onClick={() => setCurrentSlide(4)} className="text-[10px] text-blue-500 hover:underline font-bold transition">Edit</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    {tiers.map(t => (
                      <div key={t.id} className="p-3 rounded-xl bg-[#080a12] border border-white/5 flex flex-col justify-between space-y-2">
                        <div>
                          <span className="text-[9px] text-blue-400 font-black uppercase tracking-widest bg-blue-500/5 px-1.5 py-0.5 rounded border border-blue-500/10">{t.title}</span>
                          <div className="font-bold text-white truncate mt-1.5">{t.name}</div>
                          <p className="text-[10px] text-zinc-400 line-clamp-2 mt-1 leading-relaxed">{t.description}</p>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-zinc-500 pt-2 border-t border-white/5">
                          <span>{t.deliveryDays} Days / {t.revisions} Revs</span>
                          <span className="font-extrabold text-yellow-500 text-xs">₱{formatCommaString(t.price)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Questionnaire Summary */}
                <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.01] space-y-2">
                  <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                    <span className="font-bold text-blue-400 uppercase tracking-wider text-[10px]">05. Client Requirements Questionnaire</span>
                    <button type="button" onClick={() => setCurrentSlide(5)} className="text-[10px] text-blue-500 hover:underline font-bold transition">Edit</button>
                  </div>
                  {questions.length === 0 ? (
                    <p className="text-zinc-500 italic py-1">No checkout form inputs configured. Direct purchase pipeline active.</p>
                  ) : (
                    <div className="space-y-3 pt-1">
                      {questions.map((q, idx) => (
                        <div key={q.id} className="text-zinc-300 text-[11px] bg-[#080a12]/30 p-2 rounded-xl border border-white/[0.01]">
                          <div className="font-bold"><span className="text-zinc-500 font-mono">Prompt 0{idx + 1}:</span> {q.text}</div>
                          {q.options && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {q.options.map(opt => <span key={opt} className="px-2 py-0.5 bg-white/5 text-[10px] rounded text-zinc-400">{opt}</span>)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Controls Footer Slide 6 Final Post */}
              <div className="pt-4 border-t border-white/5 flex justify-between gap-3">
                <button type="button" onClick={() => setCurrentSlide(5)} className="px-5 rounded-xl border border-white/10 text-zinc-400 font-bold hover:text-white transition text-sm">Go Back</button>
                <button type="button" onClick={handlePost} className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-green-500 px-6 py-3 text-sm font-bold text-[#0d0f1a] hover:bg-green-400 transition shadow-lg shadow-green-500/10">
                  <Check className="h-4 w-4" /> Confirm and Post Gig Live
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      <SuccessModal
        isOpen={isSuccessOpen}
        title="Gig Successfully Live!"
        message="Your service package has been successfully deployed to the Gig Marketplace marketplace feed directory."
        onConfirm={() => navigate("/gigs")}
      />

      <ConfirmationModal
        isOpen={isDiscardOpen}
        title="Discard Gig Progress?"
        message="Are you sure you want to discard your changes? All custom variant multi-tiers, questionnaire sets and milestones mapped will be lost."
        onConfirm={handleConfirmDiscard}
        onCancel={() => setIsDiscardOpen(false)}
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
};

export default CreateGigWizard;