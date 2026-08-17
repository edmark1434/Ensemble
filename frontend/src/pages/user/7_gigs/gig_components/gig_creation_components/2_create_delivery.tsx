import React, { type FormEvent, useRef, useState, type ChangeEvent } from "react";
import { ArrowRight, X, Plus, Minus, Image as ImageIcon, ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CreateDeliveryProps {
  slots: number;
  setSlots: React.Dispatch<React.SetStateAction<number>>;
  termsOfService: string;
  setTermsOfService: (val: string) => void;
  skills: string[];
  setSkills: React.Dispatch<React.SetStateAction<string[]>>;
  firstDraftDelivery: string;
  setFirstDraftDelivery: (val: string) => void;
  galleryUrls: string[];
  setGalleryUrls: React.Dispatch<React.SetStateAction<string[]>>;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onBack: () => void;
  onNext: () => void;
}

const termsOptions = ["Standard License", "Commercial Use (Full Buyout)", "Non-Commercial", "Attribution Required"];
const deliveryOptions = ["1 Day", "2 Days", "3 Days", "5 Days", "7 Days", "14 Days", "30 Days"];

const CustomDropdown: React.FC<{
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  error?: string;
  onSelect: (val: string) => void;
}> = ({ label, value, options, placeholder, error, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-1.5 relative flex-1">
      <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between rounded-xl border bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-3.5 py-2.5 text-xs transition-all ${
            error ? "border-red-500/50" : isOpen ? "border-blue-500/50" : "border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
          }`}
        >
          <span className={value ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-zinc-400"}>
            {value || placeholder}
          </span>
          <ChevronDown className={`h-3.5 w-3.5 text-gray-600 dark:text-zinc-300 transition-transform ${isOpen ? "rotate-180" : ""}`} />
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
                className="absolute left-0 right-0 z-30 max-h-48 overflow-y-auto rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-1.5 shadow-2xl space-y-0.5 custom-scrollbar"
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
                          ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                          : "text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                      }`}
                    >
                      <span>{opt}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />}
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

export const CreateDelivery: React.FC<CreateDeliveryProps> = ({
  slots,
  setSlots,
  termsOfService,
  setTermsOfService,
  skills,
  setSkills,
  firstDraftDelivery,
  setFirstDraftDelivery,
  galleryUrls,
  setGalleryUrls,
  errors,
  setErrors,
  onBack,
  onNext,
}) => {
  const [skillInput, setSkillInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddSkill = (e: FormEvent) => {
    e.preventDefault();
    const cleanInput = skillInput.trim();
    if (!cleanInput) return;

    if (skills.length >= 8) {
      setErrors(prev => ({ ...prev, skills: "You can add a maximum of 8 skills." }));
      return;
    }
    if (skills.includes(cleanInput)) {
      setErrors(prev => ({ ...prev, skills: "This skill has already been added." }));
      return;
    }

    const updatedSkills = [...skills, cleanInput];
    setSkills(updatedSkills);
    setSkillInput("");

    if (updatedSkills.length > 0) {
      setErrors(prev => {
        const { skills: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    const updatedSkills = skills.filter(s => s !== skillToRemove);
    setSkills(updatedSkills);
    if (updatedSkills.length === 0) {
      setErrors(prev => ({ ...prev, skills: "At least 1 skill is required." }));
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
      return;
    }
    const localUrl = URL.createObjectURL(file);
    setGalleryUrls(prev => [...prev, localUrl]);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Add all selected files
      Array.from(e.target.files).forEach(file => processFile(file));
    }
  };

  const removeGalleryImage = (indexToRemove: number) => {
    setGalleryUrls(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const clearError = (key: string) => {
    setErrors(prev => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">Delivery & Media Setup</h2>
        <p className="text-xs text-gray-600 dark:text-zinc-300">Set availability, skills, expected delivery, and upload supporting materials.</p>
      </div>

      {/* Slots & Delivery Grid */}
      <div className="flex flex-col md:flex-row gap-5">
        {/* Positions Count Block */}
        <div className="flex-1 p-3.5 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] flex items-center justify-between">
          <div>
            <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block">Available Slots</label>
            <span className="text-[10px] text-gray-600 dark:text-zinc-400">Limit active orders to manage queue.</span>
          </div>
          <div className="flex items-center gap-2 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-dark-base p-1">
            <button type="button" onClick={() => setSlots(prev => Math.max(1, prev - 1))} className="h-7 w-7 flex items-center justify-center rounded-lg bg-white dark:bg-white/5 shadow-sm dark:shadow-none text-gray-900 dark:text-white focus:outline-none"><Minus className="h-3 w-3" /></button>
            <span className="w-6 text-center font-mono font-bold text-xs select-none">{slots}</span>
            <button type="button" onClick={() => setSlots(prev => prev + 1)} className="h-7 w-7 flex items-center justify-center rounded-lg bg-white dark:bg-white/5 shadow-sm dark:shadow-none text-gray-900 dark:text-white focus:outline-none"><Plus className="h-3 w-3" /></button>
          </div>
        </div>

        <CustomDropdown
          label="First Draft Delivery"
          value={firstDraftDelivery}
          options={deliveryOptions}
          placeholder="Select timeline"
          error={errors.firstDraftDelivery}
          onSelect={(val) => {
            setFirstDraftDelivery(val);
            clearError("firstDraftDelivery");
          }}
        />
      </div>

      {/* Terms of Service */}
      <div>
        <CustomDropdown
          label="Terms of Service"
          value={termsOfService}
          options={termsOptions}
          placeholder="Select applicable rights for final product"
          error={errors.termsOfService}
          onSelect={(val) => {
            setTermsOfService(val);
            clearError("termsOfService");
          }}
        />
      </div>

      {/* Skills Tags */}
      <div className="space-y-1.5 pt-2 border-t border-gray-200 dark:border-white/5">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">Applied Skills & Tags <span className="text-red-500">*</span></label>
          <span className="text-[10px] text-gray-600 dark:text-zinc-400">{skills.length}/8 Added</span>
        </div>
        <form onSubmit={handleAddSkill} className="flex gap-2">
          <input type="text" placeholder="e.g., Color Grading, Audio Sync" value={skillInput} onChange={e => setSkillInput(e.target.value)} className="flex-1 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-3.5 py-2.5 text-xs text-gray-900 dark:text-white outline-none focus:border-blue-500/50 transition-all" />
          <button type="submit" className="px-4 rounded-xl bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs font-bold hover:bg-gray-200 dark:hover:bg-white/20 transition text-gray-900 dark:text-white focus:outline-none">Add</button>
        </form>
        {errors.skills && <p className="text-[11px] text-red-400">{errors.skills}</p>}
        <div className="flex flex-wrap gap-1.5 pt-1 min-h-[30px]">
          {skills.map(s => (
            <span key={s} className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/20 text-gray-700 dark:text-zinc-300">
              {s} <X className="h-3 w-3 cursor-pointer hover:text-gray-900 dark:hover:text-white transition-colors" onClick={() => handleRemoveSkill(s)} />
            </span>
          ))}
          {skills.length === 0 && (
            <span className="text-[11px] text-gray-400 dark:text-zinc-500 italic">No skills added yet...</span>
          )}
        </div>
      </div>

      {/* Gallery */}
      <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-white/5">
        <div>
          <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block">Supporting Pictures (Gallery)</label>
          <p className="text-[10px] text-gray-600 dark:text-zinc-400">Add extra images to showcase your portfolio. Up to 5 images.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {galleryUrls.map((url, idx) => (
            <div key={idx} className="relative w-24 h-24 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden group">
              <img src={url} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => removeGalleryImage(idx)}
                  className="p-1.5 bg-red-500/80 text-white rounded-full hover:bg-red-600 transition"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          {galleryUrls.length < 5 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-xl border border-dashed border-gray-300 dark:border-white/20 bg-gray-50 dark:bg-white/5 hover:border-gray-400 dark:hover:border-white/40 transition-colors flex flex-col items-center justify-center text-gray-500 dark:text-zinc-400 group"
            >
              <Plus className="h-5 w-5 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-medium">Add Image</span>
            </button>
          )}
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple className="hidden" />
        </div>
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex gap-2.5">
        <button type="button" onClick={onBack} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-500 dark:text-zinc-400 font-bold hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition text-xs focus:outline-none">
          Go Back
        </button>
        <button type="button" onClick={onNext} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition focus:outline-none shadow-lg shadow-blue-500/20">
          Continue to Tiers <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default CreateDelivery;
