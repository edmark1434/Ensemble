// src/pages/user/4_forums/ExpandDiscussion.tsx
import {useEffect, useRef, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {
    ArrowLeft,
    Bookmark,
    ChevronDown,
    Edit2,
    Eye,
    Filter,
    Heart,
    Image as ImageIcon,
    Loader2,
    MessageCircle,
    MoreVertical,
    Send,
    Share2,
    Trash2 as TrashIcon,
    X,
} from "lucide-react";
import UserHeader from "@/components/nav/user_header";
import EditPostModal from "@/pages/user/4_forums/forum_modals/EditPostModal.tsx";
import DeletePostModal from "@/pages/user/4_forums/forum_modals/DeletePostModal.tsx";
import {showErrorToast, showSuccessToast} from "@/components/utility/toast";

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
  date: string;
  likes: number;
  images?: ImageAttachment[];
  replies?: Reply[]; // For nested replies
};

type Post = {
  id: number;
  groupId: number;
  groupName?: string;
  author: string;
  authorAvatar?: string;
  title: string;
  content: string;
  likes: number;
  comments: number;
  ago: string;
  date: string;
  tag?: string;
  images?: ImageAttachment[];
  replies?: Reply[];
};

type Group = {
  id: number;
  name: string;
  gradient: string;
};

// Current user
// const CURRENT_USER_ID = 1;
const CURRENT_USER_NAME = "John Paul Mahilom";
const CURRENT_USER_AVATAR = "https://i.pravatar.cc/150?u=john";

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
              alt={`Image ${idx + 1}`}
              className="h-32 w-full object-cover transition-all group-hover:scale-110"
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
  onReply,
  placeholder = "Write a reply...",
  autoFocus = false
}: {
  onReply: (content: string, images: ImageAttachment[]) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) => {
  const [content, setContent] = useState("");
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const applyFormatting = (format: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    let formattedText = "";

    switch (format) {
      case "bold":
        formattedText = `**${selectedText || "bold text"}**`;
        break;
      case "italic":
        formattedText = `*${selectedText || "italic text"}*`;
        break;
      case "code":
        formattedText = `\`${selectedText || "code"}\``;
        break;
      default:
        return;
    }

    const newContent = content.substring(0, start) + formattedText + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + formattedText.length, start + formattedText.length);
    }, 0);
  };

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
      });
    }

    setImages(prev => [...prev, ...newImages]);
    setIsUploading(true);

    for (const image of newImages) {
      await new Promise(resolve => setTimeout(resolve, 500));
      setImages(prev =>
        prev.map(img =>
          img.id === image.id ? { ...img, uploading: false } : img
        )
      );
    }
    setIsUploading(false);
  };

  const removeImage = (imageId: string) => {
    const image = images.find(img => img.id === imageId);
    if (image && image.preview.startsWith('blob:')) {
      URL.revokeObjectURL(image.preview);
    }
    setImages(prev => prev.filter(img => img.id !== imageId));
  };

  const handleSubmit = () => {
    if (!content.trim() && images.length === 0) return;
    onReply(content, images);
    setContent("");
    setImages([]);
  };

  const renderPreview = () => {
      return content
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="italic text-zinc-300">$1</em>')
        .replace(/`(.*?)`/g, '<code class="rounded bg-black/50 px-1 py-0.5 text-xs text-green-400">$1</code>')
        .replace(/\n/g, '<br />');
  };

  return (
    <div className="flex gap-3">
      <img
        src={CURRENT_USER_AVATAR}
        alt="You"
        className="h-8 w-8 rounded-full object-cover ring-2 ring-white/20 flex-shrink-0"
      />
      <div className="flex-1">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-white/15 border-b-0 bg-white/5 px-2 py-1">
          <button
            onClick={() => applyFormatting("bold")}
            className="rounded p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white"
            title="Bold"
          >
            <strong className="text-xs">B</strong>
          </button>
          <button
            onClick={() => applyFormatting("italic")}
            className="rounded p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white"
            title="Italic"
          >
            <em className="text-xs">I</em>
          </button>
          <button
            onClick={() => applyFormatting("code")}
            className="rounded p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white"
            title="Code"
          >
            <span className="text-xs">{'<>'}</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white"
            title="Upload Image"
          >
            <ImageIcon className="h-3 w-3" />
          </button>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="rounded p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white ml-auto"
          >
            {showPreview ? <Edit2 className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </button>
        </div>

        {/* Input or Preview */}
        {!showPreview ? (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-b-lg border border-white/15 border-t-0 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none"
            rows={3}
          />
        ) : (
          <div className="min-h-[80px] rounded-b-lg border border-white/15 border-t-0 bg-white/5 p-3">
            {content.trim() ? (
              <div
                className="text-sm text-zinc-400 prose prose-invert prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: renderPreview() }}
              />
            ) : (
              <p className="text-sm text-zinc-500 italic">Nothing to preview...</p>
            )}
          </div>
        )}

        {/* Image Previews */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {images.map((image) => (
              <div key={image.id} className="group relative">
                <img
                  src={image.preview}
                  alt="Preview"
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

        <div className="mt-2 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={!content.trim() && images.length === 0 || isUploading}
            className="flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-600 disabled:opacity-50"
          >
            {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            Post Reply
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleImageUpload(e.target.files)}
        />
      </div>
    </div>
  );
};

// Single Comment Component
const Comment = ({
  reply,
  isLiked,
  onLike,
  onReply,
  onEdit,
  onDelete,
  level = 0
}: {
  reply: Reply;
  isLiked: boolean;
  onLike: () => void;
  onReply: (content: string, images: ImageAttachment[]) => void;
  onEdit?: (id: number, content: string, images: ImageAttachment[]) => void;
  onDelete?: (id: number) => void;
  level?: number;
}) => {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(reply.content);
  const isAuthor = reply.author === CURRENT_USER_NAME;

  const handleEdit = () => {
    if (onEdit && editContent.trim()) {
      onEdit(reply.id, editContent, []);
      setIsEditing(false);
    }
  };

  return (
    <div className={`flex gap-3 ${level > 0 ? 'ml-8 mt-3' : 'mt-4'}`}>
      <img
        src={reply.authorAvatar}
        alt={reply.author}
        className="h-8 w-8 rounded-full object-cover ring-2 ring-white/20 flex-shrink-0"
      />
      <div className="flex-1">
        <div className="rounded-lg bg-white/5 p-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-white">{reply.author}</p>
              <span className="text-xs text-zinc-500">{reply.ago}</span>
            </div>

            {isAuthor && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="rounded p-1 text-zinc-500 transition hover:bg-white/10 hover:text-white"
                >
                  <MoreVertical className="h-3 w-3" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 mt-1 w-32 rounded-lg border border-white/10 bg-[#0d0f1a] shadow-xl z-20">
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setShowMenu(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-zinc-300 transition hover:bg-white/10"
                    >
                      <Edit2 className="h-3 w-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        onDelete?.(reply.id);
                        setShowMenu(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-400 transition hover:bg-red-500/10"
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
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white resize-none"
                rows={3}
              />
              <div className="mt-2 flex gap-2 justify-end">
                <button
                  onClick={handleEdit}
                  className="rounded bg-blue-500 px-3 py-1 text-xs text-white"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="rounded border border-white/15 px-3 py-1 text-xs text-zinc-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div
                className="mt-1 text-sm text-zinc-300 prose prose-invert prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: renderMarkdownContent(reply.content) }}
              />
              <ImageGallery images={reply.images} />
            </>
          )}

          <div className="mt-2 flex items-center gap-4">
            <button
              onClick={onLike}
              className={`inline-flex items-center gap-1 text-xs transition ${
                isLiked ? "text-red-400" : "text-zinc-500 hover:text-white"
              }`}
            >
              <Heart className={`h-3 w-3 ${isLiked ? "fill-red-400" : ""}`} />
              <span>{reply.likes}</span>
            </button>
            <button
              onClick={() => setShowReplyInput(!showReplyInput)}
              className="inline-flex items-center gap-1 text-xs text-zinc-500 transition hover:text-white"
            >
              <MessageCircle className="h-3 w-3" />
              <span>Reply</span>
            </button>
          </div>
        </div>

        {/* Nested Reply Input */}
        {showReplyInput && (
          <div className="mt-3">
            <ReplyInput
              onReply={(content, images) => {
                onReply(content, images);
                setShowReplyInput(false);
              }}
              placeholder="Write a reply..."
              autoFocus
            />
          </div>
        )}

        {/* Nested Replies */}
        {reply.replies && reply.replies.length > 0 && (
          <div className="mt-2">
            {reply.replies.map((nestedReply) => (
              <Comment
                key={nestedReply.id}
                reply={nestedReply}
                isLiked={false}
                onLike={() => {}}
                onReply={() => {}}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ExpandDiscussion = () => {
  const { postId } = useParams();
  const navigate = useNavigate();

  const [post, setPost] = useState<Post | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [commentSort, setCommentSort] = useState<"recent" | "most-liked">("recent");
  const [visibleComments, setVisibleComments] = useState<Reply[]>([]);
  const [commentsToShow, setCommentsToShow] = useState(10);
  const [postMenuOpen, setPostMenuOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [deletingPost, setDeletingPost] = useState<Post | null>(null);

  const commentsContainerRef = useRef<HTMLDivElement>(null);

  // Mock data - replace with API call
  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800));

      const mockGroup: Group = {
        id: 1,
        name: "Color Grading Society",
        gradient: "from-cyan-500 via-blue-500 to-indigo-500",
      };

      const mockPost: Post = {
        id: Number(postId),
        groupId: 1,
        groupName: "Color Grading Society",
        author: "Forbes Talinging",
        authorAvatar: "https://i.pravatar.cc/150?u=forbes",
        title: "Best Practices for color grading log footage?",
        content: "I am working with S-Log3 footage and looking for advice on the best workflow for color grading. What is your process?\n\nI've tried a few different approaches but I'm not completely satisfied with the results. Here's what I've tried so far:\n\n- Using Color Space Transform to go from S-Log3 to Rec.709\n- Manual grading with curves\n- Using LUTs from various creators\n\n**What I'm looking for:**\n1. Best practices for maintaining dynamic range\n2. Tips for skin tones in log footage\n3. Recommended workflows for different color spaces\n\nAny advice would be greatly appreciated!",
        likes: 124,
        comments: 45,
        ago: "2 hours ago",
        date: "2024-01-15T10:30:00",
        tag: "Log Footage",
        images: [
          { id: "img1", preview: "https://picsum.photos/id/101/800/600" },
          { id: "img2", preview: "https://picsum.photos/id/102/800/600" },
          { id: "img3", preview: "https://picsum.photos/id/104/800/600" },
        ],
        replies: Array.from({ length: 35 }, (_, i) => ({
          id: i + 1,
          author: i === 0 ? "Sarah Chen" : i === 1 ? "Marcus Thompson" : `User${i + 1}`,
          authorAvatar: `https://i.pravatar.cc/150?u=user${i + 1}`,
          content: i === 0
            ? "Great question! I usually start with a color space transform to get from S-Log3 to Rec.709, then do my primary corrections before moving to secondary. **This has worked really well for me!**"
            : i === 1
            ? "I recommend using DaVinci Wide Gamut as your working space. It gives you more flexibility in grading. Here's what I typically do:\n\n- Set working space to DWG\n- Use color space transform\n- Grade in a larger color space"
            : `This is comment #${i + 1}. Very helpful discussion! I've learned a lot from this thread. ${i % 3 === 0 ? "**Thanks everyone!**" : ""}`,
          ago: `${i + 1} hour${i > 0 ? 's' : ''} ago`,
          date: new Date(Date.now() - (i + 1) * 3600000).toISOString(),
          likes: Math.floor(Math.random() * 50),
          images: i === 2 ? [{ id: "reply-img", preview: "https://picsum.photos/id/105/200/200" }] : undefined,
          replies: i === 0 ? [
            {
              id: 1001,
              author: CURRENT_USER_NAME,
              authorAvatar: CURRENT_USER_AVATAR,
              content: "Thanks for the detailed explanation! This is really helpful.",
              ago: "1 hour ago",
              date: new Date(Date.now() - 3600000).toISOString(),
              likes: 5,
            }
          ] : undefined,
        })),
      };

      setGroup(mockGroup);
      setPost(mockPost);
      setLoading(false);
    };

    fetchPost();
  }, [postId]);

  // Sort and paginate comments
  useEffect(() => {
    if (!post?.replies) return;

    const sorted = [...post.replies];
    if (commentSort === "recent") {
      sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else {
      sorted.sort((a, b) => b.likes - a.likes);
    }

      // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleComments(sorted.slice(0, commentsToShow));
  }, [post, commentSort, commentsToShow]);

  const loadMoreComments = () => {
    setCommentsToShow(prev => prev + 10);
  };

  const handleLikePost = () => {
    if (liked) {
      setPost(prev => prev ? { ...prev, likes: prev.likes - 1 } : null);
      setLiked(false);
    } else {
      setPost(prev => prev ? { ...prev, likes: prev.likes + 1 } : null);
      setLiked(true);
    }
  };

  const handleSavePost = () => {
    setSaved(!saved);
    showSuccessToast(saved ? "Removed from saved" : "Saved to bookmarks");
  };

  const handleAddReply = (content: string, images: ImageAttachment[]) => {
    if (!post) return;

    const newReply: Reply = {
      id: Date.now(),
      author: CURRENT_USER_NAME,
      authorAvatar: CURRENT_USER_AVATAR,
      content: content,
      ago: "Just now",
      date: new Date().toISOString(),
      likes: 0,
      images: images,
    };

    setPost({
      ...post,
      replies: [newReply, ...(post.replies || [])],
      comments: post.comments + 1,
    });

    showSuccessToast("Reply posted successfully!");
  };

  const handleEditPost = (_postId: number, updatedData: { title: string; content: string; tag: string; images?: ImageAttachment[] }) => {
    if (!post) return;
    setPost({
      ...post,
      title: updatedData.title,
      content: updatedData.content,
      tag: updatedData.tag,
      images: updatedData.images,
    });
    showSuccessToast("Post updated successfully!");
  };

  const handleDeletePost = () => {
    if (deletingPost) {
      showSuccessToast(`"${deletingPost.title}" has been deleted`);
      navigate("/forums");
    }
  };

  const handleEditComment = (id: number, content: string, images: ImageAttachment[]) => {
    setPost(prev => {
      if (!prev) return null;
      const updateReplies = (replies: Reply[]): Reply[] => {
        return replies.map(reply => {
          if (reply.id === id) {
            return { ...reply, content, images };
          }
          if (reply.replies) {
            return { ...reply, replies: updateReplies(reply.replies) };
          }
          return reply;
        });
      };
      return { ...prev, replies: updateReplies(prev.replies || []) };
    });
    showSuccessToast("Comment updated!");
  };

  const handleDeleteComment = (id: number) => {
    setPost(prev => {
      if (!prev) return null;
      const filterReplies = (replies: Reply[]): Reply[] => {
        return replies.filter(reply => {
          if (reply.id === id) return false;
          if (reply.replies) {
            reply.replies = filterReplies(reply.replies);
          }
          return true;
        });
      };
      const newReplies = filterReplies(prev.replies || []);
      return { ...prev, replies: newReplies, comments: newReplies.length };
    });
    showSuccessToast("Comment deleted!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080a12]">
        <UserHeader pageTitle="Discussion" credits={1250} />
        <div className="mx-auto max-w-4xl p-6 md:p-8">
          <div className="h-96 w-full animate-pulse rounded-xl bg-white/10" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[#080a12]">
        <UserHeader pageTitle="Discussion" credits={1250} />
        <div className="mx-auto max-w-4xl p-6 md:p-8 text-center">
          <p className="text-zinc-400">Discussion not found</p>
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

  const isAuthor = post.author === CURRENT_USER_NAME;

  return (
    <div className="min-h-screen bg-[#080a12]">
      <UserHeader pageTitle="Discussion" credits={1250} />

      <div className="mx-auto max-w-4xl p-6 md:p-8">
        {/* Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex items-center gap-2">
            {group && (
              <span className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${group.gradient} px-3 py-1 text-xs text-white`}>
                {group.name}
              </span>
            )}
            {post.tag && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] text-purple-400">
                {post.tag}
              </span>
            )}
          </div>
        </div>

        {/* Post Content */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6">
          {/* Post Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <img
                src={post.authorAvatar}
                alt={post.author}
                className="h-12 w-12 rounded-full object-cover ring-2 ring-white/20"
              />
              <div>
                <p className="font-medium text-white">{post.author}</p>
                <p className="text-xs text-zinc-500">{post.ago}</p>
              </div>
            </div>

            {isAuthor && (
              <div className="relative">
                <button
                  onClick={() => setPostMenuOpen(!postMenuOpen)}
                  className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
                {postMenuOpen && (
                  <div className="absolute right-0 mt-2 w-36 rounded-lg border border-white/10 bg-[#0d0f1a] shadow-xl z-20">
                    <button
                      onClick={() => {
                        setEditingPost(post);
                        setPostMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/10"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setDeletingPost(post);
                        setPostMenuOpen(false);
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

          <h1 className="mt-4 text-2xl font-bold text-white">{post.title}</h1>

          <div
            className="mt-4 text-zinc-300 prose prose-invert prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdownContent(post.content) }}
          />

          <ImageGallery images={post.images} />

          {/* Post Actions */}
          <div className="mt-6 flex items-center gap-6 border-t border-white/10 pt-4">
            <button
              onClick={handleLikePost}
              className={`inline-flex items-center gap-2 transition ${
                liked ? "text-red-400" : "text-zinc-500 hover:text-white"
              }`}
            >
              <Heart className={`h-5 w-5 ${liked ? "fill-red-400" : ""}`} />
              <span>{post.likes} likes</span>
            </button>
            <button className="inline-flex items-center gap-2 text-zinc-500 transition hover:text-white">
              <MessageCircle className="h-5 w-5" />
              <span>{post.comments} comments</span>
            </button>
            <button
              onClick={handleSavePost}
              className={`inline-flex items-center gap-2 transition ${
                saved ? "text-yellow-400" : "text-zinc-500 hover:text-white"
              }`}
            >
              <Bookmark className={`h-5 w-5 ${saved ? "fill-yellow-400" : ""}`} />
              <span>Save</span>
            </button>
            <button className="inline-flex items-center gap-2 text-zinc-500 transition hover:text-white">
              <Share2 className="h-5 w-5" />
              <span>Share</span>
            </button>
          </div>
        </div>

        {/* Comments Section */}
        <div className="mt-8">
          {/* Comments Header */}
          <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-lg font-semibold text-white">
              Comments ({post.comments})
            </h2>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-zinc-500" />
              <select
                value={commentSort}
                onChange={(e) => setCommentSort(e.target.value as "recent" | "most-liked")}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white focus:outline-none"
              >
                <option value="recent">Most Recent</option>
                <option value="most-liked">Most Liked</option>
              </select>
            </div>
          </div>

          {/* Reply Input at Top */}
          <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
            <ReplyInput
              onReply={handleAddReply}
              placeholder="Write a comment..."
              autoFocus={false}
            />
          </div>

          {/* Comments List - Scrollable */}
          <div
            ref={commentsContainerRef}
            className="max-h-[600px] overflow-y-auto space-y-2 pr-2 custom-scrollbar"
          >
            {visibleComments.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                No comments yet. Be the first to comment!
              </div>
            ) : (
              visibleComments.map((reply) => (
                <Comment
                  key={reply.id}
                  reply={reply}
                  isLiked={false}
                  onLike={() => {}}
                  onReply={(content, images) => {
                    // Handle nested reply
                    const newReply: Reply = {
                      id: Date.now(),
                      author: CURRENT_USER_NAME,
                      authorAvatar: CURRENT_USER_AVATAR,
                      content: content,
                      ago: "Just now",
                      date: new Date().toISOString(),
                      likes: 0,
                      images: images,
                    };
                    setPost(prev => {
                      if (!prev) return null;
                      const addNestedReply = (replies: Reply[]): Reply[] => {
                        return replies.map(r => {
                          if (r.id === reply.id) {
                            return { ...r, replies: [...(r.replies || []), newReply] };
                          }
                          if (r.replies) {
                            return { ...r, replies: addNestedReply(r.replies) };
                          }
                          return r;
                        });
                      };
                      return { ...prev, replies: addNestedReply(prev.replies || []) };
                    });
                    showSuccessToast("Reply posted!");
                  }}
                  onEdit={handleEditComment}
                  onDelete={handleDeleteComment}
                />
              ))
            )}

            {/* Load More Button */}
            {post.replies && commentsToShow < post.replies.length && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={loadMoreComments}
                  className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-zinc-400 transition hover:bg-white/10 hover:text-white"
                >
                  <ChevronDown className="h-4 w-4" />
                  Load More Comments
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <EditPostModal
        isOpen={!!editingPost}
        onClose={() => setEditingPost(null)}
        onSave={handleEditPost}
        post={editingPost}
      />

      <DeletePostModal
        isOpen={!!deletingPost}
        onClose={() => setDeletingPost(null)}
        onConfirm={handleDeletePost}
        postTitle={deletingPost?.title || ""}
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
};

export default ExpandDiscussion;