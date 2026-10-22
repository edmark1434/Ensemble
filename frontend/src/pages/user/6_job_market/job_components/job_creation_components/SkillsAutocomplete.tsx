import React, { useState, useEffect } from "react";
import { ChevronDown, HelpCircle, X } from "lucide-react";
import api from "@/lib/axios.ts";

interface SkillsAutocompleteProps {
  skills: string[];
  setSkills: React.Dispatch<React.SetStateAction<string[]>>;
  error?: string;
  maxSkills?: number;
}

export const SkillsAutocomplete: React.FC<SkillsAutocompleteProps> = ({
  skills,
  setSkills,
  error,
  maxSkills = 6
}) => {
  const [skillInput, setSkillInput] = useState("");
  const [availableSkillsList, setAvailableSkillsList] = useState<{ tag_id: number; name: string }[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    api.get("/api/tags/")
      .then(res => {
        const tags = res.data.data || res.data.tags || [];
        setAvailableSkillsList(tags);
      })
      .catch(err => console.error("Failed to fetch skills", err))
      .finally(() => setIsLoading(false));
  }, []);

  const getFilteredSkills = () => {
    const existingSkillNames = skills.map(s => s.toLowerCase());
    return availableSkillsList.filter(skill => 
      skill.name.toLowerCase().includes(skillInput.toLowerCase()) &&
      !existingSkillNames.includes(skill.name.toLowerCase())
    );
  };

  const filteredSkills = getFilteredSkills();

  const handleAddSkill = (skillName: string) => {
    if (!skillName.trim()) return;
    if (skills.length >= maxSkills) return;
    
    const uniqueName = skillName.trim();
    if (skills.some(s => s.toLowerCase() === uniqueName.toLowerCase())) return;

    setSkills(prev => [...prev, uniqueName]);
    setSkillInput("");
    setIsDropdownOpen(false);
  };

  const handleRemoveSkill = (name: string) => {
    setSkills(prev => prev.filter(s => s !== name));
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    handleAddSkill(skillInput);
  };

  return (
    <div className="space-y-2">
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
        <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
          {skills.length}/{maxSkills} Added
        </span>
      </div>
      
      <div className="relative">
        <div 
          className={`transition-all duration-300 ease-in-out ${
            skills.length >= maxSkills ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-32 opacity-100'
          }`}
        >
          <form onSubmit={handleManualAdd} className="flex gap-2 mb-2.5">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={isLoading ? "Loading skills..." : "e.g., Color Grading, Sound Design"}
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
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
              >
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-blue-500' : ''}`} />
              </button>
            </div>
            
            <button
              type="submit"
              disabled={skills.length >= maxSkills || !skillInput.trim()}
              className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 border border-gray-300 dark:border-white/10 text-xs font-bold transition text-gray-900 dark:text-white focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shrink-0"
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
                className="w-full text-left px-3.5 py-2 text-xs font-medium text-gray-800 dark:text-zinc-200 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors"
              >
                {skill.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-[11px] font-medium text-red-500">{error}</p>}
      
      <div className="flex flex-wrap gap-2 pt-1">
        {skills.map((s) => (
          <span
            key={s}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-800 dark:text-zinc-200 shadow-sm"
          >
            <span>{s}</span>
            <X
              className="h-3.5 w-3.5 cursor-pointer text-gray-400 hover:text-red-500 transition-colors ml-0.5"
              onClick={() => handleRemoveSkill(s)}
            />
          </span>
        ))}
      </div>
    </div>
  );
};
