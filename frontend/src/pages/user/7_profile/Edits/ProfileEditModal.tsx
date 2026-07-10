import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Check, Minus } from "lucide-react";
import axios from "axios"; // Using standard axios instance for external public network requests
import api from "@/lib/axios.ts";

type Proficiency = "beginner" | "intermediate" | "advanced" | "expert";

interface SkillObject {
  tag_id: number | string;
  name: string;
  proficiency: Proficiency;
  years: number;
}

interface UserDetail {
  username: string;
  name: string;
  middleName?: string;
  suffix?: string;
  birthdate?: string;
  country?: string;
  zipCode?: string;
  role: "Freelancer" | "Client" | "Freelancer & Client" | "Casual";
  email_address: string;
  location: string;
  bio: string;
  tagline: string;
  skills?: SkillObject[];
  social_links?: any[];
}

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: UserDetail;
  onSave: (updatedData: UserDetail) => void;
  availableSkillsList?: { tag_id: number; name: string }[];
}

export default function ProfileEditModal({ isOpen, onClose, data, onSave, availableSkillsList = [] }: ProfileEditModalProps) {
  const [formData, setFormData] = useState<UserDetail>({ ...data });
  const [newSkill, setNewSkill] = useState({ name: "", proficiency: "beginner" as Proficiency, years: 1 });

  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 3;

  const [suggestedCountries, setSuggestedCountries] = useState<string[]>([]);
  const [suggestedCities, setSuggestedCities] = useState<string[]>([]);
  const [suggestedTaglines, setSuggestedTaglines] = useState<string[]>([]);
  const [suggestedSkills, setSuggestedSkills] = useState<{ tag_id: number; name: string }[]>(availableSkillsList);

  // Step 1: Fetch Countries from Public API & Taglines from App API[cite: 5]
  useEffect(() => {
    if (!isOpen) return;

    // Fetching from CountriesNow Free Public Registry
    axios.get("https://countriesnow.space/api/v0.1/countries/positions")
      .then(res => {
        if (res.data && Array.isArray(res.data.data)) {
          const countryNames = res.data.data.map((c: any) => c.name);
          setSuggestedCountries(countryNames);
        }
      })
      .catch(() => setSuggestedCountries(["Philippines", "United States", "Canada", "Singapore"]));

    // Fetch tagline recommendations[cite: 5]
    api.get("/api/suggestions/taglines")
      .then(res => setSuggestedTaglines(res.data.suggestions || []))
      .catch(() => setSuggestedTaglines(["Full-Stack Software Engineer", "UI/UX Designer", "Video Editor"]));

    // Fetch capability tag choices[cite: 5]
    if (availableSkillsList.length === 0) {
      api.get("/api/tags/").then(res => setSuggestedSkills(res.data.tags || []));
    }
  }, [isOpen, availableSkillsList]);

  // Step 2: Fetch Dependent Cities via Post Request when Country Changes[cite: 5]
  useEffect(() => {
    if (!formData.country?.trim()) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestedCities([]);
      return;
    }

    // Dynamic payload retrieval requirement for CountriesNow API city indexes
    axios.post("https://countriesnow.space/api/v0.1/countries/cities", {
      country: formData.country.trim()
    })
      .then(res => {
        if (res.data && Array.isArray(res.data.data)) {
          setSuggestedCities(res.data.data);
        }
      })
      .catch(() => {
        // Fallback defaults if offline or country misspelled[cite: 5]
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
          if (formData.country.toLowerCase() === "philippines") {
          setSuggestedCities(["Cebu City", "Manila", "Quezon City", "Davao City"]);
        } else {
          setSuggestedCities([]);
        }
      });
  }, [formData.country]);

  if (!isOpen) return null;

  const nextStep = () => {
    if (currentStep < totalSteps) setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addCompoundSkill = () => {
    if (!newSkill.name.trim()) return;
    if ((formData.skills || []).length >= 12) {
      alert("Maximum of 12 capability blocks allowed in matrix registries.");
      return;
    }

    const uniqueName = newSkill.name.trim();
    const exists = formData.skills?.some(s => s.name.toLowerCase() === uniqueName.toLowerCase());
    if (exists) return;

    const systemMatchedTag = suggestedSkills.find(s => s.name.toLowerCase() === uniqueName.toLowerCase());

    const appendedSkill: SkillObject = {
      tag_id: systemMatchedTag ? systemMatchedTag.tag_id : `custom_${Date.now()}`,
      name: uniqueName,
      proficiency: newSkill.proficiency,
      years: newSkill.years
    };

    setFormData(prev => ({
      ...prev,
      skills: [...(prev.skills || []), appendedSkill]
    }));

    setNewSkill({ name: "", proficiency: "beginner", years: 1 });
  };

  const removeSkill = (name: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills?.filter(s => s.name !== name) || []
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-['Plus Jakarta Sans',sans-serif]">
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-[#080a12] p-6 shadow-2xl text-white transition-all duration-300">

        <button onClick={onClose} className="absolute right-4 top-4 text-zinc-400 hover:text-white rounded-lg p-1.5 hover:bg-white/5 transition">
          <X className="h-5 w-5" />
        </button>

        {/* Progress Tracker Banner[cite: 5] */}
        <div className="mb-6">
          <h2 className="text-xl font-bold tracking-tight">Edit Profile Parameters</h2>
          <div className="flex items-center gap-2 mt-3 w-full">
            {[...Array(totalSteps)].map((_, idx) => (
              <div key={idx} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${(idx + 1) <= currentStep ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" : "bg-white/15"}`} />
            ))}
          </div>
          <p className="text-[11px] font-bold tracking-wider text-zinc-500 uppercase mt-2">
            Step {currentStep} of {totalSteps}: {currentStep === 1 ? "Identity Coordinates" : currentStep === 2 ? "Introduction & Title" : "Capabilities Matrix"}
          </p>
        </div>

        <div className="min-h-[320px]">
          {/* STEP 1: Identity & Nested Regional Suggestions Input Matrices[cite: 5] */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Ecosystem Username</label>
                  <input type="text" name="username" value={formData.username} onChange={handleInputChange} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:border-blue-500/50 outline-none transition" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">First & Last Name</label>
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:border-blue-500/50 outline-none transition" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Middle Name</label>
                  <input type="text" name="middleName" value={formData.middleName || ""} onChange={handleInputChange} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:border-blue-500/50 outline-none transition" placeholder="Optional" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Suffix</label>
                  <input type="text" name="suffix" value={formData.suffix || ""} onChange={handleInputChange} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:border-blue-500/50 outline-none transition" placeholder="Jr., III" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Birthdate</label>
                  <input type="date" name="birthdate" value={formData.birthdate || ""} onChange={handleInputChange} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:border-blue-500/50 outline-none text-zinc-300 transition" style={{ colorScheme: 'dark' }} />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Role Matrix Status</label>
                  <select name="role" value={formData.role} onChange={handleInputChange} className="w-full rounded-lg border border-white/10 bg-[#121420] px-3 py-2 text-sm focus:border-blue-500/50 outline-none transition">
                    <option value="Freelancer">Freelancer</option>
                    <option value="Client">Client</option>
                    <option value="Freelancer & Client">Freelancer & Client</option>
                    <option value="Casual">Casual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Primary Street Address</label>
                  <input type="text" name="location" value={formData.location} onChange={handleInputChange} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:border-blue-500/50 outline-none transition" placeholder="e.g. 683 Holyname ST., Mabolo" />
                </div>
              </div>

              {/* Enhanced Interactive API Dropdowns Area Wrapper Set[cite: 5] */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Country Selection (API)</label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country || ""}
                    onChange={handleInputChange}
                    list="countries-datalist"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs focus:border-blue-500/50 outline-none text-zinc-200 transition"
                    placeholder="Type or choose country..."
                  />
                  <datalist id="countries-datalist">
                    {suggestedCountries.map((c, i) => <option key={i} value={c} />)}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">City Next (API Suggested)</label>
                  <input
                    type="text"
                    name="zipCode"
                    value={formData.zipCode || ""}
                    onChange={handleInputChange}
                    list="cities-datalist"
                    disabled={!formData.country?.trim()}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs focus:border-blue-500/50 outline-none text-zinc-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    placeholder={formData.country?.trim() ? "Type or choose city..." : "Select country first..."}
                  />
                  <datalist id="cities-datalist">
                    {suggestedCities.map((city, i) => <option key={i} value={city} />)}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Postal Zip Code</label>
                  <input type="text" placeholder="e.g. 6000" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs outline-none text-zinc-500 cursor-not-allowed" disabled />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Large Bio Input + Hybrid Datalist Tagline Setup[cite: 5] */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Specialization Tagline</label>
                <input
                  type="text"
                  name="tagline"
                  value={formData.tagline}
                  onChange={handleInputChange}
                  list="taglines-list"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:border-blue-500/50 outline-none"
                  placeholder="Type or suggest specializations..."
                />
                <datalist id="taglines-list">{suggestedTaglines.map((t, i) => <option key={i} value={t} />)}</datalist>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Introduction</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows={8}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:border-blue-500/50 outline-none resize-none leading-relaxed"
                  placeholder="Tell the community about yourself formatting paragraphs smoothly..."
                />
              </div>
            </div>
          )}

          {/* STEP 3: Capabilities/Skills Grid Section[cite: 5] */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400">Manage Skills Parameters</h4>
                  <span className="text-[10px] font-mono text-zinc-500">{(formData.skills || []).length} / 12 Max</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-zinc-500 mb-0.5">Skill Name Tag</label>
                    <input type="text" value={newSkill.name} onChange={(e) => setNewSkill(p => ({ ...p, name: e.target.value }))} list="skills-datalist" className="w-full rounded-lg border border-white/10 bg-[#121420] px-3 py-2 text-xs outline-none focus:border-blue-500/30" placeholder="Type or select capability..." />
                    <datalist id="skills-datalist">{suggestedSkills.map(s => <option key={s.tag_id} value={s.name} />)}</datalist>
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-500 mb-0.5">Proficiency Matrix</label>
                    <select value={newSkill.proficiency} onChange={(e) => setNewSkill(p => ({ ...p, proficiency: e.target.value as Proficiency }))} className="w-full rounded-lg border border-white/10 bg-[#121420] px-3 py-2 text-xs outline-none h-[34px]">
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-500 mb-1 text-center">Tenure Years</label>
                    <div className="flex items-center justify-between border border-white/10 bg-white/5 rounded-lg h-[34px] overflow-hidden p-0.5">
                      <button type="button" onClick={() => setNewSkill(p => ({ ...p, years: Math.max(1, p.years - 1) }))} className="h-full aspect-square flex items-center justify-center rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition"><Minus className="h-3 w-3" /></button>
                      <span className="text-xs font-mono font-bold text-zinc-200">{newSkill.years}</span>
                      <button type="button" onClick={() => setNewSkill(p => ({ ...p, years: p.years + 1 }))} className="h-full aspect-square flex items-center justify-center rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition"><Plus className="h-3 w-3" /></button>
                    </div>
                  </div>
                </div>
                <button type="button" onClick={addCompoundSkill} className="mt-3 w-full px-4 py-2 bg-blue-600 rounded-lg text-xs font-bold hover:bg-blue-500 transition shadow-md shadow-blue-600/10">Add Skill Matrix Block</button>
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1.5 bg-black/20 p-2.5 rounded-xl border border-white/5">
                {formData.skills?.map((skill, index) => (
                  <div key={index} className="flex justify-between items-center text-xs bg-white/5 p-2 rounded-lg border border-white/5">
                    <span className="font-medium text-zinc-200 pl-1">{skill.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="capitalize text-blue-400 font-mono text-[10px] bg-blue-500/5 px-1.5 py-0.5 rounded border border-blue-500/10">{skill.proficiency}</span>
                      <span className="text-[11px] text-zinc-400">{skill.years} {skill.years === 1 ? 'yr' : 'yrs'}</span>
                      <button type="button" onClick={() => removeSkill(skill.name)} className="text-red-400 hover:text-red-300 p-1 rounded-md hover:bg-red-500/10 transition"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                ))}
                {(!formData.skills || formData.skills.length === 0) && (
                  <p className="text-xs text-zinc-500 text-center py-4">No capability matrix points mapped.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Wizard Controls Footer Navigation Panel[cite: 5] */}
        <div className="flex justify-between mt-6 border-t border-white/10 pt-4">
          <button type="button" onClick={prevStep} className={`px-4 py-2 border border-white/10 bg-white/5 text-zinc-400 text-xs font-semibold rounded-lg hover:text-white transition ${currentStep === 1 ? "invisible pointer-events-none" : ""}`}>Back</button>
          {currentStep < totalSteps ? (
            <button type="button" onClick={nextStep} className="px-4 py-2 bg-white text-[#080a12] text-xs font-bold rounded-lg hover:bg-zinc-200 transition">Next</button>
          ) : (
            <button type="button" onClick={() => onSave(formData)} className="px-4 py-2 bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-2 hover:bg-blue-600 transition shadow-lg shadow-blue-500/10">Commit Changes <Check className="h-3.5 w-3.5" /></button>
          )}
        </div>
      </div>
    </div>
  );
}