import { useState, useEffect, useMemo } from "react";
import { X, Plus, Trash2, Check, Minus, AlertCircle, Loader2, Sparkles, Wrench } from "lucide-react";
import api from "@/lib/axios.ts";
import { showErrorToast } from "@/components/utility/toast";
import GlideSelect, { type GlideSelectOption } from "@/components/ui/GlideSelect";

type Proficiency = "beginner" | "intermediate" | "advanced" | "expert";

export interface SkillObject {
  tag_id: number | string;
  name: string;
  proficiency: Proficiency;
  years: number;
}

interface SkillsEditModalProps {
  isSaving?: boolean;
  isOpen: boolean;
  onClose: () => void;
  currentSkills: SkillObject[];
  onSave: (originalSkills: SkillObject[], updatedSkills: SkillObject[]) => void;
  availableSkillsList?: { tag_id: number; name: string }[];
}

const PROFICIENCY_OPTIONS: GlideSelectOption[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "expert", label: "Expert" },
];

export default function SkillsEditModal({
  isOpen,
  onClose,
  currentSkills = [],
  onSave,
  availableSkillsList = [],
  isSaving = false
}: SkillsEditModalProps) {
  const [skillsList, setSkillsList] = useState<SkillObject[]>([]);
  const [newSkill, setNewSkill] = useState({ name: "", proficiency: "beginner" as Proficiency, years: 1 });
  const [suggestedSkills, setSuggestedSkills] = useState<{ tag_id: number; name: string }[]>(availableSkillsList);
  const [isLoading, setIsLoading] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customSkillName, setCustomSkillName] = useState("");

  // Synchronize internal state fields when modal opens
  useEffect(() => {
    if (isOpen) {
      setSkillsList([...currentSkills]);
      setNewSkill({ name: "", proficiency: "beginner", years: 1 });
      setIsCustomMode(false);
      setCustomSkillName("");
    }
  }, [isOpen]);

  // Fetch capability tag choices from server if fallback array is blank
  useEffect(() => {
    if (!isOpen) return;
    if (availableSkillsList.length === 0) {
      setIsLoading(true);
      api.get("/api/tags/")
        .then(res => {
          const tags = res.data.data || res.data.tags || [];
          setSuggestedSkills(tags);
        })
        .catch(err => console.error("Failed fetching skills choices:", err))
        .finally(() => setIsLoading(false));
    } else {
      setSuggestedSkills(availableSkillsList);
    }
  }, [isOpen, availableSkillsList]);

  const existingSkillNames = useMemo(
    () => skillsList.map(s => s.name.toLowerCase()),
    [skillsList]
  );

  // GlideSelect Options for Skills
  const skillSelectOptions: GlideSelectOption[] = useMemo(() => {
    const list: GlideSelectOption[] = suggestedSkills
      .filter(skill => !existingSkillNames.includes(skill.name.toLowerCase()))
      .map(skill => ({
        value: skill.name,
        label: skill.name,
      }));

    list.push({
      value: "__custom__",
      label: "✏️ Type Custom Skill...",
    });

    return list;
  }, [suggestedSkills, existingSkillNames]);

  // Quick suggestions that haven't been added yet
  const quickSuggestions = useMemo(() => {
    return suggestedSkills
      .filter(skill => !existingSkillNames.includes(skill.name.toLowerCase()))
      .slice(0, 6);
  }, [suggestedSkills, existingSkillNames]);

  if (!isOpen) return null;

  const handleSkillSelect = (value: string) => {
    if (value === "__custom__") {
      setIsCustomMode(true);
      setNewSkill(prev => ({ ...prev, name: "" }));
    } else {
      setIsCustomMode(false);
      setNewSkill(prev => ({ ...prev, name: value }));
    }
  };

  const addQuickSkill = (skill: { tag_id: number | string; name: string }) => {
    if (skillsList.length >= 12) {
      showErrorToast("Maximum of 12 skills allowed.");
      return;
    }
    const uniqueName = skill.name.trim();
    if (skillsList.some(s => s.name.toLowerCase() === uniqueName.toLowerCase())) return;

    const appendedSkill: SkillObject = {
      tag_id: skill.tag_id,
      name: uniqueName,
      proficiency: "intermediate",
      years: 1,
    };
    setSkillsList(prev => [...prev, appendedSkill]);
  };

  const addCompoundSkill = () => {
    const skillNameToAdd = isCustomMode ? customSkillName.trim() : newSkill.name.trim();
    if (!skillNameToAdd) return;
    if (skillsList.length >= 12) {
      showErrorToast("Maximum of 12 skills allowed.");
      return;
    }

    const uniqueName = skillNameToAdd;
    const exists = skillsList.some(s => s.name.toLowerCase() === uniqueName.toLowerCase());
    if (exists) return;

    const systemMatchedTag = suggestedSkills.find(s => s.name.toLowerCase() === uniqueName.toLowerCase());

    const appendedSkill: SkillObject = {
      tag_id: systemMatchedTag ? systemMatchedTag.tag_id : `custom_${Date.now()}`,
      name: uniqueName,
      proficiency: newSkill.proficiency,
      years: newSkill.years
    };

    setSkillsList(prev => [...prev, appendedSkill]);
    setNewSkill({ name: "", proficiency: "beginner", years: 1 });
    setIsCustomMode(false);
    setCustomSkillName("");
  };

  const removeSkill = (name: string) => {
    setSkillsList(prev => prev.filter(s => s.name !== name));
  };

  const handleSave = () => {
    onSave(currentSkills, skillsList);
  };

  const canAdd = isCustomMode ? customSkillName.trim().length > 0 : newSkill.name.trim().length > 0;

  return (
    <div className="fixed inset-0 z-[200000] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 font-['Plus_Jakarta_Sans',sans-serif] text-gray-800 dark:text-zinc-300 select-none animate-fadeIn">
      <div className="relative w-full max-w-xl rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-base p-5 md:p-6 shadow-2xl space-y-4">

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center shrink-0">
              <Wrench className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                Manage Skills
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                Curate your skills and expertise to showcase on your profile.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-xl p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Add Skill Form Box */}
        <div className="bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 p-4 rounded-xl space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
              Add a Skill
            </span>
            <span className="text-[11px] font-mono font-bold text-gray-500 dark:text-zinc-400">
              {skillsList.length} / 12 Max
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
            {/* Skill Name Dropdown with GlideSelect */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] uppercase font-bold text-gray-500 dark:text-zinc-400">
                  Skill Name
                </label>
                {isCustomMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomMode(false);
                      setCustomSkillName("");
                    }}
                    className="text-[10px] text-zinc-500 dark:text-zinc-400 hover:underline cursor-pointer"
                  >
                    Select from catalog
                  </button>
                )}
              </div>
              
              {!isCustomMode ? (
                <GlideSelect
                  options={skillSelectOptions}
                  value={newSkill.name}
                  onChange={(val) => handleSkillSelect(val)}
                  placeholder={isLoading ? "Loading skills..." : "Select skill..."}
                  size="sm"
                  fullWidth
                  disabled={isLoading}
                  radius={10}
                />
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={customSkillName}
                    onChange={(e) => setCustomSkillName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCompoundSkill();
                      }
                    }}
                    placeholder="Type custom skill name..."
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface px-3 py-1.5 text-xs outline-none text-gray-900 dark:text-white focus:border-zinc-400 font-medium shadow-2xs h-[34px]"
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* Proficiency Dropdown with GlideSelect */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 dark:text-zinc-400 mb-1">
                Proficiency
              </label>
              <GlideSelect
                options={PROFICIENCY_OPTIONS}
                value={newSkill.proficiency}
                onChange={(val) => setNewSkill(prev => ({ ...prev, proficiency: val as Proficiency }))}
                size="sm"
                fullWidth
                radius={10}
              />
            </div>

            {/* Experience Counter */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 dark:text-zinc-400 mb-1 text-center">
                Years
              </label>
              <div className="flex items-center justify-between border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface rounded-xl h-[34px] overflow-hidden p-1 shadow-2xs">
                <button 
                  type="button" 
                  onClick={() => setNewSkill(p => ({ ...p, years: Math.max(1, p.years - 1) }))} 
                  className="h-full aspect-square flex items-center justify-center rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition cursor-pointer"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="text-xs font-mono font-bold text-gray-900 dark:text-white">{newSkill.years}</span>
                <button 
                  type="button" 
                  onClick={() => setNewSkill(p => ({ ...p, years: p.years + 1 }))} 
                  className="h-full aspect-square flex items-center justify-center rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Suggestions Chips (1-click add) */}
          {quickSuggestions.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium mr-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-zinc-400" /> Suggestions:
              </span>
              {quickSuggestions.map(s => (
                <button
                  key={s.tag_id}
                  type="button"
                  onClick={() => addQuickSkill(s)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 transition cursor-pointer"
                  title={`Add ${s.name} in 1 click`}
                >
                  <span>+ {s.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Add Skill Button */}
          <button 
            type="button" 
            onClick={addCompoundSkill} 
            className="w-full py-2 px-4 bg-zinc-900 hover:bg-zinc-800 active:bg-black text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
            disabled={isLoading || !canAdd}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Skill</span>
          </button>
        </div>

        {/* Current Active Skills List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
              Your Skills ({skillsList.length})
            </span>
            {skillsList.length < 3 && (
              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                ({3 - skillsList.length} more needed for profile setup)
              </span>
            )}
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5 bg-gray-50 dark:bg-black/20 p-2 rounded-xl border border-gray-200 dark:border-white/5 custom-scrollbar">
            {skillsList.map((skill, index) => (
              <div 
                key={index} 
                className="flex justify-between items-center text-xs bg-white dark:bg-white/[0.02] p-2.5 rounded-xl border border-gray-200 dark:border-white/5 shadow-2xs hover:border-gray-300 dark:hover:border-white/15 transition-all"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span className="font-bold text-gray-900 dark:text-white truncate">
                    {skill.name}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="capitalize text-zinc-700 dark:text-zinc-300 font-mono text-[10px] bg-zinc-100 dark:bg-white/5 px-2 py-0.5 rounded-lg border border-zinc-200 dark:border-white/10 font-semibold">
                    {skill.proficiency}
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-zinc-400 font-mono font-medium">
                    {skill.years} {skill.years === 1 ? 'yr' : 'yrs'}
                  </span>
                  <button 
                    type="button" 
                    onClick={() => removeSkill(skill.name)} 
                    className="text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer"
                    title={`Remove ${skill.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {skillsList.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-zinc-500 space-y-1.5">
                <AlertCircle className="h-5 w-5 opacity-40" />
                <p className="text-xs font-medium">No skills added yet.</p>
                <p className="text-[11px] text-gray-400 dark:text-zinc-500">
                  Select a skill above or click a suggestion to add your expertise.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-white/5">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-4 py-2 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-zinc-300 text-xs font-semibold rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer"
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleSave} 
            disabled={isSaving}
            className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSaving ? (
              <>
                <span>Saving...</span>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Save Skills</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
