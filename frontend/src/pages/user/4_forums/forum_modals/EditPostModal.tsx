// src/pages/user/4_forums/forum_modals/EditPostModal.tsx
import { useState, useEffect, useRef } from "react";
import {
  X,
  Save,
  AlertCircle,
  Bold,
  Italic,
  List,
  Link as LinkIcon,
  Code,
  Eye,
  Edit3,
  Image as ImageIcon,
  Trash2,
  Upload,
  Loader2,
  Tag,
  XCircle,
  ChevronDown
} from "lucide-react";
import { showErrorToast } from "@/components/utility/toast";
import api from "@/lib/axios";
import { uploadFileWithIntent } from "@/lib/uploadFile";

interface ImageAttachment {
  id: string;
  file?: File;
  preview: string;
  url?: string;
  uploading?: boolean;
  uploadProgress?: number;
  s3Key?: string;
}

interface Tag {
  tag_id: number;
  tag_name: string;
}

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (postId: string, updatedData: { 
    title: string; 
    content: string; 
    tags: Tag[]; 
    images?: ImageAttachment[];
    imageKeys?: string[];
  }) => void;
  post: {
    id: string;
    title: string;
    content: string;
    tags: Tag[];
    images?: ImageAttachment[];
    imageKeys?: string[];
  } | null;
  availableTags?: Tag[];
}

// Rich text toolbar component
const RichTextToolbar = ({ onFormat, onImageUpload, showPreview, onTogglePreview }: {
  onFormat: (format: string, value?: string) => void;
  onImageUpload: () => void;
  showPreview: boolean;
  onTogglePreview: () => void;
}) => {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const linkInputRef = useRef<HTMLDivElement>(null);

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
    <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-gray-300 dark:border-white/15 border-b-0 bg-gray-100/80 dark:bg-white/5 px-3 py-2">
      <button
        type="button"
        onClick={() => onFormat("bold")}
        className="rounded p-1.5 text-gray-600 dark:text-zinc-300 transition-all duration-200 hover:bg-gray-200/70 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white hover:scale-110 active:scale-95"
        title="Bold (**text**)"
      >
        <Bold className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onFormat("italic")}
        className="rounded p-1.5 text-gray-600 dark:text-zinc-300 transition-all duration-200 hover:bg-gray-200/70 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white hover:scale-110 active:scale-95"
        title="Italic (*text*)"
      >
        <Italic className="h-4 w-4" />
      </button>
      <div className="mx-0.5 h-5 w-px bg-gray-300 dark:bg-white/15" />
      <button
        type="button"
        onClick={() => onFormat("bullet-list")}
        className="rounded p-1.5 text-gray-600 dark:text-zinc-300 transition-all duration-200 hover:bg-gray-200/70 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white hover:scale-110 active:scale-95"
        title="Bullet List (- item)"
      >
        <List className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onFormat("numbered-list")}
        className="rounded p-1.5 text-gray-600 dark:text-zinc-300 transition-all duration-200 hover:bg-gray-200/70 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white hover:scale-110 active:scale-95"
        title="Numbered List (1. item)"
      >
        <div className="flex items-center gap-0.5">
          <span className="text-xs font-bold">1.</span>
          <List className="h-3 w-3" />
        </div>
      </button>
      <div className="mx-0.5 h-5 w-px bg-gray-300 dark:bg-white/15" />
      <div className="relative" ref={linkInputRef}>
        <button
          type="button"
          onClick={() => setShowLinkInput(!showLinkInput)}
          className="rounded p-1.5 text-gray-600 dark:text-zinc-300 transition-all duration-200 hover:bg-gray-200/70 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white hover:scale-110 active:scale-95"
          title="Insert Link [text](url)"
        >
          <LinkIcon className="h-4 w-4" />
        </button>
        {showLinkInput && (
          <div className="absolute left-0 mt-2 z-20 min-w-72 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-3 shadow-xl animate-fade-in">
            <p className="mb-2 text-xs font-semibold text-gray-700 dark:text-zinc-200">Insert Link</p>
            <input
              type="text"
              placeholder="Link text (optional)"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              className="mb-2 w-full rounded border border-gray-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 py-1.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <input
              type="url"
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="mb-2 w-full rounded border border-gray-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 py-1.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button onClick={handleInsertLink} className="flex-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                Insert
              </button>
              <button onClick={() => setShowLinkInput(false)} className="flex-1 rounded border border-gray-300 dark:border-white/15 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-white/10">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onFormat("code")}
        className="rounded p-1.5 text-gray-600 dark:text-zinc-300 transition-all duration-200 hover:bg-gray-200/70 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white hover:scale-110 active:scale-95"
        title="Inline Code (`code`)"
      >
        <Code className="h-4 w-4" />
      </button>
      <div className="mx-0.5 h-5 w-px bg-gray-300 dark:bg-white/15" />
      <button
        type="button"
        onClick={onImageUpload}
        className="rounded p-1.5 text-gray-600 dark:text-zinc-300 transition-all duration-200 hover:bg-gray-200/70 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white hover:scale-110 active:scale-95"
        title="Upload Image"
      >
        <ImageIcon className="h-4 w-4" />
      </button>
      <div className="ml-auto">
        <button
          type="button"
          onClick={onTogglePreview}
          className={`rounded p-1.5 transition-all duration-200 hover:bg-gray-200/70 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white hover:scale-110 active:scale-95 ${
            showPreview ? "bg-blue-500/20 text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-zinc-300"
          }`}
          title={showPreview ? "Edit" : "Preview"}
        >
          {showPreview ? <Edit3 className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
};

// Image preview component for new uploads
const ImagePreview = ({ image, onRemove }: { image: ImageAttachment; onRemove: () => void }) => {
  return (
    <div className="group relative inline-block rounded-lg border border-white/10 bg-white/5 overflow-hidden transition-all duration-200 hover:scale-105 hover:border-white/20">
      <img
        src={image.preview}
        alt="Upload preview"
        className="h-20 w-20 object-cover"
      />
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

// Image preview for existing S3 images
const ExistingImagePreview = ({ imageKey, onRemove }: { imageKey: string; onRemove: () => void }) => {
  const [imageError, setImageError] = useState(false);
  
  const getImageUrl = (key: string) => {
    if (key.startsWith('http')) return key;
    return `${import.meta.env.VITE_CLOUDFRONT_URL}/${key}`;
  };

  return (
    <div className="group relative inline-block rounded-lg border border-white/10 bg-white/5 overflow-hidden transition-all duration-200 hover:scale-105 hover:border-white/20">
      <img
        src={imageError ? "https://placehold.co/400x300?text=Image+Not+Found" : getImageUrl(imageKey)}
        alt="Existing image"
        className="h-20 w-20 object-cover"
        onError={() => setImageError(true)}
      />
      <button
        onClick={onRemove}
        className="absolute top-1 right-1 rounded-full bg-black/70 p-1 text-white opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-red-500 hover:scale-110 active:scale-95"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
};

// Markdown preview component
const MarkdownPreview = ({ content }: { content: string }) => {
  // Custom markdown components
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

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
      {content}
    </ReactMarkdown>
  );
};

const EditPostModal: React.FC<EditPostModalProps> = ({
  isOpen,
  onClose,
  onSave,
  post,
  availableTags = [],
}) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [existingImageKeys, setExistingImageKeys] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; content?: string; tags?: string }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Upload file to AWS S3
  const uploadFileToS3 = async (file: File): Promise<string> => {
    try {
      return (await uploadFileWithIntent(file, "forum-discussions")).key;
      const response = await api.post("/api/files/upload-url", {
        folder: "forum-discussions",
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
          folder: "forum-discussions",
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Apply text formatting
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

  // Handle new image upload with S3
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

    // Upload each image to S3
    for (const image of newImages) {
      try {
        setImages(prev =>
          prev.map(img =>
            img.id === image.id ? { ...img, uploadProgress: 30 } : img
          )
        );

        const s3Key = await uploadFileToS3(image.file!);
        
        setImages(prev =>
          prev.map(img =>
            img.id === image.id 
              ? { ...img, uploading: false, uploadProgress: 100, s3Key, url: `${import.meta.env.VITE_CLOUDFRONT_URL}/${s3Key}` } 
              : img
          )
        );

        console.log(`✅ Image uploaded successfully with key: ${s3Key}`);
      } catch (error: any) {
        console.error(`❌ Failed to upload image:`, error);
        setImages(prev =>
          prev.map(img =>
            img.id === image.id 
              ? { ...img, uploading: false } 
              : img
          )
        );
        showErrorToast(`Failed to upload ${image.file?.name}: ${error.message}`);
      }
    }
  };

  const removeImage = (imageId: string) => {
    const image = images.find(img => img.id === imageId);
    if (image && image.preview && image.preview.startsWith('blob:')) {
      URL.revokeObjectURL(image.preview);
    }
    setImages(prev => prev.filter(img => img.id !== imageId));
  };

  const removeExistingImage = (imageKey: string) => {
    setExistingImageKeys(prev => prev.filter(key => key !== imageKey));
  };

  // Tag handlers
  const addTag = (tag: Tag) => {
    if (!selectedTags.find(t => t.tag_id === tag.tag_id)) {
      setSelectedTags([...selectedTags, tag]);
    }
    setIsDropdownOpen(false);
    if (errors.tags) setErrors({ ...errors, tags: undefined });
  };

  const removeTag = (tagId: number) => {
    setSelectedTags(prev => prev.filter(t => t.tag_id !== tagId));
  };

  // Initialize form when post changes
  useEffect(() => {
    if (post && isOpen) {
      setTitle(post.title || "");
      setContent(post.content || "");
      setSelectedTags(post.tags || []);
      setImages([]);
      setExistingImageKeys(post.imageKeys || []);
    }
  }, [post, isOpen]);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      images.forEach(image => {
        if (image.preview && image.preview.startsWith('blob:')) {
          URL.revokeObjectURL(image.preview);
        }
      });
    };
  }, []);

  if (!isOpen || !post) return null;

  const validate = (): boolean => {
    const newErrors: { title?: string; content?: string; tags?: string } = {};
    if (!title.trim()) newErrors.title = "Title is required";
    else if (title.length < 5) newErrors.title = "Title must be at least 5 characters";

    if (!content.trim()) newErrors.content = "Content is required";
    else if (content.length < 20) newErrors.content = "Content must be at least 20 characters";

    if (selectedTags.length === 0) newErrors.tags = "Please select at least one tag";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const uploadingImages = images.filter(img => img.uploading);
    if (uploadingImages.length > 0) {
      showErrorToast("Please wait for images to finish uploading");
      return;
    }

    setIsSaving(true);

    // Collect all image keys (existing + new ones)
    const allImageKeys: string[] = [...existingImageKeys];
    
    // Add S3 keys from newly uploaded images
    images.forEach(img => {
      if (img.s3Key) {
        allImageKeys.push(img.s3Key);
      }
    });

    setTimeout(() => {
      onSave(post.id, {
        title: title.trim(),
        content: content.trim(),
        tags: selectedTags,
        imageKeys: allImageKeys,
      });
      setIsSaving(false);
      onClose();
    }, 500);
  };

  const mergedTags = [
    ...availableTags,
    ...selectedTags.filter((sel) => !availableTags.some((av) => av.tag_id === sel.tag_id)),
  ];

  const handleTagToggle = (tag: Tag) => {
    const exists = selectedTags.some((t) => t.tag_id === tag.tag_id);
    if (exists) {
      removeTag(tag.tag_id);
    } else {
      addTag(tag);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 dark:bg-black/80 px-4 py-6 backdrop-blur-sm animate-fade-in-modal sm:items-center sm:py-8">
      <div className="my-auto w-full max-w-4xl rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-2xl animate-scale-in max-h-[calc(100vh-3rem)] overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/95 backdrop-blur-sm p-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-full bg-blue-500/15 p-1.5">
              <Edit3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Discussion</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-600 dark:text-zinc-300 transition hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Categories/Tags Selection - Multi-select Toggle Buttons */}
          <div className="mb-5">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-zinc-200">
              Categories / Tags * (Select one or more)
            </label>
            {mergedTags.length === 0 ? (
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3.5 py-2.5 text-sm font-medium text-yellow-700 dark:text-yellow-400">
                No tags available for this group.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {mergedTags.map((tag) => {
                  const isSelected = selectedTags.some((t) => t.tag_id === tag.tag_id);
                  return (
                    <button
                      key={tag.tag_id}
                      type="button"
                      onClick={() => handleTagToggle(tag)}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                        isSelected
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 shadow-sm shadow-blue-500/15"
                          : "border-gray-300 dark:border-white/15 bg-white dark:bg-dark-surface text-gray-700 dark:text-zinc-200 hover:border-gray-400 dark:hover:border-white/25"
                      }`}
                    >
                      <Tag className="h-3 w-3" />
                      {tag.tag_name}
                    </button>
                  );
                })}
              </div>
            )}

            {errors.tags && (
              <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.tags}
              </p>
            )}

            <p className="mt-1.5 text-xs text-gray-600 dark:text-zinc-400">
              {selectedTags.length} tag{selectedTags.length !== 1 ? "s" : ""} selected
            </p>
          </div>

          {/* Title Input */}
          <div className="mb-5">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-zinc-200">
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
              maxLength={200}
              className={`w-full rounded-lg border ${
                errors.title ? "border-red-500/70" : "border-gray-300 dark:border-white/15"
              } bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all`}
            />
            {errors.title && (
              <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.title}
              </p>
            )}
            <p className="mt-1.5 text-right text-xs text-gray-600 dark:text-zinc-400">{title.length}/200 characters</p>
          </div>

          {/* Content Editor with Real-time Preview */}
          <div className="mb-5">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-zinc-200">
              Content *
            </label>
            
            <RichTextToolbar
              onFormat={applyFormatting}
              onImageUpload={() => fileInputRef.current?.click()}
              showPreview={showPreview}
              onTogglePreview={() => setShowPreview(!showPreview)}
            />

            {!showPreview ? (
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  if (errors.content) setErrors({ ...errors, content: undefined });
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
                className={`w-full rounded-b-lg border border-t-0 ${
                  errors.content ? "border-red-500/70" : "border-gray-300 dark:border-white/15"
                } bg-white dark:bg-white/5 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-mono`}
              />
            ) : (
              <div className="min-h-64 rounded-b-lg border border-t-0 border-gray-300 dark:border-white/15 bg-white dark:bg-white/5 p-4 overflow-y-auto">
                {content.trim() ? (
                  <MarkdownPreview content={content} />
                ) : (
                  <p className="text-sm italic text-gray-500 dark:text-zinc-400">Nothing to preview...</p>
                )}
              </div>
            )}
          </div>

          {/* Image Upload Area */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-zinc-200">
                Images (Optional)
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-zinc-200 transition hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
              >
                <Upload className="h-3.5 w-3.5" />
                Add Image
              </button>
            </div>

            {/* Existing Images */}
            {existingImageKeys.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {existingImageKeys.map((key) => (
                  <ExistingImagePreview
                    key={key}
                    imageKey={key}
                    onRemove={() => removeExistingImage(key)}
                  />
                ))}
              </div>
            )}

            {/* New Images */}
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

            <p className="mt-1.5 text-xs text-gray-600 dark:text-zinc-400">Supported: JPG, PNG, GIF, WebP (max 5MB per image)</p>
          </div>

          {errors.content && <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{errors.content}</p>}
          <p className="mt-1 text-right text-xs text-gray-600 dark:text-zinc-400">{content.length} characters (minimum 20)</p>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-700 hover:shadow-md hover:shadow-blue-500/20 active:scale-[0.99] disabled:opacity-50"
            >
              {isSaving ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Save className="h-4 w-4" />
                  Save Changes
                </div>
              )}
            </button>
            <button
              onClick={onClose}
              className="flex-1 rounded-full border border-gray-300 dark:border-white/15 bg-white dark:bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-zinc-200 transition hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
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

export default EditPostModal;
