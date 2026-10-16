import React, { useState } from "react";
import { X, Upload, Image as ImageIcon, Lock, Users } from "lucide-react";

interface EditTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamName?: string;
  teamTagline?: string;
  teamDescription?: string;
  teamBanner?: string;
  onSave?: (values: TeamFormValues) => void;
  mode?: "edit" | "create";
  saving?: boolean;
  savingLabel?: string;
  onCreate?: (values: TeamFormValues & { photo: File }) => void;
}

export interface TeamFormValues {
  name: string;
  handle?: string;
  tagline: string;
  description: string;
  visibility?: "Public" | "Private";
  photo?: File;
}

const EditTeamModalContent: React.FC<EditTeamModalProps> = ({
  onClose,
  teamName,
  teamTagline,
  teamDescription,
  teamBanner,
  onSave,
  mode = "edit",
  saving = false,
  savingLabel,
  onCreate,
}) => {
  const [name, setName] = useState(teamName || "");
  const [tagline, setTagline] = useState(teamTagline || "");
  const [description, setDescription] = useState(teamDescription || "");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState(teamBanner || "");
  const [photoError, setPhotoError] = useState("");

  const handleSave = () => {
    if (
      mode === "create" &&
      name.trim() &&
      tagline.trim() &&
      description.trim() &&
      photo &&
      onCreate
    ) {
      onCreate({
        name: name.trim(),
        handle: "",
        tagline: tagline.trim(),
        description: description.trim(),
        visibility: "Private",
        photo,
      });
    } else if (
      name.trim() &&
      tagline.trim() &&
      description.trim() &&
      onSave
    ) {
      onSave({
        name: name.trim(),
        handle: "",
        tagline: tagline.trim(),
        description: description.trim(),
        visibility: "Private",
        photo: photo || undefined,
      });
    }
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPhotoError("Choose a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("The team photo must be 5 MB or smaller.");
      return;
    }

    setPhotoError("");
    setPhoto(file);

    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoPreview("");
    setPhotoError("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#151720] shadow-2xl">
        {/* Modal Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 dark:border-zinc-800 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {mode === "create" ? "Create a Team" : "Edit Team Details"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              {mode === "create"
                ? "Set up a private collaborative team space for your projects"
                : "Update your team's visual identity and info"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:text-slate-600 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body: 2 Columns (Left: Preview, Right: Inputs) */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Left Column: Live Card Preview & Info (md:col-span-5) */}
            <div className="md:col-span-5 space-y-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-2">
                  Live Card Preview
                </p>
                
                {/* Preview Card */}
                <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#1c1f2b] overflow-hidden shadow-xs">
                  <div className="h-32 w-full bg-slate-100 dark:bg-zinc-800 relative overflow-hidden">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        className="h-full w-full object-cover"
                        alt="Team preview"
                      />
                    ) : (
                      <div className="flex flex-col h-full items-center justify-center text-xs font-bold text-slate-400 dark:text-zinc-500 gap-1.5">
                        <ImageIcon className="h-6 w-6 text-slate-300 dark:text-zinc-600" />
                        <span>Team Banner Preview</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {name || "Team Name"}
                      </h4>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-900 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800 shrink-0">
                        Owner
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 truncate">
                      {tagline || "Your team tagline will appear here"}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-3 leading-relaxed">
                      {description || "A concise description of your team's mission, skillsets, and collaborative projects."}
                    </p>
                    <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
                      <span className="inline-flex items-center gap-1 font-medium">
                        <Users className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                        1 member (You)
                      </span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        Open Space &rarr;
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 text-xs text-slate-600 dark:text-zinc-400">
                <Lock className="w-4 h-4 text-slate-500 dark:text-zinc-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  All teams are <strong>Private</strong>. Only invited collaborators and colleagues with your team join code can participate.
                </span>
              </div>
            </div>

            {/* Right Column: Form Inputs (md:col-span-7) */}
            <div className="md:col-span-7 space-y-4">
              {/* Team Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 mb-1.5">
                  Team Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Creative Velocity Studio"
                  maxLength={50}
                  className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900/60 px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition shadow-xs"
                />
              </div>

              {/* Tagline */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 mb-1.5">
                  Tagline <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(event) => setTagline(event.target.value)}
                  maxLength={50}
                  placeholder="e.g. High-performance video production and post-processing"
                  className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900/60 px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition shadow-xs"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 mb-1.5">
                  Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                  placeholder="Share what your team works on, skillsets, and collaboration objectives..."
                  className="w-full resize-none rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900/60 px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition shadow-xs"
                />
              </div>

              {/* Team Photo */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                    Team Photo {mode === "create" && <span className="text-rose-500">*</span>}
                  </label>
                  {photoPreview && (
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                    >
                      Remove photo
                    </button>
                  )}
                </div>

                <div className="relative h-28 w-full overflow-hidden rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900/50">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Team preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-1 text-slate-500 dark:text-zinc-500">
                      <ImageIcon className="h-6 w-6 text-slate-400 dark:text-zinc-500" />
                      <span className="text-xs font-medium">Upload banner or profile image</span>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500">PNG, JPG, WebP up to 5 MB</span>
                    </div>
                  )}
                  <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/90 text-slate-900 text-xs font-bold shadow-md">
                      <Upload className="h-4 w-4" />
                      <span>{photoPreview ? "Change Photo" : "Choose File"}</span>
                    </div>
                  </label>
                </div>
                {photoError && (
                  <p className="mt-1 text-xs text-rose-500">{photoError}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={
              saving ||
              !name.trim() ||
              !tagline.trim() ||
              !description.trim() ||
              (mode === "create" && !photo)
            }
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? savingLabel || "Saving..."
              : mode === "create"
              ? "Create Team"
              : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

const EditTeamModal: React.FC<EditTeamModalProps> = (props) => {
  if (!props.isOpen) return null;
  return <EditTeamModalContent {...props} />;
};

export default EditTeamModal;
