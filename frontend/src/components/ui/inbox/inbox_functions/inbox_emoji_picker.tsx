// src/components/ui/inbox/inbox_functions/inbox_emoji_picker.tsx
import React from "react";
import EmojiPicker, { EmojiStyle } from "emoji-picker-react";
import type { MessageReact } from "../inbox_dataset";

interface InboxEmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
  isSender?: boolean;
}

const QUICK_REACTIONS = ["1f44d", "2764-fe0f", "1f602", "1f62e", "1f622", "1f64f"];

export const InboxEmojiPicker: React.FC<InboxEmojiPickerProps> = ({
  onSelectEmoji,
  onClose,
  isSender = false,
}) => {
  return (
    <div
      className={`absolute z-50 max-w-[280px] sm:max-w-[300px] rounded-2xl border border-white/10 bg-[#12141f]/95 backdrop-blur-md p-1.5 shadow-2xl ${
        isSender ? "bottom-full mb-2 right-0" : "top-full mt-2 left-0"
      }`}
    >
      <EmojiPicker
        reactionsDefaultOpen
        allowExpandReactions
        reactions={QUICK_REACTIONS}
        onReactionClick={(emojiData) => {
          onSelectEmoji(emojiData.emoji);
          onClose();
        }}
        onEmojiClick={(emojiData) => {
          onSelectEmoji(emojiData.emoji);
          onClose();
        }}
        width="100%"
        height={320}
        theme={"dark" as any}
        emojiStyle={EmojiStyle.APPLE}
        searchPlaceholder="Search emojis..."
        previewConfig={{ showPreview: false }}
        skinTonePickerLocation={"none" as any}
      />
    </div>
  );
};

// ============================================================
// Reaction grouping — Facebook-style stacked counts
// ============================================================

export interface GroupedReaction {
  react_type: string;
  count: number;
  accountIds: string[];
}

export const groupMessageReactions = (
  reactions: MessageReact[]
): GroupedReaction[] => {
  const map = new Map<string, GroupedReaction>();

  for (const r of reactions) {
    const existing = map.get(r.react_type);
    if (existing) {
      existing.count += 1;
      existing.accountIds.push(r.account_id);
    } else {
      map.set(r.react_type, {
        react_type: r.react_type,
        count: 1,
        accountIds: [r.account_id],
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.count - a.count);
};

interface InboxReactionBadgesProps {
  reactions: MessageReact[];
  currentUserId: string;
  isSender?: boolean;
  onToggleReaction?: (emoji: string) => void;
}

export const InboxReactionBadges: React.FC<InboxReactionBadgesProps> = ({
  reactions,
  currentUserId,
  isSender = false,
  onToggleReaction,
}) => {
  if (!reactions || reactions.length === 0) return null;

  const grouped = groupMessageReactions(reactions);

  return (
    /* Positioned absolutely right on the edge of the bubble! */
    <div
      className={`absolute -bottom-4 z-10 flex gap-1 ${
        isSender ? "-left-2" : "-right-2"
      }`}
    >
      <div className="flex gap-0.5 rounded-full bg-[#12141f] border border-white/10 p-0.5 shadow-md">
        {grouped.map((group) => {
          const reactedByMe = group.accountIds.includes(currentUserId);
          return (
            <button
              key={group.react_type}
              type="button"
              onClick={() => onToggleReaction?.(group.react_type)}
              className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs transition ${
                reactedByMe
                  ? "bg-blue-500/20 text-blue-300"
                  : "hover:bg-white/10 text-zinc-300"
              }`}
              title={`${group.count} reaction${group.count > 1 ? "s" : ""}`}
            >
              <span>{group.react_type}</span>
              {group.count > 1 && (
                <span className="text-[10px] text-zinc-300">{group.count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};