import React, { useState, useEffect } from "react";
import {
  X,
  Upload,
  Image as ImageIcon,
  Lock,
  Globe,
  Users,
  Crown,
  Loader2,
  Trash2,
  Sparkles,
  ArrowRight,
  Dices,
} from "lucide-react";
import GlideSelect, { type GlideSelectOption } from "@/components/ui/GlideSelect";

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

const CATEGORY_OPTIONS: GlideSelectOption[] = [
  { value: "Video Production", label: "Video Production" },
  { value: "Motion Graphics", label: "Motion Graphics & VFX" },
  { value: "YouTube & Social", label: "YouTube & Social Media" },
  { value: "Short Films", label: "Short Films & Narrative" },
  { value: "Commercials", label: "Commercials & Brand Ads" },
  { value: "Animation", label: "Animation & 3D" },
  { value: "Podcasts", label: "Podcasts & Interviews" },
  { value: "Gaming", label: "Gaming & Montages" },
  { value: "Events", label: "Weddings & Live Events" },
  { value: "Corporate", label: "Corporate & Sizzle Reels" },
];

const PRESET_TAGLINES = [
  "Clean, Quick & Concise",
  "Fast Edit for your Needs",
  "High-Impact Visual Storytellers",
  "Precision Cuts, Seamless Flow",
  "Turning Raw Clips into Masterpieces",
  "Speed, Polish & Creative Mastery",
  "Crafting Stories That Stand Out",
  "Your Dedicated Post-Production Crew",
  "Pixel-Perfect Edits Every Time",
  "Elite Quality at Startup Speed",
];

const DEFAULT_DESCRIPTION = "This team seems lazy to provide a description...";

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
      if (e.key === "Escape" && !saving) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, saving]);

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
    if (!saving) setIsDragging(true);
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
    if (saving) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const removePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (saving) return;
    setPhoto(null);
    setPhotoPreview("");
    setPhotoError("");
  };

  // Random Tagline Generator
  const handleRandomTagline = () => {
    const available = PRESET_TAGLINES.filter((t) => t !== tagline);
    const chosen = available[Math.floor(Math.random() * available.length)] || PRESET_TAGLINES[0];
    setTagline(chosen);
  };

  const handleSave = () => {
    if (saving) return;

    const resolvedDescription = description.trim() || DEFAULT_DESCRIPTION;

    if (
      mode === "create" &&
      name.trim() &&
      tagline.trim() &&
      photo &&
      onCreate
    ) {
      onCreate({
        name: name.trim(),
        handle: "",
        tagline: tagline.trim(),
        description: resolvedDescription,
        category: category.trim() || "Video Production",
        visibility: visibility || "Public",
        photo,
      });
    } else if (
      name.trim() &&
      tagline.trim() &&
      onSave
    ) {
      onSave({
        name: name.trim(),
        handle: "",
        tagline: tagline.trim(),
        description: resolvedDescription,
        category: category.trim() || "Video Production",
        visibility: visibility || "Public",
        photo: photo || undefined,
      });
    }
  };

  // Description is now optional
  const isFormValid =
    name.trim().length > 0 &&
    tagline.trim().length > 0 &&
    (mode === "create" ? photo !== null : true);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 sm:p-6 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0e1017] shadow-2xl transition-all font-['Plus_Jakarta_Sans',sans-serif]">
        {/* Modal Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 dark:border-white/5 px-6 py-4.5 bg-white dark:bg-[#0e1017]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10 text-zinc-800 dark:text-zinc-200 flex items-center justify-center shrink-0">
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
            className="rounded-xl p-2 text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition cursor-pointer disabled:opacity-40"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body: 2 Columns (Left: Card Preview & Visibility, Right: Form Inputs) */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-6">
          {/* UPLOADING & CREATION ANIMATION BANNER */}
          {saving && (
            <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.03] p-4 flex items-center gap-3.5 animate-in fade-in duration-200 shadow-xs">
              <div className="relative flex items-center justify-center shrink-0">
                <Loader2 className="w-5 h-5 text-zinc-900 dark:text-white animate-spin" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs font-semibold text-zinc-900 dark:text-white mb-1.5">
                  <span>{savingLabel || (mode === "create" ? "Building team workspace..." : "Saving changes...")}</span>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">In Progress</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-zinc-900 dark:bg-white rounded-full w-2/3 animate-pulse duration-700" />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-7 items-start">
            {/* Left Column: Live Card Preview & Visibility (md:col-span-5) */}
            <div className="md:col-span-5 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                    <span>Live Card Preview</span>
                  </p>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Marketplace Card</span>
                </div>

                {/* Preview Card matching Teams.tsx */}
                <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#12141a] overflow-hidden shadow-sm transition-all hover:shadow-md">
                  {/* Card Banner */}
                  <div className="h-32 w-full bg-zinc-100 dark:bg-white/5 relative overflow-hidden group">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        alt="Team preview"
                      />
                    ) : (
                      <div className="flex flex-col h-full items-center justify-center text-xs font-semibold text-zinc-400 dark:text-zinc-500 gap-1.5">
                        <div className="w-8 h-8 rounded-lg bg-zinc-200/70 dark:bg-white/5 flex items-center justify-center text-zinc-400">
                          <ImageIcon className="h-4 w-4" />
                        </div>
                        <span className="text-[11px]">Team Banner Preview</span>
                      </div>
                    )}

                    {/* Visibility Icon Indicator with Tooltip */}
                    <div className="absolute top-2.5 left-2.5 z-20 group/vis">
                      <div
                        className="w-6 h-6 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-zinc-300 cursor-pointer shadow-xs transition hover:scale-110"
                      >
                        {visibility === "Private" ? (
                          <Lock className="w-3 h-3 text-zinc-300" />
                        ) : (
                          <Globe className="w-3 h-3 text-zinc-300" />
                        )}
                      </div>

                      {/* Tooltip: Light on light mode, Dark on dark mode */}
                      <div className="absolute top-full left-0 mt-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-white/10 text-[11px] font-semibold whitespace-nowrap shadow-xl opacity-0 invisible group-hover/vis:opacity-100 group-hover/vis:visible transition-all duration-150 pointer-events-none z-50">
                        {visibility === "Private" ? "Private" : "Public"}
                        <div className="absolute -top-1 left-2.5 w-2 h-2 bg-white dark:bg-zinc-800 border-l border-t border-zinc-200 dark:border-white/10 rotate-45" />
                      </div>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-sm text-zinc-900 dark:text-white truncate leading-snug flex-1">
                        {name || "Team Name"}
                      </h4>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 shrink-0">
                        <Crown className="w-2.5 h-2.5" />
                        <span>Team Leader</span>
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate">
                      {tagline || "Your team tagline will appear here"}
                    </p>

                    <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-3 leading-relaxed">
                      {description.trim() || DEFAULT_DESCRIPTION}
                    </p>

                    <div className="pt-2.5 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <Users className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                        <span>1 member (You)</span>
                      </span>
                      <span className="font-semibold text-zinc-900 dark:text-white inline-flex items-center gap-1">
                        <span>Open Space</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Team Visibility Choice (Moved to Left Side Below Card Preview) */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Team Visibility
                  </label>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                    {visibility === "Public" ? "Publicly Discoverable" : "Invite Only"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setVisibility("Public")}
                    className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition cursor-pointer disabled:opacity-50 ${
                      visibility === "Public"
                        ? "border-zinc-900 dark:border-white bg-zinc-900/5 dark:bg-white/5 text-zinc-900 dark:text-white ring-1 ring-zinc-900/10 dark:ring-white/20 shadow-xs"
                        : "border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 bg-transparent text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold flex items-center gap-1">
                        Public
                        <span className="text-[8px] px-1 py-0.2 rounded bg-zinc-200 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 font-semibold uppercase">Default</span>
                      </span>
                      {visibility === "Public" && (
                        <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-white shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 leading-tight">
                      Listed on Discovery
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setVisibility("Private")}
                    className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition cursor-pointer disabled:opacity-50 ${
                      visibility === "Private"
                        ? "border-zinc-900 dark:border-white bg-zinc-900/5 dark:bg-white/5 text-zinc-900 dark:text-white ring-1 ring-zinc-900/10 dark:ring-white/20 shadow-xs"
                        : "border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 bg-transparent text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold">Private</span>
                      {visibility === "Private" && (
                        <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-white shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 leading-tight">
                      Hidden from Discovery
                    </span>
                  </button>
                </div>
              </div>

              {/* Privacy Notice Card */}
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 text-xs text-zinc-600 dark:text-zinc-400">
                <div className="w-5 h-5 rounded-md bg-zinc-200/70 dark:bg-white/5 flex items-center justify-center shrink-0 mt-0.5 text-zinc-600 dark:text-zinc-400">
                  <Lock className="w-3 h-3" />
                </div>
                <div className="leading-relaxed text-[11px]">
                  <strong className="text-zinc-900 dark:text-zinc-200 font-semibold block">Private by Default</strong>
                  <span>Only invited colleagues with your unique join code can view and participate.</span>
                </div>
              </div>
            </div>

            {/* Right Column: Form Inputs (md:col-span-7) */}
            <div className="md:col-span-7 space-y-4">
              {/* 1. Team Photo / Banner with Drag & Drop (Moved to TOP above Team Name) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Team Photo / Banner {mode === "create" && <span className="text-rose-500">*</span>}
                  </label>
                  {photoPreview && !saving && (
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 hover:underline cursor-pointer"
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
                  className={`relative h-28 w-full overflow-hidden rounded-2xl border-2 border-dashed transition-all ${
                    isDragging
                      ? "border-zinc-900 dark:border-white bg-zinc-100 dark:bg-white/10 scale-[1.01]"
                      : photoPreview
                      ? "border-zinc-300 dark:border-white/15 bg-zinc-100 dark:bg-white/5"
                      : "border-zinc-200 dark:border-white/10 bg-zinc-50/60 dark:bg-white/[0.02] hover:border-zinc-400 dark:hover:border-white/20"
                  }`}
                >
                  {photoPreview ? (
                    <div className="relative h-full w-full group">
                      <img
                        src={photoPreview}
                        alt="Team banner"
                        className="h-full w-full object-cover"
                      />
                      {!saving && (
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
                      )}
                    </div>
                  ) : (
                    <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1.5 p-4 text-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        disabled={saving}
                        className="hidden"
                      />
                      <div className="w-8 h-8 rounded-lg bg-zinc-200/80 dark:bg-white/5 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
                        <Upload className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          {isDragging ? "Drop your image here" : "Upload banner or profile image"}
                        </span>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block">
                          Drag & drop or browse • PNG, JPG, WebP up to 5 MB
                        </span>
                      </div>
                    </label>
                  )}

                  {/* UPLOADING OVERLAY ANIMATION ON BANNER */}
                  {saving && (
                    <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-white animate-in fade-in duration-200 z-20">
                      <Loader2 className="w-6 h-6 animate-spin text-white" />
                      <span className="text-xs font-bold tracking-wide">
                        {savingLabel || "Uploading photo..."}
                      </span>
                    </div>
                  )}
                </div>
                {photoError && (
                  <p className="mt-1 text-xs text-rose-500 font-medium">{photoError}</p>
                )}
              </div>

              {/* 2. Team Name */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Team Name <span className="text-rose-500">*</span>
                  </label>
                  <span className={`text-[10px] font-mono ${name.length > 45 ? "text-amber-500 font-bold" : "text-zinc-400 dark:text-zinc-500"}`}>
                    {name.length}/50
                  </span>
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Creative Velocity Studio"
                  maxLength={50}
                  disabled={saving}
                  className="w-full h-10 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#12141a] px-3.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-zinc-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-zinc-900/10 dark:focus:ring-white/20 transition shadow-xs disabled:opacity-50"
                />
              </div>

              {/* 3. Category / Focus (GlideSelect) */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Category / Focus
                </label>
                <GlideSelect
                  options={CATEGORY_OPTIONS}
                  value={category}
                  onChange={(val) => setCategory(val)}
                  size="md"
                  fullWidth={true}
                  radius={12}
                  disabled={saving}
                />
              </div>

              {/* 4. Tagline with Random Preset Dice Generator */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      Tagline <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleRandomTagline}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/10 transition cursor-pointer active:scale-95 disabled:opacity-50"
                      title="Randomize tagline from presets"
                    >
                      <Dices className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
                      <span>Randomize</span>
                    </button>
                  </div>
                  <span className={`text-[10px] font-mono ${tagline.length > 45 ? "text-amber-500 font-bold" : "text-zinc-400 dark:text-zinc-500"}`}>
                    {tagline.length}/50
                  </span>
                </div>
                <input
                  type="text"
                  value={tagline}
                  onChange={(event) => setTagline(event.target.value)}
                  maxLength={50}
                  disabled={saving}
                  placeholder="e.g. Clean, Quick & Concise"
                  className="w-full h-10 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#12141a] px-3.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-zinc-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-zinc-900/10 dark:focus:ring-white/20 transition shadow-xs disabled:opacity-50"
                />
              </div>

              {/* 5. Description (Optional) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Description <span className="text-zinc-400 dark:text-zinc-500 font-normal lowercase">(optional)</span>
                  </label>
                  <span className={`text-[10px] font-mono ${description.length > 450 ? "text-amber-500 font-bold" : "text-zinc-400 dark:text-zinc-500"}`}>
                    {description.length}/500
                  </span>
                </div>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  maxLength={500}
                  disabled={saving}
                  placeholder='Share what your team works on, or leave blank to use: "This team seems lazy to provide a description..."'
                  className="w-full resize-none rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#12141a] p-3 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-zinc-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-zinc-900/10 dark:focus:ring-white/20 transition shadow-xs leading-relaxed disabled:opacity-50"
                />
                {!description.trim() && (
                  <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500 italic">
                    If empty, will default to: "{DEFAULT_DESCRIPTION}"
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-[#0e1017] px-6 py-4">
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 hidden sm:inline-block">
            <span className="text-rose-500">*</span> Required fields to create workspace
          </span>
          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-white/10 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !isFormValid}
              className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-900 text-xs font-bold transition shadow-xs cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 inline-flex items-center gap-2 active:scale-[0.98]"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-current" />}
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
