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
} from "lucide-react";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import UserHeader from "@/components/nav/user_header";
import NewDiscussionModal from "@/pages/user/4_forums/forum_modals/NewDiscussionModal.tsx";
import CreateGroupModal from "@/pages/user/4_forums/forum_modals/CreateGroupModal.tsx";
import EditPostModal from "@/pages/user/4_forums/forum_modals/EditPostModal.tsx";
import DeletePostModal from "@/pages/user/4_forums/forum_modals/DeletePostModal.tsx";
import { showSuccessToast, showErrorToast } from "@/components/utility/toast";
import api from "@/lib/axios";
import useGlobalState from "@/lib/global_state";

// ==================== TYPES ====================
type ForumTab = "feed" | "groups" | "my-groups" | "my-discussions" | "saved";

type ImageAttachment = {
  id: string;
  file?: File;
  preview: string;
  url?: string;
  uploading?: boolean;
  uploadProgress?: number;
};

type ForumGroupMember = {
  role: string;
  userId: number;
};

type ForumGroupDocument = {
  _id: string;
  image_url?: string | null;
  group_name: string;
  description?: string;
  members?: ForumGroupMember[];
  tags?: string[];
  status?: string;
};

type ForumDiscussionTag = {
  forum_tag_id: number;
};

type ForumDiscussionAttachment = {
  file_path: string;
};

type ForumDiscussionComment = {
  user_id: number;
  comment: string;
  comment_id: string | number | null;
  comment_reference_id: string | number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  attachments?: ForumDiscussionAttachment[];
  likes?: { user_id: number }[];
};

type ForumDiscussionDocument = {
  _id?: string;
  forum_group_id: string | number;
  user_id: number;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  tags: ForumDiscussionTag[];
  attachments: ForumDiscussionAttachment[];
  likes: { user_id: number }[];
  saves: { user_id: number }[];
  comments: ForumDiscussionComment[];
};

type Reply = {
  id: string;
  author: string;
  authorAvatar: string;
  content: string;
  ago: string;
  likes: number;
  images?: ImageAttachment[];
};

type Post = {
  id: string;
  groupId: string | number;
  authorId: number;
  author: string;
  authorAvatar?: string;
  title: string;
  content: string;
  excerpt: string;
  likes: number;
  comments: number;
  saves: number;
  ago: string;
  date: string;
  replies?: Reply[];
  tag?: string;
  tags: ForumDiscussionTag[];
  images?: ImageAttachment[];
  raw: ForumDiscussionDocument;
};

type Group = {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  members: ForumGroupMember[];
  memberCount: number;
  joined: boolean;
  gradient: string;
  tags: string[];
  status: string;
};

// ==================== CONSTANTS ====================
const CURRENT_USER_ID = 1;
const CURRENT_USER_NAME = "John Paul Mahilom";
const CURRENT_USER_AVATAR = "https://i.pravatar.cc/150?u=john";

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
  { value: "most-liked", label: "Most Liked", icon: <ThumbsUp className="h-3 w-3" /> },
  { value: "most-commented", label: "Most Commented", icon: <MessageCircle className="h-3 w-3" /> },
];

// ==================== UTILITIES ====================
const formatAgo = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
};

const makeAuthorLabel = (userId: number) => 
  userId === CURRENT_USER_ID ? CURRENT_USER_NAME : `User ${userId}`;

const makeAuthorAvatar = (userId: number) => 
  `https://i.pravatar.cc/150?u=${userId}`;

const normalizeImageAttachments = (attachments?: ForumDiscussionAttachment[]): ImageAttachment[] => {
  return (attachments ?? []).map((attachment, index) => ({
    id: `${attachment.file_path}-${index}`,
    preview: attachment.file_path,
    url: attachment.file_path,
  }));
};

const normalizeReplies = (comments?: ForumDiscussionComment[]): Reply[] => {
  return (comments ?? []).map((comment, index) => ({
    id: String(comment.comment_id ?? `${comment.user_id}-${index}`),
    author: makeAuthorLabel(comment.user_id),
    authorAvatar: makeAuthorAvatar(comment.user_id),
    content: comment.comment,
    ago: formatAgo(comment.created_at),
    likes: comment.likes?.length ?? 0,
    images: normalizeImageAttachments(comment.attachments),
  }));
};

const normalizeDiscussion = (discussion: ForumDiscussionDocument): Post => {
  const discussionId = String(discussion._id ?? `${discussion.forum_group_id}-${discussion.user_id}-${discussion.created_at}`);
  const images = normalizeImageAttachments(discussion.attachments);

  return {
    id: discussionId,
    groupId: discussion.forum_group_id,
    authorId: discussion.user_id,
    author: makeAuthorLabel(discussion.user_id),
    authorAvatar: makeAuthorAvatar(discussion.user_id),
    title: discussion.title,
    content: discussion.description,
    excerpt: discussion.description.length > 180 ? `${discussion.description.slice(0, 180)}...` : discussion.description,
    likes: discussion.likes?.length ?? 0,
    comments: discussion.comments?.length ?? 0,
    saves: discussion.saves?.length ?? 0,
    ago: formatAgo(discussion.created_at),
    date: discussion.created_at,
    replies: normalizeReplies(discussion.comments),
    tag: discussion.tags?.[0] ? String(discussion.tags[0].forum_tag_id) : undefined,
    tags: discussion.tags ?? [],
    images,
    raw: discussion,
  };
};

const normalizeGroup = (group: ForumGroupDocument, index: number): Group => {
  const members = group.members ?? [];
  const joined = members.some((member) => member.userId === CURRENT_USER_ID);

  return {
    id: String(group._id),
    name: group.group_name,
    description: group.description ?? "",
    imageUrl: group.image_url ?? null,
    members,
    memberCount: members.length,
    joined,
    gradient: gradientOptions[index % gradientOptions.length],
    tags: group.tags ?? [],
    status: group.status || "active",
  };
};

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

// ==================== COMPONENTS ====================
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

      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={() => setSelectedImage(null)}>
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
  postId,
  replyText,
  updateReplyText,
  handleReply,
  uploadImages,
  images,
  removeImage,
  isUploading,
}: {
  postId: string;
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
        formattedText = selectedText ? selectedText.split("\n").map((line) => `- ${line}`).join("\n") : "- ";
        newCursorPos = start + 2;
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
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
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
          className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-white/20"
        />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-white/15 border-b-0 bg-white/5 px-2 py-1">
            <button type="button" onClick={() => applyFormatting("bold")} className="rounded p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white" title="Bold">
              <strong className="text-xs">B</strong>
            </button>
            <button type="button" onClick={() => applyFormatting("italic")} className="rounded p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white" title="Italic">
              <em className="text-xs">I</em>
            </button>
            <button type="button" onClick={() => applyFormatting("bullet-list")} className="rounded p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white" title="Bullet List">
              <span className="text-xs">•</span>
            </button>
            <button type="button" onClick={() => applyFormatting("code")} className="rounded p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white" title="Code">
              <span className="text-xs">{'<>'}</span>
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white" title="Upload Image">
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
              placeholder="Write a reply... (Supports **bold**, *italic*, `code`, and images)"
              className="w-full resize-none rounded-b-lg border border-white/15 border-t-0 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              rows={3}
            />
          ) : (
            <div className="min-h-20 rounded-b-lg border border-white/15 border-t-0 bg-white/5 p-3">
              {replyText.trim() ? (
                <div className="prose prose-invert prose-sm max-w-none text-sm text-zinc-400" dangerouslySetInnerHTML={{ __html: renderMarkdownPreview() }} />
              ) : (
                <p className="text-sm italic text-zinc-500">Nothing to preview...</p>
              )}
            </div>
          )}

          {images.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {images.map((image) => (
                <div key={image.id} className="group relative">
                  <img src={image.preview} alt="Upload preview" className="h-16 w-16 rounded-lg object-cover border border-white/10" />
                  {image.uploading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/70">
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                    </div>
                  )}
                  <button
                    onClick={() => removeImage(image.id)}
                    className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white opacity-0 transition group-hover:opacity-100"
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
              className="flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
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
            onChange={(e) => uploadImages(e.target.files)}
            data-post-id={postId}
          />
        </div>
      </div>
    </div>
  );
};

const SidebarSkeleton = () => (
  <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4">
    <div className="mb-2 h-5 w-24 animate-pulse rounded bg-white/10" />
    <div className="mb-3 h-3 w-32 animate-pulse rounded bg-white/5" />
    <div className="flex flex-wrap gap-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-7 w-16 animate-pulse rounded-full bg-white/10" />
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

// ==================== MAIN COMPONENT ====================
const Forums = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ForumTab>("feed");
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("latest");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyImages, setReplyImages] = useState<Record<string, ImageAttachment[]>>({});
  const [replyUploading, setReplyUploading] = useState<Record<string, boolean>>({});
  const [groupsList, setGroupsList] = useState<Group[]>([]);
  const [groupDiscussions, setGroupDiscussions] = useState<Post[]>([]);
  const [myDiscussionPosts, setMyDiscussionPosts] = useState<Post[]>([]);
  const [isNewDiscussionOpen, setIsNewDiscussionOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [postMenuOpen, setPostMenuOpen] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [deletingPost, setDeletingPost] = useState<Post | null>(null);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [reloadKey, setReloadKey] = useState(0);
  const navigate = useNavigate();
  const userId = useGlobalState((state) => state.user?.userId);
  const [joinedGroups, setJoinedGroups] = useState<Group[]>([]);
  
  const availableFilterGroups = joinedGroups;

  // ==================== EFFECTS ====================
  useEffect(() => {
    if (joinedGroups.length > 0 && selectedGroupIds.length === 0) {
      setSelectedGroupIds(joinedGroups.map((group) => group.id));
    }
  }, [joinedGroups]);

  useEffect(() => {
    let cancelled = false;

    const loadForumData = async () => {
      setLoading(true);
      try {
        const groupsResponse = await api.get<ForumGroupDocument[]>("/api/forum/groups");
        let normalizedGroups = (groupsResponse.data ?? []).map((group, index) => normalizeGroup(group, index));
        normalizedGroups = normalizedGroups.filter((group) => group.status === "active");
        const userJoinedGroups = normalizedGroups.filter((group) => 
          group.members.some((member) => member.userId === userId)
        );
        
        if (cancelled) return;
        setJoinedGroups(userJoinedGroups);
        setGroupsList(normalizedGroups);

        const discussionResponses = await Promise.all(
          normalizedGroups.map(async (group) => {
            try {
              const response = await api.get<ForumDiscussionDocument>(`/api/forum/discussions/group/${group.id}`);
              return response.data ? [normalizeDiscussion(response.data)] : [];
            } catch {
              return [];
            }
          })
        );

        if (cancelled) return;
        setGroupDiscussions(discussionResponses.flat());

        try {
          const userDiscussionsResponse = await api.get<ForumDiscussionDocument[] | ForumDiscussionDocument>(
            `/api/forum/discussions/user/${CURRENT_USER_ID}`
          );
          const normalizedMyDiscussions = Array.isArray(userDiscussionsResponse.data)
            ? userDiscussionsResponse.data.map((discussion) => normalizeDiscussion(discussion))
            : userDiscussionsResponse.data
              ? [normalizeDiscussion(userDiscussionsResponse.data)]
              : [];

          if (!cancelled) {
            setMyDiscussionPosts(normalizedMyDiscussions);
          }
        } catch {
          if (!cancelled) setMyDiscussionPosts([]);
        }
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
  }, [reloadKey, userId]);

  // ==================== MEMOIZED DATA ====================
  const allDiscussionPosts = useMemo(() => {
    const uniquePosts = new Map<string, Post>();
    [...groupDiscussions, ...myDiscussionPosts].forEach((post) => uniquePosts.set(post.id, post));
    return Array.from(uniquePosts.values());
  }, [groupDiscussions, myDiscussionPosts]);

  const visiblePosts = useMemo(() => {
    let filtered: Post[] = [];

    if (activeTab === "feed") {
      filtered = groupDiscussions.filter((post) => selectedGroupIds.includes(String(post.groupId)));
    } else if (activeTab === "my-discussions") {
      filtered = myDiscussionPosts.filter((post) => post.authorId === CURRENT_USER_ID);
    } else if (activeTab === "saved") {
      filtered = allDiscussionPosts.filter((post) => post.raw.saves.some((save) => save.user_id === CURRENT_USER_ID));
    } else {
      return [];
    }

    // Apply search filter - searches through group names, post titles, content, and authors
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((post) => {
        const group = groupsList.find((g) => String(g.id) === String(post.groupId));
        const matchesGroup = group?.name.toLowerCase().includes(query) ?? false;
        const matchesTitle = post.title.toLowerCase().includes(query);
        const matchesContent = post.excerpt.toLowerCase().includes(query);
        const matchesAuthor = post.author.toLowerCase().includes(query);
        
        return matchesGroup || matchesTitle || matchesContent || matchesAuthor;
      });
    }

    // Apply sorting
    if (sortBy === "latest") {
      filtered = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (sortBy === "most-liked") {
      filtered = [...filtered].sort((a, b) => b.likes - a.likes);
    } else if (sortBy === "most-commented") {
      filtered = [...filtered].sort((a, b) => b.comments - a.comments);
    }

    return filtered;
  }, [activeTab, allDiscussionPosts, groupDiscussions, myDiscussionPosts, searchQuery, selectedGroupIds, sortBy, groupsList]);

  // Filter groups for Groups and My Groups tabs with search
  const visibleGroups = useMemo(() => {
    let groups = activeTab === "my-groups" ? joinedGroups : groupsList;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      groups = groups.filter((group) => 
        group.name.toLowerCase().includes(query) || 
        group.description.toLowerCase().includes(query)
      );
    }
    
    return groups;
  }, [activeTab, groupsList, joinedGroups, searchQuery]);

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
    setReplyText((prev) => ({ ...prev, [postId]: text }));
  }, []);

  const handleLikePost = useCallback((postId: string) => {
    setLikedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
        setGroupDiscussions((items) => items.map((post) => 
          post.id === postId ? { ...post, likes: Math.max(0, post.likes - 1) } : post
        ));
        setMyDiscussionPosts((items) => items.map((post) => 
          post.id === postId ? { ...post, likes: Math.max(0, post.likes - 1) } : post
        ));
      } else {
        next.add(postId);
        setGroupDiscussions((items) => items.map((post) => 
          post.id === postId ? { ...post, likes: post.likes + 1 } : post
        ));
        setMyDiscussionPosts((items) => items.map((post) => 
          post.id === postId ? { ...post, likes: post.likes + 1 } : post
        ));
      }
      return next;
    });
  }, []);

  const handleReply = useCallback(async (postId: string) => {
    const replyContent = replyText[postId]?.trim();
    const replyImageList = replyImages[postId] ?? [];

    if (!replyContent && replyImageList.length === 0) return;

    const post = allDiscussionPosts.find((item) => item.id === postId);
    if (!post) return;

    const payload = {
      user_id: CURRENT_USER_ID,
      comment: replyContent || "",
      comment_id: `cmt_${Date.now()}`,
      comment_reference_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      attachments: replyImageList.map((image) => ({ file_path: image.url || image.preview })),
      likes: [],
    };

    try {
      await api.post(`/api/forum/discussions/${post.id}/comments`, payload);
      setReplyText((prev) => ({ ...prev, [postId]: "" }));
      setReplyImages((prev) => ({ ...prev, [postId]: [] }));
      showSuccessToast("Reply posted successfully!");
      refreshForumData();
    } catch (error) {
      console.error(error);
      showErrorToast("Failed to post reply");
    }
  }, [replyText, replyImages, allDiscussionPosts, refreshForumData]);

  const handleReplyImageUpload = useCallback(async (postId: string, files: FileList | null) => {
    if (!files) return;

    const newImages: ImageAttachment[] = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      if (!file.type.startsWith("image/")) {
        showErrorToast(`${file.name} is not an image file`);
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        showErrorToast(`${file.name} exceeds 5MB limit`);
        continue;
      }

      newImages.push({
        id: `${Date.now()}-${index}`,
        file,
        preview: URL.createObjectURL(file),
        uploading: true,
        uploadProgress: 0,
      });
    }

    setReplyImages((prev) => ({
      ...prev,
      [postId]: [...(prev[postId] ?? []), ...newImages],
    }));
    setReplyUploading((prev) => ({ ...prev, [postId]: true }));

    for (const image of newImages) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      setReplyImages((prev) => ({
        ...prev,
        [postId]: (prev[postId] ?? []).map((item) => 
          item.id === image.id ? { ...item, uploading: false, url: item.preview } : item
        ),
      }));
    }

    setReplyUploading((prev) => ({ ...prev, [postId]: false }));
  }, []);

  const removeReplyImage = useCallback((postId: string, imageId: string) => {
    const image = replyImages[postId]?.find((item) => item.id === imageId);
    if (image?.preview.startsWith("blob:")) {
      URL.revokeObjectURL(image.preview);
    }

    setReplyImages((prev) => ({
      ...prev,
      [postId]: (prev[postId] ?? []).filter((item) => item.id !== imageId),
    }));
  }, [replyImages]);

  const handleCreatePost = useCallback(async (postData: {
    title: string;
    content: string;
    groupId: string;
    tag: string;
    images?: ImageAttachment[];
  }) => {
    const payload: ForumDiscussionDocument = {
      forum_group_id: postData.groupId,
      user_id: CURRENT_USER_ID,
      title: postData.title,
      description: postData.content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      tags: postData.tag ? [{ forum_tag_id: Number.isNaN(Number(postData.tag)) ? 0 : Number(postData.tag) }] : [],
      attachments: (postData.images ?? []).map((image) => ({ file_path: image.url || image.preview })),
      likes: [],
      saves: [],
      comments: [],
    };

    try {
      await api.post("/api/forum/discussions", payload);
      showSuccessToast(`"${postData.title}" posted successfully!`);
      setIsNewDiscussionOpen(false);
      refreshForumData();
    } catch (error) {
      console.error(error);
      showErrorToast("Failed to create discussion");
    }
  }, [refreshForumData]);

  const handleEditPost = useCallback((postId: number, updatedData: { title: string; content: string; tag: string; images?: ImageAttachment[] }) => {
    const updatePosts = (posts: Post[]) =>
      posts.map((post) =>
        post.id === String(postId)
          ? {
              ...post,
              title: updatedData.title,
              content: updatedData.content,
              excerpt: updatedData.content.length > 180 ? `${updatedData.content.slice(0, 180)}...` : updatedData.content,
              tag: updatedData.tag,
              images: updatedData.images,
            }
          : post
      );

    setGroupDiscussions((prev) => updatePosts(prev));
    setMyDiscussionPosts((prev) => updatePosts(prev));
    showSuccessToast("Post updated successfully");
    refreshForumData();
  }, [refreshForumData]);

  const handleDeletePost = useCallback(() => {
    if (!deletingPost) return;

    setGroupDiscussions((prev) => prev.filter((post) => post.id !== deletingPost.id));
    setMyDiscussionPosts((prev) => prev.filter((post) => post.id !== deletingPost.id));
    if (expandedPostId === deletingPost.id) setExpandedPostId(null);
    setDeletingPost(null);
    showSuccessToast(`"${deletingPost.title}" has been deleted`);
    refreshForumData();
  }, [deletingPost, expandedPostId, refreshForumData]);

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
          className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-zinc-400 transition hover:border-white/30 hover:text-white"
        >
          <Filter className="h-4 w-4" />
          {isFilterVisible ? "Hide Filters" : "Show Filters"}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isFilterVisible ? "rotate-180" : ""}`} />
        </button>

        {selectedGroupIds.length !== joinedGroups.length && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">{Math.abs(selectedGroupIds.length - joinedGroups.length)}</span>
            <button onClick={clearAllGroups} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300">
              <X className="h-3 w-3" />
              Clear
            </button>
          </div>
        )}
      </div>

      {isFilterVisible && (
        <div className="space-y-4 animate-slide-in">
          <div className="rounded-xl border border-white/10 bg-linear-to-br from-white/5 to-transparent p-4 backdrop-blur-sm">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">My Groups</h3>
              <div className="flex gap-2">
                <button onClick={selectAllGroups} className="text-[10px] text-blue-400 hover:text-blue-300">Select All</button>
                <button onClick={clearAllGroups} className="text-[10px] text-red-400 hover:text-red-300">Clear</button>
              </div>
            </div>
            <p className="mb-3 text-[11px] text-zinc-500">Show discussions from selected groups</p>
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
                >
                  {group.name}
                </button>
              ))}
              {availableFilterGroups.length === 0 && (
                <p className="text-xs text-zinc-500">You haven't joined any groups yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-linear-to-br from-white/5 to-transparent p-4 backdrop-blur-sm">
            <h3 className="text-sm font-semibold text-white">Sort By</h3>
            <p className="mb-3 text-[11px] text-zinc-500">Order discussions</p>
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

  const renderPostCard = (post: Post, showGroupName: boolean = true) => {
    const group = groupsList.find((item) => String(item.id) === String(post.groupId));
    const isLiked = likedPosts.has(post.id);
    const isExpanded = expandedPostId === post.id;

    return (
      <div key={post.id} className="group relative overflow-hidden rounded-xl border border-white/10 bg-linear-to-br from-white/5 to-transparent transition-all duration-300 hover:border-white/20 hover:bg-white/10">
        <div className="p-4">
          <div className="mb-3 flex items-start gap-3">
            <img src={post.authorAvatar} alt={post.author} className="h-10 w-10 rounded-full object-cover ring-2 ring-white/20" />

            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-white">{post.author}</p>
                  <span className="text-xs text-zinc-500">{post.ago}</span>
                  {showGroupName && group && (
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

                <div className="relative">
                  <button
                    onClick={() => setPostMenuOpen((current) => (current === post.id ? null : post.id))}
                    className="rounded-lg p-1 text-zinc-500 transition hover:bg-white/10 hover:text-white"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {postMenuOpen === post.id && (
                    <div className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-lg border border-white/10 bg-[#0d0f1a] shadow-xl">
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
              </div>

              <h3
                onClick={() => navigate(`/forums/discussion/${post.id}`)}
                className="mt-1 cursor-pointer text-base font-semibold text-white transition-colors hover:text-blue-400"
              >
                {post.title}
              </h3>

              <div className="prose prose-invert prose-sm mt-2 max-w-none text-sm text-zinc-400" dangerouslySetInnerHTML={{ __html: renderMarkdownContent(post.excerpt) }} />

              <ImageGallery images={post.images} />

              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                <button onClick={() => toggleExpand(post.id)} className="inline-flex items-center gap-1 text-zinc-500 transition hover:text-white" type="button">
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>{post.comments} replies</span>
                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>

                <button
                  onClick={() => handleLikePost(post.id)}
                  className={`inline-flex items-center gap-1 transition-all duration-200 ${
                    isLiked ? "text-red-400 hover:text-red-300" : "text-zinc-500 hover:text-white"
                  }`}
                  type="button"
                >
                  <Heart className={`h-3.5 w-3.5 transition-all ${isLiked ? "fill-red-400" : ""}`} />
                  <span>{post.likes} likes</span>
                </button>

                <button className="inline-flex items-center gap-1 text-zinc-500 transition hover:text-white" type="button">
                  <Bookmark className="h-3.5 w-3.5" />
                  <span>Save</span>
                </button>
              </div>
            </div>
          </div>

          {isExpanded && (
            <div className="animate-fade-in border-t border-white/10 pt-4">
              <div className="space-y-4">
                {post.replies && post.replies.length > 0 ? (
                  post.replies.map((reply) => (
                    <div key={reply.id} className="flex gap-3">
                      <img src={reply.authorAvatar} alt={reply.author} className="h-8 w-8 rounded-full object-cover ring-2 ring-white/20" />
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-white">{reply.author}</p>
                          <span className="text-xs text-zinc-500">{reply.ago}</span>
                        </div>
                        <div className="prose prose-invert prose-sm mt-1 max-w-none text-sm text-zinc-400" dangerouslySetInnerHTML={{ __html: renderMarkdownContent(reply.content) }} />
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
                  <p className="py-4 text-center text-sm text-zinc-500">No replies yet. Be the first to reply!</p>
                )}
              </div>

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
  };

  const renderGroupsGrid = () => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {visibleGroups.map((group) => (
        <div
          key={group.id}
          onClick={() => navigate(`/forums/group/${group.id}`)}
          className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-linear-to-br from-white/5 to-transparent transition-all duration-300 hover:scale-[1.02] hover:border-white/20 hover:bg-white/10"
        >
          {group.imageUrl ? (
            <img src={group.imageUrl} alt={group.name} className="h-24 w-full object-cover" />
          ) : (
            <div className={`h-24 bg-linear-to-r ${group.gradient}`} />
          )}
          <div className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-zinc-500">Forum Group</p>
                <h3 className="mt-1 text-sm font-semibold text-white">{group.name}</h3>
              </div>
              {group.joined && (
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400">Joined</span>
              )}
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{group.description}</p>
            <div className="mt-2 flex items-center gap-2">
              <Users className="h-3 w-3 text-zinc-500" />
              <p className="text-xs text-zinc-500">{group.memberCount} members</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {group.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[9px] text-blue-400">{tag}</span>
              ))}
              {group.tags.length > 3 && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] text-zinc-400">+{group.tags.length - 3}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderEmptyState = (icon: React.ReactNode, title: string, message: string, buttonText?: string, onButtonClick?: () => void) => (
    <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 p-12 text-center">
      {icon}
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-1 text-sm text-zinc-400">{message}</p>
      {buttonText && onButtonClick && (
        <button onClick={onButtonClick} className="mt-4 rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600">
          {buttonText}
        </button>
      )}
    </div>
  );

  // ==================== LOADING STATE ====================
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
            <div><SidebarSkeleton /></div>
            <div>
              <div className="mb-4 h-10 w-full animate-pulse rounded-full bg-white/5" />
              <div className="mb-4 flex gap-2 border-b border-white/10 pb-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-white/10" />
                ))}
              </div>
              <div className="mb-4 h-4 w-48 animate-pulse rounded bg-white/5" />
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (<PostCardSkeleton key={i} />))}
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
    <div className="min-h-screen bg-[#080a12]">
      <UserHeader pageTitle="Forums" credits={1250} />

      <div className="mx-auto max-w-7xl p-6 md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Community Forums</h1>
            <p className="text-sm text-zinc-400">Live forum groups and discussions from the backend</p>
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

        {/* Dynamic grid layout - changes based on active tab */}
        <div className={`grid grid-cols-1 gap-6 ${activeTab === "feed" ? "lg:grid-cols-[280px_1fr]" : "lg:grid-cols-1"}`}>
          {/* Sidebar - only visible when active tab is "feed" */}
          {activeTab === "feed" && (
            <div>
              {renderFilterSidebar()}
            </div>
          )}

          {/* Main Content - takes full width when sidebar is hidden */}
          <div className={activeTab === "feed" ? "" : "mx-auto w-full max-w-4xl"}>
            {/* Search Bar */}
            <div className="mb-4 flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5">
              <Search className="h-4 w-4 text-zinc-500" />
              <input
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
                placeholder="Search discussions or groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-zinc-500 hover:text-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
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
                      ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                      : "border border-white/15 bg-white/5 text-zinc-400 hover:border-white/30 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Groups View */}
            {(activeTab === "groups" || activeTab === "my-groups") && (
              <>
                {visibleGroups.length === 0 ? (
                  renderEmptyState(
                    <Users className="mb-3 h-8 w-8 text-zinc-500" />,
                    "No groups found",
                    searchQuery ? `No groups matching "${searchQuery}"` : "No groups available",
                    activeTab === "my-groups" ? "Browse Groups" : undefined,
                    activeTab === "my-groups" ? () => setActiveTab("groups") : undefined
                  )
                ) : (
                  <>
                    {searchQuery && (
                      <p className="mb-3 text-sm text-zinc-500">Found {visibleGroups.length} group{visibleGroups.length !== 1 ? "s" : ""} matching "{searchQuery}"</p>
                    )}
                    {renderGroupsGrid()}
                  </>
                )}
              </>
            )}

            {/* Feed View */}
            {activeTab === "feed" && (
              <div className="space-y-4">
                {feedBlocked ? (
                  renderEmptyState(
                    <Users className="mb-3 h-8 w-8 text-zinc-500" />,
                    "No groups selected",
                    "Select at least one group from the filters to see its discussions",
                    "Select All My Groups",
                    selectAllGroups
                  )
                ) : visiblePosts.length === 0 ? (
                  renderEmptyState(
                    <MessageCircle className="mb-3 h-8 w-8 text-zinc-500" />,
                    searchQuery ? "No matching discussions" : "No discussions yet",
                    searchQuery ? `No discussions found matching "${searchQuery}"` : "Start a discussion in one of your selected groups",
                    !searchQuery ? "Create Discussion" : undefined,
                    !searchQuery ? () => setIsNewDiscussionOpen(true) : undefined
                  )
                ) : (
                  <>
                    <p className="text-sm text-zinc-500">
                      {searchQuery 
                        ? `Found ${visiblePosts.length} discussion${visiblePosts.length !== 1 ? "s" : ""} matching "${searchQuery}"` 
                        : `Showing ${visiblePosts.length} discussions from your joined groups`}
                    </p>
                    {visiblePosts.map((post) => renderPostCard(post, true))}
                  </>
                )}
              </div>
            )}

            {/* My Discussions View */}
            {activeTab === "my-discussions" && (
              <div className="space-y-4">
                {visiblePosts.length === 0 ? (
                  renderEmptyState(
                    <MessageCircle className="mb-3 h-8 w-8 text-zinc-500" />,
                    searchQuery ? "No matching discussions" : "No discussions yet",
                    searchQuery ? `No discussions found matching "${searchQuery}"` : "Start a new discussion in one of your groups!",
                    !searchQuery ? "Create Discussion" : undefined,
                    !searchQuery ? () => setIsNewDiscussionOpen(true) : undefined
                  )
                ) : (
                  <>
                    <p className="text-sm text-zinc-500">
                      {searchQuery 
                        ? `Found ${visiblePosts.length} discussion${visiblePosts.length !== 1 ? "s" : ""} matching "${searchQuery}"` 
                        : `Showing ${visiblePosts.length} discussions created by you`}
                    </p>
                    {visiblePosts.map((post) => renderPostCard(post, true))}
                  </>
                )}
              </div>
            )}

            {/* Saved View */}
            {activeTab === "saved" && (
              <div className="space-y-4">
                {visiblePosts.length === 0 ? (
                  renderEmptyState(
                    <Bookmark className="mb-3 h-8 w-8 text-zinc-500" />,
                    searchQuery ? "No matching saved discussions" : "Saved Discussions",
                    searchQuery ? `No saved discussions found matching "${searchQuery}"` : "Bookmark discussions to see them here"
                  )
                ) : (
                  <>
                    <p className="text-sm text-zinc-500">
                      {searchQuery 
                        ? `Found ${visiblePosts.length} saved discussion${visiblePosts.length !== 1 ? "s" : ""} matching "${searchQuery}"` 
                        : `${visiblePosts.length} saved discussion${visiblePosts.length !== 1 ? "s" : ""}`}
                    </p>
                    {visiblePosts.map((post) => renderPostCard(post, true))}
                  </>
                )}
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
        availableGroups={joinedGroups.map((group) => ({ id: group.id, name: group.name, tags: group.tags }))}
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
        post={editingPost ? { id: Number.parseInt(editingPost.id, 10) || 0, title: editingPost.title, content: editingPost.content, tag: editingPost.tag || "", images: editingPost.images } : null}
      />

      <DeletePostModal
        isOpen={!!deletingPost}
        onClose={() => setDeletingPost(null)}
        onConfirm={handleDeletePost}
        postTitle={deletingPost?.title || ""}
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