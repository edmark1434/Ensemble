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
  Users,
  Image as ImageIcon,
  MoreVertical,
  Edit2,
  Trash2 as TrashIcon,
  Heart,
  Eye,
  Loader2,
  UserPlus,
  CheckCircle,
  Reply,
} from "lucide-react";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import UserHeader from "@/components/nav/user_header";
import NewDiscussionModal from "@/pages/user/4_forums/forum_modals/NewDiscussionModal.tsx";
import ReportGroupModal from "@/pages/user/4_forums/forum_modals/ReportGroupModal";
import CreateGroupModal from "@/pages/user/4_forums/forum_modals/CreateGroupModal.tsx";
import EditPostModal from "@/pages/user/4_forums/forum_modals/EditPostModal.tsx";
import DeletePostModal from "@/pages/user/4_forums/forum_modals/DeletePostModal.tsx";
import { showSuccessToast, showErrorToast } from "@/components/utility/toast";
import api from "@/lib/axios";
import { reconcileForumDiscussions, useForumRealtime } from "@/pages/user/4_forums/forumRealtime";
import { identityFromDetails, loadCurrentForumAvatar } from "@/pages/user/4_forums/forumIdentity";
import useGlobalState from "@/lib/global_state";
import {
  buildForumCommentTree,
  uploadForumCommentImage,
} from "@/pages/user/4_forums/forumCommentUtils";

// ==================== TYPES ====================
type ForumTab = "feed" | "groups" | "my-groups" | "my-discussions" | "saved";

type ForumTag = {
  tag_id: number;
  tag_name?: string;
};

type Comment = {
  user_id: number;
  comment: string;
  comment_id: string;
  comment_reference_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  attachments: {
    file_path: string;
  }[];
  likes: {
    user_id: number;
  }[];
  depth?: number;
  children?: Comment[];
  is_edited?: boolean;
};

type Post = {
  _id?: string;
  forum_group_id: number;
  user_id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  tags: ForumTag[];
  attachments: {
    file_path: string;
  }[];
  imageKeys?: string[];
  likes: {
    user_id: number;
  }[];
  saves: {
    user_id: number;
  }[];
  comments: Comment[];
};

type FeedResponse = {
  discussions: Post[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
  };
};

type Group = {
  id: string;
  image_url: string;
  group_name: string;
  content: string;
  created_at: string;
  members: {
    joined_at: string;
    role: string;
    userId: number;
  }[];
  tags: {
    tag_id: number;
    tag: string;
  }[];
  gradient?: string;
  status?: string;
  joined?: boolean;
};

type MemberWithDetails = {
  userId: number;
  role: string;
  name: string;
  avatar: string;
  joinedAt: string;
};

// ==================== CONSTANTS ====================
const DEFAULT_AVATAR = "https://i.pravatar.cc/150?u=default";

const gradientOptions = [
  "from-cyan-500 via-blue-500 to-indigo-500",
  "from-emerald-500 via-teal-500 to-cyan-500",
  "from-orange-500 via-amber-500 to-yellow-500",
  "from-indigo-500 via-blue-500 to-sky-500",
  "from-fuchsia-500 via-pink-500 to-rose-500",
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
  { value: "trending", label: "Trending", icon: <ThumbsUp className="h-3 w-3" /> },
  { value: "hot", label: "Hot", icon: <MessageCircle className="h-3 w-3" /> },
];

const getTagColor = (tagId: number) => {
  const colors = [
    "bg-purple-500/20 text-purple-400",
    "bg-blue-500/20 text-blue-400",
    "bg-green-500/20 text-green-400",
    "bg-yellow-500/20 text-yellow-400",
    "bg-red-500/20 text-red-400",
    "bg-pink-500/20 text-pink-400",
    "bg-indigo-500/20 text-indigo-400",
    "bg-orange-500/20 text-orange-400",
    "bg-cyan-500/20 text-cyan-400",
    "bg-emerald-500/20 text-emerald-400",
  ];
  return colors[tagId % colors.length];
};

// ==================== MARKDOWN COMPONENTS ====================
const MarkdownComponents = {
  h1: ({ children }: { children: React.ReactNode }) => (
    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-4 mb-2 border-b border-gray-200 dark:border-white/10 pb-2">{children}</h1>
  ),
  h2: ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-3 mb-2">{children}</h2>
  ),
  h3: ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-2 mb-1">{children}</h3>
  ),
  p: ({ children }: { children: React.ReactNode }) => (
    <p className="text-gray-600 dark:text-zinc-300 mb-2 leading-relaxed">{children}</p>
  ),
  strong: ({ children }: { children: React.ReactNode }) => (
    <strong className="font-bold text-gray-900 dark:text-white">{children}</strong>
  ),
  em: ({ children }: { children: React.ReactNode }) => (
    <em className="italic text-gray-600 dark:text-zinc-300">{children}</em>
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
    <li className="text-gray-600 dark:text-zinc-300">{children}</li>
  ),
  a: ({ href, children }: { href?: string; children: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline transition-colors">
      {children}
    </a>
  ),
  blockquote: ({ children }: { children: React.ReactNode }) => (
    <blockquote className="border-l-4 border-blue-500 pl-4 my-2 text-gray-500 dark:text-zinc-400 italic">{children}</blockquote>
  ),
};

// ==================== UTILITIES ====================
const getTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
};

const getDepthClass = (depth: number = 0): string => {
  const maxDepth = 8;
  const effectiveDepth = Math.min(depth, maxDepth);
  
  if (effectiveDepth === 0) return "";
  if (effectiveDepth === 1) return "ml-4";
  if (effectiveDepth === 2) return "ml-8";
  if (effectiveDepth === 3) return "ml-12";
  if (effectiveDepth === 4) return "ml-16";
  if (effectiveDepth === 5) return "ml-20";
  if (effectiveDepth === 6) return "ml-24";
  if (effectiveDepth === 7) return "ml-28";
  return "ml-32";
};

// ==================== COMPONENTS ====================
const ImageGallery = ({ attachments, imageKeys }: {
  attachments?: { file_path: string }[];
  imageKeys?: string[];
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const allImages = [
    ...(attachments || []).map((attachment) => attachment.file_path),
    ...(imageKeys || []),
  ].filter(Boolean);

  if (allImages.length === 0) return null;

  const getImageUrl = (filePath: string) =>
    filePath.startsWith("http")
      ? filePath
      : `${import.meta.env.VITE_CLOUDFRONT_URL}/${filePath}`;

  return (
    <>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {allImages.map((filePath, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedImage(getImageUrl(filePath))}
            className="group relative overflow-hidden rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none transition-all hover:scale-105 hover:border-white/20"
          >
            <img
              src={getImageUrl(filePath)}
              alt={`Post image ${idx + 1}`}
              className="h-32 w-full object-cover transition-all group-hover:scale-110"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://placehold.co/400x300?text=Image+Not+Found";
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
              <ImageIcon className="h-6 w-6 text-gray-900 dark:text-white" />
            </div>
          </button>
        ))}
      </div>

      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute right-4 top-4 rounded-full bg-gray-100 dark:bg-white/10 p-2 text-gray-900 dark:text-white transition hover:bg-white/20"
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

const ReplyInput = ({
  replyText,
  updateReplyText,
  handleReply,
  uploadImages,
  images,
  removeImage,
  isUploading,
  currentUserAvatar,
  placeholder = "Write a reply... (Supports **bold**, *italic*, `code`, and images)"
}: {
  replyText: string;
  updateReplyText: (text: string) => void;
  handleReply: () => void;
  uploadImages: (files: FileList | null) => void;
  images: ImageAttachment[];
  removeImage: (imageId: string) => void;
  isUploading: boolean;
  currentUserAvatar: string;
  placeholder?: string;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyFormatting = (format: string) => {
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
        if (selectedText) {
          formattedText = selectedText.split("\n").map(line => `- ${line}`).join("\n");
        } else {
          formattedText = "- ";
          newCursorPos = start + 2;
        }
        break;
      case "code":
        formattedText = `\`${selectedText || "code"}\``;
        newCursorPos = start + 1;
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

  return (
    <div className="mt-4">
      <div className="flex gap-3">
        <img
          src={currentUserAvatar}
          alt="You"
          className="h-8 w-8 rounded-full object-cover ring-2 ring-white/20 flex-shrink-0"
        />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-gray-200 dark:border-white/15 border-b-0 bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-2 py-1">
            <button
              type="button"
              onClick={() => applyFormatting("bold")}
              className="rounded p-1 text-gray-500 dark:text-zinc-400 transition hover:bg-gray-100 dark:bg-white/10 hover:text-gray-900 dark:text-white"
              title="Bold"
            >
              <strong className="text-xs">B</strong>
            </button>
            <button
              type="button"
              onClick={() => applyFormatting("italic")}
              className="rounded p-1 text-gray-500 dark:text-zinc-400 transition hover:bg-gray-100 dark:bg-white/10 hover:text-gray-900 dark:text-white"
              title="Italic"
            >
              <em className="text-xs">I</em>
            </button>
            <button
              type="button"
              onClick={() => applyFormatting("bullet-list")}
              className="rounded p-1 text-gray-500 dark:text-zinc-400 transition hover:bg-gray-100 dark:bg-white/10 hover:text-gray-900 dark:text-white"
              title="Bullet List"
            >
              <span className="text-xs">•</span>
            </button>
            <button
              type="button"
              onClick={() => applyFormatting("code")}
              className="rounded p-1 text-gray-500 dark:text-zinc-400 transition hover:bg-gray-100 dark:bg-white/10 hover:text-gray-900 dark:text-white"
              title="Code"
            >
              <span className="text-xs">{'<>'}</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded p-1 text-gray-500 dark:text-zinc-400 transition hover:bg-gray-100 dark:bg-white/10 hover:text-gray-900 dark:text-white"
              title="Upload Image"
            >
              <ImageIcon className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="ml-auto rounded p-1 text-gray-500 dark:text-zinc-400 transition hover:bg-gray-100 dark:bg-white/10 hover:text-gray-900 dark:text-white"
              title={showPreview ? "Edit" : "Preview"}
            >
              {showPreview ? <Edit2 className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </button>
          </div>

          {!showPreview ? (
            <textarea
              ref={textareaRef}
              value={replyText}
              onChange={(e) => updateReplyText(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-b-lg border border-gray-200 dark:border-white/15 border-t-0 bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-500 dark:text-zinc-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none"
              rows={3}
            />
          ) : (
            <div className="min-h-[80px] rounded-b-lg border border-gray-200 dark:border-white/15 border-t-0 bg-white dark:bg-white/5 shadow-sm dark:shadow-none p-3">
              {replyText.trim() ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                  {replyText}
                </ReactMarkdown>
              ) : (
                <p className="text-sm text-gray-500 dark:text-zinc-500 italic">Nothing to preview...</p>
              )}
            </div>
          )}

          {images.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {images.map((image) => (
                <div key={image.id} className="group relative">
                  <img
                    src={image.preview}
                    alt="Upload preview"
                    className="h-16 w-16 rounded-lg object-cover border border-gray-200 dark:border-white/10"
                  />
                  {image.uploading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/70">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-900 dark:text-white" />
                    </div>
                  )}
                  <button
                    onClick={() => removeImage(image.id)}
                    className="absolute -top-1 -right-1 rounded-full bg-red-500 p-0.5 text-gray-900 dark:text-white opacity-0 transition group-hover:opacity-100"
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
              className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-white/15 bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-3 py-1.5 text-xs text-gray-500 dark:text-zinc-400 transition hover:bg-gray-100 dark:bg-white/10 hover:text-gray-900 dark:text-white"
            >
              <ImageIcon className="h-3 w-3" />
              Add Image
            </button>
            <button
              onClick={handleReply}
              disabled={(!replyText.trim() && images.length === 0) || isUploading}
              className="flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-gray-900 dark:text-white transition hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
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

// ==================== COMMENT ITEM COMPONENT ====================
// ==================== COMMENT ITEM COMPONENT ====================
const CommentItem = ({ 
  comment, 
  postId, 
  membersDetails, 
  onLike, 
  onReply,
  onEditComment,
  onDeleteComment,
  replyingTo, 
  setReplyingTo,
  replyText,
  setReplyText,
  onSendReply,
  replyImages,
  onReplyImageUpload,
  onRemoveReplyImage,
  isUploading,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  isLastInThread = false,
  isCollapsed = false,
  onToggleCollapse
}: { 
  comment: Comment;
  postId: string;
  membersDetails: Record<number, { name: string; avatar: string }>;
  onLike: (postId: string, commentId: string) => void;
  onReply: (postId: string, commentId: string, authorName: string, authorId: number) => void;
  onEditComment: (postId: string, commentId: string, newText: string) => void;
  onDeleteComment: (postId: string, commentId: string) => void;
  replyingTo: { commentId: string; authorName: string; authorId: number } | null;
  setReplyingTo: (value: { commentId: string; authorName: string; authorId: number } | null) => void;
  replyText: string;
  setReplyText: (text: string) => void;
  onSendReply: (postId: string, commentId: string) => void;
  replyImages: ImageAttachment[];
  onReplyImageUpload: (files: FileList | null) => void;
  onRemoveReplyImage: (imageId: string) => void;
  isUploading: boolean;
  currentUserName: string;
  currentUserId: number;
  currentUserAvatar: string;
  isLastInThread?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}) => {
  // Initialize showChildren based on isCollapsed - collapsed by default
  const [showChildren, setShowChildren] = useState(!isCollapsed);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.comment);
  const [showCommentMenu, setShowCommentMenu] = useState(false);
  
  // Get comment author
  let commentAuthor;
  if (comment.user_id === currentUserId) {
    commentAuthor = { name: currentUserName, avatar: currentUserAvatar };
  } else if (membersDetails[comment.user_id]) {
    commentAuthor = membersDetails[comment.user_id];
  } else {
    commentAuthor = { name: `User ${comment.user_id}`, avatar: `https://i.pravatar.cc/150?u=${comment.user_id}` };
  }
  
  const isLiked = comment.likes?.some(like => like.user_id === currentUserId) || false;
  const isAuthor = comment.user_id === currentUserId;
  const hasChildren = comment.children && comment.children.length > 0;
  const childCount = comment.children?.length || 0;
  const depth = comment.depth || 0;
  
  const showContinueThread = depth >= 3 && childCount > 0;
  const depthClass = getDepthClass(depth);

  const handleEditSubmit = () => {
    if (editText.trim() && editText !== comment.comment) {
      onEditComment(postId, comment.comment_id, editText);
    }
    setIsEditing(false);
    setShowCommentMenu(false);
  };

  const handleDeleteCommentClick = () => {
    onDeleteComment(postId, comment.comment_id);
    setShowCommentMenu(false);
  };

  // Determine if we should show the collapse button
  const shouldShowCollapse = hasChildren && depth >= 0;

  // Update showChildren when isCollapsed changes from parent
  useEffect(() => {
    if (isCollapsed) {
      setShowChildren(false);
    }
  }, [isCollapsed]);

  // Handle toggle
  const handleToggleChildren = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setShowChildren(!showChildren);
    }
  };

  // Determine if children should be visible
  const childrenVisible = !isCollapsed && showChildren;

  return (
    <div className={`${depthClass} mt-2 ${!isLastInThread ? "border-l-2 border-gray-200 dark:border-white/10 ml-2 pl-2" : ""}`}>
      <div className="flex gap-3 py-2">
        <img
          src={commentAuthor.avatar}
          alt={commentAuthor.name}
          className="h-8 w-8 rounded-full object-cover ring-2 ring-white/20 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{commentAuthor.name}</p>
              <span className="text-xs text-gray-500 dark:text-zinc-500">{getTimeAgo(comment.created_at)}</span>
              {comment.is_edited && (
                <span className="text-[10px] text-zinc-600">(edited)</span>
              )}
              {depth > 0 && (
                <span className="text-[10px] text-zinc-600">· {depth} level{depth > 1 ? 's' : ''} deep</span>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {/* Collapse button - only for comments with children */}
              {shouldShowCollapse && (
                <button
                  onClick={handleToggleChildren}
                  className="rounded p-1 text-gray-500 dark:text-zinc-500 hover:bg-gray-100 dark:bg-white/10 transition"
                  title={isCollapsed || !showChildren ? "Expand thread" : "Collapse thread"}
                >
                  {isCollapsed || !showChildren ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronUp className="h-3 w-3" />
                  )}
                </button>
              )}
              
              {/* Comment actions menu */}
              {isAuthor && !comment.deleted_at && (
                <div className="relative">
                  <button
                    onClick={() => setShowCommentMenu(!showCommentMenu)}
                    className="rounded p-1 text-gray-500 dark:text-zinc-500 hover:bg-gray-100 dark:bg-white/10"
                  >
                    <MoreVertical className="h-3 w-3" />
                  </button>
                  {showCommentMenu && (
                    <div className="absolute right-0 mt-1 w-28 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-xl z-20">
                      <button
                        onClick={() => {
                          setIsEditing(true);
                          setShowCommentMenu(false);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:bg-white/10"
                      >
                        <Edit2 className="h-3 w-3" />
                        Edit
                      </button>
                      <button
                        onClick={handleDeleteCommentClick}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10"
                      >
                        <TrashIcon className="h-3 w-3" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Comment content */}
          {isEditing ? (
            <div className="mt-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-white/15 bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-3 py-2 text-sm text-gray-900 dark:text-white"
                rows={3}
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={handleEditSubmit}
                  className="rounded bg-blue-500 px-3 py-1 text-xs text-gray-900 dark:text-white"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="rounded bg-gray-100 dark:bg-white/10 px-3 py-1 text-xs text-gray-500 dark:text-zinc-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-1 text-sm text-gray-600 dark:text-zinc-300 prose prose-invert prose-sm max-w-none break-words">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                  {comment.deleted_at ? "[deleted]" : comment.comment}
                </ReactMarkdown>
              </div>
              
              <ImageGallery attachments={comment.attachments} />
            </>
          )}
          
          {/* Action buttons - only show when not collapsed */}
          {!comment.deleted_at && !isCollapsed && (
            <div className="mt-2 flex items-center gap-3 flex-wrap">
              <button
                onClick={() => onLike(postId, comment.comment_id)}
                className={`inline-flex items-center gap-1 text-xs transition ${
                  isLiked ? "text-red-400" : "text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:text-white"
                }`}
              >
                <Heart className={`h-3 w-3 ${isLiked ? "fill-red-400" : ""}`} />
                <span>{comment.likes?.length || 0}</span>
              </button>
              <button
                onClick={() => onReply(postId, comment.comment_id, commentAuthor.name, comment.user_id)}
                className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-500 transition hover:text-gray-900 dark:text-white"
              >
                <Reply className="h-3 w-3" />
                <span>Reply</span>
              </button>
              {hasChildren && (
                <button
                  onClick={handleToggleChildren}
                  className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-500 transition hover:text-gray-900 dark:text-white"
                >
                  {showChildren ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  <span>{childCount} {childCount === 1 ? 'reply' : 'replies'}</span>
                </button>
              )}
            </div>
          )}

          {/* Reply input */}
          {replyingTo?.commentId === comment.comment_id && !isCollapsed && (
            <div className="mt-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-blue-400">Replying to @{replyingTo.authorName}</span>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="text-xs text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <ReplyInput
                replyText={replyText}
                updateReplyText={setReplyText}
                handleReply={() => onSendReply(postId, comment.comment_id)}
                uploadImages={onReplyImageUpload}
                images={replyImages}
                removeImage={onRemoveReplyImage}
                isUploading={isUploading}
                currentUserAvatar={currentUserAvatar}
                placeholder={`Reply to @${replyingTo.authorName}...`}
              />
            </div>
          )}

          {/* Collapsed state - show summary */}
          {isCollapsed && hasChildren && (
            <div className="mt-2 text-xs text-gray-500 dark:text-zinc-500">
              <button
                onClick={handleToggleChildren}
                className="hover:text-gray-900 dark:text-white transition"
              >
                View {childCount} {childCount === 1 ? 'reply' : 'replies'}
              </button>
            </div>
          )}

          {/* Children comments */}
          {childrenVisible && hasChildren && !showContinueThread && (
            <div className="mt-3">
              {comment.children!.map((child, index) => (
                <CommentItem
                  key={child.comment_id}
                  comment={child}
                  postId={postId}
                  membersDetails={membersDetails}
                  onLike={onLike}
                  onReply={onReply}
                  onEditComment={onEditComment}
                  onDeleteComment={onDeleteComment}
                  replyingTo={replyingTo}
                  setReplyingTo={setReplyingTo}
                  replyText={replyText}
                  setReplyText={setReplyText}
                  onSendReply={onSendReply}
                  replyImages={replyImages}
                  onReplyImageUpload={onReplyImageUpload}
                  onRemoveReplyImage={onRemoveReplyImage}
                  isUploading={isUploading}
                  currentUserId={currentUserId}
                  currentUserAvatar={currentUserAvatar}
                  currentUserName={currentUserName}
                  isLastInThread={index === comment.children!.length - 1}
                  isCollapsed={isCollapsed}
                  onToggleCollapse={onToggleCollapse}
                />
              ))}
            </div>
          )}

          {/* Continue thread button */}
          {!isCollapsed && showContinueThread && (
            <button
              onClick={handleToggleChildren}
              className="mt-2 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition"
            >
              {showChildren ? (
                <>Hide {childCount} replies</>
              ) : (
                <>Continue this thread ({childCount} replies)</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Replace the renderPostCard function inside the main Forums component with this:

const renderPostCard = (post: any, showGroupName: boolean = true) => {
  const group = groupsList.find((item) => String(item._id) === String(post.forum_group_id));
  const isExpanded = expandedPostId === post.id;
  const isLiked = post.isLiked;
  const isSaved = post.isSaved;

  // Use useMemo to initialize collapsedComments only when post changes
  const [collapsedComments, setCollapsedComments] = useState<Set<string>>(() => {
    // Recursive function to get all comment IDs from the comment tree
    const getAllCommentIds = (comments: Comment[]): string[] => {
      let ids: string[] = [];
      comments.forEach(comment => {
        ids.push(comment.comment_id);
        if (comment.children && comment.children.length > 0) {
          ids = ids.concat(getAllCommentIds(comment.children));
        }
      });
      return ids;
    };

    // Get all comment IDs from the post's comment tree
    const allCommentIds = post.commentTree ? getAllCommentIds(post.commentTree) : [];
    return new Set(allCommentIds);
  });

  const toggleCollapse = (commentId: string) => {
    setCollapsedComments(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  return (
    <div key={post.id} className="rounded-xl border border-gray-200 dark:border-white/10 bg-gradient-to-br from-white/5 to-transparent p-4 transition hover:border-white/20">
      <div className="flex gap-3">
        <img src={post.authorAvatar} alt={post.author} className="h-10 w-10 rounded-full object-cover ring-2 ring-white/20" />
        <div className="flex-1">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{post.author}</p>
              <span className="text-xs text-gray-500 dark:text-zinc-500">{post.ago}</span>
              {showGroupName && group && (
                <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] text-cyan-400">
                  {group.group_name}
                </span>
              )}
              {post.tagsList && post.tagsList.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {post.tagsList.map((tag: ForumTag, tagIdx: number) => (
                    <span 
                      key={tag.tag_id || tagIdx} 
                      className={`rounded-full px-2 py-0.5 text-[10px] ${getTagColor(tag.tag_id)}`}
                    >
                      {tag.tag_name || `Tag ${tag.tag_id}`}
                    </span>
                  ))}
                </div>
              )}
            </div>

              {post.user_id === currentUserId ? (
              <div className="relative">
                <button
                  onClick={() => setPostMenuOpen(postMenuOpen === post.id ? null : post.id)}
                  className="rounded-lg p-1 text-gray-500 dark:text-zinc-500 transition hover:bg-gray-100 dark:bg-white/10 hover:text-gray-900 dark:text-white"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {postMenuOpen === post.id && (
                  <div className="absolute right-0 mt-1 w-36 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-xl overflow-hidden z-20">
                    <button
                      onClick={() => {
                        setEditingPost(post);
                        setPostMenuOpen(null);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-zinc-300 transition hover:bg-gray-100 dark:bg-white/10"
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
            ) : (
              <button onClick={() => setReportingPost(post)} className="text-xs text-gray-500 dark:text-zinc-500 hover:text-red-400">
                Report
              </button>
            )}
          </div>

          <h3 className="mt-1 text-base font-semibold text-gray-900 dark:text-white">{post.title}</h3>

          <div className="mt-2 text-sm text-gray-600 dark:text-zinc-300 prose prose-invert prose-sm max-w-none break-words">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
              {post.content}
            </ReactMarkdown>
          </div>

          <ImageGallery attachments={post.attachments} imageKeys={post.imageKeys} />

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
            <button
              onClick={() => toggleExpand(post.id)}
              className="inline-flex items-center gap-1 text-gray-500 dark:text-zinc-500 transition hover:text-gray-900 dark:text-white"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>{post.commentCount} replies</span>
              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            <button
              onClick={() => handleLikePost(post.id)}
              className={`inline-flex items-center gap-1 transition-all duration-200 ${
                isLiked 
                  ? "text-red-400 hover:text-red-300" 
                  : "text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:text-white"
              }`}
              type="button"
            >
              <Heart className={`h-3.5 w-3.5 transition-all ${isLiked ? "fill-red-400" : ""}`} />
              <span>{post.likeCount} likes</span>
            </button>

            <button
              onClick={() => handleSavePost(post.id)}
              className={`inline-flex items-center gap-1 transition-all duration-200 ${
                isSaved 
                  ? "text-yellow-400 hover:text-yellow-300" 
                  : "text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:text-white"
              }`}
              type="button"
            >
              <Bookmark className={`h-3.5 w-3.5 transition-all ${isSaved ? "fill-yellow-400" : ""}`} />
              <span>{isSaved ? "Saved" : "Save"}</span>
            </button>
          </div>

          {isExpanded && (
            <div className="mt-4 border-t border-gray-200 dark:border-white/10 pt-4">
              <div className="space-y-4">
                {post.commentTree && post.commentTree.length > 0 ? (
                  post.commentTree.map((comment: Comment, commentIndex: number) => {
                    // Check if this comment should be collapsed
                    const isCommentCollapsed = collapsedComments.has(comment.comment_id);
                    
                    return (
                      <CommentItem
                        key={comment.comment_id}
                        comment={comment}
                        postId={post.id}
                        membersDetails={membersDetailsMap}
                        onLike={handleLikeComment}
                        onReply={handleReplyClick}
                        onEditComment={async (_postId, commentId, newText) => {
                          await api.patch(
                            `api/forum/discussions/${post._id}/comments/${commentId}`,
                            { comment: { action: "edit", comment: newText } }
                          );
                        }}
                        onDeleteComment={async (_postId, commentId) => {
                          await api.patch(
                            `api/forum/discussions/${post._id}/comments/${commentId}`,
                            { softDelete: true }
                          );
                        }}
                        replyingTo={replyingTo}
                        setReplyingTo={setReplyingTo}
                        replyText={replyCommentText}
                        setReplyText={setReplyCommentText}
                        onSendReply={handleCommentReply}
                        replyImages={commentReplyImages}
                        onReplyImageUpload={handleCommentReplyImageUpload}
                        onRemoveReplyImage={removeCommentReplyImage}
                        isUploading={commentReplyUploading}
                        currentUserId={currentUserId}
                        currentUserName={currentUserName}
                        currentUserAvatar={currentUserAvatar}
                        isLastInThread={commentIndex === post.commentTree.length - 1}
                        isCollapsed={isCommentCollapsed}
                        onToggleCollapse={() => toggleCollapse(comment.comment_id)}
                      />
                    );
                  })
                ) : (
                  <p className="text-center text-sm text-gray-500 dark:text-zinc-500">No comments yet.</p>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
                <ReplyInput
                  replyText={replyText[post.id] || ""}
                  updateReplyText={(text) => updateReplyText(post.id, text)}
                  handleReply={() => handleReply(post.id)}
                  uploadImages={(files) => handleReplyImageUpload(post.id, files)}
                  images={replyImages[post.id] || []}
                  removeImage={(imageId) => removeReplyImage(post.id, imageId)}
                  isUploading={replyUploading[post.id] || false}
                  currentUserAvatar={currentUserAvatar}
                  placeholder="Write a comment..."
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN COMPONENT ====================
const Forums = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ForumTab>("feed");
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("latest");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [replyCommentText, setReplyCommentText] = useState<string>("");
  const [isNewDiscussionOpen, setIsNewDiscussionOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [postMenuOpen, setPostMenuOpen] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [deletingPost, setDeletingPost] = useState<Post | null>(null);
  const [reportingPost, setReportingPost] = useState<Post | null>(null);
  const [replyImages, setReplyImages] = useState<{ [key: string]: ImageAttachment[] }>({});
  const [replyUploading, setReplyUploading] = useState<{ [key: string]: boolean }>({});
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; authorName: string; authorId: number } | null>(null);
  const [commentReplyImages, setCommentReplyImages] = useState<ImageAttachment[]>([]);
  const [commentReplyUploading, setCommentReplyUploading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);
  const [groupsList, setGroupsList] = useState<Group[]>([]);
  const [groupDiscussions, setGroupDiscussions] = useState<Post[]>([]);
  const [myDiscussionPosts, setMyDiscussionPosts] = useState<Post[]>([]);
  const [savedDiscussions, setSavedDiscussions] = useState<Post[]>([]);
  const [membersDetailsMap, setMembersDetailsMap] = useState<Record<number, { name: string; avatar: string }>>({});
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const feedSentinelRef = useRef<HTMLDivElement | null>(null);
  useForumRealtime((event) => {
    setGroupDiscussions((current) => reconcileForumDiscussions(current, event));
    setMyDiscussionPosts((current) => reconcileForumDiscussions(current, event));
    setSavedDiscussions((current) => reconcileForumDiscussions(current, event));
  });
  const navigate = useNavigate();
  
  const user = useGlobalState((state) => state.user);
  const currentUserId = user?.user_id || user?.userId || 1;
  const currentUserName = user?.displayName || user?.name || "Unknown User";
  const [currentUserAvatar, setCurrentUserAvatar] = useState(user?.avatar || DEFAULT_AVATAR);

  useEffect(() => {
    void loadCurrentForumAvatar(user?.avatar).then(setCurrentUserAvatar);
  }, [user?.avatar]);

  const [joinedGroups, setJoinedGroups] = useState<Group[]>([]);
  const availableFilterGroups = joinedGroups;

  const updatePostLists = (postId: string, update: (post: Post) => Post) => {
    const updateMatchingPost = (posts: Post[]) =>
      posts.map((post) => String(post._id) === postId ? update(post) : post);

    setGroupDiscussions(updateMatchingPost);
    setMyDiscussionPosts(updateMatchingPost);
    setSavedDiscussions(updateMatchingPost);
  };

  const removePostFromLists = (postId: string) => {
    const withoutPost = (posts: Post[]) =>
      posts.filter((post) => String(post._id) !== postId);

    setGroupDiscussions(withoutPost);
    setMyDiscussionPosts(withoutPost);
    setSavedDiscussions(withoutPost);
  };

  // ==================== EFFECTS ====================
  useEffect(() => {
    if (joinedGroups.length > 0 && selectedGroupIds.length === 0) {
      setSelectedGroupIds(joinedGroups.map((group : any) => group.id));
    }
  }, [joinedGroups]);

  // Load group metadata independently from paginated discussion feeds.
  useEffect(() => {
    let cancelled = false;

    const loadForumData = async () => {
      setLoading(true);
      try {
        const groupsResponse = await api.get("/api/forum/groups");
        let normalizedGroups = (groupsResponse.data ?? []).map((group : any, index : any ) => ({
          ...group,
          id: group._id,
          gradient: gradientOptions[index % gradientOptions.length],
          joined: group.members?.some((member :any) => member.userId === currentUserId) || false,
        }));
        normalizedGroups = normalizedGroups.filter((group : any) => group.status === "active");
        const userJoinedGroups = normalizedGroups.filter((group : any) => 
          group.members?.some((member : any) => member.userId === currentUserId)
        );
        
        if (cancelled) return;
        setJoinedGroups(userJoinedGroups);
        setGroupsList(normalizedGroups);
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          showErrorToast("Failed to load forum data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadForumData();
    return () => { cancelled = true; };
  }, [reloadKey, currentUserId]);

  const loadFeedPage = useCallback(async (cursor: string | null, append: boolean) => {
    if (!["feed", "my-discussions", "saved"].includes(activeTab)) return;
    if (activeTab === "feed" && selectedGroupIds.length === 0) {
      setGroupDiscussions([]);
      setNextCursor(null);
      setHasMore(false);
      return;
    }

    append ? setLoadingMore(true) : setLoading(true);
    try {
      const url = activeTab === "feed"
        ? "/api/forum/discussions/feed"
        : activeTab === "my-discussions"
          ? "/api/forum/user/discussions"
          : "/api/forum/discussions/saved";
      const response = await api.get<FeedResponse>(url, {
        params: {
          type: sortBy,
          limit: 10,
          cursor: cursor || undefined,
          groupIds: activeTab === "feed" ? selectedGroupIds.join(",") : undefined,
        },
      });
      const page = response.data.discussions || [];
      const updateFeed = (current: Post[]) => append ? [...current, ...page] : page;
      if (activeTab === "feed") setGroupDiscussions(updateFeed);
      if (activeTab === "my-discussions") setMyDiscussionPosts(updateFeed);
      if (activeTab === "saved") setSavedDiscussions(updateFeed);
      setNextCursor(response.data.pagination.nextCursor);
      setHasMore(response.data.pagination.hasMore);

      const userIds = [...new Set(page.flatMap((post) => [
        post.user_id,
        ...(post.comments || []).map((comment) => comment.user_id),
      ]).filter(Boolean))];
      if (userIds.length) {
        const detailsResponse = await api.post('api/users/list-of-details', { userIds });
        setMembersDetailsMap((current) => {
          const next = { ...current };
          for (const details of detailsResponse.data.usersList || []) {
            next[details.user_id] = identityFromDetails(details);
          }
          next[currentUserId] = { name: currentUserName, avatar: currentUserAvatar };
          return next;
        });
      }
    } catch (error) {
      console.error("Error loading discussion feed:", error);
      if (!append) {
        if (activeTab === "feed") setGroupDiscussions([]);
        if (activeTab === "my-discussions") setMyDiscussionPosts([]);
        if (activeTab === "saved") setSavedDiscussions([]);
      }
      showErrorToast("Failed to load discussions");
    } finally {
      append ? setLoadingMore(false) : setLoading(false);
    }
  }, [activeTab, selectedGroupIds, sortBy, currentUserId, currentUserName, currentUserAvatar]);

  useEffect(() => {
    setNextCursor(null);
    setHasMore(false);
    void loadFeedPage(null, false);
  }, [loadFeedPage, reloadKey]);

  useEffect(() => {
    const sentinel = feedSentinelRef.current;
    if (!sentinel || !hasMore || loadingMore || !nextCursor) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) void loadFeedPage(nextCursor, true);
    }, { rootMargin: "300px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, nextCursor, loadFeedPage]);

  // ==================== JOIN GROUP ====================
  const joinGroup = async (groupId: string) => {
    setJoiningGroupId(groupId);
    try {
      await api.put(`/api/forum/groups/members/${groupId}`, {
        user_id: currentUserId,
      });
      showSuccessToast("Successfully joined group");
      setReloadKey((value) => value + 1);
    } catch (error) {
      console.error(error);
      showErrorToast("Failed to join group");
    } finally {
      setJoiningGroupId(null);
    }
  };

  // ==================== HANDLERS ====================
  const refreshForumData = useCallback(() => setReloadKey((value) => value + 1), []);

  const toggleGroupFilter = useCallback((groupId: string) => {
    setSelectedGroupIds((prev) => 
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  }, []);

  const selectAllGroups = useCallback(() => {
    setSelectedGroupIds(joinedGroups.map((group) => group.id));
  }, [joinedGroups]);

  const clearAllGroups = useCallback(() => setSelectedGroupIds([]), []);

  const toggleExpand = useCallback((postId: string) => {
    setExpandedPostId((current) => (current === postId ? null : postId));
  }, []);

  const updateReplyText = useCallback((postId: string, text: string) => {
    setReplyText((current) => ({ ...current, [postId]: text }));
  }, []);

  // ==================== DISPLAY POSTS ====================
  const displayPosts = useMemo(() => {
    let posts: Post[] = [];
    
    if (activeTab === "feed") {
      posts = groupDiscussions.filter((post) => selectedGroupIds.includes(String(post.forum_group_id)));
    } else if (activeTab === "my-discussions") {
      posts = myDiscussionPosts.filter((post) => post.user_id === currentUserId);
    } else if (activeTab === "saved") {
      posts = savedDiscussions;
    } else {
      return [];
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      posts = posts.filter((post) => {
        const group = groupsList.find((g) => String(g.id) === String(post.forum_group_id));
        const matchesGroup = String(group?.group_name || "").toLowerCase().includes(query);
        const matchesTitle = String(post.title || "").toLowerCase().includes(query);
        const matchesContent = String(post.content || "").toLowerCase().includes(query);
        return matchesGroup || matchesTitle || matchesContent;
      });
    }

    return posts.map((post, index) => {
      // Get user details from membersDetailsMap
      let authorName, authorAvatar;
      if (post.user_id === currentUserId) {
        authorName = currentUserName;
        authorAvatar = currentUserAvatar;
      } else if (membersDetailsMap[post.user_id]) {
        authorName = membersDetailsMap[post.user_id].name;
        authorAvatar = membersDetailsMap[post.user_id].avatar;
      } else {
        authorName = `User ${post.user_id}`;
        authorAvatar = `https://i.pravatar.cc/150?u=${post.user_id}`;
      }
      
      const isLiked = post.likes?.some(like => like.user_id === currentUserId) || false;
      const isSaved = post.saves?.some(save => save.user_id === currentUserId) || false;
      
      return {
        ...post,
        arrayIndex: index,
        id: post._id || String(index),
        author: authorName,
        authorAvatar: authorAvatar,
        excerpt: post.content,
        ago: getTimeAgo(post.created_at),
        tagsList: post.tags || [],
        likeCount: post.likes?.length || 0,
        commentCount: post.comments?.length || 0,
        isLiked,
        isSaved,
        commentTree: buildForumCommentTree(post.comments || []),
      };
    });
  }, [activeTab, groupDiscussions, myDiscussionPosts, savedDiscussions, selectedGroupIds, searchQuery, groupsList, currentUserId, membersDetailsMap, currentUserName, currentUserAvatar]);

  const visibleGroups = useMemo(() => {
    let groups = activeTab === "my-groups" ? joinedGroups : groupsList;
    console.log("group data",groups);
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      groups = groups.filter((group) => 
        String(group.group_name || "").toLowerCase().includes(query) ||
        String(group.content || group.description || "").toLowerCase().includes(query)
      );
    }
    
    return groups;
  }, [activeTab, groupsList, joinedGroups, searchQuery]);

  // ==================== REPLY HANDLERS ====================
  const handleReplyImageUpload = async (postId: string, files: FileList | null) => {
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

    for (const image of newImages) {
      try {
        const key = await uploadForumCommentImage(image.file!);
        setReplyImages(prev => ({
          ...prev,
          [postId]: prev[postId].map(img =>
            img.id === image.id ? { ...img, uploading: false, url: key } : img
          )
        }));
      } catch (error) {
        console.error("Error uploading comment image:", error);
        setReplyImages(prev => ({
          ...prev,
          [postId]: prev[postId].filter(img => img.id !== image.id),
        }));
        showErrorToast(`Failed to upload ${image.file?.name || "image"}`);
      }
    }
    setReplyUploading(prev => ({ ...prev, [postId]: false }));
  };

  const removeReplyImage = (postId: string, imageId: string) => {
    const image = replyImages[postId]?.find(img => img.id === imageId);
    if (image && image.preview.startsWith('blob:')) {
      URL.revokeObjectURL(image.preview);
    }
    setReplyImages(prev => ({
      ...prev,
      [postId]: prev[postId]?.filter(img => img.id !== imageId) || []
    }));
  };

  const handleReply = async (postId: string) => {
    const replyContent = replyText[postId]?.trim();
    const replyImageList = replyImages[postId] || [];

    if (!replyContent && replyImageList.length === 0) return;

    const currentPost = groupDiscussions.find((post) => String(post._id) === postId);
    
    if (!currentPost) {
      showErrorToast("Post not found");
      return;
    }

    const newComment: Comment = {
      comment: replyContent || "",
      comment_reference_id: null,
      attachments: replyImageList.map(img => ({ file_path: img.url || img.preview })),
    } as Comment;

    try {
      const response = await api.post(`api/forum/discussions/${currentPost._id}/comments`, newComment);
      
      if (response.status !== 201) {
        showErrorToast("Failed to post reply. Please try again.");
        return;
      }
      
      const savedComment = response.data;
      console.log("Saved comment:", savedComment);
      
      updatePostLists(postId, (post) => ({
        ...post,
        comments: post.comments?.some((comment) => comment.comment_id === savedComment.comment_id)
          ? post.comments
          : [...(post.comments || []), savedComment],
      }));
      setReplyText((current) => ({ ...current, [postId]: "" }));
      setReplyImages(prev => ({ ...prev, [postId]: [] }));
      showSuccessToast("Reply posted successfully!");
    } catch (error) {
      console.error("Error posting reply:", error);
      showErrorToast("Failed to post reply. Please try again.");
      return;
    }
  };

  const handleCommentReply = async (postId: string, parentCommentId: string) => {
    const replyContent = replyCommentText.trim();
    const replyImageList = commentReplyImages;

    if (!replyContent && replyImageList.length === 0) return;

    const currentPost = groupDiscussions.find((post) => String(post._id) === postId);
    
    if (!currentPost) {
      showErrorToast("Post not found");
      return;
    }

    const newComment: Comment = {
      comment: replyContent || "",
      comment_reference_id: parentCommentId,
      attachments: replyImageList.map(img => ({ file_path: img.url || img.preview })),
    } as Comment;

    try {
      const response = await api.post(`api/forum/discussions/${currentPost._id}/comments`, newComment);
      
      if (response.status !== 201) {
        showErrorToast("Failed to post reply. Please try again.");
        return;
      }
      
      const savedComment = response.data;
      console.log("Saved comment reply:", savedComment);
      
      updatePostLists(postId, (post) => ({
        ...post,
        comments: post.comments?.some((comment) => comment.comment_id === savedComment.comment_id)
          ? post.comments
          : [...(post.comments || []), savedComment],
      }));
      setReplyCommentText("");
      setCommentReplyImages([]);
      setReplyingTo(null);
      showSuccessToast("Reply posted successfully!");
    } catch (error) {
      console.error("Error posting reply:", error);
      showErrorToast("Failed to post reply. Please try again.");
      return;
    }
  };

  const handleCommentReplyImageUpload = async (files: FileList | null) => {
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

    setCommentReplyImages(prev => [...prev, ...newImages]);
    setCommentReplyUploading(true);

    for (const image of newImages) {
      try {
        const key = await uploadForumCommentImage(image.file!);
        setCommentReplyImages(prev =>
          prev.map(img =>
            img.id === image.id ? { ...img, uploading: false, url: key } : img
          )
        );
      } catch (error) {
        console.error("Error uploading reply image:", error);
        setCommentReplyImages(prev => prev.filter(img => img.id !== image.id));
        showErrorToast(`Failed to upload ${image.file?.name || "image"}`);
      }
    }
    setCommentReplyUploading(false);
  };

  const removeCommentReplyImage = (imageId: string) => {
    const image = commentReplyImages.find(img => img.id === imageId);
    if (image && image.preview.startsWith('blob:')) {
      URL.revokeObjectURL(image.preview);
    }
    setCommentReplyImages(prev => prev.filter(img => img.id !== imageId));
  };

  const handleReplyClick = (postId: string, commentId: string, authorName: string, authorId: number) => {
    setReplyingTo({ commentId, authorName, authorId });
    setReplyCommentText("");
    setCommentReplyImages([]);
  };

  const handleEditComment = async (postId: string, commentId: string, newText: string) => {
    try {
      await api.patch(`api/forum/discussions/${postId}/comments/${commentId}`, {
        comment: { action: "edit", comment: newText },
      });
      updatePostLists(postId, (post) => ({
        ...post,
        comments: post.comments.map((comment) =>
          comment.comment_id === commentId
            ? {
                ...comment,
                comment: newText,
                is_edited: true,
                updated_at: new Date().toISOString(),
              }
            : comment
        ),
      }));
      showSuccessToast("Comment edited successfully");
    } catch (error) {
      console.error("Error editing comment:", error);
      showErrorToast("Failed to edit comment");
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    try {
      await api.patch(`api/forum/discussions/${postId}/comments/${commentId}`, {
        softDelete: true,
      });
      updatePostLists(postId, (post) => ({
        ...post,
        comments: post.comments.map((comment) =>
          comment.comment_id === commentId
            ? {
                ...comment,
                comment: "[deleted]",
                attachments: [],
                deleted_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
            : comment
        ),
      }));
      showSuccessToast("Comment deleted successfully");
    } catch (error) {
      console.error("Error deleting comment:", error);
      showErrorToast("Failed to delete comment");
    }
  };

  // ==================== LIKE HANDLERS ====================
  const handleLikePost = async (postId: string) => {
    const currentPost = displayPosts.find(p => p.id === postId);
    if (!currentPost) return;
    
    const isCurrentlyLiked = currentPost.isLiked;
    
    updatePostLists(postId, (post) => ({
      ...post,
      likes: isCurrentlyLiked
        ? post.likes.filter(like => like.user_id !== currentUserId)
        : [...post.likes, { user_id: currentUserId }],
    }));
    
    try {
      const payload = isCurrentlyLiked 
        ? { likes: { action: 'remove' } }
        : { likes: {} };
      
      await api.patch(`api/forum/discussions/${currentPost._id}`, payload);
    } catch (error) {
      console.error("Error liking post:", error);
      updatePostLists(postId, (post) => ({
        ...post,
        likes: isCurrentlyLiked
          ? [...post.likes, { user_id: currentUserId }]
          : post.likes.filter(like => like.user_id !== currentUserId),
      }));
      showErrorToast("Failed to update like status");
    }
  };

  const handleLikeComment = async (postId: string, commentId: string) => {
    const currentPost = groupDiscussions.find((post) => String(post._id) === postId);
    const currentComment = currentPost?.comments?.find(c => c.comment_id === commentId);
    if (!currentComment) return;
    
    const isCurrentlyLiked = currentComment.likes?.some(like => like.user_id === currentUserId) || false;
    
    updatePostLists(postId, (post) => {
          const updatedComments = post.comments.map(comment => {
            if (comment.comment_id === commentId) {
              if (isCurrentlyLiked) {
                return {
                  ...comment,
                  likes: comment.likes.filter(like => like.user_id !== currentUserId)
                };
              } else {
                return {
                  ...comment,
                  likes: [...comment.likes, { user_id: currentUserId }]
                };
              }
            }
            return comment;
          });
          return { ...post, comments: updatedComments };
    });
    
    try {
      const payload = isCurrentlyLiked
        ? { likes: { action: 'remove' } }
        : { likes: {} };
      
      await api.patch(`api/forum/discussions/${currentPost._id}/comments/${commentId}`, payload);
    } catch (error) {
      console.error("Error liking comment:", error);
      updatePostLists(postId, (post) => {
            const revertedComments = post.comments.map(comment => {
              if (comment.comment_id === commentId) {
                if (isCurrentlyLiked) {
                  return {
                    ...comment,
                    likes: [...comment.likes, { user_id: currentUserId }]
                  };
                } else {
                  return {
                    ...comment,
                    likes: comment.likes.filter(like => like.user_id !== currentUserId)
                  };
                }
              }
              return comment;
            });
            return { ...post, comments: revertedComments };
      });
      showErrorToast("Failed to update like status");
    }
  };

  // ==================== SAVE POST ====================
  const handleSavePost = async (postId: string) => {
    const currentPost = displayPosts.find(p => p.id === postId);
    if (!currentPost) return;
    
    const isCurrentlySaved = currentPost.isSaved;
    
    updatePostLists(postId, (post) => ({
      ...post,
      saves: isCurrentlySaved
        ? post.saves.filter(save => save.user_id !== currentUserId)
        : [...post.saves, { user_id: currentUserId }],
    }));
    
    try {
      const payload = isCurrentlySaved 
        ? { saves: { action: 'remove' } }
        : { saves: {} };
      
      const response = await api.patch(`api/forum/discussions/${currentPost._id}`, payload);
      updatePostLists(postId, () => response.data as Post);
      if (isCurrentlySaved && activeTab === "saved") {
        setSavedDiscussions((posts) => posts.filter((post) => String(post._id) !== postId));
      } else if (!isCurrentlySaved) {
        setSavedDiscussions((posts) =>
          posts.some((post) => String(post._id) === postId) ? posts : [response.data as Post, ...posts]
        );
      }
      
      showSuccessToast(isCurrentlySaved ? "Post removed from saved" : "Post saved");
    } catch (error) {
      console.error("Error saving post:", error);
      updatePostLists(postId, (post) => ({
        ...post,
        saves: isCurrentlySaved
          ? [...post.saves, { user_id: currentUserId }]
          : post.saves.filter(save => save.user_id !== currentUserId),
      }));
      showErrorToast("Failed to update save status");
    }
  };

  // ==================== CREATE/EDIT/DELETE POST ====================
  const handleCreatePost = async (postData: {
    title: string;
    content: string;
    groupId: string;
    tags: { tag_id: number; tag_name: string }[];
    imageKeys?: string[];
  }) => {
    const forum_group_id = postData.groupId;
    
    try {
      const response = await api.post(`api/forum/discussions`, {
        title: postData.title,
        content: postData.content,
        forum_group_id,
        tags: postData.tags,
        imageKeys: postData.imageKeys || [],
      });
      
      if (response.status !== 201) {
        showErrorToast("Failed to create post. Please try again.");
        return;
      }
      
      const newPost = response.data as Post;
      
      setGroupDiscussions((posts) =>
        posts.some((post) => String(post._id) === String(newPost._id)) ? posts : [newPost, ...posts]
      );
      setMyDiscussionPosts((posts) =>
        posts.some((post) => String(post._id) === String(newPost._id)) ? posts : [newPost, ...posts]
      );
      showSuccessToast(`"${postData.title}" posted successfully!`);
    } catch (error) {
      console.error(error);
      showErrorToast("Failed to create post. Please try again.");
      throw error;
    }
  };

  const handleEditPost = async (postId: string, updatedData: {
    title: string;
    content: string;
    tags: { tag_id: number; tag_name: string }[];
    images?: ImageAttachment[];
    imageKeys?: string[];
  }) => {
    try {
      const response = await api.patch(`api/forum/discussions/${postId}`, {
        title: updatedData.title,
        content: updatedData.content,
        tags: updatedData.tags,
        imageKeys: updatedData.imageKeys || [],
      });
      const updatedPost = response.data as Post;
      updatePostLists(postId, () => updatedPost);
      showSuccessToast("Post updated successfully!");
      setEditingPost(null);
      setPostMenuOpen(null);
    } catch (error) {
      console.error("Error updating post:", error);
      showErrorToast("Failed to update post");
    }
  };

  const handleDeletePost = async () => {
    if (!deletingPost?._id) return;

    try {
      await api.delete(`api/forum/discussions/${deletingPost._id}`);
      removePostFromLists(String(deletingPost._id));
      showSuccessToast(`"${deletingPost.title}" has been deleted`);
      if (expandedPostId === deletingPost.id) setExpandedPostId(null);
    } catch (error) {
      console.error("Error deleting post:", error);
      showErrorToast("Failed to delete post");
    } finally {
      setDeletingPost(null);
    }
  };

  const handleActionClick = useCallback(() => {
    if (activeTab === "groups" || activeTab === "my-groups") {
      setIsCreateGroupOpen(true);
    } else {
      setIsNewDiscussionOpen(true);
    }
  }, [activeTab]);

  // ==================== RENDER HELPERS ====================
  const renderFilterSidebar = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsFilterVisible(!isFilterVisible)}
          className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-white/15 bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-3 py-1.5 text-sm text-gray-500 dark:text-zinc-400 transition hover:border-white/30 hover:text-gray-900 dark:text-white"
        >
          <Filter className="h-4 w-4" />
          {isFilterVisible ? "Hide Filters" : "Show Filters"}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isFilterVisible ? "rotate-180" : ""}`} />
        </button>

        {selectedGroupIds.length !== joinedGroups.length && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-zinc-500">{Math.abs(selectedGroupIds.length - joinedGroups.length)}</span>
            <button onClick={clearAllGroups} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300">
              <X className="h-3 w-3" />
              Clear
            </button>
          </div>
        )}
      </div>

      {isFilterVisible && (
        <div className="space-y-4 animate-slide-in">
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-linear-to-br from-white/5 to-transparent p-4 backdrop-blur-sm">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">My Groups</h3>
              <div className="flex gap-2">
                <button onClick={selectAllGroups} className="text-[10px] text-blue-400 hover:text-blue-300">Select All</button>
                <button onClick={clearAllGroups} className="text-[10px] text-red-400 hover:text-red-300">Clear</button>
              </div>
            </div>
            <p className="mb-3 text-[11px] text-gray-500 dark:text-zinc-500">Show discussions from selected groups</p>
            <div className="flex flex-wrap gap-2">
              {availableFilterGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => toggleGroupFilter(group.id)}
                  className={`rounded-full px-3 py-1 text-xs transition-all duration-200 ${
                    selectedGroupIds.includes(group.id)
                      ? "bg-blue-500 text-gray-900 dark:text-white shadow-lg shadow-blue-500/25"
                      : "border border-gray-200 dark:border-white/15 bg-white dark:bg-white/5 shadow-sm dark:shadow-none text-gray-500 dark:text-zinc-400 hover:border-white/30 hover:text-gray-900 dark:text-white"
                  }`}
                >
                  {group.group_name}
                </button>
              ))}
              {availableFilterGroups.length === 0 && (
                <p className="text-xs text-gray-500 dark:text-zinc-500">You haven't joined any groups yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-linear-to-br from-white/5 to-transparent p-4 backdrop-blur-sm">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Sort By</h3>
            <p className="mb-3 text-[11px] text-gray-500 dark:text-zinc-500">Order discussions</p>
            <div className="flex flex-wrap gap-2">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSortBy(option.value)}
                  className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs transition-all duration-200 ${
                    sortBy === option.value
                      ? "bg-blue-500 text-gray-900 dark:text-white shadow-lg shadow-blue-500/25"
                      : "border border-gray-200 dark:border-white/15 bg-white dark:bg-white/5 shadow-sm dark:shadow-none text-gray-500 dark:text-zinc-400 hover:border-white/30 hover:text-gray-900 dark:text-white"
                  }`}
                >
                  {option.icon}
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderPostCard = (post: any, showGroupName: boolean = true) => {
    const group = groupsList.find((item) => String(item.id) === String(post.forum_group_id));
    const isExpanded = expandedPostId === post.id;
    const isLiked = post.isLiked;
    const isSaved = post.isSaved;

    return (
      <div key={post.id} className="rounded-xl border border-gray-200 dark:border-white/10 bg-gradient-to-br from-white/5 to-transparent p-4 transition hover:border-white/20">
        <div className="flex gap-3">
          <img src={post.authorAvatar} alt={post.author} className="h-10 w-10 rounded-full object-cover ring-2 ring-white/20" />
          <div className="flex-1">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{post.author}</p>
                <span className="text-xs text-gray-500 dark:text-zinc-500">{post.ago}</span>
                {showGroupName && group && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] text-cyan-400">
                    {group.group_name}
                  </span>
                )}
                {post.tagsList && post.tagsList.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {post.tagsList.map((tag: ForumTag, tagIdx: number) => (
                      <span 
                        key={tag.tag_id || tagIdx} 
                        className={`rounded-full px-2 py-0.5 text-[10px] ${getTagColor(tag.tag_id)}`}
                      >
                        {tag.tag_name || `Tag ${tag.tag_id}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {post.user_id === currentUserId ? (
                <div className="relative">
                  <button
                    onClick={() => setPostMenuOpen(postMenuOpen === post.id ? null : post.id)}
                    className="rounded-lg p-1 text-gray-500 dark:text-zinc-500 transition hover:bg-gray-100 dark:bg-white/10 hover:text-gray-900 dark:text-white"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {postMenuOpen === post.id && (
                    <div className="absolute right-0 mt-1 w-36 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-xl overflow-hidden z-20">
                      <button
                        onClick={() => {
                          setEditingPost(post);
                          setPostMenuOpen(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-zinc-300 transition hover:bg-gray-100 dark:bg-white/10"
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
              ) : (
                <button onClick={() => setReportingPost(post)} className="text-xs text-gray-500 dark:text-zinc-500 hover:text-red-400">
                  Report
                </button>
              )}
            </div>

            <h3 className="mt-1 text-base font-semibold text-gray-900 dark:text-white">{post.title}</h3>

            <div className="mt-2 text-sm text-gray-600 dark:text-zinc-300 prose prose-invert prose-sm max-w-none break-words">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                {post.content}
              </ReactMarkdown>
            </div>

            <ImageGallery attachments={post.attachments} imageKeys={post.imageKeys} />

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
              <button
                onClick={() => toggleExpand(post.id)}
                className="inline-flex items-center gap-1 text-gray-500 dark:text-zinc-500 transition hover:text-gray-900 dark:text-white"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>{post.commentCount} replies</span>
                {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>

              <button
                onClick={() => handleLikePost(post.id)}
                className={`inline-flex items-center gap-1 transition-all duration-200 ${
                  isLiked 
                    ? "text-red-400 hover:text-red-300" 
                    : "text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:text-white"
                }`}
                type="button"
              >
                <Heart className={`h-3.5 w-3.5 transition-all ${isLiked ? "fill-red-400" : ""}`} />
                <span>{post.likeCount} likes</span>
              </button>

              <button
                onClick={() => handleSavePost(post.id)}
                className={`inline-flex items-center gap-1 transition-all duration-200 ${
                  isSaved 
                    ? "text-yellow-400 hover:text-yellow-300" 
                    : "text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:text-white"
                }`}
                type="button"
              >
                <Bookmark className={`h-3.5 w-3.5 transition-all ${isSaved ? "fill-yellow-400" : ""}`} />
                <span>{isSaved ? "Saved" : "Save"}</span>
              </button>
            </div>

            {isExpanded && (
              <div className="mt-4 border-t border-gray-200 dark:border-white/10 pt-4">
                <div className="space-y-4">
                  {post.commentTree && post.commentTree.length > 0 ? (
                    post.commentTree.map((comment: Comment, commentIndex: number) => (
                      <CommentItem
                        key={comment.comment_id}
                        comment={comment}
                        postId={post.id}
                        membersDetails={membersDetailsMap}
                        onLike={handleLikeComment}
                        onReply={handleReplyClick}
                        onEditComment={handleEditComment}
                        onDeleteComment={handleDeleteComment}
                        replyingTo={replyingTo}
                        setReplyingTo={setReplyingTo}
                        replyText={replyCommentText}
                        setReplyText={setReplyCommentText}
                        onSendReply={handleCommentReply}
                        replyImages={commentReplyImages}
                        onReplyImageUpload={handleCommentReplyImageUpload}
                        onRemoveReplyImage={removeCommentReplyImage}
                        isUploading={commentReplyUploading}
                        currentUserId={currentUserId}
                        currentUserName={currentUserName}
                        currentUserAvatar={currentUserAvatar}
                        isLastInThread={commentIndex === post.commentTree.length - 1}
                      />
                    ))
                  ) : (
                    <p className="text-center text-sm text-gray-500 dark:text-zinc-500">No comments yet.</p>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
                  <ReplyInput
                    replyText={replyText[post.id] || ""}
                    updateReplyText={(text) => updateReplyText(post.id, text)}
                    handleReply={() => handleReply(post.id)}
                    uploadImages={(files) => handleReplyImageUpload(post.id, files)}
                    images={replyImages[post.id] || []}
                    removeImage={(imageId) => removeReplyImage(post.id, imageId)}
                    isUploading={replyUploading[post.id] || false}
                    currentUserAvatar={currentUserAvatar}
                    placeholder="Write a comment..."
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderGroupsGrid = () => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {visibleGroups.map((group) => (
        <div
          key={group.id}
          onClick={() => navigate(`/forums/group/${group.id}`)}
          className="group relative cursor-pointer overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-linear-to-br from-white/5 to-transparent transition-all duration-300 hover:scale-[1.02] hover:border-white/20 hover:bg-gray-100 dark:bg-white/10"
        >
          {group.image_url ? (
            <img src={`${import.meta.env.VITE_CLOUDFRONT_URL}/${group.image_url}`} alt={group.group_name} className="h-24 w-full object-cover" />
          ) : (
            <div className={`h-24 bg-linear-to-r ${group.gradient}`} />
          )}
          <div className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-gray-500 dark:text-zinc-500">Forum Group</p>
                <h3 className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{group.group_name}</h3>
              </div>
              {!group.joined ? (
                <button
                  className="flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-400 transition hover:bg-blue-500/30 hover:scale-105 disabled:opacity-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    joinGroup(group.id);
                  }}
                  disabled={joiningGroupId === group.id}
                >
                  {joiningGroupId === group.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <UserPlus className="h-3 w-3" />
                  )}
                  Join
                </button>
              ) : (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400">
                  <CheckCircle className="h-3 w-3" />
                  Joined
                </span>
              )}
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-zinc-400">{group.content}</p>
            <div className="mt-2 flex items-center gap-2">
              <Users className="h-3 w-3 text-gray-500 dark:text-zinc-500" />
              <p className="text-xs text-gray-500 dark:text-zinc-500">{group.members?.length || 0} members</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {group.tags?.slice(0, 3).map((tag) => (
                <span key={tag.tag_id} className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[9px] text-blue-400">{tag.tag}</span>
              ))}
              {group.tags?.length > 3 && (
                <span className="rounded-full bg-gray-100 dark:bg-white/10 px-2 py-0.5 text-[9px] text-gray-500 dark:text-zinc-400">+{group.tags.length - 3}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderEmptyState = (icon: React.ReactNode, title: string, message: string, buttonText?: string, onButtonClick?: () => void) => (
    <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none p-12 text-center">
      {icon}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">{message}</p>
      {buttonText && onButtonClick && (
        <button onClick={onButtonClick} className="mt-4 rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-gray-900 dark:text-white transition hover:bg-blue-600">
          {buttonText}
        </button>
      )}
    </div>
  );

  // ==================== LOADING STATE ====================
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-base">
        <UserHeader pageTitle="Forums" credits={1250} />
        <div className="mx-auto max-w-7xl p-6 md:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-100 dark:bg-white/10" />
              <div className="mt-1 h-4 w-64 animate-pulse rounded-lg bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
            </div>
          </div>
          <div className="mb-6 flex justify-end">
            <div className="h-10 w-36 animate-pulse rounded-full bg-gray-100 dark:bg-white/10" />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
            <div><div className="space-y-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none p-4">
              <div className="mb-2 h-5 w-24 animate-pulse rounded bg-gray-100 dark:bg-white/10" />
              <div className="mb-3 h-3 w-32 animate-pulse rounded bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-7 w-16 animate-pulse rounded-full bg-gray-100 dark:bg-white/10" />
                ))}
              </div>
            </div></div>
            <div>
              <div className="mb-4 h-10 w-full animate-pulse rounded-full bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
              <div className="mb-4 flex gap-2 border-b border-gray-200 dark:border-white/10 pb-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-gray-100 dark:bg-white/10" />
                ))}
              </div>
              <div className="mb-4 h-4 w-48 animate-pulse rounded bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none p-4">
                    <div className="flex gap-3">
                      <div className="h-10 w-10 animate-pulse rounded-full bg-gray-100 dark:bg-white/10" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-32 animate-pulse rounded bg-gray-100 dark:bg-white/10" />
                          <div className="h-3 w-20 animate-pulse rounded bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
                        </div>
                        <div className="mt-2 h-5 w-3/4 animate-pulse rounded bg-gray-100 dark:bg-white/10" />
                        <div className="mt-2 space-y-2">
                          <div className="h-4 w-full animate-pulse rounded bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
                          <div className="h-4 w-2/3 animate-pulse rounded bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
                        </div>
                        <div className="mt-3 flex gap-4">
                          <div className="h-6 w-16 animate-pulse rounded-full bg-gray-100 dark:bg-white/10" />
                          <div className="h-4 w-20 animate-pulse rounded bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
                          <div className="h-4 w-16 animate-pulse rounded bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
                          <div className="h-4 w-12 animate-pulse rounded bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== MAIN RENDER ====================
  const feedBlocked = activeTab === "feed" && selectedGroupIds.length === 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-base">
      <UserHeader pageTitle="Forums" credits={1250} />

      <div className="mx-auto max-w-7xl p-6 md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Community Forums</h1>
            <p className="text-sm text-gray-500 dark:text-zinc-400">Live forum groups and discussions from the backend</p>
          </div>
        </div>

        <div className="mb-6 flex justify-end">
          <button
            type="button"
            onClick={handleActionClick}
            className="group flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95"
          >
            <PlusCircle className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
            {activeTab === "groups" || activeTab === "my-groups" ? "Create a Group" : "New Discussion"}
          </button>
        </div>

        <div className={`grid grid-cols-1 gap-6 ${activeTab === "feed" && isFilterVisible ? "lg:grid-cols-[280px_1fr]" : "lg:grid-cols-1"}`}>
          {activeTab === "feed" && (
            <div>
              {renderFilterSidebar()}
            </div>
          )}

          <div className={activeTab === "feed" ? "" : "mx-auto w-full max-w-4xl"}>
            <div className="mb-4 flex items-center gap-2 rounded-full border border-gray-200 dark:border-white/15 bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-3 py-1.5">
              <Search className="h-4 w-4 text-gray-500 dark:text-zinc-500" />
              <input
                className="w-full bg-transparent text-sm text-gray-900 dark:text-white outline-none placeholder:text-gray-500 dark:text-zinc-500"
                placeholder="Search discussions or groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:text-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-gray-200 dark:border-white/10 pb-3">
              {tabOptions.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.key);
                    setSearchQuery("");
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                    activeTab === tab.key
                      ? "bg-blue-500 text-gray-900 dark:text-white shadow-lg shadow-blue-500/25"
                      : "border border-gray-200 dark:border-white/15 bg-white dark:bg-white/5 shadow-sm dark:shadow-none text-gray-500 dark:text-zinc-400 hover:border-white/30 hover:text-gray-900 dark:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {(activeTab === "groups" || activeTab === "my-groups") && (
              <>
                {visibleGroups.length === 0 ? (
                  renderEmptyState(
                    <Users className="mb-3 h-8 w-8 text-gray-500 dark:text-zinc-500" />,
                    "No groups found",
                    searchQuery ? `No groups matching "${searchQuery}"` : "No groups available",
                    activeTab === "my-groups" ? "Browse Groups" : undefined,
                    activeTab === "my-groups" ? () => setActiveTab("groups") : undefined
                  )
                ) : (
                  <>
                    {searchQuery && (
                      <p className="mb-3 text-sm text-gray-500 dark:text-zinc-500">Found {visibleGroups.length} group{visibleGroups.length !== 1 ? "s" : ""} matching "{searchQuery}"</p>
                    )}
                    {renderGroupsGrid()}
                  </>
                )}
              </>
            )}

            {activeTab === "feed" && (
              <div className="space-y-4">
                {feedBlocked ? (
                  renderEmptyState(
                    <Users className="mb-3 h-8 w-8 text-gray-500 dark:text-zinc-500" />,
                    "No groups selected",
                    "Select at least one group from the filters to see its discussions",
                    "Select All My Groups",
                    selectAllGroups
                  )
                ) : displayPosts.length === 0 ? (
                  renderEmptyState(
                    <MessageCircle className="mb-3 h-8 w-8 text-gray-500 dark:text-zinc-500" />,
                    searchQuery ? "No matching discussions" : "No discussions yet",
                    searchQuery ? `No discussions found matching "${searchQuery}"` : "Start a discussion in one of your selected groups",
                    !searchQuery ? "Create Discussion" : undefined,
                    !searchQuery ? () => setIsNewDiscussionOpen(true) : undefined
                  )
                ) : (
                  <>
                    <p className="text-sm text-gray-500 dark:text-zinc-500">
                      {searchQuery 
                        ? `Found ${displayPosts.length} discussion${displayPosts.length !== 1 ? "s" : ""} matching "${searchQuery}"` 
                        : `Showing ${displayPosts.length} discussions from your joined groups`}
                    </p>
                    {displayPosts.map((post) => renderPostCard(post, true))}
                  </>
                )}
              </div>
            )}

            {activeTab === "my-discussions" && (
              <div className="space-y-4">
                {displayPosts.length === 0 ? (
                  renderEmptyState(
                    <MessageCircle className="mb-3 h-8 w-8 text-gray-500 dark:text-zinc-500" />,
                    searchQuery ? "No matching discussions" : "No discussions yet",
                    searchQuery ? `No discussions found matching "${searchQuery}"` : "Start a new discussion in one of your groups!",
                    !searchQuery ? "Create Discussion" : undefined,
                    !searchQuery ? () => setIsNewDiscussionOpen(true) : undefined
                  )
                ) : (
                  <>
                    <p className="text-sm text-gray-500 dark:text-zinc-500">
                      {searchQuery 
                        ? `Found ${displayPosts.length} discussion${displayPosts.length !== 1 ? "s" : ""} matching "${searchQuery}"` 
                        : `Showing ${displayPosts.length} discussions created by you`}
                    </p>
                    {displayPosts.map((post) => renderPostCard(post, true))}
                  </>
                )}
              </div>
            )}

            {activeTab === "saved" && (
              <div className="space-y-4">
                {displayPosts.length === 0 ? (
                  renderEmptyState(
                    <Bookmark className="mb-3 h-8 w-8 text-gray-500 dark:text-zinc-500" />,
                    searchQuery ? "No matching saved discussions" : "No saved discussions yet",
                    searchQuery ? `No saved discussions found matching "${searchQuery}"` : "Bookmark discussions to see them here"
                  )
                ) : (
                  <>
                    <p className="text-sm text-gray-500 dark:text-zinc-500">
                      {searchQuery 
                        ? `Found ${displayPosts.length} saved discussion${displayPosts.length !== 1 ? "s" : ""} matching "${searchQuery}"` 
                        : `${displayPosts.length} saved discussion${displayPosts.length !== 1 ? "s" : ""}`}
                    </p>
                    {displayPosts.map((post) => renderPostCard(post, true))}
                  </>
                )}
              </div>
            )}

            {["feed", "my-discussions", "saved"].includes(activeTab) && !feedBlocked && (
              <div ref={feedSentinelRef} className="flex min-h-12 items-center justify-center py-4 text-sm text-gray-500 dark:text-zinc-500">
                {loadingMore ? <Loader2 className="h-5 w-5 animate-spin" /> : hasMore ? "Scroll for more" : ""}
              </div>
            )}
          </div>
        </div>
      </div>

      <NewDiscussionModal
        isOpen={isNewDiscussionOpen}
        onClose={() => setIsNewDiscussionOpen(false)}
        onCreatePost={handleCreatePost}
        availableGroups={joinedGroups.map((group) => ({ id: group.id, name: group.group_name, tags: group.tags }))}
        loadJoinedGroups
      />

      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => {
          setIsCreateGroupOpen(false);
          refreshForumData();
        }}
      />

      <EditPostModal
        isOpen={!!editingPost}
        onClose={() => setEditingPost(null)}
        onSave={handleEditPost}
        post={editingPost ? { 
          id: String(editingPost._id),
          title: editingPost.title, 
          content: editingPost.content, 
          tags: editingPost.tags.map((tag) => ({
            tag_id: tag.tag_id,
            tag_name: tag.tag_name || "",
          })),
          images: editingPost.attachments.map(a => ({ id: a.file_path, preview: a.file_path })),
          imageKeys: editingPost.imageKeys || [],
        } : null}
        availableTags={groupsList
          .find((group) => String(group.id) === String(editingPost?.forum_group_id))
          ?.tags.map((tag) => ({ tag_id: tag.tag_id, tag_name: tag.tag })) || []}
      />

      <DeletePostModal
        isOpen={!!deletingPost}
        onClose={() => setDeletingPost(null)}
        onConfirm={handleDeletePost}
        postTitle={deletingPost?.title || ""}
      />
      <ReportGroupModal
        isOpen={Boolean(reportingPost)}
        onClose={() => setReportingPost(null)}
        groupName={reportingPost?.title || "Discussion"}
        subjectLabel="Discussion"
        onSubmit={async (reason, description) => {
          if (!reportingPost?._id) return;
          await api.post(`/api/forum/reports/discussions/${reportingPost._id}`, { reason, description });
          setReportingPost(null);
          showSuccessToast("Discussion reported");
        }}
      />

      <style>{`
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default Forums;
