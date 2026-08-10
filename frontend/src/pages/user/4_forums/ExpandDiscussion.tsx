import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Bookmark,
  Edit2,
  Heart,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  MoreVertical,
  Reply,
  Send,
  Trash2,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import UserHeader from "@/components/nav/user_header";
import EditPostModal from "@/pages/user/4_forums/forum_modals/EditPostModal";
import DeletePostModal from "@/pages/user/4_forums/forum_modals/DeletePostModal";
import ReportGroupModal from "@/pages/user/4_forums/forum_modals/ReportGroupModal";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast";
import api from "@/lib/axios";
import useGlobalState from "@/lib/global_state";
import {
  buildForumCommentTree,
  forumImageUrl,
  type ForumComment,
  uploadForumCommentImage,
} from "@/pages/user/4_forums/forumCommentUtils";
import { reconcileForumDiscussions, useForumRealtime } from "@/pages/user/4_forums/forumRealtime";
import { identityFromDetails, loadCurrentForumAvatar } from "@/pages/user/4_forums/forumIdentity";

type UserId = string | number;

type Discussion = {
  _id: string;
  forum_group_id: string;
  user_id: UserId;
  title: string;
  content: string;
  tags: { tag_id: number; tag_name: string }[];
  imageKeys?: string[];
  attachments: { file_path: string }[];
  likes: { user_id: UserId }[];
  saves: { user_id: UserId }[];
  comments: ForumComment[];
  created_at: string;
  updated_at: string;
};

type Group = {
  _id: string;
  group_name: string;
  gradient?: string;
  tags: { tag_id: number; tag: string }[];
};

const sameUser = (left: UserId, right: UserId) => String(left) === String(right);

const CommentImages = ({ attachments }: { attachments: { file_path: string }[] }) => {
  if (!attachments?.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {attachments.map((attachment) => (
        <img
          key={attachment.file_path}
          src={forumImageUrl(attachment.file_path)}
          alt="Comment attachment"
          className="h-24 w-24 rounded-lg border border-gray-200 dark:border-white/10 object-cover"
        />
      ))}
    </div>
  );
};

const ReplyComposer = ({
  onSubmit,
  placeholder,
}: {
  onSubmit: (comment: string, attachments: { file_path: string }[]) => Promise<void>;
  placeholder: string;
}) => {
  const [comment, setComment] = useState("");
  const [attachments, setAttachments] = useState<{ key: string; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const uploadFiles = async (files: FileList | null) => {
    if (!files) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
          showErrorToast(`${file.name} must be an image under 5MB`);
          continue;
        }
        const key = await uploadForumCommentImage(file);
        setAttachments((current) => [
          ...current,
          { key, preview: URL.createObjectURL(file) },
        ]);
      }
    } catch (error) {
      console.error("Error uploading reply image:", error);
      showErrorToast("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if ((!comment.trim() && attachments.length === 0) || uploading || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(
        comment.trim(),
        attachments.map((attachment) => ({ file_path: attachment.key }))
      );
      attachments.forEach((attachment) => URL.revokeObjectURL(attachment.preview));
      setComment("");
      setAttachments([]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none p-3">
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full resize-none rounded-lg border border-gray-200 dark:border-white/10 bg-black/20 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-500 dark:text-zinc-500"
      />
      {attachments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <div key={attachment.key} className="relative">
              <img src={attachment.preview} alt="" className="h-16 w-16 rounded object-cover" />
              <button
                onClick={() => {
                  URL.revokeObjectURL(attachment.preview);
                  setAttachments((current) =>
                    current.filter((item) => item.key !== attachment.key)
                  );
                }}
                className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-gray-900 dark:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 flex justify-end gap-2">
        <label className="cursor-pointer rounded-lg p-2 text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:bg-white/10">
          <ImageIcon className="h-4 w-4" />
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => void uploadFiles(event.target.files)}
          />
        </label>
        <button
          onClick={() => void submit()}
          disabled={(!comment.trim() && attachments.length === 0) || uploading || submitting}
          className="flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-2 text-xs text-gray-900 dark:text-white disabled:opacity-50"
        >
          {uploading || submitting
            ? <Loader2 className="h-3 w-3 animate-spin" />
            : <Send className="h-3 w-3" />}
          Reply
        </button>
      </div>
    </div>
  );
};

const CommentNode = ({
  comment,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onLike,
  identities,
}: {
  comment: ForumComment;
  currentUserId: UserId;
  onReply: (
    parentId: string,
    comment: string,
    attachments: { file_path: string }[]
  ) => Promise<void>;
  onEdit: (commentId: string, comment: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onLike: (commentId: string) => Promise<void>;
  identities: Record<string, { name: string; avatar: string }>;
}) => {
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.comment);
  const [showChildren, setShowChildren] = useState(false);
  const isAuthor = sameUser(comment.user_id, currentUserId);
  const isLiked = comment.likes?.some((like) => sameUser(like.user_id, currentUserId));

  return (
    <div className={comment.depth ? "ml-5 border-l border-gray-200 dark:border-white/10 pl-4" : ""}>
      <div className="mt-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src={identities[String(comment.user_id)]?.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
            <div>
            <p className="text-xs font-medium text-gray-600 dark:text-zinc-300">{identities[String(comment.user_id)]?.name || "Forum member"}</p>
            <p className="text-[11px] text-zinc-600">
              {new Date(comment.created_at).toLocaleString()}
              {comment.is_edited ? " (edited)" : ""}
            </p>
            </div>
          </div>
          {isAuthor && !comment.deleted_at && (
            <div className="flex gap-1">
              <button onClick={() => setEditing(true)} className="p-1 text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:text-white">
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => void onDelete(comment.comment_id)}
                className="p-1 text-gray-500 dark:text-zinc-500 hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {editing ? (
          <div className="mt-3">
            <textarea
              value={editText}
              onChange={(event) => setEditText(event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-black/20 p-2 text-sm text-gray-900 dark:text-white"
            />
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => {
                  void onEdit(comment.comment_id, editText).then(() => setEditing(false));
                }}
                className="rounded bg-blue-500 px-3 py-1 text-xs text-gray-900 dark:text-white"
              >
                Save
              </button>
              <button onClick={() => setEditing(false)} className="text-xs text-gray-500 dark:text-zinc-400">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 text-sm text-gray-600 dark:text-zinc-300">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {comment.deleted_at ? "[deleted]" : comment.comment}
            </ReactMarkdown>
            <CommentImages attachments={comment.attachments || []} />
          </div>
        )}

        {!comment.deleted_at && (
          <div className="mt-3 flex gap-4">
            <button
              onClick={() => void onLike(comment.comment_id)}
              className={isLiked ? "flex items-center gap-1 text-xs text-red-400" : "flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-500"}
            >
              <Heart className={isLiked ? "h-3.5 w-3.5 fill-current" : "h-3.5 w-3.5"} />
              {comment.likes?.length || 0}
            </button>
            <button
              onClick={() => setReplying((value) => !value)}
              className="flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:text-white"
            >
              <Reply className="h-3.5 w-3.5" />
              Reply
            </button>
            {(comment.children || []).length > 0 && (
              <button onClick={() => setShowChildren((value) => !value)} className="text-xs text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:text-white">
                {showChildren ? "Hide" : "View"} {(comment.children || []).length} {(comment.children || []).length === 1 ? "reply" : "replies"}
              </button>
            )}
          </div>
        )}

        {replying && (
          <div className="mt-3">
            <ReplyComposer
              placeholder="Write a nested reply..."
              onSubmit={async (text, attachments) => {
                await onReply(comment.comment_id, text, attachments);
                setReplying(false);
              }}
            />
          </div>
        )}
      </div>

      {showChildren && (comment.children || []).map((child) => (
        <CommentNode
          key={child.comment_id}
          comment={child}
          currentUserId={currentUserId}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
          onLike={onLike}
          identities={identities}
        />
      ))}
    </div>
  );
};

const ExpandDiscussion = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const user = useGlobalState((state) => state.user);
  const currentUserId = user?.user_id || user?.userId || "";
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);
  const [reportingPost, setReportingPost] = useState(false);
  const [identities, setIdentities] = useState<Record<string, { name: string; avatar: string }>>({});
  useForumRealtime((event) => setDiscussion((current) => {
    if (!current) return current;
    return reconcileForumDiscussions([current], event)[0] || null;
  }), {
    groupId: discussion?.forum_group_id,
    discussionId: postId,
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!postId) return;
      setLoading(true);
      try {
        const discussionResponse = await api.get(`/api/forum/discussions/${postId}`);
        if (cancelled) return;
        const nextDiscussion = discussionResponse.data as Discussion;
        setDiscussion(nextDiscussion);
        const userIds = [...new Set([
          nextDiscussion.user_id,
          ...(nextDiscussion.comments || []).map((comment) => comment.user_id),
        ])];
        const detailsResponse = await api.post("/api/users/list-of-details", { userIds });
        const nextIdentities: Record<string, { name: string; avatar: string }> = {};
        for (const details of detailsResponse.data?.usersList || []) {
          nextIdentities[String(details.user_id)] = identityFromDetails(details);
        }
        if (currentUserId) {
          const current = nextIdentities[String(currentUserId)] || { name: "You", avatar: "" };
          nextIdentities[String(currentUserId)] = {
            ...current,
            avatar: await loadCurrentForumAvatar(current.avatar),
          };
        }
        if (!cancelled) setIdentities(nextIdentities);
        const groupResponse = await api.get(
          `/api/forum/groups/${nextDiscussion.forum_group_id}`
        );
        if (!cancelled) setGroup(groupResponse.data);
      } catch (error) {
        console.error("Error loading discussion:", error);
        if (!cancelled) setDiscussion(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [postId, currentUserId]);

  const commentTree = useMemo(
    () => buildForumCommentTree(discussion?.comments || []),
    [discussion?.comments]
  );

  const addComment = async (
    parentId: string | null,
    comment: string,
    attachments: { file_path: string }[]
  ) => {
    if (!discussion) return;
    try {
      const response = await api.post(
        `/api/forum/discussions/${discussion._id}/comments`,
        { comment, comment_reference_id: parentId, attachments }
      );
      setDiscussion((current) =>
        current
          ? {
              ...current,
              comments: current.comments.some((item) => item.comment_id === response.data.comment_id)
                ? current.comments
                : [...current.comments, response.data],
            }
          : current
      );
      showSuccessToast(parentId ? "Reply posted" : "Comment posted");
    } catch (error) {
      console.error("Error posting comment:", error);
      showErrorToast("Failed to post comment");
      throw error;
    }
  };

  const editComment = async (commentId: string, comment: string) => {
    if (!discussion) return;
    try {
      await api.patch(
        `/api/forum/discussions/${discussion._id}/comments/${commentId}`,
        { comment: { action: "edit", comment } }
      );
      setDiscussion((current) =>
        current
          ? {
              ...current,
              comments: current.comments.map((item) =>
                item.comment_id === commentId
                  ? { ...item, comment, is_edited: true, updated_at: new Date().toISOString() }
                  : item
              ),
            }
          : current
      );
      showSuccessToast("Comment edited");
    } catch (error) {
      console.error("Error editing comment:", error);
      showErrorToast("Failed to edit comment");
      throw error;
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!discussion) return;
    try {
      await api.patch(
        `/api/forum/discussions/${discussion._id}/comments/${commentId}`,
        { softDelete: true }
      );
      setDiscussion((current) =>
        current
          ? {
              ...current,
              comments: current.comments.map((item) =>
                item.comment_id === commentId
                  ? {
                      ...item,
                      comment: "[deleted]",
                      attachments: [],
                      deleted_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    }
                  : item
              ),
            }
          : current
      );
      showSuccessToast("Comment deleted");
    } catch (error) {
      console.error("Error deleting comment:", error);
      showErrorToast("Failed to delete comment");
    }
  };

  const likeComment = async (commentId: string) => {
    if (!discussion) return;
    const target = discussion.comments.find((comment) => comment.comment_id === commentId);
    if (!target) return;
    const wasLiked = target.likes.some((like) => sameUser(like.user_id, currentUserId));
    const updateLikes = (likes: { user_id: UserId }[]) =>
      wasLiked
        ? likes.filter((like) => !sameUser(like.user_id, currentUserId))
        : [...likes, { user_id: currentUserId }];

    setDiscussion((current) =>
      current
        ? {
            ...current,
            comments: current.comments.map((comment) =>
              comment.comment_id === commentId
                ? { ...comment, likes: updateLikes(comment.likes) }
                : comment
            ),
          }
        : current
    );
    try {
      await api.patch(
        `/api/forum/discussions/${discussion._id}/comments/${commentId}`,
        { likes: wasLiked ? { action: "remove" } : {} }
      );
    } catch (error) {
      console.error("Error liking comment:", error);
      setDiscussion((current) =>
        current
          ? {
              ...current,
              comments: current.comments.map((comment) =>
                comment.comment_id === commentId
                  ? { ...comment, likes: target.likes }
                  : comment
              ),
            }
          : current
      );
      showErrorToast("Failed to update reaction");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#080a12]">
        <UserHeader pageTitle="Discussion" credits={1250} />
        <div className="mx-auto max-w-4xl p-8">
          <div className="h-80 animate-pulse rounded-xl bg-gray-100 dark:bg-white/10" />
        </div>
      </div>
    );
  }

  if (!discussion) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#080a12]">
        <UserHeader pageTitle="Discussion" credits={1250} />
        <div className="mx-auto max-w-4xl p-8 text-center text-gray-500 dark:text-zinc-400">
          Discussion not found.
        </div>
      </div>
    );
  }

  const isAuthor = sameUser(discussion.user_id, currentUserId);
  const isLiked = discussion.likes.some((like) => sameUser(like.user_id, currentUserId));
  const isSaved = discussion.saves.some((save) => sameUser(save.user_id, currentUserId));

  const toggleDiscussionCollection = async (field: "likes" | "saves", active: boolean) => {
    setDiscussion((current) => {
      if (!current) return current;
      const values = current[field];
      return {
        ...current,
        [field]: active
          ? values.filter((entry) => !sameUser(entry.user_id, currentUserId))
          : [...values, { user_id: currentUserId }],
      };
    });
    try {
      await api.patch(`/api/forum/discussions/${discussion._id}`, {
        [field]: active ? { action: "remove" } : {},
      });
    } catch (error) {
      console.error(`Error updating discussion ${field}:`, error);
      showErrorToast(`Failed to update ${field}`);
      setDiscussion((current) => {
        if (!current) return current;
        const values = current[field];
        return {
          ...current,
          [field]: active
            ? [...values, { user_id: currentUserId }]
            : values.filter((entry) => !sameUser(entry.user_id, currentUserId)),
        };
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#080a12]">
      <UserHeader pageTitle="Discussion" credits={1250} />
      <main className="mx-auto max-w-4xl p-6 md:p-8">
        <button onClick={() => navigate(-1)} className="mb-5 flex items-center gap-2 text-sm text-gray-500 dark:text-zinc-400">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <article className="rounded-xl border border-gray-200 dark:border-white/10 bg-white/[0.04] p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-blue-400">{group?.group_name || "Forum"}</p>
              <div className="mt-1 flex items-center gap-2">
                <img src={identities[String(discussion.user_id)]?.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
                <p className="text-xs text-gray-500 dark:text-zinc-500">{identities[String(discussion.user_id)]?.name || "Forum member"}</p>
              </div>
            </div>
            {isAuthor ? (
              <div className="relative">
                <button onClick={() => setMenuOpen((value) => !value)} className="p-2 text-gray-500 dark:text-zinc-400">
                  <MoreVertical className="h-5 w-5" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 z-10 w-32 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0f1a] py-1">
                    <button onClick={() => setEditingPost(true)} className="flex w-full gap-2 px-3 py-2 text-sm text-gray-600 dark:text-zinc-300">
                      <Edit2 className="h-4 w-4" /> Edit
                    </button>
                    <button onClick={() => setDeletingPost(true)} className="flex w-full gap-2 px-3 py-2 text-sm text-red-400">
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => setReportingPost(true)} className="text-xs text-gray-500 dark:text-zinc-500 hover:text-red-400">
                Report discussion
              </button>
            )}
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">{discussion.title}</h1>
          <div className="prose prose-invert mt-4 max-w-none text-gray-600 dark:text-zinc-300">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{discussion.content}</ReactMarkdown>
          </div>
          {(discussion.imageKeys || []).length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
              {discussion.imageKeys!.map((key) => (
                <img key={key} src={forumImageUrl(key)} alt="" className="h-40 w-full rounded-lg object-cover" />
              ))}
            </div>
          )}
          <div className="mt-5 flex gap-5 border-t border-gray-200 dark:border-white/10 pt-4">
            <button
              onClick={() => void toggleDiscussionCollection("likes", isLiked)}
              className={isLiked ? "flex items-center gap-2 text-red-400" : "flex items-center gap-2 text-gray-500 dark:text-zinc-500"}
            >
              <Heart className={isLiked ? "h-5 w-5 fill-current" : "h-5 w-5"} />
              {discussion.likes.length}
            </button>
            <span className="flex items-center gap-2 text-gray-500 dark:text-zinc-500">
              <MessageCircle className="h-5 w-5" /> {discussion.comments.length}
            </span>
            <button
              onClick={() => void toggleDiscussionCollection("saves", isSaved)}
              className={isSaved ? "flex items-center gap-2 text-yellow-400" : "flex items-center gap-2 text-gray-500 dark:text-zinc-500"}
            >
              <Bookmark className={isSaved ? "h-5 w-5 fill-current" : "h-5 w-5"} /> Save
            </button>
          </div>
        </article>

        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Comments ({discussion.comments.length})
          </h2>
          <ReplyComposer
            placeholder="Write a comment..."
            onSubmit={(comment, attachments) => addComment(null, comment, attachments)}
          />
          <div className="mt-5">
            {commentTree.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500 dark:text-zinc-500">No comments yet.</p>
            ) : (
              commentTree.map((comment) => (
                <CommentNode
                  key={comment.comment_id}
                  comment={comment}
                  currentUserId={currentUserId}
                  onReply={(parentId, text, attachments) =>
                    addComment(parentId, text, attachments)
                  }
                  onEdit={editComment}
                  onDelete={deleteComment}
                  onLike={likeComment}
                  identities={identities}
                />
              ))
            )}
          </div>
        </section>
      </main>

      <EditPostModal
        isOpen={editingPost}
        onClose={() => setEditingPost(false)}
        onSave={async (_id, updatedData) => {
          const response = await api.patch(`/api/forum/discussions/${discussion._id}`, {
            title: updatedData.title,
            content: updatedData.content,
            tags: updatedData.tags,
            imageKeys: updatedData.imageKeys || [],
          });
          setDiscussion(response.data);
          setEditingPost(false);
          showSuccessToast("Discussion updated");
        }}
        post={{
          id: discussion._id,
          title: discussion.title,
          content: discussion.content,
          tags: discussion.tags,
          imageKeys: discussion.imageKeys || [],
        }}
        availableTags={group?.tags.map((tag) => ({
          tag_id: tag.tag_id,
          tag_name: tag.tag,
        })) || []}
      />
      <DeletePostModal
        isOpen={deletingPost}
        onClose={() => setDeletingPost(false)}
        onConfirm={async () => {
          await api.delete(`/api/forum/discussions/${discussion._id}`);
          showSuccessToast("Discussion deleted");
          navigate("/forums");
        }}
        postTitle={discussion.title}
      />
      <ReportGroupModal
        isOpen={reportingPost}
        onClose={() => setReportingPost(false)}
        groupName={discussion.title}
        subjectLabel="Discussion"
        onSubmit={async (reason, description) => {
          await api.post(`/api/forum/reports/discussions/${discussion._id}`, { reason, description });
          setReportingPost(false);
          showSuccessToast("Discussion reported");
        }}
      />
    </div>
  );
};

export default ExpandDiscussion;
