// src/pages/user/4_forums/SelectedGroup.tsx
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Users,
  MessageCircle,
  Bookmark,
  ThumbsUp,
  Search,
  ChevronDown,
  Clock,
  ChevronUp,
  Send,
  PlusCircle,
  ArrowLeft,
  Calendar,
  Tag,
  MoreVertical,
  Edit3,
  Flag,
  LogOut,
  Filter,
  X,
  Trash2,
  Shield,
  UserMinus,
  Image as ImageIcon,
  Heart,
  Edit2,
  Trash2 as TrashIcon,
  Eye,
  Loader2,
} from "lucide-react";
import UserHeader from "@/components/nav/user_header";
import NewDiscussionModal from "@/pages/user/4_forums/forum_modals/NewDiscussionModal";
import EditGroupModal from "@/pages/user/4_forums/forum_modals/EditGroupModal";
import ReportGroupModal from "@/pages/user/4_forums/forum_modals/ReportGroupModal.tsx";
import LeaveGroupModal from "@/pages/user/4_forums/forum_modals/LeaveGroupModal.tsx";
import DeleteGroupModal from "@/pages/user/4_forums/forum_modals/DeleteGroupModal.tsx";
import EditGroupPermissionsModal from "@/pages/user/4_forums/forum_modals/EditGroupPermissionsModal.tsx";
import ReportMemberModal from "@/pages/user/4_forums/forum_modals/ReportMemberModal.tsx";
import RemoveMemberModal from "@/pages/user/4_forums/forum_modals/RemoveMemberModal.tsx";
import EditPostModal from "@/pages/user/4_forums/forum_modals/EditPostModal.tsx";
import DeletePostModal from "@/pages/user/4_forums/forum_modals/DeletePostModal.tsx";
import { showSuccessToast, showErrorToast } from "@/components/utility/toast";

type Tab = "posts" | "members" | "about";

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
  tag?: string;
  replies?: Reply[];
  images?: ImageAttachment[];
};

type Member = {
  id: number;
  name: string;
  avatar: string;
  role: "owner" | "moderator" | "member";
  joinedAt: string;
  permissions?: string[];
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
  createdAt: string;
  userRole?: string;
  userPermissions?: string[];
};

// Current user ID (simulated)
const CURRENT_USER_ID = 1;
const CURRENT_USER_NAME = "John Paul Mahilom";
const CURRENT_USER_AVATAR = "https://i.pravatar.cc/150?u=john";

// Sample members data with permissions
const sampleMembers: Member[] = [
  {
    id: 1,
    name: "John Paul Mahilom",
    avatar: "https://i.pravatar.cc/150?u=john",
    role: "owner",
    joinedAt: "2024-01-01",
    permissions: ["edit_group", "edit_permissions", "remove_member"],
  },
  {
    id: 2,
    name: "Sarah Chen",
    avatar: "https://i.pravatar.cc/150?u=sarah",
    role: "moderator",
    joinedAt: "2024-01-05",
    permissions: ["remove_member"],
  },
  {
    id: 3,
    name: "Marcus Thompson",
    avatar: "https://i.pravatar.cc/150?u=marcus",
    role: "member",
    joinedAt: "2024-01-10",
    permissions: [],
  },
  {
    id: 4,
    name: "Emma Watson",
    avatar: "https://i.pravatar.cc/150?u=emma",
    role: "member",
    joinedAt: "2024-01-15",
    permissions: [],
  },
  {
    id: 5,
    name: "Jodelic Pablo",
    avatar: "https://i.pravatar.cc/150?u=jodelic",
    role: "member",
    joinedAt: "2024-01-20",
    permissions: [],
  },
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
  postId,
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

const SelectedGroup = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("posts");
  const [group, setGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [members, setMembers] = useState<Member[]>(sampleMembers);
  const [loading, setLoading] = useState(true);
  const [expandedPostId, setExpandedPostId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState<{ [key: number]: string }>({});
  const [isNewDiscussionOpen, setIsNewDiscussionOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("latest");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Menu and Modal states
  const [showMenu, setShowMenu] = useState(false);
  const [showMemberMenu, setShowMemberMenu] = useState<number | null>(null);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [showEditPermissionsModal, setShowEditPermissionsModal] = useState(false);
  const [showReportGroupModal, setShowReportGroupModal] = useState(false);
  const [showLeaveGroupModal, setShowLeaveGroupModal] = useState(false);
  const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(false);
  const [showReportMemberModal, setShowReportMemberModal] = useState(false);
  const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Post edit/delete states
  const [postMenuOpen, setPostMenuOpen] = useState<number | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [deletingPost, setDeletingPost] = useState<Post | null>(null);
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());

  // Reply images states
  const [replyImages, setReplyImages] = useState<{ [key: number]: ImageAttachment[] }>({});
  const [replyUploading, setReplyUploading] = useState<{ [key: number]: boolean }>({});

  // Get unique categories from posts
  const categories = ["All", ...new Set(posts.map(post => post.tag).filter(Boolean))];

  // Filter posts by category
  const filteredByCategory = selectedCategory === "All"
    ? posts
    : posts.filter(post => post.tag === selectedCategory);

  const filteredPosts = filteredByCategory.filter(post =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (sortBy === "latest") {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    } else if (sortBy === "most-liked") {
      return b.likes - a.likes;
    } else if (sortBy === "most-commented") {
      return b.comments - a.comments;
    }
    return 0;
  });

  // Fetch group data
  useEffect(() => {
    const fetchGroup = async () => {
      setLoading(true);
      // Mock data - replace with actual API call
      const mockGroup: Group = {
        id: Number(id),
        name: "Color Grading Society",
        owner: "John Paul Mahilom",
        ownerId: 1,
        members: 20,
        memberCount: 20,
        joined: true,
        gradient: "from-cyan-500 via-blue-500 to-indigo-500",
        description: "A community for color grading enthusiasts and professionals. Share your work, ask questions, and learn from the best in the industry.",
        visibility: "public",
        tags: ["Color Theory", "DaVinci Resolve", "LUTs", "Log Footage", "HDR"],
        createdAt: "2024-01-01",
        userRole: "owner",
        userPermissions: ["edit_group", "edit_permissions", "remove_member"],
      };

      const mockPosts: Post[] = [
        {
          id: 1,
          groupId: Number(id),
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
              content: "Great question! I usually start with a color space transform to get from S-Log3 to Rec.709...",
              ago: "30 min ago",
              likes: 8,
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
          groupId: Number(id),
          author: CURRENT_USER_NAME,
          authorAvatar: CURRENT_USER_AVATAR,
          title: "Dealing with difficult clients - advice needed",
          content: "Client keeps asking for revisions beyond what is in the contract...",
          excerpt: "Client keeps asking for revisions beyond what is in the contract...",
          likes: 24,
          comments: 15,
          ago: "2 hours ago",
          date: "2024-01-14T15:20:00",
          tag: "Color Theory",
          replies: [],
          images: [
            {
              id: "img3",
              preview: "https://picsum.photos/id/104/400/300",
            },
          ],
        },
      ];

      setGroup(mockGroup);
      setPosts(mockPosts);
      setLoading(false);
    };

    fetchGroup();
  }, [id]);

  const sortOptions = [
    { value: "latest", label: "Latest", icon: <Clock className="h-3 w-3" /> },
    { value: "most-liked", label: "Most Liked", icon: <ThumbsUp className="h-3 w-3" /> },
    { value: "most-commented", label: "Most Commented", icon: <MessageCircle className="h-3 w-3" /> },
  ];

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

    const updatedPosts = posts.map(post => {
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

    setPosts(updatedPosts);
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
    const newPost: Post = {
      id: posts.length + 1,
      groupId: Number(id),
      author: CURRENT_USER_NAME,
      authorAvatar: CURRENT_USER_AVATAR,
      title: postData.title,
      content: postData.content,
      excerpt: postData.content.substring(0, 150) + (postData.content.length > 150 ? "..." : ""),
      likes: 0,
      comments: 0,
      ago: "Just now",
      date: new Date().toISOString(),
      tag: postData.tag,
      replies: [],
      images: postData.images,
    };

    setPosts([newPost, ...posts]);
    showSuccessToast(`"${postData.title}" posted successfully!`);
  };

  const handleEditPost = (postId: number, updatedData: { title: string; content: string; tag: string; images?: ImageAttachment[] }) => {
    setPosts(prev => prev.map(post =>
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
      setPosts(prev => prev.filter(post => post.id !== deletingPost.id));
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
        setPosts(prevPosts =>
          prevPosts.map(post =>
            post.id === postId
              ? { ...post, likes: Math.max(0, post.likes - 1) }
              : post
          )
        );
      } else {
        newSet.add(postId);
        setPosts(prevPosts =>
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

  const handleEditGroup = (updatedData: { name: string; description: string; tags: string[]; gradient: string }) => {
    if (!group) return;
    setGroup({
      ...group,
      name: updatedData.name,
      description: updatedData.description,
      tags: updatedData.tags,
      gradient: updatedData.gradient,
    });
    showSuccessToast(`Group "${updatedData.name}" updated successfully!`);
  };

  const handleEditPermissions = (updatedMembers: Member[]) => {
    setMembers(updatedMembers);
    showSuccessToast("Permissions updated successfully!");
  };

  const handleReportGroup = (reason: string, description: string) => {
    console.log("Reporting group:", { reason, description });
    showSuccessToast("Group reported successfully. Our team will review it.");
  };

  const handleLeaveGroup = () => {
    console.log("Leaving group:", group?.name);
    showSuccessToast(`You have left "${group?.name}"`);
    navigate("/forums");
  };

  const handleDeleteGroup = () => {
    console.log("Deleting group:", group?.name);
    showSuccessToast(`Group "${group?.name}" has been deleted`);
    navigate("/forums");
  };

  const handleReportMember = (reason: string, description: string) => {
    console.log("Reporting member:", selectedMember?.name, { reason, description });
    showSuccessToast(`Report submitted for ${selectedMember?.name}`);
    setSelectedMember(null);
  };

  const handleRemoveMember = () => {
    if (selectedMember && group) {
      setMembers(members.filter(m => m.id !== selectedMember.id));
      setGroup({
        ...group,
        members: group.members - 1,
        memberCount: group.memberCount - 1,
      });
      showSuccessToast(`${selectedMember.name} has been removed from the group`);
      setSelectedMember(null);
    }
  };

  const isOwner = group?.ownerId === CURRENT_USER_ID;
  const canEditGroup = isOwner || group?.userPermissions?.includes("edit_group");
  const canEditPermissions = isOwner || group?.userPermissions?.includes("edit_permissions");
  const canRemoveMembers = isOwner || group?.userPermissions?.includes("remove_member");

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080a12]">
        <UserHeader pageTitle="Group" credits={1250} />
        <div className="mx-auto max-w-7xl p-6 md:p-8">
          <div className="h-48 w-full animate-pulse rounded-xl bg-white/10" />
          <div className="mt-6 h-10 w-48 animate-pulse rounded-lg bg-white/10" />
          <div className="mt-4 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 w-full animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-[#080a12]">
        <UserHeader pageTitle="Group" credits={1250} />
        <div className="mx-auto max-w-7xl p-6 md:p-8 text-center">
          <p className="text-zinc-400">Group not found</p>
          <button
            onClick={() => navigate("/forums")}
            className="mt-4 rounded-full bg-blue-500 px-4 py-2 text-sm text-white"
          >
            Back to Forums
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080a12]">
      <UserHeader pageTitle={group.name} credits={1250} />

      <div className="mx-auto max-w-7xl p-6 md:p-8">
        {/* Back Button and Three Dots Menu Row */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate("/forums")}
            className="flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Forums
          </button>

          {/* Three Dots Menu - Only show for members */}
          {group.joined && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
              >
                <MoreVertical className="h-5 w-5" />
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/10 bg-[#0d0f1a] shadow-2xl backdrop-blur-xl overflow-hidden z-20">
                  <div className="p-2">
                    {canEditGroup && (
                      <button
                        onClick={() => {
                          setShowEditGroupModal(true);
                          setShowMenu(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/10"
                      >
                        <Edit3 className="h-4 w-4" />
                        Edit Group
                      </button>
                    )}
                    {canEditPermissions && (
                      <button
                        onClick={() => {
                          setShowEditPermissionsModal(true);
                          setShowMenu(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/10"
                      >
                        <Shield className="h-4 w-4" />
                        Edit Roles
                      </button>
                    )}
                    {!isOwner && (
                      <button
                        onClick={() => {
                          setShowReportGroupModal(true);
                          setShowMenu(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/10"
                      >
                        <Flag className="h-4 w-4" />
                        Report Group
                      </button>
                    )}
                    {!isOwner && (
                      <button
                        onClick={() => {
                          setShowLeaveGroupModal(true);
                          setShowMenu(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10"
                      >
                        <LogOut className="h-4 w-4" />
                        Leave Group
                      </button>
                    )}
                    {isOwner && (
                      <button
                        onClick={() => {
                          setShowDeleteGroupModal(true);
                          setShowMenu(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Group
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Group Header */}
        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${group.gradient} p-8`}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative z-10">
            <h1 className="text-3xl font-bold text-white">{group.name}</h1>
            <p className="mt-2 text-zinc-200 max-w-2xl">{group.description}</p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-zinc-300">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{group.members} members</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Created {new Date(group.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <Tag className="h-4 w-4" />
                <span>{group.tags.length} categories</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 border-b border-white/10">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab("posts")}
              className={`pb-3 text-sm font-medium transition ${
                activeTab === "posts"
                  ? "border-b-2 border-blue-500 text-blue-400"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Posts
            </button>
            <button
              onClick={() => setActiveTab("members")}
              className={`pb-3 text-sm font-medium transition ${
                activeTab === "members"
                  ? "border-b-2 border-blue-500 text-blue-400"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Members
            </button>
            <button
              onClick={() => setActiveTab("about")}
              className={`pb-3 text-sm font-medium transition ${
                activeTab === "about"
                  ? "border-b-2 border-blue-500 text-blue-400"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              About
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {/* Posts Tab */}
          {activeTab === "posts" && (
            <>
              {/* New Discussion Button */}
              <div className="mb-6 flex justify-end">
                <button
                  onClick={() => setIsNewDiscussionOpen(true)}
                  className="group flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
                >
                  <PlusCircle className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
                  New Discussion
                </button>
              </div>

              {/* Search, Filter and Sort */}
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 sm:w-64">
                  <Search className="h-4 w-4 text-zinc-500" />
                  <input
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
                    placeholder="Search discussions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-4">
                  {/* Category Filter */}
                  <div className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-zinc-500" />
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white focus:border-blue-500/50 focus:outline-none"
                    >
                      {categories.map((category) => (
                        <option key={category} value={category} className="bg-[#0d0f1a]">
                          {category}
                        </option>
                      ))}
                    </select>
                    {selectedCategory !== "All" && (
                      <button
                        onClick={() => setSelectedCategory("All")}
                        className="rounded-full p-1 text-zinc-500 hover:text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Sort Options */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">Sort by:</span>
                    <div className="flex gap-2">
                      {sortOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setSortBy(option.value)}
                          className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs transition ${
                            sortBy === option.value
                              ? "bg-blue-500 text-white"
                              : "border border-white/15 bg-white/5 text-zinc-400 hover:text-white"
                          }`}
                        >
                          {option.icon}
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Posts List */}
              <div className="space-y-4">
                {sortedPosts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 p-12 text-center">
                    <MessageCircle className="mb-3 h-8 w-8 text-zinc-500" />
                    <h3 className="text-lg font-semibold text-white">No posts yet</h3>
                    <p className="mt-1 text-sm text-zinc-400">Be the first to start a discussion!</p>
                  </div>
                ) : (
                  sortedPosts.map((post) => {
                    const isAuthor = post.author === CURRENT_USER_NAME;
                    const isLiked = likedPosts.has(post.id);

                    return (
                      <div key={post.id} className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-4 transition hover:border-white/20">
                        <div className="flex gap-3">
                          <img
                            src={post.authorAvatar}
                            alt={post.author}
                            className="h-10 w-10 rounded-full object-cover ring-2 ring-white/20"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium text-white">{post.author}</p>
                                <span className="text-xs text-zinc-500">{post.ago}</span>
                                {post.tag && (
                                  <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] text-purple-400">
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

                              <button className="inline-flex items-center gap-1 text-zinc-500 transition hover:text-white">
                                <Bookmark className="h-3.5 w-3.5" />
                                <span>Save</span>
                              </button>
                            </div>

                            {/* Expanded Replies */}
                            {expandedPostId === post.id && (
                              <div className="mt-4 border-t border-white/10 pt-4">
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
                                    <p className="text-center text-sm text-zinc-500">No replies yet.</p>
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
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* Members Tab */}
          {activeTab === "members" && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((member) => (
                <div key={member.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-4">
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="h-12 w-12 rounded-full object-cover ring-2 ring-white/20"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{member.name}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-zinc-500">Joined {new Date(member.joinedAt).toLocaleDateString()}</p>
                      {member.role === "owner" && (
                        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-400">Owner</span>
                      )}
                      {member.role === "moderator" && (
                        <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-400">Moderator</span>
                      )}
                    </div>
                  </div>

                  {/* Three-dot menu for members */}
                  {member.id !== CURRENT_USER_ID && (
                    <div className="relative">
                      <button
                        onClick={() => setShowMemberMenu(showMemberMenu === member.id ? null : member.id)}
                        className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {showMemberMenu === member.id && (
                        <div className="absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-[#0d0f1a] shadow-2xl backdrop-blur-xl overflow-hidden z-20">
                          <div className="p-2">
                            <button
                              onClick={() => {
                                setSelectedMember(member);
                                setShowReportMemberModal(true);
                                setShowMemberMenu(null);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/10"
                            >
                              <Flag className="h-4 w-4" />
                              Report Member
                            </button>
                            {canRemoveMembers && member.role !== "owner" && (
                              <button
                                onClick={() => {
                                  setSelectedMember(member);
                                  setShowRemoveMemberModal(true);
                                  setShowMemberMenu(null);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10"
                              >
                                <UserMinus className="h-4 w-4" />
                                Remove Member
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* About Tab */}
          {activeTab === "about" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6">
                <h3 className="text-lg font-semibold text-white">About this group</h3>
                <p className="mt-2 text-zinc-400">{group.description}</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6">
                <h3 className="text-lg font-semibold text-white">Categories / Tags</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {group.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-blue-500/20 px-3 py-1 text-xs text-blue-400">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6">
                <h3 className="text-lg font-semibold text-white">Group Info</h3>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Created</span>
                    <span className="text-white">{new Date(group.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Owner</span>
                    <span className="text-white">{group.owner}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Visibility</span>
                    <span className="capitalize text-white">{group.visibility}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Total Members</span>
                    <span className="text-white">{group.members}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <NewDiscussionModal
        isOpen={isNewDiscussionOpen}
        onClose={() => setIsNewDiscussionOpen(false)}
        onCreatePost={handleCreatePost}
        availableGroups={[group]}
      />

      <EditGroupModal
        isOpen={showEditGroupModal}
        onClose={() => setShowEditGroupModal(false)}
        group={group}
        onSave={handleEditGroup}
      />

      <EditGroupPermissionsModal
        isOpen={showEditPermissionsModal}
        onClose={() => setShowEditPermissionsModal(false)}
        members={members}
        onSave={handleEditPermissions}
      />

      <ReportGroupModal
        isOpen={showReportGroupModal}
        onClose={() => setShowReportGroupModal(false)}
        groupName={group.name}
        onSubmit={handleReportGroup}
      />

      <LeaveGroupModal
        isOpen={showLeaveGroupModal}
        onClose={() => setShowLeaveGroupModal(false)}
        groupName={group.name}
        onConfirm={handleLeaveGroup}
      />

      <DeleteGroupModal
        isOpen={showDeleteGroupModal}
        onClose={() => setShowDeleteGroupModal(false)}
        groupName={group.name}
        onConfirm={handleDeleteGroup}
      />

      <ReportMemberModal
        isOpen={showReportMemberModal}
        onClose={() => {
          setShowReportMemberModal(false);
          setSelectedMember(null);
        }}
        memberName={selectedMember?.name || ""}
        onSubmit={handleReportMember}
      />

      <RemoveMemberModal
        isOpen={showRemoveMemberModal}
        onClose={() => {
          setShowRemoveMemberModal(false);
          setSelectedMember(null);
        }}
        memberName={selectedMember?.name || ""}
        onConfirm={handleRemoveMember}
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

export default SelectedGroup;