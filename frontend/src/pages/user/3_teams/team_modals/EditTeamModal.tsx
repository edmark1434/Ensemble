// src/components/modals/EditTeamModal.tsx
import { useState } from "react";
import { X, Upload, Image as ImageIcon } from "lucide-react";

interface EditTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamName: string;
  teamBanner: string;
  onSave: (name: string, banner: string) => void;
}

const EditTeamModal: React.FC<EditTeamModalProps> = ({
  isOpen,
  onClose,
  teamName,
  teamBanner,
  onSave,
}) => {
  const [name, setName] = useState(teamName);
  const [banner, setBanner] = useState(teamBanner);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    if (name.trim()) {
      onSave(name, banner);
      onClose();
    }
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBanner(reader.result as string);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d0f1a] p-6 shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Edit Team
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Banner Upload */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-zinc-300" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Team Banner
          </label>
          <div className="relative h-32 w-full overflow-hidden rounded-lg border border-white/15 bg-white/5">
            {banner ? (
              <img src={banner} alt="Team banner" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <ImageIcon className="h-8 w-8 text-zinc-500" />
              </div>
            )}
            <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
              <input
                type="file"
                accept="image/*"
                onChange={handleBannerUpload}
                className="hidden"
              />
              <Upload className="h-6 w-6 text-white" />
              <span className="ml-2 text-sm text-white">Change Banner</span>
            </label>
          </div>
          {isUploading && (
            <p className="mt-1 text-xs text-zinc-500">Uploading...</p>
          )}
        </div>

        {/* Team Name */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-zinc-300" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Team Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter team name"
            className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Changes
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditTeamModal;