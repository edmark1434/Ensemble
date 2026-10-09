import { useEffect, useState } from "react";
import { Eye, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";
import useStore from "../store/use-store";
import { useCurrentPlayerFrame } from "../hooks/use-current-frame";
import { millisecondsToHHMMSS } from "../utils/format";
import { useCommentsStore } from "@/features/editor/store/use-comments-store";
import type { CommentReply, CommentThread } from "../types/comments";

const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});
const TIME_FMT = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

// "Just now" / "5m" / "2h" / "3d" for the first 7 days, then "Oct 3, 2026 · 3:45 PM"
function formatCreatedAt(iso: string, now: number) {
  const d = new Date(iso);
  const diff = now - d.getTime();
  if (diff < 60_000) return "Just now"; // also covers small client/server clock skew
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${DATE_FMT.format(d)} · ${TIME_FMT.format(d)}`;
}

// re-render periodically so "Just now" / "5m ago" don't go stale
function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function Composer({
  placeholder,
  onSubmit,
}: {
  placeholder: string;
  onSubmit: (body: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    try {
      await onSubmit(body);
      setText("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={text}
        rows={2}
        maxLength={4000}
        autoFocus
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          // keep editor shortcuts (space, delete, ctrl+z...) from firing while typing
          e.stopPropagation();
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 w-full resize-none rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:ring-[3px]"
      />
      <Button
        size="sm"
        variant="default"
        className="self-end"
        onClick={submit}
        disabled={!text.trim() || busy}
      >
        Send
      </Button>
    </div>
  );
}

function Entry({
  item,
  onDelete,
  timeMs,
  onSeek,
}: {
  item: CommentReply;
  onDelete: () => void;
  timeMs?: number | null;
  onSeek?: () => void;
}) {
  const now = useNow();
  return (
    <div className="flex gap-3">
      <Avatar name={item.authorName} avatarUrl={item.avatarUrl} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
            <p className="max-w-full truncate text-xs text-zinc-200">{item.authorName}</p>
            <p className="whitespace-nowrap text-xs text-muted-foreground">
              {formatCreatedAt(item.createdAt, now)}
            </p>
          </div>
          {item.canDelete && (
            <Button
              onClick={onDelete}
              className="-mt-1 h-7 w-7 shrink-0 text-muted-foreground hover:!bg-accent/30 hover:text-red-500"
              variant="ghost"
              size="icon"
              aria-label="Delete"
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
        <p className="mt-0 whitespace-pre-wrap break-words text-sm text-pretty">
          {timeMs != null && (
            <button
              onClick={onSeek}
              className="mr-2 -my-0.5 mb-0 inline-block rounded-md bg-primary/10 px-2 py-0.5 align-middle text-xs text-primary transition-colors hover:bg-primary/20"
            >
              {millisecondsToHHMMSS(Math.floor(timeMs / 1000) * 1000)}
            </button>
          )}
          {item.body}
        </p>
      </div>
    </div>
  );
}

function Thread({
  thread,
  canComment,
  focused,
  onSeek,
  onReply,
  onDeleteComment,
  onDeleteReply,
}: {
  thread: CommentThread;
  canComment: boolean;
  focused: boolean;
  onSeek: () => void;
  onReply: (body: string) => Promise<void>;
  onDeleteComment: () => void;
  onDeleteReply: (replyId: string) => void;
}) {
  const [replying, setReplying] = useState(false);

  return (
    <div
      id={`comment-${thread.id}`}
      className={cn(
        "flex scroll-my-4 flex-col gap-4 rounded-md border p-3 transition-colors",
        focused ? "border-primary bg-primary/5" : "border-border",
      )}
    >
      <Entry
        item={thread}
        onDelete={onDeleteComment}
        timeMs={thread.timeMs}
        onSeek={onSeek}
      />

      {thread.replies.length > 0 && (
        <div className="ml-4 flex flex-col gap-4">
          {thread.replies.map((r) => (
            <Entry key={r.id} item={r} onDelete={() => onDeleteReply(r.id)} />
          ))}
        </div>
      )}

      {canComment &&
        (replying ? (
          <Composer
            placeholder="Reply…"
            onSubmit={async (body) => {
              await onReply(body);
              setReplying(false);
            }}
          />
        ) : (
          <button
            onClick={() => setReplying(true)}
            className="self-start text-xs text-muted-foreground hover:text-foreground"
          >
            Reply
          </button>
        ))}
    </div>
  );
}

export function CommentsPanel() {
  const { data, error, post, remove, focusedId, setFocusedId } = useCommentsStore();
  const playerRef = useStore((s) => s.playerRef);
  const fps = useStore((s) => s.fps);
  const [composing, setComposing] = useState(false);
  const currentFrame = useCurrentPlayerFrame(playerRef ?? null);
  // A comment is stored as ms from the exact playhead frame, so this round-trips.
  const atPlayhead = (ms: number | null) =>
    ms != null && Math.round((ms * fps) / 1000) === currentFrame;

  const seek = (ms: number) => playerRef?.current?.seekTo(Math.round((ms * fps) / 1000));
  const currentMs = () => {
    const f = playerRef?.current?.getCurrentFrame?.();
    return f == null ? undefined : Math.round((f / fps) * 1000);
  };

  useEffect(() => {
    if (!focusedId || !data) return;
    document
      .getElementById(`comment-${focusedId}`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusedId, data]);

  useEffect(() => () => setFocusedId(null), [setFocusedId]);

  return (
    <div className="w-full flex-none">
      <div className="flex h-full flex-1 flex-col overflow-hidden min-h-0">
        <ScrollArea className="h-full">
          <div className="m-0 flex min-w-0 flex-col gap-6 border-0 p-4">
            {data && !data.canComment && (
              <div className="flex items-center gap-2 text-sm font-normal text-primary">
                <Eye size={16} />
                <span>You only have view access to comments</span>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Label className="font-sans text-sm font-semibold">Comments</Label>
                {data?.canComment && (
                  <Button
                    onClick={() => setComposing((v) => !v)}
                    className={cn("-my-1.5 h-7 w-7 hover:!bg-accent/30", composing && "bg-accent/30")}
                    variant="ghost"
                    size="icon"
                    aria-label="Add comment"
                  >
                    <Plus size={16} />
                  </Button>
                )}
              </div>

              {data?.canComment && composing && (
                <Composer
                  placeholder="Comment at the playhead…"
                  onSubmit={async (body) => {
                    await post(body, undefined, currentMs());
                    setComposing(false);
                  }}
                />
              )}

              {error && <p className="text-sm text-red-500">{error}</p>}
              {!error && !data && (
                <p className="text-sm text-muted-foreground">Loading…</p>
              )}
              {data && data.threads.length === 0 && (
                <p className="text-sm text-muted-foreground">No comments yet.</p>
              )}

              {data?.threads.map((t) => (
                <Thread
                  key={t.id}
                  thread={t}
                  canComment={data.canComment}
                  focused={atPlayhead(t.timeMs)}
                  onSeek={() => t.timeMs != null && seek(t.timeMs)}
                  onReply={(body) => post(body, t.id)}
                  onDeleteComment={() => remove({ commentId: t.id })}
                  onDeleteReply={(replyId) => remove({ replyId })}
                />
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}