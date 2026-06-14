// src/pages/user/4_forums/forum_modals/NewDiscussionModal.tsx
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
  Loader2,
  Check,
  XCircle,
} from "lucide-react";
import { showSuccessToast, showErrorToast } from "@/components/utility/toast";

interface Group {
  id: string;
  name: string;
  tags: {
    tag_id: number;
    tag: string;
  }[];
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
    tags: { tag_id: number; tag_name: string }[]; // Changed from single tag to array of tags
    images?: ImageAttachment[];
  }) => void;
  availableGroups: Group[];
}

// Custom markdown components for preview styling
const MarkdownComponents = {
  h1: ({ children }: { children: React.ReactNode }) => (
    <h1 className="text-2xl font-bold text-white mt-4 mb-2 border-b border-white/10 pb-2">{children}</h1>
  ),
  h2: ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-xl font-bold text-white mt-3 mb-2">{children}</h2>
  ),
  h3: ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-lg font-bold text-white mt-2 mb-1">{children}</h3>
  ),
  p: ({ children }: { children: React.ReactNode }) => (
    <p className="text-zinc-300 mb-2 leading-relaxed">{children}</p>
  ),
  strong: ({ children }: { children: React.ReactNode }) => (
    <strong className="font-bold text-white">{children}</strong>
  ),
  em: ({ children }: { children: React.ReactNode }) => (
    <em className="italic text-zinc-300">{children}</em>
  ),
  code: ({ children, className }: { children: React.ReactNode; className?: string }) => {
    const inline = !className;
    if (inline) {
      return <code className="rounded bg-black/50 px-1 py-0.5 text-xs text-green-400 font-mono">{children}</code>;
    }
    return (
      <pre className="rounded-lg bg-black/50 p-3 text-sm text-green-400 overflow-x-auto font-mono my-2">
        <code>{children}</code>
      </pre>
    );
  },
  ul: ({ children }: { children: React.ReactNode }) => (
    <ul className="my-2 space-y-1 list-disc list-inside">{children}</ul>
  ),
  ol: ({ children }: { children: React.ReactNode }) => (
    <ol className="my-2 space-y-1 list-decimal list-inside">{children}</ol>
  ),
  li: ({ children }: { children: React.ReactNode }) => (
    <li className="text-zinc-300">{children}</li>
  ),
  a: ({ href, children }: { href?: string; children: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline transition-colors">
      {children}
    </a>
  ),
  blockquote: ({ children }: { children: React.ReactNode }) => (
    <blockquote className="border-l-4 border-blue-500 pl-4 my-2 text-zinc-400 italic">{children}</blockquote>
  ),
};

// Rich text toolbar component
const RichTextToolbar = ({ onFormat, onImageUpload, onTogglePreview, showPreview }: {
  onFormat: (format: string, value?: string) => void;
  onImageUpload: () => void;
  onTogglePreview: () => void;
  showPreview: boolean;
}) => {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const linkInputRef = useRef<HTMLDivElement>(null);

  const handleInsertLink = () => {
    if (linkUrl) {
      const markdownLink = linkText ? `[${linkText}](${linkUrl})` : `[${linkUrl}](${linkUrl})`;
      onFormat("insertText", markdownLink);
      setShowLinkInput(false);
      setLinkUrl("");
      setLinkText("");
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (linkInputRef.current && !linkInputRef.current.contains(event.target as Node)) {
        setShowLinkInput(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-white/15 border-b-0 bg-white/5 px-3 py-2">
      <button
        type="button"
        onClick={() => onFormat("bold")}
        className="rounded p-1.5 text-zinc-400 transition-all duration-200 hover:bg-white/10 hover:text-white hover:scale-110 active:scale-95"
        title="Bold (**text**)"
      >
        <Bold className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onFormat("italic")}
        className="rounded p-1.5 text-zinc-400 transition-all duration-200 hover:bg-white/10 hover:text-white hover:scale-110 active:scale-95"
        title="Italic (*text*)"
      >
        <Italic className="h-4 w-4" />
      </button>
      <div className="mx-0.5 h-5 w-px bg-white/10" />
      <button
        type="button"
        onClick={() => onFormat("bullet-list")}
        className="rounded p-1.5 text-zinc-400 transition-all duration-200 hover:bg-white/10 hover:text-white hover:scale-110 active:scale-95"
        title="Bullet List (- item)"
      >
        <List className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onFormat("numbered-list")}
        className="rounded p-1.5 text-zinc-400 transition-all duration-200 hover:bg-white/10 hover:text-white hover:scale-110 active:scale-95"
        title="Numbered List (1. item)"
      >
        <div className="flex items-center gap-0.5">
          <span className="text-xs font-bold">1.</span>
          <List className="h-3 w-3" />
        </div>
      </button>
      <div className="mx-0.5 h-5 w-px bg-white/10" />
      <div className="relative" ref={linkInputRef}>
        <button
          type="button"
          onClick={() => setShowLinkInput(!showLinkInput)}
          className="rounded p-1.5 text-zinc-400 transition-all duration-200 hover:bg-white/10 hover:text-white hover:scale-110 active:scale-95"
          title="Insert Link [text](url)"
        >
          <LinkIcon className="h-4 w-4" />
        </button>
        {showLinkInput && (
          <div className="absolute left-0 mt-2 z-20 min-w-72 rounded-lg border border-white/10 bg-[#0d0f1a] p-3 shadow-xl animate-fade-in">
            <p className="mb-2 text-xs font-medium text-zinc-400">Insert Link</p>
            <input
              type="text"
              placeholder="Link text (optional)"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              className="mb-2 w-full rounded border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              autoFocus
            />
            <input
              type="url"
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="mb-2 w-full rounded border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            />
            <div className="flex gap-2">
              <button onClick={handleInsertLink} className="flex-1 rounded bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600">
                Insert
              </button>
              <button onClick={() => setShowLinkInput(false)} className="flex-1 rounded border border-white/15 px-3 py-1.5 text-xs text-zinc-400 hover:bg-white/10">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onFormat("code")}
        className="rounded p-1.5 text-zinc-400 transition-all duration-200 hover:bg-white/10 hover:text-white hover:scale-110 active:scale-95"
        title="Inline Code (`code`)"
      >
        <Code className="h-4 w-4" />
      </button>
      <div className="mx-0.5 h-5 w-px bg-white/10" />
      <button
        type="button"
        onClick={onImageUpload}
        className="rounded p-1.5 text-zinc-400 transition-all duration-200 hover:bg-white/10 hover:text-white hover:scale-110 active:scale-95"
        title="Upload Image"
      >
        <ImageIcon className="h-4 w-4" />
      </button>
      <div className="ml-auto">
        <button
          type="button"
          onClick={onTogglePreview}
          className={`rounded p-1.5 transition-all duration-200 hover:bg-white/10 hover:text-white hover:scale-110 active:scale-95 ${
            showPreview ? "bg-blue-500/20 text-blue-400" : "text-zinc-400"
          }`}
          title={showPreview ? "Edit" : "Preview"}
        >
          {showPreview ? <Edit3 className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
};

// Image preview component
const ImagePreview = ({ image, onRemove }: { image: ImageAttachment; onRemove: () => void }) => {
  return (
    <div className="group relative inline-block rounded-lg border border-white/10 bg-white/5 overflow-hidden transition-all duration-200 hover:scale-105 hover:border-white/20">
      <img src={image.preview} alt="Upload preview" className="h-20 w-20 object-cover" />
      {image.uploading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
          <Loader2 className="h-5 w-5 animate-spin text-white" />
          <span className="mt-1 text-[10px] text-white font-medium">{image.uploadProgress}%</span>
        </div>
      )}
      <button
        onClick={onRemove}
        className="absolute top-1 right-1 rounded-full bg-black/70 p-1 text-white opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-red-500 hover:scale-110 active:scale-95"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
};

// Selected Tag component
const SelectedTagBadge = ({ tag, onRemove }: { tag: { tag_id: number; tag_name: string }; onRemove: () => void }) => {
  return (
    <div className="flex items-center gap-1 rounded-full bg-blue-500/20 px-3 py-1.5 text-xs text-blue-400">
      <Tag className="h-3 w-3" />
      <span>{tag.tag_name}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-1 rounded-full p-0.5 hover:bg-blue-500/30 transition-colors"
      >
        <XCircle className="h-3 w-3" />
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
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<{ tag_id: number; tag_name: string }[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; content?: string; group?: string; tags?: string }>({});
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const groupDropdownRef = useRef<HTMLDivElement>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

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
        if (selectedText) {
          formattedText = selectedText.split("\n").map(line => `- ${line}`).join("\n");
        } else {
          formattedText = "- ";
          newCursorPos = start + 2;
        }
        break;
      case "numbered-list":
        if (selectedText) {
          formattedText = selectedText.split("\n").map((line, i) => `${i + 1}. ${line}`).join("\n");
        } else {
          formattedText = "1. ";
          newCursorPos = start + 3;
        }
        break;
      case "code":
        formattedText = `\`${selectedText || "code"}\``;
        newCursorPos = start + 1;
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

      if (!file.type.startsWith("image/")) {
        showErrorToast(`${file.name} is not an image file`);
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        showErrorToast(`${file.name} exceeds 5MB limit`);
        continue;
      }

      const preview = URL.createObjectURL(file);
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

    for (const image of newImages) {
      await simulateUpload(image.id);
    }
  };

  const simulateUpload = async (imageId: string) => {
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 80));
      setImages(prev =>
        prev.map(img => (img.id === imageId ? { ...img, uploadProgress: progress } : img))
      );
    }
    setImages(prev =>
      prev.map(img => (img.id === imageId ? { ...img, uploading: false, url: img.preview } : img))
    );
  };

  const removeImage = (imageId: string) => {
    const image = images.find(img => img.id === imageId);
    if (image) URL.revokeObjectURL(image.preview);
    setImages(prev => prev.filter(img => img.id !== imageId));
  };

  // Handle tag selection
  const handleTagToggle = (tag: { tag_id: number; tag: string }) => {
    const tagExists = selectedTags.some(t => t.tag_id === tag.tag_id);
    if (tagExists) {
      setSelectedTags(prev => prev.filter(t => t.tag_id !== tag.tag_id));
    } else {
      setSelectedTags(prev => [...prev, { tag_id: tag.tag_id, tag_name: tag.tag }]);
    }
    if (errors.tags) setErrors({ ...errors, tags: undefined });
  };

  const removeTag = (tagId: number) => {
    setSelectedTags(prev => prev.filter(t => t.tag_id !== tagId));
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (groupDropdownRef.current && !groupDropdownRef.current.contains(event.target as Node)) {
        setIsGroupDropdownOpen(false);
      }
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
        setIsTagDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initialize selected group
  useEffect(() => {
    if (isOpen && availableGroups.length > 0) {
      const firstGroup = availableGroups[0];
      setSelectedGroupId(firstGroup.id);
      setSelectedTags([]);
    }
  }, [isOpen, availableGroups]);

  // Reset tags when group changes
  useEffect(() => {
    setSelectedTags([]);
    if (errors.tags) setErrors({ ...errors, tags: undefined });
  }, [selectedGroupId]);

  // Cleanup preview URLs
  useEffect(() => {
    return () => images.forEach(image => URL.revokeObjectURL(image.preview));
  }, []);

  if (!isOpen) return null;

  const selectedGroup = availableGroups.find(g => g.id === selectedGroupId);
  const availableTags = selectedGroup?.tags || [];

  const validate = (): boolean => {
    const newErrors: { title?: string; content?: string; group?: string; tags?: string } = {};
    if (!title.trim()) newErrors.title = "Title is required";
    else if (title.length < 5) newErrors.title = "Title must be at least 5 characters";
    if (!content.trim()) newErrors.content = "Content is required";
    else if (content.length < 20) newErrors.content = "Content must be at least 20 characters";
    if (!selectedGroupId) newErrors.group = "Please select a group";
    if (selectedTags.length === 0) newErrors.tags = "Please select at least one tag";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate() || !selectedGroupId) return;

    const uploadingImages = images.filter(img => img.uploading);
    if (uploadingImages.length > 0) {
      showErrorToast("Please wait for images to finish uploading");
      return;
    }

    setIsCreating(true);
    
    // Prepare the post data with multiple tags
    const postData = { 
      title: title.trim(), 
      content: content.trim(), 
      groupId: selectedGroupId, 
      tags: selectedTags, // Array of tags with tag_id and tag_name
      images 
    };
    
    // Console log all the data being submitted
    console.log("=== NEW DISCUSSION SUBMISSION ===");
    console.log("Title:", postData.title);
    console.log("Content:", postData.content);
    console.log("Content Length:", postData.content.length);
    console.log("Group ID:", postData.groupId);
    console.log("Selected Group:", selectedGroup?.name);
    console.log("Tags:", postData.tags);
    console.log("Number of Tags:", postData.tags.length);
    console.log("Images:", postData.images.map(img => ({ id: img.id, url: img.url, uploading: img.uploading })));
    console.log("Number of Images:", postData.images.length);
    console.log("Full Post Data:", JSON.stringify(postData, null, 2));
    console.log("=================================");
    
    setTimeout(() => {
      onCreatePost(postData);
      showSuccessToast("Discussion Posted Successfully!");
      setTitle("");
      setContent("");
      images.forEach(image => URL.revokeObjectURL(image.preview));
      setImages([]);
      setSelectedTags([]);
      if (availableGroups.length > 0) {
        setSelectedGroupId(availableGroups[0].id);
      }
      setIsCreating(false);
      onClose();
    }, 500);
  };

  const handleClose = () => {
    if (title.trim() || content.trim() || images.length > 0 || selectedTags.length > 0) {
      showErrorToast("Discussion cancelled");
    }
    setTitle("");
    setContent("");
    images.forEach(image => URL.revokeObjectURL(image.preview));
    setImages([]);
    setSelectedTags([]);
    if (availableGroups.length > 0) {
      setSelectedGroupId(availableGroups[0].id);
    }
    setErrors({});
    setIsGroupDropdownOpen(false);
    setIsTagDropdownOpen(false);
    setShowPreview(false);
    onClose();
  };

  const togglePreview = () => setShowPreview(!showPreview);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 px-4 py-6 backdrop-blur-sm animate-fade-in-modal sm:items-center sm:py-8">
      <div className="my-auto w-full max-w-4xl rounded-2xl border border-white/10 bg-[#0d0f1a] shadow-2xl animate-scale-in max-h-[calc(100vh-3rem)] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0d0f1a]/95 backdrop-blur-sm p-4">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-blue-500/20 p-1.5">
              <PlusCircle className="h-4 w-4 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Create New Discussion</h3>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Group Selection */}
          <div className="mb-4">
            <label className="mb-2 block text-xs font-semibold uppercase text-zinc-500">Group *</label>
            {availableGroups.length === 0 ? (
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-center">
                <p className="text-xs text-yellow-400">You haven't joined any groups yet.</p>
              </div>
            ) : (
              <div className="relative" ref={groupDropdownRef}>
                <button
                  onClick={() => setIsGroupDropdownOpen(!isGroupDropdownOpen)}
                  className={`flex w-full items-center justify-between rounded-lg border ${errors.group ? "border-red-500/50" : "border-white/15"} bg-white/5 px-4 py-2.5 text-sm text-white transition hover:bg-white/10`}
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-zinc-500" />
                    <span>{selectedGroup?.name || "Select a group"}</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isGroupDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {isGroupDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-10 max-h-48 overflow-y-auto rounded-lg border border-white/15 bg-[#0d0f1a] shadow-xl">
                    {availableGroups.map(group => (
                      <button
                        key={group.id}
                        onClick={() => {
                          setSelectedGroupId(group.id);
                          setIsGroupDropdownOpen(false);
                          setErrors({ ...errors, group: undefined });
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/10 hover:text-white"
                      >
                        <Users className="h-3.5 w-3.5" />
                        {group.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {errors.group && <p className="mt-1 text-xs text-red-400">{errors.group}</p>}
          </div>

          {/* Categories/Tags Selection - Multi-select */}
          <div className="mb-4">
            <label className="mb-2 block text-xs font-semibold uppercase text-zinc-500">
              Categories / Tags * (Select one or more)
            </label>
            <div className="relative" ref={tagDropdownRef}>
              <button
                onClick={() => availableTags.length > 0 && setIsTagDropdownOpen(!isTagDropdownOpen)}
                className={`flex w-full items-center justify-between rounded-lg border ${errors.tags ? "border-red-500/50" : "border-white/15"} bg-white/5 px-4 py-2.5 text-sm text-white transition hover:bg-white/10 ${availableTags.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={availableTags.length === 0}
              >
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-zinc-500" />
                  <span>
                    {selectedTags.length > 0 
                      ? `${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''} selected` 
                      : (availableTags.length === 0 ? "No tags available" : "Select tags")}
                  </span>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${isTagDropdownOpen ? "rotate-180" : ""}`} />
              </button>
              
              {isTagDropdownOpen && availableTags.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-10 max-h-48 overflow-y-auto rounded-lg border border-white/15 bg-[#0d0f1a] shadow-xl">
                  {availableTags.map(tag => {
                    const isSelected = selectedTags.some(t => t.tag_id === tag.tag_id);
                    return (
                      <button
                        key={tag.tag_id}
                        onClick={() => handleTagToggle(tag)}
                        className={`flex w-full items-center justify-between gap-2 px-4 py-2 text-sm transition ${
                          isSelected 
                            ? "bg-blue-500/20 text-blue-400" 
                            : "text-zinc-300 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Tag className="h-3.5 w-3.5" />
                          <span>{tag.tag}</span>
                        </div>
                        {isSelected && <Check className="h-4 w-4" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Selected Tags Display */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedTags.map(tag => (
                  <SelectedTagBadge
                    key={tag.tag_id}
                    tag={tag}
                    onRemove={() => removeTag(tag.tag_id)}
                  />
                ))}
              </div>
            )}
            
            {errors.tags && <p className="mt-1 text-xs text-red-400">{errors.tags}</p>}
            <p className="mt-1 text-[10px] text-zinc-500">
              You can select multiple tags to better categorize your discussion
            </p>
          </div>

          {/* Title Input */}
          <div className="mb-4">
            <label className="mb-2 block text-xs font-semibold uppercase text-zinc-500">Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => {
                setTitle(e.target.value);
                setErrors({ ...errors, title: undefined });
              }}
              placeholder="What's your question or topic?"
              maxLength={200}
              className={`w-full rounded-lg border ${errors.title ? "border-red-500/50" : "border-white/15"} bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 transition focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50`}
            />
            {errors.title && <p className="mt-1 text-xs text-red-400">{errors.title}</p>}
            <p className="mt-1 text-right text-[10px] text-zinc-500">{title.length}/200 characters</p>
          </div>

          {/* Content Editor with Real-time Preview */}
          <div className="mb-4">
            <label className="mb-2 block text-xs font-semibold uppercase text-zinc-500">Content *</label>
            
            <RichTextToolbar
              onFormat={applyFormatting}
              onImageUpload={() => fileInputRef.current?.click()}
              onTogglePreview={togglePreview}
              showPreview={showPreview}
            />

            {!showPreview ? (
              <textarea
                ref={textareaRef}
                value={content}
                onChange={e => {
                  setContent(e.target.value);
                  setErrors({ ...errors, content: undefined });
                }}
                placeholder={`Write your content here...

Formatting examples:
**bold text**
*italic text*
- bullet point
1. numbered item
[link text](https://example.com)
\`inline code\`

> quote block`}
                rows={12}
                className={`w-full rounded-b-lg border border-t-0 ${errors.content ? "border-red-500/50" : "border-white/15"} bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 transition focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none font-mono`}
              />
            ) : (
              <div className="min-h-64 rounded-b-lg border border-t-0 border-white/15 bg-white/5 p-4 overflow-y-auto">
                {content.trim() ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                    {content}
                  </ReactMarkdown>
                ) : (
                  <p className="text-sm italic text-zinc-500">Nothing to preview...</p>
                )}
              </div>
            )}
          </div>

          {/* Image Upload */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase text-zinc-500">Images (Optional)</label>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-zinc-400 transition hover:bg-white/10 hover:text-white"
              >
                <Upload className="h-3 w-3" />
                Add Image
              </button>
            </div>
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {images.map(image => (
                  <ImagePreview key={image.id} image={image} onRemove={() => removeImage(image.id)} />
                ))}
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleImageUpload(e.target.files)} />
            <p className="mt-1 text-[10px] text-zinc-500">Supported: JPG, PNG, GIF, WebP (max 5MB per image)</p>
          </div>

          {errors.content && <p className="mt-1 text-xs text-red-400">{errors.content}</p>}
          <p className="mt-1 text-right text-[10px] text-zinc-500">{content.length} characters (minimum 20)</p>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSubmit}
              disabled={isCreating || availableGroups.length === 0}
              className="flex-1 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
            >
              {isCreating ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
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
              className="flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-white/10 hover:text-white"
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
        .animate-fade-in-modal { animation: fade-in-modal 0.2s ease-out; }
        .animate-scale-in { animation: scale-in 0.2s ease-out; }
        .animate-fade-in { animation: fade-in 0.15s ease-out; }
      `}</style>
    </div>
  );
};

export default NewDiscussionModal;