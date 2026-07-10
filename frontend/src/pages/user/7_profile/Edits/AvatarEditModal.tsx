import React, { useState, useRef } from "react";
import { X, Upload, Image as ImageIcon } from "lucide-react";

interface AvatarEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (fileOrPresetUrl: File | string, isPreset: boolean) => void;
  currentAvatarName?: string;
}

export default function AvatarEditModal({ isOpen, onClose, onSave, currentAvatarName }: AvatarEditModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("/profile_presets/p1.png");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCustomFile, setIsCustomFile] = useState(false);

  // Generate presets array dynamically from p1.png to p12.png matching your format[cite: 2]
  const presets = Array.from({ length: 12 }, (_, i) => `/profile_presets/p${i + 1}.png`);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setSelectedFile(file);
      setIsCustomFile(true);
    }
  };

  const handlePresetSelect = (presetPath: string) => {
    setPreviewUrl(presetPath);
    setSelectedFile(null);
    setIsCustomFile(false);
  };

  const handleSaveClick = () => {
    if (isCustomFile && selectedFile) {
      onSave(selectedFile, false);
    } else {
      onSave(previewUrl, true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#080a12]/95 backdrop-blur-md p-6 shadow-2xl font-['Plus Jakarta Sans',sans-serif]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-white/10 p-1.5 text-zinc-400 transition hover:bg-white/20 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-blue-400 mb-4">
            <ImageIcon className="h-5 w-5" />
          </div>

          <h3 className="text-xl font-bold text-white mb-2">Update Avatar Profile</h3>
          <p className="text-zinc-400 text-xs mb-6 max-w-xs leading-relaxed">
            Upload a customized image asset or select one of our curated design system profile presets.[cite: 2]
          </p>

          {/* Interactive Preview Ring[cite: 2] */}
          <div className="relative w-28 h-28 rounded-full border-2 border-dashed p-1 bg-[#080a12] mb-6 transition-all duration-300"
               style={{ borderColor: isCustomFile ? '#4a6fa5' : '#2a2d3e' }}>
            <div className="w-full h-full rounded-full overflow-hidden bg-[#13151f] flex items-center justify-center">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover transition-transform" />
              ) : (
                <span className="text-2xl font-bold text-white">{currentAvatarName?.charAt(0) || "U"}</span>
              )}
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white text-[#080a12] flex items-center justify-center cursor-pointer shadow-lg hover:bg-zinc-200 transition"
              title="Upload Custom Image"
            >
              <Upload className="h-3.5 w-3.5" />
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          <div className="w-full text-left">
            <label className="block text-zinc-500 text-xs font-semibold mb-3 tracking-wider uppercase">
              System Presets[cite: 2]
            </label>

            {/* 12-Item Preset Grid Matrix[cite: 2] */}
            <div className="grid grid-cols-6 gap-2 mb-6">
              {presets.map((presetPath, idx) => {
                const isActive = !isCustomFile && previewUrl === presetPath;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePresetSelect(presetPath)}
                    className={`w-full aspect-square rounded-full bg-[#13151f] overflow-hidden p-0 border-2 transition-all duration-200 hover:scale-105 ${
                      isActive ? "border-[#4a6fa5] shadow-[0_0_12px_rgba(74,111,165,0.3)] scale-105" : "border-transparent hover:border-zinc-500"
                    }`}
                  >
                    <img src={presetPath} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover scale-110" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="w-full flex gap-3 mt-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-full border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-zinc-400 transition hover:bg-white/10 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveClick}
              className="flex-1 rounded-full bg-white text-[#080a12] py-2.5 text-xs font-bold transition hover:bg-zinc-200"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}