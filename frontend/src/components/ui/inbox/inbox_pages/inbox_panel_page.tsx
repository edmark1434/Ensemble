// src/components/ui/inbox/inbox_pages/inbox_panel_page.tsx
import React from "react";
import { InboxPanelHeader } from "../inbox_components/inbox_panel_header";
import { InboxPanelViewMessage } from "../inbox_components/inbox_panel_viewmessage";
import { InboxPanelChatbox } from "../inbox_components/inbox_panel_chatbox";
import { InboxPinnedBanner } from "../inbox_functions/inbox_pin_message";

export const InboxPanelPage = ({
  selectedConversation,
  getConversationName,
  getAvatar,
  messages,
  messageLoading,
  containerRef,
  endRef,
  handleScroll,
  renderMessage,
  messageInput,
  setMessageInput,
  handleSendMessage,
  replyToMessage,
  editingMessage,
  cancelReply,
  mediaList, // Updated from 'image'
  fileInputRef,
  openFilePicker,
  handleFileChange,
  removeMedia, // Updated from 'clearImage'
  pinnedMessages,
  onUnpin,
  onJumpToPinned,
  textareaRef,
}: any) => {
  if (!selectedConversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500">
        Select a conversation to start messaging
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-full w-full overflow-hidden bg-[#080a12]">
      <InboxPanelHeader
        selectedConversation={selectedConversation}
        getConversationName={getConversationName}
        getAvatar={getAvatar}
      />

      <InboxPinnedBanner
        pinnedMessages={pinnedMessages}
        messages={messages}
        onUnpin={onUnpin}
        onJumpTo={onJumpToPinned}
      />

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <InboxPanelViewMessage
          messages={messages}
          messageLoading={messageLoading}
          containerRef={containerRef}
          endRef={endRef}
          handleScroll={handleScroll}
          renderMessage={renderMessage}
        />

        <InboxPanelChatbox
          messageInput={messageInput}
          setMessageInput={setMessageInput}
          handleSendMessage={handleSendMessage}
          replyToMessage={replyToMessage}
          editingMessage={editingMessage}
          cancelReply={cancelReply}
          mediaList={mediaList}
          fileInputRef={fileInputRef}
          openFilePicker={openFilePicker}
          handleFileChange={handleFileChange}
          removeMedia={removeMedia}
          textareaRef={textareaRef}
        />
      </div>
    </div>
  );
};