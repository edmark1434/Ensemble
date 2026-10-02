import React, { type FormEvent, useRef, useState, type ChangeEvent, useEffect } from "react";
import { ArrowRight, ArrowLeft, X, Plus, Minus, Image as ImageIcon, ChevronDown, Check, Edit2, Eye, EyeOff, Bold, Italic, List, Users, Clock, HelpCircle, Trash2, CheckCircle2, } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { showErrorToast } from "@/components/utility/toast";
import { useTerms } from "@/hooks/useTerms";

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
  setGalleryFiles?: React.Dispatch<React.SetStateAction<File[]>>;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onBack: () => void;
  onNext: () => void;
}

const termsOptions = ["Standard License", "Commercial Use (Full Buyout)", "Non-Commercial", "Attribution Required"];
const deliveryOptions = ["1 Day", "2 Days", "3 Days", "5 Days", "7 Days", "14 Days", "30 Days"];

const CustomDropdown: React.FC<{
  label: React.ReactNode;
  value: string;
  options: string[];
  placeholder: string;
  error?: string;
  onSelect: (val: string) => void;
}> = ({ label, value, options, placeholder, error, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-1.5 relative flex-1">
      <div className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-1 flex items-center">
        {label} <span className="text-red-500 ml-1">*</span>
      </div>
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
  setGalleryFiles,
  errors,
  setErrors,
  onBack,
  onNext,
}) => {
  
  const [skillInput, setSkillInput] = useState("");
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [selectedIdxs, setSelectedIdxs] = useState<Set<number>>(new Set());

  const handleReorderDrop = (targetIdx: number) => {
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    setGalleryUrls(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(draggedIdx, 1);
      updated.splice(targetIdx, 0, moved);
      return updated;
    });
    if (setGalleryFiles) {
      setGalleryFiles(prev => {
        const updated = [...prev];
        const [moved] = updated.splice(draggedIdx, 1);
        updated.splice(targetIdx, 0, moved);
        return updated;
      });
    }
    setDraggedIdx(null);
  };

  const toggleSelect = (idx: number) => {
    setSelectedIdxs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(idx)) newSet.delete(idx);
      else newSet.add(idx);
      return newSet;
    });
  };

  const deleteSelected = () => {
    const toDelete = Array.from(selectedIdxs).sort((a,b) => b - a);
    setGalleryUrls(prev => prev.filter((_, idx) => !selectedIdxs.has(idx)));
    if (setGalleryFiles) setGalleryFiles(prev => prev.filter((_, idx) => !selectedIdxs.has(idx)));
    setSelectedIdxs(new Set());
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { terms, fetchTerms } = useTerms();
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const tosRef = useRef<HTMLTextAreaElement>(null);

  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const textarea = tosRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end, text.length);
    let newText = "";
    let finalSelectionStart = start + prefix.length;
    let finalSelectionEnd = end + prefix.length + selected.length;
    if (suffix === '' && selected.includes('\n')) {
      const lines = selected.split('\n');
      const bulleted = lines.map(line => prefix + line).join('\n');
      newText = before + bulleted + after;
      finalSelectionEnd = start + bulleted.length;
    } else {
      newText = before + prefix + selected + suffix + after;
    }
    setTermsOfService(newText);
    clearError("termsOfService");
    setTimeout(() => { textarea.focus(); textarea.setSelectionRange(finalSelectionStart, finalSelectionEnd); }, 0);
  };

  useEffect(() => {
    fetchTerms();
  }, [fetchTerms]);

  const gigTerms = terms.filter(t => t.terms_type === 'gigs');

  // Set default if none selected
  useEffect(() => {
    if (!termsOfService && gigTerms.length > 0) {
      const defaultTerm = gigTerms.find(t => t.is_default) || gigTerms[0];
      setTermsOfService(defaultTerm.terms_content);
    }
  }, [gigTerms, termsOfService, setTermsOfService]);

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

  const clearError = (key: string) => {
    setErrors(prev => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      showErrorToast("Please upload an image file.");
      return;
    }
    setGalleryUrls(prev => {
      if (prev.length >= 5) return prev;
      return [...prev, URL.createObjectURL(file)];
    });
    if (setGalleryFiles) {
      setGalleryFiles(prev => {
        if (prev.length >= 5) return prev;
        return [...prev, file];
      });
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const remaining = 5 - galleryUrls.length;
      if (e.target.files.length > remaining) {
        showErrorToast("You can upload a maximum of 5 supporting pictures.");
      }
      Array.from(e.target.files).slice(0, remaining).forEach(file => processFile(file));
      clearError("galleryUrls");
    }
  };

  
  const [isGalleryDragging, setIsGalleryDragging] = useState(false);
  const handleGalleryDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsGalleryDragging(true);
  };
  const handleGalleryDragLeave = () => {
    setIsGalleryDragging(false);
  };
  const handleGalleryDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsGalleryDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const remaining = 5 - galleryUrls.length;
      if (e.dataTransfer.files.length > remaining) {
        showErrorToast("You can upload a maximum of 5 supporting pictures.");
      }
      Array.from(e.dataTransfer.files).slice(0, remaining).forEach(file => processFile(file));
      clearError("galleryUrls");
    }
  };

  const moveGalleryImage = (index: number, direction: 'left' | 'right') => {
    if ((direction === 'left' && index === 0) || (direction === 'right' && index === galleryUrls.length - 1)) return;
    const newIdx = direction === 'left' ? index - 1 : index + 1;
    setGalleryUrls(prev => {
      const updated = [...prev];
      [updated[index], updated[newIdx]] = [updated[newIdx], updated[index]];
      return updated;
    });
    if (setGalleryFiles) {
      setGalleryFiles(prev => {
        const updated = [...prev];
        [updated[index], updated[newIdx]] = [updated[newIdx], updated[index]];
        return updated;
      });
    }
  };

  const removeGalleryImage = (indexToRemove: number) => {
    setGalleryUrls(prev => prev.filter((_, idx) => idx !== indexToRemove));
    if (setGalleryFiles) setGalleryFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
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
            <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="h-3 w-3 text-gray-500" /> Available Slots
              <div className="group relative ml-1 flex items-center cursor-help">
                <HelpCircle className="h-3 w-3 text-gray-400" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 border border-gray-200 dark:border-white/10 text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 normal-case font-normal text-center shadow-xl">
                  This limits how many active orders you can take at once to manage your workload.
                </div>
              </div>
            </label>
            <span className="text-[10px] text-gray-600 dark:text-zinc-400">Limit active orders to manage queue.</span>
          </div>
          <div className="flex items-center gap-2 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-dark-base p-1">
            <button type="button" onClick={() => setSlots(prev => Math.max(1, prev - 1))} className="h-7 w-7 flex items-center justify-center rounded-lg bg-white dark:bg-white/5 shadow-sm dark:shadow-none text-gray-900 dark:text-white focus:outline-none"><Minus className="h-3 w-3" /></button>
            <span className="w-6 text-center font-mono font-bold text-xs select-none">{slots}</span>
            <button type="button" onClick={() => setSlots(prev => Math.min(10, prev + 1))} className="h-7 w-7 flex items-center justify-center rounded-lg bg-white dark:bg-white/5 shadow-sm dark:shadow-none text-gray-900 dark:text-white focus:outline-none"><Plus className="h-3 w-3" /></button>
          </div>
        </div>

        <CustomDropdown
          label={
            <span className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-gray-500" /> First Draft Delivery
              <div className="group relative ml-1 flex items-center cursor-help">
                <HelpCircle className="h-3 w-3 text-gray-400" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 border border-gray-200 dark:border-white/10 text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 normal-case font-normal text-center shadow-xl">
                  The maximum number of days it will take you to send the initial draft of the work.
                </div>
              </div>
            </span>
          } as any
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
      {/* Terms of Service */}
      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6 pt-6 border-t border-gray-200 dark:border-white/5">
        {/* Left Side: Controls & Guide */}
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Terms of Service (TOS)
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
              Select an existing TOS template or edit standard agreement terms for the client.
            </p>
          </div>
          
          <div className="w-full">
            <CustomDropdown
              label="SELECT TOS PRESET"
              value={gigTerms.find(t => t.terms_content === termsOfService)?.terms_title || (termsOfService ? "Custom Terms" : "")}
              options={gigTerms.map(t => t.terms_title)}
              placeholder="Select a template..."
              onSelect={(val) => {
                const selectedTerm = gigTerms.find(t => t.terms_title === val);
                if (selectedTerm) {
                  setTermsOfService(selectedTerm.terms_content);
                }
                clearError("termsOfService");
              }}
            />
          </div>

          <div className="flex flex-col p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-2">
              Writing Fair Terms
            </h3>
            <p className="text-[11px] text-gray-600 dark:text-zinc-400 leading-relaxed mb-3">
              Clear terms protect both you and the client. Make sure to define:
            </p>
            <ul className="text-[11px] text-gray-600 dark:text-zinc-400 list-disc list-inside space-y-1.5 font-medium">
              <li>Revision limits</li>
              <li>Commercial rights</li>
              <li>Refund conditions</li>
              <li>Source file access</li>
            </ul>
          </div>
        </div>

        {/* Right Side: Editor */}
        <div className="flex flex-col w-full h-full">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Edit2 className="h-3 w-3" />
              ACTIVE CONTRACT TERMS (EDITABLE)
            </label>
            <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-dark-base rounded-lg p-1 border border-gray-200 dark:border-white/5">
              <button type="button" onClick={() => insertMarkdown('**', '**')} title="Bold" className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-zinc-400 transition">
                <Bold className="h-3 w-3" />
              </button>
              <button type="button" onClick={() => insertMarkdown('*', '*')} title="Italic" className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-zinc-400 transition">
                <Italic className="h-3 w-3" />
              </button>
              <button type="button" onClick={() => insertMarkdown('- ')} title="List" className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-zinc-400 transition">
                <List className="h-3 w-3" />
              </button>
              <div className="w-px h-3 bg-gray-300 dark:bg-white/10 mx-1" />
              <button type="button" onClick={() => setIsPreviewMode(!isPreviewMode)} title={isPreviewMode ? "Edit Mode" : "Preview Mode"} className={`p-1.5 rounded transition flex items-center gap-1.5 px-2 ${isPreviewMode ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" : "hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-zinc-400"}`}>
                <span className="text-[10px] font-bold">{isPreviewMode ? "Edit" : "Preview"}</span>
              </button>
            </div>
          </div>
          
          {isPreviewMode ? (
            <div className="w-full h-full min-h-[250px] rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-4 py-3 text-xs text-gray-900 dark:text-zinc-200 shadow-inner overflow-auto custom-scrollbar prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-li:my-0 font-sans">
              {termsOfService.trim() ? (
                <div dangerouslySetInnerHTML={{ __html: termsOfService.replace(/\n/g, "<br/>").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\*(.*?)\*/g, "<em>$1</em>") }} />
              ) : (
                <span className="text-gray-400 dark:text-zinc-500 italic">No terms provided yet...</span>
              )}
            </div>
          ) : (
            <textarea
              ref={tosRef}
              value={termsOfService}
              onChange={(e) => {
                setTermsOfService(e.target.value);
                clearError("termsOfService");
              }}
              placeholder="Specify your terms of service..."
              className={`w-full h-full min-h-[250px] rounded-xl border bg-gray-50 dark:bg-white/5 shadow-sm dark:shadow-none p-4 text-xs text-gray-900 dark:text-white outline-none transition-all resize-none leading-relaxed font-mono custom-scrollbar ${errors.termsOfService ? "border-red-500/50 focus:border-red-500" : "border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 focus:border-blue-500/50"}`}
            />
          )}
          {errors.termsOfService && <p className="text-[11px] text-red-400 mt-1">{errors.termsOfService}</p>}
        </div>
      </div>

      {/* Gallery */}
      <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block">Supporting Pictures (Gallery) <span className="text-red-500">*</span></label>
            <p className="text-[10px] text-gray-600 dark:text-zinc-400">Add up to 5 images (JPG, PNG, WEBP, up to 20MB). Drag to reorder. Click to select.</p>
          </div>
          {selectedIdxs.size > 0 && (
            <button type="button" onClick={deleteSelected} className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-bold rounded-lg transition flex items-center gap-1.5">
              <Trash2 className="h-3 w-3" /> Delete ({selectedIdxs.size})
            </button>
          )}
        </div>
        
        {/* Drop Zone */}
        {galleryUrls.length < 5 && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-xl border border-dashed border-gray-300 dark:border-white/20 bg-gray-50 dark:bg-white/5 hover:border-gray-400 dark:hover:border-white/30 flex flex-col items-center justify-center py-6 cursor-pointer transition-all duration-200"
          >
            <ImageIcon className="h-6 w-6 text-gray-400 dark:text-zinc-500 mb-2" />
            <p className="text-xs font-semibold text-gray-700 dark:text-zinc-300">Click to upload images</p>
          </div>
        )}
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple className="hidden" />

        {/* Display Grid */}
        {galleryUrls.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <AnimatePresence>
              {galleryUrls.map((url, idx) => {
                const isSelected = selectedIdxs.has(idx);
                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.2 }}
                    key={url}
                    draggable
                    onDragStart={() => setDraggedIdx(idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleReorderDrop(idx)}
                    onClick={() => toggleSelect(idx)}
                    className={`relative aspect-square rounded-xl overflow-hidden cursor-grab active:cursor-grabbing border-2 transition-colors ${isSelected ? 'border-blue-500' : 'border-transparent hover:border-gray-300 dark:hover:border-white/20'}`}
                  >
                    <img src={url} alt={`Gallery ${idx}`} className="w-full h-full object-cover pointer-events-none" />
                    
                    <div className={`absolute top-2 right-2 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0'}`}>
                      <CheckCircle2 className="h-4 w-4 text-blue-500 fill-white" />
                    </div>

                    {!isSelected && (
                      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded shadow-sm">
                        {idx + 1}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
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
