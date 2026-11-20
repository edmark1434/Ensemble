// src/pages/user/4_forums/forum_modals/EditGroupModal.tsx
import { useState, useEffect } from "react";
import { X, Users, AlertCircle, Tag, Plus, Trash2, Image as ImageIcon, Upload } from "lucide-react";
import { uploadFileWithIntent } from "@/lib/uploadFile";
import { showErrorToast } from "@/components/utility/toast";

interface Group {
  id: string | number;
  name: string;
  description: string;
  tags: { tag: string; tag_id: number }[];
  image_url?: string;
  gradient?: string;
}

interface EditGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  onSave: (updatedData: { 
    group_name?: string; 
    description?: string; 
    tags?: { tag: string; tag_id: number }[]; 
    image_url?: string;
    gradient?: string 
  }) => void | Promise<void>;
}

export const gradientOptions = [
  { value: "from-cyan-500 via-blue-500 to-indigo-500", label: "Cyan to Indigo" },
  { value: "from-emerald-500 via-teal-500 to-cyan-500", label: "Emerald to Cyan" },
  { value: "from-purple-500 via-pink-500 to-rose-500", label: "Purple to Rose" },
  { value: "from-orange-500 via-amber-500 to-yellow-500", label: "Orange to Yellow" },
  { value: "from-indigo-500 via-blue-500 to-sky-500", label: "Indigo to Sky" },
  { value: "from-blue-500 via-cyan-500 to-indigo-500", label: "Blue to Indigo" },
];

const resolveImageUrl = (imageUrl?: string): string | null => {
  if (!imageUrl) return null;
  if (/^https?:\/\//i.test(imageUrl) || imageUrl.startsWith("/")) return imageUrl;
  return `${import.meta.env.VITE_CLOUDFRONT_URL}/${imageUrl}`;
};

const EditGroupModal: React.FC<EditGroupModalProps> = ({
  isOpen,
  onClose,
  group,
  onSave,
}) => {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description);
  const [tags, setTags] = useState<{ tag: string; tag_id: number }[]>(group.tags);
  const [currentTag, setCurrentTag] = useState("");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(() => resolveImageUrl(group.image_url));
  const [removeBanner, setRemoveBanner] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; description?: string; tags?: string }>({});

  useEffect(() => {
    if (!isOpen) return;
    setName(group.name);
    setDescription(group.description);
    setTags(group.tags);
    setCoverImage(null);
    setCoverPreview(resolveImageUrl(group.image_url));
    setRemoveBanner(false);
    setErrors({});
  }, [isOpen, group.id, group.name, group.description, group.tags, group.image_url]);
  
  const defaultGroupDetails = {
    name: group.name,
    description: group.description,
    tags: group.tags,
  };

  if (!isOpen) return null;

  // Generate a new tag_id (use timestamp for uniqueness, or you can use a counter)
  const generateTagId = (): number => {
    // If there are existing tags, get the max ID + 1, otherwise start at 1
    const maxId = tags.length > 0 ? Math.max(...tags.map(t => t.tag_id)) : 0;
    return maxId + 1;
  };

  const handleAddTag = () => {
    const trimmedTag = currentTag.trim();
    if (!trimmedTag) return;

    // Check if tag already exists (by tag name)
    if (tags.some(tag => tag.tag.toLowerCase() === trimmedTag.toLowerCase())) {
      setErrors({ ...errors, tags: "Tag already exists" });
      return;
    }

    if (tags.length >= 10) {
      setErrors({ ...errors, tags: "Maximum 10 tags allowed" });
      return;
    }

    const newTag = {
      tag: trimmedTag,
      tag_id: generateTagId()
    };

    setTags([...tags, newTag]);
    setCurrentTag("");
    if (errors.tags) setErrors({ ...errors, tags: undefined });
  };

  const handleRemoveTag = (tagToRemove: { tag: string; tag_id: number }) => {
    setTags(tags.filter(tag => tag.tag_id !== tagToRemove.tag_id));
    if (errors.tags) setErrors({ ...errors, tags: undefined });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const validate = (): boolean => {
    const newErrors: { name?: string; description?: string; tags?: string } = {};
    if (!name.trim()) newErrors.name = "Group name is required";
    else if (name.length < 3) newErrors.name = "Group name must be at least 3 characters";
    else if (name.length > 50) newErrors.name = "Group name must be less than 50 characters";

    if (!description.trim()) newErrors.description = "Description is required";
    else if (description.length < 20) newErrors.description = "Description must be at least 20 characters";
    else if (description.length > 500) newErrors.description = "Description must be less than 500 characters";

    if (tags.length < 3) newErrors.tags = "At least 3 categories/tags are required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updatePayload = (payload: any) => {
    const updatedPayload: any = {};
    
    if (payload.name !== defaultGroupDetails.name) {
      updatedPayload.group_name = payload.name.trim();
    }
    if (payload.description !== defaultGroupDetails.description) {
      updatedPayload.description = payload.description.trim();
    }
    if (JSON.stringify(payload.tags) !== JSON.stringify(defaultGroupDetails.tags)) {
      updatedPayload.tags = payload.tags;
    }
    
    return updatedPayload;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showErrorToast("File size must be less than 5MB");
      return;
    }
    setCoverImage(file);
    setCoverPreview(URL.createObjectURL(file));
    setRemoveBanner(false);
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const updatedPayload = updatePayload({
      name,
      description,
      tags,
    });

    const hasImageChange = Boolean(coverImage) || (removeBanner && Boolean(group.image_url));

    if (Object.keys(updatedPayload).length === 0 && !hasImageChange) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      if (coverImage) {
        const uploaded = await uploadFileWithIntent(coverImage, "forum-group");
        updatedPayload.image_url = uploaded.key;
      } else if (removeBanner && group.image_url) {
        updatedPayload.image_url = "";
      }

      await onSave(updatedPayload);
      onClose();
    } catch (error: any) {
      showErrorToast(error?.message || "Failed to update group banner");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 px-4 backdrop-blur-sm animate-fade-in-modal">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Edit Group
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-500 dark:text-zinc-400 transition hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-zinc-300 mb-4">
          Update your group information
        </p>

        {/* Cover Image / Banner */}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-200">
              Cover Image / Banner (Optional)
            </label>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-zinc-200 transition hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white">
              <Upload className="h-3.5 w-3.5" />
              Upload New Banner
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          </div>
          <div className="relative">
            {coverPreview ? (
              <div className="relative group">
                <img
                  src={coverPreview}
                  alt="Cover preview"
                  className="h-32 w-full rounded-xl object-cover border border-gray-200 dark:border-white/10"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCoverImage(null);
                    setCoverPreview(null);
                    setRemoveBanner(true);
                  }}
                  className="absolute top-2 right-2 rounded-full bg-black/70 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500 cursor-pointer"
                  title="Remove cover image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-white/20 bg-gray-50 dark:bg-white/5 transition-all hover:border-blue-500/50 hover:bg-gray-100 dark:hover:bg-white/10">
                <div className="flex flex-col items-center gap-1.5">
                  <ImageIcon className="h-7 w-7 text-gray-400 dark:text-zinc-400" />
                  <p className="text-xs font-medium text-gray-700 dark:text-zinc-300">Click to upload cover image</p>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400">JPG, PNG, GIF up to 5MB</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Group Name Input */}
        <div className="mb-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-200">
            Group Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors({ ...errors, name: undefined });
            }}
            className={`w-full rounded-lg border ${
              errors.name ? "border-red-500/70" : "border-gray-300 dark:border-white/15"
            } bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          />
          {errors.name && (
            <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.name}
            </p>
          )}
        </div>

        {/* Description Textarea */}
        <div className="mb-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-200">
            Description *
          </label>
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errors.description) setErrors({ ...errors, description: undefined });
            }}
            rows={4}
            className={`w-full rounded-lg border ${
              errors.description ? "border-red-500/70" : "border-gray-300 dark:border-white/15"
            } bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none`}
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          />
          {errors.description && (
            <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.description}
            </p>
          )}
        </div>

        {/* Categories/Tags Input */}
        <div className="mb-6">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-200">
            Categories / Tags * (Minimum 3)
          </label>

          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={currentTag}
              onChange={(e) => setCurrentTag(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., Color Theory, DaVinci Resolve, LUTs"
              className="flex-1 rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="rounded-lg bg-blue-50 dark:bg-blue-500/20 px-4 py-2.5 text-blue-600 dark:text-blue-400 transition hover:bg-blue-100 dark:hover:bg-blue-500/30 hover:scale-105"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {errors.tags && (
            <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1 mb-2">
              <AlertCircle className="h-3 w-3" />
              {errors.tags}
            </p>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {tags.map((tag) => (
                <div
                  key={tag.tag_id}
                  className="flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/20 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300"
                >
                  <Tag className="h-3 w-3" />
                  <span>{tag.tag}</span>
                  <span className="text-[10px] text-gray-500 dark:text-zinc-400 ml-1">(ID: {tag.tag_id})</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 rounded-full p-0.5 hover:bg-blue-200/60 dark:hover:bg-blue-500/30 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="mt-2 text-xs text-gray-600 dark:text-zinc-400">
            {tags.length}/3 minimum, {tags.length}/10 maximum tags
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex-1 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 hover:shadow-md hover:shadow-blue-500/20 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-full border border-gray-300 dark:border-white/15 bg-white dark:bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-zinc-200 transition hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fade-in-modal {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in-modal {
          animation: fade-in-modal 0.2s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default EditGroupModal;