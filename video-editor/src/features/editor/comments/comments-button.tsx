import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import useLayoutStore from "../store/use-layout-store";
import { useCommentNotifications } from "../store/use-comment-notifications";
import commentColors from "./comment-colors.module.css";

export function CommentsButton() {
  const commentsOpen = useLayoutStore(s => s.activeRightItem === "comments");
  const setActiveRightItem = useLayoutStore(s => s.setActiveRightItem);
  const count = useCommentNotifications(s => s.unreadIds.length);
  const notice = useCommentNotifications(s => s.notice);
  const dismissNotice = useCommentNotifications(s => s.dismissNotice);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(dismissNotice, 5000);
    return () => clearTimeout(timeout);
  }, [notice, dismissNotice]);

  const message = notice?.kind === "mention"
    ? "Someone mentioned you in a comment"
    : "Someone replied to your comment";

  return (
    <>
      <Tooltip delayDuration={10} open={!!notice || hovered} onOpenChange={setHovered}>
        <TooltipTrigger asChild>
          <Button
            onClick={() => {
              dismissNotice();
              setHovered(false);
              setActiveRightItem(commentsOpen ? "controls" : "comments");
            }}
            aria-label={count ? `Comments, ${count} unread notifications` : "Comments"}
            className={cn("relative hover:!bg-accent/30", commentsOpen && "bg-accent/30")}
            variant="ghost"
            size="icon"
          >
            <MessageSquare size={20} />
            {count > 0 && (
              <span aria-hidden="true" className={cn("absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full px-1 text-center text-[10px] font-semibold leading-none tracking-normal", commentColors.surface)}>
                <span className="block -translate-y-px leading-none tabular-nums">{count > 99 ? "99+" : count}</span>
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent className={commentColors.tooltip} side="bottom" align="center" sideOffset={1} onEscapeKeyDown={dismissNotice}>
          {notice ? message : commentsOpen ? "Close comments" : "Comments"}
        </TooltipContent>
      </Tooltip>
      <span className="sr-only" role="status" aria-live="polite">{notice ? message : ""}</span>
    </>
  );
}
