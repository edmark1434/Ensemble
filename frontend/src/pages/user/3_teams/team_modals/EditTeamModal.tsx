import React, { useState, useEffect } from "react";
import {
  X,
  Upload,
  Image as ImageIcon,
  Lock,
  Users,
  Crown,
  Loader2,
  Trash2,
  Sparkles,
  ArrowRight,
} from "lucide-react";

interface EditTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamName?: string;
  teamHandle?: string;
  teamTagline?: string;
  teamDescription?: string;
  teamCategory?: string;
  teamBanner?: string;
  teamVisibility?: "Public" | "Private";
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
  category?: string;
  visibility?: "Public" | "Private";
  photo?: File;
}

const EditTeamModalContent: React.FC<EditTeamModalProps> = ({
  onClose,
  teamName,
  teamTagline,
  teamDescription,
  teamCategory,
  teamBanner,
  teamVisibility = "Public",
  onSave,
  mode = "edit",
  saving = false,
  savingLabel,
  onCreate,
}) => {
  const [name, setName] = useState(teamName || "");
  const [tagline, setTagline] = useState(teamTagline || "");
  const [description, setDescription] = useState(teamDescription || "");
  const [category, setCategory] = useState(teamCategory || "Video Production");
  const [visibility, setVisibility] = useState<"Public" | "Private">(teamVisibility || "Public");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState(teamBanner || "");
  const [photoError, setPhotoError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setPhotoError("Please select a valid image file (PNG, JPG, WebP).");
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

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const removePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhoto(null);
    setPhotoPreview("");
    setPhotoError("");
  };

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
        category: category.trim() || "Video Production",
        visibility: visibility || "Public",
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
        category: category.trim() || "Video Production",
        visibility: visibility || "Public",
        photo: photo || undefined,
      });
    }
  };

  const isFormValid =
    name.trim().length > 0 &&
    tagline.trim().length > 0 &&
    description.trim().length > 0 &&
    (mode === "create" ? photo !== null : true);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 sm:p-6 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl transition-all font-['Plus_Jakarta_Sans',sans-serif]">
        {/* Modal Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white leading-tight">
                {mode === "create" ? "Create a Team" : "Edit Team Details"}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {mode === "create"
                  ? "Set up a private collaborative team space for your projects"
                  : "Update your team's visual identity and metadata"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-xl p-2 text-zinc-400 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition cursor-pointer disabled:opacity-40"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body: 2 Columns (Left: Card Preview, Right: Inputs) */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-7 items-start">
            {/* Left Column: Live Card Preview & Info (md:col-span-5) */}
            <div className="md:col-span-5 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-blue-500" />
                    <span>Live Card Preview</span>
                  </p>
                  <span className="text-[10px] text-zinc-600 dark:text-zinc-300 font-medium">Marketplace Card</span>
                </div>

                {/* Preview Card matching Teams.tsx */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 overflow-hidden shadow-sm transition-all hover:shadow-md">
                  {/* Card Banner */}
                  <div className="h-32 w-full bg-zinc-100 dark:bg-zinc-800/80 relative overflow-hidden group">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        alt="Team preview"
                      />
                    ) : (
                      <div className="flex flex-col h-full items-center justify-center text-xs font-semibold text-zinc-400 dark:text-zinc-500 gap-1.5">
                        <div className="w-8 h-8 rounded-lg bg-zinc-200/80 dark:bg-zinc-700/60 flex items-center justify-center text-zinc-400 dark:text-zinc-400">
                          <ImageIcon className="h-4 w-4" />
                        </div>
                        <span className="text-[11px]">Team Banner Preview</span>
                      </div>
                    )}
                  </div>

                  {/* Card Details */}
                  <div className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-sm text-zinc-900 dark:text-white truncate flex-1 leading-snug">
                        {name || "Team Name"}
                      </h4>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-900 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 shrink-0">
                        <Crown className="w-2.5 h-2.5" />
                        <span>Team Leader</span>
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 truncate">
                      {tagline || "Your team tagline will appear here"}
                    </p>

                    <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-3 leading-relaxed">
                      {description || "A concise description of your team's mission, skillsets, and collaborative projects."}
                    </p>

                    <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <Users className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                        <span>1 member (You)</span>
                      </span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400 inline-flex items-center gap-0.5">
                        <span>Open Space</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Privacy Notice Card */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400">
                <div className="w-6 h-6 rounded-lg bg-zinc-200/70 dark:bg-zinc-700/60 flex items-center justify-center shrink-0 mt-0.5 text-zinc-600 dark:text-zinc-400">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <div className="leading-relaxed">
                  <strong className="text-zinc-900 dark:text-zinc-200 font-semibold block">Private by Default</strong>
                  <span>Only invited colleagues with your unique join code can view and participate.</span>
                </div>
              </div>
            </div>

            {/* Right Column: Form Inputs (md:col-span-7) */}
            <div className="md:col-span-7 space-y-4">
              {/* Team Name */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Team Name <span className="text-rose-500">*</span>
                  </label>
                  <span className={`text-[10px] font-medium ${name.length > 45 ? "text-amber-500" : "text-zinc-600 dark:text-zinc-300"}`}>
                    {name.length}/50
                  </span>
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Creative Velocity Studio"
                  maxLength={50}
                  className="w-full h-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-900/60 px-3.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15 transition shadow-xs"
                />
              </div>

              {/* Tagline */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Tagline <span className="text-rose-500">*</span>
                  </label>
                  <span className={`text-[10px] font-medium ${tagline.length > 45 ? "text-amber-500" : "text-zinc-600 dark:text-zinc-300"}`}>
                    {tagline.length}/50
                  </span>
                </div>
                <input
                  type="text"
                  value={tagline}
                  onChange={(event) => setTagline(event.target.value)}
                  maxLength={50}
                  placeholder="e.g. High-performance video production & post-processing"
                  className="w-full h-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-900/60 px-3.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15 transition shadow-xs"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Category / Focus
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-900/60 px-3 text-xs text-zinc-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15 transition shadow-xs cursor-pointer"
                >
                  <option value="Video Production">Video Production</option>
                  <option value="Motion Graphics">Motion Graphics & VFX</option>
                  <option value="YouTube & Social">YouTube & Social Media</option>
                  <option value="Short Films">Short Films & Narrative</option>
                  <option value="Commercials">Commercials & Brand Ads</option>
                  <option value="Animation">Animation & 3D</option>
                  <option value="Podcasts">Podcasts & Interviews</option>
                  <option value="Gaming">Gaming & Montages</option>
                  <option value="Events">Weddings & Live Events</option>
                  <option value="Corporate">Corporate & Sizzle Reels</option>
                </select>
              </div>

              {/* Visibility Choice */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Team Visibility
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setVisibility("Public")}
                    className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      visibility === "Public"
                        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-100 ring-1 ring-blue-500/20"
                        : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 bg-zinc-50/40 dark:bg-zinc-900/40 text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      Public <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">Default</span>
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-tight">
                      Listed on Discovery and viewable by other creators & clients
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVisibility("Private")}
                    className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      visibility === "Private"
                        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-100 ring-1 ring-blue-500/20"
                        : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 bg-zinc-50/40 dark:bg-zinc-900/40 text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    <span className="text-xs font-bold">Private</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-tight">
                      Hidden from Discovery, accessible only by direct invite link
                    </span>
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Description <span className="text-rose-500">*</span>
                  </label>
                  <span className={`text-[10px] font-medium ${description.length > 450 ? "text-amber-500" : "text-zinc-600 dark:text-zinc-300"}`}>
                    {description.length}/500
                  </span>
                </div>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Share what your team works on, skillsets, and collaboration objectives..."
                  className="w-full resize-none rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-900/60 p-3 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15 transition shadow-xs leading-relaxed"
                />
              </div>

              {/* Team Photo / Banner with Drag & Drop */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Team Photo / Banner {mode === "create" && <span className="text-rose-500">*</span>}
                  </label>
                  {photoPreview && (
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative h-28 w-full overflow-hidden rounded-xl border-2 border-dashed transition-all ${
                    isDragging
                      ? "border-blue-500 bg-blue-500/10 scale-[1.01]"
                      : photoPreview
                      ? "border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900"
                      : "border-zinc-300 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-900/40 hover:border-zinc-400 dark:hover:border-zinc-600"
                  }`}
                >
                  {photoPreview ? (
                    <div className="relative h-full w-full group">
                      <img
                        src={photoPreview}
                        alt="Team banner"
                        className="h-full w-full object-cover"
                      />
                      <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-zinc-900 text-xs font-bold shadow-md hover:bg-zinc-100 transition">
                          <Upload className="h-3.5 w-3.5" />
                          <span>Change Image</span>
                        </div>
                      </label>
                    </div>
                  ) : (
                    <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1.5 p-4 text-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <div className="w-8 h-8 rounded-lg bg-zinc-200/80 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
                        <Upload className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          {isDragging ? "Drop your image here" : "Upload banner or profile image"}
                        </span>
                        <span className="text-[10px] text-zinc-600 dark:text-zinc-300 block">
                          Drag & drop or browse • PNG, JPG, WebP up to 5 MB
                        </span>
                      </div>
                    </label>
                  )}
                </div>
                {photoError && (
                  <p className="mt-1 text-xs text-rose-500 font-medium">{photoError}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 px-6 py-3.5">
          <span className="text-[11px] text-zinc-600 dark:text-zinc-300 hidden sm:inline-block">
            <span className="text-rose-500">*</span> Required fields to create workspace
          </span>
          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !isFormValid}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 inline-flex items-center gap-2 active:scale-[0.98]"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>
                {saving
                  ? savingLabel || (mode === "create" ? "Creating..." : "Saving...")
                  : mode === "create"
                  ? "Create Team"
                  : "Save Changes"}
              </span>
            </button>
          </div>
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
