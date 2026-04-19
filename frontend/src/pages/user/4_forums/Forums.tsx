import {
  Bookmark,
  MessageCircle,
  PlusCircle,
  Search,
  ThumbsUp,
  Filter,
  ChevronDown,
  X,
  Clock,
  ChevronUp,
  Send,
  ChevronRight,
  Users,
  Image as ImageIcon,
  MoreVertical,
  Edit2,
  Trash2 as TrashIcon,
  Heart,
  Eye,
  Loader2,
} from "lucide-react";
import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import UserHeader from "@/components/nav/user_header";
import NewDiscussionModal from "@/pages/user/4_forums/forum_modals/NewDiscussionModal.tsx";
import CreateGroupModal from "@/pages/user/4_forums/forum_modals/CreateGroupModal.tsx";
import EditPostModal from "@/pages/user/4_forums/forum_modals/EditPostModal.tsx";
import DeletePostModal from "@/pages/user/4_forums/forum_modals/DeletePostModal.tsx";
import { showSuccessToast, showErrorToast } from "@/components/utility/toast";

type ForumTab = "feed" | "groups" | "my-groups" | "my-discussions" | "saved";

type ImageAttachment = {
  id: string;
  file?: File;
  preview: string;
  url?: string;
  uploading?: boolean;
  uploadProgress?: number;
};

type Reply = {
  id: number;
  author: string;
  authorAvatar: string;
  content: string;
  ago: string;
  likes: number;
  images?: ImageAttachment[];
};

type Post = {
  id: number;
  groupId: number;
  author: string;
  authorAvatar?: string;
  title: string;
  content: string;
  excerpt: string;
  likes: number;
  comments: number;
  ago: string;
  date: string;
  replies?: Reply[];
  tag?: string;
  images?: ImageAttachment[];
};

type Group = {
  id: number;
  name: string;
  owner: string;
  ownerId: number;
  members: number;
  memberCount: number;
  joined: boolean;
  gradient: string;
  description?: string;
  visibility: "public" | "private";
  tags: string[];
  posts?: Post[];
};

// Current user ID (simulated - would come from auth)
const CURRENT_USER_ID = 1;
const CURRENT_USER_NAME = "John Paul Mahilom";
const CURRENT_USER_AVATAR = "https://i.pravatar.cc/150?u=john";

// Sample groups data with tags
const initialGroups: Group[] = [
  {
    id: 1,
    name: "Color Grading Society",
    owner: "John Paul Mahilom",
    ownerId: 1,
    members: 20,
    memberCount: 20,
    joined: true,
    gradient: "from-cyan-500 via-blue-500 to-indigo-500",
    description: "A community for color grading enthusiasts and professionals.",
    visibility: "public",
    tags: ["Color Theory", "DaVinci Resolve", "LUTs", "Log Footage", "HDR"],
  },
  {
    id: 2,
    name: "Editing",
    owner: "Sarah Chen",
    ownerId: 2,
    members: 45,
    memberCount: 45,
    joined: true,
    gradient: "from-emerald-500 via-teal-500 to-cyan-500",
    description: "Discuss editing techniques, workflows, and software.",
    visibility: "public",
    tags: ["Premiere Pro", "After Effects", "Workflow", "Transitions", "Plugins"],
  },
  {
    id: 3,
    name: "Assets",
    owner: "Marcus Thompson",
    ownerId: 3,
    members: 32,
    memberCount: 32,
    joined: false,
    gradient: "from-purple-500 via-pink-500 to-rose-500",
    description: "Share and discover creative assets, templates, and resources.",
    visibility: "public",
    tags: ["Stock Footage", "Music", "Sound Effects", "Templates", "LUTs"],
  },
  {
    id: 4,
    name: "Job Postings",
    owner: "Emma Watson",
    ownerId: 4,
    members: 89,
    memberCount: 89,
    joined: false,
    gradient: "from-orange-500 via-amber-500 to-yellow-500",
    description: "Find or post video editing jobs and opportunities.",
    visibility: "public",
    tags: ["Full Time", "Freelance", "Remote", "Internship", "Contract"],
  },
  {
    id: 5,
    name: "Services",
    owner: "Jodelic Pablo",
    ownerId: 5,
    members: 28,
    memberCount: 28,
    joined: false,
    gradient: "from-indigo-500 via-blue-500 to-sky-500",
    description: "Offer or request video editing services.",
    visibility: "public",
    tags: ["Editing", "Color Grading", "VFX", "Sound Design", "Motion Graphics"],
  },
];

// Sample posts organized by group
const initialPosts: Post[] = [
  {
    id: 1,
    groupId: 1,
    author: "Forbes Talinging",
    authorAvatar: "https://i.pravatar.cc/150?u=forbes",
    title: "Best Practices for color grading log footage?",
    content: "I am working with S-Log3 footage and looking for advice on the best workflow for color grading. What is your process?",
    excerpt: "I am working with S-Log3 footage and looking for advice on the best workflow for color grading...",
    likes: 12,
    comments: 8,
    ago: "45 min ago",
    date: "2024-01-15T10:30:00",
    tag: "Log Footage",
    replies: [
      {
        id: 1,
        author: "Sarah Chen",
        authorAvatar: "https://i.pravatar.cc/150?u=sarah",
        content: "Great question! I usually start with a color space transform to get from S-Log3 to Rec.709, then do my primary corrections before moving to secondary.",
        ago: "30 min ago",
        likes: 8,
      },
      {
        id: 2,
        author: "Marcus Thompson",
        authorAvatar: "https://i.pravatar.cc/150?u=marcus",
        content: "I recommend using DaVinci Wide Gamut as your working space. It gives you more flexibility in grading.",
        ago: "15 min ago",
        likes: 5,
      },
    ],
    images: [
      {
        id: "img1",
        preview: "https://picsum.photos/id/101/400/300",
      },
      {
        id: "img2",
        preview: "https://picsum.photos/id/102/400/300",
      },
    ],
  },
  {
    id: 2,
    groupId: 1,
    author: CURRENT_USER_NAME,
    authorAvatar: CURRENT_USER_AVATAR,
    title: "Dealing with difficult clients - advice needed",
    content: "Client keeps asking for revisions beyond what is in the contract. How do you handle this professionally?",
    excerpt: "Client keeps asking for revisions beyond what is in the contract. How do you handle this professionally?",
    likes: 24,
    comments: 15,
    ago: "2 hours ago",
    date: "2024-01-14T15:20:00",
    tag: "Color Theory",
    replies: [
      {
        id: 3,
        author: "Emma Watson",
        authorAvatar: "https://i.pravatar.cc/150?u=emma",
        content: "Always get everything in writing! Make sure your contract clearly states the number of revisions included.",
        ago: "1 hour ago",
        likes: 12,
      },
    ],
    images: [
      {
        id: "img3",
        preview: "https://picsum.photos/id/104/400/300",
      },
    ],
  },
  {
    id: 3,
    groupId: 2,
    author: "Sarah Chen",
    authorAvatar: "https://i.pravatar.cc/150?u=sarah",
    title: "Best plugins for After Effects in 2024?",
    content: "Looking for recommendations on must-have plugins for motion graphics and VFX work.",
    excerpt: "Looking for recommendations on must-have plugins for motion graphics and VFX work.",
    likes: 45,
    comments: 23,
    ago: "5 hours ago",
    date: "2024-01-14T09:15:00",
    tag: "Plugins",
    replies: [
      {
        id: 4,
        author: "Jodelic Pablo",
        authorAvatar: "https://i.pravatar.cc/150?u=jodelic",
        content: "Motion Tools and FX Console are absolute must-haves! Also check out Animation Composer.",
        ago: "3 hours ago",
        likes: 23,
      },
      {
        id: 5,
        author: CURRENT_USER_NAME,
        authorAvatar: CURRENT_USER_AVATAR,
        content: "I'd add Overlord and RubberHose to that list. They save so much time!",
        ago: "2 hours ago",
        likes: 15,
      },
    ],
  },
  {
    id: 4,
    groupId: 2,
    author: "Marcus Thompson",
    authorAvatar: "https://i.pravatar.cc/150?u=marcus",
    title: "DaVinci Resolve vs Premiere Pro - which one do you prefer?",
    content: "Curious about what everyone is using for their main editing suite and why.",
    excerpt: "Curious about what everyone is using for their main editing suite and why.",
    likes: 67,
    comments: 42,
    ago: "1 day ago",
    date: "2024-01-13T18:45:00",
    tag: "Workflow",
  },
  {
    id: 5,
    groupId: 3,
    author: "Emma Watson",
    authorAvatar: "https://i.pravatar.cc/150?u=emma",
    title: "Royalty-free music sources for YouTube content",
    content: "Share your favorite places to get high-quality royalty-free music for videos.",
    excerpt: "Share your favorite places to get high-quality royalty-free music for videos.",
    likes: 34,
    comments: 18,
    ago: "2 days ago",
    date: "2024-01-12T11:00:00",
    tag: "Music",
  },
];

const topContributors = [
  { name: "John Paul Mahilom", score: "120+", avatar: "https://i.pravatar.cc/150?u=john", role: "Expert Editor" },
  { name: "Edmark Tarlinging", score: "95+", avatar: "https://i.pravatar.cc/150?u=edmark", role: "Colorist" },
  { name: "Jodelic Pablo", score: "91+", avatar: "https://i.pravatar.cc/150?u=jodelic", role: "VFX Artist" },
  { name: "Jhoanessa Lacaya", score: "86+", avatar: "https://i.pravatar.cc/150?u=jhoanessa", role: "Sound Designer" },
  { name: "Judith Krisa", score: "75+", avatar: "https://i.pravatar.cc/150?u=judith", role: "Director" },
];

const tabOptions: { key: ForumTab; label: string }[] = [
  { key: "feed", label: "Feed" },
  { key: "groups", label: "All Groups" },
  { key: "my-groups", label: "My Groups" },
  { key: "my-discussions", label: "My Discussions" },
  { key: "saved", label: "Saved" },
];

const sortOptions = [
  { value: "latest", label: "Latest", icon: <Clock className="h-3 w-3" /> },
  { value: "most-liked", label: "Most Liked", icon: <ThumbsUp className="h-3 w-3" /> },
  { value: "most-commented", label: "Most Commented", icon: <MessageCircle className="h-3 w-3" /> },
];

// Helper: Render markdown content
const renderMarkdownContent = (content: string) => {
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

// Image Gallery Component
const ImageGallery = ({ images }: { images?: ImageAttachment[] }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!images || images.length === 0) return null;

  return (
    <>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {images.map((image, idx) => (
          <button
            key={image.id || idx}
            onClick={() => setSelectedImage(image.preview)}
            className="group relative overflow-hidden rounded-lg border border-white/10 bg-white/5 transition-all hover:scale-105 hover:border-white/20"
          >
            <img
              src={image.preview}
              alt={`Post image ${idx + 1}`}
              className="h-32 w-full object-cover transition-all group-hover:scale-110"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
              <ImageIcon className="h-6 w-6 text-white" />
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={selectedImage}
            alt="Full size"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

// Reply Input Component with Image Upload
const ReplyInput = ({
  // postId,
  replyText,
  updateReplyText,
  handleReply,
  uploadImages,
  images,
  removeImage,
  isUploading
}: {
  postId: number;
  replyText: string;
  updateReplyText: (text: string) => void;
  handleReply: () => void;
  uploadImages: (files: FileList | null) => void;
  images: ImageAttachment[];
  removeImage: (imageId: string) => void;
  isUploading: boolean;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyFormatting = (format: string, value?: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = replyText.substring(start, end);
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

    const newContent = replyText.substring(0, start) + formattedText + replyText.substring(end);
    updateReplyText(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos + (selectedText?.length || 0));
    }, 0);
  };

  const renderMarkdownPreview = () => {
    let html = replyText
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-zinc-300">$1</em>')
      .replace(/`(.*?)`/g, '<code class="rounded bg-black/50 px-1 py-0.5 text-xs text-green-400">$1</code>')
      .replace(/^- (.*?)$/gm, '<li class="ml-4 text-zinc-300">$1</li>')
      .replace(/^\d+\. (.*?)$/gm, '<li class="ml-4 text-zinc-300 list-decimal">$1</li>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-blue-400 hover:underline" target="_blank">$1</a>')
      .replace(/\n/g, '<br />');

    html = html.replace(/(<li[^>]*>.*?<\/li>\n?)+/gs, '<ul class="my-2 space-y-1">$&</ul>');
    return html;
  };

  return (
    <div className="mt-4">
      <div className="flex gap-3">
        <img
          src={CURRENT_USER_AVATAR}
          alt="You"
          className="h-8 w-8 rounded-full object-cover ring-2 ring-white/20 flex-shrink-0"
        />
        <div className="flex-1">
          {/* Rich Text Toolbar for Reply */}
          <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-white/15 border-b-0 bg-white/5 px-2 py-1">
            <button
              type="button"
              onClick={() => applyFormatting("bold")}
              className="rounded p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white"
              title="Bold"
            >
              <strong className="text-xs">B</strong>
            </button>
            <button
              type="button"
              onClick={() => applyFormatting("italic")}
              className="rounded p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white"
              title="Italic"
            >
              <em className="text-xs">I</em>
            </button>
            <button
              type="button"
              onClick={() => applyFormatting("bullet-list")}
              className="rounded p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white"
              title="Bullet List"
            >
              <span className="text-xs">•</span>
            </button>
            <button
              type="button"
              onClick={() => applyFormatting("code")}
              className="rounded p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white"
              title="Code"
            >
              <span className="text-xs">{'<>'}</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white"
              title="Upload Image"
            >
              <ImageIcon className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="rounded p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white ml-auto"
              title={showPreview ? "Edit" : "Preview"}
            >
              {showPreview ? <Edit2 className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </button>
          </div>

          {/* Reply Input or Preview */}
          {!showPreview ? (
            <textarea
              ref={textareaRef}
              value={replyText}
              onChange={(e) => updateReplyText(e.target.value)}
              placeholder="Write a reply... (Supports **bold**, *italic*, `code`, and images)"
              className="w-full rounded-b-lg border border-white/15 border-t-0 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none"
              rows={3}
            />
          ) : (
            <div className="min-h-[80px] rounded-b-lg border border-white/15 border-t-0 bg-white/5 p-3">
              {replyText.trim() ? (
                <div
                  className="text-sm text-zinc-400 prose prose-invert prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderMarkdownPreview() }}
                />
              ) : (
                <p className="text-sm text-zinc-500 italic">Nothing to preview...</p>
              )}
            </div>
          )}

          {/* Image Previews for Reply */}
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {images.map((image) => (
                <div key={image.id} className="group relative">
                  <img
                    src={image.preview}
                    alt="Upload preview"
                    className="h-16 w-16 rounded-lg object-cover border border-white/10"
                  />
                  {image.uploading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/70">
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                    </div>
                  )}
                  <button
                    onClick={() => removeImage(image.id)}
                    className="absolute -top-1 -right-1 rounded-full bg-red-500 p-0.5 text-white opacity-0 transition group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-zinc-400 transition hover:bg-white/10 hover:text-white"
            >
              <ImageIcon className="h-3 w-3" />
              Add Image
            </button>
            <button
              onClick={handleReply}
              disabled={!replyText.trim() && images.length === 0 || isUploading}
              className="flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
              Post Reply
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => uploadImages(e.target.files)}
          />
        </div>
      </div>
    </div>
  );
};

// Skeleton Components
const SidebarSkeleton = () => (
  <div className="space-y-4">
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="mb-2 h-5 w-24 animate-pulse rounded bg-white/10" />
      <div className="mb-3 h-3 w-32 animate-pulse rounded bg-white/5" />
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-7 w-16 animate-pulse rounded-full bg-white/10" />
        ))}
      </div>
    </div>
  </div>
);

const TopContributorsSkeleton = () => (
  <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-4 backdrop-blur-sm">
    <div className="mb-2 h-5 w-28 animate-pulse rounded bg-white/10" />
    <div className="mb-3 h-3 w-40 animate-pulse rounded bg-white/5" />
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
          <div className="flex-1">
            <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
            <div className="mt-1 h-3 w-16 animate-pulse rounded bg-white/5" />
          </div>
          <div className="text-right">
            <div className="h-4 w-12 animate-pulse rounded bg-white/10" />
            <div className="mt-1 h-3 w-10 animate-pulse rounded bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const PostCardSkeleton = () => (
  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
    <div className="flex gap-3">
      <div className="h-10 w-10 animate-pulse rounded-full bg-white/10" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
          <div className="h-3 w-20 animate-pulse rounded bg-white/5" />
        </div>
        <div className="mt-2 h-5 w-3/4 animate-pulse rounded bg-white/10" />
        <div className="mt-2 space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-white/5" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-white/5" />
        </div>
        <div className="mt-3 flex gap-4">
          <div className="h-6 w-16 animate-pulse rounded-full bg-white/10" />
          <div className="h-4 w-20 animate-pulse rounded bg-white/5" />
          <div className="h-4 w-16 animate-pulse rounded bg-white/5" />
          <div className="h-4 w-12 animate-pulse rounded bg-white/5" />
        </div>
      </div>
    </div>
  </div>
);

const Forums = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ForumTab>("feed");
  const [isFilterVisible, setIsFilterVisible] = useState(true);
  const [isTopContributorsVisible, setIsTopContributorsVisible] = useState(true);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState("latest");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedPostId, setExpandedPostId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState<{ [key: number]: string }>({});
  const navigate = useNavigate();

  // Modal states
  const [isNewDiscussionOpen, setIsNewDiscussionOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  // Post menu states
  const [postMenuOpen, setPostMenuOpen] = useState<number | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [deletingPost, setDeletingPost] = useState<Post | null>(null);
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());

  // Reply images states
  const [replyImages, setReplyImages] = useState<{ [key: number]: ImageAttachment[] }>({});
  const [replyUploading, setReplyUploading] = useState<{ [key: number]: boolean }>({});

  // Data states
  const [groupsList, setGroupsList] = useState<Group[]>(initialGroups);
  const [postsList, setPostsList] = useState<Post[]>(initialPosts);

  // Get user's joined groups
  const joinedGroups = useMemo(() => {
    return groupsList.filter(group => group.joined);
  }, [groupsList]);

  // Get available groups for filter (only joined groups for feed filtering)
  const availableFilterGroups = useMemo(() => {
    return joinedGroups;
  }, [joinedGroups]);

  // Initialize selected groups to all joined groups on mount
  useEffect(() => {
    if (joinedGroups.length > 0 && selectedGroupIds.length === 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedGroupIds(joinedGroups.map(g => g.id));
    }
  }, [joinedGroups]);

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Filter and sort posts for feed
  const visiblePosts = useMemo(() => {
    let filtered: Post[] = [];

    if (activeTab === "feed") {
      // Only show posts from joined groups that are selected in filters
      filtered = postsList.filter(post =>
        selectedGroupIds.includes(post.groupId) &&
        groupsList.find(g => g.id === post.groupId)?.joined === true
      );
    } else if (activeTab === "my-discussions") {
      // Show posts created by current user
      filtered = postsList.filter(post => post.author === CURRENT_USER_NAME);
    } else if (activeTab === "saved") {
      // TODO: Implement saved posts functionality
      filtered = postsList.slice(0, 2);
    } else {
      filtered = [];
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.author.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    if (sortBy === "latest") {
      filtered = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (sortBy === "most-liked") {
      filtered = [...filtered].sort((a, b) => b.likes - a.likes);
    } else if (sortBy === "most-commented") {
      filtered = [...filtered].sort((a, b) => b.comments - a.comments);
    }

    return filtered;
  }, [activeTab, selectedGroupIds, sortBy, searchQuery, postsList, groupsList]);

  const visibleGroups = useMemo(() => {
    if (activeTab === "my-groups") {
      return groupsList.filter((group) => group.joined);
    }
    return groupsList;
  }, [activeTab, groupsList]);

  const actionLabel = activeTab === "groups" || activeTab === "my-groups" ? "Create a Group" : "New Discussion";

  const toggleGroupFilter = (groupId: number) => {
    setSelectedGroupIds(prev => {
      if (prev.includes(groupId)) {
        return prev.filter(id => id !== groupId);
      } else {
        return [...prev, groupId];
      }
    });
  };

  const selectAllGroups = () => {
    setSelectedGroupIds(joinedGroups.map(g => g.id));
  };

  const clearAllGroups = () => {
    setSelectedGroupIds([]);
  };

  const activeFiltersCount = (selectedGroupIds.length !== joinedGroups.length ? 1 : 0) + (sortBy !== "latest" ? 1 : 0);

  const toggleExpand = (postId: number) => {
    setExpandedPostId(expandedPostId === postId ? null : postId);
  };

  const handleReplyImageUpload = async (postId: number, files: FileList | null) => {
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

    setReplyImages(prev => ({
      ...prev,
      [postId]: [...(prev[postId] || []), ...newImages]
    }));
    setReplyUploading(prev => ({ ...prev, [postId]: true }));

    // Simulate upload
    for (const image of newImages) {
      await new Promise(resolve => setTimeout(resolve, 500));
      setReplyImages(prev => ({
        ...prev,
        [postId]: prev[postId].map(img =>
          img.id === image.id ? { ...img, uploading: false, url: img.preview } : img
        )
      }));
    }
    setReplyUploading(prev => ({ ...prev, [postId]: false }));
  };

  const removeReplyImage = (postId: number, imageId: string) => {
    const image = replyImages[postId]?.find(img => img.id === imageId);
    if (image && image.preview.startsWith('blob:')) {
      URL.revokeObjectURL(image.preview);
    }
    setReplyImages(prev => ({
      ...prev,
      [postId]: prev[postId]?.filter(img => img.id !== imageId) || []
    }));
  };

  const handleReply = (postId: number) => {
    const replyContent = replyText[postId]?.trim();
    const replyImageList = replyImages[postId] || [];

    if (!replyContent && replyImageList.length === 0) return;

    const updatedPosts = postsList.map(post => {
      if (post.id === postId) {
        const newReply: Reply = {
          id: (post.replies?.length || 0) + 1,
          author: CURRENT_USER_NAME,
          authorAvatar: CURRENT_USER_AVATAR,
          content: replyContent || "",
          ago: "Just now",
          likes: 0,
          images: replyImageList,
        };
        return {
          ...post,
          replies: [...(post.replies || []), newReply],
          comments: (post.comments || 0) + 1,
        };
      }
      return post;
    });

    setPostsList(updatedPosts);
    setReplyText({ ...replyText, [postId]: "" });
    setReplyImages(prev => ({ ...prev, [postId]: [] }));
    showSuccessToast("Reply posted successfully!");
  };

  const updateReplyText = (postId: number, text: string) => {
    setReplyText({ ...replyText, [postId]: text });
  };

  const handleCreatePost = (postData: {
    title: string;
    content: string;
    groupId: number;
    tag: string;
    images?: ImageAttachment[];
  }) => {
    const group = groupsList.find(g => g.id === postData.groupId);
    if (!group) return;

    const newPost: Post = {
      id: postsList.length + 1,
      groupId: postData.groupId,
      author: CURRENT_USER_NAME,
      authorAvatar: CURRENT_USER_AVATAR,
      title: postData.title,
      content: postData.content,
      excerpt: postData.content.substring(0, 150) + (postData.content.length > 150 ? "..." : ""),
      likes: 0,
      comments: 0,
      ago: "Just now",
      date: new Date().toISOString(),
      replies: [],
      tag: postData.tag,
      images: postData.images,
    };

    setPostsList([newPost, ...postsList]);
    showSuccessToast(`"${postData.title}" posted successfully!`);
  };

  const handleCreateGroup = (groupData: {
    name: string;
    description: string;
    tags: string[];
    coverImage?: File | null;
  }) => {
    const newGroup: Group = {
      id: groupsList.length + 1,
      name: groupData.name,
      owner: CURRENT_USER_NAME,
      ownerId: CURRENT_USER_ID,
      members: 1,
      memberCount: 1,
      joined: true,
      gradient: "from-blue-500 via-cyan-500 to-indigo-500",
      description: groupData.description,
      visibility: "public",
      tags: groupData.tags,
    };

    setGroupsList([newGroup, ...groupsList]);
    showSuccessToast(`Group "${groupData.name}" created successfully!`);
  };

  const handleEditPost = (postId: number, updatedData: { title: string; content: string; tag: string; images?: ImageAttachment[] }) => {
    setPostsList(prev => prev.map(post =>
      post.id === postId
        ? {
            ...post,
            title: updatedData.title,
            content: updatedData.content,
            excerpt: updatedData.content.substring(0, 150) + (updatedData.content.length > 150 ? "..." : ""),
            tag: updatedData.tag,
            images: updatedData.images,
          }
        : post
    ));
    showSuccessToast("Post updated successfully!");
  };

  const handleDeletePost = () => {
    if (deletingPost) {
      setPostsList(prev => prev.filter(post => post.id !== deletingPost.id));
      showSuccessToast(`"${deletingPost.title}" has been deleted`);
      setDeletingPost(null);
      if (expandedPostId === deletingPost.id) {
        setExpandedPostId(null);
      }
    }
  };

  const handleLikePost = (postId: number) => {
    setLikedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
        setPostsList(prevPosts =>
          prevPosts.map(post =>
            post.id === postId
              ? { ...post, likes: Math.max(0, post.likes - 1) }
              : post
          )
        );
      } else {
        newSet.add(postId);
        setPostsList(prevPosts =>
          prevPosts.map(post =>
            post.id === postId
              ? { ...post, likes: post.likes + 1 }
              : post
          )
        );
      }
      return newSet;
    });
  };

  const handleActionClick = () => {
    if (activeTab === "groups" || activeTab === "my-groups") {
      setIsCreateGroupOpen(true);
    } else {
      setIsNewDiscussionOpen(true);
    }
  };

  // Show skeleton while loading
  if (loading) {
    return (
      <div className="min-h-screen bg-[#080a12]">
        <UserHeader pageTitle="Forums" credits={1250} />
        <div className="mx-auto max-w-7xl p-6 md:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="h-8 w-48 animate-pulse rounded-lg bg-white/10" />
              <div className="mt-1 h-4 w-64 animate-pulse rounded-lg bg-white/5" />
            </div>
          </div>
          <div className="mb-6 flex justify-end">
            <div className="h-10 w-36 animate-pulse rounded-full bg-white/10" />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
            <div>
              <SidebarSkeleton />
              <div className="mt-4">
                <TopContributorsSkeleton />
              </div>
            </div>
            <div>
              <div className="mb-4 h-10 w-full animate-pulse rounded-full bg-white/5" />
              <div className="mb-4 flex gap-2 border-b border-white/10 pb-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-white/10" />
                ))}
              </div>
              <div className="mb-4 h-4 w-48 animate-pulse rounded bg-white/5" />
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <PostCardSkeleton key={i} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080a12]">
      {/* Top Header */}
      <UserHeader pageTitle="Forums" credits={1250} />

      {/* Main Content */}
      <div className="mx-auto max-w-7xl p-6 md:p-8">

        {/* Header Section */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Community Forums
            </h1>
            <p className="text-sm text-zinc-400" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Connect, discuss, and collaborate with fellow creators
            </p>
          </div>
        </div>

        {/* New Discussion / Create Group Button */}
        <div className="mb-6 flex justify-end">
          <button
            type="button"
            onClick={handleActionClick}
            className="group flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95 active:bg-gradient-to-r active:from-cyan-500 active:via-yellow-500 active:to-purple-600 active:text-white"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            <PlusCircle className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
            {actionLabel}
          </button>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">

          {/* Left Sidebar */}
          <div>
            {/* Filter Section - Collapsible (only show on Feed tab) */}
            {activeTab === "feed" && (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <button
                    onClick={() => setIsFilterVisible(!isFilterVisible)}
                    className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-zinc-400 transition hover:border-white/30 hover:text-white"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    <Filter className="h-4 w-4" />
                    {isFilterVisible ? "Hide Filters" : "Show Filters"}
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isFilterVisible ? "rotate-180" : ""}`} />
                  </button>

                  {activeFiltersCount > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{activeFiltersCount}</span>
                      <button
                        onClick={() => {
                          selectAllGroups();
                          setSortBy("latest");
                        }}
                        className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                      >
                        <X className="h-3 w-3" />
                        Clear all
                      </button>
                    </div>
                  )}
                </div>

                {isFilterVisible && (
                  <div className="space-y-4 animate-slide-in">
                    {/* Groups Filter Section */}
                    <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-4 backdrop-blur-sm">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          My Groups
                        </h3>
                        <div className="flex gap-2">
                          <button
                            onClick={selectAllGroups}
                            className="text-[10px] text-blue-400 hover:text-blue-300"
                          >
                            Select All
                          </button>
                          <button
                            onClick={clearAllGroups}
                            className="text-[10px] text-red-400 hover:text-red-300"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      <p className="mb-3 text-[11px] text-zinc-500" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        Show posts from selected groups
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {availableFilterGroups.map((group) => (
                          <button
                            key={group.id}
                            onClick={() => toggleGroupFilter(group.id)}
                            className={`rounded-full px-3 py-1 text-xs transition-all duration-200 ${
                              selectedGroupIds.includes(group.id)
                                ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                                : "border border-white/15 bg-white/5 text-zinc-400 hover:border-white/30 hover:text-white"
                            }`}
                            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                          >
                            {group.name}
                          </button>
                        ))}
                        {availableFilterGroups.length === 0 && (
                          <p className="text-xs text-zinc-500">
                            You haven't joined any groups yet. Browse groups and join to see posts here!
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Sort By Section */}
                    <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-4 backdrop-blur-sm">
                      <h3 className="text-sm font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        Sort By
                      </h3>
                      <p className="mb-3 text-[11px] text-zinc-500" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        Order discussions
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {sortOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => setSortBy(option.value)}
                            className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs transition-all duration-200 ${
                              sortBy === option.value
                                ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                                : "border border-white/15 bg-white/5 text-zinc-400 hover:border-white/30 hover:text-white"
                            }`}
                            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                          >
                            {option.icon}
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Top Contributors Section - Collapsible */}
            <div className="mt-4">
              <button
                onClick={() => setIsTopContributorsVisible(!isTopContributorsVisible)}
                className="mb-2 flex w-full items-center justify-between rounded-lg px-2 py-1 text-left text-sm font-medium text-zinc-400 transition hover:text-white"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                <span>Top Contributors</span>
                <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${isTopContributorsVisible ? "rotate-90" : ""}`} />
              </button>

              {isTopContributorsVisible && (
                <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-4 backdrop-blur-sm animate-slide-in">
                  <p className="mb-3 text-[11px] text-zinc-500" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Leaderboard of Reputation
                  </p>
                  <ul className="space-y-3">
                    {topContributors.map((contributor, idx) => (
                      <li key={contributor.name} className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={contributor.avatar}
                            alt={contributor.name}
                            className="h-8 w-8 rounded-full object-cover ring-2 ring-white/20"
                          />
                          <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 text-[9px] font-bold text-black">
                            {idx + 1}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            {contributor.name}
                          </p>
                          <p className="text-[10px] text-zinc-500">{contributor.role}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-emerald-400">{contributor.score}</p>
                          <p className="text-[9px] text-zinc-500">points</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Right Content */}
          <div>
            {/* Search Bar */}
            <div className="mb-4 flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5">
              <Search className="h-4 w-4 text-zinc-500" />
              <input
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                placeholder="Search discussions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Tabs Bar */}
            <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
              {tabOptions.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                    activeTab === tab.key
                      ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                      : "border border-white/15 bg-white/5 text-zinc-400 hover:border-white/30 hover:text-white"
                  }`}
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Groups View */}
            {(activeTab === "groups" || activeTab === "my-groups") && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visibleGroups.map((group) => (
                  <div
                    key={group.id}
                    onClick={() => navigate(`/forums/group/${group.id}`)}
                    className="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent transition-all duration-300 hover:border-white/20 hover:bg-white/10 hover:scale-[1.02] cursor-pointer"
                  >
                    <div className={`h-24 bg-gradient-to-r ${group.gradient}`} />
                    <div className="p-4">
                      <p className="text-xs text-zinc-500" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        By {group.owner}
                      </p>
                      <h3 className="mt-1 text-sm font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {group.name}
                      </h3>
                      {group.description && (
                        <p className="mt-1 text-xs text-zinc-400 line-clamp-2">
                          {group.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <Users className="h-3 w-3 text-zinc-500" />
                        <p className="text-xs text-zinc-500" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {group.members} members
                        </p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1">
                        {group.tags?.slice(0, 3).map((tag) => (
                          <span key={tag} className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[9px] text-blue-400">
                            {tag}
                          </span>
                        ))}
                        {group.tags?.length > 3 && (
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] text-zinc-400">
                            +{group.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Posts View - Feed */}
            {activeTab === "feed" && (
              <div className="space-y-4">
                {selectedGroupIds.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 p-12 text-center">
                    <Users className="mb-3 h-8 w-8 text-zinc-500" />
                    <h3 className="text-lg font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      No groups selected
                    </h3>
                    <p className="mt-1 text-sm text-zinc-400" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      Select at least one group from the filters to see posts
                    </p>
                    <button
                      onClick={selectAllGroups}
                      className="mt-4 rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
                    >
                      Select All My Groups
                    </button>
                  </div>
                ) : visiblePosts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 p-12 text-center">
                    <MessageCircle className="mb-3 h-8 w-8 text-zinc-500" />
                    <h3 className="text-lg font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      No posts yet
                    </h3>
                    <p className="mt-1 text-sm text-zinc-400" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      Be the first to start a discussion in your groups!
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-zinc-500" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      Showing {visiblePosts.length} discussions from your joined groups
                    </p>

                    {visiblePosts.map((post) => {
                      const group = groupsList.find(g => g.id === post.groupId);
                      const isAuthor = post.author === CURRENT_USER_NAME;
                      const isLiked = likedPosts.has(post.id);

                      return (
                        <div key={post.id} className="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent transition-all duration-300 hover:border-white/20 hover:bg-white/10">
                          <div className="p-4">
                            <div className="mb-3 flex items-start gap-3">
                              <img
                                src={post.authorAvatar}
                                alt={post.author}
                                className="h-10 w-10 rounded-full object-cover ring-2 ring-white/20"
                              />

                              <div className="flex-1">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-medium text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                      {post.author}
                                    </p>
                                    <span className="text-xs text-zinc-500">{post.ago}</span>
                                    {group && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] text-cyan-400">
                                        {group.name}
                                      </span>
                                    )}
                                    {post.tag && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] text-purple-400">
                                        {post.tag}
                                      </span>
                                    )}
                                  </div>

                                  {/* Three-dot menu for post author */}
                                  {isAuthor && (
                                    <div className="relative">
                                      <button
                                        onClick={() => setPostMenuOpen(postMenuOpen === post.id ? null : post.id)}
                                        className="rounded-lg p-1 text-zinc-500 transition hover:bg-white/10 hover:text-white"
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </button>
                                      {postMenuOpen === post.id && (
                                        <div className="absolute right-0 mt-1 w-36 rounded-lg border border-white/10 bg-[#0d0f1a] shadow-xl overflow-hidden z-20">
                                          <button
                                            onClick={() => {
                                              setEditingPost(post);
                                              setPostMenuOpen(null);
                                            }}
                                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/10"
                                          >
                                            <Edit2 className="h-3.5 w-3.5" />
                                            Edit
                                          </button>
                                          <button
                                            onClick={() => {
                                              setDeletingPost(post);
                                              setPostMenuOpen(null);
                                            }}
                                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10"
                                          >
                                            <TrashIcon className="h-3.5 w-3.5" />
                                            Delete
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <h3
                                  onClick={() => navigate(`/forums/discussion/${post.id}`)}
                                  className="mt-1 text-base font-semibold text-white cursor-pointer hover:text-blue-400 transition-colors"
                                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                                >
                                  {post.title}
                                </h3>

                                {/* Post Content with Markdown */}
                                <div
                                  className="mt-2 text-sm text-zinc-400 prose prose-invert prose-sm max-w-none"
                                  dangerouslySetInnerHTML={{ __html: renderMarkdownContent(post.excerpt) }}
                                />

                                {/* Image Gallery */}
                                <ImageGallery images={post.images} />

                                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                                  <button
                                    onClick={() => toggleExpand(post.id)}
                                    className="inline-flex items-center gap-1 text-zinc-500 transition hover:text-white"
                                    type="button"
                                  >
                                    <MessageCircle className="h-3.5 w-3.5" />
                                    <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                      {post.comments} replies
                                    </span>
                                    {expandedPostId === post.id ? (
                                      <ChevronUp className="h-3.5 w-3.5" />
                                    ) : (
                                      <ChevronDown className="h-3.5 w-3.5" />
                                    )}
                                  </button>

                                  {/* Like button with animation */}
                                  <button
                                    onClick={() => handleLikePost(post.id)}
                                    className={`inline-flex items-center gap-1 transition-all duration-200 ${
                                      isLiked 
                                        ? "text-red-400 hover:text-red-300" 
                                        : "text-zinc-500 hover:text-white"
                                    }`}
                                    type="button"
                                  >
                                    <Heart className={`h-3.5 w-3.5 transition-all ${isLiked ? "fill-red-400" : ""}`} />
                                    <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{post.likes} likes</span>
                                  </button>

                                  <button className="inline-flex items-center gap-1 text-zinc-500 transition hover:text-white" type="button">
                                    <Bookmark className="h-3.5 w-3.5" />
                                    <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Save</span>
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Expanded Replies Section */}
                            {expandedPostId === post.id && (
                              <div className="mt-4 border-t border-white/10 pt-4 animate-fade-in">
                                <div className="space-y-4">
                                  {post.replies && post.replies.length > 0 ? (
                                    post.replies.map((reply) => (
                                      <div key={reply.id} className="flex gap-3">
                                        <img
                                          src={reply.authorAvatar}
                                          alt={reply.author}
                                          className="h-8 w-8 rounded-full object-cover ring-2 ring-white/20"
                                        />
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-medium text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                              {reply.author}
                                            </p>
                                            <span className="text-xs text-zinc-500">{reply.ago}</span>
                                          </div>
                                          <div
                                            className="mt-1 text-sm text-zinc-400 prose prose-invert prose-sm max-w-none"
                                            dangerouslySetInnerHTML={{ __html: renderMarkdownContent(reply.content) }}
                                          />
                                          <ImageGallery images={reply.images} />
                                          <div className="mt-2 flex items-center gap-3">
                                            <button className="inline-flex items-center gap-1 text-xs text-zinc-500 transition hover:text-white">
                                              <ThumbsUp className="h-3 w-3" />
                                              <span>{reply.likes}</span>
                                            </button>
                                            <button className="inline-flex items-center gap-1 text-xs text-zinc-500 transition hover:text-white">
                                              <MessageCircle className="h-3 w-3" />
                                              <span>Reply</span>
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-sm text-zinc-500 text-center py-4">
                                      No replies yet. Be the first to reply!
                                    </p>
                                  )}
                                </div>

                                {/* Reply Input Component */}
                                <ReplyInput
                                  postId={post.id}
                                  replyText={replyText[post.id] || ""}
                                  updateReplyText={(text) => updateReplyText(post.id, text)}
                                  handleReply={() => handleReply(post.id)}
                                  uploadImages={(files) => handleReplyImageUpload(post.id, files)}
                                  images={replyImages[post.id] || []}
                                  removeImage={(imageId) => removeReplyImage(post.id, imageId)}
                                  isUploading={replyUploading[post.id] || false}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}

            {/* Posts View - My Discussions */}
            {activeTab === "my-discussions" && (
              <div className="space-y-4">
                {visiblePosts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 p-12 text-center">
                    <MessageCircle className="mb-3 h-8 w-8 text-zinc-500" />
                    <h3 className="text-lg font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      No discussions yet
                    </h3>
                    <p className="mt-1 text-sm text-zinc-400" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      Start a new discussion in one of your groups!
                    </p>
                    <button
                      onClick={() => setIsNewDiscussionOpen(true)}
                      className="mt-4 rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
                    >
                      Create Discussion
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-zinc-500" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      Showing {visiblePosts.length} discussions created by you
                    </p>

                    {visiblePosts.map((post) => {
                      const group = groupsList.find(g => g.id === post.groupId);
                      const isAuthor = post.author === CURRENT_USER_NAME;
                      const isLiked = likedPosts.has(post.id);

                      return (
                        <div key={post.id} className="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent transition-all duration-300 hover:border-white/20 hover:bg-white/10">
                          <div className="p-4">
                            <div className="mb-3 flex items-start gap-3">
                              <img
                                src={post.authorAvatar}
                                alt={post.author}
                                className="h-10 w-10 rounded-full object-cover ring-2 ring-white/20"
                              />

                              <div className="flex-1">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-medium text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                      {post.author}
                                    </p>
                                    <span className="text-xs text-zinc-500">{post.ago}</span>
                                    {group && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] text-cyan-400">
                                        {group.name}
                                      </span>
                                    )}
                                    {post.tag && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] text-purple-400">
                                        {post.tag}
                                      </span>
                                    )}
                                  </div>

                                  {/* Three-dot menu for post author */}
                                  {isAuthor && (
                                    <div className="relative">
                                      <button
                                        onClick={() => setPostMenuOpen(postMenuOpen === post.id ? null : post.id)}
                                        className="rounded-lg p-1 text-zinc-500 transition hover:bg-white/10 hover:text-white"
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </button>
                                      {postMenuOpen === post.id && (
                                        <div className="absolute right-0 mt-1 w-36 rounded-lg border border-white/10 bg-[#0d0f1a] shadow-xl overflow-hidden z-20">
                                          <button
                                            onClick={() => {
                                              setEditingPost(post);
                                              setPostMenuOpen(null);
                                            }}
                                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/10"
                                          >
                                            <Edit2 className="h-3.5 w-3.5" />
                                            Edit
                                          </button>
                                          <button
                                            onClick={() => {
                                              setDeletingPost(post);
                                              setPostMenuOpen(null);
                                            }}
                                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10"
                                          >
                                            <TrashIcon className="h-3.5 w-3.5" />
                                            Delete
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <h3 className="mt-1 text-base font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                  {post.title}
                                </h3>

                                {/* Post Content with Markdown */}
                                <div
                                  className="mt-2 text-sm text-zinc-400 prose prose-invert prose-sm max-w-none"
                                  dangerouslySetInnerHTML={{ __html: renderMarkdownContent(post.excerpt) }}
                                />

                                {/* Image Gallery */}
                                <ImageGallery images={post.images} />

                                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                                  <button
                                    onClick={() => toggleExpand(post.id)}
                                    className="inline-flex items-center gap-1 text-zinc-500 transition hover:text-white"
                                    type="button"
                                  >
                                    <MessageCircle className="h-3.5 w-3.5" />
                                    <span>{post.comments} replies</span>
                                    {expandedPostId === post.id ? (
                                      <ChevronUp className="h-3.5 w-3.5" />
                                    ) : (
                                      <ChevronDown className="h-3.5 w-3.5" />
                                    )}
                                  </button>

                                  {/* Like button */}
                                  <button
                                    onClick={() => handleLikePost(post.id)}
                                    className={`inline-flex items-center gap-1 transition-all duration-200 ${
                                      isLiked 
                                        ? "text-red-400 hover:text-red-300" 
                                        : "text-zinc-500 hover:text-white"
                                    }`}
                                    type="button"
                                  >
                                    <Heart className={`h-3.5 w-3.5 transition-all ${isLiked ? "fill-red-400" : ""}`} />
                                    <span>{post.likes} likes</span>
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Expanded Replies Section */}
                            {expandedPostId === post.id && (
                              <div className="mt-4 border-t border-white/10 pt-4 animate-fade-in">
                                <div className="space-y-4">
                                  {post.replies && post.replies.length > 0 ? (
                                    post.replies.map((reply) => (
                                      <div key={reply.id} className="flex gap-3">
                                        <img
                                          src={reply.authorAvatar}
                                          alt={reply.author}
                                          className="h-8 w-8 rounded-full object-cover ring-2 ring-white/20"
                                        />
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-white">{reply.author}</p>
                                          <div
                                            className="mt-1 text-sm text-zinc-400 prose prose-invert prose-sm max-w-none"
                                            dangerouslySetInnerHTML={{ __html: renderMarkdownContent(reply.content) }}
                                          />
                                          <ImageGallery images={reply.images} />
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-sm text-zinc-500 text-center py-4">No replies yet.</p>
                                  )}
                                </div>

                                {/* Reply Input Component */}
                                <ReplyInput
                                  postId={post.id}
                                  replyText={replyText[post.id] || ""}
                                  updateReplyText={(text) => updateReplyText(post.id, text)}
                                  handleReply={() => handleReply(post.id)}
                                  uploadImages={(files) => handleReplyImageUpload(post.id, files)}
                                  images={replyImages[post.id] || []}
                                  removeImage={(imageId) => removeReplyImage(post.id, imageId)}
                                  isUploading={replyUploading[post.id] || false}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}

            {/* Saved View - Placeholder */}
            {activeTab === "saved" && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 p-12 text-center">
                <Bookmark className="mb-3 h-8 w-8 text-zinc-500" />
                <h3 className="text-lg font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Saved Discussions
                </h3>
                <p className="mt-1 text-sm text-zinc-400" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Bookmark discussions to see them here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <NewDiscussionModal
        isOpen={isNewDiscussionOpen}
        onClose={() => setIsNewDiscussionOpen(false)}
        onCreatePost={handleCreatePost}
        availableGroups={joinedGroups}
      />

      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onCreateGroup={handleCreateGroup}
      />

      {/* Edit Post Modal */}
      <EditPostModal
        isOpen={!!editingPost}
        onClose={() => setEditingPost(null)}
        onSave={handleEditPost}
        post={editingPost}
      />

      {/* Delete Post Modal */}
      <DeletePostModal
        isOpen={!!deletingPost}
        onClose={() => setDeletingPost(null)}
        onConfirm={handleDeletePost}
        postTitle={deletingPost?.title || ""}
      />

      <style>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Forums;