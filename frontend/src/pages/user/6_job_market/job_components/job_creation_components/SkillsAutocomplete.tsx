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
    <div className="space-y-1.5 pt-2">
      <div className="flex justify-between items-center mb-1.5">
        <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
          Required Skills <span className="text-red-500">*</span>
          <div className="relative group flex items-center">
            <HelpCircle className="h-3 w-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-help" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden w-48 rounded-md bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 px-2 py-1.5 text-center text-[10px] font-normal normal-case text-gray-700 dark:text-gray-300 opacity-0 transition-opacity group-hover:block group-hover:opacity-100 z-10 pointer-events-none shadow-lg">
              These skills will be used for matching your job post with relevant freelancers in our system.
            </div>
          </div>
        </label>
        <span className="text-[10px] text-gray-500 dark:text-zinc-500">{skills.length}/{maxSkills} Added</span>
      </div>
      
      <div className="relative">
        <div 
          className={`transition-all duration-300 ease-in-out ${
            skills.length >= maxSkills ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-32 opacity-100'
          }`}
        >
          <form onSubmit={handleManualAdd} className="flex gap-2 mb-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={isLoading ? "Loading skills..." : "e.g., Color Grading, Auto-captioning"}
                value={skillInput}
                onChange={(e) => {
                  setSkillInput(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                onBlur={() => {
                  // Delay closing to allow clicking dropdown items
                  setTimeout(() => setIsDropdownOpen(false), 200);
                }}
                disabled={isLoading || skills.length >= maxSkills}
                className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-3.5 py-2 text-xs text-gray-900 dark:text-white outline-none focus:border-blue-500/50 transition-all pr-8"
              />
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                disabled={isLoading || skills.length >= maxSkills}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
              >
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
            
            <button
              type="submit"
              disabled={skills.length >= maxSkills || !skillInput.trim()}
              className="px-4 rounded-xl bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs font-bold hover:bg-white/20 transition text-gray-900 dark:text-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </form>
        </div>

        {isDropdownOpen && filteredSkills.length > 0 && skills.length < maxSkills && (
          <div className="absolute top-10 left-0 z-[100] w-[calc(100%-70px)] mt-1 bg-white dark:bg-[#1a1c23] border border-gray-200 dark:border-white/10 rounded-lg max-h-40 overflow-y-auto shadow-xl">
            {filteredSkills.map((skill) => (
              <button
                key={skill.tag_id}
                type="button"
                onClick={() => handleAddSkill(skill.name)}
                className="w-full text-left px-3 py-2 text-xs text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-white/5 last:border-0"
              >
                {skill.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-[11px] text-red-400">{error}</p>}
      
      <div className="flex flex-wrap gap-1.5 pt-1">
        {skills.map((s) => (
          <span
            key={s}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-300"
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
  );
};
