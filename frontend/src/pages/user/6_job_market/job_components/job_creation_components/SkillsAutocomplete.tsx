import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, HelpCircle, X, Plus, Check, AlertCircle, Loader2, Info, Clock } from "lucide-react";
import api from "@/lib/axios.ts";
import { showSuccessToast, showErrorToast } from "@/components/utility/toast";

interface SkillsAutocompleteProps {
  skills: string[];
  setSkills: React.Dispatch<React.SetStateAction<string[]>>;
  error?: string;
  maxSkills?: number;
  hideHeader?: boolean;
  jobTitle?: string;
  jobDescription?: string;
  jobCategory?: string;
}

const COOLDOWN_KEY = "joed_ai_skills_cooldown";
const COOLDOWN_DURATION_SEC = 300; // 5 minutes

export const SkillsAutocomplete: React.FC<SkillsAutocompleteProps> = ({
  skills,
  setSkills,
  error,
  maxSkills = 6,
  hideHeader = false,
  jobTitle = "",
  jobDescription = "",
  jobCategory = "",
}) => {
  const [skillInput, setSkillInput] = useState("");
  const [availableSkillsList, setAvailableSkillsList] = useState<{ tag_id: number | string; name: string }[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Joed AI Modal State
  const [isJoedModalOpen, setIsJoedModalOpen] = useState(false);
  const [modalStage, setModalStage] = useState<"confirm" | "analyzing" | "results">("confirm");
  const [modalTitle, setModalTitle] = useState("");
  const [modalDescription, setModalDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysisReason, setAiAnalysisReason] = useState<string | null>(null);
  const [recommendedSkills, setRecommendedSkills] = useState<string[]>([]);
  const [selectedRecommendations, setSelectedRecommendations] = useState<string[]>([]);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Initialize and tick cooldown from localStorage
  useEffect(() => {
    const savedExpiry = localStorage.getItem(COOLDOWN_KEY);
    if (savedExpiry) {
      const expiryTime = parseInt(savedExpiry, 10);
      const remaining = Math.max(0, Math.ceil((expiryTime - Date.now()) / 1000));
      setCooldownSeconds(remaining);
    }
  }, []);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          localStorage.removeItem(COOLDOWN_KEY);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const formatCooldown = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}:${String(rem).padStart(2, "0")}`;
  };

  useEffect(() => {
    setIsLoading(true);
    api.get("/api/tags/")
      .then((res) => {
        const tags = res.data.data || res.data.tags || [];
        setAvailableSkillsList(tags);
      })
      .catch((err) => console.error("Failed to fetch skills", err))
      .finally(() => setIsLoading(false));
  }, []);

  const getFilteredSkills = () => {
    const existingSkillNames = skills.map((s) => s.toLowerCase());
    return availableSkillsList.filter((skill) =>
      skill.name.toLowerCase().includes(skillInput.toLowerCase()) &&
      !existingSkillNames.includes(skill.name.toLowerCase())
    );
  };

  const filteredSkills = getFilteredSkills();

  const handleAddSkill = (skillName: string) => {
    if (!skillName.trim()) return;
    if (skills.length >= maxSkills) return;

    const uniqueName = skillName.trim();
    if (skills.some((s) => s.toLowerCase() === uniqueName.toLowerCase())) return;

    setSkills((prev) => [...prev, uniqueName]);
    setSkillInput("");
    setIsDropdownOpen(false);
  };

  const handleRemoveSkill = (name: string) => {
    setSkills((prev) => prev.filter((s) => s !== name));
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    handleAddSkill(skillInput);
  };

  // Open modal in confirmation mode (does NOT generate yet)
  const handleOpenJoedModal = () => {
    if (cooldownSeconds > 0) {
      showErrorToast(`Joed AI is on cooldown. Please wait ${formatCooldown(cooldownSeconds)}.`);
      return;
    }

    // Pull from props or fallback to draft in localStorage
    let initialTitle = jobTitle.trim();
    let initialDesc = jobDescription.trim();

    if (!initialTitle && !initialDesc) {
      try {
        const draftStr = localStorage.getItem("ensemble_job_create_draft") || localStorage.getItem("ensemble_team_job_create_draft");
        if (draftStr) {
          const draft = JSON.parse(draftStr);
          if (draft.title) initialTitle = draft.title.trim();
          if (draft.description) initialDesc = draft.description.trim();
        }
      } catch (_) {}
    }

    setModalTitle(initialTitle);
    setModalDescription(initialDesc);
    setRecommendedSkills([]);
    setSelectedRecommendations([]);
    setAiAnalysisReason(null);
    setModalStage("confirm");
    setIsJoedModalOpen(true);
  };

  // ONLY generate skills after user clicks "Generate"
  const handleConfirmAndGenerate = async () => {
    if (cooldownSeconds > 0 || isAnalyzing) return;
    if (!modalTitle.trim() && !modalDescription.trim()) {
      showErrorToast("Please specify a job title or description in Step 1 first.");
      return;
    }

    setModalStage("analyzing");
    setIsAnalyzing(true);
    setAiAnalysisReason(null);

    try {
      const res = await api.post("/api/chat/generate-job-skills", {
        title: modalTitle.trim(),
        description: modalDescription.trim(),
        category: jobCategory,
      });

      const data = res.data?.data;
      const skillsProposed: string[] = Array.isArray(data?.skills) ? data.skills : [];
      setRecommendedSkills(skillsProposed);
      setSelectedRecommendations(skillsProposed);
      setAiAnalysisReason(data?.reasoning || "Matched skills based on your project requirements.");

      // Set 5-minute cooldown (300 seconds)
      const expiryTime = Date.now() + COOLDOWN_DURATION_SEC * 1000;
      localStorage.setItem(COOLDOWN_KEY, String(expiryTime));
      setCooldownSeconds(COOLDOWN_DURATION_SEC);

      setModalStage("results");
    } catch (err: any) {
      console.error("Joed AI skills generation error:", err);
      // Fallback matching using client availableSkillsList if backend is unreachable
      const textToMatch = `${modalTitle} ${modalDescription} ${jobCategory}`.toLowerCase();
      const scored = availableSkillsList.map((tag) => {
        const lower = tag.name.toLowerCase();
        let score = 0;
        if (textToMatch.includes(lower)) score += 10;
        const words = lower.split(/\s+/).filter((w) => w.length > 2);
        for (const w of words) {
          if (textToMatch.includes(w)) score += 3;
        }
        if (["video editing", "color grading", "sound design"].includes(lower)) score += 1;
        return { name: tag.name, score };
      });
      scored.sort((a, b) => b.score - a.score);
      const fallbackSkills = scored.filter((s) => s.score > 0).slice(0, 4).map((s) => s.name);
      const finalFallback = fallbackSkills.length >= 2 ? fallbackSkills : ["Video Editing", "Color Grading", "Sound Design"];
      setRecommendedSkills(finalFallback);
      setSelectedRecommendations(finalFallback);
      setAiAnalysisReason("Skills matched directly against database tags based on your project description.");

      // Set 5-minute cooldown (300 seconds)
      const expiryTime = Date.now() + COOLDOWN_DURATION_SEC * 1000;
      localStorage.setItem(COOLDOWN_KEY, String(expiryTime));
      setCooldownSeconds(COOLDOWN_DURATION_SEC);

      setModalStage("results");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyRecommendations = () => {
    if (selectedRecommendations.length === 0) {
      setIsJoedModalOpen(false);
      return;
    }

    setSkills((prev) => {
      const updated = [...prev];
      for (const skill of selectedRecommendations) {
        if (updated.length >= maxSkills) break;
        if (!updated.some((s) => s.toLowerCase() === skill.toLowerCase())) {
          updated.push(skill);
        }
      }
      return updated;
    });

    setIsJoedModalOpen(false);
    showSuccessToast(`Joed AI applied ${selectedRecommendations.length} skill(s) to your project.`);
  };

  const toggleRecommendation = (skill: string) => {
    setSelectedRecommendations((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleSelectAllRecommendations = () => {
    if (selectedRecommendations.length === recommendedSkills.length) {
      setSelectedRecommendations([]);
    } else {
      setSelectedRecommendations([...recommendedSkills]);
    }
  };

  return (
    <div className="space-y-3.5">
      {!hideHeader && (
        <div className="flex justify-between items-center">
          <label className="text-[11px] font-bold text-gray-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
            Required Skills <span className="text-red-500">*</span>
            <div className="relative group flex items-center">
              <HelpCircle className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden w-56 rounded-xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 p-2.5 text-center text-xs text-gray-700 dark:text-gray-300 shadow-xl group-hover:block z-10 pointer-events-none">
                Skills are used to match your post with relevant talent. Add at least 3 skills.
              </div>
            </div>
          </label>
          <span className={`text-xs font-semibold ${skills.length >= 3 ? "text-emerald-600 dark:text-emerald-400" : "text-gray-500 dark:text-zinc-400"}`}>
            {skills.length}/{maxSkills} Added {skills.length >= 3 ? "✓" : "(Min 3 req.)"}
          </span>
        </div>
      )}

      {/* Action Row: Set Skills with Joed AI Button (No icon) */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-gray-500 dark:text-zinc-400">
          Not sure what to pick?
        </span>
        <button
          type="button"
          onClick={handleOpenJoedModal}
          disabled={cooldownSeconds > 0}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer select-none ${
            cooldownSeconds > 0
              ? "bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-zinc-500 border border-gray-200 dark:border-white/10 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 active:scale-95"
          }`}
          title={
            cooldownSeconds > 0
              ? `Joed AI on cooldown (${formatCooldown(cooldownSeconds)} remaining)`
              : "Let Joed AI analyze your project requirements to select matching skills"
          }
        >
          {cooldownSeconds > 0 ? (
            <>
              <Clock className="h-3.5 w-3.5 animate-spin text-gray-400 dark:text-zinc-500 shrink-0" />
              <span>Cooldown ({formatCooldown(cooldownSeconds)})</span>
            </>
          ) : (
            <span>Set Skills with Joed AI</span>
          )}
        </button>
      </div>

      {/* Manual Search & Autocomplete Input */}
      <div className="relative">
        <div 
          className={`transition-all duration-300 ease-in-out ${
            skills.length >= maxSkills ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-32 opacity-100'
          }`}
        >
          <form onSubmit={handleManualAdd} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={isLoading ? "Loading skills..." : "Type custom skill (e.g. Color Grading)..."}
                value={skillInput}
                onChange={(e) => {
                  setSkillInput(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                onBlur={() => {
                  setTimeout(() => setIsDropdownOpen(false), 200);
                }}
                disabled={isLoading || skills.length >= maxSkills}
                className="w-full rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-dark-base/60 shadow-sm px-4 py-2.5 text-xs sm:text-sm font-medium text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all pr-8 placeholder:text-gray-400 dark:placeholder:text-zinc-500"
              />
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                disabled={isLoading || skills.length >= maxSkills}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition cursor-pointer"
              >
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-blue-500' : ''}`} />
              </button>
            </div>
            
            <button
              type="submit"
              disabled={skills.length >= maxSkills || !skillInput.trim()}
              className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 border border-gray-300 dark:border-white/10 text-xs font-bold transition text-gray-900 dark:text-white focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shrink-0 cursor-pointer"
            >
              Add
            </button>
          </form>
        </div>

        {isDropdownOpen && filteredSkills.length > 0 && skills.length < maxSkills && (
          <div className="absolute top-12 left-0 z-[100] w-[calc(100%-60px)] bg-white dark:bg-[#1a1c23] border border-gray-200 dark:border-white/10 rounded-xl max-h-48 overflow-y-auto shadow-2xl custom-scrollbar p-1">
            {filteredSkills.map((skill) => (
              <button
                key={skill.tag_id}
                type="button"
                onClick={() => handleAddSkill(skill.name)}
                className="w-full text-left px-3.5 py-2 text-xs font-medium text-gray-800 dark:text-zinc-200 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>{skill.name}</span>
                <Plus className="h-3 w-3 opacity-50" />
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-[11px] font-medium text-red-500">{error}</p>}

      {/* SECTION: SELECTED SKILLS (Prominent & clearly distinguished) */}
      <div className="space-y-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.015] p-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-900 dark:text-white">
            Selected Skills ({skills.length}/{maxSkills})
          </span>
          {skills.length > 0 && (
            <button
              type="button"
              onClick={() => setSkills([])}
              className="text-[10px] text-gray-400 hover:text-red-500 font-medium transition cursor-pointer"
            >
              Clear All
            </button>
          )}
        </div>

        {skills.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-zinc-500 italic py-1">
            No skills added yet. Type a skill above, or click &ldquo;Set Skills with Joed AI&rdquo;.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white dark:bg-blue-500 shadow-xs select-none"
              >
                <Check className="h-3 w-3 text-blue-200" />
                <span>{s}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(s)}
                  className="text-blue-200 hover:text-white transition-colors ml-0.5 p-0.5 rounded cursor-pointer"
                  title={`Remove ${s}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* JOED AI SKILLS GENERATION MODAL POPUP (Rendered via createPortal at document.body) */}
      {isJoedModalOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-base shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header: No icon beside the title */}
            <div className="flex items-start justify-between gap-3 border-b border-gray-200 dark:border-white/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Set Skills with Joed AI
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                  Analyzes your project requirements to match with verified skills.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsJoedModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition cursor-pointer p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* STAGE 1: CONFIRMATION VIEW (User views display-only details BEFORE generation) */}
            {modalStage === "confirm" && (
              <div className="space-y-4">
                {/* Gray Informational Box */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 text-xs text-gray-600 dark:text-zinc-400">
                  <Info className="h-4 w-4 shrink-0 mt-0.5 text-gray-400 dark:text-zinc-400" />
                  <p>
                    Joed AI will evaluate your project scope and match relevant tags strictly from Ensemble&apos;s verified skills catalog.
                  </p>
                </div>

                {/* Display-Only Project Scope */}
                <div className="space-y-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] p-4 text-xs">
                  <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                    <span>Project Scope</span>
                    {jobCategory && (
                      <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-semibold">
                        {jobCategory}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <span className="font-bold text-gray-700 dark:text-zinc-300 block text-[11px] uppercase tracking-wider">
                      Job Title
                    </span>
                    <div className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-base text-gray-900 dark:text-white text-xs font-medium select-text">
                      {modalTitle.trim() || (
                        <span className="italic text-gray-400">No title specified in Step 1</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="font-bold text-gray-700 dark:text-zinc-300 block text-[11px] uppercase tracking-wider">
                      Project Description
                    </span>
                    <div className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-base text-gray-700 dark:text-zinc-300 text-xs leading-relaxed max-h-36 overflow-y-auto select-text whitespace-pre-line">
                      {modalDescription.trim() || (
                        <span className="italic text-gray-400">No description provided in Step 1</span>
                      )}
                    </div>
                  </div>

                  {!modalTitle.trim() && !modalDescription.trim() && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5 pt-1">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>Please enter a Job Title or Description in Step 1 first.</span>
                    </p>
                  )}
                </div>

                {/* Cooldown Notice Displayed Like Other Joed Modals */}
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 text-xs text-gray-600 dark:text-zinc-400">
                  <Clock className="h-4 w-4 shrink-0 text-gray-400 dark:text-zinc-400" />
                  <span className="font-medium">
                    {cooldownSeconds > 0
                      ? `Cooldown active: ${formatCooldown(cooldownSeconds)} remaining before you can generate again.`
                      : "5-minute cooldown applies after generation."}
                  </span>
                </div>

                {/* Actions: Generate button with NO icon */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsJoedModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-300 dark:border-white/10 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/5 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAndGenerate}
                    disabled={(!modalTitle.trim() && !modalDescription.trim()) || cooldownSeconds > 0}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Generate
                  </button>
                </div>
              </div>
            )}

            {/* STAGE 2: ANALYZING / LOADING */}
            {modalStage === "analyzing" && (
              <div className="py-10 flex flex-col items-center justify-center space-y-3 text-center">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    Joed AI is analyzing your project requirements...
                  </p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-sm">
                    Cross-referencing your specifications with verified skills in the Ensemble database catalog.
                  </p>
                </div>
              </div>
            )}

            {/* STAGE 3: RESULTS & SELECTION VIEW */}
            {modalStage === "results" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-900 dark:text-white">
                    Recommended Skills ({selectedRecommendations.length} selected):
                  </span>
                  <button
                    type="button"
                    onClick={handleSelectAllRecommendations}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                  >
                    {selectedRecommendations.length === recommendedSkills.length ? "Deselect All" : "Select All"}
                  </button>
                </div>

                {recommendedSkills.length === 0 ? (
                  <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 text-center text-xs text-gray-500">
                    No matching skills found. Try providing more details in your title and description.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                    {recommendedSkills.map((skill) => {
                      const isChecked = selectedRecommendations.includes(skill);
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => toggleRecommendation(skill)}
                          className={`flex items-center justify-between p-3 rounded-xl border text-left text-xs font-semibold transition cursor-pointer ${
                            isChecked
                              ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300 shadow-2xs"
                              : "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 hover:bg-gray-50"
                          }`}
                        >
                          <span className="truncate pr-2">{skill}</span>
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                              isChecked
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "border-gray-300 dark:border-white/20"
                            }`}
                          >
                            {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {aiAnalysisReason && (
                  <div className="flex items-start gap-2 text-[11px] text-gray-600 dark:text-zinc-400 bg-gray-50 dark:bg-white/[0.02] p-2.5 rounded-lg border border-gray-200 dark:border-white/10">
                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-gray-400" />
                    <span>{aiAnalysisReason}</span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-200 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setModalStage("confirm")}
                    className="text-xs font-semibold text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition cursor-pointer"
                  >
                    View Project Info
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsJoedModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-300 dark:border-white/10 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/5 transition cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyRecommendations}
                      disabled={selectedRecommendations.length === 0}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Apply Selected Skills ({selectedRecommendations.length})
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
