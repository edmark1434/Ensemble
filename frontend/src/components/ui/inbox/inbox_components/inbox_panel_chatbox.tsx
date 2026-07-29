// src/components/ui/inbox/inbox_components/inbox_panel_chatbox.tsx
import React, { useEffect } from "react";
import { Send, Reply, Pencil, X } from "lucide-react";
import type { Message } from "../inbox_dataset";
import {
  InboxUploadMediaButton,
  InboxUploadMediaPreview,
  type UploadedMedia,
} from "../inbox_functions/inbox_upload_image";

interface InboxPanelChatboxProps {
  messageInput: string;
  setMessageInput: (val: string) => void;
  handleSendMessage: () => void;
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

  // Auto-grow textarea up to ~12 lines before scrolling
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 288)}px`;
  }, [messageInput, textareaRef]);

  return (
    <div className="border-t border-white/10 bg-[#0d0f1a] flex-shrink-0">
      {(replyToMessage || editingMessage) && (
        <div className="px-4 py-2 bg-[#0d0f1a] border-b border-white/10 flex items-center justify-between">
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
        <div className="flex-1 relative">
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
            className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white outline-none resize-none placeholder:text-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition inbox-scroll-thin max-h-[18rem] overflow-y-auto"
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
          disabled={!canSend}
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};