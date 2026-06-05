// src/pages/user/4_forums/SelectedGroup.tsx
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/axios";
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
  Reply,
  ChevronRight,
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
  file_path?: string;
};

// Comment type with Reddit-like structure
type Comment = {
  user_id: number;
  comment: string;
  comment_id: string;
  parent_id: string | null; // Changed from comment_reference_id to parent_id (Reddit style)
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  attachments: {
    file_path: string;
  }[];
  likes: {
    user_id: number;
  }[];
  depth?: number; // Added for UI indentation
  children?: Comment[]; // For building the tree
};

// Post/Discussion type
type Post = {
  _id?: string;
  forum_group_id: number;
  user_id: number;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  tags: {
    forum_tag_id: number;
  }[];
  attachments: {
    file_path: string;
  }[];
  likes: {
    user_id: number;
  }[];
  saves: {
    user_id: number;
  }[];
  comments: Comment[];
};

type Group = {
  _id: string;
  image_url: string;
  group_name: string;
  description: string;
  created_at: string;
  members: {
    joined_at: string;
    role: string;
    userId: number;
  }[];
  tags: string[];
  gradient?: string;
};

type MemberWithDetails = {
  userId: number;
  role: string;
  name: string;
  avatar: string;
  joinedAt: string;
};

// Current user ID (simulated)
const CURRENT_USER_ID = 11;
const CURRENT_USER_NAME = "John Paul Mahilom";
const CURRENT_USER_AVATAR = "https://i.pravatar.cc/150?u=john";

// Helper: Format date to "ago" string
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

// Helper: Render markdown content
const renderMarkdownContent = (content: string) => {
  let html = content
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic text-zinc-300">$1</em>')
    .replace(/```\n(.*?)\n```/gs, '<pre class="rounded-lg bg-black/50 p-3 text-sm text-green-400 overflow-x-auto"><code>$1</code></pre>')
    .replace(/`(.*?)`/g, '<code class="rounded bg-black/50 px-1 py-0.5 text-xs text-green-400">$1</code>')
    .replace(/^- (.*?)$/gm, '<li class="ml-4 text-zinc-300">$1</li>')
    .replace(/^\d+\. (.*?)$/gm, '<li class="ml-4 text-zinc-300 list-decimal">$1</li>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\n/g, '<br />');

  html = html.replace(/(<li[^>]*>.*?<\/li>\n?)+/gs, '<ul class="my-2 space-y-1">$&</ul>');
  return html;
};

// Reddit-style comment tree builder with depth calculation
const buildCommentTree = (comments: Comment[]): Comment[] => {
  if (!comments || comments.length === 0) return [];
  
  // Create a map of comments by ID
  const commentMap = new Map<string, Comment>();
  const rootComments: Comment[] = [];
  
  // First pass: create map and initialize children array
  comments.forEach(comment => {
    commentMap.set(comment.comment_id, { ...comment, children: [] });
  });
  
  // Second pass: build tree structure
  comments.forEach(comment => {
    const commentWithChildren = commentMap.get(comment.comment_id)!;
    if (comment.parent_id && commentMap.has(comment.parent_id)) {
      // This is a reply - add to parent's children
      const parent = commentMap.get(comment.parent_id)!;
      if (!parent.children) parent.children = [];
      parent.children.push(commentWithChildren);
    } else {
      // This is a root comment
      rootComments.push(commentWithChildren);
    }
  });
  
  // Sort root comments by date (oldest first for Reddit-style)
  rootComments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  
  // Sort children by date (oldest first)
  const sortChildren = (comment: Comment) => {
    if (comment.children && comment.children.length > 0) {
      comment.children.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      comment.children.forEach(sortChildren);
    }
  };
  rootComments.forEach(sortChildren);
  
  // Calculate depth for each comment (Reddit-style indentation)
  const calculateDepth = (comment: Comment, depth: number = 0) => {
    comment.depth = depth;
    if (comment.children) {
      comment.children.forEach(child => calculateDepth(child, depth + 1));
    }
  };
  rootComments.forEach(comment => calculateDepth(comment, 0));
  
  return rootComments;
};

// Get indentation class based on depth (Reddit uses 15-20px per level, max 10 levels)
const getDepthClass = (depth: number = 0): string => {
  const maxDepth = 8; // Maximum indentation levels like Reddit
  const effectiveDepth = Math.min(depth, maxDepth);
  
  // Reddit uses about 1rem (16px) per level
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

// Image Gallery Component
const ImageGallery = ({ attachments }: { attachments?: { file_path: string }[] }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!attachments || attachments.length === 0) return null;

  return (
    <>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {attachments.map((attachment, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedImage(attachment.file_path)}
            className="group relative overflow-hidden rounded-lg border border-white/10 bg-white/5 transition-all hover:scale-105 hover:border-white/20"
          >
            <img
              src={attachment.file_path}
              alt={`Post image ${idx + 1}`}
              className="h-32 w-full object-cover transition-all group-hover:scale-110"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://placehold.co/400x300?text=Image+Not+Found";
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
              <ImageIcon className="h-6 w-6 text-white" />
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

// Reply Input Component
const ReplyInput = ({
  replyText,
  updateReplyText,
  handleReply,
  uploadImages,
  images,
  removeImage,
  isUploading,
  placeholder = "Write a reply... (Supports **bold**, *italic*, `code`, and images)"
}: {
  replyText: string;
  updateReplyText: (text: string) => void;
  handleReply: () => void;
  uploadImages: (files: FileList | null) => void;
  images: ImageAttachment[];
  removeImage: (imageId: string) => void;
  isUploading: boolean;
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
        formattedText = selectedText
          ? selectedText.split("\n").map(line => `- ${line}`).join("\n")
          : "- ";
        newCursorPos = start + 2;
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

          {!showPreview ? (
            <textarea
              ref={textareaRef}
              value={replyText}
              onChange={(e) => updateReplyText(e.target.value)}
              placeholder={placeholder}
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

// Reddit-style Comment Component with depth-based indentation
const CommentItem = ({ 
  comment, 
  postId, 
  membersDetails, 
  onLike, 
  onReply, 
  replyingTo, 
  setReplyingTo,
  replyText,
  setReplyText,
  onSendReply,
  replyImages,
  onReplyImageUpload,
  onRemoveReplyImage,
  isUploading,
  isLastInThread = false
}: { 
  comment: Comment;
  postId: number;
  membersDetails: Record<number, { name: string; avatar: string }>;
  onLike: (postId: number, commentId: string) => void;
  onReply: (postId: number, commentId: string, authorName: string, authorId: number) => void;
  replyingTo: { commentId: string; authorName: string; authorId: number } | null;
  setReplyingTo: (value: { commentId: string; authorName: string; authorId: number } | null) => void;
  replyText: string;
  setReplyText: (text: string) => void;
  onSendReply: (postId: number, commentId: string) => void;
  replyImages: ImageAttachment[];
  onReplyImageUpload: (files: FileList | null) => void;
  onRemoveReplyImage: (imageId: string) => void;
  isUploading: boolean;
  isLastInThread?: boolean;
}) => {
  const [showChildren, setShowChildren] = useState(true);
  const commentAuthor = membersDetails[comment.user_id] || { name: "Unknown User", avatar: "https://i.pravatar.cc/150?u=unknown" };
  const isLiked = comment.likes.some(like => like.user_id === CURRENT_USER_ID);
  const hasChildren = comment.children && comment.children.length > 0;
  const childCount = comment.children?.length || 0;
  const depth = comment.depth || 0;
  
  // Reddit-style: Show "continue thread" button after certain depth
  const showContinueThread = depth >= 3 && childCount > 0;
  const depthClass = getDepthClass(depth);

  return (
    <div className={`${depthClass} mt-2 ${!isLastInThread ? "border-l-2 border-white/10 ml-2 pl-2" : ""}`}>
      <div className="flex gap-3 py-2">
        <img
          src={commentAuthor.avatar}
          alt={commentAuthor.name}
          className="h-8 w-8 rounded-full object-cover ring-2 ring-white/20 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-white">{commentAuthor.name}</p>
            <span className="text-xs text-zinc-500">{getTimeAgo(comment.created_at)}</span>
            {depth > 0 && (
              <span className="text-[10px] text-zinc-600">· {depth} level{depth > 1 ? 's' : ''} deep</span>
            )}
          </div>
          
          <div
            className="mt-1 text-sm text-zinc-400 prose prose-invert prose-sm max-w-none break-words"
            dangerouslySetInnerHTML={{ __html: renderMarkdownContent(comment.comment) }}
          />
          
          <ImageGallery attachments={comment.attachments} />
          
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <button
              onClick={() => onLike(postId, comment.comment_id)}
              className={`inline-flex items-center gap-1 text-xs transition ${
                isLiked ? "text-red-400" : "text-zinc-500 hover:text-white"
              }`}
            >
              <Heart className={`h-3 w-3 ${isLiked ? "fill-red-400" : ""}`} />
              <span>{comment.likes.length}</span>
            </button>
            <button
              onClick={() => onReply(postId, comment.comment_id, commentAuthor.name, comment.user_id)}
              className="inline-flex items-center gap-1 text-xs text-zinc-500 transition hover:text-white"
            >
              <Reply className="h-3 w-3" />
              <span>Reply</span>
            </button>
            {hasChildren && !showContinueThread && (
              <button
                onClick={() => setShowChildren(!showChildren)}
                className="inline-flex items-center gap-1 text-xs text-zinc-500 transition hover:text-white"
              >
                <ChevronRight className={`h-3 w-3 transition-transform ${!showChildren ? "rotate-90" : ""}`} />
                <span>{childCount} {childCount === 1 ? 'reply' : 'replies'}</span>
              </button>
            )}
          </div>

          {/* Reply Input */}
          {replyingTo?.commentId === comment.comment_id && (
            <div className="mt-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-blue-400">Replying to @{replyingTo.authorName}</span>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="text-xs text-zinc-500 hover:text-white"
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
                placeholder={`Reply to @${replyingTo.authorName}...`}
              />
            </div>
          )}

          {/* Child Comments - Reddit style continue thread */}
          {hasChildren && showChildren && !showContinueThread && (
            <div className="mt-3">
              {comment.children!.map((child, index) => (
                <CommentItem
                  key={child.comment_id}
                  comment={child}
                  postId={postId}
                  membersDetails={membersDetails}
                  onLike={onLike}
                  onReply={onReply}
                  replyingTo={replyingTo}
                  setReplyingTo={setReplyingTo}
                  replyText={replyText}
                  setReplyText={setReplyText}
                  onSendReply={onSendReply}
                  replyImages={replyImages}
                  onReplyImageUpload={onReplyImageUpload}
                  onRemoveReplyImage={onRemoveReplyImage}
                  isUploading={isUploading}
                  isLastInThread={index === comment.children!.length - 1}
                />
              ))}
            </div>
          )}

          {/* Continue thread button for deep threads (Reddit style) */}
          {showContinueThread && (
            <button
              onClick={() => setShowChildren(!showChildren)}
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

// Dataset 1: Color Grading Discussion
const dataset1Comments: Comment[] = [
  {
    user_id: 205,
    comment: "Try CST first, then primary correction. The Color Space Transform effect in Premiere Pro works great. Convert from S-Log3 to Rec.709, then do your primary corrections.",
    comment_id: "cmt_001",
    parent_id: null,
    created_at: "2026-06-02T10:35:00.000Z",
    updated_at: "2026-06-02T10:35:00.000Z",
    deleted_at: null,
    attachments: [{ file_path: "uploads/comments/example-grade.png" }],
    likes: [{ user_id: 101 }]
  },
  {
    user_id: 101,
    comment: "Thanks! What about the LUT order? Should I apply creative LUTs before or after the CST?",
    comment_id: "cmt_002",
    parent_id: "cmt_001",
    created_at: "2026-06-02T10:40:00.000Z",
    updated_at: "2026-06-02T10:40:00.000Z",
    deleted_at: null,
    attachments: [],
    likes: [{ user_id: 205 }]
  },
  {
    user_id: 205,
    comment: "Apply LUT after CST for best results. This ensures your colors are properly transformed first, then the creative LUT works on the correct color space.",
    comment_id: "cmt_003",
    parent_id: "cmt_002",
    created_at: "2026-06-02T10:45:00.000Z",
    updated_at: "2026-06-02T10:45:00.000Z",
    deleted_at: null,
    attachments: [],
    likes: [{ user_id: 101 }]
  },
  {
    user_id: 101,
    comment: "That makes sense! I'll try that workflow. Also, what about exposure adjustments?",
    comment_id: "cmt_004",
    parent_id: "cmt_003",
    created_at: "2026-06-02T10:50:00.000Z",
    updated_at: "2026-06-02T10:50:00.000Z",
    deleted_at: null,
    attachments: [],
    likes: []
  },
  {
    user_id: 205,
    comment: "Adjust exposure before the CST. Log footage has more latitude in the highlights and shadows, so do your exposure and contrast adjustments in the log space first.",
    comment_id: "cmt_005",
    parent_id: "cmt_004",
    created_at: "2026-06-02T10:55:00.000Z",
    updated_at: "2026-06-02T10:55:00.000Z",
    deleted_at: null,
    attachments: [],
    likes: [{ user_id: 101 }]
  }
];

// Dataset 2: DaVinci Resolve Discussion
const dataset2Comments: Comment[] = [
  {
    user_id: 205,
    comment: "Resolve is definitely superior for color grading. The node-based workflow gives you so much more control. Plus, it's free!",
    comment_id: "cmt_101",
    parent_id: null,
    created_at: "2026-06-03T09:15:00.000Z",
    updated_at: "2026-06-03T09:15:00.000Z",
    deleted_at: null,
    attachments: [],
    likes: [{ user_id: 101 }]
  },
  {
    user_id: 101,
    comment: "I've heard great things about the node system. Is the learning curve steep?",
    comment_id: "cmt_102",
    parent_id: "cmt_101",
    created_at: "2026-06-03T09:20:00.000Z",
    updated_at: "2026-06-03T09:20:00.000Z",
    deleted_at: null,
    attachments: [],
    likes: []
  },
  {
    user_id: 101,
    comment: "Actually, I watched some tutorials and it seems quite intuitive! The node-based approach actually makes more sense than layers.",
    comment_id: "cmt_103",
    parent_id: "cmt_102",
    created_at: "2026-06-03T09:25:00.000Z",
    updated_at: "2026-06-03T09:25:00.000Z",
    deleted_at: null,
    attachments: [],
    likes: [{ user_id: 101 }]
  },
  {
    user_id: 205,
    comment: "The node system is powerful! You can create parallel nodes for different adjustments, it's very flexible. What kind of projects do you usually work on?",
    comment_id: "cmt_104",
    parent_id: "cmt_103",
    created_at: "2026-06-03T09:30:00.000Z",
    updated_at: "2026-06-03T09:30:00.000Z",
    deleted_at: null,
    attachments: [],
    likes: []
  },
  {
    user_id: 101,
    comment: "Mainly commercial work and short films. I think I'll give Resolve a try for my next project!",
    comment_id: "cmt_105",
    parent_id: "cmt_104",
    created_at: "2026-06-03T09:35:00.000Z",
    updated_at: "2026-06-03T09:35:00.000Z",
    deleted_at: null,
    attachments: [],
    likes: [{ user_id: 205 }]
  },
  {
    user_id: 89,
    comment: "Both are great tools. I use Premiere for editing and Resolve for grading. Best of both worlds!",
    comment_id: "cmt_106",
    parent_id: null,
    created_at: "2026-06-03T10:00:00.000Z",
    updated_at: "2026-06-03T10:00:00.000Z",
    deleted_at: null,
    attachments: [],
    likes: [{ user_id: 101 }, { user_id: 205 }]
  },
  {
    user_id: 101,
    comment: "That's a good workflow suggestion! Round-tripping between the two isn't too difficult?",
    comment_id: "cmt_107",
    parent_id: "cmt_106",
    created_at: "2026-06-03T10:05:00.000Z",
    updated_at: "2026-06-03T10:05:00.000Z",
    deleted_at: null,
    attachments: [],
    likes: []
  },
  {
    user_id: 89,
    comment: "Not at all! Export XML from Premiere, import to Resolve, grade, then render. Very straightforward.",
    comment_id: "cmt_108",
    parent_id: "cmt_107",
    created_at: "2026-06-03T10:10:00.000Z",
    updated_at: "2026-06-03T10:10:00.000Z",
    deleted_at: null,
    attachments: [],
    likes: [{ user_id: 101 }]
  },
  {
    user_id: 101,
    comment: "Perfect! I'll try that workflow on my next project. Thanks for the tip!",
    comment_id: "cmt_109",
    parent_id: "cmt_108",
    created_at: "2026-06-03T10:15:00.000Z",
    updated_at: "2026-06-03T10:15:00.000Z",
    deleted_at: null,
    attachments: [],
    likes: [{ user_id: 89 }]
  },
  {
    user_id: 89,
    comment: "You're welcome! Feel free to DM me if you have any questions about the process.",
    comment_id: "cmt_110",
    parent_id: "cmt_109",
    created_at: "2026-06-03T10:20:00.000Z",
    updated_at: "2026-06-03T10:20:00.000Z",
    deleted_at: null,
    attachments: [],
    likes: [{ user_id: 101 }]
  }
];

const dataset1Posts: Post[] = [
  {
    forum_group_id: 1,
    user_id: 101,
    title: "Best workflow for log footage?",
    description: "How do you grade S-Log3 for natural skin tones? I've been struggling with getting accurate skin tones when working with Sony S-Log3 footage. Any workflow suggestions?",
    created_at: "2026-06-02T10:30:00.000Z",
    updated_at: "2026-06-02T10:30:00.000Z",
    deleted_at: null,
    tags: [{ forum_tag_id: 10 }, { forum_tag_id: 11 }],
    attachments: [{ file_path: "uploads/discussions/log-shot-01.jpg" }],
    likes: [{ user_id: 101 }, { user_id: 205 }],
    saves: [{ user_id: 205 }],
    comments: dataset1Comments
  }
];

const dataset2Posts: Post[] = [
  {
    forum_group_id: 1,
    user_id: 101,
    title: "DaVinci Resolve vs Premiere Pro for color grading",
    description: "Which one do you prefer for professional color grading? I've been using Premiere but thinking of switching to Resolve.",
    created_at: "2026-06-03T09:00:00.000Z",
    updated_at: "2026-06-03T09:00:00.000Z",
    deleted_at: null,
    tags: [{ forum_tag_id: 12 }],
    attachments: [],
    likes: [{ user_id: 101 }, { user_id: 205 }, { user_id: 89 }],
    saves: [],
    comments: dataset2Comments
  }
];

const SelectedGroup = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("posts");
  const [group, setGroup] = useState<Group | null>(null);
  const [membersWithDetails, setMembersWithDetails] = useState<MemberWithDetails[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPostId, setExpandedPostId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState<{ [key: number]: string }>({});
  const [replyCommentText, setReplyCommentText] = useState<string>("");
  const [isNewDiscussionOpen, setIsNewDiscussionOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("latest");

  const [showMenu, setShowMenu] = useState(false);
  const [showMemberMenu, setShowMemberMenu] = useState<number | null>(null);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [showEditPermissionsModal, setShowEditPermissionsModal] = useState(false);
  const [showReportGroupModal, setShowReportGroupModal] = useState(false);
  const [showLeaveGroupModal, setShowLeaveGroupModal] = useState(false);
  const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(false);
  const [showReportMemberModal, setShowReportMemberModal] = useState(false);
  const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberWithDetails | null>(null);

  const [postMenuOpen, setPostMenuOpen] = useState<number | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [deletingPost, setDeletingPost] = useState<Post | null>(null);
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());

  const [replyImages, setReplyImages] = useState<{ [key: number]: ImageAttachment[] }>({});
  const [replyUploading, setReplyUploading] = useState<{ [key: number]: boolean }>({});
  
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; authorName: string; authorId: number } | null>(null);
  const [commentReplyImages, setCommentReplyImages] = useState<ImageAttachment[]>([]);
  const [commentReplyUploading, setCommentReplyUploading] = useState(false);

  // Use dataset based on group ID
  const useDataset2 = Number(id) === 1;
  
  const getMemberDetails = (userId: number) => {
    const member = membersWithDetails.find(m => m.userId === userId);
    return {
      name: member?.name || `User ${userId}`,
      avatar: member?.avatar || `https://i.pravatar.cc/150?u=${userId}`,
    };
  };

  const membersDetailsMap = membersWithDetails.reduce((acc, member) => {
    acc[member.userId] = { name: member.name, avatar: member.avatar };
    return acc;
  }, {} as Record<number, { name: string; avatar: string }>);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      const result = await api.get(`api/forum/groups/${id}`);
      if (!result.data) {
        showErrorToast("Group not found");
        navigate("/forums");
        return;
      }
      const mockGroup: Group = result.data;
      const getMemberDetails = await api.post('api/users/list-of-details', { userIds: mockGroup.members.map(m => m.userId) });
      let memberDetailsList = getMemberDetails.data.usersList;
      for(const member of mockGroup.members) { 
        const details = memberDetailsList.find((details: any) => details.user_id === member.userId);
        if (details) {
          details.name = `${details.first_name} ${details.last_name}`;
          details.role = member.role;
          details.avatar = details.avatar_file_id ? `api/files/${details.avatar_file_id}` : `https://i.pravatar.cc/150?u=${details.user_id}`;
          details.joinedAt = member.joined_at;
          details.userId = details.user_id;
          delete details.first_name;
          delete details.last_name;
          delete details.user_id;
          delete details.avatar_file_id;
        }
      }
      
      let mockPosts: Post[] = [];
      if (useDataset2) {
        mockPosts = dataset2Posts.map(post => ({ ...post, forum_group_id: Number(id) }));
      } else {
        mockPosts = dataset1Posts.map(post => ({ ...post, forum_group_id: Number(id) }));
      }

      setGroup(mockGroup);
      setPosts(mockPosts);
      setMembersWithDetails(memberDetailsList);
      setLoading(false);
    };

    fetchData();
  }, [id, useDataset2]);

  const sortOptions = [
    { value: "latest", label: "Latest", icon: <Clock className="h-3 w-3" /> },
    { value: "most-liked", label: "Most Liked", icon: <ThumbsUp className="h-3 w-3" /> },
    { value: "most-commented", label: "Most Commented", icon: <MessageCircle className="h-3 w-3" /> },
  ];

  const displayPosts = posts.map((post, index) => {
    const authorDetails = getMemberDetails(post.user_id);
    const tagName = post.tags.length > 0 ? `Tag ${post.tags[0].forum_tag_id}` : undefined;
    
    return {
      ...post,
      id: index,
      author: authorDetails.name,
      authorAvatar: authorDetails.avatar,
      excerpt: post.description.substring(0, 150) + (post.description.length > 150 ? "..." : ""),
      ago: getTimeAgo(post.created_at),
      tag: tagName,
      likeCount: post.likes.length,
      commentCount: post.comments.length,
      isLiked: post.likes.some(like => like.user_id === CURRENT_USER_ID),
      isSaved: post.saves.some(save => save.user_id === CURRENT_USER_ID),
      commentTree: buildCommentTree(post.comments),
    };
  });

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

    const updatedPosts = [...posts];
    const postIndex = updatedPosts.findIndex((_, idx) => idx === postId);
    
    if (postIndex !== -1) {
      const newComment: Comment = {
        user_id: CURRENT_USER_ID,
        comment: replyContent || "",
        comment_id: `cmt_${Date.now()}_${Math.random()}`,
        parent_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        attachments: replyImageList.map(img => ({ file_path: img.url || img.preview })),
        likes: []
      };
      
      updatedPosts[postIndex].comments.push(newComment);
      setPosts(updatedPosts);
    }

    setReplyText({ ...replyText, [postId]: "" });
    setReplyImages(prev => ({ ...prev, [postId]: [] }));
    showSuccessToast("Reply posted successfully!");
  };

  const handleCommentReply = (postId: number, parentCommentId: string) => {
    const replyContent = replyCommentText.trim();
    const replyImageList = commentReplyImages;

    if (!replyContent && replyImageList.length === 0) return;

    const updatedPosts = [...posts];
    const postIndex = updatedPosts.findIndex((_, idx) => idx === postId);
    
    if (postIndex !== -1) {
      const newComment: Comment = {
        user_id: CURRENT_USER_ID,
        comment: replyContent || "",
        comment_id: `cmt_${Date.now()}_${Math.random()}`,
        parent_id: parentCommentId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        attachments: replyImageList.map(img => ({ file_path: img.url || img.preview })),
        likes: []
      };
      
      updatedPosts[postIndex].comments.push(newComment);
      setPosts(updatedPosts);
    }

    setReplyCommentText("");
    setCommentReplyImages([]);
    setReplyingTo(null);
    showSuccessToast("Reply posted successfully!");
  };

  const updateReplyText = (postId: number, text: string) => {
    setReplyText({ ...replyText, [postId]: text });
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
      await new Promise(resolve => setTimeout(resolve, 500));
      setCommentReplyImages(prev =>
        prev.map(img =>
          img.id === image.id ? { ...img, uploading: false, url: img.preview } : img
        )
      );
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

  const handleLikeComment = (postId: number, commentId: string) => {
    setPosts(prevPosts =>
      prevPosts.map((post, idx) => {
        if (idx === postId) {
          const updatedComments = post.comments.map(comment => {
            if (comment.comment_id === commentId) {
              const isLiked = comment.likes.some(like => like.user_id === CURRENT_USER_ID);
              if (isLiked) {
                return {
                  ...comment,
                  likes: comment.likes.filter(like => like.user_id !== CURRENT_USER_ID)
                };
              } else {
                return {
                  ...comment,
                  likes: [...comment.likes, { user_id: CURRENT_USER_ID }]
                };
              }
            }
            return comment;
          });
          return { ...post, comments: updatedComments };
        }
        return post;
      })
    );
  };

  const handleReplyClick = (postId: number, commentId: string, authorName: string, authorId: number) => {
    setReplyingTo({ commentId, authorName, authorId });
    setReplyCommentText("");
    setCommentReplyImages([]);
  };

  const handleCreatePost = (postData: {
    title: string;
    content: string;
    groupId: number;
    tag: string;
    images?: ImageAttachment[];
  }) => {
    const newPost: Post = {
      forum_group_id: Number(id),
      user_id: CURRENT_USER_ID,
      title: postData.title,
      description: postData.content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      tags: [{ forum_tag_id: 10 }],
      attachments: postData.images?.map(img => ({ file_path: img.preview })) || [],
      likes: [],
      saves: [],
      comments: [],
    };

    setPosts([newPost, ...posts]);
    showSuccessToast(`"${postData.title}" posted successfully!`);
  };

  const handleEditPost = (postId: number, updatedData: { title: string; content: string; tag: string; images?: ImageAttachment[] }) => {
    setPosts(prev => prev.map((post, idx) =>
      idx === postId
        ? {
            ...post,
            title: updatedData.title,
            description: updatedData.content,
            attachments: updatedData.images?.map(img => ({ file_path: img.preview })) || post.attachments,
          }
        : post
    ));
    showSuccessToast("Post updated successfully!");
  };

  const handleDeletePost = () => {
    if (deletingPost) {
      const postIndex = posts.findIndex((_, idx) => idx === deletingPost.id);
      if (postIndex !== -1) {
        const updatedPosts = [...posts];
        updatedPosts.splice(postIndex, 1);
        setPosts(updatedPosts);
      }
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
          prevPosts.map((post, idx) =>
            idx === postId
              ? { ...post, likes: post.likes.filter(like => like.user_id !== CURRENT_USER_ID) }
              : post
          )
        );
      } else {
        newSet.add(postId);
        setPosts(prevPosts =>
          prevPosts.map((post, idx) =>
            idx === postId
              ? { ...post, likes: [...post.likes, { user_id: CURRENT_USER_ID }] }
              : post
          )
        );
      }
      return newSet;
    });
  };

  const handleEditGroup = async(updatedData: { group_name: string; description: string; tags: string[]; gradient: string }) => {
    if (!group) return;
    try {
      const response = await api.put(`api/forum/groups/${group._id}`, updatedData);
      if (response.status === 200) {
        showSuccessToast(`Group "${updatedData.group_name}" updated successfully!`);
        setGroup({
        ...group,
        group_name: updatedData.group_name ?? group.group_name,
        description: updatedData.description ?? group.description,
        tags: updatedData.tags ?? group.tags,
        gradient: updatedData.gradient ?? group.gradient,
      });
      } else { 
        showErrorToast("Failed to update group. Please try again.");
        return;
      }
    }catch (error) {
      showErrorToast("Failed to update group. Please try again.");
      return;
    }
  };

  const handleEditPermissions = (updatedMembers: MemberWithDetails[]) => {
    setMembersWithDetails(updatedMembers);
    showSuccessToast("Permissions updated successfully!");
  };

  const handleReportGroup = (reason: string, description: string) => {
    console.log("Reporting group:", { reason, description });
    showSuccessToast("Group reported successfully. Our team will review it.");
  };

  const handleLeaveGroup = () => {
    console.log("Leaving group:", group?.group_name);
    showSuccessToast(`You have left "${group?.group_name}"`);
    navigate("/forums");
  };

  const handleDeleteGroup = async() => {
    try {
      const response = await api.delete(`api/forum/groups/delete/${group?._id}`);
      if (response.status === 200) {
        showSuccessToast(`Group "${group?.group_name}" has been deleted`);
        navigate("/forums");
      } else {
        showErrorToast("Failed to delete group. Please try again.");
        return;
      }
    }catch (error) {
      showErrorToast("Failed to delete group. Please try again.");
      return;
    }
  };

  const handleReportMember = (reason: string, description: string) => {
    console.log("Reporting member:", selectedMember?.name, { reason, description });
    showSuccessToast(`Report submitted for ${selectedMember?.name}`);
    setSelectedMember(null);
  };

  const handleRemoveMember = () => {
    if (selectedMember && group) {
      setMembersWithDetails(membersWithDetails.filter(m => m.userId !== selectedMember.userId));
      setGroup({
        ...group,
        members: group.members.filter(m => m.userId !== selectedMember.userId),
      });
      showSuccessToast(`${selectedMember.name} has been removed from the group`);
      setSelectedMember(null);
    }
  };

  const isOwner = group?.members.some(m => m.userId === CURRENT_USER_ID && m.role === "Admin") || false;
  const canEditGroup = isOwner;
  const canEditPermissions = isOwner;
  const canRemoveMembers = isOwner;

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
      <UserHeader pageTitle={group.group_name} credits={1250} />

      <div className="mx-auto max-w-7xl p-6 md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate("/forums")}
            className="flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Forums
          </button>

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
        </div>

        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${group.gradient || ' from-purple-600 via-pink-600 to-red-600'} p-8`}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative z-10">
            <div className="flex items-center gap-4">
              {group.image_url && (
                <img 
                  src={group.image_url} 
                  alt={group.group_name}
                  className="h-20 w-20 rounded-xl object-cover ring-2 ring-white/20"
                  onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                />
              )}
              <div>
                <h1 className="text-3xl font-bold text-white">{group.group_name}</h1>
                <p className="mt-2 text-zinc-200 max-w-2xl">{group.description}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-zinc-300">
              <div className="flex items-center gap-1">
                <span>Created at {group.created_at.split('T')[0]}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{group.members.length} members</span>
              </div>
              <div className="flex items-center gap-1">
                <Tag className="h-4 w-4" />
                <span>{group.tags.length} tags</span>
              </div>
            </div>
          </div>
        </div>

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

        <div className="mt-6">
          {activeTab === "posts" && (
            <>
              <div className="mb-6 flex justify-end">
                <button
                  onClick={() => setIsNewDiscussionOpen(true)}
                  className="group flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
                >
                  <PlusCircle className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
                  New Discussion
                </button>
              </div>

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

              <div className="space-y-4">
                {displayPosts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 p-12 text-center">
                    <MessageCircle className="mb-3 h-8 w-8 text-zinc-500" />
                    <h3 className="text-lg font-semibold text-white">No posts yet</h3>
                    <p className="mt-1 text-sm text-zinc-400">Be the first to start a discussion!</p>
                  </div>
                ) : (
                  displayPosts.map((post, idx) => {
                    const isAuthor = post.user_id === CURRENT_USER_ID;
                    const isLiked = likedPosts.has(idx);

                    return (
                      <div key={idx} className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-4 transition hover:border-white/20">
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

                              {isAuthor && (
                                <div className="relative">
                                  <button
                                    onClick={() => setPostMenuOpen(postMenuOpen === idx ? null : idx)}
                                    className="rounded-lg p-1 text-zinc-500 transition hover:bg-white/10 hover:text-white"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </button>
                                  {postMenuOpen === idx && (
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

                            <h3 className="mt-1 text-base font-semibold text-white">{post.title}</h3>

                            <div
                              className="mt-2 text-sm text-zinc-400 prose prose-invert prose-sm max-w-none"
                              dangerouslySetInnerHTML={{ __html: renderMarkdownContent(post.excerpt) }}
                            />

                            <ImageGallery attachments={post.attachments} />

                            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                              <button
                                onClick={() => toggleExpand(idx)}
                                className="inline-flex items-center gap-1 text-zinc-500 transition hover:text-white"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                                <span>{post.commentCount} replies</span>
                                {expandedPostId === idx ? (
                                  <ChevronUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                )}
                              </button>

                              <button
                                onClick={() => handleLikePost(idx)}
                                className={`inline-flex items-center gap-1 transition-all duration-200 ${
                                  isLiked 
                                    ? "text-red-400 hover:text-red-300" 
                                    : "text-zinc-500 hover:text-white"
                                }`}
                                type="button"
                              >
                                <Heart className={`h-3.5 w-3.5 transition-all ${isLiked ? "fill-red-400" : ""}`} />
                                <span>{post.likeCount} likes</span>
                              </button>

                              <button className="inline-flex items-center gap-1 text-zinc-500 transition hover:text-white">
                                <Bookmark className="h-3.5 w-3.5" />
                                <span>Save</span>
                              </button>
                            </div>

                            {expandedPostId === idx && (
                              <div className="mt-4 border-t border-white/10 pt-4">
                                <div className="space-y-4">
                                  {post.commentTree && post.commentTree.length > 0 ? (
                                    post.commentTree.map((comment, commentIndex) => (
                                      <CommentItem
                                        key={comment.comment_id}
                                        comment={comment}
                                        postId={idx}
                                        membersDetails={membersDetailsMap}
                                        onLike={handleLikeComment}
                                        onReply={handleReplyClick}
                                        replyingTo={replyingTo}
                                        setReplyingTo={setReplyingTo}
                                        replyText={replyCommentText}
                                        setReplyText={setReplyCommentText}
                                        onSendReply={handleCommentReply}
                                        replyImages={commentReplyImages}
                                        onReplyImageUpload={handleCommentReplyImageUpload}
                                        onRemoveReplyImage={removeCommentReplyImage}
                                        isUploading={commentReplyUploading}
                                        isLastInThread={commentIndex === post.commentTree.length - 1}
                                      />
                                    ))
                                  ) : (
                                    <p className="text-center text-sm text-zinc-500">No comments yet.</p>
                                  )}
                                </div>

                                <div className="mt-4 pt-4 border-t border-white/10">
                                  <ReplyInput
                                    replyText={replyText[idx] || ""}
                                    updateReplyText={(text) => updateReplyText(idx, text)}
                                    handleReply={() => handleReply(idx)}
                                    uploadImages={(files) => handleReplyImageUpload(idx, files)}
                                    images={replyImages[idx] || []}
                                    removeImage={(imageId) => removeReplyImage(idx, imageId)}
                                    isUploading={replyUploading[idx] || false}
                                    placeholder="Write a comment..."
                                  />
                                </div>
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

          {activeTab === "members" && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {membersWithDetails.map((member) => (
                <div key={member.userId} className="flex items-center gap-3 rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-4">
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="h-12 w-12 rounded-full object-cover ring-2 ring-white/20"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{member.name}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-zinc-500">Joined {new Date(member.joinedAt).toLocaleDateString()}</p>
                      {member.role === "Admin" && (
                        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-400">Admin</span>
                      )}
                    </div>
                  </div>

                  {member.userId !== CURRENT_USER_ID && (
                    <div className="relative">
                      <button
                        onClick={() => setShowMemberMenu(showMemberMenu === member.userId ? null : member.userId)}
                        className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {showMemberMenu === member.userId && (
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
                            {canRemoveMembers && member.role !== "Admin" && (
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

          {activeTab === "about" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6">
                <h3 className="text-lg font-semibold text-white">About this group</h3>
                <p className="mt-2 text-zinc-400">{group.description}</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6">
                <h3 className="text-lg font-semibold text-white">Tags</h3>
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
                    <span className="text-zinc-500">Total Members</span>
                    <span className="text-white">{group.members.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Total Tags</span>
                    <span className="text-white">{group.tags.length}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <NewDiscussionModal
        isOpen={isNewDiscussionOpen}
        onClose={() => setIsNewDiscussionOpen(false)}
        onCreatePost={handleCreatePost}
        availableGroups={[{ id: Number(id), name: group.group_name }]}
      />

      <EditGroupModal
        isOpen={showEditGroupModal}
        onClose={() => setShowEditGroupModal(false)}
        group={{ id: group._id, name: group.group_name, description: group.description, tags: group.tags, gradient: "from-purple-600 via-pink-600 to-red-600" }}
        onSave={handleEditGroup}
      />

      <EditGroupPermissionsModal
        isOpen={showEditPermissionsModal}
        onClose={() => setShowEditPermissionsModal(false)}
        members={membersWithDetails.map(m => ({ id: m.userId, name: m.name, role: m.role, avatar: m.avatar, joinedAt: m.joinedAt }))}
        onSave={handleEditPermissions}
      />

      <ReportGroupModal
        isOpen={showReportGroupModal}
        onClose={() => setShowReportGroupModal(false)}
        groupName={group.group_name}
        onSubmit={handleReportGroup}
      />

      <LeaveGroupModal
        isOpen={showLeaveGroupModal}
        onClose={() => setShowLeaveGroupModal(false)}
        groupName={group.group_name}
        onConfirm={handleLeaveGroup}
      />

      <DeleteGroupModal
        isOpen={showDeleteGroupModal}
        onClose={() => setShowDeleteGroupModal(false)}
        groupName={group.group_name}
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

      <EditPostModal
        isOpen={!!editingPost}
        onClose={() => setEditingPost(null)}
        onSave={handleEditPost}
        post={editingPost ? { id: displayPosts.findIndex(p => p === editingPost), title: editingPost.title, content: editingPost.description, tag: editingPost.tag || "", images: editingPost.attachments.map(a => ({ id: a.file_path, preview: a.file_path })) } : null}
      />

      <DeletePostModal
        isOpen={!!deletingPost}
        onClose={() => setDeletingPost(null)}
        onConfirm={handleDeletePost}
        postTitle={deletingPost?.title || ""}
      />
    </div>
  );
};

export default SelectedGroup;