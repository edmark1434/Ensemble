// src/pages/user/4_forums/SelectedGroup.tsx
import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
import useGlobalState from "@/lib/global_state";
import {
  buildForumCommentTree,
  uploadForumCommentImage,
} from "@/pages/user/4_forums/forumCommentUtils";
import { reconcileForumDiscussions, useForumRealtime } from "@/pages/user/4_forums/forumRealtime";
import { identityFromDetails, loadCurrentForumAvatar } from "@/pages/user/4_forums/forumIdentity";

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
  _id: string;
  image_url: string;
  group_name: string;
  description: string;
  created_at: string;
  members: {
    joined_at: string;
    role: string;
    userId: number;
    is_banned?: boolean;
  }[];
  tags: {
    tag_id: number;
    tag: string;
  }[];
  gradient?: string;
};

type MemberWithDetails = {
  userId: number;
  role: string;
  name: string;
  avatar: string;
  joinedAt: string;
};

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

const ImageGallery = ({ attachments, imageKeys }: { attachments?: { file_path: string }[]; imageKeys?: string[] }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const allImages = useMemo(() => {
    const images: string[] = [];
    
    if (attachments && attachments.length > 0) {
      attachments.forEach(attachment => {
        if (attachment.file_path) images.push(attachment.file_path);
      });
    }
    
    if (imageKeys && imageKeys.length > 0) {
      images.push(...imageKeys);
    }
    
    return images;
  }, [attachments, imageKeys]);

  if (allImages.length === 0) return null;

  const getImageUrl = (filePath: string) => {
    if (filePath.startsWith('http')) return filePath;
    return `${import.meta.env.VITE_CLOUDFRONT_URL}/${filePath}`;
  };

  return (
    <>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {allImages.map((filePath, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedImage(getImageUrl(filePath))}
            className="group relative overflow-hidden rounded-lg border border-white/10 bg-white/5 transition-all hover:scale-105 hover:border-white/20"
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
              className="ml-auto rounded p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white"
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
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                  {replyText}
                </ReactMarkdown>
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
              disabled={(!replyText.trim() && images.length === 0) || isUploading}
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
  currentUserAvatar,
  isLastInThread = false
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
  currentUserId: number;
  currentUserAvatar: string;
  isLastInThread?: boolean;
}) => {
  const [showChildren, setShowChildren] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.comment);
  const [showCommentMenu, setShowCommentMenu] = useState(false);
  
  const commentAuthor = membersDetails[comment.user_id] || { name: "Unknown User", avatar: "https://i.pravatar.cc/150?u=unknown" };
  const isLiked = comment.likes?.some(like => like.user_id === currentUserId) || false;
  const isAuthor = comment.user_id === currentUserId;
  const hasChildren = comment.children && comment.children.length > 0;
  const childCount = comment.children?.length || 0;
  const depth = comment.depth || 0;
  
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

  return (
    <div className={`${depthClass} mt-2 ${!isLastInThread ? "border-l-2 border-white/10 ml-2 pl-2" : ""}`}>
      <div className="flex gap-3 py-2">
        <img
          src={commentAuthor.avatar}
          alt={commentAuthor.name}
          className="h-8 w-8 rounded-full object-cover ring-2 ring-white/20 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-white">{commentAuthor.name}</p>
              <span className="text-xs text-zinc-500">{getTimeAgo(comment.created_at)}</span>
              {comment.is_edited && (
                <span className="text-[10px] text-zinc-600">(edited)</span>
              )}
              {depth > 0 && (
                <span className="text-[10px] text-zinc-600">· {depth} level{depth > 1 ? 's' : ''} deep</span>
              )}
            </div>
            
            {isAuthor && !comment.deleted_at && (
              <div className="relative">
                <button
                  onClick={() => setShowCommentMenu(!showCommentMenu)}
                  className="rounded p-1 text-zinc-500 hover:bg-white/10"
                >
                  <MoreVertical className="h-3 w-3" />
                </button>
                {showCommentMenu && (
                  <div className="absolute right-0 mt-1 w-28 rounded-lg border border-white/10 bg-[#0d0f1a] shadow-xl z-20">
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setShowCommentMenu(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10"
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
          
          {isEditing ? (
            <div className="mt-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white"
                rows={3}
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={handleEditSubmit}
                  className="rounded bg-blue-500 px-3 py-1 text-xs text-white"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="rounded bg-white/10 px-3 py-1 text-xs text-zinc-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-1 text-sm text-zinc-300 prose prose-invert prose-sm max-w-none break-words">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                  {comment.deleted_at ? "[deleted]" : comment.comment}
                </ReactMarkdown>
              </div>
              
              <ImageGallery attachments={comment.attachments} />
            </>
          )}
          
          {!comment.deleted_at && (
            <div className="mt-2 flex items-center gap-3 flex-wrap">
              <button
                onClick={() => onLike(postId, comment.comment_id)}
                className={`inline-flex items-center gap-1 text-xs transition ${
                  isLiked ? "text-red-400" : "text-zinc-500 hover:text-white"
                }`}
              >
                <Heart className={`h-3 w-3 ${isLiked ? "fill-red-400" : ""}`} />
                <span>{comment.likes?.length || 0}</span>
              </button>
              <button
                onClick={() => onReply(postId, comment.comment_id, commentAuthor.name, comment.user_id)}
                className="inline-flex items-center gap-1 text-xs text-zinc-500 transition hover:text-white"
              >
                <Reply className="h-3 w-3" />
                <span>Reply</span>
              </button>
              {hasChildren && (
                <button
                  onClick={() => setShowChildren((visible) => !visible)}
                  className="inline-flex items-center gap-1 text-xs text-zinc-500 transition hover:text-white"
                >
                  {showChildren ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  <span>{showChildren ? "Hide" : "View"} {childCount} {childCount === 1 ? "reply" : "replies"}</span>
                </button>
              )}
            </div>
          )}

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
                currentUserAvatar={currentUserAvatar}
                placeholder={`Reply to @${replyingTo.authorName}...`}
              />
            </div>
          )}

          {hasChildren && showChildren && (
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
                  isLastInThread={index === comment.children!.length - 1}
                />
              ))}
            </div>
          )}

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
  const [membersWithDetails, setMembersWithDetails] = useState<MemberWithDetails[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const feedSentinelRef = useRef<HTMLDivElement | null>(null);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
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

  const [postMenuOpen, setPostMenuOpen] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [deletingPost, setDeletingPost] = useState<Post | null>(null);
  const [reportingPost, setReportingPost] = useState<Post | null>(null);

  const [replyImages, setReplyImages] = useState<{ [key: string]: ImageAttachment[] }>({});
  const [replyUploading, setReplyUploading] = useState<{ [key: string]: boolean }>({});
  
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; authorName: string; authorId: number } | null>(null);
  const [commentReplyImages, setCommentReplyImages] = useState<ImageAttachment[]>([]);
  const [commentReplyUploading, setCommentReplyUploading] = useState(false);
  
  const user = useGlobalState((state) => state.user);
  const currentUserId = user?.user_id || user?.userId || 1;
  const [currentUserAvatar, setCurrentUserAvatar] = useState(user?.avatar || "");
  useEffect(() => {
    void loadCurrentForumAvatar(user?.avatar).then(setCurrentUserAvatar);
  }, [user?.avatar]);
  
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
  useForumRealtime((event) => setPosts((current) => reconcileForumDiscussions(current, event)), { groupId: id });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [result, result2] = await Promise.all([
          api.get(`api/forum/groups/${id}`),
          api.get<FeedResponse>(`api/forum/discussions/group/${id}`, {
            params: { type: sortBy, limit: 10 },
          })
        ]);
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
            const identity = identityFromDetails(details);
            details.name = identity.name;
            details.role = member.role;
            details.avatar = identity.avatar;
            details.joinedAt = member.joined_at;
            details.userId = details.user_id;
            delete details.first_name;
            delete details.last_name;
            delete details.user_id;
            delete details.avatar_file_id;
          }
        }
        console.log("Member details with roles:", memberDetailsList);
        console.log("Group discussion:", result2.data.discussions);
        setGroup(mockGroup);
        setPosts(result2.data.discussions);
        setNextCursor(result2.data.pagination.nextCursor);
        setHasMore(result2.data.pagination.hasMore);
        setMembersWithDetails(memberDetailsList);
      } catch (error) {
        console.error("Error fetching data:", error);
        showErrorToast("Failed to load group data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, sortBy]);

  const loadMorePosts = async () => {
    if (!id || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const response = await api.get<FeedResponse>(`api/forum/discussions/group/${id}`, {
        params: { type: sortBy, limit: 10, cursor: nextCursor },
      });
      setPosts((current) => [...current, ...response.data.discussions]);
      setNextCursor(response.data.pagination.nextCursor);
      setHasMore(response.data.pagination.hasMore);
    } catch (error) {
      console.error("Error loading more group discussions:", error);
      showErrorToast("Failed to load more discussions");
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const sentinel = feedSentinelRef.current;
    if (!sentinel || !hasMore || loadingMore || !nextCursor) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) void loadMorePosts();
    }, { rootMargin: "300px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, nextCursor, id, sortBy]);

  const sortOptions = [
    { value: "latest", label: "Latest", icon: <Clock className="h-3 w-3" /> },
    { value: "trending", label: "Trending", icon: <ThumbsUp className="h-3 w-3" /> },
    { value: "hot", label: "Hot", icon: <MessageCircle className="h-3 w-3" /> },
  ];

  const filteredAndSortedPosts = useMemo(() => {
    let filtered = [...posts];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((post) => {
        const matchesTitle = post.title.toLowerCase().includes(query);
        const matchesContent = post.content.toLowerCase().includes(query);
        const matchesAuthor = getMemberDetails(post.user_id).name.toLowerCase().includes(query);
        const matchesTags = post.tags?.some(tag => 
          tag.tag_name?.toLowerCase().includes(query)
        ) || false;
        return matchesTitle || matchesContent || matchesAuthor || matchesTags;
      });
    }

    return filtered;
  }, [posts, searchQuery]);

  const displayPosts = filteredAndSortedPosts.map((post, index) => {
    const authorDetails = getMemberDetails(post.user_id);
    const isLikedByCurrentUser = post.likes?.some(like => like.user_id === currentUserId) || false;
    const isSavedByCurrentUser = post.saves?.some(save => save.user_id === currentUserId) || false;
    return {
      ...post,
      arrayIndex: index,
      id: post._id || String(index),
      _id: post._id,
      author: authorDetails.name,
      authorAvatar: authorDetails.avatar,
      excerpt: post.content,
      content: post.content,
      ago: getTimeAgo(post.created_at),
      tagsList: post.tags || [],
      likeCount: post.likes?.length || 0,
      commentCount: post.comments?.length || 0,
      isLiked: isLikedByCurrentUser,
      isSaved: isSavedByCurrentUser,
      commentTree: buildForumCommentTree(post.comments || []),
      imageKeys: post.imageKeys || [],
    };
  });

  const toggleExpand = (postId: string) => {
    setExpandedPostId(expandedPostId === postId ? null : postId);
  };

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

    const currentPost = posts.find((post) => String(post._id) === postId);
    
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
      
      setPosts((currentPosts) => currentPosts.map((post) =>
        String(post._id) === postId
          ? {
              ...post,
              comments: post.comments.some((comment) => comment.comment_id === savedComment.comment_id)
                ? post.comments
                : [...post.comments, savedComment],
            }
          : post
      ));
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

    const currentPost = posts.find((post) => String(post._id) === postId);
    
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
      
      setPosts((currentPosts) => currentPosts.map((post) =>
        String(post._id) === postId
          ? {
              ...post,
              comments: post.comments.some((comment) => comment.comment_id === savedComment.comment_id)
                ? post.comments
                : [...post.comments, savedComment],
            }
          : post
      ));
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

  const updateReplyText = (postId: string, text: string) => {
    setReplyText((current) => ({ ...current, [postId]: text }));
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

  const handleLikeComment = async (postId: string, commentId: string) => {
    console.log(`Toggling like for comment ${commentId} in post ${postId}`);
    const currentPost = posts.find((post) => String(post._id) === postId);
    const currentComment = currentPost?.comments?.find(c => c.comment_id === commentId);
    if (!currentComment) return;
    
    const isCurrentlyLiked = currentComment.likes?.some(like => like.user_id === currentUserId) || false;
    
    setPosts(prevPosts =>
      prevPosts.map((post) => {
        if (String(post._id) === postId) {
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
        }
        return post;
      })
    );
    
    try {
      const payload = isCurrentlyLiked
        ? { likes: { action: 'remove' } }
        : { likes: {} };
      
      await api.patch(`api/forum/discussions/${currentPost._id}/comments/${commentId}`, payload);
    } catch (error) {
      console.error("Error liking comment:", error);
      setPosts(prevPosts =>
        prevPosts.map((post) => {
          if (String(post._id) === postId) {
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
          }
          return post;
        })
      );
      showErrorToast("Failed to update like status");
    }
  };

  const handleEditComment = async (postId: string, commentId: string, newCommentText: string) => {
    const currentPost = posts.find((post) => String(post._id) === postId);
    const currentComment = currentPost?.comments?.find(c => c.comment_id === commentId);
    if (!currentComment) return;
    
    setPosts(prevPosts =>
      prevPosts.map((post) => {
        if (String(post._id) === postId) {
          const updatedComments = post.comments.map(comment => {
            if (comment.comment_id === commentId) {
              return {
                ...comment,
                comment: newCommentText,
                updated_at: new Date().toISOString(),
                is_edited: true
              };
            }
            return comment;
          });
          return { ...post, comments: updatedComments };
        }
        return post;
      })
    );
    
    try {
      await api.patch(`api/forum/discussions/${currentPost._id}/comments/${commentId}`, {
        comment: { action: 'edit', comment: newCommentText }
      });
      showSuccessToast("Comment edited successfully");
    } catch (error) {
      console.error("Error editing comment:", error);
      setPosts(prevPosts =>
        prevPosts.map((post) => {
          if (String(post._id) === postId) {
            const revertedComments = post.comments.map(comment => {
              if (comment.comment_id === commentId) {
                return currentComment;
              }
              return comment;
            });
            return { ...post, comments: revertedComments };
          }
          return post;
        })
      );
      showErrorToast("Failed to edit comment");
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    const currentPost = posts.find((post) => String(post._id) === postId);
    const currentComment = currentPost?.comments?.find(c => c.comment_id === commentId);
    if (!currentComment) return;
    
    setPosts(prevPosts =>
      prevPosts.map((post) => {
        if (String(post._id) === postId) {
          const updatedComments = post.comments.map(comment =>
            comment.comment_id === commentId
              ? {
                  ...comment,
                  comment: "[deleted]",
                  attachments: [],
                  deleted_at: new Date().toISOString(),
                }
              : comment
          );
          return { ...post, comments: updatedComments };
        }
        return post;
      })
    );
    
    try {
      await api.patch(`api/forum/discussions/${currentPost._id}/comments/${commentId}`, {
        softDelete: true
      });
      showSuccessToast("Comment deleted successfully");
    } catch (error) {
      console.error("Error deleting comment:", error);
      setPosts(prevPosts =>
        prevPosts.map((post) => {
          if (String(post._id) === postId) {
            return {
              ...post,
              comments: post.comments.map((comment) =>
                comment.comment_id === commentId ? currentComment : comment
              ),
            };
          }
          return post;
        })
      );
      showErrorToast("Failed to delete comment");
    }
  };

  const handleReplyClick = (postId: string, commentId: string, authorName: string, authorId: number) => {
    setReplyingTo({ commentId, authorName, authorId });
    setReplyCommentText("");
    setCommentReplyImages([]);
  };

  const handleCreatePost = async(postData: {
    title: string;
    content: string;
    groupId: string;
    tags: { tag_id: number; tag_name: string }[];
    imageKeys?: string[];
  }) => {
    if (!group?.members.some((member) =>
      String(member.userId) === String(currentUserId) && !member.is_banned
    )) {
      showErrorToast("Join this group before starting a discussion.");
      throw new Error("Active group membership is required");
    }
    const forum_group_id = postData.groupId;
    try{
      const response = await api.post(`api/forum/discussions`, {
        title: postData.title,
        content: postData.content,
        tags: postData.tags,
        imageKeys: postData.imageKeys || [],
        forum_group_id,
      });
      console.log("Create post response:", response);
      if (response.status !== 201) {
        showErrorToast("Failed to create post. Please try again.");
        return;
      } else {
        const newPost = response.data as Post;
        setPosts((existingPosts) =>
          existingPosts.some((post) => String(post._id) === String(newPost._id))
            ? existingPosts
            : [newPost, ...existingPosts]
        );
        showSuccessToast(`"${postData.title}" posted successfully!`);
      }
    }catch(error) {
      console.error("Error creating post:", error);
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
    const currentPost = posts.find(post => post._id === postId);
    if (!currentPost) {
      showErrorToast("Post not found");
      return;
    }

    const payload = {
      title: updatedData.title,
      content: updatedData.content,
      tags: updatedData.tags || [],
      imageKeys: updatedData.imageKeys || [], // 👈 Add imageKeys to payload
    };

    console.log("Updating post with _id:", postId);
    console.log("Payload:", payload);

    const response = await api.patch(`api/forum/discussions/${postId}`, payload);
    
    if (response.status === 200) {
      setPosts(prev => prev.map((post) =>
        String(post._id) === postId ? response.data as Post : post
      ));
      
      showSuccessToast("Post updated successfully!");
      setEditingPost(null);
      setPostMenuOpen(null);
    } else {
      showErrorToast(response.data?.error || "Failed to update post");
    }
  } catch (error: any) {
    console.error("Error updating post:", error);
    const errorMessage = error.response?.data?.error || error.message || "Failed to update post. Please try again.";
    showErrorToast(errorMessage);
  }
};

  const handleDeletePost = async() => {
    console.log("Deleting post:", deletingPost);
    try{
      const response = await api.delete(`api/forum/discussions/${deletingPost?._id}`);
      if (response.status === 200) {
        if (deletingPost) {
          setPosts((existingPosts) =>
            existingPosts.filter((post) => String(post._id) !== String(deletingPost._id))
          );
          showSuccessToast(`"${deletingPost.title}" has been deleted`);
          setDeletingPost(null);
          if (expandedPostId === deletingPost.id) {
            setExpandedPostId(null);
          }
        }
      }
    }catch(error) {
      console.error("Error deleting post:", error);
      showErrorToast("Failed to delete post. Please try again.");
    }
  };

  const handleLikePost = async (postId: string) => {
    const currentPost = displayPosts.find(p => p.id === postId);
    if (!currentPost) return;
    
    const isCurrentlyLiked = currentPost.isLiked;
    
    setPosts(prevPosts =>
      prevPosts.map((post) => {
        if (String(post._id) === postId) {
          const updatedLikes = isCurrentlyLiked
            ? post.likes.filter(like => like.user_id !== currentUserId)
            : [...post.likes, { user_id: currentUserId }];
          return { ...post, likes: updatedLikes };
        }
        return post;
      })
    );
    
    try {
      const payload = isCurrentlyLiked 
        ? { likes: { action: 'remove' } }
        : { likes: {} };
      
      const response = await api.patch(`api/forum/discussions/${currentPost._id}`, payload);
      
      if (response.status !== 200) {
        setPosts(prevPosts =>
          prevPosts.map((post) => {
            if (String(post._id) === postId) {
              const revertedLikes = isCurrentlyLiked
                ? [...post.likes, { user_id: currentUserId }]
                : post.likes.filter(like => like.user_id !== currentUserId);
              return { ...post, likes: revertedLikes };
            }
            return post;
          })
        );
        showErrorToast("Failed to update like status");
      } else {
        showSuccessToast(isCurrentlyLiked ? "Post unliked" : "Post liked");
      }
    } catch (error) {
      console.error("Error liking post:", error);
      setPosts(prevPosts =>
        prevPosts.map((post) => {
          if (String(post._id) === postId) {
            const revertedLikes = isCurrentlyLiked
              ? [...post.likes, { user_id: currentUserId }]
              : post.likes.filter(like => like.user_id !== currentUserId);
            return { ...post, likes: revertedLikes };
          }
          return post;
        })
      );
      showErrorToast("Failed to update like status");
    }
  };

  const handleSavePost = async (postId: string) => {
    const currentPost = displayPosts.find(p => p.id === postId);
    if (!currentPost) return;
    
    const isCurrentlySaved = currentPost.isSaved;
    
    setPosts(prevPosts =>
      prevPosts.map((post) => {
        if (String(post._id) === postId) {
          const updatedSaves = isCurrentlySaved
            ? post.saves.filter(save => save.user_id !== currentUserId)
            : [...post.saves, { user_id: currentUserId }];
          return { ...post, saves: updatedSaves };
        }
        return post;
      })
    );
    
    try {
      const payload = isCurrentlySaved 
        ? { saves: { action: 'remove' } }
        : { saves: {} };
      
      const response = await api.patch(`api/forum/discussions/${currentPost._id}`, payload);
      
      if (response.status !== 200) {
        setPosts(prevPosts =>
          prevPosts.map((post) => {
            if (String(post._id) === postId) {
              const revertedSaves = isCurrentlySaved
                ? [...post.saves, { user_id: currentUserId }]
                : post.saves.filter(save => save.user_id !== currentUserId);
              return { ...post, saves: revertedSaves };
            }
            return post;
          })
        );
        showErrorToast("Failed to update save status");
      } else {
        showSuccessToast(isCurrentlySaved ? "Post removed from saved" : "Post saved");
      }
    } catch (error) {
      console.error("Error saving post:", error);
      setPosts(prevPosts =>
        prevPosts.map((post) => {
          if (String(post._id) === postId) {
            const revertedSaves = isCurrentlySaved
              ? [...post.saves, { user_id: currentUserId }]
              : post.saves.filter(save => save.user_id !== currentUserId);
            return { ...post, saves: revertedSaves };
          }
          return post;
        })
      );
      showErrorToast("Failed to update save status");
    }
  };

  const handleEditGroup = async(updatedData: { group_name: string; description: string; tags: string[]; gradient: string }) => {
    if (!group) return;
    try {
      const response = await api.put(`api/forum/groups/${group._id}`, updatedData);
      if (response.status === 200) {
        showSuccessToast(`Group "${group.group_name}" updated successfully!`);
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

  const handleEditPermissions = async (updatedMembers: { id: number; name: string; role: string; avatar: string }[]) => {
    if (!group) return;
    try {
      const changed = updatedMembers.filter((updated) => {
        const current = membersWithDetails.find((member) => member.userId === updated.id);
        const normalizedRole = updated.role.toLowerCase() === "owner" ? "Admin" : updated.role;
        return current && current.role !== normalizedRole;
      });
      await Promise.all(changed.map((member) =>
        api.patch(`api/forum/groups/${group._id}/members/${member.id}/role`, {
          role: member.role.toLowerCase() === "owner" ? "Admin" : member.role,
        })
      ));
      setMembersWithDetails((current) => current.map((member) => {
        const updated = updatedMembers.find((item) => item.id === member.userId);
        return updated ? { ...member, role: updated.role.toLowerCase() === "owner" ? "Admin" : updated.role } : member;
      }));
      showSuccessToast("Permissions updated successfully!");
    } catch (error) {
      showErrorToast("Failed to update permissions.");
      throw error;
    }
  };

  const handleReportGroup = async (reason: string, description: string) => {
    try {
      await api.post(`api/forum/reports/groups/${group._id}`, { reason, description });
      showSuccessToast("Group reported successfully. Our team will review it.");
    } catch (error) {
      showErrorToast("Failed to submit the report. Please try again.");
      throw error;
    }
  };

  const handleLeaveGroup = () => {
    console.log("Leaving group:", group?.group_name);
    showSuccessToast(`You have left "${group?.group_name}"`);
    navigate("/forums");
  };

  const handleDeleteGroup = async() => {
    try {
      const response = await api.delete(`api/forum/groups/${group?._id}`);
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

  const handleReportMember = async (reason: string, description: string) => {
    if (!selectedMember) {
      showErrorToast("Select a member to report.");
      throw new Error("No member selected");
    }

    try {
      await api.post(
        `api/forum/reports/groups/${group._id}/members/${selectedMember.userId}`,
        { reason, description }
      );
      showSuccessToast(`Report submitted for ${selectedMember.name}`);
      setSelectedMember(null);
    } catch (error) {
      showErrorToast("Failed to submit the report. Please try again.");
      throw error;
    }
  };

  const handleRemoveMember = async () => {
    if (selectedMember && group) {
      try {
        await api.delete(`api/forum/groups/${group._id}/members/${selectedMember.userId}`);
      setMembersWithDetails(membersWithDetails.filter(m => m.userId !== selectedMember.userId));
      setGroup({
        ...group,
        members: group.members.filter(m => m.userId !== selectedMember.userId),
      });
      showSuccessToast(`${selectedMember.name} has been removed from the group`);
      setSelectedMember(null);
      } catch {
        showErrorToast("Failed to remove member.");
      }
    }
  };

  const isOwner = group?.members.some(m => m.userId === currentUserId && m.role === "Admin") || false;
  const isActiveMember = group?.members.some(
    (member) => String(member.userId) === String(currentUserId) && !member.is_banned
  ) || false;
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
              {isActiveMember && <div className="mb-6 flex justify-end">
                <button
                  onClick={() => setIsNewDiscussionOpen(true)}
                  className="group flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
                >
                  <PlusCircle className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
                  New Discussion
                </button>
              </div>}

              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 sm:w-64">
                  <Search className="h-4 w-4 text-zinc-500" />
                  <input
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
                    placeholder="Search discussions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="text-zinc-500 hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
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
                    const isAuthor = post.user_id === currentUserId;

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
                                {post.tagsList && post.tagsList.length > 0 && (
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {post.tagsList.map((tag, tagIdx) => (
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

                              {isAuthor ? (
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
                              ) : (
                                <button
                                  onClick={() => setReportingPost(post)}
                                  className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-red-400"
                                >
                                  <Flag className="h-3.5 w-3.5" />
                                  Report
                                </button>
                              )}
                            </div>

                            <h3 className="mt-1 text-base font-semibold text-white">{post.title}</h3>

                            <div className="mt-2 text-sm text-zinc-300 prose prose-invert prose-sm max-w-none break-words">
                              <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                                {post.content || post.description}
                              </ReactMarkdown>
                            </div>

                            <ImageGallery attachments={post.attachments} imageKeys={post.imageKeys} />

                            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                              <button
                                onClick={() => toggleExpand(post.id)}
                                className="inline-flex items-center gap-1 text-zinc-500 transition hover:text-white"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                                <span>{post.commentCount} replies</span>
                                {expandedPostId === post.id ? (
                                  <ChevronUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                )}
                              </button>

                              <button
                                onClick={() => handleLikePost(post.id)}
                                className={`inline-flex items-center gap-1 transition-all duration-200 ${
                                  post.isLiked 
                                    ? "text-red-400 hover:text-red-300" 
                                    : "text-zinc-500 hover:text-white"
                                }`}
                                type="button"
                              >
                                <Heart className={`h-3.5 w-3.5 transition-all ${post.isLiked ? "fill-red-400" : ""}`} />
                                <span>{post.likeCount} likes</span>
                              </button>

                              <button
                                onClick={() => handleSavePost(post.id)}
                                className={`inline-flex items-center gap-1 transition-all duration-200 ${
                                  post.isSaved 
                                    ? "text-yellow-400 hover:text-yellow-300" 
                                    : "text-zinc-500 hover:text-white"
                                }`}
                                type="button"
                              >
                                <Bookmark className={`h-3.5 w-3.5 transition-all ${post.isSaved ? "fill-yellow-400" : ""}`} />
                                <span>{post.isSaved ? "Saved" : "Save"}</span>
                              </button>
                            </div>

                            {expandedPostId === post.id && (
                              <div className="mt-4 border-t border-white/10 pt-4">
                                <div className="space-y-4">
                                  {post.commentTree && post.commentTree.length > 0 ? (
                                    post.commentTree.map((comment, commentIndex) => (
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
                                        currentUserAvatar={currentUserAvatar}
                                        isLastInThread={commentIndex === post.commentTree.length - 1}
                                      />
                                    ))
                                  ) : (
                                    <p className="text-center text-sm text-zinc-500">No comments yet.</p>
                                  )}
                                </div>

                                <div className="mt-4 pt-4 border-t border-white/10">
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
                  })
                )}
                <div ref={feedSentinelRef} className="flex min-h-12 items-center justify-center py-4 text-sm text-zinc-500">
                  {loadingMore ? <Loader2 className="h-5 w-5 animate-spin" /> : hasMore ? "Scroll for more" : ""}
                </div>
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
                      <p className="text-xs text-zinc-500">Joined {member.joinedAt.split('T')[0]}</p>
                      {member.role === "Admin" && (
                        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-400">Admin</span>
                      )}
                    </div>
                  </div>

                  {member.userId !== currentUserId && (
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
                    <span key={tag.tag_id} className="rounded-full bg-blue-500/20 px-3 py-1 text-xs text-blue-400">
                      {tag.tag}
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
        isOpen={isActiveMember && isNewDiscussionOpen}
        onClose={() => setIsNewDiscussionOpen(false)}
        onCreatePost={handleCreatePost}
        availableGroups={[{ id: group._id, name: group.group_name, tags: group.tags }]}
      />

      <EditGroupModal
        isOpen={showEditGroupModal}
        onClose={() => setShowEditGroupModal(false)}
        group={{ id: group._id, name: group.group_name, description: group.description, tags: group.tags, gradient: "from-purple-600 via-pink-600 to-red-600", }}
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
        post={editingPost ? { 
          id: editingPost._id || editingPost.id, 
          title: editingPost.title || "", 
          content: editingPost.content || editingPost.description || "", 
          tags: Array.isArray(editingPost.tags) 
            ? editingPost.tags.map(t => ({ tag_id: t.tag_id, tag_name: t.tag_name || '' }))
            : [],
          images: Array.isArray(editingPost.attachments) 
            ? editingPost.attachments.map(a => ({ id: a.file_path, preview: a.file_path })) 
            : [],
          imageKeys: editingPost.imageKeys || [] // 👈 ADD THIS LINE
        } : null}
        availableTags={group?.tags?.map(t => ({ tag_id: t.tag_id, tag_name: t.tag })) || []}
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
    </div>
  );
};

export default SelectedGroup;
