// src/components/modals/EditTeamModal.tsx
import { useState } from "react";
import { X, Upload, Image as ImageIcon } from "lucide-react";

interface EditTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamName?: string;
  teamHandle?: string;
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
  handle: string;
  tagline: string;
  description: string;
  photo?: File;
}

const EditTeamModalContent: React.FC<EditTeamModalProps> = ({
  onClose,
  teamName,
  teamHandle,
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
  const [handle, setHandle] = useState(teamHandle || "");
  const [tagline, setTagline] = useState(teamTagline || "");
  const [description, setDescription] = useState(teamDescription || "");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState(teamBanner || "");
  const [photoError, setPhotoError] = useState("");

  const handleSave = () => {
    if (
      mode === "create" &&
      name.trim() &&
      handle.trim() &&
      tagline.trim() &&
      description.trim() &&
      photo &&
      onCreate
    ) {
      onCreate({
        name: name.trim(),
        handle: handle.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        photo,
      });
    } else if (
      name.trim() &&
      handle.trim() &&
      tagline.trim() &&
      description.trim() &&
      onSave
    ) {
      onSave({
        name: name.trim(),
        handle: handle.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
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
      setPhotoError("The Team photo must be 5 MB or smaller.");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
      <div className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d0f1a] shadow-2xl animate-scale-in">
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-5">
          <h3
            className="text-xl font-semibold text-white"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {mode === "create" ? "Create a Team" : "Edit Team"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="inbox-scroll-thin flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            <label className="block text-sm font-medium text-zinc-300">
              Team Name <span className="text-red-400">*</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter Team name"
                className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              />
            </label>

            <label className="block text-sm font-medium text-zinc-300">
              Handle <span className="text-red-400">*</span>
              <input
                value={handle}
                onChange={(event) =>
                  setHandle(event.target.value.replace(/^@/, ""))
                }
                className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
                placeholder="team-handle"
              />
            </label>

            <label className="block text-sm font-medium text-zinc-300">
              Tagline <span className="text-red-400">*</span>
              <input
                value={tagline}
                onChange={(event) => setTagline(event.target.value)}
                maxLength={50}
                placeholder="A short description of your Team"
                className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
              />
            </label>

            <label className="block text-sm font-medium text-zinc-300">
              Description <span className="text-red-400">*</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                placeholder="Tell people about your Team"
                className="mt-2 w-full resize-none rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
              />
            </label>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Team Photo{" "}
                {mode === "create" && <span className="text-red-400">*</span>}
              </label>
              <div className="relative h-36 w-full overflow-hidden rounded-xl border border-white/15 bg-white/5">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Team photo preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-500">
                    <ImageIcon className="h-8 w-8" />
                    <span className="text-xs">No Team photo selected</span>
                  </div>
                )}
                <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/55 opacity-0 transition-opacity hover:opacity-100">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <Upload className="h-5 w-5 text-white" />
                  <span className="ml-2 text-sm text-white">
                    {photoPreview ? "Change Photo" : "Choose Photo"}
                  </span>
                </label>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-zinc-500">Image file, up to 5 MB</p>
                {photoPreview && mode === "create" && (
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Remove photo
                  </button>
                )}
              </div>
              {photoError && (
                <p className="mt-1 text-xs text-red-400">{photoError}</p>
              )}
            </div>

            {mode === "create" && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Live Preview
                </p>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex gap-3">
                    {photoPreview && (
                      <img
                        src={photoPreview}
                        className="h-16 w-16 rounded-lg object-cover"
                        alt="Team preview"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">
                        {name || "Team name"}
                      </p>
                      <p className="text-xs text-zinc-500">
                        @{handle || "handle"}
                      </p>
                      <p className="text-sm text-blue-300">
                        {tagline || "Team tagline"}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-zinc-400">
                    {description || "Team description"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 gap-3 border-t border-white/10 bg-[#0d0f1a] px-6 py-4">
          <button
            onClick={handleSave}
            disabled={
              saving ||
              !name.trim() ||
              !handle.trim() ||
              !tagline.trim() ||
              !description.trim() ||
              (mode === "create" && !photo)
            }
            className="flex-1 cursor-pointer rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-medium text-white transition duration-200 hover:brightness-110 hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100 disabled:hover:shadow-none"
          >
            {saving
              ? savingLabel || "Saving..."
              : mode === "create"
                ? "Create Team"
                : "Save Changes"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 cursor-pointer rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-400 transition hover:border-white/25 hover:bg-white/10 hover:text-white active:scale-[0.98]"
          >
            Cancel
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
