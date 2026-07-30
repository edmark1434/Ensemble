// src/components/modals/CreateGroupModal.tsx
import { useState } from "react";
import { X, Users, AlertCircle, Image as ImageIcon, Tag, Plus, Trash2 } from "lucide-react";
import { showSuccessToast, showErrorToast } from "@/components/utility/toast.ts";
import axios from "@/lib/axios.ts";
import { gradientOptions } from "@/pages/user/4_forums/forum_modals/EditGroupModal.tsx";
import api from "@/lib/axios"; // Import your API client

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState("");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; description?: string; tags?: string }>({});
  
  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        showErrorToast("File size must be less than 5MB");
        return;
      }
      setCoverImage(file);
      const previewUrl = URL.createObjectURL(file);
      setCoverPreview(previewUrl);
    }
  };

  const handleAddTag = () => {
    const trimmedTag = currentTag.trim();
    if (!trimmedTag) return;

    if (tags.includes(trimmedTag)) {
      setErrors({ ...errors, tags: "Tag already exists" });
      return;
    }

    if (tags.length >= 10) {
      setErrors({ ...errors, tags: "Maximum 10 tags allowed" });
      return;
    }

    setTags([...tags, trimmedTag]);
    setCurrentTag("");
    if (errors.tags) setErrors({ ...errors, tags: undefined });
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
    if (errors.tags) setErrors({ ...errors, tags: undefined });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    try {
      const response = await api.post("/api/files/upload-url", {
        folder: "forum-group", // Changed from "profile" to "forum-covers" for organization
        filename: file.name,
        contentType: file.type,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get upload URL');
      }

      let { uploadUrl, key, expiresIn, maxFileSize } = response.data;
      
      console.log('📤 Upload URL received:', {
        key,
        expiresIn: `${expiresIn} seconds`,
        maxFileSize: `${maxFileSize / 1024 / 1024}MB`
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      let uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (uploadResponse.status === 403) {
        console.log("⚠️ Upload URL expired, requesting new one...");
        
        const newResponse = await api.post("/api/files/upload-url", {
          folder: "forum-covers",
          filename: file.name,
          contentType: file.type,
        });

        if (!newResponse.data.success) {
          throw new Error(newResponse.data.message || 'Failed to get new upload URL');
        }

        const { uploadUrl: newUploadUrl, key: newKey } = newResponse.data;

        uploadResponse = await fetch(newUploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
            "x-amz-server-side-encryption": "AES256",
          },
          body: file,
        });

        key = newKey;
      }

      if (!uploadResponse.ok) {
        if (uploadResponse.status === 403) {
          throw new Error('Permission denied. Please check your S3 bucket permissions.');
        }
        if (uploadResponse.status === 413) {
          throw new Error('File is too large. Maximum size is 5MB.');
        }
        if (uploadResponse.status === 415) {
          throw new Error('File type not supported.');
        }
        throw new Error(`Upload failed with status ${uploadResponse.status}`);
      }

      console.log('✅ File uploaded successfully:', key);
      return key;

    } catch (error: any) {
      console.error('❌ Upload error:', error);
      
      if (error.name === 'AbortError') {
        throw new Error('Upload timed out. Please try again.');
      }
      if (error.response?.status === 401) {
        throw new Error('Please log in to upload files.');
      }
      if (error.response?.status === 429) {
        throw new Error('Too many upload attempts. Please try again later.');
      }
      if (error.response?.status === 400) {
        throw new Error(error.response?.data?.message || 'Invalid file or folder.');
      }
      
      throw new Error(error.message || 'Failed to upload image. Please try again.');
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

    if (tags.length < 3) newErrors.tags = "At least 3 categories/tags are required (minimum 3, maximum 10)";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const applyErrorMessageToFields = (message: string) => {
    const nextErrors: { name?: string; description?: string; tags?: string } = {};
    const normalizedMessage = message.toLowerCase();

    if (normalizedMessage.includes("name")) {
      nextErrors.name = message;
    }

    if (normalizedMessage.includes("description")) {
      nextErrors.description = message;
    }

    if (normalizedMessage.includes("tag")) {
      nextErrors.tags = message;
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...nextErrors }));
      return true;
    }

    return false;
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setTags([]);
    setCurrentTag("");
    setCoverImage(null);
    setCoverPreview(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (isCreating) return; // prevent double submit

    setIsCreating(true);

    try {
      let imageKey: string | null = null;
      
      // Upload cover image if provided
      if (coverImage) {
        imageKey = await uploadFile(coverImage);
      }

      const response = await axios.post("/api/forum/create-group", {
        groupName: name.trim(),
        description: description.trim(),
        tags,
        imageKey, // Send the S3 key instead of cloudinary URL
        gradient: gradientOptions[Math.floor(Math.random() * gradientOptions.length)].value,
      });

      if (response.status === 201) {
        showSuccessToast(response.data?.message || "Group created successfully");
        resetForm();
      }
    } catch (error: unknown) {
      const message = error instanceof Error
        ? error.message
        : "An unexpected error occurred while creating the group";

      const mappedToField = applyErrorMessageToFields(message);
      if (!mappedToField) {
        showErrorToast(message);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    // Show cancel toast only if form has content
    if (name.trim() || description.trim() || tags.length > 0) {
      showErrorToast("Group creation cancelled");
    }

    setName("");
    setDescription("");
    setTags([]);
    setCurrentTag("");
    setCoverImage(null);
    setCoverPreview(null);
    setErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 px-4 py-6 backdrop-blur-sm animate-fade-in-modal sm:items-center sm:py-8">
      <div className="my-auto w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d0f1a] p-6 shadow-2xl animate-scale-in max-h-[calc(100vh-3rem)] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-400" />
            <h3 className="text-xl font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Create a Group
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-zinc-400 mb-4">
          Build a community around your interests or projects
        </p>

        {/* Cover Image Upload */}
        <div className="mb-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Cover Image (Optional)
          </label>
          <div className="relative">
            {coverPreview ? (
              <div className="relative group">
                <img
                  src={coverPreview}
                  alt="Cover preview"
                  className="h-32 w-full rounded-xl object-cover border border-white/10"
                />
                <button
                  onClick={() => {
                    setCoverImage(null);
                    setCoverPreview(null);
                  }}
                  className="absolute top-2 right-2 rounded-full bg-black/70 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/5 transition-all hover:border-blue-500/50 hover:bg-white/10">
                <div className="flex flex-col items-center gap-2">
                  <ImageIcon className="h-8 w-8 text-zinc-500" />
                  <p className="text-xs text-zinc-500">Click to upload cover image</p>
                  <p className="text-[10px] text-zinc-600">JPG, PNG, GIF up to 5MB</p>
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
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Group Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors({ ...errors, name: undefined });
            }}
            placeholder="e.g., Color Grading Society"
            className={`w-full rounded-lg border ${
              errors.name ? "border-red-500/50" : "border-white/15"
            } bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all`}
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.name}
            </p>
          )}
        </div>

        {/* Description Textarea */}
        <div className="mb-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Description *
          </label>
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errors.description) setErrors({ ...errors, description: undefined });
            }}
            placeholder="Describe what your group is about, its purpose, and who should join..."
            rows={4}
            className={`w-full rounded-lg border ${
              errors.description ? "border-red-500/50" : "border-white/15"
            } bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all resize-none`}
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          />
          {errors.description && (
            <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.description}
            </p>
          )}
          <p className="mt-1 text-right text-[10px] text-zinc-500">
            {description.length} / 500 characters (minimum 20)
          </p>
        </div>

        {/* Categories/Tags Input */}
        <div className="mb-6">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Categories / Tags * (Minimum 3)
          </label>
          <p className="text-[11px] text-zinc-500 mb-2">
            Add tags that members can use to categorize their discussions
          </p>

          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={currentTag}
              onChange={(e) => setCurrentTag(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., Color Theory, DaVinci Resolve, LUTs"
              className="flex-1 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="rounded-lg bg-blue-500/20 px-4 py-2.5 text-blue-400 transition hover:bg-blue-500/30 hover:scale-105"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {errors.tags && (
            <p className="mt-1 text-xs text-red-400 flex items-center gap-1 mb-2">
              <AlertCircle className="h-3 w-3" />
              {errors.tags}
            </p>
          )}

          {/* Tags List */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {tags.map((tag) => (
                <div
                  key={tag}
                  className="flex items-center gap-1 rounded-full bg-blue-500/20 px-3 py-1.5 text-xs text-blue-400"
                >
                  <Tag className="h-3 w-3" />
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 rounded-full p-0.5 hover:bg-blue-500/30 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="mt-2 text-[10px] text-zinc-500">
            {tags.length}/3 minimum, {tags.length}/10 maximum tags added
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={isCreating}
            className="flex-1 rounded-full bg-linear-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:hover:scale-100"
          >
            {isCreating ? (
              <div className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Creating...
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Users className="h-4 w-4" />
                Create Group
              </div>
            )}
          </button>
          <button
            onClick={handleClose}
            className="flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fade-in-modal {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
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

export default CreateGroupModal;