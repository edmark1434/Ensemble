import { useState, useEffect } from "react";
import { X, Plus, Trash2, Check, Minus, AlertCircle, ChevronDown } from "lucide-react";
import api from "@/lib/axios.ts";

type Proficiency = "beginner" | "intermediate" | "advanced" | "expert";

export interface SkillObject {
  tag_id: number | string;
  name: string;
  proficiency: Proficiency;
  years: number;
}

interface SkillsEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSkills: SkillObject[];
  onSave: (originalSkills: SkillObject[], updatedSkills: SkillObject[]) => void;
  availableSkillsList?: { tag_id: number; name: string }[];
}

export default function SkillsEditModal({
  isOpen,
  onClose,
  currentSkills = [],
  onSave,
  availableSkillsList = []
}: SkillsEditModalProps) {
  const [skillsList, setSkillsList] = useState<SkillObject[]>([]);
  const [newSkill, setNewSkill] = useState({ name: "", proficiency: "beginner" as Proficiency, years: 1 });
  const [suggestedSkills, setSuggestedSkills] = useState<{ tag_id: number; name: string }[]>(availableSkillsList);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Synchronize internal state fields when modal opens
  useEffect(() => {
    if (isOpen) {
      setSkillsList([...currentSkills]);
      setSearchTerm("");
      setNewSkill({ name: "", proficiency: "beginner", years: 1 });
    }
  }, [isOpen, currentSkills]);

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
        .catch(err => console.error("Failed fetching matrix suggestions database log:", err))
        .finally(() => setIsLoading(false));
    } else {
      setSuggestedSkills(availableSkillsList);
    }
  }, [isOpen, availableSkillsList]);

  if (!isOpen) return null;

  // Filter skills based on search term and exclude already added ones
  const getFilteredSkills = () => {
    const existingSkillNames = skillsList.map(s => s.name.toLowerCase());
    return suggestedSkills.filter(skill => 
      skill.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !existingSkillNames.includes(skill.name.toLowerCase())
    );
  };

  const filteredSkills = getFilteredSkills();

  const handleSkillSelect = (skillName: string) => {
    setNewSkill({ ...newSkill, name: skillName });
    setSearchTerm(skillName);
    setIsDropdownOpen(false);
  };

  const addCompoundSkill = () => {
    if (!newSkill.name.trim()) return;
    if (skillsList.length >= 12) {
      alert("Maximum of 12 capability blocks allowed in matrix registries.");
      return;
    }

    const uniqueName = newSkill.name.trim();
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
    setSearchTerm("");
    setIsDropdownOpen(false);
  };

  const removeSkill = (name: string) => {
    setSkillsList(prev => prev.filter(s => s.name !== name));
  };

  const handleSave = () => {
    onSave(currentSkills, skillsList);
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 font-['Plus Jakarta Sans',sans-serif] text-zinc-300 select-none animate-fadeIn">
      <div className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-[#080a12] p-5 md:p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] space-y-4">

        {/* Header Component Controls */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <div>
              <h3 className="text-sm font-black tracking-wider uppercase text-white">Manage Skills Registry</h3>
              <p className="text-[11px] text-zinc-400 font-medium">Update your professional competence profile parameters.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white rounded-lg p-1.5 hover:bg-white/5 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Input Parameters Allocation Bar Box */}
        <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Add Capability Matrix Block</span>
            <span className="text-[10px] font-mono text-zinc-500 font-bold">{skillsList.length} / 12 Max</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
            <div className="sm:col-span-2 relative">
              <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Skill Name Tag</label>
              
              {/* Dropdown Trigger */}
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsDropdownOpen(true);
                    // If user types, clear the selected skill name
                    if (e.target.value !== newSkill.name) {
                      setNewSkill({ ...newSkill, name: "" });
                    }
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  onBlur={() => {
                    // Delay closing to allow click on dropdown items
                    setTimeout(() => setIsDropdownOpen(false), 200);
                  }}
                  className="w-full rounded-lg border border-white/10 bg-[#121420] px-3 py-1.5 text-xs outline-none text-white focus:border-blue-500/30 pr-8"
                  placeholder={isLoading ? "Loading skills..." : "Search or select skill..."}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition"
                >
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Dropdown List */}
              {isDropdownOpen && filteredSkills.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-[#121420] border border-white/10 rounded-lg max-h-40 overflow-y-auto shadow-xl">
                  {filteredSkills.map((skill) => (
                    <button
                      key={skill.tag_id}
                      type="button"
                      onClick={() => handleSkillSelect(skill.name)}
                      className="w-full text-left px-3 py-2 text-xs text-white hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                    >
                      {skill.name}
                    </button>
                  ))}
                </div>
              )}

              {/* No Results Message */}
              {isDropdownOpen && searchTerm && filteredSkills.length === 0 && suggestedSkills.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-[#121420] border border-white/10 rounded-lg p-3 text-center">
                  <p className="text-xs text-zinc-400">No matching skills found</p>
                  <p className="text-[10px] text-zinc-500 mt-1">You can still add it manually</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Proficiency</label>
              <select
                value={newSkill.proficiency}
                onChange={(e) => setNewSkill(p => ({ ...p, proficiency: e.target.value as Proficiency }))}
                className="w-full rounded-lg border border-white/10 bg-[#121420] px-2 py-1.5 text-xs outline-none text-white h-[32px] font-medium"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1 text-center">Years of Experience</label>
              <div className="flex items-center justify-between border border-white/10 bg-white/5 rounded-lg h-[32px] overflow-hidden p-0.5">
                <button 
                  type="button" 
                  onClick={() => setNewSkill(p => ({ ...p, years: Math.max(1, p.years - 1) }))} 
                  className="h-full aspect-square flex items-center justify-center rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition"
                >
                  <Minus className="h-2.5 w-2.5" />
                </button>
                <span className="text-xs font-mono font-bold text-zinc-200">{newSkill.years}</span>
                <button 
                  type="button" 
                  onClick={() => setNewSkill(p => ({ ...p, years: p.years + 1 }))} 
                  className="h-full aspect-square flex items-center justify-center rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition"
                >
                  <Plus className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>
          </div>

          <button 
            type="button" 
            onClick={addCompoundSkill} 
            className="w-full px-4 py-2 bg-blue-600 rounded-lg text-xs font-bold hover:bg-blue-500 transition shadow-md shadow-blue-600/10 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || !newSkill.name.trim()}
          >
            Add Skill Matrix Block
          </button>
        </div>

        {/* Current Active List Track Area */}
        <div className="max-h-44 overflow-y-auto space-y-1.5 bg-black/20 p-2.5 rounded-xl border border-white/5 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
          {skillsList.map((skill, index) => (
            <div key={index} className="flex justify-between items-center text-xs bg-white/[0.01] p-2 rounded-lg border border-white/5">
              <span className="font-bold text-zinc-200 pl-1">{skill.name}</span>
              <div className="flex items-center gap-3">
                <span className="capitalize text-blue-400 font-mono text-[10px] bg-blue-500/5 px-1.5 py-0.5 rounded border border-blue-500/10">
                  {skill.proficiency}
                </span>
                <span className="text-[11px] text-zinc-400 font-medium">
                  {skill.years} {skill.years === 1 ? 'yr' : 'yrs'}
                </span>
                <button 
                  type="button" 
                  onClick={() => removeSkill(skill.name)} 
                  className="text-red-400 hover:text-red-300 p-1 rounded-md hover:bg-red-500/10 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          {skillsList.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 text-zinc-600 space-y-1">
              <AlertCircle className="h-4 w-4 opacity-40" />
              <p className="text-xs font-medium italic">No capability matrix points mapped.</p>
            </div>
          )}
        </div>

        {/* Footer Navigation controls */}
        <div className="flex justify-end gap-2.5 pt-3 border-t border-white/5">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-4 py-2 border border-white/10 bg-white/5 text-zinc-400 text-xs font-semibold rounded-lg hover:text-white transition"
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleSave} 
            className="px-4 py-2 bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-2 hover:bg-blue-600 transition shadow-lg shadow-blue-500/10"
          >
            Commit Changes <Check className="h-3.5 w-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
}