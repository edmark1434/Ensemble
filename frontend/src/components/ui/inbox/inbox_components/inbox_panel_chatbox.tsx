// src/components/ui/inbox/inbox_components/inbox_panel_chatbox.tsx
import React, { useEffect, useState } from "react";
import { Send, Reply, Pencil, Smile, X } from "lucide-react";
import type { Message } from "../inbox_dataset";
import { InboxEmojiPicker } from "../inbox_functions/inbox_emoji_picker";
import {
  InboxUploadMediaButton,
  InboxUploadMediaPreview,
  type UploadedMedia,
} from "../inbox_functions/inbox_upload_image";

interface InboxPanelChatboxProps {
  messageInput: string;
  setMessageInput: (val: string) => void;
  handleSendMessage: () => void;
  isSending?: boolean;
  typingCount?: number;
  replyToMessage: Message | null;
  editingMessage: Message | null;
  cancelReply: () => void;
  mediaList: UploadedMedia[];
  fileInputRef: React.RefObject<HTMLInputElement>;
  openFilePicker: () => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeMedia: (id: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}

export const InboxPanelChatbox: React.FC<InboxPanelChatboxProps> = ({
  messageInput,
  setMessageInput,
  handleSendMessage,
  isSending = false,
  typingCount = 0,
  replyToMessage,
  editingMessage,
  cancelReply,
  mediaList = [],
  fileInputRef,
  openFilePicker,
  handleFileChange,
  removeMedia,
  textareaRef,
}) => {
  const canSend = messageInput.trim().length > 0 || mediaList.length > 0;
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? messageInput.length;
    const end = textarea?.selectionEnd ?? start;
    const nextValue =
      messageInput.slice(0, start) + emoji + messageInput.slice(end);
    const nextCursor = start + emoji.length;
    setMessageInput(nextValue);
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  // Auto-grow textarea up to ~12 lines before scrolling
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 288)}px`;
  }, [messageInput, textareaRef]);

  return (
    <div className="border-t border-white/10 bg-dark-surface flex-shrink-0">
      {typingCount > 0 && (
        <div className="px-4 pt-2 text-xs text-zinc-500">
          {typingCount === 1 ? "Someone is typing..." : `${typingCount} people are typing...`}
        </div>
      )}
      {(replyToMessage || editingMessage) && (
        <div className="px-4 py-2 bg-dark-surface border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            {replyToMessage ? (
              <>
                <Reply className="h-4 w-4 text-blue-400" />
                <span>
                  Replying to:{" "}
                  <span className="text-white">
                    {replyToMessage.message_content.substring(0, 50)}...
                  </span>
                </span>
              </>
            ) : editingMessage ? (
              <>
                <Pencil className="h-4 w-4 text-emerald-400" />
                <span>Editing message</span>
              </>
            ) : null}
          </div>
          <button
            onClick={cancelReply}
            className="p-1 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Renders horizontal preview row for up to 3 attachments */}
      <InboxUploadMediaPreview mediaList={mediaList} onRemove={removeMedia} />

      <div className="p-4 flex items-end gap-2">
        <div className="flex-1 relative flex items-end">
          <textarea
            ref={textareaRef}
            placeholder={
              replyToMessage
                ? "Write a reply..."
                : editingMessage
                ? "Edit message..."
                : "Type a message..."
            }
            rows={1}
            className="w-full rounded-2xl border border-white/15 bg-white/5 py-2.5 pl-4 pr-11 text-sm text-white outline-none resize-none placeholder:text-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition inbox-scroll-thin max-h-[18rem] overflow-y-auto"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <button
            type="button"
            onClick={() => setShowEmojiPicker((open) => !open)}
            className="absolute bottom-2.5 right-3 text-zinc-500 transition hover:text-white"
            aria-label="Choose emoji"
          >
            <Smile className="h-5 w-5" />
          </button>
          {showEmojiPicker && (
            <InboxEmojiPicker
              isSender
              onSelectEmoji={insertEmoji}
              onClose={() => setShowEmojiPicker(false)}
            />
          )}
        </div>

        <InboxUploadMediaButton
          fileInputRef={fileInputRef}
          onFileChange={handleFileChange}
          onClick={openFilePicker}
          disabled={mediaList.length >= 3}
        />

        <button
          onClick={handleSendMessage}
          className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 p-2.5 text-white transition hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          disabled={!canSend || isSending}
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
