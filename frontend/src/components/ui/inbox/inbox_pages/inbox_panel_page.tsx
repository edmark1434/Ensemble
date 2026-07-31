// src/components/ui/inbox/inbox_pages/inbox_panel_page.tsx
import React, { useState } from "react";
import { InboxPanelHeader } from "../inbox_components/inbox_panel_header";
import { InboxPanelViewMessage } from "../inbox_components/inbox_panel_viewmessage";
import { InboxPanelChatbox } from "../inbox_components/inbox_panel_chatbox";
import { InboxPinnedBanner } from "../inbox_functions/inbox_pin_message";
import { InboxSideDetails } from "../inbox_components/inbox_side_detail";

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
  mediaList,
  fileInputRef,
  openFilePicker,
  handleFileChange,
  removeMedia,
  pinnedMessages,
  onUnpin,
  onJumpToPinned,
  textareaRef,
  onUpdateGroupName,
}: any) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!selectedConversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500">
        Select a conversation to start messaging
      </div>
    );
  }

  return (
    <div className="flex h-full max-h-full w-full overflow-hidden bg-[#080a12] relative">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
        <InboxPanelHeader
          selectedConversation={selectedConversation}
          getConversationName={getConversationName}
          getAvatar={getAvatar}
          onToggleDetails={() => setShowDetails((prev) => !prev)}
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

      {/* Smooth Animated Side Details Panel */}
      <InboxSideDetails
        isOpen={showDetails}
        selectedConversation={selectedConversation}
        getConversationName={getConversationName}
        getAvatar={getAvatar}
        messages={messages}
        pinnedMessages={pinnedMessages}
        onClose={() => setShowDetails(false)}
        onUpdateGroupName={onUpdateGroupName}
        onJumpToMessage={onJumpToPinned}
      />
    </div>
  );
};