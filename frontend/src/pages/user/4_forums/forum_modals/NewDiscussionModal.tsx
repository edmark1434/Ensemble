// src/pages/user/4_forums/forum_modals/NewDiscussionModal.tsx
import { useState, useEffect, useRef } from "react";
import {
  X,
  PlusCircle,
  MessageSquare,
  AlertCircle,
  Users,
  Tag,
  ChevronDown,
  Image as ImageIcon,
  Bold,
  Italic,
  List,
  Link as LinkIcon,
  Code,
  Eye,
  Edit3,
  Trash2,
  Upload,
  Loader2
} from "lucide-react";
import { showSuccessToast } from "@/components/utility/toast.ts";
import { showErrorToast } from "@/components/utility/toast.ts";

interface Group {
  id: string;
  name: string;
  tags: string[];
}

interface ImageAttachment {
  id: string;
  file: File;
  preview: string;
  uploading: boolean;
  uploadProgress?: number;
  url?: string;
}

interface NewDiscussionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePost: (postData: {
    title: string;
    content: string;
    groupId: string;
    tag: string;
    images?: ImageAttachment[];
  }) => void;
  availableGroups: Group[];
}

// Rich text toolbar component
const RichTextToolbar = ({ onFormat, onImageUpload }: {
  onFormat: (format: string, value?: string) => void;
  onImageUpload: () => void;
}) => {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");

  const handleInsertLink = () => {
    if (linkUrl) {
      const markdownLink = linkText
        ? `[${linkText}](${linkUrl})`
        : `[${linkUrl}](${linkUrl})`;
      onFormat("insertText", markdownLink);
      setShowLinkInput(false);
      setLinkUrl("");
      setLinkText("");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-white/10 bg-white/5 px-3 py-2">
      <button
        type="button"
        onClick={() => onFormat("bold")}
        className="rounded p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onFormat("italic")}
        className="rounded p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </button>
      <div className="mx-1 h-5 w-px bg-white/10" />
      <button
        type="button"
        onClick={() => onFormat("bullet-list")}
        className="rounded p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onFormat("numbered-list")}
        className="rounded p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
        title="Numbered List"
      >
        <div className="flex items-center gap-0.5">
          <span className="text-xs font-bold">1.</span>
          <List className="h-3 w-3" />
        </div>
      </button>
      <div className="mx-1 h-5 w-px bg-white/10" />
      <button
        type="button"
        onClick={() => setShowLinkInput(!showLinkInput)}
        className="rounded p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
        title="Insert Link"
      >
        <LinkIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onFormat("code")}
        className="rounded p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
        title="Code Block"
      >
        <Code className="h-4 w-4" />
      </button>
      <div className="mx-1 h-5 w-px bg-white/10" />
      <button
        type="button"
        onClick={onImageUpload}
        className="rounded p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
        title="Upload Image"
      >
        <ImageIcon className="h-4 w-4" />
      </button>

      {/* Link Input Popup */}
      {showLinkInput && (
        <div className="absolute mt-12 rounded-lg border border-white/10 bg-[#0d0f1a] p-3 shadow-xl z-20 min-w-70">
          <p className="mb-2 text-xs text-zinc-400">Insert Link</p>
          <input
            type="text"
            placeholder="Link text (optional)"
            value={linkText}
            onChange={(e) => setLinkText(e.target.value)}
            className="mb-2 w-full rounded border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500/50 focus:outline-none"
          />
          <input
            type="url"
            placeholder="https://example.com"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className="mb-2 w-full rounded border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500/50 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleInsertLink}
              className="flex-1 rounded bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600"
            >
              Insert
            </button>
            <button
              onClick={() => setShowLinkInput(false)}
              className="flex-1 rounded border border-white/15 px-3 py-1 text-xs text-zinc-400 hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Image preview component
const ImagePreview = ({ image, onRemove }: { image: ImageAttachment; onRemove: () => void }) => {
  return (
    <div className="group relative inline-block rounded-lg border border-white/10 bg-white/5 overflow-hidden">
      <img
        src={image.preview}
        alt="Upload preview"
        className="h-20 w-20 object-cover"
      />
      {image.uploading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
          <Loader2 className="h-5 w-5 animate-spin text-white" />
          <span className="mt-1 text-[10px] text-white">{image.uploadProgress}%</span>
        </div>
      )}
      <button
        onClick={onRemove}
        className="absolute top-1 right-1 rounded-full bg-black/70 p-1 text-white opacity-0 transition group-hover:opacity-100 hover:bg-red-500"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
};

const NewDiscussionModal: React.FC<NewDiscussionModalProps> = ({
  isOpen,
  onClose,
  onCreatePost,
  availableGroups = [],
}) => {
  // State hooks
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; content?: string; group?: string; tag?: string }>({});
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Helper: Apply text formatting
  const applyFormatting = (format: string, value?: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    let formattedText = "";
    let newCursorPos = start;

    switch (format) {
      case "bold":
        formattedText = `**${selectedText || "bold text"}**`;
        newCursorPos = start + 2;
        break;
      case "italic":
        formattedText = `*${selectedText || "italic text"}*`;
        newCursorPos = start + 1;
        break;
      case "bullet-list":
        formattedText = selectedText
          ? selectedText.split("\n").map(line => `- ${line}`).join("\n")
          : "- ";
        newCursorPos = start + 2;
        break;
      case "numbered-list":
        formattedText = selectedText
          ? selectedText.split("\n").map((line, i) => `${i + 1}. ${line}`).join("\n")
          : "1. ";
        newCursorPos = start + 3;
        break;
      case "code":
        formattedText = `\`\`\`\n${selectedText || "code here"}\n\`\`\``;
        newCursorPos = start + 4;
        break;
      case "insertText":
        formattedText = value || "";
        newCursorPos = start + (value?.length || 0);
        break;
      default:
        return;
    }

    const newContent = content.substring(0, start) + formattedText + content.substring(end);
    setContent(newContent);

    // Set cursor position after update
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos + (selectedText?.length || 0));
    }, 0);
  };

  // Handle image upload
  const handleImageUpload = async (files: FileList | null) => {
    if (!files) return;

    const newImages: ImageAttachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file type
      if (!file.type.startsWith("image/")) {
        showErrorToast(`${file.name} is not an image file`);
        continue;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showErrorToast(`${file.name} exceeds 5MB limit`);
        continue;
      }

      const preview = URL.createObjectURL(file);
        // eslint-disable-next-line react-hooks/purity
      const imageId = `${Date.now()}-${i}`;

      newImages.push({
        id: imageId,
        file,
        preview,
        uploading: true,
        uploadProgress: 0,
      });
    }

    setImages(prev => [...prev, ...newImages]);

    // Simulate upload to server
    for (const image of newImages) {
      await simulateUpload(image.id);
    }
  };

  const simulateUpload = async (imageId: string) => {
    // Simulate upload progress
    for (let progress = 0; progress <= 100; progress += 20) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setImages(prev =>
        prev.map(img =>
          img.id === imageId ? { ...img, uploadProgress: progress } : img
        )
      );
    }

    // Simulate getting URL from server
    setImages(prev =>
      prev.map(img =>
        img.id === imageId
          ? { ...img, uploading: false, url: img.preview } // In real app, use server URL
          : img
      )
    );
  };

  const removeImage = (imageId: string) => {
    const image = images.find(img => img.id === imageId);
    if (image) {
      URL.revokeObjectURL(image.preview);
    }
    setImages(prev => prev.filter(img => img.id !== imageId));
  };

  // Convert content with markdown to HTML for preview
  const renderMarkdownPreview = () => {
    let html = content
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em class="italic text-zinc-300">$1</em>')
      // Code blocks
      .replace(/```\n(.*?)\n```/gs, '<pre class="rounded-lg bg-black/50 p-3 text-sm text-green-400 overflow-x-auto"><code>$1</code></pre>')
      // Inline code
      .replace(/`(.*?)`/g, '<code class="rounded bg-black/50 px-1 py-0.5 text-xs text-green-400">$1</code>')
      // Bullet lists
      .replace(/^- (.*?)$/gm, '<li class="ml-4 text-zinc-300">$1</li>')
      // Numbered lists
      .replace(/^\d+\. (.*?)$/gm, '<li class="ml-4 text-zinc-300 list-decimal">$1</li>')
      // Links
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
      // Line breaks
      .replace(/\n/g, '<br />');

    // Wrap lists properly
    html = html.replace(/(<li[^>]*>.*?<\/li>\n?)+/gs, '<ul class="my-2 space-y-1">$&</ul>');

    return html;
  };

  // Initialize selected group when availableGroups changes or modal opens
  useEffect(() => {
    if (isOpen && availableGroups.length > 0) {
      const firstGroup = availableGroups[0];
      setSelectedGroupId(firstGroup.id);
      if (firstGroup.tags && firstGroup.tags.length > 0) {
        setSelectedTag(firstGroup.tags[0]);
      } else {
        setSelectedTag("");
      }
    }
  }, [isOpen, availableGroups]);

  // Reset tag when selected group changes
  useEffect(() => {
    if (selectedGroupId !== null) {
      const group = availableGroups.find(g => g.id === selectedGroupId);
      if (group?.tags && group.tags.length > 0) {
        setSelectedTag(group.tags[0]);
      } else {
        setSelectedTag("");
      }
    }
  }, [selectedGroupId, availableGroups]);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      images.forEach(image => URL.revokeObjectURL(image.preview));
    };
  }, []);

  if (!isOpen) return null;

  const selectedGroup = availableGroups.find(g => g.id === selectedGroupId);
  const availableTags = selectedGroup?.tags || [];

  const validate = (): boolean => {
    const newErrors: { title?: string; content?: string; group?: string; tag?: string } = {};
    if (!title.trim()) newErrors.title = "Title is required";
    else if (title.length < 5) newErrors.title = "Title must be at least 5 characters";

    if (!content.trim()) newErrors.content = "Content is required";
    else if (content.length < 20) newErrors.content = "Content must be at least 20 characters";

    if (!selectedGroupId) newErrors.group = "Please select a group to post to";

    if (!selectedTag) newErrors.tag = "Please select a category/tag for your post";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate() || !selectedGroupId || !selectedTag) return;

    // Check if images are still uploading
    const uploadingImages = images.filter(img => img.uploading);
    if (uploadingImages.length > 0) {
      showErrorToast("Please wait for images to finish uploading");
      return;
    }

    setIsCreating(true);

    // Simulate API call delay
    setTimeout(() => {
      onCreatePost({
        title: title.trim(),
        content: content.trim(),
        groupId: selectedGroupId,
        tag: selectedTag,
        images: images, // Pass images to parent
      });

      showSuccessToast("Discussion Posted Successfully!");

      // Reset form
      setTitle("");
      setContent("");
      images.forEach(image => URL.revokeObjectURL(image.preview));
      setImages([]);
      if (availableGroups.length > 0) {
        setSelectedGroupId(availableGroups[0].id);
        if (availableGroups[0].tags && availableGroups[0].tags.length > 0) {
          setSelectedTag(availableGroups[0].tags[0]);
        } else {
          setSelectedTag("");
        }
      }
      setIsCreating(false);
      onClose();
    }, 500);
  };

  const handleClose = () => {
    if (title.trim() || content.trim() || images.length > 0) {
      showErrorToast("Discussion cancelled");
    }

    setTitle("");
    setContent("");
    images.forEach(image => URL.revokeObjectURL(image.preview));
    setImages([]);
    if (availableGroups.length > 0) {
      setSelectedGroupId(availableGroups[0].id);
      if (availableGroups[0].tags && availableGroups[0].tags.length > 0) {
        setSelectedTag(availableGroups[0].tags[0]);
      } else {
        setSelectedTag("");
      }
    }
    setErrors({});
    setIsGroupDropdownOpen(false);
    setIsTagDropdownOpen(false);
    setShowPreview(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 px-4 py-6 backdrop-blur-sm animate-fade-in-modal sm:items-center sm:py-8">
      <div className="my-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0d0f1a] shadow-2xl animate-scale-in max-h-[calc(100vh-3rem)] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-blue-400" />
            <h3 className="text-xl font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Create New Discussion
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
              title={showPreview ? "Edit" : "Preview"}
            >
              {showPreview ? <Edit3 className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
            <button
              onClick={handleClose}
              className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <p className="text-sm text-zinc-400 mb-4">
            Start a new conversation in one of your groups
          </p>

          {/* Group Selection Dropdown */}
          <div className="mb-4">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Group *
            </label>
            {availableGroups.length === 0 ? (
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-center">
                <p className="text-xs text-yellow-400">
                  You haven't joined any groups yet. Join a group first to start a discussion!
                </p>
              </div>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsGroupDropdownOpen(!isGroupDropdownOpen);
                    setIsTagDropdownOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg border ${
                    errors.group ? "border-red-500/50" : "border-white/15"
                  } bg-white/5 px-4 py-2.5 text-sm text-white transition-all hover:bg-white/10 focus:outline-none`}
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-zinc-500" />
                    <span>{selectedGroup?.name || "Select a group"}</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isGroupDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {isGroupDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-10 max-h-48 overflow-y-auto rounded-lg border border-white/15 bg-[#0d0f1a] shadow-xl animate-fade-in">
                    {availableGroups.map((group) => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => {
                          setSelectedGroupId(group.id);
                          setIsGroupDropdownOpen(false);
                          if (errors.group) setErrors({ ...errors, group: undefined });
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/10 hover:text-white"
                      >
                        <Users className="h-3.5 w-3.5 text-zinc-500" />
                        {group.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {errors.group && (
              <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.group}
              </p>
            )}
          </div>

          {/* Category / Tag Selection Dropdown */}
          <div className="mb-4">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Category / Tag *
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  if (availableTags.length === 0) return;
                  setIsTagDropdownOpen(!isTagDropdownOpen);
                  setIsGroupDropdownOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg border ${
                  errors.tag ? "border-red-500/50" : "border-white/15"
                } bg-white/5 px-4 py-2.5 text-sm text-white transition-all hover:bg-white/10 focus:outline-none ${
                  availableTags.length === 0 ? "opacity-50 cursor-not-allowed" : ""
                }`}
                disabled={availableTags.length === 0}
              >
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-zinc-500" />
                  <span>
                    {selectedTag
                      ? selectedTag
                      : (availableTags.length === 0
                          ? "No tags available for this group"
                          : "Select a category")}
                  </span>
                </div>
                {availableTags.length > 0 && (
                  <ChevronDown className={`h-4 w-4 transition-transform ${isTagDropdownOpen ? "rotate-180" : ""}`} />
                )}
              </button>

              {isTagDropdownOpen && availableTags.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-10 max-h-48 overflow-y-auto rounded-lg border border-white/15 bg-[#0d0f1a] shadow-xl animate-fade-in">
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setSelectedTag(tag);
                        setIsTagDropdownOpen(false);
                        if (errors.tag) setErrors({ ...errors, tag: undefined });
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/10 hover:text-white"
                    >
                      <Tag className="h-3.5 w-3.5 text-zinc-500" />
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.tag && (
              <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.tag}
              </p>
            )}
          </div>

          {/* Title Input */}
          <div className="mb-4">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors({ ...errors, title: undefined });
              }}
              placeholder="What's your question or topic?"
              className={`w-full rounded-lg border ${
                errors.title ? "border-red-500/50" : "border-white/15"
              } bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all`}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.title}
              </p>
            )}
          </div>

          {/* Rich Text Editor / Preview */}
          {!showPreview ? (
            <>
              {/* Rich Text Toolbar */}
              <RichTextToolbar
                onFormat={applyFormatting}
                onImageUpload={() => fileInputRef.current?.click()}
              />

              {/* Content Textarea */}
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  if (errors.content) setErrors({ ...errors, content: undefined });
                }}
                placeholder="Describe your question, share your thoughts, or start a discussion... (Supports **bold**, *italic*, `code`, and [links](url))"
                rows={8}
                className={`w-full rounded-b-lg border border-t-0 ${
                  errors.content ? "border-red-500/50" : "border-white/15"
                } bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all resize-none`}
              />
            </>
          ) : (
            <div className="rounded-lg border border-white/15 bg-white/5 p-4 min-h-50 max-h-75 overflow-y-auto">
              <div
                className="prose prose-invert prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: renderMarkdownPreview() }}
              />
            </div>
          )}

          {/* Image Upload Area */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Images
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-zinc-400 transition hover:bg-white/10 hover:text-white"
              >
                <Upload className="h-3 w-3" />
                Add Image
              </button>
            </div>

            {/* Image Previews */}
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {images.map((image) => (
                  <ImagePreview
                    key={image.id}
                    image={image}
                    onRemove={() => removeImage(image.id)}
                  />
                ))}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleImageUpload(e.target.files)}
            />

            <p className="mt-1 text-[10px] text-zinc-500">
              Supported: JPG, PNG, GIF (max 5MB per image)
            </p>
          </div>

          {errors.content && (
            <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.content}
            </p>
          )}

          <p className="mt-1 text-right text-[10px] text-zinc-500">
            {content.length} characters (minimum 20)
          </p>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSubmit}
              disabled={isCreating || availableGroups.length === 0 || availableTags.length === 0}
              className="flex-1 rounded-full bg-linear-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:hover:scale-100"
            >
              {isCreating ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Creating...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Create Discussion
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
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-modal {
          animation: fade-in-modal 0.2s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
        .animate-fade-in {
          animation: fade-in 0.15s ease-out;
        }
      `}</style>
    </div>
  );
};

export default NewDiscussionModal;