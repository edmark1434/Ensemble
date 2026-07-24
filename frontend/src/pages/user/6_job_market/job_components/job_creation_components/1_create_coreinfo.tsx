import React, { useRef, type ChangeEvent } from "react";
import { ArrowRight, Image as ImageIcon } from "lucide-react";

// eslint-disable-next-line react-refresh/only-export-components
export const sampleUserTeams = [
  { id: "team-01", name: "Alpha Developers Lab" },
  { id: "team-02", name: "Nexus Design Studio" },
];

// eslint-disable-next-line react-refresh/only-export-components
export const categories = ["Social", "YouTube", "Corporate", "Events", "Design", "Development"];
// eslint-disable-next-line react-refresh/only-export-components
export const difficulties = ["Beginner", "Intermediate", "Expert"];

interface CreateCoreInfoProps {
  title: string;
  setTitle: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  category: string;
  setCategory: (val: string) => void;
  difficulty: string;
  setDifficulty: (val: string) => void;
  postingAs: "self" | "team";
  setPostingAs: (val: "self" | "team") => void;
  selectedTeam: string;
  setSelectedTeam: (val: string) => void;
  previewUrl: string | null;
  setPreviewUrl: (val: string | null) => void;
  setThumbnail: (val: string) => void;
  isDragging: boolean;
  setIsDragging: (val: boolean) => void;
  errors: { [key: string]: string };
  setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  onNext: () => void;
  onDiscard: () => void;
}

export const CreateCoreInfo: React.FC<CreateCoreInfoProps> = ({
  title,
  setTitle,
  description,
  setDescription,
  category,
  setCategory,
  difficulty,
  setDifficulty,
  postingAs,
  setPostingAs,
  selectedTeam,
  setSelectedTeam,
  previewUrl,
  setPreviewUrl,
  setThumbnail,
  isDragging,
  setIsDragging,
  errors,
  setErrors,
  onNext,
  onDiscard,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
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
        <input type="text" maxLength={300} placeholder="e.g., Wedding Video Edit - Romantic Style" value={title} onChange={e => { setTitle(e.target.value); if(e.target.value.trim()) setErrors(prev => { const {title, ...r} = prev; return r; }); }} className={`w-full rounded-xl border bg-white/5 px-4 py-3 text-sm text-white outline-none transition-all ${errors.title ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-blue-500/50"}`} />
        {errors.title && <p className="text-xs text-red-400">{errors.title}</p>}
      </div>

      {/* Job Description */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Job Post Description <span className="text-red-500">*</span></label>
          <span className="text-[10px] font-mono text-zinc-500">{description.length}/2000</span>
        </div>
        <textarea rows={5} maxLength={2000} placeholder="Outline requirements, raw footage details, deliverables..." value={description} onChange={e => { setDescription(e.target.value); if(e.target.value.trim()) setErrors(prev => { const {description, ...r} = prev; return r; }); }} className={`w-full rounded-xl border bg-white/5 px-4 py-3 text-sm text-white outline-none transition-all resize-none custom-scrollbar ${errors.description ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-blue-500/50"}`} />
        {errors.description && <p className="text-xs text-red-400">{errors.description}</p>}
      </div>

      {/* Category & Difficulty */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Job Category <span className="text-red-500">*</span></label>
          <select value={category} onChange={e => { setCategory(e.target.value); setErrors(prev => { const {category, ...r} = prev; return r; }); }} className={`w-full rounded-xl border bg-[#0d0f1a] px-4 py-3 text-sm text-white outline-none transition-all ${errors.category ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-blue-500/50"}`}>
            <option value="" disabled className="bg-[#0d0f1a] text-zinc-500">Select Category</option>
            {categories.map(cat => <option key={cat} value={cat} className="bg-[#0d0f1a] text-white">{cat}</option>)}
          </select>
          {errors.category && <p className="text-xs text-red-400">{errors.category}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Job Difficulty <span className="text-red-500">*</span></label>
          <select value={difficulty} onChange={e => { setDifficulty(e.target.value); setErrors(prev => { const {difficulty, ...r} = prev; return r; }); }} className={`w-full rounded-xl border bg-[#0d0f1a] px-4 py-3 text-sm text-white outline-none transition-all ${errors.difficulty ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-blue-500/50"}`}>
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
            <input type="radio" name="postingAs" checked={postingAs === "self"} onChange={() => setPostingAs("self")} className="accent-blue-500 h-4 w-4 outline-none" />
            <div><p className="text-sm font-bold">Individual (Self)</p></div>
          </label>
          <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer select-none transition-all ${postingAs === 'team' ? 'border-blue-500 bg-blue-500/5' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
            <input type="radio" name="postingAs" checked={postingAs === "team"} onChange={() => setPostingAs("team")} className="accent-blue-500 h-4 w-4 outline-none" />
            <div><p className="text-sm font-bold">Shared Studio Team</p></div>
          </label>
        </div>
        {postingAs === "team" && (
          <div className="pt-2">
            <select value={selectedTeam} onChange={e => { setSelectedTeam(e.target.value); setErrors(prev => { const {selectedTeam, ...r} = prev; return r; }); }} className={`w-full rounded-xl border bg-[#0d0f1a] px-4 py-3 text-sm text-white outline-none transition-all ${errors.selectedTeam ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-blue-500/50"}`}>
              <option value="" disabled className="bg-[#0d0f1a] text-zinc-500">Select Team with Posting Permissions...</option>
              {sampleUserTeams.map(t => <option key={t.id} value={t.name} className="bg-[#0d0f1a] text-white">{t.name}</option>)}
            </select>
            {errors.selectedTeam && <p className="text-xs text-red-400 mt-1">{errors.selectedTeam}</p>}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="pt-6 border-t border-white/5 flex gap-3">
        <button type="button" onClick={onDiscard} className="px-5 rounded-xl border border-white/10 text-zinc-400 font-bold hover:text-red-400 hover:border-red-500/30 transition text-sm focus:outline-none">Discard Changes</button>
        <button type="button" onClick={onNext} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-500 py-3.5 text-sm font-bold text-white hover:bg-blue-600 transition focus:outline-none">Confirm and Next <ArrowRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
};

export default CreateCoreInfo;