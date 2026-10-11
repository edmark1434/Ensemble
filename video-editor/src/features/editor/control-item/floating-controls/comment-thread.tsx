// features/editor/control-item/floating-controls/comment-thread.tsx

import { useEffect } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import useLayoutStore from "@/features/editor/store/use-layout-store";
import { useCommentsStore } from "@/features/editor/store/use-comments-store";
import {
  Composer,
  Entry,
  Tip,
  usePlayheadControls,
} from "@/features/editor/comments/comments-panel";

export default function CommentThreadControl() {
  const { setFloatingControl } = useLayoutStore();
  const { data, post, remove, setStatus, openThreadId } = useCommentsStore();
  const { seek, currentMs } = usePlayheadControls();

  const thread = data?.threads.find((t) => t.id === openThreadId);

  // thread got deleted (or the comments target changed): close the window
  useEffect(() => {
    if (data && !thread) setFloatingControl("");
  }, [data, thread, setFloatingControl]);

  if (!thread) return null;

  const resolved = thread.status === "resolved";

  return (
    <div className="w-md bg-card border flex flex-col rounded-lg">
      {/* Header */}
      <div className="handle flex cursor-grab items-center gap-2 p-4">
        <p className="text-sm font-semibold">Thread</p>
        <div className="ml-auto flex items-center gap-3">
          {data?.canComment && (
            <Tip label={resolved ? "Reopen thread" : "Mark as resolved"}>
              <Button
                size="sm"
                variant={resolved ? "default" : "outline"}
                className="h-8 gap-2 px-3 text-xs"
                onClick={() => void setStatus(thread.id, resolved ? "open" : "resolved")}
              >
                <Check size={14} />
                {resolved ? "Resolved" : "Resolve"}
              </Button>
            </Tip>
          )}
          <X
            className="h-4 w-4 cursor-pointer text-muted-foreground"
            onClick={() => setFloatingControl("")}
          />
        </div>
      </div>

      {/* px-1 + the box's px-3 = the header's 16px, so the avatars, the ⋯ buttons and the X
          line up. Only the original comment is in a solid box; replies sit plain below it. */}
      <ScrollArea className="w-full px-4 [&>[data-radix-scroll-area-viewport]]:max-h-[420px]">
        <div className="flex h-fit flex-col gap-5 pb-4">
          <div className="rounded-md bg-secondary p-4 text-secondary-foreground shadow-xs">
            <Entry
              item={thread}
              onDelete={() => void remove({ commentId: thread.id })}
              timeMs={thread.timeMs}
              onSeek={seek}
            />
          </div>

          {thread.replies.length > 0 && (
            <div className="flex flex-col gap-6 px-4">
              {thread.replies.map((r) => (
                <Entry
                  key={r.id}
                  item={r}
                  onDelete={() => void remove({ replyId: r.id })}
                  onSeek={seek}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {data?.canComment && (
        <div className="px-4 pb-4 pt-1">
          <Composer
            placeholder="Reply…"
            getTimeMs={currentMs}
            onSubmit={({ body, fileIds }) => post(body, { parentId: thread.id, fileIds })}
          />
        </div>
      )}
    </div>
  );
}